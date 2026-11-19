# TS-023P independent expected-result matrix

Proposed acceptance tests, not passing runtime results. `T` means the saved
original Function.prototype.toString Value; `call(T,f)` means context.call with
receiver f and no arguments. Host setup may seed Values and use trusted descriptor
and prototype APIs. No row authorizes guest syntax beyond the current parser.
All exact strings below use JSON notation: escapes denote code units, not text
to feed literally to Rift unless explicitly stated. Every source row must assert
parser success, range start/end, source-record identity, and returned string.
Expected text is a literal oracle, never obtained from host Function.toString,
Rift's AST printer or another implementation.

## Source and lifetime

The executable data-only ledger `source-cases.mjs` fixes full inputs, expected
ranges and expected outputs for S1-S9. Running it checks the *ledger's* offsets
with host string operations, not a parser or compiler. It does not execute guest
source. Use those constants in future tests rather than calculating expectations
from the implementation under test.

| ID | Setup | Required outcome |
|---|---|---|
| S1 | Leading/trailing comments around named declaration | Only keyword through closing brace; internal comments and spaces exact |
| S2 | Parenthesized anonymous expression followed by comment and semicolon | Parentheses, outer trivia and terminator excluded |
| S3 | CRLF and line comment inside function | CRLF stays two source units; function location line 2 column 1; closing brace line 4 column 1 |
| S4 | Nested declaration returns inner closure | Outer includes inner text; inner range excludes outer text; shared SourceText identity |
| S5 | Supported backslash escapes in guest string | Original backslash spelling preserved, not decoded token text |
| S6 | Raw supplementary character, lone high/low surrogate and NUL in string | Exact UTF-16 units preserved; pair counts two offsets; avoid UTF-8 files for isolated surrogates |
| S7 | Raw U+2028/U+2029 inside comments | Exact separators retained, locations count each as newline |
| S8 | Braces and word function inside strings/comments | End is syntactic matching brace, not textual search |
| S9 | Two declarations separated by trailing comment | Each excludes inter-function trivia; both share one source record |
| S10 | Evaluate S4 outer twice, retain two inner closures | Distinct callable/environment identities, equal source range object and result `"function inner() { return 1; }"`; both still return 1 when called |
| S11 | Parse S1 twice in separate environments | Equal output; distinct source records, AST and function objects; no global cache |
| S12 | Parse `"function f(){return 1;}"`, retain f; then parse `"function f(){return 2;}"` elsewhere | Old/new results exactly their respective input strings; returned call results 1/2 |
| S13 | Retain S4 inner, drop host references to parse result/outer/input; perform another parse | Inner still returns its exact S4 text; no GC timing or memory-size assertion |
| S14 | Retain outer before allocating nested function, perform another parse, then call outer | Later inner closure still uses S4 source, not latest parse |
| S15 | Function declaration stringified before its statement executes | Hoisting allocation already has exact source |
| S16 | Host `createGuestFunction([],[],env,null)` | `"function () { [native code] }"`; no invented `function(){}` source |
| S17 | 100000-unit valid input (pad exterior with spaces); 100001-unit input | First accepted with exact short function slice; second parse SyntaxError `source exceeds 100000 UTF-16 units` at 1:1; never run failed AST |
| S18 | Missing final brace `"function f(){"` | Parse SyntaxError `expected '}', found '<eof>'` at 1:14; no callable/source fallback |
| S19 | Named expression, arrow, Unicode escape, generator/class inputs | Remain parse errors; preserve existing locations/messages, no broadened acceptance |

S19 concrete controls: `let f = function named() {};` fails expected '(' at
1:18; `let f = () => 1;` fails unsupported operator => at 1:12;
`let f = function(){return '\u0061';};` where the source contains literal
backslash-u fails unsupported string escape at the opening quote 1:27.
Use `function* f(){}` and `class C {}` as existing-scope negatives, not requested
features. Native marker output is deliberately not accepted as executable source.

## Method, metadata and receiver classification

| ID | Setup | Required outcome |
|---|---|---|
| F1 | Each of two new Realms | Fresh toString Value/object, own descriptor W=true/E=false/C=true, own name `toString`, length 0, both W=false/E=false/C=true, correct prototype and callable.realm |
| F2 | Root own keys | Exactly `name,length,call,toString`; no global Function, constructor or new construction support |
| F3 | call(T, root), call(T, T), call(T, root.call) | `function () { [native code] }`, `function toString() { [native code] }`, `function call() { [native code] }` |
| F4 | console.log, Number.isFinite, symbol @@toPrimitive | `function log() { [native code] }`, `function isFinite() { [native code] }`, `function [Symbol.toPrimitive]() { [native code] }` |
| F5 | Raw builtin initialName null; empty; `$x_2`; `throw` | Native unnamed form for first two; exact `$x_2` and `throw` names for last two (PropertyName permits keywords) |
| F6 | Trusted name `a b`, `x) {}`, newline, arbitrary Unicode, `[bad]` | Host Error `invalid builtin initial name` before exposing callable; no guest completion or name sanitization |
| F7 | Redefine/delete guest name and length using trusted APIs; alter builtin name to object with throwing coercion | Original parsed source/native initial name unchanged; zero coercion effects; root empty initial name unchanged |
| F8 | Modify function's own toString and @@toStringTag | Saved T still gives original text; explicit saved Object.toString alone observes tag |
| F9 | undefined, null, boolean, number (NaN/-0), string, symbol, ordinary object, array, primitive wrappers, noncallable object inheriting Function root | Runtime TypeError `Function.prototype.toString receiver is not callable`, passed location 77:9, no boxing or property reads |
| F10 | Callable observer whose internalGet throws, and extra argument with throwing hooks | T succeeds using internal metadata; no Get/coercion/callback invocation |
| F11 | Noncallable observer whose internalGet throws | F9 TypeError, observer never read |
| F12 | f body throws or mutates state | Stringification gives exact source, state unchanged; body not invoked |
| F13 | Detached T invoked with undefined receiver | F9; saving T does not bind its receiver |
| F14 | Ordinary function relinked to foreign root or null | Saved T result unchanged; callability and defining Realm preserved |
| F15 | Trusted non-null range with negative/fractional/NaN index, start>=end, or end beyond source length | Host Error `invalid function source range` at factory boundary, no guest completion; source-less host AST uses explicit null |

## Context, budgets and ordinary consumers

For R rows use direct host context calls with loc={line:77,column:9}; expression
ticks are tested separately. Inspect calls and active Realm after every success
and failure. RangeErrors use runtime phase, exact passed Location and the existing
diagnostic message. No row invokes the builtin's callback directly to evade guards.

| ID | Setup | Required outcome |
|---|---|---|
| R1 | call(T,f) with maxSteps=0/maxCalls=1 | Success, steps=0, calls restored to 0 |
| R2 | Same call with maxCalls=0, valid or invalid receiver | RangeError `call depth limit exceeded`, steps=0, calls=0; precedes receiver validation |
| R3 | call(T,invalid) with maxCalls=1 | F9 TypeError, steps=0, restored context |
| R4 | Borrow A's T through B's Function.call from evaluator C | maxCalls=2 succeeds; maxCalls=1 rejects target entry; C restored, calls=0; extra args ignored |
| R5 | A's saved T, B's guest/builtin/root, evaluator C | Exact B source or native metadata; T executes under A, afterward C restored; B never entered; object prototypes/owners unchanged |
| R6 | Default or number toPrimitive(f), untouched methods | Source string, steps=3 (symbol Get, valueOf Get, toString Get), two sequential calls, calls=0 afterward |
| R7 | String toPrimitive(f) and toPropertyKey(f) | Source string/key, steps=2, one call |
| R8 | R6 maxSteps=2 | Third tick fails, steps=3, RangeError `execution step limit exceeded`; no toString call |
| R9 | R7 maxSteps=1 | Second tick fails, steps=2; no toString call |
| R10 | R6 maxCalls=0 | Failure at valueOf call after 2 steps; R7 fails at toString call after 2 steps |
| R11 | Saved T called after step count already exceeds limit | Success and count unchanged if call depth permits; T contains no tick |
| R12 | Saved Object.toString on untagged f | `[object Function]`, one body tick; retain explicit tag tests |
| C1 | f source `function() {}`; f+1; 1+f | `function() {}1`; `1function() {}` |
| C2 | +f, -f, f-2, f*2, f/2, f%2 | NaN; numeric relational comparisons against 2 all false |
| C3 | f source `function(){return 1;}`, g source `function(){return 2;}` | f<g true; f>=g false; identity equality false; same-source distinct closures remain unequal |
| C4 | object[f]=7 then read exact literal key; same-source second closure; spacing-different third | First two access same key/value 7; third absent; never use `[object Function]` key |
| C5 | array [f] through saved join with default separator | Exact f source |
| C6 | array.length=f | RangeError `invalid array length`, existing assignment location, length unchanged |
| C7 | direct toNumber/toString/ToLength on f | Existing object-to-primitive unsupported TypeError; no hooks; Number formatting boundary unchanged |
| C8 | Own toString returns `changed`, later returns `next` | Separate ordinary conversions see changed/next; saved T remains exact source |
| C9 | valueOf hook returns receiver and replaces toString with method returning `fresh` | Default conversion `fresh`; logs valueOf then fresh, no stale method capture |
| C10 | Delete Function root's toString | Default conversion re-exposes `[object Function]`, costs 4 steps; saved T still source; other Realm unaffected |
| C11 | Own toString=0 with ordinary valueOf | Default conversion fails `cannot convert object to primitive` after 3 steps; does not fall through to inherited method |
| C12 | Own @@toPrimitive returns `protocol`, throws sentinel, or is noncallable | Existing protocol results/errors win before ordinary methods; original hint preserved |
| C13 | Relink f to null | Ordinary conversion final TypeError after 3 lookups, no calls; saved T still source |
| C14 | Guest `let f = function() {}; let saved = f.toString; f.toString = function(){return 'override';};` | `f+''` is override; `saved.call(f)` is `function() {}`; use already-supported call/member syntax |
| C15 | Runtime-read guest fixture contains `\nT.call({});` with T seeded as original method | Runtime F9 TypeError at 2:1 (expression location); argument evaluation/AST ticks remain normal; no source-definition location substitution |

## Required migrations (not blanket replacement)

Read against assignment checkout; line numbers are search aids, names are anchors.
Retain assertions/negative controls and update their reasons as well as outputs.

| File/anchor | Exact migration |
|---|---|
| test/object-valueof.ts V6, ~208-224 | Function candidate is functionPrototype.toString, not objectPrototype; source `function() {}` replaces Function tag; observer trace `tick;tick;valueOf;tick;toString;` unchanged; Function steps 4->3, Object 4 and Array 5 unchanged |
| test/operator-coercion.ts ~147-155 | Function addition expected `function() {}2`; numeric/arithmetic/relational NaN/false remain; Object tag unchanged |
| test/fixtures/object-tostring.js:10 | Implicit addition expected `function() {}`; explicit Object.toString driver assertions stay Function tags |
| test/realms.ts G14 with fixtures/realm-intrinsics.js | additionFunction expected `function () { return {}; }1`; numericFunction still NaN; lengthFunction still RangeError; keyFunction still undefined, clarify source-key rather than tag-key; add positive C4 elsewhere |
| test/realms.ts G17 and W1 (~140,296) | Exact root keys `name,length,call,toString`; other root keys unchanged |
| test/boolean-string-conversions.ts M8 (~299-302) | Function root default becomes `function () { [native code] }`; Object/Array controls unchanged |
| test/array-string-conversion.ts C8 (~645) | Function root default becomes same unnamed native form; preserve Number boundary |
| test/object-tostring.ts tag matrix, ClassificationObserver | Explicit tags and tag lookup ticks remain; builtin literal initialName:null added only |
| test/{boolean-string-conversions,number-conversions,object-valueof}.ts | Explicit null fourth argument at source-less createGuestFunction calls |

Required raw Callable literal `initialName:null` migrations occur in
test/{addition,array-length-coercion,array-like,array-storage,array-map,conversion,
function-call,key-coercion,length-coercion,numeric-operators,object-tostring,
operator-coercion,operation-context,property-key-conversion,primitive-conversion,
relational}.ts. Include both object-tostring ClassificationObserver assignments,
both function-call literals, both primitive/operator helper and conditional
literals. These low-level test callables intentionally have no initial public
name. Tests using Realm.createBuiltin need no signature change; their existing
ASCII names, including `throw`, remain accepted. Source AST literals, if added by
then, require explicit source:null; parser-produced ASTs must never use null.

Production required call sites: Realm's Function root and createBuiltin records;
createGuestFunction record; Evaluator.closure declaration-hoist and expression
call sites; parser's two function AST constructions. `source-cases.mjs` and the
inventory are design evidence only, not additions to integrated manifest counts.
Run an updated inventory during implementation to catch new concurrent callers.
