# How to validate form inputs in TypeScript

Use `@jdsalasc/solvejs-validators` when you need reusable rules with structured result codes.

```ts
import {
  validateCellphoneNumber,
  validateUsername,
  validateHttpUrl,
  validateUuidV4
} from "@jdsalasc/solvejs-validators";

validateCellphoneNumber("+573001112233", { country: "CO" });
validateUsername("solvejs_team");
validateHttpUrl("https://example.com");
validateUuidV4("550e8400-e29b-41d4-a716-446655440000");
```
