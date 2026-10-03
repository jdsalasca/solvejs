import test from "node:test";
import assert from "node:assert/strict";
import {
  isAddresDirrection,
  isAddresDirection,
  isAddressDirection,
  isAddressLine,
  isCellphoneNumber,
  isCreditCardNumber,
  isDomain,
  isEmail,
  isHttpUrl,
  isIpv4,
  isIsoDateString,
  isPostalCode,
  isStrongPassword,
  isUsername,
  isUuidV4,
  isValidName,
  translateValidationResult,
  validateAddressDirection,
  validateAddressLine,
  validateCellphoneNumber,
  validateCreditCardNumber,
  validateDomain,
  validateEmail,
  validateHttpUrl,
  validateIpv4,
  validateIsoDateString,
  validateName,
  validatePostalCode,
  validateStrongPassword,
  validateUsername,
  validateUuidV4
} from "../dist/esm/index.js";

const VALID_DIRECTIONS_EN = ["N", "S", "E", "W", "NE", "NW", "SE", "SW", "NORTH", "SOUTHWEST"];
const VALID_DIRECTIONS_ES = ["N", "S", "E", "O", "NE", "NO", "SE", "SO", "NORTE", "SUROESTE"];

test("translateValidationResult", () => {
  const source = validateEmail("");
  assert.equal(translateValidationResult(source).message, "Value is required.");
  assert.equal(translateValidationResult(source, { locale: "es" }).message, "Value es obligatorio.");
  assert.equal(translateValidationResult(source, { locale: "pt" }).message, "Value e obrigatorio.");
  assert.equal(
    translateValidationResult(source, { locale: "es", fieldLabel: "Correo" }).message,
    "Correo es obligatorio."
  );
  assert.equal(
    translateValidationResult(source, { messages: { EMPTY: "required!" } }).message,
    "required!"
  );
  const translated = translateValidationResult(source, { locale: "pt" });
  assert.equal(translated.code, "EMPTY", "the machine-readable code survives translation");
  assert.equal(translated.ok, false, "ok survives translation");
});

test("validateCellphoneNumber", () => {
  const valid = validateCellphoneNumber("+573001234567");
  assert.equal(valid.ok, true);
  assert.equal(valid.code, "VALID");
  assert.ok(valid.message.length > 0);

  const tooShort = validateCellphoneNumber("12");
  assert.equal(tooShort.ok, false);
  assert.equal(tooShort.code, "TOO_SHORT");
  assert.ok(tooShort.message.length > 0);

  const empty = validateCellphoneNumber("   ");
  assert.equal(empty.ok, false);
  assert.equal(empty.code, "EMPTY");
});

test("isCellphoneNumber", () => {
  assert.equal(isCellphoneNumber("+573001234567"), true);
  assert.equal(isCellphoneNumber("12"), false);
  assert.equal(isCellphoneNumber(""), false);
  assert.equal(isCellphoneNumber("   "), false);
  assert.equal(isCellphoneNumber("+573001234567"), validateCellphoneNumber("+573001234567").ok);
});

test("validateAddressDirection", () => {
  for (const direction of VALID_DIRECTIONS_EN) {
    assert.equal(validateAddressDirection(direction).ok, true, `rejected EN token ${direction}`);
  }
  assert.equal(validateAddressDirection("north").ok, true, "input is case-insensitive");
  assert.equal(validateAddressDirection("NORTHWEST").ok, true);
  assert.equal(validateAddressDirection("NORTE", { locale: "es" }).ok, true);
  assert.equal(validateAddressDirection("O", { locale: "es" }).ok, true, "es uses O for west");

  const unknown = validateAddressDirection("Sideways");
  assert.equal(unknown.ok, false);
  assert.equal(unknown.code, "INVALID_FORMAT");

  assert.equal(validateAddressDirection("OESTE").ok, false, "an es-only token is not valid in en");
  assert.equal(validateAddressDirection("   ").code, "EMPTY");
});

test("isAddressDirection", () => {
  assert.equal(isAddressDirection("north"), true);
  assert.equal(isAddressDirection("NORTE", { locale: "es" }), true);
  assert.equal(isAddressDirection("Sideways"), false);
  assert.equal(isAddressDirection(""), false);
  assert.equal(isAddressDirection("north"), validateAddressDirection("north").ok);
});

test("isAddresDirection", () => {
  // Kept as a misspelled alias for backward compatibility; must never drift.
  for (const value of ["north", "SOUTH", "NE", "Sideways", "", "   "]) {
    assert.equal(isAddresDirection(value), isAddressDirection(value), `drifted on ${JSON.stringify(value)}`);
  }
  assert.equal(isAddresDirection("NORTE", { locale: "es" }), isAddressDirection("NORTE", { locale: "es" }));
});

test("isAddresDirrection", () => {
  // Kept as a misspelled alias for backward compatibility; must never drift.
  for (const value of ["north", "SOUTH", "NE", "Sideways", "", "   "]) {
    assert.equal(isAddresDirrection(value), isAddressDirection(value), `drifted on ${JSON.stringify(value)}`);
  }
  assert.equal(
    isAddresDirrection("NORTE", { locale: "es" }),
    isAddressDirection("NORTE", { locale: "es" })
  );
});

test("validateName", () => {
  const valid = validateName("Ada Lovelace");
  assert.equal(valid.ok, true);
  assert.equal(valid.code, "VALID");

  assert.equal(validateName("A").code, "TOO_SHORT", "default minimum is 2 characters");
  assert.equal(validateName("ab", { minLength: 5 }).code, "TOO_SHORT");
  assert.equal(validateName("abcdef", { maxLength: 3 }).code, "TOO_LONG");
  assert.equal(validateName("  Ada  ").ok, true, "input is trimmed");
  assert.equal(validateName("   ").code, "EMPTY");
  assert.equal(validateName("A1!@#$%^&*()").code, "INVALID_CHARACTERS");
});

test("isValidName", () => {
  assert.equal(isValidName("Ada Lovelace"), true);
  assert.equal(isValidName("A"), false);
  assert.equal(isValidName("ab", { minLength: 5 }), false);
  assert.equal(isValidName("abcdef", { maxLength: 3 }), false);
  assert.equal(isValidName(""), false);
  assert.equal(isValidName("Ada Lovelace"), validateName("Ada Lovelace").ok);
});

test("validateUsername", () => {
  const valid = validateUsername("ada_lovelace");
  assert.equal(valid.ok, true);
  assert.equal(valid.code, "VALID");

  assert.equal(validateUsername("ab").code, "TOO_SHORT", "default minimum is 3 characters");
  assert.equal(validateUsername("ab!@#$").code, "INVALID_CHARACTERS", "symbols are rejected");
  assert.equal(validateUsername("a".repeat(31)).code, "TOO_LONG", "default maximum is 30 characters");
  assert.equal(validateUsername("ada_lovelace", { maxLength: 3 }).code, "TOO_LONG");
  assert.equal(validateUsername("   ").code, "EMPTY");
});

test("isUsername", () => {
  assert.equal(isUsername("ada_lovelace"), true);
  assert.equal(isUsername("ab"), false);
  assert.equal(isUsername("a".repeat(31)), false);
  assert.equal(isUsername("ada_lovelace", { maxLength: 3 }), false);
  assert.equal(isUsername(""), false);
  assert.equal(isUsername("ada_lovelace"), validateUsername("ada_lovelace").ok);
});

test("validateEmail", () => {
  const valid = validateEmail("ada@example.com");
  assert.equal(valid.ok, true);
  assert.equal(valid.code, "VALID");

  assert.equal(validateEmail("ada@").code, "INVALID_FORMAT");
  assert.equal(validateEmail("ada@example").code, "INVALID_FORMAT");
  assert.equal(validateEmail("ada example@test.com").code, "INVALID_FORMAT");
  assert.equal(validateEmail("  ada@example.com  ").ok, true, "input is trimmed");
  assert.equal(validateEmail("").code, "EMPTY");
  assert.equal(validateEmail("   ").code, "EMPTY");
});

test("isEmail", () => {
  assert.equal(isEmail("ada@example.com"), true);
  assert.equal(isEmail("ada@"), false);
  assert.equal(isEmail(""), false);
  assert.equal(isEmail("   "), false);
  assert.equal(isEmail("ada@example.com"), validateEmail("ada@example.com").ok);
});

test("validateHttpUrl", () => {
  const valid = validateHttpUrl("https://example.com/path");
  assert.equal(valid.ok, true);
  assert.equal(valid.code, "VALID");

  assert.equal(validateHttpUrl("ftp://example.com").code, "INVALID_FORMAT", "only http(s) is allowed");
  assert.equal(validateHttpUrl("example.com").code, "INVALID_FORMAT", "a scheme is required");
  assert.equal(validateHttpUrl("http://").code, "INVALID_FORMAT");
  assert.equal(validateHttpUrl("").code, "EMPTY");
  assert.equal(validateHttpUrl("   ").code, "EMPTY");
});

test("isHttpUrl", () => {
  assert.equal(isHttpUrl("https://example.com/path"), true);
  assert.equal(isHttpUrl("http://example.com"), true);
  assert.equal(isHttpUrl("ftp://example.com"), false);
  assert.equal(isHttpUrl("example.com"), false);
  assert.equal(isHttpUrl(""), false);
  assert.equal(isHttpUrl("https://example.com"), validateHttpUrl("https://example.com").ok);
});

test("validateDomain", () => {
  const valid = validateDomain("example.com");
  assert.equal(valid.ok, true);
  assert.equal(valid.code, "VALID");

  assert.equal(validateDomain("sub.example.co.uk").ok, true);
  assert.equal(validateDomain("EXAMPLE.COM").ok, true, "input is case-insensitive");
  assert.equal(validateDomain("-example.com").code, "INVALID_FORMAT");
  assert.equal(validateDomain("example-.com").code, "INVALID_FORMAT");
  assert.equal(validateDomain("nodot").code, "INVALID_FORMAT");
  assert.equal(validateDomain("a".repeat(250) + ".com").code, "TOO_LONG");
  assert.equal(validateDomain("").code, "EMPTY");
});

test("isDomain", () => {
  assert.equal(isDomain("example.com"), true);
  assert.equal(isDomain("nodot"), false);
  assert.equal(isDomain(""), false);
  assert.equal(isDomain("   "), false);
  assert.equal(isDomain("example.com"), validateDomain("example.com").ok);
});

test("validatePostalCode", () => {
  assert.equal(validatePostalCode("94107", { country: "US" }).ok, true);
  assert.equal(validatePostalCode("110111", { country: "CO" }).ok, true);
  assert.equal(validatePostalCode("9410", { country: "US" }).ok, false);
  assert.equal(validatePostalCode("94107").ok, true, "US is the default country");

  const bad = validatePostalCode("9410", { country: "US" });
  assert.equal(bad.code, "INVALID_FORMAT");
  assert.ok(bad.message.includes("US"), "the message names the country");

  assert.equal(validatePostalCode("  94107  ", { country: "US" }).ok, true, "input is trimmed");
  assert.equal(validatePostalCode("").code, "EMPTY");
  assert.equal(validatePostalCode("   ").code, "EMPTY");
});

test("isPostalCode", () => {
  assert.equal(isPostalCode("94107", { country: "US" }), true);
  assert.equal(isPostalCode("110111", { country: "CO" }), true);
  assert.equal(isPostalCode("9410", { country: "US" }), false);
  assert.equal(isPostalCode("", { country: "US" }), false);
  assert.equal(isPostalCode("94107", { country: "US" }), validatePostalCode("94107", { country: "US" }).ok);
});

test("validateAddressLine", () => {
  const valid = validateAddressLine("Calle 100 #10-20");
  assert.equal(valid.ok, true);
  assert.equal(valid.code, "VALID");

  assert.equal(validateAddressLine("abc").code, "TOO_SHORT", "default minimum is 5 characters");
  assert.equal(validateAddressLine("abcde", { minLength: 10 }).code, "TOO_SHORT");
  assert.equal(validateAddressLine("a".repeat(121)).code, "TOO_LONG", "default maximum is 120 characters");
  assert.equal(validateAddressLine("   ").code, "EMPTY");
});

test("isAddressLine", () => {
  assert.equal(isAddressLine("Calle 100 #10-20"), true);
  assert.equal(isAddressLine("abc"), false);
  assert.equal(isAddressLine("abcde", { minLength: 10 }), false);
  assert.equal(isAddressLine(""), false);
  assert.equal(isAddressLine("Calle 100 #10-20"), validateAddressLine("Calle 100 #10-20").ok);
});

test("validateStrongPassword", () => {
  const valid = validateStrongPassword("Aa1!aaaa");
  assert.equal(valid.ok, true);
  assert.equal(valid.code, "VALID");

  assert.equal(validateStrongPassword("password").code, "INVALID_FORMAT", "needs all four classes");
  assert.equal(validateStrongPassword("ALLUPPER1!").code, "INVALID_FORMAT");
  assert.equal(validateStrongPassword("alllower1!").code, "INVALID_FORMAT");
  assert.equal(validateStrongPassword("NoDigits!!").code, "INVALID_FORMAT");
  assert.equal(validateStrongPassword("NoSymbols1").code, "INVALID_FORMAT");
  assert.equal(validateStrongPassword("Aa1!aaaa", { minLength: 20 }).code, "TOO_SHORT");
  assert.equal(validateStrongPassword("").code, "EMPTY");
});

test("isStrongPassword", () => {
  assert.equal(isStrongPassword("Aa1!aaaa"), true);
  assert.equal(isStrongPassword("password"), false);
  assert.equal(isStrongPassword("Aa1!aaaa", { minLength: 20 }), false);
  assert.equal(isStrongPassword(""), false);
  assert.equal(isStrongPassword("Aa1!aaaa"), validateStrongPassword("Aa1!aaaa").ok);
});

test("validateCreditCardNumber", () => {
  const valid = validateCreditCardNumber("4111111111111111");
  assert.equal(valid.ok, true);
  assert.equal(valid.code, "VALID");

  assert.equal(validateCreditCardNumber("5500005555555559").ok, true, "a Mastercard number passes");
  assert.equal(validateCreditCardNumber("5500 0055 5555 5559").ok, true, "spaces are tolerated");
  assert.equal(validateCreditCardNumber("4111-1111-1111-1111").ok, true, "dashes are tolerated");

  const badChecksum = validateCreditCardNumber("4111111111111112");
  assert.equal(badChecksum.ok, false);
  assert.equal(badChecksum.code, "CHECKSUM_FAILED", "a wrong Luhn digit is a checksum failure");
  // A single /^\d{12,19}$/ regex gates characters and length together, so both
  // report INVALID_FORMAT rather than splitting into INVALID_CHARACTERS.
  assert.equal(validateCreditCardNumber("411111111111111a").code, "INVALID_FORMAT");
  assert.equal(validateCreditCardNumber("41111").code, "INVALID_FORMAT", "shorter than 12 digits");
  assert.equal(validateCreditCardNumber("4".repeat(20)).code, "INVALID_FORMAT", "longer than 19 digits");
  assert.equal(validateCreditCardNumber("").code, "EMPTY");
});

test("isCreditCardNumber", () => {
  assert.equal(isCreditCardNumber("4111111111111111"), true);
  assert.equal(isCreditCardNumber("4111111111111112"), false);
  assert.equal(isCreditCardNumber("411111111111111a"), false);
  assert.equal(isCreditCardNumber(""), false);
  assert.equal(isCreditCardNumber("4111111111111111"), validateCreditCardNumber("4111111111111111").ok);
});

test("validateUuidV4", () => {
  const valid = validateUuidV4("550e8400-e29b-41d4-a716-446655440000");
  assert.equal(valid.ok, true);
  assert.equal(valid.code, "VALID");

  assert.equal(validateUuidV4("550e8400-e29b-41d4-a716-446655440000").ok, true);
  assert.equal(
    validateUuidV4("550e8400-e29b-11d4-a716-446655440000").code,
    "INVALID_FORMAT",
    "the version nibble must be 4"
  );
  assert.equal(validateUuidV4("550e8400e29b41d4a716446655440000").code, "INVALID_FORMAT");
  assert.equal(validateUuidV4("550e8400-e29b-41d4-a716").code, "INVALID_FORMAT");
  assert.equal(validateUuidV4("").code, "EMPTY");
});

test("isUuidV4", () => {
  assert.equal(isUuidV4("550e8400-e29b-41d4-a716-446655440000"), true);
  assert.equal(isUuidV4("550e8400-e29b-11d4-a716-446655440000"), false);
  assert.equal(isUuidV4(""), false);
  assert.equal(isUuidV4("550e8400-e29b-41d4-a716-446655440000"), validateUuidV4("550e8400-e29b-41d4-a716-446655440000").ok);
});

test("validateIpv4", () => {
  const valid = validateIpv4("192.168.1.1");
  assert.equal(valid.ok, true);
  assert.equal(valid.code, "VALID");

  assert.equal(validateIpv4("0.0.0.0").ok, true);
  assert.equal(validateIpv4("255.255.255.255").ok, true);
  assert.equal(validateIpv4("256.1.1.1").code, "INVALID_FORMAT", "octets cap at 255");
  assert.equal(validateIpv4("1.2.3").code, "INVALID_FORMAT");
  assert.equal(validateIpv4("1.2.3.4.5").code, "INVALID_FORMAT");
  assert.equal(validateIpv4("1.2.3.04").code, "INVALID_FORMAT", "leading zeros are rejected");
  assert.equal(validateIpv4("::1").code, "INVALID_FORMAT", "IPv6 is out of scope");
  assert.equal(validateIpv4("").code, "EMPTY");
});

test("isIpv4", () => {
  assert.equal(isIpv4("192.168.1.1"), true);
  assert.equal(isIpv4("256.1.1.1"), false);
  assert.equal(isIpv4("::1"), false);
  assert.equal(isIpv4(""), false);
  assert.equal(isIpv4("192.168.1.1"), validateIpv4("192.168.1.1").ok);
});

test("validateIsoDateString", () => {
  const valid = validateIsoDateString("2026-02-07");
  assert.equal(valid.ok, true);
  assert.equal(valid.code, "VALID");

  assert.equal(validateIsoDateString("2024-02-29").ok, true, "a leap day is valid");
  assert.equal(validateIsoDateString("2023-02-29").code, "INVALID_FORMAT", "a non-leap Feb 29 is invalid");
  assert.equal(validateIsoDateString("07/02/2026").code, "INVALID_FORMAT");
  assert.equal(validateIsoDateString("2026-13-01").code, "INVALID_FORMAT", "month 13 does not exist");
  assert.equal(validateIsoDateString("2026-02-30").code, "INVALID_FORMAT");
  assert.equal(validateIsoDateString("2026-2-7").code, "INVALID_FORMAT", "padding is required");
  assert.equal(validateIsoDateString("").code, "EMPTY");
  assert.equal(validateIsoDateString("   ").code, "EMPTY");
});

test("isIsoDateString", () => {
  assert.equal(isIsoDateString("2026-02-07"), true);
  assert.equal(isIsoDateString("2023-02-29"), false);
  assert.equal(isIsoDateString("2026-2-7"), false);
  assert.equal(isIsoDateString(""), false);
  assert.equal(isIsoDateString("2026-02-07"), validateIsoDateString("2026-02-07").ok);
});

test("error codes stay inside the documented set", () => {
  // Guards the stable error-code contract: adding a function must not silently
  // invent a code that downstream UI and API mappings do not know about.
  const allowed = new Set([
    "VALID",
    "EMPTY",
    "INVALID_FORMAT",
    "TOO_SHORT",
    "TOO_LONG",
    "INVALID_CHARACTERS",
    "UNSUPPORTED_LOCALE",
    "UNSUPPORTED_COUNTRY",
    "CHECKSUM_FAILED"
  ]);
  const probes = ["", "   ", "nonsense", "12", "a@", "-x-", "999.999.999.999"];
  const validators = [
    validateCellphoneNumber,
    validateAddressDirection,
    validateName,
    validateUsername,
    validateEmail,
    validateHttpUrl,
    validateDomain,
    validatePostalCode,
    validateAddressLine,
    validateStrongPassword,
    validateCreditCardNumber,
    validateUuidV4,
    validateIpv4,
    validateIsoDateString
  ];
  for (const validator of validators) {
    for (const probe of probes) {
      const result = validator(probe);
      assert.equal(allowed.has(result.code), true, `${result.code} is outside the documented set`);
      assert.equal(typeof result.message, "string");
      assert.ok(result.message.length > 0, "every result carries a non-empty message");
      assert.equal(typeof result.ok, "boolean");
    }
  }
});

test("validateCellphoneNumber rejects unsupported country presets", () => {
  const bad = validateCellphoneNumber("+573001234567", { country: "ZZ" });
  assert.equal(bad.ok, false);
  assert.equal(bad.code, "UNSUPPORTED_COUNTRY");
  assert.ok(bad.message.includes("ZZ"), "the message names the preset");

  assert.equal(validateCellphoneNumber("+573001234567", { country: "CO" }).ok, true, "a supported preset still works");
});

test("validateCellphoneNumber enforces the digit bounds", () => {
  const tooLong = validateCellphoneNumber("+5730012345678999");
  assert.equal(tooLong.ok, false);
  assert.equal(tooLong.code, "TOO_LONG");

  const narrowed = validateCellphoneNumber("+573001234567", { maxDigits: 10 });
  assert.equal(narrowed.ok, false);
  assert.equal(narrowed.code, "TOO_LONG", "maxDigits narrows the accepted length");

  assert.equal(
    validateCellphoneNumber("+5730012345", { minDigits: 10, maxDigits: 12 }).ok,
    true,
    "explicit bounds are respected"
  );
});

test("validateAddressDirection rejects an unsupported locale", () => {
  const bad = validateAddressDirection("north", { locale: "fr" });
  assert.equal(bad.ok, false);
  assert.equal(bad.code, "UNSUPPORTED_LOCALE");
  assert.ok(bad.message.includes("fr"), "the message names the locale");

  assert.equal(isAddressDirection("north", { locale: "fr" }), false, "the boolean wrapper agrees");
  assert.equal(validateAddressDirection("north", { locale: "en" }).ok, true);
});

test("validatePostalCode rejects an unsupported country", () => {
  const bad = validatePostalCode("94107", { country: "ZZ" });
  assert.equal(bad.ok, false);
  assert.equal(bad.code, "UNSUPPORTED_COUNTRY");
  assert.ok(bad.message.includes("ZZ"), "the message names the country");

  assert.equal(isPostalCode("94107", { country: "ZZ" }), false, "the boolean wrapper agrees");
});

test("validateAddressLine rejects unsupported characters", () => {
  const bad = validateAddressLine("Calle 100 #10-20 <script>");
  assert.equal(bad.ok, false);
  assert.equal(bad.code, "INVALID_CHARACTERS");

  assert.equal(isAddressLine("Calle 100 #10-20 <script>"), false, "the boolean wrapper agrees");
  assert.equal(validateAddressLine("Calle 100 #10-20").ok, true);
  assert.equal(validateAddressLine("Av. Siempre Viva 742, apto 3B").ok, true, "accents and punctuation are allowed");
});