# Bounded compiler alternatives: partial decimal proposal, keys unresolved

This is new evidence in response to the coordinator's bounded investigation.
The four installed production/test files remain exact accepted proposal bytes.
No workaround has been applied; no full 71-entry rebuild or conformance child
launch occurred. Original failures and initial evidence remain intact.

## Decimal: smaller change than digit accumulation

The difference from the original observation driver's decimal function was
reduced to the **inline empty-string guard**, not a number annotation, the digit
loop, the final safe-integer guard, or module boundaries:

| Reduction | Dynamic count |
|---|---:|
| Original accepted helper form | 1 |
| Old driver's complete inline form | 0 |
| Only final safe-integer guard inline | 1 |
| Only digit checks inline | 1 |
| Only empty-string guard inline | 0 |
| Digit accumulation with pre-overflow guard | 0 |

These are observed compiler results, not a claim about the compiler's internal
cause. `alternatives/coverage.json`, `refined-coverage.json`, and
`decimal-isolated-coverage.json` retain exact source paths and complete reports.
Digit accumulation was investigated but is not proposed: the one-line guard
change preserves the original Number conversion and is smaller.

The complete unapplied file is
[`decimal-proposal/script-producer-request.ts`](decimal-proposal/script-producer-request.ts).
Its only change is:

```diff
-    need(text.length > 0, "limit");
+    if (text.length === 0) throw new Error("script-producer/limit");
```

Whole-file SHA256 values are frozen in `decimal-proposal/manifest.json`:

- Before: `2aca03870611819f6873566267843925c722d97460b5831e0c693e3dd39271be`
- After: `ba62ee0cf3fc77d034643e0960f1e8c3963aaab4b2f401dad1f006bffef2e407`

This is a **partial proposal**, not a complete static producer implementation.
In a new ordinary-file copy of all source, substituting only this candidate
reduces actual full-driver coverage from two dynamic operations to one:
4,454 analyzed/static, one `dyn.objKeyStrings`, no `dyn.numberConstructor`.
See `decimal-proposal/driver-context.json`. No original source was modified.
Coverage of the request module alone reports zero dynamic operations for both
original and candidate: without a consuming entrypoint it does not establish
their reachable behavior. Those reports are retained in `contracts.json` rather
than used as evidence of successful integration.

## Native and Node behavior

The extracted candidate decimal function is exported from a separate module and
called by `decimal-proposal/driver.ts`. With pinned scriptc 0.4.7 and Zig 0.17.0
on the explicit PATH, approved elevated access allowed its static-only build.
The separate coverage gate passes with zero dynamic operations. Both hosts pass
152 argv-representable frozen literals with exact expected values/errors and
empty stderr. Inputs include safe-integer neighbors on either side of MAX_SAFE,
wrong syntax, Unicode digits, whitespace, long overflow, and 10,000 leading zeroes.
There is no imposed leading-zero length cap. The 153rd literal is NUL, which
cannot be transported through OS argv; it passes the pure Node module check.

`decimal-proposal/native-run.json` retains tsc/build/coverage; `native-literals.json`
retains each host result, args and binary hash. Session `84547` completed exit 0.
The first tsc command failed with TS5112 because explicit files require
`--ignoreConfig` in this pinned version. Its exact initial runner and record are
retained as `initial-tsconfig-runner.mjs` and `initial-tsconfig-failure.json`.
No native build occurred in that failed attempt. Only the probe command changed.

The complete candidate parser/validator also passes on Node: 20 existing parser
positives, 57 existing exact parser errors, 21 existing shape errors, 28 additional
full-argv compound cases (each of seven numeric positions malformed ahead of a
bad role), and nine ordinary-object contracts described below. These do not
claim native full-parser validation while key enumeration is unresolved.

## Key enumeration: unresolved within the bounded search

All tested enumeration alternatives preserve runtime key discovery in their
source; none substitutes a declared-key list or weakens checks to field presence:

| Alternative | Observed dynamic count |
|---|---:|
| Accepted Object.keys(object) | 1 |
| for-in plus Object.hasOwn filter | 2 |
| for-in plus own descriptor filter | 2 |
| Object.getOwnPropertyNames plus enumerable descriptors | 3 |
| Explicitly typed names/descriptors with indexed loop | 3 |
| Reflect.ownKeys, string filter and enumerable descriptors | 3 |

For-in reports `dyn.forInStable` and related dynamic key helpers. Typed own-name
enumeration reports `dyn.getOwnPropertyNames`; Reflect reports `dyn.ownKeys`.
The original and coordinator reductions also establish that replacing `object`
with `{mode:string}` does not clear Object.keys' dynamic operation.

No enumeration candidate passes the required zero-dynamic gate, so none is
offered as a native-safe replacement. No native semantic equivalence is claimed
for these failed candidates, and no dynamic-tier candidate was promoted using
the compiler's contradictory “fully static” line. This bounded investigation
does not prove that no compiler-supported equivalent can exist; it identifies
the tested alternatives and the remaining unresolved limitation.

The complete original/candidate validator's **Node** ordinary-data contract is
frozen in `contracts.json`: reject own extra; reject missing-plus-extra; reject
required field present only through inheritance; reject required nonenumerable
field; accept inherited extra, nonenumerable extra, symbol extra, null prototype,
and reordered own keys. This retains the own-enumerable-string semantics and
does not add hostile getter/Proxy guarantees. The decimal-only proposal leaves
the accepted Object.keys implementation unchanged.

## Review boundary

No full implementation is ready for acceptance. Root and independent review may
assess the partial decimal amendment, but key enumeration remains unresolved.
There is no complete request-helper amendment that satisfies all requirements
from this search. No API/schema/authority/test-contract change is proposed.
No task continuation, source application, publication, or successor is implied.
All launched sessions are complete.
