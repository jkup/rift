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
