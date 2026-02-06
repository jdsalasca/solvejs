export type DateFormatToken = "YYYY-MM-DD" | "DD/MM/YYYY" | "MM-DD-YYYY";

function pad(value: number): string {
  return value.toString().padStart(2, "0");
}

function isDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

export function isValidDate(value: unknown): value is Date {
  return isDate(value);
}

export function parseIsoDate(value: string): Date | null {
  const parsed = new Date(value);
  return isDate(parsed) ? parsed : null;
}

export function addDays(date: Date, amount: number): Date {
  if (!isDate(date)) {
    throw new TypeError("Expected a valid Date instance.");
  }
  if (!Number.isInteger(amount)) {
    throw new TypeError("Expected amount to be an integer.");
  }

  const next = new Date(date.getTime());
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

export function startOfDay(date: Date): Date {
  if (!isDate(date)) {
    throw new TypeError("Expected a valid Date instance.");
  }
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function formatDate(date: Date, format: DateFormatToken = "YYYY-MM-DD"): string {
  if (!isDate(date)) {
    throw new TypeError("Expected a valid Date instance.");
  }

  const year = date.getUTCFullYear();
  const month = pad(date.getUTCMonth() + 1);
  const day = pad(date.getUTCDate());

  if (format === "YYYY-MM-DD") {
    return `${year}-${month}-${day}`;
  }

  if (format === "DD/MM/YYYY") {
    return `${day}/${month}/${year}`;
  }

  return `${month}-${day}-${year}`;
}
