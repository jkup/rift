# Array string conversion: TS-022P design

2026-11-02; design for independent review, not implemented support. Assignment
base `3c27e10`, dispatch checkout `38ca424`, existing
`codex/primitive-computed-keys`. Accepted runtime baseline remains `14e3d9d`:
independently 164/164 cases on each host, 23 static-only/separate coverage gates.

## Decision and boundary

Propose one atomic TS-022A implementing generic Array join and toString, intrinsic
capture, and their precise test migrations. Keep the methods separate and readable.
Use the existing explicit boxing, completion, property and evaluator interfaces.
No new ambient state, host array conversion, species, constructor, implicit member
boxing, accessor support, formatter, or unrelated Array method is authorized.

Stage cycle compatibility separately: TS-022A follows the ordinary recursive call
path until the shared resource guard fails. It does **not** promise V8's empty
contribution for repeated receivers. This is a visible staged limitation, not a
claim that ECMA-262 mandates a cycle exception. Finite nested conversions work
within the budget. No future cycle task is started by this document.

## Evidence and choices

Normative reference: fixed [ECMA-262 2025, 23.1.3.18 and 23.1.3.36](https://tc39.es/ecma262/2025/multipage/indexed-collections.html#sec-array.prototype.join),
read 2026-11-02. Join boxes, snapshots length, converts separator, then reads and
converts successive elements; nullish elements contribute empty text. toString
boxes, fetches join and calls it or the intrinsic Object fallback. Neither
algorithm contains a repeated-receiver set. These are generic methods. Additional
resource bounds below are Rift policy, not array length restrictions in this spec.

Source inspection, not engine execution:

* [engine262 ArrayPrototype.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/ArrayPrototype.mts),
  revision `d553e7b52501fbc47eae981c8d0fa7a5c26d0171`, blob
  `c85086e2f2adf94d40c9d2cb897c8222083b701c`: ArrayProto_join,
  JoinIndexedProperties, ArrayProto_toString and bootstrapArrayPrototype. Adopt
  explicit guest Get/Call and intrinsic lookup. Its newer shared join helper is
  unnecessary for two small methods here; no generator or BigInt machinery copied.
* [V8 array-join.tq](https://github.com/v8/v8/blob/13.0.245/src/builtins/array-join.tq),
  release `13.0.245`, blob `5d0edc48e9d328f28d542c9aba53336363f3006a`:
  CycleProtectedArrayJoin converts separator before checking its join stack, and
  cleans the stack on normal and exceptional exits. Repeated receivers contribute
  empty text. Its explicit historical maximum-array-length check is rejected for
  Rift's generic receiver path. Its fallback calls ObjectToString directly;
  Rift must retain context.call so its observable resource/Realm model is honored.

No upstream code copied. V8 is evidence for a mainstream convention, not a
normative oracle; engine262's moving-spec structure does not replace the fixed
2025 contract. Browser stack and allocation optimizations are not proposed.

## Existing interfaces inspected

Paths below are relative to typescript/ at dispatch checkout.

| Source | Relevant invariant |
|---|---|
| src/array-object.ts GuestArray | length in ordinary descriptor storage; indices sparse; only definition is exotic; inherited reads remain ordinary |
| src/runtime.ts GuestObject.internalGet | walks prototypes, returns completion; data-only; no automatic tick or accessor invocation |
| src/array-like.ts lengthOfArrayLike | one length Get, captures Value, number-hint ToPrimitive then ToLength; no outer Get tick |
| src/object-conversion.ts toObject | object identity retained; primitive wrappers use active Realm; nullish fails; no ticks/hooks |
| src/conversion.ts toString/StringCompletion | primitive-only; symbol TypeError; typed numeric payload backend; must remain primitive-only |
| src/primitive-conversion.ts | symbol protocol lookup costs one tick; each ordinary candidate costs one tick; calls use context; fresh reads |
| src/realm.ts registerBuiltin/createBuiltin | returns installed Value; fresh callable in defining Realm; validated metadata |
| src/builtins/object.ts registerObjectToString | currently returns void, loses installed intrinsic identity; tag Get costs one tick |
| src/evaluator.ts call/tick | calls guarded before increment, active Realm restored in finally, steps monotonic including failed tick |
| src/array-map.ts | one per-slot tick precedent, including holes; its HasProperty/species/array-result limit must not be copied |
| src/primitive-objects.ts GuestStringObject | explicit boxing supplies UTF-16 indexed properties and length |

Host subclasses overriding internalGet are instrumentation seams, not evidence
that guest accessors or proxies exist. Assertions about order must use these
seams plus guest conversion hooks without expanding the supported property model.

## Frozen API and intrinsic identity

Add src/builtins/array.ts:

```ts
export function registerArrayConversions(realm: Realm, objectToString: Value): void;
```

Register `join` first (length 1), then `toString` (length 0), with full four-argument
Builtin callbacks. Keep join's loop inside its builtin or a private helper; no
public recursive object-only shortcut. A private helper
`toElementString(value: Value, context: OperationContext, loc: Location): StringCompletion`
composes toPrimitive(value, "string", context, loc) then primitive toString.
It also serves separator conversion (nullish-element elision stays in the loop).
Do not broaden the exported primitive converter or use host String on a Value.
Use stringConcat for GuestString concatenation; numeric index spelling may use
the existing typed numberToString backend, with k a safe nonnegative integer.

Change `registerObjectToString(realm: Realm): Value` to return the exact Value
from registerBuiltin. Realm construction saves that return in a constructor-local
const and passes it to registerArrayConversions after Object registration. The
toString closure captures this immutable binding. No public lookup during capture,
no duplicated builtin, no mutable module or Realm-global registry is required.
Initially this captured object is identical to the public Object prototype method;
after public replacement/deletion it remains the original object. Capture one per
Realm; different Realm method identities differ. Internal callable state is
readonly. Mutating the function's guest metadata cannot replace its body.

This policy is supported by the intrinsic step in the fixed spec and engine262's
intrinsic access. In Rift the defining-Realm callable is explicit and context.call
already activates it. Tests must observe the actual fallback callee identity via
an Evaluator call observer, not merely equal tag text. The captured original must
be passed to context.call; invoking its host callback directly is prohibited.

Method descriptors: writable true, enumerable false, configurable true. Each
function's name/length: nonwritable, nonenumerable, configurable; proto is the
defining Realm functionPrototype; no own prototype property. Array root remains
a genuine empty GuestArray with original length descriptor. Initial own key order
becomes `length,join,toString`; inherited Object.valueOf is unchanged.

## Execution and charged boundaries

Join first calls toObject. On success, charge **one tick immediately before**
lengthOfArrayLike. This charges length Get locally without changing that shared
helper or its other consumers. Hold the resulting length for the entire call.
Use args[0] or UNDEFINED; undefined selects comma. Otherwise use the private
effectful string helper, even at length zero. Ignore further arguments.

For k from zero to the captured length minus one, charge exactly one tick before
the iteration's separator append and indexed Get. Get key k on the boxed receiver
Value; never HasProperty, snapshot entries, iterate own keys, or skip holes. For
null/undefined append nothing; otherwise call the effectful string helper and
append its result. Fetch each element only when reached. No final tick.

toString boxes, charges one tick before Get("join"), and forwards the fetched
callable or captured intrinsic through context.call with the **boxed object** as
receiver and `[]` arguments. Ignore all supplied arguments. Return the forwarded
Value unchanged, even an object, symbol or undefined. The surrounding ToPrimitive
operation decides whether an object result requires another candidate or failure.
No toString-body length access or separator conversion is allowed.

Boxing/primitive conversion/concatenation/call entry add no independent steps.
Effectful ToPrimitive retains its own existing lookup charges and guest AST work.
For plain primitive length/elements and default separator: direct join of length n
costs 1+n steps; Array toString costs 2+n; default/number ToPrimitive costs 5+n;
string-hint ToPrimitive costs 4+n. These totals exclude evaluating source AST.
Object fallback costs two steps (join lookup and intrinsic tag lookup), two
simultaneously active calls. Empty Array toString also needs two active calls.
Nullish receivers fail before a body tick, after ordinary call-entry guard.

Length getter/conversion failure prevents separator work. Separator failure
prevents indexed reads. A slot failure prevents later slots. Return the original
ThrowCompletion unchanged from tick/Get/conversion/Call, preserving payload,
diagnostic and location; newly generated errors use the supplied call location.
Host exceptions escape as faults; existing evaluator finally blocks release every
entered call and restore the caller Realm. Do not catch/relabel a host fault as a
guest error or reset steps on unwind.

No length cap is added: ToLength can yield 2^53-1 for a generic object, although
GuestArray itself has its existing uint32 length rules. A huge sparse generic
input consumes iteration ticks and fails the execution budget, not an invented
array-length check. Index arithmetic stays exact for the loop's reachable range.

Steps do not bound output bytes: a separator/element can already be enormous;
repeated concatenation may allocate/copy much more memory than output length.
This stage offers no cross-host OOM recovery, allocation bound, or throughput
claim. No speculative rope/chunk optimization, arbitrary output limit or host
exception translation is hidden in this work. A later memory policy needs its
own contract and evidence.

## Recursion and reentry contract

Every nested array is converted through ordinary string-hint ToPrimitive, its
current toString and current join. No direct flattening. Therefore redefinitions,
symbol hooks and foreign methods remain visible. Both self and mutual cycles,
and unbounded separator/element reentry, consume shared calls and steps until
the first applicable guard fails. They do not bypass work as empty strings.

For direct join of `a` with a[0]=a, primitive length 1, maxCalls=2 and ample steps:
outer join costs two ticks; element ToPrimitive costs two; inner Array.toString
costs one; attempted inner join is denied. Expect runtime RangeError
`call depth limit exceeded`, steps=5, calls=0, original Realm restored. With
maxCalls=1 expect steps=4. Mutual cycle a[0]=b,b[0]=a with maxCalls=4 expects
steps=10 and the same cleanup. All locations are the supplied loc in host-built
fixtures. A finite two-level `[[1]]` direct join requires three active calls and
seven steps. Distinct arrays with shared subarrays are converted each time.

A future compatibility guard, if separately approved, must be evaluator/operation
owned and shared across foreign Realm calls, distinguish active receivers from
previously visited receivers, define its point relative to length and separator
effects, and pop only successfully pushed entries in finally on guest/host exits.
It needs generic-receiver and separator-reentry decisions, identity tests and
budget charges. A mutable Realm set would fail cross-Realm sharing; a module set
would leak across evaluators. Neither is approved. This stage creates no such
state and therefore has no guard-specific cleanup.

## Fixed semantic acceptance matrix

These are proposed oracles, **not test results**. J means borrowed saved Array
join, T saved Array toString; call via Evaluator with explicit receiver when guest
syntax lacks factories. Default prototypes unless stated. Exact text is quoted.
Error rows require runtime phase and supplied loc; sentinel throws require exact
completion identity. Hook traces are handwritten expectations.

| ID | Setup/action | Expected |
|---|---|---|
| J1 | J([], omitted), J([], undefined), J(Array root) | "" each |
| J2 | J([1,2], omitted/undefined/null/"") | "1,2" / "1,2" / "1null2" / "12" |
| J3 | length 3, only index 1="x" | ",x,"; three Gets, zero Has |
| J4 | [null,undefined,"",false,0,-0] | ",,,false,0,0" |
| J5 | [[1,2],[3]], separator ";" | "1,2;3"; inner uses comma |
| J6 | hole at 0, prototype index 0="p", length 2 | "p," |
| J7 | generic {0:"a",2:"c",length:3} | "a,,c" |
| J8 | generic length -1, NaN, undefined, 2.9 with 0="a",1="b" | "", "", "", "a,b" |
| J9 | explicit primitive "ab" and boxed "ab", separator "-" | "a-b" both |
| J10 | explicit string surrogate pair with separator "|" | first UTF-16 code unit + "|" + second code unit |
| J11 | explicit true, 7, symbol receivers, clean wrapper roots | "" each; no primitive stringification |
| J12 | null/undefined receiver and throwing separator | TypeError before separator hook |
| J13 | empty input, separator hook returns "x" | hook once then "" |
| J14 | empty input, symbol separator | TypeError cannot convert symbol to string |
| J15 | length hook logs L, separator logs S, elements log A,B | trace LSAB; element/separator hints "string", length hint "number" |
| J16 | length hook throws sentinel | exact throw; no S/index reads |
| J17 | separator throws sentinel | exact throw; one length Get, no index reads |
| J18 | [symbol] / [boxed symbol] | symbol-to-string TypeError (box protocol returns symbol) |
| J19 | element symbol hook returns "x" / symbol / object | "x" / symbol TypeError / cannot convert object to primitive TypeError |
| J20 | element toString returns object, valueOf returns 7 | "7", trace toString,valueOf |
| J21 | both ordinary methods return objects; null-root element | cannot convert object to primitive, later indices untouched |
| J22 | object element conversion returns undefined or null | "undefined" or "null"; only initially nullish elements elided |
| J23 | captured length 2, separator sets length=0 on array | ","; still Gets 0,1 |
| J24 | captured length 2, separator sets index 1="b", index 2="c" | with index 0="a": "a,b"; index 2 unread |
| J25 | element 0 returns "a", deletes own index 1 exposing inherited "p" | "a,p" |
| J26 | element 0 replaces index 1 with "z", extends to 3 | "a,z" with captured length 2 |
| J27 | element 0 shrinks array length 2 to 1 | "a," |
| J28 | length object's first hook replaces source length with 0, returns 2 | still two slots; one length Get |
| J29 | index Get sentinel throw at 1 | exact throw; index 2 not read |
| J30 | same object appears twice, hook counts and returns count | "1,2", no cached conversion |
| T1 | T([1,2], extra argument with throwing hooks) | "1,2"; argument never converted |
| T2 | join override returns object/symbol/undefined | exact returned Value; receiver object identity, zero args |
| T3 | join 0/null/undefined/ordinary noncallable object | intrinsic tag, no coercion of join |
| T4 | array join missing (delete inherited method too) | "[object Array]" |
| T5 | ordinary lookalike with Array proto, join noncallable | "[object Object]"; no Array slot inferred |
| T6 | boxed String, borrowed T, no callable join | "[object String]" |
| T7 | primitive String borrowed T; defining String proto has join observer | boxed String from defining Realm, fresh per call, [] args |
| T8 | fallback array with symbol toStringTag="Custom" / nonstring | "[object Custom]" / "[object Array]" |
| T9 | join Get throws sentinel / callable join throws sentinel | exact throw, no fallback |
| T10 | replace or delete public Object.toString in either Realm | fallback still captured defining-Realm function identity |
| T11 | save Array methods, replace/delete public Array methods | saved join works; saved T observes current receiver join |
| T12 | join Get returns callable F then mutates join to G | F called once; next T calls G |
| T13 | T null/undefined | ToObject TypeError, no join Get |
| T14 | callable join returns object under string-hint ToPrimitive; valueOf returns 9 | 9 after ordinary fallback; direct T still returns object |

## Realm, metadata, resources and consumer matrix

| ID | Scenario | Fixed expectation |
|---|---|---|
| R1 | fresh A/B method objects | distinct across Realms and join vs toString; metadata/descriptors/key order as above |
| R2 | mutation/deletion/nonextensible receiver/root | reads work; methods do not write receiver; mutation isolated to owner Realm |
| R3 | A evaluator calls B.T on C object with C.join | observer sequence B then C then B then A; same context and monotonic steps |
| R4 | A calls B.T, C object has no callable join | B captured Object builtin, exact identity, C tag lookup, A restored |
| R5 | A calls B.J on primitive String; B string root index/length instrumentation | wrapper B root, fresh identity; existing boxed C receiver remains C |
| R6 | guest throw, host fault, step exhaustion in length/separator/index/element/join/tag | no later effects, calls=0, A restored; host fault escapes unchanged |
| R7 | zero maxCalls for J/T | denied before boxing/Get/ticks, steps=0 |
| R8 | empty T with maxCalls=1 | one join-lookup tick then target call failure; no length Get |
| R9 | J length 2 with maxSteps=1 | length observed; failed second tick, no index read; steps=2 |
| R10 | J length 2 with maxSteps=2 | index 0 observed; failed third tick; steps=3; no index 1 |
| R11 | generic length 2^32 or Infinity, maxSteps=2 | index 0 then budget error; no upfront array-length error; no preallocation |
| R12 | direct J self/mutual and finite nesting | exact counts in recursion section; finite result "1" |
| R13 | separator hook recursively calls J with same separator; element hook recursively calls T | call guard failure, no state leak; original context/Realm restored |
| R14 | later independent call after failed conversion | calls restored; accumulated steps retained; separate Evaluator starts at zero |
| R15 | repeated shared subarray [[1],[1]] using same inner identity | "1,1", inner read twice; no visited cache |
| C1 | runtime-read [] + "", [1,2] + "", unary +[], +[2], +[1,2] | "", "1,2", +0, 2, NaN |
| C2 | runtime-read [] == 0, [2] * 3, [2] < [3] | true, 6, true |
| C3 | object key [] then [1,2], read/write/call/delete forms | keys "" and "1,2"; existing reference ordering preserved |
| C4 | lengthOfArrayLike({length:[]}), {length:[2]} | 0 and 2; same effectful conversion path |
| C5 | array length assignment from [], [2], [1,2] | 0,2, RangeError invalid array length; invalid write preserves storage |
| C6 | length assignment from array with changing join returning "2" then "3" | two fresh conversions, invalid length; no write |
| C7 | inherited Object.valueOf called on array | exact original object, zero body ticks; conversion proceeds to Array.toString |
| C8 | ordinary {}, Function, Number box stage controls | Object/Function tag defaults retained; Number default uses valueOf, string hint retains [object Number] |
| C9 | explicit null-root and both-object negatives | same TypeErrors/locations; primitive-only converters still reject all objects |

Runtime-read fixtures must obtain operands from guest bindings/host-seeded mutable
objects, not constant host folding. Record traces and locations independently of
stdout. Use strict fixed expectations for errors and budget boundaries, not only
Node/native agreement. Do not test guest getters using unavailable syntax.

## Migration inventory at dispatch checkout

Search evidence is retained in validation/ts-022p/inventory.txt. These sites must
be reviewed atomically; broad tag replacement is wrong.

| Site | Required disposition |
|---|---|
| test/realms.ts G17 around 142 | root keys length -> length,join,toString; split missing-method assertion so only Array join becomes present; constructor/map stay absent on all roots; valueOf identity stays |
| test/realms.ts W1 around 293 | update Array root keys only |
| test/fixtures/object-tostring.js:9 | [] + '' expected tag -> empty string; Function line 10 remains tag |
| test/object-valueof.ts V6/C around 197-226 | split [] from ordinary/Function: Array toString callee, empty result, steps 5 not 4; adapter event labels same but actual callee identity differs; tight pre-call guard unchanged |
| test/object-tostring.ts kind/tag cases 121-140 | preserve explicit Object builtin Array tags, callable Array priority, relinked Array and ordinary lookalikes; these are not default conversion tests |
| test/object-tostring.ts W-T6/T7/T8 315-359 | preserve ordinary object lookup/tag and two-conversion budgets (4/8/7), not Array operand; target being Array does not change operand conversion |
| test/fixtures/object-valueof.js | preserve array valueOf identity; inspect companion host checks, no tag migration |
| test/number-conversions.ts; boolean-string-conversions.ts; symbol-conversions.ts | preserve staged slot/hint protocol tests; Number.toString still absent |
| test/operation-context.ts; array-map.ts; array-like.ts; array-length-coercion.ts | existing explicit hook/resource expectations stay unless actual default Array operand is demonstrated; new methods do not globally tick Get or lengthOfArrayLike |
| test/primitive-conversion.ts and key/operator tests | retain explicit null roots/both-object negatives; add new default Array cases rather than weaken rejection assertions |
| docs/architecture-decisions.md and previous validation docs | future implementation adds current scope note; historical accepted evidence remains historical, not rewritten to new totals |

The inventory includes symbolic construction of tags (not just literal
`[object Array]`), inherited method assumptions and exact root own keys. No
production/integrated test migration is performed by TS-022P.

## Smallest next bounded task and validation

After independent approval, assign TS-022A as one writer: src/builtins/array.ts,
src/builtins/object.ts return signature, src/realm.ts capture/registration;
test/array-string-conversion.ts and runtime-read fixture; the four precise
migration sites above (realms has two sites); build/test harness registration only
as necessary for the new driver; current scope note, task status and retained
validation. Existing conversion/runtime/evaluator behavior should not change.
If compiler evidence forces wider work, stop at a retained reduction for review.

Require every J/T/R/C row, typecheck, runner, compiler probes, all existing 164
cases and any added cases under Node and rebuilt native; all existing 23 entry
gates plus any new driver gate must pass static-only build **and** parsed separate
coverage. Retain expected outputs, error locations, command/exit transcripts and
failure reductions. No pin/import/annotation workarounds without evidence; full
Builtin callback parameters. No native support claim from Node-only evidence.
Exact budgets above are design oracles awaiting both-host validation, especially
recursive stack safety; no new runtime test was executed in TS-022P.

Number formatting remains blocked and CL-005 reserved. Cycle compatibility,
allocation policy, guest accessor/proxy support and broader Array APIs remain
outside the proposed implementation. Commit/push design evidence, then stop for
independent coordinator review; do not start TS-022A here.
