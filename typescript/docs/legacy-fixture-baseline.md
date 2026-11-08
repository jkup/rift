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

## Builtin follow-ups (TS-058–067)

The selection remains 225 files with the same 15 exclusions. Both hosts agree on
all complete results after diagnostic path normalization at every milestone.

| Change | Reported success | Unchecked completion | Parse error | Runtime error | Reported failure |
| --- | ---: | ---: | ---: | ---: | ---: |
| Array construction/isArray | 50 | 21 | 67 | 86 | 1 |
| Own-property predicates | 51 | 22 | 67 | 84 | 1 |
| Object enumeration | 53 | 22 | 67 | 81 | 2 |
| Array.at | 54 | 22 | 67 | 80 | 2 |
| Array reduction | 55 | 22 | 67 | 79 | 2 |
| Array shift/unshift | 56 | 22 | 67 | 78 | 2 |
| Property descriptor reflection | 56 | 22 | 67 | 77 | 3 |
| Public map/forEach | 58 | 23 | 67 | 75 | 2 |
| Predicate searches | 58 | 23 | 67 | 75 | 2 |
| Array.lastIndexOf | 59 | 23 | 67 | 74 | 2 |

No previously successful or unchecked file regressed. Enumeration advances
`object-keys-values-test.js` to its incorrect expectations that strings have no
enumerable characters. Those two failure messages are retained; the engine and
original fixture are not altered to inflate this diagnostic score.

Reflection lets the array range-error fixture finish and report missing public
map behavior; public iteration then makes it succeed. The callback binding
fixture also succeeds, and the debug callback fixture completes without checks.

Predicate searches advance the phase-two array fixture to its lastIndexOf call;
reverse value search then lets it complete successfully.

Latest reports: `build/legacy-suite-node-uwywPC/report.json` and
`build/legacy-suite-native-SNzOqR/report.json`. These marker-based outcomes remain
separate from semantic test assertions and test262 conformance admission.

## Template literals (TS-068)

Both hosts agree on all 225 complete outcomes: 60 reported successes, 29 unchecked
completions, 58 parse errors, 76 runtime errors and two reported failures. Nine
files advance past parsing: one gains reported success, six complete without
checks, and two reach missing Math or String.indexOf behavior. All 82 previously
successful or unchecked fixtures retain their outcomes. Reports:
`build/legacy-suite-node-1Oxs6c/report.json` and
`build/legacy-suite-native-Yqeh0o/report.json`.
