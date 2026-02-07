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
  isPostalCode,
  isStrongPassword,
  isUsername,
  isValidName,
  validateAddressDirection,
  validateAddressLine,
  validateCellphoneNumber,
  validateCreditCardNumber,
  validateName
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
  assert.equal(isAddressLine("221B Baker Street"), true);
  assert.equal(isStrongPassword("Aa123456!"), true);
  assert.equal(isCreditCardNumber("4111 1111 1111 1111"), true);
});

test("structured validators return codes and messages", () => {
  assert.deepEqual(validateCellphoneNumber("abc").ok, false);
  assert.equal(validateCellphoneNumber("abc").code, "INVALID_FORMAT");
  assert.equal(validateCellphoneNumber("+573001112233", { country: "CO" }).ok, true);
  assert.equal(validateAddressDirection("oeste", { locale: "es" }).ok, true);
  assert.equal(validateAddressDirection("west", { locale: "es" }).ok, false);
  assert.equal(validateName("A").code, "TOO_SHORT");
  assert.equal(validateAddressLine("A").code, "TOO_SHORT");
  assert.equal(validateCreditCardNumber("1234").code, "INVALID_FORMAT");
});
