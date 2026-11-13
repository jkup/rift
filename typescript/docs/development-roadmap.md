# Development roadmap

Updated 2026-11-13. The original catch-up review covered history through `ec63ebee` and
[Claude's review, PR #82](https://github.com/jkup/rift/pull/82).

## Current checkpoint

Compiler investigation: TS-465's full-engine private field-key narrowing fails
with SC2003; a local key capture passes focused native validation. Smaller
controls compile, so the trigger is not yet minimized. Preserve this distinction
when reviewing the [compiler evidence](validation/ts-465-private-key-union/README.md).

The accepted lexical milestone passes 961/961 guests on each
host, 296/296 tooling checks, and all 468 native static gates.
The unchanged 225-file C++ corpus has 191 completions: 117 reported successes and
74 unchecked completions. Remaining outcomes: 2 parse errors, 31 runtime
errors and 1 reported failure(s). These are diagnostic fixture results, not a
Test262 conformance score.

Classes, Promise combinators/checkpoints and bounded RegExp protocols/literals
are accepted. Incremental lexing and arrow cover parsing are integrated.
Array.of/from/fill/copyWithin, String.raw/repeat/padStart/padEnd and Realm-local
Math.random, JSON reviver/stringify, substring/substr, String.at, trim aliases,
matchAll, computed object keys, shorthand, globalThis, named functions, separate
function setup/body execution, prototype setters, object spread and replaceAll
are accepted. Context and pending-operand probes protect the suspension boundary.
Binary/reference helpers and generator execution now include yields, delegation,
catch/finally, bindings, assignments, throws, destructuring, loops, labels, switch
and methods. Formal and arrow binding patterns are accepted. Both hosts complete
the unchanged generator suite (88 reported checks) and generator-destructuring
fixture. Binary, conditional, unary and nested-yield expressions plus suspended
if/while/do-while conditions are accepted. Async functions, await, methods, async iterator acquisition and for-await-of are
accepted. Async arrows, lexical conflicts, generator queues, methods and delegation
are accepted. Suspended property reads, call/constructor arguments, arrays, templates and
for-loop conditions are accepted. For-loop declaration/expression initializers, iteration sources, nested
assignments, compound/property targets and var declaration lists are accepted.
Property updates, computed super reads/calls/writes/updates/deletion and async
super constructor arguments are accepted. Nested destructuring values,
nullish/logical operators, optional chains and class heritage/computed keys
now preserve suspended evaluation contexts. Tagged templates preserve call references and cache frozen arrays per Realm/site.
Exact BigInt values, arithmetic, literals, coercion and width conversion are accepted. The ISO calendar/UTC nanosecond backend passes; Temporal Instant and PlainTime core/serialization are accepted. Numeric/named backreferences, lookahead, Unicode/escaped capture names, disjoint duplicates and Unicode u-mode matching are accepted. Unicode property escapes and legacy character escapes are accepted. Unicode sets mode remains unsupported; lookbehind has passed isolated validation and awaits integration.

Keep the [generator activation boundary](generator-boundary.md) intact as
nested expression/async support expands. Retain explicit completions and prove that
resuming from another session restores caller state and uses current budgets.
Zoned Temporal, public field initializers, static blocks, private fields/methods/accessors and private-in are accepted. Reflect methods and legacy escape/unescape are accepted. Pinned IANA named timezones are accepted through Temporal APIs, including local-time disambiguation, transitions and calendar arithmetic. System timezone discovery, Intl and additional calendars remain gaps.

Temporal fixture audit (2026-11-10): eight of the nine original Temporal fixtures
call constructors without new, including test-temporal-plain-date.js:28 and
test-temporal-duration.js:28. The [current Temporal constructor contract](https://tc39.es/proposal-temporal/#sec-temporal-plaindate)
requires TypeError for those calls. Keep these corpus bytes unchanged and add
standards-correct tests separately when implementing Temporal; making every old
fixture pass would preserve incorrect constructor behavior. BigInt and reviewed
calendar/time-zone support remain independent prerequisites for the relevant types.

The [weak-storage probes](native-host-prerequisites.md) fail the static contract;
[Date local-time probes](date-host-boundary.md) disagree across named zones on
Windows; [locale comparison](string-locale-prerequisites.md) violates canonical
equivalence in the pinned native runtime. These need reviewed backend work,
not strong-map substitutes, fixed time-zone offsets or ASCII approximations.
The [JSON scanner measurement](json-scanner-measurement.md) did not justify a
rewrite. Preserve malformed/nonstandard-helper fixtures and the classified
disagreements below.

## Direction

Documentation follow-up: README.md still describes early foundation limits,
including unsupported generators, async syntax and tagged templates that are now
implemented. Refresh that summary against the accepted feature inventory after
the modifiers/Date milestone; preserve the active CLI README snapshot until its
validation and promotion finish. This documentation gap does not block runtime
validation and should not be mistaken for a current engine limitation.

Unicode property escapes: the boundary review and complete Unicode 17 data
preparation pass independently of engine integration. The 443 generated sets
have both-host lookup/folding checks and zero dynamic operations. Retain the
reviewed empty-Hrkt reference disagreement and the reduced string-ordering
compiler evidence. TS-519's parser/matcher integration is accepted; see
[data validation](regexp-property-data.md). Do not expand large properties into
individual characters during pattern compilation.

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

The [validation footprint review](validation-input-footprint.md) establishes a
576.88 MB archive input set, down from 2.02 GB. All 296 unchanged tooling tests
pass with the same native binaries and verified input hashes. Two earlier
failures exposed setup omissions and manifest-driven dependencies; both remain
retained. The scoped-modifier successor now uses this exact validated copy set.
Review changed dependencies again, and preserve the original archives.

The owner clarified the main loop: close the C++ feature/test gap through small,
readable changes. [The C++ fixture baseline](legacy-fixture-baseline.md) now
provides a fixed 225-file diagnostic selection in both hosts. Use its concrete
failures alongside semantic tests to prioritize work; existing C++ runner counts
are not an authoritative conformance score.

Contextual `let`, `yield` and `await` identifiers, strict reserved-name checks and
async Statement certification are accepted. Separate grammar context protects
async/generator parameters; `let` declaration lookahead keeps expression admission
distinct from lexical declarations. Original fixtures and reviewed expectation
migrations remain intact. The full combined validation passes on both hosts.

Unicode identifiers and fixed/braced escapes are accepted. Both hosts pass
956/956 guests, all 463 native gates and the full tooling/probe checks. All 225
corpus records agree across hosts and retain 191 prior completions, with one
reviewed diagnostic-only change in an invalid fixture. Raw keyword spelling
remains distinct from decoded names.

Script whitespace, legacy numeric/string literals, Unicode property escapes and
legacy RegExp character escapes are accepted and published to main at 11d79ce0.
All 961 guests pass on both hosts, alongside 468 native static gates, 296 tooling
tests, 35 runner tests and ten compiler probes. The unchanged 225-file corpus
retains all 191 preceding completions. Original tests and reviewed expectation
migrations remain preserved; see the [legacy escape review](regexp-legacy-escapes-review.md).

[Scoped RegExp modifiers](regexp-modifiers-review.md), Date conversion helpers,
Realm-local Date behavior and CLI timezone selection are integrated in four
separate commits. Their combined 1084-input freeze matches the final READY
successor. All 989 Node guests, runner checks, compiler probes and the unchanged
corpus pass; the fresh 471-entry native matrix is running. Publication waits for
complete both-host acceptance. The C++ binary's unscoped and duplicate-flag
RegExp extensions remain outside ECMAScript admission.

Lookbehind is READY as a separate successor: 990 Node guests, 94 controls per
host, 25 native static/zero-dynamic gates and 296 tooling tests pass. Eight
historical tests retain their original inputs with independently reviewed
expectations; the original failing run and source snapshot are archived.
Production inputs were unchanged during this migration. Integrate only after
the modifiers/Date milestone is accepted. Then refresh the starter diagnostic's
old unsupported-lookbehind control, retaining its original input and denominator.

The [Date timezone review](date-named-zone-review.md) replaces the unsuitable
host local-time boundary with the accepted IANA provider. Pure Date conversion
helpers are READY with 963 Node guests and the required native/tooling checks.
The complete Realm-configured Date successor is READY: 964 Node cases, 58
controls on each host, 17 fresh native static gates and 296 tooling checks pass.
Historical offset seconds, setter coercion order, range edges and defining-Realm
behavior have explicit expectations. UTC remains the default. TS-529 now adds
a leading `--time-zone <identifier>` CLI option in an isolated successor;
all 25 controls pass on both hosts, including invalid configuration before source
I/O or execution and UTC defaults under a different host timezone. The CLI
successor is READY with 989 Node cases, a fresh native static gate and all 296
tooling checks. Four initial sandbox link-permission failures remain preserved;
the unchanged full rerun passed with host access. These successors are not yet
included in the accepted canonical counts above.

The [lookbehind review](regexp-lookbehind-review.md) records the backward
matcher/capture design and independent reference controls. The isolated successor
has completed validation as described above; canonical lookbehind admission
remains separate from the modifiers/Date milestone.

The [range compilation review](regexp-range-compilation-review.md) found that a
wide Unicode ignore-case range exhausts the step budget while expanding its
members. TS-534's isolated candidate uses fold-group interval lookup for wide
ranges and retains the existing small-range path. The successor is READY: 991 Node guests, 34 controls per host,
19 fresh native gates, 296 tooling tests and the revised native performance
comparison pass. Its one reviewed budget expectation retains the original input
and limit. It joins lookbehind only after modifiers/Date acceptance; neither
change is included in accepted counts yet.

## Historical feature checkpoints

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

Promise follow-up review: `promise-try.js` expects `Promise.try(42)` to throw
synchronously. ECMAScript 2025 [Promise.try](https://262.ecma-international.org/16.0/#sec-promise.try)
instead creates the capability first, calls the callback, and rejects the returned
promise when the callback is not callable. Preserve the fixture and flag this
expectation when Promise support reaches it. This is a specification review, not
a newly executed fixture result. The pinned engine262 implementation also differs
from the published 2025 allocation order here; follow the specification rather
than copying that implementation.

## Catch-up review and historical checkpoints

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

### TS-104 checkpoint

Both guest suites pass 590/590, tooling 290/290, runner 31/31 and all ten probes pass. All 103 native entries pass fresh build and static coverage checks; Symbol driver 6444/6444 static. The initial Node run found four stale bootstrap/constructor-harness expectations; corrected inventories retain accessor freshness and assert the rejecting Symbol construct slot. The initial native build was stopped for that semantic correction and its log retained. All 225 complete fixture results agree: 84 reported successes, 35 unchecked completions, 53 parse errors, 52 runtime errors and one reported failure. symbol-basic.js and symbol-property.js now complete, printing only true values without recognized check markers; all 117 previous completions remain. Reports: build/legacy-suite-node-e7r1IG/report.json and build/legacy-suite-native-6voazU/report.json. Logs: build/symbol-factory-*. Next: Symbol.for/keyFor with explicit cross-Realm registry identity.

### TS-105 checkpoint

Both guest suites pass 591/591, tooling 290/290, runner 31/31 and all ten probes pass. All 104 native entries pass fresh build and static coverage checks; registry driver 6460/6460 static. All 225 complete fixture results agree: 84 reported successes, 36 unchecked completions, 53 parse errors, 51 runtime errors and one reported failure. symbol-registry.js now completes and prints seven true values without recognized check markers; all 119 previous completions remain. Reports: build/legacy-suite-node-DFxSND/report.json and build/legacy-suite-native-EkB8r2/report.json. Logs: build/symbol-registry-*. Next: remaining well-known symbol constants, then synchronous iterator support.

### TS-106 checkpoint

Both guest suites pass 592/592, tooling 290/290, runner 31/31 and all ten probes pass. All 105 native entries pass fresh build and static coverage checks; well-known-symbol driver 6451/6451 static. All 225 complete fixture results agree: 84 reported successes, 37 unchecked completions, 53 parse errors, 50 runtime errors and one reported failure. symbol-wellknown.js now completes with ten true values without recognized check markers; all 120 previous completions remain. Reports: build/legacy-suite-node-Cyqawt/report.json and build/legacy-suite-native-c9RsWH/report.json. Logs: build/symbol-well-known-*. Well-known identities are complete; iterator, RegExp and disposal protocol consumers remain separately scoped. Next: live Array iterators, then string iteration and iterable consumers.

### String iterator result Realms — resolved in TS-108

The current ECMA-262 String iterator uses CreateIteratorFromClosure: the generator context captures the factory Realm and creates yielded result objects before suspension; GeneratorStart removes that context before creating the final done result. V8 string-iterator.tq instead allocates both paths using the invoked next builtin context. Before implementing String iteration, explicitly resolve/test yield-versus-done result prototypes across borrowed methods against the normative algorithms; do not assume Array iterator allocation rules apply. Sources consulted 2026-11-08: [String iteration](https://tc39.es/ecma262/multipage/text-processing.html#sec-string.prototype-%symbol.iterator%), [generator context and completion](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-createiteratorfromclosure), [V8 implementation](https://github.com/v8/v8/blob/main/src/builtins/string-iterator.tq). No current Array iterator behavior depends on this follow-up.

### TS-107 checkpoint

Both guest suites pass 593/593, tooling 290/290, runner 31/31 and all ten probes pass. All 106 native entries pass fresh build and static coverage checks; Array iterator driver 6527/6527 static. Live lengths, abrupt/reentrant getters, permanent exhaustion and cross-Realm results pass on both hosts. All 225 complete fixture results agree and remain 84 reported successes, 37 unchecked completions, 53 parse errors, 50 runtime errors and one reported failure; all 121 previous completions remain. Reports: build/legacy-suite-node-Ykirqr/report.json and build/legacy-suite-native-rwkC3A/report.json. Logs: build/array-iterator-*. String iteration follows with explicit yield/done Realm tests, then iterable consumers.

TS-108 resolution: follows the normative captured-Realm yield and next-Realm completion distinction, with both borrowing directions tested. See [String iterator design](string-iterators.md).

### TS-108 checkpoint

Both guest suites pass 594/594 with no skips, tooling 290/290, runner 31/31 and all ten probes pass. All 107 native entries pass fresh build and static coverage checks; String iterator driver 6577/6577 static. UTF-16 cases, one-time coercion, permanent exhaustion and distinct yield/done result Realms pass on both hosts. All 225 complete fixture results agree: 84 reported successes, 37 unchecked completions, 53 parse errors, 50 runtime errors and one reported failure; all 121 previous completions remain. Reports: build/legacy-suite-node-9dPsOf/report.json and build/legacy-suite-native-EZIB8I/report.json. Logs: build/string-iterator-*. Next: Object.fromEntries with iterator acquisition, ordered entry reads and cleanup error precedence.

### Map readiness after TS-109

The fixed newer-Object fixture now passes its array fromEntries checks and stops at `new Map`. Implement Map in bounded steps: first validate native key identity/storage, then constructor and ordinary methods, live iterators/forEach, and later grouping/upsert consumers. Keys must use SameValueZero without guest coercion; prototype changes must not forge the brand. Preserve original entry-read/adder order and cleanup through the synchronous iterator operations. Probe mixed primitive/object/symbol host Map keys before relying on scriptc lowering. Design live ordered cursors so delete, clear and reinsertion remain correct without permanently retaining deleted guest references. Include cross-Realm iterator yield/pair/completion tests because CreateMapIterator is closure-based, like String iteration. The C++ property-backed internal slots and string-derived keys are reference material, not the TypeScript design.

### TS-109 checkpoint

Both guest suites pass 595/595 with no skips, tooling 290/290, runner 31/31 and all ten probes pass. All 108 native entries pass fresh build and static coverage checks; fromEntries driver 6665/6665 static. Ordered reads, saved next methods, cleanup precedence, foreign Realms and uncatchable engine stops pass on both hosts. All 225 complete fixture results agree: 84 reported successes, 37 unchecked completions, 53 parse errors, 50 runtime errors and one reported failure; all 121 previous completions remain. The newer-Object fixture passes array fromEntries checks and now stops at missing Map. Reports: build/legacy-suite-node-046LIb/report.json and build/legacy-suite-native-nWKdUN/report.json. Logs: build/object-from-entries-*.

### TS-110 checkpoint

Both guest suites pass 596/596 with no skips, runner 31/31 and all ten probes pass; typechecking passes. The new storage driver passes a fresh static-only native build and separate 6771/6771 coverage gate. The isolated mixed-key probe passes both hosts with 20/20 static statements. The initial direct GuestObject driver exposed a reduced native module-reachability failure; using real Realm-owned keys resolves the test setup without a production workaround. Existing runtime entry points do not import the new module: their 108 native builds, tooling 290/290 and 225 fixed fixture results retain the TS-109 baseline, not a fresh full rebuild. Logs: build/keyed-collection-*; design and compiler evidence: docs/keyed-collection-storage.md.

### TS-111 checkpoint

Both guest suites pass 597/597 with no skips, tooling 290/290, runner 31/31 and all ten probes pass; typechecking passes. All 110 native entries pass fresh static-only builds and separate coverage gates; Map driver 6787/6787 static. Constructor adder order, shared entry cleanup, SameValueZero keys, live forEach mutation, foreign Realms and resource limits pass on both hosts. All 225 complete fixture results agree: 84 reported successes, 37 unchecked completions, 53 parse errors, 50 runtime errors and one reported failure; all 121 previous completions remain. The newer-Object fixture now reaches fromEntries(map); grouping/upsert fixtures reach their missing methods. Reports: build/legacy-suite-node-2OnUBQ/report.json and build/legacy-suite-native-PGex5h/report.json. Logs: build/map-object-*.

### String search predicates after grouping

The Map grouping fixture now reaches error-message assertions that require
String.prototype.includes. Implement includes, startsWith and endsWith next,
before Map upsert. Preserve receiver conversion, Symbol.match inspection, search
conversion and position conversion in that order. Probe the native UTF-16 search
primitives, including lone surrogates and embedded NUL. RegExp objects remain
deferred, but ordinary objects with Symbol.match already require correct rejection
and getter ordering; future RegExp integration must add the branded fallback.

### Map insertion follow-up

After search predicates, implement getOrInsert/getOrInsertComputed using the
existing keyed storage. Validate callback callability before looking up even an
existing key; distinguish an absent key from a stored undefined value. The
computed callback receives canonical positive zero and an undefined receiver.
Recheck storage after callbacks because they can insert, delete or clear entries;
preserve their mutations on abrupt completion. Test poisoned public get/has/set
methods, live iterator order and cross-Realm errors. The fixed upsert fixture also
tests WeakMap, so Map support alone will advance it without completing the file.

### Set readiness

The fixed Set fixture exercises ordinary methods, then live iterators. Reuse
KeyedCollection for identity and insertion order, storing values as keys; keep a
distinct guest Set brand. First add construction, add/has/delete/clear, size and
forEach with cached adder lookup and iterator cleanup. Follow with values/keys
aliasing, entries pairs and Symbol.iterator, including captured-Realm results and
permanent exhaustion. Set algebra and weak collections remain separate work.

### Error family follow-up

After Set iterators, inspect Error.isError and the missing EvalError/URIError
constructors together: the fixed error-iserror.js fixture requires all three.
Use the existing internal GuestError brand, not prototype/name inspection. Audit
ErrorName consumers and closed observation contracts before extending public
constructors; preserve foreign-Realm errors, cause/message order and all existing
diagnostic classifications.

Read-only audit: runtime ScriptConstructor.name and Diagnostic.name are strings;
the closed syntax-error constructor remains SyntaxError. ErrorName currently
governs intrinsic allocation/bootstrap only. Update the current Error constructor
key expectations in harness-errors-a/b for isError, while retaining historical
observation literals and separate syntax/unsupported classifications.

### Syntax follow-up after the error family

At the Set-iterator checkpoint, six of the 53 fixed parse failures first stop at
for-of. Plan that next using the established synchronous iterator protocol.
Inspect lexical per-iteration environments and declaration planning before
changing parser admission. General cleanup must distinguish normal break/return
from guest throws, and iterator step faults must retain their separate boundary.
Keep async iteration and destructuring explicit separate capabilities. These are
first blockers, not a prediction that all six fixtures will complete afterward.

Stage the work: normal-completion iterator cleanup plus var/assignment loop heads
first, then let/const per-iteration bindings. The fixed basic loop fixture uses
all three declaration forms; the other five first-blocked fixtures use var.
Keep unsupported lexical heads explicit until their declaration/environment
semantics are implemented, rather than reusing the var binding across iterations.

### TS-112 checkpoint

Both guest suites pass 598/598 with no skips, tooling 290/290, runner 31/31 and all ten probes pass; typechecking passes. All 111 native entries pass fresh static-only builds and separate coverage gates; Map iterator driver 6845/6845 static. Live mutation/exhaustion, captured-Realm results/pairs, next-Realm completion and bounded deleted-node traversal pass on both hosts. All 225 complete fixture results agree: 84 reported successes, 38 unchecked completions, 53 parse errors, 49 runtime errors and one reported failure. test-object-new-methods.js now completes with 32 true results and no recognized check markers; all 121 previous completions remain. Reports: build/legacy-suite-node-11V5PM/report.json and build/legacy-suite-native-Av1AdA/report.json. Logs: build/map-iterator-*.

### TS-113 checkpoint

Both guest suites pass 599/599 with no skips, tooling 290/290, runner 31/31 and all ten probes pass; typechecking passes. All 112 native entries pass fresh static-only builds and separate coverage gates; grouping driver 6900/6900 static. Key coercion/identity, iterator cleanup, intrinsic allocation, foreign Realms and resource bounds pass on both hosts. All 225 complete fixture results agree: 84 reported successes, 38 unchecked completions, 53 parse errors, 49 runtime errors and one reported failure; all 122 previous completions remain. The Map grouping fixture now reaches error-message checks requiring String.includes. Reports: build/legacy-suite-node-0qOr2p/report.json and build/legacy-suite-native-kI1g7m/report.json. Logs: build/group-by-*.

### TS-114 checkpoint

Both guest suites pass 600/600 with no skips, tooling 290/290, runner 31/31 and all ten probes pass; typechecking passes. All 113 native entries pass fresh static-only builds and separate coverage gates; String search driver 6937/6937 static. Twelve explicit native primitive probe cases pass with 7/7 static statements. Ordered Symbol.match/coercion, UTF-16 boundaries, foreign errors and resource limits pass on both hosts. All 225 complete fixture results agree: 84 reported successes, 39 unchecked completions, 53 parse errors, 48 runtime errors and one reported failure. map-groupby.js now completes; all 122 prior completions remain. Reports: build/legacy-suite-node-SLZdsf/report.json and build/legacy-suite-native-RiHdcu/report.json. Logs: build/string-search-*.

### TS-115 checkpoint

Both guest suites pass 601/601 with no skips, tooling 290/290, runner 31/31 and all ten probes pass; typechecking passes. All 114 native entries pass fresh static-only builds and separate coverage gates; Map upsert driver 6943/6943 static. Stored undefined, callback validation/mutation, signed zero, live order, foreign errors and resource limits pass on both hosts. An initial resource test used unsupported named function-expression syntax; the corrected test uses a supported declaration. All 225 complete fixture results agree: 84 reported successes, 39 unchecked completions, 53 parse errors, 48 runtime errors and one reported failure; all 123 prior completions remain. The upsert fixture passes its Map assertions and reaches missing WeakMap. Reports: build/legacy-suite-node-KGSKKu/report.json and build/legacy-suite-native-g17HnD/report.json. Logs: build/map-upsert-*.

### TS-116 checkpoint

Both guest suites pass 602/602 with no skips, tooling 290/290, runner 31/31 and all ten probes pass; typechecking passes. Native acceptance covers 114 initial passes plus a successful isolated object-descriptors retry after a Zig cache file-open failure; all 115 entries pass static coverage, Set driver 7028/7028. Initial focused test syntax used unsupported comma-separated declarations and was corrected before native builds. Identity, saved adders, cleanup, live forEach, brands, foreign Realms and bounds pass on both hosts. All 225 complete fixture results agree: 84 reported successes, 39 unchecked completions, 53 parse errors, 48 runtime errors and one reported failure; all 123 prior completions remain. The Set fixture passes 33 checks before missing values(). Reports: build/legacy-suite-node-VMESjM/report.json and build/legacy-suite-native-BCxurx/report.json. Initial/retry evidence: build/set-object-native-initial-results.json and build/set-object-native-retry-results.json. Logs: build/set-object-*.

### TS-117 checkpoint

Both guest suites pass 603/603 with no skips, tooling 290/290, runner 31/31 and all ten probes pass; typechecking passes. All 116 native entries pass fresh static-only builds and separate coverage gates in one run; Set iterator driver 7089/7089 static. Live mutation/exhaustion, exact aliases, fresh pairs, captured-Realm results and bounded deleted-node traversal pass on both hosts. Typechecking initially caught a private field shadowing GuestObject.set; it was renamed collection before validation. All 225 complete fixture results agree: 85 reported successes, 39 unchecked completions, 53 parse errors, 47 runtime errors and one reported failure. set-test.js now reports all 56 checks passing; all 123 prior completions remain. Reports: build/legacy-suite-node-iJju8K/report.json and build/legacy-suite-native-j97sh8/report.json. Logs: build/set-iterator-*.

### TS-118 checkpoint

Both guest suites pass 604/604 with no skips, tooling 290/290, runner 31/31 and all ten probes pass; typechecking passes. All 117 native entries pass fresh static-only builds and separate coverage gates; error-family driver 7077/7077 static. Error branding, metadata, message/cause order, foreign Realms and resource bounds pass on both hosts. Initial test typing was corrected to preserve the literal ErrorName union before validation. All 225 complete fixture results agree: 85 reported successes, 40 unchecked completions, 53 parse errors, 46 runtime errors and one reported failure. error-iserror.js now completes; all 124 prior completions remain. Reports: build/legacy-suite-node-dg5czb/report.json and build/legacy-suite-native-ThpmrS/report.json. Logs: build/error-family-*.

### Contextual-of fixture expectation

TS-119 allows for-of-contextual-keyword.js to parse. Its third check calls `of()` after `var of = 5` overwrites the hoisted function binding. Standard declaration instantiation therefore produces TypeError at that call. Retain the original C++ fixture and report the runtime failure; do not change hoisting or inject a compatibility exception. The basic for-of fixture remains blocked by lexical heads until per-iteration environments are implemented.

### Lexical iteration prerequisites

Inspection during TS-119 found that ScriptLocalBindings and GlobalEnvironment currently store only initialized/value state, and declaration plans admit let/var/function. Add immutable const bindings and their declaration/initialization rules as a bounded prerequisite before lexical for-of. Then add a dedicated loop scope/activation: evaluate the iterable with uninitialized head bindings, create fresh initialized bindings for each iteration, and restore the outer environment before iterator cleanup. Preserve closure capture, head/body var conflicts, Realm ownership, setup budgets and the existing execution-key checks; do not represent these bindings as vars or leak a synthetic block into source metadata.

### TS-119 checkpoint

Both guest suites pass 605/605 with no skips, tooling 290/290, runner 31/31 and all ten probes pass; typechecking passes. All 118 native entries pass static-only builds and parsed coverage gates, with a targeted harness rebuild after migrating its historical for-of rejection to a positive execution check; for-of driver 7160/7160 static. The initial Node run retained two failures from that obsolete expectation. Initial native compilation needed the established explicit ThrowCompletion locals at two return sites. Ordered assignment, cleanup precedence, completion values, Realm errors and engine limits pass on both hosts. All 225 complete fixture results agree: 85 reported successes, 44 unchecked completions, 48 parse errors, 47 runtime errors and one reported failure; all 125 prior completions remain. Four fixtures newly complete: for-of-break-continue, for-of-strings, iterator-protocol-test and map-test. The contextual-of fixture now reaches its invalid hoisting expectation; the basic fixture still needs lexical heads. Reports: build/legacy-suite-node-vb8Eac/report.json and build/legacy-suite-native-4YCN09/report.json. Native evidence: build/for-of-native-initial-results.json, build/for-of-harness-rebuild-results.json and build/for-of-native-final-results.json. Logs: build/for-of-*.

### Lexical for-of acceptance targets

After TS-120, add one identifier let/const head to for-of with an explicit declaration-plan scope. Test iterable-expression TDZ (including closures captured there), fresh per-iteration closure bindings, const assignment failure with iterator cleanup, body lexical shadowing versus var conflicts, nested loops, and restoration before cleanup/abrupt completion. Preserve the existing var and assignment paths. The basic fixed fixture is the immediate parity target; do not infer full lexical-loop support or admit traditional for(let/const...) as part of this step.

### TS-120 checkpoint

Both guest suites pass 607/607 with no skips, tooling 290/290, runner 31/31 and all ten probes pass; typechecking passes. All 119 native entries pass a fresh corrected static-only build and parsed coverage gates in one run; const driver 7183/7183 static. TDZ-before-mutability, assignment/coercion ordering, global/function/block/switch bindings, closures, foreign errors and budgets pass on both hosts. Historical sources and case counts remain: seven declaration plans and six lexical-audit rows have explicit current expectations. Initial Node failures identified obsolete const rejections; the first tooling run passed 289/290 and exposed a changed bare-statement rejection code. Correction ee191396 preserves that boundary; initial evidence is retained. All 225 complete fixture results agree: 87 reported successes, 44 unchecked completions, 46 parse errors, 47 runtime errors and one reported failure; all 129 prior completions remain. let-const-loops-test.js and let-const-parser-test.js now report success. Reports: build/legacy-suite-node-5td0ma/report.json and build/legacy-suite-native-lrzfXP/report.json. Final native evidence: build/const-boundary-native-results.json. Logs: build/const-boundary-*; earlier build/const-* records remain.

### TS-121 checkpoint

Lexical for-of is accepted at 7633ceb0: both hosts pass 608/608 guest cases,
all 120 native entries pass static build/coverage gates, and tooling 290/290,
runner 31/31 and ten probes pass. All 225 fixture results agree, retaining 131
completions and adding for-of-basic.js (132 total). The targets above are covered;
traditional lexical for loops remain separate. See [lexical for-of](for-of-lexical.md)
and TS-121 in TASKS.md for scope and initial/rebuild evidence.

### Next operator work

TS-122 adds Number exponentiation to the existing Script arithmetic path. Keep
right associativity, unary-base rejection, numeric coercion order and single
compound-reference evaluation explicit. Preserve the legacy parser boundary and
fixed C++ fixture sources. The exponentiation fixture supplies 12 literal checks;
native edge cases and full regression gates are required before acceptance.

### TS-122 checkpoint

Exponentiation is accepted: 611/611 guest cases on both hosts, 121 native entries
passing build/coverage, tooling 290/290, runner 31/31 and ten probes. All 225
fixture results agree; exponentiation-test.js adds 12 passing checks and raises
completions to 133. Initial expectation failures and their narrow migrations are
recorded in [exponentiation](exponentiation.md). Next: Number bitwise and shift
operators, with precedence, integer conversion and compound-reference tests.

### TS-123 checkpoint

Number bitwise and shift operators are accepted: 612/612 guest cases on both
hosts, all 122 native entries static, tooling 290/290, runner 31/31 and ten probes.
All 225 fixture results agree; bitwise and unary fixtures add 39 and 28 passing
checks, raising completions to 135. No expectation migration was needed. See
[bitwise operators](bitwise.md). Next investigate URI encoding/decoding, including
native primitive support, malformed sequences, coercion and Realm errors.

### TS-124 checkpoint

URI globals are accepted: 613/613 guest cases on both hosts, all 123 native
entries static, tooling 290/290, runner 31/31 and ten probes. All 225 fixture
results agree; uri-encoding.js raises completions to 136. See [URI codecs](uri-codecs.md)
for primitive evidence and resource boundaries. Next: try/finally, including
completion replacement, lexical restoration and fatal-engine-stop behavior.

### TS-125 checkpoint

Try/finally is accepted: 614/614 guest cases on both hosts, all 124 native entries
static, tooling 290/290, runner 31/31 and ten probes. All 225 fixture results
agree; the finally fixture adds three passing checks and raises completions to
137. See [try/finally](try-finally.md) for completion and fatal-stop semantics.
Next: traditional single-binding lexical for loops, with fresh let bindings
before the first test and before each update, and a shared const loop binding.

### TS-126 checkpoint

Traditional lexical for loops are accepted: 615/615 guests on each host, all 125 native entries static, tooling 290/290, runner 31/31 and ten probes. All 225 fixture results agree and all 137 prior completions remain. gc-leak-test.js raises completions to 138, without assertions or proof of collection. See [lexical for](for-lexical.md) for closure timing and the retained initial failures. Next: synchronous for-in, including prototype enumeration, duplicate suppression, mutations, lexical heads and bounded traversal.

### TS-127 checkpoint

For-in is accepted: 616/616 guests on each host, all 126 native entries static, tooling 290/290, runner 31/31 and ten probes. All 225 fixture results agree, all 138 prior completions remain, and for-in-loop-test.js adds 15 passing checks for 139 completed fixtures. See [for-in](for-in.md) for prototype and mutation semantics. Next: array literal spread with iterator semantics and elisions; the sparse-array fixture is blocked on `[1, ...items, , 5]`.

### TS-128 checkpoint

Array literal spread is accepted: 617/617 guests on each host, all 127 native entries static, tooling 290/290, runner 31/31 and ten probes. All 225 fixture results agree, all 139 prior completions remain, and the sparse-array fixture adds 11 passing checks for 140 completed fixtures. See [array spread](array-spread.md) for iterator and elision semantics. Next: call and constructor argument spread, preserving callee/receiver capture and argument evaluation order.

### TS-129 checkpoint

Call and constructor spread are accepted: 618/618 guests on each host, all 128 native entries static (one isolated Zig cache-failure rebuild), tooling 290/290, runner 31/31 and ten probes. All 225 fixture results agree and all 140 prior completions remain; no fixture completion increase in this slice. See [argument spread](argument-spread.md) for evaluation-order and build evidence. Next: object literal method shorthand and accessors; the getter/setter fixture requires both forms, correct callable metadata and non-constructability.

### TS-130 checkpoint

Fixed-key object methods and accessors are accepted: 619/619 guests on both hosts, all 129 native entries static, all 290 tooling checks covered after one explicit historical diagnostic migration, runner 31/31 and ten probes. All 225 fixture outputs agree; the getter/setter fixture prints 17 passing checks and raises completed files to 141. Its PASS - format is not recognized by the reporter, so it remains an unchecked completion. See [object methods](object-methods.md) for scope and retained failure evidence. Next: correct that reporter gap with anchored marker tests, then support trailing commas in object literals and call/constructor arguments. The property-descriptor fixture requires both comma forms.

### TS-131 checkpoint

The fixture reporter recognizes anchored hyphenated PASS/FAIL lines. All 225 raw results remain unchanged across both hosts; the getter/setter fixture is now correctly counted as 17 checks and a reported success. Counts are 94 reported successes and 47 unchecked completions, with 141 total completions unchanged. Runner 32/32 passes. Next: trailing commas in object literals and call/constructor argument lists.

### TS-132 checkpoint

Trailing object and call/constructor commas are accepted: 620/620 guests on both hosts, all 130 native entries static, tooling 290/290, runner 32/32 and ten probes. All 225 fixture results agree and all 141 previous completions remain; property-descriptors-test.js newly completes without counted markers, raising completions to 142. See [trailing commas](trailing-commas.md) for grammar scope and retained initial failures. Next: Annex B String HTML methods, sharing receiver/attribute coercion and quote escaping; the HTML-method fixture has 15 concrete checks.

### TS-133 checkpoint

String HTML methods are accepted: 621/621 guests on both hosts, all 131 native entries static, tooling 290/290, runner 32/32 and ten probes. All 225 fixture results agree and all 142 previous completions remain; the HTML-method fixture adds 15 passing checks and raises completions to 143. See [String HTML](string-html.md) for CreateHTML semantics and validation. Next: ordinary Script string escape coverage, reusing the template hex/Unicode scanner while preserving raw source and directive recognition; then String well-formedness methods.

### TS-134 checkpoint

Script string escapes are accepted: 622/622 guests on both hosts, all 132 native entries static after one isolated Zig link-cache failure rebuild, all 290 tooling checks covered after four explicit historical-row migrations, runner 32/32 and ten probes. All 225 fixture results agree and all 143 previous completions remain. The well-formedness fixture now reaches its missing builtin. See [string escapes](string-escapes.md) for raw-directive and retained-failure evidence. Next: String isWellFormed/toWellFormed, with surrogate pairing, replacement, coercion and bounded scanning.

### TS-135 checkpoint

String well-formedness is accepted: 623/623 guests on both hosts, all 133 native entries static, tooling 290/290, runner 32/32 and ten probes. All 225 fixture results agree and all 143 previous completions remain; the well-formedness fixture adds 23 passing checks, raising completions to 144. See [String well-formedness](string-wellformed.md). Next: String.fromCharCode, String.fromCodePoint and String.prototype.codePointAt; locale-sensitive methods remain a separate design task.

### TS-136 checkpoint

String code-point access and construction are accepted: 624/624 guests on both hosts, all 134 native entries static, tooling 290/290, runner 32/32 and ten probes. All 225 fixture results agree and all 144 previous completions remain. The additional-string-methods fixture now passes nine code-point checks before reaching locale-sensitive methods. See [String code points](string-codepoints.md). Next: Function.prototype.bind, including constructor and instanceof forwarding; exposing the Function constructor remains a separate task.

### TS-137 checkpoint

Bound functions are accepted: 625/625 guests on both hosts (plus the final argument-copy budget case in a focused Node rerun), all 135 native entries static, tooling 290/290, runner 32/32 and ten probes. All 225 fixture results agree and all 144 prior completions remain. The bind fixture now reaches missing Function. See [bound functions](function-bind.md). Next: numeric separators and comma expressions. Their fixtures also depend on eval, multiple declarations and destructuring; first-failure removal will not alone complete them. Function constructor support needs a separate design for parsed source, active budgets and global Realm scope.

### TS-138 checkpoint

Numeric separators are accepted: 626/626 guests on both hosts, all 136 native entries static, tooling 290/290, runner 32/32 and ten probes. All 225 fixture results agree and all 144 previous completions remain. The separator fixture now reaches unsupported eval during preparation. See [numeric separators](numeric-separators.md). Next: comma expressions, with GetValue semantics and AssignmentExpression boundaries. Clarification to the previous checkpoint: multiple var declarations are already supported; the comma fixture also needs eval and destructuring.

### TS-139 checkpoint

Comma expressions are accepted: 627/627 guests on both hosts, all 137 native entries static, runner 32/32 and ten probes. Tooling covers all 290 checks after one explicit historical diagnostic migration and a passing full assignment-audit rerun on both hosts. All 225 fixture results agree and all 144 prior completions remain; the comma fixture now reaches unsupported eval. See [comma expressions](comma-expressions.md). Next: bounded Function construction through Rift parsing and global Realm environments, retaining active budgets and explicit unsupported-source boundaries.

### TS-140 through TS-147 checkpoint

Function construction, arrows, rest/default parameters, arguments objects, sloppy block functions, locale string conversion and labelled control flow are accepted and published through bcda5fa8. The last accepted checkpoint passes 636/636 guest checks on each host, 146 native static/coverage gates, 290 tooling checks, 32 runner checks and ten probes. All 225 complete corpus records match: 103 reported successes and 54 unchecked completions, with 24 parse errors, 43 runtime errors and one reported failure. All 144 completions from TS-139 remain; the total is now 157. Feature documents and TASKS retain each initial failure and explicit expectation migration. TS-148 optional chaining subsequently passed all 637 guest checks per host, 147 native gates and 290 tooling checks. All 225 corpus records match, preserving those 157 completions and adding null-undefined-typeerror-test.js with 13 checks. Total completions: 158. See [optional chaining](optional-chaining.md) for scope and retained evidence.

### Remaining corpus review priorities

TS-149 supplies the statement terminators needed by the eval fixture, and TS-150 implements its local and global execution semantics. Optional eval calls remain indirect. Unsupported input must not be converted indiscriminately into catchable SyntaxError merely to satisfy negative fixtures.

TS-150 completes the original eval fixture on both hosts while preserving all 158 earlier completions. The comma fixture proceeds past eval admission to unsupported destructuring. Numeric separators now execute seven positive checks before the first malformed separator remains an explicit unsupported outcome. Review source-backed certification for malformed separators next, followed by shared array/object destructuring patterns across declarations, assignments and loop heads. Certification must reject valid-but-unsupported alternatives such as BigInt and regexp contexts; do not make all lexical rejections catchable. Destructuring needs iterator closing, nested/default/rest patterns, TDZ and assignment-reference ordering, rather than array-index shortcuts.

The unchanged string-escape-sequences-test.js has malformed quoting at line 14: its escaped backslashes leave a quote terminating the string before `world`. Node's syntax-only check also rejects that original source (build/optional-chain-fixture-syntax-audit.log). Preserve this parse-error outcome and the fixture bytes; do not weaken string lexing to make the file complete. This is separate from supported Script hex/Unicode string escapes. The baseline still does not measure C++ execution, and nonstandard injected GC helpers remain excluded from this runner.


### TS-149 checkpoint

Script semicolon insertion is accepted: 638/638 guests on each host, 148 native static/coverage gates, runner 32/32 and ten probes. All 290 tooling checks are covered after one explicit declaration-plan migration and a passing full plan rerun on both hosts. All 225 corpus records match and all 158 completed fixtures remain complete. See [semicolon insertion](semicolon-insertion.md) for restricted productions, directive detection and retained failures. Next: review eval environments and instantiation, including deletable local bindings, arguments visibility, inherited strictness and nested-source restoration, before admitting eval syntax.

### TS-150 checkpoint

Eval is accepted with direct/indirect scope, inherited strictness, deletable bindings, arguments/default interactions and nested state restoration. Both hosts pass 640/640 guests, tooling 290/290, runner 32/32 and ten probes. All 150 native entries have passing static-only build/coverage evidence after one explicit URI rebuild for a retained Zig cache failure. All 225 corpus records match, with 159 completions: 104 reported successes and 55 unchecked completions. See [eval design and validation](eval-design.md). Next: source-backed malformed numeric separator certification, preserving unsupported grammar boundaries.

### TS-152 loop binding checkpoint

For-in/of binding patterns accepted (41b00368): both guest suites pass 647/647 without skips, tooling 291/291, runner 32/32, all ten probes and typechecking pass. All 157 native entries pass static-only builds and parsed coverage in 909856ms; focused coverage is 8997/8997 static with zero dynamic operations. Production source remained unchanged during the matrix; the historical harness migration completed before its entry compiled. Initial Node 645/647 and final passing logs are retained; all historical admission migrations preserve their source strings. All 225 complete corpus records match between Node dPT49R and native NYKtad, with original hashes unchanged and all 162 prior completions preserved. for-destructuring-test.js newly passes 33 checks, raising completions to 163 (106 reported successes, 57 unchecked completions, 17 parse errors, 44 runtime errors, one reported failure). Evidence: build/for-binding-native-results.json and build/for-binding-corpus-comparison.json; logs build/for-binding-*. Next: array assignment loop heads, followed by object assignment patterns. Parameter/catch patterns, mixed declaration lists and classic-for patterns remain separate.

### Remaining fixture disagreements

Preserve the original corpus when judging parity. for-of-contextual-keyword.js overwrites its hoisted function with a number before calling it; array-index-validation-test.js assigns a nonnumeric array length; object-keys-values-test.js expects boxed strings to have no enumerable indices. These failures do not justify changing the corresponding engine semantics. for-in-of-lhs-validation-test.js also assumes an arrow concise body always permits in, but its line 77 occurs in a NoIn initializer: the [ArrowFunction and ConciseBody grammar](https://262.ecma-international.org/16.0/#sec-arrow-function-definitions) propagates that parameter. Keep its parse rejection and earlier string-valued SyntaxError expectations visible. After object assignments, review class scopes, constructor state and inheritance as the next substantial corpus feature; remaining destructuring contexts stay explicit follow-ups.

### TS-152 assignment loop checkpoint

Array assignment loop heads accepted (d2a09321): both guest suites pass 648/648 without skips, tooling 291/291, runner 32/32, ten probes and typechecking pass. All 158 native entries pass static-only builds and parsed coverage in 949949ms without retries, on unchanged production source; focused coverage is 8986/8986 static with zero dynamic operations. All 225 complete corpus records match between Node x7zdk9 and native Strsce, with original hashes unchanged and all 163 prior completions preserved (106 reported successes, 57 unchecked completions, 17 parse errors, 44 runtime errors, one reported failure). No new fixture completion or historical expectation migration is claimed. Evidence: build/for-assignment-native-results.json and build/for-assignment-corpus-comparison.json; logs build/for-assignment-*. Next: integrate the object assignment draft, whose 648 existing Node guests and new focused Node/native tests pass, with 9093/9093 static zero-dynamic coverage. Mixed declaration lists, classic-for, parameter and catch patterns remain separate.

### TS-152 object assignment checkpoint

Object assignments accepted (802fa700): both guest suites pass 649/649 without skips, tooling 291/291, runner 32/32, all ten probes and typechecking pass. All 159 native entries pass static-only builds and parsed coverage on unchanged production source in 944616ms without retries; focused coverage is 9093/9093 static with zero dynamic operations. All 225 complete corpus records match Node FFtOZQ, native rQFu5G and the prior milestone, preserving original hashes and all 163 completions (106 reported successes, 57 unchecked completions, 17 parse errors, 44 runtime errors, one reported failure). No new fixture completion is claimed. Evidence: build/object-assignment-native-results.json and build/object-assignment-corpus-comparison.json; logs build/object-assignment-*. The canonical suite required no historical expectation migrations. Object/array assignment and standalone/for-in/of bindings are accepted; mixed declaration lists, classic-for, parameter and catch patterns remain follow-ups. TS-153 base classes are the next active feature, with an isolated draft under review.


### TS-153 base class checkpoint

Base classes accepted (c450aa43, audit migrations df68b62e): both guest suites pass 651/651 without skips; runner 32/32, ten probes and typechecking pass. All 161 native entries pass static-only builds and parsed coverage on unchanged production source in 1005842ms, without retries; focused coverage is 9283/9283 static with zero dynamic operations. Initial tooling passed 287/291; four source-preserving class audit migrations and their targeted reruns cover all 291 checks. The first corrected lexical audit caught two expected offsets, corrected in the retained final passing run. All 225 complete corpus records match Node lx4qWe and native bpgWfu, preserving original hashes and all 163 prior completions (106 reported successes, 57 unchecked, 17 parse errors, 44 runtime errors, one reported failure). Five still-blocked fixture diagnostics advance; no new completion is claimed. Evidence: build/base-class-native-results.json, build/base-class-corpus-comparison.json, build/base-class-tooling.log, build/base-class-audits-corrected.log and build/base-class-lexical-audit-corrected.log; other logs build/base-class-*. Eight guest drivers and four audit suites explicitly migrate historical class admissions while preserving source strings and frozen evidence. Inheritance remains TS-153 follow-up. Next: TS-154 sloppy duplicate simple parameters, whose reviewed isolated draft passes 651 existing Node guests and focused Node/native tests at 9291/9291 static, zero dynamic; a reduced scriptc temporary projection failure is retained.


### TS-154 duplicate parameter checkpoint

Sloppy duplicate simple parameters accepted (7872689a, audit migrations 0e892752): both guest suites pass 652/652 without skips; tooling 291/291, runner 32/32, ten probes and typechecking pass. All 162 native entries pass static-only builds and parsed coverage on unchanged production source in 1000436ms, without retries; focused coverage is 9291/9291 static with zero dynamic operations. All 225 complete corpus records match Node 5FOJ51 and native FHjEup, preserving original hashes and all 163 prior completions (106 reported successes, 57 unchecked, 17 parse errors, 44 runtime errors, one reported failure). The scoping fixture advances to the separate catch-var restriction; no completion is added yet. Four historical guest drivers and the audit expectations migrate explicitly while retaining source strings and frozen data. The draft native crash, reduced temporary-record projection failure and passing local variant are retained in docs/validation/ts-154 and the compiler contract. Evidence: build/duplicate-parameter-native-results.json, build/duplicate-parameter-corpus-comparison.json and build/duplicate-parameter-*. TS-155 catch-var is the next reviewed draft: 652 existing Node guests, focused Node/native at 9287/9287 static zero dynamic, and the unchanged scoping fixture with 16 passing checks on both hosts. Full canonical acceptance for TS-155 remains pending.

### TS-155 catch-var checkpoint

Simple catch-var declarations accepted (c62d55a4, audit migration 7620d5b6): both guest suites pass 653/653; tooling 291/291, runner 32/32, ten probes and typechecking pass. All 163 native entries pass static-only builds and parsed coverage on unchanged source in 1009910ms, without retries. Focused coverage is 9287/9287 static, zero dynamic. All 225 normalized corpus records agree between Node Wl4X7V and native BA4mOV; original hashes and all 163 prior completions are preserved. The unchanged scoping-redeclaration-test.js adds 16 passing checks, raising completions to 164 (107 reported successes, 57 unchecked; 16 parse errors, 44 runtime errors, one reported failure). Evidence: build/catch-var-native-results.json, build/catch-var-corpus-comparison.json and build/catch-var-*. One historical guest source and one audit row migrate explicitly. Next: the reviewed new.target draft, before distinct-target construction and inheritance.

### TS-153 new.target checkpoint

new.target accepted (bf1947e4): Node/native guest suites pass 654/654, tooling 291/291, runner 32/32, all ten probes and typechecking pass. All 164 native entries pass static-only builds and parsed coverage in 1035179ms without retries; focused coverage is 9313/9313 static, zero dynamic. All 225 normalized corpus records match Node RPRIuX, native 3veeeC and the prior milestone, preserving hashes and all 164 completions (107 reported successes, 57 unchecked). Evidence: build/new-target-native-results.json, build/new-target-corpus-comparison.json and build/new-target-*. The original harness-construct source migrates explicitly. Outside-function certification, nested new grammar and inheritance remain separate. Next: TS-156 prototype selection, then the reviewed TS-157 distinct-target draft.

### TS-156 constructor prototype checkpoint

Constructor prototype selection accepted (7ac9fb4b): both guest suites pass 655/655, tooling 291/291, runner 32/32, ten probes and typechecking pass. The 165-entry native matrix initially passed 164 entries in 1034701ms; script-function-materialization encountered a Zig mingw cache file-open failure and passed an isolated unchanged-source retry. All 165 entries now have passing static-only build/coverage evidence; focused coverage is 9343/9343 static, zero dynamic. Initial failure, retry and accepted reports remain separate in build/constructor-prototype-native-{initial,retry,results}.json. All 225 normalized corpus records match Node 0vv2Ie, native ruTIQo and the prior milestone, preserving 164 completions (107 reported successes, 57 unchecked) and all hashes. Other evidence: build/constructor-prototype-corpus-comparison.json and build/constructor-prototype-*. Next: separate TS-157/TS-158 commits followed by one combined canonical validation.


### TS-157/TS-158 construction checkpoint

Distinct constructor targets and default derived classes accepted (3bf2df23, 29cd9ae8; host callback correction 416f3a97): both guest suites pass 657/657 without skips; tooling 291/291, runner 32/32, ten probes and typechecking pass. The 167-entry native matrix passed 166 entries in 1124208ms; harness-map-default correctly failed the gate for one dynamic callback adapter. Two host constructor callbacks now declare the newTarget parameter. The corrected driver passes both original runtime inputs on Node/native at 10235/10235 static, zero dynamic; all 167 entries have passing static-only build and parsed coverage evidence. Production source remained fixed. Initial, corrected-entry and accepted reports are retained separately in build/derived-construction-native-{initial,retry,results}.json. All 225 normalized corpus records agree between Node s6iVhq and native LoC36m, preserving hashes and all 164 prior completions. The unchanged test-class-getter-setter.js adds ten passing checks, raising completions to 165 (108 reported successes, 57 unchecked; 15 parse errors, 44 runtime errors, one reported failure). Evidence: build/derived-construction-corpus-comparison.json and build/derived-construction-*. The earlier native 5OHKvb run used the prior CLI before its matrix rebuild and is excluded. Next: reviewed TS-159 explicit constructors, then TS-160 super properties.


### TS-159 explicit constructor checkpoint

Explicit derived constructors accepted (8c7186be): both guest suites pass 658/658 without skips; tooling 291/291, runner 32/32, ten probes and typechecking pass. All 168 native entries pass static-only builds and parsed coverage on unchanged source in 1158688ms, without retries. Focused coverage is 9489/9489 static, zero dynamic. All 225 normalized corpus records agree between Node C4Lt8q and native lH3Dj1, preserving hashes and all 165 prior completions (108 reported successes, 57 unchecked; 15 parse errors, 44 runtime errors, one reported failure). class-test.js advances to super-property syntax; no completion is added yet. Evidence: build/explicit-derived-native-results.json, build/explicit-derived-corpus-comparison.json and build/explicit-derived-*. Next: separate TS-160 super-property and TS-161 job-checkpoint commits followed by combined canonical validation.

### TS-160/TS-161 super and checkpoint milestone

Super properties and Script checkpoints accepted (8905c5ec, 6de4b230): both guest suites pass 660/660 without skips; tooling 291/291, runner 32/32, ten probes and typechecking pass. The 170-entry native matrix passed 169 entries in 1178468ms; json-parse encountered a Zig mingw cache file-open failure and passed an isolated unchanged-source retry. All 170 entries have passing static-only builds and parsed coverage, with initial/retry/accepted reports retained separately in build/super-jobs-native-{initial,retry,results}.json. All 225 normalized corpus records agree between Node gAJhh9 and native nPHQhi, preserving original hashes and all 165 prior completions. class-test.js raises completions to 166 (108 reported successes, 58 unchecked; 14 parse errors, 44 runtime errors, one reported failure). Its corpus classification remains unchecked; separate focused evidence verifies all 26 true outputs. Evidence: build/super-jobs-corpus-comparison.json, build/super-jobs-* and build/super-property-draft/build/class-corpus-reviewed.json. Next: reviewed Promise core and finally as separate commits, followed by combined canonical validation.

### TS-162/TS-163/TS-164 Promise checkpoint

Promise core, finally and capability helpers accepted (a337c48a, c935de54, e7ade7cc): both guest suites pass 666/666 without skips; tooling 291/291, runner 32/32, ten probes and typechecking pass. All 173 native entries pass static-only builds and parsed coverage on unchanged production source in 1239160ms without retries. Focused canonical coverage is 9860/9837/9828 static statements respectively, zero dynamic. All 225 normalized corpus records agree between Node bjO72j and native jDylN0, preserving hashes and all 166 prior completions. Six Promise fixtures raise completions to 172 (111 reported successes, 61 unchecked; 14 parse errors, 38 runtime errors, one reported failure). Finally, thenable-verify and withResolvers report 8/7/6 checks; basic/thenable structure prints remain unchecked. Promise.try stays unchecked in the corpus but separate expected-output evidence verifies four asynchronous OK lines and exposes its self-catching TypeError assertion. Evidence: build/promise-core-native-results.json, build/promise-core-corpus-comparison.json, build/promise-core-* and focused reports under the three Promise draft directories. Next: separate reviewed all/race, AggregateError and allSettled/any commits, then combined canonical validation. RegExp remains a separately bounded parser/matcher/object-layer effort.

### TS-199–203 checkpoint

Iteration/objects accepted (TS-199–203): 696/696 guests on each host without skips; 203 native entries have passing static-only/zero-dynamic evidence. The initial matrix took 1644465ms and retained one globalThis Zig mingw cache file-open failure; its unchanged isolated rebuild and both-host execution pass. Tooling passes 293/293 in 220662.0366ms; runner32/32 in 816.4794ms, ten probes and typechecking pass. Node 6bchHo/native XqXpYx match all 225 normalized corpus records exactly and preserve 179 completions (114 reported successes, 65 unchecked). Evidence: build/iteration-objects-native-results.json, native-retry.json, native-accepted.json and corpus-comparison.json with the same prefix, plus iteration-objects-* logs. Named functions, prepared function bodies, prototype setters, object spread, replaceAll and the suspension-context prerequisite remain reviewed isolated successors.

### TS-204–209 checkpoint

Functions/spread accepted (TS-204–209): 701/701 guests on each host without skips, 208/208 native static-only/zero-dynamic gates in 1658613ms without retries, and 293/293 tooling checks in 217585.0237ms. The initial tooling run was 292/293: the preserved E37 named-function input now exposes its strict duplicate-parameter audit candidate; its exact expectation migration, complete both-host audit and full tooling rerun pass. Runner32/32 in 663.8071ms, ten probes and typechecking pass. Node ze6MwK/native OtfzoY match all 225 normalized corpus records and preserve all 179 completions (114 reported successes, 65 unchecked). Evidence: build/functions-spread-native-results.json, corpus-comparison.json with the same prefix, and functions-spread-* logs including initial failures. Binary/reference extraction, pending operands and generator-start execution remain reviewed isolated successors. Generator bodies containing yield remain unsupported.

Resolved BigInt review: TS-299, TS-302 and TS-304 now certify numeric assignment, compound-assignment and update targets. TS-303 stores BigInt syntax as exact numeric text, preserving native JSON snapshots. TS-307 guards native manifest entries, and TS-312 narrows the idle dispatch history projection without changing its wire output. The bigint-foundation acceptance retains the initial failures, corrected manifest supplement and complete 291-gate evidence.

The temporal-regexp milestone passes all 306 native gates directly. Its 225-record corpus comparison preserves 190 completions; nine incomplete Temporal fixtures advance diagnostics. The Instant fixture additionally expects Number epochNanoseconds and false for malformed equals input, contrary to the implemented specification. Preserve those original fixtures and use standards-correct expected-result tests for new Temporal behavior.

2026-11-10 PlainTime/Duration milestone accepted (TS-314–327): 813/813 guests on each host without skips; all 320 native static-only/zero-dynamic gates pass in 3832978ms. Tooling295/295, runner35/35, ten probes and typechecking pass. Corpus node-GNoOVK/native-dyLrNQ matches all 225 normalized records, preserving all 190 prior completions; 1 records change diagnostics/output. Original fixture bytes remain unchanged. PlainTime parsing, formatting, rounding, conversion and field replacement, plus Duration core/conversion/parsing/serialization are accepted. Arithmetic and option-aware Duration strings remain isolated successors. Evidence: build/plain-time-duration-*; initial sandbox probe failure retained separately, followed by all ten passing with Zig access.

2026-11-10 Temporal arithmetic/date milestone accepted (TS-328–340): 826/826 guests on each host without skips; all 333 native static-only/zero-dynamic gates pass in 4153817ms plus 22524ms for an unchanged string-split linker/cache retry; initial failure evidence is retained. Tooling295/295, runner35/35, ten probes and typechecking pass. Corpus node-iUdnDj/native-tePdc4 matches all 225 normalized records, preserving all 190 prior completions; 2 records change diagnostics/output. Original fixture bytes remain unchanged. PlainTime/Instant arithmetic and differences, Duration arithmetic/string rounding, ISO calendar fields and PlainDate construction/formatting/parsing are accepted. PlainDate conversion methods, calendar arithmetic and remaining Temporal APIs are still pending. Evidence: build/temporal-arithmetic-date-*.

2026-11-10 PlainDate/PlainDateTime milestone accepted (TS-341–359): 845/845 guests on each host without skips; all 352 native static-only/zero-dynamic gates pass in 4500997ms. Tooling295/295, runner35/35, ten probes and typechecking pass. Corpus node-EKRksj/native-mCj886 matches all 225 normalized records and preserves 190 prior completions; 190 complete, 1 records change diagnostics/output. Original fixture bytes remain unchanged. PlainDate conversion, replacement, arithmetic and exact calendar differences are accepted, along with ISO PlainDateTime construction, formatting, parsing, conversion, part/field replacement, rounding and arithmetic. DateTime differences and remaining Temporal APIs are follow-ups. Evidence: build/temporal-date-time-*.

[Class field integration review](class-fields-review.md) records constructor timing, Realm/source ownership and initializer-context risks. Public fields without initializers are integrated pending combined acceptance; full initializer contexts remain a follow-up.

[Date host review](date-host-review.md) found historical/extreme local-time differences in the pinned backend. Date implementation should use an explicit UTC default timezone and engine-owned calendar semantics; arbitrary system/IANA timezone support remains separate. No Date API is enabled by the review.

2026-11-10 DateTime differences / YearMonth / MonthDay milestone accepted (TS-360–380 and TS-382): 867/867 guests on each host without skips; all 374 native static-only/zero-dynamic gates pass in 4936802ms. Tooling295/295, runner35/35, ten probes and typechecking pass. Corpus node-EGRfd0/native-cZs4ci matches all 225 normalized records and preserves 190 prior completions; 190 complete, 2 records change diagnostics/output. Original fixture bytes remain unchanged. Exact PlainDateTime differences and ISO PlainYearMonth/PlainMonthDay construction, parsing, formatting, conversion, replacement and supported arithmetic/differences are accepted. PlainDate part conversions and shared calendar-bearing lookup are included. Public fields without initializers are included, with constructor timing, suspended keys and execution-budget checks. Initializer expressions, private fields, static blocks, ZonedDateTime, relative Duration APIs and locale-aware formatting remain follow-ups. Evidence: build/temporal-year-month-day-*.

Zoned difference review (TS-426): direct reuse of the plain date-time difference rounder is not ready. A 1296-case read-only experiment found 192 missing zoned boundary failures and four differences caused by Node's pre-consensus calendar-window behavior. Preserve Rift's corrected calendar-added window start (TC39 proposal-temporal PR3319); implement checked zoned windows/day spans before adding until/since. See [review](temporal-zoned-difference-review.md). Existing acceptance counts and original corpus fixtures are unchanged.

Initializer follow-up (TS-436): the empty-field frame does not establish the lexical this/new.target/super boundary needed by initializer expressions and arrows. Implement that boundary with planner/retained-source validation before enabling initializers. Seven reference cases and concrete execution sites are recorded in [the class field review](class-fields-review.md).

2026-11-11 successor checkpoint: TS-437 establishes the initializer boundary and passes 918/918 isolated Node guests, focused native/regression gates and tooling295/295; integration waits for the zoned milestone's frozen readers. [Static block review](class-static-blocks-review.md) identifies its required independent variable scope and ordered static-element execution. TS-439 adds non-Intl locale casing in isolation. [Normalization provider review](string-locale-prerequisites.md) validates 4,788,784 Unicode 17 checks on both hosts, enabling separately tested normalization and normalized comparison work. These are pending successors, not additions to the accepted totals below.

The TS-442 isolated successor now passes 921/921 Node guests and its native gates. Its full C++ corpus comparison matches all 225 records between hosts: 117 reported successes and 74 unchecked completions (191 total), preserving all 190 preceding completions. string_additional_methods.js supplies the sole gain with 35 reported checks. Combined canonical validation and publication remain pending; this is fixture progress, not a conformance percentage. Static blocks are the next isolated class increment.

2026-11-10 Duration / Date milestone accepted (TS-383–391 and TS-394–408): 891/891 guests on each host without skips; all 398 native static-only/zero-dynamic gates pass in 5372423ms. Tooling295/295, runner35/35, ten probes and typechecking pass. Corpus node-2WBg8D/native-GsRAAE matches all 225 normalized records and preserves 190 prior completions; 190 complete, 3 records change diagnostics/output. Original fixture bytes remain unchanged. Temporal Duration comparison, total and round support plain relative dates with exact arithmetic. Date supports clipped construction, ISO and required display-string parsing, UTC fields/formatting, setters, generic JSON and locale fallbacks. Date uses UTC as its default timezone and a Realm-local clock seam. Temporal.Now exposes instants, the UTC timezone identity and plain ISO projections for UTC/fixed-offset timezone strings. Zoned relativeTo, ZonedDateTime, system/IANA timezones, ECMA-402 formatting and arbitrary legacy date parsing remain follow-ups. Evidence: build/temporal-duration-date-*.

2026-11-11 compiler inspection follow-up: [TS-444](validation/ts-444-array-widening/README.md) demonstrates native loss of array aliasing when mutable element types widen across a helper return. Uniform initializer storage fixes the isolated static-block path. Audit other shared mutable array conversions with reduced both-host probes; static coverage alone does not detect this failure. [TS-445](regexp-named-captures-review.md) defines the next named RegExp capture increments; unique ASCII names are in isolated validation, while Unicode names and disjoint duplicates remain separate work.

Unicode RegExp follow-up: docs/regexp-unicode-mode-review.md records the strict parsing, code-point traversal and validated simple-case-fold prerequisites. Decide and document the inside-surrogate lastIndex behavior against open ECMA-262 issue128 before exposing that path. The TS-451 instruction-union compiler finding is reduced in docs/validation/ts-451-instruction-union; explicit instruction construction passes the native gate.

2026-11-11 Zoned Temporal / classes / String / named captures milestone accepted: 923/923 guests on each host without skips, all 430 native static-only/zero-dynamic gates pass; the initial matrix took 5877524ms and two disk-space failures passed unchanged-source retries after removing regenerable LLVM intermediates (original failures retained in parity-rollup-native-before-disk-retry.json; retries in parity-rollup-native-disk-retries.json), tooling295/295, runner35/35, ten probes and typechecking pass. Corpus node-d5Z01A/native-7doHd7 matches all225 normalized records, preserves190 prior completions and reaches191 (117 reported successes,74 unchecked completions). The added original fixture is string_additional_methods.js with35 checks; all original bytes remain unchanged. UTC/fixed-offset ZonedDateTime and zoned relative Duration operations, public field initializers, static blocks, Unicode normalization, non-Intl locale casing/comparison and unique ASCII named RegExp captures are included. Descriptor validation avoids temporary arrays and unnecessary absent-accessor checks, restoring the existing native timeout gate without changing assertions. The failed initial zoned build, its successful Zig cache-open retry, both 913/917 timeout runs and diagnostic timing comparisons remain retained. This fresh full matrix supersedes their incomplete acceptance. IANA/system timezones, Intl, private fields, Unicode/escaped capture names and disjoint duplicate names remain follow-ups. Evidence: build/parity-rollup-*, docs/native-harness-performance.md and feature reviews.

Private class follow-up: [the design review](class-private-elements-review.md) identifies null-only private environments in callable/frame metadata as an integration prerequisite. Receiver-owned private storage and Unicode private-token scanning are isolated successors; neither admits private class execution yet. Preserve complete-class early-error validation, closure/suspension capture and initialization order when integrating them.

2026-11-11 TS-461 review found a pre-existing class accessor grammar error: get/set followed by a line break and a property name was incorrectly split into two fields. Two success assertions in test/class-empty-fields.ts encode that mistake. The private audit reproduced it for get followed by a private name. Node --check and the specification's left-to-right ASI rule reject these forms because the property name continues an accessor definition; a line break does not restart the parse. Correct the shared lookahead, remove the field fallback, and migrate those two exact TypeScript inputs to rejection assertions with their original versions retained. This repair is in the isolated TS-461 scope and remains unaccepted; canonical Unicode inputs stay frozen. Evidence: build/private-class-edge-reference.json and build/check-private-asi-reference.mjs. Original C++ fixtures remain untouched.


2026-11-11 TS-462 bounded positive-fixture grammar review is complete:117 exact source literals across five class/object-method tests were independently syntax-checked with Node.115 pass; the only two contradictions are the already identified TS-461 accessor-newline expectations. No additional grammar finding in this sample. docs/class-fixture-grammar-review.md records extraction exclusions and distinguishes syntax review from semantic correctness. Canonical runtime and C++ fixtures are unchanged.

2026-11-11 Unicode RegExp milestone accepted (TS-449,451,454–456):928/928 guests on both hosts without skips;435 native static-only/zero-dynamic build gates in 5831499ms;tooling295/295,runner35/35,ten probes and typechecking pass. Corpus node-ZxCBzX/native-dSLloe matches all225 normalized records and preserves all191 preceding completions; current completions=191. Unicode/escaped capture names, disjoint duplicate names, strict u-mode syntax, code-point matching and Unicode17 simple case folding are accepted. Captures and public indices remain UTF-16. Inside-pair lastIndex selects the containing character and reports its actual start, as documented against open ECMA-262 issue128. Property escapes, v-mode and lookbehind remain unsupported. The interrupted initial build log is retained; recovery reused only checkpointed PASS entries whose executable hashes matched the frozen source snapshot. Generated LLVM intermediates are removed only after successful build/coverage gates; executables and raw validation reports are retained. Evidence: build/regexp-unicode-rollup-* and the Unicode RegExp feature/review documents.

2026-11-11 Private-field milestone accepted (TS-458,459,461,463–465):934/934 guests on both hosts without skips;441 native static-only/zero-dynamic gates;tooling296/296,runner35/35,ten probes and typechecking pass. Corpus node-ehOwl3/native-X4jtE1 matches all225 normalized records and preserves191 preceding completions; current completions=191. Instance/static private fields, lexical private references, direct eval, assignments/calls and suspended expressions are accepted. Private methods/accessors and private-in remain unsupported. Historical fixture strings are preserved, including explicit TypeScript expectation migrations. The producer now reports existing RegExp/numeric syntax errors and certified private-name errors through closed rule provenance. Initial compiler failures and passing controls remain retained. TS-473 accepts 30-second deadlines only for the four errors-b/map-default runtime cases; the hash-verified preceding baseline also exceeded the old 10-second limit. Inputs, expected transcripts and timeout classifications are unchanged; see docs/native-guest-deadlines.md. Evidence: build/private-field-rollup-*, feature reviews and compiler-contract.md.

[The C++ builtin surface review](cpp-builtin-surface-review.md) classifies all525 method/getter macro registrations after private/Reflect integration:501 shape/arity matches,14 standards-correct differences matching Node and10 known weak-storage blockers. This is a bounded Node-hosted API inventory, not semantic/native acceptance or a conformance percentage. Do not port obsolete Temporal methods or C++ descriptor deviations merely to match names.

2026-11-11 Reflect/legacy milestone accepted (TS-466–472):941/941 guests on both hosts without skips;448 native static-only/zero-dynamic gates;tooling296/296,runner35/35,ten probes and typechecking pass. Corpus node-UaBiIk/native-kYH80d matches all225 normalized records and preserves191 preceding completions; current completions=191. Private methods/accessors and private-in, Reflect introspection/mutation/access/apply and bounded UTF-16 escape/unescape are accepted. Guest coercion/order, receiver/Realm behavior and budgets retain focused expected-result checks. Historical fixture bytes and initial failed runs remain preserved. The accepted TS-473 deadlines carry forward unchanged. Evidence: build/reflect-legacy-rollup-* and feature reviews.

[The global/manual-registration review](cpp-global-surface-review.md) supplements
TS-475 with 60 entries: 51 present with Node-matching metadata, six known weak-API
gaps, two C++ host GC hooks and one internal this binding. It classifies all 34
non-completing corpus records without changing fixtures. No new ordinary global
or JSON method gap was found. Genuine weak storage and collector hooks remain
prerequisites; do not add placeholders or compatibility exceptions to inflate
corpus completion. The 191/225 completion count is not semantic conformance.

[The class initialization review](class-initialization-semantic-review.md) finds
17 supported cases matching explicit outputs and independent Node on both Rift
hosts, with one retained Proxy-dependent case. It covers ordering, returned-object
construction and private brands; this is bounded semantic evidence, not full
class conformance.

2026-11-11 IANA foundation milestone accepted (TS-478,479,480,482,483):946/946 guests on both hosts without skips;453 native static-only/zero-dynamic gates;tooling296/296,runner35/35,ten probes and typechecking pass. Corpus node-03XBoo/native-975Xff matches all225 normalized records and preserves191 preceding completions. The pinned2026f data, primary identifiers, bounded historical/recurring offsets and strict adjacent transitions are accepted internally; local-time resolution and guest named-zone admission remain pending. Historical fixtures, initial failures and public range guards remain preserved. Evidence: build/iana-foundation-rollup-* and isolated feature reviews.

[The assertion harness review](test262-assertion-readiness.md) verifies 23 passing
and failing controls in strict/non-strict mode against explicit outcomes in Node
and both Rift hosts. This advances harness readiness; corpus admission and a
conformance baseline remain open.

The [Script diagnostic refresh](test262-starter-refresh.md) retains all 33 starter
files and 60 variants. Both hosts now produce expected outcomes for all 57
executable variants, closing the five earlier parser-certification gaps. All 17
diagnostic controls per host pass. The three module/async-profile exclusions
remain, and no cases have been admitted as conformance passes.

2026-11-12 zoned Temporal milestone accepted (TS-484,486,487):949/949 guests on both hosts without skips;456 native static-only/zero-dynamic gates;tooling296/296,runner35/35,ten probes and typechecking pass. Corpus node-lR4v4q/native-65hS99 matches all225 normalized records and preserves191 preceding completions. Named-zone local-time resolution, shared Temporal consumers and pinned2026f guest identifiers are accepted. Focused evidence includes 1170 public controls,1794 identifier controls and82800 rounding cases on both hosts; the documented PR3319 rounding and Factory admission differences retain independent justification. Original fixtures, failure evidence and range guards remain preserved. Evidence: build/iana-temporal-rollup-* and isolated feature reviews.

2026-11-12 Script-return milestone accepted (TS-492): 950/950 guests on both hosts without skips; 457 native static-only/zero-dynamic gates; 296 tooling tests, 35 runner tests, ten probes and typechecking pass. Corpus node-QNhNHq/native-gwfRnh matches all 225 normalized records and preserves 191 preceding completions. Bounded Script preparation certifies return outside functions only after a complete supported-grammar audit; original S20 bytes and the reviewed catchable eval SyntaxError migration are preserved. TS-494, TS-496, TS-501, TS-502 and TS-504 remain isolated and are not accepted by this milestone. Evidence: build/script-return-rollup-* and docs/script-return-certification.md.

2026-11-13 Contextual identifiers milestone accepted (TS-494, TS-496, TS-501, TS-502, TS-504): 955/955 guests on both hosts without skips; 462 native static-only/zero-dynamic gates; 296 tooling tests, 35 runner tests, ten probes and typechecking pass. Corpus node-QsqHq3/native-nV5u73 matches all 225 normalized records and preserves all 191 preceding completions. Async Statement certification, strict reserved names, and contextual await/yield/let grammar are integrated. Original fixtures and explicit historical expectation migrations are retained. Evidence: build/contextual-identifiers-rollup-*.

2026-11-13 Ordinary identifiers milestone accepted (TS-509): 956/956 guests on both hosts without skips; 463 native static-only/zero-dynamic gates; 296 tooling tests, 35 runner tests, ten probes and typechecking pass. Corpus node-qYQwMg/native-PXLkDL matches all 225 normalized records and preserves all 191 preceding completions. Unicode identifiers and escaped names retain raw keyword provenance and UTF-16 spans. Original fixtures are unchanged. Evidence: build/ordinary-identifiers-rollup-*.

2026-11-13 Lexical milestone accepted (TS-511, TS-514, TS-516, TS-519, TS-521): 961/961 guests on both hosts without skips; 468 native static-only/zero-dynamic gates; 296 tooling tests, 35 runner tests, ten probes and typechecking pass. Corpus node-vXT1TU/native-kupwDB matches all 225 normalized records and preserves all 191 preceding completions. Script whitespace, legacy numeric/string literals Unicode RegExp property escapes and legacy RegExp character escapes are integrated. Original fixtures and reviewed historical expectation migrations remain retained. Evidence: build/lexical-rollup-*.

Symbol descriptor review (TS-537): 53 supported builtin/prototype targets expose
32 matching symbol descriptors on both Rift hosts. Node additionally exposes
Array species/unscopables and two modern iterator symbol properties. The first
pair remains deferred Array scope; the latter belongs to absent modern Iterator
and resource-management APIs. Inspect Array species construction (TS-538) before
adding its getter: the current bounded operation would reject the resulting
intrinsic constructor. A metadata-only addition would break ordinary Array
methods. Preserve the current explicit unsupported behavior until reviewed.
