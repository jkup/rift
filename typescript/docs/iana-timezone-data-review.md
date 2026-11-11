# IANA transition data review

TS-478 implements the internal data slice described in
[the backend review](iana-timezone-backend-review.md). It does not admit named
timezones to guest APIs. Identifier policy, recurrence, local-time resolution and
migration of fixed-offset consumers remain separate requirements.

The isolated provider contains 440 IANA 2026f zone records, 158 raw links and
26,448 transitions. Generated files include release hashes, the build commands
and the upstream license. Exact-name lookup searches zone records only; aliases
are retained for later identifier-policy work. Transition lookup returns an
explicit recurrence request at and after the final transition, including zones
without transitions, rather than extending a terminal offset indefinitely.

Both hosts pass 52,896 transition boundary assertions, range and invalid-input
checks, exact-name lookup tests and nine historical offset cases independently
checked with the pinned upstream C implementation. Five existing UTC/calendar/
Temporal regression groups also pass on both hosts. The corrected focused native
driver has 113 static statements and zero dynamic operations.

The initial provider produced matching outputs but failed the dynamic-operation
gate: direct string ordering in its lookup compiled through a dynamic comparison.
A literal-only reduction did not reproduce the issue; runtime argument and class
field reductions did. Using the existing `stringCompare` helper passed the runtime
control and the complete provider. The provider and ordering assertion now use
that shared helper. No compiler flags or acceptance gates changed. Original
sources, executable, LLVM and reports remain in the draft's `build/initial-dynamic/`;
reduced probes remain in `build/iana-timezone-review/`.

Eight generator controls pass: intact and restored inputs reproduce the checked-in
bytes, while separately corrupted data/code archives, source metadata, license,
zone data and alias data are rejected. All controls leave generated outputs
unchanged. Evidence is in `build/iana-data-generator-controls.json`.

Full corrected Node and tooling validation are pending. This review is not
integration acceptance. The combined Reflect/legacy milestone's 947 source inputs
remain frozen; the provider is isolated in `build/iana-timezone-data-draft/`.
