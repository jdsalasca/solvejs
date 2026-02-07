# Common regex patterns for JavaScript apps

Use `@jdsalasc/solvejs-regex` for common pattern checks and safe dynamic regex construction.

```ts
import { REGEX_PATTERNS, testPattern, validateByName, escapeRegex } from "@jdsalasc/solvejs-regex";

testPattern("dev@solvejs.dev", REGEX_PATTERNS.email); // true
validateByName("550e8400-e29b-41d4-a716-446655440000", "uuidV4"); // true
validateByName("192.168.0.1", "ipv4"); // true

const safePattern = new RegExp(`^${escapeRegex("(a+b)*")}$`);
safePattern.test("(a+b)*"); // true
```
