# SolveJS 1.8.0 Market Audit

Date: 2026-05-28

## 1. Bugs and reliability risks

- `toNumber` accepted malformed thousands separators such as `1,2,3` because commas were stripped before validation. This is fixed in 1.8.0 with strict grouping checks.
- Date workflows needed a lightweight business-day path for common billing, SLA, delivery, and support use cases. 1.8.0 adds weekend-aware helpers.
- List analytics needed a direct counting primitive. Rewriting this logic increases small data bugs and makes examples less attractive. 1.8.0 adds `countBy`.
- Validator outputs had stable codes but no first-class UX translation layer. Product teams still had to write repetitive mapping code. 1.8.0 adds EN/ES/PT message translation.

## 2. Useful functions to create

- `translateValidationResult` to turn structured validator results into UI-ready messages with locale and field labels.
- `addBusinessDays`, `isBusinessDay`, and `isWeekend` for common business calendar workflows without a heavy date dependency.
- `countBy` for dashboards, API payload summaries, log/event analysis, and form option totals.
- Stricter `toNumber` parsing for safer form and CSV ingestion.

## 3. Market-needed functions for wider adoption

- Form validation UX helpers: translated messages, stable error codes, and field-label aware output.
- Business-date helpers: weekend-aware deadlines and SLA calculations.
- Data transformation helpers: counting/grouping/deduping primitives that replace repeated lodash-style snippets.
- Safer ingestion utilities: strict parsing for numbers, URLs, JSON, and environment values.

## 4. Implemented in 1.8.0

- `@jdsalasc/solvejs-validators`: `translateValidationResult`.
- `@jdsalasc/solvejs-date`: `addBusinessDays`, `isBusinessDay`, `isWeekend`.
- `@jdsalasc/solvejs-list`: `countBy`.
- `@jdsalasc/solvejs-numbers`: stricter thousands separator validation in `toNumber`.
- Package descriptions updated to be clearer and more adoption-oriented for npm search and package pages.
