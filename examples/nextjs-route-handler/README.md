# Next.js Route Handler Example

Executable route-handler style example using SolveJS validators and number parsing.

```ts
import { validateUuidV4, toNumber } from "@jdsalasc/solvejs";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const idResult = validateUuidV4(body.id);
  if (!idResult.ok) {
    return NextResponse.json({ error: idResult.code }, { status: 400 });
  }

  const amount = toNumber(body.amount);
  return NextResponse.json({ ok: true, id: body.id, amount });
}
```

Run from repo root:

```bash
npm run build
npm run example:next
npm run example:next:test
```

Docs: `docs/guides/nextjs-integration.html`
