# Let identifier grammar review

TS-503 reviews the remaining contextual identifier gap without changing the
frozen parser. The 100-case Node syntax review has 38 valid and 62 invalid cases.
TS-502 admits ten valid cases, accepts no invalid cases and produces no false
syntax-error certificates. Evidence is in `build/let-identifier-context-review.json`;
the earlier 56 let cases remain in the TS-499 contextual review.

Relevant specification boundaries are
[expression-statement lookahead](https://tc39.es/ecma262/2026/multipage/ecmascript-language-statements-and-declarations.html#sec-expression-statement),
[lexical BoundNames restrictions](https://tc39.es/ecma262/2026/multipage/ecmascript-language-statements-and-declarations.html#sec-let-and-const-declarations-static-semantics-early-errors)
and [for-in/of grammar](https://tc39.es/ecma262/2026/multipage/ecmascript-language-statements-and-declarations.html#sec-for-in-and-for-of-statements).
Expression statements cannot begin with the token pair `let [`; for-of assignment
heads cannot begin with `let` at all. For-in assignment heads instead exclude the
two-token prefix. Lexical declarations cannot bind the name let, even in sloppy
code. Strict identifier restrictions are a separate rule.

The Node reductions expose distinctions that admission must preserve:

- `let;`, `let=1`, `let(1)` and `let.x` are valid sloppy expressions.
- `let[0]` is invalid as an expression statement, while `(let)[0]` is valid.
- A newline does not erase the lookahead distinction: `let\n[0]` is invalid,
  `let\n(1)` is a call, and `let\nx=1` is a lexical declaration.
- `if(true)let;` and `if(true)let=1` are valid; an unbraced lexical declaration
  remains invalid. Labels and while bodies need the same distinction.
- `for(let in {})` is valid, but `for(let of [])` is invalid. Parenthesizing the
  assignment target makes the latter valid. The distinction also applies to
  property targets, while `for(let of of [])` is a valid lexical declaration.
- `var {let}={}` is valid. `let {let}={}` and `let {x:let}={}` are invalid;
  `let {let:x}={}` uses let only as a property key and is valid.

The current parser treats every leading let as a declaration in several statement
and loop paths. Extending identifier admission alone would therefore be wrong.
A successor should centralize declaration lookahead, retain the separate
Statement-position audit, reject lexical BoundNames containing let, and preserve
the original first token for for-of restrictions. Strict-name collection can reuse
the existing complete-source audit. Test ordinary expression, declaration and
loop paths independently, including inherited strictness and newline controls.

This is a reviewed implementation direction, not a conformance result. No source,
original fixture, error classification or accepted milestone changed in this task.
