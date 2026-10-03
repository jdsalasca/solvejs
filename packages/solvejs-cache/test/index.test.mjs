import test from "node:test";
import assert from "node:assert/strict";
import {
  CacheError,
  createLruCache,
  createStaleWhileRevalidate,
  createTtlCache,
  memoizeAsync,
  stableKey
} from "../dist/esm/index.js";

// A clock the tests drive by hand, so nothing here depends on real time.
function fakeClock(start = 1_000_000) {
  let now = start;
  return {
    now: () => now,
    advance: (ms) => {
      now += ms;
    },
    set: (ms) => {
      now = ms;
    }
  };
}

test("stableKey", () => {
  assert.equal(stableKey({ a: 1, b: 2 }), stableKey({ b: 2, a: 1 }), "key order does not matter");
  assert.equal(stableKey({ a: 1, b: 2 }), '{"a":1,"b":2}');
  assert.equal(stableKey([1, "two", true]), '[1,"two",true]');
  assert.equal(stableKey("plain"), '"plain"', "a string is JSON-encoded, not returned raw");
  assert.equal(stableKey(42), "42");
  assert.equal(stableKey(null), "null");
  assert.equal(stableKey(undefined), "undefined");
  assert.notEqual(stableKey({ a: 1 }), stableKey({ a: 2 }));
  assert.notEqual(stableKey([1, 2]), stableKey([2, 1]), "array order does matter");

  // undefined properties are dropped, matching JSON.stringify. Two objects that
  // differ only by an undefined property therefore share a key.
  assert.equal(stableKey({ a: 1, b: undefined }), stableKey({ a: 1 }));
  assert.notEqual(stableKey({ a: 1, b: null }), stableKey({ a: 1 }), "null is kept, undefined is not");

  assert.equal(stableKey({ b: 1, a: { d: 1, c: 2 } }), stableKey({ a: { c: 2, d: 1 }, b: 1 }), "nested keys sort too");
  assert.equal(stableKey({ a: [3, { z: 1, y: 2 }] }), '{"a":[3,{"y":2,"z":1}]}');
});

test("createTtlCache stores, reads, and expires entries", () => {
  const clock = fakeClock();
  const cache = createTtlCache({ ttlMs: 100, now: clock.now });

  assert.equal(cache.has("a"), false);
  assert.equal(cache.get("a"), undefined);

  cache.set("a", 1);
  assert.equal(cache.has("a"), true);
  assert.equal(cache.get("a"), 1);
  assert.equal(cache.size(), 1);

  clock.advance(99);
  assert.equal(cache.get("a"), 1, "still fresh just before the ttl");

  clock.advance(1);
  assert.equal(cache.get("a"), undefined, "expired exactly at the ttl");
  assert.equal(cache.has("a"), false);

  cache.set("b", 2);
  clock.advance(500);
  assert.equal(cache.get("b"), undefined);
});

test("createTtlCache per-entry ttl overrides the default", () => {
  const clock = fakeClock();
  const cache = createTtlCache({ ttlMs: 1000, now: clock.now });

  cache.set("short", 1, { ttlMs: 10 });
  cache.set("long", 2);

  clock.advance(50);
  assert.equal(cache.get("short"), undefined, "the per-entry ttl wins");
  assert.equal(cache.get("long"), 2);

  clock.advance(1000);
  assert.equal(cache.get("long"), undefined);
});

test("createTtlCache distinguishes a cached undefined from a miss", () => {
  const clock = fakeClock();
  const cache = createTtlCache({ ttlMs: 100, now: clock.now });

  cache.set("present", undefined);
  assert.equal(cache.has("present"), true, "an undefined value is still a hit");
  assert.equal(cache.get("present"), undefined, "but the value reads as undefined");

  cache.set("nullish", null);
  assert.equal(cache.has("nullish"), true);
  assert.equal(cache.get("nullish"), null);
});

test("createTtlCache delete, clear, and keys", () => {
  const clock = fakeClock();
  const cache = createTtlCache({ ttlMs: 100, now: clock.now });

  cache.set("a", 1);
  cache.set("b", 2);
  assert.deepEqual(cache.keys(), ["a", "b"], "insertion order");
  assert.equal(cache.size(), 2);

  assert.equal(cache.delete("a"), true);
  assert.equal(cache.delete("a"), false, "deleting twice reports false");
  assert.deepEqual(cache.keys(), ["b"]);
  assert.equal(cache.size(), 1);

  cache.set("c", 3);
  cache.clear();
  assert.equal(cache.size(), 0);
  assert.deepEqual(cache.keys(), []);
});

test("createTtlCache drops expired entries on read", () => {
  const clock = fakeClock();
  const cache = createTtlCache({ ttlMs: 10, now: clock.now });

  cache.set("short", 1, { ttlMs: 10 });
  cache.set("long", 2, { ttlMs: 1000 });

  clock.advance(20);
  assert.equal(cache.get("short"), undefined);
  assert.equal(cache.size(), 1, "reading an expired entry removed it, the live one survives");
  assert.deepEqual(cache.keys(), ["long"]);

  clock.advance(2000);
  assert.equal(cache.size(), 0, "keys and size also drop expired entries");
  assert.deepEqual(cache.keys(), []);
});

test("createTtlCache validates its options and keys", () => {
  const clock = fakeClock();

  assert.throws(() => createTtlCache({ ttlMs: -1, now: clock.now }), /CacheError|ttlMs/);
  assert.throws(() => createTtlCache({ ttlMs: 0, now: clock.now }), /CacheError|ttlMs/);
  assert.throws(() => createTtlCache({ ttlMs: NaN, now: clock.now }), /CacheError|ttlMs/);
  assert.throws(() => createTtlCache({ ttlMs: Infinity, now: clock.now }), /CacheError|ttlMs/);

  // A fractional ttl is legitimate: it is a duration in milliseconds.
  const fractional = createTtlCache({ ttlMs: 1.5, now: clock.now });
  fractional.set("a", 1);
  assert.equal(fractional.get("a"), 1);

  const cache = createTtlCache({ ttlMs: 10, now: clock.now });
  assert.throws(() => cache.set("", 1), /CacheError|key/);
  assert.throws(() => cache.get(""), /CacheError|key/);
  assert.throws(() => cache.delete(""), /CacheError|key/);
  assert.throws(() => cache.set("a", 1, { ttlMs: 0 }), /CacheError|ttlMs/);
});

test("createLruCache evicts the least recently used entry", () => {
  let now = 1000;
  const cache = createLruCache({ maxSize: 2, now: () => now });

  cache.set("a", 1);
  cache.set("b", 2);
  assert.equal(cache.get("a"), 1);

  // Reading "a" made "b" the least recently used entry.
  cache.set("c", 3);
  assert.equal(cache.get("b"), undefined, "b was evicted");
  assert.equal(cache.get("a"), 1);
  assert.equal(cache.get("c"), 3);
  assert.equal(cache.size(), 2);

  // Writing an existing key updates it without evicting anything.
  cache.set("a", 10);
  assert.equal(cache.get("a"), 10);
  assert.equal(cache.size(), 2);
  now += 1;
});

test("createLruCache expires by ttl as well as by size", () => {
  let now = 1000;
  const cache = createLruCache({ maxSize: 10, ttlMs: 50, now: () => now });

  cache.set("a", 1);
  now += 49;
  assert.equal(cache.get("a"), 1);

  now += 1;
  assert.equal(cache.get("a"), undefined, "expired at the ttl");
  assert.equal(cache.size(), 0);

  now += 1;
});

test("createLruCache validates maxSize", () => {
  assert.throws(() => createLruCache({ maxSize: 0, now: () => 0 }), /CacheError|maxSize/);
  assert.throws(() => createLruCache({ maxSize: -1, now: () => 0 }), /CacheError|maxSize/);
  assert.throws(() => createLruCache({ maxSize: 1.5, now: () => 0 }), /CacheError|maxSize/);
  assert.throws(() => createLruCache({ maxSize: 2, ttlMs: 0, now: () => 0 }), /CacheError|ttlMs/);

  const cache = createLruCache({ maxSize: 2, now: () => 0 });
  assert.throws(() => cache.set("", 1), /CacheError|key/);
});

test("memoizeAsync calls the factory once per key", async () => {
  let calls = 0;
  const load = memoizeAsync(async (id) => {
    calls += 1;
    return `value-${id}`;
  });

  assert.equal(await load("a"), "value-a");
  assert.equal(await load("a"), "value-a");
  assert.equal(calls, 1, "the second call is served from memory");

  assert.equal(await load("b"), "value-b");
  assert.equal(calls, 2);
});

test("memoizeAsync collapses concurrent calls for the same key", async () => {
  let calls = 0;
  const load = memoizeAsync(async (id) => {
    calls += 1;
    await new Promise((resolve) => setTimeout(resolve, 5));
    return `value-${id}`;
  });

  const [first, second, third] = await Promise.all([load("a"), load("a"), load("a")]);
  assert.deepEqual([first, second, third], ["value-a", "value-a", "value-a"]);
  assert.equal(calls, 1, "an in-flight promise is shared, not awaited twice");
});

test("memoizeAsync does not cache a rejection", async () => {
  let calls = 0;
  const load = memoizeAsync(async (id) => {
    calls += 1;
    if (calls === 1) throw new Error("transient");
    return `value-${id}`;
  });

  await assert.rejects(() => load("a"), /transient/);
  assert.equal(await load("a"), "value-a", "the failed attempt is retried");
  assert.equal(calls, 2);
});

test("memoizeAsync key and expiry options", async () => {
  let calls = 0;
  const clock = fakeClock();
  const load = memoizeAsync(
    async (userId, resource) => {
      calls += 1;
      return `${userId}:${resource}`;
    },
    {
      key: (userId, resource) => `${userId}/${resource}`,
      ttlMs: 100,
      now: clock.now
    }
  );

  await load("u1", "posts");
  await load("u1", "posts");
  assert.equal(calls, 1, "the custom key collapses both arguments into one entry");

  await load("u1", "users");
  assert.equal(calls, 2, "a different resource is a different entry");

  clock.advance(100);
  await load("u1", "posts");
  assert.equal(calls, 3, "the entry expired at the ttl");
});

test("memoizeAsync validates its options", () => {
  assert.throws(() => memoizeAsync(async () => 1, { ttlMs: -1 }), /CacheError|ttlMs/);
  assert.throws(() => memoizeAsync(async () => 1, { ttlMs: 0 }), /CacheError|ttlMs/);
  assert.throws(() => memoizeAsync(async () => 1, { key: "not a function" }), /CacheError|key/);
  assert.throws(() => memoizeAsync("not a function"), /CacheError|factory/);
  assert.ok(memoizeAsync(async () => 1, { ttlMs: 1.5 }), "a fractional ttl is a valid duration");
});

test("createStaleWhileRevalidate serves stale while refreshing in the background", async () => {
  let now = 1000;
  let calls = 0;
  const read = createStaleWhileRevalidate(
    async () => {
      calls += 1;
      return `fresh-${calls}`;
    },
    { freshMs: 50, staleMs: 200, now: () => now }
  );

  assert.equal(await read(), "fresh-1");
  assert.equal(await read(), "fresh-1", "still fresh");
  assert.equal(calls, 1);

  now += 60;
  const stale = await read();
  assert.equal(stale, "fresh-1", "the stale value is returned immediately");
  assert.equal(calls, 2, "a refresh started in the background");

  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(await read(), "fresh-2", "the refreshed value is served once ready");
  assert.equal(calls, 2, "reading again did not trigger another refresh");
  now += 1;
});

test("createStaleWhileRevalidate falls back to the loader past the stale window", async () => {
  let now = 1000;
  let calls = 0;
  const read = createStaleWhileRevalidate(
    async () => {
      calls += 1;
      return `value-${calls}`;
    },
    { freshMs: 10, staleMs: 20, now: () => now }
  );

  assert.equal(await read(), "value-1");

  now += 500;
  assert.equal(await read(), "value-2", "past the stale window the loader is awaited");
  assert.equal(calls, 2);
});

test("createStaleWhileRevalidate validates its windows", () => {
  const loader = async () => 1;
  assert.throws(() => createStaleWhileRevalidate(loader, { freshMs: -1 }), /CacheError|freshMs/);
  assert.throws(() => createStaleWhileRevalidate(loader, { freshMs: 0 }), /CacheError|freshMs/);
  assert.throws(() => createStaleWhileRevalidate(loader, { freshMs: 10, staleMs: -1 }), /CacheError|staleMs/);
  assert.throws(() => createStaleWhileRevalidate("not a function", { freshMs: 1, staleMs: 1 }), /CacheError|loader/);
  assert.throws(
    () => createStaleWhileRevalidate(loader, { freshMs: 100, staleMs: 10 }),
    /CacheError|staleMs/,
    "staleMs must not be shorter than freshMs"
  );
  assert.ok(
    createStaleWhileRevalidate(loader, { freshMs: 10, staleMs: 10 }),
    "an equal stale window is allowed"
  );
});

test("CacheError carries a stable code and context", () => {
  const error = new CacheError("CACHE_INVALID_OPTION", "Expected ttlMs to be a positive number.", {
    option: "ttlMs",
    received: -1
  });

  assert.ok(error instanceof CacheError);
  assert.ok(error instanceof Error);
  assert.equal(error.name, "CacheError");
  assert.equal(error.code, "CACHE_INVALID_OPTION");
  assert.equal(error.message, "Expected ttlMs to be a positive number.");
  assert.deepEqual(error.details, { option: "ttlMs", received: -1 });
});
test("memoizeAsync exposes clear, delete, and size", async () => {
  const load = memoizeAsync(async (id) => `value-${id}`);

  assert.equal(load.size, 0);
  await load("a");
  await load("b");
  assert.equal(load.size, 2);

  assert.equal(load.delete("a"), true);
  assert.equal(load.delete("a"), false, "deleting a missing key reports false");
  assert.equal(load.size, 1);

  await load("a");
  assert.equal(load.size, 2, "the deleted key is recomputed and cached again");

  load.clear();
  assert.equal(load.size, 0);
  assert.equal(await load("a"), "value-a", "clearing does not break the function");
  assert.equal(load.size, 1);
});

test("memoizeAsync handles a synchronous factory", async () => {
  const load = memoizeAsync((id) => `sync-${id}`);
  assert.equal(await load("a"), "sync-a");
  assert.equal(await load("a"), "sync-a");
  assert.equal(load.size, 1);
});

test("memoizeAsync throws when the factory itself throws synchronously", async () => {
  const load = memoizeAsync(() => {
    throw new Error("sync boom");
  });

  await assert.rejects(() => load("a"), /sync boom/);
  await assert.rejects(() => load("a"), /sync boom/, "a sync throw is not cached either");
});

test("stableKey rejects values it cannot serialise", () => {
  assert.throws(() => stableKey({ fn: () => 1 }), /CacheError|serialis/);
  assert.throws(() => stableKey({ sym: Symbol("s") }), /CacheError|serialis/);

  const circular = { a: 1 };
  circular.self = circular;
  assert.throws(() => stableKey(circular), /CacheError|circular/);

  const shared = { a: 1 };
  assert.equal(
    stableKey({ x: shared, y: shared }),
    stableKey({ x: { a: 1 }, y: { a: 1 } }),
    "a repeated reference is not treated as a cycle"
  );
});

test("stableKey encodes non-finite numbers and bigints unambiguously", () => {
  assert.equal(stableKey(NaN), "!NaN");
  assert.equal(stableKey(Infinity), "!Infinity");
  assert.equal(stableKey(-Infinity), "!-Infinity");
  assert.notEqual(stableKey(NaN), stableKey("NaN"), "a non-finite number never collides with its name as a string");
  assert.notEqual(stableKey(Infinity), stableKey("Infinity"));
  assert.notEqual(stableKey(NaN), stableKey(Infinity));
  assert.equal(stableKey(10n), "!10n");
  assert.notEqual(stableKey(10n), stableKey(10), "a bigint never collides with a number");
  assert.notEqual(stableKey(10n), stableKey("10n"), "a bigint never collides with its text form");
  assert.equal(stableKey({ a: [1, "b", true, null] }), '{"a":[1,"b",true,null]}');
});
test("createLruCache has, delete, and clear", () => {
  let now = 1000;
  const cache = createLruCache({ maxSize: 3, now: () => now });

  cache.set("a", 1);
  cache.set("b", 2);

  assert.equal(cache.has("a"), true);
  assert.equal(cache.has("zz"), false);
  assert.throws(() => cache.has(""), /CacheError|key/);

  assert.equal(cache.delete("a"), true);
  assert.equal(cache.delete("a"), false);
  assert.equal(cache.has("a"), false);
  assert.throws(() => cache.delete(""), /CacheError|key/);

  cache.set("c", 3);
  cache.clear();
  assert.equal(cache.size(), 0);
  assert.deepEqual(cache.keys(), []);
  assert.equal(cache.has("b"), false);
  now += 1;
});

test("createLruCache has reports false for an expired entry", () => {
  let now = 1000;
  const cache = createLruCache({ maxSize: 3, ttlMs: 10, now: () => now });

  cache.set("a", 1);
  assert.equal(cache.has("a"), true);

  now += 10;
  assert.equal(cache.has("a"), false, "an expired entry is not reported as present");
  assert.equal(cache.size(), 0);
  now += 1;
});

test("createLruCache evicts in least-recently-used order across many inserts", () => {
  let now = 1000;
  const cache = createLruCache({ maxSize: 3, now: () => now });

  cache.set("a", 1);
  cache.set("b", 2);
  cache.set("c", 3);
  cache.get("a"); // order is now b, c, a
  cache.set("d", 4);

  assert.equal(cache.get("b"), undefined);
  assert.deepEqual(cache.keys(), ["c", "a", "d"]);
  assert.equal(cache.size(), 3);

  cache.set("e", 5); // c is now the oldest
  assert.equal(cache.get("c"), undefined);
  assert.equal(cache.get("a"), 1);
  now += 1;
});

test("createTtlCache has and size reflect live entries", () => {
  const clock = fakeClock();
  const cache = createTtlCache({ ttlMs: 100, now: clock.now });

  cache.set("a", 1);
  assert.equal(cache.size(), 1);
  clock.advance(100);
  assert.equal(cache.size(), 0, "size drops expired entries");
  assert.equal(cache.has("a"), false);
  assert.throws(() => cache.has(""), /CacheError|key/);
});
test("a cache works without an injected clock, falling back to the real one", () => {
  const ttl = createTtlCache({ ttlMs: 60_000 });
  ttl.set("token", "abc");
  assert.equal(ttl.get("token"), "abc", "a fresh entry is readable straight away");
  assert.equal(ttl.has("token"), true);
  assert.equal(ttl.delete("token"), true);
  assert.equal(ttl.get("token"), undefined);

const lru = createLruCache({ maxSize: 2 });
  lru.set("a", 1);
  lru.set("b", 2);
  assert.equal(lru.get("a"), 1);
  lru.set("c", 3);
assert.equal(lru.get("b"), undefined, "b was the least recently used and is gone");
  assert.equal(lru.size(), 2);

  const expiring = createLruCache({ maxSize: 2, ttlMs: 60_000 });
  expiring.set("x", 1);
  assert.equal(expiring.get("x"), 1, "the default clock has not advanced past the ttl");
});

test("createStaleWhileRevalidate swallows a failing background refresh", async () => {
  let now = 1000;
  let calls = 0;
  const read = createStaleWhileRevalidate(
    async () => {
      calls += 1;
      if (calls > 1) throw new Error("backend down");
      return "good";
    },
    { freshMs: 50, staleMs: 500, now: () => now }
  );

  assert.equal(await read(), "good");

  now += 60;
  assert.equal(await read(), "good", "the stale value is still served when the refresh will fail");
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(calls, 2, "the refresh really was attempted");

  // The failure must not have poisoned anything: past the stale window the caller now sees
  // the error, which is the honest outcome for a value that can no longer be trusted.
  now += 500;
  await assert.rejects(() => read(), /backend down/);
});

test("createStaleWhileRevalidate collapses concurrent reads into one loader call", async () => {
  let calls = 0;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });

  const read = createStaleWhileRevalidate(
    async () => {
      calls += 1;
      await gate;
      return "value";
    },
    { freshMs: 1000, staleMs: 2000 }
  );

  const all = Promise.all([read(), read(), read(), read()]);
  release();
  const values = await all;

  assert.equal(calls, 1, "four concurrent readers share a single in-flight load");
  assert.deepEqual(values, ["value", "value", "value", "value"]);
});
