# TS-029P literal acceptance matrices

These are independent proposed oracles, not recorded executions. Each ID/name and
explicit variant must map to a readable implementation scenario. No expected
value, trace or budget may be generated from the new runtime's output.

Notation: U=guest undefined; s1/s2=distinct symbols both described `x`; Q=one
retained ThrowCompletion with value object q, diagnostic ReferenceError `sentinel`
at7:9; F=one retained host Error. `T(x)` means runtime TypeError message
`property is not writable: x`; N means runtime TypeError message
`cannot convert null or undefined to object`. These are literal diagnostic
abbreviations, not calls to runtime formatting. Direct references use ref.loc7:9,
operation loc8:4; T is at8:4, N and key-generated errors at7:9. Source rows use1:1
unless specified. Always check completion kind/name/phase/location, not only text.
Keep Q completion/value/diagnostic and F instance identity. All nonexhausting
source runs finish with calls/depth0 and their entry Realm restored.

## V — Values, descriptors and unchanged dispatch

Direct Put uses RHS object r unless stated; primitive x writes must leave wrapper
storage, primitive slots and prototype descriptors unchanged. Each nonnull
primitive row asserts exactly one appropriate active-Realm factory, original
Receiver Value, zero defineOwnProperty calls, and no target semantic Get. Object
rows assert no boxing. Raw internalSet controls assert normal(false), not a throw.

| ID/name | Setup/action | Literal expected result/state |
|---|---|---|
| V1 True | base true; key x | T(x); Boolean slot true |
| V2 False | base false; key x | T(x); Boolean slot false |
| V3 Number | base3; key x | T(x); Number slot3 |
| V4 MinusZero | base -0; key x | T(x); reciprocal slot -Infinity |
| V5 NaN | base NaN; key x | T(x); slot remains NaN |
| V6 Infinity | each +Infinity/-Infinity; key x | T(x); exact sign unchanged |
| V7 EmptyString | base ''; key x | T(x); slot '' |
| V8 String | base 'ab'; key x | T(x); slot 'ab' |
| V9 Symbol | base s1; key x | T(x); exact s1 slot |
| V10 Null | base null; object key that would Q | N; zero key calls/Set/factories |
| V11 Undefined | base U; same | N; zero key calls/Set/factories |
| V12 Unit | 'ab'; key0, RHS'a' then'z' separately | both T(0); unit remains'a' |
| V13 Length | 'ab'; key length, RHS2 then3 | both T(length); length2 |
| V14 UTF16 | '\ud83d\ude00'; keys0/1 | T(0)/T(1); units '\ud83d'/'\ude00', length2 |
| V15 StringOrdinaryKeys | 'ab'; keys '-0','01','2','1.5','-1' | T(-0), T(01), T(2), T(1.5), T(-1); no new properties |
| V16 PrimitiveInheritedWritable | each nonnull kind, prototype x=1 writable | T(x); prototype value1 and flags unchanged |
| V17 PrimitiveInheritedLocked | same nonwritable; RHS1 too | T(x); value1 unchanged even same-value |
| V18 PrimitiveSymbolKey | each nonnull kind, key s1 | T(Symbol(x)); s1/s2 remain distinct; no additions |
| V19 ObjectNew | empty o, x=r | normal exact r; own x=r,w/e/c=true |
| V20 ObjectUpdate | x=1 writable, nonenumerable/nonconfigurable | normal r; flags true/false/false |
| V21 InheritedWritable | parent x=1; child absent | normal r; child own x=r all-true; parent1 |
| V22 InheritedLocked | parent x=1 nonwritable | T(x); child absent; parent1 |
| V23 Nonextensible | closed object, absent x / existing writable x=1 | T(x), no x / normal r, x=r |
| V24 CallableObject | callable object, x absent | normal r; call count0; callable identity retained |
| V25 ExplicitBoxes | Boolean/Number/Symbol/String boxes, x absent | normal r; own x=r; scalar slots unchanged |
| V26 ExplicitStringVirtual | box'ab', index0 / length | T(0)/T(length), no change |
| V27 ArrayIndex | empty Array, key2, RHS7 | normal7; own2=7; length3, holes0/1 |
| V28 ArrayFrozenLength | length0 nonwritable, key0 | T(0); length0; index absent |
| V29 ArrayLength | [1,2,3], length=1 | normal1; length1; index0=1; indices1/2 absent |
| V30 InvalidLength | length=1.5 | RangeError `invalid array length`8:4; original length/indices |
| V31 ArrayBlockedShrink | [1,2,3], index1 nonconfigurable, length=0 | T(length); length2, indices0/1 remain, index2 deleted |
| V32 ArrayRHSIdentity | length RHS object r returns2 on both number-hint calls | normal exact r; trace NN; length2; saved key before first N |
| V33 SymbolObjectKeys | object keys s1/s2; assign r through s1 | normal r; s1=r, s2 unchanged; no string Symbol(x) property |
| V34 RawPrimitiveReceiver | raw internalSet on writable/absent/locked descriptor; each primitive including null/U/symbol | normal(false); zero receiver definitions |
| V35 DistinctObjectReceiver | raw base x=1 writable, receiver empty | normal(true); receiver x=r; base1 |
| V36 DefinitionBoundary | existing test definition-dispatch success/false/Q modes | one receiver define call; normal r/T(x)/same Q; ordinary flags preserved |

## E — Evaluation, conversion and competing errors

For E1-E17 use source `base()[key()] = rhs();`. Non-ticking builtin callbacks
append B/K/R; factory appends O; canonical key hook appends C, receives original
key as this and sole argument 'string'; instrumented top-level Set appends S
then delegates. Default base=true, key object converts to x, RHS=r. Factory
observations are host instrumentation, not guest callbacks. T uses1:1.

| ID/name | Variation | Literal expected |
|---|---|---|
| E1 PrimitiveOrder | default | trace BKROCS; T(x); no definition |
| E2 ObjectOrder | base empty object | BKRCS; normal exact r; x=r |
| E3 BaseAbrupt | base returns Q | B; same Q; no key/RHS/box |
| E4 KeyExpressionAbrupt | key returns Q | BK; same Q; no RHS/box |
| E5 RHSAbrupt | rhs returns Q, each represented base | BKR; same Q; no box/conversion/Set |
| E6 NullishOrder | base null/U | BKR; N; key conversion never called |
| E7 NullishCompetingKey | base null/U; key conversion would F or Q | BKR; N, no F/Q |
| E8 KeyAbrupt | C returns Q | BKROC; same Q; no S; raw key |
| E9 KeyHostFault | C throws F | BKROC; same F escapes; raw key |
| E10 SetAbrupt | S returns Q | BKROCS; same Q; saved x |
| E11 SetHostFault | S throws F | BKROCS; same F; saved x |
| E12 FactoryFault | O throws F | BKRO; same F; raw key |
| E13 KeyLookupFault | canonical internalGet throws F before C | BKRO; same F; raw key |
| E14 KeyLookupAbrupt | canonical internalGet returns Q before C | BKRO; same Q; raw key |
| E15 RHSChangesKeyMethod | R replaces C with hook Y returning y | BKROYS; T(y); saved y |
| E16 RHSRebindsBase | R binds base variable to empty object, captured true retained | BKROCS; T(x); replacement object untouched |
| E17 RHSRebindsKey | R rebinds key variable to 'y', captured object retained | BKROCS; T(x) |

E16/E17 callback return Values must come from mutable bindings so these test real
rebinding, not closures returning constant setup Values. For E18 onward use direct
Put unless source is given. Ordinary conversion logs T/V for toString/valueOf.

| ID/name | Variation | Literal expected |
|---|---|---|
| E18 RHSChangesPrototype | captured object; RHS changes its parent to locked x=1 | T(x)1:1; no own x; parent1 |
| E19 HookUnlocksTarget | object own x=1 configurable nonwritable; C makes writable | normal r; x=r, same descriptor flags except deliberate change |
| E20 HookClosesTarget | empty object; C prevents extensions | T(x); no x; closed remains closed |
| E21 HookMutatesRHS | r.m=1; C sets r.m=2 then rebinds RHS variable to another object | normal exact r; x=r; r.m=2 |
| E22 BaseNotCoerced | object base has conversion methods that throw F | normal r at x; no F/no base conversion |
| E23 RHSNotCoerced | r has conversion hooks throwing F, ordinary x | normal r; zero RHS hooks |
| E24 CanonicalSymbol | key hook returns s1 | primitive: T(Symbol(x)); object: s1=r; save s1 identity |
| E25 CanonicalNoncallable | key @@toPrimitive=1 | TypeError `symbol toPrimitive method is not callable`7:9; no ordinary calls/Set |
| E26 CanonicalObject | canonical hook returns object | TypeError `cannot convert object to primitive`7:9; no fallback/Set |
| E27 OrdinaryFirst | canonical U/null; toString returns x | trace T; primitive T(x); one ordinary call |
| E28 OrdinarySecond | toString returns object; valueOf returns x | trace TV; primitive T(x); two calls |
| E29 OrdinarySkip | toString noncallable; valueOf returns x | trace V; primitive T(x) |
| E30 OrdinaryFailure | T/V both return object | trace TV; TypeError `cannot convert object to primitive`7:9 |
| E31 OrdinaryAbrupt | T or V returns Q / throws F | trace T or TV; exact Q/F; no Set; raw key |
| E32 PrimitiveKeySpelling | object base, keys U/null/true/false/-0/NaN/+Infinity/-Infinity | writes keys 'undefined','null','true','false','0','NaN','Infinity','-Infinity'; normal r; zero hooks |
| E33 EmptyAndUTF16Key | keys '' / 'a\0\ud800' | exact own keys, normal r; no normalization |
| E34 FrozenArrayRHS | Array length nonwritable; r coercion would F | T(length); zero RHS conversions |
| E35 ArrayRHSFailure | writable length; first or second number conversion returns Q/throws F | exact Q/F; saved length key; keep explicit hook mutations |
| E36 NestedAssignment | source `a.x = b.y = r;` objects a/b | normal exact r; b.y then a.x assigned |
| E37 InnerFailure | E36 b=true | T(y)1:7; a.x absent; inner failure prevents outer Put |
| E38 NoTargetRead | object target internalGet would F, writable x | normal r; zero target Get; descriptor lookup allowed |

## K — Saved keys, retry and direct-reference identity

Default object o empty; raw key k has canonical hook C returning x; RHS r. Put
at8:4, reference7:9. Explicitly assert ref.base identity and key kind/payload.

| ID/name | Operation sequence | Literal expected |
|---|---|---|
| K1 PutPut | Put r; change k hook to y; Put7 same ref | C once total; x=7, y absent; normal r then7 |
| K2 PutGet | Put r; change k hook to y; Get same ref | C once; Get exact r from x |
| K3 GetPut | seed x=1; Get; change k; Put r | read1 then normal r; C once; x=r |
| K4 SeparateReferences | two source assignments, hook first x then y | C twice; x/y each assigned |
| K5 FalseRetry | o closed; Put fails; change k hook to y; retry | T(x) twice8:4; C once; saved x |
| K6 AbruptRetry | Set returns Q then delegates on retry | same Q then normal r; C once; saved x |
| K7 HostRetry | Set throws F then delegates | same F then normal r; C once |
| K8 ConversionRetry | C returns Q first, x next | same Q; raw k; retry normal r; C twice |
| K9 ConversionFaultRetry | key lookup/call throws F first, x next | same F; raw k; retry normal r; successful conversion once |
| K10 PrimitiveRetry | true base; Put twice | T(x) twice8:4; C once; two distinct boxes; base true |
| K11 PrimitiveGetAfterFailure | true root x=1; Put fails then Get | T(x)8:4 then1; C once; fresh box per operation |
| K12 NullishRetry | null/U, two Puts | N twice7:9; raw k; no boxes/hooks |
| K13 SymbolCache | C returns s1; replace C with s2 before second Put | s1 only assigned; C once; saved symbol Value identity |
| K14 CacheBeforeDispatch | Set observer inspects held reference then Q/F/false | already string x/symbol s1 on every mode |
| K15 CacheBeforeArrayRHS | key converts length; RHS hook mutates key object | saved length before both RHS conversions; next Put still length |
| K16 LocationSplit | direct primitive ref7:9, operation8:4 | key/N at7:9; Set/T at8:4; Q retains7:9 |
| K17 NoBoxCache | same primitive ref Put in A then B contexts | one A box then one B box; key C once; T(x) twice |
| K18 FreshRHS | Put r; next Put distinct r2 | normal r then exact r2; x=r2; key C once |
| K19 BindingControls | mutable x / missing z / uninitialized x / immutable x | exact assigned r / ReferenceError `z is not defined` / ReferenceError `x is not initialized` / TypeError `binding is not mutable: x`, all8:4 |
| K20 ReadBeforeFailure | Get x=s1 then toNumber, or Get x=1 then RHS Q; Put only on success | symbol-number error or exact Q; no Put; key/read effects retained |

K20 is explicit API sequencing, not compound syntax. Do not add reference caches
shared across separate source evaluations or across separate Reference objects.

## F — Foreign Realm, fault cleanup and retained effects

Evaluator starts in A, hook defined in B. Record wrapper identity/prototype at
factory return; do not infer the Realm merely from the final TypeError.

| ID/name | Setup | Literal expected |
|---|---|---|
| F1 ForeignKey | primitive p, B hook yields x | A wrapper before B hook; Set uses original p and A wrapper; returns in A |
| F2 ForeignPrimitiveResult | RHS B function returns r, base expression B function returns3 | Put boxes in A; T(x); RHS result evaluated first |
| F3 ForeignObject | base object from B | no box; same B object updated; context A at Set |
| F4 NestedBoxing | B hook performs separate Put on false with key x; host hook inspects expected failure then returns x | inner box B; outer box A; both T(x); caller restored A |
| F5 MutateAPrototype | B hook changes A primitive prototype x descriptor | outer Set sees new descriptor; mutation retained; B prototype untouched |
| F6 GuestAbrupt | B hook returns retained Q | exact Q; A restored; raw key; no Set |
| F7 HostFault | B hook throws F | identical F escapes; A restored; raw key |
| F8 DispatchFault | after B hook, A wrapper Set Q/F | exact Q/F; saved x; A restored |
| F9 SeededCalls | enter direct Put with calls1 then B hook Q/F | calls restored1, not0; Realm A; depth entry retained |
| F10 Recovery | after each factory/key-Get/key-call/Set Q or F, remove fault and perform fresh object `o.x = 7;` on same evaluator with remaining budget | normal7; o.x=7; steps increase by5; clean guards |
| F11 SideEffectSurvival | RHS increments n; key increments m; primitive Set false | n=1,m=1 after TypeError; no target/prototype writes |
| F12 LongPrototypeChain | primitive prototype points through1000 ordinary links ending writable x | T(x); iterative traversal; no guest calls or extra ticks |

## R — Exact resources and guard precedence

Preparse `p[k] = 7;`, prebind p=true and k='x'. Statements and evaluated
expressions each cost one tick. The target member has no evaluate call: ticks
are statement1:1, assign1:1, base1:1, key1:3, RHS1:8. The maximum live depth
is3. Canonical key adds one tick at reference1:1 after RHS. Non-ticking builtin
hook adds no body ticks. Errors below are runtime RangeErrors with exact message
`execution step limit exceeded`, `evaluation nesting limit exceeded`, or
`call depth limit exceeded` as named. T(x) remains a TypeError.

| ID/name | Limit/scenario | Literal expected |
|---|---|---|
| R1 Primitive | defaults, primitive key | T(x)1:1; steps5, peak3, calls0; one box |
| R2 Statement | maxSteps0 | step error1:1 at1; no evaluation |
| R3 Assignment | maxSteps1 | step error1:1 at2; no base/key/RHS |
| R4 Base | maxSteps2 | step error1:1 at3 |
| R5 Key | maxSteps3 | step error1:3 at4 |
| R6 RHS | maxSteps4 | step error1:8 at5; no box |
| R7 Exact | maxSteps5 | T(x), steps5; box/Set reached |
| R8 Nullish | p=null/U, object key, maxSteps5 | N1:1 at5; no conversion tick/call/box |
| R9 Canonical | object k hook x | T(x); steps6, one hook, peak3 |
| R10 OrdinaryFirst | canonical absent, toString x | T(x); steps7, one hook |
| R11 OrdinarySecond | toString object, valueOf x | T(x); steps8, two hooks |
| R12 KeyTick | R9 maxSteps5 | step error1:1 at6; box exists, no hook/Set |
| R13 CallGuard | R9 maxCalls0 | call error1:1 at6; box exists, zero hooks |
| R14 SeededDepth | depth256; evaluate assignment expression directly | nesting error1:1 at step1; depth restored256 |
| R15 ChildDepth | depth255; evaluate assignment expression directly | nesting error1:1 on base at step2; depth restored255 |
| R16 StepWins | R15 maxSteps1 | step error1:1 at2 before child depth increment |
| R17 Direct | direct Put primitive-key / canonical object-key | steps0/1; repeated same-ref Put adds0; fresh box each time |
| R18 Monotonic | run R1 twice maxSteps9 | first T(x) at5; second RHS step10 error1:8; no second box |
| R19 ObjectControl | p empty object; primitive key | normal7; steps5, peak3; o.x=7 |
| R20 HostRecursive | canonical builtin recursively calls evaluate on same assignment AST; outer statement; maxCalls m | 1+5(m+1) ticks; m hooks; m+1 boxes; no Set |
| R21 HostSmall | R20 m=0,1,2 | steps6,11,16; hooks0,1,2; peak3,4,5; call error1:1 |
| R22 HostDefault | R20 actual constructor default64 | steps326; hooks64; boxes65; peak67; call error1:1; native no crash |
| R23 GuestRecursive | key hook from `function h() { return p[k] = 7; }`; outer source `p[k] = 7;`; maxCalls m | 6+6m ticks; m hooks; m+1 boxes; no Set |
| R24 GuestSmall | R23 m=0,1,2 | steps6,12,18; hooks0,1,2; peak3,5,7; call error1:1 for0,1:23 otherwise |
| R25 GuestDefault | R23 actual constructor default64 | steps390; hooks64; boxes65; peak131; call error1:23; native no crash |
| R26 StepBeforeCall | R23 m2,maxSteps17 | step18 error1:23 before call denial; hooks2 |
| R27 RecursiveRealm | R22/R25 B-defined hooks, evaluator A | same counts; first box A, nested64 boxes B; A/calls0/depth0 restored |
| R28 Cleanup | all Q/F/guard paths | entry Realm/calls/depth restored; steps never reset; same Q/F |
| R29 Exhaustion | retry on evaluator after R26 with source `o.x = 7;` | step19 error1:1; no write; use fresh evaluator to prove successful recovery |
| R30 NullishRHSCost | p null, `p[k] = rhs();`, non-ticking RHS | N1:1 after steps6; RHS called once; no key hook |

R20 recursion adds assign/base/key/RHS/key-lookup =5 ticks per attempted hook.
R23 also adds a return-statement tick in each guest invocation =6. Count setup
and function declaration separately; create/preparse/install before measuring,
reset only before starting the measured run. Measure maximum depth in an override
that forwards the optional allowUnresolvable flag, without changing guard logic.
Both default64 cases must actually run under rebuilt native code with the default
constructor, not an explicit small substitute or only a formula assertion.

## C — Runtime source and preservation

Commit runtime-read fixture files during implementation; preserve exact source in
these rows. CLI failures need exit1/runtime diagnostic; parse failures exit2.

| ID/name | Source/requirement | Literal expected |
|---|---|---|
| C1 Object | `let o = {}; console.log(o.x = 7, o.x);` | stdout `7 7\n`, empty stderr, exit0 |
| C2 Primitive | `'ab'[0] = 'z';` | empty stdout; `1:1: runtime TypeError: property is not writable: 0`; exit1 |
| C3 Nullish | `null.x = 7;` | empty stdout; N at1:1; exit1 |
| C4 Effects | `let k = {toString: function() { console.log('key'); return 'x'; }}; function rhs() { console.log('rhs'); return 7; }` followed by newline `true[k] = rhs();` | stdout `rhs\nkey\n`; T(x)2:1; exit1 |
| C5 RHSWins | `null.x = missing;` | ReferenceError `missing is not defined`1:10; empty stdout; exit1 |
| C6 ParseBeforeEffects | `effect(); p.x += 1;` | parse SyntaxError `unsupported operator: +=`1:15; no effects; exit2 |
| C7 SourceRetention | `function f() { /*keep*/ p[k] = 7; }` | f.toString exactly the source declaration |
| C8 Unsupported | `p.x += 1;`, `p.x++;`, `++p.x;`, `p.x &&= 1;` | parse errors `unsupported operator: +=`1:5; `unsupported operator: ++`1:4 and1:1; `unsupported or unexpected syntax: =`1:7 |
| C9 Preserve | baseline196 names/30 gates | keep all; only README A9 existing top-level expected-record migration |
| C10 NewDriver | named readable scenarios, all rows/variants | additive build and separately parsed static coverage; no dynamic tier; rebuilt Node/native assertions |

Required implementation evidence also includes typecheck, runner20, probes10,
all baseline gates and full rebuilt host lanes; preserve failed attempts separately.
If any literal oracle disagrees, report it for review before changing it.
