# Unicode property escapes

Unicode `u` patterns admit `\p{…}` and `\P{…}` for the complete pinned Unicode
17 binary, general-category, Script and Script_Extensions properties. Exact
ECMAScript aliases are required. Bare script names, loose casing, whitespace,
binary assignments and property escapes used as range endpoints are syntax
errors. Non-Unicode identity escapes retain their previous behavior. Unicode
sets mode and properties of strings remain outside this feature.

The parser stores a property index and complement flag in the character-class
part. Matching searches generated intervals without expanding them into
individual code points. Ignore-case matching checks the simple-fold equivalence
class of the canonical input, testing property complement before folding;
outer character-class inversion still happens after membership. This preserves
the distinction between `\P{Lowercase_Letter}` and `[^\p{Lowercase_Letter}]`
under `ui`. Parsing charges each input code unit. Matching charges each class
part; each property lookup has bounds fixed by the pinned tables and fold groups.

The generator verifies every pinned input hash. Run
`node tools/generate-unicode-properties.mjs <input-directory> --check` to verify
the committed output. Source URLs and hashes are retained in
`unicode-properties-provenance.json`, and Unicode License V3 accompanies the
data. The isolated data review checked all 443 sets, 1,722 aliases, 92,167
boundaries and 1,487 fold samples per property on both hosts. Script and
Script_Extensions Hrkt are specified empty sets, despite the reference Node
version rejecting their names; the exact discrepancy review is retained.

Focused semantic/resource checks and all 182 retained grammar controls pass on
both hosts. All 15 native tooling builds, 296 tooling tests, 35 runner tests and
producer/envelope checks pass. Four historical property-rejection expectations
were reviewed against old/new Rift and the reference. Only two standalone tests
changed; both amended tests pass native execution and static coverage. Original
sources, the initial 958/960 run and original native snapshot/report hashes remain
retained. The full Node rerun passes 960/960 with no skips. The isolated feature
is READY; canonical combined acceptance remains pending.
