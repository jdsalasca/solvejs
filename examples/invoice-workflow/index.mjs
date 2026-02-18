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
} from "../../packages/solvejs/dist/esm/index.js";
import { fileURLToPath } from "node:url";

export function loadInvoiceRules(env) {
  const missing = validateRequiredEnv(["INVOICE_TAX_RATE", "INVOICE_CURRENCY"], env);
  if (missing.length > 0) {
    throw new Error(`Missing env vars: ${missing.join(", ")}`);
  }

  return {
    taxRate: getEnvNumber("INVOICE_TAX_RATE", env, { min: 0, max: 100 }),
    discountRate: getEnvNumber("INVOICE_DISCOUNT_RATE", env, { defaultValue: 0, min: 0, max: 100 }),
    currency: getEnvEnum("INVOICE_CURRENCY", ["USD", "EUR", "COP"], env, { caseInsensitive: true }),
    locale: getEnvEnum("INVOICE_LOCALE", ["en-US", "es-CO", "es-ES"], env, { defaultValue: "en-US" })
  };
}

export function issueInvoice(payload, env) {
  const idValidation = validateUuidV4(payload.customerId);
  if (!idValidation.ok) {
    throw new Error(`Invalid customerId: ${idValidation.code}`);
  }

  const phoneValidation = validateCellphoneNumber(payload.customerPhone);
  if (!phoneValidation.ok) {
    throw new Error(`Invalid customerPhone: ${phoneValidation.code}`);
  }

  const amounts = payload.lines.map((line, index) => {
    const amount = toNumber(String(line.amount));
    if (amount === null) {
      throw new Error(`Invalid line amount at index ${index}`);
    }
    return amount;
  });

  const rules = loadInvoiceRules(env);
  const subtotal = roundTo(sum(amounts), 2);
  const discountedSubtotal = applyDiscount(subtotal, rules.discountRate, 2);
  const taxAmount = calculateTaxAmount(discountedSubtotal, rules.taxRate, 2);
  const total = roundTo(discountedSubtotal + taxAmount, 2);

  return {
    customerId: payload.customerId,
    subtotal,
    discountRate: rules.discountRate,
    discountedSubtotal,
    taxRate: rules.taxRate,
    taxAmount,
    total,
    currency: rules.currency,
    locale: rules.locale,
    formattedTotal: toCurrency(total, rules.currency, rules.locale)
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const demoEnv = {
    INVOICE_TAX_RATE: "19",
    INVOICE_DISCOUNT_RATE: "10",
    INVOICE_CURRENCY: "COP",
    INVOICE_LOCALE: "es-CO"
  };
  const demoPayload = {
    customerId: "550e8400-e29b-41d4-a716-446655440000",
    customerPhone: "+573001112233",
    lines: [{ amount: "1200.00" }, { amount: "300.00" }]
  };
  console.log(JSON.stringify(issueInvoice(demoPayload, demoEnv), null, 2));
}
