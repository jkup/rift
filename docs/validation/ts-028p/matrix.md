# TS-028P named expected-result matrices

These are implementation obligations derived from source inspection, not test
results. Each row has an independent literal oracle. Fresh Realm/evaluator per
row unless specified; setup is outside measured execution. `U` means guest
undefined, `s`/`t` are distinct host-created symbols with description "x". Host
injection uses existing factories/bindings; it adds no guest API. Check numeric
payloads with SameValue where NaN/-0 matters and strings by UTF-16 units.
`run` means parse once, then evaluator.block; assert the final expression's
completion with statement/evaluate when block would discard its normal value.
All guest diagnostic phases below are runtime unless marked parse.

## V — Values and existing properties

| ID/name | Source/setup | Expected |
|---|---|---|
| V1 BooleanTrue | `true.valueOf();` | true |
| V2 BooleanFalse | `false.toString();` | "false" |
| V3 Number | `(2).valueOf();` | 2 |
| V4 NegativeZero | prebind p=-0; `p.valueOf();` | -0, reciprocal -Infinity |
| V5 Nonfinite | p=NaN,+Infinity,-Infinity, individually; `p.valueOf();` | identical numeric payload |
| V6 StringMethods | `'ab'.valueOf();` / `'ab'.toString();` | "ab" each |
| V7 Symbol | `s.valueOf();` / `s.toString();` | same symbol s / "Symbol(x)" |
| V8 SymbolHook | prebind h=wellKnownToPrimitive; `s[h]('ignored');` | same s |
| V9 Missing | each of false,2,'ab',s as p; `p.absent;` | U |
| V10 Inherited | host define respective prototype x=17 nonenumerable; `p.x;` for all four | 17 |
| V11 RootInherited | define Object root x=19; `p.x;` for all four | 19 |
| V12 UndefinedShadow | type prototype x=U, Object root x=19 | U, no fallback past own descriptor |
| V13 SymbolIdentity | type prototype[s]=23; `p[s]; p[t];` independently for all four | 23 / U |
| V14 SameTextString | type prototype['Symbol(x)']=29, no symbol property; `p[s];` | U |
| V15 ObjectControl | prebound object x=31; `p.x;` | 31; no wrapper, identical Receiver p |
| V16 BoxControl | explicit String box 'ab' owns x=37; `p.x; p[0];` | 37 / "a"; original box Receiver |
| V17 CallableControl | prebound builtin f; `f.name;` | original registration name |
| V18 Null | `null.x;` | TypeError nullish-box message at 1:1 |
| V19 Undefined | `undefined.x;` | same at 1:1 |
| V20 NumberToStringBoundary | `(2).toString();` in fresh Realm | "[object Number]", existing Object method; Number radix formatter still absent |
| V21 BooleanMethodIdentity | `true.valueOf;` | exact Realm booleanPrototype stored method |
| V22 NoBaseCoercion | put throwing conversion hooks on type prototype; `p.x;` with x=41 | 41; base conversion hooks never called |

## S — UTF-16 and virtual own properties

| ID/name | Source/setup | Expected |
|---|---|---|
| S1 ASCII | `'ab'[0];` / `'ab'[1];` / `'ab'.length;` | "a" / "b" / 2 |
| S2 Empty | `''.length;` / `''[0];` | 0 / U |
| S3 Pair | host p=U+D83D U+DE00; `p.length; p[0]; p[1]; p[2];` separately | 2 / lone D83D / lone DE00 / U |
| S4 LoneUnits | p=U+D800 then p=U+DC00; `p[0]; p.length;` | same lone unit / 1 for each |
| S5 Nul | p='a'+U+0000+'b'; `p[1]; p.length;` | one NUL unit / 3 |
| S6 NumericZero | `'ab'[-0];` | "a" |
| S7 Nonindices | `'ab'[k];`, k='-0','01','1.0','1e0','',-1,0.5,2,NaN,Infinity separately | U for each, fresh prototype |
| S8 Canonical | `'ab'['0'];` / `'ab'['1'];` | "a" / "b" |
| S9 VirtualWins | String root '0'='z'; `'ab'[0];` | "a" |
| S10 MissingInherits | String root '2'='z'; `'ab'[2];` | "z" |
| S11 NoncanonicalInherits | String root '-0'='z'; `'ab'['-0'];` | "z" |
| S12 LengthOwn | String root length remains0; `'ab'.length;` | 2 |
| S13 DescriptorControl | intercepted temporary String wrapper for 'ab' | own0 value'a', writable=false, enumerable=true, configurable=false; length2 false/false/false |
| S14 NoMaterialization | inspect wrapper's detached ordinary/virtual behavior using existing APIs | virtual0 survives compatible redefinition; read does not add mutable storage or alter payload |

S3-S5 use host-injected payloads or literal UTF-8 fixtures supported by the lexer;
do not assume guest Unicode escape or charCodeAt support. Assert code units in
the host driver, not through a new String built-in.

## E — Effects, keys, capture and competing errors

For `b()[k()](a(), a());`, non-ticking seeded builtins append B,K,A; b returns
p, k returns key object; its canonical hook appends C, returns 'm', and asserts
receiver=key and sole hint='string'. Type prototype m is a builtin appending M,
returning this. An instrumented factory wrapper appends G on its top-level Get.
Use a host sentinel throw completion Q (payload91, diagnostic at7:9) and one
Error instance F. B/K/C/G/A/M traces are explicit observables, not timers.

| ID/name | Variant | Expected |
|---|---|---|
| E1 CallOrder | p=true | BKCGAAM; result true; one conversion/Get/call, two args |
| E2 ReadOrder | `b()[k()];` | BKCG; result exact method object |
| E3 BaseThrow | B returns Q | identical Q; B only |
| E4 KeyExpressionThrow | K returns Q, p=null | identical Q; BK; no boxing error/hooks |
| E5 NullBeforeHook | p=null then U, separately | BK; TypeError nullish-box message1:1; no C/G/A |
| E6 HookThrow | C returns Q | BKC; identical Q; no G/A |
| E7 GetThrow | wrapper Get returns Q | BKCG; identical Q; no A |
| E8 ArgumentThrow | first A returns Q | BKCGA; identical Q; no second A/M |
| E9 Noncallable | m=7 | BKCGAA; TypeError `value is not callable`1:1 |
| E10 MissingCall | no m | same as E9; U callee; args still run |
| E11 ArgumentWins | m=7 and first A returns Q | BKCGA; Q wins over noncallability |
| E12 HookNoncallable | canonical method=7 | BK; TypeError `symbol toPrimitive method is not callable`1:1 |
| E13 HookObject | C returns object | BKC; TypeError `cannot convert object to primitive`1:1 |
| E14 OrdinaryFirst | canonical absent; toString appends T returns 'm' | BKTGAAM; no valueOf call |
| E15 OrdinaryFallback | toString T returns object; valueOf V returns 'm' | BKTVGAAM |
| E16 OrdinaryMissing | both ordinary methods noncallable | BK; cannot-convert TypeError; no G |
| E17 SymbolResult | C returns s, prototype[s]=m | BKCGAAM; exact symbol identity passed to Get |
| E18 PrimitiveKeys | keys null,U,true,false,0,-0,NaN,Infinity | Get keys 'null','undefined','true','false','0','0','NaN','Infinity'; zero key hooks |
| E19 KeyRebinding | K changes variable holding key after returning old object | old key converted exactly once |
| E20 BaseRebinding | K replaces p binding with false while captured p=true | result true, wrapper for true |
| E21 PrototypeMutation | C changes type prototype m from old to new | new method called; BKCGAAM |
| E22 PrototypeDeletion | C deletes m, no inherited m | U read; call runs args then noncallable error |
| E23 ArgumentMutation | first A replaces prototype m and p binding | captured old method and primitive still used |
| E24 Chain | `'ab'[0].length;` | 1 |
| E25 MissingChain | `'ab'.x.y;` | nullish-box TypeError1:1 on U; first read succeeded |
| E26 Typeof | `typeof false.x;` | 'undefined' |
| E27 Void | `void false.x;` | U; read still performed |
| E28 InControl | `'x' in false;` | retained RHS TypeError; no boxing |
| E29 NestedDelete | `delete 'ab'.x.y;` | nullish-box TypeError1:8 |
| E30 KeyEffectsOnPrimitives | run E2/E6/E12 for Number,String,Symbol as well | identical sequencing/error identities, original respective Receiver |

## M — Methods, Realm and wrapper lifetime

| ID/name | Construction | Expected |
|---|---|---|
| M1 GuestThis | host install guest `function f() { return this; }` as each type's m; `p.m();` | original primitive, including -0 and symbol identity |
| M2 Parenthesized | `(p.m)();` | same primitive this |
| M3 Detached | `let f = p.m; f();` with M1 method | U |
| M4 ConditionalValue | `(true ? p.m : missing)();` | U |
| M5 LogicalValue | `(p.m || missing)();` | U |
| M6 DetachedBrand | `let f = 'x'.valueOf; f();` | TypeError `receiver is not a string`1:22 |
| M7 BorrowedCall | `'x'.valueOf.call('y');` | 'y' through existing Function.call |
| M8 LocalLookup | A boolean root x=1, B root x=2; A reads primitive supplied by B | 1 |
| M9 ForeignBox | A reads B's explicit Boolean box x inherited | 2 |
| M10 ForeignMethod | A root m is B-defined builtin returning this, recording context.realm | original p; method sees B; caller restored A |
| M11 ForeignGuest | B guest m body `return this.x;`, A root x=1, B root x=2 | 2: body read boxes in B |
| M12 ForeignKey | A p[k]; key hook B-defined, returns x and mutates A root x=3 | 3; hook sees B; wrapper constructed in A before hook; caller restored A |
| M13 SeparateReads | instrument A factory; read p.x twice | two distinct wrappers, both correct A prototype; no retained per-primitive box |
| M14 ReceiverObservation | wrapper top-level Get records receiver/loc | exact original primitive Value, not wrapper; caller's Get location |
| M15 BoxingInsideMethod | A root m=B's Object.valueOf; `p.m();` | new B wrapper carrying p; distinct from A lookup wrapper |
| M16 DetachedRead | detached guest body `return this.x;` | nullish-box TypeError at body's member location; no global-this substitution |
| M17 RetainedEffects | method writes separate object then returns Q or throws F | mutation retained; same Q/F; A restored, calls/depth0 |
| M18 FreshPrototype | read, mutate prototype x from1 to2, read again | 1 then2; no property-result cache |

## W — Reused references and unchanged write boundary

Direct host references use loc={line:7,column:9}, operation loc={line:8,column:4}.
Key hook returns 'x' on first call and 'y' on second. Object owns x=1,y=2.

| ID/name | Operation | Expected |
|---|---|---|
| W1 ReadTwice | getValue same object ref twice | 1,1; one hook; ref.key string Value 'x' |
| W2 FreshReferences | two refs with same key object | 1,2; two hooks |
| W3 ReadThenWrite | Get then Put 3 on same object ref | x=3,y=2; one hook; normal3 |
| W4 MutationAfterRead | Get, replace key methods, Put 3 | x=3; no second key effect |
| W5 SymbolCache | hook returns s then t; read then write | only s property changed; exact s retained in ref.key |
| W6 PrimitiveReadWrite | type root x=1; Get then Put3 for each nonnull primitive | read1; one hook; write TypeError `property base must be an object` at7:9; prototype x still1 |
| W7 Nullish | null/U Get then separate Put attempt | read nullish-box error; write old object-only error; both7:9; zero hooks |
| W8 ConversionFailure | key returns Q then succeeds on retry | first identical Q and original ref.key; retry converts again |
| W9 DispatchFailureCache | key succeeds; Get returns Q, next Get normal | first identical Q; next uses cached x; one hook |
| W10 HostFailureCache | key succeeds, Get throws F; retry | same F escapes; cached x retained; retry no key hook |
| W11 ConversionHostFault | key Get/call throws F | same F; raw key unchanged; guards restored |
| W12 NoValueCache | Get x=1; mutate x=4; Get same ref | 1 then4, one key hook |
| W13 SimplePrimitiveWrite | `p[k] = rhs();`, rhs non-ticking appends R | R then old object-only error1:1; no key hook/box/Set |
| W14 RHSAbrupt | W13 rhs returns Q | identical Q, no write check/key hook |
| W15 SimpleObjectWrite | object p; rhs mutates key's conversion to y | rhs then one hook; y receives RHS value |
| W16 ParseBoundary | `p.x += 1;`, `p.x++;`, `++p.x;`, `p.x &&= 1;` | parse SyntaxError: `unsupported operator: +=`1:5, `unsupported operator: ++`1:4, same1:1, `unsupported or unexpected syntax: =`1:7; no effects |
| W17 ReadBeforeNumericFailure | direct Get yields symbol s; toNumber then attempted Put only on success | symbol-number TypeError; no Put, original property intact |
| W18 ReadBeforeRHSFailure | direct Get then simulated RHS Q | Q; no Put; prior read/key effects retained |
| W19 LocationSplit | direct ref7:9, Get loc8:4 | boxing/key errors7:9; instrumented Get receives8:4; returned Q remains7:9 |
| W20 DeleteControl | `delete 'ab'[0];` / `delete 'ab'.x;` | nonconfigurable TypeError1:1 / true; existing delete contract |

W17/W18 are explicit API sequencing controls, not implementation of compound
operators. Future logical assignment needs its own branch-skipping matrix.

## R — Exact work, guard precedence and cleanup

Preparse `p[k];`, prebind p=true and k='x'; type prototype x=7. Statements cost
one tick; member/base/key each one; ToObject/Get/key caching zero. A canonical
object key adds one lookup tick; non-ticking builtin hooks add no body ticks.
Error messages are existing `execution step limit exceeded`, `evaluation nesting
limit exceeded`, `call depth limit exceeded`, with RangeError runtime phase.

| ID/name | Setup/limit | Expected counts/result |
|---|---|---|
| R1 Primitive | default | 7; steps4, peak depth3, calls0 |
| R2 StatementGuard | maxSteps0 | step1 failure1:1, no base/key |
| R3 MemberGuard | maxSteps1 | step2 failure1:1 |
| R4 BaseGuard | maxSteps2 | step3 failure1:1 |
| R5 KeyGuard | maxSteps3 | step4 failure1:3 |
| R6 Exact | maxSteps4 | 7, steps4 |
| R7 Nullish | p=null/U, object k, maxSteps4 | nullish-box error1:1, steps4, no key tick/call |
| R8 Canonical | object key hook returns x | 7; steps5, one invoked hook |
| R9 OrdinaryFirst | canonical absent; toString returns x | 7; steps6, one invoked hook |
| R10 OrdinarySecond | toString object, valueOf x | 7; steps7, two invoked hooks |
| R11 HookTickGuard | R8 maxSteps4 | step5 failure1:1; no hook/Get |
| R12 CallGuard | R8 maxCalls0 | steps5; call-limit error1:1; no hook/Get |
| R13 SeededDepth | depth256, evaluate member directly | step1; frame error1:1; depth restored256 |
| R14 ChildDepth | depth255, evaluate member directly | step2; base frame error1:1; depth restored255 |
| R15 StepWins | R14 maxSteps1 | step2 failure wins before child frame increment |
| R16 Calls | `p.m();`, non-ticking method returning7 | steps4, one invoked method, peak depth3 |
| R17 CallArguments | `p.m(1, 2);` | steps6, one method, peak depth3 |
| R18 DirectHelper | direct Get with primitive key / canonical object key | steps0 /1; calls0 after return; second same-ref read adds0 |
| R19 Monotonic | two R1 runs, same evaluator maxSteps7 | first7 at4; second key step8 fails1:3; no reset |
| R20 HostRecursiveKey | canonical builtin recursively evaluate same member AST; maxCalls m | 1+4(m+1) ticks, m hooks; no target Get; call-limit1:1 |
| R21 HostLimits | R20 m=0,1,2, actual default64 | 5,9,13,261 ticks; default64 hooks, peak depth67; no native crash |
| R22 GuestRecursiveKey | hook from `function h() { return p[k]; }`; initial `p[k];`; maxCalls m | 5+5m ticks; m hooks; no target Get |
| R23 GuestLimits | R22 m=0,1,2, actual default64 | 5,10,15,325 ticks; m0 error1:1, positive m error1:23; default peak depth131 |
| R24 StepBeforeCall | R22 m2,maxSteps14 | step15 failure1:23 before call limit |
| R25 ForeignRecursion | R21/R23 hooks B-defined, evaluator A | same counts; A restored, calls/depth0 |
| R26 AbruptCleanup | Q from key/Get/method | identical completion/value/diagnostic; entry Realm/calls/depth restored |
| R27 HostCleanup | F from wrapper factory/key Get/key call/target Get/method | same host F escapes; no guest wrapping; entry guards/Realm restored |
| R28 Retry | after R26/R27, fresh successful operation on same evaluator with budget remaining | succeeds, steps increase; no stale call/frame/Realm state |
| R29 LookupDepth | 1000-link host-built ordinary prototype chain, x at end | R1 steps4, no guest calls; no recursive JS stack walk |
| R30 NoWrapperCache | R20/R22 instrumentation | one fresh box per attempted conversion, including final denied hook; m+1 boxes |

R20 starts with one statement; each nested evaluate costs member+base+key+hook=4.
R22 adds return statement per guest invocation, hence5. No nested parse/setup
charges. Default64 must actually run in native with constructor default, not only
an explicit small substitute. R27 factory-fault testing may subclass Realm to
throw after initialization; do not change production factories for instrumentation.
Seeded depth restores its entry value, not zero. After exhausted budgets use a
fresh evaluator for success and verify the old evaluator remains exhausted.

## C — Runtime-read fixtures and preservation

| ID/name | Disk-read source/requirement | Expected |
|---|---|---|
| C1 Basic | `console.log('ab'[0], 'ab'.length, true.valueOf(), (2).valueOf());` | stdout `a 2 true 2\n`, stderr empty, exit0 |
| C2 Methods | `console.log('x'.toString(), false.toString(), typeof (1).missing);` | `x false undefined\n`, stderr empty, exit0 |
| C3 Nullish | `null.x;` | no stdout; runtime TypeError nullish-box message1:1, exit1 |
| C4 Write | `'ab'[0] = 'z';` | no stdout; runtime TypeError old object-only message1:1, exit1 |
| C5 Effects | `let n = 0; let k = {toString: function() { n = n + 1; return 'length'; }}; console.log('ab'[k], n);` | `2 1\n`, stderr empty, exit0 |
| C6 Injected | host s symbol(x); `console.log(s.toString(), s.valueOf() === s);` | `Symbol(x) true\n`, exit0; dedicated injected driver |
| C7 UnsupportedBeforeEffects | `effect(); p.x += 1;` | parse SyntaxError `unsupported operator: +=`1:15, no effect(), exit2 |
| C8 PreservedBaseline | all189 cases/29 native entries and old expected records | retain names/counts; only README's enumerated expectation migrations |
| C9 NewDriver | named scenarios with readable setup/action/assertion | additive native build AND independently parsed static coverage; no dynamic tier |
| C10 SourceRetention | `function f() { /*keep*/ return 'ab'[0]; }` | Function.toString exact declaration including comment/spaces |

No generated output becomes an oracle. A mismatch with these derived counts or
diagnostics must be reported and reviewed before adjusting an expectation.
