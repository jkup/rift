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
