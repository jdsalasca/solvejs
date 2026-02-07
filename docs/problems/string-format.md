# How to slugify, title-case, and sanitize strings in JavaScript

Use `@jdsalasc/solvejs-string` to normalize user-facing text safely.

```ts
import { slugify, toTitleCase, stripHtml, mask } from "@jdsalasc/solvejs-string";

slugify("Build Better JS Apps"); // "build-better-js-apps"
toTitleCase("solvejs utility ecosystem"); // "Solvejs Utility Ecosystem"
stripHtml("<p>Hello <strong>world</strong></p>"); // "Hello world"
mask("4111111111111111", 4); // "************1111"
```
