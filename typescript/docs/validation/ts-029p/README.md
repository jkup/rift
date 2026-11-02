# TS-029P evidence, rejection migrations and handoff

Design only, 2026-11-02. Chat `01a19b6b-f64b-7902-b10e-84a1bda3b977`, dispatch
base `1f2dcd8`, inspected HEAD `ee800d488d8b8af9bdc6bcbe1ad4a50216ac1f87`, branch
`codex/primitive-computed-keys`. Baseline `b9d3ef1` independently accepted
196/196 both hosts and 30 static-only/separate coverage gates. No new runtime
support is claimed. [Design](../../property-assignment.md), [matrix](matrix.md),
[reproducible inventory](inventory.mjs), [candidate lines](inventory.txt).

## Inspected evidence and source provenance

Read typescript/AGENTS.md, project-goals.md, compiler-contract.md, latest frozen
TS-029P TASKS entry, COORDINATION.md and root Claude Roadmap.md. Initial attempts
to read TypeScript documents at root failed; corrected to typescript paths.
Inspected runtime Reference/GetValue/PutValue/internalSet/set, evaluator reference,
assignment, statement/evaluate/call guards, parser assignment AST locations,
ToObject, primitive conversion, symbols, Array definition dispatch and existing
tests around every migration. No production source changed.

Fixed-edition specification retrieved 2026-11-02:

| Link | Relevant evidence |
|---|---|
| [2025 PutValue/GetThisValue](https://tc39.es/ecma262/2025/multipage/ecmascript-data-types-and-values.html#sec-putvalue) | box, convert/save, dispatch with original base, then strict false translation |
| [2025 assignment evaluation](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-assignment-operators-runtime-semantics-evaluation) | capture LHS, evaluate/get RHS, PutValue, return RHS |
| [2025 OrdinarySetWithOwnDescriptor](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinarysetwithowndescriptor) | nonwritable and nonobject Receiver rejection; definitions on Receiver |

Revision-pinned engine262 source was fetched through connected GitHub and read,
not executed. Revision `d553e7b52501fbc47eae981c8d0fa7a5c26d0171`:

| File / blob | Inspection and decision |
|---|---|
| [reference-operations.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/reference-operations.mts), blob `56e90e4beb19ff0f441662ff13ea70a3aac7df5f` | PutValue boxes, stores only successful key conversion and passes GetThisValue to Set. Adopt operation order, not generator/completion infrastructure or private/sloppy branches. Rift keeps RHS-returning helper. |
| [type-conversion.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/type-conversion.mts), blob `927950f65f5bddd1abffd19140f2e0c5ee0c0990` | ToObject selects active-agent intrinsic wrappers; ToPropertyKey uses string hint and preserves symbol identity. Retain Rift Realm factories and converters; no new architecture or BigInt. |

The web raw-source fetch failed; connected GitHub retrieval succeeded. An attempted
`ordinary-object.mts` path returned404; it is not evidence and no claim is based on
it. The pinned directory listing confirmed the two blob IDs above. No upstream
code copied, no engine execution, no compiler probe and no host-evaluated guest
source. Resource counts are local source derivations, not upstream measurements.

## Reproducible audit and precise future migrations

Run from repository root:

```
node typescript/docs/validation/ts-029p/inventory.mjs
```

The audit scans src/test ts/js/mjs/json, top-level tools mjs and current feature/
architecture documents. It excludes generated build output, historical validation
and Claude assistance. **133 files, 131 candidate lines.** This textual scan is
an index, not a semantic proof: the surrounding tests and all direct Put/Get
sequences were manually inspected, including the hook-count assertion at line144
which does not contain the old diagnostic. Locations below use inspected HEAD;
match by assertion/row if implementation edits move lines.

All existing names, fixture sources, assertion strength and negative coverage
remain unless the exact obsolete observation is listed. These changes are for a
future implementation; historical design/evidence stays immutable.

| ID / exact current site | Required migration, with retained controls |
|---|---|
| A1 `src/runtime.ts:233-239` | replace early object guard with ToObject, save successful key as Value, call internalSet with original ref.base; translate false at operation loc with existing writable diagnostic. Binding branch unchanged. `internalSet:159-178`, `set:186-191` unchanged. |
| A2 `src/object-conversion.ts:7` | comment includes assignment boxing; factories/converter behavior unchanged. `evaluator.ts:112-122,163-168` remains unchanged; no member tick or eager key conversion. |
| A3 `test/key-coercion.ts:138-144` | standalone conversion leaves calls1; Put adds one and saves key; subsequent Get adds none. Change final calls3 to calls2 and label to saved-key reuse; preserve exact RHS/value and all inherited/fallback/primitive-result variants. This is the only current successful object-reference hook-count migration found. |
| A4 `test/key-coercion.ts:217-230` | keep Get assertions and reset key.reads before Put. Null/U Put now N at original loc and reads empty. Boolean/Number/String Put now identical sentinel with reads `toString;`, just like their preceding failed Get; failure did not cache key. Preserve exact completion identity, not merely matching TypeError. Update comment. |
| A5 `test/property-key-conversion.ts:253-279` | null/U write changes old message to N, same column16 and trace BKR; read/call unchanged. Boolean/Number/String writes now reach ForbiddenKey and escape host Error message `object key read`, with BKR and restored Realm/calls/depth; use the existing read/call host-fault branch for all nonnull paths. RHS sentinel still wins for every base, trace BKR and no key access. |
| A6 `test/property-key-conversion.ts:415-431` A22 | symbol write now reaches ForbiddenKey and escapes host Error `object key read`, preserving BKR, Realm/calls/depth cleanup; read/call retain BK. Remove obsolete early-write branch, not the write scenario. Existing readonly symbol Set at435 remains `property is not writable: Symbol(x)`. |
| A7 `test/primitive-reads.ts:30,691-716` W6/W7 | replace shared writeOnly expectation: nonnull Get-then-Put now T(x) at operation8:4 (error helper column4,line8); null/U now N at ref7:9 (column9,line7). Hook counts remain1/0 and prototype x=1. Assert fresh Put box for nonnull; Get and Put are distinct boxes. Preserve original read and direct-location assertions. |
| A8 `test/primitive-reads.ts:718-749` W13/W14/W15 | W13 RHS installs Y returning y, so expect T(y)1:1, trace RY, one box. W14 identical Q, trace R, zero boxes. W15 normal3, y=3/x absent, trace RY, zero boxes. Split trace/box assertions by named scenario; do not weaken them to a shared permissive condition. Remove unused old diagnostic constant after A7/A8. |
| A9 `tools/run-guests.mjs:26`, `test/fixtures/primitive-reads-write.js` | existing file case retains source/name, status1, empty stdout; error string changes only to `1:1: runtime TypeError: property is not writable: 0`. This is the sole existing top-level expected-record migration. Fixture source stays `'ab'[0] = 'z';`. |
| A10 `test/realms.ts:370-375` W17 | primitive String write message becomes `property is not writable: 0`; keep runtime/throw/TypeError checks and String root payload/key-count/prototype preservation. Add exact location if extending assertion; do not remove preservation controls. |
| A11 `docs/feature-inventory.md:16,282-287`; `docs/architecture-decisions.md` current/supersession notes | replace current object-only/pre-key write claim with strict data-only boxed dispatch after RHS, original Receiver and key caching; append validated implementation evidence/decision. Clearly supersede dated TS-025/TS-028 restrictions rather than erasing their historical evidence. No claim of full strict Scripts or new built-ins. |
| A12 new dedicated driver/runtime-read fixtures, native/runner registration | cover all146 named rows and variants; retain196 baseline names/30 gate entries. New entries are additive; compare complete baseline expected records allowing only A9. Keep original failed attempts and historical validation. |
| A13 `test/key-coercion.ts:56-60` Observed.set | move observer to `internalSet(key, value, receiver, context, location): InternalBooleanCompletion`, import that type, preserve context assertion, S mark and stop-S identical sentinel, then delegate to `super.internalSet` with unchanged receiver. Add original Receiver assertion as for Get. Existing full BKRCS/prefix traces, abrupt identity and RHS controls at63-101 must stay exact. This is instrumentation migration, not a weaker oracle. |
| A14 `test/property-key-conversion.ts:157-162` ObservedObject.set | similarly move to internalSet with Receiver parameter and InternalBooleanCompletion return; retain seenContext, observedKey, S trace and setThrow sentinel, then delegate to super.internalSet. Record Receiver in existing receiver field and assert original base on writes. Preserve every object-path BKRS/BKRCS/Set-failure/readonly trace and diagnostic, including A21/O5. Do not delete S from expectations. |

### Candidates explicitly retained without oracle changes

- `test/definition-dispatch.ts`, `object-descriptors.ts`, `object-prototypes.ts`:
  all raw internalSet normal(false), distinct Receiver, inherited nonwritable,
  nonextensible, String/symbol descriptors and strict `.set`/Put tests retain
  exact behavior. The new Put must not bypass defineOwnProperty overrides.
- `test/array-length-coercion.ts`, `array-storage.ts`: raw Receiver and frozen
  length rejections, double RHS conversion and partial shrink are unchanged.
- `test/property-key-conversion.ts:99-138`: Put/Get reuse now saves primitive
  keys, whose conversion was already effect-free; resulting keys/values and counts
  stay unchanged. Separate Scenario.run source evaluations still convert once
  per fresh reference, including object-key calls around291-306 and A21/O5.
- `test/primitive-reads.ts:677` object Get-then-Put already uses Get's saved key;
  no expectation change. All read-only resources/host-fault rows remain intact.
- `test/symbol-conversions.ts:201-202,270`, `test/typeof-void.ts` observer Set,
  generated readonly cases in `tools/run-guests.mjs:107,116`: existing false Set
  and diagnostics unchanged. Symbol formatting is not guest conversion.
- `src/array-map.ts`, `test/array-map.ts` and feature-inventory object-only
  lengthOfArrayLike: unrelated object-only restrictions remain. Delete, typeof,
  in, parser/unsupported operators, binding errors and read rejections unchanged.
- No old diagnostic appears in `test/cases.json` or any other runtime fixture.
  Only the runner expectation for the retained String write fixture changes.

## Contradictions, decisions and verification boundary

The obsolete early primitive rejection contradicts fixed2025 ordering. The old
direct Put/Get calls3 assertion contradicts saved-key semantics; it must become2,
not be deleted. The old W6 operation location migrates from7:9 to8:4 because false
Set now reaches the existing operation-location boundary. Nonnull W13's RHS
mutation means its key is **y**, not x. These are intentional review points.

Local three-line translation was chosen over changing GuestObject.set or adding
a helper. Two host observers override the old set convenience boundary; A13/A14
must move them to internalSet or their exact S traces and sentinels disappear.
This is an additional necessary test-interface migration, not a production
semantic exception. The existing iterative data-only Set remains authoritative; full
accessor/proxy dispatch is outside scope. There are no unresolved semantic choices
in the proposed contract. Independent acceptance and eventual static/native
validation remain outstanding; documentation checks cannot resolve those.

146 primary named rows: V36/E38/K20/F12/R30/C10, plus explicit variants. Derived
default64 assignment recursion is326/390 ticks and peak67/131, with65 boxes,
not the read-path261/325 tick counts. No speculative compiler uncertainty justified
a probe. Implementation must report disagreements before adjusting these oracles.

Design checks: reproduce inventory twice byte-for-byte; validate unique contiguous
row IDs/counts and local document links; inspect owned diff and `git diff --check`.
`node typescript/docs/validation/ts-029p/check.mjs` passed all these programmatic
consistency checks; whitespace check passed with only TASKS CRLF normalization
warning. The script's scope is documentation, not semantic or compiler validation.
No typecheck, runner, probes, Node/native runtime runs or static coverage build
was performed for this documentation-only task. Baseline196/196 and30 gates remain
prior independent evidence, not new execution results.

Only owned design/evidence paths and TS-029P TASKS claim/handoff change. Coordinator
owns COORDINATION.md; CL-004/005 remain reserved. Commit/push coherent design on
the existing branch under owner authorization, then stop for independent review.
No implementation, branch switch, main merge, successor or self-acceptance.
