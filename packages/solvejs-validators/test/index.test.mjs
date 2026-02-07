import test from "node:test";
import assert from "node:assert/strict";
import {
  isAddressDirection,
  isCellphoneNumber,
  isEmail,
  isHttpUrl,
  isPostalCode,
  isStrongPassword,
  isValidName
} from "../dist/esm/index.js";

test("validators for common form pain points", () => {
  assert.equal(isCellphoneNumber("+573001112233"), true);
  assert.equal(isCellphoneNumber("abc"), false);
  assert.equal(isAddressDirection("NW"), true);
  assert.equal(isAddressDirection("up"), false);
  assert.equal(isValidName("Maria Fernanda"), true);
  assert.equal(isValidName("A"), false);
  assert.equal(isEmail("user@example.com"), true);
  assert.equal(isHttpUrl("https://solvejs.dev"), true);
  assert.equal(isPostalCode("12345-6789"), true);
  assert.equal(isStrongPassword("Aa123456!"), true);
});
