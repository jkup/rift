# TypeScript rewrite: Rift compiled with scriptc

Status: implementation direction approved 2026-11-01. Feasibility probes passed Gate A (see section 4). The owner has authorized the first integrated-interpreter task and the lightweight coordination plan. Approved defaults and working rules now live in [typescript/AGENTS.md](typescript/AGENTS.md) and [project goals](typescript/docs/project-goals.md); the live implementation backlog is [typescript/TASKS.md](typescript/TASKS.md). Those files supersede tentative choices below.

This document retains the exploration and longer-term design rationale. The immediate implementation objective is a small integrated JavaScript interpreter, followed by bounded feature assignments once shared interfaces work. Probe success does not prove complete-engine feasibility. Production adoption and broad Node compatibility are not prerequisites for success.

The implementation should eventually be divisible into bounded agent tasks. First establish the compiler constraints and shared interfaces; only then distribute substantial feature work.

## Proposed project goals and agent decision rules

Status: draft for discussion with the project owner, not yet a finalized agent policy. This section describes the intended character of the rewrite, independently of its implementation schedule.

**Purpose:** make the workings of a real JavaScript engine understandable to a developer who knows TypeScript. Produce code worth reading, with trustworthy semantics and recognizable engine concepts, that also compiles to a native executable.

This teaches the JavaScript-engine part of a browser. HTML, CSS, DOM, layout, rendering and the rest of a browser are outside the proposed scope.

### Priority and tradeoffs

1. **Readable, explanatory TypeScript is the primary design objective.** A reader should be able to follow a guest program from parsing through evaluation, object operations and completion without deciphering clever encodings or a framework of indirection.
2. **ECMAScript correctness is a constraint on implementations and a long-term completeness goal.** Choose the clearest correct implementation. Readability does not justify silently wrong semantics; an unfinished feature should be explicitly unsupported or documented as partial. Work toward full test262 conformance against a named revision and declared scope, while reporting exclusions and failures honestly. Passing tests is evidence of correctness, not proof of it.
3. **Recognizable engine architecture supports the educational purpose.** Use established concepts and terminology where they clarify the implementation. Learn from other engines without reproducing machinery that exists mainly for their scale, implementation language or optimization needs.
4. **Performance follows clarity and correctness.** Avoid gratuitous inefficiency and fix measured bottlenecks. Accept a more complex implementation only when evidence establishes the benefit and the semantic path remains understandable. Competitive performance with V8 is not an initial goal.

Native compilation is a project constraint, not permission to destroy readability. If scriptc requires pervasive awkward code, isolate the compromise, record it, and revisit the toolchain or scope. Do not quietly redefine the project's primary goal around compiler limitations.

Examples of decisions implied by this ordering:

- Prefer an explicit completion record to an obscure shortcut, even if it allocates more initially.
- Retain receiver and descriptor semantics when simplifying object access; omit a feature explicitly rather than teach an incorrect model.
- Prefer an ordinary tagged value representation until measurement justifies a packed one.
- Use a shared implementation of a spec operation where its semantics are actually shared; do not merge superficially similar operations with different observable ordering.
- Defer an optimization that obscures evaluation order, even if a benchmark improves, unless there is a clear explanation and sufficient payoff.

### Readability rules for implementation agents

- Optimize for a competent TypeScript developer new to engines. Explain engine concepts and invariants; do not narrate obvious TypeScript statements.
- Use precise names and explicit data shapes. Favor straightforward control flow and local reasoning over clever type programming, implicit mutation or deeply layered generic abstractions.
- Retain recognizable spec names for semantic operations, with a short explanation where needed. Link to stable specification anchors. Explain departures from the spec's presentation without implying that implementation code must reproduce its prose line for line.
- Keep observable evaluation order visible, especially when coercion, getters, setters or iterators can execute user code.
- Centralize semantic rules; keep platform and compiler workarounds behind narrow, documented boundaries.
- Comments should explain why a step exists, what invariant it protects, and any non-obvious spec consequence. Update them when behavior changes.
- Do not impose arbitrary function-length or abstraction-count limits. Split code where it produces a coherent named concept, not merely a smaller file.
- Include a small guest-code example or focused test for a subtle semantic rule. A reader should be able to connect the implementation to observable behavior.

### Learning from other engines

For a new subsystem, a difficult semantic corner, or a consequential representation change, consult the relevant specification and at least one relevant engine implementation. Compare a second implementation when the first leaves ambiguity or suggests substantial complexity. Routine small edits do not need a ceremonial research pass.

Useful reference set: [Boa](https://github.com/boa-dev/boa), [Kiesel](https://kiesel.dev/), [engine262](https://github.com/engine262/engine262), and the JavaScript components of SpiderMonkey and V8.

Treat reference code as evidence and design inspiration, not normative authority. Resolve semantic disagreements through the specification and targeted tests. Similar naming is useful when it makes a concept transferable; copying an architecture solely because a prominent engine uses it is not.

For meaningful design decisions, record the implementation/file and revision examined, the pattern considered, what Rift adopts, what it omits, and why that serves readability. Observe upstream license and attribution requirements if adapting code. Do not paste an entire subsystem as a substitute for understanding it.

### Conformance ambition versus milestone scope

The long-term ambition is full conformance, not a permanently convenient subset. Early milestones may intentionally cover a smaller surface. Pin the spec edition and test262 revision, name the targeted suites and optional/proposal scope, and keep missing features on the roadmap. Changing the denominator is not progress.

A semantic fix must not be rejected merely because the old behavior was simpler. Search for a clear correct design; if it cannot fit the current milestone, document and defer the feature honestly. Test262 conformance alone does not cover browser APIs or establish that the engine is a secure sandbox.

### Where these instructions should live

Keep this discussion in the rewrite plan while goals are being settled. Once agreed and the TypeScript package exists, put a short binding summary in `typescript/AGENTS.md` and the fuller rationale in `typescript/docs/project-goals.md`. Link the agent instructions to that rationale and the compiler contract.

Scope rewrite-specific instructions to the TypeScript subtree so they do not accidentally govern maintenance of the C++ engine. If a root `AGENTS.md` is later added, give it a brief pointer and repository-wide rules rather than a second copy of the goals. Keep one canonical policy to avoid drift.

Before accepting a change, agents should answer: Is the code understandable to the intended reader? Is the claimed behavior correct and tested in both hosts? Does it use recognizable concepts for a reason? Is any added complexity supported by evidence?

## 1. The experiment

Proposed description: **A JavaScript engine written in TypeScript, compiled to a native executable.**

Build-time pipeline:

```text
Rift TypeScript source -> scriptc -> native Rift executable
```

Execution-time pipeline:

```text
Guest JavaScript source -> Rift lexer -> Rift parser -> Rift evaluator -> result
```

Compiling the interpreter does not compile guest programs to native instructions. The first version remains an interpreter. A bytecode VM, JIT, TypeScript guest syntax, and self-hosting are separate projects, not implied milestones.

The interesting result would be the same engine source running under Node for development and as a native binary for the demonstration, with documented differences and reproducible tests. Do not claim this is the first such engine without separate research. JavaScript-in-JavaScript implementations already exist, including engine262.

Proposed initial boundaries:

- Keep the current C++ engine buildable and its history intact.
- Implement the new engine alongside it under `typescript/`.
- Require static scriptc compilation of the engine. Do not enable a dynamic fallback just to make progress appear successful.
- Implement guest execution ourselves. Never use host `eval`, `Function`, Node `vm`, or another JavaScript engine to execute guest code.
- Allow Node tooling for tests, code generation, and development; it is not part of the shipped native interpreter.
- Prefer a small correct demonstration over claiming immediate parity with the whole C++ runtime.

These are proposed project constraints to confirm before implementation, not conclusions from a completed prototype.

## 2. What the existing project contributes

Inspection found approximately 48,000 nonblank lines across 160 source/header files, plus 208 `.js` files directly inside `test/` and additional nested tests. These are inventory counts, not coverage measurements. No fresh build or conformance run was performed for this document.

| Existing area | Reference | Rewrite use |
|---|---|---|
| Lexer and recursive-descent parser | `src/frontend/`, `include/rift/frontend/` | Grammar knowledge, precedence, source-location behavior, regression cases |
| Values, objects, coercion | `src/types/`, `include/rift/types/` | Semantic inventory; redesign representation for TypeScript |
| Environments and jobs | `src/execution/` | Scope rules and microtask requirements |
| Execution | `src/interpreter/` | Behavior reference; avoid a mechanical port of suspension machinery |
| Built-ins | `src/builtins/` | Spec links, algorithms, supported-feature inventory |
| Memory management | `src/memory/` | Root/lifetime lessons and GC regression scenarios |
| Embedding and CLI | `src/api/`, `src/main.cpp` | Small external interface to preserve where useful |
| Tests and harnesses | `test/`, `test-runner.js`, `scripts/test262/` | Portable guest programs, after auditing assertions and harness behavior |
| Spec annotations | `docs/STYLE_GUIDE.md` | Preserve anchored spec references and explicit deviations |

The documentation is not an authoritative feature manifest: Reflect is implemented but still listed as missing in README. Existing test262 filtering excludes major language areas. The current runner treats module tests as strict scripts, which is not equivalent to module execution. Some custom GC helpers are simulated. Audit these before publishing coverage claims.

C++ output is a regression reference, not the definition of JavaScript. If it disagrees with the spec and independent engines, record and fix the discrepancy rather than preserving it as compatibility.

## 3. scriptc evidence and uncertainty

Primary references consulted on 2026-11-01:

- [Repository](https://github.com/vercel-labs/scriptc)
- [Compiler architecture](https://scriptc.dev/how-it-works)
- [Limitations](https://scriptc.dev/limitations)
- [Quickstart](https://scriptc.dev/quickstart)

The architecture documentation describes TypeScript checking, a typed intermediate representation, native backends, and a supporting runtime. Native output still has runtime support code; avoid calling this engine literally “runtime-free.”

The published limitations describe restrictions on unions, structural records, `any`, Map keys, and available standard-library operations. They also document dense-array traps, aliasing differences for record conversions, string edge cases, reference counting with cycle collection, and restrictions on native FFI. These affect engine design directly. [Source](https://scriptc.dev/limitations)

Retrieved documentation snapshots are not perfectly consistent about versions, platform support, or CLI flags. Therefore **the exact pinned compiler and executable probes are authoritative for our implementation contract**.

The pinned toolchain, commands, probe results and the coding rules they produced are recorded in [`typescript/docs/compiler-contract.md`](typescript/docs/compiler-contract.md). In short: scriptc 0.4.7 builds and runs natively on Windows x64 (with zig as the linker), and static-only compilation is enforceable by combining `--tier static-only` with a `scriptc coverage` check, since the flag alone still admits runtime-typed values.

Do not assume cross-compilation proves a binary runs. Execute tests on each platform we claim to support.

## 4. Feasibility probes before commitment

Build tiny independent programs under `typescript/probes/`. Every probe must run as ordinary compiled TypeScript under Node and as a scriptc native executable, with expected observable results. Capture compiler diagnostics and native exit status, including crashes and hangs.

| Probe | What to demonstrate | Decision it informs |
|---|---|---|
| Toolchain | CLI arguments, file input, stdout/stderr, exit status | Viable development platform and CLI adapter |
| Value representation | Tagged unions, nested records, arrays of values, narrowing | Union-based values versus fixed-layout tagged records |
| Identity and mutation | Two references observe the same object mutation, including across calls | Classes/direct references versus numeric object handles |
| Recursive structures | AST children, environment chains, closures retaining environments | Safe recursive data shapes and lifetimes |
| Collections | Lookup, insertion order, deletion, replacement, bounds checks | Internal maps versus explicit tables |
| Strings | Lone surrogates, surrogate pairs, slicing, comparison, NUL | Guest UTF-16 storage and host-boundary conversion |
| Numbers | NaN, signed zero, infinities, bitwise conversions, parse/format round trips | Numeric compatibility helpers |
| Dispatch | Built-in IDs, enum switches, function values and call signatures | How built-ins and evaluator operations are represented |
| Control flow | Explicit completion records and nested unwinding | Exceptions versus data-based guest control flow |
| Memory | Repeated allocate/release cycles and retained closures | Initial host-managed strategy and long-running limitations |
| Suspension | Save a small explicit frame, resume it, preserve side effects exactly once | Generator/async execution architecture |
| Interop | Minimal native-library call only if needed | Feasibility of reusing Temporal/regex dependencies later |

A probe passes only when behavior is correct in both lanes, not merely when compilation succeeds. Reproduce unexplained discrepancies with minimal code before redesigning a major subsystem.

**Gate A:** proceed to a minimal interpreter only after toolchain, values, identity, recursive structures, basic strings/numbers, and control-flow probes pass with a documented representation. Advanced interop can remain deferred.

**Gate A result (2026-11-01): passed.** All probes except interop, which is deferred, pass in both lanes with no dynamic-tier code. Discriminated-union values, class objects with direct references, recursive AST unions, environment chains with closures, and completion records all compile, which settles the first two representation questions in favour of the simpler option. Host strings preserve lone surrogates, and host number formatting and parsing matched Node on every case tried. Reference cycles are collected. The compiler contract records the resulting coding guidance; review withdrew the initial blanket prohibition on inspecting catch bindings because the interpreter probe demonstrates static compilation of that pattern. The constraint with design consequences is that native stack overflow kills the process silently.

If a probe fails, choose explicitly among a bounded representation change, a pinned upstream fix, or pausing the native route. A Node-only prototype can still be useful, but must not be reported as native feasibility. No broad rewrite should depend on an open-ended scriptc fork.

## 5. Proposed architecture

### 5.1 Separate guest semantics from host behavior

“Host” means the TypeScript implementation environment: Node or scriptc. “Guest” means JavaScript executed by Rift.

Host objects are not automatically guest objects; host promises are not guest promises; host strings are not automatically sufficient for every guest string operation. Centralize the boundary rather than relying on whichever host behavior happens to work.

Suggested dependency direction:

```text
CLI / embedding adapter
          |
         Realm ---- built-in registration
          |
frontend -> evaluator / explicit frames
          |
references, environments, object internal operations, coercion
          |
values, guest strings, property keys, heap/storage abstractions
```

Use concrete modules and small tested interfaces. Avoid a framework of plugins or services before a single program executes.

### 5.2 Values and identity

Prefer a tagged representation of Undefined, Null, Boolean, Number, String, Symbol and Object. Callability is an object capability; functions should participate in object identity and property semantics.

Start by probing discriminated unions. If the pinned compiler cannot handle the needed forms, use a fixed-layout tagged class/record with explicit constructors and invariant checks. Do not immediately flatten everything into parallel arrays merely because that might compile.

Represent guest symbols with realm/runtime-controlled IDs, not host Symbol. Preserve well-known symbols and the symbol registry explicitly. Keep symbol keys distinct from all string keys, including strings resembling internal prefixes.

For object identity, evaluate two options in the probes:

- Direct references to a stable class shape: simpler, subject to verified aliasing and collection behavior.
- Numeric `ObjectId` handles into a heap: explicit identity and tracing, but requires bounds checks, reclamation, and stale-handle prevention if slots are reused.

Document the chosen representation before any object or built-in agent starts. Value operations must distinguish strict equality, SameValue, and SameValueZero, particularly NaN and negative zero.

### 5.3 Strings and numbers

Give guest strings a narrow API: length in UTF-16 code units, code-unit access, comparison, concatenation and slicing. A numeric code-unit buffer is the fallback if native host strings lose information. It is a portability strategy, not an optimization; measure its cost later.

Specify UTF-8 decoding at file input separately from JavaScript string semantics. An escaped lone surrogate in guest source must remain representable. Source positions also need an agreed offset convention.

Centralize ToNumber, ToString, ToPrimitive, ToBoolean, integer conversions, remainder, equality and ordering. Never implement guest loose equality by simply writing TypeScript `==`. Use host numeric operations only after boundary tests establish that their semantics match the intended operation. Number formatting and parsing need dedicated evidence, not assumptions from ordinary arithmetic tests.

### 5.4 Objects and references

Define PropertyKey as a guest string or symbol identity, with explicit equality. Define descriptors with presence flags: “field absent” differs from “field present with undefined.”

Implement ordinary-object operations through a single path: Get, Set with receiver, HasProperty, DefineOwnProperty, GetOwnProperty, Delete, OwnPropertyKeys, prototype access and extensibility. Getters and setters must call guest functions through the evaluator. Preserve integer-index ordering, insertion ordering, and symbol ordering.

Guest arrays require holes, length semantics and descriptors. A dense host array alone cannot represent them. Initially build arrays on the object-property layer; introduce storage optimizations only behind that interface.

Expression evaluation also needs a **Reference** abstraction: binding references, property references with receiver, and unresolvable references. This prevents assignments, `delete`, `typeof`, method calls and `this` binding from each inventing their own lookup rules.

Keep Proxy out of the initial scope, but route operations through the internal-method boundary so adding it later does not require changing every built-in.

### 5.5 Realms, environments and bootstrap

Each Realm owns globals, intrinsics, symbol state as appropriate, execution contexts, and its guest job queue. Avoid process-global mutable prototype pointers or an active-context singleton. Two Realm instances must coexist without sharing mutable guest objects accidentally.

Represent lexical bindings with explicit initialization and mutability state. TDZ is not the same as undefined. Model var/function declaration instantiation, lexical scope, captured environments, and strictness deliberately.

Bootstrap Object.prototype and Function.prototype in ordered steps before installing dependent constructors. Specify built-in name/length attributes and property descriptors in registration helpers. Start with a built-in ID dispatch mechanism if native function-valued tables prove awkward.

### 5.6 Frontend

Port grammar knowledge, not the current string-encoded AST metadata. Define typed node kinds and named fields for flags, operators, labels, declarations and source ranges. Use a tested fixed-layout representation if a recursive union is unsuitable for scriptc.

Write a fresh lexer/parser using the existing implementation and tests as references. Tokenizer and parser ownership must be separate from object semantics. Preserve regex-versus-division and line-terminator information from the beginning, even before implementing every syntax form.

Do not silently skip failed statements and continue executing a damaged program. Parse failure should carry location and phase. Recognized but unsupported syntax must produce a clear diagnostic or explicit unsupported classification, never a fabricated valid program.

### 5.7 Completions and suspension

Represent guest control flow explicitly: Normal, Return, Throw, Break and Continue, with payload and optional target. Preserve the difference between an empty completion and a completion whose value is undefined. Host exceptions indicate implementation failures, not ordinary guest throws.

For the minimal interpreter, a recursive tree walker with explicit completions is acceptable. Before generators and async functions, introduce explicit continuation frames representing node, phase/program counter, environment, saved operands, and pending completion. Do not restart bodies and hope to skip previously executed side effects.

The suspension design must handle `yield` or `await` inside expressions, loops, nested calls, `try/finally`, and delegated iteration. Preserve pending return/throw across finally execution and suspension. Keep frames separate from the reusable AST.

Host generators also compile natively, including recursive `yield*`, values sent into `next`, and `return()` running `finally` (`typescript/probes/suspension.ts`). A generator-based evaluator is therefore a real alternative to compare against explicit frames, not an assumption to rule out.

A small frame-based execution loop is proposed, not a full bytecode compiler. Prototype the difficult unwind/resume cases before choosing the final format. If recursive execution and frames coexist temporarily, define the boundary and retire duplicate paths rather than maintaining two engines indefinitely.

### 5.8 Promises and host adapters

Implement guest promise state, reactions, thenable adoption, and FIFO jobs inside Rift. Host async/await must not determine guest scheduling. Explicitly define when jobs drain after script execution and how the test harness detects asynchronous completion.

Host adapters provide source-file input, output, clock/timezone services where required, and process status. Keep imports such as filesystem access outside the core. Early tests use deterministic clock/output adapters; wall-clock benchmarks use the real adapters.

Do not expose timers, networking or Node APIs merely because the host compiler supports them.

### 5.9 Memory and resource limits

Initially prefer verified host-managed storage if its semantics and repeated-run behavior are adequate. The memory probe supports this: scriptc's reference counting collects cycles, and two million short-lived environment/closure cycles left native memory flat. Do not mechanically port C++ root guards to TypeScript. Conversely, host memory management is not proof that guest WeakRef, WeakMap or finalization behavior is correct.

If numeric handles retain every object in a table, the host collector cannot reclaim guest garbage. Either bound that phase to short-lived process-per-test runs with a declared limitation, or implement tracing/reclamation before claiming long-running embedding support.

An explicit guest collector must trace globals, environments, live values, suspended frames, jobs, native-call temporaries and embedding handles. Test cycles and closure retention. Weak collections need separate reachability semantics and should be deferred until the strong-reference model is stable.

Define interpreter step and recursion limits, cancellation behavior, and allocation limits where enforceable. The recursion limit is required, not optional: in the native build a host stack overflow terminates the process with no output and no catchable error, so deep guest recursion must hit a guest `RangeError` from our own counter first. Distinguish guest exceptions, resource termination, host faults and unsupported features in the result protocol. This plan does not establish a secure sandbox.

## 6. Dependencies and expensive features

| Area | Initial plan | Later decision |
|---|---|---|
| Regular expressions | Explicitly unsupported in the first slice | Compare a portable implementation or native backend behind one guest API; test ECMAScript behavior rather than inherit RE2 deviations silently |
| Temporal | Defer | Audit current temporal_rs C API and exact scriptc interop support; reuse only if ownership and error handling are viable |
| Date | Defer until clock/timezone adapter exists | Specify UTC/local behavior and test reproducibly |
| JSON | Implement after core objects/arrays/coercion | Do not equate host JSON behavior with guest descriptors, toJSON, ordering and replacer semantics |
| Map/Set | Implement after identity and equality | Preserve insertion order and SameValueZero for arbitrary guest keys |
| Weak collections/finalization | Defer | Depend on an explicit, tested reachability policy |
| Modules | Explicit unsupported status | Real parsing/linking/evaluation is required; strict scripts are not a substitute |
| BigInt, typed arrays, Intl | Separate future work | Do not expand scope merely because they are familiar built-ins |

Avoid requiring a Rust+C+++TypeScript toolchain for the first native demo. Feature recovery can follow once the central experiment works.

## 7. Repository and command plan

Suggested layout. `package.json`, `tsconfig.json`, `probes/`, `tools/run-probes.mjs` and `docs/compiler-contract.md` exist; the rest is to be created:

```text
typescript/
  package.json                 # isolated scripts and pinned dependencies
  tsconfig.json
  probes/                      # compiler contract and regression cases
  src/
    frontend/                  # tokens, AST, parser
    runtime/                   # values, strings, objects, realm, environments
    execution/                 # references, completions, frames, evaluator, jobs
    builtins/
    host/                      # platform adapters
    cli.ts
  test/                        # host-level unit tests and guest fixtures
  tools/                       # build/test/report orchestration, Node-only
  docs/
    compiler-contract.md
    architecture-decisions.md
    feature-matrix.json
```

Keep generated native output in ignored build directories. Do not reorganize C++ paths during the experiment. This plan lives at repo root because `notes/` is currently ignored by Git.

Desired scripts: `typecheck`, `test:probes`, `build:node`, `build:native`, `test:unit`, `test:guest:node`, `test:guest:native`, `test:differential`, `test:test262`, `bench`. `typecheck` and `test:probes` exist; the rest are a proposed interface.

The native lane must compile the CLI and feed it guest source at runtime; compiling each guest fixture with scriptc would test a different project. Use platform-aware subprocess arguments and per-test temporary files, not shell concatenation.

## 8. Validation and observability

Maintain four distinct execution lanes:

1. Existing C++ Rift, built from a recorded revision.
2. New TypeScript Rift under Node.
3. The same TypeScript Rift compiled with scriptc.
4. Reference JavaScript execution under a pinned independent engine, initially Node, for suitable fixtures.

Two comparisons answer different questions: lanes 2/3 check native-host equivalence; lanes 2/4 check guest semantics. Agreement with C++ alone does neither. New native and Node implementations can share the same bug, so expected results and spec-derived tests remain necessary.

Use a structured result protocol separating console events, completion/error type, error phase, source position, exit status and termination category. Preserve NaN, negative zero, infinities and undefined in observation helpers instead of losing them to JSON serialization. Do not compare unstable stack strings or memory addresses.

Test262 requirements:

- Pin the suite revision and retain test ID, mode, feature tags and harness includes.
- Report passed, failed, skipped, unsupported, timed out, crashed and harness-error counts separately.
- Track both selected-suite and total-suite denominators; never present a filtered pass rate as overall compliance.
- Respect strict/non-strict, raw, async and module flags, and negative-test phase/type.
- Treat unsupported module execution as unsupported, not a strict-script success.
- Use original harness behavior where possible; every compatibility shim must be documented and tested.
- Distinguish parse rejection from runtime failure, and wait for valid async harness completion.
- Maintain reviewed known failures with reasons. Do not weaken assertions or expand skips to achieve a green summary.

Audit existing custom tests: identify actual assertions versus logging-only examples and simulated GC calls. Preserve useful fixtures without treating every zero-exit script as proof of behavior.

Start with small adversarial cases: receiver-sensitive getters, closure mutation, TDZ, sparse arrays, negative zero, thrown non-Error values, descriptor invariants and finally overriding return. Add generative/differential testing of a bounded syntax subset once the runner is trustworthy.

Performance comes after correctness: record startup, binary size, peak memory and throughput on identical supported workloads. Separate parse time from evaluation time where possible; report toolchain, hardware, build mode and correctness results. No speed claims inferred from “native.” A first measurement already shows why: a small tree-walking interpreter starts faster natively (~31 ms vs ~57 ms) but runs about 3× slower than the same TypeScript under Node's JIT.

## 9. Implementation order and gates

| Phase | Deliverable | Exit evidence |
|---|---|---|
| 0. Baseline | Inventory, reproducible C++ build/run, audited fixtures, pinned suite | Honest baseline report; failures retained |
| 1. Feasibility | Pinned scriptc and probes from section 4 | Gate A passes; compiler contract and representation decisions recorded |
| 2. Minimal vertical slice | Literal/arithmetic parsing, variables, blocks, conditionals, loops, simple calls, console output | Same guest files execute under Node-hosted and native Rift with expected results |
| 3. Semantic foundations | References, ordinary objects, descriptors, prototypes, lexical environments, closures, construction, completions | Focused semantic tests and selected test262 cases pass in both lanes |
| 4. Everyday language | Arrays, strings, core Object/Function/Math/Number/Error, iteration, spread/destructuring, classes in dependency order | Explicit feature matrix plus regression results; unsupported areas remain visible |
| 5. Suspension | Frame prototype, generators, promise jobs, async functions, then async generators | Exact-once side effects, unwind/cleanup and job-order tests; native equivalence |
| 6. Recovery of breadth | Remaining selected C++ features, regex/Date/Temporal after individual feasibility work | Feature-by-feature evidence, not a vague parity claim |
| 7. Demonstration | Repeatable builds, small runnable examples, architecture explanation, honest results | A new checkout can reproduce the advertised native demo |

Each phase keeps native compilation working. Do not implement months of Node-only features and schedule native compatibility for the end.

**Gate B: first satisfying demo.** A native CLI accepts a file containing closures, objects and loops, computes an observable result, and agrees with the Node-hosted engine. Publishable curiosity does not require generators or Temporal first.

**Gate C: suspension architecture.** Do not distribute async/generator feature work until a shared frame model survives nested finally and side-effect tests.

**Gate D: any C++ replacement.** Separately decide which features constitute parity, review performance/memory limitations and regressions, and obtain a deliberate project decision. Completion of an experiment does not automatically authorize removing C++.

## 10. Agent-ready work breakdown

No agents have been dispatched by this document. The following are proposed assignments after implementation is authorized. File ownership and interfaces must be established before parallel work.

| Task | Scope / owned area | Depends on | Acceptance |
|---|---|---|---|
| R0 Baseline auditor | Feature inventory and test audit report | None | Distinguishes claims, inspected code and measured results |
| R1 Toolchain investigator | `probes/`, compiler contract | None | Repeatable native execution and minimal repros for blockers |
| R2 Integration owner | Shared types, module layout, decision log | R0, R1 | Agreed Value, PropertyKey, Completion, Reference and host interfaces |
| R3 Test infrastructure | `tools/`, result protocol, test adapters | R2 | Node/native lanes, phase-aware negatives, visible skips/crashes |
| R4 Frontend | `src/frontend/` | R2 | AST/token contract and parser fixtures; no runtime edits |
| R5 Values and storage | Value/string/coercion/identity modules | R2 | Adversarial numeric/string/identity tests in both lanes |
| R6 Object semantics | Objects, descriptors, internal methods | R5 | Descriptor/receiver/prototype/ordering tests |
| R7 Environments and execution | References, bindings, evaluator | R4, R5; R6 for object operations | Vertical slice and closure/control-flow tests |
| R8 Built-in batches | Assigned built-in modules only | R6, R7, bootstrap contract | Spec references, feature manifest updates, both execution lanes |
| R9 Suspension prototype | Frames and resume/unwind core | R7 | Gate C evidence before feature expansion |
| R10 Async/iteration features | Separately assigned generators/jobs/promises | R8 as needed, R9 | Interleaving and cleanup tests plus integration review |
| R11 Dependency research | Regex/Temporal adapter feasibility | R1, stable host interface | Bounded proof, ownership rules, fallback/defer recommendation |
| R12 Release/demo | Documentation and reproducibility | Gate B; selected later phases | Verified examples and accurately scoped claims |

R0 and R1 can run independently. R3/R4/R5 can overlap after shared contracts are stable. Built-in batches can overlap after registration and object-call interfaces work. Execution and object work require coordinated integration, not competing edits to shared types.

An integration owner owns shared contracts, bootstrap and feature-manifest merges. Each task uses an isolated branch/worktree when practical. Contract changes go through the integration owner; agents must not independently redefine Value or duplicate coercion helpers.

### Assignment template

```text
Task ID and objective:
Prerequisites / exact base revision:
Owned files and interfaces allowed to change:
Behavior required, with spec links:
Explicitly excluded features:
Fixtures and acceptance commands:
Required Node and native evidence:
Known compiler constraints:
Expected report: changed behavior, tests, limitations, open blockers.
```

Rules for implementation agents:

- Read this plan and the pinned compiler contract before coding.
- Keep unsupported behavior explicit; never substitute host guest-code execution.
- Add tests for semantic outcomes, especially side effects and error phases.
- Preserve existing tests and document corrected expectations with evidence.
- Do not enable dynamic compilation, change compiler versions, introduce FFI dependencies, or redesign shared representations inside an unrelated feature task.
- Reduce compiler failures to a probe and report them; do not bury workarounds across the engine.
- Run affected tests under both hosts. If native execution is unavailable, report the task as incompletely validated.
- Update the feature matrix and relevant spec comments; distinguish partial support from complete support.
- Stop at the assigned boundary rather than starting a broad refactor or unrelated optimization.

## 11. Main risks and decision points

| Risk | Early signal | Response |
|---|---|---|
| Compiler accommodation dominates the project | Repeated workarounds for basic identity or recursive data | Narrow the experiment or pause; avoid an accidental compiler-maintenance project |
| Node success hides native divergence | Native lane disabled or lagging | Restore a small mandatory native smoke suite before expanding scope |
| Rewrite reproduces old bugs | C++ treated as sole oracle | Spec-derived expectations and reference-engine comparison |
| Agents implement incompatible abstractions | Duplicate value types, coercion or object access | Freeze interfaces, isolate ownership, integrate frequently |
| Advanced features stall the demo | Temporal or regex blocks arithmetic/closures | Keep optional dependencies outside the early milestones |
| Memory model leaks by construction | Heap table grows across discarded scripts | Explicit limitation plus reclamation work before embedding claims |
| Port becomes endless parity pursuit | No concrete demo despite feature growth | Evaluate Gate B as a legitimate stopping/release point |

Unresolved decisions, in dependency order:

1. Exact compiler version and native development platform. Decided: scriptc 0.4.7 on Windows x64; see the compiler contract.
2. Value/AST representation, object identity, and guest string storage. The probes favor discriminated unions, direct class references and host strings; confirm when the real modules are written.
3. Initial memory policy and lifetime of a Realm.
4. Minimal feature set for the first demo.
5. Continuation format, after the small interpreter exists.
6. Which expensive C++ features are worth recovering.
7. Whether to keep both engines, replace C++, or retain this as a separate experiment.

## 12. First implementation session, when authorized

Steps 2–5 were done on 2026-11-01 (probes and compiler contract); the next session starts at step 6.

1. Record C++ revision and working-tree state; inventory tests without changing engine behavior.
2. Establish the pinned scriptc toolchain and run a native hello-world on the actual development target.
3. Implement the value/identity/string/recursive-structure probes; compare Node and native results.
4. Write the compiler contract and record failed probes with minimal reproductions.
5. Review Gate A and select representations from evidence.
6. Create the isolated TypeScript package, result protocol and minimal CLI.
7. Deliver the smallest full guest-source-to-result slice in both lanes.
8. Only then dispatch the broader bounded implementation tasks.

The next useful result is evidence that the engine's basic data model survives native compilation. A large automatic translation is not a prerequisite for finding that out.
