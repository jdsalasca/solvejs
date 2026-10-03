import test from "node:test";
import assert from "node:assert/strict";
import {
  SemverError,
  compareVersions,
  diffVersions,
  formatVersion,
  incrementVersion,
  isValidRange,
  isValidVersion,
  maxSatisfying,
  parseVersion,
  satisfies
} from "../dist/esm/index.js";

test("parseVersion", () => {
  const parsed = parseVersion("1.2.3");
  assert.deepEqual(parsed, { major: 1, minor: 2, patch: 3, prerelease: [], build: [] });

  assert.deepEqual(parseVersion("1.2.3-alpha.1"), {
    major: 1,
    minor: 2,
    patch: 3,
    prerelease: ["alpha", 1],
    build: []
  });
  assert.deepEqual(parseVersion("1.2.3+build.5"), {
    major: 1,
    minor: 2,
    patch: 3,
    prerelease: [],
    build: ["build", 5]
  });
  assert.deepEqual(parseVersion("1.2.3-rc.1+exp.sha.5114f85"), {
    major: 1,
    minor: 2,
    patch: 3,
    prerelease: ["rc", 1],
    build: ["exp", "sha", "5114f85"]
  });

  assert.deepEqual(parseVersion("0.0.0"), { major: 0, minor: 0, patch: 0, prerelease: [], build: [] });
  assert.deepEqual(parseVersion("v2.3.4").major, 2, "a leading v is tolerated");
  assert.deepEqual(parseVersion("  1.2.3  ").minor, 2, "surrounding whitespace is trimmed");

  for (const bad of ["", "1", "1.2", "1.2.3.4", "a.b.c", "1.2.x", "-1.2.3", "1.2.3-", "1.2.3+"]) {
    assert.equal(parseVersion(bad), null, `${JSON.stringify(bad)} must not parse`);
  }
});

test("isValidVersion", () => {
  assert.equal(isValidVersion("1.0.0"), true);
  assert.equal(isValidVersion("1.0.0-rc.1"), true);
  assert.equal(isValidVersion("1.0"), false);
  assert.equal(isValidVersion("nonsense"), false);
  assert.equal(isValidVersion(""), false);
});

test("compareVersions orders by major, minor, then patch", () => {
  assert.equal(compareVersions("1.0.0", "1.0.0"), 0);
  assert.equal(compareVersions("1.0.1", "1.0.0"), 1);
  assert.equal(compareVersions("1.0.0", "1.0.1"), -1);
  assert.equal(compareVersions("1.1.0", "1.0.9"), 1);
  assert.equal(compareVersions("2.0.0", "1.99.99"), 1);
  assert.equal(compareVersions("1.9.0", "1.10.0"), -1, "numeric, not lexicographic");
  assert.equal(compareVersions("1.10.0", "1.9.0"), 1);
});

test("compareVersions ranks a prerelease below its release", () => {
  assert.equal(compareVersions("1.0.0-alpha", "1.0.0"), -1);
  assert.equal(compareVersions("1.0.0", "1.0.0-alpha"), 1);
  assert.equal(compareVersions("1.0.0-alpha", "1.0.0-beta"), -1);
  assert.equal(compareVersions("1.0.0-alpha.1", "1.0.0-alpha.2"), -1);
  assert.equal(compareVersions("1.0.0-alpha.2", "1.0.0-alpha.10"), -1, "numeric identifiers compare numerically");
  assert.equal(compareVersions("1.0.0-alpha", "1.0.0-alpha.1"), -1, "a longer prerelease outranks a shorter prefix");
  assert.equal(
    compareVersions("1.0.0-1", "1.0.0-alpha"),
    -1,
    "numeric identifiers have lower precedence than alphanumeric ones, per the specification"
  );
  assert.equal(compareVersions("1.0.0-alpha+b1", "1.0.0-alpha+b2"), 0, "build metadata is ignored");
  assert.equal(compareVersions("1.0.0", "1.0.0+build"), 0);
});

test("compareVersions is a total order over a shuffled list", () => {
  const versions = ["1.0.0", "1.0.0-alpha", "0.9.9", "1.0.1", "1.0.0-beta.2", "2.0.0", "1.0.0-alpha.1"];
  const sorted = [...versions].sort(compareVersions);

  assert.deepEqual(sorted, [
    "0.9.9",
    "1.0.0-alpha",
    "1.0.0-alpha.1",
    "1.0.0-beta.2",
    "1.0.0",
    "1.0.1",
    "2.0.0"
  ]);
});

test("compareVersions rejects anything unparsable", () => {
  assert.throws(() => compareVersions("1.0", "1.0.0"), /SemverError|version/);
  assert.throws(() => compareVersions("1.0.0", "nope"), /SemverError|version/);
  assert.throws(() => compareVersions("1.0.0", "1.0.0.0"), /SemverError|version/);
});

test("satisfies handles caret ranges", () => {
  assert.equal(satisfies("1.2.3", "^1.2.3"), true);
  assert.equal(satisfies("1.9.9", "^1.2.3"), true);
  assert.equal(satisfies("2.0.0", "^1.2.3"), false);
  assert.equal(satisfies("0.2.5", "^0.2.3"), true);
  assert.equal(satisfies("0.3.0", "^0.2.3"), false, "caret on 0.x only allows patch changes");
  assert.equal(satisfies("0.0.3", "^0.0.3"), true);
  assert.equal(satisfies("0.0.4", "^0.0.3"), false, "caret on 0.0.x pins the exact version");
  assert.equal(satisfies("1.2.3", "^1.2"), true, "a partial caret is allowed");
  assert.equal(satisfies("1.2.3", "^1"), true);
  assert.equal(satisfies("2.0.0", "^1"), false);
});

test("satisfies handles tilde ranges", () => {
  assert.equal(satisfies("1.2.9", "~1.2.3"), true);
  assert.equal(satisfies("1.3.0", "~1.2.3"), false, "tilde allows patch changes only");
  assert.equal(satisfies("1.2.3", "~1.2"), true);
  assert.equal(satisfies("1.3.0", "~1.2"), false);
  assert.equal(satisfies("1.9.0", "~1"), true, "tilde on the major allows minor changes");
});

test("satisfies handles comparators, wildcards, and exact ranges", () => {
  assert.equal(satisfies("1.2.3", "1.2.3"), true);
  assert.equal(satisfies("1.2.4", "1.2.3"), false);
  assert.equal(satisfies("1.2.3", "1.x"), true);
  assert.equal(satisfies("1.9.9", "1.x"), true);
  assert.equal(satisfies("2.0.0", "1.x"), false);
  assert.equal(satisfies("1.2.3", "1.2.x"), true);
  assert.equal(satisfies("1.3.0", "1.2.x"), false);
  assert.equal(satisfies("1.2.3", "*"), true);
  assert.equal(satisfies("0.0.1", "*"), true);

  assert.equal(satisfies("1.5.0", ">=1.2.0"), true);
  assert.equal(satisfies("1.1.0", ">=1.2.0"), false);
  assert.equal(satisfies("1.2.0", ">1.2.0"), false, "> excludes the boundary");
  assert.equal(satisfies("1.2.1", ">1.2.0"), true);
  assert.equal(satisfies("1.2.0", "<=1.2.0"), true);
  assert.equal(satisfies("1.2.1", "<=1.2.0"), false);
  assert.equal(satisfies("1.2.0", "<1.2.1"), true);
  assert.equal(satisfies("1.0.0", ">=1.0.0 <2.0.0"), true, "a space is an AND");
  assert.equal(satisfies("2.0.0", ">=1.0.0 <2.0.0"), false);
});

test("satisfies excludes prereleases unless the range names one", () => {
  assert.equal(satisfies("1.0.0-alpha", "^1.0.0"), false, "a prerelease never satisfies a plain range");
  assert.equal(satisfies("1.0.0-alpha", ">=1.0.0-alpha"), true);
  assert.equal(satisfies("1.0.0-alpha", "^1.0.0-alpha"), true);
  assert.equal(
    satisfies("1.0.0-beta", "^1.0.0-alpha"),
    true,
    "the range named a prerelease of the same 1.0.0 tuple, so a later prerelease qualifies"
  );
  assert.equal(
    satisfies("1.0.1-beta", "^1.0.0-alpha"),
    false,
    "a different tuple never qualifies, even when the range names a prerelease"
  );
  assert.equal(satisfies("1.0.0", "^1.0.0-alpha"), true, "the release outranks its own prerelease");
});

test("satisfies handles OR ranges", () => {
  assert.equal(satisfies("1.5.0", "^1.0.0 || ^2.0.0"), true);
  assert.equal(satisfies("2.5.0", "^1.0.0 || ^2.0.0"), true);
  assert.equal(satisfies("3.0.0", "^1.0.0 || ^2.0.0"), false);
  assert.equal(satisfies("2.0.0", "^1.0.0 || 2.0.0"), true);
});

test("satisfies rejects an invalid version or range", () => {
  assert.throws(() => satisfies("1.0", "^1.0.0"), /SemverError|version/);
  assert.throws(() => satisfies("1.0.0", "not-a-range"), /SemverError|range/);
  assert.throws(() => satisfies("1.0.0", ">=1.0.0 || "), /SemverError|range/);
});

test("isValidRange", () => {
  assert.equal(isValidRange("^1.0.0"), true);
  assert.equal(isValidRange("~1.2"), true);
  assert.equal(isValidRange("1.x"), true);
  assert.equal(isValidRange("*"), true);
  assert.equal(isValidRange(">=1.0.0 <2.0.0"), true);
  assert.equal(isValidRange("^1 || ^2"), true);
  assert.equal(isValidRange("1.0.0-rc.1"), true);

  assert.equal(isValidRange(""), false);
  assert.equal(isValidRange("nonsense"), false);
  assert.equal(isValidRange("^"), false);
  assert.equal(isValidRange(">="), false);
  assert.equal(isValidRange("^1.0.0 ||"), false);
});

test("maxSatisfying picks the highest match", () => {
  const versions = ["1.0.0", "1.2.0", "1.2.3", "2.0.0", "2.1.0"];

  assert.equal(maxSatisfying(versions, "^1.0.0"), "1.2.3");
  assert.equal(maxSatisfying(versions, "^2.0.0"), "2.1.0");
  assert.equal(maxSatisfying(versions, "*"), "2.1.0");
  assert.equal(maxSatisfying(versions, "^3.0.0"), null, "no match is null");
  assert.equal(maxSatisfying([], "^1.0.0"), null);
  assert.equal(maxSatisfying(["not-a-version", "1.0.0"], "^1.0.0"), "1.0.0", "unparsable entries are skipped");
  assert.equal(maxSatisfying(["1.0.0", "1.0.0"], "^1.0.0"), "1.0.0", "duplicates are fine");
});

test("incrementVersion", () => {
  assert.deepEqual(incrementVersion("1.2.3", "major"), { major: 2, minor: 0, patch: 0, prerelease: [], build: [] });
  assert.deepEqual(incrementVersion("1.2.3", "minor"), { major: 1, minor: 3, patch: 0, prerelease: [], build: [] });
  assert.deepEqual(incrementVersion("1.2.3", "patch"), { major: 1, minor: 2, patch: 4, prerelease: [], build: [] });

  assert.deepEqual(
    incrementVersion("1.2.3-alpha.1", "patch"),
    { major: 1, minor: 2, patch: 3, prerelease: [], build: [] },
    "a patch bump on a prerelease promotes it to its release rather than moving past it"
  );
  assert.deepEqual(
    incrementVersion("1.2.3-alpha.1", "minor"),
    { major: 1, minor: 3, patch: 0, prerelease: [], build: [] },
    "a minor bump always moves to the next minor"
  );
  assert.deepEqual(incrementVersion("1.2.3+build", "patch"), {
    major: 1,
    minor: 2,
    patch: 4,
    prerelease: [],
    build: []
  }, "build metadata is dropped on increment");

  assert.throws(() => incrementVersion("1.0", "patch"), /SemverError|version/);
  assert.throws(() => incrementVersion("1.0.0", "nope"), /SemverError|release/);
  assert.throws(() => incrementVersion("1.0.0"), /SemverError|release/);
});

test("formatVersion round trips through parseVersion", () => {
  assert.equal(formatVersion({ major: 1, minor: 2, patch: 3, prerelease: [], build: [] }), "1.2.3");
  assert.equal(formatVersion({ major: 1, minor: 2, patch: 3, prerelease: ["alpha", 1], build: [] }), "1.2.3-alpha.1");
  assert.equal(
    formatVersion({ major: 1, minor: 2, patch: 3, prerelease: ["rc", 1], build: ["sha", "abc"] }),
    "1.2.3-rc.1+sha.abc"
  );

  assert.equal(formatVersion(parseVersion("1.2.3")), "1.2.3");
  assert.equal(formatVersion(parseVersion("1.2.3-rc.1+b.2")), "1.2.3-rc.1+b.2");
});

test("diffVersions describes what changed", () => {
  assert.equal(diffVersions("1.2.3", "1.2.3"), null, "identical versions have no diff");
  assert.equal(diffVersions("1.2.3", "1.3.0"), "minor");
  assert.equal(diffVersions("1.2.3", "2.0.0"), "major");
  assert.equal(diffVersions("1.2.3", "1.2.4"), "patch");
  assert.equal(diffVersions("2.0.0", "1.0.0"), "major", "the direction does not matter");
  assert.equal(diffVersions("1.0.0", "1.0.0-alpha"), "prerelease");
  assert.equal(diffVersions("1.0.0", "1.0.0+build"), null, "build metadata is not a difference");

  assert.throws(() => diffVersions("1.0", "1.0.0"), /SemverError|version/);
});

test("SemverError carries a stable code and context", () => {
  const error = new SemverError("SEMVER_INVALID_VERSION", "Expected a valid semantic version.", {
    received: "1.0"
  });

  assert.ok(error instanceof SemverError);
  assert.ok(error instanceof Error);
  assert.equal(error.name, "SemverError");
  assert.equal(error.code, "SEMVER_INVALID_VERSION");
  assert.equal(error.message, "Expected a valid semantic version.");
  assert.deepEqual(error.details, { received: "1.0" });
});
test("satisfies rejects an empty or non-string range", () => {
  assert.throws(() => satisfies("1.0.0", ""), /SemverError|range/);
  assert.throws(() => satisfies("1.0.0", "   "), /SemverError|range/);
  assert.throws(() => satisfies("1.0.0", null), /SemverError|range/);
  assert.throws(() => satisfies("1.0.0", 42), /SemverError|range/);
  assert.throws(() => satisfies("1.0.0", undefined), /SemverError|range/);
});

test("a broken operand is reported rather than silently ignored", () => {
  // Every comparator is read during the match, so an unreadable one throws
  // instead of quietly answering false.
  assert.throws(() => satisfies("1.0.0-alpha", ">=1.0.0-alpha garbage"), /SemverError|range/);
  assert.equal(satisfies("1.0.0-alpha", ">=1.0.0-alpha *"), true, "a wildcard comparator does not disqualify");
});

test("maxSatisfying rejects a non-array candidate list", () => {
  assert.throws(() => maxSatisfying("1.0.0", "^1.0.0"), /SemverError|array/);
  assert.throws(() => maxSatisfying(null, "^1.0.0"), /SemverError|array/);
  assert.throws(() => maxSatisfying(undefined, "^1.0.0"), /SemverError|array/);
});

test("maxSatisfying surfaces an invalid range rather than skipping everything", () => {
  assert.throws(() => maxSatisfying(["1.0.0"], "not-a-range"), /SemverError|range/);
});

test("compareVersions handles large numbers without precision loss", () => {
  assert.equal(compareVersions("9007199254740992.0.0", "9007199254740991.0.0"), 1);
  assert.equal(compareVersions("0.0.0", "0.0.0"), 0);
  assert.deepEqual(parseVersion("1.0.0"), { major: 1, minor: 0, patch: 0, prerelease: [], build: [] });
});

test("formatVersion omits empty prerelease and build sections", () => {
  assert.equal(formatVersion({ major: 0, minor: 0, patch: 0, prerelease: [], build: [] }), "0.0.0");
  assert.equal(formatVersion({ major: 1, minor: 0, patch: 0, prerelease: [], build: ["only"] }), "1.0.0+only");
  assert.equal(formatVersion({ major: 1, minor: 0, patch: 0, prerelease: ["rc"], build: [] }), "1.0.0-rc");
  assert.equal(formatVersion(incrementVersion("1.2.3", "minor")), "1.3.0");
  assert.equal(formatVersion(incrementVersion("1.2.3", "major")), "2.0.0");
  assert.equal(formatVersion(incrementVersion("1.2.3-rc.1", "patch")), "1.2.3");
});