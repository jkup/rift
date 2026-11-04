# Switch design evidence (not implementation evidence)

Base b8baf44, 2026-11-04. Read ../../harness-switch.md as the contract.
This directory owns only new design/research/audit artifacts. No guest switch
execution, native build, harness success or admission is claimed.

## Frozen prefix oracle

prefixes.json contains ten **hand-derived** ordered tick/Location traces using
the existing statement/expression/setup rules plus the switch allocation rule.
Coordinates are one-based; sources include exactly the shown newlines, with no
additional prefix. No source is evaluated by this audit.

For every row of length N, use a fresh Realm/session per (seed,k), seeds [0,7],
k=0..N inclusive. Seed7 executes exact `"use strict";this.seed=1;` first,
retaining its seven steps and property seed=1. Set maxSteps=seed+k before both
units (seed execution fits even when k=0). No seed unit for seed0.
For k<N require resource origin steps, count=seed+k+1, limit=seed+k,
diagnostic=ticks[k], body phase, target source/Realm in lastAbrupt, idle active,
calls=0, depth=0. For k=N require literal result and steps=seed+N; full TDZ and
throw rows are language failures, not successful normal results. This freezes
208 distinct prefix runs (2 * sum(N+1)), including fresh and seeded endpoints.
Seed property persists, no global x/f appears, and no failed prefix publishes a closure.

For every row, k<4 fails before CaseBlock allocation; k=4 fails its allocation
tick; k>=5 has installed CaseBlock before subsequent ticks. All setup is body
phase. Empty switch completes at5. In P12-let, k=5 fails name creation;
k=6 fails selector after binding creation; k=7 fails let statement; k=8 fails
initializer before binding initialization; k>=9 has initialized local x.
In P11-function, k=5 fails binding creation, k=6 fails materialization,
k=7 fails initialization after one completed materialization, k>=8 has initialized
f. Completed materializations are0 for k<=6 and1 for k>=7; no rollback.
Binding/activation intermediate states are review invariants, not observable
test APIs. Prefix tests assert only accessible completion/counters/provenance,
global absence and materialization count. No arbitrary engine-tick host faults.

At P11-function full endpoint retain the returned function; in a separate
ample-budget session install as saved and run exact `"use strict";saved();`:
normal7, original `function f(){return 7;}` source and defining Realm prototypes.
Repeat cross-Realm invocation. Full-prefix maxSteps must not be changed to
pretend closure invocation fits the prefix budget. H1's independent104 prefixes
and history controls remain mandatory and unchanged.

## Audit and research commands

From repository root:

```
node typescript/docs/validation/ts-034h2-p/audit.mjs
node --check typescript/docs/validation/ts-034h2-p/research.mjs
git diff --check
```

audit.mjs checks the tracked baseline, only this TASKS entry changed, all
production/tests/history/C++ protected, original source seams and exhaustive
tracked executable switch mentions. It hashes the frozen design/input/prefix
files, verifies retained212 records/lane and50 static gates, recomputes60 blocked
variants, and produces the proposed exact two-site E4 patch without applying it.
The audit's baseline comparison permits unrelated coordinator COORDINATION
changes and never stages them. Source inventory is bounded to tracked src,
test, fixtures and tools; historical docs remain protected byte-for-byte under
Git clean-content semantics. Historical verifier migration is documented in the
contract, not silently patched.

research.mjs retrieves the fixed edition and pinned engine source/license into
upstream.json. First sandbox retrieval failed ENOTFOUND; authorized network
retry exposed a mistaken clause anchor, corrected before successful retrieval.
The resulting edition hash matches TS-034P's retained pin exactly. Research is
source inspection; engine262 was not run. Offline audit does not need network.

Input-seven.js and input-eleven.js are actual complete runtime-read sources,
including final newline. Expected out is [number7] and [number11] respectively,
normal undefined completion, never99. audit.json binds exact file SHA256s.

Required review: actual design and independent second review, including the
specific old-test amendment. No production assignment, successor, main merge or
publication follows from a passing source audit.

Measured audit result on Node v26.13.0: PASS 3246 protected tracked files,
19 baseline executable files containing switch mentions, 208 frozen prefix
cases, retained212/50, 60blocked. Both .mjs syntax checks and git diff --check
pass. The19-file inventory includes both historical H1 preservation scripts;
the only active guest switch-negative is the E4 array element described above.
No production tests or native build were run for this documentation-only task.
