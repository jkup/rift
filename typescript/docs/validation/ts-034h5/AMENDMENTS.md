# H5 compiler adjustments and retained failures

The coordinator approved the exact test-only `matchingConstructorSlot` helper
on 2026-11-04 after independently reproducing SC1090 and the local-narrowing
proposal (3481 static, zero dynamic; Node/native `true false false`). The helper
is now applied only in the new H5 driver. Original source/build/coverage,
intermediate reductions, sandbox failures, and the unapplied proposal as
submitted remain immutable in `compiler-investigation/`.

During completion of the A matrix, forwarding a locally declared narrower
ValueCompletion callback through the Builtin helper produced one dynamic
adapter. The assignment already approved actual Builtin signatures and the
coordinator explicitly authorized equivalent local narrowing in new tests.
The correction uses the existing `Builtin` declaration for `fault`, with
`Completion` return annotations on forwarding callbacks. Bodies, exact throw
identity, and all assertions are unchanged. `callback-before.log`,
`callback-before.ts.txt`, and `callback-after.log` retain the evidence:
4180 static plus one dynamic operation before; 4180 static and zero dynamic
after. The final expanded driver separately passes at 4274 static/zero dynamic.
No production workaround, API widening, pin change, or dynamic-tier admission.

A parser source review also found a token-kind omission in the new branch:
string literals containing `new` were accidentally treated as keyword tokens.
The final parser requires word-kind `new` and applies the excluded-operand
check only to word/punctuation tokens. New literal controls cover `new`, `-`,
`+`, `!`, `delete`, `typeof`, and `void`, asserting both literal evaluation and
argument evaluation before nonconstructor TypeError. This is a semantic fix
within the assigned parser ownership, not a compiler workaround.

The first full build was running during that fix. `rebuild-corrected-parser.mjs`
rebuilds and separately gates the first 30 entries, a conservative superset of
entries that could have read the earlier parser. The remaining entries compiled
after the correction. The original first-pass records remain in
`initial-full-build-results.json`; final results replace early entries only
after their corrected-source checks pass.

Initial missing-Zig-PATH/installation sandbox failures, the host-suite temporary
rename denial, and the observation-suite symlink denial are retained. Successful
runs use the installed pinned Zig and approved access; these are not skips or
relaxed compiler gates. The unchanged H4 historical preservation script rejects
H5 ownership/migrations as expected; its report is retained separately, and the
H5 verifier checks whole-file replacements against base `7f80383`.

## Approved bootstrap migration applied

On 2026-11-04 the coordinator reviewed and independently validated the exact
`migration-investigation/proposed-migration.json` proposal, then approved its
four replacements and the whole-file verifier allowlist amendment. The actual
`test/script-realm-bootstrap.ts` now includes the canonical symbol in its exact
key inventory, verifies its full descriptor/Realm/name/length/nonconstructor
metadata, and asserts legacy absence. All prior six keys, assertions and labels
remain. The original failed source, four failed runs and the proposal as
submitted remain unchanged in the investigation directory.

The actual migrated driver passes strict typecheck, static-only build,
3926/3926 separate zero-dynamic coverage and B01–B18 on both hosts with both
runtime inputs. `bootstrap-final-build-results.json` and
`bootstrap-final-replay.log` record the affected actual gate/replay. The H5
whole-file verifier reproduces all four replacements from base and permits
no other change to that old test. Final inherited acceptance is17/17; the
summary references earlier passed groups without repeating unchanged suites.
