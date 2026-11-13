# Unicode property escape review

TS-517's boundary and data review is complete. Engine admission remains a
separate task. The TypeScript Unicode parser explicitly rejects property escapes;
C++ passes patterns to RE2 with Unicode matching enabled by default.

The existing C++ executable confirms a limited parity gap: `\p{L}` matches `A`.
Its binary hash is retained, but its build revision has not been established.
It is evidence of observed behavior, not proof of the current source build.

Seven reduced constructor controls separate RegExp creation from method calls.
The plain `a` baseline and `\p{L}` succeed. C++ returns false for the valid
ECMAScript spellings `\p{Letter}`, `\p{Script=Greek}`, `\p{White_Space}` and
`\p{scx=Hira}` on their explicit matching inputs. It accepts `\p{Greek}`,
which the independent ECMAScript reference rejects. The CLI also prints its
final undefined completion; that line is retained separately from test output.
Initial chained-constructor controls inside try printed only that completion;
they are preserved and are not interpreted as property-matching results.

[RE2's grammar](https://github.com/google/re2/wiki/Syntax) permits its own Unicode
class names. [ECMAScript's property matching rules](https://tc39.es/ecma262/multipage/text-processing.html#sec-runtime-semantics-unicodematchproperty-p)
require exact specified names and aliases, including their casing. Bare values
are general categories or allowed binary properties; script values require a
property name. The successor must follow those rules rather than importing RE2
aliases or turning unknown properties into empty matching sets.

Both TypeScript hosts agree on all six initial property controls, reporting
explicit unsupported operation without falsely certifying valid input. The
independent reference verifies five matching expectations and one SyntaxError.
All sources, process results and executable hashes are in
`build/regexp-property-escape-review/`.

The broader review passes 182 explicit controls: 157 valid JavaScript sources
(including 25 constructors whose invalid patterns must throw) and 25 invalid
literal sources. Both Rift hosts agree, and the independent Node reference uses
Unicode 17.0. Four non-Unicode baseline controls already execute; the property
gap remains explicit. Coverage includes exact aliases, rejected casing and
whitespace, class composition, complementary properties with ignore-case,
supplementary characters, surrogates and Script_Extensions defaults. Original
sources and results remain in `build/regexp-property-escape-review/grammar/`.

The pinned data inventory identifies all 53 ECMAScript binary properties and
98 exact binary aliases, six named-property spellings, 38 general-category
values (including aggregate categories), and 176 script values. UnicodeData,
PropList, DerivedCoreProperties, DerivedNormalizationProps, Scripts,
ScriptExtensions, emoji-data, both alias files and CaseFolding provide the
required inputs. ASCII, Any and Assigned need explicit derivation;
Bidi_Mirrored comes from UnicodeData. Script defaults to Unknown, while omitted
Script_Extensions values inherit Script. The generator must preserve those
defaults, UnicodeData First/Last ranges and unassigned code points.

All 13 downloaded inputs, including the specification snapshot, pinned
[Unicode 17 UAX #44](https://www.unicode.org/reports/tr44/tr44-36.html) and Unicode
License V3, retain URLs, retrieval dates, byte counts and SHA-256 hashes in
`build/regexp-property-escape-review/data/manifest.json`. The inventory verifies
every hash and maps every required binary property to its source. Generated
tables must retain the license and reproducible provenance. This inventory
establishes source completeness; it is not full property-table validation.

The current matcher expands case-insensitive ranges into individual folded
characters during compilation. Lowering large properties through that path
would create excessive work. Prefer sorted ranges with binary-search membership
and reverse simple-fold groups. The pinned C/S folding data contains 1,512
mappings in 1,482 groups, with at most four equivalent code points per group.
For Unicode ignore-case matching, property complement precedes folding, while
outer class inversion follows matching: `\\P{Lowercase_Letter}` matches `a`,
but `[^\\p{Lowercase_Letter}]` does not. Keep those operations distinct.

A standalone feasibility probe stores 4,144 category intervals and all reverse
fold groups in typed arrays, visits all 1,114,112 code points and checks category
counts/sums against independently accumulated UnicodeData expectations. It also
checks positive/complementary lowercase membership. Node and native outputs
agree; all 38 analyzed statements compile statically. The initial sandbox linker
failure and unchanged successful retry are retained in `data-probe-native*.json`.
This proves the representation is usable by the compiler, not that the full
matcher or all properties are implemented. No performance benchmark is claimed.

Proceed with a separately owned, isolated complete data generator and exhaustive
membership checks before modifying parser/matcher admission. Require explicit
syntax and resource-limit tests, both-host semantic controls, static coverage
and existing regex regression tests for engine integration. Partial property
tables and v-mode string properties remain excluded.
