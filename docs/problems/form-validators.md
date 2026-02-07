# How to validate form inputs in TypeScript

Use `@jdsalasc/solvejs-validators` for common production validators.

```ts
import { isCellphoneNumber, isValidName, isHttpUrl, isStrongPassword } from "@jdsalasc/solvejs-validators";

isCellphoneNumber("+573001112233"); // true
isValidName("Maria Fernanda"); // true
isHttpUrl("https://example.com"); // true
isStrongPassword("Aa123456!"); // true
```
