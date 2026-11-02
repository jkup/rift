# TS-021A — Number.prototype.valueOf

2026-11-02, branch codex/primitive-computed-keys. Accepted assignment base
5d57374; clean dispatch checkout 9352a9f. Implementation awaits independent
coordinator review. Production changes are confined to builtins/number.ts and
one Realm registration. Existing object-valueof imports the new compiled test
module; its JavaScript fixture is read at runtime. Manifest remains 164 cases
and 23 native targets, each with separate static coverage parsing.

## Contract and sources

Implements the valueOf-only contract in
[accepted TS-021P design](../../number-prototype-conversions.md), including its
fixed ECMA-262 2025 21.1.3.7/21.1.3.7.1 and engine262 revision
`d553e7b52501fbc47eae981c8d0fa7a5c26d0171` source analysis. No code copied.
thisNumberValue returns the existing NumberCompletion; it reads only a number
Value or a genuine GuestNumber slot. No coercion, guest property read, boxing,
prototype inference, body tick or formatting occurs. The root retains real +0.
registerNumberConversions uses the established builtin registration and creates
only valueOf, length0. Namespace registration is unchanged.

## Expected-result matrix

All new assertions live in test/number-conversions.ts and its runtime-read
fixture. Outcomes are fixed semantic expectations, not Node/native agreement.

| Contract | Evidence |
| --- | --- |
| N1 | Primitive/local box/root +0, SameValue and reciprocal fixture checks. Root graph, extensibility and noncallability. |
| N2 | Primitive/local/foreign/null-relinked/subclass -0, SameValue; runtime reciprocal -Infinity and unary negation +0. |
| N3 | Primitive/local/foreign/relinked/subclass NaN and both infinities; runtime NaN predicates, all four false relational comparisons, unary infinity and default concatenation. |
| N4 | 10.5 and -255 across the same helper/method receiver table. |
| N5 | Undefined/null/boolean/string/symbol rejected by helper and saved foreign method, exact runtime TypeError/message/value/location; helper location identity. |
| N6 | Ordinary object, Number namespace, array, builtin and guest functions, Object root, Boolean/String/Symbol roots and boxes rejected. |
| N7 | Number-root descendant with fake numberData and throwing numeric hook rejected without calling hook; NoReads object also rejected without Get. |
| N8 | Genuine subclass with fake own numberData and noncallable own valueOf still yields real slot; observed reads stay empty. Foreign null-relinked slot ignores fake property. Ignored argument objects throw on any read. |
| Metadata | Three Realms: only valueOf root key, fresh functions, exact name/length and name,length order, all W/E/C attributes, defining Realm/function root. Existing namespace constants/predicates/global binding assertions retained. |
| Forwarding/budgets | A evaluator -> C bridge -> C.call -> B saved method; primitive/foreign box/root/error receivers, C/A restoration, peak permitted depth3 versus rejected depth2, zero steps. Shared exhaustion and host fault after nested success restore calls/depth/Realm. Exhausted steps permit direct body; maxCalls0 rejects before receiver validation. |
| Lookup | All hints and exact key traces: default/number two ticks/one call, string three ticks/one call including tag Get. Zero-budget conversion fails before Get. |
| Mutation | Deleted root method exposes Object.valueOf: four ticks/two calls. Noncallable own shadow: four/one. Object-returning replacement: four/two. First call replaces next method: fresh lookup three/two. Saved extraction survives deletion/replacement; other Realm unaffected. |
| Protocol/negatives | Canonical hook precedes both failing ordinary methods and receives string hint/unchanged receiver; one tick/one call. Sentinel completion identity retained. Explicit both-object three/two and null-root three/zero failures retained. |
| Runtime consumers | Both addition operand positions, numeric versus string additions, unary/multiply/relational, truthiness/object identity, inherited tag computed key, length truncation/+0, array-like floor/clamp, map values11/21 and callback order01. Ignored argument expressions run in order; argument throw preempts invalid receiver. Method save/replace/restore and RHS-before-key order. |
| Array length | Real slot2/-0 truncate, 2.5/NaN/-1/Infinity fail atomically; two full fresh lookup traces/four ticks. First hook replaces second hook, returns2 then1: RangeError and storage unchanged, proving no cached method/result. |
| Array-like/map | 2.9->2 and -1->0 with two lookup ticks. Map preserves callback arguments/index order, exact four total steps, shared lookup/call/loop limits, and oversized result rejects before callbacks. |
| Boundaries | Five direct converters reject box without reads. Runtime primitive-member and namespace-call negatives. Borrowed Object.valueOf preserves identity/boxes -0; borrowed Object.toString remains tag-based. Other family methods reject Number; existing full Boolean/String/Symbol matrices remain. |

Runtime diagnostic locations are fixed from the readable fixture: invalid length
75:5, receiver78:12, primitive member81:12, namespace84:12, both-object93:12;
argument sentinel originates87:5. Host diagnostics use91:7.

## Migration inventory and negative intent

pre-edit-inventory.txt repeats the full-tree search before editing expectations.
The four sites identified by TS-021P are the only existing expectation changes:

| Area | Change or explicit retain |
| --- | --- |
| realms root inherited method | All Boolean/Number/String roots now have distinct payload valueOf, rather than Number inheriting Object.valueOf. |
| realms root keys | Number empty keys become exactly valueOf; Boolean/String keys unchanged. |
| realms numeric-hint wrapper | Number root box now gives number +0; Boolean false/String ab unchanged. |
| Boolean/String M8 | Move Number(2) out of tag table into explicit number2 assertion. Both Array/Function interim-tag rows retained. |
| Object valueOf/toString drivers | All prior explicit boxing, identity, tag classification, ordinary/null-root and budget assertions retained. New module appended without denominator change. |
| Symbol/Boolean/String methods | Prior exact incompatible-receiver diagnostics, payloads, hooks, mutation, Realm and budget tests retained. |
| Direct converters/property-key conversion | Primitive-only object rejection/no-hook intent retained. Effectful property-key path remains independent; Number computed key explicitly stays tag-based. |
| Numeric/addition/relational/operator drivers | Existing ordinary, null-root, explicit failing-hook and evaluation-order negatives unchanged. Real Number slots added in runtime fixture. |
| Array storage/length/like/map | Prior primitive-only bootstrap, two conversions, invalid-length atomicity and callback order retained; slot cases added. |
| String exotic/descriptor/key/dispatch | Instance own keys/indices/length untouched. |
| Number namespace/realm fixtures/manifest | Constants/predicates/noncallability/global binding/member boundary and all 164 entries/23 targets retained. |

No blanket output replacement, removed negative, suppressed observer, relaxed
budget, denominator change or gate change. Accepted workaround imports and
annotations, compiler pins and all C++/Claude/COORDINATION files are untouched.

## Validation

Final command logs and JSON reports accompany this file. The initial focused
native build reached Zig linking but the sandbox could not access the installed
Zig directory; focused-native-initial.log retains it. Authorized rerun uses the
same installed Zig0.17.0 on PATH. The first full build passed static-only but its separate coverage gate rejected
one dynamic statement from a deliberately throwing callback with inferred never
return type. native-initial.log/native-build-initial.json and
dynamic-explanation.log retain that failure. reduction/never-callback.ts reduces
it to three statements; annotated-callback.ts explicitly returns Completion and
has no dynamic statement. The same ValueCompletion annotation fixes only the new
test hook, preserving its throw and all observers. coverage-fixed.log records
2647/2647 with no dynamic statements. No production workaround or pin change.

Initial local test development caught a private-field check (changed to the
existing isExtensible API), one missed Number row in the migration, and a fixture
parenthesis location expectation (81:12). typecheck-initial.log and
node-focused-initial.log retain the first two; no engine behavior was changed
to satisfy these test mistakes. Final diagnostics assert parser locations.

| Final check | Result |
| --- | --- |
| Typecheck | PASS (typecheck.log) |
| Runner regressions | 20/20, no skips (runner.log) |
| Compiler probes | 10/10; Node/native and separate coverage (probes.log/probe-results.json) |
| Rebuilt Node suite | 164/164, no skips (node.log/guest-node-results.json) |
| Rebuilt native suite | 164/164, no skips (native.log/guest-native-results.json) |
| Static-only builds and separately parsed coverage | 23/23 PASS; CLI1357/1357, object-valueof2647/2647 (native-build-results.json) |
| git diff --check | PASS |

Both complete lanes and all23 build/coverage gates were rerun after the annotation
fix. The accepted compiler probes are independent of that test-only annotation.
No skips, crashes, timeouts or harness failures remain in final results.

## Limits

This is valueOf only. Number.toString/radix formatting remains blocked by the
accepted TS-021P exact-rational failures. Number string-hint/default-key tags are
intentional. No other methods, globals/constructors/backlinks, implicit boxing,
Array/Function overrides, parser, accessors, async, C++ or pin changes. No main
merge, branch switch or successor dispatch. Stop for independent review.
