# Source inspection record

Read on 2026-11-02. Local engine files at `c4c2488` and measured `a814e18` are
identical. Line references below use that content; no source changes proposed as
part of this audit. Inspection is distinct from measurements in results.json.

| Local site | Finding |
|---|---|
| `src/parser.ts` 7–11 | Entire lex call precedes parser creation. Lexer failure returns immediately. |
| `src/parser.ts` 35–40 | First grammar failure wins; later calls cannot replace it. |
| `src/parser.ts` 49–65 | Program uses list; list stops when error is set; shared duplicate logic includes parameters/functions/let. No EOF certificate. |
| `src/parser.ts` 78–81 | Branch checks next spelling let/function, before proving a declaration. |
| `src/parser.ts` 115–126 | Return checks functions counter; newline restriction is a subset limitation. |
| `src/parser.ts` 137–156 | Duplicate parameters fail before full body; function counter restored, loops reset. No directive handling. |
| `src/parser.ts` 215–227 | Assignment rejects every AST except identifier/member, including patterns. |
| `src/parser.ts` 243–247 | Parentheses are discarded from the AST. |
| `src/lexer.ts` 3, 34–35, 36 onward | Token spans retain UTF-16 offsets; source-units gate precedes lex; lex errors are unsupported/guard provenance. |
| `src/outcomes.ts` | Five SyntaxRule strings reserved; no producer authorized. |
| `src/observation.ts` projectRejection / observe | syntax-error currently throws a host fault; parser mode never instantiates/evaluates body. |
| `src/observation-json.ts` observationJSON | No syntax-error encoding branch. |
| `tools/test262/driver-result.mjs` parseDriverResult | Closed child decoder and mode/body checks need explicit later changes to accept a new tag. |
| `tools/test262/result.mjs` 71, 105 | Host structured result reserves syntax-error; this alone does not change engine or child protocol. |
| `tools/test262/observe.mjs` prepareObservation | Expected-negative is retained by parent, not passed as a parser argument; plan binding/source identity remains mandatory. |

The line map is navigation, not executable proof; verify the function names if
subsequent commits move lines. The audit scripts hash all `src/*.ts`, existing
Node artifacts and native observation executable for replay provenance.

## Pinned engine inspection

Fetched through the GitHub connector at V8 tag `14.6.202.34`:

- [src/parsing/parser-base.h](https://github.com/v8/v8/blob/14.6.202.34/src/parsing/parser-base.h),
  Git blob `3810a8f9d1d73559ba073c1f4d6e0af2a63717c5`.
  Inspected `ValidateFormalParameters` 1279–1284; assignment pattern/reference
  distinction 3326–3363; `RewriteInvalidReferenceExpression` 5542–5579;
  `ParseStatementList` 5675–5735; StatementListItem versus Statement 5740–5880;
  post-body parameter validation 4932–4977; return scopes 6219–6264.
- [src/ast/scopes.cc](https://github.com/v8/v8/blob/14.6.202.34/src/ast/scopes.cc),
  Git blob `f7cc25027cf177d2578f2fc8c2290b44e5ceaef5`.
  Inspected 1155–1178 and 1203–1225: lexical conflicts versus the special sloppy
  block-function redefinition case. Script/function declaration scope differs
  from block scope. No engine code copied or built.

V8 is useful evidence for explicit scopes, directive processing, separate
pattern checks and delayed parameter validation. Its call-target compatibility
rewrite is not normative permission to emit Rift syntax errors. Local reference
version is Node v26.13.0 / V8 14.6.202.34-node.40; this audit does not assert that
the upstream tag contains every Node downstream patch.

Fixed ECMA-262 edition 16 multipage pages for expressions, statements, functions,
source code, Scripts and Annex B were opened and inspected through web tools;
exact clause links are in the design. The oversized single-page edition fetch
and raw.githubusercontent V8 fetch failed; no evidence is inferred from either.
No external source text is vendored here. Re-fetch pinned files and verify their
Git blob IDs to reproduce engine-source inspection.
