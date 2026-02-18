import test from "node:test";
import assert from "node:assert/strict";
import { issueInvoice, loadInvoiceRules } from "./index.mjs";

const baseEnv = {
  INVOICE_TAX_RATE: "19",
  INVOICE_DISCOUNT_RATE: "10",
  INVOICE_CURRENCY: "USD",
  INVOICE_LOCALE: "en-US"
};

const basePayload = {
  customerId: "550e8400-e29b-41d4-a716-446655440000",
  customerPhone: "+573001112233",
  lines: [{ amount: "1200.00" }, { amount: "300.00" }]
};

test("issueInvoice returns computed totals with env-configured rules", () => {
  const result = issueInvoice(basePayload, baseEnv);

  assert.equal(result.subtotal, 1500);
  assert.equal(result.discountedSubtotal, 1350);
  assert.equal(result.taxAmount, 256.5);
  assert.equal(result.total, 1606.5);
  assert.equal(result.currency, "USD");
  assert.equal(result.locale, "en-US");
  assert.equal(typeof result.formattedTotal, "string");
});

test("issueInvoice throws on invalid customer id", () => {
  assert.throws(
    () => issueInvoice({ ...basePayload, customerId: "invalid-id" }, baseEnv),
    /Invalid customerId/
  );
});

test("loadInvoiceRules fails fast for missing required env vars", () => {
  assert.throws(
    () => loadInvoiceRules({ INVOICE_TAX_RATE: "19" }),
    /Missing env vars: INVOICE_CURRENCY/
  );
});
