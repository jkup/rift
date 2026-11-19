# TS-035E2a candidate evidence

Base `72ed12c`; accepted contract `docs/script-selection-ledger.md` and corrected
E2-P `95bd364`. Selection only. Await actual, independent second, and coordinator
acceptance. No ledger, storage, receipt, launch, registry activation or successor.

`script-plan.mjs` exports exactly `prepareScriptSelection` and
`inspectScriptSelection`. Requests are descriptor-checked and copied before IO.
The unchanged fixed E1 reader and unchanged planCorpus supply authority and input
planning. Tokens are empty frozen ordinary objects authenticated by a private
WeakMap; inspections are fresh detached recursively frozen records. No selection
JSON or token copy grants authority. Every slot is blocked and execution is null.

The byte closure contains seven repository files, the Node executable and all
233 regular YAML package files (241 total). Paths are sorted ordinally and both
full records and aggregate hash are compared. Ancestor junctions, leaf aliases,
hard links and nonregular files reject. The YAML lookup spelling is checked
before accepting Node's realpath-resolved package location; otherwise Node's
resolver could conceal a junction. This is a host filesystem check, not an
atomic snapshot against hostile concurrent filesystem modification.

## Frozen projections and actual controls

- `selection-literals.json`: six complete actual production inspections: pinned,
  `wrong`, and whitespace revisions in both host planning lanes. All fields,
  metadata, harness occurrences, debts, authority and 241 closure records are
  literal. Only fresh UUIDs are normalized during comparison. Both successful
  33-file/60-slot projections also matched the complete accepted E2-P literals
  during capture. No validation command regenerates expectations.
- `input-literals.json`: five complete expected fault inspections derived from
  the frozen successful projection, without invoking the API. Retrieval and
  corrupt source retain null slots; first/second include failures and corrupt
  includes retain both slots, full debts and exactly empty failed harnesses.
- `fresh-selections.json`, `input-fault-results.json`: actual fresh inspections.
  `metadata-fault-results.json` covers malformed metadata and manifest metadata
  mismatch after successful byte verification in an isolated copied pin/corpus.
  Only that copy's manifest blob and input digest are changed. Old bytes and the
  production pin are unchanged.
- `second-check-results.json`: all 12 accepted traces executed in **each** lane,
  including compound authority/closure failures and no token on rejection.
  Nine cases per lane use real canonical reader/IO outcomes. Three successful
  differing-authority cases per lane are defensive-only: accepted E1 cannot
  return such records. The copied dependency wrapper supplies that impossible
  result explicitly; it is not claimed as a reachable registry state.
- `precedence-results.json`: initial authority/closure/selection/debt faults,
  actual invalid/missing registry, change after the second authority read, real
  hard-link and directory-junction rejection. The test also checks a changed
  complete closure list with its claimed aggregate digest deliberately masked.
- The new test checks exact exports/arity/errors, zero getter calls including
  array keys/every/iterator/index poison, empty/sparse/exotic/duplicate inputs,
  caller mutation while IO is pending, no caller freezing, fresh tokens and
  detached inspections, cross-module/JSON/cloned-token rejection, selected
  order, unknown/fixture rejection and pinned slot IDs.

`support.mjs` creates fresh isolated copies under this directory. The planner
body is unchanged: exactly five import destinations are redirected to wrappers
that delegate real IO/comparisons, observe ordering and trigger faults at known
boundaries. These are test copies only, never production exports or injected
options. Malformed metadata uses copied input/manifest pins explicitly. Scratch
cleanup asserts the resolved target is under this evidence directory. The real
fixed reader and real input module are unchanged.

`freeze.mjs` and `freeze-input-literals.mjs` are one-time capture tools, not test
steps. `initial-selection-literals.json` retains the original capture before
the YAML resolver alias correction; the final capture differs in the planner
source hash/aggregate closure and fresh UUIDs, with the accepted slot data intact.

## Validation

From `typescript`, using the existing Node installation and retained builds:

```text
node docs/validation/ts-035e2a/run-new-tests.mjs
node docs/validation/ts-035e2a/validate.mjs
```

All pass: 8 new test groups; E1 133; host/input/planner/ledger 73; Script decoders
21; observations 22; runner 20; typecheck. `suite-results.json` and named text
logs retain complete outputs. The new suite includes 24 ordered second-check
cases and six full production projections, not eight individual assertions.
Both lanes here are host planning data; no native build or compiler probe ran.
Observation tests use the existing accepted binaries.

`preservation-results.json`: all 5,277 accepted identities unchanged; retained
212 PASS guest records per lane and 71 native gates; 60 blocked variants per
lane with first-debt totals 19 feature / 41 profile. No denominator reduction.
`historical-identity-results.json`: all 4,977 historical evidence files unchanged
after final validation. Coordinator-owned COORDINATION is outside this task.

## Retained environment failures and safe replay

`initial-failure.txt` retains sandbox hard-link EPERM and elevated file-symlink
EPERM. Real hard-link and directory-junction controls subsequently passed. A
successful leaf-file symlink creation is **not** claimed on this Windows host.

The original E1 suite writes its old isolated fixture directory. Two sandboxed
attempts passed 132/133 but hit UNKNOWN/open on case.json. Their logs are
`initial-E1-failure.txt` and `second-E1-failure.txt`. Recursive historical backups
were taken beforehand, changed outputs were snapshotted under `replay-outputs`,
and all original bytes restored/asserted; both restoration records and backup
locations are retained. These failures were not silently retried as passes.

Automatic approval review rejected elevated versions of the broad restoration
runner (first with deletion, then without deletion) because interruption or
restore failure could damage historical evidence. Neither rejected command ran.
`rejected-validation.mjs.txt` retains the second rejected runner as text only.
The accepted safer runner has **no historical restore or deletion operation**:
it copies E1's unchanged test, production modules, manifest and literals into
new evidence, verifies every copied source hash, and runs all 133 tests there.
`E1-replay-source-identities.json` records exact source identities; the complete
new replay directory is retained. The remaining suites run their unchanged
original tests. Historical evidence is read and checked, never rewritten by
the final runner. Both final command sessions completed; none remains running.
