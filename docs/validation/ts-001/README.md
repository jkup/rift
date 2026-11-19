# TS-001 validation evidence

Captured on 2026-11-01, Windows x64, using the pinned compiler contract versions.
These refreshed transcripts accompany the Unicode line-terminator review-fix commit
on `typescript-scriptc-probes` (parent `b677091`). The original 47-case evidence
remains in `b677091`; this revision adds 43 cases for newline/comment boundaries,
source locations, return/throw restrictions and raw Unicode separators in strings.

| Command | Result |
|---|---|
| `npm run typecheck` | pass, no diagnostics |
| `npm run test:runner` | 20/20 pass, no skipped/cancelled/todo tests |
| `npm run test:probes` | 10/10 pass, verified static coverage in each probe |
| `npm run test:guest:node` | 90/90 expected-result cases pass, no skips |
| `npm run test:guest:native` | 90/90 expected-result cases pass, no skips |
| Native CLI coverage | 642/642 static statements |
| Native realm driver coverage | 655/655 static statements |

The JSON files here are unedited copies of successful tool outputs in `build/`:

- `probe-results.json`: Node/native stdout/stderr/status, build and coverage output,
  expected statuses, timings and acceptance verdicts for all ten existing probes.
- `native-build-results.json`: CLI/realm-driver builds and full coverage reports.
- `guest-node-results.json` and `guest-native-results.json`: each case's expected
  stdout/error/status and observed subprocess results. Negative syntax and
  unsupported cases are assertions, not skips. Timeouts/crashes/harness failures
  would be failures; none occurred in the recorded final runs.

Both guest lanes were rebuilt for this fix. All ten probes, runner regressions
and typechecking were re-run after the source changes. Static coverage measures compiler lowering, not semantic test coverage.
These results make no claim about test262 or the C++ suite.

Zig needed approved sandbox library access for linking. The failed initial
sandboxed attempt is described in the compiler contract; it is not included in
these successful acceptance transcripts. No coverage/build/test gate was bypassed.
