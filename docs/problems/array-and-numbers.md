# Array and number utility recipes

Use `@jdsalasc/solvejs-list` and `@jdsalasc/solvejs-numbers` for common data processing tasks.

```ts
import { unique, groupBy } from "@jdsalasc/solvejs-list";
import { average, percent, clamp } from "@jdsalasc/solvejs-numbers";

unique([1, 1, 2, 3]); // [1, 2, 3]
groupBy(["one", "two", "three"], v => v.length);
average([10, 20, 30]); // 20
percent(25, 200, 1); // 12.5
clamp(140, 0, 100); // 100
```
