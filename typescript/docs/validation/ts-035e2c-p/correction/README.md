# E2c-P bounded review correction

This additive candidate supersedes only the resolution-cleanup diagnostic gap in
36f17fd. Original227 evidence/proposal files and all5898 pre-E2c baseline identities
are verified unchanged. No production, public API, error schema, token authority,
history or earlier failure artifact changes. The optional22-case live-anchor sweep
remains incomplete, exactly as retained in the original README; it was not rerun.

Current complete six-file manifest: proposal-manifest.json. Four proposal paths
still point to original immutable artifacts. Only two proposed files changed:

1. script-ledger.mjs: on a non-ENOENT unlink rejection during explicit resolution,
   append `{stage:'resolve-cleanup-unlink',code:error.code ?? null}` to the private
   diagnostics before rejecting script-ledger-store/indeterminate. The pending
   bytes/generation/value/owner and cleanup marker remain unchanged. Each repeated
   failure adds its own diagnostic; successful recovery retains all diagnostics.
   ENOENT remains successful cleanup without an added failure diagnostic.
2. E2b support.mjs: replace only the pinned proposed-ledger hash in its guarded
   v3-to-v4 fixture migration. No fixture, assertion or other expected value edits.

Current proposed ledger SHA256:
`fae6321287e971662257621a06336dd1a52fda29b4becb0513749160010f3440`.
The planner proposal is unchanged; it already hashes the ledger bytes. E2a's
proposed test reads those bytes for its exact closure migration, so no additional
old-file edit is necessary. Policy remains v4, closure242, selection2/ledger2/
checkpoint1; byte-level identities are refreshed, not public versions.

## Focused evidence

`faults-MWaTOW/results.json`: three copied-private scenarios, four repeated cleanup
failures and three recoveries. Published destination and absent destination each
receive EACCES then EBUSY on consecutive explicit resolution calls. Each error
checks exact native Error shape/message, full ordered diagnostics, same pending
object and bytes, same anchor/owner/value, released busy flag with pending lock
still active, rejected inspect/report/append/checkpoint, and no additional
open/write/sync/close/link or append. The subsequent successful resolve either
acknowledges generation0 once or returns null without publication. Both preserve
the complete ledger/report. A third already-unlinked scenario verifies ENOENT
cleanup adds no diagnostic and acknowledges once. These hooks exist only in the
new copied evidence module, not the complete production proposal.

`migration-j58uuu/results.json`: actual corrected-source planners in both lanes,
60slots each, full current-context assertion;11 complete guarded selection
migrations and4 rejection controls;28 complete checkpoint literal migrations.
Every migrated policy equals the actual planner's complete policy. Each checkpoint
changes exactly the proposed ledger entry and aggregate closure hash, retaining
the other241 entries and every other history/report/envelope field. Full bytes,
lengths, old/new SHA256 and independent manifests are retained. This checks the
affected closure identities; it does not rerun or inflate prior semantic counts.

`verify.mjs`: six whole-file original/current-proposed SHA256 and syntax checks,
two previous-proposal identities, all227 retained candidate files and5898 baseline
files. Original verifier remains valid for original immutable candidate artifacts.

`prepare-initial.mjs.txt` and `prepare-failure.txt` retain an initial renderer
assertion: its in-memory manifest row was updated before the dependent hash lookup.
Capturing the prior hash before the loop fixed this evidence-rendering issue.
No production or old-candidate output was affected. The fault and migration probes
passed their first execution; no retries or full suites/builds were run.

Run from typescript:

```text
node docs/validation/ts-035e2c-p/correction/verify.mjs
node docs/validation/ts-035e2c-p/correction/faults.mjs
node docs/validation/ts-035e2c-p/correction/migrations.mjs
```

Faults creates fresh directories and uses hard links; the successful run used
approved host permissions consistent with the retained EPERM witness. Migrations
needs no hard-link privilege. The additive renderer is provenance, not permission
to refreeze baselines after source changes. Stop for actual and second re-review.
