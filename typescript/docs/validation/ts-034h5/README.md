# TS-034H5 ordinary base Script construction and instanceof

Candidate on `codex/test262-classification`, base `7f80383`. Implementation and
validation are complete; actual and independent second acceptance remain with
the coordinator. No main publication or successor work.

The seven owned production files add a separate constructor slot and private
Construct operation. Ordinary calls and builtin permits are unchanged; calls
and constructors share function activation/body evaluation. Constructor
operands/arguments precede validation; caller-side prototype Get and allocation
precede callee activation; fallback uses the defining Realm; object returns
override the receiver by identity. `instanceof` performs the complete hook
lookup/call/boolean-conversion path and ordinary identity-based prototype walk.
Script Realms install the canonical-key, Realm-owned @@hasInstance method.

Legacy behavior and public admission remain unchanged. Classes, derived
constructors, new.target, bound functions, Reflect/Proxy, genuine Error objects,
and Symbol factories are excluded. Number construction remains unsupported
capability debt, not an assertion about ECMAScript Number constructibility.

## Frozen controls and validation

Before production edits, froze the accepted C/I/D/N/A/X contract, twelve literal
traces with172 fresh/seven-seeded prefixes, and both complete runtime sources.
`freeze.json` verifies their hashes. `matrix-map.json` maps the controls to the
final driver evidence. Supplemental forged-slot reflection is explicitly
Node-only; native tests exercise authentic slots, guards and actual callbacks.

`validation-summary.json` records:

- Node/native212 exact baseline records each, no skips.
- All54 static-only builds with separately parsed zero-dynamic coverage;
  H5 driver4274 static statements, bootstrap driver3926.
- H5 all172 prefixes and both runtime sources on both hosts, including exact
  abrupt identity/source, host-fault cleanup, captured contexts, frame/Realm
  restoration, one-use permits, recursion and grammar boundaries.
- H1/H2/H3/H4/E4 both-input replays, all17 inherited groups, both inherited Node
  boundary checks and the additional forged-slot checks.
- Typecheck, runner20, probes10, Test262 host73 and observations22.
- Preservation3606 protected files, three exact approved whole-file migrations,
  all212 old records per lane,53 old gates plus one, and60 blocked variants.

The original two negative sources receive focused preparation/runtime controls:
they prepare, then throw unresolvable-reference errors; no construction success
is claimed. The third migration updates the bootstrap key inventory for the
required symbol, strengthens exact metadata assertions and preserves legacy
absence. All prior keys, assertions, labels and denominators remain.

## Evidence and amendments

[AMENDMENTS.md](AMENDMENTS.md) records the independently approved test-only
local union narrowing and third bootstrap migration, the already-approved
Builtin callback signature pattern, and the parser token-kind correction.
Original compiler/coverage failures, bootstrap failures, Zig/PATH and sandbox
failures remain in their investigation/checkpoint files. Historical evidence
and verifiers are unchanged. The H5 verifier checks complete old-test contents
against base, rather than rewriting old evidence to claim unchanged bytes.

`inherited-final-summary.json` reconciles15 successful groups from the original
replay, the newly approved actual bootstrap replay, and the independently run
D2 group. Earlier `final-checks.json`/`inherited-approved.json` retain the stale
bootstrap failure and are superseded for final status by that summary. The
first30 native entries were rebuilt after the token-kind correction; final H5
and bootstrap gates were separately refreshed. Final source hashes and all54
current gate records are retained.

To replay from the TypeScript directory, make the pinned installed Zig available
on PATH with installation access, then run `npm run build:node`,
`npm run build:native`, this directory's `feature-checks.mjs`, `final-checks.mjs`,
`preserve.mjs`, and `summarize.mjs`, plus the package runner/probes/host/observation
suites. Scoped `rebuild-driver.mjs` and `rebuild-bootstrap.mjs` refresh only their
actual gates after a local test amendment. All scripts write new H5 evidence;
they do not update historical evidence.

Sole writer chat `01a1a6cb-63ce-7f42-9fa2-f5b40ef01cd2`.
COORDINATION.md is coordinator-owned and excluded from this candidate commit.
