# TS-019B1 implementation evidence

2026-11-02. Accepted base `aab04a2`, unchanged branch
`codex/primitive-computed-keys`. Sole implementation writer: chat
`01a199f9-8e1b-7ce1-a6d2-c2d5b23f1585`. Coordinator review is pending.

## Semantics and sources

Actually consulted ECMA-262 **2025 edition 16**, [7.1.1 ToPrimitive and
OrdinaryToPrimitive](https://tc39.es/ecma262/2025/multipage/abstract-operations.html#sec-toprimitive),
and engine262 **d553e7b52501fbc47eae981c8d0fa7a5c26d0171**,
[src/abstract-ops/type-conversion.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/type-conversion.mts).
The fixed specification governs: nullish hook absence, exact hints, primitive
results, and no fallback after a present hook. Engine262 corroborates separate
protocol and ordinary paths. Adopted these boundaries without copying code,
generators, ambient agents, or expanding intrinsic registration. Web raw fetch
missed cache; sandbox DNS failed; approved read-only pinned raw fetch succeeded.
This was source inspection, not execution of engine262.

Only production changes: symbols.ts exports the shared immutable canonical
identity; primitive-conversion.ts adds one charged Get and existing-context Call.
No context signature, evaluator, converter, storage or Realm change. Primitive
fast path and direct ordinary helper retain their previous behavior.

## Pre-change inventory and expectation migration

[pre-change-inventory.txt](pre-change-inventory.txt) records the search before
production changes. Every production caller was inspected:

| Consumer | Disposition / protocol evidence |
| --- | --- |
| conversion.ts ToPropertyKey | No production change; fixture computed read/write/call returns an identity symbol with string hint |
| evaluator.ts unary numeric | No change; runtime fixture unary minus, number hint |
| evaluator.ts addition | No change; fixture default hint and numeric result |
| evaluator.ts numeric binary | No change; fixture multiplication, number hint |
| evaluator.ts relational | No change; fixture less-than, number hint |
| array-like.ts lengthOfArrayLike | No change; map bridge invokes existing length consumer once |
| array-object.ts length definition | No change; fixture assignment and P8 prove two complete fresh conversions |
| array-map.ts internal map | Existing host bridge, not a new guest method; exact output length, holes and elements |

All pre-existing observer signatures already accept PropertyKey. Narrow behavior
and exact budget migrations are deliberate:

- primitive-conversion Observed/ObservedArray return undefined for the real key;
  ordinary read counters continue to mean ordinary reads. Observed also counts
  protocol reads separately. H2-H9/H15 traces gain one leading tick. H11/H12
  failures still target ordinary candidates: tick1/tick2 move to ticks 2/3.
  H13 finite recursion costs 6 instead of 3 ticks; call-limit recursion costs 10
  instead of 5; step exhaustion remains exactly 4. Direct H17 converter traces
  stay empty; successful ordinary lookup traces stay ordinary-only.
- key-coercion ThrowingKey explicitly reports absence before its ordinary-only
  trace; failures still target toString/valueOf. Their failing ticks move 1/2
  to 2/3. No symbol is implicitly concatenated into that trace.
- length-coercion ObservedHook records the actual new symbol lookup explicitly.
  Its ordinary tick failures shift by one; total first/second candidate counts
  change 1/2 to 2/3. One length Get, call counts and effects are unchanged.
  Sparse-map exhaustion remains 4 with limit 3: two lookup ticks now precede scan.
- array-length-coercion Observed/FallbackObserver explicitly report absence;
  their ordinary read/call failure targets remain unchanged. One-method length
  conversions cost 2 ticks each, fallback conversions 3 each. First/second
  conversion failure counts are exact; mutation and no-later-work checks remain.
- object-valueof inherited trace becomes tick/tick/valueOf/tick (3 total).
  Call-depth rejection now occurs after 2 ticks, still before method entry.
  Null-root budget increases 2 to 3 to retain the TypeError for missing methods,
  with an exact 3-step assertion. New P9 separately proves tight-step rejection.
- Generic throwing Get observers in addition, numeric-operators, relational,
  operator-coercion and length-coercion Forbidden remain unchanged: they still
  throw the exact sentinel on the first lookup, now the real symbol lookup.
- RealmObserved, length-only observers, reference-target observers and unrelated
  call/prototype observers retain their dispatch. Other exact budgets concern
  primitive inputs, AST/call/scan work or zero-hook direct conversion; all pass
  unchanged. No call-depth limit was raised and no ticks were suppressed.

The initial Node run is retained in initial-node.txt: 159/164, with precisely
these five driver failures before expectation migration. No failures were skipped
or removed; the final suite retains all 164 entries and 23 native entrypoints.

## P1-P9 assertion map

All new host assertions live in the existing compiled primitive-conversion.ts
entrypoint, with explicit P labels; the fixture is read at runtime.

| Matrix | Evidence |
| --- | --- |
| P1 | Canonical key across independent evaluator/Realm contexts, same-description and two string impostors, symbol fast path; runtime fixture receives canonical key |
| P2 | Own/inherited hooks, all three hints, exact tick/Get/Call order and receiver/context/location; every supported primitive result including negative zero, NaN, lone surrogate and symbol retains Value identity; runtime-read consumers assert exact values and full hint/effect trace |
| P3 | Missing/undefined/null cases for every hint, default ordinary number order, exactly two ticks on one-method fallback |
| P4 | Boolean, number, string, symbol and noncallable object rejection; callable object result rejection; protocol observer fails on any ordinary lookup |
| P5 | Exact Get/Call sentinel object, value, diagnostic and location; tick sentinel prevents Get; no fallback |
| P6 | A caller to B hook to C hook and B/A restoration, symbol result or exact guest throw/host fault; shared context, exact steps/depth and successful later call |
| P7 | Direct ordinary helper with a present noncallable real key: zero protocol reads, one ordinary read/tick, normal result |
| P8 | First hook replaces itself, second sees replacement/original receiver and hint; first failure skips second, second failure and mismatch prevent length writes; growing to index 6 before shrinking proves post-conversion old-length observation |
| P9 | Recursive exotic hook: exact call/step limit messages, visits and ticks, cleanup allowing later bounded call without resetting steps; absent-hook tight budget prevents ordinary Get |

## Validation and limits

See the final command results below. Initial native build is retained separately
in native-initial.log/native-initial-results.json: installed Zig libraries are
inaccessible in the sandbox. Every separate coverage report was fully static.
The authorized rerun uses the same pinned compiler, static-only builds and
fail-closed separate coverage parser with access to installed Zig libraries.
No compiler workaround, new annotation, import workaround or toolchain change
was needed. Existing isolated imports and callback annotations are preserved.

Scope remains partial: no Symbol prototype methods, toStringTag, Object toString,
guest Symbol global/factory/registry, accessors/proxies, implicit boxing, workers
or async. The shared identity lasts for one runtime module instance; no
cross-process transfer guarantee. Windows x64 only; no performance claim.
C++, Claude reserved paths and COORDINATION.md untouched. No branch switch,
main merge or successor work.

| Final command | Result | Retained evidence |
| --- | --- | --- |
| npm run typecheck | PASS | typecheck.log |
| npm run test:runner | 20/20 | runner.log |
| npm run test:probes | 10/10, both hosts/static gates | probes.log, probe-results.json |
| npm run test:guest:node | 164/164, no skips | node.log, guest-node-results.json |
| npm run test:guest:native | 23/23 builds/coverage; 164/164, no skips | native.log, native-build-results.json, guest-native-results.json |
| git diff --check | PASS | whitespace.log |

Final static counts include CLI 1260/1260, primitive-conversion 1760/1760,
array-length-coercion 1758/1758 and object-valueof 1471/1471. All entrypoint
reports are retained in JSON. No final timeouts, crashes, harness failures or
unsupported omissions. Text log trailing whitespace is normalized; subprocess
streams remain in JSON. sha256.txt hashes source/tests and evidence with CRLF
normalized to LF for reproducibility across checkouts.
