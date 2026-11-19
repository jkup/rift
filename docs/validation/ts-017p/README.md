# TS-017P design review evidence

Baseline: `e515e7bc00633f3932eb8f11b9b142cf5ba7eaf8`, branch
`codex/primitive-computed-keys`. Sole design writer: chat
`01a19988-2678-7cd0-af57-de81fcff8ea6`.

Deliverable: [function Realm entry design](../../function-realm-entry.md).
This directory records source inspection, not execution evidence. No production,
test, manifest, toolchain, C++, Claude queue or COORDINATION edits are part of
this task. No compiler probe was warranted by an observed failure. No native
support for the proposed representation is claimed.

Inherited baseline only: coordinator accepted TS-016B final `59bd44e` after
independent rebuilt Node/native 163/163 and all 22 static gates; producer's
runner20/probes10/typecheck are recorded in TS-016B evidence. Those suites were
not rerun for this prose change. R1-R22 are fixed future expectations, not results.

Inspected instructions: AGENTS.md, project-goals.md, compiler-contract.md,
TASKS.md, COORDINATION.md, realm-intrinsic-prototypes.md. Inspected runtime,
Realm, evaluator, interpreter, builtin call, internal map and ordinary coercion;
searched all src/test callable assignments, factories and OperationContext uses.

Retained searches (paths and line numbers are from the baseline):

```powershell
rg -n 'callable\s*=|createFunction|createBuiltin|registerBuiltin' typescript/src typescript/test
rg -n 'context.*realm|context ===|context !==|ctx.*realm|active.*realm' typescript/test
rg -n 'OperationContext|createFunction|createBuiltin|registerBuiltin|new GuestObject|new GuestArray|new Realm' typescript/src
```

Outputs: callable-inventory.txt, context-inventory.txt, production-inventory.txt.
The first search deliberately includes callable null checks, so it is not a
count of assignments. The design table identifies the actual raw assignments.
No current test calls createFunction directly.

Source consultation used fixed ECMAScript 2025 multipage sections 9.4, 10.2,
10.3 and 20.2.3, with exact links in the design. engine262 source was fetched
through the GitHub connector at `d553e7b52501fbc47eae981c8d0fa7a5c26d0171`:
src/abstract-ops/function-operations.mts,
src/execution-context/ExecutionContext.mts,
src/intrinsics/FunctionPrototype.mts. Relevant algorithms and adopted/rejected
choices are identified in the design. No external code is vendored or copied.
The web fetcher could not fetch the monolithic spec or raw engine file; fixed
multipage spec and connector reads succeeded. A shell API read failed DNS and
was not used as evidence.

Review check: git diff --check for the scoped staged documentation before commit.
Runtime validation remains a requirement of the next separately assigned batch.
