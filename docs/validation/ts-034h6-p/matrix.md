# Frozen semantic matrix (proposed, not execution results)

Use actual Rift Values/descriptors and exact object references in a new dedicated
driver. `out` is a trusted recorder, not console display; a row saying object
requires an object assertion. `A` and `B` are fresh Script Realms; names such as
AE mean a host-transferred **actual** intrinsic, not a same-named replacement.
Unprefixed programs use prepareBoundedScript; prefix `"use strict";` where shown.
No unsupported syntax may be silently dropped. Read both input files after native
compilation and run all fixed rows for each input; freeze their bytes/hashes and
expected output before running either lane.

## A: allocation kernel, first bounded slice

Only three production files: runtime.ts, realm.ts, builtins/object.ts. Error
constructors and globals are deliberately absent in A. Test internal allocation
through an ordinary guarded host builtin as described in harness-errors.md.

| ID | Literal setup/source | Expected |
|---|---|---|
| A01 | runtime source `make("seven");` versus `make("eleven");` | Distinct own message strings; TypeError intrinsic prototype; ErrorData; normal object. Every invocation yields a distinct object. |
| A02 | For each family, createError(name,"x") twice in A and once in B | All objects differ; A instances use A family prototype; B uses B. Five distinct family prototypes per Realm; four NativeError prototypes → Error.prototype → Object.prototype → null. |
| A03 | Inspect descriptors before any Script publication | Own instance keys exactly [message]; message Wtrue/Efalse/Ctrue. No own name, constructor, diagnostic, stack or location. Prototype name/message as frozen. A constructor links are not yet installed. |
| A04 | Relink a branded object to null; host call Object.prototype.toString through trusted alias | `[object Error]`; an ordinary object linked to the internal Error prototype gives `[object Object]`. No reads of name/message. |
| A05 | Seed @@toStringTag on branded object with string Custom, then number7, then getter throwing q | `[object Custom]`, `[object Error]`, exact q; existing toStringTag tick/ordering unchanged. |
| A06 | Transfer make from A into B, execute runtime source in B | Instance/prototype from A; caller source B, guarded builtin frame Realm A; idle frame/calls/depth restored. |
| A07 | Direct callback invocation with fabricated context / retained callback after session ends | Existing host guard errors; no allocation exposed; no tick or output. |
| A08 | Run each input with all3 fresh and all3 seven-seeded failing prefixes, two success limits and calls0/1 | Exact counts/locations in main contract. Resource origin; no returned instance at failed prefix; cleanup on every exit. |
| A09 | Legacy Realm with same old direct helper/error/control sources | Same five globals/prototypes and212 records. createError on legacy Realm is a host misuse rejection; no new guest global. |

A retains old54 gates and adds kernel gate55. No compiler feasibility probe is
required in advance: this uses established class/Realm patterns; if actual static
coverage fails, retain the failing build and a bounded reduction before revising.

## B: complete Error semantics and all originating sites

| ID | Source or precise host setup | Literal result / effects |
|---|---|---|
| E01 | `Error();` and `new Error();`, all five families | Fresh object each time, own message absent, inherited message="", exact constructor identity, correct prototype chain. |
| E02 | `new TypeError('x');` and `TypeError('x');` | Own message x Wtrue/Efalse/Ctrue, own keys [message]; inherited constructor===TypeError; instance of TypeError and Error, not ReferenceError. |
| E03 | `Error(undefined);Error(null);Error(7);` | Respectively no message, message "null", message "7"; no receiver dependence. |
| E04 | `Error('x',{cause:q});` with q exact host object | Own keys [message,cause], cause===q Wtrue/Efalse/Ctrue. |
| E05 | `Error(undefined,options);` with inherited cause getter returning undefined | Own keys [cause], present undefined cause; HasProperty then Get exactly once; no own message. Primitive/nullish options do no lookup. |
| E06 | Error message hook records M, options cause getter records C | Order M,C. Message hook runs once; cause never touched if message throws. A cause throw propagates exact q after M,C; no result published. |
| E07 | Message object @@toPrimitive returns Symbol; direct Symbol input; object ordinary methods both return object | Fresh TypeError in active Error builtin Realm for each generated failure; no subsequent cause read. A hook throwing q instead returns exact q. |
| E08 | `Error.prototype.toString.call({});` | "Error". Generic receiver does not need ErrorData. |
| E09 | Generic receivers name/message: [undefined,undefined], ["","x"], ["X",""], ["X","y"] | "Error", "x", "X", "X: y". Nonobject receiver null/undefined/7/Symbol gives genuine method-Realm TypeError. |
| E10 | Get(name) records N; name conversion records n and rewrites message; Get(message) records M; message conversion records m | Exact N,n,M,m, rewritten message used. Throw at each stage stops later stages and propagates exact q. Symbol name stops before message Get. |
| E11 | Read/modify constructor.name, prototype.name, instance.message, instance.constructor | Ordinary property semantics; name changes formatting, never brand/intrinsic allocation. Mutated global TypeError must not affect an engine-created TypeError. Native Function.toString retains initial name. |
| E12 | Cross-Realm A constructor called/new in B | A instance/prototype/constructor identity, different from B constructor even if names identical. NewTarget remains actual callee. |
| E13 | Object.prototype.toString on Error instance after prototype relink, Error.prototype, fake {name:'Error'} | `[object Error]`, `[object Object]`, `[object Object]`; @@toStringTag still overrides using existing order. |
| E14 | Descriptor matrix on all five constructors/prototypes, Error toString and inherited restrictions | Exact W/E/C and lengths/names from contract; NativeError constructor prototype is Error constructor. None of constructor/prototype identities are shared across Realms. |
| E15 | `try{missing;}catch(e){out(typeof e);out(e.constructor===ReferenceError);}` | object,true. `try{throw 'ReferenceError: fake';}catch(e){out(typeof e);}` →string. |
| E16 | `try{x;let x;}catch(e){out(e.constructor===ReferenceError);}` | true; caught fresh object. Run equivalent global, block and function TDZ get/set host fixtures; context Realm, not environment owner, determines error. |
| E17 | `try{null.x;}catch(e){out(e.constructor===TypeError);}` and `try{7();}catch(e){out(e.constructor===TypeError);}` | true for each; no replacement at catch. Strict write to frozen property, immutable binding host fixture and nonconfigurable delete give TypeError; sloppy writes/delete keep existing false/silent behavior. |
| E18 | `try{new 7();}catch(e){out(e.constructor===TypeError);}`; bad `in` RHS; bad instanceof target/hook/prototype | Fresh correct-Realm TypeError at each producer, preserve operand/argument/hook order. Existing H5 negatives still fail semantically. |
| E19 | `try{let a=[];a.length=1.5;}catch(e){out(e.constructor===RangeError);}` | true; two conversions where object length supplied, no array mutation on conversion/range failure. Foreign array B accessed in A produces A RangeError unless a B hook itself throws. |
| E20 | Host alias Number.prototype.toString, radix1/37, wrong receiver | RangeError / RangeError / TypeError in method's defining Realm. Receiver error precedes radix effects. Equivalent String/Boolean/Symbol receiver errors are all objects with that method Realm's TypeError prototype. |
| E21 | Restricted caller/arguments getter and setter from A reached by B | A TypeError; object, not diagnostic string; exact existing step count and source attribution. Raw endpoint invoke remains host rejected. |
| E22 | Global declaration conflicts on a second unit, restricted global property, failed global function/var declarations | SyntaxError for lexical/restricted conflicts, TypeError for nondeclarable function/var; phase instantiation; source/loc is second unit's declaration site; no body effects. |
| E23 | Trusted duplicate GlobalEnvironment.createMutableBinding with explicit A, then null compatibility mode | A TypeError then historical diagnostic-string TypeError. Missing/initialized invariant violations still host Error, never catchable. |
| E24 | Primitive Symbol conversions to Number/String and toPropertyKey(Symbol) | TypeError/TypeError in running Realm; property key exact Symbol identity with normal completion. Direct object-toNumber/toString remain unsupported-operation, not language errors. |
| E25 | Existing map helper bad callback/oversized length through active Script builtin | TypeError/RangeError objects respectively; species remains unsupported-operation, no callbacks on oversized failure; no new map global/method. |
| E26 | `try{throw q;}catch(e){out(e===q);throw e;}` q any object, number, string, undefined or Error | true then exact q thrown with guest origin; last source is rethrow, diagnostic remains independent of q's mutable properties. |
| E27 | Same engine completion returned by a trusted builtin, caught once then returned again in another unit | Exact completion survives; H1 consumed-propagation reset captures second source; no new object or repeated conversion. |
| E28 | A function H: `function f(){missing;}` transferred into B, source T:`f();` | A ReferenceError, lastAbrupt realm A/unit H/identifier loc; caller cleanup B. Repeat caught/rethrown in T: same object but rethrow unit T/Realm B. |
| E29 | A message hook called by Error constructor B: hook returns object vs hook throws A Error | Return-object failure allocated B; thrown A Error propagated unchanged; first source belongs to originating hook only for actual hook throw. |
| E30 | Fresh/seeded engine `missing;` and public `E(7);`, `new E(7);` plus eleven variants | Literal prefix tables in contract; no error-allocation charge for missing, public allocation charged. Record counts, phase, source, Realm and cleanup. |
| E31 | `try{while(true){}}catch(e){out(9);}` and recursive function/new constructor | Resource origin, no9; string resource payload remains unchanged, cannot satisfy runtime-negative. Evaluation-depth resource also bypasses catch. |
| E32 | Reachable message/cause/name/prototype callback throws host sentinel | Same host identity escapes, no guest catch, active null, calls/depth0; next session works. Separate from language throw tests. |
| E33 | Reachable callback returns unsupported-operation completion | Same completion, no catch; no new Error, subsequent effects absent. |
| E34 | Invalid source with an otherwise usable Error expression before unsupported tail | Whole-unit blocked, no effects; existing parser capability/rule and source limits unchanged. |
| E35 | projectThrow on new engine Error, q string, resource and unsupported | object/constructor unsupported; string/constructor absent; original resource; unsupported-syntax capability. Null constructor name/Realm/secondary throughout; no getter invoked. |
| E36 | Change guest Error.name/message/constructor into poison getters then observe/CLI-render trusted completion | Diagnostic output unchanged; no getter effects. display(object) remains `[object Object]`; Error.toString only through semantic call. |

Guard rows G01–G10 are independent and required on both lanes where expressible:
raw construct callback; fabricated context; wrong Realm/profile; copied builtin
slot; mismatched callable/constructor records; altered args-array identity; altered
loc identity; reused permit; retained owner context during another live session;
nested sessions on success, language throw and exact host sentinel. Each rejects
before unauthorized prototype Get/callback/tick. Also prove call permit cannot
authorize construct and construct permit cannot authorize call. Node reflection
adds checks but cannot replace native reachable-path controls. Ordinary H5 Script
shell construction and nonconstructible ordinary createBuiltin remain unchanged.

### Additional literal budget traces

Host aliases below call real guarded methods through context.call; they do not
implement substitute Error algorithms. Host hooks simply record a letter and
return a primitive or exact sentinel. Each calls through the production session
dispatcher in Node and native. All columns are line1; no declarations/directive.

| Source / setup | Exact ordered tick columns | Effects at successful tick |
|---|---|---|
| `E("x",o);`, o own data cause7 | 1,1,3,7,1,1,1 | No callback; allocation at5, HasProperty6, Get cause7; own message x,cause7. |
| `E("x",o);`, o no cause | 1,1,3,7,1,1 | No cause Get; own message only. |
| `E(m);`, m has no @@toPrimitive and host builtin toString recording M→"x" | 1,1,3,1,1,1 | Allocation4; @@toPrimitive lookup5; ordinary toString lookup/call6=M. No valueOf. |
| `E(m,o);`, same m, o inherited cause getter C→7 | 1,1,3,5,1,1,1,1,1 | Allocation5, hook lookup6, M7, HasProperty8, C9. |
| `E(m,o);`, m @@toPrimitive host hook M→"x", o cause getter C→7 | 1,1,3,5,1,1,1,1 | Allocation5, M6, HasProperty7, C8. |
| `fmt(o);`, fmt passes o as receiver to Error.prototype.toString; name/message primitive data X/y | 1,1,5,1,1 | Get name4, Get message5; result "X: y". |
| `fmt(o);`, name getter N→object with ordinary toString n→X, message getter M→object with ordinary toString m→y | 1,1,5,1,1,1,1,1,1 | N4, name @@toPrimitive5, n6, M7, message @@toPrimitive8, m9. |
| `String(m);`, ordinary host toString M→"x" | 1,1,8,1,1 | @@toPrimitive4, M5; no allocation. |
| `new String(m);`, same m | 1,1,5,12,1,1,1 | @@toPrimitive5, M6, box allocation7; conversion precedes prototype lookup. |

For every row of N ticks, enumerate each budget k=0..N-1 and successes N,N+1,
then seeds7+k and successes7+N,8+N. A failure has step count k+1 (seeded8+k),
loc equal to column[k], resource origin, and precisely the effect letters attached
to ticks ≤k. The failing tick itself has no corresponding effect. If a hook at
tick j throws q, its letter is recorded and result is exact q at any budget≥j;
later ticks/effects do not occur. Run each effectful row with q as guest number7,
foreign Error, unsupported completion and host sentinel, recording their distinct
catch/escape classification and finally restoration. Cause absent/present also
tests inherited presence independently of own keys. These are literal prefix
rules, not execution-derived expected results. All rows run for both runtime
inputs; substitute only their message payload seven/eleven, never the tick sites.

## C: formatting surface

| ID | Literal source/setup | Expected |
|---|---|---|
| F01 | `String();String(undefined);String(null);String(-0);` | "", "undefined", "null", "0". |
| F02 | Seed Symbol s with description x; `String(s);new String(s);` | "Symbol(x)"; genuine String-Realm TypeError. No Symbol factory introduced. |
| F03 | Symbol wrapper and object with @@toPrimitive returning Symbol | String call and construction both TypeError; special direct-Symbol call path not applied. |
| F04 | `new String('ab');` | Genuine StringData ab, own keys [0,1,length], index values a,b Wfalse/Etrue/Cfalse; length2 Wfalse/Efalse/Cfalse; exact String.prototype. |
| F05 | `String(msg);new String(msg);` with message conversion trace/throw | String hint once; exact q throw; no allocation/prototype lookup after throw. |
| F06 | `Object();Object(null);new Object(undefined);` | Distinct fresh ordinary objects, correct builtin Realm Object.prototype, no own keys. |
| F07 | `Object(q);new Object(q);` object q | Exact q each, no coercion/Get/prototype lookup, no allocation tick. |
| F08 | `Object(7);Object(false);Object('a');Object(s);` and new forms | Existing genuine slot wrappers in builtin Realm; no new primitive constructor globals. |
| F09 | Cross-Realm String/Object transferred from A into B | A boxes/fresh objects; existing object q retains its identity and original prototype. |
| F10 | Constructor and prototype metadata, key order, descriptors | Exact main-contract graph; added constructor keys appended; legacy graphs unchanged. Methods/nonconstructible namespace Number unchanged. |
| F11 | `Object.prototype.toString.call({});` and `String({toString:function(){throw 7;}});` | "[object Object]"; exact7. The former is the needed harness fallback. |
| F12 | Runtime files `String(7);` versus `String(11);`; repeat `new String(7);`/eleven and Object(o) alias controls | "7" vs "11"; boxes differ by data. Fixed rows run for both; fresh/seven-seeded prefixes and cleanup as contract. |

H7's literal B01–B16 and two notSameValue controls in harness-prerequisites are
retained unchanged. B05/B08/B09/B15 specifically require real ReferenceError/
TypeError constructor identity. H6 validation may inspect required primitives,
but running/claiming original harness bundle acceptance belongs to H7. P6 stays
blocked even after those bundle controls eventually pass.
