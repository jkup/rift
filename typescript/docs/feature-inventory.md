# Current CLI profile

As of TS-037 (2026-11-08), the CLI prepares and evaluates bounded Scripts through
`script-record.ts` and `script-execution.ts`. It supports `var`, ordinary `for`
loops and updates, `try`/`catch`, ordinary constructors and the existing Script
Error objects. Strictness follows directives; sloppy calls and failed property
writes no longer inherit the legacy engine's always-strict behavior. Source,
parse, step, call and evaluation-depth limits remain enforced.

TS-039 adds generic Array `push` and `pop`, including array-like receivers,
inherited elements and strict mutation failures. Both guest lanes pass 232/232;
see [array mutation](array-mutation.md) for scope and validation.

TS-042 adds generic Array `indexOf` and `includes`, with distinct handling of
holes and `NaN`. Both guest lanes pass 270/270; all 73 native build entries pass
static coverage. See
[array search](array-search.md).

TS-050 adds generic Array `reverse`; TS-051 adds `every` and `some`, including
callback receivers, hole skipping and short-circuiting. See
[array mutation](array-mutation.md) and [predicate iteration](array-predicate.md)
for their Node/native acceptance and limits.

TS-052 accepts numeric object-literal keys using the existing decimal literal
grammar. Keys are normalized from the numeric value: `1.0` and `1` both name
`"1"`, while quoted `"1.0"` remains distinct. Duplicate values still evaluate in
source order. Numeric rounding and decimal/scientific formatting follow the same
host number primitives already used by numeric literals and Number conversion.
Computed and negative keys, exponent/radix literals and prototype-literal syntax
remain outside this change. Both guest suites pass 307/307, full tooling passes
290/290, and all 74 native entries compile with full static coverage. Runner20
and all ten compiler probes pass. Logs: `build/numeric-object-keys-*`.

This follows ECMA-262
[PropName](https://tc39.es/ecma262/multipage/syntax-directed-operations.html#sec-static-semantics-propname)
and its numeric-literal string conversion. The C++ engine's
[`parse_object_literal`](../../src/frontend/parser/parser_expressions.cpp)
was consulted for grammar scope; the TypeScript AST stores normalized string
keys rather than adding a separate numeric-key node.

TS-054 adds generic String `charAt`, `charCodeAt` and `slice`, preserving UTF-16
code units and observable conversion order. See [string methods](string-methods.md).

TS-056 adds prefix/postfix increment and decrement to Script execution; see
[update expressions](update-expressions.md) for evaluation order and validation.

TS-057 adds Boolean call and construction, with genuine private slots and no
coercion hooks; see [Boolean construction](boolean-constructor.md).

TS-058 adds Array calls, construction and brand checking; see
[Array construction](array-constructor.md). The internal map operation now
recognizes foreign intrinsic Array constructors by identity.

TS-059 adds `Object.prototype.hasOwnProperty` and `Object.hasOwn`, preserving
their distinct conversion order; see [own-property predicates](own-property-predicates.md).

TS-060 adds `Object.keys`, `Object.values` and `Object.entries` with ordered
enumeration and live descriptor checks; see [Object enumeration](object-enumeration.md).

TS-061 adds generic `Array.prototype.at`; see [relative indexing](array-at.md).

TS-062 adds generic `reduce` and `reduceRight`; see [array reduction](array-reduction.md).

TS-065 exposes Script `map` and `forEach`; see [array iteration](array-iteration.md).
Custom map species construction remains unsupported.

TS-066 adds `find`, `findIndex`, `findLast` and `findLastIndex`;
see [predicate searches](array-find.md).

TS-067 adds generic `lastIndexOf`; see [reverse value search](array-search.md).

TS-068 adds ordinary Script template literals; see [templates](template-literals.md).
Tagged templates remain unsupported.

TS-069 adds generic string `indexOf`; see [string methods](string-methods.md).

TS-070 adds Script `do…while`; see [loop behavior](do-while.md).

TS-071 adds Math constants and six unary numeric methods; see [Math](math-unary.md).

TS-072 adds Function.prototype.apply; see [argument-list calls](function-apply.md).

TS-077 adds coercing global isNaN/isFinite; see [numeric predicates](global-numeric-predicates.md).

TS-076 adds twenty transcendental unary Math methods; see [Math](math-unary.md#transcendental-unary-methods-ts-076).

TS-075 adds Script binary, octal and hexadecimal integer literals; see [radix literals](radix-literals.md).

TS-074 adds Script decimal exponents and leading-dot fractions; see [decimal literals](decimal-literals.md).

TS-073 adds variadic Math min/max with ordered coercion and signed-zero selection;
see [Math](math-unary.md#min-and-max-ts-073).

TS-063 adds generic `shift` and `unshift`, preserving holes and partial mutations;
see [array mutation](array-mutation.md).

TS-064 adds `Object.defineProperty` and `Object.getOwnPropertyDescriptor`;
see [descriptor reflection](property-descriptor-reflection.md).

`const`, arrows, templates and automatic semicolon insertion remain unsupported.
The legacy `interpreter.run` and observation API still exist; their migration is
separate work. The milestone sections below record historical behavior, not a
single current feature matrix.

## Historical foundation profile

This inventory is a scope statement, not an ECMAScript conformance score.
TS-033ER-A adds host-defined ordinary accessors and contextful semantic reads.
Its section below supersedes earlier milestone references to data-only Get/Set
and deferred internal accessors. ER-B supplies restricted Script bootstrap. The
E4 candidate below adds internal opaque-session execution; CLI, interpreter.run,
observations and corpus admission remain legacy-only. Guest accessor syntax and
reflection remain unavailable. Historical milestone sections describe their
original acceptance boundaries; the E4 section supersedes their closed-body claims.
TS-033A adds a separate non-executing `inspectScript({ id, text })` API in
`src/script-metadata.ts`: complete supported-grammar results expose raw directive
spans, Script strictness and syntactically inherited function strictness. Blocked
results expose only the unchanged parser rejection/diagnostic and source unit.
It returns no AST or execution eligibility. Legacy parser, return certification,
interpreter and observation behavior remain unchanged; strict=true grants no new
early-error certification or Script execution support. See
[TS-033A evidence](validation/ts-033a/README.md).
The [review correction](validation/ts-033a/stack-fix/README.md) replaces recursive
metadata traversal with an explicit work stack: long binary/member/call chains
accepted by the parser no longer overflow the host stack during inspection.
Diagnostics reject unsupported syntax before executing any of the program.
Unsupported operand combinations fail at runtime; parsing an operator is not a
claim that all coercion cases are supported.

| Area | Supported | Explicit limits / deferred behavior |
|---|---|---|
| Lexing | ASCII identifiers including `$`/`_`; decimal integer/fraction literals starting with a digit; single/double quoted UTF-16 strings; space/tab; CR/LF/CRLF/U+2028/U+2029 line boundaries; line/block comments | No identifier escapes/Unicode identifiers, radix/exponent/separator numbers, leading-zero integers, templates or regex. String escapes only quote, backslash, n/r/t. Raw U+2028/U+2029 are preserved inside strings; raw CR/LF are rejected. |
| Literals/values | number, string, boolean, null; undefined/NaN/Infinity bindings; ordinary object/function identity | No bigint or symbol. NaN uses strict-equality semantics; console renders signed zero as `0`. |
| Expressions | parentheses; + - * / % and unary +/-, strict-delete, typeof, void; < <= > >=, == != === !==, !; short-circuit &&/\|\|; simple assignment and += -= *= /= %=; conditional `test ? consequent : alternate` | Numeric operators use number-hint ordinary conversion; addition converts both operands with default hint before string/numeric selection. Relational operators convert in source order with number hint, compare two strings by UTF-16 code units, otherwise compare numbers with all NaN comparisons false. Own/inherited valueOf/toString methods work on ordinary objects, arrays and functions; default ordinary objects convert through inherited Object valueOf/toString to [object Object] (numeric NaN). Boolean/String wrappers use their standard payload methods. Number wrappers return numeric payloads for default/number hints and decimal payload strings for string hints. Arrays convert through join; functions convert to exact retained source or the native form. Both operand evaluations precede coercion. === !==, truthiness and Number predicates never coerce. Conditional precedence, selected-arm evaluation and existing bounds remain unchanged. Abstract equality selectively converts at most one object with the default hint; nullish/object and object/object comparisons never coerce. No BigInt, comma, bitwise, update, other compound assignments, nullish coalescing or optional chaining. |
| Statements | semicolon-terminated expressions and let; blocks, if/else, while, function declarations, return, throw, unlabelled break/continue, empty statement | Semicolons required; no ASI, var/const, for/do, switch, try/catch/finally or labels. Declarations as if/while bodies require braces. Return/throw expressions cannot start on a later line. |
| Scope | Block lexical bindings, TDZ, mutable captured bindings, function hoisting in their declaration list, recursion, shadowing in nested blocks | One let binding per declaration. Duplicate names/parameters rejected, including function declarations sharing a parameter name. Global builtin names cannot be redeclared. Separate Script global environments and Annex B deferred. |
| Functions | Declarations and anonymous expressions, simple parameters, left-to-right argument effects, missing args undefined/excess args evaluated, return/fallthrough, own properties | No named function expressions, arrows, rest/default/destructuring parameters, constructors, classes, argument objects, generators/async. Strict-call profile regardless of directives; detached and top-level this are undefined. |
| Objects | Colon-valued literal entries with word/string keys; dot and computed key get/write; aliases; ordinary methods as function-valued properties; missing properties undefined | Ordinary inherited data and accessor properties supported when seeded by the host; production objects inherit their Realm Object root. No accessor syntax, method shorthand, numeric/computed literal keys, spread or enumeration APIs. Guest delete uses unconditional strict-delete: identifier operands are parse errors and nonconfigurable properties throw. Literal __proto__ rejected. Symbol keys retain identity; other primitive keys convert to strings. Object keys use the symbol protocol then string-hint ordinary conversion; default objects key as [object Object]. Primitive property reads/calls box before deferred key conversion and preserve the original primitive Receiver/this; simple assignments box after the RHS, convert/cache the key and pass the original Receiver to ordinary Set. Arithmetic compounds capture one reference, Get before the RHS, apply existing arithmetic, then Put with the saved key and original Receiver; primitive Get and Put use distinct wrappers. Primitive Receiver data writes throw; inherited setters receive the original primitive. Delete keeps its existing boxing path. |
| Bootstrap | Per-realm console object and console.log; undefined/NaN/Infinity bindings; partial Number namespace below | No other standard constructors or globals, eval, Function, filesystem or process in guest code. Console rendering is a host diagnostic convention, not guest ToString. |
| Property descriptors (TS-004A/TS-033ER-A) | Internal tagged data/accessor storage and partial descriptor validation with explicit absence/defaulting, SameValue, atomic rejection, non-configurable/non-writable invariants, and preventExtensions. Existing writable own properties remain writable on non-extensible objects; new assignment fails. | Host APIs only; no guest Object/Reflect builtins, accessor syntax or proxies. Internal key listing/deletion are described in TS-004C below. Internal false and strict assignment TypeError are distinct. |
| Prototypes (TS-004B) | Internal get/set with explicit receiver and normal/throw results; iterative inherited descriptor lookup, receiver-own writes, cycle and extensibility checks; strict assignment rejection. Compiled host tests seed guest realms and exercise inherited method this. | TS-016A adds per-Realm Object/Function/Array roots, with an immutable null-root Object prototype. No guest prototype mutation/reflection APIs or accessor syntax. Literal __proto__ still rejected. |
| Number (TS-003) | Per-realm, mutable global binding to a non-callable namespace. Constants NaN, POSITIVE_INFINITY, NEGATIVE_INFINITY, MAX_VALUE, MIN_VALUE, EPSILON, MAX_SAFE_INTEGER, MIN_SAFE_INTEGER have non-writable/non-enumerable/non-configurable own properties. isNaN/isFinite never coerce, ignore receivers and excess argument values, and have writable/non-enumerable/configurable namespace properties. Each predicate has its correct name and length 1, both non-writable/non-enumerable/configurable. | Intentionally partial intermediate namespace, not complete Number support. No Number conversion/call/constructor, guest prototype exposure, integer predicates, parsing methods or guest reflection APIs. Extra argument expressions still evaluate normally. Builtin metadata is centralized in Realm registration; guest function own name/arity inference remains deferred. |
| Own keys/deletion (TS-004C) | Internal configurable-own deletion, normal false on nonconfigurable rejection, detached lists of all own string keys including nonenumerable keys; canonical array indices first numerically, other strings by creation order. Overwrite preserves position; delete/reinsert renews it. | Key listing remains host-only; TS-025A adds guest strict-delete over current string/symbol keys and Array/String dispatch. No Object/Reflect APIs or generic exotics. Ordinary key listing cannot throw; arrays reuse these operations. |
| Errors | Parse locations, runtime locations, thrown guest values, ReferenceError/TypeError/RangeError diagnostics | Engine errors are string values plus diagnostic records, not Error instances. No guest catch syntax or stack traces. Across-run redeclaration fails at runtime before new declarations are installed. |
| Primitive conversion (TS-005N) | Internal ToNumber/ToUint32 for existing primitive Value kinds, exact numeric-string scanning and tested binary64 backend, signed-zero preservation/normalization. | Host driver API only; no operator/builtin integration. Objects explicitly throw unsupported-conversion runtime TypeError without guest calls. No symbols/BigInts or ToPrimitive. |
| Definition dispatch (TS-005D) | Required-location normal/throw definition API; receiver overrides propagate exact guest throws, strict assignment preserves RHS and translates false, bootstrap rejects false/throw as host faults. | Internal prerequisite only; no arrays, generic exotics, guest reflection or conversion integration. |
| Array storage (TS-005A) | Host-created GuestArray with real own length, canonical index growth, holes, sparse descending truncation, partial failure restoration/delayed freezing, double number-hint length conversion (TS-015B), ordinary prototype reads and receiver-aware assignment. Seeded guest assignments preserve original RHS and report runtime errors at the assignment. | Array literals are supported by TS-006 below; no Array constructor, standard conversion overrides, species or generic exotics. Host-defined accessor indices are supported; length remains data. Ordinary symbol properties are supported. Explicit conversion hooks are supported for length. Default Realm objects convert twice then fail with RangeError invalid array length; null-root missing hooks and explicit both-object hooks still throw TypeError. Low-level host construction defaults to null; production arrays inherit the Realm array root. |
| Resources | Source, parser, step, call and frame bounds; independent realm state | No heap quota, suspension, jobs or security isolation guarantees; see architecture decisions. |

`test/fixtures/semantics.js`, `order.js`, `examples/counter.js`, and the realm driver
exercise successful behavior with fixed outputs. `test/cases.json` records fixed
source locations for representative errors. `tools/run-guests.mjs` also materializes
negative syntax, abrupt evaluation, CLI and resource-bound cases as runtime files.
Line-terminator regressions write actual LF, CR, CRLF, U+2028 and U+2029 into runtime files and assert comment termination, exact line/column diagnostics, whitespace, and return/throw restrictions including block comments. Every fixture is tested by the same compiled interpreter in Node and native lanes.

Full descriptor/prototype semantics, arrays, coercion, broad builtins, modules,
Temporal, regex, async/generators, weak collections and optimization remain outside
TS-001. Existing C++ tests and test262 are not counted in the foundation test total.

TS-005H adds internal ordinary `internalHasProperty`, primitive
`toIntegerOrInfinity`/`toLength`, and object-only `lengthOfArrayLike`. Presence
includes inherited undefined and distinguishes holes; length reads use the
completion-aware Get path and clamp at 2^53-1. TS-014 adds number-hint ordinary conversion of the saved length Value using a required active context. Direct primitive converters remain unchanged. No guest APIs, boxing, map,
accessors or proxy/exotic traversal are introduced. See the TS-005H architecture
notes and `docs/validation/ts-005h/` for interfaces, sources and measured checks.

### Internal default-array map (TS-005B)

The internal `mapObjectDefaultArray` operation accepts an already validated
GuestObject and calls callbacks through the current OperationContext. It
preserves holes, inherited data and callback mutations, snapshots length once,
and charges one shared tick per index. Array inputs with non-undefined
constructor reject unsupported constructor/species behavior; generic lengths
above 4294967295 reject before result allocation. This is not a registered
Array method and does not implement primitive boxing or complete species.
Only the compiled test driver seeds a host adapter. Full expected-result matrix
and Node/native evidence: [TS-005B](validation/ts-005b/README.md).

### Array literals (TS-006)

Array expressions support empty lists, elisions, trailing commas and existing
assignment expressions as elements. Holes remain absent own properties; explicit
undefined/null elements are present. Values evaluate left-to-right with abrupt
propagation, fresh array identity and retained nested object identity. Length
includes holes and responds to existing guest string-key/length assignments.
Each slot spends a shared execution tick, including holes. Initial prototype is
the Realm array root; no Array global, methods, spread, destructuring or comma operator. Computed
numeric keys convert to strings (`a[0]` and `a['0']` alias). Parser/source limits apply.
The readable `test/fixtures/array-literals.js` also serves as a CLI example.

### Internal primitive-conversion helpers (TS-011)

Internal ordinaryToPrimitive and partial toPrimitive support explicit own or
inherited callable valueOf/toString methods, original receivers, fresh fallback
lookups and shared active evaluation budgets. A compiled test bridge exercises
real guest methods; TS-018B later registers Object.prototype.valueOf. TS-012 connects the helper to existing numeric, addition and relational operators.
TS-013 connects computed keys and required-context reference consumption. TS-014 connects array-like length and internal map. TS-015B connects semantic array length definitions through two separate number-hint conversions. Direct numeric/string converters and bootstrap array length remain primitive-only. Later TS-019B1/C add the real symbol hook and Object toString. Wrapper conversion overrides, Date and accessors/proxies remain unsupported. Evidence: [TS-011](validation/ts-011/README.md).

TS-015A requires OperationContext on semantic Set/Define and replaces host setup
`define` with validated descriptor-form `bootstrapDefine`. Constructor and setup
exclude semantic subclass dispatch; array length storage is shared. The plumbing itself adds no guest
features or ticks; TS-015B subsequently enables semantic array length coercion.
See [TS-015A evidence](validation/ts-015a/README.md).

TS-015B preserves original assignment RHS identity, post-hook length observation,
readonly Set ordering and sparse partial deletion/freeze. Runtime-read guest
methods and direct definitions cover L1-L21. Bootstrap remains a validated
zero-hook path. See [TS-015B evidence](validation/ts-015b/README.md).

### Function.prototype.call (TS-016B)

Functions now inherit a per-Realm `call` builtin (name `call`, length 1).
`f.call(thisArg, a, b)` passes thisArg and remaining Values unchanged. A missing
thisArg is undefined; invalid callable receivers produce a located TypeError.
Saved methods can be borrowed and used after target.call is shadowed. Method
and metadata descriptors use the existing standard builtin registration flags.
No ordinary/array instance inherits call, and null-root host functions remain bare.

Existing strict receiver behavior applies. Proper tail calls remain unsupported:
forwarding occupies both builtin and target call slots. TS-017A enters each
function's defining Realm while retaining its original lexical environment. No constructors, apply/bind/toString, boxing or conversion methods
are added. See [TS-016B evidence](validation/ts-016b/README.md).

### Synchronous function Realm entry (TS-017A)

Guest functions and builtins, including Function.prototype, retain an immutable
explicit defining Realm. Calls temporarily enter that Realm using the same
stable evaluator context and shared budgets, then restore the caller even after
host faults. Guest lexical environments, receiver/argument/result identities and
throw locations remain intact. Object, array and nested-function allocations
inside a foreign body use its defining Realm. A saved context observes the live
active Realm; a separately saved Realm remains a fixed snapshot.

Borrowed call intrinsics enter their own Realm before the target's Realm. Internal
map allocates in the supplied context's active Realm, independently of callback
and source ownership. Coercion hooks enter and restore independently. Prototype
and metadata mutations do not alter function ownership. This adds no methods,
constructors, suspension support or Error objects; strict receiver behavior and
resource limits remain the existing bounded profile.
See [TS-017A evidence](validation/ts-017a/README.md).

### Explicit primitive wrapper objects (TS-018A)

Internal Boolean/Number/String wrappers now retain readonly scalar payloads and
inherit separate per-Realm roots. Explicit ToObject preserves object identity,
boxes supported primitives freshly in the active Realm and rejects nullish values
without reads/calls/ticks. String wrappers expose virtual UTF-16 indices and an
ordinary readonly length, with compatible definition, deletion, ordering,
nonextensibility and detached inspection behavior. Descriptor-aware inherited
Get/Has/Set sees these virtual units. Internal map and lengthOfArrayLike accept an
explicit String object; neither performs implicit boxing.

These are host/internal APIs. Primitive member access still fails, receivers stay
unchanged, Number remains a noncallable namespace, and no wrapper globals,
constructors are installed; TS-020 adds Boolean/String conversion methods. Direct primitive converters
still reject every object. TS-018B installs Object.valueOf and TS-019C installs Object.toString; Number wrappers use TS-021A numeric valueOf and TS-032B decimal string hints; TS-020 adds Boolean/String payload methods. Symbols are covered by TS-019A/B/C; accessors and proxies remain deferred. Keys and
snapshots allocate proportional to string length; no huge-string resource claim
is made. [Acceptance evidence and W1-W19 map](validation/ts-018a/README.md).

### Object.prototype.valueOf (TS-018B)

Every Realm installs one fresh `valueOf` method on its Object root. Calling it
returns an object receiver unchanged or explicitly boxes a supported primitive
in the method's defining Realm; null/undefined throw a located TypeError. Extra
arguments are ignored after ordinary call-site evaluation. Saved and borrowed
methods use existing call context, Realm restoration and shared budgets.
Inherited valueOf returns an object; TS-019C now supplies the second ordinary hook, Object.toString. The new inherited call counts against call depth; it adds
no synthetic ticks. Primitive member access and direct primitive converters keep
their existing rejection boundaries. No Object global, wrapper conversion
methods, constructors, implicit boxing, toString or symbols are introduced.
[V1-V8 evidence and expectation audit](validation/ts-018b/README.md).

### Internal symbol primitive-conversion protocol (TS-019B1)

Following the ordinary symbol foundation, `toPrimitive` now checks the shared
canonical `wellKnownToPrimitive` identity before ordinary methods. The lookup
costs one tick and uses the original receiver; a callable receives exactly one
hint string (`default`, `number` or `string`). Nullish absence alone falls back.
Other noncallables and object results throw located TypeErrors. Primitive inputs
and direct `ordinaryToPrimitive` retain their old behavior. Existing key,
operator, array-like length/map and double array-length conversions all consume
this protocol with shared budgets and callable-Realm restoration.

This is an internal/host-bridge surface. There is no guest Symbol global,
registry, accessor/proxy or implicit boxing expansion. TS-019C subsequently adds toStringTag and Object toString. Earlier TS-011 exclusions of symbol
hooks are superseded only by this bounded stage. [P1-P9 evidence](validation/ts-019b1/README.md).

### Symbol prototype conversion methods (TS-019B2)

Each Realm now installs fresh Symbol `toString`, `valueOf`, and canonical
`[Symbol.toPrimitive]` methods. They accept symbol primitives and actual Symbol
boxes, including foreign or relinked boxes; the ordinary Symbol root and objects
merely inheriting from it have no payload and fail. Explicit `toString` produces
a descriptive UTF-16 string. Intact boxes return their symbol payload for every
conversion hint, including property-key conversion; implicit numeric/string
conversion then rejects that symbol. The configurable, readonly protocol method
can be deleted, exposing fresh ordinary method lookup in the usual hint order.

This supersedes earlier missing-Symbol-method limits only. Direct converters
still reject objects without invoking hooks, and Object `valueOf` still boxes
symbol primitives. No Symbol global/factory/registry, description accessor,
constructor backlink or implicit member boxing is added. TS-019C below adds the tag and Object toString.
[P10/P11 evidence and expectation audit](validation/ts-019b2/README.md).

### Object toString and canonical symbol tags (TS-019C)

Object.prototype.toString now uses explicit defining-Realm boxing, classification
before one tick and one real-symbol Get, and an uncoerced string tag or builtin
fallback. Null/undefined return immediately without boxing or lookup. Symbol
prototype has a configurable readonly canonical tag; Symbol boxes have Object
fallback if that tag is missing/nonstring. Data-only Get remains the boundary.

Ordinary defaults now produce [object Object], numeric NaN and that computed key.
Array-like length={} becomes 0; array length={} makes two full conversions and
throws RangeError without changing length. Array/Function/Number
wrappers inherit interim tag defaults, **not complete standard conversion**.
Symbol wrappers retain their B2 payload protocol. No global/constructor, accessor,
proxy, wrapper override or implicit member boxing expansion.
[Both C matrices, migrations and retained validation](validation/ts-019c/README.md).

### Boolean/String conversion methods (TS-020)

Fresh per-Realm toString/valueOf methods extract only genuine matching slots or
matching primitives. Boolean roots contain false; String roots contain the empty
string. String methods preserve UTF-16 exactly. Bodies perform no property reads,
coercion or ticks. Ordinary conversion still looks up the canonical hook then
the appropriate method; deletion/replacement remains observable. Object.valueOf
continues boxing and Object.toString continues tag lookup. Direct converters
reject objects. TS-028A adds primitive member reads and calls through temporary wrappers. No constructors,
globals, backlinks, Number/Array/Function overrides or other String methods.
[M1-M8 evidence and migrations](validation/ts-020/README.md).

### Number valueOf (TS-021A)

Fresh per-Realm valueOf extracts number primitives or genuine GuestNumber slots,
including root +0 and foreign/relinked boxes, preserving -0 and NaN. Its body
has no property reads, coercion or ticks. Default/number conversion uses actual
lookup (two ticks, one call); TS-032B now supplies decimal string hints and computed
keys (two ticks, one call). Deletion exposes
Object.valueOf and fresh fallback lookup. Direct converters still reject boxes.
The existing Number namespace remains noncallable; no constructors or implicit
boxing are added. TS-032B supplies Number.toString using the accepted exact nondecimal backend. [N matrices and validation](validation/ts-021a/README.md).

### Function source and toString (TS-023A)

Declarations and anonymous expressions retain exact original UTF-16 source,
including internal whitespace/comments, and share the source record through
nested/hoisted/later closures. Function.prototype.toString reads that metadata,
rejects noncallables, and emits a validated native form for builtins and explicitly
source-less trusted host functions. Builtin initial names are independent of guest
property mutations. Bodies have zero ticks and no guest property reads/calls.
Ordinary function conversion now yields source (native form for the callable root),
while explicit Object.toString still supplies Function tags. Replacement/deletion,
symbol hooks, shared budgets and foreign-Realm calls retain their existing behavior.
No new syntax, constructors, implicit member boxing or Number formatting support.
[Fixed matrix and validation](validation/ts-023a/README.md).

TS-025A adds unconditional strict-delete within this limited profile, not full
strict Scripts: direct identifiers are early errors, property false results throw,
and nonreference values are evaluated then discarded with result true. Primitive
delete bases are boxed before deferred key conversion; ordinary reads/writes
retain their prior restrictions. No sloppy mode, binding deletion, accessors,
proxies, Object/Reflect APIs or additional operators are introduced.

### Typeof and void (TS-026A)

`typeof` classifies all represented Values, including symbols and internal guest
or builtin callability. Only a direct unresolved identifier (including erased
parentheses) produces `undefined`; TDZ and nested missing-name failures retain
their ordinary diagnostics. `void` evaluates and obtains its operand Value once,
then returns the guest undefined value. Neither operator coerces its result.
Member operands use TS-028A ToObject reads and deferred key conversion;
strict-delete retains its existing boxing behavior. No BigInt or HTMLDDA
support is implied. See [contract](typeof-void.md) and
[implementation evidence](validation/ts-026a/README.md).

### Guest in operator (TS-027A)

Ordinary `left in right` is supported at relational precedence with left
associativity. Both operand evaluations/GetValue complete before the RHS object
check; a primitive RHS raises a located TypeError before left key conversion.
Object keys use existing string-hint ToPropertyKey, preserving symbol identity,
then existing iterative internalHasProperty checks own/inherited descriptors.
Undefined-valued/nonenumerable data, array holes/length and virtual String wrapper
indices retain their existing semantics. The target is never boxed or read with
semantic Get. Key hooks can mutate the captured target before presence is tested;
rebinding either operand cannot replace its captured Value.

`in` remains reserved for bindings and valid as an ordinary property name. No
for-in, private membership, instanceof, proxies/accessors, reflection API or new
boxing support is implied. Existing resource guards and defining-Realm hook
entry apply unchanged. [Implementation evidence](validation/ts-027a/README.md)
records the complete named matrix, runtime fixtures and retained failures.
### Primitive property reads and calls (TS-028A)

GetValue uses the existing active-Realm ToObject before deferred ToPropertyKey.
Successful keys are saved as string/symbol Values on the reference before Get;
failed conversions retain their raw key. Each read gets a fresh temporary wrapper
and fresh property value. Get and member calls retain the original primitive
Receiver/this. Nullish reads reject before conversion hooks, after evaluation of
the key expression. String indices and length use existing UTF-16 virtual data.

TS-029A supersedes the object-only write restriction: property assignment boxes
after RHS evaluation, converts and saves a successful key, then calls internalSet
with the original base Receiver. Nullish bases reject before key hooks; other
primitive bases reach key effects before their strict data-only Set rejection.
False Set becomes TypeError at the assignment operation location. Wrappers are
never cached or written by the assignment. Object and Array definition dispatch
(including partial Array shrink) remain unchanged. This is the existing strict
write profile, not full strict Script support. The R30 tick oracle has an independently reviewed correction from6 to5; see
[TS-029A evidence](validation/ts-029a/README.md).
Delete, binding reads, parser syntax and built-in inventory are unchanged.
TS-032B subsequently replaces the inherited Number tag method with decimal
and radix formatting. The [implementation evidence](validation/ts-028a/README.md)
maps all 144 named rows and records precise expectation migrations and preservation.

### Return-only parse certification (TS-031C-B)

An ordinary `parse.return-context` failure can carry the structured
`syntax-error/return-outside-function` tag only when a fresh internal audit of
the same unedited source reaches EOF with a Script-level return candidate.
Unsupported tails and resource guards veto certification and preserve the
ordinary parser's original rejection. Diagnostics, locations, partial bodies,
CLI results and effects are unchanged. Observation transport carries parse phase,
SyntaxError constructorName and that one rule, with bodyEvaluated false; it does
not create a guest Error object. All other syntax rules remain non-emitting.

This adds no grammar, ASI or strict Script execution. All conformance profiles
remain blocked with zero conformance execution; observations do not admit a
profile, validate a harness or classify a test. See the bounded
[implementation evidence](validation/ts-031c-b/README.md).

### Number toString (TS-032B)

Fresh per-Realm toString (length 1) precedes valueOf in Number root own-key order.
Receiver slot validation precedes numeric-hint radix coercion; only absent or
undefined radix defaults to ten. Range validation precedes special-value output.
Decimal conversion is unchanged; positive finite nondecimal magnitudes use the
accepted exact backend, with sign handled by the method. String hints and keys
now use decimal payload strings. Saved/borrowed methods retain slot semantics;
Object methods, namespace properties and primitive-only converter boundaries
are unchanged. No constructors, additional Number methods or conformance admission.
See [validation and exact expectation migrations](validation/ts-032b/README.md).

### Host-only composite global environment (TS-033B)

`GlobalEnvironment` combines persistent mutable lexical bindings (including TDZ)
with an ordinary guest global object. It exposes strict binding access, global
this identity, restricted-property and var/function declaration checks, and
individual var/function creation primitives. Captured strict host references
retain their environment or unresolved base across mutations. Existing property
dispatch preserves original abrupt records and locations.

The Script Realm profile installs this module as its host-only composite global
record (TS-033C). It is not used to evaluate Script source. It does not implement declaration
instantiation, multi-name atomic checks, source G/L scenarios, sloppy execution,
accessors/exotic globals or Error objects. Legacy behavior and all conformance
admission blockers remain. See [interfaces and evidence](validation/ts-033b/README.md).


### Script Realm bootstrap and closed execution boundary (TS-033C)

Host construction accepts a readonly legacy/script profile, defaulting to legacy.
Legacy retains its replaceable Environment; Script allocates one ordinary global
object and composite record, with that same object as global this. Both install
exactly undefined, NaN, Infinity, console and the partial noncallable Number
namespace. There is no guest globalThis property or additional constructor.
Script-only helpers seed ordinary descriptors and read through lexical precedence.

Script source execution and guest-function creation remain unavailable. Body
observation, run and evaluator construction reject Script with host errors;
parser observation remains profile-neutral with unchanged limit precedence.
Evaluator dispatch and every builtin invoke wrapper (including functionPrototype)
reject cross-profile calls before dispatch effects; Script-to-Script builtin
invocation is also unavailable. Direct callable seeding rejects foreign profiles,
while nested/low-level storage is checked at invocation. Legacy cross-Realm calls
retain defining-Realm allocation, strict receivers and finally restoration.

This adds no parser/Reference integration, declaration instantiation, Script
execution session, strictness semantics, observation schema or conformance
admission. See [implementation and validation](validation/ts-033c/README.md).
### Non-executing Script declaration plans (TS-033D1)

`planScriptDeclarations(unit)` returns detached flat scope, declaration, function
and strictness records, or a whole-source blocked/conflict result. Plan-only var
statements support simple identifier lists and initializer spans. Script/function
functions are var-scoped; strict block functions are lexical. Nested block var
summaries stop at functions. Conflicts are checked after complete grammar and
resource validation, in deterministic scope/check/list order. A pure selector
returns last function declarations in winning source order.

The parser retains separate legacy, return-audit and declaration-plan purposes.
Public parse/audit/inspectScript behavior is preserved, including their existing
var/repeated-binding rejection and return certification. Plans expose no AST,
create no bindings or guest functions and evaluate no source. Non-strict block
function planning is unsupported; no Annex B approximation or new certification
is introduced. Global instantiation and executable Script records are separate stages described below. All Realm/profile guards remain closed.

See [literal controls and validation](validation/ts-033d1/README.md).
### Host-only global declaration instantiation (TS-033D2)

The internal `instantiateGlobalDeclarations` seam accepts a validated strict plan,
Script OperationContext, GlobalEnvironment and explicit materializer. It performs
current-state lexical checks, reverse function admission, repeated forward var
admission, then creates lexical TDZ bindings, winning functions and unique vars.
Every occurrence and creation phase is budgeted at the frozen declaration site;
interruption preserves the created prefix and the original abrupt record.

The only materializer supplied in this slice is a test-local noncallable marker.
No initializer/body executes; no callable factory, execution entry point, parser,
Realm, interpreter, observation or existing global primitive was changed. Script
execution and P4 remain unavailable behind the existing guards. Synthetic fault
environments establish internal propagation only, not exotic global support.
See [D2 evidence](validation/ts-033d2/README.md).

### Private Script executable records (TS-033E1)

Internal `prepareStrictScript` binds a successful strict declaration-mode parse
and its complete plan to one Realm and copied source unit. The record retains
private original body/function/block/declaration associations from the same
iterative collector pass. Detached flat inspection copies every nested mutable
metadata container; no writable AST or arbitrary AST/plan constructor is exposed.
Realm rejection precedes parsing; whole-source grammar/resource/conflict checks
precede strict-profile rejection. Empty source is profile-rejected; strict
directive-only source is eligible. Equal IDs/text still create independent records.

This is preparation only: no Script source execution, allocation of guest
functions, declaration instantiation, runtime/Realm/evaluator behavior or guard
changes. No observation/harness/profile admission. See [E1 evidence and compiler
identity boundary](validation/ts-033e1/README.md).

### Script binding and statement-completion helpers (TS-033E2)

Additive host-only local/function environment records link iteratively to the
accepted composite global terminal. Strict references retain their resolved base
and copied site; TDZ shadows outer bindings and unresolved references remain
unresolved after effects. Global operations recheck current state. Function
records retain exact this/callable host metadata without creating or calling a
Script function. No FDI or standard arguments behavior is claimed.

Separate statement payloads distinguish empty from guest undefined. UpdateEmpty
preserves valued and abrupt records; the explicit expression adapter preserves
throw identity. These are pure data helpers, not statement/loop/if execution.
Legacy runtime, evaluator, Realm, parser, record and entry guards are unchanged.
See [E2 validation](validation/ts-033e2/README.md).

### Script function materialization and empty activation (TS-033E3A)

Prepared strict Script records can now materialize opaque branded function
metadata and fresh ordinary function/prototype pairs with exact defining-Realm
identity, descriptors, source and formal metadata. Host allocation preserves the
captured Script chain and strict receiver in a fresh empty FunctionActivation.
The record holds no activation collection; private owner/scope/phase stay on each
activation. M and A each consume one tick after invariant validation.

Private parser metadata distinguishes parenthesized identifier assignment targets
without changing legacy AST output. Detached naming inspections expose no AST.
The Callable union includes script-guest and the pure source-string helper handles
all variants; shared invocation guards still reject Script execution. E2's fixture
uses genuine preparation/materialization/allocation with original assertions.

No function/block/global declaration setup, arguments object, restricted accessor
migration, execution, constructor admission or conformance/profile admission is
claimed. E3B, ER and E4 remain separate. Two impossible hostile typed casts use
explicit Node runtime negatives and native compile-rejection evidence, as approved
by the coordinator. See [E3A implementation and validation](validation/ts-033e3a/IMPLEMENTATION.md)
for the exact split and isolated static compiler module-reachability workaround.

### Script declaration setup (TS-033E3B)

Prepared records now provide host-only function and block declaration setup plus
an identity-bound global adapter to the unchanged D2 orchestrator. Activations
own their private key, scope and single-use phase. Function arguments are copied
before ticks, var/function collisions preserve last-winner semantics, lexical
bindings stay TDZ, and closures capture the exact fresh local environment.
Blocks initialize functions immediately in lexical order. Global admission checks
current state on every invocation; private plan identities never come from public
inspection snapshots.

The function18/block6/global12 prefixes and original11 D2 marker replay are
covered with resource and host failures. This does not execute initializers or
bodies, activate frames, change guards, create arguments objects, or admit Script
execution. ER and E4 remain separate. See [E3B validation](validation/ts-033e3b/README.md).

### Ordinary accessors and operation context (TS-033ER-A)

Trusted host definitions support tagged data/accessor descriptors, atomic validation
and kind transitions, detached snapshots, and ordinary receiver-preserving Get/Set.
Getter/setter calls use the caller's existing OperationContext and preserve abrupt
identity, Realm/call/depth cleanup and budgets without extra wrapper ticks.
Array accessor indices participate in growth and shrink rollback; String virtual
indices retain immutable data semantics. Global/E2 binding reads and explicit host
inspections forward context, including all conversion/map/join/tag consumers.

There is no guest descriptor reflection or accessor syntax, no Proxy, and no
Script execution admission. ER-A alone did not install restricted properties;
the separate ER-B slice below supplies that bootstrap. Legacy bootstrap and
closed Script guards remain unchanged. See [ER-A implementation and validation](validation/ts-033er-a/IMPLEMENTATION.md).

### Guarded restricted function properties (TS-033ER-B)

Each Script Realm installs caller and arguments accessors on Function.prototype,
sharing one guarded, nonextensible thrower with frozen empty name and zero length.
Genuine E3 functions inherit these configurable accessors; ordinary deletion,
redefinition and own data shadows retain their ordinary semantics. Distinct Realms
have distinct throwers, and the legacy prototype inventory is unchanged.

Host recording contexts prove receiver/argument/endpoint dispatch and abrupt-record
identity. Actual invocation still fails the existing Script or cross-profile host
guards. This is not execution of ThrowTypeError or Script source: E4/R36 and actual
diagnostic TypeError execution remain blocked. See [ER-B validation](validation/ts-033er-b/IMPLEMENTATION.md).

### Internal strict Script execution (TS-033E4 accepted e67c927)

`script-execution.ts` exposes only `createScriptSession`, `evaluateScript` and
opaque/result/snapshot types. Preparation still requires complete supported
strict source and an owning Script Realm. One shared engine now handles the
existing expression algorithms, strict Script references, declaration setup,
block/function environments, completion values, named evaluation, calls and
cross-Realm source provenance. Legacy Evaluator APIs and subclass hooks retain
their original behavior through a compatibility facade. Executable ASTs and
node maps stay with the engine in a private module; inspection never returns them.

Each Script engine owns one context whose call/tick functions capture that engine.
Copied functions carry its authority while it is active; they reject while idle.
Hosts are trusted extensions and must not mutate the context. Realm's profile-first
guard requires a synchronous, exact, one-use private permit for Script builtins.
Direct host invocation remains rejected. Calls restore frames and Realm projection
on guest/resource/host failures; steps remain shared and monotonic across units.

The candidate executes real restricted caller/arguments accessors and ordinary
deletion, redefinition and own shadows. Its new driver covers frozen restricted
resource prefixes, FDI/block/GDI prefixes, strict receivers, captured references,
empty statement completions, persistent closures, naming, source identity,
nested active sessions and exact guest/host abrupt identity. Reflective malformed
host shapes are explicitly Node-only controls. See [execution evidence](validation/ts-033e4/execution/README.md)
for the exact validation boundary and inherited host-helper replays.

This passed independent execution and regression review; it is not public Script admission or a conformance
claim. No arguments object/binding, Error objects, new grammar, observation/schema
change, harness loading, async/generator support or default-profile change is added.

### Internal strict simple catch (TS-034H1 candidate)

Strict Script preparation admits `try { ... } catch (identifier) { ... }`.
The original protected block, catch owner and handler block retain distinct
scope identities. Both arms contribute var declarations to their enclosing
Script/function; the catch parameter has its own mutable declarative binding.
Handler closures retain that binding. Language throws enter catch; resource
limits, unsupported operations and host faults bypass it. Consuming a throw
clears its propagation identity while retaining diagnostic history, so reusing
the exact completion at a later source site records the new source correctly.
Try completion applies UpdateEmpty(undefined), with frame and nesting cleanup
on every exit and monotonic shared steps. See [H1 evidence](validation/ts-034h1/README.md).

Legacy grammar and public entry remain unchanged. Finally, optional/destructured
catch, sloppy catch, catch-var collisions/Annex B and genuine Error objects remain
outside this slice. The unchanged pinned harness and all 60 selected corpus
variants remain blocked; this candidate awaits independent review.

### Internal strict switch (TS-034H2 candidate)

Strict Script preparation admits switch with case clauses and at most one default.
The discriminant runs in the surrounding environment. Selectors and clause bodies
share one CaseBlock environment: let bindings begin in TDZ, block functions are
initialized before selection, and vars propagate to their enclosing Script/function.
Selectors use strict equality and stop at the first match. A default in the middle
is selected only after all applicable selectors fail; fallthrough executes bodies
without re-evaluating selectors. Unlabelled break exits this switch, continue can
reach an enclosing loop, and return/throw retain their original completion data.
Empty switch completion is undefined; preceding clause values survive empty
statements and abrupt control flow through UpdateEmpty.

Original owner/body associations remain private. The existing BlockActivation,
shared evaluator and setup ticks are reused, with frame restoration on language
throws, resource limits and host faults. No public switch API or alternate
interpreter is introduced. See the [accepted contract](harness-switch.md) and
[implementation evidence](validation/ts-034h2/README.md).

Legacy parsing/return audit, public CLI and corpus admission remain unchanged.
Labels, sloppy block functions, additional grammar and genuine Error objects
remain excluded. All 60 selected corpus variants remain blocked. This candidate
requires actual and independent second review before integration.

### Internal classic for and postfix increment (TS-034H3 candidate)

The internal strict Script path admits classic `for` with optional expression or
`var` initialization, optional test/update, and existing branch statements.
Header vars use their original parser nodes and declaration spans; no new loop
scope is introduced. Actual body blocks retain fresh iteration activations.
The initializer follows NoIn grammar, including normal nested +In expressions.
Postfix `++` accepts identifier/member targets without an intervening line
terminator. Legacy parsing and return auditing retain their old lexer rejection.

Increment resolves one Reference, gets once, applies ToPrimitive(number) and
ToNumber, writes through that same Reference, and returns the old numeric value.
Converted property keys are cached while writes consult current descriptors and
preserve the original receiver. Only the existing Number domain is supported.
Continue executes the update; break skips it. Loop completion preserves the
existing UpdateEmpty and exact abrupt/provenance behavior and session budgets.

The candidate passes Node/native semantic controls and all 190 budget prefixes,
with 3,804 static statements and zero dynamic coverage in its new driver.
It awaits actual and independent second review. See
[H3 evidence](validation/ts-034h3/README.md).
Lexical loop headers, for-in/of, prefix increment, decrement, BigInt and public
Script admission remain outside this implementation. All 60 corpus variants
remain blocked; this does not claim unchanged harness execution.

## Bounded non-strict internal Scripts (TS-034H4 candidate)

The internal `prepareBoundedScript` entry derives strictness from source and
inherited function directives. The existing strict entry and legacy defaults
remain unchanged. Sloppy guest calls bind `this` in the defining Realm, with
fresh primitive boxes and a distinct body lexical environment above the
parameter/var activation. Hoisted functions capture that body environment;
only completed FDI publishes it to execution.

References capture the executing code's mode. Failed ordinary writes and
deletes use that mode without suppressing accessor/coercion throws. Unresolved
sloppy writes target the current code Realm's global object without resolving
again after RHS effects. Restricted function descriptors and capability guards
remain shared with the strict path.

The candidate is internal only. Duplicate formals, arguments/eval/with,
Annex B, construction, genuine errors and public harness admission remain
excluded. Existing tests and historical evidence are unchanged. See
[H4 evidence](validation/ts-034h4/README.md) for validation and review status.

H4 candidate validation passes212 exact records per host,53 static-only and
separate zero-dynamic gates (new driver4,076 statements),both runtime inputs and
190 prefixes,all H1/H2/H3/E4 and17 inherited replay groups. The independently
approved private reference wrapper preserves the original shared Reference
shape;one inner reference retains its key cache. Actual and independent second
acceptance are still pending.

## TS-034H5 — ordinary base Script construction and instanceof

The internal Script evaluator now supports the bounded `new` grammar for
ordinary base Script functions and `instanceof` with canonical @@hasInstance
hook dispatch plus ordinary prototype-chain fallback. Constructibility is a
separate branded slot. Calls and construction share activation/body evaluation;
prototype access/allocation retain caller provenance, fallback uses the callee
Realm, and object return values replace the fresh receiver. Strict/sloppy
constructor receivers, abrupt/source identity, one-use builtin permits and
resource cleanup are preserved.

Script Function.prototype receives a Realm-owned, nonconstructible
`[Symbol.hasInstance]` method at the shared canonical symbol key. No Symbol
global/factory is installed. Legacy/public execution admission remains unchanged;
classes, derived/new.target, bound constructors, Reflect/Proxy, genuine Error
objects and Number construction remain outside this slice.

Candidate validation passes212 exact records per host,54 static-only/separate
zero-dynamic gates (H5driver4274),172 fresh/seven-seeded prefixes and both runtime
inputs,H1–H4/E4/all17 inherited groups,both Node boundaries,typecheck,runner20,
probes10,host73,observations22. Three exact old-test migrations were independently
approved;3606 protected files and60 blocked variants are preserved.
See [H5 evidence](validation/ts-034h5/README.md). Implementation awaits actual and
independent second acceptance; this is not publication or a conformance claim.

## Internal Error allocation kernel (TS-034H6-A candidate)

Script Realms now own five unexposed ordinary Error family prototypes and a
trusted noncalling, zero-tick factory returning a fresh GuestError with private
ErrorData and an own message descriptor. The brand survives guest prototype
relinking; Object.prototype.toString uses Error before the existing toStringTag
lookup, while ordinary prototype borrowers remain Object. Legacy factory misuse
is a host rejection. No public Error names/constructors, Error toString algorithm,
semantic failure migration, construction dispatch or conversion API changes.

Candidate evidence passes A01-A09 for both runtime inputs on both hosts,
212 unchanged records per host,55 static-only/separate zero-dynamic gates
(kernel3728), H1-H5/E4/all17 inherited replays/both Node boundaries/slots,
typecheck/runner20/probes10/host73/observations22. All138 old test files and
60 blocked variants remain unchanged; zero old-test migrations. See
[H6-A evidence](validation/ts-034h6-a/README.md). Awaiting actual and independent
second acceptance; no public admission or successor work.

## Genuine Script errors and guarded builtin construction (TS-034H6-B candidate)

All fifty language-error producers now return fresh Realm-local GuestError objects
in the private Script profile, retaining the original diagnostic/source/origin.
Legacy, synthetic, resource and unsupported failures retain their exact behavior.
Nine conversion/extraction helpers and global binding creation require explicit
Realm forwarding. The existing H6-A prototypes gain five intrinsic constructors,
public call/new, ordered message/cause handling and generic Error.toString.

Builtin construction uses a separate guarded callback and tagged one-use permit
with captured callee and exact context/Realm/invoke/args/location identity.
OperationContext and ordinary Script construction/call semantics are preserved.
Private intrinsic references are populated before mutable globals are published.

The candidate has 212 exact guest records per lane and56 static-only/separate
zero-dynamic gates (B driver4320). E01–E36/G01–G10 execute on Node/native for both
runtime inputs, with504 fresh/seven-seeded prefixes and2,528 callback-abrupt
prefix controls per input/lane. The94 approved replacements across22old tests
match their complete reviewed proposals. All60 corpus variants remain blocked.
G06/G07 do not independently prove args/location field sensitivity; mandatory
source comparisons and actual/second review supplement reachable controls.

See [H6-B evidence](validation/ts-034h6-b/README.md). This is a review candidate,
not public admission. C formatting globals, String/Object/Symbol/JSON/map surface,
observer/CLI changes and successor work remain outside this slice.

## Bounded Script map default selection (TS-034H6-M candidate)

The internal object-only map helper now reads canonical Symbol.species for an
object-valued array constructor in Script operations. Missing/undefined or null
species selects a fresh array in the running Realm. Invalid selected values
produce a genuine language TypeError; valid custom constructors remain explicitly
unsupported without invocation. Ordinary inputs skip selection. Legacy behavior,
length/callback order, saved-length/live-element iteration and authority are
unchanged. The symbol is internal and is not installed on guest objects.

Candidate validation passes 212 exact records per host and 57 static-only builds
with separate zero-dynamic coverage (new driver 4504 statements), both runtime
inputs, all frozen traces and resource prefixes, amended parsed getters, nested
maps, separate-session reentry/restoration and reuse, exact abrupt propagation,
CP bootstrap replay, H1–H6-B/E4/all17 inherited replays/both Node boundaries/slots,
typecheck/runner20/probes10/host73/observations22. One exact approved historical
test replacement is verified; all60 corpus variants remain blocked.

No intrinsic Array constructor exists, so the foreign intrinsic exception has
no representable positive fixture. Public map, custom species construction,
Array constructor, C globals, grammar, observer and admission remain outside
this change. See [H6-M evidence](validation/ts-034h6-m/README.md). Actual and
independent second review remain required; no publication is implied.

## Bounded String/Object formatting globals (TS-034H6-C candidate)

Script Realms now install String and Object after the Error globals. String call
has the primitive-Symbol descriptive exception; construction converts first,
then resolves its prototype and charges one tick before creating a genuine box.
Symbol wrappers and hooks returning Symbol still throw a genuine TypeError.
Object call/new preserve exact object identity without effects; nullish inputs
allocate once and other primitives box once in the defining Realm. Legacy
bootstrap and existing methods, guarded dispatch and context APIs are unchanged.

The exact accepted CP2 migration changes three historical test files through
seven replacements, preserving genuine absent-constructor and undefined-shadow
map controls. Frozen literal schedules, F01-F12, both runtime inputs/hosts,
UTF-16/descriptors, actual Object-link species controls, resource/abrupt order,
finally restoration and BOTH original-session reuse are covered by the new
harness-formatting driver. See [H6-C evidence](validation/ts-034h6-c/README.md)
for validation records and the immutable-prototype observation limit.

No static methods, Symbol factory, JSON, public map, Array constructor, grammar,
observer, compiler/pin or admission expansion. All 60 variants remain blocked.
Actual and independent second review are required; no publication is implied.

H6-C candidate validation passes 212 exact records per host and 58 static-only/
separatezero-dynamic gates (C 4181), all inherited checks, runner20/probes10/
host73/observations22. See the candidate completion record; independent actual
and second review remain pending.

### TS-034H7 unchanged bundle validation candidate

The dedicated internal harness-bundle driver reads the original pinned assert.js
and sta.js as separate ordered Script units. H7 adds validation only. Candidate
controls cover B01-B16, both notSameValue neighbors, actual constructor/message
identities, source occurrence provenance, isolated preflight/reload, fault
priority and shared budgets. See `validation/ts-034h7/README.md` for the exact
validation status and limitations; this candidate still requires independent review.

The whole original source parses, including dormant helpers. Runtime capability
is limited to the named controls: compareArray/compareArray.format, Array global
and map/join formatting, JSON, BigInt, Symbol factory/methods, async/$DONE and
unknown includes/helpers remain unsupported or unvalidated. Existing internal
map evidence does not certify harness compareArray. No arbitrary helper is
assumed supported because its source parses. All 60 corpus variants remain
blocked; no public admission, observation transport, CLI or profile change.

### Script v2 synthetic codecs (TS-035A candidate)

Parallel v2 data types and ASCII encoder, closed child/full-envelope decoders,
binding/source/Realm/prefix validation and synthetic classification checks are
implemented separately from v1. The approved variant amendment binds raw versus
non-raw preflight rules into the request hash. Serializer controls use two
runtime-read inputs with literal expected bytes on Node and native; evidence
and validation status are in `validation/ts-035a/README.md`.

This is synthetic transport validation only. No guest throw inspection,
production Script observation driver, launcher, registry, ledger admission,
rule certification or CLI activation is added. All 60 corpus variants remain
blocked. Actual and second independent review are required before acceptance.

### Observed Script throw inspection (TS-035B corrected candidate)

The new fixed observed entry performs actual constructor/name Gets inside the
existing Script session, retaining original/secondary completions and actual
callable Realm references. The ordinary entry does not inspect properties.
The reviewed synthetic-source amendment anchors post-evaluation Gets to the
original record/unit/location while preserving the active execution Realm.
Actual Script getters, including setup and same-entry-record code, retain their
own source. Original/secondary identities, monotonic budgets and all-exit
cleanup pass both hosts with two inputs and fresh/seven-seeded controls.
This is a tested candidate awaiting actual/second acceptance. No adapter,
registry, driver, admission or codec changes are included. All 60 variants remain
blocked. See `validation/ts-035b/README.md` for the preserved checkpoint and exact
new-versus-reused validation evidence.

### Parallel Script observation transport (TS-035C candidate)

The separate Script observation entry prepares and evaluates ordered source
occurrences in a private Script Realm/session, retaining actual record and Realm
identity in v2 projection. The parent verifies pinned original bytes and metadata,
applies the exact strict test prefix, binds all seven limits and transformed
sources, and owns immutable single-use plans, archives, deadline/output facts,
and recursive source/build/adapter digests. Existing v1 observation and CLI stay
on their original entry points.

Non-raw observation requires a fresh complete H7 preflight: B01–B16, both
notSameValue controls and a runtime-read numeric control. Each has its own
process/Realm/session; original assert.js/sta.js and repeated includes remain
separate unchanged units. Positive and deliberate negative outcomes, exact
messages and actual constructor identities must verify before a preflight ID
exists. Reload uses a fresh process/session and rechecks bound bytes. Parse-only
constrains the test; harness execution and its secondary resource/unsupported
inspection remain observable under the coordinator-approved two-predicate codec
amendment. Resource/unsupported outcomes bypass control expectations.

Fixed host controls cover constructor outcomes, original/secondary sources
including another registered Realm, guarded loop entry, transport priorities,
cancellation and drift. Their setup accepts no callback, context, AST or Realm
registry authority from callers. S01 captures actual numeric guest arguments in
host-owned evidence; normal wire results carry no guest value. This work does
not add conformance admission, new rule certification, capability registries,
ledger entries, language semantics or a public CLI mode. All 60 corpus variants
remain blocked. See `validation/ts-035c/README.md` for candidate validation and
retained failures; actual and second independent review are still required.

## TS-035D1: non-emitting strict block-function audit (candidate)

`auditBoundedScriptBlockFunctions(source)` shares the bounded whole-source
parser and collector, requires complete EOF, and returns detached, sorted
function/function duplicate sites only for strict ordinary blocks. Every catch
restriction and non-target conflict vetoes eligibility, including later scopes
and mixed conflicts in a candidate's own scope. Ordinary plan first failures and
retained node associations remain unchanged. No preparation, observation,
syntax-error emission or admission consumes this evidence. Parameters and switch
duplicates remain unsupported; D2's return-fallback design remains unresolved.
See `validation/ts-035d1/README.md` for frozen both-host controls and validation.

## TS-035D2: preparation-only strict block rule (candidate)

Fresh bounded preparation now certifies `duplicate-block-lexical-function` only
when the shared parser reaches exact source EOF and the same collector clears
D1's global veto. It selects the earliest second binding in a strict ordinary
block. Public planners, the detached D1 audit and strict-only preparation retain
their prior outputs. Observation projects this rejection before its unchanged
legacy return fallback; return certification remains parse-only/test only.
The v2 serializer and both independent decoders recognize exactly the return
and block codes. No corpus admission, parameter rule or grammar expansion is
included. The earlier D1 note about unresolved D2 dispatch is superseded by the
accepted dispatch design. See `validation/ts-035d2/README.md` for fresh validation,
retained failures and the pending independent review boundary.

TS-035D2 review correction: the coordinator approved one exact historical codec
source-closure test migration, retaining both behavioral tests and the whole-file
assertion while admitting only D2's reviewed rule literals. The other 814 old
files remain byte-identical; historical D2-P proposals and verifier are unchanged.
Final implementation acceptance remains subject to independent review.

## TS-035D3 non-emitting strict parameter audit

`auditBoundedScriptStrictParameters(source)` parses the complete bounded Script
before returning detached duplicate-formal evidence. Only this private audit
purpose continues past a duplicate simple formal; existing parse, planning,
preparation and D1/D2 behavior remains unchanged. Own and inherited strictness
come from the existing collector. D1 scope/conflict vetoes, block-function pairs,
and any sloppy duplicate anywhere block the audit. Eligible pairs retain the
first occurrence, complete function bounds and UTF-16 source locations.

This API does not produce an executable plan or a syntax-error rejection and has
no preparation or observation consumer. Parameter execution, emission, expanded
grammar, corpus admission and D4 remain outside this task. Candidate validation
and the independent-review boundary are recorded in `validation/ts-035d3/README.md`.

D3 candidate validation: 77 frozen rows in both hosts, 30 literal pairs, all
49 blocked diagnostics, unchanged six ordinary outputs and retained-node
associations. Both guest suites retain 212 cases; 66 native gates have actual
static-only build evidence and zero-dynamic coverage (one separate retained
linker retry), with the new driver at 960/960. All 31 required regression stages
and preservation checks pass. Actual and independent second acceptance remain
pending; this adds no execution or emission authority.
## TS-035D4 strict parameter rejection

Bounded preparation now certifies strict duplicate simple formals after a fresh,
full-source, null-node continuation, entered only for the original duplicate-formal
failure. Global grammar/scope/conflict vetoes and any sloppy duplicate preserve
that original rejection. Combined strict block/parameter candidates select the
least second.start, then first.start, with block winning a tie. The continuation
returns rejection or null and cannot produce an executable plan. Successful
retained nodes, ordinary planners, D1, standalone D3 and legacy return behavior
are preserved. C and both independent v2 decoders admit the parameter code;
the existing serializer emits it unchanged.

Candidate evidence in `validation/ts-035d4/` records fresh 212/212 guest results
on both hosts, all 66 old plus one new static-only gates with separate zero-dynamic
coverage (new driver 4425/4425), 772 source runs across 193 frozen rows, 96 actual
wire rows, 29664 malformed/binding checks, 48 metadata runs and 384 prefix/Realm/
history controls. Four exact reviewed old-test migrations preserve the other
851 complete files. No grammar, parameter execution, registry, corpus admission,
CLI/profile/manifest, compiler/pin or C++ expansion. Actual and independent second
acceptance remain required; this entry does not mark the candidate accepted.

## TS-035D5 non-emitting numeric assignment audit

`auditBoundedScriptNumericAssignments(source)` uses the same bounded full-source
parser with a private, null-retention purpose. It recognizes only number-token
literal Expr identities (including grouping) and the six assignment operators,
preserves RHS-first diagnostics, and applies the existing collector's global
restrictions/conflicts before returning detached, sorted target/operator sites.
Block pairs, duplicate formals, return, unsupported targets, late grammar/resource
failures and scope conflicts veto certification. No continued AST is executable;
ordinary planning, D1-D4, preparation, legacy return behavior and emission remain
unchanged. This evidence API adds no supported execution grammar or wire code.
See [D5 evidence](validation/ts-035d5/README.md) for the frozen source matrix,
retention/identity controls and both-host validation. Awaiting independent review.

## TS-035D6 numeric assignment rejection dispatch

The bounded Script preparation path now retries the unchanged full-source D5
numeric assignment audit only after an original `parse.assignment-target`
unsupported rejection. Eligible numeric targets produce the closed
`assignment-target` syntax-error code and the frozen first-target diagnostic.
Every veto retains the original rejection and retained nodes. No AST or execution
support is added; D1–D5 audits, legacy return handling and mixed-rule vetoes remain.
Both v2 decoders accept the fourth closed rule. Serialization is unchanged.

The exact five production proposals and four old-test migrations are audited by
`docs/validation/ts-035d6-p/verify.mjs --applied`. Current D6 validation, the approved
nullable-history test correction, full both-host producer/serializer evidence and
preservation checks are recorded in `docs/validation/ts-035d6/`. The 69 static gates, 212 guest records per host and all 45 validation stages pass.
Acceptance is pending independent reviews; no corpus admission,
conformance launch, new grammar, evaluator behavior or C++ change is implied.

## TS-035D7 non-emitting lexical Statement audit

The source-only `auditBoundedScriptLexicalStatements` uses the same bounded parser
with an exclusive private continuation purpose and no retained executable nodes.
It recognizes a fully parsed single-name `let` only in if consequent, if alternate,
while body or classic-for body slots. Keyword evidence carries the actual token
span/location and parser-supplied context; returned candidates are sorted and
copied. One unchanged declaration collector vetoes scope restrictions, unrelated
conflicts and block-function pairs before evidence can escape. Containing-scope
conflicts are deliberately conservative for this invalid syntax.

Ordinary parsing, preparation, execution and rejection/codec dispatch do not use
this audit. Const, lexical loop heads, patterns, ASI and Annex B function branches
remain excluded. See [D7 validation](validation/ts-035d7/README.md) for complete
frozen literals, both-host runtime files, inherited identity and preservation checks.

## TS-035D8 lexical Statement dispatch

Bounded Script preparation now retries only an original declaration-in-Statement
rejection through the unchanged full D7 audit. An eligible audit projects the
first source-ordered `let` keyword to `lexical-declaration-statement`; every veto
returns the original rejection and keeps retained nodes. D1–D7, mixed-rule and
late-resource vetoes, Realm-profile priority and legacy return precedence remain.
The fifth closed rule is accepted by both v2 decoders; serialization is unchanged.

The five production files and six old-test migrations match the accepted D8-P
whole-file proposals. A coordinator-approved correction in the new D8 validator
changes only nine ready metadata expected unit IDs, with exact guards and
negative old-ID controls; the frozen original fixtures and failures are retained.
See [D8 evidence](validation/ts-035d8/README.md). This remains an implementation
candidate pending independent acceptance, with no grammar, execution or admission
expansion and all 60 corpus variants still blocked.
