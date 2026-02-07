# Array and number utility recipes

Use `@jdsalasc/solvejs-list` and `@jdsalasc/solvejs-numbers` for practical data transformations and safe business math.

```ts
import { uniqueBy, groupBy, sortBy } from "@jdsalasc/solvejs-list";
import { toNumber, safeDivide, percentChange } from "@jdsalasc/solvejs-numbers";

const rows = [{ id: "a", team: "x", value: "120" }, { id: "a", team: "x", value: "120" }, { id: "b", team: "y", value: "80" }];
const uniqueRows = uniqueBy(rows, (r) => r.id);
const grouped = groupBy(uniqueRows, (r) => r.team);
const sorted = sortBy(uniqueRows, (r) => Number(r.value), "desc");

const current = toNumber(sorted[0].value);
const previous = toNumber(sorted[1].value);
if (current !== null && previous !== null) {
  percentChange(current, previous);
  safeDivide(current, 0, 0);
}
```
