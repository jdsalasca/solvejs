# @jdsalasc/solvejs-validators

Validation helpers for common web and app form pain points.

## Install

```bash
npm i @jdsalasc/solvejs-validators
```

## Example

```ts
import { isCellphoneNumber, isAddressDirection, isValidName } from "@jdsalasc/solvejs-validators";

isCellphoneNumber("+573001112233");
isAddressDirection("NORTH");
isValidName("Maria Fernanda");
```
