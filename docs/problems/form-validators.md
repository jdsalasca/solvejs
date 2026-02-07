# How to validate form inputs in TypeScript

Use `@jdsalasc/solvejs-validators` for common production validators.

```ts
import { validateCellphoneNumber, validateName, validateHttpUrl, validateStrongPassword } from "@jdsalasc/solvejs-validators";

validateCellphoneNumber("+573001112233", { country: "CO" });
validateName("Maria Fernanda");
validateHttpUrl("https://example.com");
validateStrongPassword("Aa123456!");
```
