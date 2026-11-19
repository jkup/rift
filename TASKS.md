# Current work

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
