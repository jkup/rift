# Boundary design review evidence

Read [PROPOSAL.md](PROPOSAL.md) for the proposed threat model, comparison of nominal versus function capabilities, exact A08 changes, migration, authority argument and acceptance plan. **No contract has been adopted and no production code changed.**

Final probes: capability144, nominal65, provenance46, actual-runtime-type permit tuple2265, diagnostic compatibility2314 static statements, each with zero dynamic statements according to the existing `tools/probe-verdict.mjs` gate. Full transcripts include generated zero-statement helper diagnostics. Literal expectations are fixed in run.mjs and checked again by verify.mjs; unknown reports and nonzero dynamic counts fail. Node-only malformed/reflected host-value checks are separately labeled. [DIAGNOSTICS.md](DIAGNOSTICS.md) corrects the proposed guard ordering/messages while retaining the original tuple model as historical representation evidence.

From the Rift root, with the existing Zig directory on PATH:

```powershell
node typescript/docs/validation/ts-033e4/boundary-review/run.mjs capability nominal provenance tuple diagnostics
node typescript/docs/validation/ts-033e4/boundary-review/verify.mjs
```

The runner compiles each probe with the pinned TypeScript compiler into the ignored build directory for Node, and separately with installed scriptc 0.4.7 for native. No installed toolchain or compiler source changes. Native access to Zig libraries requires sandbox escalation in this environment. Run verify after run: the Node-only host-shape controls import the emitted provenance modules.

Historical artifacts retain two Node harness failures (parameter properties in strip mode, unresolved .js facade imports) and one compiler coverage failure (throwing callback inferred as never; explicit Completion return type fixes the adapter). `*-first` artifacts are diagnostic snapshots, not passing candidates or production files.

Verification hashes all evidence files except its own output and checks tracked changes against the authorization commit522413d; only this new directory and coordinator-owned COORDINATION are permitted. Full production suites are not rerun because this is design/evidence only. The prior preservation audit is replayed separately and its stdout retained in preservation.json; it does not imply E4 execution passed.
