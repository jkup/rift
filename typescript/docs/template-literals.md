# Ordinary template literals

TS-068 adds untagged template literals to Script parsing. The lexer tracks brace
depth for each active substitution, so nested templates, object literals,
functions, comments and strings keep their own boundaries. Tokens preserve raw
source spans separately from cooked text. CR and CRLF normalize to LF; escapes
include line continuations, hex, Unicode code units and Unicode code points.
Malformed escapes and unterminated templates fail before execution. Tagged
templates remain explicitly unsupported, as do otherwise unsupported expressions
inside substitutions. The legacy parser's grammar is unchanged.

The AST retains text segments and expressions separately. Evaluation processes
each expression and its string-hint conversion before moving to the next one.
Throws stop further substitutions. Symbols fail string conversion. Declaration
collection visits embedded expressions and function bodies; original function
source remains available. Template text never acts as a strict-mode directive.
Lexical nesting, parser nesting and evaluation use the existing resource bounds.

References: [template evaluation](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-template-literals-runtime-semantics-evaluation)
and [lexical components](https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-template-literal-lexical-components).
The C++ lexer and parser template implementations were consulted; the TypeScript
lexer uses one interpolation-depth stack rather than a separate rescan state.

Tests cover nesting, comments and braces, cooked UTF-16, raw source and locations,
directives, functions and closures, ordered conversion hooks, exact throw
identity, symbols, malformed input and resource limits. Acceptance pending.
