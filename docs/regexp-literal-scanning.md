# RegExp literal delimiter scanning

scanRegExpLiteral finds the end of a literal only after its caller has selected the RegExp lexical goal. It scans raw body text, respecting character classes and backslash sequences, and then consumes ASCII identifier-part flag characters. It preserves UTF-16 offsets and returns slices of the source rather than decoding escapes or matching the pattern.

All four line terminators are forbidden inside the body, including after a backslash and inside a class. Unterminated bodies/classes/escapes and comment openers are rejected. Ordinary comment recognition belongs to the surrounding lexer; this scanner must not turn a comment opener into an empty regex. The existing 100000-unit source limit bounds scanning work.

Flag scanning is deliberately separate from flag validation: duplicates and unknown ASCII flag characters remain in the returned text. A non-ASCII flag boundary is explicitly unsupported; Unicode identifier tables are outside this slice. A backslash after the flags is not an IdentifierPartChar and ends the token. Unicode line separators end the flags normally.

The implementation follows [ECMAScript 2025 literal lexical grammar](https://262.ecma-international.org/16.0/#sec-literals-regular-expression-literals), reviewed alongside [engine262 Lexer at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/parser/Lexer.mts). No implementation code was copied. This change admits no guest syntax; parser-selected rescanning, pattern/flag early validation and fresh object evaluation follow separately.

Focused tests pass both hosts at 77 static statements, zero dynamic. The combined isolated foundation passes 680 Node guests. Full canonical acceptance follows integration.
