# Literal acceptance matrix (proposed, not executed)

All rows are requirements derived from audited source/specification. None is a
passing guest/native test in this assignment. P=E1 record controls; H=E2/E3
host-only controls; X=E4 future internal execution. Stage labels below are
internal phases, not new observation protocol fields. Literal source cells are
complete source including the directive unless explicitly marked no-prefix.
Host controls are trusted controls, not guest syntax or exotic-global support.
Unqualified errors are internal engine-diagnostic completions, not Error objects
or Test262 negative matches. A final normal number/string means a guest Value.

| ID | Stage/slice and literal source or host setup | Literal expectation and nearest negative/control |
|---|---|---|
| P01 | P: `"use strict";function f(a){return a;}` in Script Realm A, unit `A:0` | Complete record, strict=true, source length37; f full range[13,37), formal a[24,25), source text exactly `function f(a){return a;}`. Copy input/snapshot sites and mutate copies: record unchanged. Realm B is a different owner even with equal text. |
| P02 | P: `"use strict";var x; function f(){const tail=0;}` | Whole-source unsupported; no record/partial executable body. Remove `const tail=0;`: eligible. Same-unit lexical-var conflict `"use strict";let x;var x;` gives conflict/no record, not runtime. |
| P03 | P: empty source, zero UTF16 units; neighbor `"use strict";` | Empty complete plan strict=false but prepare returns profile rejection, no runtime phase/body/ticks. Neighbor eligible; X normal string `use strict`, not undefined. |
| P04 | P: `"use strict";let f=function(){return 1;};let g=function(){return 2;};` | Two distinct function nodes/scopes linked to one record; both inherited strict; no function-name lookup collision. Same text in unit `A:1` has separate record/unit identity. |
| P05 | P: `"use strict";let x;let x;const tail=0;` | Unsupported tail vetoes conflict/record. Tail-free neighbor conflicts. No new observation certification. Hand-built mismatched plan/node IDs cannot construct an executable record. |
| G01 | X: `"use strict";let x=1;this.x;` then unit `"use strict";x;` | First normal undefined; second1. Persistent lexical x initialized1, no own global x. `var x=1` neighbor creates own x W/E/C=true/true/false. |
| G02 | X: `"use strict";var x=1,y=x,z;var x;x+y;` | normal2; own x1,y1,z undefined, each W/E/C=true/true/false. No later var resets x. |
| G03 | X: `"use strict";f();function f(){return 1;}function g(){}function f(){return 2;}` | normal2; D2 checks f then g, creates g then last f; declaration statements empty. Global f equals this.f. Factory produces genuine script-guest functions. |
| G04 | X: A `"use strict";let x=1;`; B `"use strict";this.effect=9;var x;` | B runtime instantiation SyntaxError, body=false; x stays1, effect absent. Neighbor var y succeeds and effect9. |
| G05 | X: A `"use strict";var x=1;`; B `"use strict";let y=2;let x;` | B instantiation SyntaxError; y absent; x own1 unchanged. B `let z=2` neighbor succeeds. |
| G06 | X: A `"use strict";this.x=1;`; B `"use strict";let x=2;x+this.x;` | normal3; own x1 remains configurable; lexical x2. Own nonconfigurable host x neighbor rejects B before initialization. |
| G07 | H/X: ordinary global own p7 W=true,E=false,C=false; `"use strict";function p(){return 2;}` | TypeError, p7/flags unchanged, factory not called. E=true neighbor succeeds; new f descriptor true/true/false. Replay all8 descriptor triples from D2, not just these examples. |
| G08 | H/X: nonextensible ordinary global; `"use strict";this.effect=9;var fresh;` | Instantiation TypeError, no body/effect/fresh. Existing own writable fresh7 neighbor retains7 at instantiation. Lexical-only `"use strict";let fresh=2;fresh;` succeeds2. |
| L01 | X: `"use strict";let x=x;` | Runtime body ReferenceError at RHS x; x remains TDZ. Later `"use strict";typeof x;` still throws, not string undefined. |
| L02 | X: `"use strict";function f(){return x;}f();let x=1;` | Runtime body ReferenceError via captured global TDZ; x not initialized; callable f retained. Move `let x=1;` before f call gives1. |
| L03 | X: `"use strict";function f(a){var a;return a;}f(7);` | normal7; missing-argument call f() gives undefined. Var declaration does not overwrite parameter. |
| L04 | X: `"use strict";function f(a){var a;function a(){return 2;}return a();}f(7);` | normal2, winning function overwrites formal after lexical setup; `let a` direct body neighbor is parse conflict. |
| L05 | X: `"use strict";if(false){var x=1;}x;` | normal undefined with own x nonconfigurable; no initializer effect. `if(false){let y=1;}typeof y;` gives string undefined and no y lexical. |
| L06 | X: `"use strict";var x=1;{let x=2;var y=x;}x+y;` | normal3; global x1,y2. Initializer RHS reads nearer block x. `{let x;{var x=3;}}` neighbor is parse conflict; do not use it as an executable reference-timing test. Captured LHS ordering is covered by T02/T03/T05. |
| L07 | H: block plan for `"use strict";{function f(){}let x;function g(){}}` | Trace create f, materialize f, initialize f, create x, create g, materialize g, initialize g. x TDZ. Fault at materialize f leaves only f TDZ, no x/g; exact guest throw or host sentinel propagated. Synthetic fault controls do not execute bodies. |
| L08 | X: `"use strict";let a;let b;let i=0;while(i<2){let x=i;function f(){return x;}if(i===0){a=f;}else{b=f;}i+=1;}a()+b();` | normal1, a!==b; a returns0/b returns1; distinct per-entry block captures. |
| L09 | X: `"use strict";{function f(){return x;}let x=1;this.saved=f;}this.saved();` | normal1; no global f binding, global saved property explicitly assigned. Move call before let initializer: TDZ failure. |
| L10 | P: `"use strict";function f(){return arguments;}` / `"use strict";eval("1");` | Both unsupported, including unreachable function body; no record. `"use strict";let o={arguments:1};o.arguments;` is ordinary property access, X1, and does not justify arguments-object support. |
| T01 | X: `"use strict";function f(){return this;}this.top=this;this.bare=f();this.method=this.f();` | top/method same Realm global object; bare exact undefined. Host calls f with3/null preserve exact3/null. No caller-strictness inference. |
| T02 | X: `"use strict";missing=(this.missing=5);` | Resolve null before RHS; runtime ReferenceError after own configurable missing5 created. Must not resolve again into new property. Neighbor existing missing7 before entry ends5 normally. |
| T03 | H: local outer x1, inner x TDZ; resolve x, then initialize inner x2 before Put3 | Reference base is inner; Put changes inner to3, outer remains1. Captured null y then create outer y7 still throws on Put9; y7 remains. Captured strictness is true even if active frame later changes. |
| T04 | H: resolve global inherited x7 then remove prototype x before Put9 | Captured global base retained; GlobalEnvironment rechecks presence and strict Set throws ReferenceError. Contrast T02 null base: no global operation is attempted after RHS. Original abrupt HasBinding propagates without RHS. |
| T05 | X: `"use strict";let x=1;x+=(x=3);x;` | normal4 (old Get1 before RHS3). Unresolved `missing+=(this.missing=5)` fails at Get before RHS; property absent. Replay accepted property-key/coercion cases unchanged. |
| F01 | H/X: `"use strict";function f(a,b){}f;` in A | f [[Prototype]]=A.functionPrototype; name f,length2 W/E/C=false/false/true. f.prototype W/E/C=true/false/false; fresh proto inherits A.objectPrototype; proto.constructor=f true/false/true. Different materialization gives different f/proto. No construct execution claim. |
| F02 | X: `"use strict";var a=function(){};let b=function(){};let c;c=function(){};let o={p:function(){}};` | names a,b,c,p respectively, length0; `o.q=function(){}` gives name empty; `let d=true?function(){}:0` gives name empty. Named expression `function named(){}` still rejected by parser. |
| F03 | H/X: retain P01 f after parser lifetime and another unit, transfer A f to B | exact toString `function f(a){return a;}`, unit A:0, defining Realm A and parameter/body mapping retained. Detached projection mutation cannot change source or callable. Cross-profile transfer/invoke still host error. |
| F04 | ER H: fresh Script Realm A Function.prototype and E3 strict f; repeat Realm B | Prototype own caller/arguments are accessor descriptors, get=set=A thrower for both, E=false,C=true, no value/writable. f has neither own property; B thrower differs from A. Thrower nonextensible, own name empty/length0 each W/E/C=false/false/false. This is descriptor inspection while invokes stay closed. |
| F05 | E4 X, separate fresh units: `"use strict";function f(){}f.arguments;` / `"use strict";function f(){}f.caller;` / `"use strict";function f(){}f["arg"+"uments"];` / `"use strict";function f(){}let k="caller";f[k];` | Each invokes inherited getter and throws TypeError at body stage; no own caller/arguments appears. Not undefined and not unsupported syntax. `typeof f.arguments` also throws; identifier typeof bypass does not apply. No genuine Error-constructor claim until that prerequisite exists. |
| F06 | E4 X, fresh unit for each target f.arguments, f.caller, f["arg"+"uments"], f[k] with k="caller": `"use strict";function f(){}let k="caller";f[k]=(this.effect=7);` | All four simple assignments evaluate RHS (effect7), then inherited setter throws TypeError, no own target property. For `f[k]+=(this.effect=7)` getter throws before RHS, effect absent. Literal target substitution is fixture construction, not reuse of a failed Realm. |
| F07 | E4 X: `"use strict";let o={arguments:1,caller:2};o["arg"+"uments"]=7;o.caller=11;o.arguments+o["caller"];` | normal18; both ordinary own data properties W/E/C=true/true/true. Missing ordinary `let o={};o.arguments;` prefixed strict returns undefined. Equal key strings must not trigger global name poisoning. |
| F08 | ER H/E4 X: fresh strict f inherits A restricted prototype; host delete A prototype arguments, then semantic read/write f.arguments=7; separate fresh setup host defines own f.caller=11 W/E/C=true/true/true | Deleted inherited property gives undefined read and successful own data7 write; explicit own caller11 shadows inherited accessor and can become7. Fresh f before host edits has no own restricted properties. Configurable=true is real, not permanently hard-coded throwing. Restore fresh Realm per control; descriptors-only H does not invoke closed Script builtins. |
| F09 | ER H/E4 X: transfer A strict f to Script B; in B read computed f["caller"], then separate control write f["arguments"]=7 | Uses A's inherited accessor/thrower; original receiver is f; thrower Realm A and caller B frame/source/calls/depth restored, shared steps retained. Host generic accessor controls record receiver/get/set arguments and exact guest/host abrupt identity; source thrower controls run only after atomic E4. Test zero remaining call/step budget as resource-origin failure, not TypeError matching. |
| C01 | X: `"use strict";1;let x;` | normal1; `"use strict";1;void 0;` normal undefined (present value). |
| C02 | X: `"use strict";1;{2;} ;` / `"use strict";1;{};` | normal2 / normal1. Block empty is not undefined. |
| C03 | X: `"use strict";1;if(false){2;}` / `"use strict";1;if(true){;}` | Both normal undefined; if UpdateEmpty is required even for taken empty branch. |
| C04 | X: `"use strict";let x=0;while(x<2){x+=1;x;}` | normal2; zero-iteration `while(false){2;}` returns undefined. |
| C05 | X: `"use strict";while(true){2;break;}` / `"use strict";while(true){2;if(true){break;}}` | normal2 / normal undefined: inner if supplies undefined before loop consumes break. |
| C06 | X: `"use strict";let x=0;while(x<2){x+=1;7;continue;}` | normal7; continue carries list value through loop. `function f(){7;}f();` prefixed strict gives undefined; `function f(){return 7;}f();` gives7. |
| C07 | H: empty statement list; normalize at internal Script boundary | List normal-empty; normalization normal-undefined; no source entry/profile bypass. UpdateEmpty on throw7 returns original throw object, on return undefined retains present undefined. |
| R01 | X/H: A `"use strict";function f(){return {};}`; transfer f to B and call | Returned object prototype is A.objectPrototype, never B's; B frame/Realm/source/lexical/variable/this identities restored. |
| R02 | X/H: A `"use strict";function f(){throw 7;}` invoked by B; repeat via authorized A builtin callback throwing host sentinel | Exact guest throw/value/origin/location or same host sentinel; caller saved nonzero calls/depth restored, no leaked source/Realm; steps retained. Repeat at GDI/factory/block/FDI entry faults and normal return. |
| R03 | X: `"use strict";function f(){return f();}f();` with default calls64 | Resource-origin calls guard, no native crash, caller counters/frame restored. Configured calls0 fails before callee entry; do not invent native step totals before measuring reviewed placement. |
| R04 | X: `"use strict";while(true){}` with steps budget20; fresh session `"use strict";1;` | First steps resource at count21, origin resource-limit; second normal1. Reuse exhausted first session must fail, not reset. |
| R05 | H/X: D2 literal `"use strict";let l;var x;function f(){}` | Retain exact D2 eleven-tick marker trace for budgets7–11. Real factory adds declared ticks: derive/freeze new literal prefix table before E3 acceptance, assert every prefix/locations and no rollback, not an eleven-tick real-function claim. |
| R06 | P/H: source `"use strict";` plus99987 spaces; plus one extra space neighbor | 100000 units eligible;100001 source-size resource. Replay accepted block/parenthesis depths126/127/128/129 and 15000-chain D1 controls. Host-driven evaluation depth257 must return evaluation-depth resource and restore saved depth; no guest syntax beyond parser limit implied. |
| R07 | H/X: one shared session budget20, A `"use strict";this.a=1;`, then B `"use strict";while(true){}` | A mutation retained; combined ticks fail at21 in B, never a per-unit reset. Separate session B has its own budget. Freeze A exact consumed count during implementation acceptance. |
| U01 | P/H: equal source `"use strict";function f(){throw 7;}` under IDs `include:0` and `include:1` | Distinct records, same text/ranges. Function retains its defining unit; no include deduplication. Hash verification remains host adapter duty. |
| U02 | X: A `"use strict";let x=1;throw 7;`; B `"use strict";x;` | A body throw7, later B1; context restored and mutation retained. Repeating A conflicts at instantiation before throw, no reset/rollback. |
| U03 | Future transport only: strict unit A defines throwing f, strict unit B invokes f; stage=test | Origin source A, active host stage test, caller source B restored. No schema change in E1–E4. Non-strict harness A remains profile-rejected, so this is not harness execution evidence. |
| U04 | Future P5/P6 only: no-prefix `function f(){return this;}` then strict caller | Remains unsupported-profile. Sloppy this conversion, harness loading/validation, Error constructor extraction, schema/driver/profile/ledger admission are separate prerequisites. All60 selected variants stay blocked. |

Coverage map to earlier designs: G01–G08 cover TS033P G01–G08; L01–L10
cover its TDZ/closures/FDI/var cases and TS033D-P L01–L10 setup obligations;
T01/T02/T05 cover strict this/captured LHS, with TS033P T03/T04 deferred in U04;
C01–C07 cover C01/C01a/C01b/C02–C04 and I01, plus abrupt completion neighbors;
R01–R07/U01–U04 cover same-profile Realm/provenance/budget obligations while
explicitly deferring sloppy R02 and actual harness units. D2 G01–G16 remain
mandatory inherited host controls including8 flag combinations, inherited/own
properties, repeated var admission, fault identity and resource prefixes.

Each implementation driver must read at least two post-compilation input files
(rename x/seed and payload7/11 where relevant), record literal expected values,
descriptors and locations independent of the implementation, and fail on skipped
or missing controls. Every X row needs Node and native execution at E4; every H
row needs both hosts at its assigned slice. Research/source inventory cannot
satisfy those gates. Unmeasured tick tables are explicit E3/E4 acceptance work,
not hidden successful tests or authorization to weaken existing counts.
