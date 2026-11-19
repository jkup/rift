# Proposed callback boundary: session-owned function capabilities

**Proposed only — not adopted.** Design review following `b2b037e`, authorized by `522413d` on 2026-11-04. Recommend this design for coordinator review and, if accepted, a separately assigned atomic E4 implementation. Existing contracts and historical failures remain unchanged. No production, test, compiler, or pin edits accompany this proposal.

## Decision and supported threat model

Use one stable plain `OperationContext` per private Script engine. Its `call` and `tick` functions capture that engine and check that its session is active before doing work. The functions themselves carry authority; the invocation receiver does not. Keep an engine-owned writable Realm projection for existing semantic helpers, updated and restored with the private frame. This matches the established legacy evaluator representation without granting legacy contexts Script authority.

The protected boundary is **guest JavaScript versus interpreter state**, plus ordinary misuse of opaque host entry APIs. Guest property operations access guest descriptors on GuestObject; they do not expose host context objects, closure captures, private record storage, permits, or sessions. Trusted embedding code chooses which builtins exist and may transfer legitimate guest objects across Realms. Builtin implementations are trusted interpreter extensions, not sandboxed hostile plugins. They must use the canonical supplied context for semantic helpers and must not mutate its fields, rewrite host prototypes, recover implementation internals, or pass malformed host objects through casts.

Opaque entry validation, runtime private keys/brands, private record ownership, and one-use builtin permits remain defensive checks. They do not make arbitrary same-process host JavaScript safe. Constructor recovery alone must still fail to create an authorized engine/session or read executable bodies. Reflection that replaces code/prototypes or invokes hidden implementation methods after replacing validators is outside the threat model. This distinction is explicit rather than described as general hostile-host security.

Copying a function capability intentionally transfers its authority. A copied `call` from session A still dispatches through A's private active frame and budgets, even when invoked as `clone.call`, detached, or while B is active. If A is idle it rejects, even if B is active. Copying it cannot retarget it to B or mint an independent budget. Possession of a copied function is therefore meaningful authority, unlike the old A08 contract. The capability lasts for the session lifetime: a retained function becomes usable again when that session is active on a later unit. There is no per-activation revocation promise. Hosts needing that guarantee would require a separately designed generation-bound capability.

Host mutation of the plain context is unsupported, not prevented. In particular, the TypeScript readonly Realm property is not runtime immutability. Private frame state remains authoritative, but a hostile host that changes the projection or substitutes callbacks can corrupt trusted helper behavior. This proposal does **not** claim to survive that corruption. If hostile builtin code must be supported, reject this proposal and design an isolation boundary; the old receiver check did not isolate a host already holding the authentic capability either.

## Two alternatives considered

| Design | Authority and clarity | Migration and feasibility | Assessment |
| --- | --- | --- | --- |
| A. Nominal context with private owner and direct methods | Context reference is the capability; direct methods centralize active-state checks; avoids a writable Realm projection if callers use `realm()` | All relevant consumers must use the nominal type and method access. Converting back to a structural getter interface reintroduces the measured dynamic path. Legacy test contexts need a reviewed construction/adaptation story. Extracted methods and hostile reflection are not promised | Defensible design, 65-statement static seam passes. Larger shared-interface migration, not selected merely to retain method receiver rejection |
| B. Captured functions in plain structural Context | Functions are capabilities; private engine owns counters/frame. Call-site syntax stays familiar and matches the existing evaluator | Existing helpers and builtins keep `context.call/tick/realm`. Stable mutable Realm projection is a trusted-code invariant. 144-statement composite passes the current static gate | **Recommend**, for minimal conceptual and API change as well as compiler feasibility; explicitly relax hostile-host callback-shape requirements |

Neither alternative supplies a hostile-host sandbox. A nominal class can make accidental field writes harder, but trusting direct method calls and module encapsulation is not a substitute for isolating arbitrary host code. The recommendation favors a single engine ownership story already present in the codebase, preserves helper semantics, and avoids a broad nominalization of unrelated host setup tests. If review prefers nominal interfaces for long-term maintainability, the passing seam supports that option; the full migration is not proven by the small probe.

## Proposed API and ownership

Keep the planned external signatures: `createScriptSession(limits?)`, `evaluateScript(session, record)`, opaque session/record types, detached snapshots, and the existing `OperationContext` type in runtime.ts. No new public constructor, context getter, reset, setter, call method, AST entry, or callback-based body accessor. `evaluateScript` remains synchronous and rejects reentrant top-level entry for that session. Guest recursion uses the private dispatcher.

Inside `script-execution-internal.ts`, the single shared engine owns:

```ts
// Illustrative, not compiled production code.
this.activeContext = {
    realm: initialRealm,
    call: (callee, receiver, args, loc) => {
        this.requireActiveSession();
        return this.call(callee, receiver, args, loc);
    },
    tick: (loc) => {
        this.requireActiveSession();
        return this.tick(loc);
    },
};
```

No `this` from a callback's invocation is read. The canonical context is created once, privately retained, and passed only to trusted helpers and reached builtin callbacks. It is not frozen and does not use getter-backed structural properties. Dispatch uses private frame Realm and code provenance, never a caller-selected receiver or a clone's realm. Update the canonical `realm` at root/callee entry and restore it alongside the private frame in `finally`, including the last idle projection. Never allocate a fresh evaluator or budget owner for a nested call, builtin, GDI/FDI, or later unit.

Keep private record storage and shared dispatch co-located as in the accepted activation design. Keep module-private identity keys, genuine record/callable checks, original node->scope identity maps, fresh activation checks, exact source slices and assignment-name eligibility. No AST/map/body leaves the module or appears on the legacy wrapper. A copied inspection object or an equal unit ID/text is not executable provenance. The new proposal changes the host context representation, not these rules.

### Builtin entry without a context registry

Retain the exact one-use permit, but store the current permit in a module-private **synchronous invocation stack** (a saved previous pointer suffices), rather than relying on a nominal context brand to locate its engine. Each permit contains the canonical context, target guarded wrapper, callee Realm, receiver, args array and location identities, and consumed state. No public registry, context lookup service, permit getter, or mint function is exported.

The private dispatcher validates target/profile/call limit, installs callee state, pushes the exact permit, and immediately invokes the guarded wrapper. The wrapper first reads `context.realm.profile`, preserving the existing profile check and diagnostic precedence. If it differs from the wrapper Realm's profile, throw exactly `cross-profile callable invocation` without consulting or consuming a permit. A same-profile legacy wrapper directly invokes its raw callback without a Script permit. A same-profile Script wrapper calls the exported **consume-only** validator; false throws exactly `Script execution unavailable`, true permits raw invocation. The validator returns boolean, compares all supplied identities with the pending permit without reading context fields, and consumes only a complete match. Missing, used, or mismatched permits return false with no mutation. Do not catch arbitrary validator exceptions and relabel them.

This supersedes the earlier proposal's incorrect guarantee of validation before *any* context field read. The guard guarantees no engine tick, dispatch, raw callback, or permit consumption on an ordinary rejected invocation; it does not guarantee zero property reads. Reading fields on a trusted plain context is safe under the declared host contract. Malformed host values or hostile getters/proxies may throw or run host code during the profile read, and are not promised a particular message or side-effect isolation. That limitation must not be disguised as guest effects or successful hostile-host authentication. The canonical context alone, a clone, or a copied callback supplied to direct `.invoke` is insufficient. A copied genuine dispatch function can create a fresh permit through its owner, which is an intentional capability use.

Exact proposed wrapper order (model in diagnostic-guard.ts, not a production edit):

```ts
if (context.realm.profile !== wrapperRealm.profile)
    throw new Error("cross-profile callable invocation");
if (wrapperRealm.profile !== "legacy" &&
    !consumeScriptBuiltinPermit(context, wrapperRealm, wrapped, receiver, args, loc))
    throw new Error("Script execution unavailable");
return raw(receiver, args, context, loc);
```

Thus even a pending permit cannot override a profile mismatch; failed profile/tuple checks leave an otherwise matching pending permit available for the authentic neighbor. Consumed and stale permits retain the same unavailable diagnostic. See [diagnostic compatibility review](DIAGNOSTICS.md) for the inherited-test inventory and literal evidence. The original tuple probe's generic `permit` error is retained as historical representation evidence, not the proposed production error contract.

Consume before raw code runs, so callbacks cannot reuse the parent permit or invoke another builtin directly. Nested dispatch in the same or a different session saves/restores the previous pointer; on return that parent is already consumed. `finally` restores it even for host exceptions. This relies on synchronous execution with no await/yield between push and consume. Async/generator execution remains out of scope and would require revisiting this stack's ownership. No added semantic tick comes from permits or validation. Preserve the legacy Realm guard path, including cross-profile rejection.

### Exact proposed file/call-site migration

| Site | Proposed change if accepted |
| --- | --- |
| new script-execution-internal.ts | Existing planned record/shared-engine co-location; replace frozen getter view/unbound receiver callbacks with captured functions and private writable projection; module-private synchronous permits |
| script-record.ts, evaluator.ts | Existing planned compatibility facades; legacy public signatures and behavior remain intact; legacy wrapper cannot construct Script engine |
| new script-execution.ts | Existing opaque factory/evaluate facade only; no context export |
| realm.ts guardBuiltin | Preserve profile check first and exact cross-profile error; same-profile Script branch consumes matching permit or throws exact unavailable error; same-profile legacy raw invocation unchanged; no context-class cast or registry |
| runtime.ts, all semantic helpers and builtins | **No API/type/call-site change proposed**: use canonical `context.call(...)`, `context.tick(...)`, `context.realm`; no host receiver authentication dependency |
| new E4 driver and gate | Replace only explicitly superseded A08 capability-shape expectations; retain semantic matrices, resource prefixes, builtin guard tests and all inherited tests |
| docs/task assignment | Coordinator must approve supersession and exact ownership before implementation; historical contract remains preserved |

This is an ownership proposal, not permission to edit these paths now. The actual module cycle through Realm/record/engine and full callable/reference unions still need integrated validation. If a new source edit outside the accepted ownership proves necessary, retain the failure and seek a concrete scope revision.

## Old-to-new requirement matrix

| Old requirement | Proposed disposition and reason |
| --- | --- |
| A01 opaque sessions/records, no public body or AST entry | Preserve; runtime keys and genuine record identities still required. Node-only malformed-shape evidence below is not native proof |
| A02–A07 function/strict-this/accessor/cross-Realm execution and provenance | Preserve exactly; context authority representation has no guest-visible syntax or semantic role |
| A08 plain/clone/proxy/idle context passed directly to guarded builtin | Preserve permit rejection; consume compares canonical identity before raw callback. Proxy native construction remains unsupported evidence, not an invented passing rejection |
| A08 clone/spread/detached/wrongly rebound authentic call/tick functions reject | **Replace**: copied functions are explicit transferable capabilities, operate on captured owner when active, reject when that owner is idle. Receiver selection does not convey authority |
| A08 authentic receiver `.call/.bind` positive | Generalize: invocation receiver is irrelevant to a captured function. Native `.call/.bind` lowering is not required for engine production paths; no new native support claim |
| A08 other genuine session's view used as receiver | Replace receiver rejection with owner isolation: copied A function never becomes B function; if A idle reject, if both active A owns effects. Trusted hosts deliberately invoking A while B runs are forwarding A authority |
| A08 frozen callbacks/realm, assignment/defineProperty cannot alter behavior | **Withdraw hostile mutation guarantee**. Canonical context must not be mutated by host extensions; public readonly annotations remain descriptive. Guest cannot reflect it |
| A08 constructor recovery / structural casts / legacy-vs-Script profile | Preserve opaque entry/key defenses and cross-profile guards. Arbitrary host prototype/code replacement remains excluded; invalid shapes are separately labeled by host lane |
| A09 exact one-use permits, no direct invoke/replay/wrong target/args/receiver/location | Preserve. Clarify copied genuine dispatch function can mint a permit internally, but direct invocation cannot. Canonical context is supplied by owner, not copied receiver |
| A10 cleanup and exact guest/host abrupt identity | Preserve every semantic requirement; same saved frame/counters and finally structure |
| A11 inherited setup vs actual resource/fault lanes | Preserve exact labeling and prefixes; no mutable engine tick injection |
| A12–A15 evaluation ordering, completion payloads, naming, record identity | Preserve without changes |
| A16–A17 shared limits | Preserve monotonic steps across units; calls/depth are active nesting counters and restore, not cumulative counts; independent sessions stay independent |
| A18 grammar/profile/subset exclusions | Preserve; no public CLI, observation, arguments, Error-object or conformance admission |
| Unchanged structural OperationContext | Preserve in recommended B; alternative A would require explicit migration approval |
| Private branded/frozen context and exact view receiver as authority | **Replace** with private captured engine capability and canonical permit identity; no context brand is needed to authorize raw entry |
| All inherited 55 rows, E3 prefixes, ER R36 and 13 traces | Preserve as future atomic E4 acceptance, not satisfied by these probes |

## Semantics and authority argument

The engine remains the only owner of mutable execution state. No guest operation manufactures a host closure, context or permit. A host that knows only a structural type, copied realm, fake session, record inspection, or arbitrary callback cannot access lexical engine captures or the private key. A host that receives an authentic function has been delegated engine authority; it can forward that authority but cannot redirect its captured owner. Active-state checks bound use to active execution, not to invocation syntax. One-use permits independently bind entry to a specific reached builtin invocation.

Realm and code provenance remain distinct: guest calls install their defining record and Realm; builtins change allocation Realm while retaining caller code/source/environment provenance. All helpers share the canonical live projection. Restore it and the full frame on normal/guest/resource/host exits; do not roll back guest effects or steps. Return the exact guest completion and rethrow the exact host sentinel. The small probes test representation and restoration, not ECMAScript execution. Guest algorithms and fixed-spec rationale remain those of the existing activation design; no new language feature or semantic reinterpretation is proposed.

## Feasibility evidence and limits

All final TypeScript probes pass strict compilation, literal Node/native expected stdout, static-only build, and the repository's unchanged `probeVerdict` separate coverage parser:

| Probe | Static statements | Evidence |
| --- | ---: | --- |
| capability.ts | 144 | Stable structural context, detached/copied forwarding, A/B concurrently active, A idle while B active, idle/reentry rejection; nested Realm restore; exact guest completion/host Error identity; consumed direct/self/other builtin rejection; cross-session nested permit restoration; call limit; monotonic exhausted steps and independent owner |
| nominal.ts | 65 | Direct nominal calls/realm access, owner identity, two active owners, idle/reentry rejection, nested and root host-throw cleanup |
| provenance.ts with two facades | 46 | Private key-gated payload, genuine record/callable identity, equal IDs, wrong-record rejection before steps, detached inspection mutation cannot change record |
| tuple.ts with separate state/guard modules and actual Rift runtime types | 2265 | Exact canonical context, Realm, wrapper-function, receiver, args-array and location tuple; equal-content distinct arrays/locations reject; consumed/replayed/direct invocation rejects; exact result and host sentinel identities; cleanup and authentic neighbors |
| diagnostics.ts with revised guard/state modules | See DIAGNOSTICS.md | Exact inherited profile/unavailable diagnostics against actual production guards and the proposed model; rejected checks leave permit unused; legacy cross-Realm direct result, Script authorized result and host sentinel identities; no validation ticks/dispatch |

The coverage output may list generated helper functions with **zero statements** in the dynamic tier. We retain this output verbatim and use the established gate, which rejects positive dynamic statement counts. This is not a claim that no generated dynamic helper symbol exists. No exemptions or coverage parser changes were made.

`host-shapes.mjs` is explicitly **Node-only**: fake/shell session, fake/shell/copied record, recovered constructors with wrong keys, direct private-read attempts with wrong keys, and wrong record are rejected before steps; the authentic neighbor succeeds. It does not prove native behavior for hostile reflective values or arbitrary prototype replacement. Native class-target Proxy remains unsupported as documented in the earlier investigation.

The capability probe models permits using a Target identity, canonical Context and scalar argument. The additional tuple probe exercises actual Rift Realm/Value/Builtin/OperationContext/Location types across a separate guard module, including the full identity tuple with an object receiver; it is still a model wrapper, not an edit or activation of Realm.guardBuiltin. Other Value variants remain integration cases. Its harness-only `attempt` function deliberately tests mismatches while a permit is pending; no such callback/mint export belongs in production. Full evaluator/reference union integration, function code provenance and real parser/AST access remain unproven. The provenance probe uses a scalar private payload, not an interpreter. Its root/materialize exports and public constructors in the standalone capability/nominal harness are testing conveniences, **not proposed public API**. No whole engine, body evaluation or duplicate interpreter was built.

Initial harness failures are retained: direct Node strip mode rejects parameter properties (`capability-first.ts`/results), and direct Node TS execution cannot resolve `.js` facade imports (`provenance-first-results.json`, `run-first.mjs`). Final runner uses TypeScript-emitted JS for Node. These were harness issues, not compiler failures; native initial runs are preserved rather than discarded.

The real-type tuple probe initially passed both hosts but reported one dynamic statement in a generated adapter for the callback whose inferred return type was `never`. `tuple-first.ts` and its complete results retain this failure. Explicitly annotating that callback's return as the target `Completion` type removes the adapter's dynamic statement: final separate coverage is 2265/2265, zero dynamic. No runtime logic or compiler changed. This local exact-signature correction belongs to the probe, not a hidden production workaround.

## Minimum acceptance plan and recommendation

1. Review and explicitly accept the threat model and matrix changes above. If untrusted same-process host builtins must resist copying/mutation, this design is a no-go.
2. Before declaring feasibility complete, integrate the proven tuple representation into the actual Realm wrapper boundary and combine it with simultaneous sessions, full frame state and shared budgets. Test callback misuse while active and idle under the new explicit capability semantics; keep unavailable reflective native cases labeled. The separate current probes do not substitute for this combined integration.
3. Implement only as the existing atomic E4 boundary with private record/shared engine co-location and legacy facades. No partial body API or duplicated evaluator. Validate complete calls, accessors/coercions, FDI/GDI/block resource prefixes and finally restoration through real code, including two runtime-selected inputs.
4. Require every unchanged semantic matrix row and trace, 212 inherited records per lane, 48 retained static gates plus additive E4 gate, full legacy/focused/host/observation checks and all 60 blocked corpus variants. Verify genuine record/provenance and cross-profile negatives; preserve unsupported grammar and exact abrupt identities. No regenerated expectations from observed results.

**Go for design review of B; no production activation approval is implied.** The important ownership representations now have executable static evidence, so a broader compiler project is not required to explore this proposal. Full E4 feasibility and acceptance remain unproven. No need to spend the remainder of the 90-minute budget on a speculative compiler patch or whole-engine prototype before the authority change is reviewed.
