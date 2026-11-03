# Strict Script function materialization and declaration setup

TS-033E3-P, design candidate, 2026-11-03. Source base `65f0e10`; E1
`46ebdea`, E2 `df1407f`. This refines E3 of
[the accepted integration design](script-execution-integration.md). All APIs below
are proposed, not implemented. E3 remains host-only. ER is mandatory before E4;
neither factory objects nor this document authorize execution or admission.

## Private ownership and exact consumer API

Keep `ExecutableScript.#state` in `src/script-record.ts`. Put its new consuming
methods in that same class/module. Do not export `ScriptState`, a node getter,
AST callback, a mutable plan, or a constructor taking a plan/node pair. The
existing `inspect()` and `inspectNodes()` stay detached snapshots. No production
consumer uses those snapshots as executable input. Preparation remains the only
way to create usable records; source and private node associations stay those of
one successful parse. Numeric scope IDs are selectors **within the receiving
record**, not globally meaningful identities or authority to attach another AST.

Add these methods (names and return boundaries are frozen for implementation):

```ts
// ExecutableScript instance methods; all use private state internally.
materializeFunction(scopeId: number, environment: ScriptEnvironment,
    inferredName: string | null, context: OperationContext): ValueCompletion;
instantiateGlobals(environment: GlobalEnvironment,
    context: OperationContext): ValueCompletion;
createGlobalMaterializer(environment: GlobalEnvironment,
    context: OperationContext): DeclarationMaterializer;
createFunctionEnvironment(callable: ScriptGuestCallable, receiver: Value,
    context: OperationContext): ScriptFunctionEnvironmentCompletion;
instantiateFunction(environment: ScriptFunctionEnvironment, args: Value[],
    context: OperationContext): ValueCompletion;
createBlockEnvironment(scopeId: number, outer: ScriptEnvironment,
    context: OperationContext): ScriptBlockEnvironmentCompletion;
instantiateBlock(scopeId: number, environment: ScriptDeclarativeEnvironment,
    context: OperationContext): ValueCompletion;
```

The two environment completions are `{type:"normal", environment: ...}` or the
existing `ThrowCompletion`; do not widen `Value`. Separate allocation/setup lets
host controls retain the partially initialized environment after a failure.
Setup is single-use, with ownership and phase stored **on each activation**, not
in a record-owned collection. Implement module-local `FunctionActivation extends
ScriptFunctionEnvironment` and `BlockActivation extends
ScriptDeclarativeEnvironment` in script-record.ts. These class values and their
constructors are not exported; methods above return the existing base types.
Each ExecutableScript owns one private `#activationKey` instance of a module-local
empty `ActivationKey` class. The key has no backreference or activation collection.
Each activation has ECMAScript-private fields `#ownerKey`, `#scopeId` and `#phase`
(`fresh`, `started`, `complete`), plus the inherited outer/callable/receiver fields.
The record constructs it with its key and the validated private scope ID.

Record consumers first narrow with `instanceof FunctionActivation` or
`instanceof BlockActivation`, then call module-local-class methods
`checkFresh(key, scopeId): void`, `begin(key, scopeId): void` and
`complete(key, scopeId): void`. These methods compare key identity and scope
before touching phase; checkFresh requires fresh, begin requires fresh and sets
started, complete requires started and sets complete. No method returns a key
or changes owner/scope. Even recovering a class constructor through host
reflection cannot forge the record's private key. An ordinary E2 base instance,
an object with copied public fields or another record's activation fails before
ticks. Function setup additionally verifies its callable/outer against the
private record's function association; block setup checks scope kind and outer
terminal as before. Do all input validation and argument-list copying before
begin, then begin immediately before the first setup tick. Complete only after
all setup operations succeed. Guest/resource throws and host faults leave phase
started; do not reset it in finally. Failed/completed frames cannot be retried.

E3A introduces ActivationKey, FunctionActivation (including its unused-until-E3B
phase methods), and createFunctionEnvironment. E3B introduces BlockActivation
and uses both activation classes for setup. No activation registry, WeakMap,
WeakRef, finalizer, exposed token or cleanup list is involved. The record retains
only its single key; it has no edge to these activation instances. Live closures
and host references can retain an activation through ordinary environment links;
dropping them leaves no extra record-to-frame root. This is a source-level
ownership invariant, not a claim of measured collection or bounded live heap.
Local subclasses, private fields and class identity follow existing language
mechanisms, but this exact combination still needs E3A's pinned static-only and
separate zero-dynamic coverage plus both-host validation. No weak-collection
compiler support is assumed. Stop for bounded redesign if lowering fails.

A function activation may capture an outer environment created by another record
in the **same Realm**, as required by later multi-unit sessions; its own owner
key and scope nevertheless belong to the callable's record. This is host misuse
detection, not rollback. New activations allow new invocations.

Add detached host inspection `inspectMaterializations(): {completed: number}`.
Increment its private monotonic counter only when a factory has fully built F/P,
immediately before returning normal(F). Do not retain object references or expose
an allocation callback. This lets prefix tests distinguish completed allocation
before a failing binding tick from no allocation, without leaking an unpublished
closure. It does not measure host allocations during an implementation fault.

`ScriptGuestCallable` is an exported **type only**, backed by a class in
script-record.ts with private construction and private state. It has readonly
`kind:"script-guest"`, `realm`, `record`, `scopeId`, `environment`,
`strict:true`, `thisMode:"strict"`, `privateEnvironment:null`, and methods
`sourceText(): string`, `inspectFormals(): string[]`. Readonly accessors derive
from private state; formals are copied; source text is an immutable exact slice.
No `body`, `params` array, `FunctionSource` object, `invoke`, or code pointer is
published. The owning record verifies the callable's private brand and identity
before accepting it; structural object literals and a callable from another
record cannot pass. E4 must later add private dispatch inside this boundary,
not reopen an AST getter. The existing E1 exact-shape SourceText bridge remains.

Validation is unmetered host-invariant work, before ticks, allocations, bindings
or definitions. Require a prepared record, Script Realm, `context.realm ===`
defining Realm, integer function scope ID present in the private plan and node
map, function kind, strict metadata, exact retained source identity/range and
scope/body association. Walk the captured environment chain to its global
terminal: it must be the defining Realm's `globalEnvironment`; reject cycles,
legacy/foreign terminals and malformed tags. This does not require outer scopes
to come from this record. Function setup additionally checks branded callable,
record/scope/outer identity and a fresh activation brand; block setup
checks its activation's owner key, block scope and outer identity. Wrong inputs throw host
invariant errors, consume zero ticks and make zero guest changes. Copy incoming
argument list before ticking, preserving Value identities, so a trusted tick
callback cannot change which arguments will initialize later formals.

Host contexts are intentionally accepted for inspection/setup: `tick` can return
a chosen throw or throw a host sentinel. This is **not** an authorized execution
context. No helper calls `context.call`, invokes a body or activates a frame.
Arbitrary host contexts remain insufficient to invoke Script builtins.

## Callable, Realm and existing consumers

Extend `runtime.ts`'s Callable union with `ScriptGuestCallable` using a type-only
import. No legacy callable cast and no legacy `Environment` in its payload.
`Realm.createScriptFunction(record, scopeId, environment, inferredName, context)`
returns ValueCompletion: check `record.belongsTo(this)`, Script profile and
context identity, then delegate to `record.materializeFunction`. The record
allocates ordinary GuestObjects directly with defining-Realm prototypes; no
second raw callable factory or public AST-based overload. Existing
`createGuestFunction` stays legacy-only, with unchanged descriptors/behavior.

`Evaluator.call` currently treats every non-builtin as legacy guest. Change to
explicit builtin / guest / script-guest handling, with script-guest throwing
`Script execution unavailable` before call counters or Realm mutation. Retain
the earlier cross-profile and Script-context guards exactly. No script-guest
fallback to `this.block`. Evaluator constructor/entry remain legacy-only.
`Realm.guardBuiltin` keeps both cross-profile and Script-unavailable guards;
no direct `invoke` escape hatch, allowScript boolean, or unguarded builtin copy.

Extract the existing toString decision into
`functionSourceString(callable: Callable): string` in builtins/function.ts.
It switches explicitly over guest (existing nullable source behavior), builtin
(existing native text) and script-guest (`sourceText()`). The registered builtin
retains its noncallable TypeError and guarded invoke path. Host tests may call
the pure helper; they may not call Script builtin invoke to test it. Changing
name/prototype properties never changes retained source text.

E2 `ScriptFunctionEnvironment` currently accepts any Callable and its test uses
Function.prototype's builtin callable. Narrow its constructor/property to
ScriptGuestCallable and validate that tag/record brand via record allocation.
Keep strict receiver Value and outer identity exact. Migrate that E2 host fixture
to a genuinely prepared/materialized function and call E3A's
`record.createFunctionEnvironment` to allocate its empty FunctionActivation;
do not invoke instantiateFunction or a body. This allocation consumes the A tick
specified below and initializes no parameter/var/lexical bindings. Preserve any
existing direct host binding operations in the fixture as E2 helper controls;
they are not declaration setup. Retain all original receiver and
reference/completion assertions and output records. Do not retain a production
fake builtin exception for the old fixture.

All other actual production consumers only test callable presence or read Realm:
`runtime.ts:display`, `typeof.ts`, `array-map.ts`, `primitive-conversion.ts`,
`builtins/array.ts`, `builtins/object.ts`, `builtins/function.ts:call`, and
`realm.ts:defineScriptGlobal`. They need no new branch: callable remains callable
for classification, but all invocation routes still meet the closed shared
guard. No edits to these modules beyond the explicitly listed owners below.

## Factory identities, descriptors, source and naming

For every success allocate distinct function F and prototype P, even for the
same record/scope/environment. F inherits defining Realm Function.prototype;
P inherits its Object.prototype. No own caller/arguments properties. Install in
order length, name, prototype (P's constructor first). `length` is simple formal
count; name is declaration name, inferred anonymous name, or empty string.
Name and length are W/E/C=false/false/true; F.prototype=true/false/false;
P.constructor (value F)=true/false/true. F and P start extensible. Source slice is
the full `function` through closing brace, including internal comments and exact
UTF-16 units; no surrounding parentheses, source-unit text rewriting or inferred
name insertion. Store source-unit identity and record identity separately from
the diagnostic location. No constructor execution/IsConstructor admission is
implied by these ordinary-function properties.

Each factory has exactly **one** new tick M at function keyword location, after
validation and before allocating F/P and installing their private ordinary data
descriptors as one non-callback operation. A failed M allocates neither object.
No additional ticks per descriptor: the sequence is bounded, invokes no guest
code and cannot normally fail on fresh ordinary objects. Unexpected definition
rejection is a host invariant fault. Allocation is not rolled back on host
fault. No ticking through bootstrap or resetting the caller's budget.

NamedEvaluation is syntax-driven, not a post-assignment name mutation. In this
grammar anonymous function expressions are the only anonymous definitions.
`Parser.primary()` erases parentheses by returning the very same Expr; this is
correct for IsAnonymousFunctionDefinition's parenthesized forwarding rule.
Retain that identity when associating private function scopes. At each private
consumer, `rhs.kind === "function"` is sufficient **only for the whole RHS**:
let/var initializer, identifier `=` RHS and ordinary object property value may
supply the binding/property string. Parenthesized function RHS still qualifies;
conditional, binary, call, member, assignment-wrapped and compound RHS do not.
Member assignment never infers a name. **Parenthesized identifier LHS does not
qualify** (fixed2025 IsIdentifierRef explicitly returns false for the cover
parenthesized production). The existing erased AST cannot distinguish that case.
Freeze this minimal private seam: Parser tracks parenthesized Expr identities
in a Map<Expr, boolean>; primary marks the returned expression on consuming `)`.
When constructing an `assign` Expr, record in a second Map<Expr, boolean> whether
its target is an identifier and is absent from the parenthesized map. Compute
this before discarding syntax; outer parentheses around the assignment itself
do not alter the already-recorded target eligibility. Only declaration-plan
mode retains these maps; legacy parse output/AST/evaluation is unchanged.
`DeclarationNodes` gains `assignmentNameEligible: Map<Expr, boolean>` populated
from the successful Parser in parseDeclarationPlan; the record owns it privately.
No map or Expr escapes. Add `inspectNamingSites()` returning detached
`{loc: Location, eligible: boolean}[]` in assignment source order for host tests.
E4 checks this private map as well as whole-RHS anonymous eligibility. No syntax.ts
change, token blacklist or grammar widening. The compiler has not yet validated
this particular Expr-key map; E3A must prove static lowering or stop for a bounded
representation revision, not publish AST to bypass the constraint.

The factory accepts inferredName only for anonymous expressions; declarations
require null and derive their name privately. It cannot prove a caller's naming
site from a string: this is a trusted internal primitive, and E4 must select it
at the above syntax sites before evaluation. E3 tests factory metadata and
private source projections; E4 tests actual NamedEvaluation evaluation order.
Named expressions, defaults/rest/destructuring, arrows, methods and computed
object keys remain blocked, including unreachable bodies.

## Function and block setup ticks

These are resource-accounting contracts, not spec step counts. Tick before every
listed action. Return the exact ThrowCompletion from a tick or environment
operation; never wrap/reclassify it. Host exceptions escape unchanged. Helpers
never alter active Realm/frame/calls/depth, so these must equal saved values on
every exit; steps remain consumed. E4 will own frame save/restore in finally.

Function environment allocation A ticks at the function keyword, then allocates
one ScriptFunctionEnvironment capturing callable.environment and exact receiver.
`instantiateFunction` validates before marking started, then:

1. S: scan **every** varDeclarations occurrence in reverse order, tick at its
   declaration identifier. Select last function per name; reverse winners to
   winning source order. Non-functions and duplicate losers still consume S.
2. C: create each formal binding in source order, tick at formal identifier.
3. I: initialize each formal left-to-right from copied args/missing UNDEFINED,
   tick at formal identifier. Strict duplicate formals were rejected in prepare.
4. V: scan each varDeclarations occurrence forward, tick at its identifier.
   Skip names already formal/instantiated; otherwise create binding (separate
   C tick) then initialize undefined (separate I tick). This includes function
   names, even when their final function value will replace undefined.
5. L: create each direct body lexical let in source order, tick at identifier;
   leave TDZ. Nested block lets/functions are not body lexical declarations.
6. For each winning function in winning source order: M factory tick at keyword,
   then W tick at its declaration identifier before SetMutableBinding. Capture
   the same function environment; overwrite a same-name parameter or var.

No arguments object/binding is created: this is explicit accepted subset debt,
permitted only while arguments/eval identifiers, eval entry and environment
introspection remain unavailable. Do not fabricate an undefined binding or
advertise full FDI. Duplicate vars are harmless, parameter/var collision keeps
argument value absent a winning function, and body let/formal/var conflicts are
preparation failures before setup. Extra arguments are ignored.

Block allocation A ticks at the block's opening-brace location, makes a fresh
BlockActivation linked to outer, with private owner key/scope and fresh phase.
Setup visits direct lexical declarations in source order: L tick/create binding;
for a function immediately M tick/materialize capturing this new environment,
then I tick/initialize that binding, before the next declaration's L. Lets stay
TDZ; no bulk precreation. Untaken blocks do not call either helper. No setup
helper evaluates initializers or statements. Prefix mutations survive failure;
the caller activates the environment only after successful setup. Function/var
declaration statements later return empty; var initializer resolution uses the
current lexical chain, let initializes the existing TDZ binding, and function
fallthrough is undefined regardless of last statement value (all E4 work).

## Exact D2 adapter

`record.instantiateGlobals(environment, context)` checks environment identity
against the record Realm before effects, then calls unchanged
`instantiateGlobalDeclarations(state.plan, environment, context, materialize)`.
The full five-argument DeclarationMaterializer comes from
`record.createGlobalMaterializer(environment, context)`, which validates those
two identities before returning a closure over private state. Returning this
closure discloses no private arguments or AST. It is useful for negative host
controls: public snapshots are deliberately rejected by it; only the wrapper
can supply all successful private identity arguments.
It checks `declaration === state.plan.declarations[id]`,
`fn ===` the private planned-function entry with matching declaration/scope,
`unit === state.plan.unit`, `environment ===` the wrapper's checked global,
and `context ===` the wrapper's context, with matching Realm. Then it looks up
the private node and calls the factory with `{kind:"global",record:environment}`
and null inferredName. No detached plan accepted; no structural pair validation
or parsing twice. D2's existing marker controls remain unchanged/test-only.

Every invocation reruns D2 against current global state; cache no admission or
closure result. Existing eleven D2 ticks for
`"use strict"; let l; var x; function f(){}` have columns
`19,26,38,38,26,26,38,19,38,38,26` (all line 1). Insert M at column29 after
the ninth tick, yielding **12** ticks:
`19,26,38,38,26,26,38,19,38,29,38,26`.
At budget8: l exists TDZ, no F allocation. At9: M fails, same state.
At10: F allocated, binding tick fails, f/x absent. At11: f bound, x absent.
At12: x initialized undefined. A failed earlier admission makes no allocations;
no later initializer/body runs. Retain original eleven-tick marker replay too.

## Evidence basis and bounded ownership

Use fixed [ECMA-262 edition 16 (2025)](https://262.ecma-international.org/16.0/),
especially §§8.4, 10.2.3, 10.2.5, 10.2.9, 10.2.11, 14.2.3 and 16.1.7. Retained
`ts-033e-p/spec.json` has source SHA256
`6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713`;
`ts-033d-p/spec.json` supplies related declaration semantics. Pinned engine262
`d553e7b52501fbc47eae981c8d0fa7a5c26d0171` evidence in
`ts-033e-p/engine.json` includes function-operations.mts, Block.mts and
InstantiateOrdinaryFunctionExpression.mts with MIT license. Adopt explicit
capture/source/metadata and immediate block function initialization. Do not copy
its generator evaluator, ambient agent, class/async branches or broader grammar.
Fixed specification governs disagreements; no reference-engine run is evidence
for these proposed helpers. The private record API and ticks are Rift decisions.

Recommend two separately assigned and reviewed implementation slices. This
document assigns neither and starts no successor.

| Slice | Exact production ownership | Exact tests/tools/docs ownership |
|---|---|---|
| E3A factory, empty function activation and closed union migration | src/script-record.ts (materialization, inspections, ActivationKey, FunctionActivation with brand/phase methods, createFunctionEnvironment), src/runtime.ts (Callable type only), src/realm.ts (bounded wrapper only), src/builtins/function.ts (pure source helper/exhaustive arms), src/evaluator.ts (closed explicit branch only), src/script-environment.ts (callable typing/validation only), src/parser.ts and src/script-declarations.ts (private assignment eligibility seam only) | new test/script-function-materialization.ts; test/script-environment.ts genuine factory/empty-activation fixture migration; new fixtures/script-function-materialization/a.txt and b.txt; tools/build-native.mjs additive gate only; docs/validation/ts-033e3a/; this design's implementation notes and own TASKS entry |
| E3B setup and bound D2 adapter, after E3A acceptance | src/script-record.ts only (BlockActivation, createBlockEnvironment, instantiateFunction, instantiateBlock, createGlobalMaterializer, instantiateGlobals; invoke E3A phase methods) | new test/script-function-setup.ts; new fixtures/script-function-setup/a.txt and b.txt; tools/build-native.mjs additive gate only; docs/validation/ts-033e3b/; this design's implementation notes and own TASKS entry |

E3A implements **no** function/block declaration setup and no D2 adapter; those
methods from the combined API list are absent until E3B, not callable stubs or
temporary bypasses. Its fixture and F09 have their real allocation API in E3A.
E3B changes no E2 fixture or environment module and does not need an activation
registration API. Matrix slice allocation is exhaustive in matrix.md; E3A runs
factory/empty-activation prefixes only, E3B runs declaration-setup prefixes and
replays E3A. All source-execution observations remain E4-only.

If actual registration lives elsewhere, or compiler constraints require exported
private state/new core modules, revise ownership before implementation; do not
quietly expand. D2 module, syntax, planner semantics and existing E1/E2 records
remain unchanged except the stated private parser bridge and E2 fixture/typing migration. No shared core
writer overlaps. Coordinator owns COORDINATION and publication.

Both slices preserve all current212 exact guest records/44 gates, E1/E2 two-input
controls, D1 135 and baseline207 projections, metadata136/42/stress8, global15,
bootstrap18 and D2 two-input replays, runner20, probes10, host73, observations22,
all60 blocked corpus variants, C++, pins, source fixtures and historical evidence.
Implementation must rebuild both hosts and independently parse zero-dynamic
coverage for inherited and additive gates; typecheck and test records cannot be
weakened to accommodate the new union. This design audit supplies no new native,
runtime or conformance result. ER accessor/context migration remains separate;
F.caller/F.arguments are not solved by omitting the arguments environment. E4
must wait for independent E1/E2/E3/ER acceptance and full restricted-property
execution controls. Closed guards protect the interim incomplete prototypes.

## E3A compiler feasibility stop (2026-11-03)

The first candidate was restored out of production after the pinned compiler
rejected deliberate F07/F09 invalid-input casts at the frozen typed boundaries.
See [reductions and resumable candidate](validation/ts-033e3a/README.md).
The positive private factory/activation E2 entry is fully static; this does not
satisfy the entire matrix. A bounded validation-lane revision needs independent
acceptance before resuming. No API, ownership or execution expansion is adopted.
