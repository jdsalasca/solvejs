export type DateFormatToken = "YYYY-MM-DD" | "DD/MM/YYYY" | "MM-DD-YYYY";
export declare function isValidDate(value: unknown): value is Date;
export declare function parseIsoDate(value: string): Date | null;
export declare function addDays(date: Date, amount: number): Date;
export declare function startOfDay(date: Date): Date;
export declare function formatDate(date: Date, format?: DateFormatToken): string;
