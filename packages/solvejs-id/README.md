# @jdsalasc/solvejs-id

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-id)](https://www.npmjs.com/package/@jdsalasc/solvejs-id)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-id)](https://www.npmjs.com/package/@jdsalasc/solvejs-id)

> **Live documentation:** [run this package's examples in your browser](https://jdsalasca.github.io/solvejs/live/#pkg-id).

Zero-dependency TypeScript identifiers for APIs, queues and UI keys: UUID v4, time-ordered UUID v7, ULID, NanoID, Stripe-style prefixed IDs and URL-safe random tokens. Randomness comes from `crypto.getRandomValues`; the clock and random source are injectable for deterministic tests.

## Install

```bash
npm i @jdsalasc/solvejs-id
```

## Quick start

```ts
import { nanoid, prefixedId, ulid, uuidv4, uuidv7 } from "@jdsalasc/solvejs-id";

const requestId = uuidv4();
const eventId = uuidv7();
const sortable = ulid();
const publicId = nanoid(12);
const userId = prefixedId("usr");
```

```text
requestId  550e8400-e29b-41d4-a716-446655440000
eventId    018f4b7c-7a3d-7c2e-9f10-2b6d8a1f3c40
sortable   01J8Z6Q4X3K2M9N8P7R6S5T4V3
publicId   V1StGXR8_Z5j
userId     usr_9fK2mQ7xL0pR
```

## API

| Export | What it does |
|---|---|
| `uuidv4(options?)` | RFC 4122 version 4 UUID. |
| `uuidv7(options?)` | RFC 9562 version 7 UUID with a 48-bit millisecond timestamp. |
| `ulid(options?)` | 26-character Crockford Base32 ULID, time-ordered. |
| `nanoid(size?, options?)` | URL-safe NanoID. Default size 21. |
| `prefixedId(prefix, size?, options?)` | `prefix_` plus a NanoID. |
| `randomToken(bytes?, options?)` | URL-safe base64 token. Default 32 bytes. |
| `isUuid(value, version?)` | Checks a canonical UUID, optionally v4 or v7. |
| `isUlid(value)` | Checks a canonical ULID. |
| `isPrefixedId(value, prefix?)` | Checks the shape and optional prefix. |
| `uuidTimestamp(value)` | Extracts the `Date` from a UUID v7. |
| `ulidTimestamp(value)` | Extracts the `Date` from a ULID. |
| `parseIdTimestamp(value)` | Tries both formats. |

`IdSource` lets you inject `now()` and `random(size)` for reproducible tests:

```ts
import { uuidv7 } from "@jdsalasc/solvejs-id";

const fixed = uuidv7({
  now: () => Date.UTC(2026, 10, 17),
  random: (size) => new Uint8Array(size)
});
```

## When to use which

- **UUID v4**: opaque public IDs where order does not matter.
- **UUID v7 / ULID**: database keys and event IDs that sort by creation time.
- **NanoID**: short public URLs and client-side keys.
- **Prefixed ID**: user-facing IDs that reveal the resource type (`usr_`, `ord_`).

## Notes and limits

- UUID v7 and ULID are time-ordered, not strictly monotonic when generated inside the same millisecond. Add a database sequence if you need total order.
- `randomToken` uses cryptographic random bytes and is URL-safe; it is not a password hash.
- Prefixes are lowercase and capped at 16 characters.
- NanoID size is capped at 128 characters.
- Node 18+ and modern browsers provide `crypto.getRandomValues`; otherwise `IdError` with `ID_UNSUPPORTED` is thrown.

## License

MIT
