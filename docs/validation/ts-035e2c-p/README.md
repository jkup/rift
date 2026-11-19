# TS-035E2c-P design/evidence candidate

Base 45701bc; accepted E2b 542fe54. No production or real old-test changes.
Design: ../../script-ledger-checkpoint.md. Exact six whole-file proposals and
hashes: proposal-manifest.json. The two production proposals are NOT installed.

Final proposed sources were frozen by prepare.mjs. verify.mjs passed six complete
proposal identities and syntax checks and 5898 baseline tracked identities,
including C++, excluding only coordinator COORDINATION and this writer's TASKS
status. Retained acceptance remains 212 both lanes / 71 gates / 60 blocked,
19 feature / 41 profile. No full suite/native/compiler build was run.

## Evidence distinctions

* `run-20CkKl/`: final proposal, public probes using real planner/ledger tokens in
  an isolated byte copy. Both complete 33-file60-slot lanes, initial/partial/final
  checkpoints,19/41 counts, full old eight report expectations, busy/dirty/stale/
  revoked/spent/no-op ownership, retry retention and actual byte-tamper rejection.
  `results.json` has eight grouped results; `actual-selections.json` retains both
  complete selections. `public-node/` and `public-native/` retain all three exact
  generation files. Full source copies and actual filesystem evidence retained.
* `run-20CkKl/literal-manifest.json`: all28 complete ledger/report checkpoint
  literals (literal-00.json through literal-27.json), with exact byte lengths and
  SHA256. Expected histories/reports come from immutable accepted E2b design
  literals; the only selection changes are the explicitly migrated policy bytes.
  `literal-checks.json`:28 complete schema/history/report/byte checks using the
  copied actual E2b validators/report derivation plus12 complete rehashed tampered
  chains and one equivalent-JSON byte inequality control. These private validator
  controls do not grant public JSON authority or prove restart authenticity.
* `run-20CkKl/tampered/`:12 complete two-generation rewritten histories/envelopes.
  Their hashes form internally consistent chains, but not the retained live
  anchor. This is a byte-equality demonstration, not a substitute for schema
  validation. Public real-token tamper rejection is separately exercised above.
* `run-20CkKl/boundary-checks.json`:56 public argument/forgery/foreign module/error
  priority controls; zero accessor calls; exact exports/arities. Actual authority
  failure before closure, closure drift, context before bytes, no-op context
  recheck, failure atomicity and recovery. Mutations only in this new copy,
  restored exactly after the control.
* `run-20CkKl/migration-checks.json`:11 complete E2b closure migrations;240 unchanged
  entries and unchanged remaining selection fields per row; four negative guards.
  The independently migrated complete policy equals the public planner's saved
  policy, including every entry/hash/host field, not merely its claimed digest.
  Historical fixtures remain byte-identical. Proposed support's private migration
  export exists only in this probe copy.
* `faults-vrmiLV/`:final proposal,22 copied-private IO/ownership controls. Open,
  write, partial write, sync, close, link before/after effect, unlink before/after
  effect, acknowledgment, missing-versus-conflict resolution, reopen path/read/
  context failures, create path/mkdir/context failures, generation overflow,
  private invalid history, busy error precedence. Records include operation traces.
  Injection wrappers/control exports are ONLY in copied modules, never proposals.
* `run-EnhPLX/`, `faults-1zz8Ir/`:earlier successful proposal probes before private
  native-errno cleanup diagnostics and stronger migration guards were added.
  Retained rather than overwritten. Final claims use the final runs above.
* `run-HsErsG/` and `link-failure.json`:original sandbox link EPERM; initial
  publication rejected as indeterminate with pending bytes/temp retained. Bounded
  approved fresh-directory host runs succeeded. Earlier E2-P producer EPERM and
  root success remain untouched in ../ts-035e2-p/link-probe-failure.txt and
  ../ts-035e2-p/root-link-probe-review.txt. No rename fallback was introduced.
  Successful probe junction leaves were unlinked after retaining the rejection
  results, avoiding recursive traversal of a self-referencing evidence directory.
  Ordinary-directory symlink creation returned EPERM; that limit is recorded.

## Retained uncertainty: extra repeated-write probe

The optional extended real-live-anchor two-lane probe `anchors.mjs` did not finish:
after the node lane, it hit native host UNKNOWN/-4094 opening the isolated native
checkpoint file during repeated tamper/restore writes. See anchor-open-failure.txt,
anchors-initial.mjs.txt and `run-20CkKl/anchor-{node,native}/`. Do NOT count its22
intended rows as passed: it did not publish its result log. Those directories were
left untouched after failure. The native file may contain the deliberate tamper.

`open-reduction-cyeUM6/result.json` retains the bounded read-only inspection of that
file (regular, nlink1,217684 bytes), followed by three successful exclusive fresh
file write/read operations. This does not explain UNKNOWN or prove repeated-write
reliability. No blind retry, sleep/retry loop, rename, permission relaxation in
production, or other workaround was added. Actual and independent review must
decide whether further reduction is required before implementation. The completed
28 literal/12 rewritten-chain checks, both-lane public tamper control and56 public
boundary controls are distinct and remain valid. The extra22-case live-anchor
claim is explicitly incomplete.

## Reproduction

Run from typescript. All probe outputs are under this NEW evidence directory;
historical evidence and actual modules remain read-only. Each probe creates fresh
directories; do not rerun boundaries/migrations/anchors against a prior run unless
its intended owned targets are understood. `verify.mjs` is read-only and repeatable.

```text
node docs/validation/ts-035e2c-p/verify.mjs
node docs/validation/ts-035e2c-p/probe.mjs
node docs/validation/ts-035e2c-p/faults.mjs
node docs/validation/ts-035e2c-p/literals.mjs <new probe run>
node docs/validation/ts-035e2c-p/boundaries.mjs <new probe run>
node docs/validation/ts-035e2c-p/migrations.mjs <new probe run>
```

Local hard links may require an approved host run; retain sandbox failure first.
Do not run prepare.mjs against a changed base to silently update expected hashes.
It is a provenance-producing proposal renderer, not a baseline-update permission.
Frozen manifests must be reviewed as complete diffs. No implementation acceptance,
power-loss durability, durable restart trust, execution or admission is claimed.
