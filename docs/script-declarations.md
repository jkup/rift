# TS-033D-P: non-executing Script declaration plans

Design for independent review, 2026-11-02. Assigned base99e8fcf; inspected
HEAD250aa1b76e8cb3282f2aa2e867cf22197d783278 adds coordinator tracking.
TS033C a1806fa is accepted. This freezes P3 interfaces and ordered implementation
proposals, not implemented behavior or conformance admission. All acceptance
rows below are unexecuted requirements. [Evidence](validation/ts-033d-p/README.md).

## Boundary and sources

Keep parse, auditScriptReturns, inspectScript, run, observation, CLI and every
Realm/callable guard unchanged in behavior. Add planScriptDeclarations(unit).
Its result describes declarations, not executable code. It takes no Realm,
creates no guest Value/function/environment and never evaluates initializers.
A complete plan is not an admission capability.

Use the existing parser with an explicit internal purpose, not a second grammar
or source rewriting. Plan-mode adds simple var statements/lists and the scope
checks below. Keep single-binding let: let a,b stays unsupported. No const,
destructuring, defaults/rest, named function expressions, ASI, for/switch/catch,
Annex B, generators, async, eval, modules or new escapes. Reserved identifiers,
strict-delete and duplicate-formal restrictions stay fail-closed, including
non-strict duplicate formals. No new error certification. Non-strict source may
be inspected, but block functions require strict enclosing code: reject
non-strict block functions as unsupported, not approximate Annex B.
Use existing parse.declaration-statement capability for that rejection with
message "non-strict block function planning is unsupported"; do not widen the
SyntaxCapability union or the observation error-certification table.

Normative baseline: fixed [ECMA-2622025 edition16](https://262.ecma-international.org/16.0/),
§16.1.1/7 (Script errors/GDI), §14.2.1/3 (blocks), §14.3.2 (var), §15.2.1 and
§10.2.11 (function errors/FDI). Nine clauses are retained in spec.json; the full
edition SHA256 matches accepted TS033P. Do not add obsolete HasVarDeclaration
state: this edition tests prior lexicals and restricted own global properties.

Inspected revision-pinned engine262
[GDI](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/runtime-semantics/GlobalDeclarationInstantiation.mts)
and [FDI](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/runtime-semantics/FunctionDeclarationInstantiation.mts).
Full source, hashes and MIT license are in engine.json. Adopt static name lists,
reverse winner selection and precheck/creation separation, not its generators,
agent state or broad grammar. Its step/Annex B comments differ from edition16;
the fixed specification governs. Also read the accepted TS033P retained
Environment.mts644–948 and host-defined/engine.mts172–203 for primitive/context
seams. No reference engine was executed or implementation copied.

## Exact plan interface

Readonly fields are detached owned snapshots, not a requirement to use host
Object.freeze. Proposed public types for the next implementation:

~~~ts
type DeclarationSite = {
  readonly name: string;
  readonly start: number; readonly end: number; // identifier, UTF16 half-open
  readonly loc: Readonly<Location>;
};
type Declaration = {
  readonly id: number; // unit-local preorder, starting at 0
  readonly kind: "let" | "var" | "function";
  readonly site: DeclarationSite;
  readonly scope: number; // immediate syntactic scope
  readonly variableScope: number; // closest Script/function
  readonly functionScope: number | null; // declaration functions only
  readonly initializer: { readonly start: number; readonly end: number } | null;
};
type DeclarationScope = {
  readonly id: number; readonly kind: "script" | "function" | "block";
  readonly parent: number | null;
  readonly start: number; readonly end: number;
  readonly strict: boolean;
  readonly formals: readonly DeclarationSite[]; // function only
  readonly lexicalDeclarations: readonly number[];
  readonly varDeclarations: readonly number[];
  readonly lexicalNames: readonly string[];
  readonly varNames: readonly string[]; // occurrence list, NOT deduplicated
};
type PlannedFunction = {
  readonly scope: number; readonly declaration: number | null;
  readonly start: number; readonly end: number; // full function source
  readonly strictness: StrictnessMetadata;
};
type DeclarationConflict = {
  readonly kind: "duplicate-lexical" | "lexical-var" | "formal-lexical";
  readonly scope: number;
  readonly first: DeclarationSite; readonly second: DeclarationSite;
};
type ScriptDeclarationPlan = {
  readonly kind: "complete"; readonly goal: "Script";
  readonly unit: ScriptSourceUnit; readonly consumedUnits: number;
  readonly strictness: StrictnessMetadata;
  readonly scopes: readonly DeclarationScope[];
  readonly declarations: readonly Declaration[];
  readonly functions: readonly PlannedFunction[];
};
type DeclarationPlanResult = ScriptDeclarationPlan
  | { readonly kind: "conflict"; readonly goal: "Script";
      readonly unit: ScriptSourceUnit; readonly consumedUnits: number;
      readonly conflict: DeclarationConflict; readonly diagnostic: Diagnostic }
  | { readonly kind: "blocked"; readonly goal: "Script";
      readonly unit: ScriptSourceUnit; readonly rejection: Rejection;
      readonly diagnostic: Diagnostic };
function planScriptDeclarations(unit: ScriptSourceUnit): DeclarationPlanResult;
~~~

Conflict is a plan-only parse-phase SyntaxError diagnostic, not a new
SyntaxRuleCode or observation certification. It returns no valid plan/AST.
Blocked retains the actual unsupported/resource origin. A diagnostic name
alone never proves an ECMAScript error. The new entry conservatively blocks
return-outside-function; extended grammar must not reach the legacy return
certification audit. The old certified path remains unchanged.

Copy unit ID/text at entry. Offsets index exact UTF16 text, never normalized,
trimmed, prefixed or concatenated. Scope0 spans the complete Script; function/
block scope spans include opening and closing braces. Function records retain
full function spans. Initializer ranges cover its AssignmentExpression, including
parentheses but excluding surrounding trivia, equals sign and list comma.
Identity is (unit.id, local ID), never name/hash alone. IDs are host opaque;
hash verification and original-location mapping stay in the host adapter.
Snapshot mutation must not affect other plans or parser-owned data.

## Actual parser seam and traversal

Parser currently has auditReturns:boolean and list(braced,parameters) with one
combined names array. Internally replace the boolean with purposes legacy,
return-audit, declaration-plan. First two retain their exact paths, signatures,
first errors and partial bodies. Plan mode records scope/formal/name spans and
does not perform list's combined duplicate check. Defer scope checks until EOF.
functionTail retains its separate duplicate-formal rejection. inspectScript
continues to call legacy parse, not the new planner.

Add a Stmt variant {kind:"var",loc,declarations:{name,init:Expr|null}[]} in
syntax.ts, emitted only in private plan mode. Span/scope records stay private.
Each initializer uses expression(1); commas are consumed by the var list, while
call/array/object commas retain existing grammar. Reject missing identifier,
trailing comma or semicolon. Var is allowed as an if/while statement; let/function
branch restrictions stay. No public plan result exposes a body.

The legacy evaluator statementInner gains one explicit invariant arm throwing
host Error "Script var AST requires Script execution" if trusted host code
manually injects a var node. The legacy metadata visitor gets the same invariant.
These exhaustiveness arms do not execute var or relax profile guards, and are
the only consumer changes proposed for D1. P4 must separately define executable
ScriptRecord/private body ownership. A host-forgeable plan is no authority to
execute source.

Scope IDs follow syntax preorder: function scope at its function token, block
scope at its opening brace; function body is a function scope, not an extra
block. Declaration IDs follow preorder, var-list names left to right, function
declaration before its body. Anonymous functions get scopes but no enclosing
declaration. Initializers must be traversed for nested functions, never evaluated.

* Direct Script/function lets are lexical. Direct functions and all vars in that
  variable scope are var-scoped. Function names occur in varNames too.
* Strict block direct lets/functions are lexical. Each block's var list includes
  vars in descendant blocks/branches/loops, stopping at every nested function.
  Block function names never leak into parent var lists.
* A nested var contributes to all containing block var lists and the enclosing
  Script/function list. Child lets never enter parent lexical lists.
* Every scope rejects duplicate lexical names and lexical/var intersection.
  Function scopes also reject formals intersecting direct body lexical names.
  Formals may overlap vars/functions. Nested block lexicals may shadow formals.
  Script/function repeated functions are valid; strict block repeated functions
  are duplicate lexicals. Sibling blocks may reuse lexical names.

Use an explicit work stack carrying scope/variable-scope IDs, children pushed in
reverse source order. Visit all expression shapes including computed keys,
object values, arrays, conditional arms and var initializers. Nested functions
open separate contexts; no outer var collection crosses them. Summarize block
vars with explicit postorder work, stopping at functions. Ancestor propagation
is bounded by parser depth128. Use Maps plus ordered arrays rather than quadratic
all-pairs checks. Reverse winner arrays once rather than repeated unshift.
Parser depth does not bound AST height: 15000 left-associated binary/member/call
nodes must never trigger recursive visitor or JSON-serialization stack overflow.

First finish lexical/grammar/resource validation of the whole source. Any
unsupported tail or nested unsupported syntax vetoes the whole plan and earlier
candidate conflicts. Then check scopes in ID order: duplicate lexicals,
lexical/var intersection, formal/lexical intersection. Within each check use
source list order; retain first occurrence and next duplicate or first matching
pair. For formal/lexical put formal in first and lexical in second. Diagnostic
location is the later site's start. This deterministic diagnostic priority is a
Rift choice, not spec-mandated multiple-error ordering.

Planning retains source cap100000 and parse depth128; it has no execution step
session. Bounded source, iterative walks and bounded lists constrain work.
No new resource code or declaration limit. Flat plans can be serialized; deep
private ASTs must not be serialized for comparison.

## Global instantiation: later host-only seam

This is D2, not the next parser assignment. A single internal orchestrator takes
the validated plan, accepted GlobalEnvironment and OperationContext:

~~~ts
type DeclarationMaterializer = (
  declaration: Declaration, fn: PlannedFunction,
  environment: GlobalEnvironment, unit: ScriptSourceUnit,
  context: OperationContext
) => ValueCompletion;
function instantiateGlobalDeclarations(
  plan: ScriptDeclarationPlan, environment: GlobalEnvironment,
  context: OperationContext, materialize: DeclarationMaterializer
): ValueCompletion;
~~~

The full callback signature is mandatory for static compilation. The materializer
returns an object Value: a test-only noncallable marker in D2, a real function in
future P4. The synthetic adapter exists only in its host test, never as a Realm
fallback. No production caller/export through interpreter or observation before
P4. No callback during parse/prechecks. Reject non-strict plans and malformed
root/IDs with host Error before effects. A valid plan is not a cached precheck
ticket: every invocation checks current environment state. Host tests are trusted,
not a public validation boundary for hostile forged plans.
Boundary order is context.realm.profile==="script" (else host Error "Script
Realm required"), strict plan (else "strict declaration plan required"), then
root kind/ID/index validity (else "invalid declaration plan"), before ticks.
A materializer normal result must be an object Value; otherwise throw host Error
"declaration materializer requires object". No callable is required in the
synthetic seam. Real P4 integration additionally enforces defining Realm and
actual callable metadata. Stand-alone fault environments are only trusted
test arguments; production P4 supplies its context Realm's globalEnvironment.

P4 receives freshly validated parser data with private body, matching Realm/
context and full function AST. Empty non-strict source stays profile-blocked;
a strict directive-only plan may instantiate nothing.

Freeze this ordering against existing methods, without changing their algorithms:

1. For each root lexicalName in source order, tick, hasLexicalDeclaration; true
   gives runtime SyntaxError. Else hasRestrictedGlobalProperty: propagate abrupt
   or SyntaxError on true. Do not query prototypes or invoke getters.
2. For each root varName, including duplicates, tick and check prior lexical
   membership; true gives runtime SyntaxError.
3. Reverse-scan root varDeclarations, tick per declaration. For each previously
   unselected function name, call canDeclareGlobalFunction; abrupt propagates,
   false gives TypeError. Record winner; reverse winner array once for creation.
4. Source-order scan root varDeclarations, tick per declaration. Each var not
   named by a selected function calls canDeclareGlobalVar, even repeated vars.
   Abrupt propagates, false gives TypeError. Append each successful name once
   to the creation list with its first var site's location.
5. Only after all prechecks: for each direct lexical declaration, tick then
   createMutableBinding(name,loc). Leave TDZ. No initializer/body evaluation.
6. Winners in source order: tick then materialize with same composite environment
   and unit; propagate abrupt. Tick again then createGlobalFunctionBinding.
   New/configurable own properties get W/E/C=true/true/false; eligible
   nonconfigurable properties retain flags. Primitive performs define and Set(false).
7. Unique vars in first-occurrence order: tick then createGlobalVarBinding.
   Existing own value/flags survive; new own property is undefined with
   W/E/C=true/true/false. Inherited-only names require extensibility and produce
   a new own property without modifying the prototype.
8. Return normal() as unused/undefined. There is no body entry.

Tick means context.tick(site.loc); any non-normal result returns unchanged.
Use each occurrence's site for checks, winner site for function creation, first
surviving var for var creation. Tick scans even on skipped entries. For literal
'"use strict"; let l; var x; function f(){}', ticks are: 1 lexical l check,
2 var x lexical check, 3 function f lexical check, 4 reverse f, 5 reverse x,
6 forward x, 7 forward f, 8 create l, 9 materialize f, 10 create f, 11 create x.
These are exact orchestrator ticks with ordinary properties and a zero-tick
marker materializer. Future real factory/primitive ticks are additive and do
not justify resetting the shared execution session.

Language conflict/admission failures before step5 leave bindings unchanged.
Resource interruption in steps5–7 leaves the already-created prefix. A guard
after materialization can leave an allocated object without a corresponding
property. This is not rollback. Original guest abrupt completion/value/location/
origin is preserved; host sentinel exceptions escape unchanged. Never retry or
replace them. Orchestrator changes no Realm/call/depth/source state; future P4
enters/restores context in finally around it. Synthetic primitive overrides on
stand-alone GlobalEnvironment are fault-injection tests, not support for exotic
Script globals; Realm still constructs only an ordinary global object.

Current descriptors are data-only. Flag-table controls do not establish accessor
or Proxy support. Do not substitute hasBinding for own-property admission.
No caching across units or intervening host mutation.

## Function/block interfaces and P4 obligations

Freeze pure selectFunctionDeclarations(scope,declarations):readonly number[]:
last occurrence per name, returned in winning source order. GDI admission still
reverse-scans independently; the selector cannot erase that observable ordering.
Do not select block functions this way; duplicates already failed.

Function plan exposes formal order, lexical declarations and var occurrences,
not a call-frame factory. Future strict simple-parameter FDI uses one function
environment for formals, vars and body lexicals. Bind formals left to right
(missing arguments yield undefined); create new var names once initialized
undefined, preserving same-name parameter values. Create body lets TDZ, then
materialize winning body functions capturing that environment and overwrite
their var bindings, including same-name formals. Initializers run only in body.
Function declaration statements later do nothing.

Var without initializer does nothing. Var initializers run left to right,
resolve before RHS effects, then PutValue; anonymous function naming is a P4
obligation. A let without initializer initializes undefined at its statement;
self-read before initialization is TDZ. Strict FDI also specifies an unmapped
arguments object and immutable arguments binding. Grammar still reserves
arguments/eval. P4 must explicitly scope any unobservable omission under that
still-rejected grammar or implement the standard object before admitting
references/introspection/eval; do not claim full FDI from this subset.

On each entered strict block create a fresh declarative environment linked to
the current lexical environment. In direct lexical source order create each
binding, immediately materializing/initializing a function before proceeding
to the next declaration (§14.2.3). Lets stay TDZ. Do not bulk-create all bindings
then use global function ordering. Nested vars were instantiated in the variable
environment, but their initializers execute in current lexical context. Untaken
blocks do not instantiate block lexicals.

Existing Evaluator.block checks and hoists direct let/functions into a legacy
Map and discards normal statement values. Leave it legacy. P4 needs local
declarative/function records resolving through composite globals, captured
strict References, defining Realm/source identity, explicit empty completions,
this semantics and finally cleanup. Never cast GlobalEnvironment to Environment,
mirror bindings, or replace .global. Only separately reviewed P4 may replace
guest-function/closure/Evaluator/Script-builtin guards together. Cross-profile
guards remain. Real factories retain source ranges, name/length/prototypes,
strictness and source-unit identity after parser lifetime. No allowScript option
or legacy callable masquerading as a Script callable.

## Literal matrix and phase neighbors

All rows are unexecuted requirements. Unless noted, source fixtures start with
literal "use strict";. P=plan, H=host-only orchestration, F=future P4 source
execution. H uses noncallable marker objects F1/F2, never executes the bodies.
Locations/ranges must be literal fixture expectations, not outputs calculated by
the parser under test. Compare EOF, unit identity and list order in every P row.

| ID | Literal source/setup | Required result and neighbor |
|---|---|---|
| G01 | let x=1; | P lexical[x], var[]; H x TDZ/no own x; F x=1. Neighbor var x=1; gives P var[x], H own undefined, F1. |
| G02 | var x=1,y=x,z; var x; | P var[x,y,z,x], initializer spans; H own x,y,z once, undefined; F1,1,undefined. Neighbors var x,; and let x,y; blocked. |
| G03 | function f(){return 1;} var f; function g(){} function f(){return 2;} | P var[f,f,g,f], winners g,last f. H CanFunction order f,g, create g,f, no CanVar(f), f=F2; F f()=2. Block repeated f gives L03. |
| G04 | let x; var x; / var x; let x; | P lexical-var parse conflict, no plan. Neighbor let x; {var x;} also conflicts. No new certification. |
| G05 | let x; let x; | P duplicate-lexical. Neighbor let x; {let x;} valid separate scopes. |
| G06 | UnitA var x; then UnitB let x; | P complete separately; H A creates nonconfigurable x, B runtime SyntaxError/body=false. Neighbor host configurable own x=7 permits B lexical TDZ, property stays7. |
| G07 | A let x; then B var x; / function x(){} / let x; | H B runtime SyntaxError before creation whether prior lexical is TDZ or initialized. Neighbor A let y; permits B var x;. |
| G08 | seed own x=7 for all eight W/E/C triples; function x(){} | H accepts iff C or (W and E). If C, result marker and true/true/false; else eligible flags retained. Rejection TypeError/no changes. Neighbor var x; accepts all eight, preserves7/flags. |
| G09 | inherited-only nonconfigurable x=7, extensible global; var x; / function x(){} / let x; | H own undefined / own marker / lexical TDZ; prototype untouched. Nonextensible neighbor rejects var/function TypeError but allows let. |
| G10 | nonextensible global, own configurable x=7; var x; / function x(){} | H allowed, reuse7 / marker. Fresh y neighbor fails TypeError for var/function; let y succeeds. |
| G11 | let fresh; var x; function f(){} with prior lexical x | H SyntaxError in var precheck, fresh/f absent, zero materialization. No prior x neighbor succeeds; restricted fresh fails earlier. |
| G12 | let Infinity; / var Infinity; / function Infinity(){} on new Script Realm | H SyntaxError / normal retaining Infinity / TypeError. Neighbor let Number; permitted lexical TDZ, own namespace preserved. |
| G13 | var x; var x; | H CanVar twice, CreateVar once. Neighbor var x; function x(){} gives CanFunction once, CanVar zero. |
| G14 | let l; var x; function f(){} with budgets7,8,9,10,11 and zero-tick marker | H failed tick8: nothing; tick9: l TDZ; tick10: l TDZ/allocated marker/no f; tick11: l TDZ/f own/no x; budget11 normal. Preserve resource count/location/origin. |
| G15 | G03 inject original guest throw at CanFunction(f), materialize(g), or CreateFunction(f); repeat with host sentinel | H no later operation. First has no new binding; materialize(g) has no function property; CreateFunction(f) retains g. Same throw/value/location/sentinel identity. Stand-alone synthetic environment only. |
| G16 | var x=sideEffect(); function f(){sideEffect();} | P/H side-effect counter0, markers only. F initializer once in body, function effect only upon call. |
| L01 | {var x;} if(false){var y;} while(false){var z;} function f(){var inner;} | P root var[x,y,z,f], f var[inner]; each block lists descendant vars. F x/y/z undefined despite untaken branches. |
| L02 | let x; {var x;} / {let x; {var x;}} | P conflict in Script / outer block. Neighbor {let x;} var x; valid. |
| L03 | {function f(){} function f(){}} | P duplicate-lexical; same repeated functions at Script/function-body valid. Block let f; function f(){} also duplicate-lexical. |
| L04 | function f(a){var a; function a(){} let b;} | P formal[a], var[a,a], lexical[b]; F function overwrites formal. Neighbor function f(a){let a;} formal-lexical conflict. |
| L05 | function f(a){{let a;}{function a(){}} var a;} | P valid, body var[a], two child lexical[a] scopes; F var a preserves parameter. Direct body let a neighbor invalid. |
| L06 | function f(){let x; {var x;}} | P body lexical-var conflict. Replace nested block with function g(){var x;} => valid. |
| L07 | let f=function(a){var a; let x;}; let g=function(){var x;}; | P separate anonymous function scopes/ranges, root var[]. No-prefix neighbor with own strict directive only in first function must not make sibling strict. |
| L08 | function f(a,a){} / function f(a=1){} / var {x}=o; / const x=1; | P unsupported, not certified conflict. Simple f(a)/var x=o neighbors valid. |
| L09 | {let x=1; function f(){return x;}} | P child lexical[x,f], root var[]; H creates neither. F block f captures child environment, sees1 after let, TDZ if called before let. |
| L10 | no prefix: {function f(){}} / function outer(){"use strict"; {function f(){}}} | First P unsupported non-strict block function; second P complete but Script non-strict/execution-blocked. Prefixed first is valid P. |
| T01 | let x; let x; const tail=0; / let x; var x; function f(){const tail=0;} | P unsupported whole-source veto, no conflict/plan. Removing tail gives conflict. |
| T02 | var x=function(){return 1;}; @ / var x; return 1; | P blocked, no partial plan/new return certification. Legacy return audit unchanged. |
| R01 | exactly100000 UTF16 units, valid trailing spaces; then one extra space | First subject to grammar passes; second source-size resource. Conflict prefix at100001 still resource, not conflict. |
| R02 | 126/127/128/129 nested blocks around var x; and parentheses around 1 | Blocks126/127 succeed (peak127/128); blocks128/129 fail at129. Parentheses126 succeed at128;127/128/129 fail at129. No crash or truncated plan. |
| R03 | "var x;".repeat(12000), and6000 distinct var xN; statements below cap | P full ordered occurrences/scopes; H unique creation names, budget termination per specified sequence. No recursive visitor. |
| R04 | binary/member/call deep chains specified below | P includes terminal function/tail var, excludes tail from root; no host RangeError. Terminal const neighbor vetoes whole plan. |
| R05 | var x = function(){var tail;}; with comments, CRLF, U+2028/U+2029, two unit IDs | Exact UTF16 spans and distinct units; legacy function source retention unchanged. |

R02 counts the existing statement and expression frames: block fixtures are
'{'.repeat(n)+'var x;'+'}'.repeat(n), and expression fixtures are
'('.repeat(n)+'1'+')'.repeat(n)+';'. The directive prefix is a preceding sibling,
not another nested frame. These are source-derived expectations to verify in
implementation, not executed evidence here. R04 exact source constructors are:

~~~js
'1' + '+1'.repeat(15000) + '+(function(){var tail;});'
'a' + '.x'.repeat(15000) + '[function(){var tail;}];'
'a' + '()'.repeat(15000) + '(function(){var tail;});'
~~~

These source strings are parsed, never run in P/H controls. Also test the plain
15000-chain neighbors without a terminal function. For D2 H drivers read two
post-compilation inputs (x renamed seed/other, marker payload7/11); keep literal
expected descriptors/order. Marker equality is never a claim about f() execution.

## Ordered assignments and preservation

Recommend TS033D1, declaration plans only, after independent design acceptance.
Own src/script-declarations.ts (flat types/collection/checks), minimal parser.ts
purpose/span/var path, syntax.ts var variant, evaluator.ts and script-metadata.ts
unreachable-var invariant arms only. A shared internal prologue helper may be
extracted without behavior change. Own additive test/script-declarations.ts,
fixtures/script-declarations/, one additive tools/build-native.mjs gate,
dedicated evidence, TASKS and feature-scope. No Realm/GlobalEnvironment/runtime/
interpreter/observation semantics edits. Run every P projection G01–G16,
L01–L10,T01–T02,R01–R05, including successful parses of H runtime-conflict cases;
H/F remain unexecuted. No materializer/orchestration in D1.

Only after D1 review, D2 global orchestration controls: new internal
src/script-global-declarations.ts, additive host driver/fixtures/gate/evidence.
Use unchanged global primitives and test-local marker materializer. Run H
G01–G16 with neighbors, descriptor flags, faults and resource prefixes; assert
zero initializer/body/call effects. No evaluateScript/observation export, no
function/block execution. Pure selection belongs with declaration plans.

D3/P4 needs a new frozen assignment for executable records, real factories,
local environments/References, block/FDI, context/this/completions and guard
replacement. D2 does not authorize it. Arguments/naming/full grammar/Error/
harness prerequisites stay explicit. No automatic successor or main merge.

| Legacy area | Required unchanged verification |
|---|---|
| parse/audit | Same body/first error/rejection/return certification. Var/lists/repeated functions still rejected in legacy. |
| inspectScript | 136 baseline comparisons,42 literal controls,8 deep-chain controls per lane, strictness/sibling/source ranges unchanged. |
| evaluator | Legacy Map hoisting/TDZ/formals/closures, completion values, Reference timing, resource counts and Realm restoration.212 exact inherited guest records per lane. |
| globals/bootstrap | TS033B15 rows/two inputs and TS033C B01–B18/two inputs per lane; guards/direct invokes/.global host seeds/descriptors unchanged. |
| runtime/intrinsics | Existing function source, object/symbol conversion, coercion/callback paths; no new factories/globals. |
| build/toolchain | All40 old static-only builds/separately parsed zero-dynamic gates; additive gate per slice. No pin/workaround changes without review. |
| host/protocol/admission | typecheck, runner20, probes10, host73, observation16; unchanged schema/driver/default profile/ledger/denominator, all60 variants blocked. |
| ownership/history | C++, historical evidence, manifests and Claude CL006 untouched. COORDINATION belongs to coordinator. |

This design audit checks source preservation and blocker classification only.
212/40 are inherited from accepted TS033C evidence, not rerun. Implementation
acceptance requires rebuilt Node/native lanes and all listed controls. Source
inspection cannot establish scriptc static coverage or semantics. Retain failed
compiler/environment evidence separately and stop after handoff for review.
