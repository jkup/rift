# Proxy + Reflect Implementation Plan

Goal: implement ES `Proxy` and `Reflect` per ECMA-262 (§10.5 Proxy Object Internal Methods,
§28.1 Reflect), unskipping ~464 test262 tests (311 Proxy + 153 Reflect).

Spec references: https://262.ecma-international.org/16.0/ §6.1.7.3 (invariants of internal
methods), §10.5 (Proxy exotic object), §28.1 (Reflect), §28.2 (Proxy constructor).

## Why This Is Hard in Rift Today

Exploration findings (verified against current source):

1. **`JSObject`'s internal methods are non-virtual** (`include/rift/types/object.h:82-107`).
   `getProperty`, `setProperty`, `deleteProperty`, `hasOwnProperty`,
   `getOwnPropertyDescriptor`, `defineProperty`, `getPrototype`, `setPrototype`,
   `isExtensible`, `preventExtensions`, and the enumeration methods are all concrete.
   A Proxy cannot override them until they are virtual.
2. **No abstract-operation layer.** There is no central `Get(O, P)` / `Set(O, P, V)` /
   `HasProperty(O, P)`. The interpreter calls `JSObject` methods directly from 100+ sites,
   and several sites bypass even those by hand-walking the prototype chain:
   - `in` operator: manual `hasOwnProperty` + `getPrototype()` loop
     (`src/interpreter/expression_evaluator.cpp:343-374`)
   - `instanceof`: manual prototype walk, no `@@hasInstance`
     (`src/interpreter/expression_evaluator.cpp:381-441`)
   - member access on objects: manual chain walk in
     `src/interpreter/expression_evaluator_objects.cpp`
   - for-in: `getOwnPropertyNames()` directly
     (`src/interpreter/statement_evaluator_control_flow.cpp:450-474`)
3. **[[Call]]/[[Construct]] have no single chokepoint for non-`JSFunction` callables.**
   Call sites do `dynamic_cast<JSFunction*>(...)` then `->call(...)`; `new` additionally
   checks `isConstructor()` (`src/interpreter/expression_evaluator_objects.cpp:1363-1440`).
   A callable Proxy must satisfy these casts.
4. **Symbol keys are strings** with an `"@@sym:"` prefix
   (`include/rift/interpreter/evaluation_utils.h`, `symbolToPropertyKey`). The `ownKeys`
   trap returns real Symbol values, so we must convert in both directions.
5. **No receiver threading.** Spec `[[Get]](P, Receiver)` / `[[Set]](P, V, Receiver)` carry
   a receiver; Rift's signatures don't. The `get`/`set` traps take the receiver as their
   third argument, so the signatures must grow (with defaults so existing callers compile).
6. **GC** is mark-sweep via `getReferences()` (`src/types/object.cpp:310-347`). A Proxy must
   trace its `[[ProxyTarget]]` and `[[ProxyHandler]]` slots or they can be collected out
   from under it.

Strategy: **virtualize the internal-method layer first** (pure refactor, zero behavior
change), then **Reflect** (thin wrappers, immediate test wins, and Proxy test262 tests use
Reflect inside handlers), then the **Proxy exotic object** itself, then **audit the bypass
sites**.

---

## Phase 0 — Design Decisions (settle before coding)

- [ ] **Class shape for Proxy.** Decision: `JSProxy : public JSFunction`. Rationale:
  `Value::isFunction()` and the interpreter's `dynamic_cast<JSFunction*>` call sites mean a
  callable Proxy must *be* a `JSFunction`. `JSProxy` overrides:
  - `call()` → throws TypeError unless target is callable; otherwise `apply` trap path
  - `isConstructor()` → true only if target is a constructor
  - `getTypeName()` → `"Function"` if target callable, else `"Object"` (drives `typeof`)
  Verify how `Value::isFunction()` distinguishes functions from objects and ensure a
  non-callable Proxy reports as a plain object everywhere (`typeof`, `Object.prototype.toString`).
- [ ] **Const-ness.** `getProperty`/`hasProperty`/descriptor reads are `const`, but a Proxy
  trap runs arbitrary JS. Traps don't mutate the proxy itself, so keep the `const`
  signatures and store trap-invocation scratch state (if any) as `mutable`. Avoid a
  const-removal refactor across 100+ call sites.
- [ ] **Receiver parameter.** Add `const Value& receiver` (defaulted to undefined → treated
  as "this object") to virtual `getProperty`/`setProperty`. Ordinary objects ignore it for
  now (existing accessor invocation happens at interpreter level; document as SIMPLIFIED).
- [ ] **Key representation across traps.** Keys cross the trap boundary as JS values:
  - outgoing (proxy → trap): `"@@sym:N"` keys convert to Symbol values, others to strings
  - incoming (`ownKeys` trap result → engine): Symbols convert back to `"@@sym:N"` strings
  Put both conversions in one helper pair (likely in `evaluation_utils.h`) and use it
  everywhere.
- [ ] **Engine access from traps.** Traps are `JSFunction`s invoked via
  `func->call(CallContext, args)` — confirm this works from inside `JSObject`-layer code
  (no engine pointer needed since `JSFunction` wraps a `std::function` closure).
- [ ] **Recursion guard.** Proxy-of-proxy chains and self-referential handlers can recurse
  infinitely. Decide on a depth guard (e.g. shared counter throwing RangeError
  "Maximum call stack size exceeded") consistent with how Rift handles deep recursion today.

## Phase 1 — Virtualize JSObject Internal Methods (pure refactor)

The "make it possible" phase. No behavior change; full test suite must stay green.

- [ ] In `include/rift/types/object.h`, make virtual:
  `hasProperty`, `getProperty`, `setProperty`, `deleteProperty`, `hasOwnProperty`,
  `getOwnPropertyDescriptor`, `defineProperty`, `findPropertyDescriptor`,
  `getPrototype`, `setPrototype`, `isExtensible`, `preventExtensions`,
  `getOwnPropertyNames`, `getEnumerablePropertyNames`, `getOwnPropertySymbols`.
  (`getPrototype`/`setPrototype`/`isExtensible`/`preventExtensions` move from inline
  field access to virtual; keep ordinary implementations inline-able in the header.)
- [ ] Add `receiver` parameters to `getProperty`/`setProperty` (defaulted; ignored by
  ordinary objects for now — see Phase 0).
- [ ] Add `virtual bool isProxy() const { return false; }` (or rely on `dynamic_cast`)
  for the few places that must branch on proxy-ness (e.g. `Array.isArray`, revocation
  checks, `Object.prototype.toString` builtin tag).
- [ ] Grep for places that read `prototype_`/`extensible_`/`properties_` directly or
  cache results of these methods in a way that would go stale under virtual dispatch.
- [ ] Build, `npm test`, `npm run test262:diff` — must be zero regressions before moving on.

## Phase 2 — Reflect (independent payoff, needed by Proxy tests)

New builtin, no Proxy dependency. Follows the `BuiltinBase<T>` pattern *except* Reflect is
a plain namespace object (not a constructor, no prototype) — like `Math`/`JSON`. Check how
those are wired in `builtin_manager.cpp` and mirror that rather than `BuiltinBase`.

- [ ] `include/rift/builtins/reflect/reflect.h` + `src/builtins/reflect/reflect.cpp`
- [ ] 13 static methods (each a thin wrapper over the now-virtual internal methods, with
  spec-mandated TypeError checks for non-object arguments):
  `apply(target, thisArg, argList)`, `construct(target, argList[, newTarget])`,
  `defineProperty`, `deleteProperty`, `get(target, key[, receiver])`,
  `getOwnPropertyDescriptor`, `getPrototypeOf`, `has`, `isExtensible`, `ownKeys`,
  `preventExtensions`, `set(target, key, value[, receiver])`, `setPrototypeOf`
- [ ] `ownKeys` ordering per spec §10.1.11 OrdinaryOwnPropertyKeys: array-index keys in
  ascending numeric order, then string keys in insertion order, then symbol keys in
  insertion order. Rift's `getOwnPropertyNames()` is insertion-order only — implement the
  ordering in a shared helper, since the Proxy `ownKeys` invariant check needs it too.
- [ ] `Reflect.construct` with a `newTarget` differing from `target`: if the current
  `CallContext` machinery can't represent new.target, document a SIMPLIFIED deviation and
  expect those specific tests to fail (don't block the phase on it).
- [ ] Wire up: `setupReflect()` in `builtin_manager.cpp`, called from `setupBuiltins()`;
  add `src/builtins/reflect/reflect.cpp` to `BUILTINS_SOURCES` in `CMakeLists.txt`.
- [ ] `@@toStringTag` = "Reflect" on the namespace object.
- [ ] Remove `"Reflect"`, `"Reflect.construct"`, `"Reflect.set"`, `"Reflect.setPrototypeOf"`
  from `UNSUPPORTED_FEATURES` in `scripts/test262/core.js`.
- [ ] `npm run test262 -- --include="built-ins/Reflect"` — target the bulk of 153 tests.

## Phase 3 — JSProxy Exotic Object (the core)

- [ ] New files: `include/rift/builtins/proxy/js_proxy.h` (the exotic object class — may
  belong in `src/types/` instead given it's a `JSObject` subclass; decide during
  implementation) and `include/rift/builtins/proxy/proxy.h` +
  `src/builtins/proxy/proxy.cpp` (the `Proxy` constructor builtin).
- [ ] `JSProxy` internal slots: `JSObject* target_`, `JSObject* handler_`. Revocation sets
  both to nullptr; every internal method first checks for revoked state and throws
  TypeError if so.
- [ ] Shared trap dispatch helper:
  `Value getTrap(const char* name)` — `handler_->getProperty(name)` (this itself goes
  through the prototype chain / nested proxies correctly via virtual dispatch); throw
  TypeError if the result is neither undefined/null nor callable; undefined/null → fall
  through to the target's internal method (which, via virtual dispatch, handles
  proxy-of-proxy for free).
- [ ] Implement all overridden internal methods with their **spec invariant checks**
  (§10.5.1–10.5.14). The invariants are most of the test262 surface — do not skip them:
  - `getPrototype` → `getPrototypeOf` trap; invariant: if target non-extensible, result
    must equal target's prototype
  - `setPrototype` → `setPrototypeOf` trap; same non-extensible invariant
  - `isExtensible` → trap result must equal target's actual extensibility
  - `preventExtensions` → trap true only valid if target actually non-extensible
  - `getOwnPropertyDescriptor` → trap returns object/undefined; invariants around
    non-configurable and non-extensible targets; result descriptor must be "compatible"
    (needs a `ValidateAndApplyPropertyDescriptor`-style compatibility check — check whether
    `JSObject::defineProperty` already has logic to reuse/extract)
  - `defineProperty` → invariants vs. non-extensible target / non-configurable existing
  - `hasProperty` → `has` trap; can't report false for non-configurable own props of target,
    nor for any own prop of a non-extensible target
  - `getProperty` → `get` trap `(target, key, receiver)`; invariants: must match value of
    non-configurable non-writable data prop; must be undefined if non-configurable accessor
    with undefined getter
  - `setProperty` → `set` trap `(target, key, value, receiver)`; mirror invariants
  - `deleteProperty` → trap can't report true for non-configurable own props
  - own-keys family → `ownKeys` trap: result must be array-like of strings/symbols, no
    duplicates, must include all non-configurable keys, and exactly the target's keys if
    target non-extensible. NOTE: Rift exposes own keys via three separate methods
    (`getOwnPropertyNames`, `getEnumerablePropertyNames`, `getOwnPropertySymbols`) — all
    three must route through the single `ownKeys` trap and then filter
    (enumerability filtering for the enumerable variant goes through the
    `getOwnPropertyDescriptor` trap per spec for-in semantics; document if simplified)
  - `call` → `apply` trap `(target, thisArg, argsArray)`; only if target callable
  - construct path → `construct` trap `(target, argsArray, newTarget)`; result must be an
    Object or TypeError. See Phase 4 for where `new` is intercepted.
- [ ] **GC**: override `getReferences()` to include `target_` and `handler_`. Use
  `GCProtector` while constructing the proxy. Add a GC-stress test (proxy alive, original
  target/handler references dropped, force GC, traps still work).
- [ ] `Proxy` constructor builtin (`proxy.cpp`):
  - `new Proxy(target, handler)` — TypeError if either is not an object; must throw when
    called without `new` (check how other builtins detect `CallType::Constructor`)
  - **No `Proxy.prototype`** (per spec, `Proxy` has no prototype property) — this deviates
    from the `BuiltinBase<T>::create()` flow, which always wires one up; either bypass
    `BuiltinBase` or delete the property after creation
  - `Proxy.revocable(target, handler)` → `{ proxy, revoke }`; `revoke` nulls the slots
  - `Function.length` of 2, name "Proxy"
- [ ] Wire up: `setupProxy()` in `builtin_manager.cpp`; `CMakeLists.txt` `BUILTINS_SOURCES`.
- [ ] Smoke tests in `test/` (custom suite): get/set/has/delete traps, default fall-through
  with empty handler, revocation, invariant TypeErrors, nested proxies.

## Phase 4 — Route the Bypass Sites Through Internal Methods

Virtual dispatch fixes every site that already calls `JSObject` methods. These sites
don't, and must be rewritten (each is also a correctness fix for ordinary objects):

- [ ] **`in` operator** (`expression_evaluator.cpp:343-374`): replace the manual
  `hasOwnProperty` + prototype loop with `obj->hasProperty(key)` so the `has` trap fires
  once at the right level.
- [ ] **Member access chain walk** (`expression_evaluator_objects.cpp`, the
  `hasOwnProperty`-loop around line 368): route through virtual `getProperty`.
- [ ] **`instanceof`** (`expression_evaluator.cpp:381-441`): the `getProperty("prototype")`
  read is fine, but the receiver-side walk uses `getPrototype()` directly — once virtual
  that's automatically trapped; verify. (Adding `@@hasInstance` is out of scope; note it.)
- [ ] **for-in** (`statement_evaluator_control_flow.cpp:450-474`): keep using the
  enumeration method but confirm it's the virtual one; for proxies this becomes
  `ownKeys` trap + per-key enumerability via `getOwnPropertyDescriptor` trap.
- [ ] **`new` expression** (`expression_evaluator_objects.cpp:1363-1440`): currently does
  `dynamic_cast<JSFunction*>` + `isConstructor()` + ordinary instance creation
  (`Object.create(ctor.prototype)`) + call. For a `JSProxy`, the proxy's `construct` trap
  must control instance creation — add a branch: if the constructor is a `JSProxy`, call
  its construct path instead of pre-creating the instance. (This is the one place
  `isProxy()` branching is unavoidable, since [[Construct]] isn't a separate virtual today.
  Alternative: introduce `virtual Value construct(args, newTarget)` on `JSFunction` —
  prefer this if the diff stays manageable; it also future-proofs bound functions.)
- [ ] **Compound assignment getter path** (`expression_evaluator_assignment.cpp:235-290`):
  reads via `findPropertyDescriptor` then invokes getters manually — for proxies this must
  be a plain `getProperty` (the `get` trap subsumes accessor invocation). Same review for
  the member-read accessor path in `expression_evaluator_objects.cpp:300-320`.
- [ ] **Object statics** (`src/builtins/object/object.cpp`): `keys`/`values`/`entries`/
  `assign`/`getOwnPropertyNames`/`getOwnPropertySymbols`/`getOwnPropertyDescriptor(s)`/
  `defineProperty`/`defineProperties`/`freeze`/`seal`/`isFrozen`/`isSealed`/
  `getPrototypeOf`/`setPrototypeOf`/`isExtensible`/`preventExtensions` — audit each;
  most become correct via virtual dispatch, but `setPrototypeOf`'s current
  silently-ignore-non-extensible behavior must become trap-aware and spec-correct.
- [ ] **`Array.isArray`** (`src/builtins/array/array.cpp:285-315`): currently a
  length+push heuristic. Spec `IsArray` pierces proxies: `Array.isArray(new Proxy([], {}))`
  is `true` (and throws on revoked proxies). Replace the heuristic with a real check
  (`dynamic_cast`/type tag for arrays + unwrap `JSProxy` targets recursively). This likely
  fixes other latent bugs; run full test262 diff after.
- [ ] **`JSON.stringify` / `JSON.parse` reviver paths** (`src/builtins/json/json.cpp`):
  confirm property reads/enumeration go through virtual methods (SerializeJSONObject uses
  EnumerableOwnPropertyNames — must hit `ownKeys` + `get` traps).
- [ ] **Spread / `Object.assign` / destructuring**: confirm they route through
  `getProperty`/enumeration methods (they should once virtual; spot-check with tests).
- [ ] Grep audit: `dynamic_cast<JSArray` / `dynamic_cast<JSFunction` and any direct
  `properties_` access in builtins for remaining proxy-bypassing fast paths; fix or
  document each.

## Phase 5 — Test262 Enablement and Burn-Down

- [ ] Remove `"Proxy"` from `UNSUPPORTED_FEATURES` in `scripts/test262/core.js`.
- [ ] `npm run test262 -- --include="built-ins/Proxy"` and
  `--include="built-ins/Reflect"`; triage with the failure-pattern analysis snippet from
  CLAUDE.md.
- [ ] Note: the `Proxy/enumerate` trap directory tests a **removed** ES2016 trap — those
  tests should mostly pass trivially or be feature-flagged; don't implement `enumerate`.
- [ ] Full `npm run test262:diff` — zero regressions outside Proxy/Reflect, and watch for
  newly-passing tests elsewhere (e.g. `Array.isArray`, `Object.setPrototypeOf` fixes).
- [ ] `npm test` (custom suite) green.
- [ ] Record the new pass counts.

## Phase 6 — Documentation and Cleanup

- [ ] **CLAUDE.md**:
  - Remove `Proxy, Reflect` from "Current Known Limitations".
  - Project Layout: add `src/builtins/proxy/` and `src/builtins/reflect/` lines.
  - Critical Patterns: add a short "Proxy interception" subsection — *all* property access
    must go through the virtual `JSObject` internal methods; never hand-walk
    `getPrototype()` chains or read property storage directly, or proxy traps are bypassed.
  - "Adding a New Built-in Object": note the namespace-object variant (Math/JSON/Reflect)
    if a reusable pattern came out of Phase 2.
- [ ] **docs/STYLE_GUIDE.md**: add `@spec` comment conventions used for trap/invariant
  steps if any new tag pattern emerged (e.g. invariant-check annotations).
- [ ] **notes/TODO.md**: delete the Proxy/Reflect line entirely (per working preference:
  remove finished items). Add any consciously-deferred follow-ups as new items
  (`@@hasInstance`, receiver-aware ordinary `[[Set]]`, `Reflect.construct` newTarget,
  true Array exotic `[[DefineOwnProperty]]`, bound-function exotic object).
- [ ] **Spec comments**: every new method annotated with `@spec` step comments; mark
  SIMPLIFIED/DEVIATION where we consciously deviate (symbol-as-string keys, receiver
  handling, enumerate-order details).
- [ ] Update the `// INCOMPLETE: Rift does not check the return status for Proxy objects.`
  comment in `src/builtins/object/object.cpp:1077` (fix the behavior or update the note).
- [ ] `cd build && make format`.
- [ ] Delete this PROXY.md once everything above is done (it's a working plan, not docs);
  fold anything durable into CLAUDE.md / notes/.

---

## Risks / Open Questions

- **Virtual-call overhead** on the hottest path (`getProperty`). Tree-walking interpreter
  overhead dwarfs vtable dispatch, but benchmark a tight property-access loop before/after
  Phase 1 to confirm (e.g. `./build/rift -e` with a 1e6-iteration member-read loop).
- **`getPrototype()` becoming virtual** changes a previously-inlined hot accessor used in
  every prototype-chain walk — same benchmark covers it.
- **Trap calls during GC-sensitive windows**: a trap is arbitrary JS that can allocate and
  trigger GC mid-internal-method. Any internal method holding raw `JSObject*` locals across
  a trap call needs those values rooted (`GCProtector`) — this is the most likely source of
  subtle crashes; review every trap-invoking method for it.
- **for-in over proxies** is spec'd via the `ownKeys` + `getOwnPropertyDescriptor` traps;
  Rift's for-in already deviates (uses `getOwnPropertyNames`, includes non-enumerables).
  Decide whether to fix for-in enumerability as part of Phase 4 or document the deviation.
- **`CallContext` has no `newTarget`** — limits `Reflect.construct(target, args, newTarget)`
  and the `construct` trap's third argument. Acceptable first-pass deviation; count the
  affected tests during Phase 5 and decide if threading newTarget through `CallContext` is
  worth it in this effort.

## Estimated Order of Work

| Phase | Scope | Test262 payoff |
|-------|-------|----------------|
| 1. Virtualize internal methods | refactor, zero behavior change | 0 (enabler) |
| 2. Reflect | new builtin, mostly thin wrappers | ~153 tests |
| 3. JSProxy + Proxy constructor | the core, invariants included | bulk of 311 tests |
| 4. Bypass-site audit | interpreter + builtins fixes | remainder + latent fixes elsewhere |
| 5. Test262 burn-down | triage and fix | long tail |
| 6. Docs/CLAUDE.md/TODO cleanup | bookkeeping | — |

Each phase ends with: incremental build, `npm test`, `npm run test262:diff`, `make format`.
