# TS-035D5-P: numeric assignment targets

Design/evidence candidate, accepted base `267e4e8`, 2026-11-05. The first
implementation-ready slice is **D5, a non-emitting numeric-target audit** in
exactly `src/parser.ts` and `src/script-declarations.ts`. It grants no executable
plan, preparation rejection, new wire code or corpus admission. Separate actual
and independent second review must accept this design before implementation.
Emission is a subsequent assignment after D5 acceptance, with its own review.

The proposed bounded rule covers a lexer-supported decimal number, optionally
surrounded by grouping parentheses, as the target of `= += -= *= /= %=`. It
does not cover update operators, unary numbers, patterns, calls, booleans,
strings, general invalid expressions or new numeric grammar. The reserved code
is `assignment-target`; its broad name does not grant broader producer authority.
Mixed block/parameter errors veto this audit instead of creating another combined
rule dispatcher. Lexical-in-Statement remains entirely separate.

[Evidence](validation/ts-035d5-p/README.md) freezes 102 literal source rows,
128 future wire rows, two runtime files, complete old-file proposals and read-only
verification. Existing Node probes are explicitly distinguished from future
expectations. No production, old test, historical evidence, compiler, grammar,
execution, registry, ledger, profile, CLI or admission change is made here.

## Corpus and normative basis

The unchanged selection pins Test262
`91c70759363c46557b694792bf34a2551a7af5ba`. Its sole selected numeric-target
consumer is [S18, target-number.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/expressions/assignment/target-number.js),
Git blob `326043282e5f676c607dae1390fa036d347191e1`. The full original text,
including metadata, comments and `$DONOTEVALUATE`, is retained in
[references.json](validation/ts-035d5-p/references.json) and verified by Git blob
hash. Both raw and exactly `"use strict";\n`-prefixed variants are frozen. Neither
the harness nor `$DONOTEVALUATE` was executed. Metadata supplies no semantic
authority. S19 is the distinct Statement-position debt; S20/S21/S22 retain their
accepted return/parameter/block boundaries. All 33 files / 60 variants remain
blocked, including S18 after eventual emission: certification alone is not
harness preflight, profile coverage, registry evidence or admission.

Fixed **ECMA-262 2025 edition 16** governs the rule. Assignment early errors
require a simple target except for the separately checked destructuring form;
numeric literals are invalid targets, and grouping does not turn them into
references. This applies in strict and non-strict code. Property and identifier
targets remain distinct from the value their evaluation produces.
[§13.15.1](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-assignment-operators-static-semantics-early-errors),
[§8.6.4](https://tc39.es/ecma262/2025/multipage/syntax-directed-operations.html#sec-static-semantics-assignmenttargettype),
[§13.2.9](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-grouping-operator).
The existing reference/evaluation order is preserved; this design performs no
GetValue, PutValue, coercion or guest calls.
[§13.15.2](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-assignment-operators-runtime-semantics-evaluation).

Re-inspected V8 tag **14.6.202.34**, parser-base.h blob
`3810a8f9d1d73559ba073c1f4d6e0af2a63717c5`,
[3326–3368](https://github.com/v8/v8/blob/14.6.202.34/src/parsing/parser-base.h#L3326)
and [5542–5579](https://github.com/v8/v8/blob/14.6.202.34/src/parsing/parser-base.h#L5542).
It distinguishes references, patterns and invalid expressions; a legacy call-target
compatibility rewrite must not be generalized to numeric targets. Rift adopts
neither that rewrite nor V8 diagnostic ordering. Pinned source excerpts are
retained; no engine code was copied into production, built or executed. Source
retrieval was read-only; all uncertainty probes were offline against existing
Rift artifacts. Prior D1–D4 designs remain the basis for scope and mode vetoes.

## Actual interfaces and the missing proof

All paths below are relative to `typescript/`.

| Site | Current behavior and design consequence |
|---|---|
| `lexer.ts:lex(text,true)` | Whole-source lexing first, 100000 UTF-16 cap, exact token spans/locations. Digits with optional decimal point only; exponent, radix, separators, leading zeros and leading-dot forms are not newly supported. |
| `parser.ts:Parser.expression` | Six assignment operators share precedence 1/right association. RHS is parsed before invalid-LHS `fail`; `fail` preserves the first diagnostic. A first invalid target says nothing about later statements/bodies. |
| `Parser.primary` / `parenthesized` | Numeric token becomes literal Number; parentheses return the same Expr identity. Parentheses affect assignment-name eligibility but do not create a runtime node. Preserve that map and identity. |
| postfix branch | Bounded postfix `++` has its own target and line-terminator checks. The same capability string does not authorize update certification. |
| `parseStructuralSource` | One bounded parser, actual EOF start/end equal source.length, fresh bindings; nodes=null is already supported for audits. New private purpose must never run with retention or parameter continuation. |
| `script-declarations.ts:DeclarationCollector` | Walks all expressions, both assignment target/value and all nested function bodies. `audit()` globally checks restrictions and conflicts beyond the first ordinary conflict. It may return eligible block pairs; numeric audit must explicitly veto those. |
| `script-execution-internal.ts:ExecutableScript.prepare` | Realm profile checked first; only complete plans acquire executable state. Successful retained nodes have identity associations. This boundary must remain unchanged. |
| `Evaluator.reference/#reference` | Identifier/member only; other kinds cause host invariant failure. Hence a continued invalid-target AST is analysis-only and must never escape to an executable plan. |
| assignment/compound evaluation | Reference before RHS; compound also reads the old value before RHS. No runtime fallback, coercion, synthetic ReferenceError or altered anonymous-function naming is proposed. |
| `parseBoundedScriptPreparation` | D4 retries only duplicate formals with a null-node parameter continuation; it cannot finish numeric targets. Its ordinary/partial retained nodes must stay unchanged. |
| `script-observation.ts:Attempt.rejected` | Explicitly accepts only block/parameter; legacy return fallback is independently gated to parse-only/test. `assignment-target` would currently fault. |
| `script-observation-types.ts`, serializer, both v2 decoders | Three-code union/allowlists. Serializer already writes actual ruleCode. Reserved outcomes.ts strings do not enable C or transport. |

The source evidence captures all seven current parse/audit/preparation outputs
and serialized retained-node contents per fixture, plus parse-only/test C output.
Future driver assertions must additionally check object identity associations,
not merely their serialization. Source and current artifact hashes are retained
in audit.json; existing compiled artifacts were used without rebuilding.

## Alternatives and chosen first slice

| Alternative | Decision |
|---|---|
| Promote `parse.assignment-target` from the first diagnostic | Reject: shared by updates, calls, patterns and other targets; no EOF or global-veto proof. |
| Scan tokens, delete the failing statement, replace the target, or parse a suffix | Reject as certification: loses grammar context and source/node authority. Explicit valid-reference neighbors are useful probes only. |
| Continue every target, duplicate formal and top-level return in one audit | Defer: expands three independent continuation boundaries and requires a new combined precedence policy. |
| Modify ordinary bounded parsing to return continued ASTs | Reject: risks runtime invariant failure and changes old diagnostics/plans. |
| New private numeric-only purpose in the existing full-source parser | Choose: same grammar/depth/lexer/collector; defer only the narrow numeric assignment failure, return detached evidence, no executable state. |

Freeze these types in `script-declarations.ts`, re-export from `parser.ts`:

```ts
type NumericAssignmentSite = {
  readonly text: string; readonly start: number; readonly end: number;
  readonly loc: Location;
};
type NumericAssignmentCandidate = {
  readonly ruleCode: "assignment-target";
  readonly target: NumericAssignmentSite;
  readonly operator: {
    readonly text: "=" | "+=" | "-=" | "*=" | "/=" | "%=";
    readonly start: number; readonly end: number; readonly loc: Location;
  };
};
type NumericAssignmentAudit =
  | { readonly kind: "eligible"; readonly sourceUnits: number;
      readonly consumedUnits: number;
      readonly candidates: readonly NumericAssignmentCandidate[] }
  | { readonly kind: "none"; readonly sourceUnits: number;
      readonly consumedUnits: number }
  | { readonly kind: "blocked";
      readonly reason: "grammar-or-resource" | "scope-restriction" | "other-conflict";
      readonly diagnostic: Diagnostic; readonly rejection: Rejection | null };
```

Exact source-only API:
`auditBoundedScriptNumericAssignments(source: string): NumericAssignmentAudit`.
No unit, Realm, strict flag, metadata, caller AST or candidate input. `none` means
no candidate in the bounded audited grammar, never general ECMAScript validity.
`blocked` carries no partial candidates or consumed-unit certificate; rejection
is null only for other-conflict and is never syntax-error. Copy all returned
arrays, nested sites and locations so mutation cannot influence another call.

Exact implementation algorithm:

1. Add private purpose `bounded-numeric-assignment-audit` to Parser. Include it
   in structuralPlan/boundedPlan; do **not** include it in duplicate-formal
   continuation. Add `numericAudit=false` after the existing parameterAudit
   argument of parseStructuralSource. Reject numericAudit unless bounded=true,
   nodes=null and parameterAudit=false. All existing call arguments/defaults
   retain their behavior. New API uses this common helper, no copied parser.
2. In this purpose only, retain `Map<Expr,Token>` for numeric literals at the
   actual number-token primary creation. A parenthesized literal retains the
   same identity; unary/binary/call/member/update/new/assignment results do not.
   No substring or `typeof value === number` inference. Numeric overflow still
   has token authority; unary minus is a different expression and stays blocked.
3. Retain the actual assignment operator Token before parsing RHS. After RHS
   parsing, defer the existing invalid-assignment-target fail only when there is
   no parser error, purpose is numeric audit, the left Expr is the mapped numeric
   literal, and op is one of the six frozen operators. Append a detached
   candidate. Otherwise preserve the exact current fail call. Preserve AST
   construction/association logic; these private ASTs remain analysis-only.
   Never relax postfix, declarations, delimiters, formals, return, depth or lex.
4. Continue the same statement/body/enclosing program. Require actual EOF token
   start AND end equal source.length, including trailing trivia, before returning
   parsed evidence. Carry numericCandidates in the private StructuralSource
   parsed arm (empty for ordinary purposes); never in DeclarationNodes or plans.
5. Call new internal bridge
   `collectNumericAssignmentAudit(unit,body,tokens,bindings,candidates)` with
   types `ScriptSourceUnit, Stmt[], Token[], Map<number,ParsedBinding[]>, readonly NumericAssignmentCandidate[]`.
   It constructs one existing DeclarationCollector with nodes=null,bounded=true,
   collects once, calls unchanged `audit()`. If blocked, forward its detached
   veto. If block-eligible, return other-conflict/null at first block pair's
   second.loc, message `duplicate-lexical: NAME` (same helper policy as D3).
   Thus even otherwise certifiable strict block pairs veto the numeric audit.
   Duplicate parameters, including sloppy ones, have already blocked parsing
   everywhere; there is no parameter continuation in this purpose.
6. Only after all vetoes pass, sort by operator.start then target.start, verify
   spans against source tokens, and return eligible or none with full lengths.
   `1=2=3` collects the inner candidate first but sorts the outer operator first.
   Diagnostic selection for eventual emission is the numeric token location,
   excluding grouping parentheses. This is Rift policy, not normative ordering.

The collector bridge is an internal parser handoff, not a facade authority.
Its inputs never reach preparation. The two production files suffice: no lexer,
syntax, evaluator, outcomes, prologue, preparation, observer or codec change is
needed. Full ordinary outputs and partial/successful node associations are exact.

## Dispatch freeze for the separate emission slice

This proposal deliberately avoids combining numeric, block and parameter
certification. The existing three-code behavior remains authoritative unless
the original D4 preparation returns blocked/unsupported-syntax with exactly
`parse.assignment-target`. That condition permits an audit; it is not proof.

Future exact production closure is **five files**: `src/parser.ts`,
`src/script-observation.ts`, `src/script-observation-types.ts`,
`tools/test262/script-driver-result.mjs`, `tools/test262/script-result.mjs`.
No new collector change is needed after the accepted D5 API. In parser, preserve
the current D4 preparation body as a private helper and wrap it: save its result;
return it unchanged unless the condition above holds; audit `original.unit.text`
fresh with no nodes; return original on blocked/none; on eligible construct only
`{kind:"blocked",goal:"Script",unit:original.unit,rejection:{kind:"syntax-error",ruleCode:"assignment-target"},diagnostic:{phase:"parse",name:"SyntaxError",message:"invalid numeric assignment target",loc:copy(first.target.loc)}}`.
No complete arm, altered nodes or returned continuation AST. Public ordinary
planners and standalone D1/D3/D5 audits remain unchanged. Original nodes are never
replaced, even after successful numeric certification.

| Situation | Frozen outcome |
|---|---|
| Wrong Realm profile, even huge/invalid source | Existing profile rejection before parsing. |
| Initial lex/source guard or non-assignment-target rejection | Exact original D4 result; no numeric retry. |
| Numeric candidate then late grammar/resource/unsupported target | Audit blocked; retain original first diagnostic, not late audit diagnostic. |
| Numeric and block pair, either source order | Block pair veto in numeric audit; existing D4 cannot parse numeric target. No new certification. |
| Numeric and strict/sloppy duplicate formals, either order | Numeric audit does not continue formals; D4 parameter continuation does not continue numeric targets. Both remain unsupported. |
| Numeric and top-level return, either order | Numeric audit blocks return; independent legacy full-source return audit blocks numeric. No certification from absent candidates. |
| Numeric and strict delete, any catch restriction or any conflict | Global collector veto after full EOF; retain original preparation. |
| Numeric and sloppy single block function | Unsupported scope veto; ordinary return-only/sloppy-single-block behavior remains unchanged. |
| Valid references, including numeric-base property references | D5 none; ordinary preparation/execution unchanged. Runtime failure of a reference is not this syntax rule. |
| Numeric-only valid bounded surroundings in either mode | Source-derived numeric rule; no strict-prefix requirement. |
| No numeric source | D1–D4/legacy behavior exactly unchanged. |
| Parent timeout/output/crash | Existing transport priority independent of child syntax bytes. |

C explicitly adds assignment-target beside block/parameter; the complete legacy
return fallback remains byte-equivalent and parse-only/test only. Add exactly
one literal to ScriptResult and both independent ordered allowlists:
return, block, parameter, assignment. Serializer already emits actual code and
needs no change, but must be tested with real bytes. v1/outcomes/registry/ledger/
CLI/manifest/profile/compiler pins remain unchanged. This is a rejection feature,
not execution grammar support. A future desire to certify mixed numeric/block/
parameter sources requires a separate audit/precedence design.

## Frozen tests, old files and implementation assignment

[semantic-matrix.json](validation/ts-035d5-p/semantic-matrix.json) contains exact
sources/hashes and explicit expected eligible candidates/spans or complete blocked
objects. All 56 blocked expectations include Diagnostic phase/name/message/loc
and full rejection, including resource guard/count/limit; future drivers must
deep-equal the entire audit result against these literals, never selected fields.
It covers six operators, decimals, parentheses, right association,
RHS/nested/dead bodies, valid references, non-reference neighbors, full S18,
strict/sloppy/conflict/return orders, unsupported tails, 100000/100001 source
units and depth boundary. 56 explicit same-width valid-reference neighbors
exercise current late veto behavior; they do not certify the original source.
All 193 accepted D4 preparation snapshots are replayed unchanged. The
[full blocked literals](validation/ts-035d5-p/blocked-expectations.json) cite each
exact same-width neighbor and freeze authored block-pair veto diagnostics.
342 negative oracle controls reject changed locations/messages/phase/name/
rejections and resource counts/limits/guards. The original coarse candidate's
six source/evidence files are retained with hashes under original-blocked-oracle;
review identified and corrected that oracle gap before implementation. Exact
ordinary diagnostics remain independently frozen. Evidence-generation and
staging failures are retained; none changed production or old test bytes.

Both hosts must read both runtime files through argv/file I/O in both orders.
R0 contains non-BMP text and CRLF before a grouped number; R1 has strict source,
CRLF and a nested fractional compound target. Assert exact UTF-16 token and
operator offsets, separate parsed source identities, detached candidate mutation,
no call-order contamination, all seven ordinary results, and retained assignment
name/node identities. Add a new driver `test/script-assignment-target-audit.ts`,
fixtures `test/fixtures/script-assignment-target-audit/{a,b}.js` with local CRLF
attributes, and one additive gate in `tools/build-native.mjs`. Required production
ownership is only parser/declarations; inventory/TASKS/new validation are allowed
in the separately assigned implementation. No old test changes in D5.

[873 complete old-file proposals](validation/ts-035d5-p/old-test-proposals.json)
include exact original Git bytes, checkout bytes, result bytes and Git/SHA-256
hashes in [manifest](validation/ts-035d5-p/proposal-manifest.json). **All D5 results
are identity.** [verify.mjs](validation/ts-035d5-p/verify.mjs) checks whole files,
not patches or counts. `--audit-implemented` checks the exact old-test closure
after D5 without mistaking expected new production hashes for preserved ones;
the implementation must supply its own scoped preservation check.

Separate complete emission proposals are rendered under `proposed-emission/`:
only C's literal source-closure assertion, D2-P's assignment-rule mutation and
D4-P's future assignment-rule mutation change. Mutations become explicit known-
code acceptance at both decoders, never skipped; all unknown/malformed assertions
remain. `--emission-applied` verifies those exact three full-file results and
870 identities after separate approval. D2/D3/D4 semantic validators need no
migration under this conservative mixed-rule veto: their numeric witnesses are
already vetoed mixed cases. Historical raw JSON, proposals and preservation
scripts stay immutable. Old milestone preservation hashes are milestone proofs,
not current acceptance checks; archive new replay outputs separately and restore
every historical byte recursively. Refresh the emission closure against accepted
D5 before assigning emission; these proposals do not authorize their application.

[128 wire rows](validation/ts-035d5-p/wire-matrix.json) and
[future-controls.json](validation/ts-035d5-p/future-controls.json) freeze both-host,
two-input, two-action, two-role, optional-diagnostic and source/Realm controls.
Current Node serializer accepts supplied shapes; current decoders accept 96 old
code controls and reject 32 numeric controls. Numeric malformed controls use a
block-code surrogate expressly to exercise current schema checks, not a modified
decoder. Future emission must replace that with actual producer/serializer bytes
on both hosts through both decoders (`wire.mjs --future`); return execute/harness
rows remain synthetic-only as before. Audit D5 itself emits nothing.

Required controls include every nested required-key deletion/extra field,
unknown/null/empty/lexical-statement rule, duplicate and escaped-equivalent keys,
malformed UTF-8, concatenation, output cap, v1 exclusion, wrong phase/name/body/
inspection, source/request/unit/Realm binding and out-of-range locations. Known
rule swaps and wrong in-range locations can pass a codec: producer literals must
detect them. Preserve expected-negative classification and harness-error mapping.

Future rejected preparations run in both Script Realms, both actions/roles,
empty/seeded/repeated-path occurrence prefixes, preserving successful prefix
exactly and excluding failed occurrence. Assert global properties/descriptors,
bindings, steps/calls/depth/active and seeded lastAbrupt identity unchanged;
zero instantiation/body/call/print effects, including RHS guest calls. Metadata,
strict prefixes, same ID with different text and caller source mutation cannot
authorize a different result. Ready reference controls distinguish parse-only
from execute completion 7. Seven limit domains retain their existing caps;
literal boundary arrays in future-controls are mutation/control values, not
permission to reconfigure fixed engine caps. Parent transport priority remains.

D5 acceptance requires inherited 212 records per host / all 67 old gates plus
one new static-only build AND independently parsed zero-dynamic coverage; full
both-host guest validation, new source matrix, D1 124+24, D2 360/64/14, D3
154/77/30/26, D4 772/96/48/384 and all 32 currently required inherited stages,
including A/B/C, H1–H7, M/E4, A21, C172/21, typecheck, runner20, host73,
observations22 and probes10. Preserve all60 blocked/C++ and old records. No full
build ran in this design task. New compiler/ownership/contract failures must be
retained, reduced and reviewed before workaround or scope expansion. Commit the
bounded tested implementation and stop for actual/second review; no publication
or successor follows automatically.
