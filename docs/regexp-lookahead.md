# RegExp lookahead

Positive and negative lookahead use explicit assertion frames alongside the
existing backtracking stack. Each frame saves the input position, capture/mark
state, continuation and stack boundary. A positive match keeps its captures and
restores the input position; a negative match fails. Exhausting an assertion's
alternatives restores its entry state and reverses that result. Successful
assertions discard their internal alternatives, so later backtracking cannot
re-enter them. Matching remains iterative and charges state copies and work to
the existing step budget.

The parser preserves nested capture numbering and its depth limit. Unquantified
`(?=...)` and `(?!...)` are supported. Legacy quantified assertions, lookbehind,
named groups/references and Unicode modes remain explicitly unsupported.

Review: [ECMAScript 2025 assertion compilation](https://tc39.es/ecma262/2025/multipage/text-processing.html#sec-compileassertion)
and [engine262 RegExp at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/RegExp.mts).
Tests include the specification's atomic lookahead example, nested positive and
negative assertions, internal alternatives, captures across outer backtracking,
repeat clearing, indices, flags, string protocols and resource exhaustion.

Historical inputs are retained and moved to supported expectations, including
`/a/gg; /(?=a)/`: the supported lookahead no longer vetoes certification of the
earlier duplicate flags. Validation logs use `build/regexp-lookahead-*`; combined
integration acceptance is still required.
