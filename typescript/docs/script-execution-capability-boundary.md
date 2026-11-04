# TS-033E4-C: captured-owner capability boundary

Design/evidence checkpoint, 2026-11-04, based on accepted `7d3f369` and corrected
proposal `fae9330`. This document freezes the accepted proposal's supersession
of the host-interface requirements in [activation design](script-execution-activation.md).
It does not authorize production activation. Historical designs, matrices and
failures remain unchanged. E4 needs a separately assigned, atomic implementation
and independent review.

## Authority and explicit supersession

The boundary protects guest JavaScript from interpreter state and rejects ordinary
misuse of opaque host entry APIs. Builtins and embedding code are trusted engine
extensions. Guest property operations cannot obtain an OperationContext, session,
private frame, record body, closure capture or permit. Hosts must use the canonical
supplied context for semantic helpers, must not mutate it or host prototypes, and
must not manufacture malformed values through casts. This is not isolation from
arbitrary same-process host code. Host getters/proxies can execute during a profile
read; they have no promised diagnostic or side-effect isolation.

Use one stable plain structural OperationContext per private engine. Its fully
typed call/tick arrows capture that engine, reject if it is idle, and then use its
private frame and counters. They never read their invocation receiver. The engine
updates the canonical writable `realm` projection alongside its private frame and
restores both in `finally`, including the prior idle projection. Existing helpers
continue to use context.call/tick/realm. No fresh context, evaluator or budget is
created for nested calls or later source units.

| Historical requirement | Frozen replacement or preservation |
| --- | --- |
| A08 copied, spread, detached, proxy-forwarded or wrongly rebound authentic functions must reject | Superseded: possession transfers authority. The function always acts on its captured owner. Invocation syntax and receiver identity are irrelevant. A live B cannot activate or retarget an idle A capability. With both active, A's copied function uses A's frame and counters. |
| A08 exact-view `.call`/`.bind` positive | Generalized to receiver-independent capabilities. The engine does not require native Function.call/bind or Proxy support; unsupported reflective native cases remain labeled as such. |
| A08 frozen getter view/callbacks/Realm; mutation must fail or be ineffective | Withdrawn. The canonical context is plain and writable internally. Host mutation is unsupported, not prevented. Readonly annotations are not runtime integrity. |
| Private branded context and receiver check locate/authorize engine | Replaced by private captured owner and exact canonical identity in a module-private synchronous permit. No context registry or nominalization of runtime.ts. |
| Retained callbacks | Explicit session-lifetime capability: idle rejects before effects; reuse during a later active unit is allowed and shares accumulated steps. No generation revocation is promised. |
| A08 plain/cloned/proxied context directly passed to Script builtin | Preserve denial: context possession alone does not supply a permit. A genuine copied dispatcher can create a fresh permit through its private owner. |
| A01/A08 opaque entry, key/record identity, recovered constructors, legacy separation | Preserve. Prototype/code replacement is outside the threat model. Prior Node-only malformed-shape evidence is not native proof. |
| A09 exact one-use tuple, replay/direct/stale/wrong-target denial | Preserve, with profile-first diagnostics below. |
| A02–A07, A10–A18 and remaining A08 controls | Preserve all guest semantics, provenance, limits, cleanup, ordering, subset and admission requirements. |

Only these mapped host-interface guarantees are superseded. In particular this
does not weaken private record ownership, grant AST access, admit Script in public
entry points, or satisfy the inherited execution matrix through a model.

## Builtin guard and synchronous permit

Freeze this order in the future Realm wrapper:

1. Read `context.realm.profile`. A mismatch throws exactly
   `cross-profile callable invocation`; do not inspect or consume the permit.
2. Same-profile legacy invokes raw code directly with the original context.
3. Same-profile Script calls the consume-only validator. False throws exactly
   `Script execution unavailable`; true enters raw code.

The validator compares canonical context, defining Realm, guarded wrapper function,
receiver Value, args array and Location by identity, plus unused state. Missing,
used or mismatched tuples return false without mutation or context property reads.
Only a complete match marks used=true, before arbitrary raw code. Do not catch and
relabel unrelated exceptions. Rejection adds no semantic ticks, dispatches or raw
calls. This is expressly not a guarantee of zero property reads by the wrapper.

The private dispatcher checks active owner, callable/profile and call limit before
installing callee state and pushing a permit. Keep a module-private saved previous
pointer; no exported mint, registry, getter, hook or caller-selected validator.
It immediately invokes the exact guarded wrapper. Nested dispatch, including a
second active session, saves/restores that pointer. A restored parent permit is
already consumed. `finally` restores the prior pointer on every exit. No await or
yield may intervene; async/generators require a separate design. Guard validation
adds no tick. Legacy cross-Realm direct invocation remains unchanged.

## Private state and semantic requirements retained

Keep executable records and the single shared engine co-located. Private keys,
genuine record/callable checks, original node-to-scope maps, source slices, fresh
activation checks and assignment-name eligibility remain mandatory. No body/map/AST
can escape through a facade, callback, inspection or legacy wrapper. Equal unit
IDs or copied inspection records never confer source authority.

Guest calls install defining Realm AND code record, scope, lexical/variable
environments, strict receiver and function. Builtins switch allocation Realm while
retaining caller record/scope/environments/strict this. Nested guest callbacks switch
code provenance again. Steps remain monotonic across units, including exhaustion;
call/depth counters are active nesting counts restored on exit. Keep defaults and
invalid-limit host checks from the activation design. Shared GDI/FDI/block/body
ticks, calls and depth never gain fresh limits or wrapper ticks.

Restore frame, canonical Realm projection, source, lexical/variable, this, phase,
permit stack, calls and depth for normal, guest throw, resource and host failure.
Do not roll back steps or guest effects. Return the identical guest completion and
Location; propagate the identical host sentinel. Preserve the activation design's
first-capture last-abrupt provenance and detached snapshot rules. Reachable host
callback faults and inherited setup-helper injection remain distinct from actual
engine-owned resource-prefix evidence; no mutable tick injection is introduced.

## Exact future atomic migration and ownership

These are the next E4 assignment's boundaries, not permissions for this checkpoint.

| File | Required atomic migration |
| --- | --- |
| New src/script-execution-internal.ts | Move existing ExecutableScript/ScriptGuestCallable/brands and Evaluator algorithms once. Add shared private dispatch, record lookup, opaque session/private frames, stable captured-owner context and module-private exact permits. No exported engine/body/key/permit constructor or mint API. |
| src/script-record.ts | Compatibility re-exports of existing types, prepareStrictScript and host setup/inspection behavior. No new body access. |
| src/evaluator.ts | Legacy Evaluator facade with original constructor, public methods/counters/context/limits; cannot construct Script mode. |
| New src/script-execution.ts | Only createScriptSession, evaluateScript, opaque/result/snapshot type facade. No context getter/reset/call/AST entry. No public interpreter/observation re-export. |
| src/realm.ts | Profile-first exact errors; same-profile Script consume-only import; legacy path unchanged. Only reachability import adjustment if required; no bootstrap or descriptor change. |
| New test/script-execution.ts and fixtures/script-execution/{seed,other}.txt | Actual integrated execution, all preserved rows plus revised A08 capabilities, literal resource prefixes, identities and cleanup under both runtime inputs. |
| tools/build-native.mjs | Append one E4 driver; retain all 48 gate entries in order and unchanged static-only plus separately parsed zero-dynamic checks. |
| docs/feature-inventory.md, E4 TASKS entry, new E4 evidence | Truthful internal-only scope and complete evidence. Preserve this and all older evidence. Coordinator owns COORDINATION.md. |

Everything else remains read-only: runtime.ts and structural OperationContext,
parser/syntax, declaration/environment/completion/global algorithms, builtins and
all existing tests/expected outputs. Preserve existing imports through facades.
If any other source change becomes necessary, preserve the concrete failure and
request an exact ownership revision before changing it. No mechanical move or
partial callable subset is independently publishable: private record access,
shared interpreter, calls, contexts and all Script semantics land together after
review. No duplicate interpreter or public AST runner is acceptable.

## Combined evidence and its limits

[The combined seam](validation/ts-033e4/capability-integration/README.md) uses actual
Realm, GuestObject, Value, Builtin, OperationContext, Completion and Location types.
It combines captured-owner functions, two simultaneously active sessions, private
Realm/source/scope/receiver frames, shared steps and call/depth nesting, cross-module
exact permits and finally cleanup. Runtime input selects alpha/7/left or
beta/11/right and real guest descriptor effects. Expectations were written before
execution, including literal counts and exact identities.

The Source token contains only Realm/unit identity. `run`/`code` actions, factory
exports, inspect fields and pre-consumption negative probes are harness facilities,
not proposed production APIs. `code` is a synthetic frame transition, not a guest
call. It has no AST, statement evaluator, executable record body, environment
instantiation or parser entry. Its explicit ticks are not production resource
prefixes; its step errors are model failures, not a change to resourceFailure.

The model guard lives beside the harness. Real Realm wrappers remain closed and
are tested for their original errors. Passing this seam proves the combined
representation can compile under the pinned toolchain; it does not prove production
Realm activation, full facade reachability, evaluator/reference union compilation,
FDI/GDI/block semantics, last-abrupt provenance or complete E4 feasibility. Do not
copy its harness APIs, injected tuple negatives or simplified frames into production.

## Unchanged acceptance gate and stop

Atomic E4 must still satisfy all 55 inherited P/G/L/T/F/C/R/U rows (including
F04–F09), A01–A18 with only the explicit supersessions above, ER R36 and all 13
literal restricted traces. Preserve E3B18/6/12, original D2 marker11 and all actual
resource prefixes. Require 212 exact old records per lane, 48 retained native
gates plus the new gate, two runtime inputs, full Node/newly built native and
separate zero-dynamic coverage with the unchanged parser. Typecheck, runner20,
probes10, host73, observations22, all E1/E2/E3/ER replays, D1 135/207,
metadata136/42/stress8, global15/bootstrap18/D2 two inputs remain mandatory.
All 60 corpus variants stay blocked. Preserve C++, toolchain pins, manifests,
fixtures, outcomes, defaults and historical failures. Never derive expected output
from observed output or edit the old base522413d verifier to admit this checkpoint.

Arguments objects/bindings, Error objects, unsupported grammar, CLI/interpreter.run,
observation/schema/profile/test262 admission and async/generators remain excluded.
Use the existing pinned specification/engine evidence and semantic rules from the
activation design; this checkpoint introduces no new ECMAScript interpretation or
web-retrieval claim. New compiler failures require retained evidence and bounded
review before any workaround or ownership expansion. Stop at this coherent
design/evidence commit for coordinator and independent second review; no production
adoption, successor, branch switch or main publication by this writer.
