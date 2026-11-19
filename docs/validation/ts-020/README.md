# TS-020 Boolean/String conversion methods

Implementation on codex/primitive-computed-keys, accepted base dd1bb83,
dispatch checkout f2a3c5d, 2026-11-02. Awaiting independent acceptance.
Production changes are the two builtin modules and Realm registration only.
The existing object-valueof driver imports the new test module; the suite keeps
164 entries and 23 native targets with separate coverage gates.

## Sources and decisions

Consulted fixed ECMA-262 2025 [Boolean methods and ThisBooleanValue](https://tc39.es/ecma262/2025/multipage/fundamental-objects.html#sec-boolean.prototype.tostring),
[String toString](https://tc39.es/ecma262/2025/multipage/text-processing.html#sec-string.prototype.tostring)
and [String valueOf/ThisStringValue](https://tc39.es/ecma262/2025/multipage/text-processing.html#sec-string.prototype.valueof).
Consulted engine262 revision d553e7b52501fbc47eae981c8d0fa7a5c26d0171:
[BooleanPrototype.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/BooleanPrototype.mts)
and [StringPrototype.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/StringPrototype.mts).
The GitHub connector retrieved these pinned files after web cache misses.
Adopted primitive-or-slot extraction and genuine root payloads, using Rift's
existing Symbol completion/registration pattern. No code copied. No coercion,
property access, prototype inference, evaluation or budget ticks in the bodies.

## M1-M8 evidence map

Assertions are in test/boolean-string-conversions.ts, imported by the existing
object-valueof driver in both lanes. Its fixture is read at runtime, not compiled
into the executable. Assertions have fixed values and diagnostics, not merely
Node/native agreement. Existing Symbol/Object/UTF-16 tests remain active.

| Row | Evidence |
| --- | --- |
| M1 | Three Realms: root key order, distinct/fresh methods, W/E/C flags, name/length metadata flags and exact values, owner and Function root. Mutation isolation. Existing String exotic tests retain virtual indices/length. |
| M2 | Boolean true/false, String empty/numeric/text/NUL/lone high/lone low/pair; primitive/local/foreign/relinked boxes and roots. Fake payload properties on genuine boxes cannot replace slots; prototype lookalikes with both fake slot properties are rejected. Observed subclasses prove zero receiver reads. Helpers checked directly. |
| M3 | Each method/helper rejects undefined/null/number/NaN/symbol/ordinary/read-trap/lookalike/array/function/guest function/Number box/Symbol box/Symbol root/Number root/Object root and opposite primitive/box/root. Exact runtime phase, TypeError, message, guest value and 91:7 location. |
| M4 | A evaluator -> C bridge -> C.call -> B methods, primitives, foreign boxes, roots and invalid receivers, owner restoration, shared call guard, zero steps with exhausted budget. Shared step exhaustion after nested success and host-fault cleanup; saved methods after replacement/deletion. Runtime argument expressions run three times while ignored objects are not read. |
| M5 | All hints: canonical lookup then valueOf or toString, two ticks/one call. Deleted toString exposes Object tag (three ticks/one call); deleted valueOf exposes Object boxing then own toString (three ticks/two calls). Replacement during first call affects fresh fallback lookup. Own shadows, canonical override, exact sentinel identity, both-object/null-root negatives and pre-Get step guard. |
| M6 | Runtime-read false-box truthiness and numeric zero; true numeric one; String numeric/unary/multiply/concatenation/relational; Boolean/String keys; array truncation; array-like lengths; map length/callback count/values; argument and key/RHS order; root replacement/restoration. Located invalid length retains length3. Compiled array-length assertions observe exactly two canonical/valueOf lookup sequences and four ticks. |
| M7 | All five direct primitive converters reject boxes without reads; runtime primitive-member failure at72:12. Existing realms/conversion negatives stay active. |
| M8 | Borrowed Object valueOf preserves object identity and freshly boxes primitives in its Realm; Object toString remains tag-based and observes custom tag. Number/Array/Function retain exact interim defaults; Symbol retains payload protocol/tag. Existing Object driver verifies foreign boxing, tags, all categories and cleanup. |

## Deliberate migration audit

pre-edit-inventory.txt records the full-tree search before edits. No denominator,
manifest, gate, observer or exact resource assertion was removed or weakened.

| Existing area | Decision |
| --- | --- |
| realms W1/W17 | Boolean own keys become toString,valueOf; String length,toString,valueOf; Number remains empty. Only Number still inherits Object valueOf. Numeric-hint Boolean false/String ab now return false/ab; Number still returns [object Number]. |
| realms direct converters/member negatives | Retained exactly: direct converters still reject without hooks, member access still requires object. |
| object-valueof | Existing explicit Object method tests unchanged; new module appended. Object method still returns boxes, never extracts payloads. |
| object-tostring | All prior assertions unchanged: borrowed Object method continues tag classification independent of new overrides. |
| String exotic descriptor/key/dispatch drivers | Instance own keys/length/indices unchanged; inherited root methods do not become own instance properties. All previous assertions retained. |
| Symbol methods/conversions | Entire B2 matrix retained; Symbol root still lacks a payload. No hook/tag changes. |
| numeric/addition/relational/key/length/map/operator drivers | Prior ordinary/Array/Function and null-root or explicit-hook expectations remain valid. Runtime-read wrapper cases added without replacing negative fixtures. |
| resource assertions | Prior budgets unchanged. New conversion tests explicitly count protocol/ordinary lookup and Object tag ticks after deletion. |

## Validation and environment

The first focused native build reached linking, then failed to access the pinned
Zig installation in the sandbox. focused-native-initial.log retains that failure.
The authorized rerun uses the installed Zig 0.17.0 directory on PATH. No compiler
lowering failure occurred, so no reduction/workaround was necessary. Pins,
imports/annotations used by existing workarounds, C++, Claude paths and
COORDINATION.md are unchanged.

The initial Node run caught an unsupported numeric object-literal key in the new
fixture. Quoted keys preserve the intended map test within the accepted parser
subset. node-initial.log retains the failure; parser behavior was not expanded.

Final checks are recorded in typecheck.log, runner.log, probes.log,
probe-results.json, node.log/guest-node-results.json and
native.log/guest-native-results.json/native-build-results.json.

| Final check | Result |
| --- | --- |
| Typecheck | PASS |
| Runner regressions | 20/20, no skips |
| Compiler probes | 10/10, Node/native and separate coverage |
| Rebuilt Node suite | 164/164, no skips |
| Rebuilt native suite | 164/164, no skips |
| Static-only builds and separate coverage gates | 23/23 PASS; CLI1346/1346, object-valueof2337/2337 |
| git diff --check | PASS |

Final review extended fake-slot lookalikes, borrowed box/root calls and array
length's exact two-conversion trace. Both full execution lanes and all 23 native
build/coverage gates were rerun after those changes. No test skips or gate changes.

## Scope limits

No Number/Array/Function overrides, globals, constructors/backlinks, other String
methods, implicit boxing, parser changes, accessors/proxies or async expansion.
No branch switch, main merge, successor work or other-chat messages. Independent
review is required before coordinator acceptance.
