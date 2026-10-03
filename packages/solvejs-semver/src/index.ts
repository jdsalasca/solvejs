/** Stable semver error codes. */
export type SemverErrorCode =
  | "SEMVER_INVALID_VERSION"
  | "SEMVER_INVALID_RANGE"
  | "SEMVER_INVALID_RELEASE";

/**
 * Error thrown by the semver utilities.
 *
 * Carries a stable machine-readable `code` and a `details` context object.
 */
export class SemverError extends Error {
  readonly code: SemverErrorCode;
  readonly details: Record<string, unknown>;

  constructor(code: SemverErrorCode, message: string, details: Record<string, unknown> = {}) {
    super(message);
    this.name = "SemverError";
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, SemverError.prototype);
  }
}

function fail(code: SemverErrorCode, message: string, details: Record<string, unknown> = {}): never {
  throw new SemverError(code, message, details);
}

/** A parsed semantic version. */
export type Version = {
  major: number;
  minor: number;
  patch: number;
  prerelease: Array<string | number>;
  build: Array<string | number>;
};

/** Which part of a version to bump. */
export type ReleaseType = "major" | "minor" | "patch";

const VERSION = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/;
const IDENTIFIER = /^[0-9A-Za-z-]+$/;

function splitIdentifiers(raw: string): Array<string | number> {
  return raw.split(".").map((part) => (/^\d+$/.test(part) ? Number(part) : part));
}

/**
 * Parses a semantic version string.
 *
 * A leading `v` and surrounding whitespace are tolerated. Build metadata is parsed but never affects
 * precedence, matching the specification.
 *
 * @param value - Version string.
 * @returns The parsed version, or `null` when the input is not a valid version.
 *
 * @example
 * parseVersion("1.2.3-rc.1"); // { major: 1, minor: 2, patch: 3, prerelease: ["rc", 1], build: [] }
 */
export function parseVersion(value: string): Version | null {
  if (typeof value !== "string") return null;

  const match = value.trim().match(VERSION);
  if (!match) return null;

  const [, major, minor, patch, prerelease, build] = match;
  const parsed: Version = {
    major: Number(major),
    minor: Number(minor),
    patch: Number(patch),
    prerelease: prerelease ? splitIdentifiers(prerelease) : [],
    build: build ? splitIdentifiers(build) : []
  };

  for (const identifier of [...parsed.prerelease, ...parsed.build]) {
    if (typeof identifier === "string" && !IDENTIFIER.test(identifier)) return null;
    if (typeof identifier === "number" && !Number.isSafeInteger(identifier)) return null;
  }

  return parsed;
}

function requireVersion(value: string): Version {
  const parsed = parseVersion(value);
  if (!parsed) {
    fail("SEMVER_INVALID_VERSION", `Expected a valid semantic version, received ${JSON.stringify(value)}.`, {
      received: value
    });
  }
  return parsed;
}

function comparePrerelease(left: Array<string | number>, right: Array<string | number>): number {
  // A version without a prerelease outranks one with it.
  if (left.length === 0 && right.length === 0) return 0;
  if (left.length === 0) return 1;
  if (right.length === 0) return -1;

  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    const a = left[index];
    const b = right[index];
    if (a === undefined) return -1;
    if (b === undefined) return 1;
    if (a === b) continue;

    const aNumeric = typeof a === "number";
    const bNumeric = typeof b === "number";
    if (aNumeric && bNumeric) return (a as number) < (b as number) ? -1 : 1;
    // Numeric identifiers always have lower precedence than alphanumeric ones.
    if (aNumeric) return -1;
    if (bNumeric) return 1;

    return (a as string) < (b as string) ? -1 : 1;
  }

  return 0;
}

/**
 * Compares two semantic versions.
 *
 * Returns a negative number when `left` is lower, `0` when they have equal precedence, and a
 * positive number when `left` is higher. Build metadata is ignored, as the specification requires.
 *
 * @param left - First version.
 * @param right - Second version.
 * @returns The comparison result.
 * @throws {SemverError} `SEMVER_INVALID_VERSION` if either input does not parse.
 *
 * @example
 * compareVersions("1.0.0-alpha", "1.0.0"); // -1
 */
export function compareVersions(left: string, right: string): number {
  const a = requireVersion(left);
  const b = requireVersion(right);

  for (const part of ["major", "minor", "patch"] as const) {
    if (a[part] !== b[part]) return a[part] < b[part] ? -1 : 1;
  }

  return comparePrerelease(a.prerelease, b.prerelease);
}

/**
 * Checks whether a version is a valid semantic version.
 *
 * @param value - Candidate string.
 * @returns `true` when the value parses.
 */
export function isValidVersion(value: string): boolean {
  return parseVersion(value) !== null;
}

function compareToBound(version: Version, operator: "<" | "<=" | ">" | ">=", bound: Version): boolean {
  const order = (() => {
    for (const part of ["major", "minor", "patch"] as const) {
      if (version[part] !== bound[part]) return version[part] < bound[part] ? -1 : 1;
    }
    return comparePrerelease(version.prerelease, bound.prerelease);
  })();

  if (operator === ">") return order > 0;
  if (operator === ">=") return order >= 0;
  if (operator === "<") return order < 0;
  return order <= 0;
}

function boundOf(value: string, code: SemverErrorCode): { version: Version; wildcard: "none" | "minor" | "major" } {
  const raw = value.trim();

  const exact = parseVersion(raw);
  if (exact) return { version: exact, wildcard: "none" };

  // "1" and "1.x" match any 1.y.z, "1.2" and "1.2.x" match any 1.2.z.
  const majorOnly = raw.match(/^v?(\d+)(?:\.[xX*])?$/);
  if (majorOnly) {
    return {
      version: { major: Number(majorOnly[1]), minor: 0, patch: 0, prerelease: [], build: [] },
      wildcard: "major"
    };
  }

  const majorMinor = raw.match(/^v?(\d+)\.(\d+)(?:\.[xX*])?$/);
  if (majorMinor) {
    return {
      version: {
        major: Number(majorMinor[1]),
        minor: Number(majorMinor[2]),
        patch: 0,
        prerelease: [],
        build: []
      },
      wildcard: "minor"
    };
  }

  fail(code, `Expected a valid version or range, received ${JSON.stringify(value)}.`, { received: value });
}

function caretRange(base: string): string {
  const { version, wildcard } = boundOf(base, "SEMVER_INVALID_RANGE");
  const lower = `${version.major}.${version.minor}.${version.patch}`;
  const suffix = version.prerelease.length > 0 ? `-${version.prerelease.join(".")}` : "";

  // On 0.x, caret only allows patch changes; on 0.0.x it pins the exact version.
  if (version.major !== 0) return `>=${lower}${suffix} <${version.major + 1}.0.0-0`;
  if (version.minor !== 0 || wildcard !== "none") return `>=${lower}${suffix} <0.${version.minor + 1}.0-0`;
  return `>=${lower}${suffix} <0.0.${version.patch + 1}-0`;
}

function tildeRange(base: string): string {
  const { version } = boundOf(base, "SEMVER_INVALID_RANGE");
  const lower = `${version.major}.${version.minor}.${version.patch}`;
  const suffix = version.prerelease.length > 0 ? `-${version.prerelease.join(".")}` : "";

  if (version.minor !== 0 && base.trim().replace(/^v/, "").split(".").length >= 2) {
    return `>=${lower}${suffix} <${version.major}.${version.minor + 1}.0-0`;
  }
  return `>=${lower}${suffix} <${version.major + 1}.0.0-0`;
}

/**
 * Checks whether a version is inside a range.
 *
 * Supported syntax: exact (`1.2.3`), caret (`^1.2.3`), tilde (`~1.2.3`), wildcards (`1.x`, `1.2.x`,
 * `*`), comparators (`>=1.2.0`, `>`, `<=`, `<`), space-separated AND, and `||` OR. A prerelease only
 * satisfies a range that itself names a prerelease with the same major, minor and patch tuple, which
 * is what the specification requires.
 *
 * @param version - Version to test.
 * @param range - Range expression.
 * @returns `true` when the version satisfies the range.
 * @throws {SemverError} `SEMVER_INVALID_VERSION` or `SEMVER_INVALID_RANGE`.
 *
 * @example
 * satisfies("1.9.0", "^1.2.0"); // true
 * satisfies("2.0.0", "^1.2.0"); // false
 */
export function satisfies(version: string, range: string): boolean {
  const parsed = requireVersion(version);
  const expression = typeof range === "string" ? range.trim() : "";

  if (expression.length === 0) {
    fail("SEMVER_INVALID_RANGE", "Expected a non-empty range.", { received: range });
  }

  const alternatives = expression.split("||").map((part) => part.trim());
  if (alternatives.some((part) => part.length === 0)) {
    fail("SEMVER_INVALID_RANGE", `Expected a valid range, received ${JSON.stringify(range)}.`, { received: range });
  }

  return alternatives.some((alternative) => {
    const comparators = alternative.split(/\s+/).filter(Boolean);

    const matches = comparators.every((raw) => {
      const operatorMatch = raw.match(/^(>=|<=|>|<)\s*(.+)$/);
      const operator = (operatorMatch?.[1] ?? "=") as "<" | "<=" | ">" | ">=" | "=";
      const operand = (operatorMatch?.[2] ?? raw).trim();

      if (operand === "*" || operand === "x" || operand === "X") return true;

      if (operand.startsWith("^")) {
        const bounds = expandRange(caretRange(operand.slice(1)));
        return bounds.every((bound) => compareToBound(parsed, bound.operator, bound.version));
      }
      if (operand.startsWith("~")) {
        const bounds = expandRange(tildeRange(operand.slice(1)));
        return bounds.every((bound) => compareToBound(parsed, bound.operator, bound.version));
      }

      const { version: bound, wildcard } = boundOf(operand, "SEMVER_INVALID_RANGE");

      if (wildcard === "major") {
        return operator === "=" && parsed.major === bound.major;
      }
      if (wildcard === "minor") {
        if (operator !== "=") return compareToBound(parsed, operator, bound);
        return parsed.major === bound.major && parsed.minor === bound.minor;
      }
      if (operator === "=") {
        return compareToBound(parsed, ">=", bound) && compareToBound(parsed, "<=", bound);
      }
      return compareToBound(parsed, operator, bound);
    });

    if (!matches) return false;

    // A prerelease only qualifies when some comparator in the same alternative names a prerelease
    // of the identical major, minor and patch tuple. That is what keeps 1.0.1-beta out of
    // ^1.0.0-alpha even though it is numerically above the lower bound. Every operand was already
    // read successfully by the match above, so none of these can throw.
    if (parsed.prerelease.length === 0) return true;

    return comparators.some((raw) => {
      const operand = raw.replace(/^(>=|<=|>|<|\^|~)\s*/, "").trim();
      if (operand === "" || operand === "*" || operand === "x" || operand === "X") return false;

      const { version: bound } = boundOf(operand, "SEMVER_INVALID_RANGE");
      return (
        bound.prerelease.length > 0 &&
        bound.major === parsed.major &&
        bound.minor === parsed.minor &&
        bound.patch === parsed.patch
      );
    });
  });
}

function expandRange(expanded: string): Array<{ operator: "<" | "<=" | ">" | ">="; version: Version }> {
  return expanded.split(/\s+/).filter(Boolean).map((raw) => {
    const match = raw.match(/^(>=|<=|>|<)(.+)$/)!;
    return {
      operator: match[1] as "<" | "<=" | ">" | ">=",
      version: requireVersion(match[2])
    };
  });
}

/**
 * Checks whether a range expression is valid.
 *
 * @param range - Candidate range.
 * @returns `true` when the range parses.
 */
export function isValidRange(range: string): boolean {
  if (typeof range !== "string" || range.trim().length === 0) return false;

  try {
    const alternatives = range.split("||");
    if (alternatives.some((part) => part.trim().length === 0)) return false;

    for (const alternative of alternatives) {
      for (const raw of alternative.trim().split(/\s+/).filter(Boolean)) {
        const cleaned = raw.replace(/^(>=|<=|>|<|\^|~)\s*/, "").trim();
        // "*" is a complete range; a bare operator with nothing after it is not.
        if (cleaned === "*" || cleaned === "x" || cleaned === "X") continue;
        if (cleaned === "") return false;
        // boundOf throws on anything it cannot read.
        boundOf(cleaned, "SEMVER_INVALID_RANGE");
      }
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the highest version in a list that satisfies a range.
 *
 * Unparsable entries are skipped rather than failing the whole search.
 *
 * @param versions - Candidate versions.
 * @param range - Range expression.
 * @returns The highest matching version, or `null` when none matches.
 * @throws {SemverError} `SEMVER_INVALID_RANGE` if the range does not parse.
 *
 * @example
 * maxSatisfying(["1.0.0", "1.2.3", "2.0.0"], "^1.0.0"); // "1.2.3"
 */
export function maxSatisfying(versions: readonly string[], range: string): string | null {
  if (!Array.isArray(versions)) {
    fail("SEMVER_INVALID_VERSION", "Expected versions to be an array.", { received: typeof versions });
  }

  const candidates = versions.filter((value) => isValidVersion(value) && satisfies(value, range));
  if (candidates.length === 0) return null;

  return candidates.reduce((highest, value) => (compareVersions(value, highest) > 0 ? value : highest));
}

/**
 * Increments a version and clears its prerelease and build metadata.
 *
 * A patch bump on a prerelease promotes it to its release instead of moving past it, so
 * `1.2.3-rc.1` becomes `1.2.3` rather than `1.2.4`.
 *
 * @param version - Version to increment.
 * @param release - Which part to bump.
 * @returns The incremented version.
 * @throws {SemverError} `SEMVER_INVALID_VERSION` or `SEMVER_INVALID_RELEASE`.
 *
 * @example
 * incrementVersion("1.2.3-rc.1", "patch"); // { major: 1, minor: 2, patch: 3, ... }
 */
export function incrementVersion(version: string, release: ReleaseType): Version {
  const parsed = requireVersion(version);

  if (release !== "major" && release !== "minor" && release !== "patch") {
    fail("SEMVER_INVALID_RELEASE", `Expected release to be major, minor or patch, received ${JSON.stringify(release)}.`, {
      received: release
    });
  }

  if (release === "major") return { major: parsed.major + 1, minor: 0, patch: 0, prerelease: [], build: [] };
  if (release === "minor") return { major: parsed.major, minor: parsed.minor + 1, patch: 0, prerelease: [], build: [] };

  if (parsed.prerelease.length > 0) {
    return { major: parsed.major, minor: parsed.minor, patch: parsed.patch, prerelease: [], build: [] };
  }
  return { major: parsed.major, minor: parsed.minor, patch: parsed.patch + 1, prerelease: [], build: [] };
}

/**
 * Formats a parsed version back into a string.
 *
 * @param version - Version to format.
 * @returns The version string, round-trippable through {@link parseVersion}.
 */
export function formatVersion(version: Version): string {
  const core = `${version.major}.${version.minor}.${version.patch}`;
  const prerelease = version.prerelease.length > 0 ? `-${version.prerelease.join(".")}` : "";
  const build = version.build.length > 0 ? `+${version.build.join(".")}` : "";
  return `${core}${prerelease}${build}`;
}

/** What changed between two versions. */
export type VersionDiff = "major" | "minor" | "patch" | "prerelease";

/**
 * Reports which part of the version changed, ignoring direction and build metadata.
 *
 * @param left - First version.
 * @param right - Second version.
 * @returns The difference, or `null` when the versions have equal precedence.
 * @throws {SemverError} `SEMVER_INVALID_VERSION` if either input does not parse.
 */
export function diffVersions(left: string, right: string): VersionDiff | null {
  const a = requireVersion(left);
  const b = requireVersion(right);

  if (a.major !== b.major) return "major";
  if (a.minor !== b.minor) return "minor";
  if (a.patch !== b.patch) return "patch";
  if (comparePrerelease(a.prerelease, b.prerelease) !== 0) return "prerelease";
  return null;
}