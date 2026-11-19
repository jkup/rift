# TS-033E4 receiver feasibility stop — 2026-11-03

**Not implemented; coordinator review needed.** No production, existing test,
build gate, fixture, inventory, compiler pin or historical evidence was changed.
The activation remains guarded. This is a compiler evidence milestone, not a
passing E4 milestone. Base `e927eb6`; checkout also contains coordinator-only
dispatch commit `a3b4574`.

Before production edits, copied the accepted inherited 55-row execution matrix,
E3 setup/naming matrix, ER matrix (including R36), corrected A01–A18 contract and
13 literal restricted traces into this directory, byte-for-byte. `audit.mjs`
checks these copies, all F04–F09 rows, unchanged protected paths, the historical
212 records per lane / 48 gates and all 60 still-blocked corpus variants.
Those old successful runtime/build records are preserved evidence, **not reruns**.

## Measured blocker

`receiver-preflight.ts` uses exactly the required ordinary unbound function
expression with explicit `this: Context`, checks `this !== exactView` before
effects, and exercises authentic, clone, detached and idle calls. Node 26.13.0
passes all four controls, ending at steps3. Pinned scriptc 0.4.7:

- static-only build succeeds once installed Zig is available;
- separate coverage reports 35/35 static statements **and two dynamic-tier
  statements**, attributed by `--explain-dynamic` to `dyn.this` at the function;
- the native binary exits 1 with `Uncaught Error: invalid Script context
  receiver` on its first, authentic `exactView.tick(3)` call. It never reaches
  the negative controls. There are no native authentication passes to report.

Retained attempts, in order:

1. `receiver-preflight-results.json`: missing Zig PATH (`spawnSync zig ENOENT`).
2. `receiver-preflight-zig.json`: correct PATH, sandbox cannot access Zig's
   installation directory. Both attempts already report two dynamic statements.
3. `receiver-preflight-native.json`: approved installed-library access; build0,
   Node0, coverage0 with dynamic2, native1. Environment failures do not explain
   this third result.

`receiver-minimal.ts` reduces the semantic mismatch to five lines:
`view.check()` where the ordinary function returns `this === view`. Node prints
`true`; native prints `false`, both exiting0. Coverage identifies the same
`dyn.this` and dynamic2 (5/5 analyzed statements marked static). The independent
coverage gate is therefore necessary even without the runtime disagreement.

`receiver-control.ts` compares two captured references to the same object without
reading invocation `this`. Both hosts print `true`; coverage has no dynamic
statements. This isolates the receiver path from ordinary captured-object
identity. **This control is not a valid authentication implementation:** it
would accept a copied callback through any receiver. No arrow, prebinding,
structural authority, dynamic fallback or weakened check is proposed as a fix.

`reduction-results.json` retains exact build, coverage and runtime transcripts.
`reduce.mjs` asserts the literal Node/native disagreement and the zero-dynamic
control; its success means the blocker reproduced, not that E4 passed.

## Bounded proposal for coordinator review

Authorize an evidence-only feasibility investigation under this directory before
production activation. Test whether an **extracted, ordinary unbound class method**
can preserve invocation-receiver identity under the pinned compiler while
remaining assignable to the unchanged structural OperationContext. This is a
candidate representation to investigate, not an approved workaround or a claim
that class methods satisfy the frozen closure/private-capture contract.

If a candidate passes, expand it into the contract's bounded composite reduction:
two facade imports, private record/node identity, frozen private context getters,
exact one-use builtin permit with nested callback, Script/legacy reference union,
and finally restoration from seeded nonzero counters. Require authentic positives
and cloned/spread/proxy/detached/wrong-receiver negatives for **both** call and tick,
mutation and idle controls, exact Node/native outcomes and independently parsed
zero-dynamic coverage. Separately identify any unrepresentable host-only attack
controls; do not exclude ordinary production receiver authentication from native
runtime testing. Return findings for review before adopting any representation.

If that fails, keep E4 blocked and decide a separately scoped compiler/design task;
do not change pins or silently substitute a weaker authorization model. No broad
engine move is useful until this necessary entry condition is proven feasible.

## Checks performed and limits

- `node typescript/docs/validation/ts-033e4/audit.mjs`: 2,966 protected paths,
  175 source/test hashes; frozen55/A18/traces13; retained212/212/48; blocked60.
- `npm run typecheck`: pass.
- `npm run test:runner`: 20/20 pass.
- Preflight and minimal/control static builds, separate coverage, and actual
  Node/native executions as detailed above, Windows x64 only.
- Full engine builds, guest lanes, E1/E2/E3/ER replays, probes10, host73 and
  observations22 were **not rerun**. No production candidate exists to validate.
  All remain mandatory if activation resumes.

Replay from the repository root with installed Zig on PATH (native linking may
require approved access to its libraries):

```powershell
node typescript/docs/validation/ts-033e4/preflight.mjs
node typescript/docs/validation/ts-033e4/reduce.mjs
node typescript/docs/validation/ts-033e4/audit.mjs
```

The preflight collector writes a new `receiver-preflight-replay.json` by default,
preserving the three original attempts. It collects failures rather than treating
exit0 from the collector as acceptance. Do not publish partial callable activation.
