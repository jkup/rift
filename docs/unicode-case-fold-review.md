# Unicode simple case-fold backend review

TS-453, 2026-11-11. Isolated prerequisite; no guest matching behavior changes.

The generated table uses the C and S mappings from official
[Unicode 17 CaseFolding.txt](https://www.unicode.org/Public/17.0.0/ucd/CaseFolding.txt).
Its source SHA-256 is
`ff8d8fefbf123574205085d6714c36149eb946d717a0c585c27f0f4ef58c4183`.
The original data, Unicode license and generator metadata remain in
build/unicode-case-fold-review/.

There are 1,512 mappings. A 30,327-byte TypeScript module stores sorted numeric
pairs and performs binary search, returning the input for unmapped code points.
It excludes full and Turkic mappings. No host RegExp, locale conversion or
multi-character expansion is involved in classification.

The generator checks the table against a separately populated dense array.
The conformance program independently reparses the official file into a Map.
It checks all 1,114,112 code points, including unchanged values, and verifies
folding idempotence. Eleven targeted cases cover ASCII, Kelvin sign, long s,
Ohm sign, sharp s, Turkish I, astral letters and surrogates.

The complete conformance program passes under Node and native scriptc 0.4.7;
native compilation is static-only and all 38 analyzed statements are static.
Evidence: source.json, native-reviewed.json, case-fold.ts and conformance.ts
under build/unicode-case-fold-review/, generated and checked by
build/generate-unicode-case-fold-review.mjs and
build/review-unicode-case-fold-native.mjs.

This establishes the data/backend prerequisite for Unicode RegExp ignore-case,
not Unicode RegExp conformance. Parsing, traversal, word boundaries, references,
public indices and the documented inside-surrogate compatibility decision still
need integration and their own both-host tests. Preserve the non-Unicode
uppercase algorithm when adding this backend.
