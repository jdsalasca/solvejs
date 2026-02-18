# Build fintech-ready invoice totals

Use SolveJS `env + validators + numbers` together to fail fast on config, validate client data, and compute invoice totals safely.

```ts
import {
  applyDiscount,
  calculateTaxAmount,
  getEnvEnum,
  getEnvNumber,
  roundTo,
  sum,
  toCurrency,
  toNumber,
  validateCellphoneNumber,
  validateRequiredEnv,
  validateUuidV4
} from "@jdsalasc/solvejs";

const required = validateRequiredEnv(["INVOICE_TAX_RATE", "INVOICE_CURRENCY"], process.env);
if (required.length > 0) {
  throw new Error(`Missing invoice env: ${required.join(", ")}`);
}

const taxRate = getEnvNumber("INVOICE_TAX_RATE", process.env, { min: 0, max: 100 });
const discountRate = getEnvNumber("INVOICE_DISCOUNT_RATE", process.env, { defaultValue: 0, min: 0, max: 100 });
const currency = getEnvEnum("INVOICE_CURRENCY", ["USD", "EUR", "COP"], process.env, { caseInsensitive: true });
const locale = getEnvEnum("INVOICE_LOCALE", ["en-US", "es-CO", "es-ES"], process.env, { defaultValue: "en-US" });

const payload = {
  customerId: "550e8400-e29b-41d4-a716-446655440000",
  customerPhone: "+573001112233",
  lines: [{ amount: "1200.00" }, { amount: "300.00" }]
};

if (!validateUuidV4(payload.customerId).ok) throw new Error("Invalid customerId");
if (!validateCellphoneNumber(payload.customerPhone).ok) throw new Error("Invalid customerPhone");

const amounts = payload.lines.map((line) => {
  const amount = toNumber(line.amount);
  if (amount === null) throw new Error(`Invalid line amount: ${line.amount}`);
  return amount;
});

const subtotal = roundTo(sum(amounts), 2);
const discountedSubtotal = applyDiscount(subtotal, discountRate, 2);
const taxAmount = calculateTaxAmount(discountedSubtotal, taxRate, 2);
const total = roundTo(discountedSubtotal + taxAmount, 2);

console.log({
  subtotal,
  discountRate,
  taxRate,
  taxAmount,
  total,
  formattedTotal: toCurrency(total, currency, locale)
});
```

Notes:

- Keep tax/discount rates in env so finance can adjust rules without code edits.
- Validate UUID/phone before money calculations to avoid storing invalid invoices.
- Use `roundTo(..., 2)` at explicit boundaries (`subtotal`, `taxAmount`, `total`).
