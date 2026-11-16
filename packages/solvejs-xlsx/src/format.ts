import { failXlsx } from "./errors.js";
import type { XlsxCellValue } from "./shared.js";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = MONTHS.map((month) => month.slice(0, 3));
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_SHORT = DAYS.map((day) => day.slice(0, 3));
const CURRENCIES = ["$", "€", "£", "¥", "₹", "₽", "¢"];

function stripDecorations(format: string): string {
  return format
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\\(.)/g, "$1")
    .replace(/"([^"]*)"/g, "$1");
}

function sectionFor(value: number, format: string): string {
  const sections = format.split(";");
  if (value < 0) return sections[1] ?? sections[0];
  if (value === 0) return sections[2] ?? sections[0];
  return sections[0];
}

function decimalsOf(pattern: string): { max: number; min: number } {
  const match = /\.([0#]+)/.exec(pattern);
  if (!match) return { max: 0, min: 0 };
  return {
    max: match[1].length,
    min: (match[1].match(/0/g) ?? []).length
  };
}

function grouped(value: string): string {
  const [integer, decimals] = value.split(".");
  const sign = integer.startsWith("-") ? "-" : "";
  const digits = sign ? integer.slice(1) : integer;
  // eslint-disable-next-line security/detect-unsafe-regex -- linear lookahead over a fixed 3-digit group
  const withSeparators = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}${withSeparators}${decimals ? `.${decimals}` : ""}`;
}

function numberBody(value: number, pattern: string, decimals: { max: number; min: number }): string {
  let text = value.toFixed(decimals.max);
  if (decimals.max > decimals.min) {
    const [integer, fraction = ""] = text.split(".");
    let trimmed = fraction.replace(/0+$/, "");
    if (trimmed.length < decimals.min) trimmed = fraction.slice(0, decimals.min);
    text = decimals.min === 0 && trimmed.length === 0 ? integer : `${integer}.${trimmed}`;
  }
  return /#,##|0,000/.test(pattern) ? grouped(text) : text;
}

function currencyOf(pattern: string): string {
  return CURRENCIES.find((symbol) => pattern.includes(symbol)) ?? "";
}

function scientificText(value: number, pattern: string): string {
  return value.toExponential(decimalsOf(pattern).max).replace("e", "E");
}

function signedText(text: string, pattern: string, negative: boolean): string {
  if (!negative) return text;
  return /\(.*\)/.test(pattern) ? `(${text})` : `-${text}`;
}

function patternText(value: number, pattern: string): string {
  const percent = pattern.includes("%");
  const magnitude = Math.abs(value) * (percent ? 100 : 1);
  let text = numberBody(magnitude, pattern, decimalsOf(pattern));
  if (percent) text += "%";
  const currency = currencyOf(pattern);
  return currency ? `${currency}${text}` : text;
}

/** Formats a number with the common Excel number-format syntax. */
export function formatExcelNumber(value: number, format = "General"): string {
  if (!Number.isFinite(value)) failXlsx("XLSX_INVALID_INPUT", "Expected a finite number.", { value });
  if (format === "General" || format === "@" || format.length === 0) return String(value);
  const pattern = stripDecorations(sectionFor(value, format));
  if (pattern.includes("@")) return String(value);
  if (/E[+-]0+/i.test(pattern)) return scientificText(value, pattern);
  return signedText(patternText(value, pattern), pattern, value < 0);
}

function isMinuteToken(next: string | undefined, seenHour: boolean): boolean {
  if (seenHour) return true;
  const lower = next?.toLowerCase();
  return lower?.startsWith("s") === true || next === ":" || next === ".";
}

type DateState = { seenHour: boolean; ampm: boolean };
type DateHandler = (value: Date, state: DateState, next: string | undefined) => string;

const DATE_HANDLERS: Record<string, DateHandler> = {
  yyyy: (value) => String(value.getUTCFullYear()),
  yy: (value) => String(value.getUTCFullYear()).slice(-2),
  mmmm: (value) => MONTHS[value.getUTCMonth()],
  mmm: (value) => MONTHS_SHORT[value.getUTCMonth()],
  mm: (value, state, next) =>
    isMinuteToken(next, state.seenHour)
      ? String(value.getUTCMinutes()).padStart(2, "0")
      : String(value.getUTCMonth() + 1).padStart(2, "0"),
  m: (value, state, next) =>
    isMinuteToken(next, state.seenHour) ? String(value.getUTCMinutes()) : String(value.getUTCMonth() + 1),
  dddd: (value) => DAYS[value.getUTCDay()],
  ddd: (value) => DAYS_SHORT[value.getUTCDay()],
  dd: (value) => String(value.getUTCDate()).padStart(2, "0"),
  d: (value) => String(value.getUTCDate()),
  hh: (value, state) => {
    state.seenHour = true;
    const hours = state.ampm ? value.getUTCHours() % 12 || 12 : value.getUTCHours();
    return String(hours).padStart(2, "0");
  },
  h: (value, state) => {
    state.seenHour = true;
    return String(state.ampm ? value.getUTCHours() % 12 || 12 : value.getUTCHours());
  },
  ss: (value) => String(value.getUTCSeconds()).padStart(2, "0"),
  s: (value) => String(value.getUTCSeconds()),
  "am/pm": (value) => (value.getUTCHours() < 12 ? "AM" : "PM")
};

/** Formats a Date using the common Excel date/time tokens. */
export function formatExcelDate(value: Date, format = "yyyy-mm-dd"): string {
  if (Number.isNaN(value.getTime())) failXlsx("XLSX_INVALID_INPUT", "Expected a valid Date.");
  const tokens = format.match(/\[[^\]]*\]|"[^"]*"|\\.|yyyy|yy|mmmm|mmm|mm|m|dddd|ddd|dd|d|hh|h|ss|s|AM\/PM|./gi) ?? [];
  const state: DateState = { seenHour: false, ampm: /AM\/PM/i.test(format) };
  let output = "";
  tokens.forEach((token, index) => {
    if (token.startsWith('"') && token.endsWith('"')) {
      output += token.slice(1, -1);
      return;
    }
    if (token.startsWith("\\")) {
      output += token.slice(1);
      return;
    }
    if (token.startsWith("[")) return;
    const handler = DATE_HANDLERS[token.toLowerCase()];
    output += handler ? handler(value, state, tokens[index + 1]) : token;
  });
  return output;
}

/** Formats a cell value for display, using an optional Excel number format. */
export function formatCellValue(value: XlsxCellValue, format?: string): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return formatExcelDate(value, format);
  if (typeof value === "number") return formatExcelNumber(value, format);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return value;
}
