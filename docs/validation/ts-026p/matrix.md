# TS-026P fixed acceptance matrices

These are future acceptance requirements, not executed results. S means guest
source; H means a host driver injecting represented Values or inspecting state.
Run all rows in both Rift hosts. Each row has a stable name as well as an ID;
use those names in readable tests, with explicit braced control flow. Variants
listed in a row are required, not alternatives. Setup/inspection is excluded
from resource counts. U means the actual guest UNDEFINED, never the string.

## V — Complete value and callability coverage

Inject each value as initialized binding x; evaluate both `typeof x;` and
`void x;` using the parsed expression statement (not block's discarded result).
All void results are U. All traces are empty, including callable bodies.

| ID/name | Input variants | Fixed typeof result |
|---|---|---|
| V1 Undefined | U | `undefined` |
| V2 Null | null | `object` |
| V3 Boolean | false, true | `boolean` |
| V4 Number | +0, -0, 1, -1, NaN, Infinity, -Infinity | `number` |
| V5 String | empty, ASCII, surrogate pair, lone high/low surrogate | `string` |
| V6 Symbol | absent/empty/same descriptions; distinct identities; canonical symbol | `symbol` |
| V7 Ordinary | fresh, null-root, nonextensible, inherited-only properties | `object` |
| V8 Array | empty, holes, elements; arrayPrototype | `object` |
| V9 Wrappers | Boolean, Number, String, Symbol boxes from Realm factories | `object` |
| V10 Prototypes | object/boolean/number/string/symbol prototypes | `object` |
| V11 GuestFunction | source present and host-created source null | `function` |
| V12 Builtin | console.log, Number.isFinite, unnamed host builtin; functionPrototype | `function` |
| V13 NumberNamespace | global Number; console object | `object` |
| V14 ForeignRealm | repeat V7-V12 from Realm B while evaluator is A | same V7-V12 strings; Realm remains A |
| V15 FakeCallable | noncallable with own call/name/length/prototype; inherits functionPrototype | `object` |
| V16 MutatedFunction | callable with null prototype; deleted/replaced visible name/length/toString/call | `function` |
| V17 PoisonConversions | noncallable and callable with throwing/host-fault canonical hook, valueOf, toString and symbol tag | `object` / `function`; zero hook/property reads |

V17 uses a host subclass instrumenting internalGet as well as own methods.
Classification must not even look up the hook. V9 includes Symbol box versus
its primitive payload; V16 tests saved builtin identity after visible mutation.
Do not expose absent guest constructors merely to express these cases.

## B — Bindings, references and shadowing

Runtime errors below have phase runtime and name ReferenceError unless specified.
Use fresh Realm/program for each source; ordinary x is absent unless stated.

| ID/name | Exact source or setup | Fixed outcome |
|---|---|---|
| B1 Missing | `typeof x;` | string `undefined`, no binding created |
| B2 ParenthesizedMissing | `typeof (((x)));` | string `undefined`, no binding created |
| B3 VoidMissing | `void x;` / `void (((x)));` | `x is not defined` at1:6 /1:9 |
| B4 TDZ | `typeof x; let x;` / `void x; let x;` | `x is not initialized` at1:8 /1:6 |
| B5 ParenthesizedTDZ | `typeof (x); let x;` / `void (x); let x;` | same message at1:9 /1:7 |
| B6 SelfInitialization | `let x = typeof x;` / `let x = void x;` | same message at1:16 /1:14; binding remains uninitialized |
| B7 Initialized | `let x;` then inspect both operators on x | `undefined` /U |
| B8 OuterBinding | H outer x=7, inner empty environment | `number` /U; outer unchanged |
| B9 ShadowTDZ | H outer x=7, inner uninitialized x | `typeof x;` and `void x;` throw at1:8 /1:6; never read outer |
| B10 ShadowValue | H outer x=7, inner initialized x=false | `boolean` /U |
| B11 HoistedFunction | S `let t = typeof f; function f() {}` | t=`function` before declaration executes |
| B12 Parameter | S `function f(x) { return typeof x; }` call with omitted, null, 7 | `undefined`, `object`, `number` |
| B13 UndefinedShadow | H inner binding undefined=7, then `typeof undefined;` / `void undefined;` | `number` /U; void does not read global undefined to produce its result |
| B14 NestedMissing | `typeof x.y;` / `void x.y;` | `x is not defined` at1:8 /1:6 |
| B15 CallMissing | `typeof x();` / `void x();` | `x is not defined` at1:8 /1:6 |
| B16 ConditionalMissing | `typeof (true ? x : 1);` | `x is not defined` at1:16; typeof exception does not propagate |
| B17 LogicalMissing | `typeof (false \|\| x);` | `x is not defined` at1:18 |
| B18 AssignmentMissing | `typeof (x = 1);` | `x is not defined` at1:9; no new binding |
| B19 SkippedMissing | `typeof (false && x);` | `boolean`, no x resolution |
| B20 PreservedFailure | H internalGet/call returns sentinel throw named ReferenceError | original throw identity/diagnostic/value retained by both operators |

B4/B5 run through block instantiation, not individually dispatched statements
without declaration setup. B8-B10 also have source equivalents with nested
blocks; assert values/errors, not merely successful parsing. Preserve existing
duplicate-declaration and parameter binding rules.

## E — Operand effects and abrupt propagation

H b()/k() append B/K and return captured object/key. Key canonical hook appends
C, checks receiver is key and hint is `string`, and returns `x`. Target subclass
internalGet appends G and returns number7; do not count hook-object reads as G.
For E1-E12 use both `typeof b()[k()];` and `void b()[k()];`; member loc1:8 /1:6.
Default successes are `number` /U. Check each effect exactly once.

| ID/name | Setup variation | Fixed result / trace |
|---|---|---|
| E1 ReadOrder | canonical hook | B K C G; success |
| E2 PrimitiveKey | k returns string x, numeric 1, or symbol | B K G; target receives exact converted key/symbol identity |
| E3 BaseAbrupt | b returns sentinel guest throw | B; identical throw; no key evaluation |
| E4 KeyAbrupt | k returns sentinel guest throw | B K; identical throw; no conversion/read |
| E5 ConversionAbrupt | canonical hook throws | B K C; identical throw; no target read |
| E6 ReadAbrupt | target internalGet throws | B K C G; identical throw |
| E7 CapturedBase | k changes binding used by b to another object | B K C G; reads original object |
| E8 KeyMutation | C changes original target x from7 to true | B K C G; `boolean` /U |
| E9 CapturedKey | C rebinds key variable to new key | B K C G; original key converted once |
| E10 InvalidBase | b returns null/U/boolean/number/string/symbol | B K; TypeError `property base must be an object` at member loc; no C/G |
| E11 InvalidHook | key canonical hook is number7 | B K; TypeError `symbol toPrimitive method is not callable` at member loc |
| E12 ObjectHookResult | canonical hook returns object | B K C; TypeError `cannot convert object to primitive` at member loc |
| E13 OrdinaryFallback | `typeof o[k];` / `void o[k];`, no canonical hook, toString returns object, valueOf returns x | trace T V G; `number` /U, string hint order |
| E14 MissingProperty | own absent, inherited absent | `undefined` /U; one target internalGet |
| E15 InheritedProperty | inherited number or callable | `number` or `function` /U; original base receiver |
| E16 ReturnedPoison | call returns V17 poisoned object | call once; `object` or `function` /U; no conversion |
| E17 AssignmentEffects | `typeof (o.x = 9);` / `void (o.x = 9);` | write once, value9 retained, `number` /U |
| E18 UserThrow | `function f() { throw 9; }` then `typeof f();` / `void f();` | Uncaught `guest throw` at declaration1:16, value9 retained |
| E19 Noncallable | `typeof Number();` / `void Number();` | TypeError `value is not callable` at1:8 /1:6 |
| E20 ForeignSuccess | B-defined builtin returns primitive or foreign object | runs with B, result classified in A, no conversion; calls/depth restored |
| E21 ForeignAbrupt | B-defined call/key hook returns sentinel throw | identical completion and restoration to A |
| E22 ForeignHostFault | B-defined call/key hook throws sentinel host Error | same host identity escapes, A/calls/depth restored; no wrapping |
| E23 DirectGetHostFault | operand target internalGet throws host sentinel | identity escapes; depth restored; calls unchanged |
| E24 ContinuedEvaluator | after each E20-E23, evaluate `typeof x;` with initialized x | success with remaining budget, no stale mode or Realm |

Accessor/proxy behavior is not implemented: target subclass instrumentation is
host evidence for dispatch and completion plumbing, not guest accessor support.

## P — Parser, precedence, source and delete integration

Unless marked parse error, assert exact AST grouping and runtime result with
preseeded x=7, o={x:7}, f returning7. Parse failures are SyntaxError/phase parse.

| ID/name | Exact source | Expected |
|---|---|---|
| P1 MemberPrecedence | `typeof o.x;` / `void o.x;` | unary(member); `number` /U |
| P2 CallPrecedence | `typeof f();` / `void f();` | unary(call); `number` /U |
| P3 AddPrecedence | `typeof x + 'x';` | binary(unary,x-string); `numberx` |
| P4 MultiplyPrecedence | `void x * 2;` | binary(unary,2); NaN |
| P5 StrictComparison | `typeof x === 'number';` | true |
| P6 LooseComparison | `void x == null;` | true |
| P7 Conditional | `typeof x ? 1 : 2;` | 1 |
| P8 RightAssociative | `typeof void x;` / `void typeof x;` / `typeof typeof x;` | `undefined` /U /`string` |
| P9 OtherUnary | `!typeof x;` / `typeof !x;` / `typeof -x;` / `+void x;` | false /`boolean` /`number` /NaN |
| P10 DeleteValue | `delete typeof x;` / `delete void x;` | true /true; x unchanged |
| P11 DeleteMissing | x absent: same P10 sources | true /ReferenceError `x is not defined` at1:13 |
| P12 DeleteProperty | `typeof delete o.x;` / `void delete o.x;` | `boolean` /U; own x removed |
| P13 DeleteIdentifier | `typeof delete x;` / `void delete x;` | parse `delete of an identifier is not allowed` at1:8 /1:6 |
| P14 InvalidAssignment | `typeof x = 1;` / `void x = 1;` | parse `invalid assignment target` at1:1 |
| P15 MissingOperand | `typeof;` / `void;` | parse `unsupported or unexpected syntax: ;` at1:7 /1:5 |
| P16 ReservedBindings | `let typeof = 1;` / `let void = 1;` | parse `expected binding identifier` at1:5 |
| P17 IdentifierPrefixes | `let typeofx = 7; let voidx = 8;` | ordinary names, no keyword splitting |
| P18 PropertyWords | `let o = {typeof: 7, void: 8};` then read o.typeof/o.void |7 /8; words still permitted as property names |
| P19 LineTerminators | operator + LF/CR/CRLF/LS/PS + `x;`; repeat block-comment newline | successful values; operand loc2:1 (plain terminator) |
| P20 ThrowNewline | `throw\n typeof x;` | parse `newline after return/throw is unsupported` at1:1 |
| P21 UnsupportedSuper | `typeof super.x;` / `void super.x;` | parse `unsupported or unexpected syntax: super` at1:8 /1:6 |
| P22 UnsupportedComma | `typeof (x, 1);` / `void (x, 1);` | parse `expected ')', found ','` at1:10 /1:8 |
| P23 SourceRetention | `function f() { /*keep*/ return typeof void 0; }` | f.toString() exactly that declaration, spaces/comment retained |
| P24 AnonymousRetention | `(function() { return void 0; });` | returned function's toString exactly `function() { return void 0; }` |
| P25 ParseDepth | `typeof ` +126 opening parens+`1`+126 closing parens+`;` | parse `syntax nesting limit exceeded` at1:134 |
| P26 VoidParseDepth | `void ` +126 opening parens+`1`+126 closing parens+`;` | same error at1:132 |

P25/P26 include statement nesting: statement depth1, outer expression2,
operand expression3, then 126 parentheses push to129 at the literal. Keep lexer
100000 UTF-16 cap and all existing unrelated parser tests unchanged.

## R — Exact resource and cleanup boundaries

Use fresh evaluator, steps0/calls0/depth0 except where explicitly seeded. All
single-statement rows invoke statement once; bindings/AST/setup already exist.
Failures: RangeError/runtime with existing exact message. Step failure is
`execution step limit exceeded`; frame failure `evaluation nesting limit exceeded`;
call failure `call depth limit exceeded`. Standard unwind returns calls/depth0.

| ID/name | Input and limit | Fixed count/outcome |
|---|---|---|
| R1 DirectValue | `typeof x;` / `void x;`, initialized x |3 ticks;0 calls; max depth3 |
| R2 MissingAndTDZ | x missing or TDZ, same sources |3 ticks including failure; missing typeof succeeds; other cases B diagnostics |
| R3 Parentheses | `typeof (((x)));` / `void (((x)));` |3 ticks; same depth3 |
| R4 StatementLimit | maxSteps0, R1 |steps1; step failure at1:1; no evaluation |
| R5 UnaryLimit | maxSteps1, R1 |steps2; step failure at1:1 |
| R6 OperandLimit | maxSteps2, R1 including missing/TDZ |steps3; step failure at1:8 /1:6 wins over resolution |
| R7 ExactSuccess | maxSteps3, R1 |success; no classification tick |
| R8 Member | `typeof o[k];` / `void o[k];`, primitive key |5 ticks; max depth4;0 calls |
| R9 CanonicalKey | R8 object key with non-ticking builtin hook |6 ticks;1 call; target Get once |
| R10 OrdinaryKey | absent canonical; toString primitive / object then valueOf primitive |7 /8 ticks;1 /2 calls |
| R11 KeyGuard | R9 maxSteps5 |steps6; step failure at member1:8 /1:6;0 calls,0 target Gets |
| R12 CallGuard | R9 maxCalls0 |steps6; call failure at member loc;0 invoked hooks/Gets |
| R13 InvalidBase | `typeof null[k];` / `void null[k];`, object key |5 ticks; no key conversion/call; base TypeError even maxSteps5 |
| R14 DirectCall | `typeof f();` / `void f();`, non-ticking builtin returns7 |3 ticks;1 call (callee reference has no evaluate tick); max depth3 |
| R15 NonreferenceUnary | `typeof void 0;` / `void typeof 0;` |4 ticks; max depth4;0 calls |
| R16 UnaryFrameBoundary | seed depth256, call evaluate on unary directly |1 tick; frame failure1:1; restored depth256 |
| R17 IdentifierFrameBoundary | seed depth255, evaluate unary directly |2 ticks; operand frame failure1:8 /1:6; restored255, including missing typeof |
| R18 GuardPriority | R17 maxSteps1 |steps2; step failure at operand wins over frame check; depth restored255 |
| R19 HostRecursiveKey | canonical host hook recursively calls evaluate on same unary AST, limit m |initial statement then m+1 unary/member/base/key/conversion attempts:1+5(m+1) ticks; m invoked hooks; call failure at member loc;0 Gets |
| R20 NativeDefaultHost | R19 m=0,1,2,64 |6,11,16,326 ticks; real native default64 must return failure without crash |
| R21 GuestRecursiveKey | hook h from `function h() { return typeof o[k]; }` or `function h() { return void o[k]; }`; initial matching statement |6+6m ticks; m invoked hooks; call failure at declaration member1:30 /1:28;0 Gets |
| R22 NativeDefaultGuest | R21 m=2,64 |18 /390 ticks; actual default64 must not crash; calls/depth0 |
| R23 StepBeforeCall | R21 m2,maxSteps17 |step18 failure at declaration member1:30 /1:28 wins over call failure |
| R24 MonotonicReuse | R1 maxSteps5, then R1 again on same evaluator |first3 success; second ticks4 statement,5 unary,6 operand failure at operand; no reset |
| R25 PureHelper | directly classify every V row with evaluator budget exhausted |no tick/call/Realm dependency; exact strings; no host property hooks |

R19 recursion is evaluate(unary), not statement(unary), inside the host hook;
this distinction fixes the recurrence. R21 h is installed by host as k's
canonical hook after parsing its exact declaration; exclude setup execution.
Each guest body adds return+unary+member+base+key+conversion ticks. Foreign-Realm
variants R19/R21 require A restored after B calls. For success, guest throw,
step/call/frame failure and host fault, assert previous calls/depth/Realm, with
steps monotonic; then a fresh operation proves cleanup. No body-conversion
recursion is created by typeof/void themselves.

## C — Runtime-read fixtures and preserved consumers

| ID/name | Required independent source/host assertion |
|---|---|
| C1 BasicFixture | read fixture from disk at runtime: assert `typeof null`=`object`, `typeof 7`=`number`, `typeof true`=`boolean`, `typeof ''`=`string`, `typeof undefined`=`undefined`, `typeof missing`=`undefined`, `typeof Number`=`object`, `typeof console.log`=`function`; `(void 0) === undefined` is true |
| C2 OneEffect | fixture local counter; function increments then returns poisoned object; both operators increment exactly once each, total2; no conversion trace |
| C3 InjectedFixture | host injects symbols, wrappers, foreign functions and poison hooks; runtime-read source asserts fixed V strings and U, not host-generated expected strings |
| C4 SourceConsumer | exact P23/P24 retained source through inherited/saved Function toString; typeof result does not change source metadata |
| C5 DeleteMigration | P10/P11 in existing delete driver; baseline raw internalDelete and Array C3 success tests retained |
| C6 UnchangedConsumers | strict/loose equality, truthiness, primitive member negatives, key conversion, Number formatting, Object tags, Array join/map keep prior assertions |
| C7 CLIPhases | add runtime-read success with literal expected stdout; malformed `typeof;` parse status2; `void missing;` and `typeof x; let x;` runtime status1 with exact diagnostics |
| C8 NoSideEffectsOnParseFailure | `effect(); typeof;` parses whole program first; no effect; error1:17 |

C7 uses current CLI conventions; stderr includes supplied fixture filename and
line/column, not an implementation-generated oracle. Preserve baseline driver
denominator and add one dedicated driver/native gate plus appropriate CLI cases.
Its exact success source is `console.log(typeof missing, typeof null, void 0);`
with stdout `undefined object undefined\n`, empty stderr and status0. The three
negative sources have empty stdout: `typeof;` reports parse SyntaxError
`unsupported or unexpected syntax: ;` at1:7; `void missing;` reports runtime
ReferenceError `missing is not defined` at1:6; `typeof x; let x;` reports runtime
ReferenceError `x is not initialized` at1:8.
