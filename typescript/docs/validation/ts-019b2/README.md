# TS-019B2 implementation evidence

2026-11-02. Accepted base `e5bffe3`; coordinator dispatch `8f7b6ee`;
unchanged branch `codex/primitive-computed-keys`. Sole implementation writer:
chat `01a19a13-8caa-72f0-8395-1529fadf8ee7`. Coordinator acceptance is pending.

## Sources and implementation

Consulted fixed ECMA-262 **2025 edition 16**, sections
[20.4.3.3–5](https://tc39.es/ecma262/2025/multipage/fundamental-objects.html#sec-symbol.prototype.tostring),
including ThisSymbolValue and SymbolDescriptiveString. Consulted engine262
**d553e7b52501fbc47eae981c8d0fa7a5c26d0171**
[SymbolPrototype.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/SymbolPrototype.mts).
Source inspection confirms slot-based extraction, descriptive formatting,
ignored hint, and the readonly/configurable protocol property. No engine262
execution or copied implementation is claimed. Web raw fetch missed cache and
sandbox DNS failed; an approved read-only pinned raw fetch succeeded.

Production changes are limited to new `src/builtins/symbol.ts` and the Realm
registration import/call. The helper recognizes primitives or GuestSymbolObject
payloads, independent of prototype or Realm. All three methods reuse the existing
function factory and completion conventions. No evaluator, context, conversion,
storage, parser, toolchain or host-symbol changes are needed.

## Expected-result matrix

`test/symbol-conversions.ts` is a focused test module called by the existing
`test/object-valueof.ts` driver. It is compiled transitively in both lanes and
adds no manifest entry or build gate. `test/fixtures/symbol-conversions.js` is
read and parsed at runtime by that driver. Assertions use explicit expected
values/errors, never agreement between hosts as the sole oracle.

| Frozen row | Assertions |
| --- | --- |
| P10 metadata | Exact own-key identity/order: toString, valueOf, canonical symbol. All W/E/C flags, names, lengths, metadata flags, defining Realm and functionPrototype; three independent Realms with fresh methods; same-description/string impostors absent. |
| P10 slots | Primitive, local box, foreign/null-linked box, fake guest symbolData property and observed box preserve exact payload. Undefined/empty/x/NUL/lone-surrogate/pair descriptions have fixed UTF-16 outputs. No receiver Get occurs. |
| P10 invalid receivers | Undefined/null/boolean/number/NaN/string, root/lookalike, ordinary/array/function, Boolean/Number/String wrappers all fail every method with exact TypeError text, phase, location and thrown string. Root/lookalike conversion also fails without slot inference. |
| P10 ignored arguments | Missing/undefined/null/unknown string/symbol/object hints and excess arguments do not affect the hook. Throwing-read arguments and receivers are never inspected. Runtime expressions still execute exactly four effects. |
| P10 borrowing and limits | A evaluator enters C bridge and C Function.call, then B-owned saved method. Normal/invalid receiver completion restores C then A. Zero step budget still permits direct method calls; shared call-depth failure cleans up and permits a subsequent bounded call. Existing Object.valueOf A/C/B guest-throw and host-fault cleanup assertions remain intact. |
| P11 intact conversion | All three hints return the symbol with exactly one canonical Get tick and one call. ToPropertyKey preserves identity. Direct numeric/string converters reject objects with zero reads/ticks; exhausted lookup tick prevents Get. |
| P11 deletion/definition | Inherited readonly assignment returns false without defining; explicit own definition shadows, then deletion exposes prototype hook. Prototype deletion succeeds and preserves other Realms. Saved hook and string methods still work after deletion/replacement. |
| P11 ordinary fallback | Deleted-hook string hint calls toString first; number/default call valueOf first: exactly two ticks/one call. A valueOf that replaces toString and returns an object causes fresh lookup: three ticks/two calls, fixed replacement result. |
| P11 replacement/errors | Object-returning protocol hook fails after one Get/one call without fallback. Noncallable replacement fails; null replacement falls back normally. An untouched Realm retains symbol conversion. |
| P11 guest consumers | Member and borrowed Function.call extraction, explicit descriptive string, ignored effectful arguments, symbol-preserving boxed computed key, implicit numeric/string failures, invalid root, primitive-member rejection and strict inherited-readonly assignment all have fixed results/locations. |

## Pre-change negative and budget audit

[pre-change-inventory.txt](pre-change-inventory.txt) captures affected root,
conversion, slot and budget assertions before expectation edits.

- `object-valueof.ts` A17/A24: empty Symbol own-key count becomes three; ordinary
  root, no payload, extensibility, parent, noncallability and missing global stay.
  The new module checks exact mixed keys rather than formatting identities.
- A19: direct converter object errors and zero-work expectations stay for both
  boxes. The null-linked box still fails ToPrimitive with the original error.
  Only the intact box now returns its symbol through the inherited hook.
- `realms.ts`: old wrapper root/missing-method loops cover Boolean/Number/String,
  not Symbol; no expectation change. Ordinary-object/function/array negatives,
  null-root objects, boxing guards and host-fault restoration stay unchanged.
- `conversion.ts`: primitive symbol numeric/string errors and primitive-only
  object rejection remain unchanged; no hooks were added to these functions.
- `primitive-conversion.ts`: tests use explicit ordinary/protocol objects, not
  default Symbol-box failure. P1–P9 traces, sentinels, recursive cleanup and tight
  budgets remain unchanged. The new methods add no synthetic ticks.
- All other symbol uses in the compiled test tree were searched: symbol values,
  key storage, array-length rejection and operator-order negatives remain valid.
  No existing trace/budget was loosened. New B2 counts are measured at the exact
  protocol/ordinary lookup and call boundaries, with fixed expected increments.

## Validation

All required checks passed on the final source:

| Command/check | Result / retained evidence |
| --- | --- |
| `npm run typecheck` | PASS; typecheck.log |
| `npm run test:runner` | 20/20; runner.log |
| `npm run test:probes` | 10/10 both lanes and coverage; probes.log, probe-results.json |
| `npm run test:guest:node` | Rebuilt, 164/164, no skips; node.log, guest-node-results.json |
| `npm run test:guest:native` | Rebuilt, 164/164, no skips; native.log, guest-native-results.json |
| Static-only builds plus separate coverage parser | 23/23 PASS; native-build-results.json. CLI 1282/1282, object-valueof (including new module) 1694/1694 static statements. |
| `git diff --check` | PASS |

Initial native/probe runs had no Zig executable on PATH; those logs are retained. The
rerun adds the installed pinned Zig 0.17.0 directory to PATH and uses authorized
library access. No source workaround, dynamic tier, pin/import/annotation change
or relaxed acceptance gate was introduced.

## Limits

Symbol remains a deliberately partial internal/host-bridge surface. No guest
Symbol factory/global/registry, description accessor, constructor backlink,
toStringTag, Object toString, implicit member boxing, parser or async expansion.
No new platform, performance, full conformance or resource-capacity claim.
C++, Claude reserved paths, COORDINATION, build manifests and all prior tests
are preserved. No branch switch, main merge, successor work or other-chat
messaging. Stop for independent coordinator review after commit/push.
