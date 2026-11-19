# Retained attempts

- An initial edit command tried the Windows python alias. It failed before any
  write: `python.exe ... The file cannot be accessed by the system`. Applied the
  patch directly instead. No Python dependency was added.
- An initial npm typecheck ran at repository root: `Missing script: typecheck`.
  Corrected cwd to typescript.
- Initial driver typecheck found readonly-array mutation casts needed exact or
  readonly element types (TS4104), source guard is `source-units` (TS2367), and
  the Realm API is `globalEnvironment` (TS2339). Corrected test code to the existing
  contracts. Literal ranges and expected source outcomes were unchanged.
- `initial-record.txt` / `initial-coverage.txt` retain SC1090 at declaration-node
  comparison and standalone unreachable Realm-shape diagnostics. Explicit
  function discriminant narrowing fixes SC1090; integrated Realm construction
  removes unreachable standalone shape diagnostics.
- `dynamic-record.txt`, `driver-coverage-attempt.txt`, `dynamic-attempt.txt` retain
  the rejected one-dynamic-statement integrated result. `narrowed-coverage.txt`
  retains the rejected SC6001 common-type annotation. The source identity
  reduction reproduces both failures and the adopted matching-shape bridge.
- During the annotation replacement, a stale `const sourceUnit: SourceText`
  line produced TS2304 (`Cannot find name SourceText`) and SC0001. Removed the
  stale unused line, then typecheck and integrated coverage passed. The final
  coverage is `source-identity-coverage.txt`; initial syntax-error output remains
  documented here rather than being represented as a successful compiler run.
- `native-driver-attempt.txt` retains sandbox linker SC3004: Zig could not find
  its installation directory. Approved execution with installed Zig library
  access passed (`native-driver-build.txt`). No pin/workaround/coverage change.
- Early inherited replay runs overlapped the full build and were not used as
  final rebuilt evidence. After the full native suite succeeded, all inherited
  replays were run again; committed replay outputs are the final rebuilt runs.
- Node's existing subprocess helper emits DEP0190 for shell:true npm execution;
  suite exit statuses and all test counts pass. This is not a guest diagnostic.
