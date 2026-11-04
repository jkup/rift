# Required actual and independent review

## Additional consumer requiring a decision

`src/array-map.ts:13–15` reads `constructor` on genuine GuestArray and rejects
any value other than undefined as unsupported map species. An ordinary Script
array inherits Array.prototype → Object.prototype. C adds Object.prototype's
constructor, so a previously absent inherited value becomes the Object builtin.
Thus a valid callback on an otherwise ordinary Script array is predicted to
return the existing `runtime.map-species` unsupported completion, before result
allocation/callbacks. This conclusion is source-derived and UNEXECUTED.

Do not silently exempt Object, change map, shadow constructor on Array.prototype,
or revise an old expected result. All exceed this assignment. No amendment is
adopted here. Review must explicitly accept this bounded preexisting helper
limitation for C or separately specify a change before expanding ownership.
The proposed production owner set remains exactly realm/string/object.

The old B E25 test uses an ordinary object for bad callback/oversized length;
its GuestArray explicitly owns constructor=7. Those controls remain valid.
Bootstrap's map control creates its array in legacy x, preserving absent
constructor and cross-profile rejection. `array-map.ts`, `length-coercion.ts`,
`structured-outcomes.ts` and the map portions of `property-accessors.ts` tests
use legacy Realms; later Script accessor controls do not invoke map. No identified
old assertion requires a third file migration. This is not a claim that every
future use of the internal helper is unchanged.

## Interface closure against actual B

| Existing interface | C use within its three files |
|---|---|
| Realm.createBuiltinConstructor(name,length,call,construct) | Full four-argument callbacks. Script-only, separate call/construct guards and captured identity unchanged. |
| Realm.defineScriptGlobal(name,descriptor) | Publish String then Object after registerErrors; Wtrue/Efalse/Ctrue. installGlobal whitelist stays unchanged. |
| GuestObject.bootstrapDefine | Append each prototype constructor; immutable constructor prototype property. No old method replacement or reordering. |
| toPrimitive(input,"string",context,loc), toString(value,loc,context.realm) | One conversion; exact abrupt propagation. No contextless Script helper calls. |
| symbolDescriptiveString | Only original primitive Symbol in call mode. No Symbol factory or conversion-helper relaxation. |
| GuestStringObject(data,proto) | Construct after conversion, constructor prototype Get, and allocation tick. Existing exotic descriptors unchanged. |
| toObject(input,context,loc) | Primitive Object boxes after C's single allocation tick. Existing helper has no tick or hooks; leave it unchanged. |
| Realm.createObject | Nullish Object path after one tick; exact input objects return before tick or lookup. |

`realm.ts` already creates prototypes/methods then Script globals and Error graph.
Append two registration calls inside the Script branch after registerErrors.
String/Object creation can be local to their existing builtin files; no new
intrinsic map/getter, runtime type, dispatcher callback or guard API is needed.
Object equal-newTarget path ignores constructor.prototype entirely. String uses
callee.internalGet after successful conversion, with intrinsic String.prototype
fallback; current genuine constructor prototype properties are immutable objects.
No fallback can be forced through legitimate public equal-newTarget use today.

Inherited B all E/G rows, corrected G10 finally/same-session reuse, E24 primitive
toString(Symbol) rejection, Error message conversion and Symbol-producing hook
controls stay byte-identical. String's special call path must not change them.
Ordinary createBuiltin remains nonconstructible; H5 shells/negative inputs and
legacy graphs remain unchanged. `consumer-search.json` retains 320 broad test
matches with base line numbers; the search is a candidate inventory, not an
automatic migration list. Bootstrap and inherited A are the only edits proposed.

## Frozen setup and observability

Each trace runs same-Realm A and A constructors transferred into caller B.
T13/T14 ordinary host toString records M and returns seven/eleven; assert receiver
identity, zero arguments, no valueOf. @@toPrimitive absence costs its lookup tick.
C05/C06 own protocol hook records M, receives exactly string hint, returns exact
seed Symbol s. C07/C08 wrap s with A's genuine Symbol box; its inherited builtin
@@toPrimitive nests one call and adds no custom effect or source tick. C03/C04
use primitive s with description x. C09/C10 bind p=number7/11. T15/T16 bind exact
foreign ordinary object o with poison conversion properties: no reads/calls.
T17/T18 use no argument. F06 additionally tests explicit null/undefined call/new;
F08 tests number7,false,string a,s in both forms. F01–F12 fixed controls must run
for each input, not be counted from one trace alone.

String call returns a primitive, never a wrapper. new String() differs from
new String(undefined): data empty versus "undefined". Direct primitive Symbol
call returns Symbol(x); new, boxed, and hook-returned Symbol reject with genuine
A TypeError. Symbol conversion failure allocates its internal TypeError without
an extra tick, and does not allocate/publish a String box. Existing own UTF-16
indices and length flags survive; literal ab is the fixed F04 control, with existing
UTF-16 controls replayed unchanged. Object returns genuine slot boxes including
exact Symbol identity; nullish fresh objects are distinct; objects retain identity
and their original prototype. No primitive constructor globals besides String
are introduced, and Number namespace remains noncallable/nonconstructible.

Prototype Get is not a charged event. For T14 it follows M at tick6 and precedes
allocation tick7. F05 abrupt conversion prevents it. Genuine String's own
prototype is immutable; a copied-slot/getter shell is rejected by B before any
lookup. It cannot serve as a positive prototype-Get observer. Prove reachable
conversion/resource/copy-shell negatives and review production ordering directly;
do not claim a mutable-prototype runtime experiment, mint permits, add test
hooks, or change guard authenticity to manufacture that observation.

For T13/T14 and C05/C06 replace M independently with number7 guest throw, exact
foreign Error, exact unsupported completion and exact host sentinel. Freeze
all lower budgets from the corresponding prefix, then at/above the hook event
stop with M and exact abrupt identity, no later event. Runtime callback frame
Realm H uses caller input source/loc because host builtins have no Script body.
Generated conversion failure after hook returns belongs to A; propagated abrupt
retains H provenance. Guest-defined hook origin/rethrow remains covered by B and
must be replayed unchanged, not relabeled by C.

Check cleanup inside hook finally and after dispatch for normal, language,
resource, unsupported and host paths. Reuse BOTH original outer/inner sessions
with String(7): exactly +3 steps and "7", then idle active null/calls0/depth0;
retained raw calls/construct invocations remain denied without effects. Existing
G10 is a model for this check, not authority to replace its assertions. B's unused
permit field-sensitivity limitation remains: publicly reachable raw negatives
plus source review, no claim that one negative independently isolates args/loc.

The independent verifier uses a literal schedule/outcome table, checks all 400
prefix records and seeded call limits, rejects 13 oracle mutations and a manifest
mutation, checks full file reconstruction and applies the patch in check-only
mode. It does not execute the proposed semantics. F row narrative/setup review,
future implementation typechecking and both runtime lanes remain required.
