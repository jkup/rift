# Scoped RegExp modifiers

Scoped `i`, `m` and `s` modifiers enable or disable matching modes inside a
noncapturing group. The parser rejects duplicate, overlapping or invalid flag
sets and retains the original pattern source. Public flags, Unicode mode and
capture numbering do not change.

The compiler passes effective flags through its recursive traversal and stores
them on the instructions that use them. Backreferences compare using the flags
at the reference site. Lookahead and backtracking reuse those immutable choices;
no runtime flag stack or mutable matching mode is introduced.

All 145 reviewed controls pass on both hosts. Focused native semantic/resource
tests and the probe pass static-only compilation and zero-dynamic coverage.
The full Node suite passes 962/962 cases without skips. All 296 tooling tests,
35 runner checks, 15 tooling native gates and both-host producer/envelope checks
pass. The original full run passed 961/962; its sole failure was the historical
assertion that `(?i:a)` is unsupported. Independent reference and old/new
both-host checks justified updating that standalone assertion. Its amended
native test passes separately, with zero dynamic operations. Production inputs
are unchanged between the two runs; the 1082-input snapshots, original test and
failed run remain retained. The first full guest launch stopped before tests
because historical inputs were missing; its log is also retained. Successful
runs use TS-522's validated input closure.

This feature passes combined canonical validation with Date timezone support.

The review and C++ comparison are in docs/regexp-modifiers-review.md. Unscoped
modifiers, lookbehind and Unicode sets mode remain outside this feature.
