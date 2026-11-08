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

| Priority | Work | Evidence and completion condition |
|---|---|---|
| P1 | Repair the normal test command | `script-execution-inputs.test.mjs`, introduced in `7f887deb`, requires positional arguments absent under `node --test`. Add no-argument setup without dropping its assertions; retain the explicit invocation. |
| P1 | Stop tests overwriting historical reports | Running `npm run test:test262` changed five initially clean tracked reports in TS-035C/E2A. Write fresh reports under `build/`; restore the old bytes and retain the new run separately. |
| P1 | Separate historical acceptance from regression testing | `script-ledger-checkpoint.test.mjs` invokes an old full-tree preservation check that currently fails on `Claude Roadmap.md`. A routine roadmap edit must not invalidate checkpoint behavior. Keep the historical verifier available, and run current checkpoint API/fault assertions independently. Do not update old hashes to manufacture acceptance. |
| P1 | Make the test suite portable and self-contained | Several tests depend on a user-specific temporary corpus, old native binaries, and executable test helpers under `docs/validation`. Explicitly prepare the pinned corpus, build prerequisites, and relocate scratch work to `build/`. Preserve hard-link/junction tests; distinguish Windows sandbox permission failures from product failures. |
| P1 | Route the CLI through Script execution | Independently reproduced: CLI rejects `for` with `++`, `try/catch`, and `new`, while Script execution prints `10`, `boom`, and `3` for the same programs. Use `prepareBoundedScript` and `evaluateScript`; migrate diagnostics, strict/sloppy behavior and resource tests explicitly. Require freshly built Node/native CLI cases. |
| P2 | Remove the legacy execution path after migration | Migrate the observation driver and host tests before deleting `Environment`, legacy profile branches and the evaluator re-export. A one-line CLI switch alone is not a complete migration. Preserve evaluation-order and Realm tests. |
| P2 | Publish a small, honest conformance baseline | Use the pinned starter corpus with unchanged denominators and separate pass, fail, unsupported, harness, timeout and host-fault outcomes. Verify actual harness behavior before adding syntax solely to parse it. Do not present observation or synthetic fixture results as conformance. |
| P2 | Improve current-state documentation and readability | Add a concise architecture entry point and CLI/internal/unsupported feature table. Format and split source in bounded changes with semantic checks; review parser audit modes and capability objects individually rather than deleting all safeguards wholesale. |
| P2 | Archive large historical artifacts | Inventory size and Windows path lengths, choose a retrievable artifact location, then replace raw tracked artifacts with summaries and references. No mass deletion or history rewrite as part of this review. |

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
