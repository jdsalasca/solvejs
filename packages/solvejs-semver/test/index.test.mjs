import test from "node:test";
import assert from "node:assert/strict";
import {
  SemverError,
  compareVersions,
  diffVersions,
  formatVersion,
  incrementVersion,
  isValidRange,
  isValidVersion,
  maxSatisfying,
  parseVersion,
  satisfies
} from "../dist/esm/index.js";

test("parseVersion", () => {
  const parsed = parseVersion("1.2.3");
  assert.deepEqual(parsed, { major: 1, minor: 2, patch: 3, prerelease: [], build: [] });

  assert.deepEqual(parseVersion("1.2.3-alpha.1"), {
    major: 1,
    minor: 2,
    patch: 3,
    prerelease: ["alpha", 1],
    build: []
  });
  assert.deepEqual(parseVersion("1.2.3+build.5"), {
    major: 1,
    minor: 2,
    patch: 3,
    prerelease: [],
    build: ["build", 5]
  });
  assert.deepEqual(parseVersion("1.2.3-rc.1+exp.sha.5114f85"), {
    major: 1,
    minor: 2,
    patch: 3,
    prerelease: ["rc", 1],
    build: ["exp", "sha", "5114f85"]
  });

  assert.deepEqual(parseVersion("0.0.0"), { major: 0, minor: 0, patch: 0, prerelease: [], build: [] });
  assert.deepEqual(parseVersion("v2.3.4").major, 2, "a leading v is tolerated");
  assert.deepEqual(parseVersion("  1.2.3  ").minor, 2, "surrounding whitespace is trimmed");

  for (const bad of ["", "1", "1.2", "1.2.3.4", "a.b.c", "1.2.x", "-1.2.3", "1.2.3-", "1.2.3+"]) {
    assert.equal(parseVersion(bad), null, `${JSON.stringify(bad)} must not parse`);
  }
});

test("isValidVersion", () => {
  assert.equal(isValidVersion("1.0.0"), true);
  assert.equal(isValidVersion("1.0.0-rc.1"), true);
  assert.equal(isValidVersion("1.0"), false);
  assert.equal(isValidVersion("nonsense"), false);
  assert.equal(isValidVersion(""), false);
});

test("compareVersions orders by major, minor, then patch", () => {
  assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
  assert.equal(compareVersions("1.0.1", "1.0.0"), 1);
  assert.equal(compareVersions("1.0.0", "1.0.1"), -1);
  assert.equal(compareVersions("1.1.0", "1.0.9"), 1);
  assert.equal(compareVersions("2.0.0", "1.99.99"), 1);
  assert.equal(compareVersions("1.9.0", "1.10.0"), -1, "numeric, not lexicographic");
  assert.equal(compareVersions("1.10.0", "1.9.0"), 1);
});

test("compareVersions ranks a prerelease below its release", () => {
  assert.equal(compareVersions("1.0.0-alpha", "1.0.0"), -1);
  assert.equal(compareVersions("1.0.0", "1.0.0-alpha"), 1);
  assert.equal(compareVersions("1.0.0-alpha", "1.0.0-beta"), -1);
  assert.equal(compareVersions("1.0.0-alpha.1", "1.0.0-alpha.2"), -1);
  assert.equal(compareVersions("1.0.0-alpha.2", "1.0.0-alpha.10"), -1, "numeric identifiers compare numerically");
  assert.equal(compareVersions("1.0.0-alpha", "1.0.0-alpha.1"), -1, "a longer prerelease outranks a shorter prefix");
  assert.equal(
    compareVersions("1.0.0-1", "1.0.0-alpha"),
    -1,
    "numeric identifiers have lower precedence than alphanumeric ones, per the specification"
  );
  assert.equal(compareVersions("1.0.0-alpha+b1", "1.0.0-alpha+b2"), 0, "build metadata is ignored");
  assert.equal(compareVersions("1.0.0", "1.0.0+build"), 0);
});

test("compareVersions is a total order over a shuffled list", () => {
  const versions = ["1.0.0", "1.0.0-alpha", "0.9.9", "1.0.1", "1.0.0-beta.2", "2.0.0", "1.0.0-alpha.1"];
  const sorted = [...versions].sort(compareVersions);

  assert.deepEqual(sorted, [
    "0.9.9",
    "1.0.0-alpha",
    "1.0.0-alpha.1",
    "1.0.0-beta.2",
    "1.0.0",
    "1.0.1",
    "2.0.0"
  ]);
});

test("compareVersions rejects anything unparsable", () => {
  assert.throws(() => compareVersions("1.0", "1.0.0"), /SemverError|version/);
  assert.throws(() => compareVersions("1.0.0", "nope"), /SemverError|version/);
  assert.throws(() => compareVersions("1.0.0", "1.0.0.0"), /SemverError|version/);
});

test("satisfies handles caret ranges", () => {
  assert.equal(satisfies("1.2.3", "^1.2.3"), true);
  assert.equal(satisfies("1.9.9", "^1.2.3"), true);
  assert.equal(satisfies("2.0.0", "^1.2.3"), false);
  assert.equal(satisfies("0.2.5", "^0.2.3"), true);
  assert.equal(satisfies("0.3.0", "^0.2.3"), false, "caret on 0.x only allows patch changes");
  assert.equal(satisfies("0.0.3", "^0.0.3"), true);
  assert.equal(satisfies("0.0.4", "^0.0.3"), false, "caret on 0.0.x pins the exact version");
  assert.equal(satisfies("1.2.3", "^1.2"), true, "a partial caret is allowed");
  assert.equal(satisfies("1.2.3", "^1"), true);
  assert.equal(satisfies("2.0.0", "^1"), false);
});

test("satisfies handles tilde ranges", () => {
  assert.equal(satisfies("1.2.9", "~1.2.3"), true);
  assert.equal(satisfies("1.3.0", "~1.2.3"), false, "tilde allows patch changes only");
  assert.equal(satisfies("1.2.3", "~1.2"), true);
  assert.equal(satisfies("1.3.0", "~1.2"), false);
  assert.equal(satisfies("1.9.0", "~1"), true, "tilde on the major allows minor changes");
});

test("satisfies handles comparators, wildcards, and exact ranges", () => {
  assert.equal(satisfies("1.2.3", "1.2.3"), true);
  assert.equal(satisfies("1.2.4", "1.2.3"), false);
  assert.equal(satisfies("1.2.3", "1.x"), true);
  assert.equal(satisfies("1.9.9", "1.x"), true);
  assert.equal(satisfies("2.0.0", "1.x"), false);
  assert.equal(satisfies("1.2.3", "1.2.x"), true);
  assert.equal(satisfies("1.3.0", "1.2.x"), false);
  assert.equal(satisfies("1.2.3", "*"), true);
  assert.equal(satisfies("0.0.1", "*"), true);

  assert.equal(satisfies("1.5.0", ">=1.2.0"), true);
  assert.equal(satisfies("1.1.0", ">=1.2.0"), false);
  assert.equal(satisfies("1.2.0", ">1.2.0"), false, "> excludes the boundary");
  assert.equal(satisfies("1.2.1", ">1.2.0"), true);
  assert.equal(satisfies("1.2.0", "<=1.2.0"), true);
  assert.equal(satisfies("1.2.1", "<=1.2.0"), false);
  assert.equal(satisfies("1.2.0", "<1.2.1"), true);
  assert.equal(satisfies("1.0.0", ">=1.0.0 <2.0.0"), true, "a space is an AND");
  assert.equal(satisfies("2.0.0", ">=1.0.0 <2.0.0"), false);
});

test("satisfies excludes prereleases unless the range names one", () => {
  assert.equal(satisfies("1.0.0-alpha", "^1.0.0"), false, "a prerelease never satisfies a plain range");
  assert.equal(satisfies("1.0.0-alpha", ">=1.0.0-alpha"), true);
  assert.equal(satisfies("1.0.0-alpha", "^1.0.0-alpha"), true);
  assert.equal(
    satisfies("1.0.0-beta", "^1.0.0-alpha"),
    true,
    "the range named a prerelease of the same 1.0.0 tuple, so a later prerelease qualifies"
  );
  assert.equal(
    satisfies("1.0.1-beta", "^1.0.0-alpha"),
    false,
    "a different tuple never qualifies, even when the range names a prerelease"
  );
  assert.equal(satisfies("1.0.0", "^1.0.0-alpha"), true, "the release outranks its own prerelease");
});

test("satisfies handles OR ranges", () => {
  assert.equal(satisfies("1.5.0", "^1.0.0 || ^2.0.0"), true);
  assert.equal(satisfies("2.5.0", "^1.0.0 || ^2.0.0"), true);
  assert.equal(satisfies("3.0.0", "^1.0.0 || ^2.0.0"), false);
  assert.equal(satisfies("2.0.0", "^1.0.0 || 2.0.0"), true);
});

test("satisfies rejects an invalid version or range", () => {
  assert.throws(() => satisfies("1.0", "^1.0.0"), /SemverError|version/);
  assert.throws(() => satisfies("1.0.0", "not-a-range"), /SemverError|range/);
  assert.throws(() => satisfies("1.0.0", ">=1.0.0 || "), /SemverError|range/);
});

test("isValidRange", () => {
  assert.equal(isValidRange("^1.0.0"), true);
  assert.equal(isValidRange("~1.2"), true);
  assert.equal(isValidRange("1.x"), true);
  assert.equal(isValidRange("*"), true);
  assert.equal(isValidRange(">=1.0.0 <2.0.0"), true);
  assert.equal(isValidRange("^1 || ^2"), true);
  assert.equal(isValidRange("1.0.0-rc.1"), true);

  assert.equal(isValidRange(""), false);
  assert.equal(isValidRange("nonsense"), false);
  assert.equal(isValidRange("^"), false);
  assert.equal(isValidRange(">="), false);
  assert.equal(isValidRange("^1.0.0 ||"), false);
});

test("maxSatisfying picks the highest match", () => {
  const versions = ["1.0.0", "1.2.0", "1.2.3", "2.0.0", "2.1.0"];

  assert.equal(maxSatisfying(versions, "^1.0.0"), "1.2.3");
  assert.equal(maxSatisfying(versions, "^2.0.0"), "2.1.0");
  assert.equal(maxSatisfying(versions, "*"), "2.1.0");
  assert.equal(maxSatisfying(versions, "^3.0.0"), null, "no match is null");
  assert.equal(maxSatisfying([], "^1.0.0"), null);
  assert.equal(maxSatisfying(["not-a-version", "1.0.0"], "^1.0.0"), "1.0.0", "unparsable entries are skipped");
  assert.equal(maxSatisfying(["1.0.0", "1.0.0"], "^1.0.0"), "1.0.0", "duplicates are fine");
});

test("incrementVersion", () => {
  assert.deepEqual(incrementVersion("1.2.3", "major"), { major: 2, minor: 0, patch: 0, prerelease: [], build: [] });
  assert.deepEqual(incrementVersion("1.2.3", "minor"), { major: 1, minor: 3, patch: 0, prerelease: [], build: [] });
  assert.deepEqual(incrementVersion("1.2.3", "patch"), { major: 1, minor: 2, patch: 4, prerelease: [], build: [] });

  assert.deepEqual(
    incrementVersion("1.2.3-alpha.1", "patch"),
    { major: 1, minor: 2, patch: 3, prerelease: [], build: [] },
    "a patch bump on a prerelease promotes it to its release rather than moving past it"
  );
  assert.deepEqual(
    incrementVersion("1.2.3-alpha.1", "minor"),
    { major: 1, minor: 3, patch: 0, prerelease: [], build: [] },
    "a minor bump always moves to the next minor"
  );
  assert.deepEqual(incrementVersion("1.2.3+build", "patch"), {
    major: 1,
    minor: 2,
    patch: 4,
    prerelease: [],
    build: []
  }, "build metadata is dropped on increment");

  assert.throws(() => incrementVersion("1.0", "patch"), /SemverError|version/);
  assert.throws(() => incrementVersion("1.0.0", "nope"), /SemverError|release/);
  assert.throws(() => incrementVersion("1.0.0"), /SemverError|release/);
});

test("formatVersion round trips through parseVersion", () => {
  assert.equal(formatVersion({ major: 1, minor: 2, patch: 3, prerelease: [], build: [] }), "1.2.3");
  assert.equal(formatVersion({ major: 1, minor: 2, patch: 3, prerelease: ["alpha", 1], build: [] }), "1.2.3-alpha.1");
  assert.equal(
    formatVersion({ major: 1, minor: 2, patch: 3, prerelease: ["rc", 1], build: ["sha", "abc"] }),
    "1.2.3-rc.1+sha.abc"
  );

  assert.equal(formatVersion(parseVersion("1.2.3")), "1.2.3");
  assert.equal(formatVersion(parseVersion("1.2.3-rc.1+b.2")), "1.2.3-rc.1+b.2");
});

test("diffVersions describes what changed", () => {
  assert.equal(diffVersions("1.2.3", "1.2.3"), null, "identical versions have no diff");
  assert.equal(diffVersions("1.2.3", "1.3.0"), "minor");
  assert.equal(diffVersions("1.2.3", "2.0.0"), "major");
  assert.equal(diffVersions("1.2.3", "1.2.4"), "patch");
  assert.equal(diffVersions("2.0.0", "1.0.0"), "major", "the direction does not matter");
  assert.equal(diffVersions("1.0.0", "1.0.0-alpha"), "prerelease");
  assert.equal(diffVersions("1.0.0", "1.0.0+build"), null, "build metadata is not a difference");

  assert.throws(() => diffVersions("1.0", "1.0.0"), /SemverError|version/);
});

test("SemverError carries a stable code and context", () => {
  const error = new SemverError("SEMVER_INVALID_VERSION", "Expected a valid semantic version.", {
    received: "1.0"
  });

  assert.ok(error instanceof SemverError);
  assert.ok(error instanceof Error);
  assert.equal(error.name, "SemverError");
  assert.equal(error.code, "SEMVER_INVALID_VERSION");
  assert.equal(error.message, "Expected a valid semantic version.");
  assert.deepEqual(error.details, { received: "1.0" });
});
test("satisfies rejects an empty or non-string range", () => {
  assert.throws(() => satisfies("1.0.0", ""), /SemverError|range/);
  assert.throws(() => satisfies("1.0.0", "   "), /SemverError|range/);
  assert.throws(() => satisfies("1.0.0", null), /SemverError|range/);
  assert.throws(() => satisfies("1.0.0", 42), /SemverError|range/);
  assert.throws(() => satisfies("1.0.0", undefined), /SemverError|range/);
});

test("a broken operand is reported rather than silently ignored", () => {
  // Every comparator is read during the match, so an unreadable one throws
  // instead of quietly answering false.
  assert.throws(() => satisfies("1.0.0-alpha", ">=1.0.0-alpha garbage"), /SemverError|range/);
  assert.equal(satisfies("1.0.0-alpha", ">=1.0.0-alpha *"), true, "a wildcard comparator does not disqualify");
});

test("maxSatisfying rejects a non-array candidate list", () => {
  assert.throws(() => maxSatisfying("1.0.0", "^1.0.0"), /SemverError|array/);
  assert.throws(() => maxSatisfying(null, "^1.0.0"), /SemverError|array/);
  assert.throws(() => maxSatisfying(undefined, "^1.0.0"), /SemverError|array/);
});

test("maxSatisfying surfaces an invalid range rather than skipping everything", () => {
  assert.throws(() => maxSatisfying(["1.0.0"], "not-a-range"), /SemverError|range/);
});

test("compareVersions handles large numbers without precision loss", () => {
  assert.equal(compareVersions("9007199254740992.0.0", "9007199254740991.0.0"), 1);
  assert.equal(compareVersions("0.0.0", "0.0.0"), 0);
  assert.deepEqual(parseVersion("1.0.0"), { major: 1, minor: 0, patch: 0, prerelease: [], build: [] });
});

test("formatVersion omits empty prerelease and build sections", () => {
  assert.equal(formatVersion({ major: 0, minor: 0, patch: 0, prerelease: [], build: [] }), "0.0.0");
  assert.equal(formatVersion({ major: 1, minor: 0, patch: 0, prerelease: [], build: ["only"] }), "1.0.0+only");
  assert.equal(formatVersion({ major: 1, minor: 0, patch: 0, prerelease: ["rc"], build: [] }), "1.0.0-rc");
  assert.equal(formatVersion(incrementVersion("1.2.3", "minor")), "1.3.0");
  assert.equal(formatVersion(incrementVersion("1.2.3", "major")), "2.0.0");
  assert.equal(formatVersion(incrementVersion("1.2.3-rc.1", "patch")), "1.2.3");
});
test("parseVersion refuses anything that is not a string", () => {
  for (const input of [123, null, undefined, {}, [], true, Symbol("v")]) {
    assert.equal(parseVersion(input), null, `${String(input)} is not a version`);
  }
  assert.equal(isValidVersion(123), false);
  assert.equal(isValidVersion("1.0.0"), true);
});

test("parseVersion rejects an identifier it cannot represent", () => {
  // These pass the coarse version pattern but fail the per-identifier rules, which is why the
  // identifiers are validated one by one instead of only by the regex.
  assert.equal(parseVersion("1.0.0-a_b"), null, "an underscore is not allowed in an identifier");
  assert.equal(parseVersion("1.0.0-rc!"), null, "nor is punctuation");
assert.equal(parseVersion("1.0.0+build!"), null, "build metadata is held to the same rule");
  assert.deepEqual(parseVersion("1.0.0-01a"), { major: 1, minor: 0, patch: 0, prerelease: ["01a"], build: [] },
    "the leading-zero ban applies only to a purely numeric identifier, so 01a is fine");

  assert.equal(parseVersion("1.0.0-99999999999999999999"), null,
    "a numeric identifier beyond the safe integer range would silently lose precision");
  assert.equal(parseVersion("1.0.0+99999999999999999999"), null, "and so would a build identifier");

  assert.deepEqual(parseVersion("1.0.0-01"), { major: 1, minor: 0, patch: 0, prerelease: [1], build: [] },
    "a leading zero in a purely numeric identifier is legal, per the specification");
  assert.deepEqual(parseVersion("1.0.0-0.3.7"), { major: 1, minor: 0, patch: 0, prerelease: [0, 3, 7], build: [] });
  assert.deepEqual(parseVersion("1.0.0-x.7.z.92").prerelease, ["x", 7, "z", 92]);
});

test("compareVersions orders numeric prerelease identifiers numerically", () => {
  // alpha.2 is above alpha.10 only if the numbers are compared as numbers, not as text.
  assert.equal(compareVersions("1.0.0-alpha.2", "1.0.0-alpha.10"), -1);
  assert.equal(compareVersions("1.0.0-alpha.10", "1.0.0-alpha.2"), 1);
  assert.equal(compareVersions("1.0.0-2", "1.0.0-10"), -1);
  assert.equal(compareVersions("1.0.0-rc.1", "1.0.0-rc.1"), 0);
});

test("compareVersions ranks a numeric identifier below an alphanumeric one", () => {
  // The specification says numeric identifiers always have lower precedence, so 1.0.0-1 is
  // below 1.0.0-alpha even though "1" would sort after "alpha" as text.
  assert.equal(compareVersions("1.0.0-1", "1.0.0-alpha"), -1);
  assert.equal(compareVersions("1.0.0-alpha", "1.0.0-1"), 1);
  assert.equal(compareVersions("1.0.0-alpha.1", "1.0.0-alpha.beta"), -1);
  assert.equal(compareVersions("1.0.0-alpha.beta", "1.0.0-beta"), -1);
  assert.equal(compareVersions("1.0.0-beta.2", "1.0.0-beta.11"), -1);
  assert.equal(compareVersions("1.0.0-beta.11", "1.0.0-rc.1"), -1);
  assert.equal(compareVersions("1.0.0-rc.1", "1.0.0"), -1, "any prerelease is below the release");
});

test("satisfies honours a wildcard operand alongside a prerelease", () => {
  // A prerelease never satisfies a bare wildcard, because no comparator in the range names a
  // prerelease of the same tuple. This is the rule that keeps 2.x from accepting 3.0.0-beta.
  assert.equal(satisfies("1.0.0-beta", "*"), false);
  assert.equal(satisfies("1.0.0-beta", "x"), false);
assert.equal(satisfies("1.0.0-beta", "X"), false);
  assert.throws(() => satisfies("1.0.0-beta", ""), /non-empty range/, "an empty range is a programming error");

  assert.equal(satisfies("1.0.0", "*"), true, "a release version is fine");
  assert.equal(satisfies("1.0.0", "1.x"), true);
  assert.equal(satisfies("9.9.9", "1.x"), false);
  assert.equal(satisfies("1.0.0-beta", ">=1.0.0-beta"), true, "an explicit prerelease bound allows it");
  assert.equal(satisfies("1.0.0-beta.2", ">=1.0.0-beta.1 <1.0.0"), true);
});
test("satisfies treats a wildcard operand as an interval, not a single version", () => {
  // "2" and "2.x" both name every 2.y.z, so "<2.x" keeps everything below 2.0.0 and "<=2.x"
  // also keeps 2.99.99. An equality operator is the only one that matches the whole wildcard.
  assert.equal(satisfies("1.1.0", "<2.x"), true);
  assert.equal(satisfies("2.0.0", "<2.x"), false, "the lower bound itself is excluded");
  assert.equal(satisfies("2.5.0", "<2.x"), false);
  assert.equal(satisfies("2.99.99", "<=2.x"), true, "the upper bound is only excluded by a strict >");
  assert.equal(satisfies("3.0.0", "<=2.x"), false);
  assert.equal(satisfies("2.0.0", ">1.x"), true, "> names the version above the whole interval");
  assert.equal(satisfies("1.99.99", ">1.x"), false);
  assert.equal(satisfies("0.5.0", ">=0.x"), true);

  // The same holds one level down for a minor wildcard.
  assert.equal(satisfies("1.2.9", "<=1.x"), true);
  assert.equal(satisfies("1.9.9", "<=1.x"), true);
  assert.equal(satisfies("2.0.0", "<=1.x"), false);
  assert.equal(satisfies("1.2.9", ">=1.2"), true);
  assert.equal(satisfies("1.1.9", ">=1.2"), false);
  assert.equal(satisfies("1.3.0", ">1.2"), true, ">1.2 moves past the whole 1.2.z block");

  assert.equal(satisfies("1.9.0", "1.x"), true, "a bare wildcard still matches any minor");
  assert.equal(satisfies("2.0.0", "1.x"), false);
  assert.equal(satisfies("1.2.0", "1.2"), true, "an exact minor matches the block");
  assert.equal(satisfies("1.3.0", "1.2"), false);
});

test("an explicit equals operator is accepted and means the wildcard block", () => {
  assert.equal(satisfies("1.2.0", "=1.2"), true);
  assert.equal(satisfies("1.2.9", "=1.2.x"), true);
  assert.equal(satisfies("1.3.0", "=1.2"), false);
  assert.equal(satisfies("1.0.0", "=1"), true);
  assert.equal(satisfies("2.0.0", "=1.x"), false);
  assert.equal(satisfies("1.2.3", "=1.2.3"), true, "an exact version still works");
});

test("parseVersion rejects an identifier list with an empty slot", () => {
  // The version pattern allows dots inside the identifier group, so only the per-identifier
  // check can catch an empty slot between two dots. This is why that loop is not redundant
  // with the regex.
  assert.equal(parseVersion("1.0.0-a..b"), null);
  assert.equal(parseVersion("1.0.0-a."), null, "a trailing dot leaves an empty slot");
  assert.equal(parseVersion("1.0.0-.a"), null, "and so does a leading one");
  assert.equal(parseVersion("1.0.0+a..b"), null, "build metadata is checked the same way");
  assert.equal(parseVersion("1.0.0+build."), null);

  assert.deepEqual(parseVersion("1.0.0-a.-b"), { major: 1, minor: 0, patch: 0, prerelease: ["a", "-b"], build: [] },
    "a hyphen is a legal identifier, and a leading dot inside one is not the same as an empty slot");
});

test("a caret range keeps a prerelease in its lower bound", () => {
  assert.equal(satisfies("1.2.3-rc.2", "^1.2.3-rc.1"), true);
  assert.equal(satisfies("1.2.3-rc.0", "^1.2.3-rc.1"), false);
  assert.equal(satisfies("1.9.0", "^1.2.3"), true, "a plain caret still allows later minors");
  assert.equal(satisfies("2.0.0", "^1.2.3"), false);
  assert.equal(satisfies("0.2.5", "^0.2.3"), true, "on 0.x a caret only allows patch changes");
  assert.equal(satisfies("0.3.0", "^0.2.3"), false);
  assert.equal(satisfies("0.0.3", "^0.0.3"), true, "on 0.0.x a caret pins the exact version");
  assert.equal(satisfies("0.0.4", "^0.0.3"), false);
});

test("a tilde range keeps a prerelease in its lower bound", () => {
  assert.equal(satisfies("1.2.3-rc.2", "~1.2.3-rc.1"), true);
  assert.equal(satisfies("1.2.3-rc.0", "~1.2.3-rc.1"), false);
  assert.equal(satisfies("1.2.4-rc.2", "~1.2.3-rc.1"), false, "~ pins the patch level");
  assert.equal(satisfies("1.2.3", "~1.2.3-rc.1"), true, "the release is above its own prerelease");

  // The minor-is-zero branch still has to carry the prerelease, not just the other one.
  assert.equal(satisfies("1.0.0-rc.2", "~1.0.0-rc.1"), true);
  assert.equal(satisfies("1.1.0-rc.2", "~1.0.0-rc.1"), false, "~1.0.0 stops before 1.1.0");

  assert.equal(satisfies("1.1.5", "~1.1.0"), true);
  assert.equal(satisfies("1.2.0", "~1.1.0"), false, "~ pins the minor");
  assert.equal(satisfies("1.1.9", "~1.1"), true, "a partial tilde still pins the minor");
  assert.equal(satisfies("1.2.0", "~1.1"), false);
});
