# @jdsalasc/solvejs-validators

Validation helpers for common web and app form pain points.

## Install

```bash
npm i @jdsalasc/solvejs-validators
```

## Example

```ts
import { isCellphoneNumber, validateCellphoneNumber, validateName } from "@jdsalasc/solvejs-validators";

isCellphoneNumber("+573001112233");
validateCellphoneNumber("+573001112233", { country: "CO" });
validateName("Maria Fernanda");
```

Structured validators return:

```ts
type ValidationResult = {
  ok: boolean;
  code: string;
  message: string;
};
```
