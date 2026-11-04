# Bounded compiler-support investigation

Decision: **no-go for a localized compiler prototype under the unchanged E4/A08 contract**. Recommend reviewing the callback boundary before commissioning a compiler feature project. This is an evidence checkpoint, not implementation acceptance or permission to weaken the accepted design.

The investigation began 2026-11-04 at 04:29:43 UTC. It stopped before the first roughly 30-minute checkpoint because independent required features exceed a receiver-forwarding patch. No compiler implementation was attempted. No Rift production code, compiler pin, installed package, or accepted contract changed.

## Source and method

An absent destination was checked before cloning `https://github.com/vercel-labs/scriptc.git` into `C:/Users/jonku/code/scriptc`. Branch `codex/receiver-investigation` is pinned to `6c60b0bcbfc6edd34ce5c1cdb588d42bdb7171ff`, the source revision established by the preceding [diagnosis](../compiler-diagnosis.md). The compiler checkout is clean. No dependencies were installed and no compiler was rebuilt. Executable results below use Rift's existing pinned scriptc 0.4.7 binary, not the source checkout.

`source-evidence.json` preserves the repository, revision, clean status, SHA-256 of complete Git source text, and numbered excerpts. `capture-source.mjs` regenerates it from Git objects, avoiding worktree line-ending changes. The existing parent evidence includes the upstream license and provenance limitations; no new binary/source reproducibility claim is made.

Each probe has complete Node, native build, separate coverage, and native execution transcripts in its `*-results.json`. `probes.mjs` regenerates those transcripts. A successful `--tier static-only` build does **not** establish zero dynamic operations: the separate coverage results remain mandatory. `verify.mjs` checks exact expected output/status, expected dynamic statement counts, and six independent strict TypeScript checks. Its success means the retained diagnostics match, including intentional native failures; it does not mean E4 passes.

## Executable findings

| Probe | Node / native | Dynamic statements | What it isolates |
| --- | --- | ---: | --- |
| getter-structural | pass / pass | 2 | Live private-class getters through structural Context, frozen instance |
| getter-nominal | pass / pass | 1 | Same getters and freeze, nominal parameter |
| getter-structural-unfrozen | pass / pass | 1 | Structural getters without freeze |
| getter-nominal-unfrozen | pass / pass | 0 | Nominal getters without freeze |
| receiver-contract | 8 groups pass / 7 pass, proxy fails | 43 | Semantic receiver baseline, ordinary unbound callbacks |
| proxy-receiver | pass / construction error | 10 | Native class-target Proxy unsupported |

Every native build and coverage invocation exited zero. All six strict typechecks passed. The getter probes read realm 7 then 11 and produce cumulative steps 4. They deliberately omit receiver authentication to isolate other costs. Their arrow callbacks are **not candidates**. Nominal parameters and unfrozen instances are diagnostic controls, not proposed API or immutability changes.

The semantic baseline uses frozen genuine class getters, a structural Context, ordinary functions checking `this === view` before active-state/effect checks, and save/restore counters in `finally`. It checks authentic calls, copied functions on clones and spreads, detached functions, a different genuine view, wrong and authentic `.call`/`.bind`, argument-evaluation versus dispatch ordering, nested throws with exact sentinel identity, callback identity, freeze/write/defineProperty rejection, and idle authentic/rebound invocation. Node passes all eight groups. Native passes seven groups with 43 dynamic statements.

The failing proxy group is **not** evidence that receiver authentication accepted a proxy. The reduction exits before its first log with `Uncaught Error: non-plain targets or handlers on a native Proxy is not supported yet`. Pinned `scr_json.c:3160–3195` explicitly rejects the target/handler combination. Node constructs the proxy, observes distinct identity, accepts authentic call/tick, and returns false for both proxy receiver comparisons. Native never reaches those comparisons. This unmet negative test must remain visible, not counted as successful authentication.

These are diagnostic subsets, not the complete E4/A08 matrix. There is no engine, record/body activation, builtin permit, runtime-fed attack selection, two concurrently active session owners, complete limits/resource prefixes, or guest execution here. Nested cleanup checks local callback state and sentinel identity; they do not establish that a new static receiver channel would unwind correctly. No full Rift suite was rerun because production was unchanged.

## Why the receiver-only correction is insufficient

The previous diagnosis establishes that typed record invocation omits the ambient receiver while explicit `this` reads `dyn.this`. Removing the JavaScript-only receiver propagation guard can repair that semantic omission, but it cannot meet zero dynamic coverage. Additional evidence now isolates independent obstacles:

1. `ir.ts:290–315` has no typed receiver slot in function types. `callValue` has an optional receiver, but `validate.ts:2875` requires DYN. LLVM `expr-calls.ts:855–1025` handles ambient dynamic receivers, typed boxing recipes, and scoped push/pop. `scr_closure.h` defines environment plus ordinary parameters and the receiver-free optimization. A raw typed pointer cannot simply be passed through the current IR field.
2. `class-protocols.ts:95–200` deliberately detects accessor/data mismatches and identity-sensitive structural flows. `type-mapper.ts:8758` maps implemented structural protocols to DYN. Existing structural coercions copy fields; `structural-plans.ts:560–610` rejects accessor/method flattening. A field snapshot cannot substitute for a live getter or preserve the original view's receiver identity.
3. `class-attributes.ts:89–155` sets integrity bits **and** applies `dyn.freeze` to the property bag. The nominal frozen probe therefore still has dynamic coverage. Erasing the operation or only setting bits needs a sound closed-object proof plus descriptor/reflection behavior, not a coverage exemption.
4. Callable `.call`/`.apply`/`.bind` lowering around `lower-calls.ts:10585–10635` uses dynamic invocation for the convertible function path. Exact authentic forwarding and wrong-receiver rejection must both survive any static replacement.
5. Class-target Proxy construction is unsupported by the installed runtime. Expanding this requires runtime work beyond a typed receiver comparison, unless the accepted testing/behavior contract is explicitly revised in a separate design review.

`tiers.ts:85–125` counts dynamic IR operations and dynamic helpers. Reclassifying `dyn.this`, excluding generated helpers, or ignoring separate coverage would hide rather than solve these dependencies.

## Smallest plausible static design to review

No complete minimal design has been validated. The narrowest plausible design for these callbacks is an **identity-only receiver channel**, rather than a full statically typed JavaScript `this` value. This is a compiler feature proposal, not a demonstrated equivalent representation:

- Add a dedicated IR receiver identity value with an explicit absent-receiver state. Identity must distinguish authentic objects, clones, foreign sessions, null/undefined, and wrappers; it must survive compatible structural views without copying object identity. Only proven identity comparisons may consume it. General property reads of `this` still require normal typed/dynamic semantics.
- Carry that value at every relevant indirect invocation. An ambient raw identity stack could preserve the current closure parameter ABI, but requires new runtime entry/read/restore operations, lifetime/rooting rules, nesting, and exception cleanup. An explicit hidden receiver argument avoids ambient state but changes closure and adapter ABIs. Neither is a one-site frontend edit. Receiver-free optimizations must not elide a value needed by a reachable callback.
- Lower `this === capturedView` to a stable identity comparison only after proving both identities refer to the same representation domain. Do not brand-cast a foreign receiver before the callback's own authentication, box the token as DYN, or let the token authorize the call independently of active-frame checks. Authenticated execution must still occur inside the callback, before effects.
- Preserve JavaScript evaluation order: evaluate property/base and arguments once, then invoke with the actual syntactic receiver; detach supplies absent receiver. Static `.call` and `.bind` adapters must preserve explicit receiver selection, bound arguments, and callback identity rules. JavaScript/dynamic interoperability needs a specified bridge rather than silently dropping receivers.
- Introduce live static structural dispatch for Context: a view retaining original object identity plus typed accessors/function reads, supporting both legacy record contexts and genuine private class getters. Existing record-copy coercion cannot provide this. Every helper accepting Context must retain structural API semantics; simply making Context nominal is outside the contract.
- Either prove the instance has no dynamic properties and implement all required integrity operations statically, or supply static descriptor/property support. Keep private mutable session state separate from frozen public view state. Reflect.set and defineProperty negatives must remain meaningful.

This design preserves the contract in intent, but its proof obligations are not localized. Identity-only specialization could reduce the receiver portion; it does not eliminate structural dispatch, integrity, forwarding, or Proxy requirements. There is no evidence yet that all remaining operations in the real engine stay static after integration.

## Surfaces, costs, and required validation

| Surface | Required work / risk |
| --- | --- |
| Frontend lowering and analysis | Track explicit `this`, live structural receiver identity, calls/rebinding, class integrity; prove permitted identity-only use |
| IR and validation | New static receiver representation and invariants; update traversal, serialization, generated codecs/fields through their generators |
| Closure creation and LLVM calls | Propagate receiver through direct/indirect calls and adapters; review receiver-free flags and closure environment ownership |
| Runtime | Ambient identity stack or changed closure ABI; exception-safe restoration and lifetime management; interop bridges; class-target Proxy support |
| Structural type mapping/coercion | Identity-preserving live interface dispatch across class and record values, accessor semantics and compatible function fields |
| Integrity/reflection | Preserve frozen/extensibility/descriptor behavior without dynamic operations; prove safe optimizations |
| Coverage and regression suite | Count every introduced operation honestly; receiver/order/throw/identity regressions plus existing compiler call/closure/class/coercion tests |

Cost assessment is qualitative: receiver propagation alone is a small semantic correction; a complete static path is a cross-cutting compiler feature effort. No reliable day/week estimate follows from this read-only investigation. Avoid committing to upstream maintenance or a toolchain fork before design review.

Before any prototype could qualify, require exact Node/native expectations for authentic, detached, copied, foreign-session, spread, proxy, call/apply/bind, and forwarding cases; getter/function identity and live realm reads; evaluation order; nested and thrown restoration; immutability/reflection; legacy structural contexts; and zero dynamic statements from separate coverage. Then require the full unchanged E4 acceptance matrix and production preservation checks. A compiler patch would also need its own build/test gates and provenance before a separately authorized pin change.

## Reproduction and limitations

From the Rift root, with the existing Zig directory on PATH for native builds:

```powershell
node typescript/docs/validation/ts-033e4/compiler-investigation/probes.mjs getter-structural getter-nominal getter-structural-unfrozen getter-nominal-unfrozen receiver-contract proxy-receiver
node typescript/docs/validation/ts-033e4/compiler-investigation/verify.mjs
node typescript/docs/validation/ts-033e4/compiler-investigation/capture-source.mjs
```

Native build access to installed Zig libraries required sandbox escalation in this environment. Source evidence capture needed read access to the isolated checkout's Git objects. Initial strict checking omitted Node ambient types and reported TS2591 for `process`; adding `--types node` to the verification command resolved it without changing the probe.

Recommendation: stop this bounded investigation here and reconsider the callback boundary in a separate review. Keep the current E4 contract and activation blocked until a replacement is explicitly approved or the broader compiler project is authorized. Do not interpret this recommendation as adopting bound callbacks, weakening receiver authentication, accepting dynamic coverage, or changing toolchain pins.
