# TS-033E1 private Script records

Implementation handoff, 2026-11-03; assigned base `d81840f`, branch
`codex/test262-classification`. Ready for independent review. No successor started.

`prepareStrictScript(unit, realm)` returns a ready opaque record, an explicit
realm/strict profile rejection, or the existing whole-source blocked/conflict
result. Realm is checked before source access. Lexing/resource limits, full
parse/EOF and declaration conflicts precede the strictness check. Empty source
is profile-rejected; a strict directive-only Script is eligible.

The module-local class has an unexported constructor and ECMAScript private
storage/accessor. Its only creation path parses source itself. The record keeps
one Realm, copied unit, complete plan, parser SourceText, full body and original
node associations. No caller-supplied AST/plan pair is accepted. Even reflective
construction cannot install private state. IDs are local to each record; equal
IDs/text, different units and different Realms do not share records.

The collector adds associations during its existing iterative worklist traversal.
All named/anonymous functions and blocks have scope associations; each declaration
retains its statement and initializer association (multiple var declarators may
share their enclosing statement). Function declarations additionally check exact
statement/function identity; function source identity/ranges and body identity
are validated before publication. No substring reparse, recursive clone, JSON,
new traversal stack, guest allocation or executable consumer export was added.
Only detached flat plans/node projections leave private storage. Copies include
nested arrays, formals, sites, locations, initializer ranges and directives.
A future trusted consumer must be designed within this private module boundary.

This implements E1 only. There is no evaluation entry, callable, environment or
instantiation helper, runtime/Realm/evaluator change, guard removal, observation
or profile admission. Every selected corpus variant remains blocked.

## Evidence

The [frozen API and controls](frozen-expectations.md) precede production edits.
`test/script-record.ts` checks P01-P05/U01 plus nested declarations/anonymous
functions/blocks, inherited and own strictness, all mutable snapshot containers,
retention across units and exact Realm ownership. R06 covers source100000/100001,
block/parenthesis depths126/127/128/129 and three15000-link expression chains,
with functions at both ends and inside the first function. Two files seed|7 and
other|11 are read after compilation; both hosts check runtime names, retained
function source and absent source effects. `host-results.json` contains four
literal-output runs. `api-negative.json` additionally records Node/TypeScript
module-surface and reflective forgery checks; those are explicitly host API checks.

All43 static-only builds and independently parsed zero-dynamic reports pass,
including42 inherited entries. New driver1858/1858 static statements. Both rebuilt
guest lanes retain all212 exact old records, with no skips. D1 planner135 and
legacy baseline207 pass in both hosts; metadata136/42 and stress8 pass; global15,
bootstrap18 and D2 G01-G16/fault/current/boundary/large controls pass with two
post-compilation inputs in both hosts. Final replays were started after the full
native build, so they use rebuilt binaries. Typecheck, runner20, probes10,
host73 and observations22 pass. `preservation.json` verifies old records/gates,
2546 protected files and60 blocked variants. No pins/manifests/C++/history changed.

## Compiler boundary

The first coverage report rejected a union node identity comparison (SC1090).
Narrowing the declaration node to function preserves that exact identity check.
Integrated coverage then identified one dynScalarEq at comparison of a function's
SourceText with the wider {id,text} unit. A common-type annotation removed dynamic
coverage but produced SC6001 and would copy the object under native compilation.
That attempted annotation was rejected, not adopted.

The minimal parser bridge now creates a SourceText object with its exact declared
shape, passes it to Parser and retains that same object alongside the copied unit.
Every function's source object must be identical to it; its text must match the
unit. No syntax/runtime types or pins changed. `reduce.mjs` and
`source-{before,copy,after}.ts` reproduce the actual boundary: Node true versus
native false for the first two variants; both true and zero dynamic for explicit
same-shape source retention. `source-reduction.json` retains builds, coverage and
executions. Initial source snapshots/reports and the failed sandbox Zig-linker
attempt are preserved. See [attempts](attempts.md).

The design follows the accepted E-P fixed2025 Script-record/parse boundary and
pinned engine262 source provenance evidence in
[the accepted design](../../script-execution-integration.md). Execution, function
semantics, restricted properties and later integration remain separate tasks.

## Reproduction (from typescript)

Set the pinned Zig installation directory on PATH with access to its libraries.

```
node docs/validation/ts-033e1/suites.mjs typecheck test:runner test:guest:node
node docs/validation/ts-033e1/suites.mjs test:guest:native test:probes test:test262 test:observations
node docs/validation/ts-033e1/validate.mjs node native
node docs/validation/ts-033e1/replay-plans.mjs node native
node docs/validation/ts-033e1/replay-baseline.mjs node native
node docs/validation/ts-033e1/replay-metadata.mjs node native
node docs/validation/ts-033e1/replay-stress.mjs node native
node docs/validation/ts-033e1/replay-global.mjs node native
node docs/validation/ts-033e1/replay-bootstrap.mjs node native
node docs/validation/ts-033e1/replay-d2.mjs node native
node docs/validation/ts-033e1/reduce.mjs
node docs/validation/ts-033e1/api-negative.mjs
node docs/validation/ts-033e1/preserve.mjs
```

Copied replay validators write only this assignment's evidence and scratch build
files; historical validators/evidence remain unchanged. Failed attempts are not
conformance records. This handoff stops for independent review, without merge.
