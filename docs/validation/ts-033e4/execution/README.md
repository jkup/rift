# Atomic E4 execution candidate

2026-11-04; semantic base `6a45e89`, coordinator dispatch `3ce9d0b`.
This is the implementation handoff, pending coordinator and independent second
review. It is not public Script admission. The superseding
[capability contract](../../../script-execution-capability-boundary.md) governs
the A08 substitutions; all original matrices, traces and compiler investigations
remain byte-preserved outside this new directory.

## Implementation

`script-execution-internal.ts` co-locates the original record/setup implementation
and one shared expression engine. The existing evaluator and record modules are
compatibility facades. Legacy subclass hooks, counters, context and limits remain
usable. Script statement evaluation uses explicit empty payloads and E2 binding
references, with original record/node identity maps for functions, blocks and
assignment naming. No inspection projection becomes executable input.

The opaque session owns its private engine. A stable plain context captures the
engine in fully typed arrows; idle use rejects, active copied functions act on
their original owner. Hosts must not mutate the context. Builtin entry uses a
module-private synchronous pending tuple and consume-only Realm guard. The guard
keeps the exact inherited profile-first diagnostics. Saved permit pointers,
private frames, canonical Realm projection and nesting counters restore in
finally; steps and guest effects do not roll back. The engine captures the first
source/Realm for a propagating throw without changing its object or Location.

There are no runtime/parser/builtin changes, new public observation paths,
compiler/pin changes, test injection hooks, body exports, context getters, or
duplicate expression interpreters. The new driver uses actual preparation and
execution, not the earlier combined model.

## Validation results

* Full Node and newly built native legacy suites: **212/212 each**, exact old
  records, no skips. `guest-node-results.json`, `guest-native-results.json`.
* Native builds: **48 unchanged entries plus one appended entry**, all static-only
  builds and separately parsed zero-dynamic coverage. The initial full run is in
  `initial-full-native-build-results.json`. After test-only expression additions,
  only the E4 driver was rebuilt; `final-driver-build.json` and the combined
  `native-build-results.json` retain that result. Production did not change.
* `execution-results.json`: both post-compilation inputs, `seed|7` and `other|11`,
  select actual function identifiers and returned payloads, with literal expected
  values. Both Node and native pass the same complete driver. `validate.mjs`
  requires exact stdout, exits, no stderr, and the independent coverage gate.
* `replays-results.json`: 17 inherited replay/reduction programs pass, including
  E1, E2, E3A/B, ER-A/B, D1 135/207, metadata136/42/stress8, global15,
  bootstrap18 and D2 two inputs. Copied replay scripts change only evidence/root
  routing and add the ER-B invocation; old scripts and outputs stay untouched.
* `suite-typecheck.json`: typecheck, runner20, host73, observations22, probes10
  pass. No test denominator, expected old outcome or static gate was relaxed.
* `preservation.json`: exact baseline records and ordered gate entries,
  **3074 protected files**, and all **60 corpus variants still blocked**.
  `final-source-hashes.json` binds owned source/test/gate files to the handoff.
* `node-boundary-results.json`: explicitly **Node-only** reflective negatives
  and spread/proxy/call/bind forwarding positives. These are not native claims.
  Native covers structural copied capabilities, detached functions, idle and
  cross-owner controls, private permits and real two-session cleanup.

## Frozen coverage map

The driver and retained helper replays cover different obligations. In particular,
host-helper injected setup faults are not presented as engine tick injection.

| Frozen rows | Evidence |
| --- | --- |
| P01–P05 | Unchanged E1 preparation/inspection replay and new whole-source rejection controls; P03 actual directive completion |
| G01–G08 | New persistent lexical/object globals, declarations, all eight function-admission flags, instantiation/body phase, nonextensible new/existing bindings; inherited D2 flags and ordered operation controls |
| L01–L10 | New TDZ, FDI formal preservation/overwrite, untaken declarations, shadowing, fresh per-iteration closures and block captures; L07 interleaved setup/faults in unchanged E3B; arguments/eval remain rejected |
| T01–T05 | New exact strict receivers, captured unresolved LHS and compound Get-before-RHS; T03/T04 unchanged E2 references and global host controls |
| F01–F04 | New real function/naming/source execution plus unchanged E3A metadata/descriptor/identity and ER-B bootstrap assertions |
| F05–F09 / ER R36 | All 13 frozen restricted traces, every real resource prefix with fresh and seven-step-seeded sessions, zero-call neighbors, real throwers, ordinary properties, deletion/redefinition/shadows and cross-Realm source/thrower provenance |
| C01–C07 | New empty/present-undefined list, block, if, while, break/continue, return/fallthrough behavior; C07 helper identity normalization unchanged E2 |
| R01–R07 | New defining-Realm allocation, guest/host identity, default64 calls, depth257, shared exhaustion, literal D2/FDI/block/root prefixes; inherited parser/source-size/depth and helper failure controls |
| U01–U04 | Equal IDs retain distinct records; retained closures/source and side effects; unsupported-profile/harness/schema boundaries remain unchanged, not claimed as newly admitted transport |
| A01–A02 | Opaque entry negatives and literal root4/function14 prefixes, normal/fallthrough neighbors |
| A03–A06 | Restricted traces, RHS effects/no shadow, calls0, ordinary descriptors, cross-Realm endpoints |
| A07 | B builtin → A guest → B builtin, canonical context and A source with B allocation |
| A08 (superseded) | Copied owner authority, idle denial, live B cannot activate idle A, both-live owner separation, retained callback reuse, recovered constructor/fake-record negatives and unchanged profile errors |
| A09 | Consumed exact self replay, wrong target/context/receiver/args/location direct calls denied without ticks; authorized nested dispatch uses fresh permits |
| A10 | Exact guest completion/Location and host Error identities; accessor, coercion and body callback faults; nested resources; B host exception escapes into still-active A with exact restored frame/counters |
| A11–A12 | Integrated 12/18/6 setup prefix locations and factory/publication controls; old E3B host injections and D2 marker11 remain separately labeled and replayed |
| A13–A15 | Completion neighbors, N01–N04 direct function naming/source, record identity and cross-unit/cross-Realm provenance |
| A16–A18 | Seven-step seed, cumulative21 then22 exhaustion, independent session, nonzero saved limits/depth257, whole-source unsupported syntax neighbors |

FDI locals and unpublished block activations are not exposed after unwinding just
to inspect a failed prefix. Integrated tests assert observable locations, budget,
provenance, materialization/publication and global effects; unchanged E3 helpers
retain the detailed transient binding-state and injected failure assertions.
No synthetic callback runs at engine-owned setup ticks.

## Retained development findings

`preflight-1.json` preserves the initial native SC2003 union-return diagnostic.
This is the already accepted E2 limitation: an explicit `ThrowCompletion` local
narrows the arm without copying it. The same existing technique is localized to
Script statement returns. `preflight-2.json` retains an ordinary TypeScript edit
error during that annotation change. Later preflights retain the missing Zig
PATH/sandbox setup failures and successful native runs. No new compiler workaround
or capability-boundary revision was needed.

Two newly written suffix-location expectations were corrected by literal source
offset arithmetic (D2 statement columns15/22/29; cross-unit `throw` column53).
The frozen 13 trace arrays and inherited 12/18/6 arrays were never changed.

`expression-neighbors-first.json` retains an extra test's mistaken assumption that
Array.prototype.map was installed. Existing Realm bootstrap installs join/toString,
not map; map is an existing host helper. No bootstrap scope was expanded. The
positive callback test instead uses installed join with a guest toString callback.
This is not an arguments/Error-object, Array.map admission or conformance claim.

## Reproduction

Use the pinned Node/scriptc/Zig environment in the compiler contract:

```text
npm run test:guest:node
npm run test:guest:native
node docs/validation/ts-033e4/execution/validate.mjs
node docs/validation/ts-033e4/execution/replays.mjs
node docs/validation/ts-033e4/execution/node-boundary.mjs
node docs/validation/ts-033e4/execution/suites.mjs typecheck test:runner test:test262 test:observations test:probes
node docs/validation/ts-033e4/execution/preserve.mjs
```

Stop at this candidate for actual coordinator and second review. No successor,
branch switch, main merge, publication or public Script entry is included.
