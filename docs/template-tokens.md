# Template token values

Template tokens retain source text, normalized raw text and cooked text. A null
cooked value records an invalid escape without losing the following substitution
or template boundary. Each part resets this state independently. Ordinary
template parsing rejects null cooked values with the existing invalid-escape
diagnostic; string literals still reject bad escapes in the lexer.

Raw CR and CRLF normalize to LF, including escaped line continuations. Escape
spelling otherwise remains intact. Tagged template execution is a separate step.

Tests cover invalid hexadecimal/Unicode/decimal escapes, part boundaries, nested
templates, line endings, unterminated input and unchanged string rejection.
References: [template lexical components](https://262.ecma-international.org/16.0/#sec-template-literal-lexical-components)
and [engine262 template arguments at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/ArgumentListEvaluation.mts).
