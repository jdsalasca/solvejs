# How to slugify, title-case, and sanitize strings in JavaScript

Use `@jdsalasc/solvejs-string` to normalize user-facing text and sanitize mixed HTML input.

```ts
import { slugify, toTitleCase, stripHtml, mask, truncate } from "@jdsalasc/solvejs-string";

const raw = "<p>build better <strong>js apps</strong></p>";
const plain = stripHtml(raw); // "build better js apps"
const title = toTitleCase(plain); // "Build Better Js Apps"
const slug = slugify(title); // "build-better-js-apps"
const preview = truncate(plain, 12); // "build better..."
const secure = mask("4111111111111111", 4); // "************1111"
```
