# TypeScript implementation backlog

Statuses: **ready**, **blocked**, **in progress**, **done**. Claim a ready task before coding. Record owner/chat, base revision, evidence and handoff notes. A task becomes done only after integration and successful acceptance. Split broad tasks into bounded batches as interfaces become concrete.

## TS-001 — First integrated interpreter

Status: **done**. Owner: Codex implementation chat `01a19794-baaa-7113-bba5-479887f71000`; base `2ed8a3e` (clean checkout). Implementation milestone: `a016967`; validated on 2026-11-01. Coordinator companion-queue changes at `325577d` preserved.

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

Delivered: `src/` interpreter and CLI; `examples/counter.js`; expected-result guest suite and independent-realm host driver; Node/native build commands with mandatory static coverage. `README.md`, `docs/architecture-decisions.md`, and `docs/feature-inventory.md` document actual interfaces, supported behavior, resource limits, and restrictions. No C++ changes or later feature implementation. Later owner authorization permits commits and pushes to `typescript-scriptc-probes`, not merging.

Acceptance evidence: typecheck passes; runner regressions 20/20; compiler probes 10/10; guest Node 47/47 and native 47/47, no skips. Native CLI 644/644 static statements, realm driver 657/657. Windows x64 native linking required approved access to installed Zig libraries; no gate was weakened. Full retained transcripts: `docs/validation/ts-001/`. Guest source is read at runtime in both lanes. This is a bounded strict-call profile with own data properties, not a conformance claim: coercion, prototypes, Error objects, full Script/global/strictness semantics, ASI and broader syntax remain explicitly deferred.

## TS-002 — Frontend extension batch

Status: **ready** (TS-001 dependency satisfied). Owner: unassigned.

Assignment: conditional (`test ? consequent : alternate`) expressions only. Own `src/syntax.ts`, `src/parser.ts`, the new conditional case in `src/evaluator.ts`, `test/fixtures/conditional.js`, conditional entries in `test/cases.json`, and the corresponding inventory row. Add the `?` token in `src/lexer.ts` as a coordinated one-line change. The evaluator already supplies `truthy` and explicit completion propagation; it does **not** yet have a conditional node, so adding that single union alternative and evaluator case is part of this task. No other interface redesign.

Acceptance: fixed outputs for right association, precedence with assignment/||/arithmetic, nested conditionals in arguments, only the selected arm executing, and abrupt test/arm propagation. Fixed parse failures for missing `:`/arms; bounded deep nesting. Run `npm run typecheck`, both `test:guest:*` commands, `test:runner` and `test:probes`. Exclude optional chaining, nullish coalescing, comma, ASI and declaration changes. Coordinate edits to shared test manifests with the integration owner.

## TS-003 — Number built-ins batch

Status: **ready** (TS-001 dependency satisfied). Owner: unassigned.

Assignment: a deliberately partial, non-callable `Number` namespace with `NaN`, `POSITIVE_INFINITY`, `NEGATIVE_INFINITY`, `MAX_VALUE`, `MIN_VALUE`, `EPSILON`, `MAX_SAFE_INTEGER`, `MIN_SAFE_INTEGER`, `isNaN`, and `isFinite`. Own new `src/builtins/number.ts`, `test/fixtures/number.js`, number entries in `test/cases.json`, number host assertions in `test/realms.ts`, and inventory notes. Integration owner coordinates the single registration call in `src/realm.ts`. Use `registerBuiltin`, Value kind tests and Completion; predicates never coerce. No parser/evaluator changes.

Constants: non-writable/non-enumerable/non-configurable. Predicate properties: writable/non-enumerable/configurable. Global namespace binding mutable; explicitly document that call/new/wrappers are unsupported. Host assertions verify descriptor flags and per-realm identity; guest tests cover missing/excess arguments, NaN/infinities/signed zero, primitive/object/function inputs, ignored receiver, extra argument effects, and rejected constant writes. Run typecheck, both guest lanes, runner regressions and probes. Exclude Number conversion/constructor, formatting, integer predicates, coercion and reflection APIs.

## TS-004 — Ordinary object semantics

Status: **blocked** as an umbrella; only TS-004A below is ready. Integration owner must sequence these changes. No accessors or prototype work is authorized merely by claiming TS-004A.

### TS-004A — Validate data descriptor updates

Status: **ready**. Owner: unassigned. Prerequisite: TS-001.

Own `src/runtime.ts` data-descriptor operations, new `test/object-descriptors.ts`, and integration-owned registration of that host test entry in `tools/build-native.mjs` / `tools/run-guests.mjs` / `tsconfig.json` if needed. Add an internal completion-returning DefineOwnProperty for **data descriptors only**, distinguishing omitted attributes from false/undefined, preserving existing flags, respecting non-configurable/non-writable transitions and SameValue (NaN and signed zero). Add an extensible flag and preventExtensions internal operation. Bootstrap creation remains explicit. Exclude accessors, proxies, prototypes, guest Object builtins and enumeration.

Acceptance: expected host assertions in both compiled lanes for creating/defaulting/redefining/rejecting properties, preventing extension without blocking writable updates, NaN/signed-zero transitions, and preserving object state after rejection. Existing guest tests, typecheck, runner regressions and probes remain green. Do not silently turn `define` into an unchecked public operation.

### TS-004B — Prototype reads/writes and receivers

Status: **blocked** by TS-004A and integration review of completion-aware object operations. Planned files: `src/runtime.ts`, `src/evaluator.ts`, `test/object-prototypes.ts`, `test/fixtures/prototypes.js`. Bounded batch: ordinary prototype traversal, cycle rejection, inherited data reads, inherited writable/non-writable writes with explicit receiver, receiver-own updates; no accessors. Test multiple realms, distinct base/receiver objects, inherited read-only failures, and cycle rejection in both lanes. Before ready, the integration owner must freeze Get/Set result signatures and the host test entry contract. Accessor descriptors and guest getter/setter calls require a separate task after these interfaces land.

### TS-004C — Own property ordering and deletion

Status: **blocked** by TS-004A plus a frozen internal deletion/key-list API (integration owner). Planned files: new `src/property-keys.ts`, `src/runtime.ts`, `test/object-keys.ts`. Scope string keys only: canonical array-index ordering before insertion-ordered strings, deleting configurable properties, delete/reinsert ordering, and non-configurable rejection. Test boundary index strings, ordinary strings, overwrites and reinsertion under Node/native. Symbols and guest reflection builtins are separate prerequisites before claiming complete OwnPropertyKeys.

## TS-005 — Array method batches

Status: **blocked** by array storage/hole/length semantics, TS-004, coercion and callback calls.

### TS-005A — Array storage/length prerequisite

Status: **blocked** by TS-004A/B and an integration-owned primitive coercion design. Planned files: new `src/array-object.ts`, `test/array-storage.ts`. Freeze array-index classification from TS-004C first. Implement internal array length/index writes, holes versus present undefined, length truncation and failed truncation against non-configurable elements. No guest array syntax or methods in this batch. Expected host assertions must pass both lanes with static coverage. Object coercion that invokes guest code remains a separate prerequisite; do not reuse host conversion.

### TS-005B — Array map only

Status: **blocked** by TS-005A, completion-aware HasProperty/Get/Set, ToObject/LengthOfArrayLike, callback invocation and an approved array creation/species scope. Planned files: new `src/builtins/array-map.ts`, `test/fixtures/array-map.js`, test manifest entries. Before ready, settle the guest entry point and complete inherited-property/hole semantics. Required cases: holes, mutation during callback, snapshot length, receiver/thisArg, thrown callbacks, inherited elements and generic array-like receivers. No filter/reduce/iterator or other methods. Run both guest lanes plus all foundation gates; no broad “port Array” assignment.

## Later roadmap (not ready assignments)

- Audited test262 adapter and baseline reporting, with pinned revision and honest unsupported classifications.
- Iteration, spread/destructuring and classes after their semantic prerequisites.
- Suspension prototype covering finally/unwinding and exact-once side effects.
- Guest jobs/promises, generators, async functions, then async generators.
- Dependency feasibility for regex/Date/Temporal and eventual breadth recovery.
- Performance work only after correctness and a reproducible demo.
