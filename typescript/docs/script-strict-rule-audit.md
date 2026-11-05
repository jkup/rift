# TS-035D-P: bounded strict-rule design

Candidate for actual and second independent review, 2026-11-05; base
`b6aeb21356e47a723b982959e4161f3e187e3ac7`. No rule is enabled by this document.
Recommend **strict ordinary-block duplicate FunctionDeclarations first**,
`duplicate-block-lexical-function`, restricted to two function declarations in
one strict `block` scope. Keep switch duplicates, mixed lexical conflicts and
duplicate parameters unsupported in this first slice. The first implementable
step is non-emitting same-parser evidence, followed by separate emission review.

The [62-input evidence](validation/ts-035d-p/audit.json) distinguishes existing
Node-build observations from future expectations in [cases.mjs](validation/ts-035d-p/cases.mjs).
No guest bodies, harness, native tests or full suites ran. Protected source,
tests, historical evidence and build configuration are unchanged. The inherited
212 records/63 gates are preserved, not newly validated; all 33 selected files /
60 variants remain blocked. COORDINATION belongs to the coordinator.

## Exact selected consumers and normative basis

The Test262 pin remains `91c70759363c46557b694792bf34a2551a7af5ba`.
Original UTF-8 text fetched through GitHub is retained in
[pinned.json](validation/ts-035d-p/pinned.json); the audit verifies Git blob hashes
against the unchanged manifest before prepending exactly `"use strict";\n`.
Metadata identifies the research input, never supplies parser strictness or a tag.

| Consumer | Blob / actual relevant production | Current bounded result |
|---|---|---|
| [S21](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/statements/function/param-duplicated-strict-1.js) | `69dc995f6fd6a07f9a5c3c5c16d50e2c5f88537b`; simple `param, param` on `_13_1_5_fun`; whole preceding comments and `$DONOTEVALUATE();` retained | `parse.duplicate-parameter`, before body inspection |
| [S22](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/block-scope/syntax/redeclaration/function-name-redeclaration-attempt-with-function.js) | `4f7d8a286e48845b974535159a434ca407f8889d`; `{ function f() {} function f() {} }`; whole original unit retained | `conflict/duplicate-lexical`, C projects `script.uncertified-conflict` |

Fixed normative edition: **ECMA-262 2025, edition 16**, not living-draft clause
numbers. Relevant clauses, retained in TS-031C-P and checked against this design:

* [14.2.1 Block early errors](https://tc39.es/ecma262/2025/multipage/ecmascript-language-statements-and-declarations.html#sec-block-static-semantics-early-errors): duplicate LexicallyDeclaredNames and lexical/var intersection are different checks. The first rule covers only function/function duplicates in an ordinary strict block.
* [14.12.1 Switch early errors](https://tc39.es/ecma262/2025/multipage/ecmascript-language-statements-and-declarations.html#sec-switch-statement-static-semantics-early-errors) and [14.15.1 Try early errors](https://tc39.es/ecma262/2025/multipage/ecmascript-language-statements-and-declarations.html#sec-try-statement-static-semantics-early-errors): a CaseBlock shares names across clauses; a catch parameter has separate restrictions against its handler. Neither is interchangeable with an ordinary block.
* [15.1.1 Parameter lists](https://tc39.es/ecma262/2025/multipage/ecmascript-language-functions-and-classes.html#sec-parameter-lists-static-semantics-early-errors) and [15.2.1 Function definitions](https://tc39.es/ecma262/2025/multipage/ecmascript-language-functions-and-classes.html#sec-function-definitions-static-semantics-early-errors): strict duplicate formals are invalid; non-simple lists impose additional conditions and stay outside the proposed grammar. A body directive affects its own formals.
* [11.2.1–2 Strict code and directives](https://tc39.es/ecma262/2025/multipage/ecmascript-language-source-code.html#sec-directive-prologues-and-the-use-strict-directive), [8.2.4 LexicallyDeclaredNames](https://tc39.es/ecma262/2025/multipage/syntax-directed-operations.html#sec-static-semantics-lexicallydeclarednames), [8.2.6 VarDeclaredNames](https://tc39.es/ecma262/2025/multipage/syntax-directed-operations.html#sec-static-semantics-vardeclarednames), and [16.1.1 Script early errors](https://tc39.es/ecma262/2025/multipage/ecmascript-language-scripts-and-modules.html#sec-scripts): derive mode and name categories from source and syntactic scope.
* [B.3.2.4 block early-error replacement](https://tc39.es/ecma262/2025/multipage/additional-ecmascript-features-for-web-browsers.html#sec-web-compat-block-static-semantics-early-errors): sloppy function-only duplicates have a web-compatibility exception. Do not infer either sloppy execution support or a strict rule from a generic duplicate diagnostic.

Engine comparison is the retained **V8 tag `14.6.202.34`**, not a claim that it is
identical to Node's downstream `14.6.202.34-node.40`. Re-fetched relevant ranges:
[parser-base.h 4932–4977](https://github.com/v8/v8/blob/14.6.202.34/src/parsing/parser-base.h#L4932),
blob `3810a8f9d1d73559ba073c1f4d6e0af2a63717c5`, validates formals after body mode
is determined; [scopes.cc 1155–1225](https://github.com/v8/v8/blob/14.6.202.34/src/ast/scopes.cc#L1155),
blob `f7cc25027cf177d2578f2fc8c2290b44e5ceaef5`, distinguishes lexical conflicts
from sloppy block-function redefinition. Adopt explicit mode/scope distinctions,
not V8 code or error selection. No reference-engine execution or compilation was
needed. Earlier [source audit](validation/ts-031c-p/source-audit.md) retains the
directive/statement-list ranges; it does not certify today's expanded grammar.

## Actual source path and missing proof

| File / exact API | Audit finding |
|---|---|
| `src/lexer.ts:lex(source, true)` | Full lex precedes parse; sourceUnits >100000 vetoes first. Tokens retain raw offsets and locations; unsupported escapes/operators/characters veto even after a candidate. |
| `src/parser.ts:parseStructuralPlan`, `Parser.program/list/functionTail` | `bounded-plan` parses var/for/try-catch/switch/new/postfix/instanceof beyond legacy return audit. EOF is checked before collection. Every function body is parsed, including function expressions. Duplicate formals still call `fail` immediately and stop the parameter loop. |
| `src/script-prologue.ts:scriptPrologue` | Raw exact single/double-quoted use-strict tokens followed by semicolon; initial string statements only. Parentheses end the prologue despite discarded expression parentheses elsewhere. Escaped strings are not use-strict; unsupported escapes already block lex. ASI directives are not supported. |
| `src/script-declarations.ts:DeclarationCollector` | Iterative whole-body walk records function/block/catch/switch boundaries and inherited mode, var propagation stops at function boundaries. All identifier-delete and sloppy-block restrictions are checked before conflicts. **Catch checks and conflicts share one scope loop**, so an earlier conflict can precede a later catch veto. |
| `declarationConflict` | Returns first duplicate lexical, else lexical-var, else formal-lexical. A conflict contains sites and scope ID, but lacks the scope kind/strictness and declaration kinds needed for a certified rule; a message is not evidence. |
| `src/script-execution-internal.ts:ExecutableScript.prepare` via `prepareBoundedScript` | Owns fresh nodes and parse; non-complete plans never become executable records. `ScriptPreparation` includes non-complete declaration results. Keep this authority boundary. |
| `src/script-observation.ts:rejected` | Conflicts unconditionally become `script.uncertified-conflict`; blocked results may use legacy return evidence only in parse-only test position; otherwise syntax-error throws `unreviewed Script rule`. Simply adding a parser tag would fault. |
| `src/script-observation-types.ts`, `script-observation-json.ts` | v2 rule union is return-only; serializer literally writes return-outside-function. Widening only the type silently mislabels bytes. |
| Both `tools/test262/script-driver-result.mjs` and `script-result.mjs` | Independent closed rule allowlists are return-only. Both must change atomically with the serializer/projection, with mutation tests. v1 stays unchanged. |

Concrete bounded witness B15 is `"use strict"; {function f(){} function f(){}}
try {} catch(e){let e;}` (one-line literal in cases). Existing collector reports
the first block conflict; B14 with a directly enclosing conflicting catch blocks.
Thus EOF plus the existing first-conflict result is insufficient for the proposed
veto policy. This is a certification prerequisite, not a claim that current C
incorrectly certifies it: C correctly keeps both unsupported. B16 similarly
requires checking later non-target conflicts before authorizing the first one.

## Frozen first-slice algorithm and API

Add only `auditBoundedScriptBlockFunctions(source: string): BlockFunctionAudit`
in `src/parser.ts`, plus internal collector support in `src/script-declarations.ts`:

```ts
type BlockFunctionCandidate = {
  readonly ruleCode: "duplicate-block-lexical-function";
  readonly scopeStart: number; readonly scopeEnd: number;
  readonly first: DeclarationSite; readonly second: DeclarationSite;
};
type BlockFunctionAudit =
  | { readonly kind: "eligible"; readonly sourceUnits: number;
      readonly consumedUnits: number;
      readonly candidates: readonly BlockFunctionCandidate[] }
  | { readonly kind: "none"; readonly sourceUnits: number;
      readonly consumedUnits: number }
  | { readonly kind: "blocked";
      readonly reason: "grammar-or-resource" | "scope-restriction" | "other-conflict";
      readonly diagnostic: Diagnostic;
      readonly rejection: Rejection | null };
```

This is internal test evidence, not an input accepted by preparation, a protocol
field, an executable AST or a public completeness certificate. `rejection` is
nonnull for grammar/resource/scope restrictions and null for other-conflict;
never syntax-error in this non-emitting API. `none` means no selected candidate
within this grammar, not conformance validity. Do not expose unit IDs, metadata,
variant, expected-negative, Realm, caller-supplied mode or candidate flags.

1. Reuse the exact bounded lexical/parser path (`lex(source,true)`,
   `Parser(...,"bounded-plan")`, original `program`). Add a private common helper
   for this path rather than copying parsing. Do not relax any parser failure in
   the block-only slice. Require actual EOF token start **and** end equal to
   source.length including trailing trivia, matched delimiters and no failure.
2. Extend the shared collector with a private analysis result before its public
   projection: scopes/declarations/functions plus candidate sites, first current
   conflict, and audit veto. The collector walks the *same* full parsed body;
   no substring parser, lazy body skip, token recovery, second evaluator or AST
   supplied by an adapter. Keep ordinary public `DeclarationPlanResult` output
   byte-equivalent in this first slice, including its existing first-conflict
   precedence. Additional analysis must not change retained node associations.
3. Audit all restrictions globally before selecting a candidate: identifier
   delete, unsupported sloppy block functions, **every catch** (including later
   scopes), and every non-target conflict. Compute all duplicate groups and all
   lexical-var/formal-lexical intersections; calling current first-return
   `declarationConflict` once per scope misses a mixed conflict in the same scope.
   Any such restriction vetoes every selected candidate. No need to continue
   after a fatal grammar error: the entire audit is blocked already.
4. A candidate requires strict=true, scope.kind=`block`, same-name lexical
   declarations both kind=`function`, within that immediate scope. Three same
   names produce first/second and first/third pairs. Mixed let/function, var
   collision, switch duplicate and formal conflict veto, even after a qualifying
   pair. Catch handler is an ordinary block **only after** its catch restriction
   passes. Script/function-level duplicate function declarations are var-category
   neighbors, not this rule; separate nested blocks do not collide.
5. Sort candidates by second.start then first.start. Select earliest second
   binding token only after all vetoes pass. Diagnostic location is that token's
   retained Location; scope spans refer to original transformed source. Copy
   detached sites; no mutable analysis can authorize preparation. Empty list
   yields `none`; otherwise `eligible`. Never return a runnable record.

Strictness flows Script -> containing scopes -> function. Only Script/function
prologues introduce ownStrict; ordinary blocks/catch/switch never do. An own
function directive determines nested block mode even in a sloppy outer Script.
Raw escaped directives, parenthesized strings, preceding empty/numeric statement
and later strings do not introduce strictness. Supported non-strict code elsewhere
can be structurally inspected, but any sloppy block function restriction vetoes.

## Deferred parameter slice, exact continuation boundary

After block evidence and emission acceptance, separately assign
`auditBoundedScriptStrictParameters(source: string)` using the same blocked/none/
eligible shape with candidates `{ruleCode:"duplicate-strict-parameter",
functionStart,functionEnd,first,second}`. It requires a private parser purpose
that is structurally identical to bounded-plan except for duplicate simple
formal detection: retain both binding token sites and continue the *same*
parameter list, function body, enclosing body and EOF. Do not weaken `name`,
delimiters, depth, source-unit or expression checks. All function expressions
and declarations must participate; default/rest/destructuring/arrow/method/
named-expression grammar remain blocked as today.

Resolve duplicates only after the collector knows source-derived own/inherited
strictness. **Any sloppy duplicate anywhere is an unsupported veto**, including
an earlier sloppy function followed by a strict candidate. It must never become
a normal/executable plan. All other grammar/resource/scope/conflict vetoes apply.
For the standalone parameter slice, even block-function conflicts remain a veto;
combining rules later needs an explicitly reviewed precedence contract. Ordinary
parse/plan functions keep their old duplicate rejection until emission migration.
Do not reuse the legacy return audit to finish this parse.

## Ordered implementation and emission closure

**D1, first implementable assignment:** own `src/parser.ts`,
`src/script-declarations.ts`, new `test/script-strict-rule-audit.ts`, new
`fixtures/script-strict-rule-audit/{a,b}.js`, one additive `tools/build-native.mjs`
gate and new scoped evidence. Implement block-only non-emitting API above.
`src/lexer.ts`, `script-prologue.ts` and `syntax.ts` need no behavior change.
`outcomes.ts` already reserves both codes; no union widening is needed.
No observer/decoder/preparation/old-test modifications in D1. Stop for review.

**D2, only after D1 review:** integrate the same private analysis into bounded
preparation so a rejection can be constructed from its own parse, not an
adapter-triggered reparse. Exact closure: `parseStructuralPlan` in parser,
collector internal analysis/public non-complete projection, existing
`ScriptPreparation` consumers in `script-execution-internal.ts`, and C's
`rejected`. Keep `parse`, `parseDeclarationPlan`, `auditScriptReturns` and v1
unchanged. A bounded selected rejection is `{kind:"syntax-error",
ruleCode:"duplicate-block-lexical-function"}` plus phase=parse/name=SyntaxError
diagnostic at selected second binding. Preserve Realm-profile rejection before
parse, lexer/resource precedence and public first failure for vetoed input;
vetoed existing conflicts still project `script.uncertified-conflict`.

The existing return fallback must not override a selected rule, nor convert a
vetoed candidate using legacy evidence. Freeze this dispatch explicitly:
selected bounded rule first; conflict remains unsupported; blocked bounded
grammar follows existing return-only path only if no new-rule audit candidate
was retained. Evidence stays internal; no boolean from a caller grants authority.
Resource/grammar vetoes never become syntax-error. Multiple target conflicts use
the source-order rule above; this is engine diagnostic policy, not a mandated
ECMAScript choice of which early error to report.

D2 must atomically change `src/script-observation-types.ts` rule literal union,
`src/script-observation-json.ts` to serialize the actual closed rule, and **both**
`tools/test262/script-driver-result.mjs` / `script-result.mjs` allowlists to return
plus block code only. C projection must explicitly accept only those reviewed
codes and preserve operation/source actual unit/Realm/location, phase=parse,
constructorName=SyntaxError, testBodyEvaluated=false, inspection=null and unchanged
completed prefix. Apply to rejected preparation in parse-only and execute,
including harness-stage rejection with unchanged harness failure handling;
no body instantiation/evaluation follows. Keep seven limits, request/build/source
binding, parent transport priority and capability classification unchanged.
No registry/ledger/profile/CLI/manifest/admission change is included.

**D3:** parameter-only continuation evidence, with separate review; **D4:** its
own emission closure and regression proposals. Numeric assignment-target and
lexical-in-Statement require separate production audits: AST target shape and
branch spelling checks are not certified by any of the above scope evidence.

## Frozen controls and acceptance boundary

[cases.mjs](validation/ts-035d-p/cases.mjs) is the exact source matrix: B01–B21
scope/collision controls, D01–D07 prologues, P01–P15 strict/sloppy formals,
X01–X09 late grammar/token/body errors, L01–L06 exact 100000/100001 units and
127/128 nested-block depth boundary plus parameter resource tails, R0/R1 distinct runtime-read sources, plus
whole pinned S21/S22. `parameter` rows stay blocked in D1. Future audit assertions
must check candidate pair names/spans/location, actual EOF, blocked reason/code,
and unchanged ordinary outputs, not merely agree across hosts. Expand long
boundary strings deterministically as recorded in audit.json; never trim tails.
The B21 same-scope mixed triple is a mandatory veto (same principle as B16).
D1 must preserve ordinary
output for B15 while its new audit reports a veto.

Run R0 and R1 from files supplied at runtime to the new native and Node drivers;
assert distinct names (`alpha` versus `beta`), outer inherited/own source mode,
and exact offsets, not compiled-in fixture selection. Both builds require
static-only plus independently parsed zero-dynamic coverage. D1 acceptance also
preserves 212 old records /63 old gates and adds one gate, A/B/C/H1–H7, both old
serializer lanes, typecheck, runner20/host73/observations22/probes10 and all60
blocked. This is future implementation acceptance, not a request to rerun suites
for the current documents.

Literal R0 expected evidence: sourceUnits=consumedUnits=53, scope=[14,53),
first alpha=[24,29), second alpha=[43,48), diagnostic line1/column44; one
candidate. R1: sourceUnits=consumedUnits=69, scope=[31,68), first beta=[41,45),
second beta=[59,63), diagnostic line1/column60; one candidate. R0 Script owns
strictness; R1 outer function owns it and block inherits it. L02 and L05 resource
count=100001/limit=100000; L04 and L06 audit resource count=129/limit=128.
L06 ordinary parser currently stops earlier at duplicate-parameter; only the
future parameter continuation reaches its depth veto. Preserve that distinction.

D2 additionally needs literal both-decoder valid/mutation/roundtrip controls for
return and block codes; reject parameter/numeric/statement/unknown codes, wrong
phase/constructor, body=true, nonnull inspection, forged unit/location/binding,
and byte-level proof serializer does not replace block with return. Verify real
Node/native parse-only and execute transport on both R sources, whole S22,
valid/sloppy/distinct neighbors, late vetoes, harness/test provenance and zero
test effects. Expected-negative metadata changes may alter eventual parent
classification only, never engine rule. No certification result admits S22.

No old-test changes are needed or proposed for D1. D2 is not frozen for dispatch:
before changing bounded preparation outcomes, enumerate affected old assertions
and render exact whole-file proposals with base/target hashes and a verifier in
its new evidence directory. Do not rewrite old evidence, fixture expectations,
synthetic protocol rows or guest totals opportunistically. Any substantive
compiler/API closure failure is retained/reduced and sent for review; no pin or
scope workaround is authorized here.
