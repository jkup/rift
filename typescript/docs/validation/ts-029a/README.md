# TS-029A property assignment implementation — independent review needed

Sole writer chat `01a19b85-aa88-7b12-bc0d-b15dcbf5c256`, dispatch base `63d4cff`,
existing branch `codex/primitive-computed-keys`. Accepted design `e38b9f7` and
baseline `b9d3ef1` (196 cases / 30 gates). This handoff does not self-accept.

## Implementation and boundary

The only production edits are the property arm of `runtime.putValue` and the
ToObject comment. Put boxes first, converts the deferred key, saves its successful
string/symbol Value, and invokes internalSet once with original `ref.base`.
It returns guest abrupt completions unchanged, translates false at operation loc,
and returns the exact RHS Value on success. GetValue, binding writes, internalSet,
set, parser/evaluator/guards, Realm factories, converters and exotics are unchanged.

The [146-row mapping](matrix.md) points to named scenarios and all explicit
variants in the dedicated driver and seven runtime-read fixtures. Expectations
are independent literals, not generated from runtime output. Instrumented real
primitive wrappers record factory kind, payload, prototype, original Receiver,
Set/definition/Get counts; object sentinels exercise definition dispatch and
abrupt/host identities. Tests separate setup, action and assertions. Array double
RHS conversion and partial shrink retain exact state assertions. Foreign Realm,
retry/cache, seeded cleanup and exact resource guards are covered.

## R30 oracle contradiction and independent correction

The frozen R30 row expects six ticks for `p[k] = rhs();`, with null base and a
non-ticking builtin RHS. Both hosts instead reach the expected nullish TypeError
after **five** ticks and one RHS call. The unchanged evaluator call arm resolves
identifier/member callees through `reference` and GetValue rather than `evaluate`.
The charged path is statement, assignment, base, key and RHS call expression.
There is no extra callee-identifier tick. A primitive literal RHS also costs one
tick, so replacing it with this zero-argument builtin call does not add a tick.

The discrepancy was reported before any oracle edit. The coordinator independently
reran the reproduction, inspected the evaluator and approved changing only R30
from6 to5 on2026-11-02. The driver now asserts5 with the derivation beside it.
The historical TS-029P matrix remains unchanged. No runtime tick change was made.
[Minimal reproduction](r30-reproduction.mjs), [observations](r30-reproduction.json),
[Node failure](r30-driver-failure.log) and complete failing host records are retained
under r30-* and pre-correction-* names. This was a frozen-oracle discrepancy,
not a compiler failure or a skipped test.

## Exact migrations

| Frozen entry | Applied change and retained controls |
|---|---|
| A1 | Minimal PutValue sequence, cache and local completion translation. |
| A2 | ToObject comment only. |
| A3 | Direct Put/Get key count 3 to 2; exact RHS/value assertions retained. |
| A4 | Null/U Put uses nullish diagnostic; other primitives propagate the exact key sentinel with `toString;`. |
| A5 | Null/U write retains BKR/location16 with nullish diagnostic; nonnull writes escape ForbiddenKey fault and restore guards/Realm. RHS sentinel still wins. |
| A6 | Symbol writes reach ForbiddenKey after BKR; read/call BK and readonly Symbol diagnostic unchanged. |
| A7 | W6 Put false at8:4, W7 nullish at7:9; hook counts/prototype preserved; two distinct boxes asserted. |
| A8 | W13 T(y)/RY/one box; W14 exact Q/R/no box; W15 normal3/RY/no box, y=3/x absent. |
| A9 | Only old top-level expected-record migration: retained primitive-reads-write fixture now T(0). Source bytes unchanged. |
| A10 | Realms W17 String write T(0); root payload/keys/prototype controls retained. |
| A11 | Current feature and architecture scope supersede historical object-only writes; history unchanged. Acceptance caveat explicit. |
| A12 | Dedicated driver, seven runtime-read fixtures, additive runner/native registration, matrix and preservation audit. |
| A13 | Observed.internalSet returns InternalBooleanCompletion, keeps S/sentinel/context, asserts exact original Receiver, forwards unchanged. |
| A14 | ObservedObject.internalSet keeps S/sentinel/key/context, records and asserts original Receiver for every object write; all old traces remain. |

## Validation and retained attempts

- Typechecking passes; runner regression tests 20/20; compiler probes 10/10.
- Final full rebuilt Node and native: 203/203 top-level cases, no skips. All196
  baseline cases, six new CLI fixtures and the dedicated matrix driver pass.
- All 31 static-only builds and separately parsed coverage gates pass, zero dynamic.
- Actual default-constructor64 host recursion passes at326 ticks/peak67/65 boxes;
  guest recursion at390/peak131/65 boxes. Explicit0/1/2 limits, step precedence,
  foreign B recursion and restoration also pass natively without crash.
- `audit.mjs` in complete mode verifies all203 cases passing, preserved196 names
  and30 gates, only A9 old expected-record change, all old fixture bytes and unchanged
  production boundaries. Its optional pending-R30 mode can inspect retained
  pre-correction evidence; it is not used to claim final validation.

The first baseline migration run had195/196: a later trusted inspection Get
replaced the observer Receiver before its new assertion. Moving the assertion
immediately after the write fixed test ordering without changing its expected
identity. `initial-node-results.json` retains that attempt. An initial local Python
launcher was unavailable and performed no writes; editing proceeded with Node.
A typecheck found an incorrectly typed NumberCompletion in K20 test sequencing;
explicitly wrapping only the normal numeric payload corrected the test type.
One typecheck command was issued from repository root (no script); it was rerun
from `typescript/`. These are setup/test-authoring failures, not runtime evidence.

The initial sandboxed native build could not locate the installed Zig library
directory; its log is retained and that attempt was interrupted. Approved
installed-library access rebuilt all entries successfully. No pins or compiler
workarounds changed; there was no genuine compiler failure requiring reduction.
The first and latest full R30 failures are retained separately from the initial
observer failure. Generated native binaries/build caches remain outside Git.

## Reproduction

From `typescript/`, with the installed pinned Zig directory on PATH and accessible:

```
npm run typecheck
npm run test:runner
npm run test:probes
npm run test:guest:node
npm run test:guest:native
node docs/validation/ts-029a/r30-reproduction.mjs
node docs/validation/ts-029a/audit.mjs
```

No C++, Claude queue, COORDINATION, compiler pins, branch switch, main merge or
successor work. R30 is resolved; full implementation acceptance remains for review. No full
strict Script, new built-in/accessor/proxy, platform or performance claim.

Delivery: tested implementation committed locally as `5169978`. Automatic approval
review rejected `git push origin codex/primitive-computed-keys` to the configured
`https://github.com/jkup/rift.git`, citing external export of repository contents,
unverified trusted user authorization for the destination and unverified remote
privacy/ownership. No workaround or alternate export attempted. Publishing needs
approval; local implementation is ready for independent review. The checkout was
clean after the implementation commit. This delivery note changes no code/tests.
