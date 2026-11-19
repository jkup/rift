# Current work

## TS-573 — Clearer getting started

Status: complete (2026-11-19). Implementation ownership released.

Make the Node quick start the default, explain which program each build compiles,
and label native compiler preparation and Test262 as separate developer workflows.
Documentation only; preserve compiler pins, build commands and semantic behavior.

README now leads with a Node quick start and expected output, explains Node vs
native builds, and links optional native setup and Test262 separately. Usage and
compiler guides explain the pinned patched compiler, setup scope and full native
driver build without presenting them as quick-start prerequisites.

Validation: format, lint, readability 9/9, typecheck and runner 36/36 pass. The
README counter example produces its expected output on Node and the existing
native executable; inline Node execution prints 42. Diff checks pass. No native
rebuild or full semantic suite was needed for these documentation-only changes.
The owner authorized committing and pushing the accepted changes to main.

## TS-572 — CI efficiency review

Status: complete (2026-11-19). Implementation ownership released.

Reviewed the sole workflow and retained both useful check names. Push runs now
target main; PRs and manual dispatch cover branches. Added cancellation of
superseded runs and 10/15-minute job timeouts, removed full-history checkout and
duplicate TypeScript emission, and added ten Test262 runner regressions. Existing
assertions, semantic scope and structural allowances are unchanged.

GitHub run 44625939890 blocked both jobs before execution with a payments/spending
limit annotation. The repository is private; the exact balance/cause within that
billing category is unverified. No remote settings or spending limits changed.
`docs/ci.md` records coverage gaps and staged native/conformance recommendations,
plus the recommendation to keep standard GitHub-hosted runners for public launch.

Validation: format, lint, readability 9/9, typecheck, runner 36/36, Node guests
1003/1003, Test262 runner 10/10, native guests 1003/1003 using existing binaries,
and all ten freshly built compiler probes pass. Guest suites report no skips.
Workflow YAML parsing, unique keys, trigger/check-name inspection and diff checks
pass. Native/compiler logs are `build/ci-review-{native,compiler}.log`; guest
results are `build/guest-{node,native}-results.json`. No full native engine rebuild,
full Test262 execution, hosted Linux run or actionlint validation was performed.
The owner authorized committing and pushing the accepted changes to main.
The inspected remote CI run was blocked by account billing before execution.

## TS-571 — Native Test262 runner

Status: complete (2026-11-19). Implementation ownership released.

Added `npm run test262`: build one native driver with static-only compilation and
the zero-dynamic gate, check assertions once, then execute isolated variants with
a bounded process pool. Inputs are snapshotted once by content hash; includes are
shared. Reports retain every selected variant, unknown metadata denominators,
explicit skips, unsupported execution, limits, timeouts, crashes and harness/input
errors. Default corpus is the sibling `../test262`; selection, worker count,
deadline and output directory are configurable. The runner selects the existing
pinned Windows Zig bundle automatically (the machine's default Zig is 0.17.0),
or requires Zig 0.16.0 on PATH. Historical adapters remain
available; their raw/module restriction is unchanged unless explicitly opted out.

The complete corpus at `2e58f87d8350ad51224617a041c6e041d52f8444` was cloned to
the standard sibling project location. All 53,795 test files were discovered and
prepared: 81,939 runnable variants and 21,413 explicit skips, zero input errors.
This is an input audit, not full-suite execution. Audit evidence is under
`build/test262-runner-audit/run-lFVs6y`. The first audit's three errors exposed
valid raw modules and CR-only frontmatter; both now have regressions and original
execution bytes are preserved. The frozen adapter's default contract still passes.

Fresh native Math run: 654 variants, 618 pass, 30 fail, six resource limits,
zero skips or infrastructure failures; 7.45 seconds execution with eight workers.
Evidence: `build/test262-runs/run-I3WzH0`. Its build is 22,174/22,174 static
statements. No engine implementation was changed to improve the results.

Three 57-variant worker trials measured median execution of 2,417 ms (one),
855 ms (four), and 723 ms (eight), with identical classifications. Evidence:
`build/test262-runner-benchmark/run-ON7PCg`. These local trials overlapped other
validation/build work; they justify a configurable bounded pool, not a universal
speed claim or a comparison with the old runner.

Format, lint, unchanged structural ratchet, readability 9/9, typecheck, runner
36/36, new runner 10/10 on both Node and fresh native, historical protocol/input
34/34, and all ten compiler probes pass. The first native build hit sandboxed Zig
link failures; isolated unsandboxed builds pass. The first historical input test
run hit sandbox symlink restrictions; the unsandboxed rerun passes. Original logs
are retained. A full Node guest run passed 1003/1003, but overlapped a later
typecheck emission; the isolated repeat also passed 1003/1003 with no skips
(`build/test262-runner-guests-isolated.log`). No native full guest matrix rebuild
was needed: the semantic core and native driver source are unchanged.

Review also corrected runtime-negative classification: engine-created guest
ReferenceError/TypeError objects must satisfy matching negatives. New both-host
regressions cover this. The first 33-file smoke report retains five false failures
from that initial classifier. The final fresh smoke run is 55 pass, two
unsupported and three explicit skips, no failures, in 635 ms with four workers.
`build/test262-runs/run-Az3dF1` records that run with no temporary PATH or Zig
environment overrides. Exit 1 correctly retains the two unsupported outcomes.
No full-suite conformance execution or passing conformance score is claimed.

## TS-570 — Supporting-folder cleanup

Status: complete (2026-11-19). Implementation ownership released.

Consolidated runtime inputs under `test/fixtures` and ten active ScriptC checks
under `test/compiler`; the command is now `npm run test:compiler`. Kept the
single tested quick-start example. Retained current guides, cited design
references, data provenance/licenses and referenced validation records.

Removed 5,225 obsolete tracked files, including 529 standalone milestone notes
and 4,655 unreferenced archive files (about 374 MB). Retired plans, one-off
migration probes and audit scripts remain recoverable at `150d2625` in Git.
Moved 325 files; all 293 moved fixture/compiler inputs retain their exact bytes.
The retained archive was selected conservatively through direct and transitive
references; its original records were not rewritten.

Validation: format, lint, readability 9/9, typecheck, runner 36/36, Node guests
1003/1003, native guests 1003/1003 and ten fresh compiler checks pass. Native
guests used existing binaries: interpreter changes are documentation comments
only. Generated table contents and source pins are unchanged; provenance output
hashes reflect the relocated header references. All maintained Markdown links
resolve. The structural baseline decreased from 3313 to 3300 lines for the guest
runner; no allowance increased and no test denominator changed.

The first tooling run passed 292/299: filesystem sandbox restrictions and three
historical manifest-path lookups caused failures. After the explicit path
migration, an unsandboxed full run passed 298/299; the remaining checkpoint
lookup was corrected and its complete isolated rerun passed (1/1, no skips).
Compiler attempts with the default Zig and sandbox cache failed before execution;
the pinned Zig outside the sandbox passed all ten static-only/zero-dynamic gates.
Original and corrected logs remain under `build/layout-*`.

No fresh full-engine native rebuild or full Test262 conformance run was performed.
Final top-level review found no further obsolete root entries. Removed duplicated
fixture wording in CONTRIBUTING and checked every README link and image target.
All seven targets resolve; format, lint, readability, typecheck and runner tests
passed again. All 325 relocated files are present without obsolete duplicates.
The owner authorized committing and pushing the complete cleanup after this review.
See the [roadmap](docs/development-roadmap.md) for runtime followups. Earlier task
histories remain in Git.
