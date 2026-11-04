# TS-033E4-C combined boundary checkpoint

2026-11-04. Design/evidence only, base `7d3f369` (checkout `c577b9d` adds only
coordinator tracking). Sole writer owns this directory, the new
[capability contract](../../../script-execution-capability-boundary.md), its TASKS
entry and E4 cross-reference. COORDINATION is coordinator-owned. The checkpoint
finished within the initial 30-minute window; no expansion of the 90-minute bound
was needed. Stop for coordinator and second review. Production adoption, successor,
branch switching and main publication are not part of this handoff.

## Result

`run-4.json` retains final strict TypeScript, static-only build, separately parsed
coverage and both runtime-selected inputs in Node and newly built native. All
pass: **2479/2479 static statements, zero dynamic statements**. The unchanged
`tools/probe-verdict.mjs` gate is imported, not duplicated or relaxed.
`checks.json` records repository typecheck and runner **20/20**, no skips/failures.
`verification.json` checks **3061 protected files / 175 source-test files** against
the accepted base, unchanged matrices and retained evidence counts, and **60/60
variants still blocked**. This is preservation, not a fresh full inherited-suite
replay. No production/test/gate/pin/compiler/history file changed.

The literal first output line varies by runtime input:

```
PASS alpha captured owner two sessions normal guest identity effects=7
PASS beta captured owner two sessions normal guest identity effects=11
```

Each input then requires these three exact lines:

```
PASS cleanup host identity call-depth limits retained unit A=6/10/78 B=1/1/8 leaf=5 guest=1 host=2
PASS profile-first exact errors tuple neighbors replay direct denial production closed
PASS guest code-root unwind snapshot isolation final A=6/11/86 productionRaw=0
```

These expectations and counters were written before each corresponding execution.
The test does not compute expected stdout from observed output. Source assertions
also compare exact normal/guest completion, host Error, Value, args, Location,
Realm and Source identities; stdout is only the final confirmation.

## Combined structure and literal controls

`seam.ts` combines the actual Rift runtime types with a private engine-owned frame,
one canonical plain context per session, captured call/tick functions and the
module-private pending permit. `guard.ts` imports only the consume validator and
implements the proposed profile-first wrapper. The dispatcher creates permits;
no mint/pending-pointer API is exported. Its embedded pre-consumption probes are
explicit harness instrumentation, never production design. They create seven
wrong neighbors for every dispatched call before allowing the authentic tuple.
After a normal/guest return, an eighth check rejects replay; host throws skip that
post-return assertion but must restore the pending pointer in finally.

| Control | Literal assertion |
| --- | --- |
| Runtime-selected effects | `seed` chooses alpha, 7, left receiver, right nested receiver and line3; `other` chooses beta, 11, right receiver, left nested receiver and line8. A real object allocated through callee Realm B has B.objectPrototype and the selected data property storing the exact input Value; alternate property absent. |
| Owner isolation | Copied/detached A call succeeds while A active; A's functions invoked while B active still charge A. B's own call charges B. A idle rejects both functions, including while B active, before counters/effects. Reentrant A root rejects. |
| Private provenance | Root sourceA and sourceB deliberately have equal unit IDs but different identity and defining Realms. Synthetic code transition changes source/scope/receiver, builtin calls change allocation Realm while retaining code provenance. Exact frames are checked during and after nested guest/host results. Mutating detached snapshot fields cannot alter source/Realm/steps. |
| Combined permits | Wrong canonical context, cross-profile context, wrapper, receiver, equal-content args array, equal-content Location and Realm each reject before authentic consume. Exact unavailable/cross-profile messages are checked. Parent replay and direct other-wrapper entry reject after nested calls and a second session. |
| Normal and guest identity | Normal result is the identical completion/Value. Guest failure is the same completion with original diagnostic Location through dispatch, synthetic code frame and root. |
| Host identity and cleanup | Same Error object is caught within nonzero A caller/code state; exact state restored. Uncaught nested code-frame/dispatch host fault propagates to root unchanged. Idle state and direct stale entry denial follow. |
| Call/depth limits | Calls2 permits two nested model calls; the third returns exact calls diagnostic/location. Depth2 permits two synthetic code transitions; the third returns depth diagnostic/location. All nesting returns to zero; steps do not reset. |
| Retained and monotonic limits | Retained A functions work in a later source unit with its private provenance. Steps3 and4 succeed; steps5 and6 fail without resetting. B remains steps1. |
| Production boundary | Actual Realm-created Script builtin remains unavailable even inside an authorized model raw callback with a consumed pending permit. Legacy-context direct entry and Script-to-legacy model dispatch retain exact cross-profile error. Production raw count stays zero. |

Counters are independent literal expectations: initial A steps2/dispatch6/checks47,
B steps1/dispatch1/checks8; root host fault advances A to dispatch7/checks54;
call-limit test to9/70; retained call to10/78; final guest unwind to11/86.
There are two host exceptions, so final 11*8-2=86 tuple/replay checks. The second
session contributes8 more. Leaf count stays5; guest count becomes2 only in the
last unwind control; host count stays2. Calls/depth are restored nesting counters,
not cumulative measures. Wrapper checks add no semantic ticks.

## What this does not establish

This is a combined representation seam, **not production activation**. Source
contains only a private Realm/unit token; it is not an ExecutableScript. Harness
run/code callbacks deliberately expose context and synthesize code-frame entry.
There is no AST/body/parser/interpreter or GDI/FDI/block execution. Synthetic frames
contain Realm/source/scope/receiver, not full lexical/variable/function/phase state.
The explicit test ticks and simple failure records are not production execution
prefixes or production resourceFailure records. Calling after step exhaustion in
this harness exercises cleanup without an implicit expression tick; actual E4
must preserve every real entry tick and prefix.

Actual Realm guards remain unchanged and closed. The seam does not prove the full
record/Realm/evaluator module cycle, reference union, shared interpreter compilation,
last-abrupt provenance or semantic integration. Those remain atomic E4 acceptance
gates. Historical Node-only reflective/constructor tests and unavailable native
Proxy support remain labeled; no new hostile-host safety or native reflection
claim is made. Private captures protect guest isolation under the accepted trusted
host contract, not arbitrary host mutation or code replacement.

All remaining55/A18/13trace requirements, ER R36, E3 prefixes, 212 old records per
lane, 48 old gates plus the future additive gate, full Node/native/inherited replays,
host73/observations22 and60blocked requirements remain frozen in the new contract.
The original activation design and all failures remain historical evidence.

## Retained failures and progression

* `initial-runner-path-failure.txt`: first runner used one too many parent path
  segments; Node could not import probe-verdict. Fixed only new harness imports.
* `run-1.json`: ordinary strict TypeScript TS2322 at return of Completion after
  checking normal/throw. Runtime Completion groups normal/return in one member.
  The explicit post-check ValueCompletion cast preserves identity; it does not
  change or relax a runtime type, API or guard. This was reported before fixing.
* `run-2.json`: Node both inputs passed and separate coverage was **2467/2467**,
  but native linking could not find installed Zig libraries through
  the sandbox. Full SC3004/linker transcript retained. No compiler lowering failure.
* `run-3.json`: approved installed-library access; same source passed both lanes,
  both inputs,2467static/zero dynamic. No source workaround for linker access.
* `run-4.json`: final additive detached-snapshot, real-production-guard-inside-pending
  and guest-code/root-unwind controls pass both inputs/hosts,2479static/zero dynamic.

No new scriptc semantic/coverage failure was encountered. A new such failure would
require retaining/reducing it and coordinator review before a workaround, not an
unreviewed representation change. Original A08 receiver/getter/freeze/Proxy and
tuple-first dynamic failures are all protected byte/content evidence outside this
directory.

## Reproduction

From typescript/, put the installed pinned Zig directory on PATH and run:

```
node docs/validation/ts-033e4/capability-integration/run.mjs
node docs/validation/ts-033e4/capability-integration/checks.mjs
node docs/validation/ts-033e4/capability-integration/verify.mjs
```

Native linking needs installed Zig library access on this Windows host. `run.mjs`
appends the next run-N.json without replacing prior transcripts. It checks both
literal inputs and all exits/signals/timeouts. The verifier defaults to the final
retained run-4.json; pass a new run filename to verify a replay. It independently
checks literal output,2479static, source/history preservation and the unchanged
blocked manifest. Verification records content hashes for review. The old
boundary-review verifier remains untouched: its base522413d ownership allowlist
does not cover this task and is not used to claim new-boundary acceptance.
