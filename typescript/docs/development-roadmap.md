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

The 84 compiled test drivers now have identified execution routes: 69 through
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
