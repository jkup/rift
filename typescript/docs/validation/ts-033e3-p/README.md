# TS-033E3-P design evidence

Design only, base `65f0e10`, branch `codex/test262-classification`, 2026-11-03.
Read actual accepted E1/E2 source and coordination acceptance, TypeScript AGENTS,
project goals, compiler contract and exact TASKS assignment. Claimed before
writing design. Own only the new design, this directory and own TASKS entry.
Coordinator owns COORDINATION and publishing; no successor is started here.

Deliverables: [contract](../../script-function-materialization.md),
[33 proposed literal controls](matrix.md), [offline audit](audit.json).
The factory/setup consumers stay inside ExecutableScript's private-state module;
no public plan/node pair or AST callback. Two separately reviewed implementation
slices are recommended, with exact ownership. All calls stay closed; restricted
function accessors (ER) are still mandatory before E4.

Run from repository root:

```text
node typescript/docs/validation/ts-033e3-p/audit.mjs
node --check typescript/docs/validation/ts-033e3-p/audit.mjs
node --check typescript/docs/validation/ts-033e3-p/research.mjs
git diff --check
```

Actual audit: 2649 protected tracked files unchanged; 170 source/test hashes,
267 numbered seam occurrences; 33 proposed matrix rows; inherited212/212 records
and44 passing gates checked from retained E2 evidence and current build entries;
60/60 selected corpus variants still blocked. The audit imports only the existing
host blocker classifier, not a Rift production module. It hashes all accepted
E2 evidence (including failures and inherited replays), pins retained research,
checks only this TASKS entry changed and excludes/hash-records coordinator-owned
COORDINATION. Numeric trace arrays come from literal source offsets, not an
executed implementation. Matrix IDs are presence checks, not semantic test passes.

No native build, coverage run, guest execution, reference-engine execution or
fresh runtime/conformance claim. The current212/44 evidence remains inherited.
E3A/E3B must prove new code in both hosts and retain all inherited gates/replays,
including host73/observations22, runner20/probes10 and metadata/planner checks.

Research reuses fixed2025 excerpts and pinned engine262 source/license in
ts-033e-p, with related ts-033d-p clauses. Re-read actual FDI, block, ordinary
function creation, naming, constructor and engine ordinary function/block paths.
New `naming-spec.json` retains four clauses retrieved from the identical fixed
document hash, not a living-spec substitute. `research.mjs` reproduces retrieval.
This caught an important private-parser requirement: parentheses preserve a
function RHS's anonymous definition but make an identifier LHS ineligible under
IsIdentifierRef. The proposed private assignment map preserves that distinction
without changing accepted syntax or legacy evaluation. No Expr-key map compiler
claim is made; future E3A must validate it under the unchanged compiler contract.

Research/navigation attempts retained in this report: initial root docs/TASKS
lookups failed (canonical files live under typescript); a PowerShell Set-Content
flag was unavailable, so the claim was applied using apply_patch. Web reader
rejected full fixed spec for size and multipage URL for accessibility. Two inline
Node snippets failed shell quoting before execution. The file-based research
script initially failed sandbox DNS ENOTFOUND; authorized elevated retrieval
succeeded and matched the existing fixed hash. These are tooling/retrieval
failures, not runtime skips. No source/test/pin changes or softened assertions.

Self-review corrected an initially assumed parenthesized-LHS naming rule using
the retrieved fixed clause, removed a guessed nonexistent guest registration
path (existing host gates register only in build-native), and made the D2 adapter
negative identity controls reachable via a closure-returning API without
publishing private AST arguments. Completed-materialization inspection is a
detached count, allowing allocation-before-binding prefix checks without a
production test callback or retention of unreachable closures.

Stop for independent review. No production implementation, ER omission, grammar
widening, Script execution, test262 admission or main publication by this writer.

## Independent-review correction to 8e69fc0

The reviewer found that the proposed record-owned activation Map would strongly
retain every transient frame, and that E3A's E2 fixture/F09 needed an allocation
API whose ownership was ambiguous. The corrected contract eliminates the Map:
each record holds one private ActivationKey with no backreferences; module-local
activation subclasses hold their owner key/scope/phase on the activation itself.
There are no record-to-activation references, weak collections or finalizers.
Validation rejects wrong brands/scopes before ticks; setup marks started before
its first tick and leaves started on any abrupt exit, preventing retries.
This is an ownership design, not measured GC or new compiler evidence.

E3A now explicitly owns ActivationKey, FunctionActivation, its brand/phase
methods and createFunctionEnvironment. Its migrated E2 fixture creates a genuine
empty activation, with no FDI/body execution. E3B owns BlockActivation, block
allocation, both setup methods and the D2 adapter; no E2 module/fixture change
is deferred to that slice. Every one of the33 rows is mapped to a slice; P01's
allocation/factory and setup traces are explicitly split. F09/F10 now include
the successful/failed A allocation controls, S06/B03 cover activation brand and
phase failures. Audit verifies exhaustive, nonoverlapping row assignment except
the explicitly shared P01 row. All prior source/gate/blocked counts and literal
trace columns remain unchanged. Re-ran offline audit, script syntax checks and
git diff --check. No implementation, native run, successor or publication.
