# TS-028P evidence, migration inventory and handoff

Design only, 2026-11-02. Owner chat `01a19b50-e23e-7450-942a-25c0ab5581d8`,
dispatch base `72a778a`, inspected HEAD `841faaf0bcbdf84142b93e4d3d6d8edd4406c4e2`
(includes coordinator dispatch). Existing branch `codex/primitive-computed-keys`.
[Design](../../primitive-property-reads.md), [matrices](matrix.md),
[audit script](inventory.mjs), [candidate lines](inventory.txt).

## Evidence inspected

Read typescript/AGENTS.md, project-goals.md, compiler-contract.md, the latest
TS-028P TASKS contract, COORDINATION.md and root Claude Roadmap.md. Initial root
relative reads of the TypeScript docs failed; corrected to typescript paths.
Inspected runtime Reference/GetValue/PutValue/internalGet, evaluator reference,
calls and guards, object-conversion, primitive wrappers, property-key/string
helpers, primitive-conversion and existing built-in registrations. Read every
current rejection candidate below, including its fixture and surrounding setup.

Fixed-edition sources retrieved 2026-11-02:

| Source | Evidence used |
|---|---|
| [ECMA-262 2025 GetValue / PutValue / GetThisValue](https://tc39.es/ecma262/2025/multipage/ecmascript-data-types-and-values.html#sec-getvalue) | ToObject before deferred key conversion; successful key saved on reference; original base as receiver |
| [2025 member evaluation](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-evaluate-property-access-with-expression-key) and [EvaluateCall](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-evaluatecall) | key-expression capture and deferred conversion; callee retrieval before arguments, callability after arguments |
| [2025 ToObject / ToPropertyKey](https://tc39.es/ecma262/2025/multipage/abstract-operations.html#sec-toobject) | nullish rejection, supported wrappers, object identity, string-hint key conversion |
| [2025 StringGetOwnProperty](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-stringgetownproperty) | canonical integral keys, -0 exclusion, one-unit substring and descriptor flags |

Pinned engine source fetched through connected GitHub, not executed:

| Revision/file | Git blob | Inspection |
|---|---|---|
| engine262 `d553e7b52501fbc47eae981c8d0fa7a5c26d0171` [reference-operations.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/reference-operations.mts) | `56e90e4beb19ff0f441662ff13ea70a3aac7df5f` | GetValue boxes first, updates ReferencedName on success, dispatches Get with GetThisValue; PutValue reuses converted key |
| same revision [type-conversion.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/type-conversion.mts) | `927950f65f5bddd1abffd19140f2e0c5ee0c0990` | ToObject uses active-agent intrinsic prototypes for primitive wrapper slots; ToPropertyKey preserves symbols |

Adopt the readable operation order and successful-key memoization. Keep Rift's
Value/completion types, Realm factories and data-only dispatch; do not import
engine262 generators, private names, BigInt, agent infrastructure or general Set.
No upstream code copied. The web fetch of the GitHub file failed with cache miss;
the connected GitHub retrieval succeeded and supplied the exact blob above.
No engine execution, compiler experiment or host-evaluated guest source was used.

## Findings requiring explicit review

The deferred key itself is correct for fixed 2025. The missing key memoization
is a real direct-API mismatch, masked by the lack of compound/update syntax.
The frozen proposal adds memoization only to successful GetValue conversion.
Repeated direct PutValue-only or delete-only reuse is not generalized here.
Object-only writes remain an intentional subset restriction, including rejection
before hooks even where full ECMAScript would process a primitive Set path.

Number.prototype.toString is still blocked. Primitive `(2).toString()` will
therefore expose the already inherited Object method and return `[object Number]`.
Do not silently supply decimal/radix formatting in this task or claim complete
primitive built-in compatibility. CL-005 remains reserved.

Ordinary Get iterates descriptors rather than prototype internalGet overrides.
Prototype-only observer subclasses are insufficient to assert primitive Receiver
delivery. Use a test Realm factory returning an instrumented wrapper at the
top-level dispatch; keep production interfaces unchanged. Whether such test
instrumentation remains fully static is an implementation validation obligation,
not an assumed compiler failure warranting speculative probes now.

## Repeatable rejection audit

From repository root: `node typescript/docs/validation/ts-028p/inventory.mjs`.
The script scans src/test ts/js/mjs/json, top-level tools mjs and current feature/
architecture docs: **125 files, 69 candidate lines**. Historical validation and
Claude-owned assistance are excluded. This is a broad textual candidate scan,
not an automated semantic completeness proof. Manual inspection resolves all
listed rejection sites; direct API call sites were also inspected for reuse.

All locations below are relative to typescript at inspected HEAD. Do not replace
every occurrence of the old diagnostic: primitive writes must retain it.

| ID / current location | Exact future migration |
|---|---|
| A1 `src/runtime.ts:214-224` | replace property-base guard with ToObject; memoize successful key as Value; dispatch with original base and operation loc; binding branch unchanged |
| A2 `src/object-conversion.ts:7` | remove explicit-boxing-only wording; algorithm unchanged |
| A3 `src/evaluator.ts:113-122,160-168,206-223` | verify existing capture/call paths; no new ticks, eager conversion or boxed this; assignment unchanged |
| A4 `test/boolean-string-conversions.ts:343`, fixture71-73 | primitiveMember returns exact realm.stringPrototype.toString function Value; move from negative loop to explicit positive assertion; fixture source/line numbers preserved |
| A5 `test/number-conversions.ts:342`, fixture80-82 | primitiveMember returns exact realm.numberPrototype.valueOf function Value; retain all other negatives and namespace-call failure |
| A6 `test/object-tostring.ts:306`, fixture91-93 | primitiveMember returns string 'x'; preserve all other negatives and conversion/resource expectations |
| A7 `test/symbol-conversions.ts:266-275`, fixture20-22 | implicitMember returns exact realm.symbolPrototype.valueOf function Value; separate from aligned negative arrays without shifting names/messages/locations; retain numeric/implicit-string/root/readonly failures |
| A8 `test/realms.ts:362-365` W17 | `'ab'[0]` now 'a'; false.x and (1).x now U. Keep `'ab'[0] = 'z'` old TypeError; assert unchanged String payload/prototypes |
| A9 `test/property-key-conversion.ts:242` | detached method still fails on undefined this.x, but message becomes nullish-box message; trace BKG and existing location retained |
| A10 `test/property-key-conversion.ts:253-269` | split read/call from writes. Null/U read/call use nullish-box error with unchanged columns1/16 and BK. Boolean/Number/String read/call now reach ForbiddenKey and escape host Error `object key read`; retain BK, assert cleanup. Writes for every primitive remain old error column16, BKR; RHS sentinel still wins |
| A11 `test/property-key-conversion.ts:403-410` A22 | Symbol read/call likewise escape ForbiddenKey host fault with BK, instead of old guest error. Write remains old error1:16, BKR. Add ordinary successful symbol-base coverage rather than weakening this host-fault sentinel |
| A12 `test/key-coercion.ts:217-224` | split sequential helper assertions/reset observation. Null/U Get uses nullish-box message with zero reads; other primitive Gets return identical sentinel from ThrowingKey with reads `toString;`. Every Put retains old error and adds zero reads. Existing eager array of both results cannot keep asserting a shared empty trace after a successful read attempt |
| A13 `test/delete-operator.ts:342-369` D23 | `delete 'ab'.x.y` now gets U from .x, then delete ToObject fails: nullish-box message at1:8. Same phase/location, different reason; all direct delete controls unchanged |
| A14 `test/typeof-void.ts:435-596` E10 | NullBase/UndefinedBase change message only, trace BK. BooleanBase/NumberBase/StringBase/SymbolBase now convert key, trace BKC with no old Observed target G; property x absent, so typeof='undefined', void=U. Preserve all other named rows and hook assertions |
| A15 `test/typeof-void.ts:1103-1200` R13 | invalidBase is specifically null[k]; message becomes nullish-box, steps5/calls0/no Get unchanged, both operators and columns retained |
| A16 `test/in-operator.ts:900-911` E29 | null[p] still suppresses key hook and right(); error message becomes nullish-box at1:1, trace p retained; rename explanatory label if useful without dropping row |
| A17 `tools/run-guests.mjs:45-46` | primitive-base and detached case names, source, status1 and stdout preserved; expected stderr substring changes to `runtime TypeError: cannot convert null or undefined to object` |
| A18 current `docs/feature-inventory.md:16,207`, `docs/architecture-decisions.md:377` | update current scope and append decision/evidence after implementation validation; old historical design/evidence remains immutable |
| A19 dedicated test driver/fixtures and native/runner registration | add all named rows and runtime cases; preserve189 case names and29 gate entries; audit expected-record diff allows only A17 in existing top-level cases |

A4-A7 retain fixture functions as positive evidence. Do not remove them or rewrite
the fixture to hide the transition. A10/A11 ForbiddenKey currently creates a new
Error, so assert its exact message and escape/cleanup there; use retained F in the
new matrix to prove same-instance host fault propagation. A12's sentinel identity
is stronger than merely comparing its diagnostic.

Other candidate references (definition-dispatch, descriptors, prototypes, array
index/key conversion loops) continue to pass their current object/write contract.
Existing direct Put-then-Get controls do not share a previously read converted
key, so their expected conversion counts stay unchanged. New W1-W12 distinguish
Get-then-Put, retries and separate references. No parser, existing syntax, source
retention, manifest or production change is made by this design task.

## Validation and handoff

There are **144 primary named rows**: V22, S14, E30, M18, W20, R30, C10, plus
explicit variants. Their oracles/counts are derived, not measured runtime passes.
Run the audit twice and compare bytes; run `git diff --check`; manually inspect
the owned diff, links and row IDs. No runtime implementation, typecheck, runner,
probe, Node/native build or integrated coverage run was performed. None is claimed.
Accepted `5664a35` remains prior evidence for189/189 per host and29 gates.

The later implementation must validate all matrices and every enumerated migration
with independent literal expectations. Preserve unknown/failed coverage reports,
compiler reductions, crashes and timeouts as failures, not skips. Native default64
recursion remains mandatory and unproven for the proposed change until run.

Owned changes are only docs/primitive-property-reads.md, this directory and the
TS-028P TASKS claim/handoff. Coordinator owns COORDINATION.md and acceptance;
CL-004/005 are reserved. Commit/push the design on the existing branch as authorized,
then stop for independent review. No successor, branch switch, main merge or
self-acceptance. Any export rejection is a delivery limitation, not semantic
acceptance; record it explicitly and leave the local commit reviewable.
