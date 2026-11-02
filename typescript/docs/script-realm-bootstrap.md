# TS-033C-P: Script Realm bootstrap and closed execution boundary

Design for review, 2026-11-02. Assignment base `a4680f3`; inspected base
`c15f27b2e5d6d30efd303235e64553a56bdd4d70` adds coordinator tracking only.
TS-033B `7183015` is accepted. This freezes the remaining P2 assignment;
it does not implement or admit Script execution. All matrix rows below are
future requirements. [Source audit](validation/ts-033c-p/README.md).

## Construction and ownership

Freeze `RealmProfile = "legacy" | "script"` and
`new Realm(output: Output, profile: RealmProfile = "legacy")`.
Expose `readonly profile`; reject invalid host profile values with host Error
`invalid Realm profile` before allocating
intrinsics or installing anything. No profile setter or later conversion.

Use private nullable storage for the legacy Environment and Script
GlobalEnvironment. Allocate exactly one branch. Retain the public
`global: Environment` getter and setter for legacy hosts (including replacement
with an Environment); both throw host Error `legacy Realm required` for Script.
This preserves existing `.global.bindings` code without a second, unused Map in
Script Realms. No union-typed `.global`, dummy Environment or mirrored bindings.

Script-only getters `globalEnvironment: GlobalEnvironment`,
`globalObject: GuestObject`, and `globalThisValue: Value` throw host Error
`Script Realm required` on legacy Realms. Each Script Realm constructs one plain
`new GuestObject(this.objectPrototype)` with no callable, initially extensible,
and `new GlobalEnvironment(object, object)`. The globalThisValue is an object
Value wrapping that same object; compare guest object identity, not Value wrapper
identity. No injected object, exotic subclass, distinct this object, or global
proxy option. Lexical storage belongs only to the composite record.

Construct intrinsic prototypes in the existing dependency order, then select
global storage and install globals. Every mutable guest prototype, namespace,
method function, console object and global object is freshly allocated per
Realm. Keep the canonical well-known GuestSymbol identities shared as today;
sharing symbol keys is not sharing guest objects. Builtin callables retain their
defining Realm. All prototype factories retain current behavior in both profiles.
Do not invent String/Object/Function/Array/Symbol/Boolean constructor globals.

## Exact installation and host access

Freeze `installGlobal(name: string, value: Value, mutable: boolean): void` as
the narrowly documented trusted bootstrap method. It installs an initialized
legacy Map binding exactly as today. In Script it uses ordinary data properties:
W=mutable, E=false, C=mutable. Only the existing five installation sites may use
it; reject other names with host Error `invalid bootstrap global` before writing.
It is not declaration instantiation or a public arbitrary-name seeding API.
Change the Number installer to call this method; never alias the namespace to
numberPrototype. Installation order and initial state are literal:

| Own name / legacy Map order | Value | Legacy mutable | Script W/E/C |
|---|---|---|---|
| undefined | guest undefined | false | false/false/false |
| NaN | numeric NaN | false | false/false/false |
| Infinity | numeric positive infinity | false | false/false/false |
| console | fresh ordinary object with this Realm's objectPrototype | true | true/false/true |
| Number | fresh noncallable partial namespace with this Realm's objectPrototype | true | true/false/true |

Console is a host extension; its global descriptor is a deliberate host choice.
Number's global descriptor follows the standard global default, but its value
remains Rift's partial namespace, not the standard Number constructor.
Console's sole own key is `log` (W/E/C=true/false/true, name="log", length=0).
Number's own order remains `NaN`, `POSITIVE_INFINITY`, `NEGATIVE_INFINITY`,
`MAX_VALUE`, `MIN_VALUE`, `EPSILON`, `MAX_SAFE_INTEGER`, `MIN_SAFE_INTEGER`,
`isNaN`, `isFinite`. The first eight are nonwritable/nonenumerable/nonconfigurable
with current numeric values; the two predicates are W/E/C=true/false/true,
name matching key and length=1. Builtin name/length descriptors stay
false/false/true; builtin proto is this Realm's functionPrototype. Preserve all
existing intrinsic method descriptors and order, including callable
functionPrototype with name="", length=0 and no new constructor property.

Literal prototype inventory for B03 (all string-keyed methods use W/E/C
true/false/true, builtin name=key, and length0 unless shown):

| Prototype | Ordered own keys |
|---|---|
| objectPrototype | valueOf, toString |
| functionPrototype | name, length, call(length1), toString |
| arrayPrototype | length(value0, W/E/C=true/false/false), join(length1), toString |
| booleanPrototype | toString, valueOf |
| numberPrototype | toString(length1), valueOf |
| stringPrototype | length(value0, W/E/C=false/false/false), toString, valueOf |
| symbolPrototype | toString, valueOf, @@toPrimitive, @@toStringTag |

Symbol @@toPrimitive is a builtin named `[Symbol.toPrimitive]`, length1,
W/E/C=false/false/true; @@toStringTag is string `Symbol`, false/false/true.
ObjectPrototype has null proto and the existing immutable-prototype slot;
the other six prototypes point to objectPrototype. Boolean/Number/String
prototype internal primitive values remain false/0/empty string respectively.

`globalThisValue` and `getThisBinding()` denote the same global object. There is
**no guest property named globalThis in this bounded slice**: the task freezes
exactly the existing globals. The standard globalThis property is a separately
required addition before claiming complete standard global installation; this
host API name must not be mistaken for that property. No Script source executes
here, including `this` expressions.

Freeze Script host helpers:

* `defineScriptGlobal(name: string, descriptor: DataDescriptor): void`: assert
  Script profile and reject a directly supplied callable from another profile
  before mutation with host Error `cross-profile callable transfer`; use ordinary
  `bootstrapDefine` with all descriptor fields.
  Preserve its host failure on invalid/rejected definition. This seeds a data
  property only, never a lexical/var declaration; it neither overwrites nor
  initializes a same-name lexical. Same-profile callable storage is allowed.
* `readScriptGlobal(name: string, loc: Location): ValueCompletion`: assert Script
  profile and delegate to `globalEnvironment.getBindingValue`; lexical precedence,
  TDZ and missing-name errors are the accepted TS-033B completions. For property
  inspection use `globalObject.getOwnProperty`/`internalGet` explicitly.

Host-only composite mutations continue to take their existing OperationContext;
tests may supply a Script-context stub whose call/tick throw host errors. Ordinary
data operations must never call it. No evaluator is needed to seed or inspect.
Captured strict references use the accepted TS-033B functions unchanged: an
unresolved base stays unresolved after seeding, whereas a resolved composite
base observes later lexical shadowing. No recursive object-graph transfer scan,
membrane or ownership tag on every ordinary object is introduced. Low-level
GuestObject/GlobalEnvironment operations remain trusted host primitives, not
transfer validators; storing a nested foreign callable cannot enable invocation.

## Closed entry and callable boundary

P2 deliberately has **no Script evaluator or callable execution session**.
Script builtins can be constructed and inspected, but not invoked yet. This
keeps P2 independent of P3 instantiation and P4 context/strictness work.
Use host `Error` with the literal messages below, never guest completions,
unsupported-syntax observations, certified SyntaxErrors or resource origins.

| Actual path at inspected base | Frozen guard/order and result |
|---|---|
| interpreter.ts run, before parse | Require legacy; Script throws `legacy Realm required` even for malformed or empty source, before parser work. |
| observation.ts observe | Keep current limit validation first. For body-observation require legacy before parse. For parser-observation accept either Realm: use existing parse/projectRejection only, no Realm access, no Evaluator, no Script strictness/admission implication. No observation schema or driver change. |
| Evaluator constructor | Require legacy before creating activeContext. No `allowScript` escape hatch or constructor mode flag. |
| Evaluator.block and closure | Require active legacy Realm before duplicate checks, bindings or function construction. This is a local invariant check, also guarding direct host block/closure calls. |
| Realm.createGuestFunction | Require legacy before source validation/allocation; no guest callable can be created through this factory in Script Realms. P4 must explicitly replace this guard with reviewed metadata/context support. |
| Evaluator.call | After existing noncallable TypeError check, compare callable defining profile with active context profile; mismatch throws `cross-profile callable invocation` before budget check, calls increment, Realm switch, allocation or invoke. Then require legacy (`Script execution unavailable` otherwise). Keep existing same-profile legacy call path and try/finally. |
| Realm.createBuiltin and direct functionPrototype builtin | Construction allowed for either profile. Wrap invoke with a shared Realm-local guard: context.realm.profile must equal defining profile, then defining profile must be legacy; mismatch throws `cross-profile callable invocation`, Script/Script throws `Script execution unavailable`, before callback effects, tick or forwarding. Apply to the inline functionPrototype callback too. |
| Function.prototype.call | Existing forwarding through context.call remains; both the saved call builtin's defining profile and the forwarded target's defining profile are checked. No alternate invocation route. |

`statement`, `statementInner`, `reference`, `evaluate`, `expression`, `binary`
remain legacy evaluator machinery: a Script Evaluator cannot be constructed,
active Realm changes only inside checked call, and context is a readonly public
view. Do not add repeated guards to every expression or change budget counts.
Host casts mutating private state or forging raw Callable records are outside
the supported API; check block/closure anyway at their mutation boundaries.
All production builtin invocation currently goes through evaluator.ts:291;
tests also call `.callable.invoke` directly, hence the wrapper is necessary.
The wrapper must retain the full four-parameter Builtin signature for scriptc.

Profile mismatch checks compare profiles, **not Realm identities**. Legacy A
calling a guest or builtin from legacy B still switches to B and restores A on
normal return, original guest throw, host sentinel exception and resource exit.
No reset of steps/calls/depth. Direct builtin invokes continue to accept valid
same-profile custom OperationContexts used by existing tests; the wrapper does
not silently switch their context Realm or consume budget.

A transferred callable is checked at invocation even when inserted through a
legacy Map, saved before property deletion, nested in an object, used as a
coercion hook, array callback, receiver of Function.call, or returned by another
builtin. The host seeding helper rejects direct foreign callables earlier.
Argument evaluation/outer builtin work may already have happened before a
nested mismatch is discovered; no transactional rollback is promised. The
rejected dispatch itself has zero effects. On unwinding, existing finally blocks
restore caller state. Same-profile Script-to-Script calls remain blocked in P2;
P4 will enable them with defining-Realm allocation and context restoration, as
accepted design R01/R03 requires. Cross-profile calls remain forbidden then.

## Literal host acceptance matrix for the implementation assignment

Runtime fixture chooses row, identifier (`seed` or `other`) and value (7 or 11).
Expected descriptors, counters and errors are fixed, not derived from engine
output. L/A/B mean fresh default legacy / fresh Script A / fresh Script B;
X/Y mean separate legacy Realms. Use the exact Location shape
`{line:1,column:1}`, with no offset field.
All rows are **unexecuted** in this design task.

| ID | Literal setup/action | Required result |
|---|---|---|
| B01 | `new Realm(output)` and explicit `legacy`; snapshot bindings | Exact five ordered names/table values, initialized=true, mutability as above. `.global` replacement/get and existing run behavior preserved. Invalid profile throws before output/allocation hooks. |
| B02 | Construct A; inspect global keys, descriptors, proto, extensibility, this binding | Exactly five ordered keys/table descriptors; proto=A.objectPrototype; callable=null; extensible=true; globalObject===getThisBinding().object===globalThisValue.object; no globalThis property. |
| B03 | Inspect console, Number, all seven prototypes and own method snapshots | Exact current contents/descriptors/order and numeric constants; factories point to corresponding A prototypes; every callable defining Realm=A. Number callable=null. No constructor globals added. |
| B04 | Compare A/B and X/Y object graphs; seed A.seed=7 | All mutable objects distinct; canonical symbol keys retain existing identity; B has no seed. No output during bootstrap. |
| B05 | Access A.global/get/set; access L.globalObject/globalEnvironment/globalThisValue | Exact host profile errors, no storage created or mutated. |
| B06 | A.defineScriptGlobal('seed',{value:7,W:true,E:true,C:true}); read then define value11; make nonextensible, define fresh | Read7 then11; exact descriptor; failed fresh define host error/no new property. Use actual DataDescriptor field names in fixtures. |
| B07 | Resolve missing seed in A; seed property7; put captured reference11 | Original unresolved ReferenceError completion/location; property stays7; no re-resolution. |
| B08 | Seed7; capture resolved reference; create lexical seed; read, initialize11, read | TDZ then11 via captured composite base; property remains7; lexical private to A; no output/calls/ticks. |
| B09 | `run('let seed=7;',A)`, `run('return 1;',A)`, `run('',A)` | Same host `legacy Realm required`; no parse result, bindings, effects or observation. Legacy neighbors preserve existing outputs. |
| B10 | observe same three inputs in body mode with A; parser mode with A and L | Body rejects before parse. Parser mode results identical between profiles: normal for let/empty; existing certified return rejection for return; bodyEvaluated=false. Invalid limits retain existing host limit error precedence. |
| B11 | `new Evaluator(A)`; A.createGuestFunction([],[],legacyEnv,null) | Host legacy-required, no evaluator context or callable allocated. createBuiltin and prototype construction succeed without invoking callbacks. |
| B12 | X Evaluator.call(A.console.log,undefined,['bad'],loc); repeat with maxCalls=0 and saved A.functionPrototype.call | Host cross-profile error before call budget; no 'bad', counters/Realm unchanged; saved function remains rejected after deleting source property. |
| B13 | X.call(X.Function.call, A.console.log, [undefined,'bad'], loc) | Outer same-profile call enters; nested target rejects cross-profile before log; finally restores X and calls=0/depth unchanged. No invented rollback of outer work. |
| B14 | Direct invoke A log with X-context and A-context stubs; invoke X log with A-context | Cross-profile / Script execution unavailable / cross-profile host errors respectively; zero output/ticks/calls; include A.functionPrototype's inline invoke. |
| B15 | defineScriptGlobal with X builtin/guest callable vs B builtin; direct legacy Map insert A builtin then call | Foreign direct seed rejected before mutation; B builtin storage allowed but invocation still unavailable; Map insertion cannot bypass dispatch guard. |
| B16 | X calls Y guest `function f(){return this;}` with receiver7; calls Y builtin allocating object; guest throw7 and host sentinel | Receiver7 unchanged, allocation proto=Y.objectPrototype; exact throw/sentinel identity; X context restored; existing budget counts preserved. Same-profile direct builtin context tests still pass. |
| B17 | X builtin forwards nested foreign callable via context.call; repeat as coercion hook and array callback | Cross-profile host error; no foreign callback effects; outer Realm/calls/depth restore. Earlier argument/outer effects retained. |
| B18 | Accepted TS033B lexical/global/descriptor operations on A via throwing call/tick stub | Same literal TS033B results, original abrupt records and locations; no execution context entered. Full G/L source rows remain deferred. |

## Smallest implementation assignment and later migration

Propose one sole-writer TS-033C implementation, only after independent acceptance:
`src/realm.ts` (profile/storage/bootstrap/helpers/wrapped builtin construction),
`src/builtins/number.ts` (one global installer call), `src/interpreter.ts`,
`src/observation.ts`, `src/evaluator.ts` (listed guards only). No runtime union,
parser, GlobalEnvironment, Function.call algorithm or observation schema change.
One additive `test/script-realm-bootstrap.ts` runtime-input host driver, literal
fixtures under `fixtures/script-realm-bootstrap/`, one entry in
`tools/build-native.mjs`, evidence under `docs/validation/ts-033c/`, TASKS and
feature-scope handoff. No package/pin changes or automatic successor authority.
Use existing host process orchestration in dedicated evidence scripts; do not
alter old case expectations or build gate entries.

Required checks: typecheck, runner20/20, probes10/10, host73 and observation16,
all 212 exact inherited guest records in each rebuilt lane, all 39 old static-only
builds and separately parsed coverage gates plus the new driver, metadata136/42
and stress8 per lane, TS033B15 rows with both runtime inputs, and B01-B18 with
both fixture inputs under Node/native. Preserve original failure evidence.
New callback wrappers require actual zero-dynamic coverage with pinned scriptc;
source inspection cannot establish compilation. Report environment failures
separately and stop for review; no conformance admission or main merge.

P3 later owns declaration collection/instantiation, var grammar and composite
environment integration; it must not activate Script entry by removing guards.
P4 later owns an explicit Script execution session, evaluator environment and
Reference integration, strict guest-function metadata/source units, completion
values, this rules and context cleanup. It must deliberately replace constructor,
block/closure and Script builtin invocation restrictions together, while keeping
cross-profile checks. Its supported internal Script function factory replaces the
current legacy-only factory boundary. No permanent duplicate evaluator is needed.
P5 owns sloppy/harness/Error prerequisites; P6 owns observation/ledger admission.
CLI and observation-driver continue constructing legacy Realm; all existing test
Map seed/read sites stay legacy. Audit inventory lists every current source/test
entry, seed/read, function factory and direct invocation occurrence for that later
review; none is silently migrated here.

## Normative and engine basis

Read fixed [ECMA-262 2025 §9.3.1](https://262.ecma-international.org/16.0/#sec-initializehostdefinedrealm),
[§9.3.3](https://262.ecma-international.org/16.0/#sec-setdefaultglobalbindings),
[§19.1](https://262.ecma-international.org/16.0/#sec-value-properties-of-the-global-object),
and accepted §9.1.1.4 composite operations. Fresh supplemental clauses are
retained with the same verified 8,169,822-byte edition SHA256 as TS033P.
The historical `sec-setrealmglobalobject` anchor now points inside §9.3.1;
the retained excerpt labels this explicitly. Adopt ordinary object/prototype,
same-object this and per-Realm record ownership. Installing only five globals
is an explicit staged subset of SetDefaultGlobalBindings, not full compliance.

Read pinned engine262 `d553e7b52501fbc47eae981c8d0fa7a5c26d0171`, retained
in TS033P upstream.json with MIT license: api.mts:208-245 (intrinsics, ordinary
global, composite and separate compilation), Environment.mts:644-665 (records),
host-defined/engine.mts:172-203 (execution context), function-operations.mts:170-205
(defining Realm/this). Adopt ownership and separation; do not copy its scheduler,
generators, optional exotic customization or broad global installation.
Profile guards are Rift host policy, not specification exceptions. No reference
engine execution, native validation or fresh semantic result is claimed.
