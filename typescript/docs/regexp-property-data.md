# Unicode property data preparation

TS-518 prepares complete Unicode 17.0.0 tables in the isolated
`build/regexp-property-data-draft/`. It does not admit property escapes in Rift.
The generated data contains 443 property sets, 1,722 exact aliases and 23,045
normalized intervals: 53 binary properties, 38 general categories and 176
values each for Script and Script_Extensions. Aggregate categories, unassigned
characters, UnicodeData First/Last ranges and Script_Extensions overrides retain
their specified meanings. Unicode License V3 accompanies the generated source.
The input inventory and its hashes are recorded in the
[boundary review](regexp-property-escapes-review.md).

An independent Node process compares membership for all 1,114,112 code points
in each of 441 sets, with no differences. Node 26.13.0 rejects the remaining
two sets: Script and Script_Extensions with value Katakana_Or_Hiragana (Hrkt).
Both values remain in the pinned property aliases. [ECMAScript requires those
aliases](https://tc39.es/ecma262/multipage/text-processing.html#sec-runtime-semantics-unicodematchpropertyvalue-p-v),
and [Unicode 17 explicitly describes the empty Script value](https://www.unicode.org/reports/tr44/tr44-36.html#Property_And_Property_Value_Stability).
The generated sets are empty, including the absence of any Script_Extensions
override. Eight corresponding rejected aliases are recorded separately; this is
not claimed as unanimous reference agreement. The original failed comparison and
the exact discrepancy review remain in `reference*.json` and their logs.

Lookup uses binary search over normalized intervals. Ignore-case membership
checks reverse simple-fold groups, each containing at most four code points,
without expanding property ranges at runtime. Positive and complemented
membership are compared against the independent reference for 1,487 canonical
samples per property, including every nontrivial fold group. The standalone
lookup tests check all aliases, 92,167 interval boundary cases, full-domain
counts/sums and those folding expectations on both hosts.

The initial full native run produced correct outputs, but coverage found two
dynamic operations in string ordering during alias search. Reduced direct and
explicitly typed local comparisons both reproduce `js.compare`; explicit
code-unit comparison has zero dynamic operations. The isolated lookup now uses
that small comparator. Its property tables and license are byte-identical to the
original generation. Original source, binary, reports and source snapshot remain
in `before-static-alias/`. Corrected full validation passes on both hosts with
83 static statements and zero dynamic operations. The two reduced comparisons
also execute correctly but retain their rejected dynamic gates; the code-unit
control executes correctly with nine static statements and no dynamic work.
Fresh generation from copied, hash-verified inputs reproduces all three data,
source and license artifacts byte for byte (`reproduction.json`).

No parser/matcher implementation, canonical acceptance or performance claim is
implied. Engine integration must charge pattern input, preserve class inversion
and property complement ordering, reject invalid aliases/range endpoints, and
retain the existing unsupported boundaries for v-mode and string properties.
