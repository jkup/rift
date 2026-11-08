# C++ fixture coverage

TS-055 runs the C++ project's regression files through the current TypeScript
CLI in both hosts. After building, run from `typescript/`:

```sh
node tools/legacy-suite.mjs node
node tools/legacy-suite.mjs native
```

Each run snapshots exact fixture bytes and retains process output in a fresh
`build/legacy-suite-*` directory. Exit 1 means some fixtures failed; exit 2 means
the runner could not complete. Selection follows `test-runner.js`: recurse into
`test/`, excluding `skipped/` and `temp_*.js`. Excluded files remain listed.

The initial results at engine commit `75a0e359` agree in both hosts:

| Outcome | Files |
|---|---:|
| Reported success (PASS/✅ output, no FAIL/❌ output) | 43 |
| Completed without reported checks | 21 |
| Reported failure | 1 |
| Parse error | 71 |
| Runtime error | 89 |
| Timeout, output limit or host fault | 0 |
| Selected total | 225 |
| Excluded | 15 |

All 225 complete results agree after normalizing diagnostic file paths. Reports:
`build/legacy-suite-node-PxIJQm/report.json` and
`build/legacy-suite-native-ObQ14r/report.json`.

These are diagnostic fixture outcomes, not test262 conformance or a measured
C++ comparison. The C++ executable was not run. Files may contain demos, weak
assertions or intentionally uncaught errors. Unlike the old runner, this command
does not inject simulated GC helpers: ten runtime failures name `gc`, `gcStats`
or `createArray`. Those are harness dependencies, not evidence of broken guest
semantics. A successful file with no checks is kept separate.

Useful next gaps include Array and Boolean constructors (six and three first
failures), update expressions (four `--` failures and one prefix `++` failure),
and missing array/object/string methods (35 not-callable failures). Templates
block nine files and for-of blocks six. First-failure counts overlap later gaps;
they do not predict how many complete files an implementation will pass.

Add precise semantic regressions for each change, then rerun this fixed selection
to see which files advance. Preserve failures and denominators; do not rewrite
the C++ fixtures to fit the TypeScript subset.

## Update-expression follow-up (TS-056)

Both hosts now report 46 successes, 21 unchecked completions, 67 parse errors,
90 runtime errors and one reported failure, still across all 225 selected files.
All 64 previously completed files retained their outcomes. The comparison
fixture and both increment/decrement fixtures now report success. The array-index
fixture advances to an invalid array-length assignment, which correctly throws
RangeError despite its older comment expecting success. Do not copy that behavior
from the C++ fixture into the engine.

Reports: `build/legacy-suite-node-RomWqv/report.json` and
`build/legacy-suite-native-wSqNPO/report.json`; all complete results agree after
diagnostic path normalization.

## Boolean follow-up (TS-057)

Both hosts report 49 successes, 21 unchecked completions, 67 parse errors,
87 runtime errors and one reported failure. The three Boolean files now succeed;
all previously completed files retain their outcomes. All 225 results agree
after diagnostic path normalization. Reports:
`build/legacy-suite-node-wYAtgS/report.json` and
`build/legacy-suite-native-rmFt3P/report.json`.
