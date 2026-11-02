# TS-031C-P: syntax certification feasibility

Design for independent review, 2026-11-02. Assignment base `c4c2488`; measurements
at coordinator-only successor `a814e18`. Runtime baseline is accepted `5b42393`:
212 guest cases per lane, 35 static gates, 72 host controls, 16 observation
controls. Those totals are inherited, not rerun or increased by this audit.

**No reserved rule is ready to emit through the current parser.** Some local
rejections identify genuine errors, but current results do not establish the
required whole-source coverage. Keep all five codes non-emitting. Recommend one
bounded prerequisite: collect Script-level return candidates while continuing
the same parser to EOF, expose coverage evidence to an internal audit driver,
and preserve every existing public outcome. Review that evidence before a
separately assigned return-only emission change. This is not a demand to build a
complete ECMAScript parser before making progress.

## Evidence and meaning of coverage

[Reproduction and provenance](validation/ts-031c-p/README.md),
[literal current matrix](validation/ts-031c-p/current-matrix.md),
[future acceptance matrix](validation/ts-031c-p/acceptance.md), and
[source audit](validation/ts-031c-p/source-audit.md) are part of this contract.
There are 58 source/variant inputs (50 synthetic, eight exact pinned variants),
116 existing Node/native Rift parser observations, 58 V8 reference compilations,
and six real parent/child metadata controls. No body or upstream harness ran.

Whole-source coverage here means that the original transformed source has been
lexed and structurally consumed to EOF, including every function body, with no
unsupported production or resource guard, except the explicitly audited return
context violation. It does **not** mean that every ECMAScript early error or
runtime behavior is implemented. An accepted subset AST is not an admission
certificate. For a grammar violation, the proposed recognizer is explicitly a
superset grammar with one recorded violation, not a claim that invalid source
parsed as an ordinary Script.

Today `parse` lexes before parsing, and `Parser.fail` retains the first grammar
failure. `list`, expression loops and parameter loops stop on `error`. No EOF
coverage evidence is returned. `functions` tracks nesting but no parse goal,
directive prologue or strict mode is recorded; one `names` list handles Script,
function and block declarations alike. Parentheses lose their syntactic identity.
The lexer has source spans, but unsupported regex/templates, escapes, characters,
numbers and operators still stop it. This is a subset recognizer, not full Script
validation. Current human `SyntaxError` names do not alter that fact.

## C01–C08 and pinned S18–S22

| Row | Finding and precise boundary | Disposition |
|---|---|---|
| C01 / S18 | Numeric-literal assignment is genuinely invalid. `parse.assignment-target` also covers valid destructuring and legacy call targets; the parser does not consume later grammar after failing. | Defer. A future rule needs an explicit target-production allowlist and EOF evidence, not `kind !== identifier/member`. |
| C02 / S19 | An actual lexical declaration cannot be a while Statement. But sloppy `while(false) let = 1;` is an expression statement: rejecting the next token `let` does not prove a declaration. `if(false) function f(){}` has an Annex B exception. | Defer. Recognize a complete lexical declaration in the exact Statement slot; never relabel all branch failures. |
| C03 / S20 | `return` in Script code outside a function is invalid in either mode, including inside an ordinary block. Rift's function counter is useful evidence, but failure short-circuits the remaining grammar. | Smallest candidate after bounded continuation prerequisite; not emitting now. |
| C04 / S21 | Simple duplicate parameters are permitted in sloppy ordinary functions. Strictness may be inherited or supplied by the function body's own directive. Current failure occurs before that body is inspected. | Defer until directive and function context are explicit. `onlyStrict` metadata is not proof of strict context. |
| C05 / S22 | Strict block function duplicates differ from Script/function-body duplicates and sloppy Annex B blocks. Current duplicate-binding code conflates them, and even mixed let/function collisions need a different precise rule. | Defer until distinct declaration scopes and actual strictness exist. |
| C06 | `[a]=b;` and `({a:x}=b);` are valid assignment patterns; `({a:1}=b);` is invalid. V8 compiles both sloppy and strict `f()=1;` for legacy compatibility. | All remain unsupported; V8 disagreement does not redefine the specification. No broad target certification. |
| C07 | `return 1; class C {}` retains `parse.return-context`; `return 1; ` followed by a template yields `lex.character`. Valid neighbors with the same tails also reject. | A local genuine error cannot promote a partially inspected file under this contract. Unsupported/guard evidence must veto later certification. |
| C08 | Null, parse/SyntaxError and runtime/TypeError metadata produce identical observations for the same bytes in both lanes. | Preserve this independence through every future interface. No message/path/blob/expected-negative rule selection. |

Pinned revision is `91c70759363c46557b694792bf34a2551a7af5ba`. The audit verifies
all five Git blobs against the accepted manifest before running eight variants.
Comments, frontmatter and `$DONOTEVALUATE()` remain untouched. Strict variants
use only the existing exact `"use strict";\n` prefix. No wrapper, shim, stripped
body, declaration substitution or source suffix repair is used as evidence.
All eight currently report unsupported syntax, not certified SyntaxError.

## Normative and engine basis

The fixed authority is ECMA-262 **2025 / edition 16**, not moving draft numbering.

| Concern | Fixed clauses and consequence |
|---|---|
| Assignment | [13.15.1](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-assignment-operators-static-semantics-early-errors), [13.15.5.1](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-destructuring-assignment-static-semantics-early-errors), [8.6.4 AssignmentTargetType](https://tc39.es/ecma262/2025/multipage/syntax-directed-operations.html#sec-static-semantics-assignmenttargettype): distinguish assignment patterns from simple assignment targets; a numeric literal is not simple. |
| Statement slots and return | [14 grammar](https://tc39.es/ecma262/2025/multipage/ecmascript-language-statements-and-declarations.html#sec-ecmascript-language-statements-and-declarations), [14.2](https://tc39.es/ecma262/2025/multipage/ecmascript-language-statements-and-declarations.html#sec-block), [14.7.3](https://tc39.es/ecma262/2025/multipage/ecmascript-language-statements-and-declarations.html#sec-while-statement), [14.10](https://tc39.es/ecma262/2025/multipage/ecmascript-language-statements-and-declarations.html#sec-return-statement): Declaration is a StatementListItem alternative, not generally a Statement; Return is grammar-parameter gated. A block propagates Return. |
| Script | [16.1 grammar, 16.1.1–2 and 16.1.5 ParseScript](https://tc39.es/ecma262/2025/multipage/ecmascript-language-scripts-and-modules.html#sec-scripts): Script starts with ~Return; strictness belongs to source; parse and global instantiation are separate. |
| Functions | [15.1.1](https://tc39.es/ecma262/2025/multipage/ecmascript-language-functions-and-classes.html#sec-parameter-lists-static-semantics-early-errors), [15.2 grammar and 15.2.1](https://tc39.es/ecma262/2025/multipage/ecmascript-language-functions-and-classes.html#sec-function-definitions): function bodies enable Return; strict parameters require unique names. Non-simple lists have additional duplicate restrictions. |
| Scope names | [14.2.1](https://tc39.es/ecma262/2025/multipage/ecmascript-language-statements-and-declarations.html#sec-block-static-semantics-early-errors), 16.1.1, 15.2.1, and [8.2.4 LexicallyDeclaredNames / 8.2.6 VarDeclaredNames](https://tc39.es/ecma262/2025/multipage/syntax-directed-operations.html#sec-static-semantics-lexicallydeclarednames): block and top-level declaration categories are different. |
| Directives | [11.2.1–2](https://tc39.es/ecma262/2025/multipage/ecmascript-language-source-code.html#sec-directive-prologues-and-the-use-strict-directive): only the initial unparenthesized exact literal directives count; escapes and ordinary block strings do not create strict mode. Function strictness can apply back to its parameters. |
| Annex B | [B.3.2.4](https://tc39.es/ecma262/2025/multipage/additional-ecmascript-features-for-web-browsers.html#sec-web-compat-block-static-semantics-early-errors) permits sloppy duplicates bound only by FunctionDeclarations; [B.3.3](https://tc39.es/ecma262/2025/multipage/additional-ecmascript-features-for-web-browsers.html#sec-functiondeclarations-in-ifstatement-statement-clauses) extends sloppy if branches, not while bodies. Exclude these from initial certification. |

Relevant V8 source is pinned at tag `14.6.202.34`, matching the base version of
local Node's `14.6.202.34-node.40` (not a claim of identical downstream source).
File blob IDs and inspected line ranges are recorded in the source audit.
Its declaration scopes, directive parsing and post-body parameter validation
support tracking context explicitly. Its assignment parser validates patterns
separately; its invalid-reference rewrite intentionally preserves call-target
runtime errors for legacy compatibility, even in strict code. This is a recorded
implementation divergence from the fixed assignment early-error rule, not an
Annex B justification or an oracle to copy. Reference checks compile only: no
runtime ReferenceError measurement is claimed. No engine source was copied.

## Bounded prerequisite and interfaces (proposed, not implemented)

Add an internal parser audit entry point, sharing lexer/parser machinery:

```ts
type ReturnCandidate = {
    readonly ruleCode: "return-outside-function";
    readonly loc: Location;
    readonly start: number; // original transformed UTF-16 offset
    readonly end: number;   // exclusive return-keyword end
};
type ReturnCoverage =
    | { readonly kind: "complete"; readonly goal: "Script";
        readonly sourceUnits: number; readonly consumedUnits: number;
        readonly candidates: readonly ReturnCandidate[] }
    | { readonly kind: "blocked"; readonly goal: "Script";
        readonly rejection: { readonly kind: "unsupported-syntax";
          readonly capabilityCode: SyntaxCapability } | ResourceOrigin; readonly loc: Location };
function auditScriptReturns(source: string): ReturnCoverage;
```

The name `complete` means only structural coverage in the defined audit grammar.
It is not exported in the observation protocol, cannot admit a profile, and
does not imply strict Script execution support. The blocked rejection is restricted to unsupported-syntax or resource-limit;
never construct syntax-error there. Public `parse(source)` and `ParseResult`
retain their current behavior. No mutable caller-supplied candidate or EOF flag
is accepted. The input is only source; no test identity, negative metadata,
variant label, harness flag, Realm or policy argument.

1. Separate only the top-level return-context candidate from fatal parsing in
   an explicit private audit mode. Lex the entire same source first. At a
   syntactic return Statement with function depth zero, record its span, then
   parse its complete operand and terminator using current subset grammar.
   Do not skip tokens, recover past malformed syntax, rescan substrings, or
   create an executable AST result for callers from this mode.
2. Continue all enclosing lists and subsequent source to EOF. Existing unsupported
   failures, unbalanced delimiters, unknown production, source-unit or depth
   limits block coverage, even if candidates were already seen. Collect multiple
   returns in source order; a late blocker discards certification eligibility.
   Functions reset Return context; ordinary blocks/branches preserve it.
3. Return complete only with actual EOF and matched delimiters. `consumedUnits`
   equals `source.length` including trailing comments/whitespace; do not derive
   completeness merely from the last statement's end. A valid input has an empty
   candidate list. Preserve all public diagnostics, partial body behavior,
   locations, provenance, guard counts and zero body-evaluation guarantees.
4. Prove the [prerequisite matrix](validation/ts-031c-p/acceptance.md) on Node and
   native using a new internal audit driver, plus preservation of existing 212
   guest expectations and 35 build/coverage gates, host controls, runner, probes
   and typecheck. No weakening of a native assertion if it differs. Then stop
   for independent review. Do not enable a code as part of this prerequisite.

If the prerequisite is accepted, a separately frozen return-only emission slice
may call this audit **only when public parsing rejected with return-context**.
Complete plus at least one candidate permits the first recorded return to carry
`{kind:"syntax-error",ruleCode:"return-outside-function"}`; blocked audit keeps
the original public unsupported/guard result. This avoids changing diagnostic
priority while ensuring late unsupported grammar vetoes certification. Other
four rules stay empty. This is a prospective selection rule, not authorization.

That later slice must atomically update `Observation`/`projectRejection`, the
encoder, closed child decoder, parent composition and their operation invariants:
parse phase, SyntaxError, ruleCode, bodyEvaluated false, actual source location,
test source unit, nonce/build/source binding. Current `projectRejection` throws
on syntax-error and the child protocol excludes it; changing parser tags alone
would create a driver fault. The host result model already reserves syntax-error,
but that is not proof the driver can emit it. Keep `harnessValidated:false`, all
profiles blocked, and never add observation classifications. Re-review any
proposal to expose completeness over the wire rather than inside the parser.

## Explicit exclusions and remaining uncertainty

No new syntax, ASI, strict/sloppy execution, Annex B execution, destructuring,
arrow/default/rest parameters, modules/eval/Function goals, regex/template
lexing, catch/switch/class scope, Error objects, harness parsing, admission,
classifier/policy changes, corpus edits, compiler upgrade or performance claim.
No certification of C01/C02/C04/C05, mixed declaration collisions, missing
delimiters, lexer errors or resource exhaustion. Byte hashing and variant
prefixing remain host transport duties; strictness cannot be inferred from a
test's expected outcome. The audit must never repair guest source to get EOF.

Material blocker is missing complete structural evidence after a candidate,
not doubt that Script-level return is illegal. New continuation code still needs
proof under static compilation and independent review; this design supplies a
bounded way to obtain that proof without prematurely shipping certification.
