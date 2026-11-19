# Function string conversion and source retention: TS-023P

2026-11-02. Design for independent review, not implemented support. Assignment
base `c21ea28`, dispatch `fec364f`, branch `codex/primitive-computed-keys`.
Runtime baseline is accepted `3d8d37f`: coordinator independently reported
166/166 cases on each host and 24 static-only/separate coverage gates. Those
results do not validate this design's proposed Function support.

## Decision and scope

Implement exact source retention and Function.prototype.toString together in
one bounded implementation assignment. Every successfully parsed guest function
retains its original source for its lifetime. Never substitute a native marker
because preserving parsed source is inconvenient. Host-built AST functions with
no source are explicitly distinct. No host Function.toString, eval, Function
constructor, VM execution, AST printer, source regeneration or reparsing is part
of stringification.

Only existing named declarations and anonymous function expressions are covered.
No named expressions, arrows, methods, classes, generators, async, bind, apply,
constructors, accessors, new escapes, Unicode identifiers or ASI are introduced.
Public guest function name/length inference and construction remain deferred.
The callable Function root exists internally; no global Function is added.

## Normative and engine evidence

Fixed [ECMA-262 2025 §20.2.3.5](https://tc39.es/ecma262/2025/multipage/fundamental-objects.html#sec-function.prototype.tostring)
requires available source first, a NativeFunction representation for builtins
and other callables otherwise, and TypeError for other receivers. Builtin
InitialName constrains the native name spelling. [§20.2.5](https://tc39.es/ecma262/2025/multipage/fundamental-objects.html#sec-hosthassourcetextavailable)
requires stable availability per function; its default is true. Rift adopts
that default for every parsed function. See the evidence record for source
inspection and the distinction between the fixed edition and newer engines.

The [2025 function definitions](https://tc39.es/ecma262/2025/multipage/ecmascript-language-functions-and-classes.html#sec-function-definitions)
associate source with the function's syntactic production. Retain the keyword
through the closing brace; exclude surrounding parentheses, semicolons and
external trivia. Code-unit preservation is Rift's concrete representation of
the spec's source-to-string result, including raw surrogate units.

Pinned engine262 `d553e7b52501fbc47eae981c8d0fa7a5c26d0171`
[FunctionPrototype.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/FunctionPrototype.mts)
separates SourceText, InitialName and callable fallback. Adopt that separation,
not its generators or wider object model. V8 release `13.0.245`
[SharedFunctionInfo::GetSourceCodeHarmony](https://github.com/v8/v8/blob/13.0.245/src/objects/shared-function-info.cc)
slices script source using function-token and end positions; adopt shared source
plus ranges, not wrapped-source reconstruction. Its
[JSFunction::ToString](https://github.com/v8/v8/blob/13.0.245/src/objects/js-function.cc)
uses internal name metadata for native output; its
[FunctionPrototypeToString](https://github.com/v8/v8/blob/13.0.245/src/builtins/builtins-function.cc)
accepts callable receivers beyond ordinary functions. No upstream code copied.

## Actual paths and frozen interfaces

Paths are relative to . `src/lexer.ts` indexes host strings in UTF-16,
discards comments, and decodes string token text. Locations count CRLF as one
line. Token text cannot reconstruct source. `src/parser.ts` currently receives
only tokens, and `list(true, ...)` consumes the closing brace. `src/syntax.ts`
contains both function AST variants (there is no ast.ts). `Evaluator.block`
allocates hoisted declarations; `evaluate` allocates expressions; both go through
`closure` and `Realm.createGuestFunction`. Callable records already retain their
defining Realm. `Evaluator.call` switches to that Realm and restores it in finally.

Freeze these additions (all existing fields remain):

```ts
// syntax.ts; internal immutable data, never guest properties
export type SourceText = { readonly text: string };
export type FunctionSource = {
    readonly source: SourceText;
    readonly start: number;
    readonly end: number;
};
// Both Expr/Stmt kind:"function" variants:
// readonly source: FunctionSource | null

// lexer.ts Token adds readonly start:number and readonly end:number.
// Parser constructor(tokens: Token[], source: SourceText)
// functionTail(loc: Location, start: number):
//   { params: string[]; body: Stmt[]; source: FunctionSource }

// runtime.ts Callable guest variant adds:
// readonly source: FunctionSource | null
// Callable builtin variant adds:
// readonly initialName: string | null

// evaluator.ts
// closure(params: string[], body: Stmt[], environment: Environment,
//         source: FunctionSource | null): Value
// realm.ts
// createGuestFunction(params: string[], body: Stmt[], environment: Environment,
//                     source: FunctionSource | null): GuestObject
// createBuiltin/registerBuiltin signatures stay unchanged.
// strings.ts
// stringSlice(value: GuestString, start: number, end: number): GuestString
```

No optional/default source argument: every caller makes availability explicit.
`null` means a trusted host-created AST with no source, never a parser fallback.
No separate availability hook or mutable flag is needed. The parser constructs
one SourceText per parse invocation and passes the same record to every nested
function range. ParseResult stays `{body,error}`; reachability from the AST is
sufficient. Different parse invocations use different records even for identical
input strings. No current-source global, Realm cache, file reopening or source ID
lookup is allowed. Strings and metadata are immutable by internal convention and
readonly typing; trusted host mutation/casts are outside the guest contract.

For every token, snapshot `start=i` before consuming its first unit and `end=i`
immediately afterward. String tokens include quotes and original escapes in
their range, independently of decoded `text`. EOF has `start=end=source.length`
on successful lexing. Trivia has no tokens but remains in SourceText. Existing
Location and diagnostic behavior stays unchanged; offsets are zero-based,
half-open, finite integral code-unit indices, not byte or line/column positions.

Declaration parsing captures the function keyword token before consuming it;
expression parsing uses `t.start`. After successful `list(true, params)`,
`tokens[index-1]` is the matching closing brace: use its `end`. Do not use the
next token's start, which includes trailing trivia. Only construct an executable
range when no parse error exists. Failed parse results remain non-executable;
placeholder ranges in abandoned ASTs must never reach evaluation. Successful
ranges satisfy `0 <= start < end <= source.text.length`, start at `function`,
and end immediately after the matching `}`. `functionTail` returns the range to
both AST sites; both allocation paths pass it unchanged to the callable.

Nested functions share SourceText but have their own ranges. Repeated closure
allocations from one node share that node's range; distinct function objects and
environments remain distinct. Retaining just an inner function keeps its source
record alive after parser, outer closure and input variable are gone. Retaining
an outer body also retains source for inner functions allocated on later calls.
Later parses cannot overwrite old metadata. Reading source never executes body.

Shared text plus ranges makes token boundaries auditable and avoids copying
overlapping nested bodies on parsing or every closure allocation. A copied slice
per AST node is simpler at lookup and may release unrelated script text, but
duplicates nested source and still may retain a backing string in either host.
Choose shared text plus ranges; slice at stringification via stringSlice (plain
host slice behind the guest-string boundary). No memoized result is needed.
The current 100000-unit parse limit bounds each source and each source result,
not total retained scripts or cumulative output. Host GC owns lifetime; no new
allocation guarantee, cache eviction, native-memory benchmark or per-unit ticks.

## Native metadata and method behavior

`createBuiltin(name,length,invoke)` stores `initialName:name` at allocation,
independently of mutable descriptors. Function root gets `initialName:""`.
Raw trusted builtin Callable literals must explicitly supply `initialName:null`
(unnamed host callable) or a valid original name. Do not infer this field later
from `.name`, `.length`, prototypes, callback host names or properties.

Native spelling is exactly `function NAME() { [native code] }`; NAME empty or
null produces `function () { [native code] }`. A source-less guest callable uses
that same unnamed form. Formal parameters are always empty, regardless of length.
Validate names at trusted creation: accept empty, ASCII IdentifierName
`[A-Za-z_$][A-Za-z0-9_$]*` (keywords allowed as PropertyName), and the specific
computed name `[Symbol.toPrimitive]` used by the existing Symbol intrinsic.
Reject other names with host Error `invalid builtin initial name`; do not escape,
quote, sanitize or silently discard them. Implement this small validation with
code-unit comparisons, not a new guest regexp feature. Future symbol/accessor,
numeric or arbitrary Unicode names require an explicit extension of this trusted
contract. `[Symbol.toPrimitive]` is valid computed PropertyName syntax here;
stringification neither resolves a Symbol binding nor executes the brackets.
There are no existing accessor names requiring `get`/`set` handling.

The implementation registers `toString` after `call` in registerFunction:
length 0, name `toString`, property writable/configurable true, enumerable false;
name/length descriptors retain the existing nonwritable/nonenumerable/configurable
rules. Root key order becomes `name,length,call,toString`. Method objects are fresh
per Realm with that Realm's functionPrototype and callable.realm. No constructor
or prototype property is added to either root or method.

Keep native spelling in a small `nativeFunctionString(initialName: string | null):
GuestString` helper in src/builtins/function.ts, exported for Realm creation-time
validation. It validates the bounded name grammar before concatenation;
createBuiltin calls it before constructing/exposing the object. The method also
uses it for raw trusted Callable records, so malformed raw metadata is a host
Error instead of invalid native output. No callback or guest property is read.
createGuestFunction validates non-null range integers/bounds at the trusted
factory boundary (host Error `invalid function source range` on failure). It does
not parse text to prove equivalence to host-supplied AST; that is a trusted caller
invariant. Source-less host ASTs must use null, not a fabricated range.

The builtin first checks receiver is object with non-null callable; otherwise
returns runtime TypeError `Function.prototype.toString receiver is not callable`
at the passed operation Location. Guest source returns the retained slice;
source-less guest/builtin returns the defined native form. No receiver Get,
ToObject, ToPrimitive, @@toStringTag, name coercion, argument conversion or receiver
invocation occurs. Extra arguments are ignored. Internal source/name corruption
is a host implementation fault, not a guest exception or native fallback.

Use the ordinary context.call boundary. The body charges zero ticks and makes
zero nested calls: source slicing is a bounded internal operation, like scalar
conversion. A direct context.call uses one call frame and zero steps even with
an exhausted step budget. Call-depth rejection precedes body receiver checking;
it remains RangeError `call depth limit exceeded` at the passed location.
Normal and abrupt exits restore active Realm and call count. Guest expression
evaluation still charges its existing AST ticks; do not confuse those with body
ticks. A borrowed Function.call adds a second simultaneous call frame.

## Consumers, mutation and Realm identity

An unmodified parsed function converts to source under all three hints:
default/number first call inherited Object.valueOf (returns receiver), then
Function.toString; string calls Function.toString first. Existing symbol protocol
lookup remains first. Direct default/number ToPrimitive costs 3 steps, string
costs 2; each builtin has zero body ticks. They use at most one extra simultaneous
call frame because candidate calls are sequential. An unchanged explicit
Object.toString still classifies callable objects as Function and charges its
tag lookup tick. A custom @@toStringTag affects that explicit method only.

Operators and keys need no semantic implementation change. `f+1` concatenates
source and `1`; `+f`, arithmetic and numeric comparisons still see NaN for the
ordinary function source. Two functions compare lexicographically under relational
operators after string conversion; identity equality remains identity. ToPropertyKey
uses exact source, preserving whitespace differences and collisions for identical
source from distinct closures. Array.join's element conversion now sees source.
Array length assignment still rejects function-derived NaN with its existing
RangeError. Primitive-only conversion helpers remain primitive-only and
numberToString keeps accepting only typed numeric payloads. Console display is
diagnostic `[function]`, not guest ToString, and stays unchanged.

These are runtime property reads: replacement/deletion of inherited or own
toString/valueOf and symbol hooks keeps ordinary conversion's existing behavior.
A valueOf call may replace the next toString before lookup. Replacing/deleting
Function.prototype.toString changes future ordinary lookup but a saved original
still reads immutable metadata. Deleting it exposes Object.toString and its tag
again; a noncallable own toString shadows inheritance and is skipped, with final
TypeError if valueOf also fails to produce a primitive. Relinking a function to
null changes ordinary lookup, not saved-method results or callable.realm.
Relinking a noncallable object to Function.prototype does not make it callable.

A saved method from A can stringify a function from B while invoked by an
evaluator in C. The call temporarily enters A, reads B's source, returns a
primitive string and restores C; it neither executes B nor reparents anything.
The same rules apply to foreign builtins, Function roots and relinked functions.
No guest object allocation is required by the method. Realm identity, source
identity and mutable prototype identity are separate concerns.

## Implementation boundary and acceptance

Propose one atomic follow-up, only after coordinator review: production edits to
src/{syntax,lexer,parser,runtime,evaluator,realm,strings}.ts and
src/builtins/function.ts; a dedicated test/function-string-conversion.ts and
test/fixtures/function-string-conversion.js; only the exact test migrations in
[the matrix](validation/ts-023p/matrix.md), runner/native-driver registration,
and current scope/interface/evidence/task documentation. Preserve existing
assertions and denominator; add expected-result coverage, not engine agreement.

Source retention and the method must land together so parsed functions never
temporarily advertise native output. Host literal migrations are mechanical but
part of the same commit. Do not stage a builtin-only implementation as completed
Function support. Compile/typecheck all callers after adding required metadata.
If static compilation fails, retain a minimal reduction before choosing a
localized workaround; static-only build and separately parsed coverage are both
required. No new compiler uncertainty justified a probe in this design task.

Acceptance requires all matrix rows in Node/native, the existing 166 cases and
24 gates preserved, added drivers gated, runner/probe suites, typecheck, exact
parse/runtime diagnostics, and separate failure/skip/timeout accounting. Boundary
negative controls must remain failures. No new syntax, runtime, test or manifest
change is made by TS-023P. Independent review must accept this design before any
implementation assignment; no successor is started here.

The new guest fixture must be read from disk at runtime in both host drivers,
following the existing fixture pattern. It exercises declarations, anonymous
expressions, nested/later closures, saved/overridden methods, addition and computed
keys with literal expected text. Raw lone-surrogate sources are constructed as
host strings in the driver, since UTF-8 fixture decoding cannot preserve isolated
surrogate code units. This split tests the actual runtime parse/allocation path
without claiming that invalid UTF-8 bytes are preserved by CLI decoding.
