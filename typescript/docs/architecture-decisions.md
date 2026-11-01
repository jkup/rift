# TS-001 architecture and extension boundaries

Decision date: 2026-11-01. This describes implemented interfaces, not a full engine
design to populate in advance. Source is original; no upstream code was copied.

## Execution path and modules

| Module | Interface and invariant |
|---|---|
| `src/lexer.ts` | `lex(source): LexResult` produces located tokens or a parse diagnostic; ASCII identifiers, bounded source, no host exception for malformed input. |
| `src/syntax.ts` | `Expr` and `Stmt` are recursive discriminated unions; every node carries a one-based `Location`. `Diagnostic` separates parse and runtime phases. |
| `src/parser.ts` | `parse(source): ParseResult` performs recursive-descent statements and precedence-climbing expressions, validates declaration duplicates and control-flow context. No guest execution during parsing. |
| `src/strings.ts` | `GuestString`, `stringLength`, `stringUnit`, `stringConcat`: host UTF-16 storage behind a replaceable API. No normalization or scalar-value reinterpretation. |
| `src/runtime.ts` | `Value`, `PropertyKey`, `DataDescriptor`, `GuestObject`, `Environment`, `Reference`, `Completion`, Get/PutValue, truthiness, strict equality and diagnostic display. |
| `src/evaluator.ts` | `Evaluator.block`, `statement`, `evaluate`, `reference`, `call`: explicit evaluation order and propagation of guest abrupt completions. A fresh evaluator owns each run's budgets. |
| `src/realm.ts` | `new Realm(output)` creates an independent global environment and console objects. `registerBuiltin(target, name, invoke)` allocates an ordinary callable object with a uniform receiver/args/context/location signature. |
| `src/interpreter.ts` | `run(source, realm): RunResult` returns either a parse diagnostic or runtime completion. The caller owns realm lifetime; repeated runs retain bindings. |
| `src/cli.ts` | Sole production host boundary: argv, file read, output adapter, diagnostics and exit codes. Host faults escape `run` and are caught here as internal faults. |

## Values, objects and calls

`Value` has undefined/null/boolean/number/string/object alternatives. Callable
objects use the object alternative too, so identity and own properties work for
functions without a second incompatible value representation. A `GuestObject`
stores a `Map<PropertyKey, DataDescriptor>` and optional `Callable`. `PropertyKey`
currently means string only. Descriptors hold value/writable/enumerable/configurable;
only writability has a directly exposed guest operation yet. TS-004A adds internal
validated data descriptor updates and extensibility (details below). TS-004B adds
ordinary data-only prototype chains; initial prototypes remain null. There are no
accessors or guest reflection APIs. TS-004C adds internal deletion and detached
string-only key lists (details below).

`Callable` is guest parameters/body/captured environment, or a builtin callback.
`Evaluator.call(callee, receiver, args, loc)` is the shared call boundary. Arguments
are evaluated left-to-right, including excess arguments, before callability is
checked; a failure resolving the callee prevents argument evaluation. Guest calls
allocate parameter bindings and instantiate the body. Falling off returns undefined.

TS-005C makes this boundary return only ValueCompletion (normal or throw).
Guest return is normalized; builtin return and escaped break/continue are host
invariant faults. Throws preserve the original record, value, diagnostic and
location. A host finally releases the active call count even on host exceptions;
host faults are never translated into guest throws. Callability and depth guards
precede the increment; step counts remain monotonic.

Each new Evaluator(realm, maxSteps = 100000, maxCalls = 64) owns one readonly
context with readonly realm and full-arity call/tick callbacks delegating to that
same evaluator. Builtins receive (receiver, args, context, loc) on each invocation
and still return Completion; normal(), tick() and call() return ValueCompletion.
Nested guest/builtin calls share budgets. Only the top-level run entry creates a
fresh evaluator. Guest closures retain lexical environments, not evaluators;
registration must not retain a context for later execution. The context driver
retains identities only as test observations across runs.

This supplies the active run's Realm, not full cross-realm intrinsic semantics.
Property operations and primitive conversions remain context-free because they
cannot invoke guest code in this profile. No map implementation or standard API
installation is included. Trusted builtin host work still requires explicit ticks
to be bounded; the context is not a universal CPU or heap limit.

A reference records a binding's environment (or unresolved name), or a property's
object and string key. Calls retain that reference long enough to choose the
receiver; reading a method into a variable discards its receiver. Parentheses
preserve references. Assignment evaluates the reference before its RHS and only
then writes. This is necessary even without accessors because base/key/RHS guest
calls can have effects. `test/fixtures/order.js` fixes the expected ordering.

## Bindings and completions

`Environment` is a chain of maps whose binding records carry initialized/mutable
flags and a value. A block first checks existing names, then creates all its let
bindings uninitialized and initializes function declarations with closures capturing
that same environment. Reading/writing an uninitialized binding gives ReferenceError.
Initialization after a let initializer is distinct from assignment. Block scopes and
function calls allocate separate environments; retained closures keep their bindings
alive through host-managed memory. Global builtins currently live in that same map;
the split ECMAScript global object/declarative environment is deferred.

`Completion` has normal, return, throw, break and continue alternatives. Every
expression result is a completion; callers check for normal before continuing.
Loops consume their own break/continue; calls consume return. Throw preserves a
guest value and carries a diagnostic separately. Engine-generated errors currently
use strings plus diagnostic data, not Error instances. Host exceptions indicate
internal faults or a failing host callback, and never become guest completions.
There is no suspension or promise/job model.

## Deliberately bounded semantics

This is a restricted **strict-call profile**, not a conforming Script implementation.
All functions receive exactly the supplied receiver: detached calls get undefined,
and top-level this is undefined because no global object has been implemented.
Directives do not switch modes. Sloppy receiver substitution and global-object
semantics are deferred and explicitly outside the profile. Object coercion is
rejected instead of silently borrowing host conversion hooks. Full declaration
instantiation, parameter/function redeclaration combinations, and Annex B are also
deferred; the feature inventory records rejected forms.

Limits per `run`: 100,000 source UTF-16 units; parser nesting 128; 100,000 evaluated
statement/expression steps; 64 active calls; 256 nested statement/expression frames.
Whichever runtime limit is hit first yields a guest RangeError. Statement nesting
shares the frame budget so recursive calls inside deep blocks cannot evade it.
Parsing limits are parse SyntaxErrors. These limits are deterministic safeguards,
not memory quotas or a security sandbox: string/object allocation and trusted host
callbacks have no hard heap/time quota. CLI file reading occurs before source-size
validation. There is no supported CLI limit override; evaluator limits are host APIs.

## Evidence and considered alternatives

The reference/completion split follows [ECMAScript 2025 §6.2.4–6.2.5](https://tc39.es/ecma262/2025/multipage/ecmascript-data-types-and-values.html#sec-reference-record-specification-type).
For implementation comparison, reviewed engine262's
[`reference-operations.mts`](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/reference-operations.mts),
at main revision `d553e7b52501fbc47eae981c8d0fa7a5c26d0171` (retrieved 2026-11-01).
Its distinct GetValue/PutValue/GetThisValue operations support retaining the base
through a call. Rift adopts that separation and explicit abrupt propagation, while
omitting private/super references, ToObject/ToPropertyKey coercion and generator-based
evaluation because their prerequisites are outside TS-001. Tagged unions and plain
returns make the implemented subset easier to follow. The specification remains
normative for future semantic expansion; neither engine262 nor C++ output is an oracle.

The scriptc probes and integrated builds support direct class references, host
strings and host-managed cycles. No compiler workaround was needed in the first
integrated engine. Builtins declare the full callback signature per the compiler
contract; objects avoid a class field named `prototype`. Both static-only build
and separately parsed 100% static coverage remain mandatory.

## Extension rules

Frontend additions update syntax/parser/evaluator together with expected-result
fixtures. Builtins should use `Realm.registerBuiltin` and return completions; never
call guest functions as host functions. TS-004B makes Get/Set completion-aware with explicit receivers. Future accessor
work must additionally supply guest-call capability. Do not add callbacks to descriptor storage ad hoc. Arrays await
those interfaces plus coercion and length/hole semantics. See `TASKS.md` for bounded
assignments; this foundation does not authorize starting them.

## TS-004A: ordinary data descriptors

`defineOwnProperty(key, DataDescriptorUpdate, loc): InternalBooleanCompletion`
returns normal boolean or throw (signature widened in TS-005D). The payload is a host boolean, not a guest
Value. Ordinary data-only validation cannot call guest code or throw a guest
exception. Rejection is normal false. `preventExtensions()` returns normal boolean
and always succeeds, including repeated calls; `isExtensible()` reads the slot.
`set`/`putValue` retain the current strict assignment contract: normal RHS Value
on success, guest TypeError on rejection. Even a same-value assignment to a frozen
property fails. `define` remains a complete-descriptor bootstrap/literal helper,
but now validates too and raises a host fault if an internal caller violates an
invariant. There is no public unchecked insertion method.

Update fields are optional. Host `undefined` denotes an absent field; guest
undefined is the distinct tagged `UNDEFINED` Value. Explicit false is present.
Storage contains complete descriptors. Validation precedes a single replacement,
and stored records never alias input descriptors. `getOwnProperty` returns a copy;
the legacy `properties` inspection getter returns a detached map of copied records.
These are trusted host APIs, not guest enumeration. Values follow the existing
runtime convention of immutable tagged records; referenced guest objects retain
their identity and mutable state. TypeScript private storage prevents typed host
callers from bypassing validation; this is not a hostile-host security boundary.

Sources and test evidence are in [TS-004A validation](validation/ts-004a/README.md).
No accessors, exotic objects, coercion, prototypes or Object/Reflect builtins land
with this change.

## TS-004B: ordinary prototype lookup and explicit receivers

The approved contract is implemented as internalGet(key, receiver, loc):
ValueCompletion and internalSet(key, value, receiver, loc):
InternalBooleanCompletion. These unions contain only normal and throw alternatives;
boolean payloads are host booleans. Ordinary data operations currently return normal
results. GetValue propagates Get directly; PutValue delegates to the strict set
wrapper, which propagates throw, turns false into TypeError and returns the exact
RHS Value on success. The host-inspection get wrapper delegates to internalGet and
reports an unexpected throw as a host fault; semantic reads never use it.

A private prototypeSlot begins null. getPrototypeOf reads it; setPrototypeOf
returns normal boolean, accepts the identical prototype before testing extensibility,
and checks the whole candidate chain before changing the slot. No shared intrinsic
prototype graph is created. Get, Set and cycle detection traverse iteratively.
The private slot plus cycle-rejecting mutation keeps ordinary chains acyclic.

Set finds the nearest descriptor on the lookup base's chain, rejects read-only data,
then checks the separate receiver. A primitive receiver fails. An existing receiver
own property must be writable and receives a value-only descriptor update; a missing
one is created with all three flags true, subject to receiver extensibility. The
lookup base is never the write target merely because it supplied the descriptor.
The evaluator already obtains method this from the property reference base, so no
AST or evaluator source change is necessary. The seeded guest fixture tests that
path, including an inherited method that writes through this.

This specialization deliberately uses direct ordinary slots rather than generic
exotic dispatch or accessor calls. Those features require revisiting traversal;
there is no claim of proxy/accessor support. The existing descriptor API remains
normal-only because its bounded implementation cannot throw guest exceptions.
TS-004C supplies the approved deletion/key-list interfaces described below.

The compiled host driver prints one fixed success line and throws on assertion
failure. Both lanes register it; its guest fixture is read at runtime and executed
in a seeded realm. Source references, design comparison and validation are in
[TS-004B evidence](validation/ts-004b/README.md).

## TS-004C: ordinary own keys and deletion

`internalDelete(key): InternalBooleanCompletion` checks only the own descriptor.
Absence succeeds, configurable properties are removed, and nonconfigurable
properties reject without mutation. Extensibility does not prevent deletion.
There is no guest delete syntax or strict-delete wrapper.

`ownPropertyKeys(): PropertyKey[]` returns a fresh list including nonenumerable
own strings. Indices sort numerically with an explicit comparator; other strings
retain Map creation order. Updating a descriptor preserves position; deletion and
reinsertion create a new string position. No prototype traversal or descriptor
filtering occurs. Ordinary objects cannot throw here. Symbols and exotic dispatch
remain unsupported, so this is not complete ECMAScript OwnPropertyKeys.

`src/property-keys.ts` exports `arrayIndex(key): number | undefined`. Bounded ASCII
digit parsing accepts exactly canonical decimal strings from 0 to 4294967294.
It rejects leading zeros, signs (including -0), whitespace, decimal/exponent forms
and the excluded upper bound. Ten-digit arithmetic stays exactly representable;
no guest coercion or signed bitwise conversion is involved. Index/key pairs retain
the parsed number for sorting. The classifier is available for future array work;
no array semantics are implemented here. Source revisions and validation are in
[TS-004C evidence](validation/ts-004c/README.md).

## Primitive numeric conversion (TS-005N)

`src/conversion.ts` exports `NumberCompletion` (normal host-number payload or
`ThrowCompletion`), `toNumber(value, loc)`, `toUint32(value, loc)`, and
`stringToNumber(value: GuestString): number`. These are internal prerequisites;
operators and the Number namespace do not call them yet. `failure` now advertises
its existing throw-only result precisely.

String conversion trims the exact 2025 ECMAScript whitespace/line-terminator set,
then scans the entire decimal/Infinity or unsigned radix token. Invalid strings
produce NaN; empty trimmed strings produce +0. A single private backend calls
host `Number` only on a validated string to obtain binary64 rounding. No host
object coercion, partial parsing, regex, or decimal digit-accumulation algorithm
is used. ToUint32 converts once, propagates throw, truncates finite values toward
zero and normalizes modulo 2^32 into [0, 2^32), including positive zero.

Objects explicitly throw runtime TypeError with `object-to-primitive conversion
unsupported`. This is a partial abstract operation, not ECMAScript object
conversion. No guest hook runs; future ToPrimitive needs its own call boundary.
The design follows the versioned specification and engine262 analysis in
[array prerequisites](array-prerequisites.md#sources-inspected-and-design-influence).
Fixed-result Node/native tests support the conditional numeric backend choice;
see [TS-005N evidence](validation/ts-005n/README.md). They do not prove every
possible binary64 rounding input or extend guest syntax/builtin support.

## TS-005D: completion-aware definition dispatch

Definition requires a Location. Both ordinary Set receiver paths forward the exact
location and full completion from the receiver override. The base ordinary
definition remains normal-only; strict set/putValue propagate throws unchanged,
translate only normal false to TypeError, and return the original RHS on success.
Bootstrap define keeps its convenience signature, supplies synthetic host location
1:1, and checks the discriminant before the boolean payload: either rejection or
guest throw is a host initialization fault.

Readonly lookup/receiver checks and primitive receiver rejection precede definition.
Extensibility is checked by ordinary definition, so a subclass override is still
called on a nonextensible receiver. Storage and iterative lookup remain unchanged;
this supports definition overrides only, not generic exotic Get/Set/prototypes.
No array or coercion behavior is added. The accepted design and source rationale
remain in array-prerequisites.md; actual-runtime compiled tests and gate transcripts
are in [TS-005D validation](validation/ts-005d/README.md).

## TS-005A: data-only array storage

`GuestArray` in `src/array-object.ts` subclasses GuestObject and overrides only
definition. Its empty constructor initializes an ordinary own length descriptor
(+0, writable, nonenumerable, nonconfigurable) through validated base definition.
There is no parallel length slot; ordinary reads, keys, deletion and receiver Set
observe the same private base storage. Initial prototype remains null. No runtime
or conversion interface change was needed.

Length definition copies the caller descriptor, calls ToUint32 then separately
ToNumber on the original value, compares numerically (SameValueZero for the finite
uint32 operand), and reads current length only afterward. Invalid numeric lengths
throw RangeError before flag rejection; object conversion hits the explicit
unsupported TypeError boundary. Ordinary Set can reject readonly length before
definition/conversion, including same-value writes. Successful assignment returns
the original RHS even when the stored length has been normalized to a number.

Indices grow length only after successful ordinary definition. Shrinking first
validates the new length descriptor, temporarily keeps writable true if freezing
was requested, then traverses the detached own-key list backward. Only present
indices at/above the target are deleted; holes cost no iteration. At a blocked
index, higher deletions stay committed, length becomes index+1, and any requested
freeze is applied. Base operations guaranteed by these invariants are asserted.
Work/storage depend on present own keys (including their ordinary sorting), never
on numeric length. This relies on ordinary data-only deletion without callbacks.

The algorithm follows [ECMA-262 2025 ArraySetLength](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-arraysetlength)
and the same page's array DefineOwnProperty algorithm, checked on 2026-11-01.
[engine262 array-objects.mts at d553e7b](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/array-objects.mts)
was inspected through the GitHub connector: repeated conversions, present-key
descending deletion and delayed freezing support this design. Rift uses the
already-tested class override and ordered key API, without copying upstream code
or introducing its generator/intrinsics machinery. Future object coercion still
needs its own guest-call boundary and tests; separate conversion calls here are
not evidence that object hooks work. See [TS-005A validation](validation/ts-005a/README.md).

## Property presence and array-like length (TS-005H)

`GuestObject.internalHasProperty(key, loc): InternalBooleanCompletion` traverses
private ordinary slots iteratively. It distinguishes a missing property from a
present undefined value, includes prototypes, and performs no Get or guest call.
This covers current ordinary objects and arrays; it does not dispatch exotic
prototype operations or claim proxy/accessor support.

`toIntegerOrInfinity(value, loc)` and `toLength(value, loc)` return
`NumberCompletion`. Integer conversion invokes the existing ToNumber once,
propagates throws, preserves infinities and truncates finite numbers with +0 for
all zero results. Length clamps to 0 through 9007199254740991, without uint32
wrapping. Both retain the explicit unsupported object-conversion TypeError.

`lengthOfArrayLike(object: GuestObject, loc)` in `src/array-like.ts` calls
`internalGet("length", objectValue, loc)` once, preserving the input as receiver
and the exact abrupt completion, then converts the normal value with ToLength.
Missing length therefore yields +0. This API requires an object; it supplies no
ToObject, boxing, guest entry point, callback context, species or map algorithm.

Sources consulted 2026-11-01: ECMA-262 **16th edition (2025)**
[ToIntegerOrInfinity](https://tc39.es/ecma262/2025/multipage/abstract-operations.html#sec-tointegerorinfinity),
[ToLength](https://tc39.es/ecma262/2025/multipage/abstract-operations.html#sec-tolength),
[LengthOfArrayLike](https://tc39.es/ecma262/2025/multipage/abstract-operations.html#sec-lengthofarraylike), and
[OrdinaryHasProperty](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinaryhasproperty).
The mathematical integer result motivates explicitly normalizing truncated
negative fractions to +0, rather than exposing host Math.trunc's -0.

Engine comparison: engine262 revision
`d553e7b52501fbc47eae981c8d0fa7a5c26d0171`, inspected through GitHub:
[type-conversion.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/type-conversion.mts),
[object-operations.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/object-operations.mts), and
[objects.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/objects.mts).
Its staged Get/ToLength abrupt handling and descriptor-based presence support
these semantics. Rift uses existing explicit records and an iterative ordinary
slot traversal instead of generator-based recursive exotic dispatch. No upstream
code was copied. These inspections are design evidence, not conformance results.

### Array literals (TS-006)

`Expr` has an array variant with `(Expr | null)[]`: null is an absent slot,
whereas a guest null literal remains a literal expression. The primary parser
reads AssignmentExpressions at precedence 1 and consumes their separator
separately from elision commas. Thus `[1,]` has one slot and `[1,,]` has two.
The existing expression recursion and lexer source limits still apply. A dot
at an array element boundary explicitly rejects unsupported spread syntax.

Each evaluation allocates a fresh GuestArray and visits slots in source order.
Every slot first consumes the active evaluator's tick, including holes; present
expressions additionally spend their usual AST ticks. Present values use the
validated own definition operation with writable/enumerable/configurable true.
Abrupt element completions are returned unchanged. A final validated length
update accounts for trailing holes without defining undefined properties.
Normal-false definition on this fresh, inaccessible array is an invariant fault.

Sources consulted on 2026-11-01: [ECMA-262 edition 16, sections 13.2.4,
13.2.4.1 and 13.2.4.2](https://262.ecma-international.org/16.0/#sec-array-initializer)
and [engine262 ArrayLiteral.mts at d553e7b52501fbc47eae981c8d0fa7a5c26d0171](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/runtime-semantics/ArrayLiteral.mts).
Both distinguish elisions from evaluated elements and create own data properties
in order. Rift follows that decomposition using existing explicit completions,
without copying upstream code or introducing generator/iterator infrastructure.
The spec/engine update length during elisions; Rift defers their remaining length
update until completion. This is unobservable here: the fresh result cannot escape
before return, its prototype is null, and source length bounds keep slot counts
far below the array length limit. Revisit that reasoning if allocation hooks or
literal construction observability are introduced. Resource ticks are Rift policy.

No Array intrinsics, spread, destructuring, comma operator, numeric property-key
coercion or standard map installation is included. The existing null prototype
limitation remains. Tests inspect parsed guest results through existing host
operations; no guest reflection API was added. See [validation](validation/ts-006/README.md).

## Primitive property keys (TS-007)

Property references retain the raw base Value, key Value and member location.
GetValue/PutValue first reject non-object bases, then apply partial ToPropertyKey.
Simple assignment evaluates its RHS before either restriction. Reads obtain the
property before call arguments; method calls pass the exact saved base Value as
receiver. No base/key reevaluation occurs when RHS or arguments replace bindings.

conversion.ts exports StringCompletion, PropertyKeyCompletion, numberToString,
toString and toPropertyKey. Both conversions support every current primitive;
object/array/function keys return the existing unsupported-object TypeError
without reading or calling coercion hooks. The numeric backend uses String on a
typed number, preserving binary64 formatting rather than array-index conversion.
PropertyKey itself remains GuestString. Future symbols require the two conversion
operations to diverge. Object coercion, primitive boxing and new operators remain
excluded. See property-key-conversion.md for the frozen order and test contract.

## Primitive numeric operators (TS-008)

Unary +/- now call existing partial toNumber after evaluating their operand.
Binary -, *, / and % evaluate/GetValue left, then right, before converting left
and then right. Each abrupt completion returns unchanged; conversion receives
the existing AST location (binary expression start). No parser location or API
change was needed. Typed number payloads use the existing binary64 operations.
Unary minus flips zero sign; remainder follows the dividend sign, not modulo.

Source review before implementation used ECMA-262 edition 16 (2025),
[unary plus](https://262.ecma-international.org/16.0/#sec-unary-plus-operator-runtime-semantics-evaluation),
[unary minus](https://262.ecma-international.org/16.0/#sec-unary-minus-operator-runtime-semantics-evaluation),
[operand evaluation](https://262.ecma-international.org/16.0/#sec-evaluatestringornumericbinaryexpression)
and [operator application](https://262.ecma-international.org/16.0/#sec-applystringornumericbinaryoperator).
The order is also explicit in engine262 revision
`d553e7b52501fbc47eae981c8d0fa7a5c26d0171`:
[evaluation](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/runtime-semantics/EvaluateStringOrNumericBinaryExpression.mts),
[application](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/runtime-semantics/ApplyStringOrNumericBinaryOperator.mts),
and [unary evaluation](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/runtime-semantics/UnaryExpression.mts).
These establish the ordering, not implementation code reuse. Full ToNumeric also
handles BigInt; our approved subset reuses ToNumber because BigInt and object
ToPrimitive remain unsupported. Ordinary objects, arrays and functions reject
without reading or calling conversion hooks. Binary plus, comparisons, logical
operators, grammar, boxing and symbols remain unchanged. No conversion backend
or compiler workaround was added. See [validation](validation/ts-008/README.md).

## Primitive binary addition (TS-009)

The existing binary expression path evaluates/GetValue left then right, returning
abrupt records unchanged before entering operator application. Addition now rejects
objects explicitly at the default-hint ToPrimitive boundary. This is distinct from
the string hint used for property keys; no hook is read or called. For current
primitives, either string operand selects left then right partial toString and
stringConcat. Otherwise left then right partial toNumber feeds typed binary64
addition. Existing conversion backends and AST error locations are unchanged.

Source review (2026-11-01):
[ECMA-262 operator application](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-applystringornumericbinaryoperator)
and [operand evaluation](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-evaluatestringornumericbinaryexpression),
plus [engine262 application at d553e7b52501fbc47eae981c8d0fa7a5c26d0171](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/runtime-semantics/ApplyStringOrNumericBinaryOperator.mts).
These support the branch and order; no source code was copied. Full ToPrimitive,
BigInt/ToNumeric, symbols and boxing remain outside this primitive-only contract.
Relational/equality/logical operations and grammar are unchanged. See
[TS-009 validation](validation/ts-009/README.md) for matrix and migrations.

## Primitive relational comparisons (TS-010)

The relational path in Evaluator.binary receives already evaluated source-left
and source-right Values. It rejects objects at the number-hint ToPrimitive
boundary. Two strings use stringCompare in strings.ts, an explicit charCodeAt
loop with a prefix-length fallback. Other primitive pairs use existing toNumber
left then right. The local comparison result is -1, 0, 1, or null (unordered).
Operator mapping tests that order against zero; null returns false before mapping.
This avoids turning unordered <= or >= into true through boolean negation.

Sources consulted on 2026-11-01:
- [ECMAScript 2025 IsLessThan](https://tc39.es/ecma262/2025/multipage/abstract-operations.html#sec-islessthan): number hint, two-string code-unit path, numeric path and unordered result.
- [ECMAScript 2025 relational evaluation](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-relational-operators-runtime-semantics-evaluation): evaluate/GetValue left then right for every operator; < and >= use IsLessThan(left,right,true), > and <= use IsLessThan(right,left,false). Inclusive operators reject both true and unordered before negation.
- [V8 Object::Compare and StrictNumberCompare, revision 22afaacd47a47baef49222b20e94083d0dd37e2d](https://chromium.googlesource.com/v8/v8/%2B/22afaacd47a47baef49222b20e94083d0dd37e2d/src/objects/objects.cc): reviewed the source-order number-hint conversions, string branch, and separate unordered/less/equal/greater result. Adopted the recognizable comparison-result approach, not engine-specific storage or optimization code.

For this primitive-only subset, source-order numeric conversion followed by
operator mapping is equivalent to reversing IsLessThan arguments: primitive
numeric conversion has no guest effects. A future full ToPrimitive must preserve
the number hint and source order; it cannot simply swap the operand evaluations.
The code-unit loop deliberately avoids relying on host collation or scalar order.
Fixed surrogate, NUL and prefix assertions execute through parsed expressions in
both hosts. No object conversion, equality change or new syntax is included.
Evidence and regression migration inventory: validation/ts-010/README.md.

### Internal ordinary primitive conversion (TS-011)

`primitive-conversion.ts` exports the frozen `ordinaryToPrimitive(input, hint,
context, loc)` and partial `toPrimitive(input, hint, context, loc)` helpers.
Both return ValueCompletion. The ordinary helper requires an object (host fault
otherwise); its number/string hint selects sequential valueOf/toString lookups.
The wrapper preserves primitive Value identity without operations and maps default
to number. Each candidate spends exactly one active lookup tick, performs semantic
internalGet with the original receiver, and calls callable methods through the
same OperationContext with a fresh empty argument list. Any primitive succeeds;
object results advance to the next fresh lookup. Tick/Get/call throws propagate
unchanged; exhaustion creates a located TypeError. No helper-local counters or
ambient evaluator state exist.

This implements the accepted [TS-011P contract](object-coercion-integration.md).
The specification's [OrdinaryToPrimitive](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-ordinarytoprimitive)
and V8 **12.0.267** [JSReceiver::OrdinaryToPrimitive](https://github.com/v8/v8/blob/12.0.267/src/objects/js-objects.cc)
were checked for sequential lookup, callable filtering, receiver and primitive
acceptance. No engine source was copied. Rift's explicit completions and lookup
tick are local conventions. The partial wrapper deliberately omits symbol hooks.
Only the compiled driver and its test bridge call these helpers; existing
operators, converters, references, arrays and production registration are unchanged.
See [evidence and H1-H17 coverage](validation/ts-011/README.md).

### TS-012: operator coercion integration

Supersedes the operator object-rejection boundaries recorded for TS-008 through
TS-011 above. Evaluator unary +/- and binary - * / % now call partial toPrimitive
with number hint and the existing active context before primitive ToNumber.
Binary addition calls it left then right with default hint before choosing string
concatenation; relational operators call it left then right with number hint
before two-string/numeric selection, including > and <=. Both operand GetValue
operations still finish before coercion. The accepted helper owns candidate
lookup ticks and context.call; operators add no ticks or fresh evaluators.

Existing primitive converters and all key/reference/array APIs remain unchanged.
No ambient context, standard methods or symbol hooks are introduced. Objects with
explicit own/inherited methods can convert; objects lacking usable methods fail
with the helper's located TypeError. Equality, logical/truthiness operations and
Number predicates remain noncoercing. See the accepted source-backed
[design](object-coercion-integration.md) and [TS-012 evidence](validation/ts-012/README.md).
