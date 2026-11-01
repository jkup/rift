# TS-001 validation evidence

Captured on 2026-11-01, Windows x64, using the pinned compiler contract versions.
Implementation revision: `a016967` on `typescript-scriptc-probes`. Documentation
and backlog-only changes following that revision do not affect the compiled code.

| Command | Result |
|---|---|
| `npm run typecheck` | pass, no diagnostics |
| `npm run test:runner` | 20/20 pass, no skipped/cancelled/todo tests |
| `npm run test:probes` | 10/10 pass, verified static coverage in each probe |
| `npm run test:guest:node` | 47/47 expected-result cases pass, no skips |
| `npm run test:guest:native` | 47/47 expected-result cases pass, no skips |
| Native CLI coverage | 644/644 static statements |
| Native realm driver coverage | 657/657 static statements |

The JSON files here are unedited copies of successful tool outputs in `build/`:

- `probe-results.json`: Node/native stdout/stderr/status, build and coverage output,
  expected statuses, timings and acceptance verdicts for all ten existing probes.
- `native-build-results.json`: CLI/realm-driver builds and full coverage reports.
- `guest-node-results.json` and `guest-native-results.json`: each case's expected
  stdout/error/status and observed subprocess results. Negative syntax and
  unsupported cases are assertions, not skips. Timeouts/crashes/harness failures
  would be failures; none occurred in the recorded final runs.

The probe run preceded the final additions to guest tests; probes themselves and
their runner were unchanged. Both recorded guest runs include those final changes.
Typecheck and runner regression tests were also re-run after the implementation
commit. Static coverage measures compiler lowering, not semantic test coverage.
These results make no claim about test262 or the C++ suite.

Zig needed approved sandbox library access for linking. The failed initial
sandboxed attempt is described in the compiler contract; it is not included in
these successful acceptance transcripts. No coverage/build/test gate was bypassed.
