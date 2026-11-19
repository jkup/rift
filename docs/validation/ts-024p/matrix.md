# TS-024P independent acceptance matrix

Proposed, not executed. T/F are fixed true/false oracles. Every equality row must
also run `!=` with the complementary normal boolean and the same trace; abrupt
rows must remain abrupt unchanged. For every pair row run both operand orders
on fresh state, including the diagonal. Never derive an oracle from host loose
equality or from the proposed helper. Test primitive pairs directly and through
runtime-read guest operands; inject symbols/boxes where no guest factory exists.

## K: all 49 ordered represented kind pairs

Representatives U=undefined, L=null, B=false, N=0, S="", Y=one fresh symbol,
O=one ordinary object whose own protocol hook logs `p:default;` and returns 0.
Rows are left operands, columns right operands. Reuse O and Y on the diagonal.

| K row / right | U | L | B | N | S | Y | O |
|---|---|---|---|---|---|---|---|
| U | T | T | F | F | F | F | F |
| L | T | T | F | F | F | F | F |
| B | F | F | T | T | T | F | T |
| N | F | F | T | T | T | F | T |
| S | F | F | T | T | T | F | T |
| Y | F | F | F | F | F | T | F |
| O | F | F | T | T | T | F | T |

Exactly O/B, O/N, O/S, O/Y and their reverses log `p:default;` once; every
other cell logs empty. O/Y is false after conversion, not a Symbol TypeError.
Each converting cell costs one direct-helper tick and one call to a zero-tick
host builtin hook. All other cells cost zero ticks/calls.

## V: payload and conversion distinctions (both orders)

| ID | operands / setup | == result |
|---|---|---|
| V1 | NaN/NaN; NaN/0; NaN/"NaN" | F; F; F |
| V2 | +0/-0; Infinity/Infinity; Infinity/-Infinity | T; T; F |
| V3 | false/true; true/1; true/2; false/"false" | F; T; F; F |
| V4 | "0"/""; "01"/"1"; equal strings in separate Values | F; F; T |
| V5 | same lone-surrogate code units; high/low surrogate; composed/decomposed accented text | T; F; F (host-created strings; no Unicode normalization) |
| V6 | 0/""; 0/" \t\r\n"; 0/"-0"; 1/" +1 " | T each |
| V7 | 16/"0x10"; 2/"0b10"; 8/"0o10"; 1/"1e0"; 0.5/".5" | T each |
| V8 | 0/"0x"; 1/"1_0"; 1/"1x"; 16/"+0x10"; 1/"1e" | F each |
| V9 | Infinity/"Infinity"; -Infinity/"-Infinity"; Infinity/"1e999"; 0/"1e-999" | T each |
| V10 | 0/"infinity"; 0/"\u0085"; 0/"\u200b"; 0/"\u0000" | F each; code units injected where lexer cannot escape |
| V11 | 0/"\u00a0\ufeff\u2028\u2029" | T; actual injected code units |
| V12 | null/0; undefined/NaN; null/""; undefined/"undefined" | F each |
| V13 | symbol/same symbol; two symbols with same description; symbol/its descriptive string; symbol/0; symbol/false | T; F; F; F; F |
| V14 | same object; distinct objects with identical properties; two boxes with same payload; box/itself | T; F; F; T; zero hooks even when hooks throw |
| V15 | null-root object/0; null-root object/another object; null-root object/null | conversion TypeError; F; F |
| V16 | hook returns undefined, null, false, 0, "", same symbol, other symbol; opposite 0 | F,F,T,T,T,F,F; one hook each |
| V17 | same hook return set opposite same symbol | F,F,F,F,F,T,F; no numeric Symbol conversion |
| V18 | object returning null opposite null; object returning undefined opposite undefined | F each, no hook |

## O: evaluation order, mutation and abrupt paths

L() logs `L;`, R() logs `R;`; P is protocol hook logging `P:default;` and
returning 1; V/T are ordinary methods logging `V;`/`T;`. A trace describes calls,
not property getters: current Get is data-only. Run mirrored source setups with
the object on the other side and keep source-order L/R expectations.

| ID | setup/expression | exact outcome / trace |
|---|---|---|
| O1 | L returns object P, R returns 1 | T / `L;R;P:default;` |
| O2 | L returns 1, R returns object P | T / `L;R;P:default;` |
| O3 | L throws marker before R | identical marker completion / `L;` |
| O4 | L returns object P, R throws marker | identical marker completion / `L;R;`, no P |
| O5 | P throws marker | identical marker completion / `L;R;P:default;` |
| O6 | R replaces captured left object's P with hook returning 2; R returns 2 | T / `L;R;new:default;` |
| O7 | left binding is 1; R changes binding to 2 and returns 1 | T; binding ends 2; `R;` |
| O8 | L returns object A; R rebinds its variable to B, returns A | T; no A/B hooks; `L;R;` |
| O9 | no protocol; V returns object and replaces T with method returning "1" | T / `V;newT;` |
| O10 | V changes object's prototype to one holding T returning 1, returns object | T / `V;T;` |
| O11 | V returns 1; T throws if called | T / `V;` |
| O12 | ordinary V noncallable; T returns 1 | T / `T;`; V skipped |
| O13 | protocol null or undefined; V returns 1 | T / `V;` for each |
| O14 | protocol false, 0, "", or noncallable object | TypeError `symbol toPrimitive method is not callable`; no V/T |
| O15 | protocol returns object | TypeError `cannot convert object to primitive`; only P |
| O16 | V and T both return objects | same TypeError; `V;T;` |
| O17 | V throws marker, T would return 1 | original marker / `V;` |
| O18 | both ordinary methods missing/noncallable | same conversion TypeError; empty trace |
| O19 | arbitrary object with throwing P opposite null or undefined | F / empty; both orders |
| O20 | object P opposite same/distinct object with throwing hook | T/F / empty |
| O21 | key hook K returns "x"; obj.x holds P object; compare obj[key] to R() returning 1 | T / `K:string;R;P:default;` |
| O22 | seeded internalGet failure for protocol or ordinary lookup | original ThrowCompletion identity and location; no later lookup/call |
| O23 | hook receiver/args | receiver is original object Value; protocol gets exactly ["default"], ordinary methods [] |

For O3/O4/O5/O17/O22 assert the same completion object at the direct helper/
evaluator boundary, marker Value identity, diagnostic identity and loc identity. A
guest `throw marker` naturally constructs its own completion: assert it is
unchanged after creation, using host hooks for record identity assertions.
Use injected loc `{line:7,column:9}` for all direct helper-generated errors.
Runtime-read `o == 1;` and `o != 1;` begin at 1:1; O14/O15/O16/O18 errors are
runtime TypeErrors there. Preserve the guest throw statement's own loc instead
of replacing it with 1:1. CLI guest TypeErrors have status 1, parse errors status 2.

## R: exact resources and cleanup

Fresh Evaluator with steps=calls=depth=0, ample steps unless stated. Invoke helper
directly at 7:9; host builtin hooks return literal Values with zero body ticks.
Counts are total tick increments (including failing tick), successful calls,
and peak calls. Lookup counts are frozen by primitive-conversion.ts. All rows
repeat for both operators/orders where meaningful.

| ID | operation | ticks / calls / result |
|---|---|---|
| R1 | any primitive pair, same/two objects, object/nullish | 0 / 0 / K,V result, even maxSteps=0/maxCalls=0 |
| R2 | protocol -> 1 compared with 1 | 1 / 1 peak1 / T |
| R3 | absent protocol, V -> 1 | 2 / 1 peak1 / T |
| R4 | absent protocol, V -> object, T -> "1" | 3 / 2 peak1 / T |
| R5 | absent protocol, V noncallable, T -> "1" | 3 / 1 peak1 / T |
| R6 | absent protocol, both ordinary methods missing | 3 / 0 / conversion TypeError |
| R7 | noncallable protocol; protocol returns object | 1/0 and 1/1 / respective O14,O15 TypeErrors |
| R8 | R2 maxSteps=0 | 1/0 / RangeError `execution step limit exceeded` at 7:9; no lookup |
| R9 | R3 maxSteps=1; R4 maxSteps=2 | 2/0; 3/1 / same RangeError, no V or no T respectively |
| R10 | R2 maxSteps=1; R3 maxSteps=2; R4 maxSteps=3 | success exactly at boundary; no extra dispatch tick |
| R11 | R2 maxCalls=0 | 1/0 / RangeError `call depth limit exceeded` at 7:9; hook body not entered |
| R12 | foreign-Realm hook success, guest throw, host Error | 1/1 peak1 / defining Realm inside hook, caller Realm and calls=0 restored; host Error identical and escapes |
| R13 | protocol builtin recursively invokes helper on same object versus 1 | maxCalls=2: ticks3, 2 bodies entered, peak2, call-limit error; default64: ticks65, 64 bodies, peak64; no native crash |
| R14 | after R13 success/failure unwind | calls=depth=0, original Realm; steps retained 3/65, never refunded; fresh primitive comparison adds0 |
| R15 | evaluate parsed `1 == 1;` or `1 != 1;` as statement | 4 ticks: statement,binary,left,right; T/F; maxSteps3 fails tick4 at 1:6 for == and != |
| R16 | evaluate `o == 1;`, o protocol ->1 builtin | 5 ticks including R15's four; maxSteps4 fails tick5 at 1:1; no hook |
| R17 | evaluate `o == 1;`, o ordinary V ->1 builtin | 6 ticks; maxSteps5 fails tick6 at 1:1; no V |
| R18 | parser nesting 129 opening parentheses then `1 == 1` then closes/semicolon | parse SyntaxError `syntax nesting limit exceeded` at 1:129 |
| R19 | trusted AST chain with 257 nested binary nodes, every loc7:9, each left child next binary | evaluate fails tick257 at depth257 with runtime RangeError `evaluation nesting limit exceeded`; depth restores0 |

R13 deliberately uses host builtin hooks that reenter only through context.call;
add a runtime-read guest recursive hook too, asserting the default call-limit
diagnostic and cleanup, without borrowing R13's zero-body tick count. No budgets
are reset between hook calls. Existing Array self/mutual conversion tests remain.

## P: grammar, tokens, precedence and negatives

Each source is a complete expression statement unless a declaration is shown.
Assert AST association as well as output where indicated, avoiding accidental
agreement of a differently parsed expression.

| ID | source | fixed result or diagnostic |
|---|---|---|
| P1 | `1 == '1';` / `1 != '1';` | T / F |
| P2 | `1 === '1';` / `1 !== '1';` | F / T; one 3-character operator token |
| P3 | `1 == 1 == true;` | T; `(1 == 1) == true` |
| P4 | `0 == 0 !== false;` | T; `(0 == 0) !== false` |
| P5 | `1 + 1 == 2 < 3;` | F; `(1+1) == (2<3)` |
| P6 | `false == 0 && true;` | T; `(false == 0) && true` |
| P7 | `true || missing == 0;` | T; no missing-binding error |
| P8 | `0 == false ? 7 : missing;` | number7 |
| P9 | `let x; x = 0 == false;` | x boolean true; assignment outermost |
| P10 | `!0 == true;` | T; unary binds first |
| P11 | `1/*a*/==/*b*/'1';` | T; == token starts1:7, range[6,8) |
| P12 | `1 ==;` / `1 !=;` | parse SyntaxError `unsupported or unexpected syntax: ;` at1:5 |
| P13 | `1 ==== 1;` / `1 !=== 1;` | strict token followed by =; parse SyntaxError `unsupported or unexpected syntax: =` at1:6 |
| P14 | `1 = = 1;` | parse SyntaxError `unsupported or unexpected syntax: =` at1:5 |
| P15 | `1 == 1 = 2;` | parse SyntaxError `invalid assignment target` at1:1 |
| P16 | `1 == 1, 2;` | parse SyntaxError `expected ';', found ','` at1:7 |
| P17 | `1 += 1;` / `1 => 1;` / `1 ** 1;` / `1 << 1;` | parse SyntaxError `unsupported operator: +=` / `=>` / `**` / `<<` at1:3 |
| P18 | `1 == == 1;` | parse SyntaxError `unsupported or unexpected syntax: ==` at1:6 |
| P19 | `1 != !0;` | F; != token then unary ! |

Token positions use UTF-16 source offsets; no token splicing through comments.
P16 preserves Parser.expect's existing diagnostic formatting.

## C: consumers and regression controls

| ID | inputs (both orders for comparisons) | == expectation / control |
|---|---|---|
| C1 | []/0; []/""; []/false; [1]/1; [1,2]/"1,2"; [1,2]/0 | T,T,T,T,T,F |
| C2 | sparse length1 array/0; [null]/0; [undefined]/0; [[1]]/1 | T each; reuse join semantics |
| C3 | Array with inherited index0=2 and length1 /2 | T; inherited Get applies |
| C4 | array join replaced by hook -> "7" /7; join noncallable /"[object Array]" | T each; current join lookup/captured Object fallback |
| C5 | exact parsed `function() { return 1; }` / that exact string | T; no function body execution |
| C6 | same function /0; console.log /"function log() { [native code] }" | F; T; no host Function.toString |
| C7 | function public name changed /original exact source; function toString overridden -> "2" /2 | T; T |
| C8 | Number box(2)/2; Boolean box(false)/0; String box("2")/2; Symbol box(Y)/Y | T each; default conversion uses current methods |
| C9 | Symbol box(Y)/other symbol; /"Symbol(x)"; /0; /null | F each; no symbol-number TypeError; null skips hooks |
| C10 | two Number/String/Symbol boxes with equal payload | F; each box/self T; neither coerced |
| C11 | ordinary {}/"[object Object]"; {}/0 | T; F |
| C12 | null-root object/primitive; null-root object/object | conversion TypeError; identity only; unchanged negative controls |
| C13 | foreign box(Y)/Y; relinked box with own hook ->2 /2 | T; T; slot identity and hook dispatch respected |
| C14 | Number box default/number versus string hint | equality uses payload; existing key/tag string-hint expectations unchanged |
| C15 | explicit Object.toString on Array/Function; strict comparisons/truthiness | existing tags, no-hook strict identity and truthiness all unchanged |
| C16 | callable Function root/"function () { [native code] }"; Array root/""; Object root/null | T; T; F; root property-key lists unchanged |

Runtime fixture must cover C1/C5/C7/C11, O1-O8/O21 and P1-P10 with literal
expected outputs and readable effectful functions. Host driver supplies symbols,
boxes, prototype setup and exact counters. No guest delete/new/try/catch or
unsupported escapes are introduced to make these rows executable.
