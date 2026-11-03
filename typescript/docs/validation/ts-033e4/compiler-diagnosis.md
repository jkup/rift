# Pinned compiler receiver diagnosis — 2026-11-03

Read-only follow-up to `5823e3d`, authorized in coordinator commit `7db0b45`.
**A concrete receiver-lowering bug is identified, but fixing that bug alone would
not satisfy E4's zero-dynamic contract.** No compiler patch, installed-package
change, production edit, design revision, representation adoption or composite
activation probe was made. E4 remains blocked.

## Source provenance and limits

No compiler checkout exists in the inspected `C:/Users/jonku/code` inventory.
The installed CLI package contains runtime C sources and native executables,
not the TypeScript compiler frontend. No repository was cloned.

Read the public source through the GitHub connector at commit
`6c60b0bcbfc6edd34ce5c1cdb588d42bdb7171ff`, reached from the
[v0.4.7 release](https://github.com/vercel-labs/scriptc/releases/tag/v0.4.7)
and tag. Both npm publisher provenance statements (`scriptc@0.4.7` and
`@scriptc/cli-win32-x64-msvc@0.4.7`) name this same commit. Their subject SHA512
digests match npm metadata and this project's package-lock integrity values.
Both npm `gitHead` fields are absent; the revision comes from the decoded
provenance and Git tag/release, not an invented gitHead.

`compiler-provenance.json` retains the public attestations, decoded payloads,
metadata, installed binary hashes and `--version` output0.4.7. This is metadata
consistency verification, **not cryptographic signature/Transparency Log
verification, reproducible-build verification or proof that the installed native
binary was rebuilt from the inspected source**. The separately emitted IR from
that actual binary corroborates the relevant source paths below.

`compiler-source.json` retains immutable URLs, Git blob SHAs matched to the
pinned tree and exact numbered source excerpts. Excerpts are unmodified Apache
2.0 source from the Scriptc contributors; `compiler-source-LICENSE.txt` matches
the pinned upstream LICENSE blob. The installed `runtime-sources/src/scr_json.c` additionally
matches the pinned repository's Git blob SHA exactly
(`537a4e7c460bea0b33fd5b2f11382e89f2f09b12`); a numbered excerpt is retained.
Initial sandbox npm metadata requests failed DNS; approved network reads then
succeeded without installation. No source-availability blocker remains.

## Ordinary function receiver: diagnosed semantic failure

The five-line `receiver-minimal.ts` already proves Node true/native false. Its
newly emitted IR makes the cause observable independently of source inference:

1. The callback has a `this.0` local of kind `dyn`, initialized by `dyn.this`.
2. `view.check()` is a `callValue` of a `recordGet`, with **no receiver operand**.
3. The declared `this: View` type does not become a typed receiver ABI argument.

These observations match the pinned implementation:

- [lower-functions.ts lines45–77 and413–421](https://github.com/vercel-labs/scriptc/blob/6c60b0bcbfc6edd34ce5c1cdb588d42bdb7171ff/packages/compiler/src/frontend/lowering/lower-functions.ts#L45):
  an explicit `this` parameter selects `declareCallReceiver`, which declares
  DYN and reads `dyn.this`, regardless of the annotation's static View type.
- [call-signatures.ts lines428–435](https://github.com/vercel-labs/scriptc/blob/6c60b0bcbfc6edd34ce5c1cdb588d42bdb7171ff/packages/compiler/src/frontend/lowering/call-signatures.ts#L428):
  the syntactic `this` parameter is excluded from ordinary ABI parameter slots.
  This omission is correct for JavaScript source arity; it does not supply the
  missing implicit call-site receiver.
- [lower-calls.ts lines10126–10135 and10190–10209](https://github.com/vercel-labs/scriptc/blob/6c60b0bcbfc6edd34ce5c1cdb588d42bdb7171ff/packages/compiler/src/frontend/lowering/lower-calls.ts#L10126):
  `lowerRecordFieldCall` creates its saved receiver only when the call's source
  is JavaScript. TypeScript therefore leaves `receiverLocal` null and omits
  `callValue.receiver`, even though its function body may read `this`.
- [LLVM expr-calls.ts lines876–901 and965–1018](https://github.com/vercel-labs/scriptc/blob/6c60b0bcbfc6edd34ce5c1cdb588d42bdb7171ff/packages/compiler/src/backend/llvm/expr-calls.ts#L876):
  receiver-reading closure calls use an ambient receiver bracket. With no
  receiver operand, the push supplies null. The wrapper pops the bracket after
  the call. This is a missing receiver value, not a missing lexical closure.
- [runtime scr_json.c lines7275–7326](https://github.com/vercel-labs/scriptc/blob/6c60b0bcbfc6edd34ce5c1cdb588d42bdb7171ff/packages/runtime/src/scr_json.c#L7275):
  a null dynamic receiver entry has no pointer/value/recipe, so `scr_dyn_this_get`
  returns undefined. Comparing that to `view` explains native false.

The corresponding record-union branch at lower-calls.ts10110–10119 also builds
a callValue without receiver. That is a source-inspected adjacent risk, **not a
new measured failure**; a later correction needs its own regression.

## Extracted methods and getters: why dynamic coverage remains

[class-method-values.ts lines246–320](https://github.com/vercel-labs/scriptc/blob/6c60b0bcbfc6edd34ce5c1cdb588d42bdb7171ff/packages/compiler/src/frontend/lowering/class-method-values.ts#L246)
builds an unbound closure thunk. It obtains its receiver through `dyn.this`,
passes it to `%method.receiver:<Class>`, and performs a dynamic class check before
calling the typed method body. It does not capture the extraction-time receiver.
Thus the plain-record method probe's missing call-site receiver produces the
observed class-check error (`expected Receiver ... got undefined`). Removing the
dynamic read would break unbound receiver semantics, not merely improve coverage.

The optimization at lines609–638 removes receiver handling only when the target
does not use `this`. An authentication method necessarily reads `this`, so this
optimization cannot make the required boundary static.

For `method-getter-view.ts`, emitted IR shows the structural `context` global is
actually `dyn`; each authentic call is `dynCall` with a retained receiver. The
generated method thunks still read `dyn.this`. This explains the measured native
authentic successes **and** their dynamic4 coverage. The general dynamic member
path [lower-calls.ts4351–4408](https://github.com/vercel-labs/scriptc/blob/6c60b0bcbfc6edd34ce5c1cdb588d42bdb7171ff/packages/compiler/src/frontend/lowering/lower-calls.ts#L4351)
saves the receiver and member separately and passes that receiver into dynCall.
This investigation does not claim to have isolated every upstream type-mapping
decision that causes the structural getter view to become dyn; the emitted
representation and its receiver propagation are directly measured.

`receiver-source-kind.js` is one bounded diagnostic neighbor. It prints true in
both hosts, builds static-only, and reports dynamic4. Its IR uses `dynInvoke` with
`recv`, unlike the TypeScript record's receiverless callValue. This corroborates
the working dynamic receiver path; **it is not a static workaround or a clean
single-variable test of lowerRecordFieldCall**, because the representation also
changes. The first IR collector missed dynInvoke and failed its assertion before
building this JS binary; its original script and diagnostic are preserved. The
corrected collector includes dynInvoke and confirms the observed representation.

## Concrete minimal correction proposal — not implemented

Propose an upstream semantic correction at `lowerRecordFieldCall`, scoped first
to ordinary typed record function fields:

1. Preserve the call-site base for TypeScript as well as JavaScript. Evaluate
   the base once, retain its identity, read the member once, then evaluate arguments
   left-to-right. Attach the saved base as the callValue receiver using the
   existing receiver bracket and lifetime machinery. Do not re-evaluate the base
   or silently snapshot/copy the record to synthesize `this`.
2. For representations that cannot preserve a receiver, reject explicitly when
   it can be observed rather than silently supplying undefined. Receiver-free
   callbacks may still optimize away the bracket after semantic lowering. The
   static receiver type is not proof that a copied callable has the right receiver.
3. Add regressions for the retained five-line case, copied callbacks on a second
   record, detached undefined, nested call restoration, throwing callees, base and
   getter evaluation count/order, and callee/argument mutation. Cover record-union
   dispatch separately before extending the correction there. Require Node/native
   literal outcomes; keep dynamic counts honest.

This is a bounded correction proposal with a concrete source location and failing
regression, **not a claim that deleting one condition is a fully reviewed patch**.
The existing record-to-dynamic receiver conversion must be checked for identity,
recursion, lifetime and failure behavior. No compiler code was changed to test it.

Crucially, this semantic correction still uses the existing DYN ambient receiver.
It would not make E4 pass zero-dynamic coverage. A separate static receiver
lowering is needed to meet that requirement: preserve the invocation receiver
through closure/structural-field calls, represent authenticated receiver identity
without dyn.this/dynamic class checks, and retain detached/foreign receiver
rejections and exact forwarding. That may require a typed implicit receiver ABI
or equivalent static IR support; this investigation provides **no implemented or
validated design for it**. Casting, prebinding, changing OperationContext, hiding
dynamic statements from coverage, or replacing the checks with direct class
dispatch would not satisfy the unchanged contract.

Recommendation: review the minimal semantic correction as a separately scoped
compiler issue; keep E4 blocked pending independently proven static receiver
support. No production representation revision is supported by these findings.
Do not begin a compiler patch, pin change or broader static-ABI design under this
assignment. Full corrected A08 and the composite remain unrun prerequisites.

## Validation and handoff

New evidence: three exact emitted IR files, `compiler-ir-results.json`, one actual
JS Node/native build/execution/coverage control, pinned source/provenance records,
runtime excerpt, and `compiler-diagnosis-verification.json`. The latter checks
package subject digests, revision consistency, installed binary hashes, exact
runtime blob identity, excerpt ranges, IR receiver operands and unchanged original
evidence. `audit.mjs` still confirms 2,966 protected paths, 175 source/test hashes,
55 inherited rows, A01–A18, 13 traces, retained212/212/48 and blocked60.

No full engine/runtime/host suites were rerun and no new static candidate exists.
The original compiler failures and all prior E4 evidence remain unchanged. This
is a source diagnosis and proposal milestone only; stop for coordinator review.
