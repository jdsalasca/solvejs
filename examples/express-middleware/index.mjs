import { validateCellphoneNumber } from "../../packages/solvejs/dist/esm/index.js";
import { fileURLToPath } from "node:url";

export function validatePhone(req, _res, next) {
  const result = validateCellphoneNumber(req.body.phone);
  if (!result.ok) {
    return {
      status: 400,
      json: { ok: false, code: result.code, message: result.message }
    };
  }
  return next();
}

export function signupHandler() {
  return { status: 200, json: { ok: true } };
}

export function runSignup(body) {
  const req = { body };
  return validatePhone(req, {}, () => signupHandler());
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  console.log("Valid payload:", runSignup({ phone: "+573001112233" }));
  console.log("Invalid payload:", runSignup({ phone: "invalid" }));
}
