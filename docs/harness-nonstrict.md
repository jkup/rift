# TS-034H4-P: bounded internal non-strict Scripts

Design candidate, 2026-11-04; source baseline `677aa31`, incorporating accepted
H3 `98b8fc5`. Nothing in this document is an execution or admission claim.
The accompanying [audit](validation/ts-034h4-p/README.md) is executable source
and preservation evidence only. Implementation requires actual and independent
second review of this contract, including the nine-file interface amendment below.

## Boundary and recommended integration

Add `prepareBoundedScript(unit, realm): ScriptPreparation` to the internal record
facade. It derives all strictness from the exact source and enclosing syntax;
there is no host strictness override. Empty source is ready with false strictness
and normal undefined on evaluation. Keep `prepareStrictScript` on its existing
parser/planner path, with the same rejection precedence, diagnostics and snapshots.
Both return the same opaque branded record, execute in the existing Script
session, and retain the same private original-node associations. No AST/plan input,
new profile, CLI, observation, public harness execution, or `allowScript` flag.

H4 must integrate preparation, per-function metadata, FDI, this binding,
references and deletion atomically. A parser-only checkpoint may prove whole-source
coverage without exporting executable records; an isolated two-lane feasibility
probe may resolve a compiler issue. Neither authorizes partial non-strict execution.
Do not publish a preparation entry that succeeds while writes or calls still use
strict semantics. H5 construction, H6 genuine errors, H7 bundle validation and
later public admission remain blocked, separately assigned work.

## Source inventory and exact proposed ownership

`audit.json` retains line-numbered strict/guard/reference/callsite inventories of
every tracked production source and a separate old-test inventory. The table
below is the reviewed semantic interpretation; a textual match is not proof of
either correctness or a required edit. Paths are relative to ``.

| File / actual API or callsite | Current assumption; proposed change |
|---|---|
| `src/script-execution-internal.ts`: `ExecutableScript.prepare`, `#function`, `#block`, `materializeFunction`, `createFunctionEnvironment`, `instantiateFunction`, `instantiateGlobals` | Root, function and block strict-only gates. Add a private preparation-policy selection reached by the two fixed entries; keep brand/source/scope/environment validation. Store immutable source-derived strictness in CallableState; verify exact equality with scope/function metadata instead of truthiness. Support non-strict blocks with no Annex B function declarations. FDI/this changes below. |
| same: `ScriptGuestCallable.strict/thisMode`, `ScriptFrameSnapshot`, `inspectScript`, `runScript`, `#callScript` | Literal true/strict metadata becomes boolean / `strict \| global`; snapshot actual frame values. Root from plan, callee from callable, never from caller. Builtin frames retain calling code strictness/provenance while using builtin Realm, as today. |
| same: `#reference`, `#get`, `#put`, `#delete`, unary delete, `#expression` assignment/compound/postfix, `#scriptStatement` var initializer, `call` | Capture active code strictness at **both** resolveScriptBinding callsites (identifier reference and var initializer) and on property references; dispatch identifier deletion only in internal non-strict mode. Preserve receiver/key caching, call/argument order and legacy branches. |
| `src/script-record.ts` | Re-export only the additional `prepareBoundedScript`; retain opaque types and strict entry. No session API migration. |
| `src/parser.ts`: `parseDeclarationPlan`, `Parser` constructor/purpose, unary delete | Add distinct `parseBoundedScriptDeclarationPlan(unit,nodes=null)` using the same lexer/parser. Existing entry unchanged. New private purpose shares all declaration-plan grammar (including H1–H3), permits identifier-delete syntax for collector validation; no alternate grammar/recovery. |
| `src/script-declarations.ts`: collector constructor, `collectDeclarationPlan`, expression work and final catch validation | New internal policy defaulting to existing behavior; collect identifier-delete sites with their actual scope, reject strict sites before record creation using existing unsupported `parse.delete-identifier`, original message/location. In bounded policy permit simple non-strict catch only when all existing catch conflicts are absent. Keep Annex B block functions and catch-var collisions unsupported. Existing public `planScriptDeclarations` unchanged. |
| `src/script-environment.ts`: `ScriptBindingReference`, `resolveScriptBinding`, `getScriptBinding`, `putScriptBinding` | `strict: boolean`; add final `strict=true` parameter to resolver so old callers remain strict. Pass captured flag to global get/set. Null base write in non-strict code uses current restored execution Realm's global object, with Set(false), without re-resolution. Add `deleteScriptBinding(reference,context)` for captured non-strict references. |
| `src/global-environment.ts`: `getBindingValue`, `setMutableBinding`, private object operations | Add final `strict=true` parameter to public get/set, forward to existing object operations; missing object binding read returns undefined only when false. Add `deleteBinding(name,context,loc)` returning InternalBooleanCompletion: lexical false, otherwise ordinary global object's internalDelete. Add `setUnresolvableBinding(name,value,context,loc)` using `setObjectProperty(...,false)` directly, bypassing composite lexical lookup. Existing StrictGlobalReference APIs stay unchanged. |
| `src/runtime.ts`: property arm of `Reference`, `putValue` | Add optional readonly `strict?: boolean` to property reference only; omitted means true, preserving every legacy/manual reference. Only failed internalSet result changes: throw iff strict is not false, otherwise return assigned value. No swallowing abrupt completion; no environment-reference change here. |
| `src/delete-reference.ts`: `deleteReference` | Use same captured property flag: false internalDelete returns boolean false in non-strict code, strict TypeError unchanged. True returns true; abrupt unchanged. Preserve ToObject then ToPropertyKey order. |
| `src/script-global-declarations.ts`: `instantiateGlobalDeclarations` | Keep existing strict wrapper and exact `strict declaration plan required` guard. Extract its current algorithm into a private common routine; add internal `instantiateBoundedGlobalDeclarations` with identical profile/index/association checks but no strict-only gate. Record calls it only after complete bounded preparation. No plan flag can enable body execution. |

These **nine existing production files** supersede the tentative six-file H4
list, subject to coordinator review. No new `src/script-reference.ts` is needed:
that file does not exist, and splitting/copying the current reference algorithms
would add an unnecessary second implementation. `realm.ts` needs no edit: its
guarded factories already allocate boxes in the supplied Realm and do not require
strict metadata. Do not edit additional exhaustive consumers opportunistically;
retain any failure and request an exact amendment.

Read-only dependencies reviewed: `script-prologue.ts` raw exact directive scanning;
`script-metadata.ts` legacy inspection; `syntax.ts` existing unary AST;
`lexer.ts` source/depth/escape/operator restrictions; `script-completion.ts`
UpdateEmpty; `object-conversion.ts` hook-free/tick-free ToObject;
`primitive-objects.ts`, `primitive-conversion.ts`, `conversion.ts` wrappers and
coercion; `builtins/function.ts` call forwarding/toString; `builtins/restricted-function.ts`
prototype accessors; `realm.ts` profile/capability/permit checks;
`interpreter.ts`, `observation.ts`, `evaluator.ts` legacy wrappers; all other
builtins, host drivers, runtime Callable/OperationContext consumers and exports.
No runtime operation may obtain authority merely by selecting false strictness.

## Preparation and unsupported source

Run full unchanged source through the shared lexer/parser and iterative scope
collector. Exact quotes, preceding directives, escaped/parenthesized/late strings,
sibling isolation, nested own/inherited strictness and source offsets keep their
existing interpretation. `"x";"use strict";` is strict; `( "use strict" );` and
`;"use strict";` are non-strict. No ASI or new escape support. An inner own strict
directive changes that function and descendants, never the outer function or a
sibling. Record validation checks this relation, source text identity, original
node/body identity, scope parent and private activation identity in both modes.

Every current parser `purpose === "declaration-plan"` / `!==` gate is inventoried:
centralize a private structural-plan predicate for old and bounded purposes so
var, H1/H2/H3, duplicate/conflict collection and binding-site retention cannot
diverge. Only bounded-purpose identifier delete and collector catch policy differ;
legacy/return-audit purposes remain false. This predicate grants grammar coverage,
never execution authority.

New bounded parsing temporarily retains identifier-delete nodes, including
parenthesized identifiers, then validates each against the collector's inherited
scope strictness after complete grammar coverage. Strict sites block with the
existing unsupported category, never a new certified syntax-error rule. An
unsupported tail wins over this deferred mode validation. The old strict entry
continues to reject at the original parser site, so its first error is unchanged.

Duplicate formals, `arguments`/`eval` identifiers or bindings, direct/indirect eval,
with, named function expressions, defaults/rest/destructuring,
arrow/class/generator/async/module, new/instanceof, const, lexical for/in/of,
prefix/decrement/BigInt, optional/destructured catch, finally, Annex B block/switch
functions and catch-var binding exceptions remain unsupported before a record.
Property names `o.arguments` and `o.eval` remain legal property keys: rejecting
those would change current grammar. Duplicate var/function declarations already
supported keep last-function-wins behavior; “duplicates excluded” means the
unsupported duplicate-formal/lexical/conflict cases, not removing valid var repeats.
No dormant unsupported nested function can escape the whole-source gate.

## Calls, FDI and metadata

`ScriptGuestCallable.strict` is its own parsed function strictness;
`thisMode` is strict when true, global otherwise. Capture this in private state
at materialization. Object/function identity, defining Realm, source unit,
source slice, scope and lexical capture cannot be forged through inspection.
Root this remains its Realm globalThis in either mode.

On guest call, validate profile/call limits as today, install the callee Realm and
callee source frame, then perform the existing function-allocation tick. Only
after that successful tick bind this: strict preserves the exact supplied Value;
global mode substitutes defining Realm globalThis for null/undefined, preserves
objects, and uses existing ToObject in the defining Realm for boolean/number/string/
symbol. No coercion hook or additional boxing tick; wrappers are fresh per call.
The environment and frame must both receive the bound value, not the raw receiver.
Caller strictness affects references in caller code, never this conversion.
Builtin Function.call forwards raw receiver; it does not do a second conversion.

FDI retains reverse winner selection, formal creation/initialization, distinct
var creation and exact setup ticks. For a non-strict function, after vars and
before lexicals, consume **one new tick at the function node location**, then
allocate `ScriptDeclarativeEnvironment(variableEnvironment)` even with zero
lexicals. Strict functions reuse their activation as before, with no new tick.
Create lexical bindings in this lexEnv; initialize function winners in varEnv
but capture lexEnv, including TDZ. Store the body environment privately in
FunctionActivation. Add `record.functionBodyEnvironment(environment)` which
checks the original brand/key and completed phase before returning that stored
environment to the engine. `instantiateFunction` keeps its ValueCompletion API.
Only completed activation publishes the body lexical environment; failure cannot
be retried or execute a body. Frame variable remains the FunctionActivation;
frame lexical becomes the completed body environment. Missing implicit arguments
remains an explicit profile exclusion, not a claim of full FDI support.

Functions retain name/length W=false E=false C=true, own prototype W=true E=false
C=false, prototype.constructor W=true E=false C=true, correct inferred-name sites
and exact original toString source. No own caller/arguments properties are added
in either mode. Both inherit the existing Realm-specific Function.prototype
throwing accessors (get=set, E=false C=true); %ThrowTypeError% stays non-extensible
with frozen name/length. Choose this standard minimal behavior rather than optional
legacy caller introspection. An ordinary own configurable data property can still
shadow an inherited configurable accessor through the existing host descriptor
API; ordinary assignment cannot bypass its throwing setter. Do not mistake missing
arguments binding support for missing restricted property semantics.

## References and global behavior

Capture code strictness and base once, before RHS, key hooks or nested calls.
Identifiers have undefined call receiver (ObjectEnvironment WithBaseObject remains
undefined). Same captured reference is used by assignment/compound/postfix; a
successful key conversion is cached, no descriptor/setter is cached. For failed
ordinary Set, strict throws TypeError, non-strict completes with assigned RHS;
postfix returns old numeric value despite a silent failed write. Setter/key
coercion/ToNumber abrupt completions remain abrupt in both modes. Symbol numeric
conversion still fails; no BigInt expansion. Primitive property writes retain the
primitive Receiver, including setter dispatch; this-binding boxing is a separate
operation and must not alter property-reference Receiver behavior.

Unresolvable Get always throws except the existing direct typeof exception.
Unresolvable strict Put throws even if RHS creates that name. Non-strict Put
performs Set(false) on the active code Realm's global object, without re-resolving
the name through lexicals. A fresh successful ordinary property is W/E/C all true;
nonextensible or nonwritable failures are silent. A newly installed accessor is
called, and its abrupt completion propagates. Captured resolved object binding
deleted during RHS gets strict ReferenceError versus non-strict recreation; a
captured lexical binding continues to win over a newly added global property.
The extra get/set strict parameter also covers host-level captured object binding
read after deletion: strict error/non-strict undefined. TDZ never becomes undefined.

Non-strict delete identifier: unresolved true; function/local/global lexical
binding false without GetValue (including TDZ); global object binding delegates
internalDelete. Declared var/function properties are nonconfigurable, thus false;
assignment-created property is configurable, thus true. An inherited global
property delete returns true and leaves the prototype property visible. Property
delete never calls the final getter; false becomes strict TypeError or non-strict
false. Key/nullish ordering remains unchanged. Strict identifier delete is blocked
before record. Deleting a non-reference evaluates its operand then returns true.

Global declaration attributes/order are independent of strictness: fresh var and
function W/E=true C=false; repeat var preserves value; allowed nonconfigurable
function replacement preserves flags; lexical/global conflict and nonextensible
prechecks precede publication. No rollback is invented after resource interruption.
No obsolete VarNames list or exotic global/proxy support is added.

## Literal acceptance matrix (future, unexecuted)

Every row uses a fresh Script Realm unless ordered units are explicit. `out`
records exact Values through a trusted guarded builtin, with no ticks of its own.
Host descriptor/identity inspection does not imply guest reflection/new support.
Sources use the new bounded entry unless a row names the strict/legacy path.

| ID | Literal source / setup | Required result |
|---|---|---|
| M01 | `function f(){return this;} out(f()===this);` | true; f.strict=false, thisMode=global |
| M02 | `function f(){"use strict";return this;}out(f());` | undefined; f.strict=true |
| M03 | H unit `function f(){return this;}` then T unit `"use strict";out(f()===this);` | true, distinct original H/T source identities |
| M04 | H `"use strict";function f(){return this;}` then T `out(f());` | undefined |
| M05 | `function f(){return this;}out(f.call(null)===this);out(f.call(undefined)===this);` | true,true |
| M06 | `function f(){"use strict";return this;}out(f.call(null));out(f.call(3));` | null,number3 |
| M07 | `function f(){return this;}out(f.call(3));out(f.call(3));` | two distinct Number boxes, payload3, defining numberPrototype |
| M08 | same f, host calls with false, empty string, canonical Symbol, object o | Boolean/String/Symbol boxes with exact payload and defining prototypes; object result exactly o |
| M09 | A defines M01 f, B receives f; B `"use strict";out(f());out(f.call(3));` | A globalThis then A Number box, not B; restore B frame/Realm |
| M10 | `function f(){function g(){return x;}let x=7;return g;}out(f()());` | 7; g captures distinct sloppy lexEnv above varEnv |
| M11 | `function f(a){var a;function a(){return 9;}return a();}out(f(7));` | 9; FDI winner/parameter order preserved |
| M12 | `function f(){return g();let x=7;function g(){return x;}}f();` | TDZ ReferenceError from g, never undefined |
| M13 | `function f(){"use strict";return function(){return this;};}out(f()());function g(){return this;}out(g()===this);` | undefined,true; inherited strictness and sibling isolation |
| M14 | `try{throw 7;}catch(e){out(e);}` | 7; H1 identity/consumption semantics in non-strict scopes |
| M15 | `var i=0;for(;i<2;i++){switch(i){case 0:continue;default:out(i);}}out(i);` | 1,2; H2/H3 behavior unchanged |
| R01 | host o.p=1 W=false; `out(o.p=7);out(o.p);` and strict-prefixed twin | 7,1 versus TypeError before out |
| R02 | same o; `out(o.p++);out(o.p);` and strict twin | 1,1 versus TypeError; numeric conversion still once |
| R03 | no ghost; `out(ghost=7);out(this.ghost);` and strict twin | 7,7 with W/E/C=true versus ReferenceError/no property |
| R04 | no ghost; `ghost=seed();` seed defines W=false global ghost=1 and returns7 | sloppy normal7, ghost1; strict ReferenceError regardless of new property |
| R05 | global x configurable1; `x=zap();` zap deletes x, returns7 | sloppy recreate7 W/E/C=true; strict ReferenceError |
| R06 | global lexical x=1 and object x=9; `x=7;out(x);out(this.x);` | 7,9 in both modes; lexical precedence |
| R07 | nonextensible global; `out(ghost=7);` | 7, no property; strict twin ReferenceError |
| R08 | `out(missing);`, `out(typeof missing);`, `out(x);let x;` | ReferenceError, string undefined, TDZ ReferenceError respectively |
| R09 | `out(delete missing);var x;out(delete x);let y;out(delete y);ghost=7;out(delete ghost);` | true,false,false,true; global x remains undefined/nonconfigurable |
| R10 | `out(delete x);let x;` | false with no TDZ Get; strict twin blocked before record |
| R11 | host o.p nonconfigurable with getter recording G; `out(delete o.p);` | false, no G; strict twin TypeError, no G |
| R12 | host inherited global p=1; `out(delete p);out(p);` | true,1; prototype untouched |
| R13 | `out(delete (out(7)));` | 7,true; non-reference evaluation retained |
| R14 | host o[k] setter throws exact guest sentinel; `o[k]=rhs();` | trace RHS,K,S; exact sentinel, same loc/Value/completion in either mode; resource ticks K unchanged |
| R15 | host accessor o.p Get returns number1; key hook K; `out(o[k]++);` | K,G,S2,out1; captured receiver/key once, no descriptor caching |
| R16 | `out((3).x=7);` | 7 with no persistent property; strict twin TypeError; inherited setter variant sees primitive3 as receiver |
| D01 | `var x;function f(a){return a;}` in both modes | x/f W/E=true C=false; repeated var preserves seeded value |
| D02 | `function f(a){return a;}let g=(function(){});let o={m:function(){}};` | f/g/m exact name; length1/0/0; all function/prototype flags above; no own caller/arguments |
| D03 | same f; `f.caller;`, `f.arguments;`, `f.caller=7;` separately | inherited thrower produces engine TypeError even non-strict; no legacy introspection |
| D04 | A/B f and Function.prototype restricted descriptors | distinct throwers/prototypes per Realm; same getter/setter within Realm; exact flags and nonextensibility |
| D05 | `function f(){/*keep*/return this;}out(f.toString());` | exact `function f(){/*keep*/return this;}`; later host source/id mutation cannot change it |
| D06 | nonconfigurable W/E=true f seeded; new function declaration f | value replaced with flags preserved; W=false neighbor rejects before publication |
| X01 | `function f(){return this;}out(f.call(3));` host out reenters session B then returns | saved A frame/lexical/variable/this/strict/Realm restored exactly; monotonic per-session steps |
| X02 | A callback calls B sloppy g which throws exact preallocated guest completion | exact completion/Value/diagnostic; lastAbrupt B/g unit; restore A on return and idle after exit |
| X03 | nested session B host fault escapes into active A catch in host | exact host sentinel; no guest catch; B idle, A still active with original frame/permit, then A idle |
| X04 | A strict f called through sloppy B function and inverse | this per callee, failed reference writes per executing code; no inherited caller mode |
| X05 | retain context.call from completed session; invoke idle, wrong owner, forged record, wrong/replayed builtin tuple, cross-profile callable | same host guards, no ticks/effects/state publication; E4/E4-C guards fully retained |
| X06 | getter/setter/key hook nested A→B→A with different strictness | captured outer reference mode/base/key unchanged after return; exact abrupt provenance on each leg |
| X07 | guest throw caught then same completion returned later from another source | H1 C14 exact identity, final source is second site; lastAbrupt history not erased by catch |
| X08 | steps/calls/depth exhaustion inside sloppy call/catch and throwing host callback | resource bypasses catch; host faults escape; calls/depth/Realm/frames/permits restored in finally |

R17: host global x=1 W=false C=false; `var x=7;out(x);` gives1 in
non-strict code, strict twin TypeError before out. This tests the separate var
initializer resolver rather than only expression assignment. X08 call-limit
literal: prepare H `function f(){\nreturn f();\n}` with ample setup budget,
then T `f();` in a fresh tested session. maxCalls1 fails at H2:8 after6 ticks,
maxCalls64 fails at H2:8 after258 ticks (T statement/expression then4 ticks per
entered sloppy function: allocation, lexical allocation, return, recursive call).
Both have origin calls, count=limit, no output, no leaked frame/permit. Limits
0 and65 require the same `2+4*limit` formula within the inherited depth bound.
Preserve inherited exact evaluation-depth controls; do not increase limits to
hide a changed winner. Host fault `fault();` has two ticks before callback; a
try/catch wrapper cannot consume that host exception.

Negative matrix: N01 duplicate formals `function f(a,a){}`; N02
`function f(){return arguments;}`; N03 `eval('1');`; N04 `with(o){}`; N05
`{function f(){}}`; N06 `switch(1){case 1:function f(){}}`; N07
`try{}catch(e){var e;}`; N08 `try{}catch(e){let e;}`; N09
`function f(){"use strict";delete x;}`; N10 strict root `"use strict";delete x;`;
N11 `function f(){return 7;}const tail=0;`; N12 `out(9);function f(a=1){}`;
N13 `function f(){return 7;}new C();`; N14 `let x;var x;`; N15
`for(let i=0;;){}`; N16 over100000 UTF-16 units / parser depth128 boundary.
All produce no executable record, zero callbacks/materializations/global changes;
existing conflict versus unsupported versus resource category preserved. Also
test non-strict simple catch with distinct `var x` as positive neighbor of N07,
strict block function as positive neighbor of N05, and `o.arguments` positive
neighbor of N02. Repeat N09 with inherited strictness and `(delete (x))`.

## Resource traces, migration and acceptance

[prefixes.json](validation/ts-034h4-p/prefixes.json) freezes exact sources,
tick coordinates, phases and effect thresholds. For each N-tick trace run every
maxSteps=S+k, k=0..N, S=0 and S=7. Seed seven steps through successful prior units
in the **same session**, not by changing the limit or mutating counters. The
literal seed unit `1;1;1;;` contributes exactly seven ticks and no bindings. At k<N,
tick k+1 fails before its effect, steps=S+k+1, resource diagnostic at that exact
coordinate, phase from the trace; no later effect. At k=N, exact listed result
and steps=S+N. Failure in callee setup has ScriptEvaluation phase body (root already
entered body), but callee frame phase instantiation in callback inspection.
After each outcome session idle, calls/depth reset to entry values and Realm restored;
steps persist. Preserve partial successful declaration publication and source of
failure; never roll back. Host faults can only be injected through reachable
callbacks; label arbitrary host-helper injections separately.

Two actual post-compilation input files define sloppy f and call it on 7 versus11,
with expected defining-Realm Number boxes/value7 versus11 and top-level result7
versus11. Every lane also runs all fixed rows. Freeze source hashes before execution;
do not substitute markers for runtime source selection.

**Old-negative migration proposal: zero existing test edits.** Old APIs are kept
strict, including the host global-instantiation wrapper, so all existing negative
tests remain true. The executable inventory retains every strict/non-strict/guard
mention in test/fixtures/tools and historical executable evidence. In particular
`test/script-record.ts` P03 empty and `var x;`, E4's `prepareStrictScript` rejection,
`test/script-global-declarations.ts` nonstrict malformed-plan guard,
`test/harness-catch.ts` non-strict planning rejection and old delete-identifier
parser tests remain unchanged. Add corresponding positive cases through only
the new entry in a new `test/harness-nonstrict.ts`; no replacements or weakened
assertions. Historical replay scripts and their source hashes are immutable.

Future task ownership also needs additive fixtures `fixtures/harness-nonstrict/`,
one new native gate in `tools/build-native.mjs`, its own validation directory,
feature inventory and own TASKS entry. Coordinator owns COORDINATION. These are
proposals, not authority granted by this design-writing assignment.

Acceptance requires 212 exact old guest records per lane, all52 retained static
gates plus the new driver, static-only builds **and** independently parsed zero
dynamic coverage, both runtime sources, every matrix/prefix, H1 104/H2 208/H3 190
prefixes, E4 two inputs and17 inherited replays/Node boundary, runner20/probes10/
host73/observations22/typecheck, unchanged pins/history/C++, and60 blocked corpus
variants. Fresh native binary and two-lane assertions are mandatory; this design
audit does not count as any of those runs. Retain/reduce new compiler failures
before an implementation workaround or ownership change. Stop at coherent tested
commit for actual and independent second review, no successor or main merge.

## Pinned semantic evidence and decisions

ECMA-262 edition16 (2025), retrieved SHA256
`6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713`:
[OrdinaryCallBindThis](https://262.ecma-international.org/16.0/#sec-ordinarycallbindthis),
[FDI](https://262.ecma-international.org/16.0/#sec-functiondeclarationinstantiation),
[PutValue](https://262.ecma-international.org/16.0/#sec-putvalue),
[delete](https://262.ecma-international.org/16.0/#sec-delete-operator),
[Global Environment Records](https://262.ecma-international.org/16.0/#sec-global-environment-records).
These govern callee ownership, lexical/var separation, failed writes, binding
deletion and declaration attributes. Frozen excerpts live in upstream.json.

Relevant engine source: engine262 `d553e7b52501fbc47eae981c8d0fa7a5c26d0171`,
[function operations](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/function-operations.mts)
lines170–208 (receiver binding),393 onward (Strict/ThisMode),
[Environment](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/execution-context/Environment.mts)
lines565–610,728–782,962–988 (mode-bearing references and object/global binding
operations), and UnaryExpression lines24–75 (deletion). Adopt algorithm ordering
and mode separation, not its generator architecture or unsupported features.
Retained MIT license; no production code copied. Engine source is corroboration,
not an oracle or a claim that engine262 was run. The pinned edition governs any
revision difference (especially older global VarNames bookkeeping).
