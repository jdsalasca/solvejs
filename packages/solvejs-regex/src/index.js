export const REGEX_PATTERNS = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phoneE164: /^\+[1-9]\d{1,14}$/,
    urlHttp: /^https?:\/\/.+/i,
    hexColor: /^#(?:[0-9a-fA-F]{3}){1,2}$/,
    username: /^[a-zA-Z0-9_]{3,30}$/
};
export function testPattern(input, pattern) {
    if (!(pattern instanceof RegExp)) {
        throw new TypeError("Expected pattern to be a RegExp instance.");
    }
    return pattern.test(input);
}
export function validateWithPattern(input, pattern, options) {
    const normalized = options?.trim ? input.trim() : input;
    return testPattern(normalized, pattern);
}
export function validateByName(input, patternName) {
    return testPattern(input, REGEX_PATTERNS[patternName]);
}
//# sourceMappingURL=index.js.map