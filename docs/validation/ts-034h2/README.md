# TS-034H2 implementation handoff

2026-11-04, base `4e01d44`, branch `codex/test262-classification`.
Implementation and validation are complete; awaiting actual and independent
second review. No successor, publication or main merge.

## Implementation and boundaries

Exactly four production files implement the accepted [switch contract](../../harness-switch.md).
The parser admits switch only for declaration planning and resets both breakable
and loop context inside functions. It retains one original CaseBlock, clause
ranges and a flattened array containing the original statement references.
The iterative collector visits discriminant functions in the outer scope before
creating the shared switch scope; selectors and bodies belong to that scope.
Cross-clause lexical conflicts and var propagation use the existing machinery.

Preparation verifies owner uniqueness, exact body association, ordered contained
clause spans, unique default, flattened statement identities, scope parent/ranges,
strictness and empty formals/null catch parameter. Detached inspection exposes
metadata only. Private BlockActivation is reused; its original ownership and
one-use setup checks remain intact. Allocation ticks at the CaseBlock brace.

The shared execution engine evaluates the discriminant outside the CaseBlock,
initializes lexical/function bindings once, compares selectors with existing
strict equality, then executes selected/fallthrough bodies without re-running
selectors. UpdateEmpty carries values across clauses and break/continue;
return and exact throw records propagate. Full frame restoration uses finally.
Switch never clears H1's throw marker/history. Legacy direct AST calls retain
exact var/try-catch messages and add the distinct switch guard.

No other production files, public CLI, schemas, profiles, harness admission,
labels, sloppy semantics, additional grammar, errors, C++, or pins changed.
The sole existing-test change is the approved E4 two-site amendment: H2-empty
positive and unsupported-const negative. The whole-file preservation verifier
reconstructs these exact edits against base4e01d44 and retains both H1 edits.
Historical H1 verifiers and results remain byte-for-byte protected.

## Frozen controls and measured results

`frozen.json`, `contract.md`, `prefixes.json` and fixture bytes were retained
before production changes. The source contract freezes30S/10N/5X, ten literal
traces and208 fresh/seven-seeded prefixes. No expectation is generated from
engine execution. Both entire runtime inputs are read after compilation and
hashed before either final lane execution (`runtime-input-hashes.json`).

- `switch-results.json`: both inputs on Node and native pass S01-S30/N01-N10,
  all208 prefixes, X01-X05, symbol/object identity without coercion, retained
  closure source/Realm/prototypes, source/parse-depth and call/evaluation-depth
  resource boundaries. X02 verifies consumed A history before the exact reused
  completion escapes from B. X03 checks B host faults at all three switch stages
  while A remains active, exact frame/Realm restoration and authentic permit guards.
- `native-build-results.json`: all50 retained gates plus one additive switch gate
  pass static-only compilation and separately checked zero-dynamic coverage.
  Switch3491/3491, catch3414/3414, E43755/3755 static statements.
- `guest-node-results.json` and `guest-native-results.json`:212 exact old records
  per lane, no skips. They compare deeply against the accepted baseline.
- `catch-results.json`: unchanged H1 driver, both inputs/both hosts,104 prefixes,
  C14 same/cross-Realm reused completion provenance/history and legacy diagnostics.
- `replays/execution-results.json`: E4 both inputs/both hosts, all existing groups
  and exact approved migration. `replays/replays-results.json`:17 inherited
  declaration, metadata, E1/E2/E3A/E3B/ER/global/bootstrap/D2 helpers and reductions
  pass. `replays/node-boundary-results.json` remains explicitly Node-only reflection.
- `replays/suite-typecheck.json`: typecheck, runner20, test262 host73,
  observations22, probes10 and Node guests212 pass. Native guest transcript and
  all final execution statuses are retained in `final-checks.json`.
- `preservation.json`:3249 protected tracked files, exact E4 amendment,
  unchanged212 records/50 old gates, and60 blocked corpus variants. Source hashes
  are in `final-source-hashes.json`.

## Compiler review decisions

Original failures and exact review stops remain in
[compiler-checkpoints.md](compiler-checkpoints.md). Three new union return sites
needed the existing explicit ThrowCompletion local pattern (SC2003). The new
test-only throwing callback needed its declared ValueCompletion return type to
avoid one dynamic adapter. Both reduced failures were independently reproduced
and their bounded corrections approved by the coordinator before application.
The broader legacy Completion annotation was rejected by TypeScript; the
existing OperationContext signature is ValueCompletion. No behavior, pin, API
or ownership change resulted. Full final coverage is zero dynamic.

Initial native linking failed because the sandbox could not locate/access Zig;
`focused-build.log` retains that failure. The successful full build and native
probe/replay runs used approved access to the unchanged installed Zig libraries.
This is Windows x64 evidence only, not a conformance or platform expansion claim.

## Reproduction

From `typescript/`, with pinned Zig on PATH and library access:

```
npm run build:native
node docs/validation/ts-034h2/replays/suites.mjs typecheck test:runner test:test262 test:observations test:probes test:guest:node
node docs/validation/ts-034h2/final-checks.mjs
node docs/validation/ts-034h2/preserve.mjs
git diff --check
```

Coordinator COORDINATION edits are not staged with this candidate. Stop at the
review boundary; integration and task acceptance remain coordinator-owned.
