# D8-P: lexical Statement rejection dispatch

Design candidate against accepted D7 `dbee9bd895a9d73fc4f588eaa1bceb863417117a`.
This is a separate dispatch review, not permission to implement, publish, admit
a capability or start a successor. The [evidence](validation/ts-035d8-p/README.md)
uses accepted D7 Node artifacts and offline bounded probes only. The inherited
212 records in each host, 70 static gates and all 60 blocked corpus variants
are preserved, not rerun. Native dispatch and fifth-code acceptance remain
unimplemented.

The semantic basis remains the accepted [D7 design](script-lexical-statement-rule.md),
its pinned Test262 S19 blob, ECMA-262 2025 Statement/StatementListItem distinction
and V8 14.6.202.34 context excerpt. The complete retained references are copied
into this checkpoint. No new syntax interpretation or engine experiment is
introduced. `let` is covered only where actual D7 completes the supported single
binding, optional initializer and required semicolon in one of its four slots.
`const`, lexical loop heads, patterns and multiple declarations remain outside
the audited subset. Metadata and false conditions grant no authority.

## Actual accepted implementation and alternatives

`auditBoundedScriptLexicalStatements(source: string): LexicalStatementAudit`
is now implemented in `src/parser.ts`. It creates an internal source unit and
calls `parseStructuralSource(unit,null,true,false,false,true)`. Its exclusive
private parser purpose is `bounded-lexical-statement-audit`. It retains no nodes
and shares the entire lexer/parser, EOF, source length and parse-depth checks.
The four `branch` callers supply `if-consequent`, `if-alternate`, `while-body`
and `for-body`. Other calls and parser purposes still reject as before.

`collectLexicalStatementAudit` in `src/script-declarations.ts` builds one
DeclarationCollector with no retention and audits every scope. Any blocked
collector result vetoes all lexical candidates. An eligible block-function
pair becomes an `other-conflict` veto; candidate order cannot bypass it.
Only then does it verify keyword token identity/span/location/text and the
single actual binding, detach locations and sort candidates by keyword start.
It returns `eligible`, `none`, or a complete `blocked` result containing reason,
Diagnostic and nullable Rejection. All 140 inherited full literals match actual
D7: 44 eligible, 85 blocked, 11 none. The frozen matrix is reused, not inferred
from a new neighbor parse. All 564 inherited D2–D6 sources have noneligible D7
audits; their complete ordinary and preparation snapshots remain unchanged.

Keep the non-emitting audit exactly unchanged. Adding the new tag directly to
the early branch failure cannot prove the binding, initializer, semicolon, EOF
or late vetoes. A combined parameter/numeric/lexical parser purpose would change
mixed-rule certification and is outside this slice. Running the lexical audit
on every preparation is unnecessary and would alter precedence. The selected
approach is a source-only, rejection-only wrapper after original preparation.

## Exact five-file production proposal

Paths are relative to `typescript/`. The [production manifest](validation/ts-035d8-p/production-manifest.json)
contains original and proposed full bytes and SHA-256; rendered files under
`production-proposal/` are editorial artifacts, never imported or compiled.

| File and callsite | Exact change |
|---|---|
| `src/parser.ts:parseBoundedScriptPreparation(unit,nodes)` | Rename the current D6 body privately to `parseBoundedScriptPreparationBeforeLexicalAudit`; wrap it with the same public signature and `DeclarationPlanResult` return type. |
| New wrapper | Save the original result. Retry only blocked / unsupported-syntax / `parse.declaration-statement`. Call the existing D7 audit once on `original.unit.text`. |
| New wrapper eligible arm | Use the first source-ordered keyword and the full blocked literal below. An impossible empty eligible array is an internal fault. Never return an executable plan or audit AST. |
| `src/script-observation.ts:Attempt.rejected` | Extend only the explicit block/parameter/numeric rule guard with the lexical code. Keep its existing result/source projection and independent legacy-return fallback. |
| `src/script-observation-types.ts:ScriptResult` | Append `lexical-declaration-statement` to the syntax-error arm's closed rule union. No schema fields or new public API. |
| `tools/test262/script-driver-result.mjs:resultShape` | Append the fifth literal to the closed rule list. |
| `tools/test262/script-result.mjs:resultShape` | Append the same literal to the independent envelope decoder's closed rule list. |

Exact eligible projection:

```ts
{ kind: "blocked", goal: "Script", unit: original.unit,
  rejection: { kind: "syntax-error", ruleCode: "lexical-declaration-statement" },
  diagnostic: { phase: "parse", name: "SyntaxError",
    message: "lexical declaration is not allowed in Statement position",
    loc: { line: first.keyword.loc.line, column: first.keyword.loc.column } } }
```

On `none` or `blocked`, return the original result object unchanged, including
the original first diagnostic, rejection and unit. Audit diagnostics do not
replace it. Retained source/body/scope/declaration/assignment-name nodes keep
their original references and values in every arm. The retry never receives
the retention object. Select the keyword, not binding, initializer, containing
statement, or earliest unrelated error. UTF-16 offsets and CRLF/non-BMP columns
come from the actual token. This is Rift's diagnostic policy, not normative
ECMAScript error ordering.

The D6/D4 private chain remains byte-for-byte inside the renamed body. The
ordinary parse, return audit, declaration planners and D1/D3/D5/D7 audits keep
their behavior. `ExecutableScript.prepare` still checks Realm profile before
preparation and creates records only for complete plans. `prepareBoundedScript`,
`Attempt.run`, Script execution/session, serializer and all evaluator operations
need no changes. `outcomes.ts` already contains the reserved rule; do not change
it, the registry, ledger, CLI, manifests, profiles or pins.

## Precedence and veto obligations

| Situation | Required result |
|---|---|
| Wrong Realm profile, including oversized/invalid source | Original profile rejection, before parsing. |
| Original rejection other than declaration-statement | Original result; no lexical retry. |
| Completed supported lexical Statement declaration, strict or sloppy | Rejection-only lexical projection for either action and role. |
| Late lexer/grammar/resource failure | Original rejection; source and depth guards keep full counts/limits. |
| Lexical plus numeric target, duplicate formal, top-level return, strict block pair, either order | Global veto/no combined continuation. Preserve original result and legacy-return behavior. |
| Conflict in another scope, catch restriction, strict delete, sloppy block function | Full collector veto, including scopes after the candidate. |
| Unsupported const, malformed let, missing initializer/semicolon, pattern/multi-binding, lexical for head | Unsupported or original grammar failure; shared capability/spelling is insufficient. |
| Valid block/switch/function-body let or other ready source | Existing complete plan and execution behavior. |
| Parent deadline/output cap/crash/nonzero exit | Existing transport priority over forged child bytes. |

No retry loop, first-candidate shortcut before full audit, mode option or metadata
override is authorized. S19 raw and exact strict-prefixed source are eligible
but never admitted by this design. Mixed-rule and late-veto literals, source
100000/100001 and parse-depth boundary cases retain complete expected results.

## Complete consumer refresh and six old-test proposals

[source-consumers.json](validation/ts-035d8-p/source-consumers.json) records matching
lines and whole-file hashes across tracked TS/MJS, including historical proposals.
[proposal-manifest.json](validation/ts-035d8-p/proposal-manifest.json) covers 952
complete old test/fixture/validation-script files: 946 identities and six exact
future migrations. Original Git blob SHA-1, Git bytes, checkout bytes, result
bytes and SHA-256 are retained. CRLF bytes are preserved. The prior five-codec
proposal was explicitly checked against the new D7 consumer rather than assumed
exhaustive.

1. C `tools/test262/script-observe-codec.test.mjs`: extend its exact decoder source
   closure by the fifth literal; all other inspection and neighbor assertions stay.
2. D2-P `verify-future-wire.mjs`: statement-rule substitution becomes full known-code
   acceptance in both decoders, alongside parameter and assignment substitutions.
3. D4-P `wire.mjs`: statement-rule substitution becomes full acceptance only in its
   future lane. Historical current lane stays unchanged.
4. D5-P `wire.mjs`: same future-only statement-rule acceptance, both decoders.
5. D6-P `wire.mjs`: same future-only statement-rule acceptance, both decoders.
6. **New D7** `validate.mjs`: for its 140 source rows compare complete `ordinary`
   with `{...row.current, preparation: row.futurePreparation}`. All 564 inherited
   rows still compare the original full expected result. Keep full audit, every
   other ordinary API, retained nodes, process status/signal, runtime orders and
   664 blocked-oracle mutations intact. Reuse the accepted frozen future literal;
   do not derive it from the future implementation.

D7's TypeScript driver compares preparation before/after audit within one
implementation and needs no migration. Its complete output remains verified.
D2–D6 validators need no further changes: all 564 sources are noneligible under
actual D7. The D5 validator already uses its numeric future literal. D6 source
and producer rows remain numeric and retain their existing oracle. Legacy v1's
explicit lexical-rule rejection stays; it is not a fifth-code v2 consumer.
Structured-outcome tests call the ordinary parse API and stay unchanged. Existing
A/C capability-list controls test wire shapes and do not authorize lexical
producer behavior. D7-P's future wire already anticipates the fifth rule.

Historical `freeze`, `probe`, `controls`, `check`, preservation proofs and
gate-count orchestrators describe their accepted milestone. Preserve their raw
outputs and full files; do not update them to pretend historical unsupported
results were emitted syntax errors. New implementation validation uses a new
runner and the six exact proposals. `verify.mjs` checks original live files now;
`--dispatch-applied` later requires all six exact whole-file results and every
identity, with no partial-hunk escape. Production proposals have a separate
whole-file checker; neither verifier replaces future behavioral/native tests.

## Literal source, wire, state and identity controls

The source matrix freezes all 140 full results, original retention and 527
complete current/future producer contexts. Two real input files contain CRLF;
alpha also contains non-BMP text. Read files through runtime argv/I/O in both
orders on both hosts. Current offline replay did both orders under Node only.
Future dispatch drivers must compare full preparation and actual producer
output with those literals, including S19, four contexts, strict/sloppy and
directive-derived modes, nested bodies, source offsets and excluded neighbors.

The 320 wire rows fix two hosts × two inputs × two actions × two roles × five
rules × optional diagnostic × two modes, with complete binding, context, child,
envelope and actual current-serializer ASCII bytes. Both host labels are future
obligations. Optional diagnostics, conformance mode and return execute/harness
rows are synthetic codec controls; they do not authorize producer launch modes
or admission. Production emits script-observation. Actual lexical producer
output has no diagnostic string.

Current decoders accept 256 existing-rule rows and reject 64 fifth-code rows.
The 95840 malformed checks use an explicit existing-code surrogate for lexical
rows now. `wire.mjs --future` removes it and requires fifth-code acceptance at
both independent decoders. That future lane must fail today. The future native
and Node drivers must send **actual producer output through the actual serializer**
and both decoders, comparing full expected child and envelope/ASCII bytes;
serialization of a supplied synthetic object alone is not producer evidence.

Retain missing/extra nested keys, null/unknown codes, wrong phase/body/inspection,
binding/source/unit/Realm/location errors, duplicate and escaped-equivalent keys,
invalid UTF-8, concatenation, cap and v1 controls. A valid known-code substitution
or wrong in-range location can pass the codec, so the 880 complete producer
oracle substitutions must fail full producer equality. Parse-negative match,
runtime-negative mismatch, harness error and transport priorities stay explicit.

State fixtures contain 24 prefix, 72 budget, 12 profile, 36 metadata, 36 history
and two ready controls. Each prefix request uses actual consecutive `u0,u1,...`
IDs, harness roles before final test, rejected occurrence `uN`, and final
`u(N+1)` only when the rejection is a harness. Repeated path metadata never
replaces occurrence identity. Every operation/source/completedUnits field uses
that order. 180 malformed ID/order/duplicate controls reject at the existing
guard. Successful prefix IDs alone enter completedUnits; rejected/later bodies
never run. Prefix execution is permitted and state is sampled after it.

Use both real Script Realms and legacy-profile vetoes. Seed with
`let sentinel = 41; throw 3;`; retain actual seed record/Realm/completion/value
references. With seed and zero successful prefix, lastAbrupt keeps seed history.
Unseeded or successful prefix clears it to **null**. Compare nullable before/after
history with exact identity of record and Realm and copied unit/location values.
Inspection snapshots/location objects are fresh; no snapshot identity or invented
completion field is allowed. Preserve global keys/descriptors, lexical presence
and sentinel binding/value, saved completion, steps/calls/depth and active=null.
No rejected instantiation, body, print, guest call or effect may occur. Caller
unit mutation, repeated unit IDs, strict/raw labels and negative metadata cannot
change source authority. Ready control is normal without a test body at parse-only
and normal Number 7 at execute. The seven resource domains remain source units,
parse depth, steps, calls, evaluation depth, wall time and output cap.

## Proposed implementation acceptance boundary

A later coordinator assignment may own exactly these five production files,
six exact migrations, new `test/script-lexical-statement-dispatch.ts`, new
`test/fixtures/script-lexical-statement-dispatch/{alpha,beta}.js` and local CRLF
attributes, new `tools/test262/script-lexical-statement-dispatch.test.mjs`, one
additive native gate, new `docs/validation/ts-035d8/`, inventory and task status.
No production grammar/audit/execution/serializer expansion follows implicitly.

Require fresh full Node/native 212 records, all 70 inherited gates plus one new
gate, static-only builds **and separately parsed zero-dynamic coverage**. Require
all source/producer/wire/state literals in both hosts and both runtime orders;
D7 2816 runs/140 literals/564 inherited/664 blocked controls/ordinary retention;
D6 1248/256 wire/77184 malformed/512 oracle; D5 408/342 oracle; D4/D3/D2/D1 and
all 46 accepted D7 stages, A/B/C, H1–H7, M/E4, A21, C172/host21, runner20,
host73, observations22, probes10 and typecheck. New orchestration must preserve
every required stage and validate the exact 70+1 gate names. Do not run old
milestone orchestrators unmodified against a new gate count.

Recursively back up all historical evidence, preserve every fresh output in the
new checkpoint, restore and byte-assert all original history even on failure.
Never substitute stale guest/gate records. All 60 corpus variants, C++ and pins
remain unchanged. Retain and reduce new substantive compiler/API/evidence
ambiguity and request coordinator review before a workaround or scope change.
Commit a coherent candidate and stop for actual and independent second review.
