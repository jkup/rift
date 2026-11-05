# TS-035D6-P: numeric assignment rejection dispatch

Design/evidence candidate against accepted D5 `335663fcddf5bfc595369c6a8f68b584a9165e0f`.
This checkpoint authorizes no implementation, publication, admission or successor.
Actual and independent second review must accept the complete proposal first.
Lexical declarations in Statement position remain separate. The 212 guest records
per host, 68 accepted static gates, all 60 blocked corpus variants, C++ and original
D5-P evidence remain unchanged. No full build or native run was made here.

The source basis is the accepted [numeric audit design](script-assignment-target-rule.md)
and its retained pinned S18/spec/V8 references. No new language interpretation is
introduced. This slice consumes the implemented D5 numeric-only audit, preserving
its six operators, decimal token identity, parentheses, RHS-first failure order,
whole-source EOF requirement and all global vetoes. A call expression target is
still unsupported; the V8 compatibility treatment of calls grants no numeric
audit authority. No token scanning, substring replacement or neighbor parse may
certify a source.

## Actual production closure

All paths below are relative to `typescript/`. Complete proposed file bytes and
SHA-256 hashes are in [production-proposal](validation/ts-035d6-p/production-manifest.json).
These files are editorial artifacts: none was applied, imported or compiled.

| File / callsite | Exact proposed change |
|---|---|
| `src/parser.ts:parseBoundedScriptPreparation(unit,nodes): DeclarationPlanResult` | Wrap unchanged current D4 body, renamed private `parseBoundedScriptPreparationBeforeNumericAudit`. Save its complete result before considering D5. |
| Same wrapper | Retry only `original.kind === "blocked"`, `original.rejection.kind === "unsupported-syntax"`, `capabilityCode === "parse.assignment-target"`. Call existing `auditBoundedScriptNumericAssignments(original.unit.text)` once, with the complete original source and no retention argument. |
| Same wrapper | Return the original object unchanged for every noneligible audit. For eligible only, require the first candidate and construct the blocked literal below. Reuse `original.unit`; copy the target location. Never return a plan or continuation AST. |
| `src/script-observation.ts:Attempt.rejected` | Add `assignment-target` to the existing explicit block/parameter syntax-rule guard. Use the existing envelope projection and source site. Preserve the independent legacy return fallback byte-for-byte. |
| `src/script-observation-types.ts:ScriptResult` syntax-error arm | Add only `"assignment-target"` to its ruleCode union. No new API/type/schema fields. |
| `tools/test262/script-driver-result.mjs:resultShape` | Append one closed allowlist literal after return, block and parameter. |
| `tools/test262/script-result.mjs:resultShape` | The identical ordered literal addition in the independently implemented envelope decoder. |

Exact eligible projection:

```ts
{ kind: "blocked", goal: "Script", unit: original.unit,
  rejection: { kind: "syntax-error", ruleCode: "assignment-target" },
  diagnostic: { phase: "parse", name: "SyntaxError",
    message: "invalid numeric assignment target",
    loc: { line: first.target.loc.line, column: first.target.loc.column } } }
```

The diagnostic selects the first candidate sorted by operator start then target
start; the location is the original numeric token, excluding parentheses. This
is the accepted Rift diagnostic policy, not a claim of normative error ordering.
Full Diagnostic equality matters, including message, phase, name and location.
On a veto, the late audit diagnostic must never replace the original first error.

Actual D5 exposes `auditBoundedScriptNumericAssignments(source: string):
NumericAssignmentAudit` from parser and numeric audit/candidate/site types from
script-declarations. Eligible contains sourceUnits, consumedUnits and detached
candidates; none contains only lengths; blocked contains reason, full diagnostic
and nullable full rejection. `parseStructuralSource(unit,null,true,false,true)`
uses the private numeric purpose; `collectNumericAssignmentAudit` makes one
DeclarationCollector, audits every scope, and vetoes block pairs. Neither file's
D5 implementation needs changing. `NumericAssignmentAudit` and its callers must
not gain Realm, metadata, AST or caller candidate inputs.

`ExecutableScript.prepare` remains the sole preparation-to-executable boundary:
it checks Realm profile before parsing and only complete plans create executable
state. Its facade `prepareBoundedScript` and caller `Attempt.run` require no edit.
`prepareStrictScript`, both ordinary declaration planners, legacy parse/return,
standalone D1/D3/D5 audits and their shapes remain unchanged. Retention passed to
the original preparation is preserved by identity: source, partial body, scopes,
declarations and assignment-name associations must not be cleared, replaced or
populated by the numeric retry. Both failed and successful ordinary node checks
remain required. No evaluator/reference fallback, serializer, lexer, grammar,
outcomes, registry, ledger, admission, CLI, profile, manifest or compiler pin edit.

## Priority and veto contract

| Original/full-source situation | Result |
|---|---|
| Wrong Realm profile, even oversized or invalid source | Existing profile rejection before parsing. |
| Source/lexer guard or any original rejection other than assignment-target | Exact original D4 preparation, no numeric retry. |
| Numeric target alone in supported strict or sloppy surroundings | New rejection only, for either action and either role. |
| Numeric target then late grammar, unsupported target, parse depth or source guard | Exact original result; numeric evidence is not a partial certificate. Source guard may be the original lexer failure. |
| Numeric and strict block pair, either order | Global block-pair veto. D4 cannot finish numeric input; neither rule wins. |
| Numeric and strict or sloppy duplicate formals, either order | D4 parameter continuation cannot finish numeric input; D5 cannot continue formals. No combined certificate. |
| Numeric and top-level return, either order | Both independent full-source audits block; retain original unsupported result. |
| Numeric and conflict, strict delete, catch restriction or sloppy single block function | Full collector veto; preserve original rejection and nodes. |
| Non-numeric invalid target, postfix update, unary number, pattern, call, incomplete RHS | Existing unsupported/grammar result; shared capability code alone is insufficient. |
| No numeric target | Exact D1–D4 behavior, including legacy return only at parse-only/test. |
| Numeric-base property reference or other valid reference | Existing ready/execution behavior. Runtime reference failures are not this rule. |
| Parent deadline, cap, crash or nonzero exit with forged child bytes | Existing parent transport priority. |

All combinations above are fixed by literal sources in the 102-row matrix,
including 56 full blocked audit objects, both mixed-rule orders, two depth
boundary rows, 100000/100001 UTF-16 units and both pinned S18 variants. Numeric
audit candidate mutation and original node identity tests from D5 remain intact.
No retry loop, combined continuation or rule precedence beyond this table is
authorized.

## Inherited consumers and exact migrations

[source-consumers.json](validation/ts-035d6-p/source-consumers.json) records matching
lines and hashes across every tracked `.ts`/`.mjs`, including ignored adapter
paths and historical proposals. The complete old-file inventory covers 898
tests, fixtures, host suites and validation scripts. Every whole original Git
blob, original checkout byte sequence and proposed result is retained; the
manifest verifies both Git SHA-1 and SHA-256 and preserves CRLF fixture bytes.

The previous three future migrations are **not exhaustive** against accepted D5.
There are exactly four current proposals:

1. C `tools/test262/script-observe-codec.test.mjs`: extend its exact accepted-base
   decoder source-closure expectation with the fourth rule literal. Preserve all
   C inspection predicates and forbidden-neighbor tests.
2. D2-P `verify-future-wire.mjs`: assignment-rule mutation becomes explicit
   deep-equal known-code acceptance at both decoders, alongside parameter-rule.
   Every other malformed/unknown assertion remains.
3. D4-P `wire.mjs`: assignment-rule mutation becomes explicit acceptance at both
   decoders only in `--future`. Its current historical lane remains unchanged.
4. D5 `validate.mjs`: compare the complete emitted driver's `ordinary` object
   with `{...row.current, preparation: row.futurePreparation}`. The accepted
   D5-P literal is reused, not regenerated from the future implementation. All
   six other outputs, complete audit result, status/signal checks, runtime input
   orders, node snapshots and driver identity/detachment assertions remain.

The first three full proposed results agree with the earlier D5-P proposal; the
fourth is newly required because D5 added a preparation snapshot consumer. The
new D5 TypeScript driver itself needs **no edit**: its before/after snapshots
compare within the same implementation, and its full stdout remains checked.

360 inherited D2/D3/D4 preparation rows were replayed against their accepted
expectations. None is numeric-eligible; their numeric witnesses are mixed-rule
veto cases. Their validators and full expected outputs remain identity. D1,
legacy v1, A's unsupported capability controls, C transport, D2/D4 fixtures and
the ordinary audit tests also retain assertions. D5-P `wire.mjs --future` already
supports four known codes and needs no edit. Run that future lane after emission;
its default lane records historical unsupported numeric behavior. D5-P
`freeze/check/proposals`, original-blocked-oracle, and old preservation scripts
are historical milestone producers/proofs, not current acceptance runners.
Do not rewrite them or rerun them destructively to make past claims describe D6.

[verify.mjs](validation/ts-035d6-p/verify.mjs) defaults to checking original live
files and all protected history. `--applied`, only after a separately assigned
implementation, requires the exact four whole-file results and 894 identities.
It is not a production/preservation substitute: D6 must supply a scoped current
preservation audit and fresh evidence, recursively restore historical outputs,
and retain all new failures separately. Original D5-P and D5 raw results remain
immutable even when a reviewed validator later selects the future expectation.

## Literal producer, transport and state obligations

[semantic-matrix.json](validation/ts-035d6-p/semantic-matrix.json) contains complete
current audit/ordinary/preparation/node snapshots and future preparations for all
102 sources. Its 366 full child contexts cover both actions/roles on rejected
sources and parse-only/test on ready sources. Actual current D5 producer results
are separate from expected future children. Both runtime files contain CRLF;
alpha also contains a non-BMP prefix, beta a strict nested fractional compound
target. Preserve exact UTF-16 offsets and locations; read both files through
argv/file I/O in both orders on each host, with no embedded-input substitution.

[wire-matrix.json](validation/ts-035d6-p/wire-matrix.json) freezes 256 full child,
binding, context, envelope and actual current-serializer ASCII byte literals:
two hosts × two files × two actions × two roles × four rules × diagnostic
absent/present × two modes. Host labels are **future obligations**, not native
measurements. Production always emits script-observation; conformance rows are
synthetic codec controls and never authorize conformance launch/admission.
Likewise return execute/harness rows remain synthetic-only. Optional diagnostics
are serializer/codec controls; the numeric producer emits no diagnostic string.

The current Node serializer accepts the supplied future shape, but both current
decoders reject the new code. Numeric malformed controls therefore use a clearly
marked existing block-code surrogate today. Future `wire.mjs --future` removes
the surrogate and requires all four codes at both independent decoders. The new
implementation host test must additionally feed **actual both-host producer and
serializer bytes** through both decoders and compare the full child/envelope
with the frozen literals. Serializer agreement alone is not producer proof.

The matrix preserves nested key deletion/addition, malformed/null/unknown rule,
lexical-statement exclusion, duplicate and escaped-equivalent keys, invalid
UTF-8, concatenation, output cap, v1 exclusion, wrong phase/body/inspection,
request/source/unit/Realm binding and invalid locations. Complete known-rule
swaps and wrong in-range locations may pass codecs: 512 full child oracle
mutations in [future-controls.json](validation/ts-035d6-p/future-controls.json)
must fail producer deep equality. Retain parse-negative classification, runtime
negative mismatch and harness-error classification, plus parent transport facts.

That control file also freezes eight profile/Realm source preparations, 24 full
prefix children, 12 no-effects/history cases and 36 metadata/source-mutation
preparations. Test both real Script Realms, fresh and seeded history, and empty,
one-element and repeated-path prefixes. Occurrence IDs are distinct even when
paths repeat; failed occurrence never joins completedUnits, later test never
runs. `observeScripts` requires exactly `u0,u1,...` and harness roles for every
nonfinal unit, with a test role for the final unit. For prefix length N, the
rejected occurrence is `uN`; a rejected harness is followed by final test
`u(N+1)`. Every operation/source/completedUnits ID uses that same request order.
Paths remain repeated metadata and never substitute for occurrence IDs.

Second review found that the original 24 prefix literals used h0/h1/bad/later
and could not reach preparation through this guard. Their complete generator,
fixtures and design are retained with hashes in `original-occurrence-contract/`.
The corrected literals contain full requests. `occurrence-probe.mjs` recursively
checks every request in future-controls (98) and semantic-matrix (366), invokes
the actual current D5 `observeScripts`, and compares the complete current child.
It also rejects 2088 wrong-ID/order/role/duplicate controls with the exact guard
error and reproduces all 24 original failures. Current replay executes only
harmless `0;`/`1;` prefixes and the valid ready reference source; every numeric
source is rejected before its body, and no later test runs. Preparation-only
unit IDs such as `same`, `profile` and `history` belong to other APIs and are not
producer occurrence IDs. No production guard or API was changed.

Prefix execution is allowed in the future driver; snapshots are taken
after the successful prefix and before preparing the rejected occurrence.

Rejected preparation must preserve global keys/descriptors and lexical binding
presence/value; steps/calls/depth and active=null must stay unchanged. Seed with
`let sentinel = 41; throw 3;`, retain its completion/value separately, and compare
lastAbrupt record/Realm identities and unitId/location values. `inspect()` returns
fresh snapshot/location objects and exposes no completion in lastAbrupt; do not
assert snapshot-object identity or invent a completion field. The initial draft
with that mistaken inherited wording is retained in `original-history-contract/`.
No production inspection API expansion is needed. No instantiation, body, guest
call or print may occur, including `42=touch()` where touch would mutate and
print. Caller source mutation, reused unit ID with different text, metadata
negative expectations and strict/raw/non-strict labels cannot authorize a rule.
Strict prefix changes actual source locations, so compare the corresponding
source-specific full literal. Ready reference controls must still return normal
without test body under parse-only and normal Number 7 under execute; preserve
retained assignment-name and scope/declaration identities from D5.

Seven limit domains remain fixed at their existing contract: source units,
parse depth, evaluator steps, calls, evaluation depth, parent wall time and output
bytes. Source/depth rows carry complete literal guard/count/limit diagnostics.
Steps 0/1/10000 and calls 0/1/64 cannot cause evaluation of rejected source;
evaluation depth 256 is unchanged. Parent deadline/output faults retain priority.
Boundary arrays do not grant permission to reconfigure fixed parser/evaluator
caps. No effect or history identity can be established by a JSON parity check
alone: assert object identity inside the future host driver.

## Proposed implementation boundary and acceptance

A later assignment may own only the five production files above, four exact
old-test migrations, new `test/script-assignment-target-dispatch.ts`, new
`fixtures/script-assignment-target-dispatch/{alpha,beta}.js` with CRLF attributes,
new `tools/test262/script-assignment-target-dispatch.test.mjs`, one additive native
gate, new `docs/validation/ts-035d6/`, inventory and its own task status. This is
a proposal, not a current assignment. The coordinator owns COORDINATION.

Require fresh Node/native 212 records, all 68 inherited gates plus the new gate,
static-only compilation **and independently parsed zero-dynamic coverage**, full
new source/wire/state controls, D5 408 source runs/102 full literals/56 blocked/
342 audit-oracle negatives, D4 772/96/48/384, D3 154/77/30/26, D2 360/64/14,
D1 124+24 and all 36 accepted D5 required stages. Preserve A/B/C, H1–H7, M/E4,
A21, C172/host21, runner20, host73, observations22, probes10 and typecheck.
Replay the 36 stages through a new D6 runner; D5 `required-suites.mjs` and older
orchestrators freeze their milestone gate count and are historical orchestrators,
not entrypoints to run unmodified after adding gate 69. Preserve their files;
the new runner must assert all 68 inherited gates plus the new gate explicitly.
Historical producer outputs must be recursively backed up, new replay outputs
archived separately, restored and byte-asserted even on failures. New evidence
must not silently substitute stale gate/guest results for current validation.

Retain and reduce any compiler, API, scope or evidence failure before requesting
a reviewed scope expansion. Do not weaken a full-result oracle or old assertion
to accommodate a failure. Commit a coherent candidate and stop for actual and
independent second review; no automatic publication, capability admission or
successor follows.
