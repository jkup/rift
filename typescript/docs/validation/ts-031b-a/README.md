# TS-031B-A implementation evidence

Implemented 2026-11-02 on `codex/test262-classification`, assignment base `6f86657`.
Owner chat `01a19c54-953b-7851-b5ca-4ca85bb5aecf`. Independent review is pending;
this handoff does not self-accept the task or authorize its successor.

The implementation adds closed readonly rejection/throw-origin records, paired
lexer/parser rejection metadata, required throw origins and an in-process
`observe(source, realm, mode, unit, limits)` boundary. `projectThrow` reads only
origin and Value kind; it never reads a guest constructor/property or coerces a
Value. Resource provenance is captured at the failure site before unwind. All
existing completion propagation paths remain unchanged. Host exceptions escape.

`failure` keeps its public signature and historical string Value/Diagnostic.
Resource and unsupported-operation helpers reuse that presentation shape without
inferring categories from text. Parse errors remain unsupported or resource;
reserved syntax rules have no emitting producer. Observation parser mode does
not instantiate bindings; body mode includes declaration instantiation. Limits
are nonnegative safe integers; source/parse/evaluation caps are unchanged.

Only ten inventoried manual throws across six old tests gain guest origin.
No unexpected consumer needed expansion. CLI, Diagnostic, syntax/AST, all old
fixtures/expectations, operation contexts, Realm behavior, host test262 code,
compiler pins, C++ and companion work remain unchanged. The subprocess driver,
parent transport, constructor extraction, harness/profile admission and syntax
certification are deferred.

## Validation

| Check | Result | Evidence |
|---|---|---|
| Typecheck | PASS | typecheck.log |
| Runner rules | 20/20 | runner.log |
| Compiler probes | 10/10, both hosts and coverage | probes.log, probe-results.json |
| Rebuilt Node guest suite | 212/212, no skips | node.log, guest-node-results.json |
| Rebuilt native guest suite | 212/212, no skips | native.log, guest-native-results.json |
| Static-only build and separate parsed coverage | 33/33, zero dynamic | native-build-results.json, preservation-and-coverage.json |
| New outcome driver | 1914/1914 static | native-build-results.json |
| Existing host boundary suite | 66/66 | test262.log |
| Exact pinned corpus checks | 4/4; zero guest execution | corpus.log, generated ledgers |
| Preservation / baseline comparison | PASS | audit.log, audit.mjs |

The [84-row matrix](matrix.md) maps P01-P42, R01-R38 and V01-V04 to actual
assertions. Actual omitted-default64 host/guest recursion and100000-step loops
execute in native; seeded calls2/depth3/steps5 foreign-Realm cleanup preserves
marker and host Error identities. Both statement/expression depth guards are
covered; failure precedences and committed effects remain fixed. No unreviewed
oracle or budget adjustment was made.

The audit compares all211 old names, expected records and actual outputs/statuses
per lane, plus32 old native entries. It verifies old files and the ten origin-only
migrations. It compiles the assignment baseline into an ignored build directory
and compares complete parser/lexer results on45 sources (all42 parse rows plus
three guards), ignoring only the newly added rejection field. CLI comparisons
cover usage64, missing-file66, success0, throw1, parse2, disk files and -e in both
hosts. A host-only Node output injection checks the unchanged CLI catch/status70;
native host-error behavior is asserted in R22/R37, not claimed as a native CLI
fault-injection test. Construction/caller inventories are retained separately.

## Retained failures and reductions

1. The first native outcome-driver gate rejected SC1090 at a comparison of two
   distinct union types sharing a resource arm. `native-initial-failed.log` and
   `native-build-initial-failed.json` retain it. Explicit discriminant narrowing
   preserves the same resource identity assertion. `reductions/before.ts` fails
   build/coverage; `after.ts` passes static coverage and both hosts print true.
   The first same-union reduction did not reproduce the issue and is retained as
   `same-union-control.ts` with its successful build/coverage evidence.
2. Native R27 then failed the additional host Binding record identity assertion;
   all211 old cases and all33 static gates passed. `native-r27-failed.log`, its
   JSON results, and `r27-split-*` isolate this to Binding identity. The seven-line
   `binding-before.ts` reduction has no observation/engine call: native Map
   insertion of an inferred narrower record fails identity immediately, while
   Node preserves it. Annotating the seed with the existing `Binding` type
   preserves identity in both (`binding-after.ts`); both are fully static.
   The test uses that annotation and retains the exact same identity assertion.
   It additionally verifies flags, pre/post-observation Map identity, Value
   identity, guest object identity and observable alias mutation. No production
   workaround, compiler change, or weakened expected result was introduced.
3. An added test initially omitted an explicit undefined guard; its typecheck
   failure is retained. The corrected test throws if the binding is absent.
   Initial audit baseline compilation lacked TS7's explicit ignoreConfig/types
   flags; both failed logs are retained. The audit now supplies those flags.
4. The optional host66 regression run encountered a sandbox temp-file rename
   EPERM (`test262-sandbox-failed.log`); the authorized rerun passes. Native runs
   used installed Zig library access as required by the compiler contract.

The initial Python launcher was unavailable; implementation used Node/PowerShell.
Two local edit commands used a duplicate directory prefix and did not write any
files; corrected paths were used. These setup errors changed no runtime behavior.

This is bounded Windows x64 evidence, not an ECMAScript conformance, arbitrary
native-stack-safety or performance claim. The compiler Map adaptation reduction
is an independently reproducible toolchain limitation, not concealed by changing
runtime state or assertions. Review the typed test setup and retained failures.

Stop here for independent review; no branch switch, main merge or successor.
