# TS-005P evidence — 2026-11-01

Design/probe scope only, base `56edcbe912aeabc0bb41785fb7bc802fece28e68`.
See [proposal](../../array-prerequisites.md). No semantic array results are claimed.

## New isolated dispatch probe

From `typescript/`, run `node probes/array-prerequisites/run.mjs` with the installed
Zig directory on PATH. It invokes pinned tsc, executes its JavaScript, builds the
same source with scriptc `--tier static-only`, runs separate coverage, executes
the binary, and checks both lanes against a fixed expected success line. The
source contains seven throwing expected assertions. The shared verdict helper
rejects missing/unknown coverage, errors, timeouts, signals and output mismatch.
The new probe is intentionally outside the existing top-level probe discovery;
its TypeScript is included by the existing recursive typecheck glob.

- `dispatch.json`: PASS; Node v26.13.0, scriptc 0.4.7, TypeScript 7.0.2,
  Zig 0.17.0, Windows x64. Both executions exit 0; 33/33 static statements.
- `dispatch-sandbox.json`: initial build failed because Zig could not access its
  installation directory. Node and coverage succeeded; native was not executed.
  This is retained as an environment failure, not a semantic failure or skip.
  Repeating with authorized escalated Zig access produced `dispatch.json`.

Seven assertions cover inherited Set on a base-typed subclass instance, Set from
an ordinary base to a distinct subclass receiver, unchanged lookup base, normal
false without mutation, throw propagation, ordinary dispatch, and exact override
call count. `super.defineOwnProperty` writes a private base Map and is observed
through an inherited read. No array or numeric conversion algorithm is implemented.

## Existing regressions

`node probes/array-prerequisites/validate.mjs` runs unchanged existing commands
sequentially and writes `regressions.json`, preserving status, signal, error,
stdout and stderr. Native runs use the same installed Zig PATH and approved
library access. Its first tsc invocation builds the Node artifacts before the
guest Node run. Outcomes:

| Gate | Result |
|---|---|
| Typecheck | exit 0 |
| Runner tests | 20/20 |
| Existing compiler probes | 10/10, both lanes and coverage |
| Node guest/host cases | 131/131, no skips |
| Native build | all five entry points pass static-only and coverage |
| Native guest/host cases | 131/131, no skips |

All six recorded commands exit 0 without signals or subprocess errors. The
full original probe and native-build records are retained alongside this README.
This verifies unchanged engine behavior and new dispatch feasibility only.
The proposal's conversion/array matrix is future acceptance work, not tests
executed against Rift. Numeric parsing backend completeness, module-scale array
integration and future guest-call context compilation remain unmeasured.
