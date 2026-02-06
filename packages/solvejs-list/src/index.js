export function unique(values) {
    return [...new Set(values)];
}
export function compact(values) {
    return values.filter(Boolean);
}
export function chunk(values, size) {
    if (!Number.isInteger(size) || size <= 0) {
        throw new TypeError("Expected size to be a positive integer.");
    }
    const output = [];
    for (let index = 0; index < values.length; index += size) {
        output.push(values.slice(index, index + size));
    }
    return output;
}
export function groupBy(values, selector) {
    return values.reduce((accumulator, value) => {
        const key = selector(value);
        if (!accumulator[key]) {
            accumulator[key] = [];
        }
        accumulator[key].push(value);
        return accumulator;
    }, {});
}
//# sourceMappingURL=index.js.map