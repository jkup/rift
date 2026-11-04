# Approved H4 amendments and feasibility

Coordinator approval arrived on 2026-11-04 after actual source/reduction review,
independent rebuilding of all five original reductions, and independent second
semantic review. The decision is recorded in coordinator-owned COORDINATION.

The exact local read amendment adds `_strict = true` to
ScriptLocalBindings.getBindingValue; its body is unchanged. The shared
runtime.Reference shape is restored exactly. A private `script-property` wrapper
holds one explicitly typed Reference and its captured source-derived mode.
Get, Put, Delete and method receiver selection use that same inner reference.
Put/Delete add a final default-true strict argument; false affects property false
results only. No binding failure or abrupt completion is suppressed.

The wrapper allocates a host object, with **no guest allocation or tick change**.
Original proposal files remain historical checkpoint records; this file supersedes
their pending-approval status. Production integration followed the feasibility run.

`compiler-investigation/wrapper-results.json` proves identity, cached mutation,
receiver preservation, default strict failures, sloppy false results, unchanged
abrupt identity and binding failure. Node/native pass identically, 42 analyzed
statements fully static with separate zero-dynamic coverage.

The first supplemental inferred-reference control used a base narrowed directly
to an object literal. It failed native even with the original pre-H4 Reference
shape and no wrapper (`narrow-base-baseline.ts`, `narrow-base-results.json`). This
is a separately retained pre-existing structural-widening limitation, not an
H4 wrapper failure. The final supplemental control uses the unchanged actual
key-coercion driver's Value-returning helper shape; both hosts pass. Original and
labeled failed control sources/results are retained. No production workaround or
old-test edit was made for the unrelated narrower-base example.

The actual unchanged key-coercion native regression now passes
(`amended-key-coercion.json`). Both its static gate and the function-setup gate
pass after the approved amendments. The full remaining rebuild/replays determine
final acceptance; these feasibility records alone do not establish it.
