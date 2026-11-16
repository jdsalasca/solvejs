/** Stable error codes for the XLSX package. */
export type XlsxErrorCode =
  | "XLSX_INVALID_INPUT"
  | "XLSX_INVALID_ZIP"
  | "XLSX_INVALID_XML"
  | "XLSX_UNSUPPORTED"
  | "XLSX_LIMIT_EXCEEDED";

/** Error thrown by the XLSX reader and writer. */
export class XlsxError extends Error {
  readonly code: XlsxErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: XlsxErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "XlsxError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, XlsxError.prototype);
  }
}

export function failXlsx(code: XlsxErrorCode, message: string, details: Record<string, unknown> = {}): never {
  throw new XlsxError(code, message, details);
}
