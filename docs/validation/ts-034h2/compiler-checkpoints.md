# H2 implementation checkpoint: exact compiler review required

2026-11-04, base4e01d44, branch codex/test262-classification.
This is an unfinished worktree, not an acceptance candidate or completed milestone.

Claimed TS-034H2 and froze the accepted contract (30S/10N/5X), ten literal traces
(208 prefixes), and both whole-source input hashes before production changes.
The fixture copies preserve the accepted bytes. Changes so far are confined to
the four owned production files, this task status, and new H2 evidence/fixtures.
Concurrent COORDINATION edits belong to the coordinator and remain unstaged.
No existing tests, gates, feature inventory, pins, or historical evidence changed.

Initial syntax/parser/collector/shared-evaluator implementation typechecks.
The first native compilation of the unchanged harness-catch driver failed at
three new switch-arm returns, before linking. `early-native.log` retains all
SC2003 diagnostics at discriminant, setup and selector return sites.

The 13-line `compiler-reduction.ts` independently reproduces SC2003 with only
local structural types and a private value-producing method. It imports no
engine code. Node executes it and prints `throw`; static-only compilation fails
at its guarded return. `compiler-reduction.log`, `compiler-reduction-node.log`
and `typecheck.log` retain the results.

Reproduction from typescript/:

```
node docs/validation/ts-034h2/compiler-reduction.ts
node_modules/scriptc/bin/scriptc.exe build docs/validation/ts-034h2/compiler-reduction.ts --tier static-only -o build/native/h2-reduction.exe
node_modules/scriptc/bin/scriptc.exe build test/harness-catch.ts --tier static-only -o build/native/h2-early.exe
npm run typecheck
```

Exact review request: permit the existing adjacent engine pattern at precisely
these three new return sites: inside the throw guard, assign the original value
to `const abrupt: ThrowCompletion = discriminant` (respectively setup/selector)
and return `abrupt`. Preserve setup capture before this assignment. This retains
object identity and introduces no new abstraction, semantics, pin or owned file.
This proposed correction has NOT been applied or validated; no workaround was
attempted after the reduced failure. Resume only after the requested review.

The assignment explicitly requires retaining a reduction and stopping for exact
review on a substantive compiler failure before a workaround. Native acceptance
is therefore incomplete. Frozen semantic driver, scoped E4 amendment/verifier,
additive gate, full validation, inventory, and coherent candidate commit remain
to be completed after review. No implementation commit, successor or merge.

## Approved resumption

Coordinator approved exactly the three explicit ThrowCompletion locals on 2026-11-04 after independently reproducing SC2003 and validating an isolated correction (8 static, zero dynamic; exact sentinel identity on both hosts). Applied the adjacent accepted E2 pattern; original failures remain retained. No API, ownership or pin change. Full implementation work resumed.

## Second exact review checkpoint: test callback adapter

The approved three-site production correction is applied. Typecheck and the
new switch driver pass on Node for both frozen runtime inputs, including
S01-S30/N01-N10,208prefixes,X01-X05 and host symbol/object controls. Current
transcripts: typecheck-current.log,node-seven.log,node-eleven.log.

Fresh static-only compilation lowers the program but linking cannot access
installed Zig libraries in the sandbox (focused-build.log). Independently,
separate coverage reports3472static statements and **1dynamic adapter**, which
fails the required zero-dynamic gate. focused-dynamic.log identifies the single
adapter at test/harness-switch.ts:40:103, the throwing `hostContext.call` callback
whose inferred return type is never. This is test setup, not production.

The independent seven-line callback-reduction.ts reproduces precisely one
adapter (8static/1dynamic); callback-reduction-coverage.log retains the full
explanation and callback-reduction-node.log prints `setup cannot call`.

Exact review request: annotate only this existing callback's return type as
`Completion`, importing that existing runtime type into the new test driver.
Keep its four parameters and exact thrown Error unchanged. This reuses the
historical TS-026A typed-throwing-callback pattern documented in compiler-contract.
No correction or corrected reduction has been attempted pending exact review.
No production, ownership, pin or API expansion is proposed. The original
failure, previous review decision, and current failure are all retained.

Full native validation, E4 amendment/verifier, additive gate, inherited replays,
inventory and coherent commit remain outstanding. Work is stopped again per
the assignment's exact-review rule; this is not an acceptance candidate.

Coordinator approved the exact Completion callback annotation on 2026-11-04; independently reproduced 8static/1dynamic original and 8static/zero-dynamic correction with matching Node/native error. Applied only the existing runtime type import and return annotation. Equivalent typed callback/throw-arm patterns are authorized; new substantive failures still require review.

The concrete OperationContext.call signature requires ValueCompletion, not the broader legacy Completion. Typecheck caught this annotation-only mismatch (callback-annotation-typecheck.json). Used existing ValueCompletion under the approved typed-callback pattern; parameters and thrown Error unchanged.
