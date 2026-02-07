import test from "node:test";
import assert from "node:assert/strict";
import {
  isAddressLine,
  isAddresDirection,
  isAddresDirrection,
  isAddressDirection,
  isCellphoneNumber,
  isCreditCardNumber,
  isEmail,
  isHttpUrl,
  isIpv4,
  isIsoDateString,
  isPostalCode,
  isStrongPassword,
  isUuidV4,
  isUsername,
  isValidName,
  validateAddressDirection,
  validateAddressLine,
  validateCellphoneNumber,
  validateCreditCardNumber,
  validateIsoDateString,
  validateName,
  validatePostalCode
} from "../dist/esm/index.js";

test("boolean validators keep compatibility", () => {
  assert.equal(isCellphoneNumber("+573001112233"), true);
  assert.equal(isAddressDirection("NW"), true);
  assert.equal(isAddresDirection("NW"), true);
  assert.equal(isAddresDirrection("NW"), true);
  assert.equal(isValidName("Maria Fernanda"), true);
  assert.equal(isUsername("solvejs_team"), true);
  assert.equal(isEmail("user@example.com"), true);
  assert.equal(isHttpUrl("https://solvejs.dev"), true);
  assert.equal(isPostalCode("12345-6789"), true);
  assert.equal(isPostalCode("110111", { country: "CO" }), true);
  assert.equal(isPostalCode("28013", { country: "ES" }), true);
  assert.equal(isAddressLine("221B Baker Street"), true);
  assert.equal(isStrongPassword("Aa123456!"), true);
  assert.equal(isCreditCardNumber("4111 1111 1111 1111"), true);
  assert.equal(isIpv4("192.168.0.1"), true);
  assert.equal(isUuidV4("550e8400-e29b-41d4-a716-446655440000"), true);
  assert.equal(isIsoDateString("2026-02-07"), true);
});

test("structured validators return codes and messages", () => {
  assert.deepEqual(validateCellphoneNumber("abc").ok, false);
  assert.equal(validateCellphoneNumber("abc").code, "INVALID_FORMAT");
  assert.equal(validateCellphoneNumber("+573001112233", { country: "CO" }).ok, true);
  assert.equal(validateAddressDirection("oeste", { locale: "es" }).ok, true);
  assert.equal(validateAddressDirection("west", { locale: "es" }).ok, false);
  assert.equal(validateName("A").code, "TOO_SHORT");
  assert.equal(validateAddressLine("A").code, "TOO_SHORT");
  assert.equal(validatePostalCode("110111", { country: "CO" }).ok, true);
  assert.equal(validatePostalCode("28013", { country: "ES" }).ok, true);
  assert.equal(validatePostalCode("7500000", { country: "CL" }).ok, true);
  assert.equal(validatePostalCode("110111", { country: "US" }).ok, false);
  assert.equal(validateCellphoneNumber("+5491123456789", { country: "AR" }).ok, true);
  assert.equal(validateCellphoneNumber("+5511912345678", { country: "BR" }).ok, true);
  assert.equal(validateCreditCardNumber("1234").code, "INVALID_FORMAT");
  assert.equal(validateIsoDateString("2026-02-30").code, "INVALID_FORMAT");
});
