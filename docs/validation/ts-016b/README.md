# TS-016B implementation evidence

2026-11-01. Assigned base `7d40c24`; implementation checkout `d8cceb9`
includes the coordinator's dispatch record. TS-016A `2dfdbdc` remains accepted.
Status: implementation handed off for coordinator review, not acceptance.

## Behavior and boundaries

Only Function.prototype.call is installed, through existing Realm registration.
The method checks the callable slot, defaults missing thisArg to guest undefined,
copies rest Values in order, and forwards through the same context.call/location.
No target Get, coercion, boxing, evaluator allocation or extra execution tick.
Noncallable receivers produce runtime TypeError:
`Function.prototype.call receiver is not callable` at the invocation location.

The evaluator remains unchanged. Rift's strict-receiver profile and caller-context
foreign execution remain: lexical environments and transferred Values retain
identity, while body allocations use the caller Realm. No proper tail calls:
call and target both occupy active call slots. No other standard method, global
constructor, metadata inference or default object/array conversion is added.

Sources consulted: [ECMA-262 2025 section 20.2.3.3](https://tc39.es/ecma262/2025/multipage/fundamental-objects.html#sec-function.prototype.call),
and [engine262 FunctionPrototype.mts, d553e7b52501fbc47eae981c8d0fa7a5c26d0171](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/intrinsics/FunctionPrototype.mts)
(read through GitHub fetch_file; blob `893620c920ac185d2798fac0bd22af957b942e3a`).
Adopted ordered forwarding and callable validation; no source copied.

## Fixed-result coverage

The compiled `test/function-call.ts` reads `test/fixtures/function-call.js` at
runtime. It is one new harness entry, preserving all 162 previous entries.

- Guest fixture: base/key/this/rest/extra order `bptaze`; target runs exactly three
  times through ordinary, call.call and saved-intrinsic invocation; missing args
  yield undefined. Own target.call=17 cannot redirect a saved intrinsic.
- Guest and builtin receivers retain exact undefined/null/boolean/number/string/
  object/function Values (including -0/NaN). Args/results retain exact identity;
  builtin sees a new rest list in original order and cannot mutate the input list.
  F is callable and returns undefined. A target subclass forbids any property Get.
- Detached and borrowed noncallable receivers reject after argument effects;
  borrowed covers every supported noncallable Value kind and ordinary/array
  objects. Earlier base/property/argument failures skip later effects and target.
  Guest throw identity and diagnostic location, original sentinel completion,
  host Error identity, illegal return/break/continue cleanup are asserted.
- Reentry preserves the active context and outer depth. Direct builtin forwarding
  adds zero steps even with maxSteps=0. Depth 0 rejects outer entry; depth 1
  rejects forwarding but still validates a bad receiver first. Recursive .call
  with depth 4 fails at fixture 6:29 after exactly 10 steps, calls restored to 0.
  Shared ticks fail at steps 2 then 3 on the same exhausted context, without reset.
- Fresh Realm method identities, prototype, name/length and descriptors;
  replacement/deletion/metadata mutation isolation; no call on O/A instances or
  null-root functions unless deliberately linked. Foreign intrinsic/guest/builtin
  targets preserve identity/environment and expose the documented caller Realm
  allocations. G17 changes only F's exact root keys to name,length,call.

## Validation and compiler reduction

Final commands: typecheck; test:runner; test:probes; test:guest:node;
test:guest:native (which rebuilds all entries with static-only plus separate
fail-closed coverage). Logs and complete JSON transcripts are retained here.
No skips, relaxed assertions, new pins or production compiler workaround.

The first sandboxed native build failed to find Zig's installation directory.
`native-sandbox-failure.log` preserves that interrupted attempt. Successful runs
used the installed pinned Zig 0.17.0 directory on PATH with installation access.
The failed attempt is not acceptance evidence.

The first installation-authorized run built all 22 entries but the new test gate
correctly rejected one dynamic comparison: an un-narrowed catch value compared to
an Error. `native-dynamic-failure.log` and `native-first-results.json` preserve
this failure. `catch-identity-dynamic.ts` reduces it to four lines; its coverage
report identifies dynScalarEq. The paired `catch-identity-static.ts` narrows with
`instanceof Error` before comparing identity, yielding zero dynamic statements.
The driver uses this existing compiler-contract pattern; the identity assertion
is retained. This is test typing only. The accepted conversion-driver Array
side-effect import remains unchanged.

## Final results

- Typecheck passes; runner regressions 20/20; compiler probes 10/10.
- Rebuilt Node 163/163 and native 163/163; no skips.
- All 22 static-only builds and separate coverage gates pass; zero dynamic tier.
- CLI 1166/1166, realm driver 1362/1362, new function-call driver 1303/1303
  static statements. Every entry's exact count is in native-build-results.json.
- git diff --check passes. No evaluator/runtime interface or pins changed.

Stop at coordinator review. No successor assignment or main merge.

Readability review follow-up: expanded test helpers/actions/callbacks/try-catch
and multi-step fixture bodies, replacing asserted casts with saved narrowed
Values. Production code unchanged. Exact detached/borrowed diagnostics moved to
27:30 and 28:31; throw/recursion locations and exact budgets remain unchanged.
Final-revision evidence is in [readability/README.md](readability/README.md).
