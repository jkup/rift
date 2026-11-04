# Exact adoption boundary

Review this proposal against base89d3796 and accepted M3c35f62. Original CP's
REVIEW map warning is historical; the accepted canonical-species selection fixes
that default Script-array regression without an Object exemption. Do not edit
original CP, MP or M to make their old claims describe today's source.

## Additional old-test migration discovered

M's running-profile loop crosses operation profile, array-origin profile and
own-constructor presence (eight combinations). With C, a Script-origin array
without its own constructor inherits the actual Object constructor. A legacy
operation still rejects any non-undefined constructor before species Get.
Consequently precisely `(legacy operation, Script origin, no own constructor)`
changes from default-success to the existing string-valued unsupported completion
`runtime.map-species`, with zero species getter calls. This is the unchanged
legacy algorithm applied to a newly present inherited property, not language
TypeError and not cross-profile callable invocation. No constructor is called.

The proposed replacement retains all eight combinations and their cleanup,
successful-result identity/length/descriptors and species-count assertions.
It strengthens the unsupported branch with exact capability and value kind.
For Script-origin/no-own cases it then supplies an explicit own undefined shadow,
reruns the same operation, and checks the original default-success result,
zero species calls and cleanup. Both Script and legacy operation profiles are
covered. There are two added shadow executions per input/lane; none executed now.

M selection row1 previously exercised an actually absent constructor. Under C it
instead exercises the real inherited Object link with the SAME `LK` effects and
default result: the actual constructor is not the instrumented Holder, so its
species Get has no `S` marker. Keep that original result/effect/count assertion,
add exact Object link identity, and separately run a genuine array with null
prototype and no own constructor. The latter retains missing-constructor coverage
for empty/nonempty and same/cross Realm: `LKA` / `LKAHECD`, one allocation and
zero/one callback. These four extra executions per input/lane are proposed only.

No other M test expectation needs migration. Explicit inventory of all blocks:

| M block | C compatibility |
|---|---|
| T01–T12/N01/N02 prefixes and call limits | Fixtures own constructor holder or explicit primitive; schedules unchanged |
| Selection rows2–30 | Own undefined / inherited explicit undefined, explicit holders, poison/custom/primitive overrides; retain all assertions |
| Accessor abrupt prefixes and all-trace abrupt injections | Same owned holders/getters and exact tuple/source/counters; unchanged |
| Parsed getters | Same explicit constructor/species accessors; accepted return8/throw7 and all 200 controls unchanged |
| Separate-session reentry/finally/BOTH owner reuse | Same fixtures, no new authority or budget reset; unchanged |
| Length bounds/coercion, saved-length/live mutation | Explicit constructors or nonarray skip; unchanged ordering and counts |
| Running-profile loop | One outcome migration and explicit undefined-shadow controls as above |
| Inventories | No own canonical species on global/Object/Array/Function prototypes; Array global still absent; no migration |
| Every primitive selection | All explicit values; genuine TypeError, no result/callback; unchanged |
| Object-link/foreign Script constructor controls | Fresh configurable Object link overwritten by trusted test fixture; no duplicate-property invariant, all expectations unchanged |
| Length getter / empty accessor abrupt controls | Explicit getters, exact abrupt and no allocation; unchanged |

Object-link controls retain undefined/null default, primitive7 genuine TypeError,
selected custom constructor unsupported without invocation, and poison getter
exact abrupt/no allocation. Own species values shadow prototype state; absence
on the actual C Object reads through Function.prototype→Object.prototype and
still gives undefined. Poisoning canonical species on either prototype must
remain observable: exact receiver is the constructor, never the array; invalid
species is language TypeError; custom species stays unsupported, never invoked.
The species symbol, its string spelling and an equal-description distinct symbol
remain different keys. Neither an Object name nor prototype identity exempts a
constructor. There is no real intrinsic Array in any Realm; the foreign intrinsic
exception remains unrepresentable. M's named foreign Script Array controls stay.

M's accepted 80-row replay and 28 Object-link/foreign-constructor controls per
input/lane are reused as accepted evidence. No claim that they already exercised
the new public C registrations or this newly discovered cross-profile migration.
Current source makes the migration deterministic; no uncertainty probe or full
build is needed in this proposal task. Future C must run the complete proposed M
driver, including the added controls, on both hosts and inputs.

## Three-file production closure

| File | Exact planned change using current interfaces |
|---|---|
| src/realm.ts | Import and call String then Object registration after registerErrors inside Script branch; leave legacy installGlobal whitelist and Error graph unchanged |
| src/builtins/string.ts | Add local call/construct algorithms and registration with existing createBuiltinConstructor; retain conversion methods verbatim |
| src/builtins/object.ts | Add local call/construct algorithms and registration; retain valueOf/toString/ErrorData classification verbatim |

`createBuiltinConstructor(name,1,call,construct)` already accepts full four-argument
Builtin and ConstructBuiltin callbacks. Metadata name/length is supplied there;
each registrar defines immutable own prototype Wfalse/Efalse/Cfalse, appends the
prototype constructor Wtrue/Efalse/Ctrue, and calls defineScriptGlobal with
Wtrue/Efalse/Ctrue. Existing prototype method order remains. Both constructors
inherit Function.prototype; no caller/arguments own properties. Initial native
source names remain independent of mutable name properties. Registration needs
no new Realm storage/getter, runtime slot type, evaluator dispatch or authority.

Use existing `toPrimitive(v,"string",context,loc)`, `toString(v,loc,context.realm)`,
`symbolDescriptiveString`, `GuestStringObject(data,proto)`, `toObject(v,context,loc)`
and `Realm.createObject`. toObject has no tick or conversion hook. No helper API
change, map edit or constructor shadow is required. Full callback arity and the
accepted explicit completion/discriminant patterns remain mandatory for scriptc.

String call: no argument gives empty string; otherwise only an original primitive
Symbol uses descriptive rendering. Every other input undergoes one string-hint
conversion, then primitive ToString. Construction has no special Symbol path:
convert first; Get callee.prototype with exact callee receiver; choose object
prototype or defining-Realm String.prototype; tick once; allocate genuine box.
Missing differs from explicit undefined. Symbol wrappers and object hooks returning
Symbol throw genuine A TypeError, in call and new, without prototype Get/box.
No tick for internal TypeError creation. Keep string UTF-16 indices/length flags.

Object call/new share the equal-newTarget algorithm: exact object input returns
the same Value/object without Get, conversion or tick. Nullish/missing ticks once
then allocates a fresh ordinary A object. Other primitives tick once then use
existing boxing in A (including exact Symbol identity). No constructor.prototype
Get, preallocated ordinary receiver, static methods or subclass/newTarget path.

## Frozen semantics and limits

F01–F12 fixed rows and CP host-hook tables are copied unchanged and independently
compared. F08 fixed number7 remains 7 for both inputs; C09/C10 use payload7/11.
F12 sources are runtime input-a String(7) and input-b String(11), with new forms
and exact Object identity aliases. All rows run for both inputs, not just one
aggregate output. No Symbol factory is introduced.

| Trace | Columns / total ticks | Minimum calls | Terminal |
|---|---|---:|---|
| T13 String(m), host ordinary method | 1,1,8,1,1 / 5 | 2 | seven / eleven |
| T14 new String(m), host ordinary method | 1,1,5,12,1,1,1 / 7 | 2 | StringData seven / eleven |
| T15 Object(o) | 1,1,8 / 3 | 1 | exact o |
| T16 new Object(o) | 1,1,5,12 / 4 | 1 | exact o |
| T17 Object() | 1,1,1 / 3 | 1 | fresh empty A object |
| T18 new Object() | 1,1,5,1 / 4 | 1 | fresh empty A object |

T13/T14 m has no @@toPrimitive and a host toString receiving exact m and no args;
M records once and returns seven/eleven. Two lookup ticks; no valueOf. In T14
conversion/M succeeds at6, then uncharged prototype Get, then allocation tick7.
The separate protocol hook gets one string hint; Symbol wrapper extraction is
a nested builtin call with no effect letter. Both need two calls. Direct Symbol
requires only one call, including failing new. This distinction is frozen in
C03–C08, not inferred from an empty effect string.

Every prefix with seed0/7 fails at limit+1, before that tick's effect; fresh N/N+1
and seeded7+N/8+N return the literal terminal. Calls0 fails after source operand
evaluation, before dispatch; calls1 fails before a required hook body. Call/new
source location is line1 col1; source events belong to caller, builtin events to
A; hook-origin abrupt retains H and original source. No catch/outer relabeling.

For parsed-accessor additions, m.toString is an accessor g in H returning a host
method. Exact source `function g(){return method;}` has execution ticks at1,1,14,21:
function setup AND nonstrict body lexical setup precede return and identifier.
Throw source `function g(){throw marker;}` uses1,1,14,20 and throws at statement14.
Setup definitions run in a separate session but these four invocation ticks are
not excluded. String call totals9; new totals11. Throw totals9/10; no prototype
Get/allocation follows. Calls0 stops at3/4; calls1 at5/6 before getter setup;
calls2 is sufficient because getter and host method are sequential. Source
switches to `getter` during those four ticks and back to input at C allocation.
`parsed-traces.json` freezes every prefix, phase, Realm, location and effect.
These are new unexecuted C schedules; accepted M return8/throw7 stays unchanged.

For host M hooks independently substitute exact guest number7, foreign Error,
unsupported completion and host sentinel; preserve lower prefix results, stop
at M with exact identity and no later prototype Get/allocation. At a parsed
getter-returned method the same substitution cuts off after9/10 ticks; a failing
earlier tick prevents M. Guest parsed throw is exact marker/H/getter:14. Resource
tuples always retain count/limit and bypass catch; host sentinel bypasses guest
catch. No allocated String is published before its allocation tick succeeds.

Check complete outer frame/Realm/steps/calls/depth/permit inside finally during
normal, language, unsupported, resource and host unwind, then idle cleanup.
Reuse BOTH original sessions: sufficient-budget owners perform String(7) with
exact +3 steps and value "7"; exhausted immutable owners reject at their next
guard instead of replacing/resetting them. Retained raw call and construct
callbacks must reject inside finally, live reuse and idle, without effects.

## Guard and observation limits

Reuse B's separate tagged consume-once permits unchanged. Check captured callee,
matching callable/constructor Realm and profile, context/invoke/args/loc identity,
one call-depth reservation and finally restoration. OperationContext remains
exactly realm/call/tick. Raw/copy-slot/mismatched callable/wrong-profile/inactive
owner negatives must run before effects. Preserve ordinary Script construction
and H5 shells, Error message Symbol rejection and all B G10 owner-session checks.

Genuine String's prototype is immutable. A copied-slot accessor shell fails guard
authenticity before lookup; it cannot prove positive prototype Get ordering.
Review the actual conversion→Get→tick→allocation code plus reachable abrupt and
resource controls. Do not add hooks, mutable intrinsic properties, public Construct
or reflective permits to manufacture observation. Likewise publicly reachable
denials do not independently isolate every unused permit args/loc field; retain
B's source-review limitation honestly. This proposal is ready for review, not
permission to activate C or expand ownership.
