# TS-011P design evidence

2026-11-01; design chat `01a198c7-c792-7e60-9f85-a40a05f95b57`.
Base `9235558c83d8e2a48b2e3fbd88aa578c417b222d`, existing branch
`codex/primitive-computed-keys`. Design: [object coercion integration](../../object-coercion-integration.md).

Read `AGENTS.md`, `docs/project-goals.md`, `docs/compiler-contract.md`, the task
backlog, prior property-key design and the current runtime/conversion/evaluator,
array storage, array-like and map implementations. Audited conversion call sites,
reference consumers, definition dispatch, context ownership and existing tests.
Source links and revisions are recorded in the design. No runtime code, test
manifest, existing test, compiler pin, C++, companion queue or COORDINATION edit.

Validation performed:

```text
cwd: C:\Users\jonku\code\rift\typescript
command: npm run typecheck
exit: 0
> typecheck
> tsc -p tsconfig.json

command (repository root): git diff --check
exit: 0
```

No new semantic/compiler probe was warranted. No Node/native interpreter rebuild,
guest suite, runner or compiler probe rerun is claimed for this documentation-only
task. The coordinator-supplied accepted baseline is TS-010 `8cf17fa`: independent
157/157 in both lanes and 16 native static gates. That is prior evidence, not a
new result or proof of the proposed helpers. All H-matrix tests and new-driver
static coverage remain acceptance requirements for a later assigned task.

Audit searches (all results inspected, then narrowed by function/file):

```text
rg -n 'to(Number|String|PropertyKey|Uint32|IntegerOrInfinity|Length)|OperationContext' typescript/src typescript/test
rg -n 'getValue\(|putValue\(|lengthOfArrayLike\(|defineOwnProperty\(|internalSet\(|\.set\(' typescript/src typescript/test
rg -n 'unsupported|hook|object.*key|object.*length' typescript/test typescript/tools/run-guests.mjs
rg -n 'unsupported|object|coerc' typescript/test/cases.json typescript/tools/run-guests.mjs
```

Research retrieval notes: initial root-relative docs paths were wrong (canonical
files are under `typescript/docs/`); corrected before design. Attempts to retrieve
raw engine files through web search failed, and shell GitHub API retrieval failed
DNS under the sandbox. The connected GitHub fetch tool successfully supplied V8
12.0.267 and engine262 at the recorded immutable revision; no network escalation
or repository clone was needed. A Windows rg wildcard path failed and was
replaced with explicit file/directory searches. These were audit-tool failures,
not skipped semantic tests or native compiler failures.

Handoff: recommend the helper-only contract in the design. Existing conversions
stay primitive-only, and no successor has been started. Await coordinator review
and contract freeze. Coordinator owns task acceptance and COORDINATION.md.
