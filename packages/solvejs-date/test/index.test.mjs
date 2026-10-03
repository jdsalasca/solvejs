import test from "node:test";
import assert from "node:assert/strict";
import {
  addBusinessDays,
  addDays,
  daysInMonth,
  diffInDays,
  endOfDay,
  formatDate,
  fromUtcParts,
  isBusinessDay,
  isLeapYear,
  isValidDate,
  isWeekend,
  nextBusinessDay,
  parseDateStrict,
  parseIsoDate,
  parseUnixTimestamp,
  previousBusinessDay,
  startOfDay,
  toIsoDate
} from "../dist/esm/index.js";

// Every input below is anchored to midday UTC so that the calendar day is the
// same under any host timezone. Using `new Date(2024, 2, 8)` instead would make
// the result depend on TZ, because that constructor builds a local-midnight Date.
const day = (iso) => new Date(`${iso}T12:00:00.000Z`);
const isoDay = (date) => toIsoDate(date);

test("isValidDate", () => {
  assert.equal(isValidDate(new Date()), true);
  assert.equal(isValidDate(new Date("2026-02-07T00:00:00.000Z")), true);
  assert.equal(isValidDate(new Date("nope")), false);
  assert.equal(isValidDate("2026-02-07"), false, "a string is not a Date");
  assert.equal(isValidDate(null), false);
  assert.equal(isValidDate(undefined), false);
  assert.equal(isValidDate({}), false);
  assert.equal(isValidDate(1738905600000), false, "a timestamp number is not a Date");
});

test("parseIsoDate", () => {
  assert.equal(parseIsoDate("2026-02-07").toISOString(), "2026-02-07T00:00:00.000Z");
  assert.equal(parseIsoDate("2026-02-07T10:30:00.000Z").toISOString(), "2026-02-07T10:30:00.000Z");
  assert.equal(parseIsoDate("2026-02-07T00:00:00.000Z").getTime(), Date.UTC(2026, 1, 7));
  assert.equal(parseIsoDate("nope"), null);
  assert.equal(parseIsoDate(""), null);

  // parseIsoDate is deliberately lenient: it defers to `new Date(value)`, which
  // means it inherits two traps from the platform. Both are pinned here so the
  // behaviour cannot change silently. Use parseDateStrict for untrusted input.
  //
  // Trap 1: a non-ISO slash date is accepted and read as US month/day/year in
  // LOCAL time, so "07/02/2026" means 2 July, not 7 February. A date-only
  // non-ISO string carries no timezone designator, so the instant depends on the
  // host. Local getters are the only timezone-invariant way to read it back.
  const slash = parseIsoDate("07/02/2026");
  assert.notEqual(slash, null, "a slash date is accepted rather than rejected");
  assert.equal(slash.getFullYear(), 2026);
  assert.equal(slash.getMonth(), 6, "July, not February");
  assert.equal(slash.getDate(), 2, "the 2nd, not the 7th");
  // Trap 2: an impossible calendar day silently rolls over to the next real one.
  assert.equal(
    parseIsoDate("2026-02-30").toISOString(),
    "2026-03-02T00:00:00.000Z",
    "an impossible day rolls forward"
  );

  assert.equal(parseDateStrict("2026-02-30"), null, "the strict parser rejects the rollover input");
  assert.equal(parseDateStrict("07/02/2026"), null, "the strict parser rejects the slash format");
  assert.equal(parseDateStrict("07/02/2026", "DD/MM/YYYY").toISOString(), "2026-02-07T00:00:00.000Z");
});

test("parseUnixTimestamp", () => {
  const epochMs = Date.UTC(2025, 1, 7);
  assert.equal(parseUnixTimestamp(0).toISOString(), "1970-01-01T00:00:00.000Z");
  assert.equal(parseUnixTimestamp(epochMs).toISOString(), "2025-02-07T00:00:00.000Z");
  assert.equal(
    parseUnixTimestamp(epochMs / 1000, "seconds").toISOString(),
    "2025-02-07T00:00:00.000Z",
    "the seconds unit scales the value"
  );
  assert.notEqual(
    parseUnixTimestamp(epochMs / 1000).toISOString(),
    parseUnixTimestamp(epochMs / 1000, "seconds").toISOString(),
    "the default unit is milliseconds, not seconds"
  );
  assert.equal(parseUnixTimestamp(NaN), null);
  assert.equal(parseUnixTimestamp(Number.NaN, "seconds"), null);
});

test("parseDateStrict", () => {
  assert.equal(parseDateStrict("2024-02-29").toISOString(), "2024-02-29T00:00:00.000Z", "a leap day is valid");
  assert.equal(parseDateStrict("2023-02-29"), null, "Feb 29 in a non-leap year is rejected");
  assert.equal(parseDateStrict("2024-02-30"), null);
  assert.equal(parseDateStrict("2024-13-01"), null);
  assert.equal(parseDateStrict("2024-00-10"), null);
  assert.equal(parseDateStrict("2024-01-00"), null);
  assert.equal(parseDateStrict("24-01-01"), null, "the year must be four digits");
  assert.equal(parseDateStrict("nope"), null);
  assert.equal(parseDateStrict(""), null);

  assert.equal(
    parseDateStrict("07/02/2026", "DD/MM/YYYY").toISOString(),
    "2026-02-07T00:00:00.000Z",
    "DD/MM/YYYY is day first"
  );
  assert.equal(
    parseDateStrict("02-07-2026", "MM-DD-YYYY").toISOString(),
    "2026-02-07T00:00:00.000Z",
    "MM-DD-YYYY is month first"
  );
  assert.equal(parseDateStrict("2026-02-07", "DD/MM/YYYY"), null, "the format must match the input shape");
  assert.equal(
    parseDateStrict("13/01/2026", "DD/MM/YYYY").toISOString(),
    "2026-01-13T00:00:00.000Z",
    "a 13th day of the month is valid"
  );
  assert.equal(parseDateStrict("32/01/2026", "DD/MM/YYYY"), null, "a 32nd day is rejected");
});

test("addDays", () => {
  assert.equal(isoDay(addDays(day("2024-01-31"), 1)), "2024-02-01", "a 31-day month rolls into the next");
  assert.equal(isoDay(addDays(day("2024-12-31"), 1)), "2025-01-01", "the year rolls over");
  assert.equal(isoDay(addDays(day("2024-03-01"), -1)), "2024-02-29", "going back into a leap February");
  assert.equal(isoDay(addDays(day("2024-02-28"), 1)), "2024-02-29", "the leap day is reachable");
  assert.equal(isoDay(addDays(day("2023-02-28"), 1)), "2023-03-01", "a non-leap February skips the 29th");
  assert.equal(isoDay(addDays(day("2024-01-15"), 0)), "2024-01-15");
  assert.equal(isoDay(addDays(day("2024-01-15"), 365)), "2025-01-14", "the leap day sits inside the span");
  assert.equal(isoDay(addDays(day("2024-01-15"), 366)), "2025-01-15", "366 days covers the leap day exactly");
  assert.equal(isoDay(addDays(day("2023-01-15"), 365)), "2024-01-15", "a common year is 365 days");
  assert.throws(() => addDays("2024-01-15", 1), /valid Date instance/);
});

test("isWeekend", () => {
  assert.equal(isWeekend(day("2024-03-08")), false, "Friday is not a weekend");
  assert.equal(isWeekend(day("2024-03-09")), true, "Saturday");
  assert.equal(isWeekend(day("2024-03-10")), true, "Sunday");
  assert.equal(isWeekend(day("2024-03-11")), false, "Monday");
  assert.throws(() => isWeekend("2024-03-09"), /valid Date instance/);
});

test("isBusinessDay", () => {
  assert.equal(isBusinessDay(day("2024-03-08")), true, "Friday");
  assert.equal(isBusinessDay(day("2024-03-11")), true, "Monday");
  assert.equal(isBusinessDay(day("2024-03-09")), false, "Saturday");
  assert.equal(isBusinessDay(day("2024-03-10")), false, "Sunday");
  assert.throws(() => isBusinessDay("2024-03-09"), /valid Date instance/);
});

test("addBusinessDays", () => {
  assert.equal(isoDay(addBusinessDays(day("2024-03-08"), 1)), "2024-03-11", "Friday plus one skips the weekend");
  assert.equal(isoDay(addBusinessDays(day("2024-03-11"), 1)), "2024-03-12");
  assert.equal(isoDay(addBusinessDays(day("2024-03-08"), 5)), "2024-03-15", "five business days lands on Friday");
  assert.equal(isoDay(addBusinessDays(day("2024-03-08"), 0)), "2024-03-08");
  assert.equal(isoDay(addBusinessDays(day("2024-03-11"), -1)), "2024-03-08", "going back skips the weekend too");
  assert.equal(isoDay(addBusinessDays(day("2024-03-11"), -5)), "2024-03-04");
  assert.equal(
    isoDay(addBusinessDays(day("2024-03-08"), 1)),
    isoDay(nextBusinessDay(day("2024-03-08"))),
    "adding one business day equals the next business day"
  );
});

test("nextBusinessDay", () => {
  assert.equal(isoDay(nextBusinessDay(day("2024-03-08"))), "2024-03-11", "Friday moves to Monday");
  assert.equal(isoDay(nextBusinessDay(day("2024-03-11"))), "2024-03-12", "a business day still moves forward");
  assert.equal(isoDay(nextBusinessDay(day("2024-03-09"))), "2024-03-11", "Saturday moves to Monday");
  assert.equal(isoDay(nextBusinessDay(day("2024-03-10"))), "2024-03-11", "Sunday moves to Monday");
  assert.throws(() => nextBusinessDay("2024-03-08"), /valid Date instance/);
});

test("previousBusinessDay", () => {
  assert.equal(isoDay(previousBusinessDay(day("2024-03-11"))), "2024-03-08", "Monday moves back to Friday");
  assert.equal(isoDay(previousBusinessDay(day("2024-03-08"))), "2024-03-07", "a business day still moves back");
  assert.equal(isoDay(previousBusinessDay(day("2024-03-09"))), "2024-03-08", "Saturday moves back to Friday");
  assert.equal(isoDay(previousBusinessDay(day("2024-03-10"))), "2024-03-08", "Sunday moves back to Friday");
  assert.throws(() => previousBusinessDay("2024-03-11"), /valid Date instance/);
});

test("startOfDay", () => {
  assert.equal(startOfDay(day("2024-03-08")).toISOString(), "2024-03-08T00:00:00.000Z");
  assert.equal(startOfDay(new Date("2024-03-08T23:59:59.999Z")).toISOString(), "2024-03-08T00:00:00.000Z");
  assert.equal(startOfDay(new Date("2024-03-08T00:00:00.000Z")).toISOString(), "2024-03-08T00:00:00.000Z");
  assert.throws(() => startOfDay("2024-03-08"), /valid Date instance/);
});

test("fromUtcParts", () => {
  assert.equal(fromUtcParts(2024, 1, 1).toISOString(), "2024-01-01T00:00:00.000Z");
  assert.equal(fromUtcParts(2024, 12, 31).toISOString(), "2024-12-31T00:00:00.000Z");
  assert.equal(fromUtcParts(2024, 2, 29).toISOString(), "2024-02-29T00:00:00.000Z", "a leap day is constructible");
  assert.equal(fromUtcParts(2024, 1, 1).getTime(), Date.UTC(2024, 0, 1), "the parts are read as UTC");
  assert.equal(isoDay(fromUtcParts(2024, 1, 1)), "2024-01-01", "round trips through toIsoDate");
});

test("endOfDay", () => {
  assert.equal(endOfDay(day("2024-03-08")).toISOString(), "2024-03-08T23:59:59.999Z");
  assert.equal(endOfDay(new Date("2024-03-08T00:00:00.000Z")).toISOString(), "2024-03-08T23:59:59.999Z");
  assert.equal(
    endOfDay(day("2024-03-08")).getTime() - startOfDay(day("2024-03-08")).getTime(),
    86399999,
    "a day spans 24 hours minus the final millisecond"
  );
  assert.throws(() => endOfDay("2024-03-08"), /valid Date instance/);
});

test("diffInDays", () => {
  assert.equal(diffInDays(new Date("2024-01-02T00:00:00.000Z"), new Date("2024-01-01T00:00:00.000Z")), 1);
  assert.equal(diffInDays(new Date("2024-01-01T00:00:00.000Z"), new Date("2024-01-01T00:00:00.000Z")), 0);
  assert.equal(diffInDays(new Date("2024-01-01T00:00:00.000Z"), new Date("2024-01-02T00:00:00.000Z")), -1);
  assert.equal(diffInDays(new Date("2025-01-01T00:00:00.000Z"), new Date("2024-01-01T00:00:00.000Z")), 366, "2024 is a leap year");
  assert.equal(diffInDays(new Date("2024-01-01T00:00:00.000Z"), new Date("2023-01-01T00:00:00.000Z")), 365, "2023 is a common year");
  assert.equal(diffInDays(new Date("2023-01-01T00:00:00.000Z"), new Date("2024-01-01T00:00:00.000Z")), -365);
  assert.equal(
    diffInDays(new Date("2024-01-02T05:00:00.000Z"), new Date("2024-01-01T20:00:00.000Z")),
    1,
    "calendar days are counted, not 24-hour chunks"
  );
  assert.throws(() => diffInDays("2024-01-02", new Date()), /valid Date instance/);
});

test("isLeapYear", () => {
  assert.equal(isLeapYear(2024), true);
  assert.equal(isLeapYear(2000), true, "divisible by 400");
  assert.equal(isLeapYear(1900), false, "divisible by 100 but not 400");
  assert.equal(isLeapYear(2100), false);
  assert.equal(isLeapYear(2023), false);
  assert.equal(isLeapYear(2025), false);
});

test("daysInMonth", () => {
  assert.equal(daysInMonth(2024, 2), 29, "February in a leap year");
  assert.equal(daysInMonth(2023, 2), 28, "February in a common year");
  assert.equal(daysInMonth(2024, 1), 31);
  assert.equal(daysInMonth(2024, 4), 30);
  assert.equal(daysInMonth(2024, 12), 31);
  assert.throws(() => daysInMonth(2024, 0), /month to be between 1 and 12/);
  assert.throws(() => daysInMonth(2024, 13), /month to be between 1 and 12/);
  assert.throws(() => daysInMonth(2024, -1), /month to be between 1 and 12/);
});

test("toIsoDate", () => {
  assert.equal(toIsoDate(new Date("2026-02-07T00:00:00.000Z")), "2026-02-07");
  assert.equal(toIsoDate(new Date("2026-02-07T23:59:59.999Z")), "2026-02-07");
  assert.equal(toIsoDate(new Date("2026-12-31T00:00:00.000Z")), "2026-12-31");
});

test("formatDate", () => {
  const value = new Date("2024-03-08T12:00:00.000Z");
  assert.equal(formatDate(value), "2024-03-08", "YYYY-MM-DD is the default");
  assert.equal(formatDate(value, "YYYY-MM-DD"), "2024-03-08");
  assert.equal(formatDate(value, "DD/MM/YYYY"), "08/03/2024");
  assert.equal(formatDate(value, "MM-DD-YYYY"), "03-08-2024");
  assert.equal(formatDate(new Date("2024-01-05T12:00:00.000Z"), "DD/MM/YYYY"), "05/01/2024", "the day is zero padded");
  assert.throws(() => formatDate("2024-03-08"), /valid Date instance/);
});

test("date arithmetic is deterministic across host timezones", () => {
  // The functions read the UTC calendar of the input Date, so a UTC-anchored
  // input gives the same answer everywhere. This is the anchoring rule that makes
  // the other assertions in this file stable on any CI machine.
  const original = process.env.TZ;
  try {
    for (const tz of ["UTC", "America/New_York", "Asia/Tokyo", "Australia/Sydney"]) {
      process.env.TZ = tz;
      assert.equal(isoDay(addDays(day("2024-03-08"), 1)), "2024-03-09", `addDays under ${tz}`);
      assert.equal(isoDay(nextBusinessDay(day("2024-03-08"))), "2024-03-11", `nextBusinessDay under ${tz}`);
      assert.equal(startOfDay(day("2024-03-08")).toISOString(), "2024-03-08T00:00:00.000Z", `startOfDay under ${tz}`);
      assert.equal(isWeekend(day("2024-03-09")), true, `isWeekend under ${tz}`);
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
