# TS-035D4-P: strict parameter emission and combined rule selection

Design candidate at accepted base `257f7fa`, 2026-11-05. Actual and independent
second review are required before a separate D4 implementation assignment.
This writer owns this document, `validation/ts-035d4-p/`, and its TASKS entry.
No production, old test, historical evidence, registry or admission is changed.

## Decision: retain preparation, add rejection-only continuation

Keep D2's existing preparation parse and collector unchanged. Only when its
result is blocked with unsupported-syntax/`parse.duplicate-parameter`, run the
existing private full-source parameter continuation with **null retained nodes**.
After successful EOF, one new internal collector bridge checks the combined
block/parameter policy. It returns either a certified rejection or null. It
cannot return a complete declaration plan. Null, including every veto, preserves
the original D2 rejection object. This is a deliberate two-pass rejection path,
not a second parser implementation or a parse of recovered source.

The continuation reuses D3's actual `parseStructuralSource(source,null,true,true)`:
full bounded lex, `bounded-parameter-audit`, every original formal occurrence,
function body, enclosing body and EOF. It retains D3's guard forbidding nodes,
source-unit/depth limits and all other grammar checks. No candidate information
is inferred from an earlier failed parse. The initial duplicate failure is only
permission to attempt the fresh audit, never positive rule authority.

For combined sources, all global vetoes must pass; choose the candidate whose
second binding has the earliest UTF-16 start, then first.start. Block and parameter
candidates share that order. If both keys tie, block precedes parameter (disjoint
binding roles make this unreachable in current grammar, but the comparator is
total). No return continuation or combined return candidate list is introduced.

| Bounded alternative | Assessment |
|---|---|
| Call public D3 audit from C | Reject: D3 intentionally vetoes block pairs, and C must not manufacture preparation authority or reparse from protocol metadata. |
| Change D3 to combine rules | Reject: changes the accepted standalone evidence contract and its diagnostic order. |
| Single preparation parse using duplicate continuation and retained nodes | Defer: requires weakening D3's null-node guard and reconstructing old first failures; risks releasing a complete sloppy-duplicate plan. Saves a bounded rejection-only parse but increases authority surface. |
| Always run D1 plus D3 and select from nonempty results | Reject: mixed inputs make D1 fail before collection and D3 veto blocks. Absent candidates are not coverage. |
| Recover/strip duplicates, skip bodies, use expected-negative metadata | Reject: altered or partial source cannot certify the actual input. |
| Preserve D2; fresh null-node continuation on duplicate rejection | Select: six production files, no successful-path node changes, no new executable grammar, original veto diagnostics retained. |

## Actual source closure and exact future APIs

The source/build hashes in [audit.json](validation/ts-035d4-p/audit.json) bind this
inspection to the accepted implementation, not an assumed older design.

| File and API | Exact proposed change / retained authority |
|---|---|
| `src/parser.ts:parseBoundedScriptPreparation` | Save the existing `parseStructuralPlan(unit,nodes,true,true)` result. Return it unless exactly blocked/unsupported-syntax/parse.duplicate-parameter. Copy `{id:unit.id,text:unit.text}` once for the new audit, run `parseStructuralSource(source,null,true,true)`. Blocked parse returns the saved result; parsed calls the new bridge, returns its rejection if nonnull, otherwise saved result. No other entry point changes. |
| `src/script-declarations.ts` | Add internal `collectBoundedScriptParameterRejection(unit: ScriptSourceUnit, body: Stmt[], tokens: Token[], bindings: Map<number, ParsedBinding[]>): CertifiedParameterPreparationRejection \| null`. The named internal type is the blocked/goal Script/unit/Diagnostic shape with syntax-error rejection restricted to block or parameter. It has no nodes argument, complete arm or executable state. Construct one `DeclarationCollector(unit,tokens,bindings,null,true)`, collect once, call new `certifyParameterPreparation()`. |
| `src/script-observation.ts:Attempt.rejected` | Existing syntax-error arm accepts exactly block OR parameter, emits `rejection.ruleCode`. Profile/conflict branches and the entire following legacy return fallback remain byte-equivalent. |
| `src/script-observation-types.ts:ScriptResult` | Add only `duplicate-strict-parameter` to the existing return/block v2 literal union. |
| `tools/test262/script-driver-result.mjs:resultShape` | Literal ordered allowlist becomes return, block, parameter. No other source change. |
| `tools/test262/script-result.mjs:resultShape` | Same single literal addition; independent decoder remains independent. |

These are exactly **six** production files. `script-execution-internal.ts` already
calls the preparation bridge, checks Realm profile first, and accepts only complete
plans into `ExecutableScript` state. It needs no edit. `script-observation-json.ts`
already serializes `jsonString(value.ruleCode)`; it needs no edit but requires
actual-byte coverage for the third code. `outcomes.ts` already reserves parameter.
Lexer, syntax, prologue, Script facade, execution, v1 codecs, limits, compiler/pins,
build manifest, profiles, CLI, rule registry, ledger and admission need no production
change. One additive native gate/new test registration requires separate assignment.

The initial D2 parse owns its existing `SourceText`, assignmentNameEligible map,
body, scope and declaration node identities. If it succeeds, return it directly;
never reparse or replace those nodes. If it rejects duplicate formals, its partial
retention stays local and cannot become a record. The second parse has nodes=null:
no scope/declaration maps or assignment associations reach that caller. Both a
certification and a veto leave the initial rejected nodes exactly as before.
Full source is copied from the actual unit, not caller AST/evidence/strict flags.
Internal collector exports remain implementation bridges, never Script facade
inputs. A caller casting detached D3 candidates cannot authorize execution.

## Collector and precedence contract

Extract D3's existing formal scanning loop into a private pure
`parameterPairs(): { candidates: StrictParameterCandidate[]; sloppy: StrictParameterCandidate | null }`.
It scans every function's original formals, keeps first occurrences, emits
first/second and first/third for triples, copies locations/sites, and sorts strict
pairs by second.start then first.start. Sloppy retains the earliest pair by the
same keys. `auditStrictParameters()` must retain its existing initial `audit()`
blocked/eligible branches, then call this helper and return exactly its old
sloppy/none/eligible results. Do not change D1 `audit()` or `project()`.

`certifyParameterPreparation()` is called only after the full continuation EOF:

1. Call unchanged `audit()` on this collector. If blocked, return null. This
   globally checks strict delete/sloppy block restrictions, every catch (including
   behind an earlier conflict), and every non-target lexical/var/formal conflict.
   Block eligibility is allowed here, unlike standalone D3.
2. Call `parameterPairs()` over all functions. If sloppy is nonnull return null,
   even when an earlier block or strict-parameter pair exists. Any sloppy duplicate
   is a global veto. No executable plan is ever returned.
3. Require at least one strict parameter pair; otherwise throw an internal
   invariant fault. Entry was an actual duplicate-formal rejection and this full
   parse has no sloppy duplicates. This check is not a fallback based on absence.
   Require audit sourceUnits and consumedUnits equal to original text.length.
4. Select the earliest strict parameter pair or eligible block pair by the total
   order above. Return blocked/Script/actual unit, syntax-error with the selected
   rule; Diagnostic is parse/SyntaxError, location a copy of second.loc, message
   `duplicate strict parameter: NAME` or existing `duplicate block lexical function: NAME`.

| Situation | Frozen behavior |
|---|---|
| Wrong Realm profile, including invalid or oversized input | Existing profile rejection before parsing/allocation. |
| Initial bounded lex/source limit failure | Exact original result; continuation not entered. |
| Initial parser failure other than duplicate formals | Exact D2 result; continuation not entered, regardless of possible later duplicates. |
| Duplicate formals then late grammar, invalid formal, delimiter, depth or EOF failure | Full continuation fails; return **original duplicate-parameter** diagnostic, not the later continuation diagnostic. No new certification. |
| Full EOF then any non-target conflict, strict delete, catch, sloppy block or sloppy duplicate | Return original duplicate-parameter result; all target candidates vetoed. |
| Full EOF, all vetoes clear, parameter and/or block candidates | Earliest second binding selects block or parameter; all source is inspected before selection. |
| No duplicate formal in original D2 | Existing D2 behavior, including ordinary first-conflict projection and block-only certification, unchanged. |
| Top-level return before duplicate formals | Bounded return-context fails before continuation; legacy return audit independently rejects duplicate formals. No certification. |
| Duplicate formals before top-level return | Continuation fails return-context; original duplicate diagnostic retained; legacy parse rejects duplicate before it can promote return. |
| Return with no duplicate formals/block pair | Existing source-only legacy fallback at parse-only/test only; execute and harness unchanged. |
| Parent deadline/output cap/crash | Existing transport precedence wins independently of child syntax bytes. |

The incompatible policies are explicit: (a) applying all new global vetoes to
legacy return would remove accepted `return 1; {function single(){}}` certification;
(b) preserving every old D2 preparation result would prevent any parameter emission;
(c) preserving D3's block veto in preparation would prevent combined selection;
(d) replacing the original duplicate diagnostic with a later audit veto would
change previously accepted first-failure behavior. This proposal preserves (a)'s
old boundary and (d)'s original diagnostic, changes only explicitly frozen positive
preparation rows in (b), and leaves D3 itself unchanged for (c). Review these
choices as semantics, not incidental implementation details.

Legacy exclusion uses actual code: both legacy and return-audit purposes still
fail duplicate formals in `functionTail`; the return audit parses every body and
entire narrower source. Neither can certify a source containing such duplicates.
The existing block/return exclusion remains unchanged. No failed parse, missing
candidate array, substring or partial AST supplies this argument.

## Literal evidence and old-test migration

[semantic-matrix.json](validation/ts-035d4-p/semantic-matrix.json) freezes 193 full
source rows: all 90 D2, all 77 D3, and 26 combined/order/effect/return controls.
Current observations use the already built Node parser and parse-only/test C.
Future selection sites come from accepted literal D3 pairs plus explicitly
authored mixed-case positions, never a future implementation output. Whole S21
raw Git blob `69dc995f6fd6a07f9a5c3c5c16d50e2c5f88537b` is verified, including
comments and `$DONOTEVALUATE`; the strict version is exactly the retained prefix.
Raw S21 remains unsupported. No `$DONOTEVALUATE` or guest body ran here.

Future Node/native must run every row with both runtime files, both source orders,
both actions, both roles, and distinct Script Realms. R0 selects `left` at [34,38),
line2/column21; R1 selects `right` at [65,70), line2/column58, including non-BMP
comment and CRLF. Input files are read from argv/file I/O, never compiled selection
constants. Preserve own/inherited modes, anonymous nested functions, non-directive
strings/parentheses, both mixed-rule orders, nested/triple pairs, both sloppy orders,
mixed function/function/let and var collisions, switch/formal/catch vetoes, late
grammar and exact 100000/100001 and depth129/limit128 controls. Existing ordinary
and D1/D3 expected values and node snapshots remain exact.

[proposal-manifest.json](validation/ts-035d4-p/proposal-manifest.json) and
[old-test-proposals.json](validation/ts-035d4-p/old-test-proposals.json) bind 855
complete original Git/checkout and proposed files: **851 identity, four proposed
migrations**. Original/result SHA-256, Git blob and complete base64 bytes are
included; readable complete changed copies live under `proposed/`. No real old
file is edited. [verify.mjs](validation/ts-035d4-p/verify.mjs) checks every whole
file; `--applied` checks exactly the proposed result bytes after future acceptance.

* C `script-observe-codec.test.mjs`: keep complete comparison to `e66876d`, adding
  only the exact parameter literal to the previously approved C/D2 transformation.
  This independently forbids any other decoder change.
* D2 `validate.mjs`: retain all ordinary/D1 assertions and loops; use exact source-
  bound overrides for preparation and contexts on P01/P02/P03/P08/P14/X09/S21 only.
* D3 `validate.mjs`: retain every audit, accepted fixture, grammar, detachment and
  node check; replace only `ordinary.D2` comparison on the 28 enumerated rows in
  [inherited-expectations.json](validation/ts-035d4-p/inherited-expectations.json).
  It still compares every other ordinary field and the entire nodes snapshot.
* D2-P `verify-future-wire.mjs`: the frozen parameter mutation becomes exact
  known-rule acceptance at both boundaries; all other malformed/unknown assertions
  remain. The mutation is exercised, not skipped. Its frozen matrix is immutable.

These four are proposals requiring actual/second approval, including the two
historical validator source migrations. Historical JSON/raw outputs, original
proposals and original failure records are not changed. D2's historical
`verify-old-files` and D3 `preserve` necessarily reject later work against their
old base/source hashes: retain those programs as milestone proofs, not current
tree acceptance gates. D4 must use this exact whole-file migration verifier plus
a new D4 preservation verifier. Do not weaken or rerun historical preservation
programs and label their expected mismatch a successful validation. New replays
must archive outputs in D4 and recursively restore every historical byte.

## Wire, provenance and future acceptance

[wire-matrix.json](validation/ts-035d4-p/wire-matrix.json) freezes 96 rows across
two host labels, two inputs, two actions, two roles, three codes and optional
diagnostics. Host labels are future obligations, **not native measurements**.
The current actual Node serializer preserves all three supplied codes; current
decoders accept 64 return/block controls and reject 32 parameter controls.
`wire.mjs` records 29664 malformed/structural/binding checks; for future parameter
rows those current checks use a block-code surrogate, explicitly not a modified
decoder. `--future` requires all 96 rows through both actual extended decoders.
Current JSON encoding of supplied parameter objects is not engine emission proof.

Future supplemental driver must generate actual serializer bytes on both hosts
and both file inputs. Parameter and block emission must come from preparation
for both actions/roles. Return execute/harness rows remain synthetic serializer
controls only. Compare actual ASCII bytes and exact semantic payload to frozen
expectations; decode independently through child and envelope parsers. Never
substitute synthetic JSON or decode/reencode agreement for actual emission.

Closed controls cover unknown/empty/null/reserved rules, duplicate/escaped keys,
malformed UTF-8, concatenated JSON, output cap, required-key removal, extra fields,
wrong phase/constructor, body=true, inspection, unit/Realm/source/request/build
binding, out-of-range locations and completed prefix. Preserve v1 exclusion,
all seven limits, parent transport priority, expected-negative classification
and harness-error mapping. A swap among known codes or an in-range wrong location
can pass schema validation: producer exact-rule/site tests must catch it. No
decoder can certify source semantics. No rules registry or admission is enabled.

For each rejected preparation assert actual unit id/text and Realm association,
operation role/parse phase, source location, SyntaxError, false testBodyEvaluated,
null inspection and unchanged completed harness prefix (failed occurrence excluded).
Run after empty and seeded successful harness prefixes, including repeated paths
with distinct occurrence IDs. Snapshot global properties/environment before and
after; assert no instantiation, body entry, guest calls, prints or new binding.
Snapshot session steps/calls/depth/active/lastAbrupt before and after, including
seeded abrupt completion identity. All remain unchanged. Preparation allocates
no guest state or semantic budget. Ready controls exercise parse-only no body
versus execute completion 7. Mutate original unit after ready preparation and
check retained source/nodes; reuse same id with different texts and reverse orders.
Metadata or supplied expected-negative/mode must never change source strictness.
The literal prefix, profile, source mutation, ready and history fixtures are in
[future-controls.json](validation/ts-035d4-p/future-controls.json); apply their
host/input/action/role/Realm product in the future supplemental driver.

Future acceptance: preserve 212 guest records per host and all 66 old static
gates, add one separately checked static-only/zero-dynamic gate. Require full
both-host guests; D1 124+24, migrated D2 360/64/14, migrated D3 154/77/30/26 and
all current A/B/C/H1-H7/M/E4/inherited/A21, C172 transport/21 host, typecheck,
runner20/host73/observations22/probes10. Run the new source/wire/identity/effect
matrix; inspect source closure and complete inherited migration. Keep all 33
selected corpus files/60 variants blocked. Native lowering and integration are
unproven until that separate task; do not change compiler pins or add workarounds
without retaining/reducing a concrete new failure for review.

## Offline reference basis and handoff boundary

Retained accepted source basis: [D-P](script-strict-rule-audit.md),
[D2-P](script-strict-rule-dispatch.md), [D3-P](script-strict-parameter-audit.md).
ECMA-262 2025 edition16 §§15.1.1/15.2.1 and 11.2.1–2 supply strict formal and
directive semantics; §§14.2.1 and B.3.2.4 distinguish block conflicts and sloppy
exceptions. Retained V8 `14.6.202.34` parser-base.h4932–4977 blob
`3810a8f9d1d73559ba073c1f4d6e0af2a63717c5` supports resolving formals after
body mode; scopes.cc1155–1225 blob `f7cc25027cf177d2578f2fc8c2290b44e5ceaef5`
supports scope distinctions. This offline task did not fetch upstream or execute
a reference engine. Rift's diagnostic selection is local policy, not a spec
mandated ordering. No external code was copied.

Current evidence preserves 4828 tracked files outside ownership, all 60 blocked
variants, and inherited 212/66 totals without rerunning full suites. The design
scripts are editorial freezes/current-build probes, not an implementation model
proving D4. Stop after a coherent proposal commit for actual and second review.
No publication, production implementation or successor is authorized by this
document. Review must accept the two-pass choice, combined precedence, six-file
closure and four exact old-test migrations before assigning D4.
