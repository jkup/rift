# Historical JavaScript fixture coverage

TS-055 runs the historical JavaScript regression files through the current TypeScript
CLI in both hosts. After building, run from the repository root:

```sh
node tools/legacy-suite.mjs node
node tools/legacy-suite.mjs native
```

Each run snapshots exact fixture bytes and retains process output in a fresh
`build/legacy-suite-*` directory. Exit 1 means some fixtures failed; exit 2 means
the runner could not complete. Selection recurses into
`fixtures/legacy/`, excluding `skipped/` and `temp_*.js`. Excluded files remain listed.

TS-081 also recognizes titled `N passed, M failed` summaries and consistent
`Passed: N/T` / `Failed: M/T` summaries. A standalone all-passed fraction is
accepted; an incomplete partial-pass fraction is not. Counts take the maximum
of markers and summaries, so they are conservative reported counts rather than
a sum that could count the same assertions twice. Positive failure evidence
cannot be erased by a later success summary. Process errors take precedence.
Generic prose such as "all tests passed" remains unchecked.

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

Two additional baseline outcomes need interpretation before feature work:
array-index-validation-test.js:91 assigns a nonnumeric string to array length and
expects execution to continue. The current RangeError agrees with
[ArraySetLength](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-arraysetlength).
throw-comprehensive-test.js:8 deliberately throws an uncaught string and says the
following statement must not run. Preserve both fixtures and their runtime-error
classifications; these first failures are not missing interpreter features.

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

## String search and do-while (TS-069–070)

String.indexOf advances the comprehensive template fixture to reported success.
Do-while support makes all three loop fixtures succeed. Both hosts agree on all
225 complete outcomes: 64 reported successes, 29 unchecked completions, 55 parse
errors, 75 runtime errors and two reported failures. All 90 previously successful
or unchecked fixtures retain their outcomes. Reports:
`build/legacy-suite-node-HDK6EP/report.json` and
`build/legacy-suite-native-bNLeoL/report.json`.

## Math unary and Function apply (TS-071–072)

Both hosts agree on all 225 complete outcomes: 66 reported successes, 30 unchecked
completions, 55 parse errors, 72 runtime errors and two reported failures. Math
adds two reported successes and one unchecked completion. Apply advances the
call/apply/bind fixture to missing bind without changing its runtime-error category.
All 96 prior completed outcomes are retained. Reports:
`build/legacy-suite-node-fVzKVO/report.json` and
`build/legacy-suite-native-Ef21Cn/report.json`.

## Radix literals (TS-075)

Both hosts agree on all 225 complete outcomes: 67 reported successes, 30 unchecked
completions, 53 parse errors, 73 runtime errors and two reported failures. The
numeric-literals fixture reports 15 passing checks; the Math fixture advances
from parsing to missing acos. All 96 prior completed outcomes are retained.
Reports: `build/legacy-suite-node-iIAHfy/report.json` and
`build/legacy-suite-native-jumZjo/report.json`.

## Explicit summaries (TS-081)

All31 runner tests and full tooling290/290 pass. Fresh reports agree on all225 complete results:70 reported successes,26 unchecked completions,53 parse errors,72 runtime errors and4 reported failures. Exactly five classifications changed: GC safety, builtin descriptors and Math gain reported success; integer-overflow safety and string validation expose their explicit failures. All process outputs, fixture bytes and the Node engine hash match TS-080, so this is reporting-only. Existing Node/native533/533 and89 native static gates remain the engine baseline; no engine rebuild was needed. Reports: build/legacy-suite-node-6dBuEf/report.json and build/legacy-suite-native-MgWglH/report.json. Logs: build/fixture-summary-*.

## Hyphenated check markers (TS-131)

The reporter now recognizes exact line prefixes `PASS - ` and `FAIL - ` followed by a non-whitespace label. Embedded prose and empty markers remain unchecked. Existing markers, summary maxima and process-error precedence are unchanged. Both hosts retain identical raw results; only test-getter-setter.js changes classification, now reporting its 17 passing checks. The fixed selection remains 225 files with 15 exclusions: 94 successes, 47 unchecked completions, 37 parse errors, 46 runtime errors and one reported failure. This is a reporting correction, not another engine coverage gain. Reports: `build/legacy-suite-node-TTFZ2h/report.json` and `build/legacy-suite-native-lO2Fkh/report.json`. All 32 runner tests pass.
