# TS033E-P: strict Script integration seams

Design for independent review, 2026-11-03, source base `043fdb4` on
`codex/test262-classification`. D1/D2 and Script bootstrap are accepted.
This document proposes interfaces and acceptance cases; it implements none.
[Reproducible audit and literal matrix](validation/ts-033e-p/README.md) distinguish
source observations from inherited execution evidence. All Script execution
guards, observation envelopes, profiles and corpus admission remain unchanged.

## First boundary and staged decision

Recommend **E1: private executable records only**, not an omnibus P4 assignment.
Retain the parser's already validated body beside its matching plan in an opaque
record. E1 must not instantiate declarations, allocate guest functions, call a
guest or expose an evaluation entry. A complete flat plan remains non-executable.
Review E1 independently before assigning E2. The later names below are proposed
assignment boundaries, not ready tasks or authorization to implement them.

## Actual source seams

The audit hashes all current source/test files and records numbered occurrences.
These observations refer to `043fdb4`, not the older line tables in TS033P.

| Current seam | Observation and integration decision |
|---|---|
| `parser.ts:54–72`, `script-declarations.ts:39–84` | `parseDeclarationPlan` parses with purpose declaration-plan, validates EOF, collects conflicts, then discards its private body. `PlannedFunction` has ranges/scope IDs, not code. Retain the same successful parse internally; never reparse a function substring or accept a caller-supplied plan as executable. |
| `syntax.ts:1–2`, `script-metadata.ts:8` | FunctionSource retains source text/range; unit ID is separate. Add Script provenance to the private record and Script callable metadata, without altering legacy source semantics or serializing recursive ASTs. |
| `global-environment.ts:10–146` | Composite lexicals/object lookup and strict captured global references already exist. Add local/function records with this global record as their terminal outer; no casts to legacy Environment, mirrored Maps or replacement of `.global`. |
| `script-global-declarations.ts:53–139` | Accepted D2 validates boundary before ticks, then checks/admission/creation. Its materializer permits noncallable object markers for host controls. Real integration supplies a record-bound materializer and the context Realm's own global environment. Do not weaken D2 or turn markers into production fallback. |
| `runtime.ts:24–47,210–278` | Completion requires a Value; Environment and Reference are legacy-only; property references cache converted keys. Add a separate statement completion domain and tagged Script environment references. Preserve property coercion order and all legacy callers. |
| `evaluator.ts:23–115,313–354` | Constructor/block/closure/call guard Script; legacy block hoists into a Map and drops values; call switches Realm in finally. Share the expression/object/coercion implementation through explicit execution state, with profile-specific declaration/list/call paths. Do not create a second copied interpreter. |
| `realm.ts:99–133`, `builtins/function.ts:17–44` | Script builtin invokes and guest factory remain closed; legacy guest functions lack name/length/prototype metadata. `toString` dispatch knows guest/builtin only. Add a distinct Script callable variant and exhaustive source dispatch at the atomic call boundary. |
| `interpreter.ts:9`, `observation.ts:50–70` | Run/body observation remain legacy. New internal Script entry must not reuse today's body-observation encoding for GDI failures. No new public driver/schema in these slices. |

## Normative and engine evidence

Use fixed [ECMA-262 edition 16 (2025)](https://262.ecma-international.org/16.0/),
verified SHA256 `6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713`.
New retained clauses are in `validation/ts-033e-p/spec.json`; accepted declaration
clauses remain in `../ts-033d-p/spec.json` and environment/context evidence in
`../ts-033p/upstream.json` (paths relative to the evidence directory).

| Fixed clause | Consequential rule |
|---|---|
| §6.2.4.4 UpdateEmpty; §14.2.2; §14.6.2; §14.7.3.2 | Empty is separate from undefined; propagate statement values through abrupt empty break/continue too; if fills with undefined; while retains V. |
| §9.1.2.1 GetIdentifierReference; §6.2.5.6 PutValue | Capture environment base and strictness before RHS. Resolution is completion-aware and unresolved stays unresolved. |
| §10.2.1.2 OrdinaryCallBindThis; §10.2.3; §10.2.5; §10.2.11 | Defining Realm, source, strict receiver, function metadata and strict simple-parameter FDI are separate obligations. |
| §14.2.3 BlockDeclarationInstantiation; §14.3.2.1 | Interleave block binding creation/function initialization in lexical source order; var initializer resolves in current lexical environment before RHS. |
| §16.1.6–7 | Bind Script record to Realm, instantiate before body, normalize only normal empty at Script exit, restore caller. |
| §9.3.2 step3; §10.2.4 steps3–4; §10.2.4.1; §17.1 | Function.prototype receives inherited caller/arguments accessors using the Realm's thrower. Strict syntactic functions are not created with own caller/arguments properties. This is independent of the FDI arguments binding. |

Pinned [engine262 d553e7b52501fbc47eae981c8d0fa7a5c26d0171](https://github.com/engine262/engine262/tree/d553e7b52501fbc47eae981c8d0fa7a5c26d0171)
source and MIT license are retained with byte hashes. `Block.mts`'s
BlockDeclarationInstantiation, `FunctionDeclarationInstantiation.mts`,
`InstantiateOrdinaryFunctionExpression.mts`, `VariableStatement.mts`,
`IfStatement.mts` and `completion.mts` support those separations. Existing
`host-defined/engine.mts` and `abstract-ops/function-operations.mts` evidence
supports record/callee Realm ownership. Adopt the algorithms, not engine262's
generator scheduler. The pinned `StatementList.mts` passes `blockCompletion`
to UpdateEmpty; the fixed specification passes the previous value. Follow the
specification's value rule explicitly rather than copying that expression.
The pinned block implementation also contains DisposeResources beyond this
subset. Do not import disposal, Annex B, async or generator support. No engine262
execution was performed and agreement with its source is not an oracle.

## E1 executable record and provenance

Proposed internal `prepareStrictScript(unit, realm)` returns a tagged rejection
or opaque `ExecutableScript`; `evaluateScript` does not exist in E1. The only
constructor path is the parser's complete declaration-mode parse plus successful
collection/conflict validation. Order: require Script Realm; lexical/source and
depth guards; full grammar/EOF; declaration conflicts; strict profile check;
seal record. A conflict result stays an internal parse diagnostic, with no new
certified rule in outcomes/observation. Non-strict valid plans remain useful for
planning but cannot become executable records. Empty source is a profile
rejection, not a runtime undefined result. Directive-only source is eligible.

The record owns a copied immutable `{id,text}` unit, goal Script, exact Realm
identity, strictness, complete flat plan, private full body and private mapping
from declaration/function/block scope IDs to original AST nodes. IDs are
unit-local: pair them with record identity. The mapping is built while traversing
the same AST, using iterative worklists as D1 does; no recursive clone/JSON of
deep expressions. Plan/body/source and every function range must agree before
publication. Retain all nested functions, including expression functions, and
their inherited strictness. Do not recover scope solely from a function name.

Expose detached flat inspection snapshots, never writable body/maps or a
constructor accepting arbitrary AST/plan pairs. A module-internal consumer seam
can later supply the trusted evaluator/materializer with the retained body and
node mapping; it is not exported through interpreter/observation. E1 tests may
verify identity/range relationships through bounded flat projections. TypeScript
readonly alone does not protect arrays: encapsulate storage and copy projection
arrays/sites so host mutation cannot change the record. No general hostile-data
decoder is promised; invalid internal relationships are host faults before ticks.

Do not add hashes to the guest core. The host verifies original/transformed hashes
and supplies stable unit IDs; retain exact UTF16 text and half-open ranges. Equal
text in two IDs means distinct source units. A callable keeps its record alive
after parser return and across later units. Source provenance is independent of
the caller's observation stage; calls never relabel test stage as harness stage.
This is a future transport obligation, not permission to widen today's schema.

## E2 environments, references and completion data

Introduce a tagged ScriptEnvironment union: declarative/function records plus
the accepted GlobalEnvironment terminal. Locals have private binding storage,
outer ScriptEnvironment, completion-aware has/create/initialize/get/set; function
records additionally own strict thisValue and their callable. For this subset,
parameters, vars and function-body lets share one function environment. A block
gets a fresh declarative record; globals stay composite. No with/object local
environment, eval, immutable source declarations or sloppy mode is admitted.

`resolveScriptBinding(env,name,loc)` walks outward once, propagating HasBinding
abrupt completion. The resulting reference has base record or null, name,
captured `strict:true` and copied location. Get/Put dispatch to that captured
base's operations; they do not redo resolution or freeze a global property's
descriptor/value. Global method rechecks remain as specified. Captured null
always throws on Put even when RHS creates the property. Local TDZ is found,
not treated as unresolved. typeof bypasses Get only for a null base. Identifier
call receiver is undefined (including global identifiers); property call receiver
is the original base. Preserve successful property-key caching and existing
ToObject/ToPropertyKey timing; do not accidentally move coercion before RHS
while introducing binding references. Simple assignment resolves, evaluates RHS,
then puts. Compound assignment resolves, gets, evaluates RHS, converts, then puts.

Keep existing ValueCompletion and legacy Completion unchanged at this stage.
Proposed ScriptStatementCompletion has normal/break/continue payload
`{kind:"empty"}` or `{kind:"value",value:Value}`, return with Value, and the existing
ThrowCompletion unchanged. Empty is not a guest Value and never reaches object
operations. No labels are admitted. UpdateEmpty returns the original record when
nonempty, otherwise supplies the previous payload; return/throw are never empty.
Expression helpers still return ValueCompletion. Boundary adapters must be
explicit; never reinterpret legacy normal(undefined) as empty.

StatementList starts empty and carries the last nonempty payload through normal
items and empty break/continue. Empty/declaration statements return empty.
Expression statements, including directives, return their value. A block returns
its list completion and restores its lexical environment. If always UpdateEmpty
with guest undefined, including a false branch without else. While starts V at
guest undefined, updates it on normal/continue nonempty body completion, applies
UpdateEmpty on exit, and consumes only unlabelled break; continue remains inside
the loop. Abrupt test evaluation propagates unchanged. Function fallthrough is
undefined regardless of last statement value; return preserves its operand.
Only Script exit maps normal-empty to undefined. Escaping return/break/continue
from a valid Script is a host invariant fault.

## E3 real function records and declaration setup

Add a distinct `script-guest` callable variant, never a legacy callable cast.
Factory inputs are the executable record, validated function scope/node,
captured ScriptEnvironment and optional inferred name. Require defining Realm
identity and strict metadata from that record; reject mismatches before effects.
Keep full source range, private code, simple formals, plan scope, strict thisMode
and record identity. Use defining Realm Function.prototype for [[Prototype]],
name/length descriptors W=false E=false C=true, length=formal count, and ordinary
function own prototype W=true E=false C=false. Its fresh object inherits defining
Realm Object.prototype and constructor backlink W=true E=false C=true. Each
materialization creates fresh identities; repeated invocations never reuse a
closure from a plan cache. No guest construct entry or new syntax is admitted;
constructor execution remains a separately blocked capability even though these
observable ordinary-function properties must be correct.

Declaration functions receive their declared name. Anonymous expression default
name is empty; NamedEvaluation supplies a name for let/var initializers, identifier
simple assignment, and ordinary object property values. Member assignment does
not infer a name, nor does a conditional expression wrapping a function. The
parser erases parentheses: retain enough syntactic naming eligibility in the
private representation to implement the fixed grammar rule, not a heuristic
based on where a Value eventually lands. Named function expressions, defaults,
destructuring, methods, computed object keys and arrows remain rejected.
`toString` uses the retained exact function slice, never synthesized naming text.

D2 keeps its full five-argument materializer signature. Production adapter is
bound to one record; verify declaration/function/unit/environment/context match,
look up the actual function node, create a real function capturing that global
environment, and return object Value. D2's marker control remains test-only.
Recheck current global state every invocation. Its eleven orchestrator ticks
for the accepted simple sample remain exactly eleven; factory work adds explicit
ticks, never substitutes for existing ticks or resets the budget.

Strict simple-parameter FDI order: select winning function declarations (last
per name, winning source order); create formal bindings left to right; initialize
formals left to right from arguments/missing undefined; create/initialize unique
var names not already parameter bindings to undefined; create body lexical lets
in TDZ; materialize winning functions capturing that same environment and set
their var bindings, overwriting same-name parameters. Function declarations in
the body later return empty. Var without initializer does nothing; initializers
run left to right at their statements, resolving in current lexical environment
before RHS and Put. Let resolves its already-created binding, evaluates initializer
or undefined, then initializes it; a failed initializer leaves TDZ.

**Subset debt:** standard FDI creates an unmapped arguments object and immutable
arguments binding before parameter initialization where required. Initial E3
omits that object/binding only while all identifier references/bindings to
arguments/eval and direct/indirect eval entry remain unavailable. Host inspection
must not be advertised as full FDI. Ordinary-object `o.arguments` is independent
of a function arguments environment, but function `f.arguments` and `f.caller`
already parse, including computed keys, and require restricted-property semantics.
The FDI omission does **not** justify omitting those accessors. Implement
the standard object/binding before relaxing reserved identifiers, adding eval,
or exposing environment introspection. No fake undefined arguments binding and
no claim of full FDI. Preserve the parser's reserved-word rejection in unreachable
bodies too. Sloppy FDI/parameter environments remain separate future work.

### ER prerequisite: inherited restricted function properties

Review of `81e6e20` identified an execution blocker omitted from the initial
design. Current `runtime.ts:18–23,159–187` stores only data descriptors, reads
descriptor.value and writes through data-property paths. `realm.ts:32–35` and
`builtins/function.ts:17–44` install no caller/arguments accessors on
functionPrototype. Source inspection therefore predicts incorrect undefined
reads and own data-property creation on writes if E4 were activated as drafted.
This is a source finding, not an observed Script execution (guards remain closed).

**E4 is blocked until a separately assigned and independently accepted ER
accessor/restricted-intrinsic prerequisite is complete.** E1 stays private records
only. E2/E3 host-only work is not evidence that functions may execute without ER.
No token blacklist, special property-name rejection, undefined substitute, own
poison data property, or function-only Get shortcut discharges this prerequisite.
Dynamic keys and prototype mutation require actual descriptor semantics. No ER
implementation is authorized by this design correction.

The fixed2025 contract is explicit: CreateIntrinsics §9.3.2 step3 invokes
AddRestrictedFunctionProperties on that Realm's Function.prototype. §10.2.4
defines own accessor descriptors there for caller and arguments, both get/set
equal to the same Realm-local %ThrowTypeError%, enumerable=false,
configurable=true, with no value/writable fields. A newly created strict guest
function inherits them and has neither own property (§17.1). Ordinary [[Get]]
and [[Set]] must dispatch the accessor with the original receiver via the shared
operation context; setter throw must prevent creating an own data property.
The thrower is a per-Realm anonymous builtin, nonextensible; name empty and
length0 both have W/E/C=false/false/false. It throws TypeError (§10.2.4.1), with
callee Realm and shared-budget cleanup. Until genuine Error objects are accepted,
internal diagnostic TypeError checks remain explicitly non-conformance evidence.

The descriptors are configurable: host controls must be able to delete/redefine
them and observe ordinary lookup afterward, rather than hard-coded name poisoning.
Initial absence of own properties is a creation rule, not a prohibition on a host
explicitly defining an own data property later. Ordinary object arguments/caller
properties retain ordinary data semantics, even with equal computed key strings.

Future ER ownership is a separate contract: core data/accessor descriptor union,
validation and receiver-preserving Get/Set in `src/runtime.ts`; Script-only
restricted intrinsic bootstrap in `src/realm.ts` and a new
`src/builtins/restricted-function.ts`; descriptor/context migrations in the current
production consumers `src/array-object.ts`, `src/primitive-objects.ts`,
`src/global-environment.ts`, `src/array-like.ts`, `src/array-map.ts`,
`src/primitive-conversion.ts`, `src/builtins/object.ts`, `src/builtins/array.ts`.
`internalGet` currently lacks OperationContext, so freeze a complete caller and
override migration before assigning implementation, including the accepted host
inspection APIs; do not silently call getters through a fresh session. Newly
introduced E2/E3 consumers must be inventoried at that future base. If this exact
ownership needs expansion, revise ER's assignment first; E1 must not absorb it.

ER owns additive `test/script-restricted-properties.ts`, its input fixtures,
dedicated validation evidence and additive native gate, with necessary existing
host-test signature migrations preserving every expected record. Keep legacy
bootstrap behavior exact; these new intrinsic properties belong to Script Realms
until separately approved migration. The prerequisite requires general descriptor
and subclass regression controls plus F04–F09 below in both hosts, with independent
static-only/zero-dynamic checks. While calls remain closed, validate descriptor
storage and generic accessor dispatch using trusted host controls, explicitly not
Script source execution or permission to bypass builtin guards. Actual thrower
invocation through authorized Script context, computed source cases, cross-Realm
and budget cleanup are additionally mandatory in E4's atomic acceptance. ER
acceptance alone must not open evaluateScript or relax any guard.

Strict block entry creates a fresh record linked to current lexical environment.
For each direct lexical declaration in source order, create binding; if function,
immediately materialize and initialize before advancing. Lets remain TDZ. Do not
bulk-create all bindings then create functions. Capture the new block record even
though it becomes active for statement evaluation only after setup succeeds.
Untaken blocks do no lexical setup. Nested vars were instantiated in the variable
environment; initializer resolution still uses the current lexical chain, not a
direct variable-environment write. Same-name intervening lets conflict under the
current grammar; test capture timing with valid assignments and host references,
not an invalid nested var/let fixture. On a
setup resource failure retain created prefix, propagate original abrupt record,
restore caller lexical context; no rollback or execution of initializer/body.

## E4 atomic internal entry/call activation

Only after E1–E3 and the separate ER prerequisite's independent acceptance,
assign atomic wiring of internal
evaluateScript, Script statement/list dispatch in the shared Evaluator, Script
closure factory/call dispatch, and Script builtin guard replacement. Preserve
legacy constructor/entry behavior through an explicit internal Script session
creation path; never an allowScript boolean that runs legacy block semantics.
Factories may be host-inspected before E4 but all calls still fail closed.

One session owns monotonic steps, calls, evaluation depth and a stable readonly
OperationContext view. Active frame has Realm, executable record/source unit,
lexical and variable environments, strictness, thisValue, function-or-null and
private-environment-null. Entry verifies record ownership and Script profile
before ticks, saves frame, installs Script frame, invokes D2 with real adapter,
then enters body only on normal completion. Runtime instantiation failures are
distinguished internally from body failures. No semantic error is invented for
unsupported profile. All thrown guest records retain identity/origin/location.

Same-profile A-to-B calls enter the callee's defining Realm and source record;
strict guest this is the exact receiver including undefined, null, number or
object. Top-level Script this is its globalThisValue. Builtins enter their own
Realm for allocations but retain caller code provenance unless an explicit guest
call changes it. The session callback is reused through builtin call/coercion
paths: no fresh evaluator, new budget or direct invoke bypass. Cross-profile
transfer/invocation guards remain. Direct Script builtin invoke must require the
authorized Script operation context as well as matching profile; arbitrary
host-made context must not silently bypass the closed call path.

Every entry/block/call uses finally to restore saved frame, Realm, source,
lexical/variable environments, calls and depth on normal, guest throw, resource
throw and host sentinel. Restore to the saved counters, not an assumed zero;
steps are never restored. Builtin depth/call accounting continues the accepted
call path. No host fault is caught and reclassified as a guest failure. Guest
mutations and partially created declarations survive cleanup. Session exhaustion
cannot be cleared by evaluating a second unit; a fresh independent run explicitly
creates a new session. Limits remain source100000/parse128 per unit and shared
steps100000/calls64/evaluation-depth256. No scheduler or guest try/finally syntax
is introduced by host finally cleanup.

Tick placement is an implementation acceptance contract, not a specification
claim. Preserve every legacy tick and D2's exact trace. Each new declaration
scan/creation, formal initialization and function materialization has a tick
before its potentially mutating step; record site is the relevant declaration or
formal, not arbitrary line1. Statement/expression entry ticks and depth guards
retain their existing meaning. Freeze literal new traces before E3/E4 acceptance,
test every resource prefix including allocation-before-binding, and record exact
counts; this design does not invent unmeasured native integrated totals.

## Ordered ownership and acceptance boundaries

| Slice | Owned production seam when separately assigned | Required evidence and stop boundary |
|---|---|---|
| E1 (recommended first) | New `src/script-record.ts`; minimal parser internal successful-body handoff and declaration collector scope/node association. Private metadata only; no evaluator/runtime/Realm behavior change. | Flat snapshot controls for P01–P05/U01; D1 full projections and deep-chain controls; preserve parser/metadata outcomes. One additive host driver/fixtures/static gate, TASKS and own evidence. No real factories, environment helpers or callability. Stop for review. |
| E2 | New Script local/reference helper and statement-completion helper modules; types only where needed. No entry or evaluator dispatch migration. | Host literal L/T reference and C completion controls, TDZ/strict failure/abrupt identity. No source-execution claims. Add dedicated gates; preserve all E1/old gates. Stop for review. |
| E3 | New record-bound function materializer and local/block/FDI helpers; tagged runtime callable, bounded Realm factory and exhaustive function-toString type handling as needed, while execution guards stay closed. | Host factory descriptors/source/Realm tests; declaration setup order and every prefix; no source body execution, no synthetic production callable. Standard arguments omission explicitly retained. Stop for review. |
| ER (separate prerequisite, not part of E1) | Accessor descriptor/context migration and Script restricted-intrinsic bootstrap with exact ownership and migration review specified above. | Both-host descriptor/accessor host controls and F04–F09 host projections, additive static gate; all execution guards remain closed. Independently accept before assigning E4. |
| E4 (blocked on ER as well as E1–E3) | Internal Script entry/session plus shared Evaluator profile dispatch and Realm builtin call authorization, atomically with factories/closures/call guards. | Entire literal execution matrix including restricted-property source controls in rebuilt Node/native lanes, all prior host controls and shared budget/abrupt cleanup cases. No public CLI/observation integration. Stop for review; no successor assigned here. |

Do not expand E1's ownership merely because a helper seems convenient. If private
AST publication cannot fit without runtime work, report a contract conflict and
revise the bounded assignment with coordinator before proceeding. Every later
slice must receive its own exact file ownership and literal expected traces.
No slice may leave a callable publicly reachable with incomplete Script semantics.

All implementation acceptance requires the 212 inherited exact guest records per
lane, 42 inherited static-only builds AND separately parsed zero-dynamic gates,
D1 planner135/baseline207, metadata136/42/stress8, global15/two inputs,
bootstrap18/two inputs and D2/two-input replays. Add only reviewed gates/records;
retain typecheck, runner20, probes10, host73, accepted observation suite (22 after
CL006) and all60 blocked corpus variants. Preserve old tests/expected records,
source text, manifests, pins, C++, historical evidence and default profiles.
Future validation must retain failures as well as successes. This design's audit
does not rebuild or certify any native binary. Coordinator owns COORDINATION;
handoff is for independent review, with no implementation, successor or main merge.
