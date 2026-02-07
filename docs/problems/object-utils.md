# Shape and merge objects in JavaScript

Use `@jdsalasc/solvejs-objects` when you need object selection, nested path access, and deep merge helpers.

```ts
import { pick, omit, get, set, deepMerge } from "@jdsalasc/solvejs-objects";

const user = { id: "u1", name: "Ada", role: "admin", profile: { locale: "en" } };

pick(user, ["id", "name"]); // { id: "u1", name: "Ada" }
omit(user, ["role"]); // { id, name, profile }
get(user, "profile.locale"); // "en"

const state = { filters: {} };
set(state, "filters.status", "active");

deepMerge({ app: { flags: { a: true } } }, { app: { flags: { b: true } } });
```
