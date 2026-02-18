# Express Middleware Example

Executable middleware-style example using SolveJS structured validators.

```ts
import express from "express";
import { validateCellphoneNumber } from "@jdsalasc/solvejs";

const app = express();
app.use(express.json());

function validatePhone(req, res, next) {
  const result = validateCellphoneNumber(req.body.phone);
  if (!result.ok) {
    return res.status(400).json({ code: result.code, message: result.message });
  }
  next();
}

app.post("/signup", validatePhone, (_req, res) => {
  res.json({ ok: true });
});
```

Run from repo root:

```bash
npm run build
npm run example:express
npm run example:express:test
```

Docs: `docs/guides/express-integration.html`
