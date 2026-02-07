# SolveJS Community Pain Points (Detailed)

Date analyzed: February 7, 2026.

## Why these pain points are high priority

- JavaScript remains one of the most used languages by developers (Stack Overflow Developer Survey 2025):  
  https://survey.stackoverflow.co/2025/
- Utility categories like date handling, validation, and list transforms show large ecosystem demand in npm downloads (`last-month`, checked on February 7, 2026):  
  - lodash: https://api.npmjs.org/downloads/point/last-month/lodash  
  - date-fns: https://api.npmjs.org/downloads/point/last-month/date-fns  
  - dayjs: https://api.npmjs.org/downloads/point/last-month/dayjs  
  - validator: https://api.npmjs.org/downloads/point/last-month/validator
- Date parsing edge cases and timezone behavior are still a recurring source of bugs (MDN):  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/parse  
  https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date

## Pain Point 1: Date parsing and timezone drift

Common failures:
- Parsing user dates inconsistently across environments.
- Off-by-one day errors after timezone conversion.
- Mixing local and UTC logic in APIs.

SolveJS response:
- `parseDateStrict`, `toIsoDate`, `parseUnixTimestamp`, `startOfDay`, `endOfDay`, `diffInDays`.

## Pain Point 2: Form validation with actionable feedback

Common failures:
- Boolean-only validators without reason codes.
- Inconsistent validation logic between frontend/backend.
- Missing reusable rules for phone, username, address, and card inputs.

SolveJS response:
- Structured validators with `{ ok, code, message }`.
- `validateCellphoneNumber`, `validateUsername`, `validateAddressLine`, `validateCreditCardNumber`.
- New API validations for `UUID v4`, `IPv4`, and strict ISO dates.

## Pain Point 3: Data transformation boilerplate in lists

Common failures:
- Rewriting `groupBy`, deduplication, sorting, and partition logic.
- Subtle bugs in custom dedupe-by-key implementation.

SolveJS response:
- `groupBy`, `keyBy`, `partition`, `sortBy`, `uniqueBy`, `difference`, `intersection`.

## Pain Point 4: Numeric parsing and business calculations

Common failures:
- Form input like `1,234.50` failing numeric parsing.
- Repeated edge-case checks for zero denominator and range boundaries.

SolveJS response:
- `toNumber`, `safeDivide`, `percent`, `percentChange`, `clamp`, `isBetween`.

## Pain Point 5: Regex reliability and security ergonomics

Common failures:
- Incorrect regex for common formats.
- Unsafe dynamic regex construction.

SolveJS response:
- `REGEX_PATTERNS` (`email`, `uuidV4`, `ipv4`, `isoDate`, etc.).
- `escapeRegex` to safely compose dynamic patterns.

## Next Community-Facing Opportunities

1. Locale packs for postal/address/phone validation.
2. Object utilities package (`solvejs-objects`) based on issue demand.
3. Framework examples (Next.js, Express, NestJS) for fast adoption.
4. More "problem-first" docs pages for top search queries.
