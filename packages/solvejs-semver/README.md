# @jdsalasc/solvejs-semver

[![npm](https://img.shields.io/npm/v/@jdsalasc/solvejs-semver)](https://www.npmjs.com/package/@jdsalasc/solvejs-semver)
[![node](https://img.shields.io/node/v/@jdsalasc/solvejs-semver)](https://www.npmjs.com/package/@jdsalasc/solvejs-semver)

Zero-dependency semantic version utilities for parsing, comparison, range satisfaction, and incrementing.

## Utilities

- `parseVersion`
- `isValidVersion`
- `compareVersions`
- `satisfies`
- `isValidRange`
- `maxSatisfying`
- `incrementVersion`
- `formatVersion`
- `diffVersions`
- `SemverError`

## When to use this package

Use it when your code has to decide about versions rather than just display them: a dependency check at
startup, a feature flag gated on a minimum version, a CI matrix that picks the newest matching release,
or a release script that bumps a version.

## Install

```bash
npm i @jdsalasc/solvejs-semver
```

## Quick example

```ts
import { compareVersions, satisfies, maxSatisfying, incrementVersion, formatVersion } from "@jdsalasc/solvejs-semver";

compareVersions("1.0.0-alpha", "1.0.0");        // -1, a prerelease is lower than its release
compareVersions("1.10.0", "1.9.0");            // 1, numeric, not lexicographic

satisfies("1.9.0", "^1.2.0");                  // true
satisfies("2.0.0", "^1.2.0");                  // false
satisfies("1.2.3", ">=1.0.0 <2.0.0");          // true
satisfies("1.5.0", "^1.0.0 || ^2.0.0");        // true

maxSatisfying(["1.0.0", "1.2.3", "2.0.0"], "^1.0.0"); // "1.2.3"
formatVersion(incrementVersion("1.2.3", "minor"));     // "1.3.0"
```

## Supported range syntax

Exact (`1.2.3`), caret (`^1.2.3`), tilde (`~1.2.3`), wildcards (`1.x`, `1.2.x`, `*`), comparators
(`>=1.2.0`, `>`, `<=`, `<`), space-separated AND, and `||` OR.

```ts
satisfies("1.2.9", "~1.2.3");  // true
satisfies("1.3.0", "~1.2.3");  // false, tilde allows patch changes only
satisfies("1.2.3", "^0.2.3");  // true
satisfies("0.3.0", "^0.2.3");  // false, caret on 0.x only allows patch changes
```

## Prerelease handling

A prerelease only satisfies a range that itself names a prerelease of the **same** major, minor and
patch tuple. That is the specification's rule, and it is the part most tools get wrong:

```ts
satisfies("1.0.0-alpha", "^1.0.0");     // false, the range names no prerelease
satisfies("1.0.0-alpha", "^1.0.0-alpha"); // true, same tuple
satisfies("1.0.0-beta", "^1.0.0-alpha");  // true,  same 1.0.0 tuple, later prerelease
satisfies("1.0.1-beta", "^1.0.0-alpha");  // false, different tuple
```

Build metadata never affects precedence, so `1.0.0` and `1.0.0+build` compare equal.

## Errors

| Code | Meaning |
|---|---|
| `SEMVER_INVALID_VERSION` | A version string could not be parsed. |
| `SEMVER_INVALID_RANGE` | A range expression could not be parsed. |
| `SEMVER_INVALID_RELEASE` | The release argument was not `major`, `minor` or `patch`. |

`parseVersion`, `isValidVersion` and `isValidRange` answer with `null` or `false` instead of throwing,
because a validator that throws is not a validator.

## Limitations and Constraints

### A patch bump on a prerelease promotes it to the release

`incrementVersion("1.2.3-rc.1", "patch")` gives `1.2.3`, not `1.2.4`. Incrementing the patch of a
prerelease is how you cut the release. A minor or major bump still moves to the next minor or major.

### A leading v is tolerated, everything else is strict

`v1.2.3` and `  1.2.3  ` parse, but `1.2`, `1.2.3.4` and `1.2.x` do not as versions. Partial versions
are only accepted inside a range, never as a version.

### Numeric prerelease identifiers have lower precedence

`1.0.0-alpha` is **higher** than `1.0.0-1`, because alphanumeric identifiers outrank numeric ones.
This follows the specification and is the opposite of what a string comparison would tell you.

### Build metadata is parsed but discarded on increment

`formatVersion` round-trips it, but `incrementVersion` drops it, since a new release has new build
metadata.

### Ranges are checked one alternative at a time

With `||`, each side is evaluated independently. A prerelease must be named in the same alternative
that the version is tested against, so `satisfies("1.0.0-alpha", "^1.0.0 || >=1.0.0-alpha")` is `true`
through the second side.