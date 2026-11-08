# Architecture and extension boundaries

## Current reading guide

Updated after TS-039 (2026-11-08). Rift interprets guest source at runtime. The
same TypeScript implementation runs under Node and compiles to native code with
scriptc; neither route delegates guest execution to the host JavaScript engine.

Follow a CLI program through these modules:

| Module | Responsibility |
|---|---|
| `src/cli.ts` | Reads source, creates a Script Realm, prepares the program and evaluates it in a fresh session. Owns console output, diagnostics and exit codes. |
| `src/lexer.ts`, `src/parser.ts`, `src/syntax.ts` | Tokenize and parse the supported grammar into located syntax nodes. Script metadata and declaration analysis establish strictness and binding rules before execution. |
| `src/script-record.ts` | Exposes `prepareBoundedScript`. Successful preparation produces an opaque executable record tied to its source and Realm. Rejected preparation does not execute guest code. |
| `src/script-execution.ts` | Exposes `createScriptSession` and `evaluateScript`. The session tracks execution limits and active calls; evaluation distinguishes declaration-instantiation failure from body completion. |
| `src/script-execution-internal.ts` | Implements record preparation, declaration instantiation, function materialization and tree-walking execution. The two small public modules above are facades over this implementation. |
| `src/script-environment.ts`, `src/global-environment.ts` | Resolve local/function bindings and the global object/declarative environment. References retain strictness and receiver information for later reads, writes and calls. |
| `src/realm.ts`, `src/builtins/` | Allocate each Realm's intrinsics and implement guest builtins through shared object operations and explicit completions. |

`runtime.ts` defines tagged values and ordinary guest objects. Values include
symbols; property keys are strings or symbols. Objects support prototype lookup,
data and accessor descriptors, extensibility and deletion. Callable objects keep
ordinary object identity. `array-object.ts` specializes property definition for
array indices and length; sparse elements remain properties rather than a dense
host array.

Operations that can invoke guest code receive an `OperationContext`. Property
access and primitive conversion may call getters, setters or conversion methods,
so evaluation order matters even inside a builtin. Explicit completion records
carry guest control flow and errors; host exceptions indicate implementation or
host-adapter faults. Builtin loops must charge the shared execution budget.

The CLI follows Script directives for strict/sloppy behavior. This is still a
bounded language implementation: see the [feature inventory](feature-inventory.md)
for supported syntax and APIs. `interpreter.ts`, the legacy `Evaluator` interface
and the old observation path remain for earlier host tests and tooling; their
migration is unfinished. New CLI features should use the Script path above.

For a small builtin example, read `builtins/array-mutation.ts` alongside
[its operation-order tests](../test/array-mutation.ts). Validate semantic changes
in both hosts and retain the native static-coverage gate.

## Historical TS-001 decisions

The sections below record the original foundation and later milestone additions.
Statements about the old strict-only profile, missing accessors, global objects
or Error instances describe those earlier boundaries, not the current CLI.

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
| `src/realm.ts` | `new Realm(output)` creates an independent global environment and console objects. `registerBuiltin(target, name, length, invoke)` allocates an ordinary callable object with a uniform receiver/args/context/location signature. |
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
ordinary data-only prototype chains; TS-016A adds explicit per-Realm roots while low-level constructors retain null defaults. There are no
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

`defineOwnProperty(key, DataDescriptorUpdate, context, loc): InternalBooleanCompletion`
returns normal boolean or throw (signature widened in TS-005D). The payload is a host boolean, not a guest
Value. Ordinary data-only validation cannot call guest code or throw a guest
exception. Rejection is normal false. `preventExtensions()` returns normal boolean
and always succeeds, including repeated calls; `isExtensible()` reads the slot.
`set`/`putValue` retain the current strict assignment contract: normal RHS Value
on success, guest TypeError on rejection. Even a same-value assignment to a frozen
property fails. TS-015A replaces `define` with descriptor-form `bootstrapDefine`,
which uses a separate validated setup dispatch and raises a host fault on false
or throw. Literals use semantic Define with the active context. There is no
public unchecked insertion method.

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
ValueCompletion and internalSet(key, value, receiver, context, loc):
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
At TS-004C there was no guest delete syntax or strict-delete wrapper; TS-025A now adds the wrapper described below.

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
TS-015A supersedes the old bootstrap convenience signature with
`bootstrapDefine(key, desc)`. Its dedicated protected bootstrap dispatch supplies
synthetic host location 1:1 and checks the discriminant before the boolean payload:
either rejection or throw is a host initialization fault.

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
throw RangeError before flag rejection. TS-015B enables separate number-hint
ordinary object conversion before each primitive numeric conversion. Ordinary Set can reject readonly length before
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
or introducing its generator/intrinsics machinery. TS-015B supplies the guest-call boundary and effectful tests; the original
TS-005A milestone itself demonstrated primitive inputs only. See [TS-005A validation](validation/ts-005a/README.md).

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

`lengthOfArrayLike(object: GuestObject, context: OperationContext, loc)` in `src/array-like.ts` calls
`internalGet("length", objectValue, loc)` once, preserving the input as receiver
and the exact abrupt completion, then (since TS-014) applies number-hint ToPrimitive with the required active context and primitive ToLength.
Missing length therefore yields +0. This API requires an object; it supplies no
ToObject, boxing, guest entry point, species or map algorithm.

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
before return, own definitions bypass inherited properties, and source length bounds keep slot counts
far below the array length limit. Revisit that reasoning if allocation hooks or
literal construction observability are introduced. Resource ticks are Rift policy.

This original TS-006 batch did not install Array intrinsics or methods. TS-007
subsequently added primitive numeric keys; TS-016A adds the Realm array root.
Spread, destructuring, comma operator and standard map installation remain deferred. Tests inspect parsed guest results through existing host
operations; no guest reflection API was added. See [validation](validation/ts-006/README.md).

## Primitive property keys (TS-007)

Property references retain the raw base Value, key Value and member location.
TS-028A supersedes the original object-only GetValue restriction: reads use
ToObject before deferred ToPropertyKey and save a successful key on the reference.
TS-029A supersedes the original PutValue object-only restriction: after the RHS,
ToObject precedes deferred key conversion and successful-key caching, followed by
internalSet with the original base Receiver. Reads obtain the
property before call arguments; method calls pass the exact saved base Value as
receiver. No base/key reevaluation occurs when RHS or arguments replace bindings.

conversion.ts exports StringCompletion, PropertyKeyCompletion, numberToString,
toString and toPropertyKey. Both conversions support every current primitive. TS-013 adds ordinary object key
coercion to toPropertyKey; direct toString stays primitive-only. The numeric backend uses String on a
typed number, preserving binary64 formatting rather than array-index conversion.
PropertyKey itself remains GuestString. Future symbols require the two conversion
operations to diverge. Primitive reads now box through TS-028A; writes and syntax remain unchanged. See property-key-conversion.md for the frozen order and test contract.

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


## Ordinary computed key coercion (TS-013)

Required signatures are toPropertyKey(value, context, loc), getValue(ref,
context, loc), and putValue(ref, value, context, loc). Every evaluator consumption,
including bindings, supplies its retained context. Host reference tests retain
an explicit Evaluator context; no semantic helper creates one.

ToPropertyKey invokes accepted partial ToPrimitive with string hint, propagates
an exact throw, then calls primitive-only ToString. Reference capture still saves
raw base/key Values and location. GetValue/PutValue validate the base first;
simple assignment evaluates RHS first. This preserves BKCG, BKRCS and BKCGAAM
and live method mutation on a saved key without redirecting a saved base.
Source mapping: object-coercion-integration.md F5-F7 and its specification/V8/
engine262 references. The actual runtime -> conversion -> primitive-conversion
-> runtime module cycle is tested by every native build, not an isolated mock.

Only keys integrate here. Direct numeric/string converters, array storage and
length conversion signatures remain unchanged. No symbols, boxing, new syntax,
standard prototypes or compound/update reference caching are introduced.


## Array-like ordinary length coercion (TS-014)

The existing map context now reaches LengthOfArrayLike. One semantic length Get
selects a Value, then accepted ordinary conversion runs before callback checking,
array constructor checking or allocation. Replacing the source property does not
replace that saved Value. The numeric bound is retained; element presence and
values remain live. No extra ticks are added: helper candidate ticks and existing
evaluator/map ticks share the same active budget. Exact abrupt records propagate.

This implements the accepted object-coercion-integration design F12-F14, using
its specification and V8/engine262 source rationale. Actual GuestArray storage
length remains numeric and its definition/assignment conversions remain primitive
only. A test subclass returning an object for length observes ordering only; it
is not an accessor or exotic-storage implementation. There is no standard map
registration, boxing, species expansion or symbol hook. Evidence and migration
inventory: validation/ts-014/README.md.

## TS-015A: semantic context and validated bootstrap

Semantic Define, internalSet and Set require OperationContext before Location.
PutValue forwards its active context through both receiver-definition branches,
preserving virtual receiver dispatch, exact abrupt records and original RHS.
Ordinary definitions perform no conversion, ticks or guest calls. All literal
and map definitions use their existing active context.

Trusted setup calls bootstrapDefine(key, descriptor), then the protected
bootstrapDefineOwnProperty at synthetic 1:1. It never calls semantic Define.
Both ordinary entries share protected ordinaryDefineOwnProperty validation;
private storage remains inaccessible to consumers. Array construction explicitly
calls the super ordinary validator, bypassing all subclass dispatch. Array
semantic/bootstrap entries share non-length index-growth and normalized length
storage phases, including sparse descending deletion, partial rollback and
delayed freezing. Bootstrap rejects object length before hook lookup or mutation;
ordinary object-valued length and elements remain data.

This plumbing milestone retained primitive-only semantic length. TS-015B below
adds effectful conversion in the separately assigned batch. See [the frozen contract](array-length-context.md)
and [validation](validation/ts-015a/README.md).

## TS-015B: effectful array length

Semantic setLength copies all descriptor fields and retains the original Value.
It calls number-hint toPrimitive then toUint32, independently calls toPrimitive
again on that Value then toNumber, compares, and passes the normalized descriptor
to the existing storage phase. Neither primitive results nor methods are cached.
Thus 2.9 followed by 2 succeeds; 2 followed by 2.9 fails after both hook effects.
The old descriptor is read only by the later storage phase. Hook mutations and
exact abrupt records survive; readonly Set still rejects before definition.

The implementation rechecks the living [ArraySetLength algorithm](https://tc39.es/ecma262/multipage/ordinary-and-exotic-objects-behaviours.html#sec-arraysetlength)
on 2026-11-01 and follows the engine262 comparison retained in
[array-length-context.md](array-length-context.md). Descriptor snapshots protect
against callback replacement of the host record without claiming descriptor
accessor/concurrent mutation support. Bootstrap and direct conversion APIs stay
primitive-only; no new ambient context, guest intrinsic or compiler workaround.
See [validation and L1-L21 mapping](validation/ts-015b/README.md).

## Realm prototype graph (TS-016A)

Each Realm bootstraps three fresh, extensible roots in dependency order: immutable
null-root Object prototype, callable Function prototype inheriting Object, and
exotic Array prototype inheriting Object. Bootstrap uses explicit constructor
slots and validated descriptor storage without an evaluator, guest operations,
output or ticks. Function's no-op callable returns undefined and has own empty
name/+0 length; Array has the normal exotic +0 length descriptor.

Realm factories select Object/Array/Function roots for all production allocations.
Low-level constructors retain explicit null defaults for host fixtures. Prototype
immutability rejects a different slot value even on extensible Object root, but
same-slot success precedes both immutability and extensibility checks. Properties
remain independently mutable. Builtin creation centralizes name/length metadata,
rejects nonfinite, negative or fractional lengths as host faults and normalizes
zero to +0. Guest closures retain their original environment and inherit the
Function root's empty name/zero length until own metadata is separately designed.

Internal map selects the supplied context Realm for results, preserving exact
returned Values, holes, order and the existing constructor/species rejection.
Transferred values retain identities and chains. TS-017A supersedes the original
caller-Realm allocation limitation: foreign functions enter their defining Realm
using the caller evaluator's stable context and original lexical environment. No constructor bindings/back-links or standard prototype methods are
installed, so existing no-method coercion failures remain intentional.

The accepted [design](realm-intrinsic-prototypes.md) records fixed ECMA-262 2025
and pinned engine262 sources and the adopted boundaries. No engine code is copied.
See [validation](validation/ts-016a/README.md) for G1-G17 coverage and lane evidence.

## Function.prototype.call (TS-016B)

A fresh registered builtin on each Realm's Function root validates its receiver's
callable slot, selects the first argument (or undefined), copies remaining Values
in order, and forwards through the supplied OperationContext.call with the same
location. It performs no target property lookup, coercion, boxing, or extra tick.
The original argument list is untouched; Values retain identity. Noncallable
receivers throw the located TypeError `Function.prototype.call receiver is not callable`.
Argument expressions have already evaluated before this check, as for other calls.

The evaluator boundary is unchanged. Both the builtin and target occupy active
call slots: proper tail calls (the specification's PrepareForTailCall) are not
implemented. All guest functions retain Rift's existing strict receiver profile.
TS-017A adds defining-Realm entry for the intrinsic and target independently,
while preserving lexical environments and object identities. Neither task adds
sloppy this substitution, Function constructors, apply/bind/toString, or ordinary
guest function metadata inference.

Sources consulted on 2026-11-01: [ECMA-262 2025, 20.2.3.3](https://tc39.es/ecma262/2025/multipage/fundamental-objects.html#sec-function.prototype.call)
and [engine262 FunctionPrototype.mts at d553e7b52501fbc47eae981c8d0fa7a5c26d0171](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/FunctionPrototype.mts).
Adopted callable validation and ordered unchanged Value forwarding; no source
copied, no generator execution machinery or tail-call emulation adopted.
[Validation and scope](validation/ts-016b/README.md).

## Synchronous defining-Realm entry (TS-017A)

Callable records require a readonly defining Realm; GuestObject installs its
readonly callable slot at construction. createGuestFunction captures the active
Realm and lexical Environment separately. createBuiltin and Function root
bootstrap stamp the creating Realm without executing guest code. Null-root host
fixtures remain null-root and explicitly supply their owner.

An evaluator exposes one stable OperationContext, backed by a private mutable
Realm view. After callable and call-budget validation, call saves the active
Realm, enters the callable's owner and dispatches with the same context, budgets,
receiver, arguments and location. Finally restores the previous Realm and call
count. Admitted statement/expression frames also release their depth in finally;
a host fault cannot strand frames or erase still-active caller frames. Entry and
restoration add no semantic ticks, and exhausted steps never reset.

A saved context is a live view, not a Realm snapshot. Save context.realm separately
when a host algorithm needs a fixed origin. Nested calls must use context.call;
run remains an independent top-level execution with a new evaluator. Internal map
allocates in its supplied context's active Realm; coercion calls freshly read
hooks through the same evaluator. Objects and transferred Values are not copied
or reparented, and prototype/name/length mutation never changes function ownership.

This is synchronous entry only, with strict receiver forwarding and string-valued
error diagnostics. It adds no suspension model, jobs, modules, constructors,
species, boxing, Error objects, bound/proxy functions or standard methods.
The [accepted contract](function-realm-entry.md) records the fixed specification
and engine sources and rationale. See [validation](validation/ts-017a/README.md).

## Primitive wrappers and explicit ToObject (TS-018A)

GuestBoolean, GuestNumber and GuestStringObject carry readonly host-scalar
payloads. Each Realm bootstraps separate false/+0/empty-string roots directly
under its Object root, then allocates fresh wrappers through typed factories.
Existing object/array/function roots, callable ownership and the Number namespace
are unchanged. Explicit toObject returns existing objects verbatim, allocates
primitive wrappers in the live context Realm, and returns a located TypeError
for null/undefined. It performs no Get, Call or tick and has no production caller.

String indices synthesize detached readonly/enumerable/nonconfigurable UTF-16
unit descriptors. The readonly length lives in validated ordinary storage.
Compatible index definitions succeed without storage insertion, including on
nonextensible objects. Semantic and bootstrap definitions share the same check.
Keys place virtual indices before stored array indices and insertion-ordered
ordinary strings; the String-specific properties snapshot follows that order.
No virtual unit can enter ordinary storage through the supported definition APIs,
so appending ordinary keys cannot duplicate virtual indices.

Get, HasProperty and Set search each prototype's getOwnProperty iteratively.
This includes virtual data properties while preserving Receiver and existing
completion/observer behavior. HasProperty does not invoke Get. This remains a
synchronous data-descriptor model, not general accessor or proxy dispatch.

The implementation follows the [accepted design](primitive-wrappers.md), including
its pinned engine262 comparison, and the fixed [ECMA-262 String exotic algorithms](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-string-exotic-objects).
No source was copied. No implicit member/receiver boxing, constructors, globals,
wrapper conversion methods or Object valueOf/toString are added. Direct primitive
converters still reject wrappers; ordinary conversion requires explicit hooks.
See [W1-W19 validation](validation/ts-018a/README.md).

## Object.prototype.valueOf (TS-018B)

Stage B adds the first production caller of ToObject in `builtins/object.ts`.
`registerObjectValueOf` runs after all roots exist and uses `registerBuiltin`;
the existing factory supplies metadata, Function root and defining Realm.
The body propagates ToObject failure and wraps a successful object in a normal
Value completion. Arguments are unused. Existing evaluator entry/finally controls
Realm and depth, so borrowing B's method from A allocates primitive boxes in B
without creating an evaluator or budget. No conversion logic or reference
semantics changes are needed.

This follows fixed [ECMA-262 2025 section 20.1.3.7](https://tc39.es/ecma262/2025/multipage/fundamental-objects.html#sec-object.prototype.valueof)
and the separately inspected [engine262 ObjectProto_valueOf at d553e7b](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/ObjectPrototype.mts).
Both delegate to ToObject; no engine source was copied. Rift retains explicit
completion/context plumbing instead of the reference engine's ambient machinery.

Inherited valueOf returns an object, so ordinary coercion still fails when no
explicit primitive-returning hook exists. Its call is real work and can exhaust
call depth, between the existing two method lookup ticks. Null-root objects
still have no methods. Stage A's direct converter, primitive reference, wrapper
storage and strict receiver boundaries remain intact. Only O's initial own keys
change to `[valueOf]`; all other roots keep their own keys and inherit this method.
See [validation and migration audit](validation/ts-018b/README.md).

## Object toString and canonical tag lookup (TS-019C)

`registerObjectToString` installs after valueOf. Its body handles nullish values
first, then uses the existing defining-Realm ToObject boundary. It classifies
Array before callable objects and Boolean/Number/String slots before ordinary
Object fallback. Classification finishes before one charged canonical-symbol Get.
The returned tag is used only if it is already a string; tag values never undergo
conversion. Exact throw completions propagate through existing call cleanup.

The shared `wellKnownToStringTag` identity is installed on each Symbol root after
its B2 methods, with false/false/true attributes. Symbol has no builtin fallback
tag: deleting or shadowing that property can expose Object. Mutable tag properties
belong to Realms; the key identity belongs to the runtime module instance.

This follows fixed [ECMA-262 2025 Object toString and Symbol tag](https://tc39.es/ecma262/2025/multipage/fundamental-objects.html#sec-object.prototype.tostring)
and the inspected [engine262 ObjectPrototype at d553e7b](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/ObjectPrototype.mts).
No engine source is copied. Existing data-only Get and explicit context/completion
interfaces remain; observer reentry tests do not imply accessor/proxy support.

This supersedes the earlier default-object failure in TS-018B. Ordinary objects
now convert to a tag string, numeric NaN and the corresponding computed key.
Array/Function/Boolean/Number/String default conversion remains deliberately
partial until separate standard overrides are implemented. Symbol boxes retain
B2 behavior. Primitive-only converters and implicit-member-boxing rejection stay.
See [both T matrices, migration inventory and validation](validation/ts-019c/README.md).

## Number slot extraction without formatting (TS-021A)

thisNumberValue returns NumberCompletion from a number Value or genuine
GuestNumber.numberData; prototype ancestry and guest properties cannot supply a
slot. registerNumberConversions installs only valueOf using registerBuiltin.
The existing root retains +0 and gains exactly one own key, valueOf. No helper
or body tick is added. The shared ToPrimitive algorithm remains unchanged:
numeric/default hints find the payload method, while string hints still find
Object.toString. Deleted/shadowed/replaced methods therefore retain ordinary
observable lookup and fallback behavior, without a slot shortcut in coercion.

This implements the accepted fixed-2025/pinned-engine design in
[number-prototype-conversions.md](number-prototype-conversions.md), limited to
valueOf. Full Number.toString remains blocked on a separately validated radix
backend. No production compiler workaround or primitive-converter contract change.
[Validation and migration audit](validation/ts-021a/README.md).

## Array string conversion (TS-022A, pending review)

Array.prototype.join explicitly boxes its receiver, snapshots LengthOfArrayLike,
converts the separator, then Gets and converts each indexed element in order.
Nullish elements contribute empty text; holes still perform Get and can inherit
values. Generic lengths are not constrained by Array's uint32 storage limit.
Array.prototype.toString fetches the current join and calls it, or calls the
exact defining-Realm Object.toString Value captured during bootstrap. Both calls
use the shared context, and direct toString forwards its result unchanged.

The private effectful string helper composes ToPrimitive with the unchanged
primitive-only converter. Local ticks charge length lookup, each join iteration,
and the toString join lookup. No global Get charge or receiver mutation is added.
The accepted [design](array-string-conversion.md) supplies the fixed specification
and pinned engine references. No upstream implementation was copied.

Self/mutual cycles and separator/element reentry use the existing call guard,
including tested native default maxCalls=64. Cycle empty-string compatibility is
deferred. Steps do not bound output bytes or guarantee OOM recovery. There is no
new accessor/proxy, constructor/species, implicit member boxing, Array method or
Number formatting support. Array's former default tag conversion is superseded;
explicit Object.toString Array tags and Function/Number stage controls remain.

At TS-022A acceptance the frozen consumer matrix had two syntax gaps: abstract
equality and guest delete. TS-024A now implements C2 equality; its original
rejection transcript remains historical evidence. TS-025A closes C3 with guest
delete assertions and own-descriptor inspection, preserving the raw internal
controls and historical rejection transcript. See the [matrix, migrations
and evidence](validation/ts-022a/README.md).

## Function source and string conversion (TS-023A, pending independent review)

Every parse invocation owns one immutable SourceText record. Lexer tokens carry
UTF-16 half-open offsets independently of decoded token text and diagnostic
locations. Function AST nodes retain the keyword-to-closing-brace range; hoisted
and expression closures pass the same range into their Callable record. Nested
closures keep the source alive without a global current-source cache. Trusted
host AST callers must explicitly pass null when source is unavailable. The factory
rejects non-integral or out-of-bounds non-null ranges as host faults.

Function.prototype.toString returns that exact slice or a bounded NativeFunction
spelling. Builtins retain an immutable initialName independently of mutable guest
name/length properties. Trusted names accept ASCII IdentifierName (keywords
included), empty text, and the existing [Symbol.toPrimitive] name; invalid names
are host faults, including raw records encountered during stringification.

The body performs no guest Get, coercion, receiver call, or tick. Ordinary call
entry guards and Realm restoration still apply. Default/number ToPrimitive now
costs three lookup ticks and two sequential calls; string/key conversion costs
two ticks and one call. Ordinary method replacement/deletion remains observable;
saved methods read metadata even after relinking. Explicit Object.toString tags
and diagnostic console display are unchanged. No syntax, Function constructor,
name inference, accessors, or Number formatter is added. Source retention is bounded
per input by the existing 100000-unit limit, not by an aggregate heap quota.

The accepted [design](function-string-conversion.md) supplies normative and pinned
engine evidence. [Implementation matrix and validation](validation/ts-023a/README.md)
record both host lanes, migrations, and the test-only compiler reduction.


## Abstract equality (TS-024A, pending independent review)

The iterative isLooselyEqual operation reduces only represented Value kinds.
Same-kind identity returns before hooks; null/undefined match each other,
while nullish/object pairs remain false without conversion. Booleans reduce
to numbers, string/number pairs use the existing numeric-string scanner, and
only string/number/symbol against an object invokes default-hint ToPrimitive.
Every continuation decreases a documented weight; guest reentry uses existing
shared guards. Symbols never undergo numeric conversion.

The evaluator captures both operands in source order before passing right/left
to the fixed-2025 algorithm. Inequality negates only successful results. Strict
equality, SameValue, truthiness and primitive-only converters are unchanged.
No BigInt, HTMLDDA, implicit boxing, other syntax or methods are added.
The existing parser nesting diagnostic is preserved at 1:128 for R18, correcting
the proposal's 1:129 oracle; acceptance of this documented correction is pending.
See [matrix mapping and validation](validation/ts-024a/README.md).

## Guest delete (TS-025A, pending independent review)

Delete uses unconditional strict-delete semantics in the limited language profile:
identifier operands (including parentheses) fail during parsing, and false from
internalDelete becomes a guest TypeError at the delete token. Directives remain
inert; this does not establish full strict Scripts or sloppy binding deletion.

The evaluator captures a property Reference once and never reads its final
property. The new deleteReference helper boxes the captured base before converting
the deferred key, then calls internalDelete exactly once. Base/key expression
errors, conversion throws and deletion throws preserve their original records.
Nonreference operands evaluate normally and then produce true. General member
reads/writes remain object-only; primitive boxing is limited to deletion.

The fixed 2025 order and pinned engine evidence in [the accepted design](delete-operator.md)
were retained without algorithm changes. Array length and String virtual indices
remain nonconfigurable; raw internalDelete still returns normal false. Deletion
adds no hidden conversion budgets, call limits, Realm resets or target GetValue.
[Implementation evidence and matrix mapping](validation/ts-025a/README.md).

## Primitive property reads and successful reference keys (TS-028A)

Following the accepted [fixed-2025 design](primitive-property-reads.md), GetValue
uses ToObject before key conversion and saves only the successfully converted
string/symbol Value. It dispatches with the original base and operation location,
including when a temporary wrapper was necessary. A dispatch failure keeps the
saved key; a conversion failure does not. Neither the wrapper nor the result is
cached. PutValue and binding reads remain byte-for-byte unchanged.

The dedicated driver instruments actual wrapper factories, rather than prototype
Get overrides that ordinary descriptor lookup would bypass. Its expected values,
traces, locations and work limits are literal semantic oracles. It tests temporary
wrapper Realm selection separately from a foreign method's defining Realm and
native default64 recursion separately from small limits. Existing code supplies
all guard/Realm cleanup; no new compiler workaround or built-in is introduced.
See [validation and migration audit](validation/ts-028a/README.md). Windows x64 and
the represented-Value subset remain the tested boundary.


## Property assignment boxing and Receiver (TS-029A, 2026-11-02)

The accepted [assignment design](property-assignment.md) applies existing ToObject
and ToPropertyKey in PutValue, saves only a successful key, then calls internalSet
exactly once with the original base Value. The small local false-to-TypeError
translation preserves operation location and exact RHS/abrupt identities. Calling
the wrapper set convenience method would replace the Receiver, so that method is
unchanged and is not used here. This supersedes the historical TS-025/TS-028
object-only write restriction above without changing their historical evidence.

GetValue, binding writes, evaluator capture/guards, parser, Realm factories,
internalSet/set and exotic definition algorithms are unchanged. No new syntax,
built-ins, accessors/proxies or compiler workaround is introduced. Temporary
wrappers are fresh per attempt in the active Realm; successful key conversion
remains cached even after failed dispatch. Explicit RHS/key effects survive
failed writes, including Array partial shrink.

[Implementation evidence](validation/ts-029a/README.md) records 31 static-only and
separate coverage gates and the frozen 146-row mapping. Independent coordinator review corrected R30 from6 to5 ticks: identifier
callees use reference/GetValue directly, with no evaluate tick. The historical
matrix and failures remain retained. Runtime ticks are unchanged; implementation
acceptance still requires independent review.

## Arithmetic compound assignment (TS-030A, 2026-11-02)

Exactly +=, -=, *=, /= and %= use a separate compound Expr with a binary-op union. Evaluation captures one reference and old Value before the RHS, then calls the existing binary and PutValue helpers. This makes the extra Get visible without lowering to duplicate target evaluation or introducing a fictional binary-node tick. Successful key conversion is reused; primitive boxing is repeated for Put while preserving the original Receiver. Captured object identity preserves later RHS mutations of conversion methods. Other compound families and updates remain excluded. Existing binary/reference/helper semantics are unchanged. See [design](compound-assignment.md) and [implementation evidence](validation/ts-030a/README.md); independent acceptance remains the coordinator's decision.
