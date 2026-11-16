/** Stable error codes for the PDF package. */
export type PdfErrorCode = "PDF_INVALID_INPUT" | "PDF_LIMIT_EXCEEDED" | "PDF_UNSUPPORTED";

/** Error thrown by every PDF operation that rejects its input. */
export class PdfError extends Error {
  readonly code: PdfErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: PdfErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "PdfError";
    this.code = code;
    this.details = details;
  }
}

/** Throws a `PdfError` with a stable code. */
export function failPdf(
  code: PdfErrorCode,
  message: string,
  details: Record<string, unknown> = {}
): never {
  throw new PdfError(code, message, details);
}
