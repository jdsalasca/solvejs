export declare const REGEX_PATTERNS: {
    readonly email: RegExp;
    readonly phoneE164: RegExp;
    readonly urlHttp: RegExp;
    readonly hexColor: RegExp;
    readonly username: RegExp;
};
export type PatternName = keyof typeof REGEX_PATTERNS;
export declare function testPattern(input: string, pattern: RegExp): boolean;
export declare function validateWithPattern(input: string, pattern: RegExp, options?: {
    trim?: boolean;
}): boolean;
export declare function validateByName(input: string, patternName: PatternName): boolean;
