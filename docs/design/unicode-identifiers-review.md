# Unicode identifier data review

TS-447, 2026-11-11. Prerequisite review only; no runtime admission change.

The isolated generator reads official Unicode 17.0.0
[DerivedCoreProperties.txt](https://www.unicode.org/Public/17.0.0/ucd/DerivedCoreProperties.txt)
and selects ID_Start and ID_Continue. The retained source SHA-256 is
`24c7fed1195c482faaefd5c1e7eb821c5ee1fb6de07ecdbaa64b56a99da22c08`.
The original header and license link remain in the input file.

Adjacent ranges merge into 684 start intervals and 799 continuation intervals,
covering 145,916 and 149,240 code points respectively. The generated TypeScript
is 31,030 bytes and uses flat numeric arrays with binary search. It has no host
RegExp dependency. This is a simple constant-data implementation candidate,
not a performance claim.

The Node generator compares both properties for every code point through
U+10FFFF against independently populated byte arrays: 2,228,224 comparisons.
A separate TypeScript conformance driver reparses the official source and uses
ordered range traversal to check the generated binary searches over the same
full domain. Both Node checks and native execution pass all 2,228,224 comparisons.
The native build uses static-only and reports 45/45 statements static. This
approves the property-table prerequisite; no guest syntax is enabled here.

Evidence: build/generate-unicode-identifier-review.mjs and
build/unicode-identifier-review/, including the original file, generated source,
independent driver and review.json. RegExp name decoding must additionally
handle ECMAScript's identifier exceptions and escaped/astral code points; these
property tables alone do not implement the name grammar. Keep the unrelated
Unicode transport diagnostic proposal untouched.
