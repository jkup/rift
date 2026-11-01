# TypeScript implementation backlog

Statuses: **ready**, **blocked**, **in progress**, **done**. Claim a ready task before coding. Record owner/chat, base revision, evidence and handoff notes. A task becomes done only after integration and successful acceptance. Split broad tasks into bounded batches as interfaces become concrete.

## TS-001 — First integrated interpreter

Status: **ready**. Owner: to be claimed by the new Codex implementation chat.

Prerequisites: probe fixes at `ec968f6`; approved `AGENTS.md` and `docs/project-goals.md`. No need to wait for full C++ baseline auditing to build this bounded prototype; existing tests are references, not a measured conformance baseline.

Objective: establish one working path from guest source text to an observable result under both Node-hosted and native Rift. Implement the minimal foundation that other agents can extend coherently.

Owned area: `typescript/src/`, `typescript/test/`, relevant `typescript/tools/`, package scripts, tsconfig, and TypeScript docs. Preserve existing probes and C++ source. Coordinate rather than overwrite any unexpected concurrent changes.

Required behavior:

- CLI accepts a guest source file (and optionally `-e`), reads it at runtime, and reports output/errors with deliberate exit statuses.
- Lexer/parser supports a deliberately small documented subset: literals, identifiers, arithmetic/comparison, assignment, let declarations, blocks, if, while, function declarations/expressions, calls, return, object literals and property access/write.
- Demonstrate lexical closures with retained mutable bindings, ordinary object identity and receiver handling for method calls, and a simple console.log built-in.
- Establish Value, PropertyKey, object/descriptor, Reference, Environment, Completion, Realm, guest-call and built-in registration interfaces through real execution. Do not implement the entire specification merely to populate those interfaces.
- Give parse failures source locations. Make unsupported syntax explicit. Provide guest error/completion plumbing, a documented recursion/step budget, and distinguish internal faults from guest failures.
- Keep filesystem/process access out of the core. Keep a small guest-string API and per-realm mutable state.

Exclusions: complete descriptors/prototype semantics, all declaration variants, classes, generators/async, modules, Temporal, regex, weak collections, broad test262 parity, performance tuning and C++ removal. Do not claim semantics beyond the tested subset.

Acceptance:

1. Existing `npm run test:runner`, `npm run test:probes` and `npm run typecheck` pass.
2. Add documented `build:node`, `build:native`, `test:guest:node`, `test:guest:native` commands; native compilation enforces static coverage. Compile Rift, not guest test programs.
3. Execute the same guest files in both lanes, asserting explicit expected outputs/errors, not only matching each other. Include closure mutation, object aliasing, loop/control-flow behavior, method receiver handling, invalid syntax, missing binding, bounded runaway execution, and two independent realms.
4. Include a small example producing an observable result using functions/closures, an object and a loop. A fresh checkout with the documented toolchain can run it natively.
5. Document concrete module interfaces in `docs/architecture-decisions.md` and supported/unsupported syntax in a feature inventory. Preserve probe transcript evidence and report limitations.
6. Refine TS-002 through TS-005 into genuinely bounded assignments with real file ownership and test commands. Mark only satisfied dependencies ready. Stop after this foundation; do not dispatch feature agents automatically.

Handoff: changed behavior, files/interfaces, validation commands/results, native limitations, known semantic gaps, and next ready tasks. Implementation is authorized; publishing, merging or removing C++ is outside this task.

## TS-002 — Frontend extension batch

Status: **blocked** by TS-001 AST/token/parser conventions.

Candidate first batch: conditional expressions and associated precedence/error tests. Before marking ready, identify exact owned files and validate existing evaluator support. Exclude unrelated syntax and shared-type redesign.

## TS-003 — Number built-ins batch

Status: **blocked** by TS-001 built-in registration, numeric values and guest calls.

Candidate first batch: named Number constants and non-coercing predicates such as Number.isNaN and Number.isFinite. Define precise descriptor requirements and tests before dispatch. Exclude Number wrapper/coercion redesign.

## TS-004 — Ordinary object semantics

Status: **blocked** by TS-001 object operations, descriptors, references and guest-call boundary.

Integration-owned preparation: split into descriptor validation, prototype/receiver operations and property ordering tasks, in dependency order. Accessors and coercion can call guest code; do not assign independently before those interfaces exist.

## TS-005 — Array method batches

Status: **blocked** by array storage/hole/length semantics, TS-004, coercion and callback calls.

Create prerequisite tasks after TS-001. Then assign small named method groups with exact spec behavior and adversarial tests, not “port Array.”

## Later roadmap (not ready assignments)

- Audited test262 adapter and baseline reporting, with pinned revision and honest unsupported classifications.
- Iteration, spread/destructuring and classes after their semantic prerequisites.
- Suspension prototype covering finally/unwinding and exact-once side effects.
- Guest jobs/promises, generators, async functions, then async generators.
- Dependency feasibility for regex/Date/Temporal and eventual breadth recovery.
- Performance work only after correctness and a reproducible demo.
