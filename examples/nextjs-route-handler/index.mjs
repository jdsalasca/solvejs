import { toNumber, validateUuidV4 } from "../../packages/solvejs/dist/esm/index.js";
import { fileURLToPath } from "node:url";

export async function POST(request) {
  const body = await request.json();
  const idResult = validateUuidV4(body.id);
  if (!idResult.ok) {
    return { status: 400, json: { ok: false, error: idResult.code } };
  }

  return {
    status: 200,
    json: {
      ok: true,
      id: body.id,
      amount: toNumber(body.amount)
    }
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const request = { json: async () => ({ id: "550e8400-e29b-41d4-a716-446655440000", amount: "1,200.50" }) };
  const response = await POST(request);
  console.log(JSON.stringify(response, null, 2));
}
