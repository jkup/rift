# TS-005M design evidence — 2026-11-01

Base `2cd4a0842ff092e84e214c75309b8c14ac7f3bf1`, clean existing
`typescript-scriptc-probes` branch. Deliverable: `../../map-integration.md`.
Design only; awaiting coordinator review. No map implementation or successor work.

Inspected typescript/AGENTS.md, project-goals.md, compiler-contract.md, TASKS.md,
array-prerequisites.md and root Claude Roadmap.md. Traced actual evaluator call,
tick and argument evaluation; runtime Builtin/Callable/completions/property APIs;
Realm registration; Number builtins; run's evaluator lifetime; GuestArray storage;
array-like length helper; host-test direct invocation and accepted evidence.
The initial docs reads used root-relative paths and failed; reads were corrected
to typescript/. An initial PowerShell task-claim write rejected its parameter
before mutation; apply_patch then recorded the claim successfully.

Repeatable caller inventory, from typescript/:

```powershell
rg -n 'new Evaluator|\.invoke\(|registerBuiltin|type Builtin' src test
rg -n 'tick\(|internalHasProperty|lengthOfArrayLike|defineOwnProperty' src
```

Sources: versioned 2025 ECMA-262 map, ToObject/ToLength, ArrayCreate and
ArraySpeciesCreate; engine262 ArrayProto_map and ArraySpeciesCreate at pinned
revision d553e7b52501fbc47eae981c8d0fa7a5c26d0171. Exact links and influence are
in the design. The raw web fetch of engine262 failed; the GitHub connector
successfully fetched both pinned files. No upstream code was copied.

Validation performed: inspected complete scoped diff; `git diff --check` passes.
No src, manifests, existing tests or compiler pins changed. No new compiler
probe or Node/native suite run: this documentation introduces no executable
capability. Accepted dispatch/closure/completion/finally and TS-005P/D/A/H
evidence is sufficient to propose this small integration. Prior 135/135 suite
results belong to TS-005H and are not new measurements. The proposed matrix
and combined map/context static coverage are implementation acceptance work,
not passes, skips or conformance evidence from this task.

Recommended freeze: two batches, active context/call migration first, internal
object-only/default-array map second. Defer standard installation pending boxing,
species and function-realm semantics. Sparse per-index ticks share active budget;
constructor reads occur only for array inputs at allocation's semantic position.
Non-undefined array constructor is an explicit unsupported boundary. Generic
length above uint32 array maximum fails after callback validation, before traversal.
