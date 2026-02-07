# @jdsalasc/solvejs-list

Array and list utilities for JavaScript and TypeScript.

## Install

```bash
npm i @jdsalasc/solvejs-list
```

## Example

```ts
import { unique, chunk, groupBy } from "@jdsalasc/solvejs-list";

unique([1, 1, 2, 3]);
chunk([1, 2, 3, 4], 2);
groupBy(["one", "two", "three"], item => item.length);
```
