# Common regex patterns for JavaScript apps

Use `@jdsalasc/solvejs-regex` for production-ready regex patterns and helpers.

```ts
import { REGEX_PATTERNS, testPattern, escapeRegex } from "@jdsalasc/solvejs-regex";

testPattern("dev@solvejs.dev", REGEX_PATTERNS.email); // true
testPattern("550e8400-e29b-41d4-a716-446655440000", REGEX_PATTERNS.uuidV4); // true
testPattern("192.168.0.1", REGEX_PATTERNS.ipv4); // true

const safe = new RegExp(escapeRegex("(a+b)*"), "g");
safe.test("(a+b)*"); // true
```
