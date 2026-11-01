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
| `src/realm.ts` | `new Realm(output)` creates an independent global environment and console objects. `registerBuiltin(target, name, invoke)` allocates an ordinary callable object with a uniform receiver/args/location signature. |
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
accessors, deletion, enumeration, or guest reflection APIs.

`Callable` is guest parameters/body/captured environment, or a builtin callback.
`Evaluator.call(callee, receiver, args, loc)` is the shared call boundary. Arguments
are evaluated left-to-right, including excess arguments, before callability is
checked; a failure resolving the callee prevents argument evaluation. Guest calls
allocate parameter bindings and instantiate the body. Falling off returns undefined.

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

`defineOwnProperty(key, DataDescriptorUpdate): BooleanCompletion` returns
`{ type: "normal", value: boolean }`. The payload is a host boolean, not a guest
Value. Ordinary data-only validation cannot call guest code or throw a guest
exception. Rejection is false. `preventExtensions()` has the same result shape
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
Deletion/key-list interfaces remain unfrozen and TS-004C remains blocked.

The compiled host driver prints one fixed success line and throws on assertion
failure. Both lanes register it; its guest fixture is read at runtime and executed
in a seeded realm. Source references, design comparison and validation are in
[TS-004B evidence](validation/ts-004b/README.md).
