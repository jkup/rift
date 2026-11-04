# H6 error and formatting checkpoint

Design candidate, 2026-11-04; **not implementation or admission approval**.
Base `9918775d088ced0bbf82817635a0c5c94848355c`, branch
`codex/test262-classification`; accepted H5 is `25aa258`. Coordinator owns
actual/second review, assignments and publication. This checkpoint changes no
production source, old test, historical evidence, compiler contract, pin,
manifest or observation transport. All60 corpus variants remain blocked.

## Decision and review boundary

Allocate a genuine guest Error at the operation that creates a language error.
Use the running operation's Realm, not the Realm of the object being inspected,
the lexical environment being searched, or the eventual catch/observer. Preserve
the existing Diagnostic alongside the object. Neither catch nor the outer Script
return may convert strings, inspect constructor names or replace an abrupt value.

Use three implementation slices, assigned separately after this design review:

1. **H6-A: internal Error allocation kernel.** Three
   production files, below. Build ErrorData, five per-Realm prototype objects and the non-calling factory;
   test through a trusted host builtin. Constructors and toString wait for B.
   Do not install global Error names or convert existing failure sites yet. This is the first bounded
   implementable slice; no old source/output migrations are needed.
2. **H6-B: constructors, atomic semantic-site migration and Error globals.** Add
   guarded builtin construction and complete the intrinsic graph, then thread
   Realm through the complete producer/caller inventory, then switch all Script
   language errors together. Partial migration would make catch depend on which
   helper happens to produce the same TypeError, so this boundary is atomic.
   Preserve legacy errors and all synthetic old completion sentinels.
3. **H6-C: String/Object formatting globals.** Install these two constructors,
   with the call/construct distinctions below and exact bootstrap test migration.
   No Symbol factory, JSON, map registration/algorithm, Number constructor or
   other builtin expansion. H7 remains a separate unchanged-bundle assignment.

Every slice adds exactly one native gate, so cumulative gates are55,56,57;
the original54 entries and212 legacy records per lane remain. No old compiler
build is repeated for this design task. Existing H5 root acceptance is inherited,
not remeasured. Implementation acceptance requires fresh builds, both runtime
inputs, its matrix and inherited affected matrices; agreement alone is not proof.

## Evidence and complete inventory

[Evidence index](validation/ts-034h6-p/README.md),
[actual producer lines](validation/ts-034h6-p/producer-index.md), and
[machine-readable source/caller/override inventory](validation/ts-034h6-p/inventory.json)
are part of this contract. Paths/lines refer to the base above. The line inventory
includes full matching lines and file hashes, not a guessed five-file ownership
list. Its owner hints are lexical aids, not an AST/call-graph claim. The tables
below supply the semantic classification. `failure` has54 production callsites:
two are resource/unsupported wrappers; one is bootstrap Array validation; one is
legacy-only duplicate binding; the other50 need Script-aware allocation.

### Producer and context closure

| Actual file / operations | Realm and disposition in B |
|---|---|
| `src/runtime.ts`: `failure`; `resourceFailure`, `unsupportedFailure` | Keep three existing APIs and byte-for-byte value/diagnostic behavior. Add `languageFailure(realm: Realm \| null, name: ErrorName, message: string, loc: Location): ThrowCompletion`. `ErrorName` is exactly Error/TypeError/ReferenceError/RangeError/SyntaxError. Null is an explicit trusted legacy/bootstrap compatibility input, never the Script execution default. Legacy Realm also returns existing diagnostic-string completion. Script Realm returns a newly allocated object; no guest call, Get or tick. |
| `runtime.ts`: `GuestObject.set`, `getValue`, `putValue` | All seven failure sites receive `context.realm`. Null/undefined property access goes through toObject; primitive key conversion goes through toPropertyKey; accessor abrupts propagate unchanged. Mutability/writability rejection becomes an object only at the outer throwing operation. `internalSet`, ordinary definition, deletion and prototype mutation still return normal false when specified. |
| `global-environment.ts`: `createMutableBinding`, `getBindingValue`, `setMutableBinding`, `setObjectBinding`, `setObjectProperty`, `defineObjectProperty`, `getStrictGlobalBinding`, `putStrictGlobalBinding` | Nine sites. Existing contextual methods use running `context.realm`, including a foreign environment inspected from another Realm. Append mandatory `realm: Realm \| null` to `createMutableBinding(name,loc,realm)`; its sole production caller is instantiateDeclarations. Do not save allocation Realm on the environment. Duplicate host setup remains a completion when called through this API; invariant-only local binding duplication stays a host exception. |
| `script-environment.ts`: ScriptLocalBindings `getBindingValue`, `setMutableBinding`; `getScriptBinding`, `putScriptBinding` | Four sites; activate currently ignored `_context`. Unresolved and TDZ are ReferenceError; sloppy unresolved writes keep existing normal behavior. `createMutableBinding` here has no language failure and **does not change signature**. |
| `script-global-declarations.ts`: `instantiateDeclarations` | Five declaration-conflict/restriction failures, from current instantiation context. `validatePlan` only validates trusted metadata and throws host invariants. Producer-index lexical hints must not confuse these two. Pass `context.realm` at global createMutableBinding. Phase remains instantiation, body never runs. |
| `script-execution-internal.ts`: `call`, `binary` (`in`), `#construct` | Caller Realm for non-callable/nonconstructor/in target rejection before entering any callee. Existing legacy `block` duplicate failure stays unchanged. `#callScript` switches activeContext and frame Realm before builtin execution; ordinary Script calls also switch source record at function entry. Save/restore all fields in finally. No catch conversion. |
| `conversion.ts`: toNumber, toString | Symbol branches are genuine TypeError. Append mandatory `realm: Realm \| null` to toNumber/toString/toUint32/toIntegerOrInfinity/toLength; forward unchanged through numeric wrappers. These remain primitive-only helpers; object input stays unsupported-operation. The caller first runs toPrimitive where required. toPropertyKey passes context.realm after successful toPrimitive; symbols remain keys. |
| `primitive-conversion.ts`: ordinaryToPrimitive, toPrimitive | Three failures use context.realm after the attempted hook call has restored its caller context. A hook that throws supplies the exact abrupt object from the hook's Realm; a hook that **returns** an object causes a fresh TypeError in the coercing operation's Realm. Preserve tick/Get/Call order. |
| `object-conversion.ts`: toObject | Nullish TypeError uses context.realm. Other boxes already use context.realm; no receiver-Realm shortcut. |
| `delete-reference.ts`: deleteReference | Strict false-delete TypeError uses context.realm; sloppy false stays false. |
| `array-object.ts`: setLength | RangeError after two independent coercions uses context.realm; pass Realm to toUint32 and toNumber. A foreign array does not determine error Realm. Keep descriptor copying, two conversions and rollback unchanged. |
| `array-object.ts`: bootstrapDefineOwnProperty → definePrimitiveLength | No running guest context. Pass explicit null to primitive converters; keep the existing diagnostic RangeError then bootstrapDefine's host fault. No guest hook, ticking or Realm guessing. Invalid trusted descriptors remain host faults. |
| `builtins/boolean.ts`, `number.ts`, `string.ts`, `symbol.ts`: thisBooleanValue/thisNumberValue/thisStringValue/thisSymbolValue | Append mandatory `realm: Realm \| null`; registration callbacks pass their active context.realm (rename ignored context parameters). Number toString radix validation and conversion also use context.realm. Symbol receiver error migration does not add a Symbol factory. |
| `builtins/function.ts`: ordinaryHasInstance, instanceofOperator, registerFunction call/toString callbacks | Six sites; context.realm. The builtin @@hasInstance path runs in that method's defining Realm; the fallback runs in the operator Realm. Do not approximate this with target.prototype's Realm. |
| `builtins/restricted-function.ts`: thrower callback | Use active context.realm; this is a genuine TypeError from the defining Realm's intrinsic. Guarded direct invocation remains a host failure before callback. |
| `array-map.ts`: mapObjectDefaultArray | Only its two **existing** error calls migrate to context.realm (bad callback/oversized length). No algorithm, species capability, registration or public map surface change. Excluding new map functionality cannot leave a reachable helper's TypeError as a string. |

Mandatory conversion callsites in production: `conversion.ts` internal wrappers
and toPropertyKey; `array-like.ts` lengthOfArrayLike; `array-object.ts` setLength
and bootstrap definePrimitiveLength; `builtins/array.ts` toElementString;
`builtins/number.ts` radix conversion; `script-execution-internal.ts` postfix
update, numeric unary evaluation and all addition/arithmetic/relational binary
branches. Every site is enumerated with base line in inventory.json. No change
to stringToNumber, numberToString or number-radix backends. `abstract-equality.ts`
uses stringToNumber and propagates toPrimitive; it needs no signature change.

### Overrides, propagation and non-language producers

`GuestObject.defineOwnProperty` and `internalHasProperty/internalGet/internalSet/
internalDelete` retain their signatures. `GuestArray.defineOwnProperty` and its
bootstrap override, plus `GuestStringObject.defineOwnProperty` and bootstrap
override, are the actual production exotic overrides. Only GuestArray's semantic
length producer changes. String virtual-index rejection is normal false.
`GuestObject.get` is trusted host inspection and still throws a host Error when
a semantic Get is abrupt; it must not be used for observer constructor matching.
`bootstrapDefine`, validatePropertyDescriptorUpdate, storage invariants, missing
bindings, invalid frames/records/permits/profile and unreachable AST errors remain
host faults. They are not guest Error producers despite using host `new Error`.

The test inventory includes all overrides and synthetic failures in host drivers.
Do not rewrite injected `failure("Sentinel",...)`, spread-completion objects or
deliberately overridden internal methods. They are exact completion identity
controls, not genuine engine producers. The only changed override signature is
TracedEnvironment.createMutableBinding in `test/script-global-declarations.ts`;
forward the new Realm argument to super without adding effects/ticks.

Lexer `lex.fail` (source cap and lexical capabilities), Parser.fail (depth and
syntax capabilities), parse/parseScriptUnit/return coverage, script-metadata,
script-prologue and DeclarationPlanner.plan return parse/planning diagnostics or
rejections before executable code exists. They have no running Realm and allocate
no Error. A certified parse SyntaxError is not an executable runtime throw.
`ExecutableScript.prepare` and its validation/copy machinery propagate these
results; invalid trusted objects throw host errors. No parser, syntax rule,
scope association or Script certification change is necessary for H6.

The two explicit guest throw producers in ExecutionEngine.statementInner and
#statement preserve the exact Value, with origin guest and existing Uncaught
diagnostic. A caught engine Error rethrown by guest code is the same object and
gets guest throw provenance at the rethrow source. It does not acquire a second
Error object. All pass-through completions in script-completion, references,
coercion, accessor calls, array helpers and call/construct dispatch preserve identity.

Observers: `interpreter.ts` RunResult, `cli.ts` report/exit paths,
`observation.ts` projectThrow/observe, `observation-json.ts` encode and
`observation-driver.ts` process boundary remain unchanged. `display` remains
nonsemantic rendering; it does not invoke Error.toString or guest getters.
projectThrow already reports object as constructor unsupported with null name,
Realm and secondary; that is still the correct limited observer answer.
No runtime-negative pass may be inferred from Diagnostic.name. Legacy observer
outputs remain exact. H6 does not extend either transport decoder or P6 ledger.

Host transport consumers were also audited: tools/test262/driver-result.mjs
validObservation (lines16–27) accepts only absent/unsupported runtime constructor
projections; result.mjs constructor/observation validation (60–85) and runtime
negative classification (147–166) distinguish available/absent/abrupt/unsupported
and resource statuses. observe.mjs orchestrates the existing driver; input.mjs,
plan.mjs and ledger.mjs retain the capability/admission boundaries. These paths
are **read-only** for every H6 slice. New object allocation does not authorize
loosening the narrow driver decoder to the broader ledger schema. H7/P6 own any
later end-to-end constructor observation proposal.

## Error object graph and algorithms

Normative baseline: [ECMA-262 edition16](https://262.ecma-international.org/16.0/),
§20.5, §20.5.8.1 InstallErrorCause, §10.3 builtin construction, §7.3.25
GetPrototypeFromConstructor, §20.1.3.6 Object.prototype.toString. Retained research
has full clause IDs and SHA256, matching the earlier edition16 snapshot.
Reference: [engine262 d553e7b](https://github.com/engine262/engine262/tree/d553e7b52501fbc47eae981c8d0fa7a5c26d0171),
Error.mts57–90, String.mts41–54, Object.mts48–60 and function-operations.mts.
Adopt explicit allocation before message conversion, exact abrupt propagation and
defining-Realm builtin execution. Do not copy engine262 stack capture, newer
Error.isError, generators or its generic intrinsic registry. Edition16 governs.

`GuestError extends GuestObject` carries a private/readonly ErrorData brand;
the brand is not a guest property, diagnostic, stored constructor name or stack.
It survives prototype relinking. An ordinary object borrowing Error.prototype
does not acquire it. Error.prototype and the four NativeError prototypes are
ordinary objects **without** ErrorData. A builds only this unexposed prototype
chain with name/message metadata and the allocation kernel; constructor links
and toString are completed atomically in B before any production site exposes
an Error. A is not a claim of guest-visible Error constructor support. NativeError constructors inherit from
Error constructor; Error constructor inherits Function.prototype. NativeError
prototypes inherit Error.prototype; Error.prototype inherits Object.prototype.

Each Script Realm has distinct constructors and prototypes for Error, TypeError,
ReferenceError, RangeError, SyntaxError. Intrinsic references must not be recovered
from mutable globals or prototype.constructor. No shared guest object between
Realms. `Realm.createError(name,message)` is a trusted non-calling factory using
the intrinsic prototype directly, creates own message Wtrue/Efalse/Ctrue and
returns a fresh GuestError. It never calls the public constructor. Allocation is
zero guest ticks so a language failure cannot turn into resource exhaustion while
trying to construct its error. Native memory exhaustion stays a host/process fault.

Exact A interfaces: `GuestError(proto: GuestObject)`; exported ErrorName union;
private Realm `errorPrototypes: Map<ErrorName,GuestObject>` (empty in legacy);
trusted `getErrorPrototype(name: ErrorName): GuestObject` and
`createError(name: ErrorName, message: string): GuestError`. Both Realm methods
reject legacy/missing entries as host misuse. Initialize Script prototypes after
Object.prototype exists using bootstrapDefine; no callbacks or source ticks.
The new test make builtin wraps the returned GuestError in
`normal({kind:"object",object:...})`. No prototype field named `prototype`.
B adds private `errorConstructors: Map<ErrorName,GuestObject>` and trusted
`getErrorConstructor(name: ErrorName): GuestObject`, plus
`registerErrors(realm: Realm): void` in builtins/error.ts. Registration completes
the existing A prototypes rather than replacing them. Bootstrap runs after
Function.prototype and ordinary metadata support exist, before Error global
installation. `languageFailure` calls createError directly and preserves
the old diagnostic/origin fields; it does not require a live guest permit.

For each public constructor, name and length=1 are Wfalse/Efalse/Ctrue; own
prototype is Wfalse/Efalse/Cfalse. Each prototype owns constructor Wtrue/Efalse/
Ctrue, name (family name) Wtrue/Efalse/Ctrue and message="" Wtrue/Efalse/Ctrue.
Only Error.prototype owns toString (builtin name "toString", length0, callable,
nonconstructible; property Wtrue/Efalse/Ctrue). No own name/constructor/toString
on instances; message absent for missing or undefined argument. ErrorData adds
no own key. Global properties are Wtrue/Efalse/Ctrue, installed only in Script B.
Error constructors have no own caller/arguments; inherited restrictions remain.
Constructor native-source rendering uses its initial name, independently of
later `name` mutation. Error subclasses outside these four remain unsupported.

Call and new both allocate a fresh instance. Call ignores receiver and uses its
active constructor as newTarget; private new subset requires newTarget=callee.
Get constructor.prototype, use an object result or that constructor Realm's
intrinsic family prototype; allocate ErrorData, then convert message if not
undefined, then InstallErrorCause. Ordinary public prototypes are immutable
constructor properties. Native descriptor controls prove that invariant;
copied-slot/getter shells must fail authenticity checks before reading them.

Message conversion uses toPrimitive(message,"string",context,loc), then primitive
toString with context.realm. A primitive Symbol throws TypeError; do not use the
special String(symbol) behavior here. Conversion occurs once, callbacks may
reenter or throw, and exact abrupt values survive. For options: only object input
is inspected. HasProperty("cause") before Get("cause"); if present, create own
cause Wtrue/Efalse/Ctrue with the exact value, including explicit undefined.
Inherited cause is included, primitive options are ignored, unrelated properties
are never read, and a throwing cause getter preserves identity. This small
ordinary-object InstallErrorCause algorithm is included, not silently ignored.

Error.prototype.toString is generic only over objects. Nonobject receiver throws
TypeError in the method's Realm. Get name; undefined means "Error", otherwise
ToString. Only after name conversion succeeds, Get message; undefined means "",
otherwise ToString. Empty name returns message; empty message returns name;
otherwise `name + ": " + message`. Do not cache/read both properties first.
Getters and conversions run exactly once and can throw/alter the next property.
Object.prototype.toString classifies ErrorData as Error before existing
@@toStringTag Get, whose string result can override the tag. An Error prototype
itself has ordinary Object tag. No stack, filename or location guest properties.

## Guarded builtin constructor extension (B)

Keep OperationContext exactly `{realm,call,tick}`. No construct callback,
newTarget field, mode bit, global current Realm or authority in guest-visible data.
Keep ordinary createBuiltin nonconstructible. Add `ConstructBuiltin =
(callee: GuestObject, args: Value[], context: OperationContext, loc: Location)
=> ValueCompletion` and `BuiltinConstructor` record with kind builtin-constructor,
realm, matching builtin Callable reference and guarded invoke. Extend only
GuestObject.constructorSlot from ScriptGuestCallable|null to the union including
BuiltinConstructor. Callable's existing builtin branch remains builtin; call
never forwards to construct. Full callback arity is mandatory for scriptc.

`Realm.createBuiltinConstructor(name,length,call,construct)` creates matching
callable/constructor records with separate guarded callbacks, metadata and
captured original object identity. It is Script-profile-only. The construct guard
checks callee is the captured object, context/profile matches and consumes an
exact one-use constructor permit. Copying its slot onto a shell must fail before
prototype lookup or callbacks; H5 ordinary Script-function shells remain valid.
No host reflective access can mint a permit. The factory itself is trusted setup,
like createBuiltin, not public Construct execution.

Private #construct first retains H5 active-session/nonconstructor/profile checks.
For ScriptGuestCallable, keep existing record/authenticity/metadata check and
ordinary allocation path unchanged. For builtin constructor require matching
callable record, builtin kind and Realm; reject inconsistent metadata before
effects. Check/reserve call depth once. Switch active context/frame Realm to the
builtin's Realm while retaining caller source record/loc (builtins have no Script
body). Issue a separate tagged constructor permit binding context, Realm, invoke,
callee, args-array and loc identity. Dispatch construct; require normal object
or throw, otherwise host invariant. No ordinary receiver allocation before this
dispatch: String/Object/Error define their own allocation/order.

Finally restores prior permit, frame, Realm, calls and depth on success, language
throw, resource, unsupported, nested sessions and host sentinel. Constructor
permit cannot authorize call, call permit cannot authorize construct, each is
consume-once. Retained callbacks obey their captured owner session even when a
different session is active. Wrong profiles, inactive owner, copied slot, reused
permit and mismatched args/loc fail before guest effects. The two permit classes
can share a discriminated private union; do not weaken consumeScriptBuiltinPermit.

## Formatting globals (C)

The unchanged harness needs String call and Object.prototype.toString fallback;
these are absent globals today, although primitive prototypes exist. Install
genuine callable/constructible globals rather than namespace shims. String/Object
name and length=1 metadata, prototype property flags and prototype.constructor
flags are as above. Both inherit Function.prototype. Append constructor to each
existing prototype's key list without reordering its current keys. Only these
two globals and existing methods are claimed; no static Object/String methods.

String(): ""; String(undefined): "undefined"; String(null): "null".
String(Symbol seed) uses symbolDescriptiveString **only when the argument itself
is a Symbol and call mode**, not for a Symbol wrapper or object returning Symbol.
Other values use one string-hint primitive conversion then primitive ToString.
new String() produces a genuine empty GuestStringObject. new String(value) does
conversion before GetPrototypeFromConstructor and returns a box with its indexed
UTF-16 own descriptors/length unchanged. new String(Symbol) throws TypeError.
Returned wrapper prototype is the constructor's Realm's String.prototype in the
supported equal-newTarget case. No newTarget syntax or subclass construction.

Object()/Object(null)/Object(undefined), with or without new, create a fresh
ordinary object with the active builtin Realm's Object.prototype. Object(o) and
new Object(o) return exact o. Other primitives use existing toObject in the
builtin Realm (including Symbol boxes without a Symbol factory). With
newTarget=active Object, do **not** preallocate a receiver or read .prototype:
the spec's different-newTarget branch is outside our private subset.

## Exact ownership proposals

These are proposed successor assignments, not authority conferred by this document.
No implicit ownership of every inventory match. A discovered additional consumer
requires a concrete amendment reviewed before editing it.

| Slice | Exact production paths and API scope |
|---|---|
| A | `src/runtime.ts` (GuestError/ErrorName only), `src/realm.ts` (five internal prototypes and createError; no constructors/globals), `src/builtins/object.ts` (ErrorData classification only). Existing failure producers and dispatch unchanged. |
| B | New `src/builtins/error.ts`; `src/builtins/object.ts` (complete error metadata registration if needed); `src/runtime.ts` (constructor-slot types and languageFailure), `src/realm.ts` (complete graph/factory/guards), `src/conversion.ts`, `src/primitive-conversion.ts`, `src/object-conversion.ts`, `src/delete-reference.ts`, `src/global-environment.ts`, `src/script-environment.ts`, `src/script-global-declarations.ts`, `src/script-execution-internal.ts`, `src/array-object.ts`, `src/array-like.ts`, `src/array-map.ts`, `src/builtins/array.ts`, `src/builtins/boolean.ts`, `src/builtins/number.ts`, `src/builtins/string.ts`, `src/builtins/symbol.ts`, `src/builtins/function.ts`, `src/builtins/restricted-function.ts`; only identified error sites, Realm forwarding, guarded constructor dispatch, full Error algorithms and five global names. |
| C | `src/realm.ts`, `src/builtins/string.ts`, `src/builtins/object.ts`; add String/Object graph/global registration/call/construct algorithms using B interfaces. No further runtime/dispatcher change expected. |

Each owns a new `test/harness-errors-{a,b,c}.ts`, corresponding new fixture
directory, evidence directory, one additive tools/build-native.mjs entry, its
task status and scoped feature-inventory update. B additionally needs the exact
old-test migration file set in migration-inventory.md; C only the specified
bootstrap inventory change. No historical evidence file may be rewritten: new
replay outputs and their expected semantic deltas belong to the new task.

## Literal acceptance and budgets

[Matrix](validation/ts-034h6-p/matrix.md) freezes required objects, descriptors,
effects, Realm/source and negative neighbors. [Migration inventory](validation/ts-034h6-p/migration-inventory.md)
freezes which old expectations may change. The simple-source full
budget prefixes are literal below; more complex constructor/coercion schedules
must be frozen from specified algorithm events before either implementation lane
is run, not fitted to observed native output.

No extra tick for internal Error allocation, message/cause data writes, primitive
conversion, Realm switch or dispatch. Reuse existing expression, coercion and
call-depth charges. Error public allocation uses one tick **after prototype Get
and before allocation**; String construct uses one after conversion/prototype
selection before box allocation; Object nullish call/new uses one before fresh
object allocation, boxing uses one before fresh box allocation, exact-object
return no allocation tick. Error.toString adds one tick before each Get(name)
and Get(message); cause adds one before HasProperty and (if present) one before
Get. Ordinary property reads themselves add no hidden tick. All callbacks still
obey existing call guard. Resource failure bypasses catch with original origin.

For A, a trusted builtin `make` checks its string argument and returns
`context.realm.createError("TypeError", args[0].value)` without ticks or guest
conversion. Runtime files contain `make("seven");` and `make("eleven");`.
Each has exactly3 ticks at line1 columns1,1,6. Fresh limits0,1,2 fail with
step counts1,2,3 at those columns; limits3,4 return a fresh branded TypeError
with own message seven/eleven. Seven-seeded limits7,8,9 fail at counts8,9,10;
limits10,11 succeed. Call limit0 fails after the three source ticks, count0/
limit0; limit1 succeeds. No catch/constructor claims in A. The helper has the
existing one-use call permit and allocates in its defining Realm.

For B host aliases E=intrinsic Error, message primitive7/11, source
`E(7);`/`E(11);`: statement tick col1, call-expression tick col1, argument literal
tick col3, allocation tick col1: total4 (callee reference is resolved without an
identifier evaluation tick). `new E(7);`/`new E(11);`: statement col1, new-expression
col1, identifier E col5, literal col7, allocation col1: total5. Line is1 throughout.
No declarations or directive. Source record ID input-a/input-b. Check parser's
actual CallExpression loc against these frozen columns in B; discrepancy is a
design correction, never silently change the expectation after execution.

For each of these four sources, budget0..N-1 fails on tick budget+1, count exactly
budget+1, limit budget, resource steps; no normal object is returned. At N and
N+1 return genuine Error with own message "7" or "11" and no own cause. For
seven-seeded sessions evaluate `0;0;0;` (6ticks) then `;` (1tick), before the target;
limits7..7+N-1 have the identical target failure prefixes, count8..7+N; success
at7+N and7+N+1. Record exact loc, phase body, source and Realm per prefix; idle
afterward with calls/depth0 and active null. Allocation is not published before
its tick succeeds. Calls0 fails after argument evaluation, before allocation,
with calls origin count0/limit0; calls1 succeeds unless a guest callback nests.

B plain `missing;` is two ticks (statement and identifier, col1), missing
ReferenceError at2, no allocation tick. Seeded case succeeds as a language throw
at9; budgets0/1 and7/8 instead are resource failures. Array two-coercion,
restricted accessor, toPrimitive hook and H1 catch-prefix schedules stay exactly
the accepted schedules; object value replaces engine string without extra tick.
Keep source cap100000, parse depth128, call default64, eval depth256,
step default100000. Exhaustion at an allocation/coercion/property event must
precede subsequent Get/callback/publication, retain earlier effects, and clean up.

For C String(7) requires three source ticks, new String(7) five including
allocation; Object(o) three ticks, new Object(o) four, no allocation for exact
object return. Object() three ticks including allocation; new Object() four.
Use the same fresh/seven-seeded prefix rule. The additional literal event traces
in matrix.md cover object-message/cause/name coercion and failure cut points.
Retain separate host sentinel injection at reachable callbacks. No claim that a
host-only direct helper proves dispatch.

Required fresh implementation acceptance: original212 records each lane,
original54 gates plus cumulative additions, H1–H5 literal matrices including
172 H5 prefixes, E4 provenance/authority matrices, all17 inherited replay groups,
both Node boundary checks and slot checks; typecheck, runner20, probes10,
test262 host73 and observations22. Existing suites may have explicitly reviewed
semantic migrations, but never fewer rows, skipped controls, altered statuses or
weaker assertions. First actual and independent second review precede next slice.
