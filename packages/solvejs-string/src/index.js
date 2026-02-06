function normalize(value) {
    return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}
export function toKebabCase(value) {
    return normalize(value)
        .replace(/([a-z\d])([A-Z])/g, "$1-$2")
        .replace(/[^a-zA-Z\d]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase();
}
export function toCamelCase(value) {
    const tokens = toKebabCase(value).split("-").filter(Boolean);
    return tokens
        .map((token, index) => (index === 0 ? token : token[0].toUpperCase() + token.slice(1)))
        .join("");
}
export function capitalize(value) {
    if (value.length === 0) {
        return value;
    }
    return value[0].toUpperCase() + value.slice(1);
}
export function truncate(value, maxLength, suffix = "...") {
    if (!Number.isInteger(maxLength) || maxLength < 0) {
        throw new TypeError("Expected maxLength to be a non-negative integer.");
    }
    if (value.length <= maxLength) {
        return value;
    }
    if (maxLength <= suffix.length) {
        return suffix.slice(0, maxLength);
    }
    return `${value.slice(0, maxLength - suffix.length)}${suffix}`;
}
//# sourceMappingURL=index.js.map