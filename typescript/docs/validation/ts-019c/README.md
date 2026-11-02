# TS-019C — Object toString and real symbol tags

Implementation on `codex/primitive-computed-keys`, accepted base `eced90f`,
dispatch checkout `05fb06c`, 2026-11-02. Awaiting independent coordinator acceptance. Production changes are
limited to Object toString, one canonical symbol, Realm registration and the
Symbol prototype tag. The existing 164 entries and 23 compilation gates remain.
The new test module is imported by object-valueof, so neither harness nor
denominator changes. Its guest fixture is read at runtime in both lanes.

## Sources and decisions

Consulted fixed [ECMA-262 2025 20.1.3.6](https://tc39.es/ecma262/2025/multipage/fundamental-objects.html#sec-object.prototype.tostring)
and [20.4.3.6](https://tc39.es/ecma262/2025/multipage/fundamental-objects.html#sec-symbol.prototype-%symbol.tostringtag%),
plus engine262 at `d553e7b52501fbc47eae981c8d0fa7a5c26d0171`:
[ObjectPrototype.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/ObjectPrototype.mts)
and [SymbolPrototype.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/SymbolPrototype.mts).
Adopted classification-before-Get, nullish fast paths, string-only tag selection
and the property-based Symbol tag; retained Rift's explicit contexts/completions,
data-only Get and scoped intrinsic registration. No upstream code copied.

## Both required matrices

W means primitive-wrappers.md; S means symbol-foundation.md. Assertions live in
`test/object-tostring.ts` unless stated otherwise. They have fixed expected values,
not only host agreement. Historical V/G/W and B2 assertions remain in their drivers.

| Matrix row | Evidence |
| --- | --- |
| W-T1 | Inputs/tags table covers all primitive kinds, roots, instances, console, Number namespace, diagnostic strings, null root; lookalikes and relinked slots; callable Array precedence. Zero nullish ticks and one tick otherwise. |
| W-T2, S-T2 | Own/inherited Custom, empty and NUL/lone-surrogate/pair strings; own wins; exactly one canonical Get. |
| W-T3, S-T3 | All three string impostors and distinct same-description symbol ignored; canonical mixed-key ordering checked by identity. |
| W-T4, S-T7 | testTagCompletions: exact sentinel/location, one Get, B→C→B reentry, host faults, recursive call exhaustion, first-tick exhaustion, direct tick identity, cleanup and later bounded calls. Host-only changing-callable observer proves classification precedes Get. |
| W-T5, S-T6 | BoxingRealm captures actual fresh Symbol boxes and exact key/receiver/location; B primitive tag versus existing A box; A→C.call→B success/shared tick and call-limit cleanup. |
| W-T6, S-T8 | default/number/string exact lookup sequences and ticks 4/4/3; default key; runtime-read addition, numeric, relational, key, length and map consumers; operator-coercion/realms migrations. |
| W-T7 | runtime-read hook replacement during valueOf; root method replacement/restoration; saved method after deletion; both-object and null-root negatives; unchanged direct-converter tests. |
| W-T8 | two complete four-tick conversions for length={}, exact RangeError and unchanged length; second valueOf replaces toString, proving fresh lookup/result with seven ticks and successful zero length. Existing array-length tests retain abrupt/two-conversion cases. |
| S-T1 | undefined/null exact tags, zero ticks, work after exhausted steps; no Get; ordinary call limits still apply before body. |
| S-T4 | Every nonstring tag category falls back, including symbol, callable, throwing-read object and object with throwing conversion hooks; no coercion. |
| S-T5 | Symbol primitive/box/root intact tags; delete/redefine/nonstring/shadow/relink expose Object; ordinary lookalike can inherit tag without gaining payload; B2 slot negatives remain. |

Metadata assertions cover method name/length/flags, defining Realm and Function
root, fresh methods, Object key order valueOf then toString, Symbol tag after B2
methods with F/F/T flags, and no guest globals. Runtime-read call arguments still
execute even when the body ignores them. Assignment/read/call order uses a tag
mutated by RHS/argument evaluation to distinguish conversion timing.

## Deliberate migration inventory

Before production/test edits, searched the entire test tree plus run-guests for
toString, root keys, cannot-convert failures, step counts and step-limit assertions.
The retained `pre-edit-inventory.txt` records the hits. The design's consumer
inventory was also checked. No blanket output replacement or tick suppression.

| Existing area | Decision and retained intent |
| --- | --- |
| realms G17/G11/W1 | Object keys now valueOf,toString; Function/Array/Boolean/Number/String own keys unchanged. Missing-method loops still reject constructor/join/map as appropriate; inherited toString is covered in the new module. |
| realms G14 | Numeric defaults now NaN; addition exact Object/Array/Function strings; computed keys absent→undefined; length defaults located RangeError. Cleanup retained. |
| realms W17 | Real wrapper ordinary conversion now inherited tag string, never payload unboxing. Direct converters still reject objects without reading hooks. |
| object-valueof V6 | Real valueOf then toString call; adapter sees three outer lookup ticks, method's evaluator charges fourth tag tick. Exact result per Object/Array/Function. Existing call-limit test stays at two ticks before failed valueOf call. |
| object-valueof A17/A24, symbol-conversions | Symbol root count grows 3→4; exact canonical tag identity added after conversion keys. All B2 method metadata, slot failures, conversions, deletion and limits remain. |
| operator-coercion | Default {}, [], function cases now explicit NaN/addition-tag/false-relational results for the same operations. Explicit both-hooks-return-object case retains located TypeErrors across every operation. |
| array-length-coercion missing mode | Deleting own hooks reveals inherited defaults: RangeError instead of TypeError, unchanged length 3, zero own hook hits/empty trace. Explicit both-object mode still TypeError/oo; all other traces unchanged. |
| primitive-conversion, key-coercion, length-coercion | Missing/noncallable/object negatives use null-root or explicit overriding hooks, so stay unchanged, including exact sentinels and budgets. New Realm-object positive coverage complements them. |
| array-like, array-map | Existing no-method length objects are null-root: failures retained. New runtime-read length={}→0 and empty-map/no-callback cases cover factory objects. |
| conversion, property-key-conversion, numeric-operators, addition, relational | Primitive-only rejection and explicit-hook/order/abrupt tests stay unchanged; new inherited defaults are covered in runtime fixture and operator driver. |
| descriptors/keys/prototypes/definition-dispatch/storage/literals | Existing low-level keys, snapshots, holes, receiver, dispatch and negative fixtures retain their meaning; no changes needed. |
| operation-context/function-call/runner-generated negatives | Explicit hooks, strict receiver errors, resource failures and host cleanup remain unchanged. Primitive member rejection is also exercised by the new runtime-read fixture. |

## Compiler and environment evidence

The first classification observer used host Object.setPrototypeOf with a class
prototype. Pinned scriptc rejected that test with SC1090. Before changing it,
retained `focused-native-initial.log` and a five-line
`classification-reflection-reduction.ts` plus its Node/static-build/coverage
transcript. Node prints true; static build rejects class prototype reflection.
The replacement uses a host-only observer with a writable callable field, then
asserts Object on the first call and Function on the next. Production code and
compiler pins/import/annotation workarounds are untouched.

The final callable-Array precedence test exposed a second SC1090: redeclaring an
inherited field without a declaration initializer, even when the constructor
assigns it. Retained `native-field-initial.log`, its build-results JSON and the
six-line `inherited-field-reduction.ts` with Node/build/coverage transcript before
adding an explicit null initializer to that test field. Node prints 2; pinned
scriptc rejects the uninitialized redeclaration. This is a local test-only change.

`focused-native-second.log` records the fully static replacement and the sandbox
Zig installation access failure. The full successful native run uses the installed
pinned Zig directory on PATH with authorized library access. Neither failure was
treated as a pass/skip; no acceptance gate was weakened.

## Validation

All required checks pass on the final source:

| Check | Result / evidence |
| --- | --- |
| typecheck | PASS; typecheck.log |
| runner regressions | 20/20, no skips; runner.log |
| compiler probes | 10/10, both lanes and coverage; probes.log/probe-results.json |
| rebuilt Node suite | 164/164, no skips; node.log/guest-node-results.json |
| rebuilt native suite | 164/164, no skips; native.log/guest-native-results.json |
| static-only builds and separate coverage parsing | 23/23 PASS; native-build-results.json. CLI 1314/1314; object-valueof including C module 2040/2040. |
| git diff --check | PASS |

Each native target has its own build and separately parsed coverage result.
Native execution uses the rebuilt binaries. Fixed guest negative expectations
include phase/name/message and exact line/column for all four new negative functions.

Coordinator's pre-handoff readability request was applied only to the new C
fixture/module: multi-effect guest bodies, the tick callback and try branches are
expanded; the hint loop uses a typed PrimitiveHint array without per-iteration
casts. Fixed guest diagnostic locations were deliberately updated to 79:12,
85:12, 89:5 and 92:12. All prior assertions, traces and budgets remain intact.

## Limits

Data descriptors only; observer reentry is not accessor support. No guest Object
or Symbol globals/constructors, registry, accessors/proxies, implicit member boxing,
or unrelated methods. Array/Function/Boolean/Number/String wrappers temporarily
inherit tag defaults; their standard overrides remain separate tasks. Symbol
wrappers retain B2's symbol-payload conversion. No C++, Claude reserved paths,
COORDINATION, pins, build manifests or existing compiler workarounds changed.
No branch switch, merge, successors or messages to other chats.
