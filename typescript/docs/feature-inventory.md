# Tested foundation profile

This inventory is a scope statement, not an ECMAScript conformance score.
Diagnostics reject unsupported syntax before executing any of the program.
Unsupported operand combinations fail at runtime; parsing an operator is not a
claim that all coercion cases are supported.

| Area | Supported | Explicit limits / deferred behavior |
|---|---|---|
| Lexing | ASCII identifiers including `$`/`_`; decimal integer/fraction literals starting with a digit; single/double quoted UTF-16 strings; space/tab; CR/LF/CRLF/U+2028/U+2029 line boundaries; line/block comments | No identifier escapes/Unicode identifiers, radix/exponent/separator numbers, leading-zero integers, templates or regex. String escapes only quote, backslash, n/r/t. Raw U+2028/U+2029 are preserved inside strings; raw CR/LF are rejected. |
| Literals/values | number, string, boolean, null; undefined/NaN/Infinity bindings; ordinary object/function identity | No bigint or symbol. NaN uses strict-equality semantics; console renders signed zero as `0`. |
| Expressions | parentheses; + - * / % and unary +/-, strict-delete, typeof, void; < <= > >=, == != === !==, !; short-circuit &&/\|\|; assignment; conditional `test ? consequent : alternate` | Numeric operators use number-hint ordinary conversion; addition converts both operands with default hint before string/numeric selection. Relational operators convert in source order with number hint, compare two strings by UTF-16 code units, otherwise compare numbers with all NaN comparisons false. Own/inherited valueOf/toString methods work on ordinary objects, arrays and functions; default ordinary objects convert through inherited Object valueOf/toString to [object Object] (numeric NaN). Boolean/String wrappers use their standard payload methods. Number wrappers return numeric payloads for default/number hints and inherited tag strings for string hints. Arrays convert through join; functions convert to exact retained source or the native form. Both operand evaluations precede coercion. === !==, truthiness and Number predicates never coerce. Conditional precedence, selected-arm evaluation and existing bounds remain unchanged. Abstract equality selectively converts at most one object with the default hint; nullish/object and object/object comparisons never coerce. No BigInt, comma, bitwise, update, compound assignment, nullish coalescing or optional chaining. |
| Statements | semicolon-terminated expressions and let; blocks, if/else, while, function declarations, return, throw, unlabelled break/continue, empty statement | Semicolons required; no ASI, var/const, for/do, switch, try/catch/finally or labels. Declarations as if/while bodies require braces. Return/throw expressions cannot start on a later line. |
| Scope | Block lexical bindings, TDZ, mutable captured bindings, function hoisting in their declaration list, recursion, shadowing in nested blocks | One let binding per declaration. Duplicate names/parameters rejected, including function declarations sharing a parameter name. Global builtin names cannot be redeclared. Separate Script global environments and Annex B deferred. |
| Functions | Declarations and anonymous expressions, simple parameters, left-to-right argument effects, missing args undefined/excess args evaluated, return/fallthrough, own properties | No named function expressions, arrows, rest/default/destructuring parameters, constructors, classes, argument objects, generators/async. Strict-call profile regardless of directives; detached and top-level this are undefined. |
| Objects | Colon-valued literal entries with word/string keys; dot and computed key get/write; aliases; ordinary methods as function-valued properties; missing properties undefined | Ordinary inherited data properties supported when seeded by the host; production objects inherit their Realm Object root. No accessors, method shorthand, numeric/computed literal keys, spread or enumeration APIs. Guest delete uses unconditional strict-delete: identifier operands are parse errors and nonconfigurable properties throw. Literal __proto__ rejected. Symbol keys retain identity; other primitive keys convert to strings. Object keys use the symbol protocol then string-hint ordinary conversion; default objects key as [object Object]. Primitive property reads/writes reject; delete alone boxes primitives before deferred key conversion. |
| Bootstrap | Per-realm console object and console.log; undefined/NaN/Infinity bindings; partial Number namespace below | No other standard constructors or globals, eval, Function, filesystem or process in guest code. Console rendering is a host diagnostic convention, not guest ToString. |
| Data descriptors (TS-004A) | Internal data/generic descriptor validation with explicit absence/defaulting, SameValue, atomic rejection, non-configurable/non-writable invariants, and preventExtensions. Existing writable own properties remain writable on non-extensible objects; new assignment fails. | Host APIs only; no guest Object/Reflect builtins, accessors or proxies. Internal key listing/deletion are described in TS-004C below. Internal false and strict assignment TypeError are distinct. |
| Prototypes (TS-004B) | Internal get/set with explicit receiver and normal/throw results; iterative inherited data lookup, receiver-own writes, cycle and extensibility checks; strict assignment rejection. Compiled host tests seed guest realms and exercise inherited method this. | TS-016A adds per-Realm Object/Function/Array roots, with an immutable null-root Object prototype. No guest prototype mutation/reflection APIs or accessors. Literal __proto__ still rejected. |
| Number (TS-003) | Per-realm, mutable global binding to a non-callable namespace. Constants NaN, POSITIVE_INFINITY, NEGATIVE_INFINITY, MAX_VALUE, MIN_VALUE, EPSILON, MAX_SAFE_INTEGER, MIN_SAFE_INTEGER have non-writable/non-enumerable/non-configurable own properties. isNaN/isFinite never coerce, ignore receivers and excess argument values, and have writable/non-enumerable/configurable namespace properties. Each predicate has its correct name and length 1, both non-writable/non-enumerable/configurable. | Intentionally partial intermediate namespace, not complete Number support. No Number conversion/call/constructor, guest prototype exposure, formatting, integer predicates, parsing methods or guest reflection APIs. Extra argument expressions still evaluate normally. Builtin metadata is centralized in Realm registration; guest function own name/arity inference remains deferred. |
| Own keys/deletion (TS-004C) | Internal configurable-own deletion, normal false on nonconfigurable rejection, detached lists of all own string keys including nonenumerable keys; canonical array indices first numerically, other strings by creation order. Overwrite preserves position; delete/reinsert renews it. | Key listing remains host-only; TS-025A adds guest strict-delete over current string/symbol keys and Array/String dispatch. No Object/Reflect APIs or generic exotics. Ordinary key listing cannot throw; arrays reuse these operations. |
| Errors | Parse locations, runtime locations, thrown guest values, ReferenceError/TypeError/RangeError diagnostics | Engine errors are string values plus diagnostic records, not Error instances. No guest catch syntax or stack traces. Across-run redeclaration fails at runtime before new declarations are installed. |
| Primitive conversion (TS-005N) | Internal ToNumber/ToUint32 for existing primitive Value kinds, exact numeric-string scanning and tested binary64 backend, signed-zero preservation/normalization. | Host driver API only; no operator/builtin integration. Objects explicitly throw unsupported-conversion runtime TypeError without guest calls. No symbols/BigInts or ToPrimitive. |
| Definition dispatch (TS-005D) | Required-location normal/throw definition API; receiver overrides propagate exact guest throws, strict assignment preserves RHS and translates false, bootstrap rejects false/throw as host faults. | Internal prerequisite only; no arrays, generic exotics, guest reflection or conversion integration. |
| Array storage (TS-005A) | Host-created GuestArray with real own length, canonical index growth, holes, sparse descending truncation, partial failure restoration/delayed freezing, double number-hint length conversion (TS-015B), ordinary prototype reads and receiver-aware assignment. Seeded guest assignments preserve original RHS and report runtime errors at the assignment. | Array literals are supported by TS-006 below; no Array constructor, standard conversion overrides, species, accessors or generic exotics. Ordinary symbol properties are supported. Explicit conversion hooks are supported for length. Default Realm objects convert twice then fail with RangeError invalid array length; null-root missing hooks and explicit both-object hooks still throw TypeError. Low-level host construction defaults to null; production arrays inherit the Realm array root. |
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
still reject every object. TS-018B installs Object.valueOf and TS-019C installs Object.toString; Number wrappers use TS-021A numeric valueOf but retain inherited string-hint tags; TS-020 adds Boolean/String payload methods. Symbols are covered by TS-019A/B/C; accessors and proxies remain deferred. Keys and
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
reject objects and primitive member access remains unsupported. No constructors,
globals, backlinks, Number/Array/Function overrides or other String methods.
[M1-M8 evidence and migrations](validation/ts-020/README.md).

### Number valueOf (TS-021A)

Fresh per-Realm valueOf extracts number primitives or genuine GuestNumber slots,
including root +0 and foreign/relinked boxes, preserving -0 and NaN. Its body
has no property reads, coercion or ticks. Default/number conversion uses actual
lookup (two ticks, one call); string hints and computed keys still use inherited
Object.toString and [object Number] (three ticks, one call). Deletion exposes
Object.valueOf and fresh fallback lookup. Direct converters still reject boxes.
The existing Number namespace remains noncallable; no constructors or implicit
boxing are added. Number.toString and radix formatting remain blocked by the
accepted TS-021P semantic evidence. [N matrices and validation](validation/ts-021a/README.md).

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
Member operands still use the existing object-only read path and key conversion;
strict-delete's explicit boxing exception is unchanged. No BigInt or HTMLDDA
support is implied. See [contract](typeof-void.md) and
[implementation evidence](validation/ts-026a/README.md).
