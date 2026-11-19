# TS-035E2c implementation evidence

Base 786e5d5; corrected E2c-P e64a4d4. The six existing files match the
corrected proposal manifest byte for byte. Production adds process-local
checkpoint ownership, synchronous reservation, explicit indeterminate resolution,
and epoch-based reopen/revocation; the planner exposes its read-only current
context assertion. There is no restart authority, admission, or power-loss claim.

Implementation and required validation are complete, pending final coordinator
actual/independent second/root acceptance. All sessions have finished.
COORDINATION remains coordinator-owned.

## Completed validation

`checkpoint-host-2.txt` / `suite-JQTZ5K/results.json`: public actual-source copies
pass both lanes with 60 slots (19 feature / 41 profile), ownership/retry/no-op/
epoch/revocation/chain controls; 56 public boundary controls with zero getters;
11 guarded full selection migrations and four negative controls; 28 complete
checkpoint literals through real checkpoint/reopen APIs; 12 rehashed-chain
mutations rejected through reopen and checkpoint, plus noncanonical whitespace;
22 isolated fault controls; three corrected cleanup scenarios with four repeated
failures and three recoveries, preserving ordered diagnostics and pending locks.

`additional-host-2.txt` / `faults-lI1yyS/results.json`: four additional actual API
controls cover ordered pre-link write/close/unlink diagnostics and an explicit
fresh retry preserving the old temp, pending resolution stat/read failures and
recovery, exclusive directory preservation/opaque tokens/no selection refund,
and synchronous reopen locks/revocation. The main test now includes this stage;
it was run separately after the unchanged main stages completed.

`inherited-host-1.txt` / `validation-uQ9FOd/results.json`: migrated E2b149 controls
and28 full literals, E2a8 groups/24 traces/11 projections, E1 133, host73,
decoders21, observations22, runner20, and typecheck pass. Every historical
consumer that writes evidence ran in a new replay tree. Source-copy hashes are
retained. Before/after preservation passes all5898 baseline entries with exactly
six authorized replacements, plus all227 original design-candidate identities.
Retained212 records per lane and71 gates remain historical evidence; no native
builds or probes were run. All60 slots remain blocked.

## Approved bounded migration

The exact accepted `extended.mjs` proposal still asserts four exports and no
`node:fs`/`await` anywhere in the ledger. E2c necessarily adds four async exports
and filesystem operations. `migration-ambiguity.mjs/json` reproduces both stale
assertions against the exact accepted bytes. The unchanged full replay retained
in `validation-uQ9FOd/extended-unmigrated.txt` fails at its final four-export
assertion after its preceding controls. Its three review-mutation recovery cases
and complete33-file all-null positive were saved by the unchanged runner.

The coordinator and independent second reviewer approved the exact isolated-only
migration SHA25694434105b4a293214c8a145571c16ffc13fbf912990bbb4a56716bbb5cd4ee6e.
Root independently reproduced the original failures and passed the exact proposal;
its witness is copied with source hashes in root-migration-review/. The original
proposal, renderer, failures and six actual file identities remain unchanged.

migrate-extended.mjs checks exact old/new whole-file hashes, single occurrences,
and equality after the two approved replacements. It only writes inside a new
E2c validation replay. It requires eight exact exports, checks the guarded
synchronous ledger section for no await/filesystem calls, and asserts338 controls.

extended-host-approved.txt / validation-S5FwLG/results.json passes the affected
extended replay: eight canonical reports,338 controls, zero getters, three schema
rejection/recovery cases, and the complete33-file all-null positive. Preservation
passes before and after. Unchanged previously passing suites were not repeated.

## Retained failures and test adapters

`public-initial.txt` and `link-reduction-7vTU8S/result.json` retain sandbox EPERM
on hard-link creation. Host-permission execution succeeded. The failed store
and temporary bytes remain. No blind link retry or production fallback exists.

`checkpoint-host-1.txt` retains an initial new-verifier path mismatch: the frozen
baseline uses `../typescript/...`, while the proposal uses project-relative paths.
The verifier now matches normalized absolute identities and asserts exactly six
matches and their original hashes. All comparisons remain enforced.

`additional-host-1.txt`, `additional-initial.mjs.txt`, and its renderer preserve
a test-adapter failure: intentionally withholding close let Node collect an open
FileHandle. The adapter now retains its own handles and explicitly closes them
after asserting production diagnostics; no production code changed. The second
run passes. The failed test's temp remains evidence.

Only verified new `run-*/filesystem/alias-{junction,dir}` links were unlinked
after tests, with targets recorded in `owned-alias-cleanup.json`. No recursive
restore/delete or historical writes occurred. The optional unfinished22-anchor
design sweep remains historical and unclaimed.

## Rerun

From `typescript`, with Windows hard-link permissions:

```
node --test tools/test262/script-ledger-checkpoint.test.mjs
node docs/validation/ts-035e2c/validate.mjs
```

Use `--extended-only` for the approved migration stage or `--unaffected` for the
other inherited stages. Each invocation creates fresh directories; old raw
evidence is input only. `prepare-tests.mjs` records reviewed-control provenance
but is not needed for ordinary execution. Fault hooks and synthetic inspector
controls exist only in copied evidence modules, never in production.
