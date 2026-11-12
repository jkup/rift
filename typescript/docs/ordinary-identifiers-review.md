# Ordinary identifier grammar review

TS-508 verifies 170 controls: 76 valid and 94 invalid sources. Independent Node
syntax checks match every expected classification; execution controls also match
their explicit output. Both current Rift hosts reject the entire selection with
matching structured results, without falsely certifying any valid input as a
syntax error. This establishes a missing feature, not a runtime regression.

C++ `read_identifier` supports fixed Unicode escapes, while its comments exclude
raw non-ASCII names and braced escapes. TypeScript currently scans ordinary words
as ASCII, despite already having reviewed Unicode 17 identifier data and a
Unicode-aware private-name scanner. Reuse those prerequisites; do not copy the
C++ scanner's limitations or its unchecked decoded code points.

## Names and syntax need separate representations

The [identifier and keyword rules](https://tc39.es/ecma262/multipage/ecmascript-language-lexical-grammar.html#sec-names-and-keywords)
distinguish decoded identifier names from literal keyword spelling. Escapes must
produce valid start/continuation code points. Names compare by decoded code-point
sequence without normalization. Keyword syntax cannot be spelled with escapes;
reserved-name restrictions still apply to the decoded name.

The controls demonstrate the consequences:

- Escaped `let` can be a sloppy variable, including before `[` and in a for-of
  assignment head. It cannot introduce a lexical declaration.
- Escaped `async`, `get`, `set`, `static` and `of` can name ordinary bindings or
  properties where allowed. They cannot supply modifiers or a for-of separator.
- Escaped `await` and `yield` retain their context-sensitive identifier
  restrictions; they do not become suspension operators.
- Reserved names work as property names, including after a dot, but not as
  ordinary bindings. Strict restrictions also use decoded names.
- Constructor recognition, duplicate constructors, static `prototype` rejection
  and object `__proto__` semantics depend on decoded property names.
- `new.target`, word operators, statement keywords and directive continuation
  require checks of raw spelling. Function source text must preserve escapes.

## Implementation boundary

Add decoded ordinary-name scanning with explicit escape metadata and exact UTF-16
spans. Keep a fast ASCII path, share the reviewed Unicode classification/escape
logic where appropriate, and preserve legacy lexing. Update keyword decisions in
the parser and prologue scanner; changing only `Parser.at` misses direct token-text
checks in primary expressions, operators, iteration lookahead and modifiers.

Admit raw Unicode and fixed/braced escapes throughout the supported Script
grammar. Preserve malformed/unsupported provenance and whole-source audit
precedence; this task does not introduce a new syntax-error certification rule.
Retain historical fixtures and review any changed expectations individually.

Evidence: `build/ordinary-identifier-review/` contains all 170 sources, reference
results, both-host baseline records and `reviewed.json`. The current-source native
diagnostic executable was hash-verified; its 20,435 statements are fully static.
Canonical source was unchanged. Implementation belongs to TS-509 and must remain
isolated until the current contextual-identifier milestone is accepted.
