# TypeScript implementation backlog

Statuses: **ready**, **blocked**, **in progress**, **done**. Claim a ready task before coding. Record owner/chat, base revision, evidence and handoff notes. A task becomes done only after integration and successful acceptance. Split broad tasks into bounded batches as interfaces become concrete.

## TS-001 — First integrated interpreter

Status: **done** (Unicode line-terminator review fix validated). Owner: Codex implementation chat `01a19794-baaa-7113-bba5-479887f71000`; base `2ed8a3e` (clean checkout). Implementation milestone: `a016967`; validated on 2026-11-01. Coordinator companion-queue changes at `325577d` preserved.

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

Acceptance evidence: typecheck passes; runner regressions 20/20; compiler probes 10/10; guest Node 90/90 and native 90/90, no skips. Native CLI 642/642 static statements, realm driver 655/655. The coordinator-found Unicode comment-boundary bug is resolved: all ECMAScript line terminators now stop line comments and update source positions; return/throw boundaries include block-comment line breaks. Parser/evaluator multi-statement control flow was expanded for readability. Windows x64 native linking required approved access to installed Zig libraries; no gate was weakened. Full retained transcripts: `docs/validation/ts-001/`. Guest source is read at runtime in both lanes. This is a bounded strict-call profile with own data properties, not a conformance claim: coercion, prototypes, Error objects, full Script/global/strictness semantics, ASI and broader syntax remain explicitly deferred.

## TS-002 — Frontend extension batch

Status: **done** — coordinator accepted `493fbd4` on 2026-11-01 after reviewing the parser/evaluator changes, expected-result cases and retained evidence, and independently rebuilding both guest lanes (112/112 each, no skips). Owner: Codex implementation chat `01a197b1-67cb-7e00-87ed-dc86a82b933b`; base `d7e3019` (clean checkout).

Coordinator-approved scope extension: conditional-specific generated cases in `tools/run-guests.mjs` and new retained evidence in `docs/validation/ts-002/`. Preserve all prior cases, acceptance logic and TS-001 evidence.

Handoff (2026-11-01): added the conditional AST/evaluator case and precedence-climbing parser support, with assignment expressions in both arms and right association. Selected-arm evaluation returns values and propagates abrupt completions. Explicit expected-result tests cover precedence, nested arguments, all existing truthiness categories, chosen-arm effects, detached methods, missing arms/colon, errors/throws, unsupported adjacent syntax, and parser/evaluation bounds. Typecheck passes, runner 20/20, probes 10/10, Node/native guests 112/112 each with no skips. Native CLI 657/657 static statements, realm driver 670/670; linking used approved Zig library access. Evidence and design sources: `docs/validation/ts-002/README.md`. No new compiler workaround, coercion expansion or follow-on feature work. Existing unsupported grammar and resource limits remain; coordinator acceptance is pending.

Assignment: conditional (`test ? consequent : alternate`) expressions only. Own `src/syntax.ts`, `src/parser.ts`, the new conditional case in `src/evaluator.ts`, `test/fixtures/conditional.js`, conditional entries in `test/cases.json`, and the corresponding inventory row. Add the `?` token in `src/lexer.ts` as a coordinated one-line change. The evaluator already supplies `truthy` and explicit completion propagation; it does **not** yet have a conditional node, so adding that single union alternative and evaluator case is part of this task. No other interface redesign.

Acceptance: fixed outputs for right association, precedence with assignment/||/arithmetic, nested conditionals in arguments, only the selected arm executing, and abrupt test/arm propagation. Fixed parse failures for missing `:`/arms; bounded deep nesting. Run `npm run typecheck`, both `test:guest:*` commands, `test:runner` and `test:probes`. Exclude optional chaining, nullish coalescing, comma, ASI and declaration changes. Coordinate edits to shared test manifests with the integration owner.

## TS-003 — Number built-ins batch

Status: **done** — coordinator accepted `e120f0c` on 2026-11-01 after reviewing constant/predicate implementation, descriptors, metadata, realm isolation and evidence, and independently rebuilding both guest lanes (128/128 each, static native gate passes). Owner: Codex implementation chat `01a197c2-c572-74c0-8236-1b92a8297bf3`; base `6c79781` (clean checkout; coordinator dispatch recorded).

Handoff (2026-11-01): exact eight constants and two non-coercing predicates registered per realm, with descriptor flags and predicate name/length metadata. No shared runtime changes. Typecheck passes; runner 20/20; probes 10/10; guest Node/native 128/128 each, no skips. Native CLI 679/679 and host driver 744/744 static statements. Zig linking required approved library access; initial sandbox failures and successful runs are retained in `docs/validation/ts-003/`. Number remains intentionally non-callable, with construction/conversion/wrappers/formatting/extra predicates/reflection deferred. No TS-004A work; coordinator acceptance pending.

Assignment: a deliberately partial, non-callable `Number` namespace with `NaN`, `POSITIVE_INFINITY`, `NEGATIVE_INFINITY`, `MAX_VALUE`, `MIN_VALUE`, `EPSILON`, `MAX_SAFE_INTEGER`, `MIN_SAFE_INTEGER`, `isNaN`, and `isFinite`. Own new `src/builtins/number.ts`, `test/fixtures/number.js`, number entries in `test/cases.json`, number host assertions in `test/realms.ts`, and inventory notes. Integration owner coordinates the single registration call in `src/realm.ts`. Use `registerBuiltin`, Value kind tests and Completion; predicates never coerce. No parser/evaluator changes.

Constants: non-writable/non-enumerable/non-configurable. Predicate properties: writable/non-enumerable/configurable. Global namespace binding mutable; explicitly document that call/new/wrappers are unsupported. Host assertions verify descriptor flags and per-realm identity; guest tests cover missing/excess arguments, NaN/infinities/signed zero, primitive/object/function inputs, ignored receiver, extra argument effects, and rejected constant writes. Run typecheck, both guest lanes, runner regressions and probes. Exclude Number conversion/constructor, formatting, integer predicates, coercion and reflection APIs.

## TS-004 — Ordinary object semantics

Status: **in progress** as a sequenced umbrella; TS-004A is accepted and TS-004B is accepted; TS-004C is implemented and awaiting coordinator review. Integration owner must sequence these changes. No accessors or prototype work is authorized merely by claiming TS-004A.

### TS-004A — Validate data descriptor updates

Status: **done** — coordinator accepted `0728bc8` after source review and independent Node/native rebuilds (129/129 each; static gate passed). Owner: Codex chat `01a197d0-4326-7392-b10a-3d5936222503`; base `a534b05` (clean checkout). Prerequisite: TS-001.

Handoff (2026-11-01): internal data/generic descriptor validation returns normal boolean success/failure; strict assignment retains guest TypeErrors. Explicit absent fields, defaults, SameValue, extensibility, atomic updates and detached descriptor inspection are tested. Bootstrap define now validates and reports invalid initialization as a host fault. Typecheck passes; runner 20/20; probes 10/10; Node/native lanes 129/129 each with no skips. Static coverage: CLI 715/715, realm driver 780/780, descriptor driver 180/180. Zig required escalated library access; blocked and successful transcripts retained under `docs/validation/ts-004a/`. Existing tsconfig test glob required no edit. No accessors, prototypes, guest reflection, deletion, enumeration or arrays. The original Get/Set and host-test proposals were subsequently approved for TS-004B (contract below); TS-004C remains blocked.

Own `src/runtime.ts` data-descriptor operations, new `test/object-descriptors.ts`, and integration-owned registration of that host test entry in `tools/build-native.mjs` / `tools/run-guests.mjs` / `tsconfig.json` if needed. Add an internal completion-returning DefineOwnProperty for **data descriptors only**, distinguishing omitted attributes from false/undefined, preserving existing flags, respecting non-configurable/non-writable transitions and SameValue (NaN and signed zero). Add an extensible flag and preventExtensions internal operation. Bootstrap creation remains explicit. Exclude accessors, proxies, prototypes, guest Object builtins and enumeration.

Acceptance: expected host assertions in both compiled lanes for creating/defaulting/redefining/rejecting properties, preventing extension without blocking writable updates, NaN/signed-zero transitions, and preserving object state after rejection. Existing guest tests, typecheck, runner regressions and probes remain green. Do not silently turn `define` into an unchecked public operation.

### TS-004B — Prototype reads/writes and receivers

Status: **done** — coordinator accepted `07902da` after source review and independent rebuilt Node/native lanes (130/130 each; all static gates pass). Implemented by Codex chat `01a197e0-1cfb-7e32-965b-278b987b6bf7`, base `984064e` (includes accepted TS-004A and approved contract). Own necessary runtime consumers, prototype tests, registration and scoped docs. Ordinary prototype traversal, cycle rejection, inherited data reads and explicit-receiver writes only; no accessors. The approved contract below freezes the APIs and host test entry.

Handoff (2026-11-01): implemented the frozen data-only prototype and receiver contract, with iterative Get/Set/cycle traversal, explicit normal/throw result types and strict assignment boundary. Existing evaluator references require no source change; seeded guest tests exercise inherited method this and mutation. Host driver covers distinct receivers, primitive/read-only/nonextensible rejection, prototype invariants, 20,000-link chains and realm isolation. Typecheck passes; runner 20/20; probes 10/10; Node/native rebuilt lanes 130/130 each with no skips. Static statements: CLI 753/753, realms 818/818, descriptors 218/218, prototypes 825/825. Zig linking needed authorized library access; both failed sandbox and successful transcripts retained under `docs/validation/ts-004b/`. No subsequent work dispatched; TS-004C stays blocked.

### TS-004C — Own property ordering and deletion

Status: **done** — coordinator accepted `ba97a03` after source review and independent rebuilt Node/native lanes (131/131 each; all five static gates pass). Codex chat `01a197eb-ca8c-74b1-9c26-8945d1d7296a`, base `c95f60f` (approved contract at `51fb1f6`, coordinator tracking commit preserved). Owned files: new `src/property-keys.ts`, `src/runtime.ts`, `test/object-keys.ts`, necessary driver registration and scoped docs/evidence. Scope string keys only: canonical array-index ordering before insertion-ordered strings, deleting configurable properties, delete/reinsert ordering, and non-configurable rejection. Symbols and guest reflection builtins are separate prerequisites before claiming complete OwnPropertyKeys.

Handoff (2026-11-01): implemented the frozen internalDelete, detached string-only ownPropertyKeys and canonical arrayIndex APIs. Compiled host assertions cover edge/noncanonical indices, numeric/insertion ordering, nonenumerability, overwrite/reinsert, rejected/absent/inherited deletion, nonextensibility, snapshots and realm isolation. Typecheck passes; runner 20/20; probes 10/10; rebuilt Node/native lanes 131/131 each, no skips. Static coverage: CLI 785/785, realms 850/850, descriptors 250/250, prototypes 857/857, keys 294/294. Zig required authorized library access; initial failure and successful transcripts retained in `docs/validation/ts-004c/`. Architecture/inventory interfaces updated. No guest syntax, symbols, exotics, arrays, accessors, coercion or toolchain changes. Awaiting coordinator acceptance; successor work remains unstarted.
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

### TS-004B approved interface contract (2026-11-01)

Add `internalGet(key, receiver, loc)` returning normal/throw Value completion and `internalSet(key, value, receiver, loc)` returning normal/throw host-boolean completion. Receiver is a Value, separate from the lookup-base GuestObject. Preserve explicit abrupt propagation; no return/break/continue variants in these internal result types. Ordinary data-only implementations currently return normal results. Strict assignment translates false into guest TypeError and returns the RHS on success. Migrate semantic property reads/writes to these operations; any retained convenience wrapper must delegate rather than duplicate semantics.

Keep a private prototype slot, initially null. `getPrototypeOf()` returns GuestObject or null; `setPrototypeOf(prototype)` returns normal boolean, rejects cycles and changes on nonextensible objects, but accepts setting the existing prototype even when nonextensible. Use iterative traversal to avoid host stack overflow on deep host-created chains. Preserve ordinary receiver-own descriptor/extensibility checks and avoid mutating the lookup base when the receiver differs. No automatic intrinsic prototype hierarchy or guest reflection API is implied.

Register a compiled host driver in both lanes with a fixed success line and throwing assertions. It may seed guest realms with prototype-bearing objects for guest evaluator/receiver tests; do not add guest Object APIs just to expose the tests. Own necessary runtime consumers, test registration, scoped documentation and new validation evidence. Accessors, exotics, deletion/key ordering, arrays and coercion remain excluded. TS-004C remains blocked until its own API freeze.

### TS-004C approved interface contract (2026-11-01)

Add `internalDelete(key): InternalBooleanCompletion`: missing or configurable own properties return normal true, nonconfigurable own properties return normal false without mutation. Inherited properties are never deleted. No guest delete syntax or strict-delete wrapper in this batch.

Add `ownPropertyKeys(): PropertyKey[]`, returning a detached list of all own string keys (including nonenumerable), canonical array indices ascending first, then other strings in insertion order. No prototype traversal. Updates preserve insertion position; successful deletion/reinsertion creates a new position. Storage Map insertion order may supply the string ordering. Document that the list is string-only and ordinary objects cannot throw here; no complete symbol/exotic OwnPropertyKeys claim.

Export `arrayIndex(key: PropertyKey): number | undefined` from `src/property-keys.ts`. Recognize exactly canonical decimal integer strings 0 through 4294967294; 4294967295, -0, leading zeros, signs, whitespace, fractions and exponent forms are ordinary strings. Use clear bounded digit parsing, avoiding guest coercion, host sorting defaults or bitwise signed truncation. This classifier is the future array-storage dependency. Freeze numeric ordering with an explicit comparator or readable equivalent supported by pinned static compilation.

Compiled host tests must cover boundary/noncanonical keys, nonenumerable keys, overwrite order, delete/reinsert, atomic failed deletion, absent/inherited deletion, snapshot independence and realm isolation. Register the driver in both lanes; retain all previous checks. Own only runtime/property-keys, host tests and necessary registration, scoped docs and new ts-004c validation evidence. Preserve C++, pins, guest syntax and Claude outputs.

### TS-005P — Array prerequisites and dispatch design

Status: **ready**. Prerequisite: accepted TS-004A/B/C. This is a bounded design/feasibility task, not permission to implement arrays or change runtime interfaces yet.

Own `docs/array-prerequisites.md`, optional self-contained probes/scripts under `probes/array-prerequisites/`, new `docs/validation/ts-005p/`, and this task status/handoff. Do not change src, existing test/build/probe manifests, compiler pins, COORDINATION.md or Claude outputs.

Resolve how array DefineOwnProperty and length writes will participate in ordinary explicit-receiver Set without bypassing array invariants. Identify every current direct-slot shortcut and completion signature needing change. Compare a class override model with explicit object-kind dispatch for readability and static compiler support; recommend one minimal design. If current probes do not establish the required dispatch, build a tiny isolated expected-result probe under Node and pinned static-only scriptc, recording coverage and results.

Specify a staged coercion prerequisite: ToNumber/ToUint32 for existing primitive Value kinds, exact string numeric grammar and whitespace, signed zero/NaN/infinities, and the later object-to-primitive guest-call boundary. Do not silently substitute host permissive parsing or convert objects with host code. Address ArraySetLength conversion order (including repeated conversions and abrupt guest calls), invalid lengths versus ordinary false, failed truncation and final writable state. Any initially unsupported input needs an explicit boundary, not a misleading conformance claim.

Deliver exact proposed signatures and migration callers, source-linked spec/relevant-engine evidence, a deterministic expected-result matrix including sparse arrays and nonconfigurable truncation, and two or three bounded implementation tasks in dependency order. Separate decisions, measured feasibility and remaining uncertainties. The coordinator reviews and freezes the next implementation contract; TS-005A remains blocked until then. Do not implement speculative frameworks or launch successor work. Commit/push the coherent reviewed deliverable, then hand back for coordinator acceptance.
