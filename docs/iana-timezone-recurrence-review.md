# IANA recurrence implementation review

TS-479 implements typed footer rules and internal historical/future offset lookup
on the validated TS-478 data draft. It leaves guest named-zone admission disabled;
identifier policy, gaps/folds and migration of constant-offset consumers remain
required before admission.

The generator retains the pinned historical tables and raw footer text, parses
94 distinct rules, and attaches a shared typed recurrence record to each zone.
The offset provider uses historical lookup first and recurrence only for the
footer interval. Runtime recurrence preserves Julian versus ordinal leap-day
semantics, last-weekday rules, signed transition times, negative DST and southern
seasons. Gregorian cycle normalization incorporates the reviewed endpoint fix.

Current evidence:

- All 440 zones pass 4,962 independent upstream C offsets on Node and native,
  covering first/final transition boundaries and the exact instant endpoints.
- Focused native coverage is 203 static statements with zero dynamic operations;
  all six existing regression groups pass on both hosts.
- The production implementation passes the prior 200,490 cycle cases and 582
  endpoint cases on both hosts, including three synthetic footer rules. These
  runs import the implementation directly, not the earlier prototype.
- Every generated zone's rule matches its parsed footer. Twelve malformed parser
  controls and eight generator corruption/determinism controls pass.

The full Node suite passes 943/943 without skips. All 15 tooling builds, 296
tooling tests and 16 parent-envelope checks pass. The READY snapshot also verifies
every inherited source/fixture file, owned changes, typechecking and deterministic
generation. This is isolated readiness, not integration
acceptance. The canonical Reflect/legacy milestone remains frozen.

Evidence: `build/iana-recurrence-production-results.json`,
`build/iana-recurrence-reference-process.json`, generator/parser control reports
and focused/regression reports in `build/iana-timezone-recurrence-draft/build/`.
