# Canonical String comparison without Intl

String.prototype.localeCompare converts the receiver and comparison argument,
in that order with the string hint, then normalizes both to NFC and compares
UTF-16 code units. It returns -1, positive zero or 1. This defines Rift's
deterministic locale-neutral ordering; language-specific collation and ECMA-402
options remain unsupported. Reserved locale/options arguments are ignored.

Normalization honors canonical equivalence while preserving compatibility-only
differences. A pure lexicographic comparison of normalized values supplies a
consistent ordering, including supplementary characters and lone surrogates.
The pinned host localeCompare is not called: TS-195 found canonical-equivalence
failures there. The normalization provider instead passed 4,788,784 checks from
Unicode 17 on both hosts, as recorded in docs/string-locale-prerequisites.md.

Guest tests cover all five specification equivalence examples, a complete
pairwise ordering matrix, positive zero, prefix ordering, generic conversion,
ignored arguments, abrupt completions, descriptors and defining-Realm errors.
Replacing the public normalize method does not affect comparison. Host string
operations retain the existing atomic-operation resource policy.

References: [ECMAScript localeCompare](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype.localecompare)
and engine262 StringPrototype.mts at 18cdeb03c363eb31d775648a0d070bdc8a26ced1,
which likewise uses NFC followed by string ordering without Intl.
