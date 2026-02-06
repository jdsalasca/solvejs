function pad(value) {
    return value.toString().padStart(2, "0");
}
function isDate(value) {
    return value instanceof Date && !Number.isNaN(value.getTime());
}
export function isValidDate(value) {
    return isDate(value);
}
export function parseIsoDate(value) {
    const parsed = new Date(value);
    return isDate(parsed) ? parsed : null;
}
export function addDays(date, amount) {
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
export function startOfDay(date) {
    if (!isDate(date)) {
        throw new TypeError("Expected a valid Date instance.");
    }
    return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}
export function formatDate(date, format = "YYYY-MM-DD") {
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
//# sourceMappingURL=index.js.map