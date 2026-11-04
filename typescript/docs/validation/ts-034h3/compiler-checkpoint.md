# H3 callback coverage review checkpoint

The five production-file implementation and frozen semantic matrix run under Node and a focused native executable. The separate zero-dynamic gate correctly rejects one test-helper adapter; no acceptance claim is made.

`test/harness-for-update.ts:43` forwards a callback typed to return `ValueCompletion` into `Realm.createBuiltin`, whose existing `Builtin` signature returns `Completion`. `focused-dynamic-explanation.log` identifies that exact forwarding call. `callback-reduction.ts` reproduces one dynamic adapter (3286 static statements plus one dynamic statement). No production compiler failure occurred.

Exact proposed correction: import the existing `Builtin` type in the new test file and type only `builtin`'s `cb` parameter as `Builtin`, matching the receiving API. Preserve all actual callback bodies, explicit `ValueCompletion` return annotations, `stageSource`, production files and compiler pins. `callback-proposal.ts` demonstrates this signature with 3286 static statements and zero dynamic statements in `callback-proposal-coverage.log`.

This is a new test helper adaptation, distinct from the previously accepted untyped throwing callback. The implementation handoff requires exact review before applying a new substantive compiler workaround. Approval requested; the actual test helper is unchanged pending response. Initial native sandbox Zig failure and host-suite temporary-file rename failures are retained separately. Native/runtime success alone does not waive the separate coverage gate.

Coordinator approved the exact correction after independent reproduction of 3286static+1dynamic and 3286static/zero dynamic. Applied only the existing Builtin import and helper cb annotation; every callback body and ValueCompletion annotation is preserved. No production/API/pin change.

## Callback forwarding chain amendment requested

The approved Builtin helper annotation removed the first forwarding adapter but exposed the same adapter at `stageSource` forwarding its still-narrow callback parameter into that helper (`test/harness-for-update.ts:458`). `first-approved-correction-gate.json` retains that failure. No new production issue is present.

Exact additional proposal: replace only `stageSource`'s callback parameter type `(t:Value,a:Value[],c:OperationContext,l:Location)=>ValueCompletion` with existing `Builtin`. Preserve all callback bodies and ValueCompletion callback annotations. `callback-chain-reduction.ts` reproduces the forwarding-chain adapter; `callback-chain-proposal.ts` reports zero dynamic coverage. The prior approval explicitly preserved stageSource, so this amendment is requested before applying it.

Independent source review also closed the postfix suffix chain when an outer unary expression follows its incremented operand: `-x++.p`, `!x++()` and `-x++[0]` now reject. Parenthesized postfix/unary expressions and a literal string `"++"` still allow suffixes. New controls pass Node. This is within the frozen suffix grammar, not a grammar expansion, and requires final full native rebuilding.

During addition of original-node identity assertions, the test initially compared broad node unions directly (SC1090; retained `original-association-union.ts` and coverage). The final assertions first check the required var/function/block discriminants, then compare exact identities, following the existing preparation validation pattern. This strengthens the structural assertion without an API, runtime or compiler workaround. Full isolated proposed-driver coverage is 3804 static, zero dynamic, zero demotion requests; its native runtime passes.

Coordinator independently reproduced the chain (3288static+1dynamic versus3288static/zero dynamic) and approved the exact stageSource Builtin annotation. Applied only that parameter annotation, preserving bodies, explicit ValueCompletion returns and production. Both signature checkpoints are resolved subject to final actual-driver validation.
