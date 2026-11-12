# Await identifier grammar context

TS-500, 2026-11-12. A read-only follow-up to the
[contextual identifier review](contextual-identifier-review.md) checks 36 sources
in strict and sloppy Script mode. Independent Node syntax checking accepts 34
of the 72 cases and rejects 38. Isolated TS-496 preparation accepts two valid
await-expression controls; 32 valid cases remain unsupported. No invalid case
is accepted. This is syntax evidence, not native or conformance acceptance.

The controls expose boundaries that a single async-body flag cannot represent:

| Source distinction | Node result |
| --- | --- |
| `async function await(){}` / `(async function await(){});` | declaration valid; expression invalid |
| Ordinary function named `await` inside an async body | declaration invalid; named expression valid |
| Async parameter named `await`, including patterns | invalid |
| Async parameter default referring directly to `await` | invalid |
| Async parameter default containing `function(await){return await}` | valid |
| Non-async arrow inside async code, with `await` in its parameter/default | invalid |
| Non-async arrow inside async code, with `await` only in its body | valid |
| `async(await)` / `async(await)=>1` | call valid; arrow invalid |
| Class field initializer referring to `await`, even inside async code | valid |
| Class computed name with an await expression inside async code | valid |
| Static-block `await` reference / nested ordinary function's `await` parameter | direct reference invalid; nested function valid |

All listed distinctions are identical in the strict/sloppy pairs. The existing
[identifier grammar](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-identifiers)
uses an Await grammar parameter independently of strictness. Keep that distinction
explicit in the implementation rather than treating `await` as a strict-only name.

Current `functionTail` disables await-expression parsing for formal parameters
and enables it for async bodies. Admission therefore needs separate information
about reserved identifier positions. Function declaration names and named
function expressions also have different contexts. Ordinary function parameters
reset the surrounding async restriction; ordinary arrow heads retain it, while
their bodies establish a non-async context.

`parenthesizedExpression` resolves `async(...)` as a call or arrow only after
reading the closing parenthesis. Rejecting every `await` identifier while reading
that cover would reject valid calls. Any deferred check must respect nested
function, arrow-body and class-field boundaries. A flat scan of identifier names
or reuse of the execution suspension flag would be incorrect.

Before implementation, represent these grammar contexts explicitly and preserve
the existing unsupported/resource precedence. Keep property names separate,
retain Module-goal limitations, and exercise the exact reviewed sources on both
hosts after admission. No production code or test expectation changed here.

Evidence: `build/await-identifier-context-review.json` retains all 72 sources,
Node diagnostics and Rift outcomes. Reproducer:
`node build/review-await-identifier-context.mjs`; existing evidence is not replaced.
