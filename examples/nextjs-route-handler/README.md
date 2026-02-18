# Next.js Route Handler Example

Use SolveJS validators and number parsing in an API route.

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

Docs: `docs/guides/nextjs-integration.html`
