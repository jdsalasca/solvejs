export function unique<T>(values: readonly T[]): T[] {
  return [...new Set(values)];
}

export function compact<T>(values: readonly (T | null | undefined | false | 0 | "")[]): T[] {
  return values.filter(Boolean) as T[];
}

export function chunk<T>(values: readonly T[], size: number): T[][] {
  if (!Number.isInteger(size) || size <= 0) {
    throw new TypeError("Expected size to be a positive integer.");
  }

  const output: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    output.push(values.slice(index, index + size));
  }
  return output;
}

export function groupBy<T, K extends PropertyKey>(values: readonly T[], selector: (value: T) => K): Record<K, T[]> {
  return values.reduce((accumulator, value) => {
    const key = selector(value);
    if (!accumulator[key]) {
      accumulator[key] = [];
    }
    accumulator[key].push(value);
    return accumulator;
  }, {} as Record<K, T[]>);
}
