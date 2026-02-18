# Validate request payloads with structured errors

Boolean-only validators are hard to map into user messages. Use structured codes.

```ts
import { validateUuidV4 } from "@jdsalasc/solvejs-validators";

const result = validateUuidV4("550e8400-e29b-41d4-a716-446655440000");
if (!result.ok) {
  console.log(result.code, result.message);
}
```

CTA: ask for additional locale coverage in the monthly vote issue.

## Copy/paste snippet

```ts
import { validateUuidV4 } from "@jdsalasc/solvejs-validators";

const result = validateUuidV4("550e8400-e29b-41d4-a716-446655440000");
if (!result.ok) {
  console.log(result.code, result.message);
}
```

## Why this matters

- Reduces repeated utility boilerplate.
- Improves consistency in production code.
- Keeps runtime dependencies at zero.

Docs: https://jdsalasca.github.io/solvejs/?utm_source=social&utm_medium=post&utm_campaign=community_growth
npm: https://www.npmjs.com/package/@jdsalasc/solvejs?utm_source=social&utm_medium=post&utm_campaign=community_growth
