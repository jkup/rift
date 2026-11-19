# Approved extracted-method investigation — 2026-11-03

Evidence-only follow-up to `9b4ca33`, authorized by coordinator review. **No
candidate meets the zero-dynamic requirement. No composite reduction or production
activation was attempted.** Original evidence and production files are unchanged.

All four sources are strict-TypeScript checked, run in Node 26.13.0, built with
pinned scriptc 0.4.7 `--tier static-only`, separately checked with
`coverage --explain-dynamic`, and actually executed natively on Windows x64.
Zig 0.17.0 was supplied on PATH with approved access to its installed libraries.

| Probe | Node | Native | Coverage | Meaning |
|---|---|---|---|---|
| `method-minimal.ts` | true, false; exit0 | exit1, `expected Receiver at $, got undefined` before any stdout | 8/8 static, dynamic2 | Extracting an ordinary method into a structural plain-object view fails the authentic invocation. |
| `method-direct-control.ts` | true, false; exit0 | true, false; exit0 | 6/6 static, dynamic0 | Direct calls on genuine class instances preserve receiver identity. This does not test extraction or satisfy E4. |
| `method-call-tick.ts` | authentic call/tick PASS; counters1/3 | authentic call/tick FAIL; counters0/0 | 45/45 static, dynamic4 | Separate production-shaped structural call and tick methods both fail authentic entry; one failure cannot hide the other. |
| `method-getter-view.ts` | authentic call/tick PASS; counters1/3 | authentic call/tick PASS; counters1/3 | 26/26 static, dynamic4 | A genuine class context with getters returning extracted methods preserves authentic calls in both hosts, but still fails the required coverage gate. |

The getter-view result is important: the earlier plain-object failures do **not**
prove that every extracted-method representation fails native semantics. The
genuine-class/getter representation passes the two measured authentic invocations.
It does not establish the full authority boundary, immutable getter feasibility,
private identity, nested permits, source/frame state, or cleanup.

The minimal/extracted reports identify `%method.value:… dyn.this` as well as class
receiver conversion. The getter-view report identifies `dyn.this` for both
extracted methods and dynamic class-property dispatch. The direct-method control
reports no dynamic operations. These are compiler-reported diagnostics, not a
claimed root-cause analysis of the compiler implementation.

Every native build succeeds. This does not override the separate nonzero dynamic
counts. No result is a passing E4 gate. `method-investigate.mjs` collects transcripts;
its exit status alone is not an acceptance verdict. `verify-method.mjs` asserts
the literal diagnostic outcomes and strict typechecks every source separately.
Its success means these findings reproduce, including the expected failures.

## Authentication matrix and composite boundary

The approved sequence required a passing static receiver candidate **before** the
full bounded composite reduction. None passed. Accordingly:

- The minimal plain-object probe includes an authentic positive and cloned
  receiver negative in Node; native stops at the authentic call.
- The call/tick probe attempts both authentic entries independently and checks
  clone rejections. Its native clone rejections are not evidence of usable
  authorization: native authentic calls also fail. No native matrix pass claimed.
- The getter-view probe proves only authentic call and tick invocation and their
  exact counters. It does not attempt the rest of the matrix after the mandatory
  zero-dynamic gate failed.
- Spread/proxy/detached/wrong rebinding, other active view, authentic bind/call
  forwarding, mutation/freeze, and idle controls remain required and untested for
  the class-method candidates. They have **not** been labeled unrepresentable or
  moved to a Node-only exemption. No hostile-cast compiler rejection is used to
  excuse the ordinary production path's four dynamic statements.
- Two facade imports, private record/node identities, a real one-use builtin
  permit/nested callback, Script/legacy reference union and finally restoration
  from seeded nonzero counters were not attempted. They remain the mandatory
  composite next stage only after the prerequisite succeeds.

No candidate changes the frozen requirement for ordinary unbound functions to
authenticate the exact invocation receiver before effects. The tests do not use
arrows, prebinding, structural authority flags, mutable tick overrides or hidden
fault hooks as a substitute. The minimal tests deliberately omit unrelated
machinery to isolate the failing prerequisite; omission is not contract adoption.

## Precise proposed next revision for review

Keep the production/design contract unchanged and E4 blocked. Replace the now
exhausted extracted-method feasibility proposal with a **separately scoped
compiler prerequisite investigation**, initially read-only against pinned scriptc
plus isolated reproductions under this evidence directory:

1. Identify how ordinary function `this`, extracted method receiver adapters and
   function-valued class getters lower at call sites. Use the retained five-line
   failure and genuine getter-view dynamic4 case as separate regressions.
2. Require an unchanged structural OperationContext-shaped call/tick path that
   both preserves actual invocation receiver semantics and reports zero dynamic.
   A direct-class-method-only control is not sufficient. Any candidate must pass
   the entire corrected A08 matrix in both representable runtime lanes before
   the composite is attempted; retain precise evidence for any unrepresentable
   host-only attack separately.
3. Return a concrete compiler correction or a demonstrated equivalent static
   representation for independent review. Do not adopt it into Rift, patch or
   upgrade the installed toolchain, relax static coverage, or revise the design
   based on the evidence in this follow-up alone.

There is presently no evidence-backed production representation revision to
approve. Whether the compiler can be corrected within project constraints is
unresolved. This proposal is not authorization to begin that new investigation.

## Replay and preservation

With installed Zig on PATH and required library access, run the collector once
for each name (`method-minimal`, `method-direct-control`, `method-call-tick`,
`method-getter-view`):

```powershell
node typescript/docs/validation/ts-033e4/method-investigate.mjs method-minimal
node typescript/docs/validation/ts-033e4/verify-method.mjs
node typescript/docs/validation/ts-033e4/audit.mjs
```

Each `method-*-results.json` retains full Node/build/coverage/native output.
`method-verification.json` retains strict typecheck commands and outcomes.
Production, existing tests, all original `9b4ca33` evidence, compiler pins and
guarded activation are unchanged. Coordinator-owned COORDINATION changes are
excluded from this writer's commit. Full engine/runtime suites were not rerun;
no implementation candidate exists.
