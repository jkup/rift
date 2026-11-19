# Number prototype conversions: TS-021P design

2026-11-02. Design only, for independent review. Assigned base `051c88b`,
dispatch checkout `61a45c7`, existing `codex/primitive-computed-keys` branch.
Accepted runtime baseline is TS-020 `a3d74fd`: independently 164/164 cases on
each host and 23 build/coverage gates. This document adds no runtime support.

## Decision

Implement **Number.prototype.valueOf alone** in the next bounded task. Block
Number.prototype.toString until a conforming radix backend is separately
established. Do not register a decimal-only or integer-only toString and present
it as complete. Do not change compiler pins or write a new formatter as incidental
builtin work. The full future semantic contract below remains useful, but is
not authorization to implement the blocked portion.

Typed `value.toString(radix)` builds static-only and passes separate coverage
on scriptc 0.4.7. Runtime-supplied operands pass 84 fixed oracle cases; the
unchanged decimal `String(value)` shape passes 18. However, exact rational checks
reject 7/23 additional nondecimal fraction results in **both** hosts. Agreement
does not establish the fixed specification's formatting requirement. The small
reproducer is `0.3`, radix 3. Both produce
`0.0220022002200220022002200220022002`, whose mathematical value lies strictly
below the rounding interval for binary64 0.3. This is a semantic blocker, not a
static-lowering blocker. See [retained evidence](../validation/ts-021p/README.md).

## Sources and interpretation

Normative reference: fixed [ECMA-262 2025 Number methods, ThisNumberValue and
prototype](https://tc39.es/ecma262/2025/multipage/numbers-and-dates.html#sec-number.prototype.tostring)
(21.1.3, 21.1.3.6, 21.1.3.7, 21.1.3.7.1), plus
[Number::toString](https://tc39.es/ecma262/2025/multipage/ecmascript-data-types-and-values.html#sec-numeric-types-number-tostring)
(6.1.6.1.20). Consulted 2026-11-02. The 2025 algorithm, not a moving draft,
governs receiver/radix ordering and the formatting requirement.

Engine evidence: engine262 revision `d553e7b52501fbc47eae981c8d0fa7a5c26d0171`,
[NumberPrototype.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/NumberPrototype.mts)
(blob `cb5abecbfa12c857ff58dce71dc7caba1798d242`) and
[value.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/value.mts)
NumberValue.toString at lines 475–480. Retrieved using the GitHub connector.
The former validates the receiver first and gives the root a genuine +0 slot;
its newer SnapToInteger helper is not copied into Rift's 2025 contract. The
latter delegates finite formatting to the host. Adopt the slot separation and
registration pattern, but reject host delegation as sufficient correctness
evidence for all radices. No upstream code is copied.

Nondecimal fractions are not unrestricted implementation approximations in
this edition. Step 5 requires a shortest significand whose represented rational
rounds to the input binary64 value. More than one last digit may satisfy this;
the closest/even selection in Note 2 is a recommendation, not the normative
tie choice. Therefore a different last digit alone is not a defect, but a result
outside the rounding interval is. Nondecimal formatting uses positional digits,
not decimal exponential notation. Decimal notation changes at 1e-6 and 1e21.
Our exact-result cases choose simple unambiguous integers/fractions or a fixed
decimal compatibility expectation; exploratory Node strings are not new oracles.
The rational checker proves only round-trip membership, not shortestness.

## APIs and metadata

Use `thisNumberValue(input: Value, loc: Location): NumberCompletion` in
`src/builtins/number.ts`, reusing the type from `conversion.ts`. It accepts a
number Value or `GuestNumber.numberData` after an `instanceof GuestNumber`
check. Return the exact payload: SameValue must preserve -0 and NaN. Genuine
foreign, subclass and null-relinked objects retain slots. Guest properties named
numberData, prototype ancestry, and a numeric valueOf hook cannot forge a slot.
There are no receiver property reads, boxing, hooks or budget ticks.

Add `registerNumberConversions(realm: Realm): void`, invoked once by Realm
alongside Boolean/String registrations. For the first stage it installs only
valueOf, length +0. Number root own keys become exactly `valueOf`. Keep the
existing `registerNumber` namespace installation unchanged: noncallable,
10 properties, constants/predicates, mutable global binding, no prototype
property, constructor or backlinks. Number root remains a noncallable,
extensible GuestNumber(+0) inheriting Object root.

Use `registerBuiltin`: method property W/E/C = true/false/true; method own keys
`name,length`, both false/false/true; exact name `valueOf`, owner Realm and its
Function root. Functions and roots are fresh across Realms. Later full bootstrap
will install `toString` (length 1) then `valueOf` (length +0), so Number root keys
then become `toString,valueOf`. That later atomic migration must explicitly
update the staged key assertion; do not delete/reinsert methods at runtime to
simulate a new engine version.

Future toString should compose locally, without widening primitive-only
converters: extract receiver; default an absent/undefined argument to 10;
otherwise `toPrimitive(radix, "number", context, loc)` then
`toIntegerOrInfinity(primitive, loc)`; validate 2 <= radix <= 36; finally format.
Return the original ThrowCompletion immediately at every abrupt boundary.
Future backend signature: `numberToStringRadix(value: number, radix: number):
GuestString`, with a validated integer radix precondition. Preserve existing
`numberToString(value)` and dispatch radix 10 through it. No GuestObject,
context, host coercion of guest Values or host exception control flow belongs
in this typed backend. Its nondecimal implementation remains blocked.

## Exact receiver and radix result matrix

These are proposed guest assertions, not executed Rift features. Use a fixed
host-call location `{line:91,column:7}` and assert runtime phase, diagnostic
name/message, loc identity, and thrown guest Value. Project error wording is
chosen here; the standard specifies the error class, not that wording.

| ID | Input | valueOf | future toString |
|---|---|---|---|
| N1 | primitive/box/root +0 | +0 | `0` |
| N2 | primitive/local/foreign/relinked box -0 | -0, reciprocal -Infinity | `0` |
| N3 | primitive/box NaN, +Infinity, -Infinity | same numeric payload | `NaN`, `Infinity`, `-Infinity` after radix checks |
| N4 | primitive/box 10.5, -255 | same payload | default `10.5`, `-255`; radix16 `a.8`, `-ff` |
| N5 | undefined, null, boolean, string, symbol | TypeError `receiver is not a number` | same, before radix reads |
| N6 | ordinary object, Number namespace, Array, builtin/guest Function, Object root, Boolean/String/Symbol roots and boxes | same TypeError | same TypeError |
| N7 | Object inheriting Number root; fake numberData; hooks returning number | same TypeError; no reads | same TypeError; radix untouched |
| N8 | genuine slot plus fake own numberData/hook/read-trap | slot wins; no reads | slot wins; radix alone may cause effects |

Run all accepted/rejected receiver categories against helpers and borrowed/saved
methods; primitive member access remains unsupported. BigInt is outside the
current Value union and is not invented as a supported radix category.

For the following table the receiver is 255 unless stated otherwise. `R` means
RangeError `radix must be between 2 and 36`, runtime phase at the method call
loc. `S` means TypeError `cannot convert symbol to number` at that loc.

| ID | radix argument | converted integer / exact result |
|---|---|---|
| R1 | missing or undefined | default 10 / `255` |
| R2 | 2, 16, 36 | `11111111`, `ff`, `73` |
| R3 | 2.9, 16.9, 36.9 | 2,16,36 / same R2 results |
| R4 | 1.9, 37, -2.9, +/-Infinity | 1,37,-2,+/-Infinity / R |
| R5 | +0,-0,NaN,null,false,true,""," ","bad" | 0,0,0,0,0,1,0,0,0 / R |
| R6 | "16", " 0x10 ", "2.9", "36.9" | 16,16,2,36 / `ff`,`ff`,`11111111`,`73` |
| R7 | symbol primitive or hook returning symbol | S |
| R8 | object canonical hook receives `number`, returns 16 | `ff`; no ordinary fallback |
| R9 | absent/null canonical hook, valueOf returns 16 | `ff`; no toString lookup |
| R10 | valueOf returns object, toString returns "16" | `ff`; fresh fallback lookup |
| R11 | hook returns undefined/null/false/true | conversion to 0/0/0/1, R (undefined result does not default to 10) |
| R12 | canonical hook noncallable | TypeError `symbol toPrimitive method is not callable` |
| R13 | canonical hook returns object, or both ordinary methods return objects, or null-root with neither | TypeError `cannot convert object to primitive` |
| R14 | getter/internalGet/call/tick returns sentinel throw | exact same ThrowCompletion and payload; no formatting |
| R15 | receiver NaN/+Infinity/-Infinity/-0 with radix 1 or symbol | R or S, never an early special string |
| R16 | invalid receiver plus effectful radix | receiver TypeError; radix hook trace empty |

The existing descriptor model lacks guest accessors. Use host-observed
internalGet subclasses for read/abrupt assertions, without adding accessors.
Every argument expression, including ignored extra ones, runs in normal caller
order before invocation; valueOf ignores all argument Values, toString ignores
all after index 0. An earlier argument-expression throw preempts receiver checks.

## Observable order, budgets and mutation

Counts below isolate conversion/body work from AST expression/statement ticks.
`context.call` adds one active frame and zero steps, with finally restoration;
guest function bodies add their existing AST ticks. Lookup ticks occur **before**
the Get. Failure increments steps to maxSteps+1. Rejected call depth does not
increment calls. All errors keep the existing call-site loc unless an invoked
guest operation supplies its own abrupt record.

| operation | lookup sequence | steps / calls (not counting caller frames) |
|---|---|---|
| direct valueOf, any receiver | none | 0 / 1 via context.call; helper 0 / 0 |
| future toString with primitive/missing radix | none | 0 / 1 |
| future toString with canonical radix hook | radix @@toPrimitive; call with `number` | 1 / 2 total, peak 2 |
| future toString with ordinary numeric radix | @@toPrimitive, valueOf | 2 / 2 total, peak 2 |
| future radix fallback after object-returning valueOf | @@toPrimitive, valueOf, toString | 3 / 3 total, peak 2; add tag-body tick if Object.toString used |
| staged Number box ToPrimitive default/number | @@toPrimitive, valueOf | 2 / 1; payload |
| staged Number box ToPrimitive string | @@toPrimitive, toString, @@toStringTag | 3 / 1; `[object Number]` |
| full future Number box, any hint | @@toPrimitive, appropriate Number method | 2 / 1; number or decimal string |

Zero-body-tick valueOf must work even after step budget exhaustion when called
directly, but normal conversion still needs its lookup ticks. A maxCalls=0
direct call fails before receiver validation; an invalid receiver at available
call depth fails without ticks. For A evaluator -> C bridge -> C Function.call
-> B valueOf, peak calls is 3 and body steps 0; maxCalls=2 fails entering B.
For future B toString -> D radix builtin, peak is 4, and maxCalls=3 fails entering
D. Assert active Realm at each entry, B after radix call, C after forwarding,
A after exit; calls return to 0 on normal, guest throw, and host fault. Reentry
uses the same context and monotonic step/call guards, never a fresh evaluator.
With maxSteps=0, an object radix fails at its canonical lookup (steps=1) and
does not Get or call its hook; a primitive radix adds no steps. Hook-induced
failures remain identical completions, not rewrapped diagnostics.

Ordinary conversion has no Number-slot shortcut. At the valueOf-only stage,
deleting valueOf exposes Object.valueOf: default/number then returns the tag,
4 ticks/2 calls. Shadowing valueOf with a noncallable skips its call then uses
Object.toString, 4 ticks/1 call. Replacing valueOf with a callable returning an
object also gives 4 ticks/2 calls, unless it mutates the next method: the later
toString must be fetched anew. With both methods absent through a null root,
three lookup ticks and zero calls produce `cannot convert object to primitive`.
Save both-object negative fixtures explicitly; ordinary inherited Object methods
now succeed and cannot stand in for a failure test.

In the future full stage, deleting valueOf gives Object.valueOf then Number
toString (3 ticks/2 calls); deleting toString with string hint exposes Object's
tag method (3 ticks/1 call). Own shadows, replacements, custom @@toPrimitive,
deletion and prototype relinking remain observable. A saved Number method
still extracts a real slot after its root property is deleted/replaced. Cross-
Realm property mutations never leak to other roots. Neither saved Object.valueOf
nor Object.toString becomes a payload extractor.

## Full expectation migration inventory

Read-only search snapshot: [inventory.txt](../validation/ts-021p/inventory.txt).
Locations below refer to dispatch checkout `61a45c7`; no existing tests changed
here. Every migration is a specific changed assertion or an explicit retain.

| file/area | valueOf-only next task | future full toString task |
|---|---|---|
| test/realms.ts:286 | no Boolean/Number/String root inherits Object.valueOf | retain |
| test/realms.ts:292 | Number own keys empty -> `valueOf` | -> `toString,valueOf` |
| test/realms.ts:344–349 | Number box numeric hint `[object Number]` -> numeric +0; rename mixed interim label | retain numeric payload; add string payload |
| test/boolean-string-conversions.ts:296–304 M8 | split Number(2) from Array/Function tag table; expect number2, preserve both tag rows | retain; add full string-hint check in Number module |
| test/realms.ts namespace54–99, graph, W1/W2/W14/W15 | retain all constants/predicates, root +0, payload identity/relinking, boxing allocation Realm, no body ticks, missing constructor, namespace noncallable | retain |
| test/object-valueof.ts explicit Object calls, V6 rows `{}`,`[]`,Function | retain object identity/boxing and exact 4-step inherited tag conversion; these rows are not Number boxes | retain |
| test/object-tostring.ts T1 tags/root/relinked cases and ordinary T6–T8 budgets | retain borrowed Object tags and one tag tick; ordinary-object string hint3/default4 and length8 ticks stay exact | retain; Number override does not change explicit Object calls |
| test/boolean-string-conversions.ts M1–M7, M8 borrowed Object/Symbol | retain metadata, rejection of Number receivers, direct-converter negatives, Boolean/String payload semantics and mutation budgets | retain |
| test/symbol-conversions.ts and Symbol drivers/fixtures | retain Number receiver rejection, Symbol slot identity and canonical override precedence | retain |
| test/conversion.ts, realms direct conversions, object-valueof V7, property-key-conversion | retain primitive-only object errors and no hook reads; toPropertyKey remains effectful separately | retain |
| primitive-conversion, operator-coercion, numeric-operators, addition, relational and fixtures | retain ordinary/null-root/explicit-hook negatives and operand ordering; add injected real Number boxes, never weaken existing negatives | add string formatting consumers |
| key-coercion, property-key-conversion, object-keys and fixtures | retain symbol identity, ordinary tags and key/RHS order; staged Number keys still tag-based | Number keys become decimal payload strings |
| array-length-coercion, array-storage, array-like, array-map and fixtures | preserve primitive-only bootstrap, two fresh length conversions, invalid-length storage and callback order; add Number slot cases | retain numeric cases |
| String exotic descriptor/UTF-16/dispatch drivers | retain instance own keys, length and index behavior; inherited Number overrides irrelevant | retain |
| number.js, realm-intrinsics.js and runner manifest | preserve namespace tests, member boundary and all 164 entries / 23 targets | preserve; no invented Number constructor |

Runtime-read fixture expectations for a real box with payload2 (host-injected
into a fresh Realm) make the staged/final distinction explicit:

| consumer | next valueOf-only result | future full result |
|---|---|---|
| default/number ToPrimitive | number2, 2 ticks/1 call | same |
| string ToPrimitive / computed key | `[object Number]`, 3 ticks/1 call | `2`, 2 ticks/1 call |
| box + 3 / 3 + box | 5 / 5 | same |
| box + "x" / "x" + box | `2x` / `x2` | same (default hint yields number) |
| +box / -box / box * 3 / box < 3 | 2 / -2 / 6 / true | same |
| truthiness / strict equality with 2 | true / false | same (object identity retained) |
| array length3 assigned box2 | length2, remove index2; conversion4 ticks/2 calls | same |
| length assigned box2.5, NaN, -1, Infinity | RangeError `invalid array length`, old storage intact after two conversions | same |
| length assigned box-0 | +0 length | same |
| LengthOfArrayLike length box2.9 / box-1 | 2 / 0; conversion2 ticks/1 call | same |
| map receiver length box2 with values10,20 and callback +1 | length2; values11,21; callbacks 0 then1 | same |
| direct toNumber/toString/toUint32/toIntegerOrInfinity/toLength(box) | TypeError `object-to-primitive conversion unsupported`, zero hooks/ticks | same |

Also cover numeric -0/NaN/infinite payloads through unary/relational/default
addition; a NaN box compares false for `<`, `>`, `<=`, `>=`. Array length keeps
two uncached conversions even if first valueOf mutates the second result.
For exact budget assertions isolate the conversion/length helpers; map loop
and guest evaluation retain their own existing ticks. Runtime fixture calls
must assert exact source locations as well as results; a host-call loc does not
replace the fixture's parser positions.

## Smallest next atomic assignment and acceptance

Suggested scope, requiring coordinator assignment: production
`src/builtins/number.ts` and `src/realm.ts`; tests
`test/number-conversions.ts`, imported by existing `test/object-valueof.ts`,
`test/fixtures/number-conversions.js`, and the four precise migration sites
above in realms/Boolean-String tests. Task/evidence/interface notes as assigned
by the coordinator. No changes to conversion.ts are needed for valueOf.

Implement helper + valueOf registration only, with readable typed tables for
N1–N8; metadata/Realm isolation; saved/borrowed methods; genuine slots versus
lookalikes/read traps; +0/-0/NaN; zero-body budget, forwarding and cleanup;
three hints, deletion/shadowing/replacement/fresh fallback and canonical-hook
overrides; runtime-read consumers; direct-converter and primitive-member
negative boundaries; borrowed Object/Symbol/Boolean/String invariants. Retain
all prior negatives, explicitly including both-object and null-root failures.
Future R1–R16 and radix hooks are design tests, not next-stage shipped behavior.

Run typecheck, runner20/20, probes10/10, full rebuilt Node/native164/164, and all
23 static-only builds plus separately parsed coverage reports. Extend an
existing driver to preserve manifest/denominator; retain actual failures and
reductions before any workaround. Preserve existing workaround imports and
annotations. Commit/push coherent tested work, then stop for independent review.

Blocked remainder: validate a faithful typed radix2–36 backend against the
rounding-interval failures and shortestness requirement, plus prior decimal
cases and all static gates, before authorizing Number toString. A separately
reviewed formatter project may be needed. A restricted fallback, V8 agreement,
changing pins, or counting only the 84 passing cases does not discharge this
blocker. Array/Function overrides, other Number formatting methods, constructors,
implicit boxing, accessors, parsers and C++ changes remain outside this design.
