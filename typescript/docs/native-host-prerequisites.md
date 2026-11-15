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
map value-to-key retention still needs a separate observer that distinguishes
live native keys from pooled dynamic wrappers before drawing collector conclusions.
These results are diagnostics, not successful weak-storage acceptance or a Node
differential conformance claim.
Weak cases still contain three dynamic operations.

Evidence: `build/typed-weak-storage-lifetime/diagnostics-reviewed.json`, raw
process records, source programs and artifact hashes. Additional reductions and
repeated-batch outputs are in `minimal-processes.json` and
`pool-reuse-processes.json` in the same directory. Source tracing is recorded
in `build/typed-weak-storage-review/source-reviewed.json`. Investigate disposal
and collector accounting before implementing a typed weak-map backend.
