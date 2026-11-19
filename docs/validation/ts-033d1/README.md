# TS-033D1 — non-executing declaration planner

Assigned base `c755a6a6c2e81c4b2d0f2568782d3dfa471cd135`, branch
`codex/test262-classification`, sole writer chat
`01a19dbb-4ed3-73d3-a3b8-29b6996ccc17`. Implements D1 of accepted `81c660a`,
[declaration design](../../script-declarations.md). Awaiting independent review;
no D2/P4, successor, branch switch or main merge is authorized by this handoff.

## Implementation

The exact public plan types are in `src/script-declarations.ts`. The new entry
copies unit ID/text, calls a private-purpose parser path, and returns only flat
records. The parser exposes no body from its plan entry. It records identifier
and initializer spans while parsing the same grammar; var statements/lists are
emitted only for declaration-plan. Legacy and return-audit retain first-error,
partial-body, duplicate-binding and return certification behavior.

An explicit work stack visits every statement/expression child in source order.
Var-list binding work interleaves declaration allocation and initializer visits:
`var a=function(){let x;},b;` has declaration IDs a0,x1,b2. Block-end work performs
postorder var propagation into its parent, preserving occurrences and stopping
at function boundaries. Work is bounded by source size and parser depth; no
recursive AST walk, deep-AST serialization or quadratic conflict scan is used.
Token locations and matching punctuation braces recover scope/formal spans.
Function scopes use body braces; function records retain full source spans.

After full grammar/resource validation and collection, non-strict block functions
veto planning. Then each scope checks duplicate lexical, lexical/var, formal/lexical
conflicts, with first-occurrence maps and the frozen deterministic priority.
No conflict is a new certified language error or an execution capability. Pure
function selection reverse-scans and reverses the winner array once; it performs
no global precheck. Block functions never enter its candidate list.

The unchanged directive algorithm was extracted into `script-prologue.ts` for
metadata and planning. The only evaluator change is the required host invariant
for a manually forged var AST; the legacy metadata visitor has the same invariant.
No Realm, global primitive, runtime, interpreter, observation, protocol or admission
implementation was edited. No initializer/body/callback is evaluated by planning.

The accepted fixed ECMA-262 2025 and pinned engine262 evidence in
`../ts-033d-p/spec.json` and `engine.json` informs static name lists, strict scope
conflicts and last-function selection. No upstream implementation was copied.

## Oracles and validation

`frozen-contract.md` is the accepted design captured before production edits.
`cases.mjs` freezes 71 G/L/T projections and neighbors. H/F effects are deliberately
unexecuted: inputs for runtime-conflict scenarios are independently valid plans.
`fixtures/script-declarations/literal.json` contains complete literal expected
records for successful rows. `author-fixtures.mjs` is a source-only authoring aid:
it never imports Rift, invokes another engine on guest source, or reads actual
planner output. It cross-checks independently authored scope/name topology before
writing offsets/IDs into the frozen JSON. Validation consumes that JSON directly.
Conflict site pairs and later diagnostic locations are literal assertions.

`validate.mjs` runs 135 post-compilation runtime-source controls per lane: 71
literal rows, two R05 unit identities, 39 visitor/priority/grammar/flat-list controls,
and 23 R01–R04 resource/flat/deep controls. R05 checks exact CRLF, U+2028/U+2029,
non-BMP-comment, parenthesized-initializer and formal spans. R02 retains the exact
126/127 block and 126 parenthesis success boundaries, count129 failures. R03 checks
all 12000 repeated and 6000 distinct declaration records; an additional one-statement
12000-name list checks iterative var-list handling. R04 uses the specified 15000-link
binary/member/call sources, plain neighbors, terminal functions and const vetoes.
The driver tests detached unit/nested snapshot mutation and same-process isolation.

`baseline.mjs` independently compiles parser/lexer/syntax/outcomes/metadata from
exact base c755a6a. Both lanes match all 136 inherited plus 71 added full legacy
parse/audit/metadata records (including partial bodies) exactly. The separate
metadata replay preserves 136 legacy comparisons and 42 literal controls; the
unchanged eight metadata stress controls pass in both lanes. Global H01–H15 and
bootstrap B01–B18 pass with both original and renamed post-compilation inputs in
both lanes. The latter remain controls of existing primitives/guards, not D2.

Both rebuilt guest lanes pass all 212 exact inherited records, no skips. All 40
old native entries plus the new planner entry pass static-only builds and separately
parsed zero-dynamic coverage. Planner driver: 740/740 static statements. Runner
20/20, compiler probes10/10, host73/73, real observation16/16 and typecheck pass.
`preserve.mjs` checks exact records/gate names, the single additive build-list edit,
protected paths and all 60 still-blocked corpus variants. Historical evidence,
CL006, coordinator records, toolchain pins and C++ remain untouched by this writer.

## Retained attempts and explicit expectation handoff

- `plans-source-label-attempt.json`: my new test initially called the guard
  `source-size`. The unchanged lexer/outcome type names it `source-units`; the
  corrected assertion keeps count100001/limit100000 and the same resource priority.
  The design's phrase “source-size resource” is descriptive, not a new guard code.
  This test-label correction is explicitly handed off for review, not a production
  change or weakening of any accepted boundary.
- `visitor-fixture-attempt.json`: an added binary-left control began a statement
  with anonymous `function`, which the shared grammar parses as a declaration.
  Parentheses were added around that expression (and the analogous conditional
  test). The expected traversal/ranges remain independently source-derived. These
  are supplemental fixture corrections, not changes to frozen G/L/T/R requirements.
- `native-attempt.json` (raw log string): sandbox Zig installation-library lookup failure.
  `native-intermediate.log`: approved preliminary build interrupted to finish the
  explicit postorder collector before final full rebuilding. `native.log` is the
  complete final successful build/guest run. No compiler workaround or pin change.
- `host-sandbox-attempt.json`: required host tests hit sandbox symlink/temporary
  rename EPERM; approved rerun is `suite-test-test262.json`, 73/73. Probe and
  observation runs also used approved toolchain/temporary-file access.
- An initial coverage invocation mistakenly passed the `.exe` to Node; Node
  rejected that extension before compilation. Invoking scriptc directly succeeded.

## Reproduction

From `typescript/`, with installed Zig on PATH and approved library/temp access:

```
npm run test:guest:node
npm run test:guest:native
npm run typecheck
npm run test:runner
npm run test:probes
npm run test:test262
npm run test:observations
node docs/validation/ts-033d1/validate.mjs node native
node docs/validation/ts-033d1/baseline.mjs node native
node docs/validation/ts-033d1/metadata.mjs node native
node docs/validation/ts-033d1/stress.mjs node native
node docs/validation/ts-033d1/global.mjs node native
node docs/validation/ts-033d1/bootstrap.mjs node native
node docs/validation/ts-033d1/preserve.mjs
```

Evidence is Windows x64 on pinned scriptc0.4.7 only. These plans establish neither
Script execution nor broader grammar/Annex B/error certification or conformance.
No global orchestrator, materializer, binding creation or function creation exists
in this slice. D2 and P4 require separate assignments after independent acceptance.
