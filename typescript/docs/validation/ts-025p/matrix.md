# TS-025P fixed proposed acceptance matrix

These are independently specified expected outcomes, not executed tests. Each
row is required in both Node-hosted and native Rift. Guest source is runtime-read;
H means trusted host setup/inspection where syntax lacks descriptors, symbols,
prototypes or catch. Each row uses a fresh Realm unless sharing is explicit.
`o` has configurable own x=7; `p` is its prototype where stated; `k` is a key
Value; `s` and `t` are distinct symbols with description `x`. Boolean results are
guest Values. `undefined` in source is the existing binding, not new syntax.
Expression results mean Evaluator.evaluate results or a captured guest binding;
block/run normally discard expression-statement results. Do not assert a final
block result of true or1. Any embedded `|` in an operator below denotes the
literal JavaScript operator, not a table separator.

## P: parser, classification and diagnostics

Parse errors are SyntaxError/phase=parse and prevent the whole program executing.
Runtime errors are phase=runtime. CLI statuses: success0, parse2, runtime throw1.
Locations below are line:column. Identifier errors use the new message
`delete of an identifier is not allowed`; no name resolution occurs.

| ID | Exact source / setup | Fixed result |
|---|---|---|
| P1 | `delete x;` | identifier error 1:1 whether missing, TDZ, mutable, builtin or function binding |
| P2 | `delete (((x)));` | identifier error 1:1 |
| P3 | `effect(); delete x;` | identifier error 1:11; effect never runs |
| P4 | `if (false) { delete x; }` | identifier error 1:14 |
| P5 | `function f(x) { delete x; }` | identifier error 1:17 before f is installed |
| P6 | `'use strict'; delete x;` | identifier error 1:15; same policy without directive |
| P7 | `delete this;` / `delete null;` / `delete 1;` / `delete 'x';` / `delete true;` | true, no boxing or hooks |
| P8 | `delete (o.x);` / `delete (((o.x)));` | true; own x removed, target not read |
| P9 | `delete (x = 1);` with initialized x | true; x becomes1, binding retained |
| P10 | `delete (true ? o.x : o.y);` | true; x read once, neither property deleted |
| P11 | `delete (true && o.x);` / `delete (false \|\| o.x);` | true; x read once, x retained |
| P12 | `delete f();` | call once, result discarded, no result coercion; abrupt call propagated |
| P13 | `delete missing.x;` | ReferenceError `missing is not defined` at1:8; no key/delete |
| P14 | `delete (true && missing);` | ReferenceError `missing is not defined` at1:17 |
| P15 | `delete o.x === true;` | parsed as (delete o.x) === true; result true |
| P16 | `!delete o.x;` / `+delete o.x;` / `delete delete o.x;` | false /1 /true; one removal in each fresh setup |
| P17 | `delete o.x = 1;` | `invalid assignment target` 1:1, no effects |
| P18 | `delete;` | `unsupported or unexpected syntax: ;` 1:7 |
| P19 | `let delete = 1;` | `expected binding identifier` 1:5 |
| P20 | `let deleted = 1; deleted;` | normal1; delete-prefix identifiers unchanged |
| P21 | `delete o.delete;` / `delete o['delete'];` | true; reserved word allowed as property name |
| P22 | `delete\no.x;` (actual LF) | normal true; newline allowed here, operand location2:1 |
| P23 | `delete typeof x;` | `unsupported or unexpected syntax: typeof` 1:8 |
| P24 | `delete void x;` / `delete super.x;` | unsupported syntax void / super at1:8 |
| P25 | `delete (o.x, o.y);` | `expected ')', found ','` 1:12; comma remains unsupported |
| P26 | `function f() { /*keep*/ return delete this.x; }` | exact function toString source unchanged, including spaces/comment; invoking with o returns true |
| P27 | source `delete ` plus127 `(` plus `1` plus127 `)` plus `;` | nesting SyntaxError at1:134, before effects; existing statement+expression depth accounting |

P22 also repeat with CR, CRLF, U+2028 and U+2029, and line terminators inside a
block comment; operand is line2 column1 when directly following the terminator.
P26 also retain nested-function slices and string/comment text containing delete.
Keep existing lexer failures for ++, --, **, compound assignment, optional chains,
private identifiers, bitwise syntax, templates and identifier escapes; delete
recognition changes none. Run existing parser/strict equality/source regressions.

## D: objects, descriptors, primitives and precise failure sites

H inspections compare complete before/after own descriptors, prototype identity,
and keys; only the named successful own deletion may differ. Test direct helper
and guest source for false/throw propagation; helper false is TypeError, raw
internalDelete false remains normal false.

| ID | Operand/setup | Fixed result/invariant |
|---|---|---|
| D1 | `delete o.x;` | true, x absent; repeated deletion true |
| D2 | absent own x, inherited x (configurable or not) | true; parent unchanged, inherited value still visible |
| D3 | own x shadows parent x=9 | true; subsequent read9; parent unchanged |
| D4 | own x configurable, writable=false, enumerable=false | true; flags do not obstruct deletion |
| D5 | own x nonconfigurable (all writable/enumerable combinations) | TypeError `property is not configurable: x` at1:1 for `delete o.x;`; exact descriptors unchanged |
| D6 | nonextensible o with configurable x / absent x | true in both cases; no re-extension |
| D7 | `delete Number.NaN;` | TypeError `property is not configurable: NaN` at1:1; constant SameValue NaN retained |
| D8 | array a=[1,2,3], `delete a[1];` | true; keys 0,2,length; length3 unchanged; inherited index1 exposed if seeded |
| D9 | array hole / index >=length | true, length unchanged; no materialization |
| D10 | array nonconfigurable index / length | TypeError naming converted index / length; length and all descriptors unchanged |
| D11 | delete and reinsert o.b among strings a,b,c | own order a,c,b; numeric keys still sorted; overwrite alone retains order |
| D12 | o has s,t and string x; delete o[s] | removes s only; t and string x retained; reinsert s follows t in symbol order |
| D13 | nonconfigurable s, source `delete o[s];` | TypeError `property is not configurable: Symbol(x)` at1:1; no symbol string-key deletion |
| D14 | `delete null.x;` / `delete undefined.x;` | TypeError `cannot convert null or undefined to object` at1:8 |
| D15 | b=true,false,+0,-0,NaN,+Infinity,-Infinity, or symbol; `delete b.x;` | true; prototype x, even nonconfigurable, untouched; base hooks never called |
| D16 | `delete 'ab'[0];` / `delete 'ab'.length;` | TypeError naming0 /length at1:1 |
| D17 | `delete 'ab'[2];` / `delete 'ab'['01'];` / `delete 'ab'['-0'];` | true |
| D18 | `delete 'ab'[-0];` | TypeError naming0 at1:1 |
| D19 | empty string length / index0 | length fails; index0 true |
| D20 | H string of one surrogate pair; indices0,1,2 | first two fail separately;2 true; UTF-16 payload unchanged |
| D21 | H explicit String box with extra configurable x | x true, virtual indices/length fail; no changes to payload/prototype |
| D22 | primitive/boxed String with symbol key s | true if absent/configurable; s description `0` does not address virtual0 |
| D23 | `delete 'ab'.x.y;` | existing read TypeError `property base must be an object` at1:8; deletion of y never reached |
| D24 | `delete o.child.x;`, child object | Get child once, no Get x, remove child.x; o.child retained |
| D25 | function f own metadata name/length seeded configurable | deletion true; saved function still callable; retained source and callable slot unchanged |
| D26 | H shared foreign object in two realms | deletion visible through both aliases; unrelated Realm roots unchanged |

For D15 also test named prototype methods valueOf/toString; primitive deletion
never deletes them. Repeat D16-D22 with relinked/null/foreign String-box prototypes.
No prototype walk is allowed, including deep chains. H target internalGet that
throws on every key must still permit successful deletion: zero target reads.

## E: key conversion, captured references and abrupt paths

Use runtime `delete base()[key()];`. H builtins append B and K respectively;
object key's canonical hook appends H, checks receiver=key and sole argument
`string`, returns string x; target override appends D then calls super deletion.
No extra target reads. Observe boxing separately with H factory instrumentation.

| ID | Variation | Exact effect/result |
|---|---|---|
| E1 | ordinary success | BKHD, true, original target.x removed |
| E2 | base throws record e | B only; identical e |
| E3 | key expression throws e | BK only; identical e, even nullish base |
| E4 | null or undefined base; returned key has throwing hook | BK only, nullish ToObject TypeError at1:8; no H/D |
| E5 | key hook throws e | BKH; identical e; no D; earlier hook mutations retained |
| E6 | canonical hook returns object | BKH; TypeError `cannot convert object to primitive` at1:8, no D |
| E7 | canonical property noncallable1 | BK; TypeError `symbol toPrimitive method is not callable` at1:8 |
| E8 | canonical absent/null; toString returns x | BKTD, true; no valueOf |
| E9 | toString returns object; valueOf returns x | BKTVD, true; hooks receiver=key, zero args |
| E10 | both ordinary hooks return objects / null-root key has no methods | BKTV / BK respectively; `cannot convert object to primitive` at1:8; no D |
| E11 | toString noncallable, valueOf returns x | BKVD, true; no call of noncallable method |
| E12 | toString replaces/deletes/relinks next valueOf then returns object | fresh next lookup observes replacement/inheritance/absence; replacement or newly inherited method logs V and returns y -> BKTVD and deletes y only; null prototype with deletion -> BKT then conversion TypeError |
| E13 | key expression changes base binding from A to B, returns x | delete A.x only; B.x retained; base evaluated once |
| E14 | key hook changes base binding/prototype, returns x | captured A used; current own x deleted; new prototype retained; no re-read |
| E15 | key expression returns key A; hook rebinds k to key B | A converted once, B never converted |
| E16 | hook deletes target.x itself or defines it configurable | final D succeeds (absent or newly present); true |
| E17 | hook makes target.x nonconfigurable | BKHD then strict TypeError at1:1; changed descriptor remains |
| E18 | internalDelete override returns e | BKHD; identical e; no translation or rollback |
| E19 | internalDelete override false | BKHD; TypeError naming converted x at1:1 |
| E20 | primitive keys undefined,null,true,false,+0,-0,NaN,+Infinity,-Infinity | corresponding keys `undefined`,`null`,`true`,`false`,`0`,`0`,`NaN`,`Infinity`,`-Infinity`; BKD; each seeded property removed |
| E21 | key symbol s / canonical hook returns s | BKD / BKHD; identity s only |
| E22 | key default [] / [1,2] | keys empty string /1,2; correct own deletion, Array join behavior retained |
| E23 | key function retained source / Boolean box / String box / Number box | exact retained function text /true /payload /[object Number] keys; Number string-hint limitation unchanged |
| E24 | base primitive boxed in A; key hook defined in B called from A | box allocated in A before H; inside H active B; after success/failure active A; roots unchanged |
| E25 | hook throws host Error, or internalDelete throws host Error | same host fault escapes; no guest wrapping; calls/depth restored, steps retained |
| E26 | replace/save/delete key conversion methods between two deletes | second operation uses fresh lookup; saved callable remains callable; no cross-operation key cache |

E12 has three fixed subcases: replacement and prototype relinking log V and
return y; deletion on null prototype logs no V and throws. Add H throwing internalGet on the *key* canonical
lookup and on ordinary lookup: propagate same record, skip later lookup/delete.
This contrasts the forbidden target Get without introducing accessors.

## R: exact resources and cleanup

Use fresh evaluator steps=0/calls=0/depth=0, preseed initialized bindings and a
single parsed statement. No setup or assertions included in counts. Unless noted,
maxSteps ample, maxCalls64. Host builtins consume no body ticks. Low-level helper
rows receive ref.loc=7:9, loc=7:2. Successful helper has no frame entry of its own.

| ID | Operation | Exact expectation |
|---|---|---|
| R1 | direct helper, primitive key, ordinary object, primitive box or nullish | 0 ticks/0 calls; result true, strict false error, or nullish error as applicable |
| R2 | helper canonical hook returns x |1 tick,1 invocation, peak calls1 |
| R3 | helper absent canonical, toString returns x |2 ticks,1 invocation |
| R4 | helper toString object then valueOf x |3 ticks,2 sequential invocations, peak1 |
| R5 | helper null-root missing hooks |3 ticks,0 invocations; conversion TypeError |
| R6 | `delete o.x;` |4 steps (statement, unary, base, literal key), true; peak evaluator depth3 |
| R7 | same maxSteps0/1/2/3 | failure at1:1 /1:1 /1:8 /1:10; steps1/2/3/4; no deletion |
| R8 | same maxSteps4 |success, steps4; nonconfigurable x gives TypeError with same4 steps |
| R9 | `delete 1;` |3 steps; true; maxSteps2 fails at1:8, steps3 |
| R10 | `delete o[k];` canonical host hook |5 steps,1 invocation; maxSteps4 fails lookup at1:8 with steps5,0 invocations, no deletion |
| R11 | same maxCalls0 |5 steps,0 invocations, RangeError `call depth limit exceeded` at1:8 |
| R12 | `delete o[k];` ordinary toString / fallback valueOf |6 /7 steps;1 /2 invocations; peak1 |
| R13 | `delete null[k];` with effectful key object |4 steps,0 invocations; nullish error at1:8 even maxSteps4; conversion budget unused |
| R14 | direct helper canonical hook, maxSteps0 |steps1; execution-step error ref.loc7:9; no hook or deletion |
| R15 | direct helper ordinary conversion, maxSteps1 /2 and first method returns object |steps2 /3; failure on toString /valueOf lookup at7:9;0 /1 completed hook calls |
| R16 | canonical host hook recursively evaluates same delete AST until call bound m | run single statement `delete o[k];`; m+1 attempts,4(m+1)+1 steps, m invoked hooks, RangeError at1:8; no deletion; calls/depth0 afterward |
| R17 | R16 with m=0,1,2,64 |steps5,9,13,261; actual native default64 must return guest failure, never crash |
| R18 | guest canonical key hook from `function h() { return delete o[k]; }` | with maxCalls2: initial4 source ticks plus1 hook lookup; each entered body adds return tick+4 expression/conversion ticks; total15,2 calls invoked, call-limit error1:30; no deletion |
| R19 | repeat R18 actual default64 |325 steps,64 invoked calls, call-limit error (depth below256), calls/depth0; no crash |
| R20 | start depth256, evaluate delete AST | one tick then `evaluation nesting limit exceeded` at unary loc; depth restored256; no base effects |
| R21 | after success, user throw, limit, host fault through foreign B hook | active Realm restored A, calls/depth previous values; subsequent independent operation works with remaining monotonic budget |

R18/R19 use the exact declaration shown, parsed separately at line1; install h
as k's canonical symbol hook through host setup. Exclude setup execution from
steps (use a fresh evaluator for the single `delete o[k];` statement).
Test maxSteps14 on R18: final canonical lookup hits step15 first at1:30, so execution-step error
wins over call limit. No failed attempt invokes internalDelete.

## C: runtime consumers and unchanged controls

| ID | Required integration | Fixed result |
|---|---|---|
| C1 | C3 fixture: object['']=7, object['1,2']=9, mutable empty/pair arrays as keys | `delete object[empty]` and `delete object[pair]` true; both own descriptors absent; following method-key test still passes |
| C2 | H parent has x, child own x; guest delete then read/call | exposes parent data/method and preserves child receiver on later call |
| C3 | array delete index then join/map | join empty slot unless inherited value; map skips true hole, visits inherited present index; length unchanged |
| C4 | guest delete own valueOf/toString/canonical hook on injected object | next conversion finds inherited fallback; saved function unaffected; null-root/both-object negatives stay failures |
| C5 | delete boolean result used by ==,===,!, conditional, assignment | true behaves as existing boolean; no new coercion semantics |
| C6 | `delete (o.x = 9);` | write takes effect, x retained9, true; current assignment key timing unchanged |
| C7 | primitive read/write and detached-method negative fixtures | identical existing errors/traces; deletion boxing does not migrate them |
| C8 | cross-Realm mutation and fresh Realm | shared target sees deletion; fresh roots and unshared targets unchanged |
| C9 | raw internalDelete descriptor/array/String/symbol tests | original true/false values and key-order assertions unchanged |
| C10 | Number formatting, equality/strict equality, source retention, Object tags | prior expectations unchanged; delete support is no evidence for unsupported formatting or syntax |
