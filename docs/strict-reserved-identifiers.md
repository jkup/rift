# Strict reserved identifiers

TS-496, isolated successor to the frozen TS-494 source, 2026-11-12.
Bounded parsing admits implements, interface, package, private, protected, public
and static as identifiers. The declaration collector checks actual identifier
sites against its existing scope strictness, including function names/parameters,
class contexts, references, patterns, catch bindings and labels. It selects the
first strict site by source location. Property names remain distinct.

Preparation certifies strict-reserved-identifier only after complete supported
parsing and scope collection. Public plans retain unsupported provenance for the
strict restriction; the legacy parser retains its existing admission. The shared
predicate avoids changing the unconditional RESERVED set. Contextual let/yield/
await and escaped identifiers remain separate. See the
[strict/sloppy review](strict-reserved-identifier-review.md) for specification
references and the rationale for pairing valid admission with strict rejection.

The new rule is included in the observation type/producer, both closed Script
decoders and the exact codec-closure assertion. Eight real Node codec records,
eight parent envelopes and three closure tests pass; malformed rules and phases
remain rejected. No capability admission is changed.

Node evidence passes all 224 reviewed syntax cases, 56 additional independent
class/function strictness checks, and focused execution/strictness controls.
Execution includes 126 generated sloppy binding/reference/label/iteration cases,
plus direct eval and property controls. Both own and inherited strict eval errors
are catchable SyntaxErrors. The unchanged raw U03 bytes certify at line 17,
column 5 without executing guest code. Typechecking passes.

With the predecessor return/async fixes, the pinned 33-file starter diagnostic
now has 57 expected outcomes across its executable variants and three explicit
module/async-harness profile limitations. All 60 variants remain represented.
This Node diagnostic is not admitted Test262 conformance or native acceptance.
Evidence: build/strict-reserved-starter-diagnostic/ and this draft's build directory.

Full Node regression passes 952/952 without skips; all 35 runner checks pass.
Focused execution and the 280-case reviewed probe pass on both hosts, including
original U03 bytes, with static-only compilation and zero-dynamic coverage.
All 1065 frozen inputs and executable hashes were verified before execution.
An additional 98 independent Node syntax comparisons cover directive handling,
inherited strictness, nested functions, patterns and property names without a
mismatch. All 15 native tooling build/coverage gates and 296 tooling tests pass,
as do eight producer records per host and 16 parent envelopes. Integration and
combined validation passed in the contextual identifiers milestone.
