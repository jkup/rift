# TS-005P: array prerequisites (proposal awaiting coordinator review)

2026-11-01; inspected Rift base `56edcbe912aeabc0bb41785fb7bc802fece28e68`.
This document freezes nothing. No arrays, conversions or runtime interfaces are
implemented by this task. TS-005A remains blocked pending review and prerequisites.

## Recommendation and measured feasibility

Use `GuestArray extends GuestObject`, overriding only `defineOwnProperty` for
the proposed data-only array scope. Retain the same private descriptor Map and
ordinary prototype/receiver machinery. Store `length` as a real own data
descriptor, not a second mutable numeric slot. Holes are absent Map entries;
present guest undefined remains a descriptor containing `UNDEFINED`.

| Model | Cost and evidence | Recommendation |
|---|---|---|
| Class override | Follows the existing `target.defineOwnProperty` call in ordinary Set; `super.defineOwnProperty` supplies validated ordinary storage without exposing slots. New isolated probe demonstrates base-typed dispatch, inherited Set, distinct receiver, ordinary fallback, false, throw, and exactly one override per call. | Adopt for this batch. |
| Explicit object-kind switch | A single `defineOwnProperty` dispatcher could switch on a readonly ordinary/array tag and delegate to separate algorithms. Existing enum/switch probes support the language construct, but this exact integrated design was not measured. Requires a new tag and routing seam, and more care to keep ordinary storage entry points internal. | Valid fallback if integrated subclass compilation fails; no evidence currently justifies it. |

Measured: `probes/array-prerequisites/dispatch.ts` passes seven assertions in Node
26.13.0 and scriptc 0.4.7 static-only native output; coverage is **33/33 static**.
The probe's special object only adds 10 or returns a completion: it is deliberately
not an array implementation. It establishes the missing dispatch capability, not
module-scale integration or array correctness. See [evidence](validation/ts-005p/README.md).
The original object and dispatch probes did not exercise subclass overrides.

## Proposed APIs and migration map

First prerequisite, before arrays (signatures are proposals):

```ts
// runtime.ts: replace the old return annotation and add a required location.
GuestObject.defineOwnProperty(key: PropertyKey, desc: DataDescriptorUpdate,
    loc: Location): InternalBooleanCompletion;
// GuestArray later overrides this exact signature, calling super for ordinary work.
// No location needed for ordinary delete: arrays inherit its non-calling behavior.
GuestObject.internalDelete(key: PropertyKey): InternalBooleanCompletion;

// Narrow failure's existing annotation: every implementation path already throws.
failure(name: string, message: string, loc: Location): ThrowCompletion;

// conversion.ts: host number payload, never a boxed guest Value result.
type NumberCompletion = { type: "normal"; value: number } | ThrowCompletion;
toNumber(value: Value, loc: Location): NumberCompletion;
toUint32(value: Value, loc: Location): NumberCompletion;
stringToNumber(value: GuestString): number;

// array-object.ts, second prerequisite:
class GuestArray extends GuestObject {
    constructor(); // own length = +0; writable true, enumerable/configurable false
    override defineOwnProperty(key: PropertyKey, desc: DataDescriptorUpdate,
        loc: Location): InternalBooleanCompletion;
    private setLength(desc: DataDescriptorUpdate, loc: Location): InternalBooleanCompletion;
}
```

An empty constructor avoids a competing unchecked length initialization API.
Seed a nonzero length through validated DefineOwnProperty in host tests. Constructor
initialization must explicitly use the base operation and assert normal true.
Keep descriptor storage private. Base `defineOwnProperty` still never calls guest
code, but its public annotation must permit subclass throws. Do not widen all
normal-only results or introduce return/break/continue into internal operations.

Current callers and shortcuts, located by
`rg -n 'defineOwnProperty|\.define\(|propertyStorage|prototypeSlot|internalSet|internalGet' src test`:

| Base location | Required treatment |
|---|---|
| `runtime.ts:125-145` ordinary Set | Rename `_loc` to `loc`; pass it on both receiver DefineOwnProperty calls. Return the full result. Keep lookup-base writability and receiver-own checks before dispatch. Never write receiver slots directly. |
| `runtime.ts:152-156` strict `set`, `putValue:190` | Already propagate throw and translate only normal false to TypeError; preserve this. RHS is assignment result, not converted length. |
| `runtime.ts:158-163` `define` convenience | Keep its ordinary bootstrap signature for now; pass a synthetic host location, check `type` before `.value`, and make either throw or false a host initialization fault. Guest array writes must use completion-aware operations, never this wrapper. |
| `runtime.ts:183` getValue, `evaluator.ts:140` literal define | getValue needs no primitive-stage change. Literal creation remains ordinary, so its validated bootstrap helper stays valid; future computed/accessor literal work must revisit it. |
| `realm.ts:24`; `builtins/number.ts:7-14,29-30` | Bootstrap convenience callers keep their signatures; inspect after helper migration. Number predicates remain noncoercing. |
| `test/object-descriptors.ts` all direct definitions; `test/object-keys.ts:32,75`; `test/object-prototypes.ts:51` | Supply location. Result helpers must accept InternalBooleanCompletion and assert normal before reading boolean. Replace the currently unchecked prototype-test definition with an assertion. |
| `test/realms.ts`, descriptor/key/prototype test `.define` calls | Exercise the updated validated bootstrap helper; no semantic API fork. |
| `runtime.ts:38,44,48-51,58,77-101` storage operations | Snapshot inspection, ordinary own lookup/delete/keys and base definition may retain direct storage. Array overrides must enter the validated base definition, never mutate Map directly. |
| `runtime.ts:119,130` Get/Set lookup slots; `121,135` prototype traversal | Valid for arrays because their GetOwnProperty, GetPrototypeOf, Get and Set stay ordinary. No change needed for this limited exotic. Document the restriction; proxies/custom Get/Set/accessors require a later completion-aware dispatch redesign. |
| `runtime.ts:106,111,113` prototype identity/cycle/update slots | Valid with ordinary array prototypes; preserve iterative traversal. Future exotic GetPrototypeOf needs a separate design. |
| `runtime.ts:147-150` trusted `get` wrapper | Host inspection only, already detects abrupt completion. No semantic caller may use it to bypass propagation. |

There are no external slot writes in `src`. `properties` is detached inspection,
not a mutation API. `ownPropertyKeys` is a detached string list; use it to select
own array indices for truncation, not inherited properties. An ordinary base Set
with an array receiver must dispatch to the array; an array base Set with an
ordinary receiver must define on the ordinary receiver without growing the base.

## Primitive conversion boundary

Stage one covers all existing primitive Value variants. Undefined becomes NaN,
null/false become +0, true becomes 1, numbers preserve their payload (including
-0/NaN/infinities), and strings use the exact grammar below. Objects initially
return a runtime TypeError diagnostic explicitly saying
`object-to-primitive conversion unsupported`; this is a temporary unsupported
feature boundary, **not** the specified behavior for objects. No host `Number`
on a Value wrapper or GuestObject, no display-string conversion, no guest calls.
Symbols and BigInts do not exist in Value yet; both will require ToNumber TypeError
when introduced (unlike the explicit Number constructor's BigInt allowance).

For strings, validate the entire UTF-16 input after trimming only these code points:
U+0009, U+000B, U+000C, U+0020, U+00A0, U+1680, U+2000–U+200A, U+202F,
U+205F, U+3000, U+FEFF, and line terminators U+000A, U+000D, U+2028, U+2029.
U+0085, U+180E, U+200B and lone surrogates are not whitespace. Whitespace is
allowed only outside the token; an all-whitespace string is +0. This list follows
the [2025 lexical grammar](https://tc39.es/ecma262/2025/multipage/ecmascript-language-lexical-grammar.html#sec-white-space).

Exact accepted token forms (notation below is a design for a bounded scanner,
not a proposed dependency on regex execution):

```text
D = ASCII 0..9; H = ASCII 0..9, a..f, A..F
E = ('e' | 'E') ('+' | '-')? D+
decimal = ('+' | '-')? ( 'Infinity' | D+ '.' D* E? | '.' D+ E? | D+ E? )
nondecimal = ('0x' | '0X') H+ | ('0o' | '0O') [0..7]+ | ('0b' | '0B') [0..1]+
token = decimal | nondecimal
```

Leading zeros are decimal, not legacy octal. Signs do not apply to nondecimal
forms. No separators, `n` suffix, embedded whitespace, trailing junk or partial
parsing. `NaN` is not a valid token but invalid strings return NaN anyway.

Proposed numeric backend: a small scanner enforces acceptance first, then one
isolated host `Number(validatedToken)` operation supplies binary64 rounding.
This explicitly reuses a host numeric primitive, not host object coercion. Do not
use parseFloat/parseInt or digit accumulation as a decimal rounding algorithm.
The existing numbers probe covers only a few Number strings. Approval of this
backend is conditional on new expected-result Node/native tests for all whitespace,
signed zero, overflow, underflow, long nondecimal values and rounding boundaries.
If it fails, stop with a reduced compiler/numeric issue; do not silently narrow the
grammar or claim complete conversion. Implementing a correctly rounded decimal
library would be separate scope. [String numeric grammar and ToNumber](https://tc39.es/ecma262/2025/multipage/abstract-operations.html#sec-tonumber).

ToUint32 must call ToNumber once, propagate throw, map NaN/infinities/either zero
to +0, truncate finite values toward zero, and take nonnegative modulo 4294967296.
Normalize a zero remainder to +0. The readable arithmetic implementation avoids
signed `| 0`; a new test must cover negative fractions and large finite operands.

## Length and index algorithms to implement later

Array index classification must reuse `arrayIndex`, whose maximum is 4294967294.
`4294967295`, `-0`, `01` and `1e0` are ordinary property strings. For a valid
index, reject extension at/above length if length is nonwritable; otherwise perform
ordinary definition, then grow length to index+1 only after successful definition.
Changing an existing element below a frozen length can still succeed. Deleting
elements never shrinks length. Nonextensibility still permits updating length and
existing elements; it prevents filling a hole.

Length proposal, following [ArraySetLength](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-arraysetlength)
and engine262 source below:

1. If value is omitted, delegate the descriptor to ordinary definition. Otherwise
   copy it; never alter the caller's descriptor.
2. Call ToUint32 on the original value, then separately ToNumber on that original
   value. Propagate each abrupt result immediately. Compare with SameValueZero;
   mismatch throws guest RangeError. Thus -0 is valid and stored as +0.
3. Only now read the current length descriptor. Future conversion calls can mutate
   the array, freeze its length, or delete/create elements. Do not cache old length
   before conversion or replace the second conversion with its first result.
4. For equal/growing lengths, ordinary-define the normalized descriptor. For
   shrinking, reject a nonwritable old length. If requesting writable false, keep
   it temporarily true. Ordinary-define the smaller length; rejection here causes
   no deletion and no delayed freeze.
5. Delete present own indices at/above new length in descending numeric order.
   Stop at the first nonconfigurable index k; restore length to k+1, apply requested
   writable false, return normal false. Higher deleted indices stay deleted.
6. On success apply delayed writable false, if requested, and return normal true.

Select present own indices from the detached key list and reverse the numeric
prefix (or sort selected indices descending with an explicit comparator). Do not
iterate billions of holes or allocate storage proportional to length. Skipping
absent indices is valid for this ordinary-delete array model: no guest callbacks
can run during deletion. Do not generalize this to proxies. Internal false becomes
TypeError only at a throwing wrapper such as strict assignment; invalid length is
RangeError even for a reflection-style boolean operation. Ordinary Set can reject
a frozen receiver length *before* reaching conversion, whereas direct array
DefineOwnProperty still performs conversions before its ordinary flag checks.

## Future guest-call boundary (deferred, not a prerequisite to primitive arrays)

When object coercion is assigned, thread a per-execution context through semantic
operations instead of storing an evaluator/global current realm in every object:

```ts
type GuestCall = (callee: Value, receiver: Value, args: Value[], loc: Location) => ValueCompletion;
type OperationContext = { call: GuestCall }; // future additional budget state if needed
toPrimitive(value: Value, hint: "number" | "string", context: OperationContext,
    loc: Location): ValueCompletion; // normal result must be primitive
toNumber(value: Value, context: OperationContext, loc: Location): NumberCompletion;
toUint32(value: Value, context: OperationContext, loc: Location): NumberCompletion;
```

At that stage add required context before location to defineOwnProperty,
internalGet/internalSet, set, getValue and putValue and migrate their evaluator
callers together; do not add an optional context that silently bypasses calls.
The adapter for `Evaluator.call` must preserve current budgets/realm/this and
narrow its broad Completion to normal/throw; escaped return/break/continue is a
host fault. Use a full-parameter arrow per compiler contract. Bootstrap/host
inspection can use a context whose call throws a host initialization fault.

ToPrimitive first performs completion-aware GetMethod for @@toPrimitive and calls
it with the correct hint; an object return is TypeError. Otherwise numeric hint
tries callable valueOf then toString, reading each only when reached, calling
with the input as receiver, accepting the first primitive. Propagate accessor and
call throws without wrapping them. Full support depends on symbols/well-known
symbols and accessor-aware reads; a data-only valueOf subset must be labeled as
such. Preserve separate conversions in ArraySetLength so later support needs no
algorithm rewrite. This future context API is an unmeasured design, not an
instruction to build a framework now.

## Expected-result matrix (acceptance requirements, not measured Rift support)

Each row needs independent expected assertions in both implementation lanes.
Use normal boolean checks and descriptor snapshots; assert error phase `runtime`
and name, not host-dependent message text. `L` means own length; W its writable flag.

| Input / setup | Expected |
|---|---|
| ToNumber undefined/null/false/true | NaN/+0/+0/1 |
| Number -0, NaN, ±Infinity | Preserve each; ToUint32 yields +0 for all four |
| Strings empty, whitespace-only, `-0`, `+Infinity`, `-Infinity` | +0,+0,-0,+Infinity,-Infinity |
| Every listed whitespace individually around `1`; U+0085/180E/200B instead | 1 for allowed set; NaN for excluded set |
| `01`, `.5`, `5.`, `1e+3`, `0x1f`, `0O17`, `0B101` | 1,.5,5,1000,31,15,5 |
| `+0x1`, `-0b1`, `1_0`, `1n`, `1x`, `1 2`, `0x`, `.`, `1e`, `infinity`, surrogate | NaN |
| `1e309`, `-1e-999`, `5e-324`, `9007199254740993`, `0x20000000000001` | +Infinity,-0,5e-324,9007199254740992,9007199254740992 |
| ToUint32 -1.9,4294967297,4294967295,2**53 | 4294967295,1,4294967295,+0 |
| Object conversion in initial stage | Explicit unsupported runtime TypeError, no host conversion |
| Empty array | Own L=+0 W=true E=false C=false; no indices |
| Define `2` with guest undefined | L=3; 0/1 holes, 2 present undefined |
| Set through ordinary parent with array receiver at `4` | Receiver L=5; lookup parent unchanged |
| Set through array base with ordinary receiver | Ordinary receiver gets property; array unchanged |
| Inherited index on prototype, hole in array | Get sees inherited value; own lookup absent; shrink never deletes prototype |
| Define `4294967294`; then `4294967295`, `01`, `-0` | L=4294967295 after first; remaining strings do not grow it |
| L=3; length value -0, null, false, empty string (fresh each) | true, L=+0; all configurable own indices removed |
| length value true / `2` / `0x10` (fresh each) | true, L=1/2/16 |
| length value undefined/NaN/±Infinity/-1/1.5/4294967296/`x` | RangeError; no array-algorithm mutation |
| L=3 W=false; direct define length=3 vs Set length=3 | Define true; Set false (strict wrapper TypeError) |
| L=3 W=false; direct define length=NaN vs Set length=NaN | Define RangeError; Set false before conversion |
| Frozen L=3; create index 3, update writable index 1, fill hole 0 | false, true, true if extensible |
| Nonextensible array; hole fill, writable existing update, length grow | false, true, true; growth creates holes only |
| Sparse L=4294967295, configurable index 4294967294; shrink to 1 | true, L=1, high index gone; bounded by present properties |
| L=6; configurable 5 and 1; nonconfigurable 3; shrink to 1 | false, L=4, 5 deleted, 3 and 1 retained, W=true |
| Same, descriptor also writable=false | false, same elements/L=4, W=false |
| Successful shrink plus writable=false | true, target L, W=false; later growth rejected |
| Shrink descriptor enumerable=true or configurable=true | false before deletions; original L, elements and W intact |
| No value, writable=false; then writable=true | true then false; no conversion/deletion |
| Delete highest configurable element | true; L unchanged |
| Future object valueOf returns 2 then 2 | Two calls, true, L=2 |
| Future valueOf returns 2 then 3 | Two calls, RangeError; retain any conversion side effects |
| Future valueOf returns 4294967298 then 2 | Two calls, true, L=2 (first conversion wraps) |
| Future first call throws / second call throws | One/two calls respectively; exact throw propagated; no subsequent algorithm mutation |
| Future second call changes L to 10, returns 2 | Read L=10 after calls, then truncate to 2, subject to current flags/elements |
| Future second call freezes L=4, returns 2 | normal false after both calls; L=4 W=false |

Object rows remain deferred acceptance examples until the call boundary is built;
the current dispatch probe measures none of these semantic rows.

## Sources inspected and design influence

Specification baseline: **ECMA-262 16th edition, June 2025**, stable versioned
links above; consulted 2026-11-01. Also checked the live draft ArraySetLength and
ToNumber pages; freeze against the stable edition rather than a moving draft.

Engine source: **engine262 `d553e7b52501fbc47eae981c8d0fa7a5c26d0171`**, resolved
with `git ls-remote ... HEAD` and read through the GitHub connector on 2026-11-01:

- [array-objects.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/array-objects.mts): array-specific DefineOwnProperty, repeated conversions, descending present-key deletion and delayed freezing support the proposed storage algorithm. It installs method functions on objects; Rift should use the tested class override rather than copy that representation.
- [objects.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/objects.mts), OrdinarySetWithOwnDescriptor: receiver definition dispatch, not lookup-base mutation. Rift keeps iterative ordinary traversal for stack safety.
- [type-conversion.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/type-conversion.mts): completion-aware ToPrimitive/Get/Call staging is useful. Do not copy its separate StringToNumber helper using parseFloat; that helper is not a model for exact numeric-string acceptance. No upstream implementation code is copied here.

## Bounded next tasks for coordinator approval

1. **Primitive numeric conversion prerequisite.** Own new conversion module and
   compiled host conversion driver plus necessary registration. Implement the
   specified primitive boundary, exact scanner and tested numeric backend. Narrow
   failure's annotation if needed. No operators, Number constructor, arrays or
   object conversion. Run all existing gates plus the conversion matrix; unresolved
   native rounding/grammar failures block the next task.
2. **Definition completion/dispatch integration prerequisite.** Widen definition,
   add location, migrate the caller table and host assertions atomically. Add a
   compiled test subclass returning false/throw through actual ordinary Set and
   strict assignment, including distinct receiver and no mutation of lookup base.
   No arrays or object coercion. Keep private storage and existing iterative paths.
3. **TS-005A array storage.** After both prerequisites and API freeze, add
   GuestArray and compiled host storage tests for all non-object matrix rows,
   including sparse high indices and partial truncation. No syntax, methods,
   species, Object reflection or callback support. Reject object length conversion
   explicitly. Update scope docs; run all gates and static coverage for each driver.

Open decisions for review: approve host Number only behind exact string scanning
and new backend tests; accept the temporary object-conversion diagnostic boundary;
approve the subclass and location/completion signatures. Native integrated class
dispatch and full numeric rounding coverage remain implementation acceptance work.
Full object conversion and array methods remain separate blocked work; no successor
assignment or framework implementation is authorized by this proposal.
