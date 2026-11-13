# Legacy RegExp character escape review

TS-520 reviews character escapes in non-Unicode patterns. All 122 explicit
controls pass independent Node expectations and agree between Rift's two hosts:
119 valid JavaScript sources and three invalid regex literals. Forty-one already
complete, including caught u-mode errors; 78 valid sources remain explicitly
unsupported. Two invalid literals remain unsupported and one has a syntax
certificate. No valid control receives a false syntax certificate.

[ECMAScript's Annex B pattern grammar](https://tc39.es/ecma262/multipage/additional-ecmascript-features-for-web-browsers.html#sec-regular-expressions-patterns)
distinguishes decimal backreferences from legacy octal escapes using the complete
capture count. When that decimal reference is unavailable, octal consumption
must restart at the first digit, rather than reinterpret an already consumed
decimal token. Character classes never interpret numeric escapes as references.
Leading octal digits 0–3 consume at most three digits; 4–7 consume at most two.
Digits 8 and 9 are non-u identity escapes. Strict JavaScript source does not
disable this non-u regex grammar.

Control escapes also depend on class context: digits and underscore after `\c`
are controls inside classes. Otherwise malformed `\c` retains a literal
backslash before the following characters. That distinction affects quantifier
binding. Identity `\k` is allowed only when the whole non-u pattern has no named
captures; the presence of named captures also changes its class-context syntax.
Unicode-mode rejection and existing valid references must remain intact.

The existing C++ binary matches the plain baseline and `\123` against `S`. It
returns false for six independently true ECMAScript controls: one-digit octal,
identity `\8`, ordinary and malformed controls, class-digit controls and a
backreference. This is consistent with using a different pattern language;
[RE2 documents octal escapes and its unsupported backreferences](https://github.com/google/re2/wiki/Syntax).
The binary's build revision is unknown, so this is observed executable behavior,
not validation of a current-source C++ build. The CLI's trailing undefined
completion remains separate from each boolean output.

Original sources, reference executions, both-host results and binary hashes are
retained in `build/regexp-legacy-escapes-review/`. The successor should add these
escapes in the existing parser, with explicit greedy-consumption, capture-count,
class, quantifier and resource-budget tests. Preserve unsupported lookbehind,
Unicode sets mode, legacy class-range extensions and quantified assertions.
No engine change is authorized by this completed review alone.
