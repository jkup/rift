# TS-027P fixed acceptance matrix

These are proposed literal oracles, not executed tests. All rows and listed
variants are required in both rebuilt hosts. Use named scenarios and braced
control flow. S means parsed guest source; H means trusted host injection plus
parsed `k in o;` unless stated otherwise. H never implies a guest factory/API.
Fresh state per row. `o` has null prototype unless a prototype is specified;
ordinary setup descriptors are writable/enumerable/configurable. U is guest
UNDEFINED; s and t are distinct GuestSymbols with the same description `x`.
T/F are guest booleans. Assert target identity, own descriptors/keys, prototype,
array length and wrapper payload unchanged except explicit mutations. No target
Get and exactly one top-level Has dispatch on completed conversions throughout.

## V — Values and presence

| ID/name | Setup/source | Fixed result |
|---|---|---|
| V1 Own | S `'x' in {x: 7};` | T |
| V2 Missing | S `'x' in {};` | F |
| V3 Undefined | S `'x' in {x: undefined};` | T |
| V4 Falsy | H own x each of U,null,false,0,NaN,''; k='x' | T each; no value coercion |
| V5 Nonenumerable | H own x U, all flags false | T; flags preserved |
| V6 Inherited | H parent x U, all flags false; empty child | T; child remains without own x |
| V7 Shadow | H child x U shadows parent x7 | T before and after configurable own deletion; parent unchanged |
| V8 NullChain | H empty null-prototype o | F for x and toString |
| V9 DefaultPrototype | S `'toString' in {};` | T inherited |
| V10 PrimitiveKeys | H own keys undefined,null,true,false,0,NaN,Infinity,-Infinity,1.5 | corresponding primitive keys yield T; -0 and +0 both select '0' |
| V11 ExactStrings | H own '', '01', '-0', NUL, lone high surrogate | same strings T; no normalization; unrelated string F |
| V12 SymbolIdentity | H own s U, no t | s T; t F; string 'x' F |
| V13 InheritedSymbol | H parent s U, child empty | s T, child own keys empty |
| V14 SymbolResult | H k object canonical hook returns s, target s U | T; hint string; same symbol identity delivered |
| V15 SymbolWrapper | H k boxed s with standard symbol conversion, target s U | T |
| V16 OrdinaryKey | S `({toString: function() { return 'x'; }}) in {x: 1};` | T |
| V17 BooleanNumberBoxes | H Boolean/Number wrappers as RHS, own x U | x T; absent F; payload unchanged |
| V18 SymbolBoxRHS | H boxed s RHS with own x U | T; symbolData unchanged |
| V19 Callable | H guest function, builtin function, Function.prototype each RHS | inherited toString T; unique absent key F; never invoke RHS |
| V20 NumberNamespace | S `'isNaN' in Number;` | T without requiring callable RHS |
| V21 ArrayHole | S `0 in [,];` | F; length1, own index absent |
| V22 ArrayUndefined | S `0 in [undefined];` | T; length1 |
| V23 ArrayLength | S `'length' in [];` | T; length0 nonenumerable |
| V24 ArrayInheritedHole | H length3 hole at1; prototype owns1 U | key1 T; no own1 created; after prototype deletion F |
| V25 ArrayDeletedIndex | H array own0 U, delete0, query0 | F; length unchanged1 |
| V26 ArrayBoundary | H own '4294967295' U | T; ordinary property; length0 |
| V27 StringVirtual | H wrapper of surrogate pair (UTF-16 length2) | 0,1,'length' T; 2,'01','-0','1.0' F; numeric -0 T |
| V28 EmptyStringBox | H empty String wrapper | length T; 0 F |
| V29 InheritedVirtual | H ordinary o with String wrapper 'a' prototype | 0 and length T; no own keys materialized |
| V30 StringOrdinary | H String wrapper 'a', own '01' U and s U | '01',s T; unrelated t F |
| V31 PoisonValue | H x holds object with throwing conversion hooks | T; hook trace empty |
| V32 DeepPrototype | H 10000 ordinary ancestors, last owns x U | x T, absent F; no recursive evaluator frames or ticks |

## E — Ordering, mutations and competing errors

H tracing functions left/right append L/R and return k/o. Key canonical lookup
appends K, hook appends C, top-level target Has appends H. Ordinary fallback
lookups append S/V and calls append s/v. No extra tracing ticks. Source for
ordered calls is `left() in right();`. Sentinel throws are prebuilt records
with distinctive Value and location9:7; test identity, not just text equality.

| ID/name | Setup | Fixed result/trace |
|---|---|---|
| E1 CaptureOrder | canonical hook returns x, target owns x | T; LRKCH |
| E2 LeftAbrupt | left returns sentinel | same sentinel; L only |
| E3 RightAbrupt | right returns sentinel, poisoned key | same sentinel; LR only |
| E4 InvalidRHS | right each U,null,true,0,NaN,'', 'abc',s | TypeError/runtime `right operand of in must be an object`,1:1; LR only |
| E5 InvalidBeforeHook | k canonical hook throws, right null | same E4 error; no K/C/H |
| E6 LeftReadWins | S `missing in right();` | ReferenceError `missing is not defined`1:1; right not called |
| E7 RightReadWins | S `k in missing;`, poisoned k | ReferenceError `missing is not defined`1:6; no key conversion |
| E8 TDZ | S `k in o; let k;` with o injected | ReferenceError `k is not initialized`1:1 |
| E9 RightTDZ | S `k in o; let o;` with k injected | ReferenceError `o is not initialized`1:6 |
| E10 CanonicalThrow | k canonical lookup / hook returns sentinel (two variants) | same sentinel; K / KC; no H |
| E11 NoncallableHook | canonical method number7 | TypeError `symbol toPrimitive method is not callable`1:1; K; no fallback/H |
| E12 ObjectHookResult | canonical callable returns object | TypeError `cannot convert object to primitive`1:1; KC; no fallback/H |
| E13 OrdinaryFirst | canonical null or U; toString returns x | T; KSsH; no valueOf lookup |
| E14 OrdinarySecond | toString returns object, valueOf returns x | T; KSsVvH |
| E15 SkipNoncallable | toString7, valueOf callable returns x | T; KSVvH |
| E16 NoPrimitive | both ordinary methods callable returning objects | TypeError `cannot convert object to primitive`1:1; KSsVv; no H |
| E17 FreshFallback | toString replaces valueOf then returns object | new valueOf returns x; T; KSsVvH; old method not called |
| E18 RightMutatesKey | right replaces captured k's hook, returns o | new hook used once; LRKCH |
| E19 RightRebindsKey | right rebinds k to new poisoned key; original key returns x | original key used, T; new key untouched |
| E20 HookRebindsTarget | key hook rebinds o to empty new object; captured old o owns x | T; only old o Has; binding remains new object |
| E21 HookAdds | key hook defines x U on captured empty o | T; one own x created before H |
| E22 HookDeletes | key hook deletes configurable sole x | F; x absent before H |
| E23 HookPrototype | key hook changes o prototype to parent owning x U | T; new prototype retained; old untouched |
| E24 ArrayShrink | key hook shrinks array length2 to0; returns '1' | F; length0 and no own1; variant prototype owns1 gives T |
| E25 HasAbrupt | target top-level internalHasProperty returns sentinel | same sentinel; KCH; target internalGet poisoned/unreached |
| E26 HasHostFault | Has throws host Error instance | same host instance escapes; KCH; cleanup R24 |
| E27 KeyHostFault | key lookup / hook throws host Error (two variants) | same host instance escapes; no Has |
| E28 OperandMembers | S `a[p] in b[q];`, injected objects | left member base/key/convert/Get before right member base/key/convert/Get, then returned key conversion, then target Has; each once |
| E29 PrimitiveMemberLimit | S `null[p] in right();`, p poisoned object | TypeError `property base must be an object`1:1; p expression read, no p conversion/right; existing limitation |
| E30 NoTargetGet | target internalGet throws host Error; owns x U | T; zero Gets; Has once; also inherited x variant |
| E31 ForeignRealm | A evaluator, B target/key hook, hook returns x | hook observes B and captured key receiver; Has observes restored A context via harness; T; A/B prototypes unchanged |
| E32 ThrowMutation | hook mutates target then returns sentinel | same sentinel; mutation retained, no Has; no rollback |

E28 use distinct member-key hooks and data-returning internalGet overrides, with
literal trace `apPbqQKCH`: a/p evaluations append a/p, left member-key conversion
and Get together append P; b/q append b/q, right conversion/Get append Q; final
key conversion K/C and Has H. Assert each underlying conversion/Get count1;
trace grouping is a test convention, not skipped operations.

## P — Grammar, precedence and retention

| ID/name | Exact source or construction | Expected |
|---|---|---|
| P1 ArithmeticLeft | `1 + 1 in {'2': 0};` | T |
| P2 ArithmeticRight | `'x' in 1 + 1;` | RHS TypeError1:1; RHS2 |
| P3 RelationalLeft | `1 < 2 in {true: 0};` | T; `(1<2) in object` |
| P4 Chain | `'x' in {x: 0} in {true: 0};` | T; left associative |
| P5 RelationAfter | `'x' in {x: 0} < 2;` | T; presence true then numeric comparison |
| P6 Equality | `'x' in {x: 0} === true;` | T |
| P7 Unary | `! 'x' in {false: 0};` | T; unary is left operand |
| P8 Typeof | `typeof 0 in {number: 0};` | T |
| P9 Void | `void 0 in {undefined: 0};` | T |
| P10 Delete | `delete o.x in {true: 0};` with own configurable x | T; x deleted first |
| P11 Conditional | `'x' in {x: 0} ? 7 : missing;` |7; unchosen missing not read |
| P12 Assignment | `r = 'x' in {x: 0};` prebound r | T and r=T |
| P13 Logical | `false && missing in null;` / `true \|\| missing in null;` | F / T; no missing lookup |
| P14 MemberCall | `f().x in g();` f returns {x:'y'}, g returns {y:U} | T; f,g once in order |
| P15 Parentheses | `(('x')) in ({x: 0});` | T; no extra runtime nodes |
| P16 WordBoundaries | `let inside = 'x'; inside in {x: 0};` | T; identifier not split |
| P17 PropertyName | `({in: 7}).in;` |7 |
| P18 StringNotOperator | `1 'in' {};` | parse SyntaxError `expected ';'`1:3 |
| P19 ReservedBinding | `let in = 1;` / `function f(in) {}` | parse `expected binding identifier`1:5 /1:12 |
| P20 MissingLeft | `in o;` | parse `unsupported or unexpected syntax: in`1:1 |
| P21 MissingRight | `'x' in;` | parse `unsupported or unexpected syntax: ;`1:7 |
| P22 AssignmentTarget | `('x' in o) = true;` | parse `invalid assignment target`1:1 |
| P23 StillUnsupported | `for;` / `x instanceof o;` | parse `unsupported or unexpected syntax: for`1:1 / `expected ';'`1:3 |
| P24 Terminators | `'x'` + separator + `in` + separator + `{x:0};`; LF,CR,CRLF,U+2028,U+2029 and block comments containing each | T; no new newline rule |
| P25 NamedSource | `function f() { /*keep*/ return 'x'\n in {x: 0}; }` with actual LF | saved/inherited Function toString exactly entire declaration, including LF/comment |
| P26 AnonymousSource | `(function() { return 'x' in {x: 0}; });` | toString exactly `function() { return 'x' in {x: 0}; }` |
| P27 LocatedBinary | `  k in 0;` | runtime RHS TypeError1:3, not operator column5 |
| P28 NestedDepth | 127 opening parens + `k in o` +127 closing parens+`;` | parse `syntax nesting limit exceeded`1:128; preserve existing guard |

P23 also retain existing private-name lexer negatives, no broadened token
admission. P25 must keep return and its first operand on the same line.
For P24 an invalid RHS variant retains binary location1:1 despite newlines.

## R — Exact budgets and cleanup

Preparsed/prebound `k in o;`, primitive k='x', o owns x, fresh evaluator unless
specified. Setup excluded. Existing RangeError messages: execution step limit
exceeded; evaluation nesting limit exceeded; call depth limit exceeded.

| ID/name | Limit/setup | Literal result/count |
|---|---|---|
| R1 Primitive | default limits | T;4 ticks; max depth3;0 calls |
| R2 StatementBudget | maxSteps0 | step1 failure1:1; no operands |
| R3 BinaryBudget | maxSteps1 | step2 failure1:1 |
| R4 LeftBudget | maxSteps2 | step3 failure1:1 |
| R5 RightBudget | maxSteps3 | step4 failure1:6; key untouched |
| R6 ExactBudget | maxSteps4 | T;4 ticks |
| R7 InvalidRHS | RHS null; object key; maxSteps4 | TypeError1:1;4 ticks; no conversion |
| R8 Canonical | object key, non-ticking builtin hook returns x | T;5 ticks;1 call |
| R9 OrdinaryFirst | canonical absent; non-ticking toString returns x | T;6 ticks;1 call |
| R10 OrdinarySecond | toString returns object then valueOf x | T;7 ticks;2 calls |
| R11 KeyTick | R8 maxSteps4 | step5 failure1:1;0 hook calls/Has |
| R12 CallLimit | R8 maxCalls0 | call-limit failure1:1;5 ticks;0 invoked hooks/Has |
| R13 FrameEntry | seed depth256; evaluate binary directly |1 tick; frame failure1:1; restored256 |
| R14 LeftFrame | seed depth255; evaluate binary directly |2 ticks; left frame failure1:1; restored255 |
| R15 GuardPriority | R14 maxSteps1 | step2 failure1:1 wins before frame guard |
| R16 OperandCalls | `left() in right();`, non-ticking builtins primitive key/object |4 ticks;2 calls; no direct callee identifier evaluate ticks |
| R17 Monotonic | two R1 statements same evaluator maxSteps7 | first T at4; second right tick8 fails1:6; no reset |
| R18 HostRecursion | key canonical builtin recursively calls evaluate(same binary AST); maxCalls m |1+4(m+1) ticks; m invoked hooks; call-limit failure1:1;0 Has |
| R19 NativeHost | R18 m=0,1,2, actual default64 |5,9,13,261 ticks; no native crash |
| R20 GuestRecursion | key hook h from `function h() { return k in o; }`; initial `k in o;`; maxCalls m |5+5m ticks; m hooks; call-limit failure;0 Has |
| R21 NativeGuest | R20 m=2 and actual default64 |15 and325 ticks; failure at declaration binary1:23; no native crash |
| R22 StepBeforeCall | R20 m2,maxSteps14 |step15 fails at1:23 before call-limit test |
| R23 ForeignRecursion | R19/R21 key hook defined in B, evaluator A |same counts/errors; A restored; calls/depth0 |
| R24 Cleanup | successful hook, guest sentinel, call/step/frame limits, host fault in key/Has |calls/depth restored to entry; Realm restored; steps monotonic; fresh subsequent operation succeeds |
| R25 PresenceWalk | R1 with V32 chain |4 ticks independent of chain length; no guest calls |

R18 recurses into evaluate, not statement: each attempt binary+left+right+key
lookup costs4; only initial statement adds1. R20 guest bodies add return+binary+
left+right+key lookup=5. At m0 R20 fails at initial1:1; positive m at1:23.
At default64, guest maximum evaluation depth is131 (last operand); the call
limit must win before frame limit256. Count hooks as64, never65. Explicitly
exercise native without overriding its default maxCalls. Do not infer default
safety from m2. R24 frame tests restore seeded depth rather than forcing zero.

## C — Integration, fixtures and preserved consumers

| ID/name | Fixed obligation |
|---|---|
| C1 RuntimeSuccess | disk-read source `console.log('x' in {x: undefined}, 0 in [,], 'length' in []);`; stdout `true false true\n`, stderr empty, status0 |
| C2 RuntimeEffects | disk-read source with counter/trace functions: left L, right R, key toString C; `left() in right()` true; literal trace LRC and one call each |
| C3 InjectedRuntime | disk-read `console.log(s in o, t in o, 0 in box, 1 in box);`; host inject s-only target and String box 'a'; stdout `true false true false\n` |
| C4 ParsePhase | disk-read `'x' in;`; stdout empty; status2; parse SyntaxError `unsupported or unexpected syntax: ;`1:7 |
| C5 RuntimePhase | disk-read `'x' in null;`; stdout empty; status1; runtime TypeError `right operand of in must be an object`1:1 |
| C6 CompetingRuntime | disk-read `missing in null;`; stdout empty; status1; ReferenceError `missing is not defined`1:1 |
| C7 ParseBeforeEffects | `effect(); 'x' in;`; no effects; parse details below |
| C8 Baseline | preserve182 names/expected records and28 gates; all raw presence/map/String controls, typeof/delete/equality and source-retention assertions remain |

C7 has no effects: whole-program parse fails at1:17 with SyntaxError
`unsupported or unexpected syntax: ;`. CLI stderr includes fixture filename and
the stated line/column using current harness formatting. C1-C6 must use literal
expectations, never a generated result from the implementation as an oracle.
Add one dedicated native driver gate and meaningful CLI cases without removing
or renaming baseline cases; all old static-only/separate coverage checks remain.
