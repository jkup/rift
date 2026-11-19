# Frozen before implementation — D2 H controls

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
