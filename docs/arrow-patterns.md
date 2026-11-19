# Arrow parameter binding patterns

Parenthesized arrow parameters reuse the existing expression cover parse. Once an
arrow is known, array/object assignment covers become binding patterns; only
identifier leaves are allowed. The converter recovers declaration spans by binary
search in the already-tokenized source. It does not rescan source or parse twice.
Computed-key metadata survives cover conversion, including literal expressions.

The existing formal initializer handles defaults, rest, arguments, scopes and
iterator cleanup. Arrow lexical this, arguments, super and new.target therefore
use the same function environment as before. Ordinary parenthesized expressions
retain their expression interpretation.

Tests cover nested/default/rest patterns, duplicate names, invalid member or
parenthesized bindings, strict directives, lexical captures, inferred names,
computed keys, source text, iterator close and Realm ownership. Previous rejection
inputs remain positive regression cases. Static and whole-suite acceptance are
recorded separately in TASKS and COORDINATION.

The design follows [the ECMAScript arrow cover grammar and early errors](https://tc39.es/ecma262/2025/multipage/ecmascript-language-functions-and-classes.html#sec-arrow-function-definitions-static-semantics-early-errors)
and reuses the [formal initialization design](formal-patterns.md).

The first full Node run reported 720/721 because arrow-cover retained three old
pattern rejections. Those exact expressions now have positive checks in both
sloppy and strict source contexts; the original failure log is retained.
