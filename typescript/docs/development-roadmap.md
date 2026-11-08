# Development roadmap

Updated 2026-11-08 after reviewing recent history through `ec63ebee` and
[Claude's review, PR #82](https://github.com/jkup/rift/pull/82).

## Direction

Keep the readable TypeScript interpreter, explicit completions, Realm isolation,
expected-result tests and native static-coverage gate. Prioritize features a person
can run from the CLI. The recent Windows provenance investigation is deferred:
retain its evidence and unfinished proposal, but do not make further recorder,
COFF or Unicode diagnostic work a prerequisite for ordinary engine development.
This is a priority change under the owner's catch-up instruction, not acceptance
of the failed recorder or a claim of reproducible native builds.

For new work, retain a short change summary, commands, results and limitations.
Put generated reports in ignored `build/` directories. Do not copy the entire
repository's hash inventory for each task. Preserve old evidence until an explicit
archive migration can keep it retrievable; do not rewrite Git history.

The owner clarified the main loop: close the C++ feature/test gap through small,
readable changes. [The C++ fixture baseline](legacy-fixture-baseline.md) now
provides a fixed 225-file diagnostic selection in both hosts. Use its concrete
failures alongside semantic tests to prioritize work; existing C++ runner counts
are not an authoritative conformance score.

TS-066 baseline review: the 67 parse failures include nine first failures on
template literals, six on `for…of`, five on arrows, five on binding patterns,
five on unsupported non-strict block function planning, and four on classes.
TS-068 implements ordinary template literals and interpolation; all nine files
advance past parsing. One reports success, six complete without checks, and two
reach runtime limitations (Math and String.prototype.indexOf). Tagged templates
remain unsupported. These are first-failure counts, not predicted passes: each
file may expose further unsupported behavior afterward.

Inspect `const` as a binding-semantics task, not a parser alias for `let`:
Script local and global lexical records currently admit mutable bindings only.
Acceptance must cover TDZ, required initialization, immutable writes in both
strict and non-strict code, declaration conflicts and cross-unit global state.
The three fixtures first blocked on `const` also include destructuring and loop
declarations, so enabling the keyword alone would not finish that group.

TS-082 checkpoint: Math coverage now includes clz32, fround and scaled hypot;
the original Math fixture reports69 passes. Generic splice fixes the integer
overflow safety fixture (6/6) and lets its simpler companion complete. Both hosts
agree on all225 fixed fixture outcomes:71 reported successes,27 unchecked
completions,53 parse errors,71 runtime errors and3 reported failures. All96
previously successful or unchecked files retain their outcomes. Acceptance and
full validation logs are tracked in TASKS.md and COORDINATION.md. Recent catch-up
commits remain on codex/test262-classification, without a push or merge.

TS-081 corrected fixture reporting to recognize explicit passed/failed numeric
summaries, retain process-error precedence and avoid double counting. Historical
reports are preserved. Unchecked completions are not counted as successes.
TS-083 adds strict bounded JSON parsing: string validation and JSON memory safety
now report 6/6 and 7/7 respectively. Both hosts agree on 73 reported successes,
27 unchecked completions, 53 parse errors, 71 runtime errors and one reported
failure. The remaining reported failure is the preserved object-keys-values
fixture with incorrect expectations for string enumeration. This does not imply
only one engine gap: runtime and parse errors remain separate categories.
TS-084 accepts generic Array.slice with 556/556 guest tests on each host and all
91 native entries passing static gates. The two fixtures first blocked on slice
now reach concat; classifications are unchanged. TS-085 accepts concat with
563/563 guest tests on each host, all 91 native static gates and all 290 tooling
checks. Array-gc-success gains reported success: the fixed baseline now has 74
reported successes, 27 unchecked completions, 53 parse errors, 70 runtime errors
and one reported failure. TS-086 accepts filter with 570/570 guest tests on both
hosts and all native/tooling gates passing. Array-gc-tracking gains reported
success: the baseline is now 75 successes, 27 unchecked completions, 53 parse
errors, 69 runtime errors and one reported failure. Next: stable Array.sort,
including the dedicated comparator regression fixture. Callable JSON revivers and custom Array species construction
remain explicit unsupported behavior; JSON.stringify remains absent.

Two additional baseline outcomes need interpretation before feature work:
array-index-validation-test.js:91 assigns a nonnumeric string to array length and
expects execution to continue. The current RangeError agrees with
[ArraySetLength](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-arraysetlength).
throw-comprehensive-test.js:8 deliberately throws an uncaught string and says the
following statement must not run. Preserve both fixtures and their runtime-error
classifications; these first failures are not missing interpreter features.

## Findings and next work

Completed in this catch-up: ordinary input-test invocation, the five tracked report
overwrites, separation of the historical checkpoint gate, and the CLI Script
migration. CLI validation is 222/222 in each host with fresh native CLI compilation
and full static coverage. The table retains review findings and their acceptance
criteria; legacy removal and the later items remain open.

TS-038 follow-up: active tests now share configurable corpus/scratch paths, and
the planner/ledger/checkpoint helpers write under `build/`. Both offline and
downloaded setup verify all 36 pinned blobs. The full tooling suite passes
281/281 with a separately downloaded corpus and overridden output root, zero
skips, and no historical-evidence changes (`build/portable-full-tests.log`).
Native build prerequisites and historical literal fixtures remain explicit;
only Windows execution has been validated.

TS-039 adds generic Array `push` and `pop` in `185c2cfb`. Both guest lanes pass
232/232, all 72 native entries pass static compilation and coverage, and the
expanded mutation driver covers ordering, accessors, partial failures and budgets.
See [array mutation](array-mutation.md). The shared Realm change preserves the
existing behavior checks while updating exact prototype inventories.

TS-040 completes another report-write audit: parser-dispatch reports, failure
diagnostics, capability isolation copies and Script integration artifacts now
use scratch paths. Full tooling passes 281/281; the final capability-path fix
passes 133 focused checks. Script integration passes all four groups, covering
172 controls in both hosts. No historical content changed. TS-041 puts a current
Script architecture guide ahead of the historical foundation notes.

TS-042 adds generic Array `indexOf` and `includes` in `ddeb51d0`. TS-043/044
restore routine execution of four Script host drivers and nine harness drivers,
each with two runtime inputs and preserved assertions. The current guest suites
pass 270/270 in both hosts; all 73 native entries compile with full static
coverage, and the runner/probe checks pass. The initial entry-point scan still
flags five standalone parser-audit drivers for review.

TS-045 adds those five audit drivers to ordinary tooling tests: all five tests
pass, covering 1318 Node/native child runs with preserved audit matrices and
runtime input orders. The historical whole-parser replay scripts remain intact.
A more precise command-path scan also flags ten earlier Script/global-environment,
bundle and observation-inspection drivers for verification; broad substring
matches in the initial scan were insufficient evidence that a driver ran.

TS-046/047 restore those ten drivers. The guest suites now pass 284/284 in
each host. Additional tooling checks compare 136 metadata snapshots, 135
declaration plans and 154 serializer records against accepted expectations.
TS-048 brings the exact radix oracle into the ordinary tooling command, with
14768 inputs per host and reports under `build/`.

The 89 compiled test drivers now have identified execution routes: 74 through
the guest runner, five through parser audits, three through inspection tests,
four through dispatch tests, one through Script preflight tests, one through
the radix oracle, and one through `npm run test:observations`. This accounts for
driver entry points, not every historical mode or full ECMAScript coverage.

The combined tooling run passes all 290 tests with zero skips
(`build/current-tooling.log`), using the current Node and native builds.

TS-049 simplifies guest driver selection while preserving all 284 complete
results per host. TS-050 adds generic Array `reverse`, including sparse and
inherited elements, accessors, strict failures, partial mutations and budgets.
The expanded guest suites and full tooling suite each pass 290/290 with no
skips. All 73 native entries were rebuilt with full static coverage; runner20
and all ten compiler probes pass. See [array mutation](array-mutation.md).

TS-051 adds generic Array `every` and `some` with callback argument/receiver
checks, hole skipping, live property mutations and short-circuiting. Guest suites
pass 299/299 per host and tooling passes 290/290. Native validation covers all
74 entries: 73 in the full run and the corrected predicate test in a separate
retry. Its inferred-never callback adapter was reduced and removed by declaring
the test callback's completion type. See [predicate iteration](array-predicate.md)
for the retained initial failure and acceptance details.

TS-052 accepts numeric object-literal property names and normalizes their keys
without changing numeric literal syntax. All original structured-outcome source
cases remain, with the newly supported case updated and a computed-key rejection
added. Both guest suites pass 307/307, tooling 290/290, runner20 and probes10.
All 74 native entries pass a fresh full static build in one invocation; existing
parser audit and inspection expectations remain unchanged.

TS-053 bounds native compilation to two concurrent workers by default, with
`RIFT_NATIVE_JOBS=1` available for sequential execution. One measured Windows
run took 233 seconds versus approximately 483 seconds sequentially. All 74
ordered entries, verdicts and coverage reports match, as do all 307 native guest
result records. Runner27 checks subprocess errors, timeout, output overflow and
worker bounds. This changes build scheduling, not engine behavior.

TS-054 adds String `charAt`, `charCodeAt` and `slice`, with UTF-16 and coercion
checks. Both guest suites pass 317/317; all 75 native entries compile statically.
Tooling passes 290/290 after `68c3b018` repairs three stale input-identity
expectations. Runner27 and probes10 pass. See [string methods](string-methods.md).

| Status | Priority | Work | Evidence and completion condition |
|---|---|---|---|
| Done | P1 | Audit which compiled test drivers run in ordinary commands | The Script Realm bootstrap driver was built but only exercised by historical replay scripts. TS-042 adds its 18 checks with two runtime inputs to the regular guest suite. Map remaining native build entries to current test commands and restore missing behavioral checks without invoking historical report writers. A successful build is not a runtime test. |
| Done | P1 | Repair the normal test command | `script-execution-inputs.test.mjs`, introduced in `7f887deb`, requires positional arguments absent under `node --test`. Add no-argument setup without dropping its assertions; retain the explicit invocation. |
| Done | P1 | Stop tests overwriting historical reports | Running `npm run test:test262` changed five initially clean tracked reports in TS-035C/E2A. Write fresh reports under `build/`; restore the old bytes and retain the new run separately. |
| Done | P1 | Separate historical acceptance from regression testing | `script-ledger-checkpoint.test.mjs` invokes an old full-tree preservation check that currently fails on `Claude Roadmap.md`. A routine roadmap edit must not invalidate checkpoint behavior. Keep the historical verifier available, and run current checkpoint API/fault assertions independently. Do not update old hashes to manufacture acceptance. |
| Done | P1 | Make the test suite portable and self-contained | Several tests depend on a user-specific temporary corpus, old native binaries, and executable test helpers under `docs/validation`. Explicitly prepare the pinned corpus, build prerequisites, and relocate scratch work to `build/`. Preserve hard-link/junction tests; distinguish Windows sandbox permission failures from product failures. |
| Done | P1 | Route the CLI through Script execution | Independently reproduced: CLI rejects `for` with `++`, `try/catch`, and `new`, while Script execution prints `10`, `boom`, and `3` for the same programs. Use `prepareBoundedScript` and `evaluateScript`; migrate diagnostics, strict/sloppy behavior and resource tests explicitly. Require freshly built Node/native CLI cases. |
| Open | P2 | Remove the legacy execution path after migration | Migrate the observation driver and host tests before deleting `Environment`, legacy profile branches and the evaluator re-export. A one-line CLI switch alone is not a complete migration. Preserve evaluation-order and Realm tests. |
| Open | P2 | Publish a small, honest conformance baseline | Use the pinned starter corpus with unchanged denominators and separate pass, fail, unsupported, harness, timeout and host-fault outcomes. Verify actual harness behavior before adding syntax solely to parse it. Do not present observation or synthetic fixture results as conformance. |
| Open | P2 | Improve current-state documentation and readability | Add a concise architecture entry point and CLI/internal/unsupported feature table. Format and split source in bounded changes with semantic checks; review parser audit modes and capability objects individually rather than deleting all safeguards wholesale. |
| Open | P2 | Archive large historical artifacts | Inventory size and Windows path lengths, choose a retrievable artifact location, then replace raw tracked artifacts with summaries and references. No mass deletion or history rewrite as part of this review. |

The conformance baseline needs a current admission path: `script-plan.mjs`
still emits blocked selections and `script-capabilities.json` has no entries.
The positional producer can execute requests, but its conformance mode alone
is not evidence of harness validation. Verify the pinned harness and controls
before admitting cases; keep parse-negative, unsupported and harness failures
separate. Current tooling totals remain regression counts. A fresh diagnostic
loads both pinned `assert.js` and `sta.js` successfully in the current Node and
native CLIs (`build/harness-readiness-corrected.json`); this checks startup only,
not assertion behavior or conformance admission.

## Review scope and limits

The recent diagnostic chain includes corrected child teardown, file finalization
and inventory bounds (`97e6d662` → `01b69251`). Source inspection confirms the
corrected adapter attempts both pipe destroys and child unref independently, and
finalization attempts both fsync and close for each descriptor. This is not a new
runtime acceptance of that chain. The pre-existing uncommitted Unicode readiness
proposal is retained, unexecuted and unaccepted.

The most recent production changes reviewed include the positional conformance
producer, immutable input snapshots and preflight producer. The test-command and
evidence-write defects above are confirmed. This is a sampled review, not a claim
that every recent commit is correct. Git history does not establish which model
wrote each change, so no percentage or model attribution is inferred.

Claude's broad prioritization is useful and the CLI gap is independently confirmed.
Its exact size counts are measurements of an earlier main revision, not fresh
measurements here. Keep native checks at implementation acceptance, avoid premature
mass removal of internal checks, and first establish which historical tests are
still valid regression tests. PR #82 remains the review record; it need not be
merged merely to copy its prose into the repository.

## Catch-up validation

- Typecheck and probe-runner tests: passed (20 runner tests).
- Initial full test262 tooling run: failed. Confirmed missing test arguments,
  stale historical preservation hash, and Windows alias-creation permission
  failures. Existing native binaries were exercised, not rebuilt by that command.
- Initial generated reports retained under `build/catch-up-initial-run/` before
  restoring the five tracked historical reports that were clean at task start.
- Targeted rerun: 25/25 tests pass, zero skips, including input snapshot checks
  (94 error controls, 17 capture checks). Reports remain under ignored build paths;
  the five historical reports remain unchanged. Log: `build/catch-up-targeted-tests.log`.
- All ten compiler probes rebuilt and passed Node/native execution and static
  coverage. Log: `build/catch-up-probes.log`. Typecheck and runner 20/20 pass again.
- Checkpoint behavior regression passes after removing historical whole-checkout
  preservation from its normal entry point. All public, boundary, migration,
  literal and fault checks remain; the historical `ts-035e2c/preservation.mjs`
  verifier is unchanged. Log: `build/catch-up-checkpoint-tests.log`.
- The 35 input/ledger tests that encountered sandbox restrictions pass with Windows
  link permissions enabled. Log: `build/catch-up-host-tests.log`.
- The combined run exposed one further historical/current-source mismatch in
  `script-host-services.test.mjs`: its frozen descriptive snapshot required the
  current CLI's old hash despite `currentSourceVerified: false`. Keep the complete
  historical descriptor oracle and assert no build authority, rather than requiring
  current files to equal old source. The focused descriptor test passes.
- Combined tooling run completed: 279/280 passed, zero skips; the only failure was
  the old source-snapshot assertion fixed afterward in `11c9365b`. Its focused
  rerun passed. Thus all 280 checks are accounted for, but no claim is made of a
  single all-green full invocation after that last fix. Log:
  `build/catch-up-full-test262.log`.
- Generated checkpoint directories were moved to
  `build/catch-up-checkpoint-artifacts/`, with a relocation map. Remaining
  portability and scratch-directory work is tracked above.

### TS-087 checkpoint

Both guest suites pass 579/579, full tooling 290/290, runner 31/31 and all ten probes pass. All 92 native entries pass build and static coverage; sort driver 5736/5736 static. All 225 complete fixture results agree: 78 reported successes, 27 unchecked completions, 53 parse errors, 66 runtime errors and one reported failure. Three sort fixtures gain success; all 102 previously completed outcomes remain. Reports: build/legacy-suite-node-sj0Gml/report.json and build/legacy-suite-native-lnirqE/report.json. Logs: build/array-sort-*. Next: toReversed/toSorted, then toSpliced/with to complete the original copy-method fixture.

### TS-088 checkpoint

Both guest suites pass 579/579 with expanded copy assertions, full tooling 290/290, runner 31/31 and all ten probes pass. All 92 native entries pass build and static coverage; array-copy driver 5869/5869 static. All 225 complete fixture results agree: 78 reported successes, 27 unchecked completions, 53 parse errors, 66 runtime errors and one reported failure. All 105 previously completed outcomes remain. The copy-method fixture passes seven checks and reaches toSpliced. Reports: build/legacy-suite-node-Rd4QTx/report.json and build/legacy-suite-native-0dPlKT/report.json. Logs: build/array-copy-value-*. Next: finish copy methods with toSpliced and with, including skipped getter semantics.

### TS-089 checkpoint

Both guest suites pass 579/579 with expanded copy assertions, full tooling 290/290, runner 31/31 and all ten probes pass. Native acceptance covers 91 initial passes plus a successful isolated sort-driver retry after a Zig cache file-open failure; all 92 entries pass static coverage, copy driver 5991/5991 and sort driver 5887/5887. All 225 complete fixture results agree: 79 reported successes, 27 unchecked completions, 53 parse errors, 65 runtime errors and one reported failure. The original copy-method fixture passes all 17 checks; all 105 previously completed outcomes remain. Reports: build/legacy-suite-node-QgxKmb/report.json and build/legacy-suite-native-7jHIxZ/report.json. Initial/retry evidence: build/array-copy-replace-native-initial-results.json and build/array-copy-replace-native-retry-results.json. Logs: build/array-copy-replace-*. Next: String concat/lastIndexOf. Later work includes flat/flatMap and the remaining string transformations; avoid masking missing custom GC harness functions as engine semantics.

### TS-090 checkpoint

Both guest suites pass 579/579, full tooling 290/290, runner 31/31 and all ten probes pass. All 92 native entries pass build and static coverage in the restarted invocation; string driver 6019/6019 static. Initial Node 575/579 exposed unintended legacy registration and a stale Script inventory; correction 3cc581b5 scopes the new methods and updates that assertion. The initial native run was interrupted before correction; logs are retained. All 225 complete fixture results agree: 80 reported successes, 27 unchecked completions, 53 parse errors, 64 runtime errors and one reported failure. The lastIndexOf fixture passes all 13 checks; all 106 previously completed outcomes remain. Reports: build/legacy-suite-node-kx4dYm/report.json and build/legacy-suite-native-45ALXL/report.json. Logs: build/string-concat-lastindex-*. Next: trim methods. Comprehensive string fixture now reaches trim; flat/flatMap, split and case conversion remain follow-up work.

### TS-091 checkpoint

Both guest suites pass 579/579, full tooling 290/290, runner 31/31 and all ten probes pass. All 92 native entries pass build and static coverage in one invocation; string driver 6078/6078 static. All 225 complete fixture results agree: 80 reported successes, 27 unchecked completions, 53 parse errors, 64 runtime errors and one reported failure. All 107 previously completed outcomes remain. Comprehensive string tests now reach split; chaining reaches toLowerCase. Reports: build/legacy-suite-node-tVUzmH/report.json and build/legacy-suite-native-Asf0kF/report.json. Logs: build/string-trim-*. Next: String split with custom protocol dispatch; RegExp construction remains separate.

### TS-092 checkpoint

Both guest suites pass 580/580, full tooling 290/290, runner 31/31 and all ten probes pass. All 93 native entries pass build and static coverage in one invocation; split driver 5994/5994 static. All 225 complete fixture results agree: 80 reported successes, 28 unchecked completions, 53 parse errors, 63 runtime errors and one reported failure. The simple split fixture completes without check markers; all 107 previously completed outcomes remain. Comprehensive strings now reach toLowerCase. Reports: build/legacy-suite-node-7700Xi/report.json and build/legacy-suite-native-BpKNyo/report.json. Logs: build/string-split-*. Next: verify Unicode case-conversion behavior, including contextual sigma, expansions, supplementary characters and lone surrogates, before installing lower/upper methods.

### Native build reliability follow-up

Repeated Windows Zig cache file-open failures have occurred during two-worker native builds (TS-089 sort driver; TS-093 JSON driver). Earlier isolated retries passed without source changes. Investigate cache access/concurrency or host interference using retained build logs; keep original failures visible and do not weaken static coverage or automatically classify arbitrary build failures as transient.


### TS-093 checkpoint

Both guest suites pass 580/580, full tooling 290/290, runner 31/31 and all ten probes pass. Native acceptance covers 92 initial passes plus a successful isolated JSON-driver retry after a Zig cache file-open failure; all 93 entries pass static coverage, string driver 6190/6190. The preliminary case probe passes all 12 explicit triples on both hosts and is 13/13 static. All 225 complete fixture results agree: 80 reported successes, 30 unchecked completions, 53 parse errors, 61 runtime errors and one reported failure. Comprehensive string and chaining fixtures now complete without check markers; all 108 previously completed outcomes remain. Reports: build/legacy-suite-node-0xPenr/report.json and build/legacy-suite-native-Dssvac/report.json. Initial/retry evidence: build/string-case-native-initial-results.json and build/string-case-native-retry-results.json. Logs: build/string-case-*. Unicode version alignment remains an audit follow-up; current evidence is targeted. Next: iterative flat/flatMap with sparse traversal, callbacks and explicit species limitations.

### TS-094 checkpoint

Both guest suites pass 581/581, full tooling 290/290, runner 31/31 and all ten probes pass. All 94 native entries pass build and static coverage in one invocation; flatten driver 6084/6084 static. All 225 complete fixture results agree: 82 reported successes, 30 unchecked completions, 53 parse errors, 59 runtime errors and one reported failure. Both phase-three array fixtures now report success; all 110 previously completed outcomes remain. Reports: build/legacy-suite-node-RqpMDg/report.json and build/legacy-suite-native-WfGp6h/report.json. Logs: build/array-flat-*. Next: Number conversion/construction and integer predicates; numeric parsing and formatting follow separately.

### TS-095 checkpoint

Both guest suites pass 582/582, full tooling 290/290, runner 31/31 and all ten probes pass. All 95 native entries pass build and static coverage in one invocation; Number driver 6096/6096 static. Initial Node 578/582 exposed an invalid direct-slot test and stale noncallable-Number expectations; corrected tests use ordinary guest construction and retain namespace rejection via Math. All 225 complete fixture results agree: 82 reported successes, 30 unchecked completions, 53 parse errors, 59 runtime errors and one reported failure. All 112 previously completed outcomes remain; the number fixture now reaches parseInt. Reports: build/legacy-suite-node-5wEOj6/report.json and build/legacy-suite-native-hMH2RE/report.json. Logs: build/number-constructor-*. Next: parseInt/parseFloat with explicit prefix grammar, conversion order and verified binary64 rounding.

### TS-096 checkpoint

Both guest suites pass 583/583, full tooling 290/290, runner 31/31 and all ten probes pass. All 96 native entries pass build and static coverage in the corrected invocation; parsing driver 6144/6144 static. Initial Node checks exposed two stale global-inventory expectations; the initial native build was stopped before correcting them and retained. All 225 complete fixture results agree: 82 reported successes, 31 unchecked completions, 53 parse errors, 58 runtime errors and one reported failure. All 112 previously completed outcomes remain; exception-handling-fix-test.js now completes without check markers and the number fixture reaches formatting. Reports: build/legacy-suite-node-GK5iCZ/report.json and build/legacy-suite-native-L6u409/report.json. Logs: build/number-parse-*. Next: Number toFixed/toExponential/toPrecision, contingent on explicit rounding probes.

### TS-097 checkpoint

Both guest suites pass 584/584, full tooling 290/290, runner 31/31 and all ten probes pass. All 97 native entries pass build and static coverage in one invocation; formatting driver 6190/6190 static. The corrected runtime-input formatting probe is 6/6 static with zero dynamic operations; the initial direct Number conversion probe exposed a dynamic operation and remains retained. All 225 complete fixture results agree: 83 reported successes, 31 unchecked completions, 53 parse errors, 57 runtime errors and one reported failure. number-quick-test.js now reports success; all 113 previously completed outcomes remain. Reports: build/legacy-suite-node-36NZ2v/report.json and build/legacy-suite-native-tYKaSA/report.json. Logs: build/number-format-*. Next: Object preventExtensions/isExtensible, seal/isSealed and freeze/isFrozen, including arrays, accessors and symbols.

### TS-098 checkpoint

Both guest suites pass 585/585, full tooling 290/290, runner 31/31 and all ten probes pass. All 98 native entries pass build and static coverage in one invocation; integrity driver 6249/6249 static. All 225 complete fixture results agree: 84 reported successes, 31 unchecked completions, 53 parse errors, 56 runtime errors and one reported failure. frozen-sealed-typeerror-test.js now reports success with 17 checks; all 114 previously completed outcomes remain. Reports: build/legacy-suite-node-799kx0/report.json and build/legacy-suite-native-fAssOl/report.json. Logs: build/object-integrity-*. Next: Object.defineProperties and Object.create, preserving descriptor collection before application and partial writes on application failure.

### Current bootstrap inventory readability — addressed in TS-103

Current builtin inventories are repeated in script-realm-bootstrap.ts, harness-formatting.ts and harness-errors-a.ts. TS-096 exposed stale expectations in the last driver; the prototype metadata dispatch also contains a long inline method-length expression. Review these current test contracts for a small, readable test-only inventory representation and clearer metadata checks. First distinguish intentional independent coverage from accidental duplication; preserve historical frozen inventories and do not derive expected metadata from implementation registration. This is a follow-up, not authority to relax acceptance checks.

### TS-099 checkpoint

Both guest suites pass 586/586, full tooling 290/290, runner 31/31 and all ten probes pass. All 99 native entries pass build and static coverage in one invocation; creation driver 6298/6298 static. All 225 complete fixture results agree: 84 reported successes, 32 unchecked completions, 53 parse errors, 55 runtime errors and one reported failure. test-object-defineProperties.js now completes without check markers; all 115 previously completed outcomes remain. Reports: build/legacy-suite-node-GiKYPd/report.json and build/legacy-suite-native-2JEM2M/report.json. Logs: build/object-create-*. Next: own-property names, symbols and descriptors; prototype inspection/mutation follows separately. Current inventory readability follow-up is recorded above.

### TS-100 checkpoint

Both guest suites pass 587/587, full tooling 290/290, runner 31/31 and all ten probes pass. All 100 native entries pass build and static coverage in one invocation; reflection driver 6337/6337 static. Initial Node 586/587 exposed concurrent TypeScript emission by the probe runner during guest module loading; a no-source-change rerun after emission passed. The original log is retained and compiler-contract.md now requires emission/Node-reader serialization. All 225 complete fixture results agree: 84 reported successes, 32 unchecked completions, 53 parse errors, 55 runtime errors and one reported failure. All 116 previously completed outcomes remain; the function-descriptor fixture reaches getPrototypeOf. Reports: build/legacy-suite-node-9Uf30A/report.json and build/legacy-suite-native-eF9skc/report.json. Logs: build/object-reflection-*. Next: Object identity/prototype operations, including bounded cycle checks without duplicate traversal.

### TS-101 checkpoint

Both guest suites pass 588/588, full tooling 290/290, runner 31/31 and all ten probes pass. All 101 native entries pass build and static coverage in one invocation; prototype driver 6382/6382 static. Probe emission completed before Node readers, with no output race. Deep 2,000-link inspection/mutation passes and interruption preserves the old prototype. All 225 complete fixture results agree: 84 reported successes, 32 unchecked completions, 53 parse errors, 55 runtime errors and one reported failure. All 116 previously completed outcomes remain; the function-descriptor fixture reaches Object.assign and the newer Object fixture reaches fromEntries. Reports: build/legacy-suite-node-PM6tA2/report.json and build/legacy-suite-native-scW0N8/report.json. Logs: build/object-prototype-methods-*. Next: Object.assign and propertyIsEnumerable, preserving getter/setter order and partial writes.

### TS-102 checkpoint

Both guest suites pass 589/589, full tooling 290/290, runner 31/31 and all ten probes pass. All 102 native entries pass build and static coverage in one invocation; assignment driver 6403/6403 static. All 225 complete fixture results agree: 84 reported successes, 33 unchecked completions, 53 parse errors, 54 runtime errors and one reported failure. test-object-function-descriptors.js now completes and prints 20 passed, 0 failed; its summary is not a recognized check marker and remains classified unchecked. All 116 previously completed outcomes remain. Reports: build/legacy-suite-node-r44VJS/report.json and build/legacy-suite-native-mThG5d/report.json. Logs: build/object-assign-*. Next: current inventory readability/duplication audit, followed by public Symbol APIs.

### TS-103 checkpoint

Both guest suites pass 589/589 with no skips; tooling 290/290, runner 31/31 and all ten probes pass. All three affected native test drivers pass fresh static-only builds and separate static coverage gates. Literal parity checks preserve globals, Object keys/arities and 63 prototype method occurrences. Production sources are unchanged; the other native entries and fixed C++ fixture results retain the TS-102 baseline, not a new full rebuild. Evidence: build/bootstrap-inventory-{parity.log,native-results.json,node.log,native.log,tooling.log}. Shared expectations are literal test data, independent of runtime registration; all three drivers and frozen historical inventories remain intact.
