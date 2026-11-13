# RegExp lookbehind

Positive and negative lookbehind compile their bodies backward while preserving
alternative priority and source-order capture numbering. Consuming instructions
carry an immutable direction beside their scoped flags. Nested assertions select
their own direction; captures retain ascending UTF-16 ranges.

The existing iterative assertion stack restores cursor positions and makes
successful assertions atomic. Capture clearing, empty-iteration guards and
operation budgets remain in the shared matcher. Unicode backward reads consume
whole code points; non-Unicode reads consume code units. No host RegExp executes
guest patterns.

Focused Node validation covers the review's 19 expected match/index cases,
16 additional reference controls, malformed/quantified lookbehind and every
parser/compiler/matcher budget cutoff for a representative backward pattern.
The isolated successor passes all 990 Node guests, 94 diagnostic controls on
each host, 296 tooling tests and 35 runner checks. Focused execution, the
diagnostic probe, 15 tooling drivers and eight amended regression tests pass
25 fresh native static-only/zero-dynamic gates. Producer and envelope checks
preserve the closed syntax-error rules.

Eight historical tests retain their original inputs with reviewed expectations:
lookbehind now parses and executes, and a top-level return followed by a
supported lookbehind literal certifies the return syntax error. The original
982/990 ledger, tests and source snapshot remain archived. Only those eight
tests changed after the native/tooling freeze; production inputs are unchanged.
The complete Node rerun and fresh native checks cover the amended tests.

READY for integration after the modifiers/Date milestone is accepted. Canonical
combined validation remains pending.

See regexp-lookbehind-review.md for the semantic design and references. Unicode
sets mode and legacy quantified-lookahead expansion remain separate work.
