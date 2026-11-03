# TS-033E4-P: atomic internal Script activation

Design for independent review, 2026-11-03; semantic base `9b540e7`.
Coordinator-only dispatch commit `6014cc2` changes no source. This refines the
mandatory E4 section of [the integration design](script-execution-integration.md),
without editing that historical contract. E1, E2, E3A/B and ER-A/B are accepted;
E4 is not implemented or authorized by this document. The old document's
42-gate baseline has grown to **48**, with the same **212 records per lane**.

## Decision and atomic boundary

One independently assigned E4 implementation must integrate private record access,
Script statement semantics, shared expressions/references, real function calls,
session restoration and authenticated builtin entry together. Do not publish a
temporary callable subset, an AST runner, or a flag that opens guards. CLI,
interpreter.run, observation drivers/protocol and corpus admission stay legacy.
Host-only E1–ER helpers stay usable for their existing tests; their OperationContext
arguments do not confer execution authority.

The smallest *security-coherent* boundary requires co-location of private record
storage and execution. Merely exporting `getBody(record)` or `withBody(callback)`
would let arbitrary host callbacks retain mutable ASTs; readonly types do not fix
that. Use one new `src/script-execution-internal.ts` module containing the existing
record implementation, a single shared execution engine, and the opaque session.
`script-record.ts` and `evaluator.ts` become compatibility facades. This moves code
but does not duplicate an interpreter. Keep existing algorithms intact except for
the explicit dispatch changes below. Review mechanical moves separately in the
diff, but land the complete boundary atomically. There is no separate accepted
"move now, open later" implementation assignment here.

## Actual seams and exact ownership proposed for E4

The repeatable [audit](validation/ts-033e4-p/README.md) records source hashes and
numbered seam occurrences. These are source observations, not execution results.

| File owned by future E4 | Exact allowed change |
|---|---|
| new `src/script-execution-internal.ts` | Move ExecutableScript, ScriptGuestCallable, activation brands and existing Evaluator algorithms here; add private record lookup, shared execution dispatch, session/frame and builtin permits. No export of AST/map/body/engine/permit constructors. |
| `src/script-record.ts` | Re-export exactly its existing public types and prepareStrictScript from the internal module; preserve existing inspection and host setup methods and rejection outcomes. |
| `src/evaluator.ts` | Re-export the legacy Evaluator wrapper; keep its existing constructor, public counters, limits, context and method signatures usable by all legacy callers. |
| new `src/script-execution.ts` | Internal-facing facade exporting only createScriptSession, evaluateScript and opaque/result/snapshot types. Not re-exported by interpreter or observation. |
| `src/realm.ts` | guardBuiltin must consume the exact pending Script builtin permit; preserve legacy invocation and cross-profile checks. Point the existing reachability import at the internal implementation if required. No bootstrap/descriptor changes. |
| new `test/script-execution.ts`, new `fixtures/script-execution/{seed,other}.txt` | Complete matrix, runtime input variation, private-state cleanup via detached snapshots and real nested calls. No mutation of inherited tests. |
| `tools/build-native.mjs` | Append one driver, retain the 48 entries in order and both coverage checks. |
| `docs/feature-inventory.md`, E4 TASKS entry, new `docs/validation/ts-033e4/` | Truthful internal-only execution inventory and measured evidence. Coordinator alone edits COORDINATION. |

Everything else is read-only, including runtime.ts, parser.ts, syntax.ts,
script-declarations.ts, script-environment.ts, script-completion.ts,
script-global-declarations.ts, all builtins and all existing tests. Runtime's
OperationContext structural type need not become an authorization token. Runtime
property references and E2 binding references can be composed by a private union
in the shared module. Existing type-only imports through the facades are retained.
If compilation or a required legacy test reveals an additional necessary edit,
retain the failure and propose that exact ownership revision before proceeding.

## Frozen APIs and private identity

Proposed signatures (not current APIs):

```ts
// script-execution.ts; only type exports for the classes, no constructors
type ScriptLimits = { readonly maxSteps: number; readonly maxCalls: number };
function createScriptSession(limits?: ScriptLimits): ScriptSession;
function evaluateScript(session: ScriptSession, record: ExecutableScript): ScriptEvaluation;
type ScriptEvaluation =
  | { phase: "body"; completion: ValueCompletion }
  | { phase: "instantiation"; completion: ThrowCompletion };
// method on opaque session; detached containers, preserved host identity references
// inspect(): { steps: number; calls: number; depth: number;
//   active: null | ScriptFrameSnapshot; lastAbrupt: null | ScriptSourceSnapshot }
type ScriptSourceSnapshot = { readonly realm: Realm; readonly record: ExecutableScript;
  readonly unitId: string; readonly loc: Location };
type ScriptFrameSnapshot = { readonly realm: Realm; readonly record: ExecutableScript;
  readonly scopeId: number; readonly lexical: ScriptEnvironment;
  readonly variable: ScriptEnvironment; readonly strict: true;
  readonly thisValue: Value; readonly function: ScriptGuestCallable | null;
  readonly privateEnvironment: null; readonly phase: "instantiation" | "body" };
```

Defaults are steps100000/calls64/depth256; source100000/parse128 stay per-unit.
Reject invalid limits (negative, noninteger, nonfinite) as host faults before use.
Snapshot containers and locations are detached; identity-bearing Realm, opaque
record, Value and existing host-inspectable E2 environments are retained as
references, so the driver can compare exact frame restoration without a strong
identity registry retaining every historical activation. This is trusted host
inspection, not guest environment reflection. It exposes no context, key or body;
writing snapshot fields cannot change the active frame. Existing environment
objects are not advertised as immutable. Do not add a session activation cache.

No session constructor, context getter, reset, counter setter, call method or AST
entry is exported for Script. The legacy wrapper preserves all its old public
fields/methods but cannot construct a Script engine. The module-private engine
constructor requires a module-private identity key for Script mode, including
when discovered through a JavaScript prototype's constructor. An opaque session
has private fields and validates its brand at evaluateScript; fake objects and
uninitialized shells fail before ticks. Reflective replacement of arbitrary
module code/prototypes is not a sandbox threat model, but structural casts,
constructor recovery and ordinary context mutation are explicit negative tests.

Co-located record static methods may access #state only after validating the
engine's private key and active record identity. Freeze these *unexported* seams:
`readRoot(record,key): Stmt[]`, `readFunction(record,callable,key): {scopeId,body}`,
`scopeOfNode(record,node,key): number`, and
`assignmentMayName(record,assignNode,key): boolean`. Returned arrays never cross
the module or reach a public engine/wrapper method. The key is never passed to
host builtins, test callbacks, context, or inspection results. No callback-based
body access. All Script dispatch routines are private methods of the engine;
the legacy wrapper's public AST methods always select legacy dispatch.

At preparation, build private reverse node->scope identity maps from the existing
DeclarationNodes associations; validate unique identities, root0, block/function
kind and exact body/source relationships. Key by node identity, not loc/name/text.
The mapping is record-local: equal source IDs, equal text and equal scope numbers
in another record confer no authority. Preserve assignmentNameEligible keyed by
the *assignment expression*, not its target (parser.ts's current contract).
Function expression dispatch obtains the original node's scope then calls the
existing record factory. Never reparse substrings or materialize from inspection
copies. Keep activation freshness checks and no record->activation registry.

## Session, frame and builtin authorization

The private engine owns steps, current calls and evaluation depth. Steps increase
monotonically; calls/depth are active nesting counters, not cumulative counts.
They increase on entry and restore to saved values on exit. Do not describe all
three as monotonically increasing. Exhaustion is never cleared on another unit.

Frame: `{realm, record, scopeId, lexical, variable, strict:true, thisValue,
function:ScriptGuestCallable|null, privateEnvironment:null, phase}`. Record owns
source identity; frame changes never rewrite source text. evaluateScript checks
the record brand, strict Script profile and owner before any tick; rejects host
reentrant top-level entry while that session is active. It saves the caller,
installs root lexical=variable=the owner's GlobalEnvironment, this=globalThisValue,
then runs record.instantiateGlobals with the *same* context. Only normal GDI
enters the root body. Phase is internal, never a new observation field.

The stable Script OperationContext is an object with getter realm and getter
call/tick returning private, fixed callbacks (no writable data fields). Freeze
the view after construction so own-property definition cannot shadow the getters;
private engine state remains mutable behind it. Do not freeze Realm or guest
objects. Host freeze/private-getter compilation belongs in the bounded reduction
if needed, not an assumed native capability. Both callbacks are **ordinary,
unbound functions with an explicit invocation receiver**, never arrows or
functions pre-bound to the engine/view. Their first operation compares `this`
by identity with the captured authentic view, then checks that its owning session
has an active frame. Only after both checks may call dispatch or tick proceed.
Thus authentication precedes argument dispatch, step/call/depth changes and permit
creation/consumption; failed authentication throws a host invariant error with
no such effects. Proposed private callback shape:

```ts
const call = function(this: OperationContext, callee: Value, receiver: Value,
                      args: Value[], loc: Location): ValueCompletion {
  if (this !== exactView) throw new Error("invalid Script context receiver");
  requireActiveSession();
  return engineCall(callee, receiver, args, loc);
};
const tick = function(this: OperationContext, loc: Location): ValueCompletion {
  if (this !== exactView) throw new Error("invalid Script context receiver");
  requireActiveSession();
  return engineTick(loc);
};
```

Here exactView/session/engine callbacks are private lexical captures, never
supplied by a host caller. The view is assigned once before publication; the
callbacks cannot be called during construction. Existing production consumers
use `context.call(...)` / `context.tick(...)`, preserving that receiver. No
runtime.ts type change or legacy callback behavior change is required.

During a live callback, clone.call/tick, spread.call/tick, proxy.call/tick,
detached invocation and rebinding to any clone/proxy/other session's view fail
this identity check even though the underlying function was copied from the real
view. A forwarding proxy that returns the function unchanged still supplies the
proxy receiver and fails. Property definition/assignment cannot replace the
frozen callbacks or realm getter. Captured idle views also fail the active check.
An authentic active view remains a trusted-host capability: explicit
`copiedCall.call(exactView, ...)` or binding to that exact view is equivalent to
`exactView.call(...)` and is permitted. A host that possesses the authentic view
can deliberately forward it; claiming to reject that forwarding would exceed
this identity boundary. It does not authorize direct builtin.invoke, which still
requires its one-use permit. A copied callback alone with a copied/forged receiver
cannot mint authority. Test both this boundary and its exact-view positives.
Legacy
context shape/behavior remains unchanged. Host contexts remain accepted by E2/E3
setup for host projections, but cannot enter bodies or invoke Script builtins.

`consumeScriptBuiltinPermit(context: OperationContext, realm: Realm,
guardedInvoke: Builtin, receiver: Value, args: Value[], loc: Location): void`
is the sole authorization value export from the internal
module needed by realm.ts. It only validates/consumes; it cannot mint permits.
The context is a module-private class with a private brand/key, and validation
also requires the exact view object owned by its engine. No structural brand,
profile comparison, allowScript flag or user-created context is sufficient.
Do not use a public registry or accept a caller-selected authorization callback.

Realm.guardBuiltin binds its returned wrapper identity to `guardedInvoke`.
The private call dispatcher, after profile and call-limit checks and after
installing the callee Realm, pushes a pending permit containing that exact
wrapper, exact context, Realm, receiver, args and location identities. Immediately
before the raw builtin callback, the wrapper consumes the permit, checking those
argument identities too. Consumption occurs once, before
running arbitrary host code. A same-Realm different builtin, replay, copied view,
stale context or direct `.invoke` cannot consume it. Finally pops/restores the
previous permit state even on host exceptions. Nested context.call creates a new
permit; never reuse the parent's consumed permit. No raw callback unwrap API.

Script guest calls install the callee's defining Realm AND record, exact strict
receiver, fresh function environment, variable=lexical=function environment,
then existing FDI, then its private body. Builtins switch Realm for allocation
but retain caller record/scope/lexical/variable/strict/this provenance; their
receiver travels as the invocation argument, not as caller Script this. A nested
guest callback switches code provenance again. Builtin wrapper authentication
itself adds no tick. Property Get/Set remains ER's context.call path, including
the real Realm-local restricted thrower. No direct builtin bypass from coercions.

Every root entry, call, expression/statement depth entry and block uses host
finally with saved values. Restore frame, Realm, source, lexical, variable, this,
permit stack, calls and depth on normal/guest/resource/host failure. Retain steps,
declarations and guest side effects. Guest ThrowCompletion identity and location
are unchanged. Since current ThrowCompletion has no unit field, capture a private
session last-abrupt provenance (active allocation Realm plus code record/unit)
alongside it at the point of failure, without
wrapping/mutating the completion; expose only detached provenance in the dedicated
driver's assertions. Preserve the first capture while the same completion unwinds,
so the caller does not overwrite the callee's source or thrower's Realm. Start
the next root evaluation with no pending abrupt capture; retain only the latest
completed result snapshot, never a registry of all failures. Do not widen
outcomes/observation schema. A host sentinel
escapes unchanged and does not become a diagnostic. No guest try/finally support.

The cleanup contract covers all exit kinds, but evidence must distinguish which
faults are reachable through the API. Real engine-owned ticks are fixed and have
no injection hook: test every resource-limit prefix with session limits, including
GDI, factory allocation/publication, block setup, FDI and body. Test host-sentinel
cleanup through real registered builtin callbacks reached by guest calls,
accessors or coercion hooks, with real nested calls establishing nonzero saved
state. This exercises callback, call, expression, statement, enclosing block and
root unwind; a callback that catches the sentinel around context.call can compare
the restored nonzero caller frame before returning. Then test an uncaught path
to root and the same sentinel identity. Such callbacks do not occur at every
GDI/FDI/setup tick: do not claim host-fault injection coverage there. Existing E3
host setup tests separately inject host/guest failures using their supplied host
contexts, preserving their labels and expectations. They prove setup-helper
propagation, not engine-owned tick injection or integrated session restoration at
every setup instruction. No hidden fault hook, mutable tick override or authority
bypass is part of E4.

## Shared dispatch and statement rules

Move the existing expression/operator/property/coercion/call algorithm once.
Its private evaluation environment is tagged legacy or Script. Wrappers retain
legacy Completion behavior. Script expression adapters admit only normal/throw
ValueCompletion; unexpected return/break/continue from expression is a host fault.
Private reference union selects legacy binding, E2 ScriptBindingReference, or
existing runtime property reference. The get/put adapter delegates to the current
helper; it does not convert a Script global to legacy Environment.

Identifier resolution occurs before RHS. Captured null never resolves again.
Compound assignment gets before RHS; property key conversion/caching stays at
the existing getValue/putValue point. Call identifiers have undefined receiver;
members have original base receiver. typeof's exception is only unresolvable
identifier, not TDZ/member/accessor. Delete delegates property references to the
existing helper without Get. All binary conversions and array slot ticks retain
legacy order, including short circuit/conditional selected-arm evaluation.

Script statement entry and expression entry each retain one tick and the depth
guard. Root/function lists have no extra wrapper tick. A block statement ticks,
then existing allocation/setup ticks, then body; restore lexical only, preserving
variable environment. Untaken branches allocate nothing. StatementList starts
empty, uses updateScriptEmpty with previous payload, and returns abrupt records
without losing previous values. Empty/function/let/var statements return empty;
expression statements return a present Value. Let initializes the pre-created
lexical binding after RHS (or undefined), leaving TDZ if RHS fails. Var without
initializer does nothing; each initializer resolves its binding in the current
lexical environment before RHS and puts afterward, left-to-right.

If fills empty with undefined on both selected and missing branches. While V
starts as present undefined, updates on nonempty normal/continue, consumes only
unlabelled break with UpdateEmpty(V), propagates other abrupt completions, and
does not invent a tick on loop control. Return/throw evaluate once; return is
never empty. Function fallthrough discards list value and returns undefined.
Only root normal-empty normalizes to undefined. Root return/break/continue or
function escaping break/continue is an invariant failure, not guest support.

NamedEvaluation uses existing private eligibility: let/var initializers and
ordinary object property direct anonymous function values receive their name;
simple identifier assignment requires assignmentNameEligible=true. Parenthesized
RHS anonymous functions retain eligibility; parenthesized LHS loses it. Conditional
or assignment-valued RHS is not recursively renamed. Member assignment gives
empty name. Declaration names, descriptors, strict this and exact source slices
remain the accepted E3 factory contract. Replay N01–N04 as actual source execution.

## Grammar and conformance boundary

Preparation is the existing complete declaration-mode parse, EOF and conflict
validation plus strict profile. Do not accept an executable prefix. Supported
statement kinds are exactly empty, expression, let, var, function, block, if,
while, return, throw, break, continue with parser context restrictions. Expression
kinds are exactly syntax.ts's 13 arms (including array holes and conditional).
No new parser acceptance is needed for E4.

Explicitly retain rejection of const, for/do, labels, switch, try/catch/finally,
new/classes, async/generator/await/yield, modules, with/eval, arrows, named function
expressions, rest/default/destructuring/duplicate formals, methods/accessor syntax,
computed object keys, spread, __proto__ literal, ++/--, comma expressions and
unsupported lexical forms. ASI/newline restrictions remain narrower than ES.
Rejections in unreachable bodies still veto the whole record. Do not certify
unsupported syntax as a spec early error or execute non-strict source.

E3 omits standard unmapped arguments object/binding. Parser rejects identifier
references and bindings named arguments/eval throughout source; property keys
remain legal. This is an explicit subset debt, not complete FDI. `this.arguments`
or `o.arguments` is ordinary property access; `f.arguments` is the inherited ER
accessor and MUST actually throw. No fake undefined arguments binding. Standard
arguments semantics precede any identifier/eval/environment-reflection admission.
Likewise diagnostic TypeError strings are not Error objects or test262 negative
matches. Ordinary function prototype metadata does not imply [[Construct]].
No conformance count, harness support or native feasibility is inferred here.

## Frozen validation and evidence basis

[Inherited matrix](validation/ts-033e4-p/execution-matrix.md) preserves every
P/G/L/T/F/C/R/U row verbatim, including all F04–F09. [Additional matrix and tick
contract](validation/ts-033e4-p/activation-matrix.md) resolves API authorization,
exact prefixes, cleanup and source provenance. ER R36 is a mandatory umbrella,
not a passing host projection. E3B18/6/12 and D2 marker11 remain exact; no wrapper
ticks are added. Literal new counts are design predictions to test, not measured
execution. A mismatch requires fixing the implementation or independent review
of the contract, never regenerating expectations from observed output.

Use fixed [ECMA-262 edition16](https://262.ecma-international.org/16.0/), retained
SHA256 `6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713`:
§16.1.6–7 root entry/GDI, §10.2.1.2 strict receiver, §10.2.11 FDI,
§14.2/14.6/14.7 UpdateEmpty/list/if/while, §6.2.5 references, §9.3.2 and
§10.2.4 restricted properties. Retained E-P spec.json and ER-P spec.json are
checked offline; this assignment makes no claim of a new web retrieval.
Pinned engine262 `d553e7b52501fbc47eae981c8d0fa7a5c26d0171` source in E-P/ER-P
engine.json supports separate execution contexts, function instantiation and
ordinary accessor Call. Adopt semantic separation, not its generator scheduler.
Follow the fixed specification for StatementList's previous *value*, rather than
copying engine262's retained blockCompletion argument. Builtin permit machinery
is a Rift host boundary decision, not an ECMA algorithm or engine262 feature.

Future acceptance: both runtime-selected inputs, Node and newly built native;
212 exact inherited records/lane; 48 old plus additive static-only builds and
independently parsed zero-dynamic coverage; all E1/E2/E3/ER replays; D1 135/207,
metadata136/42/stress8, global15/bootstrap18/D2 two inputs; typecheck, runner20,
probes10, host73, observations22 and all60 corpus variants still blocked.
Preserve C++, pins, manifests, old fixtures/tests, outcomes, defaults and all
historical failures. New driver must fail on absent/skipped controls.

If co-location, facade reachability, private context getters or dispatch union
fails scriptc: retain exact failing build/coverage first; propose a bounded
standalone reduction with two facade imports, one private record/node, one
authenticated builtin with nested callback, exact-view invocation-receiver
checks (including copied/detached callbacks), one Script/legacy reference union
and finally from seeded counters. Compare literal Node/native results and static
coverage. No full engine fork, compiler workaround, dynamic tier or pin change
before separate review. This design does not itself run that feasibility probe.

Stop after design commit for independent review; no production activation,
successor, branch switch or main merge by this writer.
