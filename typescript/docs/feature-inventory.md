# Tested foundation profile

This inventory is a scope statement, not an ECMAScript conformance score.
Diagnostics reject unsupported syntax before executing any of the program.
Unsupported operand combinations fail at runtime; parsing an operator is not a
claim that all coercion cases are supported.

| Area | Supported | Explicit limits / deferred behavior |
|---|---|---|
| Lexing | ASCII identifiers including `$`/`_`; decimal integer/fraction literals starting with a digit; single/double quoted UTF-16 strings; space/tab; CR/LF/CRLF/U+2028/U+2029 line boundaries; line/block comments | No identifier escapes/Unicode identifiers, radix/exponent/separator numbers, leading-zero integers, templates or regex. String escapes only quote, backslash, n/r/t. Raw U+2028/U+2029 are preserved inside strings; raw CR/LF are rejected. |
| Literals/values | number, string, boolean, null; undefined/NaN/Infinity bindings; ordinary object/function identity | No bigint or symbol. NaN uses strict-equality semantics; console renders signed zero as `0`. |
| Expressions | parentheses, numeric + - * / %, numeric < <= > >=, === !==, ! and numeric unary +/-; short-circuit &&/\|\|; assignment; conditional `test ? consequent : alternate` | Conditionals bind below logical OR and above assignment, associate right, allow assignment in both arms, and evaluate only the selected arm after the test. Test/selected-arm abrupt completions propagate; results are values, not references. Existing parser/evaluator bounds apply. String + string concatenates. Other arithmetic/coercion and string relational operations rejected. No loose equality, comma, bitwise, update, compound assignment, nullish coalescing or optional chaining. |
| Statements | semicolon-terminated expressions and let; blocks, if/else, while, function declarations, return, throw, unlabelled break/continue, empty statement | Semicolons required; no ASI, var/const, for/do, switch, try/catch/finally or labels. Declarations as if/while bodies require braces. Return/throw expressions cannot start on a later line. |
| Scope | Block lexical bindings, TDZ, mutable captured bindings, function hoisting in their declaration list, recursion, shadowing in nested blocks | One let binding per declaration. Duplicate names/parameters rejected, including function declarations sharing a parameter name. Global builtin names cannot be redeclared. Separate Script global environments and Annex B deferred. |
| Functions | Declarations and anonymous expressions, simple parameters, left-to-right argument effects, missing args undefined/excess args evaluated, return/fallthrough, own properties | No named function expressions, arrows, rest/default/destructuring parameters, constructors, classes, argument objects, generators/async. Strict-call profile regardless of directives; detached and top-level this are undefined. |
| Objects | Colon-valued literal entries with word/string keys; dot and computed primitive-key get/write; aliases; ordinary methods as function-valued properties; missing properties undefined | Ordinary inherited data properties supported when seeded by the host; initial prototypes remain null. No accessors, method shorthand, numeric/computed literal keys, spread, guest deletion syntax or enumeration APIs. Literal __proto__ rejected. Primitive keys convert to strings; object keys and primitive property bases reject. |
| Bootstrap | Per-realm console object and console.log; undefined/NaN/Infinity bindings; partial Number namespace below | No other standard constructors or globals, eval, Function, filesystem or process in guest code. Console rendering is a host diagnostic convention, not guest ToString. |
| Data descriptors (TS-004A) | Internal data/generic descriptor validation with explicit absence/defaulting, SameValue, atomic rejection, non-configurable/non-writable invariants, and preventExtensions. Existing writable own properties remain writable on non-extensible objects; new assignment fails. | Host APIs only; no guest Object/Reflect builtins, accessors or proxies. Internal key listing/deletion are described in TS-004C below. Internal false and strict assignment TypeError are distinct. |
| Prototypes (TS-004B) | Internal get/set with explicit receiver and normal/throw results; iterative inherited data lookup, receiver-own writes, cycle and extensibility checks; strict assignment rejection. Compiled host tests seed guest realms and exercise inherited method this. | No automatic intrinsic hierarchy, guest prototype mutation/reflection APIs, accessors or exotics. Literal __proto__ still rejected. |
| Number (TS-003) | Per-realm, mutable global binding to a non-callable namespace. Constants NaN, POSITIVE_INFINITY, NEGATIVE_INFINITY, MAX_VALUE, MIN_VALUE, EPSILON, MAX_SAFE_INTEGER, MIN_SAFE_INTEGER have non-writable/non-enumerable/non-configurable own properties. isNaN/isFinite never coerce, ignore receivers and excess argument values, and have writable/non-enumerable/configurable namespace properties. Each predicate has its correct name and length 1, both non-writable/non-enumerable/configurable. | Intentionally partial intermediate namespace, not complete Number support. No Number conversion/call/constructor, wrappers, prototype, formatting, integer predicates, parsing methods or guest reflection APIs. Extra argument expressions still evaluate normally. Metadata is local to these predicates; general Function support remains deferred. |
| Own keys/deletion (TS-004C) | Internal configurable-own deletion, normal false on nonconfigurable rejection, detached lists of all own string keys including nonenumerable keys; canonical array indices first numerically, other strings by creation order. Overwrite preserves position; delete/reinsert renews it. | Host APIs only; no guest delete syntax, Object/Reflect APIs, symbols or generic exotics. Ordinary key listing cannot throw; arrays reuse these operations. |
| Errors | Parse locations, runtime locations, thrown guest values, ReferenceError/TypeError/RangeError diagnostics | Engine errors are string values plus diagnostic records, not Error instances. No guest catch syntax or stack traces. Across-run redeclaration fails at runtime before new declarations are installed. |
| Primitive conversion (TS-005N) | Internal ToNumber/ToUint32 for existing primitive Value kinds, exact numeric-string scanning and tested binary64 backend, signed-zero preservation/normalization. | Host driver API only; no operator/builtin integration. Objects explicitly throw unsupported-conversion runtime TypeError without guest calls. No symbols/BigInts or ToPrimitive. |
| Definition dispatch (TS-005D) | Required-location normal/throw definition API; receiver overrides propagate exact guest throws, strict assignment preserves RHS and translates false, bootstrap rejects false/throw as host faults. | Internal prerequisite only; no arrays, generic exotics, guest reflection or conversion integration. |
| Array storage (TS-005A) | Host-created GuestArray with real own length, canonical index growth, holes, sparse descending truncation, partial failure restoration/delayed freezing, primitive length conversion, ordinary prototype reads and receiver-aware assignment. Seeded guest assignments preserve original RHS and report runtime errors at the assignment. | Array literals are supported by TS-006 below; no Array constructor/intrinsics, methods, species, symbols, accessors or generic exotics. Object length conversion explicitly throws unsupported TypeError. Initial prototype is null. |
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
completion-aware Get path and clamp at 2^53-1. Object-to-primitive conversion
still explicitly throws unsupported TypeError. No guest APIs, boxing, map,
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
null; no Array global, methods, spread, destructuring or comma operator. Computed
numeric keys convert to strings (`a[0]` and `a['0']` alias). Parser/source limits apply.
The readable `test/fixtures/array-literals.js` also serves as a CLI example.
