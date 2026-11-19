# Shared mutable array audit

TS-460, 2026-11-11. Bounded source review of execution/declaration storage and
parser body construction at `340e4d32`. No additional alias-sensitive widening
was found in the boundaries below. This is not an exhaustive compiler or engine
audit, and does not prove arbitrary array conversions safe.

The trigger was [TS-444](validation/ts-444-array-widening/README.md): returning
`Field[]` as `Initializer[]` copied the array under scriptc, so mutations through
the returned array never reached constructor storage. The accepted fix gives
both storage and return values the same union element type.

| Boundary | Storage and consumer | Assessment |
| --- | --- | --- |
| `ExecutableScript.classInitializers` | Both constructor arrays and the return type use `ClassInitializerRecord[]` | Shared alias required: callers push fields/blocks and clear static entries. The TS-444 fix is present on both paths. |
| `ExecutableScript.readRoot` | `DeclarationNodes.body`, returned value and execution list use `Stmt[]` | Same element type; no widening introduced by the helper. |
| `ExecutableScript.readFunction` | Function AST body and returned record body use `Stmt[]` | Same element type; wrapping the array in a record does not change its declared element type. |
| `ScriptGuestCallable.inspectFormals` | Stored `string[]` becomes `formals.slice()` | Intentional detached copy, not a shared mutation channel. |
| `Parser.list` | A fresh `Stmt[]` is populated and returned as `Stmt[]` | Same element type; no narrower storage array. |
| `DeclarationCollector.legacyBlockFunctions` | Fresh local `number[]` returned as `number[]` | Selection result, no source-array alias required. |
| `DeclarationCollector.strictParameterCandidates` | Fresh local `StrictParameterCandidate[]`, sorted and returned unchanged | Same element type; candidate sites are explicitly copied. |
| `selectFunctionDeclarations` | Fresh `number[]` returned as `readonly number[]` | Element type remains number; the selection result is read-only and not reused as mutable collector storage. |
| Declaration plan publication | Collector scope arrays become readonly plan arrays after collection/auditing | Structural readonly boundary; reviewed publication path does not require later collector mutations to affect a published plan. Do not infer general compiler alias preservation from this. |
| Execution continuation sequences | Stored `GeneratorFrame[]` is passed to statement/switch helpers as `GeneratorFrame[]` | Shared sequence operations retain the same union array type. Pushing one narrower frame value is distinct from widening an entire mutable array. |

Inspected files: `src/script-execution-internal.ts`, `src/script-declarations.ts`,
`src/script-environment.ts` and `src/parser.ts`. The search covered array-returning
helpers and then their storage declarations/call sites, including bodies carried
inside returned records. No additional direct array-return helper appeared in
the environment implementation. This was a manual bounded review, not a
type-checker analysis of every conversion in the repository.

No runtime patch or duplicate regression test is justified by this inspection.
Keep the existing both-host TS-444 reproducer/control and class static-block
regressions. For upcoming private-element work, retain uniform initializer array
types and reduce any new alias-sensitive conversion before integrating it.
