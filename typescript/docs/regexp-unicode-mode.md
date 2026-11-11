# Unicode RegExp matching

Constructors and literals admit the u flag using the same explicit parser and
matcher mode. Matching consumes code points; public indices, captures and
lastIndex remain UTF-16 offsets. Case-insensitive Unicode matching uses the
reviewed Unicode 17 common/simple case-fold table. Legacy matching is unchanged.

Tests cover astral characters and lone surrogates, strict syntax, named captures,
index-pair identity, backreferences, empty-match advancement, replacement,
splitting, search, cloning, coercion order, foreign Realms and resource limits.
Constructor syntax failures are guest SyntaxErrors; invalid literals fail during
preparation. Property escapes, v-mode and lookbehind remain explicitly unsupported.

When lastIndex points inside a surrogate pair, matching starts at the containing
code point and reports its actual UTF-16 start. This follows the checked Node
behavior and keeps match text, indices and lastIndex consistent. It differs from
the literal index-reporting steps in the specification, whose discrepancy is
tracked in [ECMA-262 issue 128](https://github.com/tc39/ecma262/issues/128).
This decision is not evidence of full Unicode RegExp conformance; see the
Unicode-mode review for the reference cases and remaining boundaries.

Isolated and combined acceptance remain pending.
