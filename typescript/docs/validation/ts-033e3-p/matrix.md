# Literal proposed host controls

All rows are proposals, not executed outcomes. Run E3A/E3B drivers with runtime
inputs `seed|7` and `other|11`, in Node and freshly rebuilt native lanes. A/B are
distinct Script Realms; R/R2 are independently prepared records even with equal
unit id/text. Use exact Value/record/environment/throw identity assertions, not
only printed pass labels. Host contexts have throwing `call` sentinels: any
invocation is a failure. No source body or initializer is executed.

| ID | Literal input/action | Required observation |
|---|---|---|
| F01 | R in A: `"use strict";function f(a){return a;}`; scope1, global A, null name | M once at1:14; text `function f(a){return a;}`, range[13,37), formal[24,25), length1/name f; record R and Realm A |
| F02 | F01 twice | F1 != F2, P1 != P2; shared captured environment; F prototypes equal A.functionPrototype, P prototypes equal A.objectPrototype; constructor backlinks exact |
| F03 | F01 descriptor inspection | own keys length,name,prototype; length/name WEC001; prototype100; P constructor101; neither own caller nor arguments; both extensible |
| F04 | same source prepared in B | all new objects belong to B's prototype graph; no A intrinsic object reused |
| F05 | `"use strict";let x=(function(a){/*x*/return a;});` | anonymous scope source exactly `function(a){/*x*/return a;}`; null inferredName gives empty name, `x` gives x, both length1; name mutation does not alter source |
| F06 | mutate inspect()/inspectNodes()/inspectFormals()/inspectNamingSites() snapshots and original input unit | subsequent materialization/source/plan unchanged; no mutable AST/map/body API |
| F07 | legacy Realm wrapper; wrong Realm/context; foreign global or foreign-terminal local | host invariant throw, ticks0, no allocation or binding/property change |
| F08 | scope0, block scope, -1, 1.5, NaN, missing99; declaration with nonnull inferredName | host invariant throw, ticks0; an in-range scope in R always selects R's node, never R2's |
| F09 | fabricated script-guest structural payload or R2 callable supplied to R.createFunctionEnvironment | host invariant throw, ticks0; no accepted plan/node argument or raw callable constructor |
| F10 | M returns sentinel ThrowCompletion; separately M throws Error sentinel | original object escapes; no F/P/binding created; saved Realm/calls/depth unchanged, steps1 |
| F11 | legacy Evaluator.call with F; Script builtin direct invoke with arbitrary matching host context | cross-profile error for legacy call; `Script execution unavailable` for builtin; no call callback, counter increment, body or output |
| F12 | functionSourceString on legacy sourced/null-source, builtin and F | original legacy slices/native fallback preserved; builtin original name text preserved; F exact source; registered Script toString still closed |
| N01 | `"use strict";let x;x=function(){};x=(function(){});(x)=function(){};((x))=(function(){});` | inspectNamingSites eligible `[true,true,false,false]`; RHS anonymous eligible in all four; future names `[x,x,"",""]` |
| N02 | `"use strict";let x;(x=function(){});` | assignment eligible true despite outer parentheses; future function name x |
| N03 | `"use strict";let x;let y;x=(y=function(){});` | outer target eligible true but whole RHS is assignment, inner target true/function RHS; future inner name y, never overwritten with x |
| N04 | `"use strict";let x=function(){};var y=(function(){});let o={k:(function(){})};o.k=function(){};x=true?function(){}:function(){};` | private whole-node kinds distinguish direct functions from conditional; future names x,y,k,empty,empty; member target ineligible; host factory takes corresponding string/null, no expression execution |
| N05 | named expression/default/rest/arrow/method/computed-key neighbors, including in unreachable bodies | existing blocked outcomes unchanged; duplicate formal `function f(a,a){}` remains blocked, not setup |
| S01 | function fixture below; args `[7]`, receiver null | 18 ticks including A; a=7,b=undefined,x=undefined,z TDZ,g real closure; exact null receiver; arguments absent |
| S02 | same fixture with args `[7,11,99]` | a=7,b=11; extra99 creates no binding; all18 ticks unchanged |
| S03 | `"use strict";function f(a){var a;function a(){}function g(){}function a(){return 2;}}` | reverse selection chooses last a, winners in order g,a; parameter a overwritten by last-a closure; loser never materialized; var a never reinitialized to undefined |
| S04 | `"use strict";function f(){function g(){}function h(){}}` twice | siblings g/h capture same invocation environment; next invocation has fresh env/g/h/P identities; closures retain R and correct scope IDs |
| S05 | receiver undefined/null/number7/object O; outer local from another record in same A | exact receiver Value and outer accepted, no boxing/substitution; foreign B terminal rejected |
| S06 | setup reentry on complete or failed env; external fresh E2 env not registered by R | invariant throw before tick; no duplicate creation/retry after partial mutation |
| S07 | body let/formal/var collision, e.g. `"use strict";function f(a){let a;}` | preparation conflict; no callable/setup ticks; duplicate var declarations preserve first binding and tick all occurrences |
| B01 | block fixture below | exact6 ticks; g initialized before y created; g captures new block env; x/y TDZ |
| B02 | block helper never called (untaken-block projection) | zero ticks, bindings and allocations; this is host projection, actual untaken source execution reserved for E4 |
| B03 | repeat block entry with same outer, then nested block entry | distinct sibling block envs/functions; nested env.outer exact parent; unrelated registered scope cannot be substituted |
| G01 | D2 fixture below | original11 marker ticks unchanged; real adapter12 ticks with M at column29; l TDZ, f real F, x undefined |
| G02 | repeat G01 after host changes current globals (make f nonconfigurable nonwritable data) | fresh D2 admission fails before M; does not reuse cached success/F; original global property retained |
| G03 | mutate detached plan/unit/function copies; attempt wrong unit/context/environment/declaration via adapter validation controls | copies never used by production wrapper; private callback rejects any substituted identity before M; unchanged five-arg D2 signature |
| P01 | every failed tick prefix in all traces below, resource throw and host Error variants | exact identity/origin/location, prefix state, no later action; calls/depth/Realm unchanged, steps never restored |
| P02 | setup get/set operation abrupt via trusted host subclass where reachable | original completion propagated, no later action; never inject synthetic production callable or fake AST; if brand forbids subclass injection use tick boundary instead and distinguish coverage |
| P03 | exhaustion after previous successful setup, independent new env in same context | next tick fails monotonically; new helper does not reset budget; separate host context starts independent counter |

## Exact prefix oracle

An action at tick k happens only when tick k succeeds. For every trace of N ticks,
test successful budgets0..N: budgets below N return the same supplied throw at
attempt budget+1 and retain the state after exactly budget actions. Also inject
the same host Error instance at each attempted tick1..N. Resource records carry
attempt count, supplied limit, and the exact location listed below. Compare full
binding presence/TDZ/value and allocation/publication state, not just tick count.
No helper changes active frame; retain a nonzero saved calls=2/depth=3 control.

Function fixture:
`"use strict";function f(a,b){var a;var x;function g(){}let z;}`.
Literal line1 tick columns are
`14,51,40,34,25,27,25,27,34,40,40,40,51,51,51,60,42,51`.
These traces start with a previously materialized callable and a fresh host
budget context; they do not include that earlier factory's M. No helper resets
any existing context. Tick1 allocation failure returns no environment; failures
after tick1 leave the allocated environment available to the host inspector.

| Tick | Action | State change after success |
|---|---|---|
| 1 | A(f keyword) | fresh env allocated, no bindings |
| 2 | S(g declaration) | no binding change; g selected |
| 3 | S(x declaration) | no binding change |
| 4 | S(a var) | no binding change |
| 5 | C(a formal) | a TDZ |
| 6 | C(b formal) | b TDZ |
| 7 | I(a formal) | a=7 |
| 8 | I(b formal) | b=undefined |
| 9 | V(a var) | skip existing parameter |
| 10 | V(x var) | x selected for creation |
| 11 | C(x var) | x TDZ |
| 12 | I(x var) | x=undefined |
| 13 | V(g declaration) | g selected for creation |
| 14 | C(g declaration) | g TDZ |
| 15 | I(g declaration) | g=undefined |
| 16 | L(z let) | z TDZ |
| 17 | M(g keyword) | fresh F/P allocated, g still undefined |
| 18 | W(g declaration) | g=F |

Block fixture: `"use strict";{let x;function g(){}let y;}`.
Trace `A(block),L(x),L(g),M(g),I(g),L(y)`; after success prefixes respectively:
empty env; x TDZ; x/g TDZ; F/P allocated with g TDZ; g=F and y absent;
y TDZ. Failure at I retains allocated closure but uninitialized g.
Literal line1 columns: `14,19,30,21,30,39`.

D2 fixture: `"use strict"; let l; var x; function f(){}`.
Trace columns `19,26,38,38,26,26,38,19,38,29,38,26`, all line1.
Prefixes0..7 no bindings/allocation;8 l TDZ;9 same;10 F/P allocated and
f absent;11 f=F;12 x=undefined. Existing marker sample still has11 ticks.

The checked numeric column arrays for function and block fixtures are retained
in audit.json. They are calculated solely from literal source offsets here, not
obtained by running Rift. Implementation must assert these literal arrays.
