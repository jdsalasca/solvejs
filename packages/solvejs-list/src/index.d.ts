export declare function unique<T>(values: readonly T[]): T[];
export declare function compact<T>(values: readonly (T | null | undefined | false | 0 | "")[]): T[];
export declare function chunk<T>(values: readonly T[], size: number): T[][];
export declare function groupBy<T, K extends PropertyKey>(values: readonly T[], selector: (value: T) => K): Record<K, T[]>;
