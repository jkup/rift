# TS-035D7-P: lexical declarations in Statement positions

Design/evidence candidate at accepted base `041982113d292a9035ea644bdb3eae104963942f`,
2026-11-05. Recommend **D7: a non-emitting, source-only audit of supported `let`
declarations in four exact Statement slots**, using the existing full bounded
parser and one declaration collector. Production ownership is exactly
`src/parser.ts` and `src/script-declarations.ts`. No preparation, executable
plan, observer, wire code or admission changes belong to D7. Dispatch requires
a later, separately assigned refresh and review after D7 acceptance.

The reserved rule is `lexical-declaration-statement`. “Lexical-in-Statement” is
descriptive prose, not a second code. Support only a single supported binding
identifier with optional supported initializer and an explicit semicolon,
introduced by `let`, immediately in an if consequent, if alternate, while body,
or existing classic-for body. The spelling `let` alone is not evidence.

[Evidence](validation/ts-035d7-p/README.md) distinguishes actual accepted-D6 Node
observations from editorial future literals. It freezes 140 source rows, 564
inherited full ordinary/preparation/node snapshots, two CRLF runtime files,
927 complete old-file proposals, and 320 wire fixtures. No production or real
old test has been edited. The inherited 212 records and 69 static gates are
preserved, not rerun; all 60 corpus variants remain blocked.

## Source and specification basis

The unchanged Test262 pin is `91c70759363c46557b694792bf34a2551a7af5ba`.
[S19, while/decl-let.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/statements/while/decl-let.js)
has Git blob `d3def7e4460140e731a6bd9bbded8ecc4e1df4ad`. Its exact text is in
[references.json](validation/ts-035d7-p/references.json), including frontmatter,
comments, `$DONOTEVALUATE();` and `while (false) let x;`. Verify the Git blob before
adding exactly `"use strict";\n` for the second frozen variant. Neither variant's
body nor its harness executes. Metadata and the condition's false value grant
no parsing authority.

Fixed ECMA-262 **2025 edition 16** governs the distinction. A declaration is an
alternative in a statement list; control-flow bodies use Statement. Lexical
declarations include let and const, but the implementation slice covers only
the existing let form. Binding patterns, multiple bindings and missing constant
initializers require their own grammar checks. This is a grammar rejection,
not a claim that a generic binding conflict proves the rule.
[§14, §14.2, §14.3.1](https://tc39.es/ecma262/2025/multipage/ecmascript-language-statements-and-declarations.html#sec-declarations-and-the-variable-statement),
[§14.6](https://tc39.es/ecma262/2025/multipage/ecmascript-language-statements-and-declarations.html#sec-if-statement),
[§14.7.3–4](https://tc39.es/ecma262/2025/multipage/ecmascript-language-statements-and-declarations.html#sec-while-statement).

Sloppy `let=1;` may be an expression, and Annex B has specific function-in-if
extensions. Neither licenses a lexical declaration in these slots. Keep such
neighbors unsupported rather than misclassifying them.
[§14.5](https://tc39.es/ecma262/2025/multipage/ecmascript-language-statements-and-declarations.html#sec-expression-statement),
[B.3.3](https://tc39.es/ecma262/2025/multipage/additional-ecmascript-features-for-web-browsers.html#sec-functiondeclarations-in-ifstatement-statement-clauses).
Source-derived strictness and scope vetoes retain the accepted D1–D6 contracts:
[§11.2](https://tc39.es/ecma262/2025/multipage/ecmascript-language-source-code.html#sec-directive-prologues-and-the-use-strict-directive),
[§16.1](https://tc39.es/ecma262/2025/multipage/ecmascript-language-scripts-and-modules.html#sec-scripts).

Re-inspected V8 tag **14.6.202.34**, parser-base.h Git blob
`3810a8f9d1d73559ba073c1f4d6e0af2a63717c5`,
[lines 5736–5895](https://github.com/v8/v8/blob/14.6.202.34/src/parsing/parser-base.h#L5736).
The retained excerpt separates ParseStatementListItem from ParseStatement,
uses IsNextLetKeyword rather than a spelling-only declaration assertion, and
handles Annex B function exceptions separately. Adopt the explicit context
distinction, not V8 code or diagnostic ordering. No engine was built or run.
Earlier accepted source records establish the pinned blob; the new excerpt is
not falsely presented as a whole-file blob hash check.

## Actual parser, scope and execution interfaces

All implementation paths below are relative to `typescript/`.

| Current site | Boundary to preserve |
|---|---|
| `lexer.ts:lex(text,true)` | Whole source is lexed before parsing; 100000 UTF-16 source-unit cap, exact raw token spans/locations, unsupported token tails veto. |
| `Parser.list` and `program` | Script, function body and block contain statement-list items. These are not candidate slots. |
| `Parser.statementInner` switch clauses | Each case/default body is a statement list. Direct `let` here is not a candidate. Duplicate names remain collector concerns. |
| `Parser.branch` | Only if consequent/alternate and while/classic-for body call it. It currently rejects either `let` or `function` before proving the declaration, then calls statement. The first diagnostic persists. |
| `statementInner` let/binding | Single identifier, optional expression, explicit semicolon. No const branch, patterns, multi-let list or ASI. Successful structural parsing records the actual binding at keyword start. |
| `statementInner` classic for | Initializer accepts var, expression or empty. Lexical loop heads and for-in/of are unsupported. Do not route heads through the proposed body audit. |
| try/catch | Its direct statement calls must produce blocks; it does not grant a candidate slot. Missing blocks remain unsupported. |
| `parseStructuralSource` | Same bounded parser, actual EOF start=end=text.length; retention is nullable. Parameter and numeric purposes are private and mutually exclusive with the new purpose. |
| `DeclarationCollector` | Walks all nested bodies/expressions, source prologues, catch/block/switch scopes and conflicts. Its audit is a global veto, not merely the first ordinary result. |
| `ExecutableScript.prepare` / `prepareBoundedScript` | Realm profile checked first; only complete ordinary plans create executable records. Audit ASTs must never cross this boundary. |
| `Attempt.rejected` and v2 codecs | C explicitly accepts three new bounded rules plus separate legacy return fallback. Both independent decoders close over four codes. A new tag alone would fault/reject. |

`parse`, `auditScriptReturns`, both ordinary planners, D1/D3/D5 audits,
`parseBoundedScriptPreparation`, Script facade, evaluator and retained-node
associations remain unchanged in D7. Adding a purpose must not relax any
ordinary caller, return counter, parameter duplicate, numeric target, name,
semicolon, function-name association, lexer or resource check.

## Frozen first slice: exact API and callsites

Define in `script-declarations.ts`, re-export types and the source-only function
through `parser.ts` following the existing audit convention:

```ts
type LexicalStatementContext =
  | "if-consequent" | "if-alternate" | "while-body" | "for-body";
type LexicalStatementCandidate = {
  readonly ruleCode: "lexical-declaration-statement";
  readonly context: LexicalStatementContext;
  readonly keyword: {
    readonly text: "let";
    readonly start: number; readonly end: number; readonly loc: Location;
  };
};
type LexicalStatementAudit =
  | { readonly kind: "eligible"; readonly sourceUnits: number;
      readonly consumedUnits: number;
      readonly candidates: readonly LexicalStatementCandidate[] }
  | { readonly kind: "none"; readonly sourceUnits: number;
      readonly consumedUnits: number }
  | { readonly kind: "blocked";
      readonly reason: "grammar-or-resource" | "scope-restriction" | "other-conflict";
      readonly diagnostic: Diagnostic; readonly rejection: Rejection | null };
function auditBoundedScriptLexicalStatements(source: string): LexicalStatementAudit;
```

The internal collector bridge is `collectLexicalStatementAudit(unit, body,
tokens, bindings, candidates): LexicalStatementAudit`, with the same parameter
types as `collectNumericAssignmentAudit` except its candidate type. This is an
internal same-parse handoff; no adapter or executable API accepts candidates,
ASTs, metadata, caller mode, Realm or a caller-supplied context.

1. Add private purpose `"bounded-lexical-statement-audit"` to Parser and both
   structuralPlan/boundedPlan predicates. Add final defaulted `lexicalAudit=false`
   to parseStructuralSource. Assert it requires bounded=true, nodes=null,
   parameterAudit=false and numericAudit=false. Existing calls retain defaults.
   The new source-only entry point passes `(unit,null,true,false,false,true)`.
2. Change branch to `branch(context: LexicalStatementContext)`. Its four callsites
   pass the exact literal above: consequent and alternate separately, while and
   classic for separately. No global “currently in branch” flag, caller option,
   token heuristic or collector location guess supplies context. Nested branches
   supply their own innermost slot. Statements inside a braced body use list and
   never inherit the outer candidate slot.
3. Save the branch's first token. Only in the new purpose, and only when it is
   the actual word `let`, omit the existing declaration-statement failure.
   `function` still fails, and every other purpose keeps the original check.
   Call the same statement() once. Append a candidate only after error===null,
   result.kind===let, and the existing single binding/initializer/semicolon parse
   has finished. A bare spelling followed by `=`, `(`, `.`, a pattern, reserved
   name, missing initializer or missing delimiter cannot create evidence.
4. Carry private lexicalCandidates through StructuralSource just like numeric
   candidates. A later error returns blocked with full original diagnostic and
   rejection; no candidates or completeness fields escape a failed audit.
   Require actual EOF start=end=text.length, including trailing trivia.
5. Construct exactly one `DeclarationCollector(unit,tokens,bindings,null,true)`;
   collect once and call its unchanged audit(). Return any blocked veto intact.
   Convert an eligible block pair into other-conflict/rejection=null using the
   first sorted pair's second site and message `duplicate-lexical: NAME`, exactly
   as D5 does. Never combine block and lexical certificates.
6. Retain the invalid let's existing containing-scope collection for this
   analysis-only superset. No synthetic block or runtime scope is created.
   Thus its name can conservatively cause a lexical-var/formal/lexical conflict,
   and conflicts between branch candidates veto too. This is a bounded refusal
   policy, not an assertion that invalid syntax has a normative binding scope.
7. Validate keyword token kind/text/span/location against the original token
   stream and source slice, and require its existing binding-map entry. Token
   validation checks provenance; it does not establish the Statement context,
   which comes only from the same parser's branch callsite. Copy every candidate
   and nested location, sort by keyword.start, and return none or eligible with
   exact source/consumed lengths. Mutating returned evidence must not affect
   another audit or any ordinary parse.

No new syntax-error Rejection is emitted by this API. None means “no selected
candidate in this bounded grammar after vetoes,” not full ECMAScript validity.
The full continuation AST is private and disposable; it cannot become a plan.

## Modes, exclusions and global veto ordering

The selected grammar violation applies in strict and sloppy code. Strictness
still comes from Script/function source prologues and inherited scopes, not a
test variant label. A function's own directive affects its body and formals.
Ordinary block strings, parenthesized strings, late strings, preceding empty
statements and escaped directive spellings do not create ownStrict. Do not add
ASI or directive grammar. Source strictness remains necessary for delete and
sloppy-block vetoes even though candidate eligibility itself is mode-independent.

Whole-source lexical/source guard precedes parser grammar/depth; parser fatal
failure precedes collection; collector global restrictions and every conflict
precede candidate selection. Preserve the existing collector's full diagnostic
policy. A late unsupported class, const, template, malformed initializer/body,
depth/resource guard, catch restriction, strict identifier delete or unrelated
conflict vetoes all earlier candidates. Sloppy identifier delete alone does not.
Any sloppy block function vetoes; strict block function pairs veto too.
Duplicate formals of either mode and numeric invalid targets are *not continued*
in this purpose, so they veto in either source order. Top-level return is not
continued. No composed retry or cross-rule recovery is authorized.

Valid Script/block/switch/function-body lexical contexts remain ordinary plans.
Classic loop bodies enclosed in blocks remain ordinary. Lexical loop headers
are valid language constructs in their appropriate forms but remain unsupported
here; they must not become the Statement-position rule. Also exclude const in
every context, multiple bindings, patterns, arrows, methods, classes, do-while,
labels, for-in/of/await, ASI and unsupported numeric/expression grammar. Function
in an if branch is an explicit Annex B neighbor, not this rule. Sloppy expression
uses of `let` remain unsupported. None of these exclusions expands execution.

## Rejection-only alternative and exact later closure

A local relabel of parse.declaration-statement is rejected: that code also
represents malformed let, functions, and collector restrictions. A detached
token scan or parsing just the offending declaration is rejected because it
cannot establish later bodies, scopes, source strictness or resource coverage.
Directly adding rejection dispatch now would combine a new continuation with
new observable behavior before its non-emitting evidence can be reviewed.
The first bounded implementable slice is therefore the two-file audit above.

After D7 acceptance, a separately reviewed dispatch could own exactly:

| File | Later edit |
|---|---|
| `src/parser.ts` | Wrap existing parseBoundedScriptPreparation, moving its current D6 body unchanged into parseBoundedScriptPreparationBeforeLexicalAudit. Retry only blocked unsupported-syntax/parse.declaration-statement using original.unit.text and the source-only audit. |
| `src/script-observation.ts` | Extend only C's explicit bounded syntax-error rule guard with lexical-declaration-statement; project actual rule. Preserve legacy return fallback byte-for-byte. |
| `src/script-observation-types.ts` | Append the fifth literal to ChildV2 syntax-error rule union. |
| `tools/test262/script-driver-result.mjs` | Append the fifth closed allowlist literal. |
| `tools/test262/script-result.mjs` | Identical literal addition in the independent envelope decoder. |

No serializer change: current scriptObservationJSONRecord already emits the
actual rule. No outcomes change: the exact code is already reserved. On eligible,
the exact later projection is:

```ts
{ kind: "blocked", goal: "Script", unit: original.unit,
  rejection: { kind: "syntax-error", ruleCode: "lexical-declaration-statement" },
  diagnostic: { phase: "parse", name: "SyntaxError",
    message: "lexical declaration is not allowed in Statement position",
    loc: { line: first.keyword.loc.line, column: first.keyword.loc.column } } }
```

Choose first after source-order sorting, never collector traversal order. On
none/blocked preserve the entire original result and original retained nodes,
including partial source/body/scope/declaration/name maps. Never substitute a
late audit diagnostic for the original failure. Realm-profile rejection stays
before parse. D1–D6, ordinary APIs and legacy return retain all behavior; mixed
rules retain the original unsupported/conflict projection. Apply the later
rejection at either action and either role, before any body or instantiation.
Transport deadline/cap/crash/nonzero-exit facts continue to override child bytes.

The [whole-file proposals](validation/ts-035d7-p/proposal-manifest.json) cover all
927 tracked old tests/fixtures/host suites/validation scripts at this base.
D7 has **zero** migrations. Five separately frozen later codec migrations are
C's exact source closure, D2-P statement-rule known-code acceptance, and D4-P,
D5-P and D6-P statement-rule acceptance only in their future lanes. Every other
malformed assertion remains. Whole Git and checkout bytes, SHA-1/SHA-256 and full
result bytes are included; CRLF inputs are byte-preserved. No historical raw
matrix/output is rewritten. Known-rule swaps must still fail producer equality.

All 564 current D2–D6 snapshots include D5/D6 preparation and node consumers.
Their current lexical witnesses are mixed block/parameter/numeric vetoes, not
eligible standalone lexical cases; preparation needs no migration in that
inventory. D5 and D6 validators stay identity. This is current-base closure,
not a claim that five migrations will be exhaustive after D7 adds new snapshots.
The future dispatch refresh must enumerate D7's new preparation consumers and
freeze any further whole-file migrations before implementation. Milestone freeze,
preservation and historical default wire scripts are not current orchestrators.

## Literal evidence, state and acceptance obligations

The [semantic matrix](validation/ts-035d7-p/semantic-matrix.json) contains complete
current eight-entry-point results, retained nodes, full future audit objects,
and future preparation/child/ASCII literals. Its 44 eligible, 85 blocked and 11
none rows cover four contexts, nested bodies, two-site ordering, strict/sloppy,
directives, late vetoes in both orders, 100000/100001 UTF-16 units and four depth
neighbors. Equal-width editorial list neighbors expose existing diagnostics
without running a continuation implementation; they are evidence for expectations,
not certification algorithms. Depth/resource neighbors retain the control body
and substitute var at equal width. Future production must compare the frozen
literals, never regenerate its expected results from its own audit.

Current probe compares all complete results and 664 altered full blocked-oracle
fields, including message/location/reason and resource guard/count/limit. Future
both-host tests must assert the same literals plus ordinary/retained node identity,
detached candidate mutation, fresh audit identity, and no escaped AST. Runtime
inputs alpha/beta use CRLF; alpha has a non-BMP prefix. Read both by argv/file I/O
in both orders on each host; do not embed substitutes. Offsets count UTF-16 units.

The 320 [wire rows](validation/ts-035d7-p/wire-matrix.json) cover two hosts, two
inputs, two actions, two roles, five rules, optional diagnostic and two modes.
Host labels are future obligations, not native measurements. The current Node
serializer accepts synthetic shapes; current decoders accept 256 old-rule rows
and reject all 64 lexical rows. Their 95840 malformed controls use a block-code
surrogate only for the unimplemented lexical code. The future lane uses the
actual fifth code. Require actual both-host producer/serializer bytes through
both independent decoders after dispatch; synthetic codec agreement alone is
not producer proof. Conformance and legacy-return execute/harness rows remain
synthetic controls, not admission or launch authority.

The control file freezes 24 sequential-uN prefix requests, 72 budget requests,
12 profile/Realm preparations, 36 metadata cases, 36 seeded/unseeded history
cases and two ready child controls. Actual occurrence guards reject 180 wrong-ID
requests. Each nonfinal unit is harness; final unit is test; failure is uN after
N completed prefixes, never added to completedUnits. Repeated paths do not
replace distinct occurrence IDs. A later throwing test never runs after failure.
880 full child mutations reject known-rule swaps and wrong locations even when
the codecs could structurally accept them.

Use two actual Script Realms. Seed `let sentinel = 41; throw 3;`, retain the
evaluation completion/value separately, execute zero/one/two harmless prefixes,
then snapshot immediately before rejection. With a seed and zero prefixes,
lastAbrupt retains seed record/Realm identity and history:1:20. Any successful
prefix clears lastAbrupt; unseeded history is also null. Preserve this exact
nullable before/after contract without reseeding. inspect() allocates detached
snapshots/locations and has no completion field. Assert identity inside the host
driver for record, Realm, saved completion/value, sentinel value and descriptor
payloads; JSON alone cannot prove identity. No guest calls, print, new bindings,
instantiation, body entry, changed budgets or active frame may result from rejected
preparation. The effect witness would mutate/print if mistakenly executed.

Caller unit mutation and reused ID with changed source must not cache authority.
Ready source `let x; x=7; x;` remains normal without test body under parse-only
and evaluates to Number 7 under execute. Profile mismatch wins over oversized
and malformed source. Source/depth caps stay fixed; steps 0/1/10000, calls 0/1/64,
evaluation depth 256, wall timeout and output caps retain all seven domains.

A later D7 assignment may add `test/script-lexical-statement-audit.ts`, two
`test/fixtures/script-lexical-statement-audit/{alpha,beta}.js` files with local
CRLF attributes, one additive native build gate, new scoped evidence, inventory
and own task status. It must run fresh Node/native 212 guest records, all 69
inherited gates plus the new gate, static-only builds and independently parsed
zero-dynamic coverage, all new full literals and runtime orders, D6 1248 source
runs/256 actual wires/77184 malformed/512 producer negatives, D5 408/full56blocked/
342 negatives, D4/D3/D2/D1 and all 45 inherited required stages, A/B/C, H1–H7,
M/E4, A21, C172/host21, runner20, host73, observations22, probes10 and typecheck.
Use a new orchestrator rather than editing old fixed-gate-count orchestrators.
Recursively back up historical evidence, archive every fresh replay separately,
restore and byte-assert history even on failure. Retain/reduce compiler or API
failures; do not weaken assertions or silently expand scope.

No production, real old tests, history, grammar, execution, codec, emission,
registry, ledger, admission, CLI, profile, manifest, compiler pins or C++ change
is made here. Commit this coherent design/evidence candidate and stop for actual
and independent second review. No implementation, publication or successor is
authorized by this document.
