# Internal map default selection — TS-034H6-MP

Design candidate against `18011ee`, 2026-11-04. **Not implementation approval.**
C stays blocked. Accepted `883648b` demonstrates the regression (80 rows,
3779 static statements, zero dynamic); those results describe unchanged B plus
a trusted Object-constructor-link simulation, not this proposed algorithm.

## Decision and scope

Extend the existing internal object-only helper in the **running Script Realm**.
Preserve the entire legacy-profile branch byte-for-byte, including its synthetic
unsupported result for every non-undefined array constructor. This deliberate
profile boundary protects historical tests and public legacy behavior. A Script
operation on a legacy-created array still uses Script selection; a legacy
operation on a Script-created array uses legacy selection. Object provenance
does not select policy. Callable cross-profile guards remain unchanged.

For Script operations, use the default-producing part of ArraySpeciesCreate and
distinguish an invalid selected value from a valid constructor whose construction
is unsupported. Do not call or construct the selected value. This remains an
internal bounded helper, not a standard Array.prototype.map implementation.

The new singleton `wellKnownSpecies` belongs in `src/symbols.ts`, adjacent to the
existing canonical well-known symbols. Its description is `Symbol.species`.
Every Realm shares that semantic identity. Exporting it for internal consumers
does not expose a Symbol global, install a property on any guest object, or
change any bootstrap own-key inventory. Strings and newly created symbols with
the same description are unrelated keys.

## Ordered selection contract

Keep `mapObjectDefaultArray(object, callback, thisArg, context, loc)` unchanged.

1. Run the existing completion-aware `lengthOfArrayLike` once; preserve its
   coercion, abrupt completion, source location and saved numeric length.
2. Validate callback callability, including length zero. Preserve the current
   language TypeError message and Realm. No constructor read on this failure.
3. Ordinary inputs skip constructor and species completely. For a GuestArray,
   perform exactly one `internalGet("constructor", input, context, loc)`.
   Return its abrupt record unchanged. The receiver is the original array Value.
4. In a legacy operation retain the existing non-undefined unsupported branch
   and perform no species Get. In Script, call this result C. If C is an object,
   perform exactly one `C.object.internalGet(wellKnownSpecies, C, context, loc)`.
   Return its abrupt record unchanged. Inherited accessors retain C as receiver.
   If this **species result** is null, treat it as undefined. An initial
   constructor=null is not a default: it reaches step 6.
5. Selected undefined chooses the existing default allocation path.
6. Any other selected primitive, or object with `constructorSlot === null`, is
   `languageFailure(context.realm, "TypeError", "map species is not a constructor", loc)`.
   This is an actual GuestError in Script, engine-diagnostic origin, not an
   unsupported-operation classification. Callability alone is insufficient.
7. A selected object with a non-null constructor slot returns the existing
   `unsupportedFailure("runtime.map-species", "TypeError", "unsupported map constructor/species", loc)`.
   It remains synthetic and explicitly unsupported. No prototype Get, argument
   construction, permit acquisition, call, construction or result allocation.
8. Only the default path checks saved length >4294967295, then allocates via
   `context.realm.createArray()` and initializes length exactly as today. The
   existing loop and all definition/abrupt/invariant handling remain unchanged.

The foreign intrinsic Array exception precedes species Get in the specification.
**No Realm currently has an intrinsic Array constructor**, including after the
proposed C change. `arrayPrototype` is not that constructor. Therefore no actual
representable value satisfies the exception and this change adds no exception
branch, synthetic intrinsic slot, GetFunctionRealm API, or name/prototype test.
Foreign ordinary Script constructors and builtin Error constructors MUST still
undergo species Get. Even a constructor named `Array` with arrayPrototype as its
prototype property is not exempt. If a real intrinsic Array is added later,
review that task's exact identity/defining-Realm exception before installing it.
There is no executable positive foreign-intrinsic control to claim today.

An object constructor need not be constructible: `{}` with missing species
defaults. Conversely, if a species getter returns `{}`, it is invalid, and its
own species property must not be recursively read. An inherited Object
constructor defaults because its species is missing, not because of its identity.
A poisoned species on that same constructor must execute and propagate.

## Existing interfaces and ownership

| Future path | Exact change |
|---|---|
| `src/array-map.ts` | Import canonical species, add Script-only selection inside existing GuestArray branch; no signature/loop/allocation changes |
| `src/symbols.ts` | One canonical exported identity; no guest installation |
| `test/harness-errors-b.ts` | Only the rendered one-replacement proposal in MP evidence |
| new `test/harness-map-default.ts` | Full frozen MP controls; use existing guarded Realm builtins/Script sessions |
| new `test/fixtures/harness-map-default/input-a.js`, `input-b.js` | Exact `probe(7);\n`, `probe(11);\n`, runtime-read in both lanes |
| `tools/build-native.mjs` | One additive driver gate, preserve all 56 old gates and their commands |
| `docs/feature-inventory.md`, `TASKS.md`, new validation directory | Only this bounded capability and evidence/status |

These are proposed future implementation ownership, not permission to edit them
now. No Realm, runtime, outcome union, parser, evaluator, Script record/session,
construction dispatcher, observer, admission, public entry point or C file
changes are needed. No new helper API is warranted for one selection consumer.
`OperationContext` remains precisely realm/call/tick. Read `constructorSlot`
only as an internal constructibility tag; never invoke it or acquire a permit.

`internalGet` already traverses descriptors and invokes accessors through
`context.call`, preserving the receiver. The existing dispatch guards restore
Realm, call count and frame in finally. An accessor's defining Realm is active
during its body; on return, result/error allocation uses the restored map Realm,
not the array's, constructor's, getter's or callback's Realm. Do not cache a
foreign getter's active Realm or substitute a new evaluator/session.

All current map consumers are inventoried in `consumer-search.json`. Existing
array-map/length-coercion/structured-outcomes explicit rejection tests run in
legacy Realms and stay untouched. Bootstrap B17 also exercises legacy mapping
and cross-profile rejection. H6-B E24/E25 is the only current Script assertion
that changes: constructor=7 is now a genuine TypeError. Its complete proposed
file and exact one-replacement byte manifest strengthen branding/prototype,
origin/message and callback nonexecution while preserving every other assertion.
No old key/descriptor/global expectation changes: symbols are not installed.
CP's two formatting migrations remain separately unaccepted, unapplied history.

## Allocation, effects and failure rules

Selection runs even for empty arrays. No map result is allocated until both Gets
and validation finish. Error-object allocation on invalid selection is expected
and is distinct from result-array allocation. Default length0 still allocates a
fresh array. Results inherit the running Realm's array prototype; length is
Wtrue/Efalse/Cfalse and created elements Wtrue/Etrue/Ctrue. Holes remain holes.

Length conversion precedes callback validation; callback validation precedes
selection; selection precedes array length bound/allocation. A synthetic array
Get override may return length4294967296 for ordering tests (actual array length
cannot). Invalid selection wins over default RangeError; supported default then
RangeErrors; custom constructor stays unsupported before the default bound.
Ordinary length4294967296 skips poison constructor and RangeErrors.

No selection-specific tick is introduced. Accessor calls retain normal dispatcher
call limits; interpreted accessor bodies retain existing source ticks. Each
saved index still ticks before HasProperty, including holes. Do not preflight
billions of indices. Constructor/species hooks may mutate length, elements,
prototypes or descriptors, reenter mapping, or execute another Script session.
Saved length stays fixed; later presence/Get sees live mutations. A changed
constructor after its Get is not reread; a changed species before its Get is read.
Callbacks filling a future hole, deleting an element or growing length retain
the existing loop semantics. A nested call's result allocations are distinguishable
from the outer allocation, which must wait for selection completion.

Constructor/species/element/callback throws propagate exact Completion, Value,
diagnostic and origin references; host exceptions escape with exact host identity.
No catch/relabel/wrapper is added. Source provenance uses the original getter
record for guest-body abrupts, active map source for internal invalid selection,
and existing consumed-history rules on reuse. Preserve a hook's prior effects
when a later call/step budget fails. At every exit test idle state and the saved
context/active frame in an enclosing hook's finally, then guarded reuse of BOTH
original sessions; using fresh sessions is not a cleanup test. Retained raw
builtin callbacks must remain denied live, during finally and idle.

## Frozen controls and resource schedules

`matrix.json` is the normative row inventory, `frozen-traces.json` contains the
literal schedules, and `prefix-controls.json` expands them for both runtime
inputs and step seeds0/7. All future MP execution is **UNEXECUTED**. The audit
checks independent literal tables, byte preservation and negative mutations;
it does not establish native feasibility or run a shadow implementation.

Each selection row runs on empty and one-element arrays, same-Realm and crossed
input/constructor/getter/callback ownership, with payload7 and11. Crossed setup:
caller B borrows guarded probe A; input/constructor in B, accessor and callback
in C. Probe operates in A, getters/callbacks enter C and restore A, result/error
belongs to A, caller restores B. Repeat with inherited constructor/species.
Profile controls separately run Script operation + legacy object and vice versa
without cross-profile callable invocation (use data-only properties).

Resource fixtures use guarded builtin accessors/callbacks, not direct raw invoke.
L=length Get, K=constructor Get, G=constructor getter body, S=canonical species
Get, Q=species getter body, A=result createArray, H=HasProperty0, E=Get0,
C=callback body, D=result definition. All zero-tick effects follow the preceding
successful tick. `probe(7);` and `probe(11);` both tick statement col1, call col1,
literal col7; call callee lookup itself adds no tick. One iteration adds tick at
map location col1. For a limit below total, the first failed tick increments the
counter but none of that tick's subsequent effects run. Allocation can therefore
precede a failed iteration tick without publishing a result.

Two nested-map schedules run directly through the same context from Q, without
creating a new context, and retain the outer call depth. Separately test actual
`evaluateScript` reentry on another existing session from Q with input
`inner();` (two source ticks, separate counters); verify outer state in finally,
same-session reuse and raw-call denial. Do not combine its separate counter with
the outer budget. For a one-element default inner map, inner steps are3 (columns
1,1,1), while the suspended outer is3 until Q returns; its outer iteration makes4.
An inner limit0/1 fails before dispatch (no inner reads), limit2 allocates then
fails before HasProperty, limit3/4 succeeds. Inner limit0 calls fails after2
source ticks; limit1 calls allocates and reads element but fails its callback at3;
limit2 succeeds. Inner failure provenance belongs to the inner source/session;
when its exact completion is returned by Q, the independent outer session first
captures it at Q in C with the outer source. Do not import one session's private
abrupt history into the other. A same-engine parsed getter instead carries its
own function record through ordinary dispatch.

Parsed getter fixtures are prepared/materialized in a separate setup session,
then invoked from the measured outer session. For `function g(){return holder;}`
(constructor getter) and `function g(){return undefined;}` (species getter),
activation/return/expression tick columns are1,14,21 in source `getter`; no params,
locals, or nested declarations add FDI ticks. The outer columns are1,1,7 then
those three getter ticks, then map iteration col1: total7, effects LK before a
constructor getter or LKS before a species getter; default selection/allocation
occurs only after tick6; HECD follows tick7. For `function g(){throw marker;}`,
activation/throw/expression columns1,14,20 end at6 with exact marker and getter
source/Realm C, zero array allocations/callbacks. Repeat as each getter position,
both payload inputs, same/cross Realm, seeds0/7, every limit0..total+1. Failed
getter ticks carry source `getter`/C (activation phase instantiation, statement
and expression phase body); outer ticks carry input source/B for first3 and A
for iteration. Call limits0/1 reject probe/getter at3; limit2 suffices. These
literal schedules are additional to the counted builtin schedules, not executed
claims. Getter return-holder uses a noncallable ordinary holder with missing
species; no extra accessor is installed on that holder.

For each prefix assert exact effects, array allocation count, callbacks, source
id/location, active Realm at failure, origin/count/limit, and no returned array
unless normal. Call-limit controls: limit0 fails probe before L (3 source ticks);
limit1 fails G (trace LK) or Q (LKS), before hook body; limit2 permits nonnested
accessors/callbacks. Nested Q→inner map→callback needs3; limit2 reaches nested AHE
then rejects its callback before C. Failures restore counts, never reset steps.
Preseed7 by seven completed empty statements (`;;;;;;;`) in the same session;
do not add a mutable counter/test seam. Every step prefix also substitutes exact
guest, engine, resource, unsupported and host abrupts at each reachable hook,
asserting no later effects. New language TypeErrors must not be mistaken for
synthetic unsupported or resource strings.

## Sources and validation boundary

ECMA-262 edition16 (2025), [ArraySpeciesCreate and ArrayCreate](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-arrayspeciescreate)
govern selection/default Realm and length bounds; [map](https://tc39.es/ecma262/2025/multipage/indexed-collections.html#sec-array.prototype.map)
governs callback/selection/iteration ordering. The explicit unsupported custom
construction and legacy policy are Rift scope decisions, not specification rules.

Audited engine262 revision `d553e7b52501fbc47eae981c8d0fa7a5c26d0171`,
[ArraySpeciesCreate](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/array-objects.mts)
and [ArrayProto_map](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/ArrayPrototype.mts).
They corroborate the separate operation and early abrupt propagation. Adopt
straight-line selection with Rift's existing explicit completions; do not copy
generators, ambient agent state or the full constructor dispatcher. No upstream
code copied. Retrieval used the GitHub connector after a web raw URL cache miss.

After actual and independent second design review, a separately assigned writer
must freeze the new test source, implement only approved paths, run the affected
driver under Node/native with static-only AND separate zero-dynamic coverage,
then the full required 212 old records/56 old gates plus new gate and inherited
H1-H6/E4/replays/host checks. Preserve all60 blocked variants and historical
evidence. The proposed single old-test migration must match whole-file hashes;
additional migrations/API/compiler changes require evidence and review. C is
still separate and needs its own actual bootstrap regression replay after this
change is accepted. This design does not dispatch that work or publish anything.
