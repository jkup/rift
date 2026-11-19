# TS-030P literal validation matrix

Design oracles, not measured results. Every row is required in both Rift lanes.
`OP` expands to five separately named variants Add/Sub/Mul/Div/Rem in order
`+= -= *= /= %=`. Five-value vectors always use that order; they are literal
expected values, not expectations computed by invoking the binary helper.
Use SameValue assertions (NaN and negative zero included), exact throw/host-fault
identity, locations, traces, property descriptors, and no-later-effects checks.
Setup is host-side unless a guest source is quoted; do not charge setup ticks.
Each test has separate setup/action/assertions. Symbols and descriptors are
host-seeded; never expand guest syntax to make a test convenient.

`U` is undefined; `Y` and `Z` are different symbols with description `s`.
`Q` is one prebuilt guest throw completion, `F` one host Error instance. Instrument
base/key/RHS functions as B/K/R, key hook as C, target Get/Set as G/S, old/right
operand hooks as L/H; all are non-ticking host bodies unless specified. Key hooks
return `x`, old value is 12 and RHS 3 unless overridden. Trace observers append
only their indicated event (not incidental descriptor reads). Q/F stop all later
stages; effects already performed remain. Successful OP results are 15,9,36,4,0.

## Values and conversion

For V rows seed mutable binding x with old Value, run `x OP rhs;` with rhs bound
to the specified Value. Assert expression result and x match the expected vector.
On conversion error x retains its old value. All errors are runtime TypeError
at 1:1 unless a row says otherwise.

| ID / name | old ; rhs | Add / Sub / Mul / Div / Rem expectation |
|---|---|---|
| V1 Numbers | 12 ; 3 | 15 / 9 / 36 / 4 / +0 |
| V2 LeftString | "12" ; 3 | "123" / 9 / 36 / 4 / +0 |
| V3 RightString | 12 ; "3" | "123" / 9 / 36 / 4 / +0 |
| V4 Booleans | true ; false | 1 / 1 / +0 / +Infinity / NaN |
| V5 Null | null ; 3 | 3 / -3 / +0 / +0 / +0 |
| V6 Undefined | U ; 3 | NaN / NaN / NaN / NaN / NaN |
| V7 NaN | NaN ; 3 | NaN / NaN / NaN / NaN / NaN |
| V8 Infinity | +Infinity ; 3 | +Infinity / +Infinity / +Infinity / +Infinity / NaN |
| V9 BothInfinity | +Infinity ; +Infinity | +Infinity / NaN / +Infinity / NaN / NaN |
| V10 NegativeZero | -0 ; 3 | 3 / -3 / -0 / -0 / -0 |
| V11 BothNegativeZero | -0 ; -0 | -0 / +0 / +0 / NaN / NaN |
| V12 NegativeDivisor | 12 ; -3 | 9 / 15 / -36 / -4 / +0 |
| V13 NegativeDividend | -13 ; 3 | -10 / -16 / -39 / -4.333333333333333 / -1 |
| V14 InvalidNumericString | "bad" ; 3 | "bad3" / NaN / NaN / NaN / NaN |
| V15 WhitespaceString | " 12 " ; 3 | " 12 3" / 9 / 36 / 4 / +0 |
| V16 SymbolLeft | Y ; 3 | cannot convert symbol to number (all five) |
| V17 SymbolRight | 12 ; Y | cannot convert symbol to number (all five) |
| V18 StringSymbol | "a" ; Y | cannot convert symbol to string / number / number / number / number |
| V19 SymbolString | Y ; "a" | cannot convert symbol to string / number / number / number / number |
| V20 BoxPayloads | Number box12 ; String box"3" | "123" / 9 / 36 / 4 / +0 |
| V21 CanonicalHints | old/right objects return12/3 | trace LH; hints default/default for Add, number/number for others; 15/9/36/4/0 |
| V22 SymbolThenRightHook | Y ; object returns3 | Add trace H then number error; others empty trace then number error |
| V23 HookSymbolThenRightHook | old object returnsY ; right object returns3 | Add LH then number error; others L then number error |
| V24 LeftThrow | old hook Q ; right hook H | exact Q, trace L, no H |
| V25 RightThrow | old returns12 ; right hook Q | exact Q, trace LH |
| V26 NoncallableProtocol | old symbol protocol=7 | symbol toPrimitive method is not callable; no ordinary fallback |
| V27 ObjectProtocolResult | old protocol returns object | cannot convert object to primitive; no fallback |
| V28 OrdinaryOrder | old protocol absent; valueOf returns object, toString returns"12"; right3 | old trace valueOf,toString; "123"/9/36/4/0 |
| V29 OrdinarySkip | old valueOf=7, toString returns"12" | only toString called; "123"/9/36/4/0 |
| V30 OrdinaryExhaustion | old ordinary methods both return objects | cannot convert object to primitive; both called once |
| V31 DefaultVsNumber | old canonical returns"a" for default,12 for number; rhs3 | "a3"/9/36/4/0 |
| V32 CapturedRight | old hook replaces rhs binding with99; captured rhs object returns3 | LH; 15/9/36/4/0; rhs binding99 |

## Reference capture, effects, and competing failures

E rows use `base()[key()] OP rhs();` unless stated. Base returns original object
o, key returns object k with canonical hook, RHS returns3. Assertions include
original base Receiver for both dispatches and one invocation per B/K/C/G/R/S.

| ID / name | Variation | Literal expected result / effects (all OP) |
|---|---|---|
| E1 Once | baseline | BK C G R S (without spaces); 15/9/36/4/0 at o.x |
| E2 Operands | old and RHS are objects returning12/3 | BKCGRLHS; hints per V21 |
| E3 BaseThrow | B returns Q | Q; B only |
| E4 KeyEvalThrow | K returns Q | Q; BK only |
| E5 NullKeyEval | B returns null; K returns Q | Q; BK; nullish error suppressed |
| E6 NullGet | B returns null; k hook would Q | TypeError cannot convert null or undefined to object; BK; no C/R/S |
| E7 KeyThrow | C returns Q; RHS would F | Q; BKC; no G/R/S |
| E8 GetThrow | internalGet returns Q; RHS would F | Q; BKCG; no R/S |
| E9 RHSThrow | RHS Q; old hook would F | Q; BKCGR; no L/S |
| E10 LeftThrowBeforeWrite | old hook Q; Set would F | Q; BKCGRL; no S |
| E11 RightThrowBeforeWrite | right hook Q; Set would F | Q; BKCGRLH; no S |
| E12 SetThrow | internalSet returns Q | Q; BKCGRS, arithmetic performed, no normal result |
| E13 SetFalse | internalSet returns false | TypeError property is not writable: x; BKCGRS |
| E14 RHSReplaceBase | RHS rebinds source base to o2 with x99 | original o.x becomes15/9/36/4/0; o2.x99 |
| E15 RHSReplaceKey | RHS changes k hook to return y | only C once; x updated, y untouched |
| E16 GetReplaceKey | Get changes k hook to F | successful saved x used; no F; normal result |
| E17 RHSReplaceProperty | RHS writes o.x99 then returns3 | result uses12; final15/9/36/4/0 |
| E18 RHSMutateOld | old object hook initially12; RHS changes it to return20 | captured object converts20; results23/17/60/6.666666666666667/2 |
| E19 RHSRebindOld | old object initially returns12; RHS replaces o.x with another object99 | captured old object still converts12; normal baseline vector |
| E20 RHSDeletes | RHS deletes configurable o.x | Get captured12; Put recreates own x baseline vector, W/E/C true |
| E21 RHSFreeze | RHS makes x readonly | arithmetic then TypeError; x12, descriptor readonly |
| E22 RHSFreezeAndThrow | RHS makes x readonly then Q | Q wins; readonly remains |
| E23 MissingBinding | `missing OP rhs();` | ReferenceError missing is not defined; R0 |
| E24 TDZ | `x OP rhs(); let x;` | ReferenceError x is not initialized; R0 |
| E25 Immutable | initialized immutable x12, `x OP rhs();` | R once then TypeError binding is not mutable: x; x12 |
| E26 ImmutableRHS | E25 RHS Q | exact Q; no mutable diagnostic |
| E27 ImmutableCoercion | immutable x object hook Q; RHS3 | R then L; Q, binding unchanged |
| E28 LexicalCapture | inner function with local x99 is RHS of outer x OP call; returns3 | outer12 becomes baseline vector; inner99 unaffected |
| E29 SymbolKey | k returnsY; o[Y]=12, o[Z]=99 | C once; Y baseline vector; Z99; identity preserved |
| E30 PrimitiveKey | key returns "x", then numeric12, then Y as separate variants | no C; each selects exact corresponding seeded key once |
| E31 SameRefSuccess | direct ref Get, change raw key object's hook, binary, Put | one C, exact saved key; no object wrapper cached |
| E32 SameRefGetFailure | direct Get Q after successful conversion; retry Get then Put | C once across retries; saved key survives Q |
| E33 SameRefKeyFailure | direct Get key Q; repair hook then retry Get/Put | C twice total; raw key retained on first failure |
| E34 SameRefWriteFailure | successful Get; first Put false; repair descriptor and retry Put | one C total, two S; second Put normal result |

## Property writes and Array dispatch

W rows run `p[k] OP rhs;` with k="x", rhs=3 unless stated. No property change
on rejection except explicitly listed RHS or Array partial effects.

| ID / name | Setup | Exact expected result (all OP unless restricted) |
|---|---|---|
| W1 OwnWritable | p.x12 writable | normal15/9/36/4/0, own x updated |
| W2 InheritedWritable | proto.x12 writable | own x15/9/36/4/0; proto.x12 unchanged |
| W3 OwnReadonly | p.x12 readonly | TypeError property is not writable: x after RHS |
| W4 InheritedReadonly | proto.x12 readonly | same error; no own x; proto12 |
| W5 NonextensibleExisting | nonextensible p with writable x12 | normal baseline vector |
| W6 NonextensibleMissing | nonextensible p, no x | old U; computed NaN all; strict x error, no own x |
| W7 MissingExtensible | extensible p, no x | normal NaN all; own x NaN |
| W8 PrimitiveInherited | each p=true,false,12,-0,NaN,Infinity,"ab",Y; corresponding prototype.x12 writable | Get12 then RHS and arithmetic; strict x error; two distinct boxes; original Receiver both times; prototype12 |
| W9 PrimitiveMissing | same eight bases with no x | old U, computed NaN all; strict x error; two boxes; no own property |
| W10 PrimitiveReadonly | W8 prototype.x readonly | same x error after RHS; no wrapper/property write |
| W11 StringIndex | p="ab", k="0", rhs=3 | old"a"; computed"a3"/NaN/NaN/NaN/NaN then strict error key0; string unchanged |
| W12 StringLength | p="ab", k="length", rhs=3 | computed5/-1/6/0.6666666666666666/2 then strict length error |
| W13 StringUTF16 | p is host-seeded surrogate pair, k="0" then"1"; Add rhs"!" | each old one-code-unit string concatenated with ! before strict index error; two boxes |
| W14 Nullish | p=null then U; object k with hook | raw key eval occurs; nullish TypeError; no hook/RHS/box |
| W15 PrimitiveSymbolOld | primitive prototype.xY | numeric error wins over write error; Add right object hook runs, numeric others suppress it |
| W16 ArrayIndex | array [12], k="0" | normal baseline vector; length1 |
| W17 ArrayNewIndex | empty array, k="2" | normal NaN all; own2 NaN; length3; holes0,1 |
| W18 ArrayFrozenGrowth | W17 length readonly | strict key2 error; length0; no2 |
| W19 ArrayLengthArithmetic | length12 with holes, k="length", rhs3 | return15/9/36/4/0; length matches; no operand hooks repeated |
| W20 ArrayLengthString | length1, Add rhs"2" | return string"12"; stored length numeric12 |
| W21 ArrayInvalidLength | length1; Sub rhs2, Div rhs2, Mul rhs-1, Rem rhs0 separately | RangeError invalid array length; length1 unchanged |
| W22 ArrayPartialShrink | length4, configurable index3, nonconfigurable index2; Sub rhs3 | strict length error; index3 gone,index2 retained,length3,writable true |
| W23 ArrayReadonlyLength | length12 readonly; OP rhs3 | strict length error; length12; RHS once |
| W24 ArrayRightHook | length12; right object returns3 | H once; baseline vector; length primitive conversion adds no calls/ticks |
| W25 BoxObjectControl | actual Number/Boolean/String/Symbol box object with own writable x12 | normal baseline vector; original object used for both Get/Set; no temporary wrappers |

## Parsing and source locations

All negative rows mean parse SyntaxError, empty effects, no runtime execution.
Prepend `effect(); ` for a separate whole-program parse-before-effects variant:
line remains1 and column increases10. OP variants use two-character tokens.
Parser AST checks do not execute guest text in the host engine.

| ID / name | Source or setup | Literal oracle |
|---|---|---|
| P1 Tokens | `x OP 3;` | punct token OP, start2,end4,loc1:3 |
| P2 Adjacent | `xOP3;` with actual operator inserted | token start1,end3,loc1:2; parses compound |
| P3 Comments | `x/*a*/OP/*b*/3;` | token start6,end8,loc1:7 |
| P4 SpacedToken | `x + = 3;`, minus/star/slash/remainder variants | unsupported or unexpected syntax: = at1:5 |
| P5 MissingRHS | `x OP;` | unsupported or unexpected syntax: ; at1:5 |
| P6 InvalidLiteral | `1 OP 3;` | invalid assignment target at1:1 |
| P7 InvalidBinary | `x + y OP 3;` | invalid assignment target at1:1 |
| P8 InvalidCall | `f() OP 3;` | invalid assignment target at1:1 |
| P9 ParenthesizedTarget | `(x) OP 3;`, `(p.x) OP 3;` | valid identifier/member; no duplicate evaluation |
| P10 RightAssociative | x12,y6; `x OP y OP 3;` | x21/9/216/6/NaN; y9/3/18/2/0 |
| P11 MixedAssign | x12,y0; `x OP y = 3;` | x15/9/36/4/0,y3 |
| P12 OuterAssign | y12; `x = y OP 3;` | x and y15/9/36/4/0 |
| P13 ConditionalRHS | x12; `x OP true ? 3 : missing;` | baseline vector |
| P14 ConditionalArm | x12; `false ? missing : x OP 3;` | baseline vector |
| P15 MultiplicativeRHS | x12; `x OP 2 * 3;` | 18/6/72/2/0 |
| P16 ArrayElement | x12; `[x OP 3];` | array length1,index0 baseline vector; x same |
| P17 StillUnsupported | `x **= 3;`, `x <<= 3;`, `x >>= 3;`, `x >>>= 3;` | unsupported operator: ** / << / >> / >> at1:3 |
| P18 LogicalExcluded | `x &&= 3;`, `x \|\|= 3;`, `x ??= 3;` | unexpected syntax = at1:5 / = at1:5 / ? at1:4; full messages prefixed unsupported or unexpected syntax: |
| P19 BitwiseExcluded | `x &= 3;`, `x ^= 3;`, `x \|= 3;` | unsupported character: & / ^ / \| at1:3 |
| P20 UpdatesExcluded | `x++;`, `--x;` | unsupported operator: ++ at1:2 / -- at1:1 |
| P21 LongEquality | `x === 3;`, `x !== 3;` | unchanged strict binary token start2,end5 |
| P22 ExtraEquals | `x +== 3;` and all OP with appended = | unexpected syntax = at1:5; not silently accepted |
| P23 LineTerminators | `x` then LF/CRLF/U+2028/U+2029 then `OP 3;` | valid compound; operator2:1; UTF16 start2 for one unit or3 for CRLF |
| P24 SourceRetention | `function f() { /*keep*/ x += 3; }` | f.toString() exactly that source |
| P25 Nesting | source formed by joining 130 `x` tokens with ` OP ` then appending `;` | parse syntax nesting limit exceeded at1:636 (128th x); no effects; existing 128 bound unchanged |

| ID / name | Source / action | Exact runtime location |
|---|---|---|
| L1 Binding | `  x OP 3;` missing/TDZ/immutable variants | binding diagnostic1:3 |
| L2 Parenthesis | `  (p[k]) OP rhs;` p null or key-conversion failure | ref location1:4 |
| L3 Dispatch | L2 Get failure instrument uses passed loc | operation location1:3 |
| L4 Coercion | L2 old/right symbol conversion failure | operation1:3 |
| L5 PutFalse | L2 p object with readonly x | operation1:3 |
| L6 RHSChild | `  p[k] OP missing;` | missing diagnostic1:11 |
| L7 KeyChild | `  p[missing] OP 3;` | missing diagnostic1:5 |
| L8 BaseChild | `  missing[k] OP 3;` | missing diagnostic1:3 |
| L9 Sentinel | Get/RHS/left/right/Set returns Q prebuilt at7:9 | exact Q unchanged including7:9 |
| L10 Array | L2 p Array,k length, invalid result | invalid array length1:3 |

## Exact resource and recursion oracles

R rows use one parsed statement `p[k] OP 3;`, p ordinary object.x12, k primitive
"x", unless overridden. steps initially0, calls0,depth0; record peak depth by
overrides that forward all evaluator arguments unchanged. Statement returns its
expression completion; no program/block setup tick. All five variants required.
STEP = runtime RangeError execution step limit exceeded; CALL = runtime RangeError
call depth limit exceeded; DEPTH = runtime RangeError evaluation nesting limit
exceeded. Boxes count primitive ToObject factories only, not object pass-through.

| ID / name | Setup | Literal expected outcome |
|---|---|---|
| R1 Plain | default budgets | normal baseline vector; steps5,peak3,calls0,boxes0 |
| R2 StatementGuard | maxSteps0 | STEP1:1 at1, no reference |
| R3 CompoundGuard | maxSteps1 | STEP1:1 at2, no base |
| R4 BaseGuard | maxSteps2 | STEP1:1 at3, no key |
| R5 KeyGuard | maxSteps3 | STEP1:3 at4, no Get |
| R6 RHSGuard | maxSteps4 | STEP1:9 at5; Get once, no RHS/Set |
| R7 Exact | maxSteps5 | normal baseline vector; steps5 |
| R8 Binding | `x OP 3;`, x12 | steps3,peak3; no target evaluate tick |
| R9 Nullish | p null/U; k object; maxSteps4 | nullish TypeError1:1 at4; no C/RHS |
| R10 CanonicalKey | k object canonical returnsx | steps6,peak3,C1,G1,S1 |
| R11 OrdinaryKey | canonical absent,toString returnsx | steps7,one call; Put adds0 key ticks |
| R12 FallbackKey | toString object,valueOf x | steps8,two calls |
| R13 KeyStep | R10,maxSteps4 | STEP1:1 at5; C0,G0,RHS0,S0 |
| R14 KeyCall | R10,maxCalls0 | CALL1:1 at5; C0,G0,RHS0,S0 |
| R15 OldHook | primitive key,old canonical returns12 | steps6,one call,baseline vector |
| R16 BothHooks | R15 RHS identifier r bound object canonical3 | steps7,two calls,baseline vector |
| R17 OldStep | R15,maxSteps5 | STEP1:1 at6; RHS evaluated, old hook not called, S0 |
| R18 OldCall | R15,maxCalls0 | CALL1:1 at6; RHS evaluated,S0 |
| R19 RHSCallee | `p[k] OP rhs();`, non-ticking builtin returns3 | steps5,one RHS call,baseline vector; callee reference adds0 |
| R20 RHSCallGuard | R19,maxCalls0 | CALL1:9 at5; Get complete; RHS body0,S0 |
| R21 SeedDepth | depth256; evaluate compound directly | DEPTH1:1 at1,depth restored256 |
| R22 ChildDepth | depth255; evaluate compound directly | DEPTH1:1 at2 on base,depth restored255 |
| R23 StepBeforeDepth | R22,maxSteps1 | STEP1:1 at2; depth restored255 |
| R24 Primitive | p true,prototype.x12 | strict x error; steps5,peak3,two boxes |
| R25 PrimitiveKey | R24 canonical key | strict x error; steps6,C1,two boxes |
| R26 PrimitiveRHSGuard | R24,maxSteps4 | STEP1:9 at5; only Get box exists |
| R27 Monotonic | run R1 twice,maxSteps9 | first normal at5; second STEP1:9 at10 after Get; first stored value retained |
| R28 DirectReference | direct Get->binary->Put with primitive-key and primitive operands | steps0; canonical object key variant steps1; no extra Put tick |
| R29 KeyHostSmall | canonical key builtin recursively evaluate same compound AST; m=maxCalls0,1,2 | CALL1:1; steps5,9,13; hooks0,1,2; peak3,4,5; G/RHS/S0 |
| R30 KeyHostDefault | R29 actual constructor default64 | steps261,hooks64,peak67; CALL1:1; G/RHS/S0 |
| R31 KeyGuestSmall | key guest `function h() { return p[k] OP 3; }`; outer statement; m0,1,2 | steps5,10,15; hooks0,1,2; peak3,5,7; CALL1:1 for0,1:23 otherwise |
| R32 KeyGuestDefault | R31 actual constructor default64 | steps325,hooks64,peak131; CALL1:23; G/RHS/S0 |
| R33 KeyStepBeforeCall | R31 m2,maxSteps14 | STEP1:23 at15; hooks2; no third call |
| R34 CoercionHostSmall | primitive key; old canonical hook recursively evaluate compound; m0,1,2 | steps6,11,16; hooks0,1,2; peak3,4,5; CALL1:1; G/RHS1,2,3; S0 |
| R35 CoercionHostDefault | R34 default64 | steps326,hooks64,peak67; G/RHS65; S0; CALL1:1 |
| R36 CoercionGuestSmall | old hook guest `function h() { return p[k] OP 3; }`; m0,1,2 | steps6,12,18; hooks0,1,2; peak3,5,7; CALL1:1 for0,1:23 otherwise |
| R37 CoercionGuestDefault | R36 default64 | steps390,hooks64,peak131; G/RHS65; S0; CALL1:23 |
| R38 RightRecursion | R34-37 but old12,right identifier r object hook recurses; outer `p[k] OP r;`, guest hook `function h() { return p[k] OP r; }`; same key primitive | same exact counts/peaks/locations; G/RHS65 at default; S0 |
| R39 PrimitiveRecursive | R29-32 with p=true,prototype.x12 | same counts; boxes1,2,3 for small;65 default; no Put boxes |
| R40 ExhaustedRetry | after R33 run R1 same evaluator | STEP1:1 at16; no reference/write; fresh evaluator succeeds |

Derivation: key recursion fails before RHS. Outer statement costs1; each attempted
key conversion costs compound/base/key/canonical-lookup =4; host total1+4(m+1).
Guest hook adds return-statement tick per admitted call, total5+5m. Operand
recursion reaches RHS first: one more evaluate tick per attempt, giving1+5(m+1)
and6+6m. The deepest attempted base/key evaluation gives peaks m+3 and2m+3.
Rejected call adds no frame. Do not transfer TS-029's later-key counts to early
Get recursion. Native must actually use omitted maxCalls argument for default64;
an explicitly configured64-only run is insufficient. No generated AST or helper
simulating compound evaluation is runtime evidence for this feature.

## Realm, fault, and cleanup

| ID / name | Setup | Required literal observations |
|---|---|---|
| C1 ForeignKey | evaluator A; B-defined key hook | C sees B; G/R/S see A; result baseline vector; final A,calls0,depth0 |
| C2 ForeignOperands | B-defined old hook,C-defined right hook | hints per V21; L sees B,H sees C; S sees A; final A,0,0 |
| C3 ForeignRHS | B-defined RHS | R sees B; subsequent operand hooks restore A on return; final A,0,0 |
| C4 PrimitiveBoxes | evaluator A; primitive p,foreign key/RHS/hooks | both distinct boxes from A factories/prototypes; original primitive Receivers; no box own writes |
| C5 ForeignObject | B-created object p; evaluator A | p identity/prototype B unchanged; Get/Set Receiver p; no boxing |
| C6 GuestAbrupt | Q independently at B,K,C,G,R,L,H,S | exact Q; stage-prefix trace only; final entry Realm,calls,depth restored |
| C7 HostFault | F independently at B,K,C,G,R,L,H,S | exact same F escapes; no guest completion substitution; stage-prefix trace; restore entry state |
| C8 ForeignFault | B-defined key/old/right/RHS independently F or Q | hook sees B; caller A restored on escape; calls/depth restored |
| C9 RecursiveRealm | R30/32/35/37 foreign B-defined hooks | same exact counts; outer execution A,nested B; final A,0,0 |
| C10 RecursiveBoxes | C9 with primitive key-recursion base | first box A,remaining64 B; boxes65; final A,0,0 |
| C11 SeededCleanup | repeat C6-8 with initial calls2,depth4; adequate limits | final calls2,depth4,entry Realm; steps monotonic |
| C12 PostFailure | after C6-8 remove throwing observer and run x OP3 fresh mutable x12 | normal baseline vector on same evaluator with remaining budget; no leaked Realm/frame |

Do not assert rollback of guest mutations on failures. For all C rows assert
exact key identity, original Receiver, absence of later calls/writes, and preserved
state outside explicitly performed guest side effects. No new native safety claim
until actual default-depth tests and all static coverage gates pass.
