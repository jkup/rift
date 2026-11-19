# Development roadmap

Known followups as of 2026-11-19.

## Accepted foundation

Rift is now a TypeScript/scriptc project. The bounded Test262 comparison is
complete: 32,366 files pass on both hosts versus 17,785 for the retired engine,
over the same 53,751-file selection. The [comparison evidence](validation/test262-count-milestone/README.md)
retains primary counts, the metadata-only followup and harness differences.
This is a pass-count milestone, not full conformance.

Readability gates enforce formatting, lint and measured structural limits.
See [CI coverage](ci.md) for automated checks and the
[validation guide](usage.md#validation) for local Node and native checks.

## Concrete followups

- Native numeric formatting: Test262's
  `built-ins/Number/prototype/toPrecision/exponential.js` passes in Node-hosted
  Rift but fails natively.
- Eval diagnostic source tracking: sixteen comparison cases report
  `unregistered Script source`.
- Escaped class-name source ranges: two comparison cases report
  `invalid class source range`.
- Comparison adapter: 164 staging tests use nested harness filenames it rejects.
  These are runner limitations, not engine crashes.
- Continue reducing measured structural debt through the
  [readability ratchet](readability.md), without increasing allowances.

See the [feature inventory](feature-inventory.md) for remaining language/API gaps.
Discuss substantial work in a GitHub issue before implementation.
Use expected-result Node regressions and relevant fresh native checks; retain
static-only compilation and zero-dynamic coverage. Exhaustive native rebuilds
are reserved for broad integration/toolchain changes or evidence of wider issues.

The older detailed migration roadmap remains in Git at
`ee58390b:docs/development-roadmap.md`. Feature notes and saved validation remain
available in this directory; historical plans are not active assignments.
