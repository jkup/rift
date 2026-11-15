# Native host prerequisites

Review against scriptc 0.4.7 on Windows x64, 2026-11-10. These probes test host operations needed by future guest features; they do not expose new guest globals.

| Probe | Result |
| --- | --- |
| WeakMap/WeakSet with class-union keys and tagged values | Basic behavior agrees on both hosts, but coverage reports nine dynamic-tier statements. |
| Reduced WeakMap with one class key and number values | Two dynamic-tier statements; blocked by the project contract. |
| Reduced WeakSet with one class key | Two dynamic-tier statements; blocked by the project contract. |
| WeakRef with one class target | SC2020: no lowering for construction or deref. |
| Date epoch/negative epoch/ISO leap-day values, UTC/parse and a finite positive clock | Both hosts pass, nine static statements, zero dynamic. |
| Math.random range smoke check | Both hosts pass, five static statements, zero dynamic. This is not a statistical quality test. |

Evidence is retained under `build/native-capability-review/`: source probes, initial/corrected/reduced result records and the explained weak-storage coverage. The first Node weak-storage launch used a parameter property unsupported by Node's strip-only TypeScript runner; explicit fields corrected the probe. That harness correction did not remove the native dynamic-tier failure.

Weak collections remain blocked until a genuine weak-storage implementation meets the static gate. Replacing them with strong maps or accepting successful compilation while ignoring coverage would not satisfy this project. The compiler's [current limitations](https://scriptc.dev/docs/limitations#weak-collections-and-memory) also describe weak-storage retention limits and unsupported WeakRef; those current docs are supporting context, not evidence of the pinned binary's behavior. The installed pinned runtime source, `node_modules/@scriptc/cli-win32-x64-msvc/dist/lib/runtime-sources/src/scr_json.c`, confirms the dynamic handle boundary: scr_weak_collection_new constructs a ScrDyn handle, and scr_weak_map_new/scr_weak_set_new expose that path. Its key disposal hooks and value tracing do not remove the dynamic-tier contract violation. Source discovery required rg -uuu because these packaged sources were ignored by the initial file search.

Date work can proceed with a separately reviewed host boundary and broader UTC/local-time/parser tests. These nine statements do not establish time-zone parity, complete Date semantics or Temporal support. Math.random needs Realm-owned state and deterministic state-isolation tests before guest registration; the host range probe establishes only a possible seed source.

A suspected fixture discrepancy was checked and rejected: `Date.UTC.length` is **7**, both in [ECMAScript 2025](https://262.ecma-international.org/16.0/#sec-date.utc) and Node. The original method-length fixture is correct on that point.

## Weak-storage integration route (TS-563)

The 2026-11-14 source review found no proven route through the unchanged pinned
backend. `scr_weak_collection_new` installs dynamic handle operations and a key
disposal observer. `scr_weak_key` requires an observed managed identity and
rejects reference types without that lifetime contract. A wrapper around these
functions would still need fully static representation and value tracing.

The runtime retains each WeakMap value and visits it in `scr_weak_map_trace`.
Before accepting a replacement, test value-to-key backreferences and mutually
dependent entries: a key reachable only through its own weak entry must not be
kept alive by treating that value as an ordinary strong root. This is a source
review finding and required validation, not a newly executed collection probe.

The [documented native FFI](https://scriptc.dev/docs/ffi) supports scalar values,
borrowed spans and opaque native pointers. That does not establish a way to
export a managed GuestObject's identity, tracing and disposal contract. Current
documentation is supporting context, not proof that the pinned compiler supports
every advertised FFI format. Numeric IDs backed by a strong object table would
keep keys alive and would not solve this problem.

C++ uses its own roots, environment tracing and object-liveness registry;
WeakRef.deref consults that registry. Those methods cannot simply be copied into
the host-managed TypeScript heap. C++ source is also not proof of complete
WeakRef job-lifetime or finalization semantics.

The preferred next backend step is a reduced compiler/runtime change providing
typed weak collection storage, stable managed identities and correct tracing,
followed by both-host lifetime tests and zero-dynamic coverage. WeakRef and
FinalizationRegistry additionally need job-scoped target retention and cleanup
scheduling. An independently traced guest heap would be a substantial alternative
architecture, requiring roots for environments, continuations, jobs and external
host references; it is not an ordinary collection-method increment.

No compiler patch, upgrade, native build or engine change was made in this review.
`build/weak-storage-integration-review/reviewed.json` records seven exact source
hashes, relevant locations and missing proof. The earlier failing native probes
remain authoritative for the current pinned toolchain.

The public `v0.4.7` compiler source confirms the representation choice:
[type-mapper.ts](https://github.com/vercel-labs/scriptc/blob/v0.4.7/packages/compiler/src/frontend/type-mapper.ts#L3621)
explicitly maps standard WeakMap/WeakSet and FinalizationRegistry to `DYN`.
Its Git blob is `552378151f24baaca97960267cf39171de69f6fd`. The same tag's
[FFI lowering](https://github.com/vercel-labs/scriptc/blob/v0.4.7/packages/compiler/src/frontend/lowering/native-ffi.ts#L60)
maps pointer arguments to BigInt, not managed class references. A reduced future
experiment should introduce genuine typed weak storage and its lifetime contract;
mapping WeakMap to the ordinary Map representation or relabeling its coverage
would retain the wrong behavior. No upstream patch has been made or tested.

### Isolated lifetime diagnostics (TS-564, 2026-11-15)

A test-only C wrapper calls the pinned runtime's full `scr_collect_cycles()`
pass and reads `scr_cyc_live`. Seven small native programs reproduce their output
on a second execution. The wrapper and programs are outside the Rift runtime;
the installed compiler is unchanged. The counter measures allocated collector
blocks, including disposed dynamic objects in the runtime's bounded reuse pool;
it does not measure reachable objects, bytes or all allocations.

With a reachable WeakMap, two batches of 1000 self-cyclic keys stored as their
own values produce counts 5 → 2005 → 4005 after full collection. The corresponding
independent-value control produces 5 → 102 → 102. The source tracer visits weak
map values unconditionally, so typed lowering must address value-to-key retention
rather than simply reuse this representation.

After a scoped weak map becomes unreachable,
the backreference case leaves 1003 objects and the independent-value case leaves
99, from a zero baseline. Four additional full collections leave those counts
unchanged. Strong-map and plain-cycle controls return to zero. These differences
do not establish a cleanup failure: `scr_dyn_dispose` explicitly keeps disposed
blocks counted in `scr_cyc_live`, up to `SCR_DYN_FREE_MAX` (1,048,576 blocks).
The original zero-after-cleanup assertion failed and is retained as an invalid
acceptance assumption, not evidence of a leak.

Reduced probes remove closures and key cycles. An empty WeakMap leaves two
counted blocks, and 1000 self-value entries leave 1002. Five further scoped
batches plateau at 1002; the original scoped backreference and independent-value
programs likewise plateau at 1003 and 99. This supports pool reuse rather than
unbounded cleanup retention. It does not prove all lifetimes correct. Reachable
map value-to-key retention requires a separate observer that distinguishes
live native keys from pooled dynamic wrappers, described below.
These results are diagnostics, not successful weak-storage acceptance or a Node
differential conformance claim.
Weak cases still contain three dynamic operations.

A separate test-only observer now counts actual cyclic native-key disposal. It
wraps the registered Key collector free callback, increments a counter and calls
the original callback. Each generated LLVM descriptor is checked to identify
Key as emitted kind 32. With 1000 self-cyclic keys, the independent-value WeakMap
collects all 1000 while the map is reachable; the self-value WeakMap collects
zero, like the strong Map control. After scope exit, all three report 1000 freed
keys. A second execution independently reproduces each exact result. This
isolates the reachable-map value-to-key retention concern and contradicts the
earlier inferred scope-exit leak. The observer counts collector frees, not every
reference-counted release, and changes only these diagnostic processes. Evidence:
`build/typed-weak-key-disposal/reviewed.json`, including artifact hashes and raw
outputs. Typed lowering still needs conditional value tracing (ephemerons) and
its own coverage/lifetime acceptance; this experiment implements neither.

### Conditional-tracing prototype (TS-564)

The specification's [liveness model](https://tc39.es/ecma262/multipage/executable-code-and-execution-contexts.html#sec-liveness)
does not let a dependency cycle alone establish liveness. Collection remains
optional; these diagnostics test our backend lifetime requirement rather than
establishing a spec violation from collection timing.

An isolated C prototype builds a temporary graph from weak-entry owners and
native keys, accounts for incoming counted edges, and marks externally referenced
objects. It follows ordinary strong edges and activates a weak value only when
both owner and key are marked, repeating to a fixed point. It unlinks dead entries
before releasing their values, then uses the existing collector. Actual object
reference counts are not changed during the graph analysis.

Before this experiment, rebuilding pristine `scr_json.c` in both selected runtime
variants reproduced all three diagnostic baselines. Replacing only that object
and the diagnostic observer now collects 1000/1000 cyclic keys in both weak cases
while their maps remain reachable, preserves the kept-key lookup, and leaves the
strong Map control at zero until scope exit. All three finish at 1000 and reproduce
on a second execution. Evidence: `build/typed-weak-ephemeron-prototype/reviewed.json`;
pristine controls: `build/typed-weak-runtime-relink/baseline-processes.json`.

The initial version used repeated scans. A follow-up replaces them with a work
queue and two dependency links per entry: each node is marked once, and each
entry is reconsidered when its owner or key becomes live. Nine native diagnostics
reproduce independently. Besides the original three controls, these cover a
rooted chain, unrooted ring, externally retained value, shared value with one
dead key, and 6000-key chain/ring cases. Rooted chains retain their live lookups;
unrooted rings collect every key; the shared value survives its dead key while
the other key remains rooted. All expected cyclic-key frees occur after roots
leave scope. These are lifetime diagnostics, not runtime performance benchmarks.
Evidence: `build/typed-weak-ephemeron-worklist/reviewed.json`; isolated source:
`build/weak-ephemeron-worklist.c`.

This worklist version used the explicit diagnostic hook and accepted only the
probes' headered native-key identities. Follow-up replacement/deletion controls
also pass: 999 superseded values are collected while the latest value remains
accessible, and deleting an entry does not destroy its still-rooted key.
The installed
toolchain, Rift source, original fixtures and accepted validation remain unchanged.
Initial compile/access-violation failures are retained beside the successful run;
the latter was fixed by using the runtime's compact-reference-count immortality
check rather than comparing the whole allocation word.

### Experimental collector integration

A separate copy of `scr_cycle.c` now invokes the worklist pass after entering the
collector's reentrancy guard and before unrestricted old-generation trial
deletion. Restricted-set collections skip it. All eleven lifetime/graph/mutation
controls reproduce using the original observer, which only calls the ordinary
collector and counts Key frees; it no longer invokes the weak pass itself.

In a separate 200,000-entry self-value workload, the unchanged runtime reports
zero cyclic-key frees both before and after an explicit sweep. The experimental
collector frees 199,469 automatically before that sweep and all 200,000 afterward,
while retaining the kept-key lookup. Independent reexecution checks automatic
progress and exact final disposal, without requiring a particular scheduling
count. This establishes automatic reclamation in that workload, not complete
collector correctness or a performance result.

The original runtime metadata uses the default collector, so those initial
6000-key runs were not nursery validation. A subsequent build explicitly selects
the `SCR_YIN` young-nursery variant and reproduces all eleven cases. Three added
owner-lifetime cases pass on both collectors: rooted owner chains survive,
unrooted chains are collected, and a live key does not keep an otherwise dead
owner alive. The first owner fixture incorrectly counted an ordinary
reference-counted release as a cycle-collector free; its failed assertion is
retained. Corrected fixtures make every counted object self-cyclic. Independent
review checks expected results, original observer linkage and the selected
experimental collector object in `build/typed-weak-young-nursery/owners-reviewed.json`.
Other key representations, broader compiler tests and typed lowering remain
outstanding. Original integration source and process hashes are retained in
`build/typed-weak-collector-integration/reviewed.json`. For that experiment, both modified runtime objects remained isolated build
artifacts; no compiler checkout or installed pack was edited. Subsequent compiler
work is described below.

The typed-lowering work now has a separate clean compiler worktree at
`C:/Users/jonku/code/scriptc-typed-weak-storage`, branch `codex/typed-weak-storage`,
based on v0.4.7 commit `6c60b0bcbfc6edd34ce5c1cdb588d42bdb7171ff`. Filtered,
frozen-lockfile dependency installation and the unchanged compiler package build
succeed. Running its source CLI on the backreference probe reproduces 13 static
statements with three dynamic-tier operations. This establishes the baseline for
typed-lowering work, not its acceptance.

Compiler commit `c66a91957` adds a distinct weak-map IR type, nested type identity
and traversal, diagnostic formatting, and generated binary-codec support. The
frontend does not emit the new type yet. All 160 focused IR tests pass, along
with compiler typechecking, codec freshness and lint. Owned source formatting
passes. Repository-wide formatting reports 1807 files; three untouched samples
verify that committed LF bytes format unchanged while checkout CRLF bytes cause
the reported differences. No unrelated files were reformatted. Evidence for
those samples is `build/typed-weak-format-baseline-reviewed.json`.

That IR commit alone does not implement runtime behavior. The subsequent
storage work below supplies the reference-counting family; conditional tracing,
construction/method lowering, both-host semantic tests, static coverage and
broader compiler gates remain required before a toolchain update.

Compiler commit `3c8a2a927` adds thread-local disposal-observer registration so
typed storage can coexist with dynamic weak collections and checked-record
sources. Registration is idempotent and preserves the null-hook fast path before
any observer is registered. The existing native collector test suite, extended
to check two observers and duplicate registration, passes all nine threshold and
growth-cap configurations with Zig on Windows. Rebuilding the changed collector
and dynamic runtime objects preserves the three original weak/strong diagnostic
outputs. These are unsanitized local checks; broader compiler and sanitizer gates
remain pending. Evidence: `build/typed-weak-observer-thresholds.json` and
`build/typed-weak-observer-runtime/baseline-processes.json`. This is disposal
infrastructure, not the typed storage or conditional-tracing implementation.

Evidence: `build/typed-weak-storage-lifetime/diagnostics-reviewed.json`, raw
process records, source programs and artifact hashes. Additional reductions and
repeated-batch outputs are in `minimal-processes.json` and
`pool-reuse-processes.json` in the same directory. Source tracing is recorded
in `build/typed-weak-storage-review/source-reviewed.json`. These investigations
established the ownership and collection requirements for the storage work below.

Local compiler commits 009d56d82 and 10aca8234 add value-independent weak-key indexing and native lifetime tests. The index distinguishes owner, key and representation kind without dynamic-value boxing. Tests exercise 16,384 entries, deletion chains, address reuse, reentrant disposal, and callbacks that free themselves and sibling entries. The focused Windows Zig test passes; it is unsanitized. The subsequent storage commit connects this index to typed entries; packaged runtime builds and conditional tracing remain outstanding.

Local compiler commit 57c49ac4d adds typed weak-map storage with raw 64-bit scalar slots and reference adapters, using the shared key index. Set transfers value ownership; get retains reference results; replacement, deletion and key/owner disposal release owned values. Native tests cover scalar bits and absence, reference counts, replacement-triggered disposal, owner/value cycles and collected keys with acyclic values. Both default and young-nursery collectors pass at default, 1 and 7 candidate thresholds; lint and owned TypeScript formatting pass. Windows tests are unsanitized. The storage trace currently accounts for owned values as strong edges; conditional reachability must be integrated before enabling this runtime in compiled programs. Runtime-pack selection, frontend/backend lowering and broader acceptance remain outstanding.

Local compiler commit 959fadede connects typed storage to a shared conditional-reachability pass before unrestricted old-generation collection. The pass snapshots weak edges, counts owned references, propagates reachability through owner/key dependencies, and detaches every dead entry before releasing values. Both collector variants pass at three thresholds, including self-values, external value roots, acyclic self-values, immortal keys, a 6000-key ring spanning two maps and automatic progress over 200,000 keys with exact final reclamation. All nine original collector threshold/growth configurations pass. A separately built control with the pass disabled fails the self-value regression as expected. Evidence: build/typed-weak-conditional-validation/processes.json and sources.json. Windows validation remains unsanitized. Other key representations and references omitted from cycle-only trace adapters require further audit; dynamic weak collections are not yet providers. Runtime packaging, compiler lowering and both-host acceptance remain outstanding.

Runtime build recipes now include typed weak storage, the key index and conditional tracing in source builds and release-pack matrices (compiler commit f4b3a5be6). Eleven matrix/dependency tests pass; two Linux profile tests are skipped on Windows, so no built-pack acceptance is claimed. Compiler commit bd2246f39 makes weak-map holders collector-visible, supplies pointer-shaped retain/release/trace adapters and covers nested weak-map cycles. All 60 focused cycle-analysis, LLVM-adapter and native storage tests pass, along with compiler typechecking, lint and owned-source formatting. Constructor/method IR and lowering remain the next integration step; the frontend still uses the existing dynamic WeakMap path.

Compiler commit ccc877349 gives typed weak-map construction and get/set/has/delete distinct IR nodes, validator checks, generated codec support, child traversal and LLVM emission. Receiver/key lifetimes are retained across later arguments; set moves reference values and get preserves presence separately from stored values. The broader IR/emitter run passes 270 tests; two additional nullable/undefined-value emission cases also pass. All eight scalar/reference LLVM fixtures compile to native or wasm objects with Zig. Compiler typechecking, lint, codec freshness and owned formatting pass. This validates IR-to-LLVM structure, not source-level native execution: frontend mapping/lowering, ownership/escape analysis audit, rebuilt runtime-pack linkage and differential behavior tests remain outstanding. Fixtures: build/typed-weak-ir/.

Local compiler commit 082095d2b connects class/record-key WeakMaps to typed construction and get/set/has/delete, preserves set() receiver identity, and includes weak maps in native identity and reference handling. Strong Map retrieval now widens union tags when adding undefined changes their order. All 146 focused lowering, IR, nullable-value and region tests pass, along with typechecking, lint, codec freshness and owned-source formatting. The backreference source compiles under static-only and its isolated native relink frees 1000 dead keys while preserving the live entry. Four additional static-only source programs match Node stdout, stderr and exit status, covering record keys, nested maps, chaining and strong-map union values. Evidence: build/typed-weak-static-execution/processes.json and source-parity.json. Constructor seeds and broader call forms remain explicit refusals in this local checkpoint; ownership analysis, rebuilt runtime packs, broader compiler gates and both-host Rift acceptance remain outstanding. The installed toolchain and accepted Rift totals are unchanged.

Compiler commit e90041fd8 adds typed WeakMap construction from tuple-array literals/values and nullish seeds using the existing typed collection loop. Repeated keys replace values in order; undefined-returning seed expressions retain their side effects. All 124 focused source/IR tests, compiler build, lint and owned formatting pass. Three new source fixtures compile static-only and their isolated native relinks match Node stdout, stderr and status (build/typed-weak-static-execution/seed-parity.json). The broader collection-ingestion native test could not execute because this worktree lacks scriptc-llvm-codegen.exe; it is not counted as passing. Generic iterable/union seeds, broader call forms, packaging and both-host acceptance remain pending.

An unchanged-corpus compile sweep found one regression among 24 WeakMap fixtures: stream-typed-chunk-weakmap.ts passes dynamic callback values to a typed record-key map. Compiler commit 523a4765e fixes get/has/delete lookups by borrowing an observed native identity while retaining the dynamic wrapper; insertion still requires the native key representation. All 24 original fixtures now compile to IR, and 122 focused tests plus compiler build, lint and owned formatting pass. The original stream fixture also matches Node stdout, stderr and status in an isolated native relink using the updated dynamic runtime object and required stream/event/vendor dependencies. Evidence: build/typed-weak-corpus-sweep/results.json and build/typed-weak-static-execution/stream-parity.json. This is targeted Windows validation, not a full packaged-toolchain, sanitizer or both-host acceptance claim. Next: broader lookup/lifetime cases and remaining iterable/ownership integration gaps.

Dynamic typed WeakMap lookup controls now match Node natively for class and record keys, equal-but-distinct objects, null/undefined and primitive misses, and successful/repeated deletion. The controls are preserved as tests/corpus/typed-weak-map-dynamic-lookups.ts in the compiler worktree, with a reviewed preflight baseline (no diagnostics). All nine source-lowering regressions and the affected 20-fixture order batch pass; baseline completeness, lint and owned formatting pass. Evidence: build/typed-weak-static-execution/lookup-parity.json. The standard differential/LLVM lanes and their CI-cost measurement remain pending with packaged-toolchain integration; the isolated relink does not substitute for those gates.

Typed WeakMap instanceof now shares collection identity/tag checks, preserving operand side effects and returning false for other collection/program-class constructors. The direct/nullable instance and Object.is probe compiles static-only and matches Node stdout, stderr and status in native execution (build/typed-weak-static-execution/instance-parity.json). All 15 focused typed-weak-map and existing collection tests pass, with typechecking, lint and owned formatting. A mixed WeakMap<Key,V> | WeakSet<object> probe still explicitly refuses conversion of the typed map into the dynamic representation; method-value reflection also needs that boundary design. These are remaining integration gaps, not accepted behavior. No installed-toolchain or Rift parity total changes.

Priority ownership audit found a retention bug before toolchain integration: an acyclic Value holding its otherwise-unreachable Key survives collection while the typed WeakMap lives. The native C probe reports keys=0/values=0 after collection and keys=1/values=1 only after map release. A static-only TypeScript Key/Value probe emits a null trace adapter for Value, confirming that the compiler selects the same unsupported ownership shape. Evidence: build/typed-weak-static-execution/acyclic-backreference.json and build/typed-weak-ir/acyclic-backreference.ll. The conditional graph currently reuses cycle traces, which intentionally omit acyclic owned fields. Next priority: give conditional reachability complete ownership metadata, separate from cycle-only traces, and add external-root/backreference controls before broader packaging. Previous self-value and cyclic-value successes do not establish correctness for this case.

The runtime now accepts immutable complete-ownership descriptors separately from cycle traces, through scr_typed_weak_map_new_owned. Weak-graph discovery resolves descriptors before counting edges so a later-discovered acyclic reference can contribute without double-counting. Native tests cover an acyclic value owning its key, an external key root and an external value root; both collectors pass at default/1/7 thresholds alongside the previous lifetime cases. A separate control using the legacy constructor fails with "acyclic value kept its dead key alive", confirming that the new test detects the missing metadata. Windows checks remain unsanitized. Compiler emission still uses the legacy constructor, so the source-level retention gap remains open until complete descriptors are generated for supported payload graphs. Next: emit ownership metadata for program classes/records and extend coverage to nested containers and polymorphic layouts.

Compiler ownership emission now covers ordinary non-hierarchical class graphs, tuple records, single-reference nullable unions and supported reference leaves. Supported complete graphs use scr_typed_weak_map_new_owned; other layouts retain the existing path pending full metadata support. The source-level acyclic Key/Value backreference now frees both objects while the map remains alive. The probe also exposed missing disposal-observer gating and arena exclusion for typed weak construction; both are fixed and have permanent LLVM regression checks. A second static-only source control confirms ordinary key disposal releases an independent value. Evidence: build/typed-weak-static-execution/ownership-source-processes.json and independent-source-processes.json. All 22 focused source/emitter/arena tests, compiler build/typechecking, lint and owned formatting pass. Record source/view edges, containers, polymorphic layouts and dynamic representation remain integration work; the general ownership gap is not declared closed. Native checks remain isolated unsanitized Windows relinks, with full packaged/both-host gates still pending.

Typed array ownership now walks dense, sparse and named reference slots with state-aware reads and preserves duplicate edge counts. Compiler descriptors recursively include supported element graphs and exclude modules with array subclasses until their extra fields are described. Static-only native probes reclaim Key/array/Value backreferences while the map lives, including duplicate references, sparse index 1000000, dense holes and negative-index properties: exact disposal counts are 3 for the simple graph and 12 for the four storage cases. Evidence: build/typed-weak-static-execution/array-ownership-source-processes.json and array-slots-source-processes.json. All 23 focused compiler regressions, lint and typechecking pass, with the five arena/ownership tests repeated after the subclass guard. Dynamic metadata/foreign payloads remain conservatively opaque; complete metadata for those payloads, subclasses, ordinary record views/sources and other containers is still pending. No full runtime-pack or both-host acceptance claim.

Map/Set ownership descriptors now traverse every live reference key/value entry, using layout-aware slot reads and skipping tombstones. Five static-only native lifetime probes pass: the same Key in both map positions, scalar-key map values, Set elements, deleted-entry plus duplicate-value accounting, and an externally held map root. The external root preserves all three objects and the live map size; releasing it lets collection reclaim Key/container/Value while the outer weak map lives. Evidence: build/typed-weak-static-execution/{map-both,map-value,set,map-slots,map-root}-ownership-source-processes.json. All 26 focused compiler regressions, lint and typechecking pass. Complete ordinary-record source/view metadata, polymorphic layouts and dynamic payloads remain open; packaging, sanitizer and both-host acceptance remain pending.


Ordinary record ownership is now emitted in compiler commit 43093c324. The conditional graph includes optional record-source side-table edges without pulling dynamic code into static-only programs. A static-only record Key/Value backreference probe reclaims both objects while the weak map lives, and the unchanged stream weak-map fixture matches Node stdout, stderr and status after relinking with the updated runtime. Evidence: build/typed-weak-static-execution/record-ownership-source-processes.json and stream-owned-parity.json. All 29 focused compiler/runtime tests pass, including both collector variants at default/1/7 thresholds; lint and owned formatting pass. Hidden dynamic payloads remain opaque, and record views, polymorphic layouts, rebuilt packaging, sanitizer and both-host acceptance remain pending. Accepted Rift totals are unchanged.


Compiler commit eb27dab64 traces dynamic object, array and typed-capsule ownership reached through record-source side tables; borrowed casts do not count as owned edges. Permanent native regressions cover direct/nested hidden key references, duplicate array entries, external source roots and borrowed casts under both collectors at three thresholds. All 31 focused compiler/runtime tests, lint and owned formatting pass. Negative controls fail as expected for both the previous opaque traversal and a deliberately counted borrowed cast. A real dynamic-conversion TypeScript probe frees Key/Value while the map lives; an external source root preserves them until released. Evidence: build/typed-weak-static-execution/record-source-backreference-processes.json, record-source-root-processes.json and record-source-negative-controls.json. The original stream fixture still matches Node. Native checks remain unsanitized Windows tests; unsupported dynamic kinds/native layouts, record views, packaging and full both-host gates remain open. Accepted Rift totals are unchanged.


The next ownership audit confirms the record-view boundary remains open: a Value view of a wider native record holding its weak key uses scr_typed_weak_map_new rather than the owned constructor. The isolated native probe reclaims zero observed objects while the map lives and five only after map release. Generated LLVM contains scr_dyn_record_view, so this exercises a real view conversion. Evidence: build/typed-weak-ir/record-view-backreference.ll and build/typed-weak-static-execution/record-view-backreference-processes.json. Next: represent the view-to-capsule-to-original-record graph without treating the view placeholder fields or borrowed cast links as owned references.


The unchanged record-view-extras-release.ts corpus fixture matches Node stdout, stderr and exit status after an isolated relink with the dynamic ownership fix (build/typed-weak-static-execution/record-view-extras-parity.json). Source inspection narrows the remaining weak-view gap: scr_dyn_record_view owns a capsule, whose native referent currently carries no complete ownership descriptor. Reading target-view fields would be incorrect because its storage contains placeholders, while the capsule owns the wider original record. The next change must propagate native ownership metadata through that capsule and preserve the existing static-only separation; ordinary record-source traversal alone cannot close this case.


Compiler commit 8a91670e3 carries complete native-record ownership through dynamic capsules using disposal-index metadata, without enlarging ScrDyn. Binding checks the capsule type key so reboxing a narrow view cannot overwrite the wider original layout. Record-view descriptors skip placeholder fields; the existing side-table edge reaches the capsule and then its original record. The source lifetime probe now frees three observed objects while the weak map lives, versus zero before; an external wider-record root preserves the graph until released. Evidence: build/typed-weak-static-execution/record-view-backreference-processes.json and record-view-root-processes.json. Native tests cover nested payloads, repeated binding/disposal and external roots under both collectors at three thresholds. All 33 focused tests pass across the combined run and corrected view-fixture rerun; compiler build, lint and owned formatting pass. The original stream and record-view lifetime fixtures still match Node. Metadata emission is gated to weak-collection programs, with a no-binding regression for ordinary record capsules. Full zero-cost, rebuilt-pack, sanitizer and both-host gates remain pending; unsupported native/dynamic layouts still need coverage. Accepted Rift totals are unchanged.


Capsule ownership binding now applies to every layout supported by ownershipDescriptor, including typed arrays, rather than records alone. A typed Key[] hidden in a dynamic source previously retained the key and value until map release; the updated compiler frees all three while the map lives. An external source root keeps the array usable (length 1) and preserves the graph until release. Evidence: build/typed-weak-static-execution/capsule-array-before-processes.json, capsule-array-backreference-processes.json and capsule-array-root-processes.json. All 16 focused ownership/bridge tests, compiler build, lint and scoped formatting pass. Separate baseline probes identify remaining gaps: boxed classes acquire a %dynProperties field, currently unsupported by ownershipDescriptor; Map/Set use scr_dyn_native_map wrappers rather than typed capsules. Each retains its backreference graph while the weak map lives. The first array-literal control used a dynamic array and already passed; the accepted probe explicitly binds Key[] before boxing. Full acceptance gates and Rift totals are unchanged.


Native ownership descriptors now use runtime dispatch for dynamic fields, allowing boxed classes with %dynProperties storage to describe their native references. Three source probes pass: a class with a native Key field, a class whose only key reference is an added dynamic property, and an external source root that preserves that property until released. Each unreachable class graph reclaims Key/class/Value while the weak map lives; the earlier native-field baseline reclaimed none until map release. Evidence: build/typed-weak-static-execution/capsule-class-{backreference,properties,root}-processes.json. Permanent native dynamic-field tests pass under both collectors at three thresholds, and all 35 related compiler tests pass with compiler build, lint and scoped formatting. Ordinary static record LLVM explicitly remains free of scr_dyn_ownership. Runtime dispatch still conservatively omits unsupported dynamic payload kinds; Map/Set wrapper ownership, broader layouts, full zero-cost, packaging, sanitizer and both-host acceptance remain pending. Accepted Rift totals are unchanged.


Typed Map/Set wrappers now bind native ownership metadata and expose their retained collection to conditional traversal. Four source probes pass: hidden Map and Set backreferences each free Key/container/Value while the weak map lives, and external source roots keep collection size 1 and prevent reclamation until released. Evidence: build/typed-weak-static-execution/capsule-{map,set}-{backreference,root}-processes.json, with prior zero-reclamation baselines in capsule-{map,set}-before-processes.json. Permanent native wrapper cases pass with both collectors at three thresholds; 37 related compiler tests pass, alongside compiler build, lint and scoped formatting. The first Set C fixture incorrectly retained a borrowed insertion key; correcting the fixture made its ownership match the runtime API. Fully dynamic collection construction, other dynamic handle kinds, polymorphic layouts and full acceptance gates remain open. No change to accepted Rift totals.


Compiler runtime commit dc0c53628 supplies ownership descriptors for dynamically created Map/Set entries by matching the runtime operations table. New permanent cases failed before this change and now pass with both collectors at three thresholds, alongside the typed-wrapper and weak-map tests. Source probes use scr_dyn_global_constructor/scr_dyn_construct rather than typed boxing: baseline collection frees zero observed objects while the map lives, candidate frees four; external roots preserve size 1 until released, then free four. Evidence: build/typed-weak-static-execution/dynamic-{map,set}-{before,backreference,root}-processes.json. Original stream and record-view fixtures still match Node after relinking the matching updated Map object. A cumulative sweep of all 25 WeakMap corpus fixtures also passes LLVM emission (build/typed-weak-llvm-sweep/results.json); this is compilation evidence, not native execution of all 25. Other dynamic payload kinds, polymorphic layouts and full packaged/sanitized/both-host gates remain pending. Accepted Rift totals are unchanged.


The broader original-corpus native sweep found a real lifetime-region regression: the conditional graph compared per-object headers against incoming reference counts even though region references count their chunk. The new runtime regression also demonstrated premature removal of live region keys. Externally managed region/program-lifetime and compact keys now remain live until their disposal notifications; tests cover live lookup and removal/release on disposal under both collectors at three thresholds. After this fix, all 25 WeakMap corpus fixtures match Node stdout, stderr and exit status in isolated Windows native execution, including 40000-key stress, old-generation cycles, ThreadSlots, region keys, dynamic constructors and local sockets. Evidence: build/typed-weak-native-full/results.json. The socket fixture needed its net/diagnostics/Windows-loop runtime units; that initial link failure was resolved separately. These runs are unsanitized and use isolated updated runtime objects, not a rebuilt accepted toolchain. Region value-to-key retention cycles still need a dedicated audit of chunk-level reachability; full packaging, zero-cost, sanitizer and both-host gates remain pending. Accepted Rift totals are unchanged.


A dedicated region value-to-key probe retains its graph while the map lives and releases three observed objects after map release. The same source compiled by the pinned installed compiler and linked against the pinned runtime objects produces the identical result, using a compatible disposal-hook observer; this is an inherited region/chunk reachability limitation, not a new typed-weak regression. Evidence: build/typed-weak-static-execution/region-backreference-processes.json and region-pinned-processes.json. Keep it open for a dedicated region/ephemeron integration design rather than interpreting the 25-fixture parity result as proof of all region cycles. Standard validation preparation found the matching LLVM helper in Rift's pinned installation: its SHA-256 matches the copy provisioned into the isolated compiler worktree, and the helper source has no changes from the pinned base. A candidate runtime-pack build has started; no completed pack or acceptance result is claimed yet.

The isolated Windows runtime package now builds successfully with seven flavors and five vendor archives. Both standard collection-ingestion tests pass against the rebuilt package. The standard differential harness passes 23 of the 25 WeakMap fixtures with byte-exact Node comparisons; 7517-stream-kept-callbacks.ts and stream-typed-chunk-weakmap.ts fail during linking because the selected scr_stream object references scr_stream_from_dyn_iter and readline bridge functions without their defining units. Evidence: build/typed-weak-native-full/packaged-differential.json. This is a packaging/link-selection finding that the earlier explicit-object relinks did not test; preserve the original fixtures and resolve the dependency boundary before accepting the candidate. Sanitizer, cross-host and full zero-cost gates remain pending, and accepted Rift totals are unchanged.

Both packaged stream failures reproduce with the pinned installed compiler and runtime, with the same eight missing symbols; logs are build/typed-weak-native-full/pinned-stream-build.log and pinned-kept-callbacks-build.log. A minimal C probe containing an unused function that calls an undefined symbol also fails with Windows Zig despite function/data sections and --gc-sections; compiling the probe object without unwind metadata does not change that result. Source inspection locates scr_stream_from_dyn_iter in scr_stream_ops.c (selected by stream && dynAsync), and the readline functions in scr_readline.c (selected by events). The shared scr_stream.c object references both optional families unconditionally. Next: separate or conditionally compile the optional entry points using matching source-build and runtime-pack predicates, preserve shared stream listener helpers used by finished(), and validate both absent-feature and enabled-feature programs. Do not fix this by linking all dynamic runtime units or suppressing undefined-symbol errors.
