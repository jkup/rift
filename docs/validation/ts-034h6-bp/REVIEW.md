# Exact B proposal — review decisions required

Base c8bd4bb5b525bf061eef19141831f0ca79142d6f; accepted H6-A 831d5b0.
Everything under proposed/ is an UNAPPLIED proposal. No B/C semantics have run.
Actual review and independent second review must approve these concrete changes
before an implementation assignment. This document does not grant that approval.

## Newly inherited A driver: strengthening, not removal

The H6-P inventory predates test/harness-errors-a.ts. Its A03 checks that
prototypes have only name/message, constructor/toString are absent, all Error
globals are absent, and the Script global key list is exactly five. A09 checks
that Script `missing;` returns a diagnostic string. Those are deliberately true
at A, deliberately false at B. Updating only the earlier bootstrap inventory
would leave an inherited test failure. Exact proposed replacements are in
proposed/test/harness-errors-a.ts and replacement-manifest.json.

* A02 keeps distinct prototype identities, unbranded prototypes, graph, fresh
  instances and Realm identity. It adds distinct A/B constructor identities.
* A03 requires exact appended keys: Error [name,message,constructor,toString],
  native families [name,message,constructor]. Existing name/message flags and
  instance key/absence assertions remain byte-identical. New checks require
  constructor/prototype/global identity links, exact flags, names/lengths,
  callable owner/constructibility, native-constructor inheritance, and callable
  but nonconstructible toString with exact metadata. Native prototypes must
  inherit formatting rather than gain own toString.
* Script globals become exactly the original five then Error, TypeError,
  ReferenceError, RangeError, SyntaxError. No String/Object, Symbol, globalThis
  or extra constructors are admitted. A09's legacy exact-five inventory and
  absent Error bindings remain byte-identical.
* A09's `missing;` becomes a branded Realm-local ReferenceError with exact own
  message and message flags, diagnostic name/message/location/origin, two steps,
  source ID and Realm, fresh allocation on repetition and idle cleanup. A direct
  synthetic failure remains the exact historical string. The original legacy
  factory misuse and unknown-family host errors remain byte-identical.
* A01, A04–A08 are byte-identical: freshness, brand after relinking, ordinary
  borrowers, poisoned name/message, custom tag/fallback/exact abrupt, defining
  Realm/source, raw/retained guard diagnostics, every fresh/seven-seeded prefix,
  calls0/1 and cleanup all remain. No A tick or output label changes.

The new constructor map/registration completes the existing A prototype objects;
replacing those objects is forbidden. The exact key order proposal requires
append constructor first, then Error-only toString. Constructor own keys are
[name,length,prototype]. Review this ordering explicitly with the B factory.

The source proposals are syntax-checked only. Their new getErrorConstructor API
does not exist yet; a successful current production typecheck of these copies
is not claimed. The new driver union/descriptor comparisons still require B's
native static-only plus separate zero-dynamic validation. Existing exact H6-A
host error strings (`Script execution unavailable`, `Script Error prototype
required`) must remain unchanged.

## Permit coverage and the private boundary

Current script-execution-internal.ts:611–624 stores pendingBuiltin in module
scope. Only private dispatch issues it, and Realm's captured guarded callback
consumes it before user callback entry. B must preserve that property for the
new tagged constructor permit. The constructor guard binds exact context,
Realm, invoke, callee, args-array, loc and used state; call/construct tags cannot
substitute for each other. No test or production API may mint a permit.

Literal G control schedules (run for both input payloads):

| Row | Attempt and exact schedule | Required result |
|---|---|---|
| G01 | Save real constructor slot invoke; raw host invoke, no session | host rejection, 0 ticks, 0 prototype Gets/callbacks |
| G02 | Same raw invoke with fabricated Script OperationContext | host rejection before tick/call callbacks, counters0 |
| G03 | Attempt with legacy profile; separately foreign Script context | legacy profile rejection / missing exact permit rejection; no effects |
| G04 | Shell copies matching builtin callable+constructor slot; poison shell prototype getter; `new K();` | statement1/new1/identifier5 =3 ticks, then captured-object rejection, getter0 |
| G05 | Shell combines different callable/constructor records; same source |3 ticks, metadata rejection before Get/callback/allocation |
| G06 | Active trusted `make(7);` callback attempts raw slot invoke with a new equal-content args array |3 source ticks (1,1,6); no additional tick, raw attempt rejected, constructor callback0 |
| G07 | Same but new equal-coordinate loc object |same3 ticks, no additional tick, raw attempt rejected, constructor callback0 |
| G08 | Inside authorized custom builtin constructor callback, invoke its saved guarded slot again with captured original tuple |`new K();`:3 source ticks; original callback once, second rejected, no prototype read from rejection |
| G09 | Retain owner context after previous source; start different session whose guarded callback tries raw invoke with retained context |new session make3 ticks; old session counters unchanged, no constructor callback |
| G10 | Error message host hook starts inner session; inner completes normally / returns exact language throw / throws host sentinel |T07 M at6 (new T11 M at7); outer permit already consumed; inner `0;` two own ticks, `throw q;` two own ticks, or `h();` two own ticks before host throw; inner finally restores outer context/permit; outer continuation only on normal; outer finally idle |

G06/G07 cannot isolate args/loc *field sensitivity* through the public API:
an unused valid constructor permit is never available to substitute one field.
Those reachable rejection controls are necessary but not sufficient to prove
every conjunct independently. Require actual/second source review of all tuple
comparisons, supplemented by the native reachable-path negatives. Do not describe
the negative results as proof that removing only args or loc comparison would
fail. This is an explicit review limitation, not permission to remove either
comparison or add a test backdoor. If independent executable mutation proof is
required, propose a separately reviewed evidence-only private-module test seam;
none is authorized or rendered here.

Cross-tag schedules: during `make(7);` (3 ticks), raw construct invocation cannot
use the already-consumed call permit. During `new K();` (3 ticks), raw builtin
call invocation cannot use the constructor permit. A legitimate context.call
from K issues its own one-use call permit, runs its callback without extra source
ticks, restores the consumed constructor permit, and a repeated raw invoke still
rejects. Poison getters and callback counts must remain zero on rejected attempts.
H5 ordinary Script shell construction stays positive; ordinary createBuiltin
stays nonconstructible. Do not change H5's accepted metadata diagnostic.

Proposed new guard diagnostic policy: reuse `Script execution unavailable` for
absent/used/mismatched constructor permits; preserve `cross-profile callable
invocation` at profile rejection; use `invalid builtin constructor metadata`
for private builtin branch record mismatches/captured callee rejection. Review
these proposed new messages before freezing new B expected outputs. No existing
host diagnostic string is replaced by this proposal.

## Complex trace scope and review

frozen-traces.json explicitly enumerates 21 schedules and 328 fresh/seven-seeded
limit rows per input (656 across two inputs), plus callback abrupt variants and
call-limit controls. These are predicted events, not test results. Sources and
expected values are frozen before either B execution lane. T01–T12 and T19–T21
belong to B; T13–T18 are deferred C controls. Matrix mapping covers every E01–E36,
G01–G10 and F01–F12; all F rows remain deferred, with no B activation.

T05–T07 and T10–T12 hooks are guarded host builtins, hence no hidden Script-body
ticks. M returns seven/eleven unless testing exact abrupt or Symbol/object
negative. C returns numeric7 (or explicit undefined variant); data/absent cause
are separate T03/T04. T09's n callback replaces the message getter with the M
getter before message Get; n returns X, m returns seven/eleven. Every name/message
stage also runs with guest7, foreign Error, unsupported completion and host
sentinel, stopping at that stage. A Symbol name stops after Get(name); a Symbol
message stops after message conversion. No Error result escapes failed conversion.

All trace events retain caller source/input ID. Across Realms, source evaluation
ticks belong to caller B; public allocation/coercion/Get ticks belong to actual
builtin A. Foreign host hook H temporarily owns the active Realm during its call,
but a returned object/Symbol failure is generated after restoration to A. A hook
throw keeps its exact object and H provenance. E28 separately uses actual Script
source H/T to prove function source transfer and rethrow provenance; host-hook
traces cannot replace that row. Every exit restores prior permit/frame/Realm,
then session active=null, calls=depth=0. Internal engine allocation adds zero ticks.

Public constructor prototype properties are nonwritable/nonconfigurable data.
Do not fake a successful Error.prototype getter to manufacture an allocation
trace: copied-slot getter shells must reject before Get. A reachable host sentinel
at an ordinary H5 Script constructor prototype getter remains covered by H5;
E32's Error callbacks use message/cause/name instead.

No additional production file ownership is requested. The explicit additions
requiring review are the inherited A-driver migration, append ordering and new
guard diagnostic policy above. No compiler workaround, historical verifier edit,
observer change, conformance admission or C activation is proposed.
