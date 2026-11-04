# TS-034P design evidence

Base `b84a5e0`, branch `codex/test262-classification`, 2026-11-04.
Design: [harness-prerequisites.md](../../harness-prerequisites.md).
No production/test/gate/pin/old-evidence edits; no guest body execution or native
probe. Native feasibility was not genuinely uncertain for this design audit, so
no speculative compiler work was undertaken. Implementation remains separately
assigned and reviewed.

## Reproduction and scope

From `typescript/`:

```text
npm run build:node
node docs/validation/ts-034p/audit.mjs
node --check docs/validation/ts-034p/audit.mjs
node --check docs/validation/ts-034p/research.mjs
git diff --check
```

`build:node` succeeded (typecheck and rebuild of existing host parser). The audit
does not execute guest source. It verifies all36 original units (33 tests,
three retained harness files), SHA-256 and Git blobs against the immutable
manifest, and submits each full unchanged unit to the current declaration parser
and strict preparation boundary. `audit.json` retains precise rejection/locations,
or consumed length/strictness, plus preparation outcome. The module-goal entry is
submitted as Script solely for syntax inventory; this does not certify modules.
No strict prefix is added, so original-body results do not claim transformed
strict-variant results. Early parser stopping is reported honestly; the design's
full source inspection supplies additional dormant requirements.

Current harness results:

| Unit | Git blob | SHA-256 | Observation |
|---|---|---|---|
| assert.js | `55a0e2a32f2e6259a1b445a9d924f61261e2ca5f` | `206e274ca325eb8a652e3911c3fbd090e2480d11ed7579dc17a5d17a2360ed48` | lex.operator `++`,170:34; blocked preparation |
| sta.js | `d291a94f46234908009a7ee909cf9d66034c73fe` | `1930c54af79455c484799f43e9a28e2b2f15c40d0917c9941ca54e26db243f35` | parse.expected-token `instanceof`,14:14; blocked preparation |
| doneprintHandle.js | `334d19ec8ee58664502afb232bce3c1a74acfb16` | `01282de15feb05d865dfc2cdfc68f59d8e760eb7d81a14ade3bc08cbc8520add` | complete625 UTF-16 units, non-strict; profile-rejected; async remains excluded |

All are from test262 `91c70759363c46557b694792bf34a2551a7af5ba`.
Original sources/license remain in ../ts-033p/corpus.json, unchanged.

`audit.json` also retains hashes of3151 protected tracked files against base,
verifies all preceding TASKS entries unchanged, and calls the existing blocker
planner: all60 variants remain blocked. Coordinator-owned COORDINATION and root
Claude Roadmap are deliberately excluded from this writer's preservation scope.
The two E4 evidence files still contain212 records each, and its gate evidence
still contains49 entries, byte-preserved with every old source/manifest/evidence
file. This is **preservation of accepted results**, not a new full-suite replay.

## Pinned research

`research.mjs` fetches edition16 and engine262 revision
`d553e7b52501fbc47eae981c8d0fa7a5c26d0171`. `upstream.json` retains specification
clause extracts, original document byte count/hash, complete numbered engine
sources, their hashes, and MIT license. The spec hash exactly matches the prior
accepted research. No engine reference executes guest code. Sources are cited
by file/line and revision in the design; modern engine extensions are not silently
adopted over edition16.

The initial restricted fetch failed DNS (ENOTFOUND); an approved read-only network
retry succeeded. Browser search also could not fetch the large specification,
so the source artifact is the direct hash-verified fetch. This has no compiler
or engine-behavior implication. During audit setup, the Realm constructor call
was corrected to its actual `(output, 'script')` signature before final evidence;
only the final correct preparation results are retained as acceptance evidence.

## Handoff

Propose H1 strict simple try/catch only, with thirteen literal controls, empty
completion neighbors, all real resource prefixes and source/Realm cleanup. H2/H3
cover switch and dormant for/update grammar with honest semantics. H4 adds narrow
internal sloppy behavior; H5 construction and H6 actual errors require explicit
interface/migration checkpoints. H7 validates the unchanged bundle; P6 transport,
rule certification and file admission remain separately blocked. No successor,
branch switch, main merge or publication by this writer.
