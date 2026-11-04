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

Status: **done** for the bounded TS-004A/B/C batches, all coordinator accepted. Integration owner must sequence these changes. No accessors or prototype work is authorized merely by claiming TS-004A.

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

Status: **done** — coordinator accepted `0962b57` after source review and independent rebuilt Node/native lanes (134/134 each, eight static gates pass). Codex chat `01a19822-9932-7562-94df-3e3d5f329ba1`; clean base `587f7ea7fe41d5257318515110bdbd96f37a163a`. TS-004A/B/C, TS-005N and TS-005D accepted; frozen scope below. Delivered files: new `src/array-object.ts`, `test/array-storage.ts`, required driver registration and scoped docs/evidence. Implements internal array length/index writes, holes versus present undefined, length truncation and failed truncation against non-configurable elements. No guest array syntax or methods in this batch. Object coercion that invokes guest code remains a separate prerequisite; no host object conversion.

Handoff (2026-11-01): GuestArray uses validated base storage with own length, separate ordered primitive conversions, sparse descending deletion, failed-length restoration and delayed freeze. All non-object prerequisite matrix rows remain covered across conversion/array drivers; added descriptor immutability, receiver dispatch, realm independence and seeded guest assignment assertions with fixed state/output/error expectations. Typecheck passes; runner 20/20; probes 10/10; rebuilt Node/native lanes 134/134 each, no skips. All eight static gates pass (new array driver 1118/1118). Evidence, initial Zig sandbox failure and a reduced test-only Object.keys dynamic-tier issue/fix: `docs/validation/ts-005a/`. Runtime/conversion interfaces, pins, C++, Claude outputs and COORDINATION.md unchanged. No successor started; TS-005B remains blocked.

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

Status: **done** — coordinator accepted design/feasibility `dbcdb86`; independently reran dispatch probe (both lanes, 33/33 static). Owner: Codex chat `01a197f9-8a02-7ce3-84d7-fbdfabca3938`; base `56edcbe`. Prerequisite: accepted TS-004A/B/C. This is a bounded design/feasibility task, not permission to implement arrays or change runtime interfaces yet.

Own `docs/array-prerequisites.md`, optional self-contained probes/scripts under `probes/array-prerequisites/`, new `docs/validation/ts-005p/`, and this task status/handoff. Do not change src, existing test/build/probe manifests, compiler pins, COORDINATION.md or Claude outputs.

Resolve how array DefineOwnProperty and length writes will participate in ordinary explicit-receiver Set without bypassing array invariants. Identify every current direct-slot shortcut and completion signature needing change. Compare a class override model with explicit object-kind dispatch for readability and static compiler support; recommend one minimal design. If current probes do not establish the required dispatch, build a tiny isolated expected-result probe under Node and pinned static-only scriptc, recording coverage and results.

Specify a staged coercion prerequisite: ToNumber/ToUint32 for existing primitive Value kinds, exact string numeric grammar and whitespace, signed zero/NaN/infinities, and the later object-to-primitive guest-call boundary. Do not silently substitute host permissive parsing or convert objects with host code. Address ArraySetLength conversion order (including repeated conversions and abrupt guest calls), invalid lengths versus ordinary false, failed truncation and final writable state. Any initially unsupported input needs an explicit boundary, not a misleading conformance claim.

Deliver exact proposed signatures and migration callers, source-linked spec/relevant-engine evidence, a deterministic expected-result matrix including sparse arrays and nonconfigurable truncation, and two or three bounded implementation tasks in dependency order. Separate decisions, measured feasibility and remaining uncertainties. The coordinator reviews and freezes the next implementation contract; TS-005A remains blocked until then. Do not implement speculative frameworks or launch successor work. Commit/push the coherent reviewed deliverable, then hand back for coordinator acceptance.

Handoff (2026-11-01): `docs/array-prerequisites.md` recommends a class override, lists direct-slot assumptions and caller/completion migrations, specifies primitive numeric grammar/whitespace and the deferred guest-call boundary, and proposes three bounded tasks. Isolated `probes/array-prerequisites/dispatch.ts` passes seven expected assertions under Node/native with 33/33 static statements. Typecheck passes, runner 20/20, existing probes 10/10, rebuilt guest/host lanes 131/131 each with no skips; all five integrated native coverage gates pass. Full evidence, including initial Zig sandbox failure and successful authorized library access, is in `docs/validation/ts-005p/`. No src/manifests/pins/C++/coordinator or Claude output changes. Review must approve the exact-scanner plus host numeric backend proposal, explicit temporary object-conversion rejection, and class/completion/location APIs. Array semantics and future call context remain proposals, not measured support. TS-005A stays blocked; no successor work started.

### TS-005N — Primitive numeric conversion

Status: **done** — coordinator accepted `c595fdb` after source review and independent rebuilt Node/native lanes (132/132 each, all six static gates pass). Owner: Codex implementation chat `01a19807-4414-7561-a505-e9595f9df346`; base `561c12e`. Prerequisite: accepted TS-005P. Own `src/conversion.ts`, `test/conversion.ts`, necessary host driver registration, scoped docs and `docs/validation/ts-005n/`. The only runtime change authorized is narrowing failure's result annotation to ThrowCompletion if needed. No operators/parser/builtins, definition-interface migration, arrays or object conversion.

Freeze `NumberCompletion = { type: "normal"; value: number } | ThrowCompletion`, `toNumber(value: Value, loc: Location): NumberCompletion`, `toUint32(value: Value, loc: Location): NumberCompletion` and `stringToNumber(value: GuestString): number`. Implement the primitive contract, exact grammar and whitespace in docs/array-prerequisites.md. Objects must explicitly report unsupported conversion via guest runtime TypeError, with no host coercion or guest calls. This remains a documented partial abstract operation.

Coordinator approves a single isolated host Number(validatedToken) backend conditionally: scan/trim exact accepted grammar first; use it only for numeric binary64 conversion, never object conversion. Validate Node/native expected results including signed zero, all whitespace, overflow/underflow, rounding ties, long radix strings and large finite ToUint32. Include fixed mathematical expected results, not only agreement with host Number. If backend semantics differ, reduce to an isolated probe and return for review; do not change pins, narrow accepted grammar or add a large rounding implementation unilaterally.

Register compiled expected-result tests, retain all existing checks and run typecheck, runner, probes and both rebuilt guest lanes with static coverage. Keep unsupported scope explicit. Stop after handoff for review. Definition dispatch migration and TS-005A remain blocked pending separate task freeze.

Handoff (2026-11-01): implemented the frozen primitive conversion API, exact scanner and isolated Number backend; objects explicitly throw unsupported runtime TypeError without guest calls. Narrowed only failure's runtime result annotation. Registered compiled expected-result host tests covering all numeric matrix rows, full whitespace/exclusions, signed zero, overflow/underflow, decimal/radix ties and long strings, large finite modulo and object rejection. Typecheck passes; runner 20/20; probes 10/10; rebuilt Node/native lanes 132/132 each, no skips. Six native gates are fully static: CLI 785/785, realms 850/850, descriptors 250/250, prototypes 857/857, keys 294/294, conversion 340/340. Retained evidence and initial Zig sandbox failure: docs/validation/ts-005n/. No numeric backend blocker observed; no pins, operators, builtins, parser, arrays, definition signatures, C++, Claude outputs or COORDINATION.md changed. Awaiting coordinator acceptance; successor work remains unstarted.

### TS-005D — Completion-aware definition dispatch integration

Status: **done** — coordinator accepted `74e21da` after actual diff review and independent rebuilt Node/native lanes (133/133 each, seven static gates pass). Owner: Codex chat `01a19815-200c-7f92-a524-a1523bb79726`; base `e174a355780b265d198396b8222b186e3133c715` (clean checkout after numeric acceptance). Prerequisites: accepted TS-005P/N. Own `src/runtime.ts` definition signature/callers, existing affected host assertions, new `test/definition-dispatch.ts`, necessary driver registration and scoped docs/evidence under `docs/validation/ts-005d/`. No arrays, conversion changes, guest syntax, object coercion, pins or Claude outputs.

Freeze `GuestObject.defineOwnProperty(key: PropertyKey, desc: DataDescriptorUpdate, loc: Location): InternalBooleanCompletion`. Ordinary implementation remains normal-only in behavior; the signature supports subclass guest throws. Forward the actual source location from both internalSet receiver paths. Preserve exact throw completion identity, normal false rejection and strict assignment's false-to-TypeError conversion/RHS result. Bootstrap `define` keeps its existing convenience signature, supplies a documented synthetic location and treats either false or throw as a host initialization fault; it must inspect the discriminant before the boolean payload. No unchecked mutation API or optional location shortcut.

Migrate every direct caller atomically per docs/array-prerequisites.md, updating result assertions to check normal/throw. Include the currently unchecked prototype test definition in asserted results. Leave direct-slot lookup/prototype traversal unchanged: array GetOwnProperty/Get/Set will remain ordinary; no generic exotic framework.

Add a compiled test subclass using the actual GuestObject/runtime (not a toy reimplementation). Exercise success through super, normal false, exact throw identity/value/diagnostic/location through direct internalSet, strict set and putValue, distinct lookup base/receiver and receiver-own update/new property paths. Confirm readonly/primitive/nonextensible checks occur at their proper boundaries without unexpected override calls. Include seeded guest assignment to verify evaluator propagation and RHS-before-failure effects; bootstrap misuse must produce host errors. Test counts/call counts and fixed expected states; no arrays yet. Run all existing gates and rebuilt Node/native lanes with static coverage. Stop at handoff for coordinator review; TS-005A remains blocked pending acceptance.

Handoff (2026-11-01): implemented the frozen required-location definition signature, both receiver-path forwarding calls and bootstrap discriminant guard. Migrated every direct runtime/test caller and asserted the formerly unchecked prototype definition. Actual-runtime compiled subclass tests cover success/false/exact throw, new/own receiver writes, strict set/putValue RHS identity and rejection translation, rejection ordering/call counts, nonextensibility, seeded evaluator effects/location and bootstrap host errors. Typecheck passes; runner 20/20; probes 10/10; rebuilt Node/native lanes 133/133 each with no skips; all seven native static gates pass. Evidence: docs/validation/ts-005d/. No arrays, conversion, syntax, pins, C++, coordinator or Claude changes. Awaiting coordinator acceptance; TS-005A remains blocked and no successor work started.

### TS-005A frozen implementation contract (2026-11-01)

Implement `GuestArray extends GuestObject` in `src/array-object.ts`, empty constructor with base-defined own length +0 (writable, nonenumerable, nonconfigurable); assert constructor initialization as a host invariant. Override only `defineOwnProperty(key, desc, loc): InternalBooleanCompletion`; private `setLength(desc, loc)` follows the reviewed algorithm in docs/array-prerequisites.md. Reuse arrayIndex and the accepted primitive conversion functions. Keep descriptor Map private in the base, no parallel length slot or unchecked setters. Initial prototype remains null; no array intrinsics or global constructor.

Length conversion must call ToUint32 then ToNumber separately, read old length afterward, copy the descriptor, normalize -0 to +0, and distinguish RangeError from normal false. Objects hit the explicit unsupported conversion boundary. Indices extend length only after successful ordinary definition. Shrink only present own indices in descending order, never scan billions of holes. Failed truncation preserves higher deletions, restores length to blocked index+1 and applies delayed writable=false when requested. Base operations expected to succeed by invariants should assert rather than silently ignore failures. No callbacks can run in this data-only stage; future guest conversion remains deferred.

Own array module, `test/array-storage.ts`, optional seeded guest fixture, necessary host driver registration, scoped docs and `docs/validation/ts-005a/`. Existing runtime/conversion changes require a concrete discovered integration need sent to coordinator; do not broaden interfaces silently. Test every non-object semantic row in the reviewed array matrix plus explicit object rejection, caller descriptor immutability, own key/length ordering, deletion leaves length unchanged, realm independence, and guest assignment through host-seeded arrays. Inherited receiver dispatch, strict same-value readonly failure and original RHS identity must work through actual runtime. Cover max index/length, sparse large shrink, nonextensibility, partial failed truncation, writable transitions, flags rejection and error location. Assert expected state, not just cross-host agreement.

No guest array syntax, methods, Array constructor, species, symbols, accessors, object coercion or generic exotics. Run typecheck/runner/probes and both rebuilt guest lanes with static gates. Retain existing tests/evidence; mark awaiting review and stop at handoff. TS-005B remains blocked by its further prerequisites and approved entry/species scope.

### TS-005H — Property presence and array-like length prerequisites

Status: **done** — coordinator accepted `a1a6aa6` after source review and independent rebuilt Node/native lanes (135/135 each, nine static gates pass). Owner: Codex chat `01a19830-8a3a-7b90-ac70-ef0846f2b896`; base `4a408a0f929b178bcb16a85bd6724d6c041a8aba`. Prerequisites: accepted TS-005A/N/D. Own `src/runtime.ts` new ordinary presence operation, `src/conversion.ts` length conversion helpers, new `src/array-like.ts`, `test/array-like.ts`, necessary driver registration and scoped docs/evidence under `docs/validation/ts-005h/`. No map, ToObject boxing, guest APIs/syntax, object coercion, new context framework or compiler changes.

Freeze `GuestObject.internalHasProperty(key: PropertyKey, loc: Location): InternalBooleanCompletion`, iterative own/prototype presence checks, true even when value is guest undefined, no getters/reads/calls. Supports ordinary objects and current arrays; no proxies/accessors/exotics claim. Preserve private slots and avoid recursive chains.

Add `toIntegerOrInfinity(value: Value, loc: Location): NumberCompletion` and `toLength(value: Value, loc: Location): NumberCompletion` in conversion.ts. Follow versioned spec: ToNumber once, propagate throw; NaN/either zero -> +0; finite truncation toward zero; infinities retained by integer conversion. ToLength clamps to [0, 9007199254740991], never uint32 wraps. Existing object conversion remains explicitly unsupported.

Add `lengthOfArrayLike(object: GuestObject, loc: Location): NumberCompletion` in array-like.ts: completion-aware Get of length exactly once with receiver equal to the input object Value, propagate exact throw, then ToLength. Parameter is already an object; no silent primitive boxing or array-only restriction. No array algorithms or guest method installation.

Compiled expected-result tests: own/inherited present undefined versus holes/missing, deletion/shadowing, deep chains and realm independence; integer/length NaN/infinities/signed zeros/fractions/boundaries/large finite values/strings and unsupported objects; ordinary and array receivers, inherited/missing length, custom test Get override asserting exact key/receiver/location/call count, exact throw identity and no subsequent conversion, object-valued length explicit rejection. Test normal Get behavior as well as synthetic overrides. Consult spec and a relevant engine, record sources, run all existing gates plus rebuilt Node/native suite and static gates. Stop at review handoff. TS-005B still needs a separately approved callback/ToObject/species/entry-point plan; this task does not authorize map.

Handoff (2026-11-01): implemented the frozen iterative ordinary presence API, primitive integer/length conversions and object-only completion-aware length Get. Compiled host assertions cover undefined versus holes, deletion/shadowing, 20,000-link traversal, realm isolation, fixed numeric edge cases, actual ordinary/array Get and exact synthetic Get receiver/key/location/count/throw semantics. Typecheck passes; runner 20/20; probes 10/10; rebuilt Node/native suites 135/135 each with no skips; all nine static gates pass (array-like 487/487). Evidence: docs/validation/ts-005h/. Preserved unsupported object conversion and all exclusions, C++, pins, Claude outputs and COORDINATION.md. Awaiting review; TS-005B remains blocked and no successor started.

### TS-005M — Map integration design

Status: **done** — coordinator accepted design `0fa0aca` after inspecting actual evaluator/caller inventory, scope and budget contract; documentation-only, no new execution claims. Owner: Codex chat `01a1983e-12f1-7c00-b02f-8b445fc4a0a1`; base `2cd4a0842ff092e84e214c75309b8c14ac7f3bf1` (clean checkout, existing branch). Prerequisites: accepted TS-005A/H/N/D. Design only; TS-005B remains blocked until review freezes its contract. Own `docs/map-integration.md`, optional isolated probes/scripts under `probes/map-integration/`, new `docs/validation/ts-005m/` and own task handoff. No src, existing manifests/tests, pins, COORDINATION or Claude changes.

Resolve the smallest readable path for a real guest callback to map through current Evaluator.call, retaining realm, thisArg, abrupt completion and execution/call budgets. Inspect current evaluator/builtin registration and propose exact API/caller migration; do not introduce an ambient evaluator or execute guest functions with host eval. Decide how iteration itself consumes budget even for holes/non-calling callbacks, so huge length cannot hang inside a builtin. Reentrant callbacks must share the active budget, not reset it.

Propose an explicit first entry point and scope: compare internal object-only map driven by host-seeded guest tests against guest installation with ToObject/primitive boxing. Do not invent a standard-looking API that silently mishandles primitives, constructor/species or symbols. Explain staged full support versus explicit unsupported boundaries and how to recognize them without causing extra observable property reads. Consider result-array creation for generic array-like length above 2^32-1, constructor/species behavior, holes, inherited elements, mutations and callback validation order. Species and boxing require decisions, not silent omission.

Deliver spec/engine source evidence, precise signatures, state/ownership and budget flow, deterministic expected-result/abrupt/evaluation-order matrix and 1–3 bounded ready-to-freeze implementation batches. Verify only missing compiler capability with isolated Node/native expected-result probe and static coverage; reuse accepted dispatch evidence when sufficient. Clearly separate measured feasibility from proposals. No map implementation or successor work. Commit/push coherent deliverable, then await coordinator review.

Handoff (2026-11-01): `docs/map-integration.md` proposes two bounded batches: required per-invocation OperationContext through the existing evaluator/builtin boundary, then internal object-only default-array map with a test-only host adapter. Exact caller migration, realm/closure ownership, call cleanup and normal/throw boundary are specified. Per-index ticks include holes and share active counters through nested callbacks; huge sparse traversal is bounded without a length-based preflight that reorders validation. Array constructor Get occurs once after callback validation; non-undefined constructors explicitly reject unsupported species, ordinary inputs never read constructor, and generic length above 2^32-1 fails before allocation/iteration. Standard API/boxing/species installation stays deferred. Versioned spec and pinned engine262 sources, expected-result/order/abrupt/budget matrix and reused compiler evidence are recorded. Scoped diff check passes; documentation only, no new probe or execution claims. Evidence: `docs/validation/ts-005m/README.md`. No src/manifests/existing tests, pins, C++, COORDINATION or Claude outputs changed. Awaiting review; no map implementation or successor dispatched.

### TS-005C — Active operation context and call boundary

Status: **done** — coordinator accepted at `5d59909`. Owner: Codex chat `01a1984b-96e9-7b83-b5fb-96dcb4b661c9`; base `89ecebc463758864625e6244edf0818e4d2cf3e4` (clean checkout). Prerequisite: accepted TS-005M design. Own runtime context/Builtin/normal annotations, evaluator context/tick/call boundary, interpreter construction, affected builtin/test callers, new `test/operation-context.ts`, driver registration and scoped docs/evidence `docs/validation/ts-005c/`. No map implementation or property/conversion context migration.

Freeze OperationContext and Builtin signatures exactly as proposed in docs/map-integration.md: required readonly realm plus call/tick callbacks returning ValueCompletion; Builtin receives context before location and retains Completion return. Evaluator constructor takes Realm then existing optional step/call limits; one context per evaluator delegates through full-parameter arrows to that same evaluator. Narrow normal(), tick() and call() to ValueCompletion. No ambient/global context, context captured at registration, new evaluator for nested calls, or replenished budget. Guest closures retain lexical environments, not creation-time evaluator.

Call normalizes guest return/fallthrough, propagates exact throws, rejects builtin return and escaped break/continue as host invariant faults. Validate only normal/throw at the call boundary; use finally to release incremented calls on all exits, including host faults. Preserve existing guard order and monotonic step count. Ensure builtin-to-guest callbacks share current realm/context and original this/argument identities. Full cross-realm intrinsic calling is not claimed.

Migrate all actual callers, including inline `callable = { kind: "builtin", invoke: ... }` fixtures (not just registerBuiltin or .invoke searches). Keep every function arrow at full arity per compiler contract. Direct host predicate tests must use Evaluator.call with the correct realm rather than fabricated unlimited context. New host driver must exercise real parsed guest callbacks through builtins, retained closures across runs, exact thrown record/this/args, nested shared ticks/call limits, host faults and invalid completions, call-count recovery, realm independence and context identity changing between top-level runs. Use deterministic budgets and final states, not only output parity. Context-based loop ticking tests may use a test-only bounded loop; no map algorithm in this task.

Run typecheck, runner/probes and rebuilt Node/native suites with all static gates. Reduce any integration compiler failure rather than changing pins/gates. Update API docs honestly; stop at awaiting-review handoff. TS-005B remains blocked until this context is accepted and its own map contract is frozen.

Handoff (2026-11-01): implemented the frozen OperationContext/Builtin/Evaluator signatures, normal/throw call boundary and finally-based active-call cleanup. Migrated all registration/inline arrows and direct predicate calls. New compiled actual-runtime driver covers parsed callbacks, retained lexical state across runs, exact values/throws/locations, shared deterministic ticks/call depth, invalid completions, host faults and call-count recovery. Typecheck passes; runner 20/20; probes 10/10; rebuilt Node/native suites 136/136 each with no skips; all ten static gates pass (context driver 905/905, zero dynamic). Test inference failures were reduced and corrected with explicit types/narrowing; initial rejection and reductions retained in docs/validation/ts-005c/. API notes updated. No map/property/conversion expansion, ambient context or cross-realm conformance claim. C++, pins, Claude outputs and COORDINATION.md preserved. Coordinator acceptance recorded at `5d59909`; the TS-005B freeze below supersedes this historical blocked status.

### TS-005B frozen internal map contract (2026-11-01)

Status override: **done** — coordinator accepted `2ad1619` (implementation `f3f93c8`) after readability review and independent rebuilt Node/native suites (137/137 each, eleven static gates pass). Owner: Codex chat `01a19859-b6f6-79a2-bd0f-9a766b28b875`; base `522b9d719cb02914445cc366c91b1f9c54abc669`. Superseding the earlier blocked TS-005B entry for this bounded internal batch only. Prerequisites TS-005A/H/N/D/C accepted. Implement `mapObjectDefaultArray(object: GuestObject, callback: Value, thisArg: Value, context: OperationContext, loc: Location): ValueCompletion` in new `src/array-map.ts`. The reviewed algorithm and full deterministic matrix in docs/map-integration.md are the acceptance contract. No standard map installation, ToObject boxing or complete species claim.

Order: one lengthOfArrayLike; callable validation even for zero length; for GuestArray only, one constructor Get and reject non-undefined with explicit unsupported-constructor/species TypeError (ordinary inputs never read constructor); reject length >4294967295 with RangeError; allocate sparse fresh GuestArray length; iterate saved indices, one shared tick before each HasProperty including holes, then conditional Get/callback/own result definition with W/E/C true. Propagate exact abrupt records. No extra preflight ticks, callback context resets or iteration over only existing keys (callback mutations can fill future holes). Default result remains unobservable until return, so impossible definition rejection is a host invariant. Do not scan billions of holes without tick enforcement.

Own array-map module, compiled `test/array-map.ts`, runtime-read guest fixtures under `test/fixtures/array-map/`, necessary driver registration, scoped docs/evidence `docs/validation/ts-005b/`. Host driver alone seeds namespace host with four-argument builtin adapter `__testMapObjectDefaultArray(input, callback, thisArg)`; missing args use UNDEFINED, primitives explicitly reject object-only test entry. Real parsed guest callbacks must run through current context.call; no default Realm registration. Other core API changes require concrete coordinator review.

Cover every map matrix row, actual guest closure mutation/this/args/throws, result holes/descriptors/aliasing, inherited elements, future element mutation/deletion/growth/shrink, exact operation traces and error order, constructor restrictions, generic oversized length, bounded huge sparse traversal, constant builtin callbacks, reentrant shared ticks/call limits, host faults and per-run/realm isolation. Synthetic overrides are trace tests only, not exotic support claims. Retain all prior cases and run typecheck/runner/probes and rebuilt Node/native suites with static gates and timeout failure handling. No pins/C++/Claude/COORDINATION changes. Stop after awaiting-review handoff; no successor dispatch.

Handoff (2026-11-01): implemented only internal `mapObjectDefaultArray` plus test-only host adapter and runtime-read parsed guest callbacks. Full reviewed matrix includes sparse/undefined/inherited values, mutation/deletion/growth/shrink, closure/this/args/aliasing, ordered exact abrupt propagation, constructor boundaries, oversized length, huge sparse and nested shared budgets, recursion/call cleanup, host faults and realm/run independence. Typecheck passes; runner 20/20; probes 10/10; rebuilt Node/native suites 137/137 each, no skips; all eleven native static gates pass, map driver 1271/1271 static. Retained transcripts, subprocess JSON and row coverage: `docs/validation/ts-005b/`. No runtime API expansion, standard map registration, boxing/species, pins, C++, Claude or COORDINATION changes. Awaiting coordinator review; no successor work.

Review fix (2026-11-01): expanded map host tests and runtime-read callbacks into readable blocks with descriptive locals and semantic group comments. Preserved assertions, order and cases; deliberately updated guest throw location from 9:61 to 50:9 and recursive-call line from 10 to 56. All gates rerun: typecheck passes, runner 20/20, probes 10/10, rebuilt Node/native 137/137 each, eleven static gates passing and map driver 1271/1271 static. Evidence refreshed under `docs/validation/ts-005b/`. Awaiting coordinator review; no core behavior changes or successor work.

### TS-006 — Array literal syntax

Status: **done** — coordinator accepted at `402c326` after independent Node/native 152/152 and twelve static gates. Owner: Codex chat `01a19875-44e8-7792-9b97-6de7f1242031`; base `b33af7039cee2617950ab1b936afcfedc836290b` (clean checkout). Prerequisites: accepted array storage and internal map milestone. Own `src/syntax.ts`, parser array-primary case, evaluator array case, new array-literal guest fixtures/cases and compiled host assertions with necessary registration, scoped docs/evidence `docs/validation/ts-006/`. Lexer only if a concrete token need arises; square brackets/comma already exist. No broad frontend refactoring.

Add array literal AST `{ kind: "array"; loc: Location; elements: (Expr | null)[] }`, null representing an elision (never a guest null expression). Parse AssignmentExpressions separated by commas, elisions and trailing comma: [] length0, [,] length1, [,,] length2, [1,] length1, [1,,] length2. Existing expression precedence and recursion/source limits must remain enforced; malformed EOF/missing separator diagnostics must be bounded and located. Explicitly reject spread; no destructuring or comma operator.

Evaluator creates fresh GuestArray, evaluates present elements left-to-right with exact abrupt propagation, defines own W/E/C true numeric-string keys via validated operations and final length including trailing holes. Each slot (including holes) must spend a shared evaluator tick so large hole literals cannot bypass the resource budget. Null initial prototype remains an explicit current intrinsic limitation; no Array constructor/prototype/method registration. Numeric computed property coercion stays unsupported: guest tests use a['0'], a.length, etc. Preserve array storage APIs and never replace holes with present undefined.

Tests must prove exact lengths, own presence/descriptors versus holes and explicit undefined, nested arrays/object/function/conditional/assignment elements, left-to-right effects and early throw, repeated evaluation creates fresh objects, shared nested object identity, length growth/truncation through guest assignments, per-realm independence, malformed delimiters/spread/destructuring, bounded deep nesting and deterministic hole-budget exhaustion. Host driver parses/runs real guest source and inspects produced GuestArray values; no new reflection API solely for tests. Meaningful expected results in both lanes. Add one small readable array literal example if it improves the supported CLI demo; no standard map claim. Keep tests normally formatted; no compressed multi-statement scenarios.

Consult versioned spec/relevant engine and record sources. Run typecheck/runner/probes and both rebuilt guest lanes with all static gates. Preserve C++, pins, Claude outputs and COORDINATION.md. Any core runtime/conversion change requires concrete review. Stop at awaiting-review handoff; no successor work.

Handoff (2026-11-01): implemented array AST/parser/evaluator with elisions, trailing separators, left-to-right exact abrupt propagation, validated W/E/C own elements, final length including holes and shared per-slot ticks. Compiled host tests inspect real runtime-read guest arrays, holes/descriptors/identities/realm isolation and exact deterministic budgets; 15 expected-result additions retain all 137 previous cases. Typecheck passes; runner 20/20; probes 10/10; rebuilt Node/native 152/152 each, no skips; all twelve static gates pass (array-literals 1034/1034). Evidence and source-backed rationale: docs/validation/ts-006/ and architecture-decisions.md. Initial sandbox Zig linking failure retained; authorized library access resolved it. No core runtime/conversion expansion, Array intrinsics/map installation, numeric key coercion, spread/destructuring/comma operator, pins/C++/Claude/COORDINATION changes. Awaiting coordinator review; no successor work.

### TS-007P — Primitive computed-key conversion design and feasibility

Status: **in progress — awaiting review**. Owner: Codex chat `01a19882-ddd8-7b03-9cd7-0c0ddc28e9fd`; base `b4eb7945d146c3d051d22e99e4ddbe0c888cdc27` (clean existing branch). Prerequisite: accepted TS-006. Bounded design/probe task to prepare a[0] and other primitive computed property keys without silently implementing object coercion. Own `docs/property-key-conversion.md`, isolated `probes/property-key-conversion/`, evidence `docs/validation/ts-007p/` and own task handoff. No src/existing tests/manifests/pins/COORDINATION/Claude edits.

Inspect current member-reference evaluation and assignment/call paths. Propose exact primitive ToPropertyKey/string result signatures using existing completion types and GuestString. Specify undefined/null/boolean/string/number behavior, -0 -> 0, NaN/infinities, decimal/exponent formatting and boundary magnitudes; preserve symbols as deferred and object-to-primitive string hint as explicitly unsupported. Do not use display(), host wrapper/object conversion or numeric index-only shortcuts. Primitive bases remain unsupported; distinguish that existing boundary from key conversion.

Verify exact spec order for evaluating base/key, coercibility checks, ToPropertyKey, RHS evaluation, read/write and method receiver. Include original reference single-evaluation and abrupt identity scenarios. Enumerate existing expected unsupported numeric-key tests that must become positive regressions rather than be removed. Scope follow-on work to primitive keys only, not operators, computed object literal names, boxing, symbols or full ToPrimitive.

Propose an isolated numeric-to-string backend for existing binary64 numbers. Measure pinned Node/static-native behavior against fixed expected decimal/exponent strings, signed zero, finite extremes/subnormals, safe integer and 1e-6/1e21 boundaries and representative shortest-roundtrip cases. Separate feasibility examples from exhaustive correctness. If host String(number) differs, reduce/report before proposing a large formatting algorithm or pin change. Consult authoritative specification and a relevant engine with source references. Deliver exact interface/caller changes, test matrix and one bounded implementation contract proposal. Commit/push coherent deliverable and stop for coordinator review.

Handoff (2026-11-01): docs/property-key-conversion.md proposes exact primitive string/key completions, typed String(number) backend, raw property references and deferred base/key validation in GetValue/PutValue. Spec/engine review found current early reference rejection skips assignment RHS incorrectly; proposed timing correction preserves object-key, primitive-base and symbol exclusions. Includes five direct host-reference caller migrations, two active numeric-key rejections to replace positively, full expected-result/order/abrupt/receiver matrix and one bounded follow-on contract requiring coordinator freeze. Isolated 36/36 fixed numeric strings pass Node/native, static-only build and 11/11 static coverage; five Node-only host order scenarios pass. Typecheck passes; runner 20/20; existing probes 10/10. Initial tsc Node-types flag and sandbox Zig linking failures retained and resolved; no formatting discrepancy, formatter implementation or pin change. Evidence: docs/validation/ts-007p/. No new interpreter behavior or exhaustive formatting claim. TS-006 status reconciled to accepted at coordinator request. No src/existing tests/manifests/C++/Claude/COORDINATION changes; no successor work. Awaiting review.

### TS-007 — Primitive computed keys and deferred reference validation

Status: **in progress** (implemented and validated; awaiting coordinator review). Owner: Codex implementation chat `01a1988e-2066-7561-a3f4-920625df6259`; base `0819c71` on `codex/primitive-computed-keys`. Prerequisite TS-007P accepted at `5f4965a`; this acceptance supersedes its historical awaiting-review entry. Implement exactly the interfaces, caller migration, evaluation-order rules and complete acceptance matrix in docs/property-key-conversion.md. The coordinator freezes that document's bounded implementation contract, including moving base/key checks into GetValue/PutValue after RHS for simple writes. Own only the source/test/registration/docs paths listed there, plus this task's status/handoff and docs/validation/ts-007/. Coordinator owns COORDINATION.md.

All primitive keys are supported; object coercion, symbols, primitive boxing, computed object literal names, new operators and standard Array APIs remain excluded. Preserve the two existing numeric-key cases as positive tests and all prior assertions. Validate integrated runtime/conversion module cycle with static-only native compilation; reduce and report failures rather than redesign or change pins. Run typecheck, runner, existing probes, isolated formatting probe and rebuilt Node/native suites with all coverage gates. Keep tests readable, deterministic and assertion-bearing. Commit/push the assigned branch and stop for coordinator review; no successor work or main merge.


Handoff (2026-11-01): implemented the frozen partial ToString/ToPropertyKey APIs,
typed number formatting, raw Value references and deferred GetValue/PutValue
validation. Exact saved base Values reach property Get and method calls. All five
host reference callers migrated; both numeric-key regressions remain positive.
The new compiled driver plus runtime-read fixtures asserts the full conversion,
sparse-array, order/abrupt/receiver and boundary matrix. Node/native 153/153 each;
typecheck passes, runner 20/20, compiler probes 10/10, formatting 36/36 in both
hosts with 11/11 static coverage, order probe 5/5. All 13 integrated entry points
pass static-only and separate coverage (CLI 1004/1004; new driver 1209/1209).
Initial Zig sandbox linking failures resolved with approved library access; one
inferred-never test callback adapter resolved by explicit Completion annotation.
No cycle blocker or formatting discrepancy. Evidence and limitations:
docs/validation/ts-007/. Preserved C++, pins, companion tasks and coordinator files.
No merge, branch change or successor work. Stop for coordinator review.

### TS-008 — Primitive numeric operator conversion

Status: **in progress — awaiting coordinator review**. Owner: Codex implementation chat `01a1989e-7fb4-7ad1-ac9b-2b27fb6302f1`; base `620cd29` on `codex/primitive-computed-keys`. Prerequisites: TS-005N and TS-007 accepted (`7defba5`); TS-007 is done despite its historical awaiting-review handoff. Own numeric unary/binary portions of src/evaluator.ts, focused new compiled host assertions and runtime-read guest fixtures, necessary test registration, scoped feature/API docs and docs/validation/ts-008/. Coordinator owns COORDINATION.md. No parser/runtime/conversion API redesign.

Integrate existing partial toNumber into unary + and -, and binary -, *, /, %. For binary expressions evaluate/GetValue left then right before converting left then right; preserve exact abrupt records and operator source location. Unary conversion occurs after operand evaluation. Return numbers using existing binary64 operations; preserve signed zero, NaN, infinities and remainder semantics. Existing object conversion explicitly rejects without reading/calling hooks; do not add ToPrimitive. Reuse toNumber's tested numeric-string scanner/backend; no host Value-wrapper coercion. No changes to binary +, relational/equality/logical operators, grammar, compound/update operators, BigInt, symbols, boxing, Array APIs or pins. Keep those exclusions explicit. Consult primary spec and a relevant engine and record source references before implementation.

Tests must cover all existing primitive kinds for each affected operator; empty/whitespace/numeric/invalid strings, null/undefined/booleans, signed zero (host assertions distinguish), NaN/infinities, division by both zero signs, overflow/underflow and remainder sign/zero/infinity cases with fixed expected results. Exercise real parsed guest source, closures/side effects and exact left/right evaluation order. Exact thrown operand completions propagate; RHS throwing wins over an unsupported left object conversion, while left operand evaluation throwing skips RHS. Object operands (ordinary/array/function) reject with located errors and no hooks. Retain prior numeric-only behavior, unchanged plus/relational boundaries, all existing regressions and budget/realm coverage. Readable test scenarios, no compressed multistep fixtures. Preserve denominator; turn any superseded rejection into positive coverage. Independently meaningful expectations in both hosts, not parity alone. Run typecheck, runner/probes and rebuilt Node/native suites with all static gates. Reduce/report numeric backend discrepancies rather than weakening expectations or changing pins. Commit/push coherent work on current branch, hand off evidence/limitations, stop awaiting review; no successor or main merge.

Handoff (2026-11-01): unary +/- and binary - * / % integrate existing partial
toNumber after operand evaluation, preserving left/right GetValue order, exact
abrupt records and existing AST source locations. Fixed-result compiled tests
cover every current primitive on both sides, binary64 edges/signed zero,
closures, order, exact call/property throws, located ordinary/array/function
rejections and no hook reads/calls. Existing plus/relational boundaries remain.
Typecheck passes; runner 20/20; probes 10/10; rebuilt Node/native 155/155 each,
no skips; all 14 native static gates pass (CLI 1013/1013, numeric driver 1062/1062).
All 153 prior cases retained. Evidence and source research:
docs/validation/ts-008/ and docs/architecture-decisions.md. Initial Zig ENOENT
failures retained; explicit installed Zig PATH and approved library access
resolved them. No backend discrepancy, API redesign, pins/C++/Claude/COORDINATION
changes, branch switch, main merge or successor work. Awaiting coordinator review.
### TS-009 — Primitive binary addition

Status: **in progress — awaiting coordinator review**. Owner: Codex implementation chat `01a198ab-eb69-7810-b1c5-5d9b3bd824f5`; base `fb93c15` on `codex/primitive-computed-keys`. Prerequisites: accepted TS-007/TS-008 (`7defba5`, `4ba6708`); TS-008 is done, superseding its awaiting-review handoff. Own binary-plus path in src/evaluator.ts, focused compiled host assertions and runtime-read guest fixtures, necessary test registration and migration of superseded plus rejection expectations, scoped feature/API docs and docs/validation/ts-009/. Coordinator owns COORDINATION.md. No unrelated runtime/parser/conversion API changes.

Implement binary + for the existing primitive Value kinds. Evaluate/GetValue both operands left-to-right before conversion. Reject ordinary/array/function operands explicitly as unsupported object-to-primitive conversion without hook reads/calls (full addition uses the default ToPrimitive hint, not the property-key string hint). With primitive operands, if either is a string, convert both with existing partial toString and concatenate via stringConcat; otherwise convert left then right with existing toNumber and add typed binary64 numbers. Preserve exact abrupt completions and existing AST error locations. Keep readable explicit steps; do not stringify host Value wrappers, use display(), or silently implement object conversion. No relational/equality/logical changes, new syntax/update/compound operators, BigInt, symbols, boxing, standard Array API, pins or C++ changes. Consult primary spec and a relevant engine, record source references.

Required tests: meaningful fixed outputs for every primitive kind paired on both sides of string and nonstring operands; null/undefined/booleans, empty/whitespace/numeric/invalid strings; number+number versus string concatenation; NaN/infinities, positive/negative zero, overflow and shortest numeric formatting/boundaries already supported by toString. Host assertions distinguish signed zero and preserve UTF-16 including NUL and lone surrogates. Exercise real parsed guest source, left association and existing precedence, closures and one-time operand effects. Exact left throw skips right; exact right throw wins over unsupported left object conversion; call and property GetValue abrupt identity; ordinary/array/function operands on either side reject with located errors and no hooks, including string partner. Retain existing numeric/string addition regressions, all TS-008 assertions, and explicit unchanged relational boundaries. Replace superseded plus rejection cases positively rather than deleting them, including generated coercion case in tools/run-guests.mjs and plus cases in test/numeric-operators.ts; inventory all others before editing. Preserve test denominator and assertions, adjusting intended expectations only.

Run typecheck, runner/probes and rebuilt Node/native suites with all static gates. Keep source/tests readable and scope claims honest. Reduce backend failures; no weakened gates or pin changes. Record evidence/limitations, commit/push coherent work on current branch, stop for coordinator review. No successor dispatch or main merge.

Handoff (2026-11-01): primitive binary + now selects existing partial ToString
and stringConcat when either primitive is a string, otherwise existing partial
ToNumber and binary64 addition. Both GetValue operations finish first; exact
abrupt records and AST locations are preserved. Objects reject at the explicit
default-hint ToPrimitive boundary without hook reads/calls. Three superseded
plus rejection expectations migrated positively; all prior cases retained.
Fixed-result compiled tests cover primitive pairs, numeric/formatting boundaries,
signed zero, UTF-16, precedence/association, runtime-read closures, evaluation
order and exact abrupt identity. Typecheck passes; runner 20/20; probes 10/10;
rebuilt Node/native 156/156 each, no skips; all 15 native static gates pass.
Evidence, migration inventory and limitations: docs/validation/ts-009/.
No compiler/backend discrepancy, new API, pins/C++/Claude/COORDINATION changes,
branch switch, merge or successor dispatch. Awaiting coordinator review.

### TS-010 — Primitive relational comparisons

Status: **in progress — awaiting coordinator review**. Owner: Codex implementation chat `01a198b9-bdc0-79c0-a5b6-1ddda9b52c1f`; base `b87b3e5` on `codex/primitive-computed-keys`. Prerequisites: accepted primitive conversion/addition, TS-009 `b0c7e46` is done, superseding its historical awaiting-review status. Own relational portions of src/evaluator.ts, one focused comparison helper module if useful, the guest string comparison boundary in src/strings.ts if needed, focused compiled host assertions/runtime-read fixtures, necessary test registration and superseded relational rejection expectations, scoped docs and docs/validation/ts-010/. Coordinator owns COORDINATION.md. No broad runtime/parser/conversion refactor.

Implement <, >, <=, >= for current primitive Values. Consult primary specification IsLessThan and operator evaluation plus a relevant engine before implementation; record sources and precise algorithm. Evaluate/GetValue source-left then source-right once before conversions, including reversed comparator operators. Full comparison uses number-hint ToPrimitive; object operands remain explicitly unsupported without any hook reads/calls. Preserve conversion/evaluation order and exact abrupt records/AST locations. For two strings use lexicographic UTF-16 code-unit order including prefix/equality, not locale, Unicode scalar or UTF-8 byte order. Isolate host string representation operations behind strings.ts; demonstrate native behavior with fixed surrogate/NUL expectations or use a clear code-unit loop. Otherwise use existing primitive toNumber and numeric ordering. Represent the unordered NaN result explicitly if using a shared IsLessThan helper; all four operators with NaN must be false, so <=/>= cannot simply negate a boolean less-than result. Keep operator mapping recognizable and readable. No equality/logic/plus changes, object coercion, BigInt/symbols/boxing, grammar/update operators, Array APIs, pins or C++ changes.

Required tests: all primitive kinds on either side for all four operators, numeric versus two-string selection ('10' vs '2', '10' vs 2), empty/whitespace/invalid/radix strings, null/undefined/booleans, NaN on either side, infinities/signed zero/equal values/extremes. Fixed expected four-boolean rows; do not calculate expectations with the tested helper. UTF-16 prefix/empty/equal/NUL, unpaired surrogates and supplementary-vs-BMP cases that distinguish code-unit order from scalar/UTF-8 order. Real parsed guest expressions, closures and one-time LR effects for every operator, exact left/right call and property throws, RHS throw winning over unsupported left object conversion, left throw skipping RHS. Ordinary/array/function operands on either side with numeric/string partners reject with located errors and zero hook reads/calls. Keep all existing assertions; inventory and turn superseded relational rejection cases into positive regressions, including test/numeric-operators.ts ('1' < 2 and true >= 0). Retain denominator, numeric comparison behavior, budget/realm tests and unchanged equality semantics. Readable test scenarios, no compressed fixtures.

Run typecheck, runner/probes and rebuilt Node/native suites with all static gates. If host string ordering differs, reduce it and implement the narrow correct string boundary without pin changes or weakened expectations. Record evidence/limitations, commit/push tested work to current branch and stop for coordinator review. No successor or main merge.

Handoff (2026-11-01): primitive < > <= >= use source-order operand evaluation,
explicit unsupported number-hint object conversion, UTF-16 code-unit string
comparison and existing primitive ToNumber. A separate unordered state makes
all NaN comparisons false. Two prior relational rejection assertions migrated
to positive true results; all previous 156 suite entries retained. New fixed
rows, raw UTF-16, runtime-read closures, exact abrupt identity, located object
errors and zero hook reads/calls pass both hosts. Typecheck passes; runner 20/20;
probes 10/10; rebuilt Node/native 157/157 each, no skips. All 16 native static
gates pass (CLI 1059/1059; relational 1161/1161). Evidence/limitations and initial
test/environment failures: docs/validation/ts-010/. Zig library escalation
resolved sandbox linking failures; no compiler discrepancy or pin changes.
No equality/grammar/Array API/object coercion expansion, C++/Claude/COORDINATION
changes, branch switch, main merge or successor work. Awaiting coordinator review.

### TS-011P — Ordinary object coercion integration design

Status: **in progress — awaiting coordinator review**. Owner: Codex design chat `01a198c7-c792-7e60-9f85-a40a05f95b57`; base `9235558` on `codex/primitive-computed-keys`. Prerequisites: TS-007 through TS-010 accepted; TS-010 done at `8cf17fa`, superseding its awaiting-review handoff. Design only. Own docs/object-coercion-integration.md, optional isolated probes/object-coercion/ and docs/validation/ts-011p/, plus this task's claim/handoff. No src/existing tests/manifests/pins/Claude/COORDINATION edits.

Prepare the next small safe step toward guest valueOf/toString coercion. Inspect all current conversion/reference/operator/array-length/array-like/map entry paths and existing OperationContext call/tick ownership. Propose exact completion-returning OrdinaryToPrimitive and partial ToPrimitive interfaces, hint representation and where active context must be passed. Record complete caller inventory and bounded migration sequence. Do not silently turn context-free conversion into ambient evaluator state or reset budgets. Compare a helper-only first batch versus full caller migration; recommend one smallest coherent implementation contract.

Consult authoritative specification and a relevant engine with exact source references/revision. Define method lookup/call order (number/default versus string hint), original receiver, zero arguments, callable skipping, primitive-return acceptance including undefined/null, object-return fallback, final TypeError, exact Get/call abrupt propagation and guest side effects. Distinguish OrdinaryToPrimitive from full ToPrimitive with @@toPrimitive; symbols are absent and full conformance must not be claimed. No Date/wrapper/proxy/accessor/intrinsic expansion; explain what existing null-prototype objects/functions/arrays with explicit own/inherited methods can do and what stays unsupported.

Audit observable order when coercion becomes effectful: both operand evaluations precede conversions, source-order conversion for reversed relational operators, addition default hint before string selection, property-key conversion timing and original reference capture, array length double conversion/side effects and array-like length Get. Distinguish callers deliberately left primitive-only in an initial helper batch from integrated ones; no hidden scope expansion. Account for reentrancy, shared ticks/call depth, nested coercion, exception cleanup, realm ownership and host faults. Identify every affected old unsupported-conversion regression and how it would be preserved positively or as a meaningful remaining negative.

Deliver concrete interfaces, file ownership, dependency order and fixed expected-result matrix including method mutation between lookups, inherited methods, noncallables, all primitive returns, both-object returns, exact throws, budgets/realms and operator/reference/array order as applicable. Use probes only for real uncertain static-native mechanics; no proof-by-parity or unnecessary engine rebuild for prose. No implementation or pin changes. Commit/push design evidence on existing branch, stop for coordinator review before successor work.

Handoff (2026-11-01): docs/object-coercion-integration.md specifies context-aware
OrdinaryToPrimitive and partial ToPrimitive, exact lookup/call/hint/completion
rules, active budget/realm ownership, and a helper-only next batch. All existing
production conversion paths deliberately remain primitive-only. Complete caller
and regression inventories cover operators, deferred references, array length
(double conversion), array-like length and map, with bounded later migration
order and fixed H/F acceptance matrices. Sources: current specification, V8
12.0.267 and engine262 d553e7b52501fbc47eae981c8d0fa7a5c26d0171. Typecheck and
diff whitespace validation pass; no runtime change, new probe or engine rebuild
was needed or claimed. Evidence/limitations: docs/validation/ts-011p/. No
src/existing tests/manifests/pins/C++/Claude/COORDINATION edits, branch switch,
merge or successor work. Await coordinator review and implementation freeze.

### TS-011 — Internal ordinary primitive-conversion helpers

Status: **in progress — awaiting coordinator review**. Owner: Codex implementation chat `01a198d4-f2f6-7341-85b5-60bfde026ba5`; base `99b37af` on `codex/primitive-computed-keys`. Prerequisite TS-011P accepted at `d48a08f`, superseding its awaiting-review handoff. The coordinator freezes docs/object-coercion-integration.md Exact next-batch interfaces, Context/resource/realm ownership, H1-H17 matrix and Proposed next implementation ownership/acceptance. Own only new src/primitive-conversion.ts, test/primitive-conversion.ts, runtime-read test/fixtures/primitive-conversion.js, necessary driver registration, scoped feature/API docs and docs/validation/ts-011/, plus task claim/handoff. Coordinator owns COORDINATION.md. No existing production runtime/evaluator/conversion/array API edits.

Implement ordinaryToPrimitive(input Value, number|string hint, context, loc) and partial toPrimitive(input Value, default|number|string hint, context, loc), returning ValueCompletion. Ordinary helper nonobject input is a host invariant fault; partial wrapper returns exact primitive Value unchanged with no ticks/lookups/calls. Default maps to number for current object subset. Per candidate: exactly one active tick, fresh semantic internalGet with original Value receiver, skip noncallables, context.call with original receiver and zero arguments, accept any primitive return or fall back after object result; final located TypeError. Preserve exact tick/Get/call throws, method mutations and host faults. No symbol hooks/string substitutes, recursion into returned objects, host wrapper conversion, ambient/new evaluator or counters reset.

Implement every H1-H17 scenario, including real guest method execution through retained evaluator context and test-only bridge, builtin reentrancy/guest runaway bounds, first/second abrupt identity and mutation, exact receivers/args, all primitive returns/hints, method deletion/prototype changes, active-call cleanup for host faults/invalid builtin completions and realm independence. Also assert ordinary helper's nonobject precondition faults without guest wrapping. Keep existing operator/converter rejection behavior and every prior assertion unchanged. Full ToPrimitive, standard prototypes, Date/wrappers/symbols/accessors/proxies and production caller integrations remain outside scope. No extra ticks beyond frozen policy. Readable tests; synthetic Get traces do not claim accessors.

Run typecheck, runner/probes and rebuilt Node/native suites; retain all 157 entries and add the driver, with all 17 static gates. New helper must be reached in compiled tests. Reduce/report compiler failures, no pins or weakened coverage. Record honest evidence/limitations, commit/push coherent work on current branch and stop awaiting coordinator review. No successor dispatch or main merge.


Handoff (2026-11-01): implemented frozen ordinaryToPrimitive/partial toPrimitive
in a new helper-only module. H1-H17 compiled assertions and runtime-read guest
methods cover fresh lookup order, receivers, all primitive returns, mutations,
exact abrupt identity, shared budgets, host-fault call cleanup and realm state.
Existing production source and all prior tests remain unchanged. Typecheck passes;
runner 20/20; probes 10/10; rebuilt Node/native 158/158, no skips; all 17 native
static gates pass. Evidence/limitations: docs/validation/ts-011/. Initial sandbox
Zig library failures retained; approved escalation resolved linking. No compiler
workaround, pin/API/C++/Claude/COORDINATION changes, branch switch, main merge or
successor dispatch. Awaiting coordinator review.

### TS-012 — Ordinary object coercion in existing operators

Status: **in progress — awaiting coordinator review**. Owner: Codex implementation chat `01a198e3-086d-7472-a0d0-3ad2a5914c54`; base `4050de9` on `codex/primitive-computed-keys`. Prerequisite TS-011 accepted `de9cc1f` (done, superseding its awaiting-review handoff). Own operator portions of src/evaluator.ts, new focused compiled test/fixtures for operator coercion, necessary registration, scoped docs and docs/validation/ts-012/, and positive migrations in test/numeric-operators.ts, addition.ts, relational.ts and primitive-conversion.ts H17. Coordinator owns COORDINATION.md. No changes to primitive-conversion/conversion/runtime/reference/array APIs or parser.

Use accepted toPrimitive with this.context. Unary + and - request number hint after operand evaluation, then existing primitive toNumber. Binary -, *, /, % evaluate/GetValue both operands first (existing evaluator path), then source-left number-hint primitive/numeric conversion followed by source-right. Binary + performs source-left and source-right default-hint conversion before deciding string concatenation versus numeric addition. Relational < > <= >= performs source-left and source-right number-hint conversion before choosing two-string UTF-16 versus numeric/unordered comparison; never reverse observable conversions for > or <=. Preserve exact abrupt records, existing AST locations, original receivers and shared context/budgets. No new ticks outside the accepted helper/evaluator policies. Ordinary/array/function values with explicit own/inherited methods can convert; missing or both-object methods produce the helper's located TypeError. No standard prototype methods are added. Read relevant source-backed design order sections in docs/object-coercion-integration.md and record implementation mapping.

Explicitly leave direct toNumber/toString/toPropertyKey, computed keys/references, array length/storage and array-like/map primitive-only. !, &&, ||, === and !== remain noncoercing. No symbols/@@toPrimitive emulation, BigInt, Date/wrappers, accessor/proxy support, grammar/update/compound operators, Array APIs or pins. Do not broaden converter APIs merely to reduce local operator code.

Implement design F1-F4 and additional fixed expectations using real runtime-read guest fixtures: every affected operator with ordinary/array/function inputs, own/inherited methods, number/default hints demonstrated by competing methods, noncallable-first/fallback/primitive returns, string-vs-numeric addition/comparison selection and NaN/signed-zero/UTF-16 preservation. Exact L/R operand and P/Q coercion traces LRPQ for every binary operator; R throw beats left no-method/lookup failure, L throw skips R, P throw skips Q, Q throw preserves prior P effects. Both addition objects convert even if first becomes string. First coercion mutates second object's methods and later lookup sees it; replacing operand bindings does not replace already captured Values. Preserve exact call/Get throw identities, original receivers and zero arguments. Test nested coercion through parsed operators, guest runaway loop/recursion/shared monotonic budgets, call cleanup and independent realm state. No native recursion overflow or reset counters; host-fault cleanup claims limited to existing guarantees.

Migrate every superseded operator rejection assertion in numeric-operators/addition/relational and H17 positively; preserve expression counts/assertion purposes. Observed Get sentinel traps now propagate exactly; hook-bearing objects return fixed numeric/string/boolean results and call counts. Add meaningful no-method/both-object negatives. H17 direct converter/key exclusions stay negative with zero hook reads; avoid shared trace contamination between supported and unsupported paths. Number.isNaN/isFinite, strict equality and truthiness keep zero-hook assertions. All old test entries remain. Run typecheck, runner/probes and rebuilt Node/native suites with all static gates and new driver. Readable scenarios; preserve denominator and expected results rather than parity. Commit/push coherent milestone/evidence and stop for review; no successor/main merge.

Handoff (2026-11-01): existing numeric/addition/relational operators now use the
accepted helper with source-order coercion, number/default hints, exact abrupt
records and the active context/budgets. Migrated every superseded operator
rejection positively, retaining expression counts; direct converter/key H17
exclusions remain negative with zero reads. New compiled runtime-read assertions
cover F1-F4, mutations/captured Values, all object kinds/inherited methods,
receivers/arguments, UTF-16/NaN/signed zero, nested coercion, realm state,
runaway budgets and existing call cleanup. Typecheck passes; runner 20/20;
probes 10/10; rebuilt Node/native 159/159 each, no skips; all 18 native static
gates pass. Evidence, migration inventory, initial test errors and sandbox Zig
failures: docs/validation/ts-012/. A never-returning test builtin needed the full
Completion annotation to avoid a dynamic adapter; no gate/pin was weakened.
No helper/runtime/converter/reference/array/parser API changes, standard
prototypes, symbols, C++/Claude/COORDINATION changes, branch switch, main merge
or successor work. Awaiting coordinator review.

### TS-013 — Ordinary coercion for computed property keys

Status: **in progress — awaiting coordinator review**. Owner: Codex implementation chat `01a198f0-d325-7542-a3f0-9d9dc3407593`; base `75679a3`. Prerequisites accepted helpers/operators, TS-012 `bf2bed2` done (supersedes awaiting-review handoff). Freeze key integration from docs/object-coercion-integration.md F5-F7. Own toPropertyKey in src/conversion.ts, reference getValue/putValue in src/runtime.ts and their evaluator callers, required direct caller migrations, focused new compiled key-coercion tests/runtime-read fixtures/registration, scoped docs and docs/validation/ts-013/. Coordinator owns COORDINATION.md. No other runtime/array/converter refactoring.

Required signatures: toPropertyKey(value, context: OperationContext, loc): PropertyKeyCompletion; getValue(ref, context, loc): Completion; putValue(ref, value, context, loc): Completion. Context is required, never optional or ambient. toPropertyKey obtains toPrimitive(value, 'string', context, loc), returns exact throw, then calls existing primitive-only toString. Keep PropertyKey=GuestString, raw Reference base/key/loc, direct toString/toNumber/Uint32/Length APIs and array/set definition signatures unchanged. Evaluator passes its existing context at every reference consumption (identifier path included); direct host tests provide deliberate retained evaluator contexts. Inspect all callers before migration (current grep hits src conversion/runtime/evaluator; test definition-dispatch/object-prototypes/object-descriptors/property-key-conversion/primitive-conversion). No manufactured context inside semantic helpers. Validate actual static module-cycle integration; reduce blockers rather than redesign.

Preserve base validation before key coercion. Read BKCG; assignment BKRCS; method BKCGAAM for two arguments. Save base/key Values once; RHS binding replacement never redirects reference, but mutation of the saved key object's methods must affect delayed conversion. Key method receiver is original key; property Get/Set/method receiver is original base; coercion gets zero args and string hint. Call conversion/Get failure skips arguments; write RHS failure skips conversion; invalid base skips coercion (after RHS for writes). Preserve exact tick/Get/call/Set throws and locations, strict false-Set errors and assigned RHS identity. Existing simple consumers convert once; compound/update/cached reference design remains excluded.

Implement F5-F7 plus own/inherited key methods on ordinary/array/function keys, toString before valueOf, noncallable skip/object fallback, all primitive key returns using existing spelling/UTF-16, no-method/both-object located TypeErrors. Real parsed guest read/write/method paths and direct API expected assertions. Include original base/key capture, RHS mutating key.toString and replacing bindings, mutation inside conversion, inherited method receiver, array index/length distinctions, invalid base/no-hook precedence, exact B/K/R/C/Get/Set/argument throws and method order, nested key coercion/guest runaway limits using same context, call cleanup/realm independence. Preserve primitive key/fixed numeric formatting, operator semantics, readonly/nonextensible/array tests. Synthetic traces are not accessor/proxy claims.

Inventory and positively migrate superseded key rejections in property-key-conversion.ts and H17 primitive-conversion.ts without dropping assertions/denominator. Direct toString object rejection remains negative and separate from now-supported toPropertyKey; invalid primitive base still prevents object key hooks. Convert previous throwing key traps into exact sentinel propagation or meaningful positive method tests; retain RHS-wins cases. Do not touch historical evidence. Keep !/strict equality/Number predicates noncoercing and direct numeric/string/array length boundaries intact. No symbols/boxing/standard prototypes/object literal computed names/new syntax/pins/C++/Claude edits.

Run typecheck, runner/probes and rebuilt Node/native suites with every static gate/new driver. Tests must be readable and expectation-bearing; report counts/limitations honestly. Commit/push coherent work then stop awaiting review; no successors/main merge.


Handoff (2026-11-01): computed keys now invoke accepted string-hint ordinary
conversion with required active contexts in ToPropertyKey/GetValue/PutValue and
every evaluator reference consumer. Raw references preserve base/key capture,
RHS-before-coercion and original receiver/throw identity. Superseded key
rejections migrated positively, retaining prior entries and direct numeric/string
negative boundaries. New compiled fixture/driver covers F5-F7, all object kinds,
primitive returns, fallback/mutation, exact throws/ticks, arrays, budgets, cleanup
and realm isolation. Typecheck passes; runner 20/20; probes 10/10; rebuilt
Node/native 160/160 each, no skips; all 19 static gates pass, including the actual
runtime/conversion/helper import cycle. Evidence and initial test/environment
failures: docs/validation/ts-013/. Zig library escalation resolved linking.
No array/converter redesign, symbols/boxing/standard prototypes/new syntax, pins,
C++/Claude/COORDINATION changes, branch switch, main merge or successor work.
Awaiting coordinator review.

### TS-014 — Array-like length coercion and internal map order

Status: **in progress — awaiting coordinator review**. Owner: Codex implementation chat `01a198fe-ff6b-7393-ae2e-5dc25eba628a`; base `205e7d7` on `codex/primitive-computed-keys`. Prerequisites helpers/keys accepted; TS-013 `205e7d7` done, superseding awaiting-review handoff. Own src/array-like.ts, lengthOfArrayLike call in src/array-map.ts, required direct test/array-like.ts callers and relevant map-test migrations, focused new compiled assertions/runtime-read fixtures/registration, scoped docs and docs/validation/ts-014/. Coordinator owns COORDINATION.md. No runtime/array-storage/primitive converter API change.

Change lengthOfArrayLike(object, context: OperationContext, loc): NumberCompletion to perform exactly one semantic Get('length'), number-hint toPrimitive on that saved Value using the supplied active context, then existing primitive toLength. Return exact Get/helper/conversion throws unchanged. Forward map's existing context; direct test callers supply deliberate retained evaluator contexts. No ambient/new evaluator in helpers or optional context. Preserve object-only entry/no boxing and all ToLength normalization/clamping. If the length hook replaces object.length, do not reread it. No extra ticks besides accepted helper/evaluator/map policies.

Map converts length before checking callback callability, constructor/species restrictions and result allocation. It retains the converted numeric limit, but future element presence/values remain live. Implement design F12-F14 as applicable with actual parsed guest methods and callbacks through the host-only adapter. No standard map registration, symbols/species expansion or accessor/proxy claim. Actual GuestArray length storage stays numeric; synthetic subclass Get returning object length is an observation fixture only. Ordinary generic inputs never read constructor even when a length hook changes it.

Required expectations: own/inherited number-hint methods on ordinary/array/function length values, fallback/noncallable/each primitive return, fractional/negative/NaN/infinite clamping; one length Get and one effective hook with original receiver/zero args, exact first/second lookup/call/tick throws and located final failure. Saved length object remains selected if binding/property changes; mutations during hook persist on failure. Map conversion throw wins over invalid callback and skips later reads/calls; successful conversion with invalid callback then gives callback error. Hook mutations of indices/deletion/length are visible with saved iteration bound; holes remain holes, inherited elements and readonly/constructor restrictions preserved. Prove constructor check ordering on actual array input using a narrow host observer where needed and distinguish it from ordinary inputs. Maintain huge sparse budget and result-length limits; no enormous test scans. Nested length coercion/map callbacks share active ticks/call depth; guest loop/recursive coercion terminates, calls unwind, independent realms remain independent.

Inventory all superseded unsupported length expectations in test/array-like.ts (ordinary and observed Get cases) and map conversionError boundary. Migrate positively where explicit methods are installed; retain meaningful no-method/both-object and exact error precedence negatives. Preserve Get counts, prior assertions/denominator and primitive results. Direct toNumber/toString/toIntegerOrInfinity/toLength and array length assignment/definition remain primitive-only with zero-hook regressions; computed keys/operators stay supported. No pins/C++/Claude or unrelated syntax/intrinsic changes. Use readable fixtures/assertions and fixed results, not parity.

Run typecheck, runner/probes and rebuilt Node/native with every static gate/new driver. Record evidence/limitations and commit/push coherent task; stop awaiting review, no successor/main merge.


Handoff (2026-11-01): LengthOfArrayLike now requires the active context, gets
length once, applies number-hint ordinary conversion to that saved Value and
uses existing primitive ToLength. Map forwards its context and preserves
conversion-before-callback/constructor/allocation ordering and live elements.
Migrated direct callers and prior length negatives without removing entries.
New compiled runtime-read fixture/driver covers F12-F14, primitive return and
object-kind matrix, exact abrupt records/ticks, mutations, budgets, cleanup,
realm independence and zero-hook primitive converter/array storage exclusions.
Typecheck passes; runner 20/20; probes 10/10; rebuilt Node/native 161/161 each,
no skips; all 20 static gates pass. Evidence, migration inventory, initial test
observer error, reduced SC1090 test comparison and Zig sandbox failures:
docs/validation/ts-014/. Narrowed test comparison and approved Zig access
resolved validation; no engine workaround, pins or gates changed. No runtime/
primitive converter/array storage API changes, standard map registration,
symbols/species/boxing/accessors/proxies, C++/Claude/COORDINATION changes, branch
switch, main merge or successor work. Awaiting coordinator review.

TS-014 review follow-up (2026-11-01): expanded compact host/guest test helpers,
setup, mutations, inheritance, constructor and budget/fault scenarios into
readable blocks, preserving cases/assertions/order. Runaway loop and recursive
coercion now require the exact step-limit versus call-depth-limit messages.
No production change. Fresh typecheck, runner 20/20, probes 10/10, rebuilt
Node/native 161/161 each and all 20 static gates pass. Evidence and source-location
notes: docs/validation/ts-014/review-fix/. Coordinator handles push and acceptance;
implementation chat stops after local focused commit, with no successor work.

### TS-015P — Array length definition/context design

Status: **in progress — awaiting coordinator review**. Owner: Codex design chat `01a19919-ec56-7c02-9dec-ec2e5aa870eb`; base `f2fde9c6a4c29a720c3f2847b0d223c03dc158cd` on `codex/primitive-computed-keys`. Prerequisite TS-014 accepted final `d477b86` (production `cd9b121`), done superseding prior awaiting-review handoff. Design only. Own docs/array-length-context.md, optional isolated probes/array-length-context/, docs/validation/ts-015p/, and this task claim/handoff. No production/test/manifest/pin/Claude/COORDINATION changes.

Finalize the deferred array-definition integration from docs/object-coercion-integration.md. Inspect actual GuestObject.defineOwnProperty/internalSet/set/define, GuestArray constructor/override/setLength, evaluator object/array literals/reference writes, map result definitions, builtin registration and all test overrides/setup helpers. Produce exact context-carrying semantic signatures and a safe concrete bootstrap API, full caller migration inventory, and bounded dependency order. No optional or ambient context, manufactured evaluator or ignored completion. Preserve virtual receiver dispatch and original context through inherited Set and array definitions. Ordinary data storage must never coerce values.

Resolve how trusted bootstrap definitions remain validated with no guest execution while semantic array length definitions can call hooks. Compare minimal alternatives; recommend one readable design with exact signatures/ownership, no unchecked property-storage bypass. Array constructors initialize length invariants without fake context; numeric bootstrap length changes still enforce array index/length/writability rules. Define what setup on subclasses does, preserving relevant override/false/throw assertions or explicitly migrating them to semantic APIs. Avoid retaining ambiguous define that silently differs by call site. Decide whether plumbing-only and effectful array length should be separate reviewed batches; give smallest coherent next implementation contract.

Inspect authoritative ArraySetLength and ordinary Set/Define algorithms and relevant engine sources with revision links. Freeze two distinct number-hint conversions of the original descriptor Value (ToUint32 then ToNumber), not one conversion reused; compare results before outer old-length read. Distinguish side effects of first/second hook, invalid length RangeError, old descriptor observation after conversion, delayed nonwritable flag, descending sparse deletion and partial-failure length restoration. Distinguish strict Set early readonly rejection from direct Define conversion order. State exactly how copied descriptor fields survive hooks, and whether host mutation of caller-owned descriptor records is part of public contract or an internal invariant. Do not silently change guest semantics to simplify bootstrap.

Acceptance matrix must cover real guest assignments and explicit direct definition host cases: conversion2/2 success,2/3 mismatch, second lookup/method mutation, first/second exact throws, hook changes length/writability/indices, double signed-zero normalization and invalid/infinite/fraction/range boundaries, inherited receiver dispatch, readonly Set no hooks versus direct Define conversion, nested assignment/reentrancy/shared budgets/realms, no outer update after abrupt while hook effects persist, shrink rollback/freeze behavior. Preserve all prior descriptor/array assertions and enumerate superseded object-length rejection tests for positive migration. Record no changes needed for already supported array-like/operator/key behavior; direct primitive converter APIs may remain unchanged via explicit local ToPrimitive calls.

No standard Array intrinsics/species, symbols, accessors/proxies, boxing, new syntax, full converter migration or C++ removal. Use isolated static probes only for actual uncertainty; no native capability claims from prose. Commit/push design/evidence and stop for coordinator review, no implementation or successor dispatch.

Handoff (2026-11-01): `docs/array-length-context.md` specifies required semantic
context signatures, explicit validated bootstrap dispatch, shared ordinary/array
storage phases, constructor and subclass contracts, complete caller/override
inventory, exact double-conversion and mutation/rollback order, and fixed P1-P6 /
L1-L21 acceptance matrices. Recommends separately reviewed plumbing/bootstrap
then effectful length batches, with precise ownership and superseded-test
migrations (including TS-014's fractional fixture default). Spec and pinned
engine262 sources inspected; search evidence in `docs/validation/ts-015p/`.
Documentation diff checks pass; no runtime or compiler tests/probes rerun and no
new capability claim. Baseline 161/161 each host and 20 static gates remains
inherited accepted evidence. No production/tests/pins/C++/Claude/COORDINATION
changes, implementation, branch switch, main merge or successor. Stop for review.

Coordinator acceptance: TS-015P accepted at `25292bb` on 2026-11-01; supersedes the awaiting-review status. Reviewed actual design, runtime/array storage and dispatch consumers, evidence inventory and authoritative ArraySetLength order. Documentation-only checks pass; no new native capability claim.

### TS-015A — Semantic definition context and validated bootstrap

Status: **in progress — implemented, awaiting coordinator review**. Owner: implementation chat `01a19928-e995-7d43-ae9e-f01aad50eea1`; base `f1987eb`. Prerequisite TS-015P accepted at `25292bb`. Implement only batch 1 of docs/array-length-context.md; batch 2 effectful length remains blocked pending review. Own src/runtime.ts, src/array-object.ts, src/evaluator.ts, src/array-map.ts, src/realm.ts, src/builtins/number.ts, the affected test consumers listed in the design, scoped architecture/feature notes, this task handoff and docs/validation/ts-015a/. Coordinator owns COORDINATION.md. Preserve root Claude queue.

Adopt the exact required OperationContext signatures and forward original context/location/receiver through putValue, set, internalSet and both receiver definition branches. Migrate all consumers atomically; no optional context, ambient evaluator, manufactured execution context or ignored completion. Ordinary storage never coerces values or adds ticks. Semantic object/array literals and map definitions use the active context with exact throw propagation and explicit impossible-false checks.

Remove ambiguous GuestObject.define, replacing trusted setup with descriptor-form bootstrapDefine and protected bootstrapDefineOwnProperty. Extract validated ordinaryDefineOwnProperty with private storage retained. Array construction explicitly uses super ordinary validation without subclass dispatch. Share non-length index growth and the entire normalized length storage/shrink/rollback algorithm between semantic and bootstrap routes; do not duplicate storage algorithms or expose unchecked writes. Bootstrap never invokes semantic overrides or guest conversion; object array length is a host fault before lookup/mutation, ordinary object-valued properties/elements remain allowed. Primitive bootstrap length normalization and descriptor validation remain real, including partial shrink/freeze failure. Semantic length remains primitive-only in this task.

Implement P1-P6 with readable expected-result assertions in existing compiled drivers. Preserve every previous test entry/assertion purpose, all prior semantic conversion exclusions, flags, holes, original RHS and exact abrupt records. Migrate bootstrap observer false/throw tests to the dedicated protected override and explicitly test semantic override bypass. Check context identity for own/new/inherited receiver dispatch, same realm selection and zero added ticks. Search all src/test callers again, distinguish host Map.set, and check the formerly ignored realmMarker Set result. Retain prior suites and twenty static gates; no new harness/manifest is expected.

Run typecheck, runner regressions, probes, rebuilt Node/native guest suites, static-only builds and coverage gates. Baseline 161 entries per guest lane and twenty static gates must remain; report actual totals honestly. Reduce any compiler blocker before adopting a workaround. Keep tests readable with separate setup/actions/assertions and exact outcomes. Record evidence and remaining scope, commit/push coherent changes, then stop for coordinator review. No effectful length integration, direct converter redesign, new syntax/intrinsics, pins, C++/Claude/COORDINATION edits, branch switch, main merge or successor assignment.

TS-015A handoff (2026-11-01): batch 1 implemented with required semantic context,
validated bootstrap dispatch, constructor bypass and shared array storage. P1-P6
are exercised in existing compiled drivers. Typecheck passes; runner 20/20;
probes 10/10; rebuilt Node/native 161/161 each, no skips; all 20 native static-only
and separate coverage gates pass. Pinned Zig required approved installation
access after sandbox linker failure; no compiler workaround or relaxed gate.
See [retained evidence](docs/validation/ts-015a/README.md). Semantic object length
still rejects without hooks. Stop for coordinator review; batch 2 is not started.

Coordinator acceptance: TS-015A accepted at `c77d9f1` on 2026-11-01; supersedes awaiting-review status. Independently rebuilt Node/native, 161/161 each and all twenty static gates. Reviewed core extraction, caller migration, bootstrap/receiver assertions and retained producer evidence.

### TS-015B — Effectful array length definitions

Status: **in progress — implemented, awaiting coordinator review**. Owner: implementation chat `01a19935-908b-7331-9a83-88016377a453`; base `737d5a6`. Prerequisite TS-015A accepted `c77d9f1`. Implement batch 2 of docs/array-length-context.md, including P1-P6 preservation and L1-L21 acceptance. Own src/array-object.ts semantic setLength, test/array-storage.ts and test/length-coercion.ts superseded assertions, new test/array-length-coercion.ts and runtime-read fixture, necessary existing driver/fixture registration, scoped docs, this task handoff and docs/validation/ts-015b/. Coordinator owns COORDINATION.md; root Claude queue remains reserved.

Snapshot the descriptor fields and original Value before guest calls. Missing value performs validated storage without conversion. Otherwise apply number-hint toPrimitive then primitive toUint32, separately apply number-hint toPrimitive to the same original Value then primitive toNumber, compare numeric results, normalize the copied descriptor and enter the existing shared storage phase. Both conversions are observable; do not cache the first primitive/method or validate fractions/infinity before the second conversion. Return exact abrupt records, preserve hook effects and read old length only after conversions. Keep strict Set early readonly rejection and original RHS result, direct Define conversion-before-validation, descending sparse deletion and partial rollback/freeze. Keep bootstrap and direct converters primitive-only with zero guest hooks; no global API redesign.

Implement all L1-L21 scenarios with explicit expected results and readable runtime-read parsed guest methods/assignments plus direct host definition cases. Cover method replacement/inheritance, exact first/second Get/call/tick throws, object/array/function inputs, each primitive result and mixed first/second numeric boundaries, signed zeros, post-hook growth/shrink/freeze, absent/present descriptor flags and unchanged input records, receiver dispatch, nested/reentrant assignments, shared limits and exact step/call-depth errors, realm independence, earlier RHS/key failures, host faults and call cleanup. Retain bootstrap P1-P6 and old descriptor assertions. No huge sparse scans or assertions based only on host parity.

Migrate only the explicitly superseded object-length rejections enumerated in the design: array-storage coercible hook and guest object assignment, length-coercion successful storage calls using returned=2 (its default 2.9 still needs separate RangeError coverage), and exact ForbiddenHooks sentinel/read counts. Isolate direct converter zero-hook counters before supported storage calls. Preserve every existing test entry/assertion purpose and add a compiled driver with a fail-closed static gate; expected minimum 162 entries per guest lane and 21 native gates.

Run typecheck, runner/probes and rebuilt Node/native suites with all static-only builds and separate coverage gates. Keep pinned toolchain and readable code; reduce compiler issues before workarounds. Record evidence, exact coverage and limitations, commit/push coherent changes and stop for review. No standard Array intrinsics/species, symbols/boxing/accessors/proxies, new syntax, C++/Claude/COORDINATION edits, branch switches, main merge or successor dispatch.

TS-015B handoff (2026-11-01): semantic length now snapshots the descriptor and
original Value, performs independent number-hint ToUint32/ToNumber conversions,
and enters shared storage only after comparison. Bootstrap/direct converters
stay primitive-only. L1-L21 have fixed expected-result coverage in a new compiled
runtime-read fixture/driver; all baseline entries and P1-P6 remain. Superseded
array-storage and length-coercion assertions migrated as frozen, including the
2.9 failure, successful returned=2 and separate zero-read converter counters.

Typecheck passes; runner 20/20; probes 10/10; rebuilt Node/native 162/162 each,
no skips; all 21 static-only builds and separate coverage gates pass. The new
driver is 1616/1616 static. Retained evidence and matrix/migration notes:
[docs/validation/ts-015b/README.md](docs/validation/ts-015b/README.md). Initial
Zig sandbox link failures resolved with approved installed-library access.
Two test-only SC1090 comparisons were narrowed after retaining a small reduction;
no production workaround, changed pins or relaxed gates. Scope remains batch 2
only. Stop for coordinator review; no successor or main merge.

Coordinator acceptance: TS-015B accepted at `3a5d360` on 2026-11-01 after actual core/test/migration/registration review and independent rebuilt Node/native 162/162, all 21 static gates. Supersedes awaiting-review status. Bootstrap/direct converters remain explicitly primitive-only.

### TS-016P — Realm intrinsic prototype bootstrap design

Status: **in progress — design delivered, awaiting coordinator review**. Owner: design chat `01a19943-623a-70c0-a2c2-07ce8c487217`; base `bf8c129`. Prerequisite TS-015B accepted `3a5d360`. Design only; no production implementation authorized by this task. Own docs/realm-intrinsic-prototypes.md, docs/validation/ts-016p/, optional isolated probes/realm-intrinsics/ only if an actual compiler uncertainty needs reduction, and this task claim/handoff. Coordinator owns COORDINATION.md; Claude tasks remain reserved.

The interpreter now supports ordinary coercion but production objects, functions and arrays still start with null prototypes, and map is internal only. Design the smallest coherent per-Realm intrinsic prototype foundation needed to make later standard methods usable. Inspect current Realm bootstrap, registerBuiltin, evaluator function/object/array creation, GuestArray constructor and map result allocation, plus host fixtures. Consult authoritative specification algorithms and a relevant pinned engine implementation. Record exact revisions/links and distinguish deliberate partial scope from full intrinsics.

Produce a concrete graph/allocation order and exact APIs for realm-owned Object, Function and Array prototype roots, or justify a smaller dependency-safe first batch. Resolve Function.prototype callability, Array.prototype array/length invariants, Object.prototype null root and immutable-prototype requirements, builtin function metadata, and bootstrap cycles without ambient Realm or fabricated evaluator. Keep low-level explicit null-prototype host construction possible. Inventory every production allocation and test expectation affected by realm-aware factories or explicit prototype parameters. Explain how cross-realm values retain identity and which realm supplies map result objects under the existing bounded species policy.

Separate graph plumbing from first methods and guest exposure where reviewable. Identify a minimal method follow-up, not an entire standard library. Explicitly analyze the consequences of installing Object.prototype valueOf/toString and eventual Array methods: changed no-method errors, default object conversion, inherited method mutation, existing constructor/species rejection, arrays lacking toString/join, and functions lacking standard toString. Do not silently implement incorrect approximations or claim missing wrappers/symbol hooks/constructors/accessors are complete. List prerequisites/deferred restrictions for each method instead of broadening them automatically. Standard method implementations remain future work until reviewed and assigned.

Deliver exact smallest-next-batch ownership/signatures, migration checklist and fixed expected-result matrix for graph identity/descriptors/callability, no bootstrap guest calls, realm isolation, ordinary lookup/shadowing, guest object/function/array allocation, map results, existing coercion/budget behavior and explicit unsupported cases. Preserve every baseline assertion purpose; enumerate required future positive migrations. Explain alternatives and choose readable minimal boundaries. Probe only actual static compilation uncertainty, retaining both static build and coverage evidence if used. Documentation-only work must not claim new native capability. Commit/push coherent design and stop for coordinator review, no production/test/manifest/pin/C++/Claude/COORDINATION edits, branch switch, main merge or successor assignment.

TS-016P handoff (2026-11-01): delivered `docs/realm-intrinsic-prototypes.md`
and `docs/validation/ts-016p/`. Recommends graph/allocation/builtin metadata only
as the smallest coherent next batch: per-Realm O/F/A, immutable null-root O,
callable F, exotic A, explicit host null roots and Realm factories. Includes all
production allocation sites, registration/host fixture migrations, G1-G17 fixed
acceptance scenarios and future positive coercion migrations. No constructors
or conversion methods are proposed in that batch; Function.prototype.call is
the minimal separately reviewed method candidate. Internal map result Realm is
the supplied context Realm; foreign value identity is preserved, while standard
foreign function Realm entry remains explicitly deferred.

Sources: ECMA-262 fixed 2025 edition and inspected engine262
`d553e7b52501fbc47eae981c8d0fa7a5c26d0171` files with recorded blob revisions.
Documentation whitespace/scope review only; no compiler uncertainty justified
a probe and no runtime suite was rerun. Inherited accepted baseline remains
Node/native 162/162 and 21 static gates, not new evidence from this prose.
No production/tests/manifests/pins/C++/Claude/COORDINATION edits. Stop for
coordinator review; no implementation, branch switch, main merge or successor.

Coordinator acceptance: TS-016P accepted at `ffbab58` on 2026-11-01; supersedes awaiting-review status. Reviewed graph, allocation/registration inventory, runtime call boundary, specification Function root and explicit deferred realm entry. Corrected one builtin-source link in acceptance commit. Documentation only; no new runtime evidence.

### TS-016A — Realm prototype graph and allocation

Status: **in progress — implemented, awaiting coordinator review**. Owner: implementation chat `01a19950-ba63-7f41-bf67-b02205d733da`; base `5819ace`. Prerequisite TS-016P accepted `ffbab58`. Implement graph/allocation/builtin metadata batch only in docs/realm-intrinsic-prototypes.md. Own src/runtime.ts, src/array-object.ts, src/realm.ts, src/builtins/number.ts, src/evaluator.ts and src/array-map.ts for frozen interfaces/allocation migration; test/realms.ts, test/array-literals.ts, test/array-map.ts, registration callers test/operation-context.ts and test/length-coercion.ts, optional runtime-read test/fixtures/realm-intrinsics.js; scoped docs, task handoff and docs/validation/ts-016a/. Coordinator-approved scope extension (2026-11-01): test/conversion.ts only for the documented side-effect Array import required by the reduced pinned compiler failure; preserve every assertion. Coordinator owns COORDINATION.md; preserve Claude queue.

Implement exact explicit constructor/factory/metadata APIs in the accepted design. Per Realm allocate immutable null-root O, callable F inheriting O with own empty name/+0 length, then real array A inheriting O with own +0 length and existing exotic invariants. All roots fresh/extensible, no constructor back-links or methods. Bootstrap without guest operations, evaluator or fabricated context. Low-level constructors retain null defaults. Immutable prototype SameValue success precedes rejection, and property extensibility remains independent. No unchecked descriptor writes or virtual constructor dispatch.

Migrate every production allocation and registerBuiltin caller from the design inventory. Registered builtin metadata is centralized with unchanged descriptor flags and deliberate arities; reject nonfinite, negative or noninteger metadata lengths as host faults and normalize accepted zero to +0. Guest closures retain their environment; own guest name/length inference and construction stay deferred. Factory-created objects/arrays/functions inherit O/A/F respectively. Internal map result uses supplied context.realm; preserve input and returned element identities, holes, ordering and existing species restrictions. Document foreign closure execution still uses calling evaluator context; do not silently add owner-realm switching/new evaluators.

Implement G1-G17 with fixed readable expected results in existing compiled drivers, preserving all 162 entries and 21 gates. Verify graph/descriptor/callability/immutable-slot behavior, no bootstrap output or guest calls, parsed allocation identities and freshness, root mutation/shadowing/readonly effects, independent realms and foreign identity, context-selected map results/constructor failures, inherited array indices and no new ticks. Preserve explicit null-root host fixtures, all coercion negatives/positive hooks, exact budget failures and cleanup. No Object/Function/Array global, constructor property, Object conversion method, call/map/join method, boxing/symbols/accessors or source serialization. These remain separately assigned work.

Run typecheck, runner/probes, rebuilt Node/native and all static-only/coverage gates. Reduce genuine compiler blockers rather than weakening gates or changing pins. Record evidence and honest partial scope; commit/push coherent changes and stop for review. No C++/Claude/COORDINATION edits, branch switching, main merge or successor assignment.

TS-016A handoff (2026-11-01): graph/allocation/metadata batch implemented with
explicit O/F/A roots, immutable Object prototype slot, callable Function root,
exotic Array root, Realm factories and centralized validated builtin metadata.
All production allocation/registration sites migrated; low-level null-root
fixtures and captured environments remain. Map selects the supplied context
Realm and retains exact Values/holes/order/species restrictions. No methods,
constructor exposure or foreign-function Realm switching is included.

G1-G17 extend existing compiled drivers and a runtime-read realm fixture; all
162 baseline guest entries and 21 gates remain. Typecheck passes; runner 20/20;
probes 10/10; normal rebuilt Node/native suites 162/162 each, no skips; all 21
static-only builds and separate coverage gates pass. Realm driver 1353/1353,
map 1533/1533 and conversion 503/503 static. Evidence and limitations:
[docs/validation/ts-016a/README.md](docs/validation/ts-016a/README.md).

A real pinned compiler failure was reduced before a workaround: conversion's
static build rejected Callable (SC2009), while coverage timed out with only
GuestObject imported. Explicit Array reachability fixes both. Coordinator
approved a single additional test/conversion.ts import with a source comment;
all assertions and gates are retained. Rejected production type/import changes
were tested only in scratch copies and not adopted. Original failures and final
normal-run evidence are separate. Pinned Zig required installation access.
Stop for coordinator review; no later method work or main merge.

Coordinator acceptance: TS-016A accepted at `2dfdbdc` on 2026-11-01. Independently rebuilt Node/native 162/162 each, all 21 static gates. Reviewed graph, allocation/metadata migration, G tests and isolated conversion-driver compiler workaround. Supersedes awaiting-review handoff.

### TS-016B — Function.prototype.call

Status: **in progress**. Owner: Codex implementation chat `01a1996c-a05b-7201-a956-00f4f82aab6b`; assigned base `7d40c24`, checkout `d8cceb9` (coordinator changes preserved). Prerequisite TS-016A accepted `2dfdbdc`. Implement only the first method proposed in docs/realm-intrinsic-prototypes.md. Own new src/builtins/function.ts, minimal Realm registration after roots exist, new compiled test/function-call.ts and runtime-read test/fixtures/function-call.js, required driver registration, test/realms.ts exact root-key migration, scoped docs, task handoff and docs/validation/ts-016b/. Coordinator owns COORDINATION.md; preserve Claude queue.

Install one fresh call builtin per Realm on functionPrototype via existing registerBuiltin, name call, length 1, method W/E/C true/false/true, metadata false/false/true and function prototype F. No Function global or constructor back-link. Follow ECMA-262 2025 20.2.3.3: validate callable receiver (Value object with callable slot), select first argument or guest undefined as thisArg, copy remaining Values in order, and return active context.call(receiver, thisArg, rest, loc). Do not read target.call/name/length/prototype, box or coerce anything, modify the original argument list, create an evaluator, or bypass call/step limits. Choose and document a precise located TypeError for noncallable receiver. Existing evaluator call boundary remains unchanged. This is the existing strict receiver/limited realm-entry profile, without proper tail calls; document that limitations apply to this method too.

Use readable expectation-bearing runtime-read guest functions plus host inspection/bridges. Required cases: f.call with missing/present/extra args and exact argument/receiver/return identities, undefined/null/each primitive/object/function thisArg unchanged, guest and builtin targets, callable F returning undefined, call.call chaining; detached call and borrowed call on all noncallable Value kinds fail, after normal argument expression effects; target.call own shadow does not affect invoking a previously saved intrinsic. Assert left-to-right base/property/thisArg/rest evaluation, earlier failures skip invocation, target effects occur exactly once, exact guest/sentinel throw records and source locations, host faults/illegal completion cleanup, nested/reentrant calls and recursive .call reach exact limits with no leaked calls or fresh budgets. No artificial new ticks for forwarding. Cover per-Realm method identity/metadata/mutation/delete/replacement isolation, foreign targets preserving identity/environment and documented caller-context allocation. Low-level null-root functions do not acquire call unless linked deliberately; ordinary/array instances do not inherit it through O.

Extend the existing G17 exact Function-root own keys from name,length to name,length,call while preserving all other graph/metadata/missing-method assertions. Keep all baseline cases; add a new compiled driver and fail-closed gate (minimum 163 guest entries and 22 native gates). No object/array conversion, apply/bind/toString, boxing/symbols/accessors, realm-entry redesign, guest own metadata inference or constructor support. Retain the accepted isolated compiler import workaround.

Consult the fixed specification and relevant engine source, record revisions. Run typecheck, runner/probes, rebuilt Node/native and all static build/coverage gates; reduce compiler failures before workarounds. Record precise results/limitations, commit/push coherent work, stop for review. No C++/Claude/COORDINATION/pin changes, branch switch, main merge or successor assignment.

TS-016B handoff (2026-11-01): implemented for coordinator review; status remains
in progress until acceptance. Fresh per-Realm call builtin forwards unchanged
Values through active context.call with exact noncallable-receiver diagnostic.
Evaluator unchanged; proper tail calls and foreign-function Realm entry remain
unsupported. New runtime-read guest fixture and compiled host driver cover the
frozen forwarding, errors, reentry/budgets, metadata and Realm-isolation cases.
Only G17's exact F root keys changed; all 162 baseline entries retained.

Typecheck passes; runner 20/20; probes 10/10; rebuilt Node/native 163/163 each,
no skips; all 22 static-only and separate coverage gates pass. CLI 1166/1166,
new driver 1303/1303 static statements. A test-only un-narrowed catch comparison
was reduced before using the existing instanceof Error narrowing pattern;
original failure and paired reductions are retained. Accepted conversion import
workaround preserved. Pinned Zig installation access was required; initial
sandbox failure retained separately. Evidence: docs/validation/ts-016b/README.md.
No C++/Claude/COORDINATION/pin edits, evaluator redesign, successor or main merge.

TS-016B readability follow-up to coordinator review of ca471fb: test helpers,
actions, callbacks and try/catch expanded; name/trace/count use saved narrowed
Values; multi-step fixture bodies expanded. Exact detached/borrowed locations
updated to 27:30/28:31; all other assertions and exact budgets retained. No
production changes. Rebuilt Node/native 163/163 each, 22 static gates, runner
20/20, probes 10/10 and typecheck pass; function-call driver 1331/1331 static.
Evidence: docs/validation/ts-016b/readability/README.md. Awaiting review.

Coordinator acceptance: TS-016B accepted final `59bd44e` (production `ca471fb`) on 2026-11-01. Reviewed readability fix and exact relocated expectations; independently rebuilt Node/native 163/163 each, all 22 static gates. Supersedes awaiting-review status.

### TS-017P — Function realm entry and shared execution context design

Status: **in progress**. Owner: Codex design chat `01a19988-2678-7cd0-af57-de81fcff8ea6`; base `e515e7b`. Prerequisite TS-016B accepted final `59bd44e`. Design only. Own docs/function-realm-entry.md, docs/validation/ts-017p/, optional isolated probes/function-realm-entry/ for genuine compiler uncertainty, and own task claim/handoff. Coordinator owns COORDINATION.md. Preserve Claude queue.

Resolve the explicitly deferred foreign-function execution limitation before more realm-sensitive methods are exposed. Inspect actual Callable representation and creation, Realm factories/root bootstrap, Evaluator.context/call/closure/evaluate, OperationContext consumers, Function.prototype.call, map, coercion and all host-built callable fixtures. Consult fixed ECMAScript ordinary/builtin call and execution-context algorithms plus relevant pinned engine sources. Design the smallest synchronous function-realm entry implementation with exact signatures/slots and ownership; no implementation in this task.

Specify how guest and builtin functions retain defining Realm, including callable Function root; how each call enters the callee Realm while retaining guest lexical environment; and how finally restores caller context on normal, exact guest throw, host fault and invalid completion. Keep one shared monotonic evaluator step budget and active call/frame limits through alternating Realm reentry. Never create a fresh evaluator or reset budgets per foreign call. Compare a stable OperationContext with an active-realm view versus explicit per-call contexts sharing execution state; address existing context identity assertions and native static compilation, explaining tradeoffs. No process-global ambient Realm. Decide a concrete explicit policy for low-level null-root host callables without silently guessing ownership from prototype or lexical bindings. Prefer atomic migration to a sound contract over an optional field that hides missing production ownership.

Distinguish function ownership from prototype-chain identity and transferred Values, and function realm from lexical Environment. Describe saved contexts and synchronous callback reentry precisely: which Realm a builtin observes before/after context.call, which Realm allocations and internal map results use, and borrowed foreign Function.prototype.call's nested entry/restoration sequence. Keep internal map's explicit context allocation contract coherent; do not implement species or constructors. Identify every current caller-context expectation that must become a positive defining-Realm assertion; preserve identity/throws/receiver/budget assertions and all null-root storage fixtures.

Deliver complete production/host fixture migration inventory, minimal next batch ownership and fixed expected-result matrix: A->B->A calls and allocations, nested closures created in foreign execution, builtin/guest/root ownership, borrowed call from a third Realm, exact identity/location on throws, restoration after host faults/illegal completions and failed call guards, separate evaluators versus shared reentry budgets, map allocation inside foreign builtin and callback restoration, coercion reentry, no added semantic ticks, root/bootstrap cycles and immutable metadata policy. Optional probes must isolate actual compiler uncertainty and retain Node/native static-only plus coverage results. Do not claim native support from prose. Async/jobs/modules/generators, bound/proxy functions, proper tail calls, wrappers/errors, other methods and full execution-context spec remain out of scope.

Record exact source revisions/links, rejected alternatives and remaining limitations; commit/push design/evidence then stop for review. No production/tests/manifests/pins/C++/Claude/COORDINATION edits, branch switch, main merge or successor assignment.

TS-017P handoff: design candidate complete, awaiting coordinator review (status remains in progress until accepted). See [function Realm entry](docs/function-realm-entry.md) and [inspection evidence](docs/validation/ts-017p/README.md). Proposes required immutable callable Realm ownership, stable per-evaluator active context, synchronous finally restoration including AST depth, complete factory/host fixture migration and fixed R1-R22 acceptance matrix. No production changes, compiler probes or new runtime/native validation claim; baseline 163/163 and 22 gates are inherited TS-016B evidence. No successor started.

Coordinator acceptance: TS-017P accepted `a3e2ced` on 2026-11-02. Reviewed design, retained inventories and actual call/factory/depth paths against fixed specification entry semantics. Stable live context and immutable ownership are coherent for synchronous execution. No runtime/native proof is claimed. Supersedes awaiting-review status.

### TS-017A — Synchronous function Realm entry

Status: **in progress** — implementation complete; coordinator acceptance pending. Owner: Codex implementation chat `01a19999-256d-7a11-85af-628163c5a77c`; base `f4ab2a5`. Prerequisite TS-017P accepted `a3e2ced`. Implement the atomic batch in docs/function-realm-entry.md, including its R1-R22 fixed acceptance matrix and complete fixture inventory. Own src/runtime.ts, src/realm.ts, src/evaluator.ts; host callable fixtures and existing compiled drivers identified in that design; relevant runtime-read fixtures; scoped feature/interface documentation and docs/validation/ts-017a/. Claim this entry before work. Coordinator owns COORDINATION.md; Claude companion outputs and roadmap are reserved.

Require readonly defining Realm in both callable variants and readonly constructor-installed callable slot. Replace generic createFunction with createGuestFunction; factories stamp their own Realm, and bootstrap F explicitly stores its Realm without executing partial initialization. Migrate every raw callable fixture atomically with explicit ownership, preserving intentional null roots, metadata absence and existing assertions. Do not guess owner from prototype, environment, registration target or calling evaluator.

Use one stable OperationContext per evaluator backed by a private mutable active-Realm view. Call validates callable and existing call limit before entry, saves caller Realm, increments calls, enters defining Realm, retains guest lexical environment, and restores Realm/calls in finally for every completion and host exception. Keep steps monotonic and counters shared across foreign reentry; no new evaluators, ticks, global ambient state, casts or public mutable context API. Add finally cleanup to admitted statement/expression depth without resetting caller frames. Preserve exact error diagnostics, guard ordering and strict receiver profile.

Implement readable expected-result R1-R22 tests: guest/builtin/F ownership, foreign nested closures/allocations and lexical captures, A/B/C reentry and live saved context, borrowed third-Realm call, exact throws/locations and host faults/illegal completions, guard failures and shared call/step/depth budgets, separate evaluator independence, prototype changes not changing ownership, direct versus builtin map allocation, coercion reentry/restoration and silent bootstrap. Replace only documented caller-Realm expectations with defining-Realm expectations; preserve all other identities, traces, limits and cases. Keep all 163 guest cases and 22 static gates; extend existing drivers rather than replacing denominators. Preserve the accepted isolated conversion-driver import workaround.

No async/jobs/modules/generators, constructors/species, bound/proxy functions, boxing/Error objects, tail-call elimination, new standard methods or unrelated cleanup. Typecheck, runner/probes, rebuilt Node/native and every static build/coverage gate are required. Reduce actual compiler failures before workarounds; do not change pins. Retain evidence and honest limitations, commit/push coherent tested work, then stop for coordinator review. No C++/Claude/COORDINATION edits, branch switching, main merge or successor dispatch.

TS-017A handoff (2026-11-02): immutable callable ownership, atomic factory/fixture migration, stable active-Realm context, synchronous finally restoration and admitted AST-depth cleanup implemented. R1-R22 extend existing compiled drivers with exact expected results; all 163 guest cases and 22 static-only/coverage gates retained. Typecheck, runner 20/20, probes 10/10, rebuilt Node 163/163 and native 163/163 pass, no skips. No new compiler failure/workaround or pin change; conversion side-effect import preserved. Evidence and matrix map: docs/validation/ts-017a/README.md. Initial sandbox Zig installation-access failure retained separately; authorized native validation passes. No excluded areas or successor work changed. Ready for coordinator review.

TS-017A review follow-up (2026-11-02): expanded the requested R1/R9 guest setup and new R10 try/catch blocks; moved operation-context and primitive-conversion success messages after all assertions. No production change or assertion weakening. Complete rerun passes typecheck, runner 20/20, probes 10/10, rebuilt Node/native 163/163 and all 22 static gates. Coordinator's initial Zig link failure retained separately; no recurrence or pin/cache/gate change. Evidence: docs/validation/ts-017a/review-followup/. Ready for coordinator re-review.

Coordinator acceptance: TS-017A accepted final `b02cfc3` (production `9a66cd7`) on 2026-11-02. Reviewed follow-up and independently rebuilt Node/native 163/163 with all 22 static gates. Initial Zig file-open failure did not recur; no pins or gates changed. Supersedes awaiting-review status.

### TS-018P — Primitive wrappers and default object conversion design

Status: **in progress**. Owner: Codex design chat `01a199b3-8329-7563-9a5b-9ee9c06aa9d6`; assigned base `d2c6087`, branch `codex/primitive-computed-keys`. Prerequisite TS-017A accepted `b02cfc3`. Design only. Own docs/primitive-wrappers.md, docs/validation/ts-018p/, optional isolated probes for observed uncertainty, and this task's claim/handoff. Coordinator owns COORDINATION.md; Claude queue is reserved.

Resolve the next dependency for real Object.prototype.valueOf/toString: ToObject and meaningful Boolean/Number/String wrapper representation, internal slots, intrinsic prototype graph/bootstrap and defining-Realm allocation. Inspect actual runtime/property/string/call/coercion code and the future-method requirements in realm-intrinsic-prototypes.md. Consult fixed ECMAScript and pinned relevant engine sources. Specify exact APIs, object identity versus fresh primitive boxing, null/undefined errors and readonly internal primitive data; do not fabricate empty wrappers or return raw primitives as standard valueOf. Decide bounded stages before implementation, including what String exotic indexed properties/length require and which existing object operations must participate. Address UTF-16, surrogate indices, descriptor compatibility, own keys/order and extensibility. Distinguish explicit ToObject from implicit member access, receiver boxing and constructor/global exposure; do not implicitly authorize those features.

For eventual Object toString, inventory representable tags and real symbol/toStringTag dependency; state any deliberately restricted profile as a decision requiring coordinator review. Do not use a string key pretending to be a symbol or diagnostic display as conversion. Specify receiver behavior, borrowed cross-Realm calls, zero-hook conversion boundaries and observable ordering. Identify exact current no-method expectations that later batches would change, preserving null-root negatives and direct primitive-only converter contracts. Produce fixed expected-result tests for each proposed atomic stage, complete caller/fixture migration inventory, native risks, explicit exclusions and smallest next implementation assignment. Prefer a coherent small dependency step over implementing wrappers and all methods at once. No production/test/manifest/pin/C++/Claude changes, branch switching, main merge or successor dispatch. Record evidence versus inference, commit/push design, stop for review.

TS-018P handoff (2026-11-02): design candidate complete, awaiting coordinator
review. See [primitive wrappers](docs/primitive-wrappers.md) and
[inspection evidence](docs/validation/ts-018p/README.md). Recommends one atomic
wrapper/String-dispatch/Realm/explicit-ToObject batch (W1-W19), then a separate
Object valueOf batch (V1-V8). Object toString remains blocked on real symbol/tag
design, with T1-T8 future requirements; no restricted tag approximation is
authorized. Includes exact APIs, dispatch and bootstrap invariants, defining-Realm
allocation, caller/fixture migrations and preserved zero-hook/null-root boundaries.
Documentation checks only; no production change, compiler probes or new native
claim. TS-017A's 163/163 both-host and 22 gates are inherited evidence. No successor
or CL-004 work started. Status remains in progress until coordinator acceptance.

Coordinator acceptance: TS-018P accepted `7b6021a` on 2026-11-02. Reviewed full design, inventories and current descriptor traversal/Realm/string backends against fixed String exotic algorithms. Documentation-only; no new compiler/runtime evidence. Stage A is ready; B requires its own later contract and C remains blocked on symbol/tag design.

### TS-018A — Primitive wrappers and explicit ToObject

Status: **in progress**. Owner: Codex implementation chat `01a199c0-93a2-75c3-a8b2-df2a493e111e`; base `cc755f7` (clean checkout). Prerequisite TS-018P accepted `7b6021a`. Implement only stage A and W1-W19 in docs/primitive-wrappers.md. Own new src/primitive-objects.ts and src/object-conversion.ts, src/property-keys.ts stringIndex, scoped src/runtime.ts descriptor traversal and src/realm.ts roots/factories; existing compiled realms/object-descriptors/object-prototypes/object-keys/definition-dispatch/array-map drivers and their runtime-read fixtures as needed; scoped docs and docs/validation/ts-018a/. Coordinator owns COORDINATION.md; preserve Claude queue and assistance paths.

Implement explicit readonly scalar Boolean/Number/String payloads and per-Realm B/N/S roots with false/+0/empty-string payloads inheriting O. Preserve existing O/F/A, callable owners, Number namespace and metadata. Factories create fresh wrappers; ToObject preserves exact existing object identity, boxes supported primitives in context.realm and rejects null/undefined with the frozen located TypeError, with zero Get/Call/tick operations. No optional generic slots, fake empty boxes, hidden unboxing or new globals.

Implement String virtual UTF-16 unit descriptors and ordinary readonly length. Share canonical string-index recognition with no array-index ceiling. Compatible virtual-index definitions succeed without inserting storage, even when nonextensible; incompatible definitions/sets/deletes reject correctly. Keep semantic and bootstrap validation consistent. Order virtual indices, remaining ordinary array indices and ordinary string keys as specified; return detached descriptors/key arrays/properties snapshots. Update Get/Has/Set prototype traversal to dispatch getOwnProperty at each object while retaining Receiver, iterative traversal and completion behavior. Preserve data-only scope and existing arrays/observers; do not claim arbitrary proxy/accessor support or eagerly materialize all code-unit properties.

Cover all W1-W19 with readable expected results: graph/freshness/identity/nullish errors; signed zero/NaN/infinities/truthiness; surrogate pairs/lone surrogates/NUL; canonical/ordinary keys and numeric versus string -0; descriptors, deletes, nonextensibility and inherited/receiver Set; detached snapshots and payload identity; A/B/C boxing/restoration/budgets; explicit String map/length consumption; unchanged primitive-base failures and direct-converter zero-hook rejection; silent bootstrap and large-index helper-only boundary. Retain all 163 cases and 22 static gates, extending existing drivers. No fixture or assertion removal; success output must follow all assertions. Preserve the accepted conversion-driver import workaround.

Do not add Object.valueOf/toString, wrapper methods, symbols, constructors, implicit member/receiver boxing, global bindings, accessors/proxies, species or asynchronous execution. Run typecheck, runner/probes, rebuilt Node/native and every static build/coverage gate. Reduce actual compiler failures before workarounds; retain evidence and do not change pins. Record exact limitations; commit/push coherent tested work then stop for review. No C++/Claude/COORDINATION edits, branch switching, main merge or successor dispatch.

TS-018A handoff (2026-11-02): stage A implemented; coordinator acceptance pending.
Readonly scalar wrappers, per-Realm B/N/S roots/factories, explicit zero-hook
ToObject, virtual UTF-16 String descriptors/keys/snapshots and descriptor-aware
iterative Get/Has/Set are covered by W1-W19 across the existing six drivers.
Typecheck, runner 20/20, probes 10/10, rebuilt Node/native 163/163 and all 22 static
build/coverage gates pass, no skips. Retained original compiler coverage failure
and seven-statement reduction justify three test-only explicit callback return
types; no production workaround, pin/gate weakening or conversion import change.
Initial Zig sandbox-access failures and successful runs are retained separately.
Evidence and exact matrix map: docs/validation/ts-018a/README.md. No excluded stage
B/C work, C++, Claude, COORDINATION, branch switch, main merge or successor work.
Ready for coordinator review; status remains in progress until acceptance.

Coordinator acceptance: TS-018A accepted `254c097` on 2026-11-02. Reviewed wrapper/dispatch/boxing source, W1-W19 tests and reduced test-only callback annotation fix. Independently rebuilt Node/native 163/163 each and all 22 static gates. Supersedes awaiting-review status.

### TS-018B — Object.prototype.valueOf

Status: **in progress — implemented, awaiting coordinator review**. Owner: Codex TS-018B implementation chat; assigned base `4eb47bd`, checkout at claim `38f3f4b` (existing commits preserved). Prerequisite TS-018A accepted `254c097`. Implement only stage B/V1-V8 in docs/primitive-wrappers.md. Own src/builtins/object.ts, minimal src/realm.ts registration, new compiled test/object-valueof.ts and runtime-read test/fixtures/object-valueof.js with required driver registration; exact inherited-method/initial-key migrations in existing drivers; scoped docs and docs/validation/ts-018b/. Coordinator owns COORDINATION.md; Claude queue reserved.

Install one fresh valueOf builtin per Realm on O through existing registerBuiltin: name valueOf, length 0, method W/E/C true/false/true, metadata false/false/true, function prototype F and defining Realm captured by factory. Register after roots exist. Body performs accepted toObject(receiver, context, loc), returns its object in a normal object Value or propagates throw unchanged; ignore extra args without inspecting/coercing them. No new evaluator, ticks, hidden primitive unboxing, constructor back-link or other methods.

Implement V1-V8 with readable host and runtime-read guest tests: exact object identity for all kinds/foreign/null-root objects and no property reads; fresh meaningful primitive boxes including negative zero/NaN/UTF-16 strings; undefined/null exact diagnostic/location and argument effects before error; detached/saved/borrowed method calls and own shadowing; A caller -> C.call -> B.valueOf box in B, restoration and shared call/step limits; exact per-Realm metadata/mutation isolation and surviving saved method; ordinary coercion still ends in TypeError without toString, now genuinely invoking inherited valueOf; direct converters and explicit-hook/null-root negatives unchanged. Verify host/guest abrupt cleanup through surrounding bridges and guards without changing receiver semantics.

Before editing existing expectations, search all current root-key/missing-valueOf checks. Update O exact keys to [valueOf] and inherited presence on F/A/B/N/S, while preserving each root's own keys, null-root absence, missing constructor/toString/join/map and all isolation tests. In particular realms G17/G11/W1/W17 now observe inherited valueOf; preserve their negative conversion result and zero-hook direct converter assertions. Audit other parsed no-method and tight-budget cases; explicitly record any changed call-limit expectation caused by the new real inherited call, with a positive trace proving why. Do not delete negative intent, suppress legitimate ticks/calls, or loosen exact messages to make tests pass. Retain all 163 cases and 22 gates; new driver adds at least one expected-result entry and static gate (minimum 164/23).

Consult fixed specification Object.prototype.valueOf and pinned relevant engine source. Typecheck, runner/probes, rebuilt Node/native and all static build/coverage gates required. Retain actual failures/reductions before compiler workarounds, preserve pins and accepted isolated imports/annotations. Document that default conversion remains incomplete; no Object global, primitive member/receiver boxing, wrapper methods, toString, symbols/accessors, constructors/species or async work. Commit/push tested coherent work, then stop for review. No C++/Claude/COORDINATION edits, branch switching, main merge or successor dispatch.

TS-018B handoff (2026-11-02): implemented one per-Realm Object valueOf through accepted ToObject and registration; runtime-read fixture/new compiled driver cover V1-V8. Only realms G17/G11/W1/W17 initial-key/presence expectations migrated. Existing conversion negatives and budget expectations retained; new trace proves inherited valueOf is called between lookup ticks and can exhaust call depth. No reference, converter, evaluator or wrapper-storage change. Typecheck PASS, runner 20/20, probes 10/10, rebuilt Node/native 164/164 each with no skips; all 23 static-only builds/separate coverage gates PASS (CLI 1223, realms 1548, valueOf 1365 static statements). Retained Zig sandbox failure then successful approved rebuild, and reduced throw-only test-callback dynamic adapter fixed by explicit ValueCompletion return annotation. Pins/imports unchanged. Evidence and full expectation audit: [docs/validation/ts-018b/README.md](docs/validation/ts-018b/README.md). Awaiting independent review; no successor dispatched.

Coordinator acceptance: TS-018B accepted `b63d882` on 2026-11-02. Reviewed implementation, V1-V8, registration, exact expectation migrations and retained evidence. Independently rebuilt Node/native 164/164 each, all 23 static gates. Supersedes awaiting-review status.

### TS-019P — Symbol identity and property-key foundation design

Status: **in progress — design complete, awaiting coordinator review**. Owner: Codex TS-019P design chat `01a199dc-85b9-7592-b055-6a5814f8243a`; assigned base `9b8b81d`, inspected checkout `4e36a69` (dispatch preserved), branch `codex/primitive-computed-keys`. Prerequisite TS-018B accepted `b63d882`. Design only. Own docs/symbol-foundation.md, docs/validation/ts-019p/, optional isolated probes for genuine uncertainty, and this task claim/handoff. Coordinator owns COORDINATION.md; Claude corpus research/assistance paths remain reserved.

Resolve the symbol/tag dependency documented in primitive-wrappers.md before Object toString. Inspect actual Value, PropertyKey/storage/snapshots/ordering, every key consumer, conversions/equality/truthiness/display, parser/evaluator and Realm boundaries. Consult fixed ECMA-262 and pinned relevant engine sources. Specify explicit symbol identity/description representation with no string-key emulation; same-description identities differ, transferring symbols preserves identity. Decide and justify well-known symbol sharing across related Realms versus independent execution agents without introducing an accidental ambient mutable Realm. Describe lifecycle/ownership and precise constructors/APIs. Distinguish internal symbol creation, guest Symbol factory/global, registry/for/keyFor, well-known properties and wrapper/prototype support; stage these deliberately rather than assuming all are one task.

Produce a complete exhaustive-switch/key-operation migration inventory: string/symbol property ordering, deletion/reinsertion, descriptors, snapshots, String/Array numeric-index filtering, prototype/receiver operations, diagnostics which must not implicitly coerce a symbol, ToPropertyKey preserving primitive symbols, ToNumber/ToString rejection versus explicitly descriptive formatting, equality/truthiness and operator ordering. Address Symbol boxing and required ToObject behavior once Value can represent it. Resolve how newly representable well-known toPrimitive interacts with the existing ordinary helper and budgeted effectful lookup; do not silently expose a symbol that the relevant semantics ignore. Separate foundation stages from guest exposure and Object toString/tag lookup, and state honest intermediate limits. No accessor/proxy/constructor or global registry expansion without a frozen later contract.

Deliver exact staged APIs and fixed expected-result matrices covering identity/cross-Realm transfer, symbol versus same-spelling string, numeric/string/symbol key order, ordinary/Array/String storage, wrappers/conversion errors and no accidental formatting, object-key coercion and abrupt ordering, own/inherited real tag symbols and same-description nonmatching symbols, lookup/reentry/budgets and all existing negatives. Identify minimal next atomic implementation with complete caller/fixture scope; preserve 164 cases/23 gates and pinned compiler constraints. Existing isolated Map probes are evidence only for their measured forms, not integrated support. Optional probes must target real uncertainty and retain both-host/static coverage results. No production/tests/manifests/pins/C++/Claude/COORDINATION changes, branch switching, main merge or successor dispatch. Commit/push design then stop for coordinator review.

TS-019P handoff (2026-11-02): [docs/symbol-foundation.md](docs/symbol-foundation.md) freezes proposed A ordinary symbol identity/key/boxing foundation, B1 real @@toPrimitive with budgeted lookup, B2 Symbol conversion methods, and C real tag consumer. A is the minimal next implementation recommendation, not an assignment. Specifies shared immutable well-known identities across Realms/agents in a runtime and the unimplemented process-transfer boundary; no per-Realm symbol minting, fake string symbols, registry or premature protocol exposure. Symbol root has no payload; Symbol tag comes from the real property and falls back to Object when absent. Covers all six Value switches, storage/snapshots/index filters/diagnostics, caller and narrow-observer migrations, operation order, exact proposed errors and A/O/P/T expected-result matrices. Fixed ECMA-262 2025 and pinned engine262 evidence recorded in [docs/validation/ts-019p/README.md](docs/validation/ts-019p/README.md). Documentation-only whitespace/scope checks pass; no new execution/probe/compiler claim, accepted 164/164 per host and 23 gates remain the baseline. Pins/workarounds preserved. No production, tests, manifests, C++, Claude or COORDINATION changes; no successor dispatched. Stop for coordinator review.

Coordinator acceptance: TS-019P accepted `eaf73d4` on 2026-11-02. Reviewed complete staged design/matrices, current conversion/evaluator/key paths and inventories; independently checked fixed-spec shared well-known identities and Symbol root without SymbolData. Documentation-only, no new native/runtime claim. Stage A is ready; later protocols require separately frozen contracts.

### TS-019A — Ordinary symbol primitives and property keys

Status: **in progress**. Owner: Codex implementation chat `01a199e9-c608-7162-952d-a1a1a3465f4d`; base `c80ee2c`. Prerequisite TS-019P accepted `eaf73d4`. Implement only stage A, A1-A24 and O1-O6 in docs/symbol-foundation.md. Own new src/symbols.ts; scoped runtime.ts, conversion.ts, property-keys.ts, primitive-objects.ts, object-conversion.ts, realm.ts; audit-only or strictly necessary symbol compatibility changes in array-object/primitive-conversion/evaluator. Own listed affected compiled drivers, narrow-key observer migrations and runtime-read fixtures in the design, scoped docs and docs/validation/ts-019a/. Coordinator owns COORDINATION.md; Claude corpus queue/assistance reserved.

Use GuestSymbol class reference identity with readonly optional UTF-16 description; add symbol Value arm and string-or-symbol PropertyKey. Preserve identity across Values/keys/Realm transfers; no string encoding, host Symbol, interning, counters or registry. Keep one Map storage and exact key references. Partition own keys into numeric strings, other strings and symbols; preserve each snapshot contract, descriptor rules, deletion/reinsertion ordering, Receiver/prototype traversal. Guard index helpers for nonstrings; symbols never trigger Array length or String virtual-index handling and survive array shrink.

Add all exhaustive symbol cases: truthiness/identity, explicit diagnostic display, exact numeric/string TypeErrors with source location, ToPropertyKey preserving symbol payload after ordinary string-hint conversion, and ToObject boxing in active Realm. Symbol root is an ordinary object without a payload, distinct per Realm; wrappers have readonly symbolData and retain payload after relinking. Object.valueOf boxes symbols through ToObject. Direct converters still reject all objects without hooks. Format diagnostic keys explicitly without implicit host/guest coercion; successful operations must never format keys. Preserve operation-specific evaluation/conversion ordering, shared budgets, exact throws and current primitive-base rejection.

Implement all A/O matrix expectations with readable fixed-result tests, including same-description distinct keys versus strings, cross-Realm transfer, mixed key ordering, descriptor/snapshot/array/String behavior, inherited and distinct Receiver cases, conversion errors, symbol-returning ordinary hooks, runtime-read computed reads/writes/member calls, exact guest throws/diagnostics, symbol array lengths and first/second conversion failure. Widen all listed key-taking observer overrides even if variance checking permits narrower types. Compare mixed keys by identity, not formatting; add explicit string-only checks before retaining old key joins. Keep every 164 case and 23 gate; extend existing drivers without manifest churn. Preserve original negative intent and measured compiler imports/annotations.

No guest Symbol global/factory/registry, well-known symbol constants, exotic toPrimitive protocol, Symbol methods, Object toString, parser features, implicit boxing, accessors/proxies or constructors. Run typecheck, runner/probes, rebuilt Node/native and all static-only builds/separate coverage gates. Reduce real compiler blockers before workarounds, retain original/reduced evidence; no pin changes or relaxed gates. Record exact limits, commit/push tested coherent work, then stop for review. No C++/Claude/COORDINATION edits, branch switch, main merge or successor dispatch.


TS-019A handoff (2026-11-02): stage A implemented; coordinator review pending.
GuestSymbol reference identity, symbol Value/PropertyKey, single mixed-key Map,
category ordering/detached snapshots, explicit diagnostic formatting and located
conversion errors, and defining-Realm Symbol boxing with payload-free root are
implemented. All A1-A24/O1-O6 are mapped to assertions in existing drivers and
runtime-read bridge fixtures. All listed observers widened; mixed keys compared
by identity and legacy joins checked for strings. Previous negatives, exact
budgets, 164 cases and 23 gates preserved. Typecheck PASS, runner 20/20, probes
10/10, rebuilt Node/native 164/164 each, and 23/23 static builds/separate coverage
gates PASS. No compiler workaround or pin/import change; retained initial Zig
sandbox-access failures and successful authorized rerun. Complete production and
fixture migration inventory, matrix and transcripts: docs/validation/ts-019a/README.md.
No guest Symbol global/registry/well-known protocols/methods, parser or implicit
boxing expansion. No C++/Claude/COORDINATION edits, branch switch, main merge or
successor dispatch. Status remains in progress until coordinator acceptance.

Coordinator acceptance: TS-019A accepted `b093e3f` on 2026-11-02. Reviewed production identity/key/conversion/boxing changes, full matrix and observer migrations. Independently rebuilt Node/native 164/164 each, no skips; all 23 static build/coverage gates pass. Supersedes awaiting-review status.

### TS-019B1 — Real symbol primitive-conversion protocol

Status: **in progress**. Owner: Codex TS-019B1 implementation chat `01a199f9-8e1b-7ce1-a6d2-c2d5b23f1585`; accepted base `aab04a2`, existing branch `codex/primitive-computed-keys`. Prerequisite TS-019A accepted `b093e3f`. Implement only B1/P1-P9 in docs/symbol-foundation.md. Own src/symbols.ts and src/primitive-conversion.ts, affected compiled drivers/runtime-read fixtures, scoped feature documentation and docs/validation/ts-019b1/. Coordinator owns COORDINATION.md; Claude corpus queue/assistance remains reserved.

Export one immutable canonical wellKnownToPrimitive GuestSymbol with description Symbol.toPrimitive, shared across all Realms/evaluators in this runtime. No host Symbol, registry, per-Realm minting or guest global. Change only object ToPrimitive: tick once before one internalGet of that exact key with original input Receiver; propagate abrupt unchanged; null/undefined alone mean absent; other noncallable values fail with located TypeError `symbol toPrimitive method is not callable`. Call callable through existing context.call with original receiver and one exact hint string. Return any primitive unchanged; object result fails with located `cannot convert object to primitive`, without fallback. Absent hook alone uses ordinaryToPrimitive with default mapped to number. Primitive fast path and direct ordinary helper retain their existing ticks and behavior. No context/Get signature redesign, accessor claim or hidden evaluator.

Implement P1-P9 using readable expected-result tests and runtime-read guest consumers: canonical identity versus same-description/string impostors, own/inherited hooks, exact receiver/hint/order, nullish fallback, all noncallable categories, object result without fallback, every primitive result, exact Get/Call sentinel identity, tick failure preventing lookup, cross-Realm entry/restoration and shared budgets on normal/guest-throw/host-fault paths, direct ordinary helper ignoring real key, recursive-hook budget cleanup, and two complete Array length conversions observing hook replacement with correct mutation/abrupt ordering. Preserve accepted assignment/call evaluation order. Existing ToPropertyKey, addition, numeric, relational, length and map consumers must be exercised through the protocol, not just a direct helper test.

Before migrating expectations, inventory every ToPrimitive consumer, narrow observer, recorded lookup trace and tight step/call budget. Each object conversion now adds exactly one lookup tick, even when absent; direct ordinary conversion and primitives do not. Preserve original negative intent: ordinary-method-specific observers should explicitly report absent for the new key, while generic throwing-Get observers still fail on the first lookup. Explain each changed exact budget/trace in retained evidence; never loosen assertions or suppress legitimate ticks to pass. Retain all 164 cases and 23 gates; prefer extending existing compiled drivers and runtime-read fixtures, register any genuinely needed extra driver fail-closed.

Consult fixed specification and pinned relevant engine evidence. Require typecheck, runner/probes, rebuilt Node/native and every static-only build plus separate coverage gate. Retain actual compiler failures/reductions before any workaround; preserve toolchain pins and accepted isolated imports/annotations. Document partial support: no Symbol prototype methods, toStringTag, Object toString, guest Symbol global/registry, accessors/proxies, implicit boxing or async work. Commit/push tested coherent work, then stop for coordinator review. No C++/Claude/COORDINATION edits, branch switching, main merge or successor dispatch.

TS-019B1 handoff (2026-11-02): implementation complete, awaiting coordinator review.
Shared canonical wellKnownToPrimitive and one budgeted real-key Get/Call path
implemented; nullish fallback, exact errors and primitive/ordinary boundaries
preserved. P1-P9 extend the existing compiled driver and a runtime-read fixture;
key/operator/length/map consumers and exact observer/budget migrations are mapped
in docs/validation/ts-019b1/README.md. Typecheck PASS, runner 20/20, probes 10/10,
rebuilt Node/native 164/164 each with no skips, all 23 static builds/separate
coverage gates PASS (CLI 1260, primitive-conversion 1760). No new compiler
workaround or pin/import/annotation changes. Initial Zig sandbox failure retained
alongside successful authorized native validation. No B2/C, Symbol methods/tag/
global/registry, Object toString, accessors or implicit boxing expansion. No C++,
Claude, COORDINATION, branch switch, main merge or successor work. Stop for review.

TS-019B1 readability follow-up: coordinator-requested formatting/typed test data
and named lookup-prefix pass completed without production or assertion changes.
Typecheck and rebuilt Node/native suites pass 164/164 again. Three affected
native drivers rebuilt static-only with separate passing coverage (primitive
conversion 1761, length coercion 1538, object valueOf 1471); remaining 20 gates
unchanged from the full passing run. Final follow-up evidence is retained in
readability-native.log/readability-native-build-results.json and refreshed host
execution records. Coordinator acceptance remains pending.

Coordinator acceptance: TS-019B1 accepted final `f3a381e` (production `cfe56bb`) on 2026-11-02. Reviewed full protocol/tests/migrations and focused readability follow-up. Independently rebuilt Node/native 164/164 each, no skips, all 23 static builds/separate coverage gates pass. Supersedes pending acceptance.

### TS-019B2 — Symbol prototype conversion methods

Status: **in progress**. Owner: Codex implementation chat `01a19a13-8caa-72f0-8395-1529fadf8ee7`; accepted base `e5bffe3`, dispatch `8f7b6ee`, existing branch `codex/primitive-computed-keys`. Prerequisite TS-019B1 accepted `f3a381e`. Implement B2/P10-P11 from docs/symbol-foundation.md only. Own new src/builtins/symbol.ts, minimal Realm registration, existing compiled drivers/runtime-read fixtures and scoped docs/validation/ts-019b2/. Coordinator owns COORDINATION.md; Claude assistance paths remain reserved.

Add thisSymbolValue and registerSymbolConversions using the frozen design API. Accept symbol primitives and actual GuestSymbolObject payloads regardless of prototype/Realm; otherwise located TypeError `receiver is not a symbol`. Never infer slots from prototype/properties or invoke receiver hooks. The ordinary Symbol root has no payload. Install fresh per-Realm valueOf/name valueOf/length0 and toString/name toString/length0, properties W/E/C true/false/true. Install canonical wellKnownToPrimitive method name [Symbol.toPrimitive]/length1 with false/false/true property attributes using createBuiltin/bootstrapDefine. Function metadata remains false/false/true, defining Realm ownership and functionPrototype linkage retained. Register toString then valueOf then canonical hook for deterministic own-key order. Hook ignores hint/extra arguments without coercing or inspecting them. Use existing descriptive-string helper; no new ticks or evaluator in method bodies.

Cover P10/P11 with readable compiled expected-result tests and runtime-read guest calls: primitive and real-box identity (including foreign/relinked boxes), undefined/empty/UTF-16 descriptions, root/lookalike/all other receiver categories failing with exact message/location, no receiver property reads, ignored effectful extra arguments, exact metadata/key identity/order and Realm mutation isolation. Borrow through Function.call across A/C/B and verify ownership/restoration/shared limits for success and invalid-receiver throw; preserve existing host-fault cleanup regressions. Saved functions continue working after deletion/replacement. Verify hook is readonly but configurable: inherited assignment fails, own explicit definition can shadow where descriptors allow, deletion changes subsequent conversion rather than hard-coded unboxing.

Default/number/string ToPrimitive on an intact box returns its payload; ToPropertyKey(box) preserves identity, implicit numeric/string operators reject the resulting symbol, and explicit prototype toString succeeds. After hook deletion ordinary string hint observes toString first, number/default observe valueOf first, with fresh method lookups and exact ticks/calls. Replacements and object-returning hooks keep normal fallback/error semantics. Direct numeric/string converters remain primitive-only and reject objects without hooks. Object.valueOf still boxes symbol primitives rather than extracting payloads.

Audit every empty-Symbol-root/missing-method/boxed-symbol conversion expectation before changing it, particularly realms/object-valueof/conversion/primitive-conversion drivers. Update only newly implemented behavior; retain root-without-payload, null-root, direct-converter, ordinary-object negative intent and budgets with explicit reasons. Preserve all 164 cases and23gates; extend existing drivers where practical and fail-closed register any needed new driver. No Symbol global/factory/registry, description accessor, constructor backlink, toStringTag, Object toString, implicit member boxing, parser or async work. Symbol remains a deliberately partial surface.

Consult fixed ECMA-262 2025 sections20.4.3.3–5 and pinned engine evidence. Require typecheck, runner/probes, full rebuilt Node/native and every static-only build/separate coverage gate. Retain reductions before compiler workarounds; preserve pins/import workarounds. Commit/push tested coherent work and stop for review. No C++/Claude/COORDINATION edits, branch switch, main merge or successor dispatch.

TS-019B2 handoff (2026-11-02): implementation complete, awaiting coordinator review.
Added slot-based thisSymbolValue and per-Realm toString/valueOf/canonical
toPrimitive methods with frozen metadata and descriptors. Extended P10/P11
assertions compile through the existing object-valueOf driver; runtime-read
fixture covers guest calls, ignored argument effects, boxed keys and exact
operator/receiver/readonly failures. Deletion/replacement, foreign/relinked
boxes, root negatives, direct-converter limits and exact ticks/calls are covered.
Only the newly implemented intact-box/root-key expectations changed; retained
null-root, ordinary-object and host-fault cleanup negatives. Typecheck PASS,
runner 20/20, probes 10/10, rebuilt Node/native 164/164 each, no skips, and all
23 static-only builds/separate coverage gates PASS (CLI 1282, object-valueof
1694). No compiler workaround, pin/import/annotation change or gate relaxation.
Initial missing-Zig-PATH failures and successful authorized rerun retained in
docs/validation/ts-019b2/ with full matrix and migration audit. No C/tag/Object
toString/global/registry/accessor/implicit boxing expansion, C++/Claude/
COORDINATION edit, branch switch, main merge or successor work. Stop for review.

Coordinator acceptance: TS-019B2 accepted `0127007` on 2026-11-02. Reviewed slot extraction, per-Realm method registration/descriptors, complete P10/P11 module and guest fixture, precise inherited expectation migration and retained evidence. Independently rebuilt Node/native164/164 each, no skips; all23 static builds/separate coverage gates pass.

### TS-019C — Object toString and real symbol tags

Status: **in progress**. Owner: Codex TS-019C implementation chat; accepted base `eced90f`, branch `codex/primitive-computed-keys`. Prerequisite TS-019B2 accepted `0127007`. Implement C/T1-T8 in both docs/symbol-foundation.md and docs/primitive-wrappers.md (their T identifiers describe complementary matrices). Own src/builtins/object.ts, minimal symbols.ts/Realm/Symbol registration changes, affected compiled drivers/runtime-read fixtures, scoped documentation and docs/validation/ts-019c/. Coordinator owns COORDINATION.md; Claude assistance queue remains reserved.

Export shared immutable wellKnownToStringTag with description Symbol.toStringTag. Install fresh per-Realm Object.prototype.toString through registerObjectToString, name toString/length0, W/E/C true/false/true; standard function metadata/ownership/prototype unchanged. Register after existing Object valueOf, preserving that key then toString. Install Symbol prototype canonical tag string Symbol with false/false/true attributes after its conversion methods. No guest global/well-known static properties, registry or other tags/methods.

Null/undefined return exact [object Undefined]/[object Null] before boxing, ticks or Get. Otherwise explicit ToObject in defining Realm, classify builtin tag BEFORE observable lookup, tick once then internalGet(actual tag key, boxed object Value, loc) exactly once. Propagate tick/Get abrupt unchanged. Use returned string verbatim including empty/NUL/UTF-16; all nonstrings use builtin fallback without coercion. Retain data-only Get signature; host observers can demonstrate completion/reentry but are not accessor support. Classify Array before callable, then Boolean/Number/String slots, otherwise Object. Roots/relinked wrappers retain genuine tags; lookalike prototypes do not grant slots. Symbol boxes/root use Object builtin fallback: only the real tag provides Symbol, and deletion/nonstring/shadow/relink tests must prove it. No tags for unrepresented Arguments/Error/Date/RegExp kinds; diagnostic strings classify String.

Cover both T matrices with explicit expected results: every representable primitive/object/root, metadata and Realm independence, exact canonical-key ordering versus string/same-description impostors, own/inherited/custom/empty/nonstring tags, no conversion of tag values, genuine slots versus lookalikes, tag deletion/redefinition/shadowing and saved methods. Cross-Realm borrowed B method on A primitive boxes in B, existing A objects retain A chain; observe exact boxed Get receiver. Throwing/reentrant Get, host-fault cleanup, call/step exhaustion and nullish fast paths retain exact completion/location and active Realm/shared budgets. Confirm classification precedes lookup effects using an observer where meaningful. Extra arguments are ignored by body but runtime argument effects still occur.

Freeze the interim exposure explicitly: ordinary objects now coerce to [object Object], numeric NaN and that computed key. Arrays/functions/Boolean/Number/String wrappers temporarily inherit tag strings because their standard overrides remain separate tasks; do not claim complete default conversion for those kinds or implement their overrides here. Symbol wrappers retain B2 protocol behavior. Preserve direct primitive-only converter rejection and implicit member-boxing rejection. Runtime-read fixtures must exercise defaults through addition/numeric/relational/key/length/map consumers, assignment/read/call order, method mutation and explicit negative hooks. Array length={} makes two full conversions then RangeError invalid array length with no length write; array-like object length={} converts to0 (NaN to length). Null-root and explicit both-hooks-return-object still fail. Never cache first conversion/hook/result.

Before edits, inventory all missing-toString/root-own-key/default-object-error assertions, exact traces/tight budgets and negative fixtures across the entire suite. Replace obsolete missing-method expectations with specific new results, while retaining former negative intent using explicit failing methods or null roots where appropriate and documenting why. No blanket expected-output replacement, denominator reduction, suppressed ticks or weakened observers. Count one additional tick per Object toString tag Get, in addition to existing protocol/ordinary lookup ticks and actual calls. Preserve existing tests,164cases/23gates; add a focused driver only if useful and register it fail-closed. Keep code readable and evidence mapped to every matrix row.

Consult fixed ECMA-2622025 Object.prototype.toString20.1.3.6 and Symbol tag20.4.3.6 plus pinned engine source. Require typecheck, runner/probes, full rebuilt Node/native and all static-only builds/separate coverage gates. Retain compiler failures/reductions before workarounds; no pin changes. No C++/Claude/COORDINATION edits, branch switch, main merge, guest Symbol/Object constructors, accessors/proxies, implicit boxing, unrelated builtin expansion or successor dispatch. Commit/push tested coherent work and stop for independent review.

TS-019C handoff (2026-11-02): implementation complete, awaiting independent
coordinator acceptance. Added registerObjectToString, canonical wellKnownToStringTag,
and per-Realm Symbol tag. Classification precedes charged Get; nullish paths
skip boxing/lookup; Symbol fallback remains Object. Both complementary T1-T8
matrices, default-object expectation migrations and exact budgets/completions
are covered by the existing compiled drivers plus runtime-read fixture.
Typecheck PASS, runner 20/20, probes 10/10, rebuilt Node/native 164/164 each with no
skips; all 23 static-only builds and separate coverage gates PASS (CLI 1314,
object-valueof 2040). Retained two minimal SC1090 reductions before local
test-only changes (host class reflection replaced by callable-slot observer;
inherited field given explicit initializer). Zig sandbox failure and successful
authorized validation retained. No production compiler workaround, pin/gate
change, C++/Claude/COORDINATION edit, branch switch or merge. Arrays/functions/
Boolean/Number/String defaults remain explicitly partial inherited tag strings;
Symbol B2 protocol, direct-converter and primitive-member boundaries preserved.
Evidence: docs/validation/ts-019c/README.md. Commit/push bounded work and stop.

Pre-handoff coordinator readability request applied: expanded only new C fixture
functions and multi-effect callbacks/try branches; typed PrimitiveHint list.
Updated four fixed guest diagnostic positions. Final rebuilt Node/native 164/164
and all 23 static/coverage gates pass again; typecheck passes. Evidence refreshed.

Coordinator acceptance: TS-019C accepted `57b6bcb` on 2026-11-02. Reviewed production protocol, both T matrices, final readability/diagnostic updates, deliberate default expectation migrations and reduced test-only compiler failures. Independently rebuilt Node/native164/164 each, no skips, all23 static builds/separate coverage gates pass.

### TS-020 — Boolean and String prototype conversion methods

Status: **in progress**. Owner: Codex TS-020 implementation chat `01a19a3c-debb-7261-b869-2b7622488bc0`, branch `codex/primitive-computed-keys`; accepted base `dd1bb83`, dispatch checkout `f2a3c5d`. Prerequisite accepted TS-019C `57b6bcb`. Close the documented Boolean/String inherited-tag limitation only. Own new src/builtins/boolean.ts and string.ts, minimal Realm registration, affected existing compiled test modules/runtime-read fixtures and scoped docs/validation/ts-020/. Coordinator owns COORDINATION.md; Claude paths reserved. No Number/Array/Function overrides in this task.

Implement explicit thisBooleanValue/thisStringValue slot helpers, following existing Symbol extraction/completion conventions. Accept corresponding primitive or genuine GuestBoolean/GuestStringObject regardless of Realm/prototype, otherwise located TypeError `receiver is not a boolean` / `receiver is not a string`. Roots ARE genuine slot-bearing instances (false/empty string), unlike Symbol root. No coercion, property Get, prototype-based slot inference or new ticks in these helpers/bodies. Ignore extra args without inspecting them.

Install fresh per-Realm toString then valueOf on each root through existing registerBuiltin, names matching methods, length0, W/E/C true/false/true and usual function metadata/owner/functionPrototype. Boolean valueOf returns boolean payload, toString exactly true/false text. Both String methods return exact UTF-16 string payload, with distinct function objects. Preserve String root existing length descriptor and virtual-index behavior; expected own keys length,toString,valueOf. Boolean keys toString,valueOf. No new well-known hook or tag. Preserve explicit Object.valueOf boxing and borrowed Object.toString classification; no hidden unboxing in direct converters.

Required matrix: M1 exact metadata/order/freshness across three Realms; M2 primitives/local/foreign/relinked boxes/roots and fake slot properties, true/false plus empty/NUL/lone-surrogate/paired strings, exact payload and no receiver reads; M3 every other primitive and object/wrapper/lookalike category rejected by each method with exact diagnostic phase/name/message/location; M4 saved/borrowed methods via A->C.call->B, ignored argument expressions execute before call but bodies do not inspect them, normal/error restoration and shared call/step limits, zero body ticks; M5 default/number/string ToPrimitive lookup order and exact tick/call counts, observable replacement/deletion/shadowing and fresh fallback lookup, retained explicit both-object/null-root failures; M6 runtime-read key/addition/unary/numeric/relational/array-length/array-like/map consumers using host-injected real wrappers, exact results and relevant error/order checks (Boolean false box remains truthy as object, number conversion0; String numeric payload versus concatenation); M7 direct primitive-only converters still reject boxes without hooks and primitive member access remains unsupported; M8 Object.valueOf still returns/boxes object and borrowed Object.toString remains tag-based, including Symbol/Number/Array/Function boundaries.

Do not implement protocol shortcuts: deleting methods must expose actual inherited methods and their current semantics. Both Boolean/String ordinary number/default conversion uses valueOf; string hint uses toString. For intact wrappers this needs protocol lookup plus one ordinary lookup and one call, with no Object tag tick. Preserve symbol-hook overrides and exact abrupt records/budgets. Audit all previous root-key/inherited-valueOf/default-tag expectations before changing them, particularly realms, object-valueof, object-tostring and String exotic drivers. Record each migration and preserve negative intent, denominator and precise resource assertions. Number/Array/Function continue explicit interim tag defaults.

Consult fixed ECMA-2622025 Boolean methods20.3.3.2–3 and String toString/valueOf22.1.3 plus pinned engine source; record evidence. Readable code and tests required: expand multi-effect bodies/setup, use typed test tables and fixed expected outcomes. Preserve164cases/23gates; extend current drivers or register any necessary new driver fail-closed. Require typecheck, runner/probes, full rebuilt Node/native and all static-only builds/separate coverage gates; retain reductions before compiler workarounds, no pin changes. No C++/Claude/COORDINATION edits, globals/constructors/backlinks, other String methods, implicit boxing, accessors/proxies, parser/async expansion, branch switch, main merge or successor dispatch. Commit/push tested coherent work then stop for independent review.

TS-020 handoff (2026-11-02): implementation complete, awaiting independent
coordinator acceptance. Added slot helpers and fresh per-Realm Boolean/String
toString/valueOf; roots retain genuine false/empty payloads. No body ticks,
coercion or property reads. Extended object-valueof with M1-M8 compiled tests
and runtime-read fixture. Deliberately migrated realms root keys, inherited
valueOf and payload-conversion expectations; all prior negative intent retained.
Typecheck PASS, runner20/20, probes10/10, rebuilt Node/native164/164 each,
no skips; all23 static-only builds/separate coverage gates PASS (CLI1346,
object-valueof2337). Final test additions were rebuilt in both complete lanes.
Retained initial Zig sandbox linker failure and successful authorized rerun.
No compiler lowering failure/workaround, pin/import workaround/gate change,
C++/Claude/COORDINATION edit, branch switch or main merge. Number/Array/Function
interim defaults, Symbol protocol and primitive-only/member boundaries retained.
Evidence and exact M1-M8/migration map: docs/validation/ts-020/README.md.
Commit/push this bounded work and stop for review; no successors dispatched.

Coordinator acceptance: TS-020 accepted `a3d74fd` on 2026-11-02. Reviewed production slot helpers/registration, full M1-M8 tests/fixture and exact realms migrations. Independently rebuilt Node/native164/164 each, no skips; all23 static build/separate coverage gates pass. Retained typecheck log has a harmless extra EOF blank line; source diff check clean.

### TS-021P — Number prototype conversion and radix backend design

Status: **review needed**. Owner: bounded TS-021P design chat, branch `codex/primitive-computed-keys`, assigned base `051c88b` (checkout dispatch `61a45c7`). Prerequisite TS-020 accepted `a3d74fd`. Design and isolated evidence only. Resolve the remaining Number-wrapper conversion limitation before implementing valueOf/toString. Own docs/number-prototype-conversions.md, docs/validation/ts-021p/ including optional isolated probes and this task claim/handoff. Coordinator owns COORDINATION.md; Claude assistance paths reserved. No production/tests/manifests/pins changes in this design task.

Inspect existing Number namespace, real Number root/box payloads, decimal numberToString backend, primitive-only converters and effectful ToPrimitive/context/budget boundaries. Consult fixed ECMA-2622025 Number.prototype.valueOf/toString, ThisNumberValue and number formatting rules plus revision-pinned relevant engine code. Freeze explicit APIs, metadata/property order, receiver errors and radix errors/locations. Preserve genuine root +0, NaN/-0/infinities, foreign/relinked slots and prototype lookalike rejection. Keep Number namespace noncallable with existing constants/predicates; no constructor/global redesign.

Specify observable order of receiver validation, missing/undefined radix, effectful radix conversion, range validation and special-number formatting. Cover all primitive radix categories, fractional/NaN/infinite/out-of-range radices, object hooks/default hints/symbol results, abrupt identity and reentry/Realm/shared limits. Direct primitive-only converters must retain their current contract; choose a local effectful composition or justify a small separately reviewed helper rather than silently widening all conversions. Explain exact ticks/calls, extra argument handling and behavior after method deletion/shadowing/replacement.

Assess a typed primitive numeric formatting backend for radices2–36 on pinned scriptc0.4.7 and Node. If using host number formatting, prove both static-only build AND separate coverage, runtime-supplied number/radix inputs and fixed expected results; do not merely constant-fold examples or compare two hosts without an oracle. Probe exact integer/power-of-two fractions and representative decimal/special/exponent/subnormal/boundary values; distinguish specification guarantees and implementation latitude for nondecimal fractions. Retain failures/reductions. Existing decimal backend behavior must not regress. No arbitrary radix/precision restriction presented as complete support. If reliable full formatting is blocked, recommend a coherent staged next task (e.g. valueOf first) and explicitly blocked remainder with evidence; do not change pins or implement a large formatter ad hoc.

Deliver a concrete expected-result matrix and full affected expectation inventory (Number root keys, inherited Object methods, numeric/string/default hints, computed keys/operators/length/map, borrowed Object/Symbol/Boolean/String behavior and existing limits). Specify the smallest atomic next implementation and owned files with readable tests/runtime-read fixtures, exact diagnostics/negative intent, metadata/Realm isolation and mutation tests. Preserve164cases/23gates and existing workaround imports/annotations. No Array/Function overrides, other Number formatting methods, parsers, accessors, constructors, implicit boxing, C++/Claude/COORDINATION edits, branch switch or main merge. Commit/push design/evidence and stop for review; no implementation or successors until separately assigned.

TS-021P handoff (2026-11-02): design/evidence complete, awaiting independent
review. docs/number-prototype-conversions.md freezes receiver/radix APIs,
metadata, exact matrices, observable order/budgets, full migration inventory
and a Number valueOf-only next assignment. Full toString is explicitly blocked:
typed host radix formatting passes static-only plus separate coverage (5/5),
84 fixed runtime-input cases on both hosts, and decimal control4/4 coverage
with18 fixed cases; nevertheless both hosts fail exact binary64 rounding-
interval membership for7/23 nondecimal fraction cases. Retained0.3/base3
integer-arithmetic reduction proves an out-of-interval result independently
of host agreement. Passing16 interval cases do not prove shortestness.
Retained initial TypeScript CLI/Zig access failures and dynamic Number-parser
reductions; final typed parseFloat is isolated input plumbing, no production
workaround. Fixed ECMA-2622025 and pinned engine262 consulted. Evidence in
docs/validation/ts-021p/. No runtime support claim, integrated suite rerun,
production/test/manifest/pin/C++/Claude/COORDINATION edit, branch switch,
main merge or successor dispatch. Accepted baseline remains a3d74fd with
independent164/164 both hosts and23 gates. Commit/push this design/evidence
and stop; coordinator owns acceptance and future assignment.

Coordinator acceptance: TS-021P accepted `b27d756` on 2026-11-02. Reviewed full staged API/order/budget/migration design, oracle and reductions; independently checked fixed2025 Number::toString step5. Rebuilt both isolated probes:84/84 radix and18/18 decimal fixed results, static-only/separate coverage passing. Fresh exploratory outputs match retained data; exact rational checker reproduces7 failures and independent0.3/base3 reduction confirms one. No integrated suite rerun or new runtime claim. Full Number toString stays blocked; valueOf-only stage is ready.

### TS-021A — Number.prototype.valueOf only

Status: **in progress**. Owner: Codex TS-021A chat `01a19a57-fdc2-7892-a80c-5e94042d6d78`, branch `codex/primitive-computed-keys`, accepted base `5d57374`, dispatch checkout `9352a9f`. Prerequisite accepted TS-021P `b27d756`. Implement only its smallest next atomic assignment in docs/number-prototype-conversions.md, N1-N8 plus metadata, budgets/mutation, runtime-consumer and migration matrices for the valueOf-only stage. Own src/builtins/number.ts, minimal Realm registration, new test/number-conversions.ts imported by existing object-valueof driver, runtime-read fixture, precise affected realms/Boolean-String tests and scoped docs/validation/ts-021a/. Coordinator owns COORDINATION.md; Claude paths reserved.

Use thisNumberValue returning existing NumberCompletion and registerNumberConversions installing only valueOf/name valueOf/length0 using registerBuiltin. Primitive or genuine GuestNumber payload accepted, including root+0, foreign/relinked/subclass boxes; preserve SameValue -0/NaN/infinities. Other receivers fail with located TypeError `receiver is not a number` without Get/coercion/boxing/ticks. No guest property/prototype can forge a slot. Ignore argument values while preserving normal expression evaluation before invocation. Number root keys exactly valueOf; namespace constants/predicates/noncallability/global binding untouched. Metadata, defining-Realm ownership/freshness/functionPrototype follow established methods.

Implement all valueOf-stage expected results from design: N1-N8, no receiver reads, borrowed/saved calls through A/C/B and cleanup/shared guards, zero-body ticks, actual ordinary lookup and canonical-hook precedence, deletion/shadowing/replacement/fresh fallback, explicit both-object/null-root negatives. Runtime-read wrappers cover numeric/default operators, +0/-0/NaN/infinities, truthiness/identity, exact two uncached Array length conversions and invalid-length atomicity, array-like/map limits/order. String-hint conversion and computed keys deliberately remain [object Number] through Object.toString (three ticks/one call); numeric/default payload uses two ticks/one call. Direct primitive-only converters and primitive member rejection remain unchanged. Borrowed Object valueOf/toString and Symbol/Boolean/String invariants remain.

Repeat and record the design migration inventory before editing expectations. Change only Number root/inherited-method/numeric-hint sites; retain Array/Function interim tags and precise prior negatives/budgets. Preserve164cases/23gates using existing driver; no denominator reduction or gate relaxation. Readable multiline setup/effectful bodies and typed tables, fixed diagnostic positions, meaningful independent expected outcomes required.

No Number toString/radix backend/decimal formatter changes: full formatting remains blocked by confirmed exact-rational failures. No other Number methods, globals/constructors/backlinks, Array/Function overrides, implicit boxing, accessors/proxies, parser or async expansion. Consult fixed spec/pinned engine evidence as needed; require typecheck, runner/probes, full rebuilt Node/native and every static-only/separate coverage gate. Retain compiler failures/reductions before workarounds; preserve pins/import/annotations. No C++/Claude/COORDINATION edits, branch switching/main merge/successors. Commit/push tested coherent work and stop for independent review.


TS-021A handoff (2026-11-02): implementation complete, awaiting independent
coordinator acceptance. Added thisNumberValue/NumberCompletion and only fresh
per-Realm Number valueOf. Genuine +0 root and all exact payloads preserved;
no body ticks/reads/coercion, namespace unchanged. Existing object-valueof driver
now includes N1-N8, metadata/Realm/budget/mutation/consumer matrices and readable
runtime-read fixture. Only the four frozen Number expectation sites migrated;
Array/Function tags and previous negatives remain. String hints/keys intentionally
retain inherited [object Number]. Typecheck PASS, runner20/20, probes10/10,
rebuilt Node/native164/164 each, no skips; all23 static-only/separate coverage
gates PASS (CLI1357, object-valueof2647). Retained Zig sandbox failure and the
separate-coverage failure for an inferred-never throwing test hook. Three-statement
reduction retained before explicit ValueCompletion annotation; no production
workaround/pin/gate changes. Final full lanes rebuilt after that annotation.
Evidence/migrations: docs/validation/ts-021a/README.md. No C++/Claude/COORDINATION
edit, branch switch/main merge, formatting backend or successor implementation.
Commit/push bounded milestone and stop for review; Number.toString remains blocked.

Coordinator acceptance: TS-021A accepted `14e3d9d` on 2026-11-02. Reviewed slot/registration implementation, all staged matrices/fixture, four precise expectation migrations and inferred-never callback reduction. Independently rebuilt Node/native164/164 each, no skips; all23 static-only builds/separate coverage gates pass. Number toString remains blocked.

### TS-022P — Array join and toString design

Status: **review needed** (Codex TS-022P design writer, 2026-11-02; existing `codex/primitive-computed-keys`; assignment base `3c27e10`, observed checkout `38ca424`). Prerequisite TS-021A accepted `14e3d9d`. Design only for the remaining Array default-conversion limitation. Own docs/array-string-conversion.md, docs/validation/ts-022p/ including isolated probes only if needed, and this task claim/handoff. Coordinator owns COORDINATION.md; Claude formatter research and other assistance outputs reserved.

Inspect actual Array storage/prototype, lengthOfArrayLike, ToObject, primitive-only ToString, effectful ToPrimitive, internalGet, intrinsic registration and shared context/budgets. Consult fixed ECMA-2622025 Array.prototype.join/toString plus pinned relevant engines. Specify exact APIs and an atomic or staged implementation boundary. Resolve generic explicit receiver boxing, length snapshot once before separator conversion, missing/undefined separator versus explicit null, observable separator and element string conversion, holes versus inherited properties (Get not Has), nullish elements, symbols, object hooks, mutations during separator/element conversion and fresh indexed reads. Do not delegate guest arrays/objects to host join/String.

Freeze Array toString lookup/call behavior: current join property, callable forwarding and exact receiver/arguments, noncallable fallback to defining-Realm intrinsic Object toString rather than an accidentally replaced public property; require evidence for exact intrinsic capture/identity policy before code. Consider foreign Realm calls, saved/replaced/deleted methods, ordinary lookalikes and explicit boxed String inputs. Keep methods independently recognizable and retain data-only Get limitation. No Array constructor/species, implicit member boxing or unrelated methods.

Resolve recursive/nested/self/mutual array conversion under existing call/step guards, including reentry through separators/elements. Distinguish spec requirements, mainstream cycle conventions and Rift resource limits; do not silently add ambient recursion state or invent zero-cost cycle behavior. Specify any per-operation guard ownership/cleanup only if justified and explicitly staged. Preserve monotonic shared budgets, exact abrupt records/locations, host-fault cleanup and active Realm restoration. Freeze charged boundaries for length/Get/iteration/conversion; do not add arbitrary length caps or pretend finite execution limits are semantic array limits. Describe output-allocation limits honestly without speculative optimization.

Produce fixed expected-result matrices covering empty/sparse/nullish/nested arrays, inherited indices, generic receivers, separator side effects/errors, length/index mutation, symbols/objects, callable/noncallable join overrides and fallback tags, full Realm/metadata/mutation/resource scenarios and runtime-read default operator/key/length consumers. Audit all interim [object Array], missing join/toString, root own keys, Object valueOf fallback and budgets before future migrations. Preserve explicit null-root/both-object negatives and Array/Function/Number stage distinctions. Propose smallest ready implementation with owned files and concrete validation; no implementation in this task.

Keep164existingcases/23gates and pins/workarounds unchanged. Optional probes must answer real compiler uncertainty with runtime inputs, fixed oracles, static-only build plus separate coverage; retain failures/reductions. No production/integrated tests/manifests/C++/Claude/COORDINATION changes, branch switch/main merge or successors. Commit/push coherent design/evidence and stop for independent review. Number radix backend is separately blocked and reserved for Claude CL-005 research, not this assignment.

TS-022P handoff (2026-11-02): docs/array-string-conversion.md freezes generic
join/toString APIs, bootstrap-local capture of the exact defining-Realm Object
toString Value, observable order, explicit boxing and charged boundaries. J1-J30,
T1-T14, R1-R15 and C1-C9 are fixed proposed acceptance rows, not executed tests.
Inspected fixed ECMA-2622025 and pinned engine262/V8 source. First implementation
proposed as atomic TS-022A, with shared call/step guards and explicitly deferred
cycle-empty-string compatibility; no mutable recursion state. Migration inventory
covers four changed assertion sites plus controls that must remain unchanged.
docs/validation/ts-022p retains reproducible inventory (65 source files, 59
candidate lines), source retrieval details and limits. git diff --check passes.
No compiler probe needed or runtime test run: accepted 14e3d9d baseline remains
164/164 both hosts and 23 gates, with no new support claim. No out-of-scope files
changed; Number formatter/CL-005 reserved. Commit/push design then stop for
independent review; implementation, native recursion safety and allocation policy
remain unvalidated.

Coordinator acceptance: TS-022P accepted `1c34ebd` on 2026-11-02. Reviewed full design and actual diff, checked fixed2025 join/toString algorithms and existing conversion/registration interfaces, and independently reproduced the 65-file/59-line inventory without changes. No runtime changed or integrated test rerun; accepted runtime baseline remains14e3d9d. Cycle compatibility and allocation guarantees remain explicitly deferred.

### TS-022A — Array join and toString

Status: **review needed** (Codex TS-022A writer, 2026-11-02; assignment base `4a0f051`). Owner: assigned Codex chat, existing `codex/primitive-computed-keys`. Prerequisite accepted TS-022P1c34ebd. Implement exactly docs/array-string-conversion.md: all J1-J30, T1-T14, R1-R15 and C1-C9 rows, metadata, charged boundaries and migration inventory. Own src/builtins/array.ts, Object registration return signature and Realm-local intrinsic capture, test/array-string-conversion.ts and runtime-read fixture, precise existing test migrations, minimal driver registration, current architecture scope note and docs/validation/ts-022a/. Coordinator owns COORDINATION.md; Claude outputs reserved.

Keep effectful string conversion private, primitive converter unchanged, generic ToObject/length snapshot/Get order and original abrupt completions. Call current join or immutable captured defining-Realm Object intrinsic through context.call with boxed receiver and no arguments. No host guest-array conversion, HasProperty, length/output caps, receiver writes or ambient cycle state. Preserve exact budget and Realm cleanup expectations. Test native default maxCalls=64 self/mutual/separator reentry as well as small exact-boundary cases: a host stack crash is a blocker, not an acceptable resource error. Document deferred cyclic-empty-string compatibility and lack of output-allocation bounds honestly.

Use readable multiline effectful tests and explicit independent oracles. Repeat migration inventory before changing expectations; retain direct Object Array tags, Number string-hint stage, Function defaults and null-root/both-object controls. Preserve all164 existing cases and23 separate static coverage gates; additions may increase counts. Require typecheck, runner/probes, full rebuilt Node/native and every static build plus separate parsed coverage. Retain failures and minimal reductions before compiler workarounds; do not change pins. No C++, formatter/CL-005, constructors, accessors/proxies, implicit boxing, unrelated methods, branch switching/main merge or successor dispatch. Commit/push coherent tested work, hand off evidence and stop for independent review.

TS-022A handoff (2026-11-02): bounded Array join/toString, bootstrap-local exact
Object intrinsic capture, private effectful string conversion and unchanged
shared runtime/evaluator are implemented. J/T/R tests include native self/mutual
and separator/element reentry at the actual default64-call guard, exact small
boundaries, Realm cleanup and original abrupt/host-fault identities. Runtime-read
consumer tests and precise default-Array expectation migrations are included.

Literal frozen acceptance has two pre-existing syntax gaps requiring coordinator
review: C2 `[] == 0` is rejected by the lexer and C3 guest `delete` by the parser.
Their located failures are retained; internal key conversion/deletion is tested,
but neither unsupported guest feature was added or claimed. No successor work.
Additional real Array-default assumptions found in realms G14, operator-coercion
and boolean-string-conversions M8 were migrated after retaining initial failures;
Object/Function/Number and explicit negative controls remain. Test-only unknown
catch equality and inferred-never callback dynamic reports were reduced before
Error narrowing/explicit ValueCompletion annotations. No production workaround
or pin/gate change. Evidence and full matrix mapping: docs/validation/ts-022a/.

Final validation: typecheck; runner20/20; probes10/10; rebuilt Node/native166/166
each, no skips; all24 static-only builds and separate parsed coverage gates.
All existing164 cases/23 gates preserved, plus two cases/one gate. Cycle empty
string compatibility and output-allocation bounds remain deferred. Commit/push
tested milestone, then stop for independent review; no main merge.

Coordinator interim read-only review confirmed the C2/C3 design-oracle
corrections and additional actual Array migrations are appropriate: keep C2/C3
partial rather than expand parser scope. This is not final acceptance or an
independent rebuild. Implementation writer stops after tested commit/push.

Coordinator acceptance: TS-022A accepted `3d8d37f` on 2026-11-02 with the documented C2/C3 design corrections (no equality/delete syntax expansion). Reviewed actual production, complete test matrices/fixtures, migrations and compiler reductions. Independently rebuilt Node/native166/166 each with no skips; all24 static-only and separate coverage gates pass. Cyclic-empty-string compatibility and allocation guarantees remain deferred.

### TS-023P — Function string conversion and source retention design

Status: **design complete; awaiting independent review**. Owner: assigned Codex TS-023P design chat (2026-11-02); existing `codex/primitive-computed-keys`. Assignment base c21ea28; dispatch fec364f. Prerequisite TS-022A accepted3d8d37f. Design only: close the remaining Function default tag-conversion gap without fabricating source or silently expanding syntax. Own docs/function-string-conversion.md, docs/validation/ts-023p/ including narrowly justified isolated probes, and this task claim/handoff. Coordinator owns COORDINATION.md; Claude CL-004/005 reserved.

Inspect lexer tokens, parser function boundaries, AST, closure allocation, callable records, Realm bootstrap and existing tests. Consult fixed ECMA-2622025 Function.prototype.toString/HostHasSourceTextAvailable and revision-pinned relevant engines. Freeze exact APIs for retaining original UTF-16 source (comments/whitespace included), declaration versus anonymous expression boundaries, nested/escaped/lone-surrogate content, multiple parse invocations and function lifetime. Compare shared source+offsets with copied slices for readability and storage, including trusted host-created functions with no parsed source. Specify source availability honestly; do not choose unavailable merely to avoid preserving guest source.

Resolve callable versus noncallable receiver behavior, ordinary user functions versus builtins and callable Function root, permitted NativeFunction grammar/name rules, immutable internal metadata versus mutable guest name/toString properties, foreign/relinked/saved functions and Realm identity. No host Function.toString/eval/source regeneration as guest implementation. Freeze error locations, ticks/call guards, no receiver property coercion, and ordinary ToPrimitive/default operators/keys consumers. Audit current Function-tag/root-key assumptions while preserving explicit Object.toString tags and Number formatting boundary.

Produce independent expected-result matrices with exact source strings, comments/line endings/UTF-16 offsets, nested functions, repeated parses/closures, metadata mutations, builtins/root/invalid receivers, resource/Realm behavior and runtime-read conversion. Propose smallest atomic or staged implementation with bounded files and migrations. No production, integrated tests/manifests, C++, pins, parser feature expansion, branch switching/main merge or successor work. Optional probes must address concrete static-compilation uncertainty with separate coverage and expected results; retain reductions before workarounds. Commit/push design evidence and stop for coordinator review. Accepted runtime baseline166/166/24gates is not proof of new Function support.

Design handoff (2026-11-02): docs/function-string-conversion.md freezes shared
immutable source records, UTF-16 half-open ranges, declaration/expression closure
propagation, explicit source-less trusted host callables, initial native names,
zero-body-tick receiver checks, Realm restoration and ordinary coercion behavior.
Fixed ECMA-2622025 and pinned engine262/V8 source/blob evidence is recorded in
docs/validation/ts-023p/. Matrix S1-S19/F1-F15/R1-R12/C1-C15 specifies independent
expected outcomes and exact tag/root-key/budget/Callable migrations. Data-only
ledger checks 9 inputs/11 fixed source ranges; inventory checks 92 source files,
46 candidates. No compiler probe warranted; no runtime or native validation claim.
Proposes one atomic implementation only after coordinator review. No runtime,
integrated tests/manifests, pins, C++, Claude queue/output or COORDINATION edits.
Commit/push this design handoff, then stop; accepted runtime stays3d8d37f166/166/24.

Coordinator acceptance: TS-023P accepted `cb04609` on 2026-11-02. Reviewed full source/name/API contract and61 matrix rows against current parser/factory/conversion paths and fixed2025 Function.toString rules. Independently reproduced9 inputs/11 fixed source ranges and92-file/46-candidate inventory with no diff. Design only; runtime baseline3d8d37f remains166/166/24gates, not rerun.

### TS-023A — Exact Function source retention and toString

Status: **review needed**. Owner: Codex implementation chat `01a19a9c-355f-7a23-985d-a5d5749b320d`; assignment base `ecb7e3f`, dispatch `51d48bd`, existing `codex/primitive-computed-keys`. Prerequisite accepted TS-023Pcb04609. Implement the atomic contract in docs/function-string-conversion.md and every S/F/R/C row in docs/validation/ts-023p/matrix.md. Own bounded production src/{syntax,lexer,parser,runtime,evaluator,realm,strings}.ts and src/builtins/function.ts, dedicated test/function-string-conversion.ts and runtime-read fixture, necessary existing literal/factory and expectation migrations, minimal runner/build registration and current scope/evidence/task docs. Coordinator owns COORDINATION.md; Claude outputs reserved.

Retain exact shared immutable input/ranges across parsing, hoisting, expression allocation and nested closure lifetime; source availability never silently lost for parsed functions. Explicit null only for source-less trusted host ASTs. Use original UTF-16 offsets independently of decoded tokens, preserve errors/locations and unsupported syntax, and never regenerate source. Freeze original builtin names separately from guest properties and enforce the reviewed bounded NativeFunction spelling/validation. Exact receiver classification, saved/foreign methods, zero body ticks, shared call guards and Realm restoration must match the design. No host Function.toString/eval or guest execution during stringification. Preserve Object explicit tags, Number formatting limits and diagnostic display.

Run updated caller/migration inventory; preserve existing166 cases/24gates and add independently specified results. Use readable multiline effectful tests and literal source/range oracles, including runtime-read fixtures and host-created lone-surrogate inputs. Validate typecheck, runner/probes, full rebuilt Node/native and every static-only build plus separate parsed coverage gate. Retain failures/minimal reductions before compiler workarounds; no pins/gate relaxation. If a frozen oracle contradicts existing supported syntax or normative semantics, document and ask coordinator instead of silently expanding scope. No unrelated methods/syntax, C++, Claude edits, branch switching/main merge or successor. Commit/push coherent tested milestone, hand back evidence and stop for independent review.


TS-023A handoff (2026-11-02): source retention and Function.toString implemented
atomically. Shared immutable UTF-16 input/ranges flow through parser, hoisting,
expressions and closure lifetimes. Explicit source-less null, validated source
ranges and immutable initial native names preserve trusted host distinctions.
All S1-S19/F1-F15/R1-R12/C1-C15 rows have independent literal assertions in the
new native/Node driver and runtime-read fixtures. No frozen-oracle exception.

Repeated caller/migration inventory includes three additional operation-context
closure injections requiring null. Only frozen Function expectations changed;
Object tags, Number boundary, existing negatives and all166cases/24gates remain.
Typecheck PASS; runner20/20; probes10/10; rebuilt Node/native167/167 each, no skips;
all25 static-only builds and separately parsed coverage gates PASS (CLI1437,
Function driver1750). Retained Zig sandbox failure and test-only PropertyKey[]
join SC1090 coverage failure/two-statement reduction before direct-key assertion.
No production workaround, pins, C++, Claude/COORDINATION, branch switch, main
merge or successor work. Evidence/matrix/migrations: docs/validation/ts-023a/.
Commit/push tested milestone and stop for independent coordinator review.

Coordinator acceptance TS-023A: accepted `0de8488` on 2026-11-02 after production/source-path, full matrix/fixture, caller/expectation and reduction review. Independently rebuilt Node/native167/167 each, no skips, all25 static-only and separate coverage gates passing. Source availability and bounded native-name contract match accepted design; no new syntax or formatter support.

### TS-024P — Abstract equality design

Status: **design complete; awaiting independent review**. Owner: Codex chat `01a19aaa-a328-7690-9911-1ecb6b386e9b`, sole design writer, 2026-11-02; assignment base `1a438b5`, inspected checkout `c695409c`, existing `codex/primitive-computed-keys`. Prerequisite accepted TS-023A0de8488. Design only for `==` and `!=`, closing a documented operator gap using the now-established effectful primitive conversion. Own docs/abstract-equality.md, docs/validation/ts-024p/ and task claim/handoff. Coordinator owns COORDINATION.md; Claude assistance reserved.

Inspect lexer longest-match, parser precedence/associativity, evaluator operand evaluation, runtime strict equality/SameValue, numeric-string conversion and current ToPrimitive/context. Consult fixed ECMA-2622025 IsLooselyEqual and equality evaluation plus pinned relevant engines. Freeze a readable algorithm/API for currently represented Value kinds only, including same-type identity/NaN/signed zero, null/undefined, booleans, string-number conversion, Symbols versus primitives and objects, and precisely when object conversion uses default hint. No host loose comparison over guest Values, unconditional object conversion, numeric conversion of Symbols or recursion without a termination argument. BigInt and HTMLDDA are absent, not silently implemented.

Specify both operand evaluations before coercion, abrupt short-circuiting, one object's conversion only when required, same-object/two-object identity without hooks, exact shared budgets/Realm restoration, and != negation only after successful equality. Preserve ===/!== and truthiness. Define token/precedence integration preserving ===/!== and all unrelated parse boundaries, with a migration inventory of existing rejected ==/!= tests (including TS-022A C2).

Produce independent fixed matrices for every represented kind-pair in both operand orders, tricky number/string and symbol/box cases, default Array/Function/wrapper consumers, hook order/mutation/errors, nullish/object noncoercion, same/distinct identity, runtime-read guest operand evaluation and parser precedence/chaining/longest-match. Record exact diagnostics, effect traces and resource counts. Propose smallest atomic implementation ownership and validation preserving167cases/25gates plus additions. No production/integrated tests/manifests, pins, C++, new value kinds, unrelated syntax/methods, branch switch/main merge or successor work. Optional probes only for evidenced compiler uncertainty, with retained reductions/static-only plus separate coverage. Commit/push coherent design, stop for review; do not claim implemented equality support.

TS-024P handoff (2026-11-02): docs/abstract-equality.md freezes iterative
IsLooselyEqual with a decreasing-weight termination argument, existing boolean
completion reuse, selective default-hint conversion, captured operand order,
successful-only negation, diagnostics and unchanged shared budgets/Realm cleanup.
Fixed2025 specification plus pinned engine262 and V8 source/blob evidence is
recorded in docs/validation/ts-024p/. Independent matrix: all49 ordered kind pairs,
V1-V18 payloads, O1-O23 effects/abrupt paths, R1-R19 exact resource boundaries,
P1-P19 parser cases and C1-C16 consumers; both operators/orders required.
Reproducible inventory:103 files/8 candidate lines; identifies C2 assertion and
fixture migration while retaining C3 and historical failures. git diff --check
passes. No compiler uncertainty warranted a probe; no runtime suites/builds were
run. Accepted0de8488 baseline167/167 bothhosts/25gates remains unchanged and is
not equality evidence. No production/integrated tests/manifests, pins, C++,
Claude/COORDINATION edits, branch switching/main merge or successor work.
Commit/push design and stop for independent coordinator review.

Coordinator acceptance: TS-024P accepted1b79203 on 2026-11-02. Reviewed complete algorithm/termination argument and K/V/O/R/P/C matrices, independently checked fixed2025 IsLooselyEqual and equality operand order, inspected existing tick/depth paths and reproduced103-file/8-candidate inventory. No runtime changed or integrated rerun; baseline0de8488 remains167/167/25gates.

### TS-024A — Abstract equality operators

Status: **review needed**. Owner: assigned Codex TS-024A implementation chat, existing codex/primitive-computed-keys; dispatch base `d6ba7f952a40c1d49ca2318e6555507de822cab8` (2026-11-02). Prerequisite accepted TS-024P1b79203. Implement exactly docs/abstract-equality.md and all matrices in docs/validation/ts-024p/matrix.md:49 ordered K pairs, V1-V18, O1-O23, R1-R19, P1-P19, C1-C16. Own src/abstract-equality.ts, minimal lexer/parser/evaluator integration, test/abstract-equality.ts and runtime-read fixture, required runner/native registration, precise Array C2 migration and current docs/evidence/task updates. Coordinator owns COORDINATION.md; Claude paths reserved.

Use iterative typed dispatch with documented decreasing measure, existing InternalBooleanCompletion/equal/stringToNumber/toPrimitive interfaces, explicit mirrored conversions and default hints. Preserve captured source-order operand evaluation, fixed2025 helper argument order, original abrupt records, and successful-only != negation. Same/two-object and nullish/object comparisons have no hooks; Symbols are never numerically converted. No changes to strict equality/SameValue/truthiness or primitive converter contracts. Preserve longest-match strict tokens and all unrelated syntax failures.

Require meaningful independent expected booleans/traces/locations and both operators/orders, runtime-read source, exact small guards and native default64 recursive hooks, Realm/host-fault cleanup and monotonic budgets. Keep all167 existing cases/25gates; add tests/gates without denominator reduction. Migrate only current C2 equality rejection to real success while preserving guest-delete C3 and historical evidence. Run typecheck, runner/probes, full rebuilt Node/native, every static-only build AND separate parsed coverage. Retain failures/minimal reductions before workarounds; report any contradictory oracle to coordinator. No pins, BigInt/HTMLDDA, unrelated syntax/methods, C++, Claude edits, branch switching/main merge or successor. Commit/push coherent tested work and stop for independent review.


TS-024A handoff (2026-11-02): iterative abstract equality and minimal ==/!=
frontend/evaluator integration implemented. All K/V/O/R/P/C groups map to
independent literal assertions, readable runtime-read fixtures, exact effects,
completion identities, resource counts and Realm/host-fault cleanup. Strict
semantics and primitive converters unchanged; native actual default64 recursive
host and guest hooks return call-limit errors without a crash.

One frozen-oracle correction requires review: R18's exact nesting input fails
at1:128, not1:129, because the unchanged parser counts statement nesting too.
Retained equality/strict control reduction; no parser-limit change. Cross-chat
notification was blocked by automatic approval review requiring direct human
messaging authorization; local handoff records the discrepancy for coordinator.

Typecheck PASS; runner20/20; probes10/10; final rebuilt Node/native172/172 each,
no skips. All26 static-only builds and separately parsed coverage gates PASS
(CLI1474, equality1873). Original167cases/25gates preserved; added driver and
four CLI phase/status cases. Only existing Array C2 expectations migrated;
C3 delete rejection and historical evidence remain. Initial Zig PATH/sandbox
failures retained; no compiler workaround or pin/gate relaxation required.
Evidence/matrix/migrations: docs/validation/ts-024a/README.md. No C++, reserved
Claude/COORDINATION edits, branch switch/main merge or successor. Commit/push
this tested milestone and stop for independent review, including R18 correction.

Coordinator acceptance: TS-024A acceptedfc19afe on 2026-11-02, including R18 correction independently reproduced for == and === (column128, unchanged parser). Reviewed production/matrices/runtime fixtures/migrations. Independently rebuilt Node/native172/172 each, no skips; all26 static-only/separate coverage gates pass. Equality is limited to represented Values; BigInt/HTMLDDA remain absent.

### TS-025P — Delete operator and reference semantics design

Status: **review needed**. Owner: Codex TS-025P sole design writer, 2026-11-02, existing codex/primitive-computed-keys; assignment base `1bb6ed8`, observed checkout `b907588`. Prerequisite accepted TS-024Afc19afe. Design only to expose existing internal deletion correctly through guest syntax, closing TS-022A C3 without bypassing references. Own docs/delete-operator.md, docs/validation/ts-025p/ and task claim/handoff. Coordinator owns COORDINATION.md; Claude outputs reserved.

Inspect parser unary/reference classification and parentheses, evaluator reference creation/GetValue/PutValue, property key conversion ordering, internalDelete, descriptors, array length/indices, String wrappers, and the existing strict-call/language profile. Consult fixed2025 delete evaluation/early errors/reference semantics and pinned engines. Freeze an explicit supported strictness policy consistent with Rift's existing limited language profile; identify semantic differences rather than pretending strict-call alone defines strict syntax. Propose smallest correct bounded implementation and any genuinely prerequisite decisions for coordinator review.

Resolve property versus identifier versus non-reference operands, parenthesized identifiers, early-error placement versus runtime effects, missing/nonconfigurable/inherited properties, computed key conversion and nullish/primitive bases, no getter invocation, evaluation order and captured references. Explicitly assess ToObject for deletion and string index/length failures without silently changing general member reads/writes or introducing broad implicit boxing. Distinguish ordinary delete results from strict failure behavior, Array index deletion without length shrink, symbol keys, prototype exposure and Realm/budget/abrupt cleanup. No host delete over guest objects or bypass of internalDelete. Do not invent unrelated operators, binding deletion semantics or accessors/proxies.

Deliver fixed source/host-injection matrices with exact values, storage/prototype invariants, effect traces, parse/runtime diagnostics, error locations, method/key mutation, nullish and primitive cases, resources and native recursive key conversion. Audit existing guest-delete rejections (C3), internalDelete controls, unsupported reserved words and source preservation after unary parsing changes. Retain historical failures; specify precise current migration. Require eventual Node/native plus static-only/separate coverage preserving172cases/26gates. Design only: no production/integrated tests/manifests/pins/C++/Claude edits, branch switch/main merge or successor. Optional isolated probes only for concrete uncertainty with fixed oracles/reductions. Commit/push design evidence and stop for review; no new delete support claim.

TS-025P handoff (2026-11-02): docs/delete-operator.md proposes unconditional
strict-delete within the limited profile: identifier early errors (including
parentheses), nonreference effects then true, property reference consumption
without target Get, ToObject before deferred key conversion, existing internalDelete
dispatch and strict false translation. General member reads/writes stay object-only.
This explicit policy requires coordinator acceptance; strict-call alone does not
establish strict syntax. Fixed2025 and pinned engine262/V8 source/blob evidence
recorded in docs/validation/ts-025p/. Matrices P1-P27/D1-D26/E1-E26/R1-R21/C1-C10
freeze110 primary rows plus variants, locations, effects, storage, Realm and
budget cleanup, and native default64 recursive-key acceptance requirements.
Reproducible inventory109files/117candidate lines identifies precise C3 assertion
and fixture migration; internalDelete controls and historical failures retained.
git diff --check passes. No compiler uncertainty warranted a probe; no runtime
suite/build/coverage run or delete support claim. Acceptedfc19afe172/172bothhosts/
26gates remains baseline only. No production/tests/manifests/pins/C++/Claude/
COORDINATION edits, branch switch/main merge or successor. Commit/push coherent
design/evidence on existing branch and stop for independent review.

Coordinator acceptance: TS-025P accepted1ff5fe5 on 2026-11-02. Reviewed complete contract/matrices, fixed2025 delete ordering and early errors, actual evaluator depth/tick paths, and reproduced109-file/117-candidate inventory. Explicit unconditional strict-delete policy accepted for the limited profile; this does not claim full strict Scripts. No runtime changed or integrated rerun; baselinefc19afe remains172/172/26gates.

### TS-025A — Guest delete operator

Status: **review needed**. Owner: assigned Codex TS-025A sole implementation writer, dispatch base `bd7342c`, existing codex/primitive-computed-keys (2026-11-02). Prerequisite accepted TS-025P1ff5fe5. Implement exactly docs/delete-operator.md and complete P1-P27/D1-D26/E1-E26/R1-R21/C1-C10 matrix in docs/validation/ts-025p/matrix.md, including variants. Own minimal parser/evaluator integration, src/delete-reference.ts, dedicated tests/runtime-read fixture, required runner/native registration, precise current Array C3 migration and scope/evidence/task updates. Coordinator owns COORDINATION.md; Claude paths reserved.

Freeze unconditional strict-delete within the limited profile: identifier early errors including parentheses, nonreference evaluation then true, property reference consumption without final GetValue, ToObject before deferred ToPropertyKey and exactly one internalDelete. Preserve captured base, original abrupt completions, strict false TypeError location, primitive boxing Realm and ordinary read/write behavior. No binding deletion, sloppy mode, accessors/proxies, broad boxing, unrelated syntax or method expansion. Explain the policy explicitly in current scope docs.

Require independent literal results, storage invariants, effects, error phases/locations, key mutation and Realm/host-fault cleanup. Validate exact budgets and native actual default64 recursive host and guest hooks, not only small limits. Preserve172 existing cases/26gates and raw internalDelete controls; migrate only current C3 rejection/fixture, retaining historical evidence. Run typecheck, runner/probes, full rebuilt Node/native, every static-only build AND separately parsed coverage. Retain failures/minimal reductions before workarounds; report contradictory oracles before adjusting. No pins, C++, Claude edits, branch switch/main merge or successor. Commit/push coherent tested milestone and stop for independent review.

TS-025A handoff (2026-11-02): strict-delete parser/evaluator/helper implemented
within the accepted limited profile. ToObject precedes deferred key conversion;
captured references avoid final GetValue; original abrupt records and Realm/budget
cleanup are preserved. Dedicated matrix driver/runtime fixtures cover P/D/E/R/C
and native actual default64 host/guest recursion (261/325 steps). Precise current
C3 migration retains raw internalDelete controls and historical rejection evidence.

Typecheck PASS; runner20/20; probes10/10; rebuilt Node/native177/177 each, no skips.
All27 static-only builds and separately parsed coverage gates PASS. Baseline172
cases/26gates preserved. Retained initial Zig access failure, test corrections,
and minimal catch-identity/never-callback dynamic-tier reductions; test-only
explicit narrowing/return annotation fixes preserve identity and zero dynamic tier.
No frozen semantic oracle adjustment, production workaround, pins, C++, Claude
outputs, COORDINATION, branch switch, main merge or successor work.
Evidence/matrix/migrations: docs/validation/ts-025a/README.md. Commit/push tested
milestone and stop for independent coordinator review; not self-accepted.

TS-025A readability follow-up (2026-11-02, review pending): after coordinator
clearance, expanded the dedicated test driver into consistently formatted,
explicitly braced control flow with local named scenario mappings. Preserved all
160 assertion calls and603 string literals; original E scenario28 is honestly
labelled RepeatedSuccess, not distinct coverage. No production/fixture/runner or
scope changes. Typecheck and rebuilt Node/native177/177 each pass; all27 static
build/separate coverage gates pass (delete driver2259/2259, zero dynamic).
Evidence: docs/validation/ts-025a/readability/. Commit/push bounded correction and
stop for independent re-review; coordinator retains acceptance ownership.

Coordinator acceptance: TS-025A accepted through27e5b27 on 2026-11-02. Reviewed production4592311, full matrices/fixtures/migrations and readability follow-up. Independently rebuilt final Node/native177/177 each, no skips, all27 static-only/separate coverage gates PASS. Limited strict-delete policy and primitive read/write limits remain explicit. Readability correction resolves review findings.

### TS-026P — Typeof and void design

Status: **review needed**. Owner: Codex chat `01a19afd-670b-7703-9dcf-262da02d06bf`, sole TS-026P design writer, 2026-11-02; dispatch base `b856f28`, inspected checkout `9a3c5bd`, existing `codex/primitive-computed-keys`. Prerequisite accepted TS-025A27e5b27. Bounded design only for two remaining unary operators. Own docs/typeof-void.md, docs/validation/ts-026p/ and TASKS claim/handoff. Coordinator owns COORDINATION.md; Claude outputs reserved.

Inspect parser precedence/parentheses/reserved words, Reference/environment resolution and TDZ, evaluator GetValue/callability and resource guards. Consult fixed ECMA-2622025 and revision-pinned engine sources. Freeze smallest correct implementation contract for typeof's unresolvable binding exception versus TDZ and ordinary property/nonreference evaluation; void must evaluate/GetValue once, propagate abrupt results and return undefined without coercion. Cover all represented Value kinds including null, symbols, wrappers, callable guest/builtin objects versus noncallable Number namespace, foreign objects and mutable visible properties. No BigInt/HTMLDDA claim, general boxing change, binding-scope overhaul or unrelated syntax.

Deliver readable named matrices with fixed expected strings/undefined, effects, exact error phases/locations, binding shadowing/parentheses/TDZ, property key conversion and thrown/host-fault cleanup. Define exact tick/depth behavior for direct typeof identifiers without silently bypassing guards. Cover precedence, nested unary operators, line terminators, function source retention, no conversion hooks on classified values and independent expected runtime-read fixtures. Audit current typeof/void rejections including TS-025A P23-P24; specify precise current migrations while retaining historical evidence and unrelated unsupported syntax. Preserve177 cases/27 gates in eventual implementation, with both rebuilt hosts and static-only/separate coverage. No production/tests/manifests/pins/C++/Claude changes, branch switching/main merge or successor. Probe only concrete compiler uncertainties. Commit/push design and stop for independent review; no new runtime support claim.

TS-026P handoff (2026-11-02): docs/typeof-void.md freezes a pure represented-Value
classifier, localized direct-identifier unresolved exception inside existing
evaluate guards, TDZ preservation and mandatory void operand GetValue. No
classification/discard coercion; operand key effects, original abrupt records,
object-only member limits and Realm/budget cleanup remain explicit.
Fixed2025 specification and pinned engine262/V8 source/blob evidence recorded in
docs/validation/ts-026p/. Named V/B/E/P/R/C matrices contain120 primary rows plus
variants, exact diagnostics/resources, native default64 recursion requirements
and independent runtime-read fixture plan. Inventory113files/183candidate lines
identifies only TS-025A P23/P24 current guest rejection migrations; preserves
all unrelated assertions and historical evidence. Documentation/inventory checks
pass; no runtime suites, builds, coverage or compiler probes run. No concrete
compiler uncertainty warranted a probe. Prior accepted177/177bothhosts/27gates
is baseline only, not typeof/void support. No production/tests/manifests/pins/C++,
Claude/COORDINATION edits, branch switch/main merge or successor. Commit/push
coherent design and stop for independent coordinator review; not self-accepted.

Coordinator acceptance: TS-026P accepted3192a7e on 2026-11-02. Reviewed complete contract/matrices, independently checked fixed2025 typeof/void and reference/TDZ/guards; reproduced113-file/183-candidate inventory. No runtime changed or rerun; baseline27e5b27 remains177/177/27gates.

### TS-026A — Typeof and void implementation

Status: **review needed**. Owner: assigned Codex TS-026A sole implementation chat, dispatch base `01c2ab8`, existing codex/primitive-computed-keys (2026-11-02). Prerequisite accepted TS-026P3192a7e. Implement docs/typeof-void.md and all named V1-V17/B1-B20/E1-E24/P1-P26/R1-R25/C1-C8 rows and variants. Own src/typeof.ts, minimal parser/evaluator integration, test/typeof-void.ts and runtime-read fixtures, required runner/native registration, precise delete-test migrations and scope/evidence/task updates. Coordinator owns COORDINATION.md; Claude outputs reserved.

Keep pure exhaustive classification and localized direct-identifier unresolved exception inside existing evaluate guards. No swallowing ReferenceError, flag propagation into children, coercion, broad scope/reference changes or boxing expansion. Preserve abrupt identity, TDZ, callable-slot classification, no hooks during classification, source spans and unrelated unary paths. Audit evaluate overrides and forward the new optional flag explicitly, including delete test MeasuredEvaluator; test missing/TDZ identifiers through measured evaluators so instrumentation cannot drop semantics. Use named readable scenarios/braced control flow from the start.

Require literal values/traces/locations, exact resource boundaries, runtime-read tests, native actual default64 recursive host/guest key hooks, Realm/host-fault cleanup and monotonic budgets. Preserve177 cases/27 gates, migrating only named current typeof/void rejections while retaining history. Run typecheck, runner/probes, full rebuilt Node/native, all static-only builds AND separately parsed coverage gates. Retain failures/reductions before workarounds; report contradictory oracles before adjustment. No pins, C++, Claude edits, branch switching/main merge or successor. Commit/push tested milestone and stop for independent review.

TS-026A handoff (2026-11-02): pure exhaustive typeof classification and bounded
parser/evaluator integration implemented. Direct unresolved identifiers retain
all evaluate guards; TDZ and nested references are ordinary failures. Void
obtains its operand Value exactly once without coercion. Evaluate overrides,
including delete MeasuredEvaluator, explicitly forward the optional flag and
have missing/TDZ/guard regressions. Complete120-row named mapping, runtime-read
fixtures, exact effects/locations/resources and native actual default64 host and
guest recursion (326/390 ticks) are retained.

Typecheck PASS; runner20/20; probes10/10; final rebuilt Node/native182/182 each,
no skips. All28 static-only builds and separate parsed coverage gates PASS
(CLI1519, typeof-void2039, delete2295; zero dynamic). Independent inventory
preserves all177 prior case names/expected records and27 gate entries. Only
current delete P23/P24 rejection expectations migrated; history and all other
assertions retained. Initial Zig access failure and inferred-never callback
adapter reductions are retained. Explicit test callback Completion annotations
remove dynamic adaptation; no production workaround, pin/gate change or frozen
semantic oracle adjustment. Windows x64 and represented Value subset only.
Evidence: docs/validation/ts-026a/README.md. Commit/push tested milestone and stop
for independent coordinator review; no self-acceptance or successor work.

Coordinator acceptance: TS-026A accepted5cdf9e4 on 2026-11-02. Reviewed production, full named test driver/fixtures, override forwarding, precise migrations and compiler reductions. Independently rebuilt Node/native182/182 each, no skips; all28 static-only builds/separate coverage gates PASS. Represented Values and Windows x64 only; general primitive reads remain limited.

### TS-027P — In operator design

Status: **review needed**. Owner: Codex chat `01a19b26-9e7e-7271-9031-5f9c3c16bad0`, sole TS-027P design writer, 2026-11-02; dispatch base `80204eb`, inspected checkout `66046b8`, existing `codex/primitive-computed-keys`. Prerequisite accepted TS-026A5cdf9e4. Design only for guest property presence using existing internalHasProperty. Own docs/in-operator.md, docs/validation/ts-027p/ and TASKS claim/handoff. Coordinator owns COORDINATION.md; Claude outputs reserved.

Inspect parser relational precedence/word tokens, evaluator binary operand capture, ToPropertyKey and ordinary/Array/String internalHasProperty. Consult fixed2025 specification and revision-pinned engine sources. Freeze smallest implementation with exact left/right evaluation and conversion order, RHS object validation, no implicit boxing, inherited presence versus own-only, undefined-valued properties versus absence and holes. Preserve symbols and captured operands, key hooks/mutation, original abrupt records, Realm/budget/host-fault cleanup. Distinguish HasProperty from Get, no property value read. No for-in, private fields, instanceof, proxies/accessors, broad reflection APIs or scope expansion.

Deliver named fixed source/host matrices for primitives/objects/symbol keys, invalid RHS and competing errors, own/inherited/nonenumerable/undefined properties, array holes/length/inherited indices, String virtual indices/length, wrapper and callable RHS, cross-Realm objects and mutation during conversion. Define exact ticks/locations/depth, native default64 recursive-key requirements, precedence/associativity with existing operators, reserved/property-name behavior, source retention and runtime-read expected fixtures. Audit current rejection sites and precise eventual migrations, keeping historical evidence. Preserve182cases/28gates in eventual implementation. Design only: no production/tests/manifests/pins/C++/Claude edits, branch switch/main merge or successor. Probes only for concrete uncertainty. Commit/push design and stop for independent review; no new runtime support claim.

TS-027P handoff (2026-11-02): docs/in-operator.md freezes minimal relational
word-token admission and a short binary branch: both operand Values captured,
RHS object check before string-hint ToPropertyKey, then exactly one existing
internalHasProperty dispatch and guest boolean wrapping. No RHS boxing or
semantic target Get. Symbols, inherited/undefined/nonenumerable data, Array
holes/length and String virtual descriptors retain existing dispatch.

Fixed2025 and pinned engine262/V8 references, reproducible117-file/118-candidate
rejection audit and125 named primary matrix rows plus variants are retained in
docs/validation/ts-027p/. No current guest in rejection assertion requires removal.
Matrices freeze competing errors, mutation/captured identity, locations, parser
precedence/source retention, Realm/host-fault cleanup and native actual default64
recursive keys (261 host /325 guest ticks). Baseline182cases/28gates preserved.
Documentation/audit checks pass; no runtime tests/builds/coverage or compiler
probe run, and no new runtime support claim. No concrete compiler uncertainty
warranted a probe. No production/tests/manifests/pins/C++/Claude/COORDINATION edits,
branch switching/main merge or successor. Commit/push coherent design as authorized
and stop for independent coordinator review; not self-accepted.

Coordinator acceptance: TS-027P accepted5dd652a on 2026-11-02. Reviewed complete design/named matrices, independently checked fixed2025 operand/typecheck/key order and actual parser/presence/resource paths; reproduced117-file/118-candidate audit unchanged. No runtime changed or integrated rerun; baseline5cdf9e4 remains182/182/28gates.

### TS-027A — Guest in operator implementation

Status: **review needed**. Owner: Codex implementation chat `01a19b33-64da-7ca1-a6dc-1b1c26e92f23`, dispatch base `f3b962f`, existing codex/primitive-computed-keys (2026-11-02). Prerequisite accepted TS-027P5dd652a. Implement docs/in-operator.md and all named V1-V32/E1-E32/P1-P28/R1-R25/C1-C8 matrix rows/variants. Own minimal parser/evaluator integration, test/in-operator.ts, runtime-read fixtures, required runner/native registration and scope/evidence/task updates. Coordinator owns COORDINATION.md; Claude outputs reserved.

Preserve captured left/right evaluations then RHS object validation before string-hint ToPropertyKey and exactly one internalHasProperty. No RHS boxing, target semantic Get, new presence implementation or unrelated interfaces. Admit only word-token in at relational precedence6; preserve left associativity, reserved bindings/property names, source offsets and unrelated failures. Test inherited/undefined/holes/String virtual properties, symbols, competing errors, captured references and mutations with literal independent oracles and named readable scenarios.

Require full matrices, runtime-read cases, exact small guard counts and actual default64 native host/guest recursion, Realm/host-fault/abrupt identity and monotonic budgets. Preserve182 case names/expectations and28 gates, including all existing raw presence/map controls; no current rejection migration needed. Run typecheck, runner/probes, full rebuilt Node/native, all static-only builds AND separately parsed coverage. Retain failures/reductions before workarounds; report contradictory oracles before adjustment. No pins, C++, Claude edits, branch switch/main merge or successor. Commit/push tested milestone and stop for independent review.

TS-027A handoff (2026-11-02): minimal word-token/precedence admission and binary
branch implement captured operands, RHS validation, ToPropertyKey and existing
HasProperty in order. Named driver covers125 primary rows/variants with literal
results/traces/locations, runtime fixtures and exact resources, including actual
default64 native host/guest recursion261/325 ticks and Realm/host-fault cleanup.
Node/native189/189, runner20/20, probes10/10, typecheck and all29 static-only plus
separately parsed coverage gates pass (CLI1530, in-operator2185, zero dynamic).
Independent audit preserves every182 baseline expected record and28 gates.

Retained initial harness block-result failure, P18/P23 diagnostic discrepancy
(existing found-token suffixes, reported before asserting full messages), and
one test-only dynScalarEq catch comparison with eight-statement before/after
reduction. Explicit instanceof Error narrowing fixes coverage without weakening
identity. Evidence: docs/validation/ts-027a/README.md and matrix.md. Historical
accepted matrix unchanged; reviewer should confirm the two suffix corrections.
No production workaround, migration, pin/C++/Claude/COORDINATION change, branch
switch, main merge or successor. Commit/push authorized milestone; stop for
independent review, not self-accepted.

TS-027A readability follow-up (2026-11-02, review base987d83b): after coordinator
build clearance, expanded test/in-operator.ts to one statement per line and
consistent braced blocks; replaced four nested resource selections with clear
branches. No production/fixture/scenario/assertion/oracle changes. Source audit
preserves all702 raw string literal occurrences and proves formatting-only
outside the four recorded selections. Typecheck and rebuilt Node/native189/189
pass; all29 static-only/separate coverage gates pass, zero dynamic (CLI1530,
driver2215). Audit preserves all189 prior expected records and29 gate entries.
Evidence: docs/validation/ts-027a/readability/README.md. Independent acceptance
pending; coordinator can push the local commit because delegated push was blocked
by automatic approval review. No successor or other ownership changes.

Coordinator acceptance: TS-027A accepted through5664a35 on 2026-11-02. Reviewed production987d83b and readability follow-up; independently rebuilt Node/native189/189 each, no skips, all29 static-only/separate coverage gates PASS. Reproduced source audit preserving702 literal occurrences and four equivalent explicit selections; baseline189 expected records/29 entries preserved. Logs build/ts-027a-readable-review-{node,native}.log. No unresolved finding; full test262 remains unclaimed.

### TS-028P — Primitive property reads and method calls design

Status: **review needed**. Owner: Codex design chat `01a19b50-e23e-7450-942a-25c0ab5581d8`, dispatch base `72a778a`, inspected HEAD `841faaf`, existing branch `codex/primitive-computed-keys` (2026-11-02). Prerequisite accepted TS-027A5664a35. Design only: inspect existing getValue object-only restriction, ToObject wrappers and call receiver capture. Own docs/primitive-property-reads.md, docs/validation/ts-028p/ and TASKS claim/handoff; coordinator owns COORDINATION.md. Freeze the smallest coherent read/call extension, with exact evaluation/conversion ordering, nullish errors, captured primitive base, temporary wrapper Realm and original primitive Receiver/this. Consult fixed2025 specification and revision-pinned engine sources. Identify any mismatch in current deferred property-key semantics explicitly before proposing implementation.

Deliver named literal expected-result matrices covering each supported primitive, String UTF-16 virtual indices/length, inherited/missing/symbol keys, primitive methods and detached calls, computed-key mutation and competing errors, cross-Realm lookup/calls, original abrupt identity, host-fault cleanup and exact small/recursive resource counts. Audit every affected existing rejection with precise future migrations, preserving historical evidence. Address compound assignment/update read-before-write interactions explicitly while retaining object-only writes. No implementation, general primitive writes, constructors, accessors/proxies, new built-ins, pin changes, C++, Claude outputs, branch switching, main merge or successor. Preserve189 cases/29 gates in eventual implementation except specifically justified expectation migrations. Probes only for concrete uncertainty. Commit/push coherent design and stop for independent review.

TS-028P handoff (2026-11-02): docs/primitive-property-reads.md freezes existing
ToObject-based GetValue with original primitive Receiver/this and active-Realm
wrapper selection, successful deferred-key memoization and unchanged object-only
writes. Fixed2025 confirms deferred conversion; the actual mismatch is failure
to save a converted key for reused references. Compound/update syntax remains
excluded; explicit direct-API read-before-write controls cover the boundary.

Evidence in docs/validation/ts-028p/ includes pinned engine262 files/blobs,
144 named primary expected-result/resource rows plus variants, and reproducible
125-file/69-candidate audit with19 precise migration entries. Covers UTF-16,
keys/hooks/mutations, nullish competing errors, detached calls, Realm/host-fault
cleanup and derived actual-default64 recursion261/325 ticks. Explicitly retains
the Number.toString limitation (inherited Object method) and all primitive writes.

Audit reproducibility,144 row count and diff whitespace checked. No production,
test, manifest, pin, C++, Claude or COORDINATION changes; no runtime/probe/build
runs or new support claim. Prior accepted5664a35 remains189/189 and29 gates.
Commit/push this coherent design as authorized, then stop for independent review;
not self-accepted. No branch switching, main merge or successor chat.

Coordinator acceptance: TS-028P accepted553c9a8 on 2026-11-02. Reviewed full design,144 named matrix rows and19 migration entries; independently checked fixed2025 GetValue ToObject/key-cache/original Receiver sequence and actual evaluator/reference/boxing paths. Reproduced125-file/69-candidate audit unchanged; whitespace clean. No runtime changes or integrated rerun; baseline5664a35 remains189/189 and29 gates.

### TS-028A — Primitive property reads and method calls implementation

Status: **review needed**. Owner: Codex chat `01a19b5c-fc24-7b70-afe4-6c27ae8a01b0`, sole implementation writer, dispatch base `fba0431`, existing branch (2026-11-02). Prerequisite accepted TS-028P553c9a8. Implement docs/primitive-property-reads.md and all V/S/E/M/W/R/C rows/variants in docs/validation/ts-028p/matrix.md, with exact A1-A19 migrations. Own runtime GetValue integration, object-conversion comment, dedicated readable driver/fixtures, necessary existing-test migrations, runner/native registration and current scope/evidence/TASKS updates. Coordinator owns COORDINATION.md; Claude work reserved.

Box with existing ToObject before deferred key conversion; retain original base Receiver/this and active-Realm wrapper. Save successfully converted string/symbol Value key before Get, including dispatch failure; preserve raw key on conversion failure. No wrapper/value caching. Binding reads, primitive writes, delete, syntax and built-in inventory unchanged. Preserve abrupt identity, Realm/frame cleanup, exact resource guards, UTF-16 indices and captured method/base order. Test all named rows including reused direct references, foreign methods, host faults and actual native default64 recursion. Retain every189 baseline case name and29 gates; only enumerated obsolete expectations may migrate, with audited expected-record diff. Keep historical evidence.

Run typecheck, runner, probes, full rebuilt Node/native and every static-only build plus independently parsed coverage. Retain failures/reductions before workarounds, report oracle contradictions before changing them. Keep tests readable from the outset: named scenarios, separate setup/action/assertions, no dense statement chains or opaque nested resource selections. No pins, C++, Claude/COORDINATION edits, branch switch/main merge or successor. Commit/push tested milestone on current branch, then stop for independent review.

TS-028A handoff (2026-11-02): GetValue uses existing ToObject before deferred
key conversion, saves only successful string/symbol Value keys before Get, and
preserves original primitive Receiver/this. No wrapper/result cache. Binding
reads, PutValue, parser, delete and built-in inventory unchanged. All144 primary
rows/variants mapped to named readable driver/fixtures; exact A1-A19 migrations
retain old assertions except their specifically obsolete outcomes.

Typecheck PASS; runner20/20; probes10/10; final rebuilt Node/native196/196 each,
no skips. All30 static-only builds and separate parsed coverage gates PASS, zero
dynamic. Actual default64 native recursion passes261/325 ticks, peak67/131, plus
small guards, Realm/host-fault/abrupt identity and retry controls. Independent
preservation audit keeps189 baseline names/29 gates; only two A17 expected-record
changes. Initial edit/registration/Zig failures retained; no compiler semantic
failure, workaround or oracle adjustment. Evidence: docs/validation/ts-028a/.
Number.toString remains inherited Object-method limitation; no radix work.
Commit/push tested milestone on existing branch under owner authorization, then
stop for independent coordinator review; no self-acceptance or successor.

Coordinator acceptance: TS-028A acceptedb9d3ef1 on 2026-11-02. Reviewed production, complete driver/fixtures and A1-A19 migrations; independently rebuilt Node/native196/196 each no skips and all30 static-only/separate coverage gates PASS. Reproduced preservation audit;189 prior names/29 gates preserved with only two authorized A17 top-level oracle changes. Logs build/ts-028a-review-{node,native,audit}.log. No unresolved finding. Producer typecheck/runner20/probes10 evidence reviewed.

### TS-029P — Property assignment boxing and Receiver design

Status: **review needed**. Owner: Codex design chat `01a19b6b-f64b-7902-b10e-84a1bda3b977`, dispatch base `1f2dcd8`, inspected HEAD `ee800d4`, existing `codex/primitive-computed-keys` (2026-11-02). Prerequisite accepted TS-028Ab9d3ef1. Design only: reconcile current PutValue object-only rejection with fixed2025 ToObject, deferred key conversion/memoization, original Receiver and existing internalSet. Own docs/property-assignment.md, docs/validation/ts-029p/ and TASKS claim/handoff; coordinator owns COORDINATION.md, Claude outputs reserved.

Freeze smallest data-only strict-assignment contract, explicitly retaining current strict-write profile without claiming full strict Scripts. Evaluate RHS before PutValue; box before key hooks, save successful key before Set, preserve original primitive Receiver rather than writing a temporary box. Determine exact false-to-TypeError translation and whether to reuse a narrow helper without weakening object Set semantics. Inspect original Receiver path, inherited nonwritable descriptors, String virtual indices/length, symbols, Array length definition dispatch and direct reused references. Consult fixed2025 spec and revision-pinned engine evidence. Do not assume all primitive assignments reject before observable key effects.

Deliver named literal expected-result matrices for every represented primitive/nullish value, competing RHS/key/Set errors, mutation/capture/aliasing, inherited properties, cross-Realm boxing and hooks, dispatch abrupt/host-fault identity, saved-key retries and no unintended writes. Include exact small budgets and actual native default64 recursive keys. Audit all existing rejection expectations with precise migrations, preserving historical evidence and current196 case names/30 gates. No compound/update/logical assignment syntax, accessors/proxies, new built-ins, implementation, pin/C++/Claude edits, branch switch/main merge or successor. Probes only for concrete uncertainty. Commit/push coherent design then stop for independent review.

TS-029P handoff (2026-11-02): docs/property-assignment.md freezes ToObject before
deferred key conversion, successful key memoization before existing internalSet,
original primitive Receiver and exact false-to-TypeError translation at operation
loc. Reuses current data dispatch unchanged; local completion translation avoids
calling wrapper.set, which would substitute an object Receiver. Existing strict
write profile only, no full strict-Script claim.

docs/validation/ts-029p/ retains fixed2025/pinned engine262 source evidence,
146 named literal matrix rows plus variants, and reproducible133-file/131-candidate
audit with14 precise migration entries. Includes captured mutation/order, String/
Array/symbol controls, retry/cache/Realm/fault identity, exact small guards and
derived actual-default64 native requirements326/390 ticks, peak67/131. Review
points: old direct Put/Get calls3 becomes2, W6 false location7:9 becomes8:4,
W13 now RY/T(y)/one box, and two test set observers must move to internalSet
without losing S traces or abrupt sentinels. Only one old top-level expected
record changes (primitive-reads-write diagnostic); all196 names/30 gates retained.

check.mjs PASS: repeatable inventory, all146 unique contiguous IDs and local links;
git diff --check clean apart from existing CRLF normalization warning. No runtime,
typecheck, runner/probe/build/coverage run and no speculative probe. Baseline
b9d3ef1 remains prior accepted196/196 both hosts/30 gates. No unresolved semantic
choice proposed; independent design acceptance and later runtime validation pending.
Only owned docs and this task claim/handoff changed. Commit/push authorized design
on existing branch and stop for independent review; no self-acceptance or successor.

Delivery: local design commit `e38b9f7`; push rejected by automatic approval review
for possible non-public documentation export and unverified trusted authorization/
repository ownership. No bypass attempted. Publication pending approval; local
design is ready for independent review. No semantic acceptance claimed.

Coordinator acceptance: TS-029P acceptede38b9f7 (delivery note9f7b399), 2026-11-02. Reviewed full design/146-row matrix/14 migrations against previously inspected fixed2025 PutValue and actual runtime/reference/Set paths. Local false translation, operation-location changes, saved-key reuse and A13/A14 observer migrations approved. Reproduced133-file/131-candidate inventory and contiguous row/link checks; diff clean. No runtime rerun; baselineb9d3ef1 remains196/196/30gates.

### TS-029A — Strict property assignment implementation

Status: **review needed**. Owner: Codex chat `01a19b85-aa88-7b12-bc0d-b15dcbf5c256`, branch `codex/primitive-computed-keys`, dispatch base `63d4cff`. Prerequisite accepted TS-029Pe38b9f7. Implement docs/property-assignment.md, all146 named V/E/K/F/R/C rows/variants and exact A1-A14 migrations. Own minimal PutValue/comment changes, dedicated readable tests/runtime fixtures, listed observer/expectation migrations, native/runner registration, current scope/evidence/TASKS. Coordinator owns COORDINATION.md; Claude tasks reserved.

Use existing ToObject then deferred ToPropertyKey, save successful string/symbol Value before exactly one internalSet with original ref.base, preserve throws and translate false locally at operation location. Return exact RHS on success. Keep GetValue/binding assignment/internalSet/set/evaluator/parser/exotics unchanged. Preserve original Receiver and no temporary-box definitions, RHS effects/order, foreign Realm and host-fault/abrupt identity, Array definition dispatch/partial shrink and success-only key reuse. Move A13/A14 test observers to internalSet while retaining every S trace/sentinel and adding original Receiver checks. No weakened expectations.

Run full matrix including actual constructor-default64 native recursion326/390 ticks, exact small limits and seeded cleanup. Preserve196 case names/30 gates, only A9 existing top-level oracle change; retain historical fixtures/evidence. Require typecheck, runner/probes, full rebuilt Node/native, every static-only build and separately parsed coverage. Retain failures/reductions; report oracle contradictions before adjustments. Readable named scenarios and separate setup/action/assertions throughout. No syntax/built-ins/accessors/proxies, pins/C++/Claude/COORDINATION edits, branch switch/main merge or successor. Commit/push tested work on current branch and stop for independent review.


TS-029A handoff (2026-11-02): minimal PutValue/comment change, all146 mapped
rows/variants, exact A1-A14 migrations, seven runtime-read fixtures and additive
driver registration implemented. Independently reviewed R30 correction is5 ticks
instead of6: identifier callee uses reference/GetValue without evaluate. Historical
TS-029P matrix and original failures retained; no runtime tick change.

Final rebuilt Node/native203/203 each, no skips;31 static-only and separately
parsed coverage gates PASS, zero dynamic. Typecheck, runner20/20 and probes10/10
pass. Complete preservation audit confirms196 baseline names,30 gates,63 fixture
files, only A9 old expected-record migration, unchanged GetValue/binding writes/
internalSet/set/evaluator/parser/exotics/pins. Actual native default64 host/guest
recursion326/390 ticks, peaks67/131 and65 boxes passes.

Evidence and derivation: docs/validation/ts-029a/README.md, matrix.md, retained
transcripts, r30-reproduction.mjs and complete-mode audit.mjs. Initial observer
assertion-order failure, sandbox linker failure and R30 failures retained. No
genuine compiler failure/workaround. COORDINATION/Claude/C++ untouched. Stop at
this boundary for independent review; no acceptance, main merge or successor.

TS-029A delivery: implementation commit `5169978`; push rejected by automatic
approval review (external repository export; destination authorization and remote
privacy/ownership not independently verified). No alternate export attempted.
Publishing requires approval; local tested milestone remains ready for review.

Coordinator acceptance: TS-029A accepted5169978 (delivery noteb8d0a64), 2026-11-02. Full production/driver/migration review; independently rebuilt Node/native203/203 each no skips and31 static-only/separate coverage gates PASS. Reproduced complete preservation audit;196 prior names/30 gates and exact A9-only old oracle migration. Logs build/ts-029a-review-{node,native,audit}.log. R30 five-tick correction independently justified previously. Raw retained tool transcripts contain whitespace warnings; production/test diff has no identified defect. Producer typecheck/runner20/probes10 reviewed.

### TS-030P — Arithmetic compound assignment design

Status: **review needed**. Owner: sole Codex design chat `01a19ba2-6311-7151-a25c-ae793e03d320`, existing `codex/primitive-computed-keys`, dispatch/inspection base `fae6ef9` (2026-11-02). Prerequisite accepted TS-029A5169978. Design only for +=, -=, *=, /= and %=, reusing existing binary semantics and Reference/GetValue/PutValue. Own docs/compound-assignment.md, docs/validation/ts-030p/ and TASKS claim/handoff; coordinator owns COORDINATION.md; Claude work reserved.

Inspect lexer longest-match rejection, parser assignment precedence/right associativity/target validation, AST representation and evaluator binary helpers. Freeze smallest readable extension: capture one reference, GetValue before RHS, evaluate RHS once, apply existing operator semantics, PutValue once, return resulting Value. Never desugar by duplicating the target; successful key memoization must suppress repeated hooks. Preserve += default-hint/string behavior versus numeric conversion for others, original base/value capture, coercion ordering and abrupt/host-fault/Realm cleanup. Consult fixed2025 specification and revision-pinned engine evidence. Explicitly handle TDZ/unresolvable/immutable bindings, primitive writes, readonly properties and Array definition effects. Determine exact source/error locations and guard charges; no fabricated extra AST evaluation ticks.

Deliver named literal matrices for each operator, strings/NaN/infinities/signed zero/symbol errors, RHS mutation/rebinding, key/conversion hooks, competing Get/RHS/coercion/Set failures, associativity/conditional integration and invalid targets. Include exact small budgets, actual native default64 recursion and precise existing rejection migrations. Preserve203 baseline names/31 gates, explaining unavoidable obsolete fixture source migrations while retaining parse-before-effects coverage through still-unsupported syntax. Historical evidence stays immutable. Exclude update operators, logical assignments, exponentiation/bitwise/shift assignments, new binary operators, parser unrelated expansion, implementation/pins/C++/Claude edits, branch switch/main merge and successor. Probes only for concrete uncertainty. Commit/push design and stop for independent review.

TS-030P handoff (2026-11-02): docs/compound-assignment.md freezes a separate
compound Expr for exactly five arithmetic assignments, one reference/Get before
RHS/binary/Put, existing successful key caching and original Receiver, no synthetic
AST/tick or helper semantic change. Fixed2025 and two revision-pinned engine262
files inspected; source/blob provenance recorded.

Evidence: docs/validation/ts-030p/ has178 named literal semantic, parse, location,
resource and cleanup rows plus explicit five-operator/other variants. Covers
captured Values/keys, binding failures, primitive/readonly/Array writes, foreign
Realm and host faults. Derived native default64 key recursion261/325 differs
from operand recursion326/390; identifier RHS callee costs no extra tick.
Eight migration entries identify all obsolete sites: preserve203 baseline case
names/31 gates, only two top-level parse expected-record changes, two exact
fixture source changes to still-unsupported **=, and three host-row migrations.
Historical evidence immutable; no existing source/test/helper edits made.

check.mjs PASS:141-file/161-candidate inventory reproduced,178 contiguous unique
row IDs and local links. Diff whitespace checked. No runtime/probe/build/coverage
run or new support claim; baseline5169978 remains previously independently
accepted203/203 per host/31 gates. Native implementation evidence remains pending.
Commit/push coherent design on existing branch then stop for independent review;
no self-acceptance, COORDINATION/Claude edits, main merge or successor.
TS-030P delivery: local design commit `a7294bb`. Push rejected by automatic
approval review because repository contents would leave for an external remote
without trusted destination/payload authorization recognized by that reviewer.
No alternate export attempted. Publication awaits approval/coordinator resolution;
local design is ready for independent review, not self-accepted.

Coordinator acceptance: TS-030P accepteda7294bb (delivery51cfbea), 2026-11-02. Reviewed full design/178-row matrix/migration ledger, independently checked fixed2025 compound ordering and current parser/reference/binary/guard paths. Reproduced141-file/161-candidate inventory, row/link checks. Separate compound AST and exact obsolete rejection migrations approved. No runtime rerun; baseline5169978 remains203/203/31gates.

### TS-030A — Arithmetic compound assignment implementation

Status: **review needed**. Owner: Codex chat `01a19baf-2549-75f0-84bd-e8094fe3de3d`, branch `codex/primitive-computed-keys`, dispatch base `f587e86`. Prerequisite accepted TS-030Pa7294bb. Implement docs/compound-assignment.md, all178 named matrix rows and explicit five-operator variants in validation/ts-030p/matrix.md, exact A1-A8 migrations. Own minimal lexer/parser/syntax/evaluator integration, dedicated readable driver/runtime fixtures, listed migration/registration/scope/evidence/TASKS updates. Coordinator owns COORDINATION.md; Claude tasks reserved.

Admit only += -= *= /= %=; separate compound AST with explicit binary-op union. Capture one reference, Get once before RHS, evaluate RHS once, reuse binary helper then Put once. No synthetic binary AST or duplicated target/key; no helper semantic changes. Preserve right associativity, target validation, original Receiver/key cache, captured old Value, conversion order and guard/location contracts. Keep other operator families rejected. Only two enumerated old fixtures/expected records migrate to **= while preserving parse-before-effects; no baseline case removed. Historical evidence immutable.

Cover all literal oracles/variants, actual native default64 key and operand recursion, host/guest/foreign Realm failures and seeded cleanup. Add disk-read CLI fixtures with literal expected stdout/stderr/status for all five operators, one-time key/RHS effects, Get-before-RHS and coercion/write failure, parse-before-effects and source retention; map these to matrix coverage. Preserve203 prior names/31 gates with audited A2-A7-only migrations. Typecheck, runner/probes, full rebuilt Node/native, all static-only builds and separate parsed coverage mandatory. Retain failures/reductions, report oracle contradictions before changing expectations. Named readable scenarios; avoid dense multi-statement lines/nested resource selection chains. No unrelated syntax/built-ins, pins/C++/Claude/COORDINATION edits, branch switch/main merge or successor. Commit/push tested milestone and stop for independent review.

TS-030A handoff (2026-11-02): separate compound Expr and minimal lexer/parser/
evaluator integration implement exactly five arithmetic compounds. Existing
binary/reference/runtime helpers unchanged. Dedicated readable driver maps all178
frozen rows/variants, seven disk-read CLI fixtures and one additive native gate.
A2-A7 migrations only; audit preserves203 prior names/31 gates,70 fixtures and35
old drivers, with exactly two expected-record changes and two fixture replacements.

Final rebuilt Node/native211/211 each, no skips;32 static-only builds and separately
parsed zero-dynamic coverage gates PASS. Driver2709/2709 static. Typecheck PASS,
runner20/20 and probes10/10. Actual constructor-default64 host/guest key recursion
261/325 and operand326/390 pass for all five ops, including foreign Realm/primitive
variants, small limits and seeded abrupt/host-fault cleanup. No frozen oracle
correction. Retained new CLI expectation typo, Zig sandbox access failure and
three dynamic test statements with minimal before/after reductions; corrected
only test callback signatures and operator string extraction. See
[complete evidence](docs/validation/ts-030a/README.md), row map and preservation audit.

Commit/push tested milestone on existing branch under owner authorization, then
stop for independent review. No self-acceptance, successor or main merge.
TS-030A delivery: tested local implementation commit `682280d`. Automatic approval
review rejected `git push origin codex/primitive-computed-keys` because it treated
repository code/validation artifacts as sensitive egress without trusted payload/
destination authorization. No bypass or alternate export attempted. Publication
awaits approval/coordinator resolution. Independent acceptance remains pending.

TS-030A independent-review revision (2026-11-02): addressed the three bounded
assertion gaps reported against682280d. R1-R28 now assert literal Get/Set counts,
RHS attempt versus normal completion, RHS body calls and retained target/binding/
prototype state; R27 checks retry progress. C3 now runs both operand hooks after
foreign RHS and checks BKCGRLHS with caller Realm restoration. Added explicit
stored-value assertions for E21/E22/E25/E26/E27/E28 and W3/W8/W10/W16/W17.
All prior assertions retained; no production or frozen expectation changes.

Rebuilt Node/native211/211 each;32/32 static-only and separately parsed coverage
gates PASS, driver2756/2756 static. Typecheck, runner20 and probes10 PASS.
Preservation audit reproduced; earlier evidence retained under ts-030a/pre-review/.
Commit the revision and stop for independent re-review; no self-acceptance,
successor, branch switch, COORDINATION edit or main merge.

Coordinator acceptance: TS-030A accepted a190709 (production682280d), 2026-11-02. All three review findings resolved with literal state/effect assertions and foreign-RHS operand restoration coverage; no production changes in revision. Independent rebuilt Node/native211/211 each, no skips;32 static-only build/separate coverage gates PASS; preservation audit reproduced. Producer typecheck/runner20/probes10 evidence reviewed. Native evidence remains Windows x64, not full ECMAScript conformance.

### TS-031P — Trustworthy test262 classification design

Status: **review needed**. Owner: Codex design chat `01a19bf5-589e-7b32-a605-f2c419837724`, existing `codex/test262-classification`, base `19f2529` (2026-11-02). Prerequisites: accepted CL-002/CL-004 and TS-030A. Design only; no engine/runner implementation. Own docs/test262-classification.md, optional docs/validation/ts-031p/ research evidence and this task handoff. Coordinator owns COORDINATION.md; CL005 stays reserved to Claude.

Freeze a small adapter contract for the revision-pinned CL004 corpus: exact byte retrieval/hash verification, frontmatter validation, flags/variants/raw/module/async handling, strict-profile limitations, harness loading and independent harness validation, phase/type matching and explicit unsupported syntax versus genuine early errors. Preserve denominators and distinguish pass/fail/unsupported-feature/unsupported-profile/harness-error/resource-limit/timeout/host-fault. No rewritten harness, host eval of guest source, altered upstream assertions, or pass claims from coincidental SyntaxErrors. Record fixed specification/test262 guidance and exact source revisions; inspect actual CLI/parser/completion paths. Define machine-readable result/schema boundary, minimum required engine changes and smallest ordered implementation slices. Give named literal acceptance scenarios covering CL002 defects and CL004 unsuitable examples. Separate raw parser/body observations from faithful conformance results. Current errors are diagnostic records, not Error objects; do not silently equate these. Current suite211/211 per host32 native gates must remain intact. Do not implement, expand syntax/builtins, change pins/C++, or merge main. Commit/push design on codex/test262-classification and stop for independent review.

TS-031P handoff (2026-11-02): docs/test262-classification.md defines exact-byte
verification, validated metadata,60-variant ledger for33 files per lane,
profile/capability gates, unchanged separately evaluated harness and independent
harness controls, audited early-error rules, structured outcome/type provenance,
eight exclusive statuses and honest denominators. Diagnostic strings cannot
satisfy runtime Error negatives. Current strict-call behavior does not certify
strict Script; all admission requires reviewed whole-file capability evidence.

docs/validation/ts-031p/ retains source provenance/limitations and115 named literal
matrix rows plus explicit variants, covering all CL002 D1-D10 and CL004 U01-U11.
Inspected pinned guidance/assert/sta, S18-S22/U07, fixed2025 Script semantics,
revision-pinned engine262 worker and actual Rift source. Five ordered future
slices identify prerequisites without authorizing implementation or broadening
syntax/builtins here. Engine262 harness substitutions were explicitly rejected.

Documentation checks pass:115 unique row IDs,33/60 corpus counts and exact mode
breakdown, local links and whitespace. No new guest/harness/reference execution,
byte download verification, typecheck/runner/probe/native/static coverage run.
Baseline remains accepted TS030A211/211 both hosts/32gates, Windows x64 only.
Historical CL004 measurements stay labeled as inherited research. Only owned
docs/TASKS changed; coordinator's concurrent dispatch8f61e91 preserved.
Commit/push design then stop for independent review; no self-acceptance or successor.

TS-031P delivery: local design commit `6faae58`. Automatic approval review
rejected `git push origin codex/test262-classification`, stating that repository
documentation/task metadata export lacked trusted authorization for this payload
and destination. No bypass or alternate export attempted. Publication requires
approval/coordinator resolution; independent design acceptance remains pending.

Coordinator acceptance: TS-031P accepted6faae58 (deliverybd1390a), 2026-11-02. Full design115-row matrix reviewed; pinned INTERPRETING guidance independently retrieved and checked for raw/variants/harness/phase-constructor rules. Verified current CLI/interpreter/guard boundaries; independently counted33 files,60 variants,115 unique rows; diff check clean. Documentation only; runtime baseline unchanged211/211 per host32 gates.

### TS-031A — Host-only test262 planning and pure classification

Status: **review needed**. Owner: Codex implementation chat `01a19c10-69ec-7811-81b1-12f12cf8d344`, base `83e0eaa`, 2026-11-02. Prerequisite accepted TS-031P. Implement only first slice in docs/test262-classification.md: exact local corpus bytes/hash/UTF-8 and metadata validation, variant planning, preflight blockers, closed structured-record validation and pure classifier, ledger/report counts. No guest subprocess launching or engine integration. Production host tooling belongs tools/test262/; meaningful Node test files alongside it; own additive package script and evidence docs/validation/ts-031a/ plus TASKS handoff. No src/, guest fixtures/drivers, existing runner/probe changes, C++, pins or Claude outputs. Coordinator owns COORDINATION.

Use external local corpus root at exact revision, explicit input paths and verified blobs; never execute upstream code with host eval/Function/vm. No implicit downloads or checked-in upstream corpus. If YAML library needed, use a narrowly scoped pinned host-only dependency with recorded provenance/license/choice; preserve existing pinned toolchains and keep it out of native engine imports. Do not invent an incomplete YAML parser that silently accepts ambiguous input. Fail closed for unknown/malformed execution metadata and result fields, duplicate keys, invalid identities and contradictory results. Restrict production selection to frozen33 entries; synthetic fixtures exercise faults independently without weakening production identity checks. All current profiles remain blocked: no corpus pass claims.

Implement all applicable I/V/T rows and synthetic O classifier rows with literal expected statuses/reasons/effects/counts. H/C semantic rows remain pending engine/harness prerequisites; map each115 row explicitly to exercised host assertion or honest deferred prerequisite. A synthetic success is never an executed corpus result. Validate same33-file60-variant ledger separately for both lane identities, preserve unknown denominators/cancellation/retries, no denominator shrink. Tests must catch malformed UTF-8/BOM preservation, path escapes, metadata drift, forged output/envelopes, wrong phases/types, guards, crashes after nominal success and harness-stage failures. No caching, profile admission, real Error-object claim, runner spawning, or support expansion. Run additive tests and typecheck/existing runner regressions; runtime/native rebuild not needed if engine/build/guest paths are unchanged, but prove that exact preservation and leave211/32 evidence unchanged. Commit/push tested host-only milestone and stop for independent review; no main merge/successor.

TS-031A handoff (2026-11-02): host-only tools/test262 implements frozen local
byte/blob/UTF-8 verification, YAML metadata and ordered variants/harness planning,
closed structured envelopes and pure classification, immutable selection and
explicit retry records, atomic persistence and separate lane reports. Exact
host-only yaml@2.8.3 dependency (ISC; lock integrity; zero install audit findings)
adds no native imports or toolchain changes. CLI never downloads or launches code.

Validation: additive host suite58/58, explicit local corpus integration4/4,
typecheck exit0, existing runner20/20. Manually prepared external pinned36-file
export; all33 tests plus3 harness blobs verified. Actual production preflight
retains33 files/60 variants independently per lane (30 strict,28 non-strict,1 raw,
1 module):19 unsupported-feature,41 unsupported-profile, zero executed/pass/fail,
zero input errors. Pass/planned0/60; conditional0/0 undefined; adapter report exit1.
All115 accepted matrix rows mapped to host assertions or explicit deferred H/C
semantic prerequisites. Full evidence/initial and final ledgers/report vectors:
docs/validation/ts-031a/. Synthetic successes are not corpus executions.

Protected runtime/guest/build/runner/probe paths unchanged from83e0eaa;32 native
entries preserved. Accepted211/211 per lane remains inherited evidence, not a
new native/probe/guest run. No C++, Claude research, PR79, engine, profile admission,
real Error object, subprocess supervisor, caching or successor work. Current all-
blocked profiles are enforced even against synthetic success injection. Missing
includes preserve known variant counts; malformed metadata retains unknown counts.
Independent acceptance pending; commit/push coherent milestone then stop.

TS-031A correction handoff after independent review of cb7a1bc (2026-11-02):
R1 binds both inspectEnvelope and appendAttempt to parent-prepared Identity/Inputs,
expected negative and blockers. Planned metadata remains authoritative; missing,
null, changed phase/type or altered policy/inputs cannot earn an injected pass.
Initial ledgers now retain each parent-owned resultContext before terminal records.
R2 shares all closed-schema/cross-field checks with exported classify, including
harness validation, goal/stage/body constraints and observation-mode exclusion.
R3 records actual call depth at the pre-increment guard:64/64 and0/0 are resource-
limit; other source/parse/steps/evaluation/output guards retain count>limit.
Known configured limits must match observation limits. Runtime code is unchanged.

Refreshed host tests66/66 (eight new boundary tests), exact local corpus4/4,
typecheck exit0 and runner20/20. Both verified33/60 ledgers remain19 feature-blocked,
41 profile-blocked, zero execution/pass/fail.115-row map and evidence refreshed.
Protected source/guest/build/runner/probe paths unchanged from cb7a1bc and83e0eaa;
211/32 runtime evidence remains inherited. Coordinator-owned1a082f3 preserved.
Correction ready for independent re-review; commit/push then stop, no successor.

Coordinator acceptance: TS-031A accepted500d09a, 2026-11-02. Reviewed correction code and all eight boundary regression tests; parent-owned context now binds expected negatives/inputs/policy, classifier shares cross-field invariants, at-limit calls are faithfully represented. Independently reran66 host tests and4 exact-corpus checks, all pass; runtime/guest/build/probe paths unchanged. Typecheck/runner20 independently passed on prior host revision and producer recheck reviewed. Ledgers33/60 per lane remain fully blocked, zero guest execution/passes. No native rerun or conformance claim.

### TS-031B-P — Structured engine outcome and driver design

Status: **review needed**. Owner: Codex design chat `01a19c39-2d1f-7613-ae72-08071a76a217`, base `a87e86c`, 2026-11-02. Prerequisites accepted TS-031P/031A. Design only. Own docs/structured-engine-outcomes.md, docs/validation/ts-031b-p/ evidence and TASKS handoff; coordinator owns COORDINATION. Inspect every lexer/parser/runtime guard/diagnostic/throw construction site and caller. Freeze explicit unsupported/indeterminate syntax versus audited early-error rule tags, resource provenance/counts (including pre-increment call guard), source-unit/stage identity and diagnostic compatibility. Map smallest candidate certified rules to valid/invalid whole-source neighbors and context restrictions. Do not upgrade existing generic parser errors merely from message text or expected tests.

Specify narrow separate static-native-compatible batch-driver boundary for parser/body observation only, and its parent-owned Identity/Inputs/expectedNegative/policy binding to accepted host tools. All conformance profile/harness gates stay blocked; real Error object extraction, Script semantics, harness execution and profile admission remain deferred. Clarify trusted child evidence versus parent process/deadline/output-cap facts; guest stdout must not forge results. Preserve CLI behavior and existing211 guest cases32 native gates. Audit migration surface and literal acceptance matrix including source caps, parser/evaluator budgets, guest throws vs host faults, exact phase/location, seeded cleanup and actual native limits. Probes only for concrete uncertainty; no runtime/adapter implementation, new syntax/builtins, pins/C++/Claude changes or main merge. Recommend smallest separately reviewable implementation slice and exact owned files/interfaces, then commit/push design and stop.

TS-031B-P handoff (2026-11-02): docs/structured-engine-outcomes.md and
docs/validation/ts-031b-p/ freeze95 construction-site candidates,1390 caller
matches, ten manual throw-shape migrations and124 literal acceptance rows.
Reproducible audit confirms180 protected source/test/tool/probe/config files
unchanged froma87e86c, contiguous matrix IDs and valid local links. No runtime,
corpus guest or compiler probe run; inherited211/32 baseline is unchanged.
Smallest recommended slice is provenance/in-process observation only; separate
driver/parent transport follows independent review. Audited emitting syntax-rule
set is explicitly empty initially; all five reserved candidate rules have
whole-source/context and valid-neighbor requirements, strict cases deferred.
Review this conservative split explicitly, rather than treating schema RULES as
implemented certifications. Driver design binds parent Identity/Inputs/negative/
policy, captures counts before cleanup, prevents stdout forgery and fixes the
accepted host schema's observation-mode harness invariant only in a later slice.
All conformance profiles/harness, real Error extraction and Script semantics
stay blocked. No expected-record migrations, pins/C++/Claude/PR79 changes,
branch switch/main merge or successor. Await independent coordinator review.

Coordinator acceptance: TS-031B-P accepteda122735, 2026-11-02. Full design124-row matrix/audit reviewed; independently reproduced180 protected-file95-site10-manual-throw124-row audit, checked producer/propagation paths and representative P04/P10/P12/R05/R06 locations using current Node-hosted parser. No full suite/native rerun or new compatibility claim. Approve empty emitting syntax-certification set and provenance-only first slice; B driver remains deferred.

### TS-031B-A — Engine provenance and in-process observations

Status: **accepted** at `c51d056`. Owner: Codex implementation chat `01a19c54-953b-7851-b5ca-4ca85bb5aecf`; base `6f86657`. Prerequisite accepted TS-031B-Pa122735. Implement only scope A in docs/structured-engine-outcomes.md and its frozen matrix: P01-P42,R01-R38,V01-V04; C rules remain non-emitting, B transport/driver deferred. Own src/outcomes.ts, src/observation.ts, listed syntax/lexer/parser/runtime/evaluator/interpreter/conversion/array-map provenance sites; exactly ten manual guest-origin throw additions across six inventoried test files; additive structured-outcomes driver and guest/native registration; evidence docs/validation/ts-031b-a/ and TASKS handoff. Coordinator owns COORDINATION; no host test262 code changes or subprocess driver.

Preserve Diagnostic shape, old values/messages/locations/CLI exits, budget counts, side effects and completion identity. Closed provenance code unions and required throw origin, paired parse rejection/error, guard counts captured before unwind; no message inference. Observe parses once, validates safe-integer step/call limits, makes no object constructor/property/coercion reads, and lets host faults escape. All syntax rejections remain unsupported or resource; no emitted syntax-error certification, new syntax/builtins/profile/harness support or real Error claim. Test every applicable literal row and multi-value variant, propagation/seeded foreign-Realm cleanup and actual default64 native recursion; existing211 guest expected records32 gate entries unchanged. Existing host66 controls and4 corpus checks remain unchanged. Typecheck,runner20,probes10,full rebuilt Node/native and every static-only build/separate zero-dynamic coverage mandatory. Retain failures/reductions and request review before oracle changes; no runtime workaround/pin change. Commit/push tested milestone on current branch, stop for independent review; no main merge/successor.

TS-031B-A handoff (2026-11-02): scope A implemented with closed readonly rejection/origin types, required ThrowCompletion origin, failure-site resource counts, explicit unsupported-operation sites, paired parse metadata and in-process observation/projection. Reserved syntax rules remain non-emitting; host faults escape; no B driver/classifier changes. Exactly10 inventoried old test throws gain guest origin, with all old assertions/records unchanged. Typecheck, runner20/20, probes10/10, rebuilt Node/native212/212 each, all33 static-only and separately parsed zero-dynamic gates pass (new driver1914/1914). Host66/66 and pinned-corpus4/4 pass with zero corpus guest execution. Audit proves211 old names/expectations/actual records per lane and32 old gates preserved, plus45 complete parser/lexer baseline comparisons and CLI controls. P01-P42/R01-R38/V01-V04 mapped in docs/validation/ts-031b-a/matrix.md. Retained native SC1090 distinct-union comparison reduction resolved by explicit narrowing; retained R27 Map-only reduction shows inferred test Binding identity adaptation before observation, resolved by existing Binding type annotation without changing any identity oracle. Numeric/object seed flags, Value/object aliases, actual default64 native recursion and seeded foreign-Realm cleanup pass. Full evidence and limitations: docs/validation/ts-031b-a/README.md. Stop for independent review; no successor/main merge.

Coordinator acceptance (2026-11-02): accepted c51d056 after production diff and independent read-only test/reduction review. Independently rebuilt Node/native212/212 and all33 static-only/separate coverage gates; preservation audit reproduced211 exact old records,32 old gates,10 origin-only migrations,45 parser/lexer baseline comparisons and CLI controls. Logs build/ts031ba-review-{node,native,audit}.log. R27 explicit Binding annotation preserves identity assertions; no runtime workaround. Producer runner20/probes10/host66/corpus4 evidence reviewed. No conformance admission.

### TS-031B-B — Separate observation driver and parent transport

Status: **review needed**. Owner: Codex implementation chat `01a19c73-66b4-7fa0-967e-1ca76fa6f66c`, base `71e4b63`, 2026-11-02. Prerequisite: accepted TS-031B-A c51d056 and design a122735. Implement only second slice B of docs/structured-engine-outcomes.md and frozen T01-T32 plus applicable V controls; do not emit C syntax certifications or add conformance execution. Own src/observation-driver.ts, necessary explicit serializer helper, tools/test262/observe.mjs and driver-result.mjs, bounded result.mjs observation-mode validation change, additive host/driver tests and build registration, evidence docs/validation/ts-031b-b/, TASKS handoff. Coordinator owns COORDINATION; preserve Claude files.

Use fresh Realm per process, strict arguments, safe integer limits, parent-owned paths/nonce/verified inputs, fixed strict child schema and explicit Unicode-safe serializer. Parent owns transport facts, timeout/output caps, executable identity and source transforms; reject malformed/duplicate/stale/oversized results. Preserve frozen precedence including cap-triggered termination and actual crossing-byte counts. Keep observation archives separate from conformance ledgers/classification. Existing conformance blockers and33-file60-variant denominators remain unchanged; no harness/profile admission, Error constructor extraction, engine semantics, CLI changes or toolchain updates. Preserve old212 expected guest cases33 static gates and add separate driver gate. Required: all frozen transport cases with literal assertions, real Node/native end-to-end observations, static-only build and separate zero-dynamic coverage, typecheck/runner/probes/full guest lanes, existing host/corpus controls. Retain failures and reduce compiler uncertainties; do not weaken assertions. Stop after tested commit/push for independent review; no main merge or successor.

TS-031B-B handoff (2026-11-02): separate seven-argument driver, explicit UTF-16-safe serializer, strict duplicate-key/schema decoder and parent-owned verified-source/build/context/transport orchestration implemented. Fresh read-only source and nonce per attempt, private plan snapshots across asynchronous validation, single launch, deadline/crash/cap/protocol precedence with actual first-crossing byte counts, separate append-only observation archives and cancellation retained unfinished. No conformance classifier/ledger calls for observations. Only result.mjs observation invariant changed; coordinator explicitly approved the one-line synthetic fixture migration to mode-gated harnessValidated, preserving all assertions/conformance values. Typecheck, runner20/20, probes10/10, rebuilt Node/native212/212 each, all35 static-only/separate zero-dynamic gates (33 old plus driver1614 and serializer1601), host71/71 (66 old+5), observations14/14 and pinned corpus4/4 pass. Audit proves all212 old exact records/33 gates and semantic source/CLI/tests preserved; corpus remains33 files/60 variants per lane with zero execution/pass. T01-T32/V01-V04 mapped with raw successful/failed transport archives, CLI comparisons and regenerated inventories in docs/validation/ts-031b-b/. Windows file-symlink creation privilege unavailable; actual junction result/root aliases, hardlink and preexisting files rejected with prior bytes preserved. No static compiler workaround/reduction needed. Await independent review; no main merge/successor.

TS-031B-B review correction (2026-11-02): fixed caller-selection mutation during prepareObservation by cloning complete selection and copying source Buffer before the first await; subsequent identity/transform/negative/blocker/archive values use only the owned snapshot. Both-lane literal preparation regression preserves original non-strict return source/hash/location despite immediate variant/path/blob/hash/lane/nested metadata/source/limit mutations. Child decoder now enforces mode/body/stage/location consistency for normal, runtime, parse and driver-fault outcomes; impossible records become protocol faults. Positive and negative tables cover decoder and composition. Host72/72 and real observations16/16 pass on coordinator-rebuilt binaries; no engine/native source or old assertions changed and no competing rebuild. Baseline reproductions and raw review attempts retained in docs/validation/ts-031b-b/review-corrections.md and observations-review/. Await re-review; no acceptance/successor/main sync.

Coordinator acceptance (2026-11-02): accepted5b42393 after reviewing preparation snapshot and child mode/body/stage/location fixes. Independently72 host controls16 real Node/native observation controls and preservation/CLI audit pass; prior independent full212/212 lanes35 static gates retained (engine/compiler sources unchanged by fixes). Logs build/ts031bb-rereview-*.log. Regenerated three stale caller line references. No conformance admission or syntax certification.

### TS-031C-P — Bounded syntax certification feasibility and design

Status: **accepted** at `d319710`. Owner: Codex design chat `01a19ca7-a0ab-7fc2-8648-c1bcc97910ae`, base `c4c2488`, 2026-11-02. Design/audit only; prerequisite accepted TS-031B-B5b42393. Evaluate C01-C08 of docs/validation/ts-031b-p/matrix.md against actual whole-source lexer/parser behavior and pinned corpus S18-S22. Own docs/syntax-certification.md, reproducible research/audit files under docs/validation/ts-031c-p/, TASKS handoff. No production source, classifier, conformance policy/ledger, fixtures, toolchain, or companion edits. Coordinator owns COORDINATION.

Determine whether any of the five reserved rules can be emitted soundly without claiming unsupported syntax was parsed. Use exact pinned ECMA-262 clauses and relevant engine source as evidence; distinguish strict Script, sloppy, function/block and Annex B contexts. Include assignment/destructuring/call-target ambiguity, late unsupported lex/grammar, genuine error plus unsupported tail, whole-source context and unedited source requirements. Preserve independence from expected-negative metadata. Reproduce current behavior and literal valid/invalid/unsupported neighbors in both existing Rift lanes where practical; label reference-engine checks as references. Recommend the smallest defensible implementation slice or explicitly conclude none is ready and identify a bounded prerequisite. Provide types/interface implications, ordered tasks, explicit non-goals and literal acceptance matrix sufficient for an agent; no implementation until independent design review. No conformance execution/admission/pass claim, no runtime expansion. Commit/push design then stop; no successor or main merge.

TS-031C-P handoff (2026-11-02): docs/syntax-certification.md and
validation/ts-031c-p/ audit C01-C08, all five reserved rules and exact pinned
S18-S22. Conclusion: no rule ready to emit with current short-circuit parsing.
Recommend a bounded non-emitting Script-return EOF coverage prerequisite, then
separate independent review before return-only emission. Explicit types, ordered
tasks, 29 future acceptance rows and exclusions; no successor started.

Measured at coordinator tracking successor a814e18 (engine unchanged from
accepted5b42393): 50 synthetic inputs plus8 verified pinned variants;116 existing
Node/native parser observations and58 separately labelled V8 Script compilations
all match literal expectations;6 real metadata-swap transport controls unchanged.
No guest body/harness execution, conformance admission/classification/pass claim,
or syntax-error emission. Exact clauses use ECMA-2622025; V8 source tag14.6.202.34
and two Git blobs recorded. Current matrix and raw records are reproducible.

Preservation audit proves src/test/tools/probes/config unchanged from5b42393 and
fixtures/accepted companion files unchanged fromc4c2488; whitespace check passes.
Existing binaries hashed, not rebuilt; full212/35/72/16 baseline remains inherited,
not rerun. Windows x64 only. Material blocker: no complete structural evidence
past an early parser rejection; strict/scope/target rules have additional gaps.
Only owned docs/research/TASKS changed; coordinator a814e18 preserved. Commit/push
and stop for independent review, no main merge or runtime implementation.
Coordinator acceptance (2026-11-02): accepted d319710 after design/interfaces/F01-F29 matrix/source review and independent reproduction of116 Rift observations58 labelled V8 compilations6 metadata controls plus protected-file audit. Checked fixed ECMA-2622025 Script ~Return and Statement +Return grammar. Existing binaries used; no new build claim. Accept only the non-emitting prerequisite; no emission/admission authorized.

### TS-031C-A — Internal whole-source Script-return coverage

Status: **accepted** at `1bc8e11`. Owner: Codex implementation chat `01a19cc2-e08a-7b12-b47d-12ffa115d1dc`, base `38d1d9e`, 2026-11-02. Prerequisite accepted TS-031C-Pd319710. Implement auditScriptReturns and readonly ReturnCoverage/ReturnCandidate from docs/syntax-certification.md using the existing lexer/parser machinery. Own bounded parser implementation/types, additive internal audit test driver/native registration and tests, docs/validation/ts-031c-a/ evidence and TASKS handoff. Coordinator owns COORDINATION. Freeze literal F01-F29 matrix in docs/validation/ts-031c-p/acceptance.md, all applicable C controls and exact pinned sources.

Only in private audit mode collect function-depth-zero return keyword spans and continue the same unchanged source to actual EOF. No source repair, token skipping/recovery, parallel grammar, executable AST export, evaluator call or metadata input. All other unsupported/resource failures block coverage; matched delimiters and source.length consumed including comments are mandatory. Normal public parse and all observations/CLI/diagnostics/partial AST/guards/effects remain exactly unchanged; all syntax-error rule codes remain non-emitting. No strictness/ASI/new syntax, host classifier/policy/protocol changes, harness/profile admission, conformance execution, toolchain or C++ changes. Full Node/native runtime rebuild, existing212 expected guest records35 old static gates preserved plus additive audit gate with separate zero-dynamic coverage, typecheck/runner/probes/host72/observations16/corpus4 required. Meaningful literal span/location/count/EOF/tail veto and no-effects assertions; compare complete public parser records against baseline. Retain failures/reductions and stop for review before assertion changes. Commit/push tested task then stop for independent acceptance; no emission successor or main merge.

TS-031C-A handoff (2026-11-02): internal source-only auditScriptReturns and readonly coverage/candidate types implemented with the existing lexer/parser and a private return-only mode. Real EOF including trivia required; every other unsupported/resource tail vetoes coverage. No AST escapes audit, guest evaluation, metadata input, syntax-error emission, new syntax/strictness/ASI or observation/classifier change. Public first-error/partial-body behavior preserved. Typecheck, runner20/20, probes10/10, rebuilt Node/native212/212 each,36 static-only/separate zero-dynamic gates (35 old plus audit1170/1170), host72/72, observations16/16, metadata6/6 and corpus4/4 pass. Frozen F01-F29 and C controls covered in94 inputs per lane including8 exact verified pinned variants; exact spans/locations/counts/EOF/tail veto/no-effects assertions pass. Full94 public ParseResult comparisons against38d1d9e in Node before/after audit,188 public parser observations across lanes,212 exact old guest result records per lane and35 old gate entries preserved. All other tracked engine/test/tool/config/fixture files unchanged. Evidence docs/validation/ts-031c-a/ retains sandbox Zig/rename failures, preflight source-offset draft corrections and validation-script URL startup error; no compiler/runtime discrepancy or weakened oracle. Windows x64 only; coverage is not ECMAScript validity or conformance admission. Stop for independent review; no emission successor/main merge.

Coordinator acceptance (2026-11-02): accepted1bc8e11 after parser/test/evidence review and independent full Node/native212/212,36 static-only/separate coverage gates,host72,94-row dual-lane audit and exact public parser baseline/preservation comparisons. Logs build/ts031ca-review-*.log. Producer metadata6/observations16/corpus4/runner20/probes10 evidence reviewed. Public behavior unchanged; no syntax emission or conformance claim.

### TS-031C-B — Return-only syntax certification through observations

Status: **accepted** at `e58c7b0`. Owner: Codex implementation chat `01a19cd2-0cae-7b51-98be-30c207cb35d6`, base `802f595`, 2026-11-02. Prerequisite accepted TS-031C-A1bc8e11 and prospective emission contract in docs/syntax-certification.md. Own bounded parser provenance selection, Observation/projectRejection types, explicit serializer, closed child decoder/operation invariants, additive semantic/protocol tests, evidence docs/validation/ts-031c-b/, TASKS/feature-scope handoff. Coordinator owns COORDINATION. No classifier/admission/policy/ledger/CLI/grammar/toolchain/C++/companion changes.

Only if ordinary parse rejects with parse.return-context may source-only auditScriptReturns decide certification: complete with nonempty candidates emits syntax-error/return-outside-function at original first return location. Blocked audit preserves original public rejection/diagnostic priority; all other rules stay non-emitting. Preserve diagnostics/messages/locations, partial AST, all nonmatching tags, guard counts, execution/effects and CLI exits. Atomically carry certified parse-phase SyntaxError/ruleCode through observation and JSON to parent, bodyEvaluated=false in either mode. Child decoder admits only this certified rule, rejects unknown/other reserved rules and inconsistent phase/location/mode/body/stage/bindings. Keep harnessValidated=false, loaded harness empty, classifications absent and corpus plans fully blocked with unchanged denominators.

Cover frozen F01-F29/C controls and exact pinned S20 bytes, literal complete-candidate promotion and every late-tail/guard veto, function/valid neighbors, metadata swaps and malicious child controls. Before edits inventory old assertions intentionally changing solely from unsupported return provenance to certified return provenance; retain every case, expected diagnostics/effects and unrelated assertion, document exact changes. Do not change historical evidence or fixed prior audits to manufacture preservation. Add a new baseline-aware audit permitting only this deliberate tag delta for certified whole-source returns. All212 guest case identities and36 gate entries retained; run full Node/native,static-only/separate coverage,typecheck/runner/probes,host/observation/corpus checks with transparent new totals. No harness or conformance execution/pass claims. Retain failures/reductions; stop for review before broadening scope or weakening assertions. Commit/push then stop for independent review; no main merge or successor.

TS-031C-B handoff (2026-11-02): implementation complete, awaiting independent review. Only ordinary parse.return-context failures with complete/nonempty same-source audit gain syntax-error/return-outside-function; all other tags, diagnostics, locations, partial ASTs and effects remain. Observation projection/explicit JSON/closed decoder carry parse SyntaxError and the one rule; parent composition stays bound and harness-free. Before-edit assertion inventory and baseline802f595 audit retained under docs/validation/ts-031c-b/. Node/native212/212 each, all36 original static-only/separate zero-dynamic gates, typecheck, runner20/20, probes10/10, host73/73 (72 old+1), observations16/16, metadata12/12 and corpus4/4 pass. Frozen94-row matrix:21 eligible tag-only changes,73 unchanged rows,188 internal audit runs,352 observations,164 unchanged CLI failures; full Node partial-AST/diagnostic equality. All212 exact old guest records and36 gate identities retained; historical audits/contracts, classifier/policy/ledger/profile/harness/compiler/C++/companion unchanged. All conformance remains blocked/zero execution. Retained Zig/rename/symlink sandbox failures and initial cancellation-test missing transport.json under concurrent load; unchanged access-enabled standalone rerun passes. The latter matches the existing pre-launch aborted-signal path and is a coordinator follow-up, not silently fixed in this slice. No compiler workaround or weakened assertion. Stop for independent review; no main merge/branch switch/successor.

Coordinator acceptance (2026-11-02): accepted e58c7b0 after source/protocol/assertion inventory review and independent full Node/native212/212,36 static gates,host73,94-row matrix and preservation audit. Exactly21 literal eligible tag changes; partial AST/diagnostics/CLI/effects remain unchanged and other rules non-emitting. Logs build/ts031cb-review-*.log. Producer metadata12/corpus4/observations16/runner20/probes10 reviewed. Retained cancellation timing limitation is delegated separately; no transport production change in this slice. No conformance admission.

### TS-032P — Exact nondecimal formatter backend design

Status: **accepted** at `fe167f6`. Owner: Codex design chat `01a19cee-0243-7c02-8578-12f2cf9d25a7`, base `2bf6fd2`, 2026-11-02. Design/proof-plan only, based on accepted CL-005 research d532a14 and TS-021P number conversion contract. Own docs/radix-formatter-backend.md, docs/validation/ts-032p/ bounded reproducible design/probes, TASKS handoff. No production formatter/registration/decimal backend/compiler/test262/companion edits. Coordinator owns COORDINATION. Use docs/assistance/radix-formatter-options.md and retained seven failures; do not repeat the completed research survey.

Freeze an agent-ready readable exact-bigint backend for positive finite numbers and validated integer radix2-36 except10. Specify interval endpoint/tie treatment, minimal significand proof, digit/exponent bookkeeping, step6 canonical rendering, exact closest/even choice including cross-power subnormal candidates; distinguish required spec steps from Note2 target. Define invalid-input policy and special-value/sign/radix10 ownership at future callers; no builtin registration yet. Use pinned specification/paper sources and reviewed research oracle, independently reason about termination/bounds and licensing. Provide literal acceptance vectors plus frozen13350-pair corpus identity and oracle independence, both lanes/static separate coverage, output bounds and measured resources. Existing compiler probe is evidence, not exhaustive proof; probe only a new unresolved lowering question if necessary. Recommend one bounded backend implementation task, then separate Number.prototype.toString integration with TS-021P R/N matrices. Stop at design review with honest limitations; no new production support or conformance claim.

TS-032P handoff (2026-11-02): design complete, awaiting independent review.
`docs/radix-formatter-backend.md` freezes exact bigint half-gap/free-format
generation, exact iterative scaling, bounded three-exponent/six-candidate global
closest/even selection, canonical rendering and caller/precondition ownership.
Separates required steps from adopted Note2 target; provides derived termination,
57-digit/16384-bit/1076-unsigned-character conservative bounds and B01–B11 later
acceptance. `docs/validation/ts-032p/` retains24 full-string literal vectors,
13350 ordered binary64/radix pairs (SHA2569102f9fe83fc37b2b883a55e29c9ec173e4c0d54118eaf96113a166702dc1c6d),
dependency blob/hash identities and reproducible host-only design checks.
New selection arithmetic matches exact oracle13350/13350 and corrects all7
accepted cross-power differences;24 literal checks pass on Node26.13.0.
This reuses accepted free-format k and is not a production/backend/native proof.
Verified fixed2025 spec and corrected author-paper text, including warning about
the original correct-rounding theorem. PDF byte hash/screenshots unavailable;
source-access failures and independent derivation recorded honestly. No engine,
decimal,builtin,compiler,test262,CL006 or accepted-evidence edits; no native
build/full runtime rerun. Existing212/36 baseline inherited. Remaining decisions:
typed batch driver/test-hook layout and measured resource costs; full-module
lowering/platform behavior unverified. Recommend backend-only implementation
after review, then separately reviewed TS021P N1–N8/R1–R16 integration. Stop here;
no production implementation, successor or main merge.

Coordinator acceptance (2026-11-02): accepted fe167f6 after full design/evidence review, independent mathematical review of intervals/scale/minimality/selector/bounds, and reproduction of13350 selector comparisons24 vectors and frozen corpus SHA256. Checked fixed ECMA-2622025 rounding and Note2 distinction. Paper byte hash remains explicitly unverified; derived equations independently reviewed, no copied code. This accepts a bounded implementation contract, not a production/native/performance proof.

### TS-032A — Exact positive-finite nondecimal backend

Status: **accepted** at `f7524b7`. Owner: Codex implementation chat `01a19d08-c2e8-7300-a0a1-2f7869186600`; base `9c39011d50f9acf2864f9ae0f360910f4165daac`, branch `codex/test262-classification`, 2026-11-02. Prerequisite accepted TS-032Pfe167f6. Implement only src/number-radix.ts numberToStringRadix(value,radix): GuestString and minimal typed runtime-input backend driver/host oracle validation. Own backend/private numerical helper or test seam only if needed for synthetic controls, test/number-radix.ts, additive build/test orchestration, docs/validation/ts-032a/, TASKS/feature scope handoff. No builtin registration, decimal conversion, coercion, Realm/evaluator, parser/protocol, CL006 transport or compiler/C++ changes. Coordinator owns COORDINATION.

Frozen algorithm/interfaces/proofs/bounds and B01-B11 are docs/radix-formatter-backend.md. Positive finite input, integer radix2-36 except10; invalid inputs host-fault before extraction. Exact bigint half-gap setup, iterative scale/digit termination, three-exponent at-most-six-candidate closest/even selector and canonical rendering; no host formatting/parser or approximate fallback. Preserve oracle/research files unchanged and separate from backend; input bytes/order must match frozen13350-pair corpus SHA256 and24 vectors, extend boundary supplementation without dropping cases. Both lanes receive bit-pattern inputs after compilation and must pass independent whole-string/interval/minimality/Note2 checks. Exercise endpoint/tie/synthetic odd-radix parity/preconditions, resource guards and literal rendering. Measure bounded iterations,width,length and timing honestly in both lanes; max57digits/1076unsigned units/16384intermediate bits, no corpus-driven relaxation. Handle practical batch transport without embedding answers.

Require static-only build and separately parsed zero-dynamic coverage for backend runtime-input driver, full preserved212 guest cases36 old gates plus additive gate, typecheck/runner/probes,18 decimal controls and relevant regressions. Keep every timeout/crash/failure in denominator; native agreement alone insufficient. If compiler failure reduce it, do not change pins or switch to limb implementation without separate review. No production number method yet. Document decisions/retained failures and stop at tested commit/push for independent acceptance; no main merge or integration successor.

TS-032A handoff (2026-11-02): backend and private numerical seams implemented
from the frozen design; runtime-input driver uses actual production logic.
Final Node/native14768/14768 each independently pass canonical/interval/minimum-k/
Note2 checks: unchanged frozen13350 plus1394 all-radix boundary supplements and24
literal vectors. Observed maxima53digits/1073scale/1075power/2159bits/1076units;
limits unchanged. Final backend driver220/220 static, zero dynamic; all36 old
build gates plus additive backend gate pass, full212/212 guest cases each lane,
runner20/probes10/typecheck and18 original decimal controls each lane pass.
Five warm batch timing and runtime RSS snapshots retained, with native timer
quantization and non-peak memory limitations. Source/evidence preservation audit
passes. Native Zig sandbox failure, initial corpus-label assertion, coordinator
metadata audit, unsupported decimal CLI transport and reduced unrelated-import
coverage failure retained in docs/validation/ts-032a/README.md. No compiler/pin/
limb changes or backend fallback; unchanged original decimal probe used separately.
Only assigned backend/helper/test/orchestration/evidence/status files changed.
No builtin integration, CL006 edits, successor or main merge. Stop for independent
review; finite Windows-x64 evidence is not exhaustive binary64 conformance.

Coordinator acceptance: f7524b7 independently reviewed and rebuilt, 212/212 both lanes and 37 static gates; 14768 independent oracle checks and 18 decimal controls per lane, preservation audit passing. Additional read-only 8704 Node subnormal checks passed. Finite Windows-x64 validation only.

### TS-032B — Integrate Number.prototype.toString

Status: **accepted** at `8504127` — assigned Codex writer, base b029661, branch codex/test262-classification. Prerequisite accepted TS-032A f7524b7. Follow the full-stage contract in docs/number-prototype-conversions.md (TS021P), with backend preconditions from docs/radix-formatter-backend.md. Own src/builtins/number.ts, narrowly necessary registration wiring, number conversion semantic tests/runtime fixtures and exact justified migrations in existing tests, additive orchestration only if needed, docs/validation/ts-032b/, feature-scope and TASKS handoff. Coordinator owns COORDINATION; Claude owns CL006. No parser, observation/classifier, compiler/pin, decimal backend, unrelated runtime or C++ changes.

Install toString length1 before valueOf length0; Number namespace remains noncallable with unchanged ten properties. Extract receiver first; default only absent/undefined radix; otherwise existing numeric-hint ToPrimitive then ToIntegerOrInfinity, range-check before special-value handling. Preserve identical abrupt records, locations, effect order and budgets. Radix10 uses unchanged decimal backend; nondecimal positive finite magnitude uses accepted backend, caller handles zero/NaN/infinities/sign. No guest host coercion. Implement literal N1-N8/R1-R16 tests, descriptors/own-key order/Realm identity, canonical and ordinary coercion with fresh fallback, read/tick/call faults, ignored arguments, saved/borrowed methods and genuine slots, mutations, exact cross-Realm forwarding cleanup on normal/guest throw/host fault.

Before edits inventory current affected expectations against TS021P's staged-to-full migration table; document exact intentional changes (string-hint/keys, fallback results and step counts), retain unrelated negatives and explicit Object method behavior. Do not rewrite historical evidence. Add runtime-input consumers, literal difficult radix outputs including known cross-power cases, and invalid radix ordering for special receivers. Preserve all 212 existing guest cases and 37 existing gate entries; justify any expected-result changes individually, never drop assertions. Run typecheck, runner/probes, full rebuilt Node/native suites, static-only builds with separately parsed coverage, full 14768-case backend oracle per lane and decimal controls, relevant host/protocol regressions. Report retained failures and honest scope; no conformance admission. Commit/push tested work on current branch and stop for independent review; no successor or main merge.

TS-032B handoff (2026-11-02): full-stage registration and exact staged migrations implemented; evidence docs/validation/ts-032b/. Rebuilt Node/native212/212, all37 static-only/separate-coverage gates (CLI1752, object-valueof3290), runner20/20, probes10/10, host73/73, observation16/16, typecheck pass. Added N/R semantic assertions and48 signed runtime literal-vector runs within preserved driver; backend oracle14768 and decimal18 pass per lane. No conformance admission, historical evidence/pins/C++/CL006/COORDINATION changes or successor. Retained sandbox Zig/temp-rename and test-typecheck failures documented. Await independent acceptance.

Coordinator acceptance (2026-11-02): accepted8504127 after actual production/test migration review and independent read-only second review, no actionable findings. Fresh full Node/native212/212 and37 static-only/separate gates; host73/73, independently rerun14768 backend oracle and18 decimal controls per lane, exact manifest/backend/decimal/vector preservation passed. Logs build/ts032b-review-{node,native,host,preservation}.log. Historical evidence restored byte-for-byte after validation. No conformance admission; Windows-x64 evidence only.

### TS-033P — Strict Script execution design

Status: **accepted** at `cdb5e6e` — assigned Codex design writer, branch `codex/test262-classification`, base `dc460ac`, 2026-11-02. Evidence-backed next step: docs/test262-classification.md ordered slice3; current evaluator uses a strict-call/write subset, plain global Environment and undefined top-level this, not standard Script semantics. Design only before implementation. Own docs/script-execution.md, reproducible read-only audit/evidence under docs/validation/ts-033p/, and this task handoff. Coordinator owns COORDINATION; preserve Claude CL006.

Read existing evaluator/environment/Realm/parser and accepted observation/classification contracts. Freeze the smallest explicit Script entry contract sufficient for selected strict corpus and separate unchanged harness source units: directive-prologue strictness and inherited function context, global object versus declarative bindings, top-level this, declaration instantiation and cross-unit conflicts/TDZ, Realm/execution-context entry and cleanup, source-unit identity and completion/provenance boundaries. Inspect revision-pinned specification and relevant engine source. Inventory existing semantics and exact future migrations; distinguish supported syntax from unimplemented grammar. Compare a separate opt-in Script entry with migrating current entry and recommend a reasoned staged approach; do not silently relabel current profile or admit tests. Do not promise full Script support while var/function hoisting/Annex B/sloppy semantics remain absent. Map all selected corpus/profile blockers and identify dependencies; do not expand into modules/eval/with/async or implement dormant harness features.

Produce named literal positive/negative/neighbor and multi-unit acceptance scenarios, including strict directive lookalikes/late directives, lexical conflicts before effects, top-level and nested this, cross-Realm ownership, abrupt cleanup, resource limits and unsupported-tail vetoes. State what can be independently proven now and split implementation into small ordered reviewable slices with owned files and honest profile admission criteria. No production code, existing tests/manifests, classifier/policy, toolchain, historical evidence or C++ edits. Any isolated probe must answer a real uncertainty, use runtime input and expected outputs, and include static-only/separate coverage if claiming native support. Preserve212 cases37 gates, pins and all conformance blockers. Commit/push design and stop for independent review; no implementation or successor/main merge.

TS-033P handoff (2026-11-02): design in docs/script-execution.md; reproducible source/identity/preservation audit in docs/validation/ts-033p/. Recommends opt-in Script entry and profile-isolated Realm, with explicit strictness, composite globals, declaration phases, empty completions, source-unit and context cleanup contracts; six ordered bounded proposals and literal acceptance matrix. Retrieved fixed ECMA-2622025 and engine262 d553e7b52501fbc47eae981c8d0fa7a5c26d0171 source, retained hashes/licenses; verified33 selected test plus3 harness blobs. Offline audit passes:2285 protected tracked files unchanged,60/60 variants still blocked, inherited212 records per lane/37 gates preserved. Coordinator's concurrent COORDINATION updates explicitly excluded and hash-recorded; not edited/staged here. No guest/native/reference-engine execution or fresh runtime gate claim; future matrix unexecuted. Guest Symbol/String/Object globals, unmodified harness grammar/runtime, Error objects, additional error certifications and other corpus blockers remain explicit. No implementation, successor, main merge or owner decision required; stop for independent review.

TS-033P review correction (2026-11-02): separated C01 runtime completion, directive-only C01a (normal string "use strict"), empty-source C01b (preflight profile blocker, no runtime phase), and internal empty StatementList normalization I01 (host-only control, no external stage/phase). P1 D/V acceptance explicitly covers parser metadata/rejections only; no execution, admission or new strict early-error certification. Documentation correction only; matrix remains unexecuted and original research evidence retained.

Coordinator acceptance: cdb5e6e (design34a536e plus correction) accepted after actual source/design review, independent second review of retained normative algorithms and replayed2285-file/36-blob/60-blocked-variant audit. Empty-source/profile contradiction corrected; directive-only result and internal empty completion now distinct. Design acceptance only, no runtime/native claim.

### TS-033A — Non-executing Script strictness metadata

Status: **accepted** at `15bf2dd` — Codex writer chat 01a19d5a-f788-7b53-9b2a-e29aa2bb0891, base 1f81bb2f6eae3ffe9efad8e051599db739ef3f71, branch codex/test262-classification (2026-11-02). Implements only P1 of accepted docs/script-execution.md. Own bounded syntax/lexer/parser metadata support (or focused metadata module sharing parser machinery), additive runtime-input parser test/fixture and native gate, docs/validation/ts-033a/, TASKS/feature-scope handoff. Coordinator owns COORDINATION. Preserve Claude CL006.

Provide a non-executing inspection API with exact source-unit identity/text and structured Script/function strictness metadata, raw directive spans and syntactic enclosing inheritance. Do not return an executable new Script entry or route current interpreter/observation through it. Distinguish syntactic strictness from supported grammar and eligibility; no certification or conformance claim from strict=true. Host remains responsible for cryptographic identity verification; do not add hashing dependencies to semantic core. Readonly records and complete/blocked results must prevent partial successful metadata being treated as complete source coverage. Share existing parser/lexer rather than inventing a regex-based independent grammar.

Freeze literal D01-D09/V01-V03 parser-only expectations before edits: exact quotes, preceding directives, parenthesized/late strings, empty statement, escaped/continued lookalikes, ASI unsupported, own versus inherited nested strictness, duplicate-parameter existing rejection, unsupported tails/resource limits, return certification preservation. Add empty source and directive-only metadata, sibling function isolation, anonymous/nested function forms, offsets/line terminators and function spans. Preserve current fail-closed reserved-identifier/strict-delete/unsupported escape restrictions. No new grammar, relaxed duplicate handling, strict-error emissions or rule codes; blocked rows stay honestly blocked even when future standard expectations are known. No global environment, declaration semantics, evaluator, Realm, CLI/protocol/classifier/admission changes.

Preserve exact legacy parse outputs including partial bodies, diagnostics, rejection tags and source ranges, plus auditScriptReturns behavior. Demonstrate old/new baseline equality on a meaningful fixed runtime-input matrix including existing94 audit cases and new neighbors; keep historical evidence unchanged. Full Node/native212 old guest records and37 old gates plus additive metadata gate, typecheck/runner/probes and relevant host tests; static-only build and separately parsed zero-dynamic coverage for the new runtime-source driver. Add literal expected metadata, no self-derived oracle or host eval of guest code. Document scope and retained failures, commit/push coherent milestone then stop for independent review. No P2 successor/main merge/pins/C++ changes.

TS-033A handoff (2026-11-02): non-executing inspectScript in focused
src/script-metadata.ts shares the unchanged parser/lexer and traverses the parsed
AST only to recover syntactic nesting. Readonly exact unit snapshots, complete/
blocked results, raw directives and own/inherited function strictness; no AST,
execution eligibility, grammar relaxation or new certification. Node/native each
pass136 exact legacy parse/audit comparisons including all94 historical rows and
42 literal metadata controls; full212 guest records per lane preserved exactly.
All37 old static gates plus additive metadata gate pass (486/486 static),
typecheck, runner20, probes10, host73 and observation16 pass. Evidence and exact
source hashes in docs/validation/ts-033a/. Retained Zig/temp-rename environment
failures and two corrected handwritten offset expectations. No parser, lexer,
syntax, evaluator/Realm/protocol/classifier/pins/C++/historical/CL006 edits; no
successor/main merge. Coordinator-only29f418b advanced the shared branch during
validation; its file is excluded and hash-recorded. Commit/push and stop for
independent acceptance; no scope decision needed.

TS-033A review correction (2026-11-02): independent review reproduced a host
stack overflow in recursive metadata traversal on a valid30002-unit binary
chain. Replaced recursion with an explicit typed work stack preserving source
preorder, strictness inheritance and enclosing-function identity, with no new
grammar/resource rejection. Eight runtime-input stress controls pass in Node
and native (binary/member/call chains, buried/far-end/nested/sibling functions,
no effects, exact review input and100000-unit boundary). All136 original full
metadata/parse/audit records remain identical per lane; original baseline/cases
and evidence preserved. Full212 guest records per lane,38 static gates (metadata
driver500/500), typecheck, runner20, probes10, host73 and observation16 pass.
Failure reproduction and fresh evidence: docs/validation/ts-033a/stack-fix/.
Commit/push correction and stop for independent re-review; no successor.

Coordinator acceptance (2026-11-02): accepted15bf2dd after actual explicit-stack diff review and independent rebuild212/212 both lanes38 static gates. Replayed136 full metadata/parser/audit records per lane,42 literal controls,8 deep-chain controls per lane and preservation checks. Original30002-unit failure now passes, as does100000-unit boundary. Logs build/ts033a-review-*.log, fresh matrix outputs build/ts033a-review/. Initial review output hit a Windows file-open error on retained metadata-node.json; rerun to fresh build output passed, retained bytes restored and working tree clean. No new Script execution claim.

### TS-033B — Composite global environment operations (P2 foundation)

Status: **accepted** at `7183015` — Codex chat 01a19d77-3192-72d1-9ccd-d1226c59f040, sole writer, base f9073a7, 2026-11-02. Subset of accepted Script design P2, prerequisite TS033A15bf2dd. Implement host-tested composite global environment primitives in a focused module, reusing GuestObject, Value and explicit completions. Own new global environment module, additive runtime-input host driver/native gate and literal fixtures, docs/validation/ts-033b/, TASKS/feature-scope. Coordinator owns COORDINATION. No Realm profile/bootstrap installation yet: that follows review of these primitives. Do not wire interpreter/evaluator/observation or replace legacy Environment/Reference.

Use fixed ECMA2622025 Global/Object/Declarative Environment operations and retained pinned engine source; record exact supported operation interfaces before edits. Persistent declarative lexical record takes precedence over ordinary global object bindings; TDZ/initialization/mutable let state and global-this identity explicit. Provide needed HasBinding/GetBindingValue/SetMutableBinding and restricted-global/CanDeclareGlobalVar/CanDeclareGlobalFunction/CreateGlobalVarBinding/CreateGlobalFunctionBinding primitives. Preserve ordinary own/inherited property and descriptor semantics, abrupt completions and call-site locations through existing property APIs; do not use host JS properties as guest globals. New var/function properties W/E true C false, repeat var preserves existing values, allowed nonconfigurable function replacement preserves descriptor flags. Keep 2025 algorithm semantics, not obsolete VarNames bookkeeping. No accessors/proxies/exotic global support claim or language Error objects.

Provide a narrowly scoped host-only strict binding-reference wrapper for future entry use: resolve before effects, retain unresolved reference rather than re-resolve after a new global property appears, and ensure lexical precedence/TDZ. Unresolvable strict write still fails after RHS-equivalent host mutation; direct property creation remains observable. Clearly distinguish captured environment references from property references and avoid changing legacy runtime getValue/putValue. No source declaration instantiation, parser grammar, sloppy execution or global built-in installation in this slice. Operations alone do not claim atomic multi-name declaration prechecks; P3 orchestrates these later.

Freeze named literal host-operation rows for G01-G08 prerequisites, configurable property versus lexical shadowing, own/inherited/missing globals, nonextensible globals, writable/enumerable/configurable combinations, var reuse/function replacement, TDZ and initialization, captured-unresolved and captured-resolved mutations, context/Realm isolation and abrupt identity. Source-based G/L rows remain future requirements, not tests claimed here. Use runtime inputs in both lanes; fixed expected values/flags/traces/errors, no oracle from implementation. Preserve existing212 guest records38 gate entries, all old parser/metadata/stress controls and historical evidence. Full Node/native rebuilt suites plus additive static-only/separate-coverage gate, typecheck/runner/probes/relevant host tests. No pins/C++/CL006, main merge or successor. Commit/push tested milestone then stop for independent review; report any interface conflict before broadening ownership.

Handoff (2026-11-02): implementation complete, **independent review pending**;
status remains in progress until coordinator acceptance. New
src/global-environment.ts implements the frozen ordinary-object/mutable-let
composite and captured strict host binding references without touching legacy
Environment/Reference or entry/Realm/evaluator wiring. Interfaces were recorded
before implementation in docs/validation/ts-033b/interfaces.md; fixed2025 and
pinned engine evidence retained/read, plus hash-verified supplemental clauses.
Both lanes pass15 named host rows with literal and renamed runtime inputs;
all212 old guest records and38 old gates preserved, plus the additive driver
gate1331/1331 static, zero dynamic. Metadata136/42 and deep-chain8 per lane,
typecheck, runner20, probes10, host73 and observation16 pass, no skips.
Evidence docs/validation/ts-033b/README.md includes original environment failures
(Zig sandbox access, temp rename/symlink), a corrected test-only type diagnostic,
and exact source hashes. No compiler workaround, source G/L execution,
multi-name instantiation, exotic globals, Error objects or conformance claim.
COORDINATION and CL006 remain their owners' files. Commit/push this bounded
milestone, then stop; no successor or main merge.

Coordinator acceptance:7183015 accepted after actual source/test/retained-spec review and independent second review. Rebuilt212/212 both lanes39static gates,host73; replayed15 named global rows with two runtime inputs per lane,metadata136/42 and8stress rows per lane,preservation passed. No actionable semantic defect. Distinct globalThis flexibility in host primitive is not authorization for initial Script bootstrap; bootstrap must use same ordinary object per accepted design. Logs build/ts033b-review-*.log, retained evidence restored/tree clean. Delegated push was rejected for destination authorization; coordinator publishes only after independent review under original owner's repository-specific authorization.

### TS-033C-P — Freeze Script Realm bootstrap and profile boundary

Status: **accepted** at `e460858` — Codex chat 01a19d84-b13d-7bb0-8106-47499a7d4b5c, sole design writer, observed base c15f27b (assignment base a4680f3), 2026-11-02. Prerequisite accepted TS033B7183015, remaining P2 in docs/script-execution.md. Design only: exact integration is needed because legacy run and observe directly construct Evaluator/block with realm.global, and callable entry switches to the defining Realm. Own docs/script-realm-bootstrap.md, reproducible source audit/matrix under docs/validation/ts-033c-p/, TASKS handoff. Coordinator owns COORDINATION; Claude CL006 preserved.

Freeze concrete Realm construction/profile APIs, ordinary global object and same-object globalThis, composite GlobalEnvironment ownership, profile-aware installation of exactly existing globals (undefined/NaN/Infinity/console/Number with fixed standard or documented host descriptors), intrinsic ownership and host seeding/read APIs. Default legacy Realm/.global.bindings behavior remains exactly unchanged. Decide explicit treatment of legacy global storage in Script Realms rather than accidental dual semantic sources. No Script source execution or source declaration instantiation yet.

Audit all entry paths run/observe/Evaluator constructor/block/call/createGuestFunction and host callable transfer, including saved builtins and Function.call forwarding. Freeze where profile mismatch and premature Script execution are rejected as host API errors, not guest errors, without adding side effects, leaked Realm/frame state or new observation schema. Preserve parser-observation meaning explicitly; do not relabel the current strict-call profile as Script. Distinguish safe bootstrap/internal builtin construction from unsupported guest function execution, and specify how same-profile cross-Realm calls remain possible later. Do not introduce a general scheduler or duplicate interpreter. Initial global/globalThis must be one ordinary object; exotic or distinct host globals stay out of scope.

Produce literal matrix covering both profiles, exact global descriptors/order/identity, per-Realm isolation, wrong-profile paths before mutation/calls, same-profile legacy behavior, captured references and host seeding, and exact eventual migration inventory. Give smallest single implementation assignment/files with guards and tests; identify later P3/P4 dependencies without implementing them. Consult fixed spec and pinned engine evidence, inspect actual call sites, record source identities and preserved212records39gates. Design-only/source audit evidence, no runtime/native/conformance claim without execution. No production/tests/manifests/pins/historical evidence/C++ edits; commit/push coherent design then stop for review, no successor/main merge.

TS-033C-P handoff (2026-11-02): design complete, independent review pending;
status remains in progress until coordinator acceptance. Frozen API/guard and
18-row future host matrix in docs/script-realm-bootstrap.md; reproducible source
audit in docs/validation/ts-033c-p/. Default legacy storage preserved; Script
owns one ordinary global/same-object this/composite record, exactly five current
globals and no legacy Map. Script source and builtin invocation remain closed;
profile checks cover run/body observation, constructor/block/closure/factory,
saved/direct builtin invoke and Function.call forwarding. Parser-only observation
stays non-executing and profile-neutral. Small single implementation assignment
and explicit P3/P4 guard replacement dependencies proposed, not started.
Audit:2387 protected tracked files unchanged,159 source/test identities and1002
migration occurrences; inherited212 records per lane/39 gates unchanged and all60
variants blocked. Hash-verified fixed2025 bootstrap clauses and retained pinned
engine evidence consulted. Source audit only; no runtime/native/conformance claim.
No implementation/tests/manifests/pins/historical evidence/C++/COORDINATION/CL006
edits. Stop for review after bounded commit/publication attempt; no successor.

Coordinator acceptance: e460858 accepted after actual entry/factory/direct-invoke source review, independent second review and reproduced audit2387 protected files159 source/test identities1002 migration occurrences,60 variants blocked. Inherited212/39 records only; no fresh runtime/native claim. No findings; B01-B18 and guard precedence are frozen for implementation.

### TS-033C — Script Realm bootstrap with closed execution boundary

Status: **accepted** at `a1806fa` — Codex chat 01a19d90-97b8-7c31-bfab-1d871d9f5bcc, sole writer, base abca67a, 2026-11-02. Prerequisite accepted TS033C-Pe460858 and TS033B7183015. Implement exact docs/script-realm-bootstrap.md contract and B01-B18. Own src/realm.ts profile/storage/bootstrap/helpers/wrapped builtin construction; src/builtins/number.ts installer call; listed guards only in interpreter.ts/observation.ts/evaluator.ts; additive test/script-realm-bootstrap.ts, runtime-input fixture, native gate and evidence docs/validation/ts-033c/; TASKS/feature-scope. Coordinator owns COORDINATION, Claude owns CL006. No runtime Reference union, parser, GlobalEnvironment algorithm, Function.call forwarding or protocol/schema changes.

Default legacy profile preserves every existing result/descriptor/budget/seed path. Script profile owns one ordinary global/globalThis object and composite storage, no unused legacy Map. Install exactly five ordered existing globals with frozen descriptors and fresh intrinsic ownership; no guest globalThis/constructor globals. Enforce profile-specific accessors and direct host seed validation. Run/body-observe/Evaluator/block/closure/guest-function factory cannot execute Script; parser-observation remains profile-neutral with existing limit precedence. Invocation checks cover Evaluator.call and every builtin wrapper including functionPrototype, before rejected dispatch effects/budget mutation, and preserve same-profile legacy cross-Realm cleanup. Script-to-Script invocation remains disabled; host errors must never become guest/protocol records.

Literal B01-B18 run in Node/native with both post-compilation input sets. Verify exact descriptor/key order/intrinsic identity, same-object globalThis, TDZ/captured refs, wrong-profile guard precedence at maxCalls0, saved/nested/coercion/array/Function.call paths, original guest/host abrupt identity and counters/Realm restoration. No mechanical old expectation migration: all212 old guest records39 old gate entries remain identical; add one static-only/separately parsed zero-dynamic target. Full rebuilt suites, typecheck/runner/probes,host73/observations16,metadata136/42/stress8 and TS033B15 rows/two inputs per lane. Preserve historical evidence and all blocked profiles; retain compiler/environment failures, no pin changes or workaround without review. Stop after coherent tested commit/push for independent review, no P3/P4 or main merge. Ask coordinator about genuine interface conflicts before broadening scope.


TS033C handoff (2026-11-02): exact Realm profile/storage/bootstrap APIs and closed
entry/dispatch guards implemented within the frozen file ownership. Parser
observation stays neutral; runtime/schema/Reference/GlobalEnvironment/grammar and
legacy expected results remain unchanged. Node/native212/212 each preserve exact
old records; all39 old gates plus new driver pass static-only and separately
parsed coverage (new driver2287/2287, zero dynamic). B01-B18 pass both runtime
inputs per lane; metadata136/42, stress8, global15/two inputs per lane,
runner20/20, probes10/10, host73/73, observations16/16 and typecheck pass.
Evidence docs/validation/ts-033c/ retains sandbox Zig/temp/symlink failures,
metadata repeated-open failures and the audit path correction. Task-local
metadata orchestration preserves all assertions and writes output once per lane.
Preservation:2386 protected files unchanged,60variants blocked; no compiler
workaround/pin change, interface conflict, successor or main merge. Await review.

Coordinator acceptance: a1806fa accepted after actual guard/bootstrap/test review and independent second review; no findings. Fresh rebuilt212/212 Node/native40static gates,host73; replayed B01-B18/two inputs,metadata136/42,stress8,global15/two inputs per lane and preservation. Logs build/ts033c-review-*.log. Retained evidence restored, tree clean. Script execution remains closed; only bootstrap/internal host operations enabled. Delegated push rejected; coordinator reviewed publication under original owner authorization.

### TS-033D-P — Script declaration planning and instantiation design

Status: **accepted** at `81c660a` — Codex TS033D-P sole design writer, chat 01a19d9f-8bb3-7522-b614-54cfe455ea2e, assigned base 99e8fcf, inspected 250aa1b (2026-11-02). Prerequisite TS033Ca1806fa; accepted Script design P3 is next. Own docs/script-declarations.md, reproducible source/semantic audit evidence under docs/validation/ts-033d-p/, TASKS handoff. Coordinator owns COORDINATION; preserve Claude CL006. No production/integrated tests/manifests/pins/C++/historical evidence changes.

Freeze smallest ordered P3 slices for a separate Script parse/declaration plan and eventual instantiation. Current parser.list conflates lexical/function/parameter names, while evaluator.block uses legacy Map hoisting; the new Script Realm intentionally cannot create/execute guest functions. Address these actual seams explicitly rather than removing guards to make examples run. Specify API/types and representation for scope summaries, simple var declarations/lists, top-level versus strict block functions, function-body vars/formals/lexicals, traversal that stops at nested functions, duplicate/overlap checks and last-declaration-wins ordering. No const/destructuring/default parameters/Annex B or broader syntax implied. Preserve legacy parse/audit/inspectScript behavior and keep current unsupported cases in legacy profile unchanged.

Use fixed2025 spec and pinned engine source; distinguish parse early errors, whole-source unsupported veto, runtime declaration conflicts and resource guards. Freeze actual global-instantiation ordering using accepted GlobalEnvironment primitives, conflict prechecks before language-visible bindings, TDZ creation, var reuse and function materialization. Explain how non-executable plans or host-only controls can be tested while Script callable factories/P4 execution remain disabled; stub/synthetic evidence must be labeled, never represented as guest source execution. Specify later factory/context integration prerequisites, original abrupt propagation, mutation on guard interruption, deterministic source ordering and source-unit provenance. No global Error object or new error certification claims from diagnostics.

Provide named literal G/L cases and neighbors, nested var collection, repeated functions, formal/lexical collisions, inherited globals/descriptors/extensibility, cross-unit conflicts, unsupported tails and large shallow ASTs (avoid recursive visitor crash). Explicitly distinguish declaration plan from executable AST/admission capability. Inventory expected legacy-preservation checks and any future opt-in-only changes. Recommend smallest next bounded implementation assignment with owned files and matrix; no omnibus P3/P4 implementation or hidden execution bypass. Keep212records40gates/all profiles blocked, no runtime/native claim without actual validation. Commit/push coherent design then stop for independent review, no successor/main merge.

TS033D-P handoff (2026-11-02): design in docs/script-declarations.md and
reproducible source/research evidence in docs/validation/ts-033d-p/. Freezes
flat non-executable plan types, parser purpose/var-list seam, scope/formal
conflicts and iterative traversal, exact global precheck/winner/creation/tick
ordering, synthetic host materializer boundary and future block/FDI/P4
prerequisites.33 named G/L/tail/resource rows with neighbors remain unexecuted.
Recommends D1 planner only, D2 host orchestration only, later separately frozen
P4 real factories/contexts; no guard removal or execution admission.
Fixed2025 document hash verified, nine clauses retained; pinned engine262 GDI/FDI
source and MIT license retained. Offline audit passes2436 protected files,
160 source identities,829 seam occurrences,60/60 variants still blocked;
212 records per lane/40 gates are inherited, not rerun. No production/test/
manifest/history/pin/C++/COORDINATION/CL006 edits, no fresh runtime/native claim.
Stop for independent review; no successor, branch switch or main merge.

Coordinator acceptance:81c660a accepted after actual plan/parser-seam review, fixed2025 GDI ordering check and independent second review of Script/block/function errors and instantiation boundaries. Reproduced2436protected/160source/829seam/33matrix/60blocked audit. Design only, no runtime/native claim. D1 only is ready; D2/P4 require later review.

### TS-033D1 — Non-executing Script declaration planner

Status: **accepted** at ff5be67. Sole writer chat `01a19dbb-4ed3-73d3-a3b8-29b6996ccc17`, base `c755a6a`, branch `codex/test262-classification`. Prerequisite accepted81c660a. Implement exact D1 in docs/script-declarations.md: planScriptDeclarations(unit), detached flat scope/declaration/function/conflict records and pure selectFunctionDeclarations. Private parser purposes legacy/return-audit/declaration-plan share grammar; plan-only simple var statements/lists and deferred scope conflicts. No executable body exposed, no Realm allocation or initializer evaluation, no new certification/admission. Keep all current public parse/audit/inspectScript semantics and closed Script execution guards unchanged.

Own src/script-declarations.ts, bounded parser.ts purpose/span/var path, syntax.ts var variant, evaluator.ts/script-metadata.ts unreachable-var invariant arms only, shared prologue helper if required without behavior change; additive test/script-declarations.ts/runtime fixtures/native gate, evidence docs/validation/ts-033d1/, TASKS/feature scope. Coordinator owns COORDINATION, Claude owns CL006. No Realm/GlobalEnvironment/runtime Reference/interpreter/observation/global orchestrator/materializer changes.

Freeze literal P projections of G01-G16/L01-L10/T01-T02/R01-R05 and neighbors before edits. H/F remain unexecuted. Check exact scopes/IDs/name occurrence order/span/initializer range/strictness, duplicate/lexical-var/formal conflicts after EOF, unsupported-tail veto/resource precedence, nested var collection stopping at functions, strict block functions, repeated function winner ordering, anonymous initializer scopes and sibling isolation. Include var a=function(){let x;},b; style nested initializer/declaration preorder. No relaxed legacy grammar/formals/reserved/escape/delete restrictions. Non-strict block functions blocked; current unsupported return behavior retained for new planner without legacy certification. Explicit stack/postorder collection must tolerate15000-link chains and source-cap flat lists, no recursive AST serialization for stress controls.

Independently baseline exact old parser/audit/metadata136/42/stress8 and add plan-specific legacy neighbors. Preserve212 old guest records40 gate entries; full Node/native rebuilt suites plus additive static-only/separate zero-dynamic gate, runtime-source input and literal oracle. Runner20/probes10/typecheck/host73/observations16, global15/two inputs and bootstrapB01-B18/two inputs per lane. No old expectation weakening or historical evidence rewrites; record any corrected frozen literal count with evidence for review. Commit/push coherent tested milestone and stop for independent review; no D2/P4/successor/main merge/pins/C++ changes.

D1 handoff: exact flat planner/pure selector, purpose-gated var lists, postorder block summaries and full-source conflict checks implemented. Node/native135 planner controls each; exact207 legacy parse/audit/metadata comparisons each (136 inherited +71 neighbors); metadata136/42/stress8, globals15/two inputs, bootstrap18/two inputs each. Rebuilt212/212 guest records,40 old gates +1 planner gate (740/740 static), runner20/probes10/host73/observations16/typecheck pass. Dedicated evidence and explicit test-label/fixture correction handoff in docs/validation/ts-033d1/README.md. D2/P4/Script execution remain closed; stop for coordinator review.

Coordinator acceptance: ff5be67 accepted after actual parser/planner/literal review and independent second review; no findings. Independently rebuilt212/212 each lane41static gates; replayed135planner controls,207full baseline records,metadata136/42,stress8,global15/two inputs,bootstrap18/two inputs per lane,host73 and preservation2437protected/60blocked. Fixture corrections source-units and parenthesized expression are justified by unchanged grammar. Logs build/ts033d1-review-*.log. Evidence restoration reported one mapped-file write failure, but git status confirms every tracked evidence byte unchanged. D1 remains nonexecuting.

### TS-033D2 — Host-only global declaration instantiation

Status: **accepted** at 08d5f38 after CL006 integration568680c. Owner: Codex D2 implementation chat `01a19dd6-e08c-75d2-8c46-f9d0379b280e`; assigned base `ab41e3d`. Implementation and evidence ready for independent review; acceptance incomplete due to final observation T30/CL006 cancellation race (15/16). D2 both inputs/both lanes pass, all42 native gates static, old212 records preserved. See docs/validation/ts-033d2/README.md. Prerequisite accepted ff5be67 and frozen docs/script-declarations.md D2. Sole next writer, branch codex/test262-classification. Implement only internal src/script-global-declarations.ts with exact DeclarationMaterializer and instantiateGlobalDeclarations interfaces, additive host test/runtime fixtures/static gate/evidence docs/validation/ts-033d2/, TASKS and feature inventory. Coordinator owns COORDINATION; preserve Claude CL006. Existing GlobalEnvironment algorithms, parser/plans, Realm, runtime, interpreter/observation and closed execution guards unchanged.

Freeze H G01-G16 with neighbors before implementation. Enforce Script-context/strict-plan/root-ID boundary order before ticks, root lexical/prior var checks, reverse function admission and winning source order, forward repeated var admission and unique creation, lexical TDZ then functions then vars. Exact eleven-tick sample and every resource prefix; no rollback after creation starts. Original guest abrupt record and host sentinel identity, descriptor flags, inherited/own/extensibility boundaries, unit/environment/materializer identity and repeated invocation against changed state. Test-only noncallable marker materializer; normal primitive result throws specified host error. No initializer/body execution, factories, callbacks in prechecks, evaluateScript exports or conformance admission. Trusted synthetic fault environments are labeled host controls, not exotic global support.

Use full frozen signature and literal expected descriptors/order/locations/effects, two post-compilation inputs with renamed names and marker7/11. Preserve212oldrecords41oldgates plus additive static-only and separately parsed zero-dynamic gate. Rebuild Node/native; replay D1 planner135/baseline207, metadata136/42/stress8, global15/two inputs/bootstrap18/two inputs; typecheck/runner/probes/host/protocol and all60blocked variants. No old expectation weakening/history/pins/C++ edits. Resolve genuine contract mismatch with coordinator before broadening. Commit/push coherent tested milestone, stop for independent review; no P4/successor/main merge.
Coordinator D2 review:08d5f38 has no source/second-review findings and passes independent212/212 lanes42static gates, all D2 two-input controls, D1/metadata/global/bootstrap replays,host73 and2482protected/60blocked preservation. Final acceptance remains pending CL006: retained producer observation15/16 T30 cancellation lifecycle race. No retry-to-green, test weakening or P4 successor. Claude-owned fix/integration must resolve the gate before acceptance.

Coordinator final acceptance (2026-11-03): CL006 PR81 a9e0b9d passed two source reviews and independent five reproductions/four mutation controls, two idle and one24-process-load full22/22 suites. Integrated as568680c into feature branch; host73/runner20 pass. Production sources unchanged. This resolves D2's retained historical observation blocker; D2 08d5f38 accepted using prior independent212/42 and full semantic/preservation replays. No main merge or new native claim from test-only integration.

### TS-033E-P — Strict Script execution integration design

Status: **accepted** at d6d8c5d — TS033E-P design writer, claimed/completed design 2026-11-03 at source base `043fdb4`. Design only, following accepted D1/D2 and bootstrap. Own docs/script-execution-integration.md, reproducible source/spec audit and literal matrix under docs/validation/ts-033e-p/, TASKS handoff. Coordinator owns COORDINATION. No production/integrated test/manifests/pins/history/C++ edits.

Freeze smallest staged P4 assignments against actual parser plan/private-body, GlobalEnvironment/D2, legacy Environment/Reference, Evaluator/block/call, Realm guards and completion/context seams. Design executable source records with private AST and provenance separate from nonexecuting flat plans; local declarative/function environments resolving to composite globals, captured reference strictness/resolve-before-RHS, function materialization/source/Realm ownership, simple-parameter FDI and strict block initialization order, this binding, normal-empty versus undefined completion and UpdateEmpty, monotonic budgets and finally restoration of Realm/source/call/depth. Existing legacy behavior must remain exact. Address arguments/eval and anonymous naming as explicit subset obligations; do not claim full FDI from reserved syntax. No removal of closed Script guards until a separately reviewed atomic entry/call design, no public observation/schema/profile/harness admission.

Read docs/script-execution.md and docs/script-declarations.md future P4 obligations. Consult retained fixed2025 specification and pinned engine sources for difficult semantics, retain precise evidence. Freeze literal matrices covering G/L/T/C/R/U relevant P4 rows, directive-only/empty profile distinction, cross-Realm guest/host abrupt cleanup, initializer order/TDZ/captured LHS, block/loop completion values and resource limits. Distinguish proposed cases from actual executions. Recommend first narrowly owned implementation slice and subsequent review boundaries; avoid omnibus P4. Audit unchanged212records42gates and60blocked variants without claiming fresh runtime validation. Commit/push coherent design and stop for independent review; no implementation/successor/main merge.

Design handoff: [integration seams](docs/script-execution-integration.md), [audit](docs/validation/ts-033e-p/README.md), [55 proposed literal rows](docs/validation/ts-033e-p/matrix.md). Recommend E1 private executable records only, then separately reviewed E2 environment/reference/completion helpers, E3 real factories/local setup, E4 atomic internal entry/call wiring. Review correction: E4 additionally blocked on independently accepted ER accessor/restricted-function-intrinsic prerequisite; reserved arguments/eval identifiers do not block f.arguments/f.caller. Fixed2025 clauses and F04–F09 freeze inherited/own/computed read-write/ordinary-object controls and future ownership. E1 unchanged; no task successor started or public admission. Fixed2025 bytes verified; pinned engine sources/license retained. Offline audit passes2542 protected files/165 source-test hashes/1374 seam occurrences, inherited212 records per lane/42 gates and60 blocked variants; these are preservation/source observations, not fresh runtime/native/static coverage. Both audit scripts pass Node syntax checks; git diff whitespace check passes. All execution matrix rows remain unexecuted requirements. Stop for coordinator independent review; COORDINATION untouched by this writer.

Coordinator acceptance: d6d8c5d accepted after actual correction/spec/matrix review and independent second re-review. ER prerequisite and F04-F09 resolve restricted-function-property omission without expanding E1. Replayed2542protected/165source/1374seams/55proposed/60blocked audit. Design-only evidence, no runtime/native claim.

### TS-033E1 — Private Script executable records

Status: **implemented; pending independent review** by sole E1 implementation writer, 2026-11-03, base d81840f. Prerequisite accepted d6d8c5d. Implement E1 only from docs/script-execution-integration.md. Own new src/script-record.ts; minimal parser internal successful-body handoff and declaration collector scope/node association; additive test/script-record.ts/runtime fixtures/native gate/evidence docs/validation/ts-033e1/, TASKS/feature inventory. No evaluator/runtime/Realm behavior changes, E2/E3/ER implementation, function allocation/instantiation/calls, public entry/schema/admission or guard removal. Coordinator owns COORDINATION.

Freeze concrete tagged result and detached inspection API plus literal P01-P05/U01 before edits, with R06/source/depth/deepchain and wrong-Realm/profile/conflict/tail neighbors. Require Script Realm before parsing, then lexical/resource/full grammar/EOF/conflicts, then strict profile; empty source profile-rejected, strict directive-only eligible. Retain body and complete plan from the same parse, exact unit text/ID and Realm identity, full nested function/block mapping and inherited strictness. IDs paired with record identity; duplicate names/anonymous functions cannot collide. No constructor accepts forged AST/plan pairs, no writable body/maps in inspection. Copy nested snapshot arrays/sites/locations/directives; mutate input/snapshots to prove isolation, retain independent records for equal text/IDs and different Realms. Use iterative mapping; no deep clone/JSON/recursive walk or function-substring reparse. No execution or guest-object allocation effects; no hashes in guest core. Private consumer seam must not publish arbitrary executable state. Report actual compiler boundary before workaround/pin change or scope expansion.

Preserve complete old parser/audit/planner/metadata records, including D1 135/207, metadata136/42/stress8, global15/two inputs/bootstrap18/two inputs and D2 two inputs per lane. Full rebuilt Node/native212oldrecords42oldgates plus additive static-only/separately parsed zero-dynamic gate; postcompilation two-input literal controls; typecheck/runner20/probes10/host73/observations22/all60blocked. Do not weaken old expectations or edit historical evidence. Commit/push coherent tested milestone and stop for independent review; no successor/main merge/C++ changes.

E1 handoff (2026-11-03): private opaque records and detached flat inspection implemented with same-parse body/plan/source and iterative scope/declaration node associations. Realm-first, whole-source grammar/resource/EOF/conflict-before-strict boundary preserved; no execution/guest allocation/guard or public admission changes. P01-P05/U01, nested mapping/snapshot mutation, source/depth/deepchain and two post-compilation inputs pass Node/native. Full rebuilt212/212 per lane,43 static-only/separate zero-dynamic gates (42 old preserved; new1858/1858), D1 planner135/baseline207, metadata136/42/stress8, global15/bootstrap18/D2 with two inputs pass. Typecheck/runner20/probes10/host73/observations22 pass;2546protected files and60blocked variants preserved. SourceText-vs-unit identity compiler boundary reduced and retained: rejected dynamic/copying variants; explicit same-shape parser source retention preserves identity without syntax/runtime/pin changes. Full evidence and failures: docs/validation/ts-033e1/README.md. Stop for independent review; no successor/main merge; COORDINATION untouched.
Coordinator acceptance:46ebdea accepted after independent full212/212 Node/native43static gates, E1 two-input controls, D1 135/207,metadata136/42stress8/global15/bootstrap18/D2 replays, SourceText reduction/API negatives,host73/observations22 and2546protected/60blocked preservation plus second source review. No Script execution admission.

### TS-033E2 — Script binding and statement-completion helpers

Status: **implemented; pending independent review** by sole E2 implementation writer, chat 01a19f2f-bbc8-78e3-b227-f49c05c3f4ff, base14704f7, 2026-11-03, after accepted46ebdea. Sole next local writer on codex/test262-classification. Implement only E2 of docs/script-execution-integration.md. Own new src/script-environment.ts and src/script-completion.ts (names may be refined), additive test drivers/fixtures/native gate entries, docs/validation/ts-033e2/, TASKS/feature inventory. Coordinator owns COORDINATION. Preserve runtime.ts legacy Environment/Reference/Completion, GlobalEnvironment semantics, Realm/parser/record/evaluator/entry/observation behavior. Any required existing production signature migration must be returned for review before edits.

Freeze exact helper API and literal expectations before implementation. Tagged declarative/function/global Script environment union, private mutable local storage and explicit outer link to accepted composite global terminal; function record stores strict thisValue and callable identity as host metadata only. No new script callable/factory or FDI/body/block execution. Captured strict binding references copy location and resolve iteratively once; TDZ shadows outer, missing captured base remains missing after RHS creates binding, abrupt Has/Get/Set identity preserved, global live descriptors rechecked. Cover local creation/initialization/mutation, duplicate/missing invariants, nested shadowing and sibling isolation, long outer chains, strict this/callee identity, identifier-call undefined receiver, and captured-local/global references across intervening changes. No property-reference/evaluator coercion migration or standard arguments claims.

Separate Script statement completion payload empty vs guest undefined: normal/break/continue empty or Value, return Value and unchanged ThrowCompletion. UpdateEmpty preserves nonempty/return/throw original identity and only fills empty; explicit boundary helpers if necessary, no reinterpretation of legacy normal(undefined). Literal C/L/T host projections must test last-value propagation through empty normal/break/continue, zero/false/undefined values, original throw/resource records, and no synthetic source-execution claims. Loop/if/function execution remains E4; test pure helper semantics, not a duplicate evaluator. Two distinct post-compilation inputs, actual expected values/traces, no self-derived oracle.

Preserve212 old guest records43 old static gate entries and E1/planner/metadata/global/bootstrap/D2 controls. Full Node/native rebuild, additive static-only compilation and separately parsed zero-dynamic coverage; typecheck/runner20/probes10/host73/observations22/60blocked. Keep compiler workarounds isolated with reductions and report blockers before expanding scope. No E3/ER/E4, guard removal, source execution/profile/conformance admission, main merge, pin/C++ or historical evidence changes. Commit/push coherent tested milestone and stop for independent review.

E2 handoff (2026-11-03): additive tagged local/function/global environment and captured strict reference helpers; separate empty/value statement payloads and identity-preserving UpdateEmpty/expression adapter. No existing production migration or execution/factory/FDI/ER/admission changes. Frozen L/T/C controls plus two runtime inputs pass both hosts; full rebuilt212/212 per lane,44 static-only/separate zero-dynamic gates (43 inherited; E2 1274/1274), E1/planner135/baseline207/metadata136/42/stress8/global15/bootstrap18/D2 replays, typecheck/runner20/probes10/host73/observations22 pass. Preservation2600 protected files/60blocked; coordinator-owned AGENTS policy and COORDINATION changes excluded. SC2003 union-return boundary reduced; explicit ThrowCompletion local preserves identity in both hosts, no pin/dynamic workaround. Failures and successful evidence retained in docs/validation/ts-033e2/README.md. Stop for independent review; no successor or main merge.

Coordinator acceptance: df1407f accepted after source and second review; independently rebuilt 212/212 both lanes, 44 static gates, E2/E1 and inherited replays, union reduction, host 73/observations 22 and 2600 protected/60 blocked preservation. No source execution or admission.

### TS-033E3-P — Exact function materialization and setup contract

Status: **design complete, awaiting independent review** — sole E3-P design writer, 2026-11-03, base 65f0e10; after accepted df1407f. Design only on current feature branch. Own docs/script-function-materialization.md, docs/validation/ts-033e3-p/ and this TASKS entry. No production, tests, manifest, historical evidence, pins, C++ or coordinator changes. Refine accepted E3 in script-execution-integration.md against actual E1/E2 interfaces, not a new broad interpreter design.

Freeze the concrete private-record consumer and record-bound function factory API without publishing mutable AST/maps or accepting forged plan/node pairs. Inventory exact Callable discriminant/exhaustive consumers and ScriptFunctionEnvironment typing, Realm factory/toString paths, closed direct invoke/evaluator guards. Define exact record/Realm/unit/scope/environment validation before effects, descriptor/source/name/length/prototype/constructor identity and factory budget ticks. Preserve source provenance and fresh closure identities, distinguishing host trusted controls from future execution. Explain NamedEvaluation eligibility and parentheses preservation at actual parser/private-node seams without widening legacy grammar.

Freeze bounded function/block declaration setup helpers and D2 adapter interfaces with exact operation/tick order, successful and abrupt prefixes, original throw identity, parameter/var/function collision rules, lexical TDZ and strict this capture. Use fixed2025 and pinned retained engine evidence, rereading relevant algorithms only where needed. Standard arguments binding omission remains explicit subset debt; ER restricted-function accessors remain mandatory before E4. Do not bypass any execution guard or claim full FDI/conformance. Resolve the private-state versus factory boundary concretely before implementation; recommend small ordered implementation slices if combined E3 is too broad.

Provide literal host acceptance matrix and exact production/test file ownership per proposed slice; include wrong record/Realm/scope/unit/context, duplicate names/winner order, named/anonymous source ranges, fresh identities, descriptor flags, sibling closure environments, declaration prefix failures and budget cleanup. Preserve all current 212 guest records/44 static gates and E1/E2/inherited checks in audit; audit source identities and blockers, no fresh native claim unless actually built. Commit coherent design and stop for independent review; no implementation/successor/main publication by designer. Coordinator regularly publishes accepted milestones.

E3-P handoff: docs/script-function-materialization.md freezes record-owned private consumers, branded script-guest callable, closed exhaustive migrations, descriptor/source identity, parenthesized-LHS naming preservation, and exact factory/function/block/D2 tick prefixes. Two proposed separately assigned E3A/E3B slices, 33 literal host controls; ER still mandatory before E4. Offline audit passes2649protected/170source hashes/267seams, inherited212/212/44 and60blocked; fixed2025 naming clauses retrieved at retained hash, engine262 pin rehashed. Syntax/whitespace checks pass. No production/tests/gates changed; no fresh native or execution claim. Stop for independent review, no successor or publication.

Review correction to8e69fc0: replace record-owned activation registry with activation-local private key/scope/phase and one non-retaining key per record; no weak collections or GC/compiler claims. Explicit E3A ownership of genuine empty function activation allocation and E2 fixture migration; E3B owns block activation/setup/D2. All33 matrix rows mapped to executable slice boundaries, with P01 allocation versus setup traces separated. Same preservation audit/syntax/whitespace checks pass; design awaiting re-review, no implementation or successor.

Coordinator acceptance: 0a2a53e accepted after actual correction and independent second review. Replayed2649protected/170source/267seams/33proposed/60blocked audit and syntax/whitespace checks; design only. No native/runtime claim; E3A now ready as scoped below.

### TS-033E3A — Script function factory and empty activation

Status: **implemented, pending independent review** (2026-11-03) after accepted0a2a53e. Sole local implementation writer on current feature branch. Implement exact E3A of docs/script-function-materialization.md and its validation matrix slice table. Own src/script-record.ts (opaque branded script-guest callable, factory/source/formal/naming inspections, ActivationKey/FunctionActivation, createFunctionEnvironment), src/runtime.ts Callable type-only addition, src/realm.ts bounded wrapper, src/builtins/function.ts pure source helper/exhaustive arms, src/evaluator.ts closed explicit branch only, src/script-environment.ts callable typing/validation only, src/parser.ts and script-declarations.ts private assignment naming bridge only. Own new test/script-function-materialization.ts, additive fixtures/gate/evidence ts-033e3a, existing test/script-environment.ts genuine factory/empty-activation fixture migration, TASKS/feature inventory/design implementation notes. Coordinator owns COORDINATION.

No instantiateFunction, BlockActivation/setup, global materializer/D2 adapter or stubs; those are E3B. No ER accessor migration, frame/call execution, guard bypass, profile/CLI/observation/conformance admission. Preserve all legacy behavior and parser AST outputs. Retain no mutable AST/maps/plan consumer export, arbitrary constructor pairs, record-to-activation collection, WeakMap assumption or synthetic script callable. Validate record/Realm/context/scope/environment chain/brand before any ticks/effects. Preserve exact source and fresh function/prototype identity, descriptors and inferred-name rules. Implement M and empty-allocation A ticks only; unchanged call counters/Realm/depth and original throw identity. Prove private class/subclass/key and Expr-map static lowering or stop with reduction for bounded revision, never dynamic compilation or pin changes.

Freeze literal expectations before edits; run F01-F12,N01-N05,S05 and E3A P01 (M/A) exactly, not future setup/execution projections. Parenthesized LHS naming eligibility false, parenthesized RHS forwarding, assignment-surrounding parentheses and nested RHS distinctions; detached inspection mutation and legacy parser preservation. E2 fixture must retain original receiver/reference/completion assertions and output records using genuine factory/empty activation. Test impossible/foreign/cyclic chains and malformed/forged identities before effects, runtime-source two inputs, direct-call/builtin guards and pure toString with all variants. Execution/naming evaluation order remains E4.

Preserve212 old records44 old gates, E1/E2 two inputs,D1 135/207,metadata136/42/stress8,global15/bootstrap18/D2 two-input controls. Full Node/native rebuild, additive static-only plus independently parsed zero-dynamic coverage, typecheck/runner20/probes10/host73/observations22/60blocked. Preserve historical evidence,C++,pins,source fixtures; document exact authorized fixture/API migrations without weakening expectations. Commit coherent tested milestone and stop for review; coordinator publishes accepted work to main. No successor or main merge by implementation writer.

Coordinator bounded E3A revision (2026-11-03): independent reduction confirms SC2002/SC1090/SC2003 for impossible host casts. Keep F07/F09 structural fake/private-class and legacy-to-Script union cast negatives as Node runtime tests plus native compile-rejection tests with exact diagnostics; explicitly label these as compile-rejected, never native runtime passes. Both-host runtime controls remain mandatory for every representable foreign record/Realm/context/scope, malformed/cyclic chain, descriptor/identity/guard/resource case. No production API weakening or fake callable, no dynamic compilation or pin changes. Preserve original attempted driver/failures; inventory exact moved cases. Restore candidate and complete original acceptance, including full rebuilt212 records/44 old gates plus additive static-only/separatecoverage and all focused controls. bdf684d is compiler-stop evidence only, E3A remains incomplete. Sole original writer resumes; no successor.

E3A implementation handoff: factory/private naming/real empty activation only; no setup or execution. Full Node/native212/212;45 static-only gates with independently parsed zero-dynamic coverage (CLI2348,E2 2075,E3A2577);runner20/probes10/host73/observations22 and all required focused replays pass. Protected2644 files,60 blocked variants, original failed driver/evidence preserved. Approved hostile-cast split has explicit REPRESENTABLE runtime labels and separate Node negatives/native compiler rejections. One documented module-only import beside Realm factory wrapper fixes pinned opaque-class reachability while Callable retains its type-only import and classes remain private. See docs/validation/ts-033e3a/IMPLEMENTATION.md for exact migrations, reductions and results. Await independent acceptance; no successor or publication.

Coordinator acceptance: d33504c accepted after actual/second source review and independently rebuilt212/212 both lanes45static gates, E3A/E2/E1/inherited replays, both compiler reductions,host73/observations22 and2644protected/60blocked preservation. Approved host-negative split remains explicit; no execution admission. E3B now ready below.

### TS-033E3B — Function/block declaration setup and bound global adapter

Status: **implemented; awaiting independent review** — sole writer chat 01a19f9d-d2dc-7cd0-9076-92308959332b, base 3c76a88. Literal matrix frozen in docs/validation/ts-033e3b/frozen-matrix.md before production edits. After accepted d33504c. Sole local implementation writer. Implement exact E3B of docs/script-function-materialization.md and its ts-033e3-p/matrix.md slice table. Own src/script-record.ts only for production: BlockActivation, createBlockEnvironment, instantiateFunction, instantiateBlock, createGlobalMaterializer, instantiateGlobals; reuse existing private FunctionActivation/key/phase methods. Own new test/script-function-setup.ts, fixtures/script-function-setup/a.txt and b.txt, additive native gate, evidence docs/validation/ts-033e3b/, TASKS/feature inventory/design notes. No existing E2 fixture/environment/D2/parser/runtime/Realm/evaluator/entry changes without reviewed contract revision. Coordinator owns COORDINATION.

Validate private callable/record/Realm/scope/outer/context and fresh activation before ticks or changes; copy args before begin, preserve Value identities. Activation-owned key/scope/phase only, no record-to-frame registry. Mark started before first setup tick, complete after success; failed/completed setup cannot retry, no rollback. Private state stays in record; public inspection snapshots never become executable inputs. Exact reverse function selection/all-occurrence ticks, parameter create/initialize, forward vars, lexical TDZ and winning closure publication from frozen design. Blocks initialize each function immediately in lexical order. D2 full five-argument identity-bound callback and unchanged original orchestrator; real wrapper adds factory M and rechecks current globals on each call.

Freeze literal S01-S04/S06-S07/B01-B03/G01-G03/P01-P03 expected values, descriptors, scopes and trace prefixes before edits. Exact function18/block6/global12 tick arrays, plus original11 marker replay. For every budget/host throw prefix assert original object/origin/location, complete binding TDZ/value state and detached allocation counter, unchanged saved nonzero calls/depth/Realm, monotonically consumed steps. Test args-array mutation during tick, same-name parameter/var/function winner collisions, missing/extra args, fresh sibling/invocation identities, same-Realm cross-record captured outer, foreign/copy/scope mismatches, duplicate/failed setup retries and genuine closure captures. No host fake script callable or AST pair; if a negative cannot be represented natively, preserve rejection evidence and request bounded review rather than dropping assertion. Reuse E3A's approved split only for its existing unchanged cases.

No initializer/body evaluation, frame activation/call/guard removal, ER accessors, E4, profile/CLI/observation/conformance admission. Arguments environment omission stays explicit subset debt; inherited restricted function properties still await ER. Preserve212 old records45 old gates, all E3A/E2/E1 two-input controls,D1 135/207,metadata136/42/stress8,global15/bootstrap18/D2. Full Node/native rebuild plus additive static-only and independently parsed zero-dynamic coverage,typecheck/runner20/probes10/host73/observations22/60blocked. No C++/pins/historical evidence changes. Commit coherent tested milestone, stop for independent review; coordinator publishes accepted work. No successor/main merge by writer.

E3B handoff: private activation-owned block setup, function setup and identity-bound D2 adapter implemented only in src/script-record.ts. Both-input literal18/6/12 prefix controls plus original11 marker pass in both hosts; all required S/B/G/P rows covered, P02 explicitly tick-boundary coverage. Full212/212 lanes46static gates (45 preserved), typecheck/runner20/probes10/host73/observations22 and every inherited replay pass. Preservation2727protected/60blocked, unchanged exact212 records/lane. Test-only parameter-property SC1090 reduced and explicit this.realm passes native/zero-dynamic; no production workaround or pin change. Evidence docs/validation/ts-033e3b/README.md. Stop for independent review; no ER/E4/execution/admission, successor or main publication.

E3B independent-review correction: candidate9d28df0 rejected for missing original
block outer identity. The activation now retains private original outer and
validates it before phase/ticks. Both-host regression rejects same-Realm outer
replacement with zero setup effects, restores original and succeeds from fresh
phase, then verifies the closure's original-chain binding identity. G03 docs now
explicitly distinguish detached-unit rejection from individually reaching later
private declaration/function identity clauses. Full revalidation passes:212/212 Node/native,46static gates,runner20/probes10/host73/observations22, all E3A/E2/E1/D1/metadata/global/bootstrap/D2 replays and2727protected/60blocked preservation. Ready for independent re-review; no
private-state exposure, successor or publication.

Coordinator acceptance: 5d1bc42 accepted after corrected original-outer identity regression, independent source/second review, rebuilt212/212 both lanes46static gates, all focused/inherited controls,host73/observations22 and2727protected/60blocked preservation. No execution admission.

### TS-033ER-P — Accessor and restricted-function integration contract

Status: **design complete; awaiting independent review** — sole ER-P design writer, chat 01a19fc8-8ca6-7422-81da-29fdeac8afcd, base b33fae6, 2026-11-03, after accepted E3B. Own docs/script-accessor-integration.md, docs/validation/ts-033er-p/ and this task entry only; coordinator owns COORDINATION. Audit actual production descriptor/Get/Set/context consumers and subclass overrides, current E2/E3 references and host inspection APIs. Freeze a complete data/accessor descriptor model, definition/validation transitions, receiver-preserving invocation with shared OperationContext, exact migration ownership and small staged implementation slices. Use retained pinned specification/engine evidence and literal positive/negative/order/abrupt/budget matrix. Preserve legacy bootstrap; Script-only inherited caller/arguments accessors and Realm-local ThrowTypeError follow mandatory ER section of docs/script-execution-integration.md, including configurable descriptors and guard limitations. Distinguish host descriptor/dispatch evidence from E4-only authorized Script invocation and actual Error-object debt. No production implementation, existing test edits, guard bypass, execution/profile/conformance admission, pin changes or historical evidence rewrites. Commit design and stop for independent review.

ER-P handoff (2026-11-03): docs/script-accessor-integration.md freezes tagged complete data/accessor storage, partial update validation/transitions, receiver-preserving shared-context Get/Set and explicit contextful global/E2/host inspections. Proposes independently assigned ER-A atomic migration and ER-B guarded Script-only restricted bootstrap; expands exact proposed ownership to eleven production files and a conservative 45-file host migration allowlist. 36 literal rows distinguish generic host controls from E4-only actual thrower execution. Pinned fixed2025/engine262 source retained; offline audit: 2786 protected / 172 source / 1254 matched lines, inherited 212/212/46 and 60 blocked; syntax/whitespace checks pass. No production/tests/native build/execution/admission change; all guards and diagnostic-TypeError debt remain. Existing mandatory ER section is referenced unchanged because outside writer ownership. Stop for coordinator review; no successor/main merge.

Coordinator acceptance: d0d0e82 design accepted after source/second review and independently replayed2786protected/172source/1254seams/36rows/60blocked audit. Approve explicit eleven-file production and45-file host migration ownership, shared-context host reads and trusted invalid-record host-error boundary. No new runtime/native claim.

### TS-033ER-A — Ordinary accessors and shared context migration

Status: **implemented; awaiting independent review** — sole writer chat 01a19fdf-c4a4-72f0-9d43-b95842c600f1, base015543d, 2026-11-03. Literal matrix copied to docs/validation/ts-033er-a/frozen-matrix.md before production edits. After accepted ER-P. Implement only ER-A in docs/script-accessor-integration.md. Own the exact eleven production files and45 host-test files in its ledger/migration-files.md, new test/property-accessors.ts and two input fixtures, additive build-native gate, TASKS/feature inventory and new docs/validation/ts-033er-a/. Coordinator owns COORDINATION. Complete tagged data/accessor descriptors, validation/transitions, receiver-preserving Get/Set through existing OperationContext, exact global/E2/host read migrations and subclass semantics atomically. Freeze literal R01-R28/R33-R34 before production edits. Preserve old expected records and instrumented override traces; no descriptor-read substitution for semantic Get, new session, wrapper tick or guard bypass. Require212oldrecords46oldgates plus additive static-only/separate zero-dynamic coverage, full Node/native, two-input focused controls and all inherited replays/host73/observations22/60blocked. Preserve C++,pins,historical evidence. No ER-B restricted bootstrap, E4/execution/admission, syntax/reflection/Proxy or unrelated cleanup. New compiler problems require retained small reduction and coordinator review before workaround. Commit coherent tested milestone and stop for independent review; no successor/main merge by writer.

ER-A compiler-stop handoff: unfinished candidate retained in docs/validation/ts-033er-a/candidate.patch; production and existing tests restored to accepted base. New SC1090 in host definition overrides with DataDescriptorUpdate versus widened base PropertyDescriptorUpdate reduced in override-before/after.ts: both Node7, exact parameter type after native7/4 static statements. Propose completing exact host override signature migration within approved ownership; no production workaround applied pending required review. Initial CLI native2661/2661 and preliminary accessor driver pass; old Node211/212 exposed frozen SameValue Value-wrapper replacement, corrected in retained candidate and focused driver passes. No full acceptance claim; remaining matrix, context review, additive gate and all required replays remain. See evidence README. No ER-B/E4 or successor.

Coordinator bounded resumption (2026-11-03): independently reproduced SC1090 before/exact-type native7 after. Complete exact PropertyDescriptorUpdate override and storage type migration within existing allowlist, as already required by design. No production API/pin/cast workaround or new ownership. Preserve all original failure evidence and expected records; finish README's context-forwarding cleanup and full original acceptance. d09f439 remains evidence-only, not implementation acceptance.

ER-A implementation handoff: exact eleven-file descriptor/context integration and42 necessary host migrations within the45-file allowlist are complete. R01-R28/R33-R34 pass both runtime-read inputs in Node/native. All212 old records/lane match accepted E3B exactly;47 static-only gates (46 retained plus accessor) independently show zero dynamic tier, CLI2665/accessor3193. Typecheck/runner20/probes10/host73/observations22 pass; E3B18/6/12 and original11 marker, E3A/E2/E1, D1 135/207, metadata136/42/stress8, global15/bootstrap18/D2 and unchanged hostile-cast/reachability reductions replay successfully. Preservation2737protected/60blocked and original compiler-stop evidence pass. Frozen SameValue no-op retains stored Value identity; all semantic reads keep explicit context and original receiver. Known signature/never-return test migrations completed without production workaround. Windows stress-results reopen failure retained; task-local replay writes once and passes both lanes. Final stronger invalid-record no-call/no-tick assertion rebuilt/replayed separately with the additive gate refreshed. See docs/validation/ts-033er-a/IMPLEMENTATION.md and result files. Stop for independent review; no ER-B/E4, successor or main publication.

ER-A review follow-up: runtime-fed input now selects literal alpha/beta keys, seven/eleven Value identities and distinct left/right receiver identities for actual Get/Set. Exact traces, stored identity/no shadow and missing/absent-endpoint/receiver-accessor negative neighbors pass both inputs on Node/native. Only the additive driver changed; typecheck and static-only/separate coverage3236/3236 pass. Source hashes, additive gate and preservation refreshed; original assertions/failure evidence retained. Ready for coordinator re-review and independent inherited replay; no successor/publication.

Coordinator acceptance: cd9068b accepted after actual/second production review and input-regression re-review, independent212/212 lanes47static gates plus corrected driver3236static/two inputs,all inherited replays/host73/observations22/2737protected/60blocked. No Script execution admission.

### TS-033ER-B — Guarded Script restricted-function bootstrap

Status: **implemented; awaiting independent review** — sole writer chat 01a1a017-50d5-7382-afe2-c18c2236bf20, accepted base31cedae, checkout529a022, 2026-11-03. Matrix frozen byte-for-byte in docs/validation/ts-033er-b/frozen-matrix.md. Existing bootstrap B03 exact keys and B04 data-only descriptor inspection use the precise two-site migration approved below; the pre-implementation proposal remains in docs/validation/ts-033er-b/README.md. Implement exact ER-B of docs/script-accessor-integration.md, frozen R29-R32/R35 only. Own src/realm.ts bootstrap hook and new src/builtins/restricted-function.ts, new test/script-restricted-properties.ts and two fixtures, additive native gate,TASKS/feature inventory,new docs/validation/ts-033er-b/. One Realm-local guarded ThrowTypeError shared by all four Function.prototype caller/arguments endpoints, exact descriptors/metadata/extensibility/prototype/keys and per-Realm identity. Legacy bootstrap unchanged; no guard bypass/direct callback unwrap or actual Script invocation claim. Genuine Script functions inherit configurable accessors; ordinary deletion/redefinition/own shadows work. Host dispatch projections explicitly distinguished from guarded actual invocation; E4 R36 remains blocked. Preserve212records47oldgates plus additive static-only/separatecoverage and all inherited controls including ER-A runtime-selected inputs,host73/observations22/60blocked. Any required old expected-surface change requires specific reviewed revision first; no production expansion/pins/history/C++ changes. Commit coherent tested milestone and stop for independent review; no successor/main merge.

Coordinator approved bounded ER-B migration: test/script-realm-bootstrap.ts B03 exact Script Function.prototype key order gains caller,arguments between length and call, with explicit accessor Efalse/Ctrue/shared endpoints checks. B04 discriminate only that Script prototype's restricted accessor descriptors, assert local sharing and cross-Realm distinct objects while retaining all existing fresh data-method/object checks. Preserve own() data invariant, legacy keys, B01-B18 IDs/stdout and all other assertions. Exact proposal in ts-033er-b/README.md accepted; original sole writer may implement ER-B plus these two sites, no other ownership expansion.

ER-B implementation handoff (2026-11-03): Script-only Realm hook and guarded per-Realm thrower implemented; exact R29-R32/R35 descriptor/identity/metadata/ordinary-neighbor/guard controls pass both runtime-selected inputs in Node/native. Approved B03/B04 migrations preserve all18 bootstrap IDs/stdout and legacy invariants. Full212/212 records/lane match ER-A exactly;48static-only/separate zero-dynamic gates (47 retained+1), CLI2676/bootstrap3086/restricted2790. Runner20/probes10/host73/observations22 and all inherited ER-A/E3B/E3A/E2/E1/D1/metadata/stress/global/bootstrap/D2 replays pass. Preservation2885protected/60blocked. Test-only PropertyKey join rejection retained/reduced to SC1090 before versus exact key comparison after (Node both; native after4static); no production workaround. See docs/validation/ts-033er-b/IMPLEMENTATION.md and raw evidence. No actual thrower/Script execution, E4/R36, admission or successor/main publication. Stop for independent review.

Coordinator acceptance:51026ff accepted after actual/second review,independent212/212 lanes48static gates,all focused/inherited controls/reduction,host73/observations22 and2885protected/60blocked preservation. ER prerequisite complete; actual Script calls/entry remain closed until E4 separately reviewed.

### TS-033E4-P — Atomic internal Script execution contract

Status: **design complete; awaiting independent review** — sole writer chat 01a1a035-4b0b-7f81-aa2a-9b551a0fc71d, base9b540e7, 2026-11-03, after accepted ER-B. Own new docs/script-execution-activation.md,docs/validation/ts-033e4-p/,this TASKS entry; coordinator owns COORDINATION. Refine accepted E4 section of script-execution-integration.md against actual E1/E2/E3/ER source. Freeze precise private executable-record/body access,shared Evaluator Script statement/expression/reference/closure dispatch,session/frame/OperationContext provenance,Realm builtin authorization APIs and exact file ownership. Preserve legacy paths and cross-profile guards; no arbitrary host context authorization,public AST escape or allowScript boolean. Freeze literal full execution/cleanup/budget matrix including ER R36/F04-F09,empty completion semantics,FDI/block/D2 order,strict this,cross-Realm source and shared monotonic limits. Address current grammar/subset omissions explicitly,including arguments,without false conformance. Determine smallest coherent atomic implementation boundary; no usable partial execution with incomplete semantics. No production/test edits,guard removal,execution,CLI/observation/profile/conformance admission before independent design review. Use pinned spec/engine evidence and repeatable source/preservation audit. Commit design then stop; no successor/main merge.


E4-P handoff (2026-11-03): docs/script-execution-activation.md freezes exact proposed ownership, private record/shared evaluator co-location, opaque internal session/frame API, one-use exact builtin invocation permits and legacy-preserving dispatch. Owned evidence retains all55 E-P rows, E3B18/6/12 and ER R36, adds18 activation controls plus13 literal restricted source traces and root/call/loop resource-prefix contracts. Offline audit passes2956protected/175source-test hashes/279seams, inherited212/212/48 and60blocked; pinned research hashes, matrix copies, script syntax and whitespace checks pass. No production/existing-test edits, guard changes, execution/native build/admission or compiler feasibility claim. Arguments/Error-object/grammar debt explicit; bounded reduction proposed only if compilation needs it. Ready for independent design review; stop, no successor/main merge.

E4-P review correction (2026-11-03): initial87acb25 remains unaccepted. Design now requires ordinary unbound call/tick functions to authenticate their invocation receiver against the exact active view before any counters/ticks/permits; explicit clone/spread/proxy/detached/wrong-rebinding negatives and authentic-view positives preserve the capability boundary and frozen-view mutation checks. A10/A11 separate every actual execution resource prefix from reachable real callback host-sentinel cleanup and inherited host-helper per-tick fault injection; no arbitrary engine-tick injection or hidden hook claimed. Audit additionally preserves13 literal restricted traces and four minimal trace rows against87acb25, with receiver-preserving source callsite inventory. Same2956protected/175source/279seams/212records/48gates/60blocked; design only, pending re-review. No production assignment or publication.

Coordinator acceptance:0e31b22 accepted after actual/second re-review and2956protected/175source/279seams/13trace/60blocked preservation audit. Receiver-authentication and honest fault lanes resolve findings. Design only; native feasibility remains implementation acceptance gate.

### TS-033E4 — Atomic internal Script activation

Status: **accepted e67c927 — independent full validation and second review** (2026-11-04). Owner: chat 01a1a522-96ef-72a3-93bc-c8ddcc56eb75; semantic base6a45e89, coordinator dispatch3ce9d0b. Prior writer stopped after evidence only; this assignment supplies the atomic internal candidate below. Implement docs/script-execution-activation.md with only the explicit supersessions in accepted docs/script-execution-capability-boundary.md. The latter governs captured-owner authority and profile-first diagnostics. Own new src/script-execution-internal.ts, facades src/script-record.ts and src/evaluator.ts,new src/script-execution.ts,realm.ts authorization only; new test/script-execution.ts,two fixtures,additive native gate,TASKS/feature inventory,new docs/validation/ts-033e4/. Existing tests/runtime/parser/other production read-only unless precise reviewed revision. Co-locate private record/shared engine; no duplicated interpreter,AST escape,arbitrary context authority or allowScript bypass. Freeze all inherited55/E3/ER R36 and A01-A18/13traces before edits. Captured-owner active-session callbacks and one-use exact builtin permits; original legacy wrappers,record identity,FDI/block/GDI/completions/strictthis/cross-Realm provenance/shared monotonic steps and finally restoration preserved. All real resource prefixes; reachable callback host faults and inherited host-helper injections separately labeled. No partial execution publication; entire internal boundary must pass independent review. Require212oldrecords48oldgates plus additive static-only/separatecoverage,full Node/native and all focused/inherited/host73/observations22/60blocked checks. No CLI/interpreter.run/observation/schema/profile/test262 admission,arguments/Error-object claims,C++/pins/history changes. Retain/reduce new compiler failures and request bounded coordinator review before workaround/ownership revision. Commit coherent tested implementation then stop; no successor/main merge.

E4 feasibility stop (2026-11-03): preserved all frozen matrices/traces before production edits. Exact ordinary unbound invocation-receiver preflight passes Node but native rejects the authentic receiver; separate coverage reports dyn.this/dynamic2 despite successful static-only build. Five-line reduction prints true in Node/false native; captured-reference identity control passes both with zero dynamic. Original Zig PATH/sandbox failures and final successful-build/native-failure transcripts retained under docs/validation/ts-033e4/. Production/existing tests/gates unchanged; audit2966protected/175source/55rows/A18/traces13/retained212records48gates/60blocked, typecheck and runner20 pass. No full implementation or full-suite/native activation acceptance claim. Request bounded evidence-only extracted-unbound-method feasibility investigation followed by the contract composite reduction before any representation workaround; exact proposal in new README. Stop for coordinator review; no successor or publication.

E4-C accepted5537663 after root replay and second review. Atomic E4 may now be assigned under the capability contract; retain all other execution requirements. Include an exception escaping nested session B into still-active A, verifying exact identity and restoration. Historical blocked/receiver-authentication entries above are superseded only as explicitly mapped by the accepted contract.

E4 implementation handoff (2026-11-04): shared engine/private records and compatibility facades, opaque session entry, captured-owner callbacks and exact synchronous consume-only permits implemented atomically. Full legacy Node/native212/212,49 static-only/separate zero-dynamic gates (48 retained; final execution driver3518 static), two runtime inputs/lane,17 inherited replays/reductions, typecheck,runner20,host73,observations22,probes10 pass. New execution evidence covers all13 restricted resource-prefix traces,12/18/6 setup prefixes, strict this/references/completions/naming/provenance and nested B host exception escaping into still-active A with exact identity/restoration. Historical E2 union-arm narrowing reused; initial diagnostics and extra test-only bootstrap assumption retained. Prior evidence and3074 protected files preserved;60 corpus variants remain blocked. See docs/validation/ts-033e4/execution/README.md for coverage and host-helper/Node-only boundaries. No CLI/observation/schema/default-profile admission, arguments/Error-object feature claim, scope/pin changes, successor or publication. Candidate awaits coordinator actual review and independent second review.

### TS-033E4-C — Accepted capability contract and combined boundary feasibility

Status: **accepted5537663 — root replay and second review** — sole writer chat 01a1a514-83f9-7240-8594-6252db0e80a0, base7d3f369, 2026-11-04. Prerequisite corrected boundary proposal fae9330 accepted after independent Node/native checks and second review. E4 production remains blocked pending this bounded checkpoint. Own this entry and E4 status cross-reference, new docs/script-execution-capability-boundary.md and docs/validation/ts-033e4/capability-integration/ only. Preserve original activation design/matrices as history; explicitly map superseding A08 authority/freeze requirements and profile-first exact guard diagnostics. Combine proven actual runtime types, captured owner functions, two simultaneously active sessions, private frames with Realm/code provenance, shared steps/call-depth and exact permit tuple into a small executable seam. No parser/body execution or duplicate interpreter; no production/compiler/pin changes. Literal Node/native positives/negative neighbors, two semantically different runtime-selected inputs and separate zero-dynamic coverage; no copied expected values from observed output. Test idle/cross-owner/retained capability behavior, nested cross-Realm restoration, consumed/replayed/wrong tuple guards, exact guest/host abrupt identity, budget exhaustion and all frame/permit cleanup. Distinguish model seam from production Realm activation; inherited real wrappers stay closed. Freeze precise atomic E4 migration/ownership and retained55/A18/13traces/212records48gates/all inherited/60blocked acceptance. Preserve original failures and existing evidence. Stop for actual review before production adoption; bounded checkpoint30min/assessment90min, no expansion without review. Coordinator owns COORDINATION.md.

E4-C handoff (2026-11-04): explicit accepted A08 supersession and exact atomic E4 migration frozen in docs/script-execution-capability-boundary.md. Combined actual-runtime-type seam passes two runtime-selected inputs in Node/native with2479static/zero dynamic under unchanged gate, exact owner/frame/permit/counter/effect and abrupt-identity assertions, nested two-session restoration and unchanged real production guards still closed. Typecheck/runner20 pass; independent new ownership verifier preserves3061files/175source-test/55rows/A18/13traces/212records48gates/60blocked. Initial runner path, ordinary TypeScript narrowing and Zig sandbox failures retained; no new scriptc lowering failure or production workaround. This is model representation feasibility, not production Realm/shared evaluator/body execution or full inherited-suite replay. Stop for coordinator and second review; no production adoption or successor.

### TS-034P — Pinned harness prerequisite design

Status: **design complete; awaiting independent review** — sole design writer chat 01a1a54c-a0e0-7330-b6ab-8e60f259889f, base b84a5e0, 2026-11-04; TS-034P only. After accepted atomic E4e67c927. Evidence-backed next step is P5 of docs/script-execution.md, not profile admission. Own new docs/harness-prerequisites.md, docs/validation/ts-034p/ and this entry only. Audit exact pinned assert.js/sta.js and selected corpus consumers against current supported grammar,strict-only execution,function/constructor/Error dependencies. Freeze minimal ordered reviewable slices, exact ownership, semantic invariants and literal positive/negative/failing-control matrices. Parse whole unchanged pinned source units; distinguish parse-only dormant constructs from reached runtime paths, including sloppy functions,try/catch,new/instanceof and genuine errors. Use pinned spec/relevant engine evidence; preserve hashes/denominators. No production/parser/runtime/test/manifests/observation/classifier/pin changes,source rewriting,host guest eval or conformance admission. No omnibus implementation or compiler work. Optional isolated probe only for real uncertainty with literal two-lane evidence. Return concrete first implementable bounded slice and remaining dependency graph for independent review. Preserve212records49gates,all historical evidence,60blocked. Coordinator owns COORDINATION/companion queue.

TS-034P handoff: new harness-prerequisites design and owned audit submit all36 unchanged pinned units (33 tests/3 harness), verify blob/SHA identities, preserve3151 protected files/212 records per lane/49 gates/60blocked. Current assert.js fails lex.operator ++ at170:34, sta.js instanceof at14:14; doneprintHandle parses625 units but strict preparation rejects. No guest execution/native probe or harness pass claimed. Edition16 hash and exact engine262 revision sources retained. First proposed implementation is H1 strict simple catch with literal positive/negative/abrupt/resource controls; switch, dormant for/update, narrow sloppy functions, construction, genuine errors and unchanged-bundle validation are dependency-ordered blocked follow-ons. Construct/error migration require explicit interface checkpoints. No production/tests/old docs/pins/manifest/observation/admission changes. Node build/typecheck, audit and script syntax/whitespace checks pass. Stop for coordinator actual and second review; no successor/publication.

TS-034P review correction: de90653 remains unaccepted. h1-correction.md freezes consumption of active throw identity while preserving lastAbrupt history; same preallocated completion at distinct A/B source sites retains exact completion/Value/Location yet final source B. Exact original try-catch/block/handler associations, preparation validation, private activation order/body phase and14/14/5/15 tick traces with all fresh/seven-seeded prefixes replace prior implementation-time deferral. Added var-hoisting/nested-catch/closure/strict-parameter and conflict neighbors. Static correction audit preserves29 original C/B rows and freezes all literal prefixes; original36-unit/3151protected/212records49gates/60blocked audit retained. No production or existing tests/pins changed; stop for re-review before H1 assignment.

Coordinator acceptance TS034P: corrected4f86a33 accepted after root/second re-review and36/3151/29controls/fourprefixes/60blocked audit. No production or harness execution claim.

### TS-034H1 — Strict Script simple try/catch

Status: **implemented; awaiting root and independent second review** — sole writer chat 01a1a567-266a-7e41-9c15-b0d36002f20d, base3925efa, 2026-11-04; controls frozen in docs/validation/ts-034h1/ before implementation. Four-file production candidate and new catch driver pass both sources/lanes, all104 prefixes,212 exact old records and50 static gates;17 inherited helper replays,runner20/probes10/host73/observations22 pass. Coordinator approved exactly two test/script-execution.ts sites after independently reproducing obsolete catch rejection: preserve original as positive H1-empty/undefined and replace its negative with try{}catch(e){}finally{}. Full E4 now passes both inputs/lanes after static-only/separate zero-dynamic rebuild. New verifier enforces exact amendment against base,3154 other protected files and60blocked. Original failure retained. See ts-034h1/README.md; no successor/main merge. Implement only H1 in docs/harness-prerequisites.md and normative docs/validation/ts-034p/h1-correction.md. Own src/syntax.ts,src/parser.ts,src/script-declarations.ts,src/script-execution-internal.ts; new test/harness-catch.ts,fixtures/harness-catch/,one additive native gate, own entry/feature inventory and new docs/validation/ts-034h1/. Preserve legacy grammar/old tests/profiles. Original try/catch/block scope associations,catchParameter snapshots and private one-use catch activation,exact setup order and body phase; only language throws caught,resource/unsupported/host bypass. Consumed propagation clears #abrupt without erasing lastAbrupt; C14 exact reused completion must capture new source. Freeze all C01-C14/D01-D10/P14/P14R/P05/P15F,14/14/5/15 fresh/seven-seeded prefixes before implementation; no regenerated expected traces. Closure invocation after full-boundary P15F requires separate ample-budget positive/new session,not changed limits. Two literal runtime-selected sources,Node/newly-built native/static-only/separate zero-dynamic,212oldrecords49oldgates+additive,all affected E4/E3/ER/reference/metadata/declaration replays,runner20/probes10/host73/observations22/60blocked. No finally/optional/destructured catch,sloppy/Annex B/errors/other grammar or public admission. If additional exhaustive union consumer requires edits,retain exact failure/request ownership revision first. No compiler/pin workaround without reduction/review. Preserve history/C++;commit coherent tested slice then stop for actual and second review,no successor/main merge.

H1 second-review correction (2026-11-04): restored exact legacy var AST diagnostic in a separate arm; new try-catch arm stays distinct. Added literal trusted-host diagnostic/no-effects controls only to new harness-catch.ts. Typecheck and freshly rebuilt catch-driver Node/native both inputs/all104 prefixes pass, with separate zero-dynamic coverage. Updated correction-local hashes/preservation retains3154 protected files and exact E4 amendment;49 other gates/full suites retained without rerun as instructed. Evidence: ts-034h1/legacy-diagnostic/. Await root independent full validation and acceptance; no successor/publication.

Coordinator acceptance H1 (2026-11-04): corrected80ceea0 accepted after actual source/correction review and independent second review. Root rebuilt212/212 Node/native,50 static-only/separate zero-dynamic gates (catch3292),both H1/E4 runtime inputs,104prefixes,17inherited replays,Node boundary,typecheck,runner20/host73/observations22/probes10 and3154protected/60blocked preservation. Producer evidence restored; root logs build/ts034h1-root-*.log. Internal strict simple catch only; no public admission.

### TS-034H2-P — Freeze Script switch integration

Status: **design complete; awaiting actual and independent second review** — sole bounded writer, base b8baf44, branch codex/test262-classification, 2026-11-04. Dependency accepted H1 80ceea0. Own only new docs/harness-switch.md, docs/validation/ts-034h2-p/ and this task status. Read harness-prerequisites H2 and current syntax/parser/declaration/shared-engine code. Freeze exact four-file implementation ownership, original switch/CaseBlock mapping and private scope identity, discriminant evaluation outside CaseBlock environment, case selector evaluation within it, StrictEquality comparison, default-in-middle search and fallthrough, lexical TDZ/function setup/var hoisting, unlabeled break consumption and UpdateEmpty semantics, loop continue/return/throw propagation, scope/provenance/Realm restoration. Specify whole-source conflicts and unsupported neighbors, literal positive/negative/tick/location/fresh+seeded prefix matrix and two runtime-input sources. Audit every old switch rejection and propose precise migrations for review, not blanket old-test changes. Use pinned spec/relevant-engine evidence; distinguish design from execution. Preserve H1 catch consumption history and all inherited semantics. No production/test/compiler/pin/history edits, no implementation or public admission before actual/second design review. Return a small implementation-ready contract and executable source/preservation audit; no duplicate interpreter or speculative new abstraction. Stop for review.

H2-P handoff (2026-11-04): docs/harness-switch.md freezes four-file original-node/CaseBlock mapping, strict-only parsing/context reset, shared lexical setup and selector/default/fallthrough/completion semantics, H1 history and source/Realm cleanup. New evidence retains30 semantic rows,10 negative groups,5 host boundary groups,10 literal tick traces/208 fresh+seven-seeded prefixes and two actual runtime-input sources. Pinned edition16/engine262 source and offline executable audit pass3246protected/212records per lane/50retained gates/60blocked. Exact two-site E4 old-switch-negative migration is proposed, not applied; both historical H1 whole-file preservation scripts remain intact. No production/existing-test/history/compiler/pin edits, semantic/native execution or public admission claim. Syntax/whitespace checks pass. Stop for actual and independent second review; no successor or main merge.

Coordinator H2-P acceptance (2026-11-04):4bc2d32 accepted after actual source/contract/prefix review, independent second review with no findings, and root audit3246protected/19inventory/208prefixes/212records50gates/60blocked. Design only. Approve exact proposed E4 two-site migration against b8baf44: add H2-empty normal undefined; replace only switch(1){} negative with switch(1){default:const x=0;}. Preserve all other assertions and historical H1 verifiers byte-for-byte.

### TS-034H2 — Strict Script switch implementation

Status: **implementation complete; awaiting actual and independent second review** — sole implementation writer chat 01a1a5b9-a3bf-78c3-9f34-8e4612914dce, base4e01d44, branch codex/test262-classification, 2026-11-04. Four-file implementation, frozen30S/10N/5X and208prefixes pass both runtime inputs on Node/native. All51static-only/separate zero-dynamic gates pass (switch3491);212exact records/lane, H1 unchanged104prefixes/C14, E4 and17inherited replays, typecheck/runner20/probes10/host73/observations22 pass. Whole-file exact E4 amendment and3249protected/60blocked verified. Original compiler reductions retained; exact three ThrowCompletion locals and typed test callback correction were coordinator-reviewed before application. Evidence docs/validation/ts-034h2/README.md. No successor/publication/main merge. Dependency accepted H2-P4bc2d32. Implement exact docs/harness-switch.md contract and frozen ts-034h2-p controls. Own only src/syntax.ts,src/parser.ts,src/script-declarations.ts,src/script-execution-internal.ts,new test/harness-switch.ts,fixtures/harness-switch/,one additive native gate,own feature inventory/task status,new docs/validation/ts-034h2/. Existing test/script-execution.ts only exact approved H2-empty and unsupported-const-negative migration; new scoped verifier must compare whole file against exact two edits and preserve H1 changes/history. No other old-test edits. Original CaseBlock/body/owner mapping and outer discriminant/inner selectors; reuse private BlockActivation/shared evaluator,strict equality,default-middle search,fallthrough,lexical setup/TDZ/var propagation,break UpdateEmpty and exact abrupt/continue/return semantics. Freeze30S/10N/5X controls,10literal traces208fresh+seeded prefixes and two runtime inputs before production. Preserve H1 104prefixes/C14 history,all inherited strict semantics,exact legacy diagnostics. Require212oldrecords50oldgates+additive,separate zero-dynamic/static-only,full Node/native,two inputs,H1/E4 and affected inherited replays,typecheck/runner20/probes10/host73/observations22/60blocked. Source/Realm/session/permit/host-fault cleanup mandatory. No labels/sloppy/other grammar/construct/errors/public CLI/observation/profile/conformance admission. New compiler/exhaustive-consumer failure outside ownership requires retained reduction and exact review before workaround/scope/pin edits. Preserve C++/pins/history. Commit coherent tested implementation and stop for actual/second review;no successor or main merge.

Coordinator H2 acceptance (2026-11-04):b1ec155 accepted after actual source/migration review and independent second review with no findings. Root rebuilt212/212 Node/native,51static-only/separate zero-dynamic gates (switch3491),both runtime inputs208prefixes,H1 104prefixes/C14,E4twoinputs,17inherited replays,Node boundary,typecheck/runner20/host73/observations22/probes10,3249protected/60blocked. Producer evidence restored;root logs build/ts034h2-root-*.log. Internal strict switch only,no public admission.

### TS-034H3-P — Freeze classic for and postfix increment

Status: **design complete; awaiting actual and independent second review** — sole design writer chat `01a1a5f3-3642-7612-ab10-5fb9eea4e87f`, base `a978442`, 2026-11-04. Handoff: docs/harness-for-update.md and ts-034h3-p source/preservation evidence freeze five-file ownership,20F/16U/14N/5X controls,11literal traces/190fresh+seeded prefixes,two runtime input sources and exact two-driver migration proposals. Existing cached-key Reference and toPrimitive(number)+toNumber Number-only branch reused;no ToNumeric/BigInt API expansion. Legacy lex default preserves exact ++ diagnostics. Audit3339protected/405mentionfiles/212records51gates/60blocked passes;syntax checks/diff check pass. No production/existing tests/history/compiler/pin edits,no runtime/native support claim. Stop for coordinator actual/second review;no implementation/successor/publication. Dependency accepted H2b1ec155. Own new docs/harness-for-update.md,new docs/validation/ts-034h3-p/ and own task status only. Freeze H3 from harness-prerequisites against actual current lexer/parser/syntax/collector/shared evaluator/reference/coercion APIs. Proposed production ownership five files (H2 four plus lexer), no implicit API expansion. Classic for initializer var/expression/empty,test/update optional; postfix ++ Reference evaluation once,GetValue/ToNumeric/PutValue order,old numeric result,strict binding/property errors,abrupt identity and accessor/reentrancy/shared-budget/cross-Realm behavior. Exact completion/continue-update/break-no-update ordering,scope/source/provenance/cleanup; whole-source invalid target/unsupported for-in/of/lexical initializer/prefix/decrement neighbors. Freeze literal semantic and exact fresh/seeded tick-prefix matrices,two actual runtime sources,private original node/body associations and declaration traversal. Audit affected old for/update negatives and propose exact preservation migrations. Inspect pinned harness dormant paths vs reached behavior; no AST-only placeholders or broad numeric claims. Use pinned spec/relevant engine evidence and identify any actual missing ToNumeric support before authorizing implementation. No production/existing tests/history/compiler/pin edits or implementation/admission before independent design review. Preserve H1/H2 matrices,212records51gates/60blocked,C++,pins. Return small implementation-ready owned contract/source audit and stop for actual/second review;no successor/main merge.

Coordinator H3-P acceptance (2026-11-04):1cdef50 accepted actual/second review and root3339protected/405mentions/190prefixes/212records51gates/60blocked audit. Eleven literal traces and phase/effect thresholds checked against current GDI/reference/coercion accounting. Design only. Approve exact proposed-migrations.json whole-file edits to E4 and harness-switch tests, retaining original infinite-for resource and unresolved-update runtime controls in new driver;historical evidence/verifiers remain unchanged.

### TS-034H3 — Classic for and postfix increment implementation

Status: **in progress — implementation complete; review needed**. Sole writer Codex chat `01a1a60c-49ca-7a10-8bd8-411b3162d992`, base `4e7b356`, branch `codex/test262-classification`. Dependency accepted H3-P1cdef50. Implement docs/harness-for-update.md exactly. Own five production files lexer/syntax/parser/script-declarations/script-execution-internal,new test/harness-for-update.ts,fixtures/harness-for-update/,one additive gate,own inventory/task status,new ts-034h3 evidence. Only exact approved two-test migration proposals;new verifier compares whole files to base retaining H1/H2 edits. Freeze F01-F20/U01-U16/N01-N14/X01-X05,eleven traces190prefixes,two actual sources before edits. Declaration-plan-only increment lexing preserves legacy diagnostics;NoIn/line-terminator/target grammar,original var/header associations,source-order collection. Reference once/Get/ToPrimitive(number)/ToNumber/Put same reference/old numeric result;Number-only existing domain,exact accessors/receivers/reentrancy/abrupt identity. For initialization/test/body/update and continue/break/UpdateEmpty ordering;shared engine/budgets/Realm cleanup,H1 consumed throw history preserved. Require212oldrecords51oldgates+additive,separate zero-dynamic/static-only,full Node/native,two inputs,H1/H2/E4/all affected inherited,runner20/probes10/host73/observations22/60blocked. Known explicit throw-arm/typed throwing-callback patterns approved within ownership;new substantive compiler/ownership failure retain/reduce/review before workaround/pin/scope changes. No lexical for bindings/in/of/prefix/decrement/BigInt/other grammar/public admission. Preserve C++,pins,history. Coherent tested commit then stop for actual/second independent review;no successor/main merge.

H3 handoff (2026-11-04): five production files implement declaration-plan-only classic for and Number-domain postfix increment, preserving original var/function/block identities, NoIn and suffix/line rules, one captured Reference, current descriptors/receivers, completion payloads and session/provenance cleanup. Frozen F01-F20/U01-U16/N01-N14/X01-X05 and190fresh/seeded prefixes pass both hosts with both runtime inputs. All51 old native gates plus H3 pass static-only/separatezero-dynamic (H3 3804static);212exact old records/lane,H1/H2/E4 two-input replays,17 inherited groups,runner20/probes10/host73/observations22 and3340protected/60blocked pass. Two new test callback-forwarding annotations were independently reduced and approved;failures and approvals retained. Source review closed unary/postfix suffix reopening, then all native gates rebuilt. Exact whole-file old-test migrations only. Evidence `docs/validation/ts-034h3/README.md`;coherent candidate pending actual/second review,no successor/publication/main merge.

Coordinator H3 acceptance (2026-11-04):98b8fc5 accepted actual/second review,root212/212 Node/native,52static-only/separate zero-dynamic gates,H3 driver3804/two inputs190prefixes,H1/H2/E4 controls,17inherited replays,Node boundary,typecheck/runner20/host73/observations22/probes10,3340protected/exact migrations/60blocked. Producer evidence restored;root logs build/ts034h3-root-*.log. Internal classic for/postfix only,public admission unchanged.

### TS-034H4-P — Audit and freeze bounded non-strict Script semantics

Status: **design complete; awaiting actual and independent second review**. Owner: Codex chat `01a1a644-526e-7763-b152-82d9000c35a0`, base `677aa31`, branch `codex/test262-classification`, 2026-11-04. Dependency accepted H3 98b8fc5. Own only new docs/harness-nonstrict.md,new docs/validation/ts-034h4-p/ and this task status. Dedicated pre-edit strict-assumption inventory required by harness-prerequisites H4. Inspect all current preparation/record/prologue/parser/declarations/FDI/global environment/reference/callable/Realm/descriptor/host-guard consumers. Freeze smallest internal preparation entry alongside unchanged prepareStrictScript; mode from actual source/inherited function strictness. Exact thisMode/global substitution/boxing in defining Realm,strict caller versus callee rules,reference strictness and failed/unresolvable writes/delete behavior,global declaration attributes,restricted function properties/names/prototypes/source identity. Explicit exclusions duplicates/arguments/eval/with/Annex B and unsupported grammar must fail before executable record. Preserve all strict/legacy diagnostics and phase/resource/order requirements. Propose exact file/API/callsite ownership and any necessary interface amendment; do not infer six tentative files suffice. Freeze literal positive/negative/descriptor/strict-vs-sloppy/cross-Realm/reentrant/abrupt/cleanup matrix and precise fresh/seeded budget traces,two runtime inputs,old-test migration inventory. Identify atomic integration dependencies vs bounded slices;no partial semantics or guard bypass. Pinned spec/relevant engine source evidence and executable source/preservation audit only; no production/existing tests/history/pins/compiler/manifest/observation/admission changes. Preserve212records52gates/H1-H3 matrices/60blocked,C++,history. Return reviewable design,stop for actual/second review;no implementation/successor/main merge.

H4-P handoff (2026-11-04): new docs/harness-nonstrict.md and ts-034h4-p evidence freeze separate bounded preparation with unchanged strict APIs, source-derived callee mode, defining-Realm this binding, distinct non-strict FDI lexical environment, reference/delete/global descriptor semantics and unchanged capability guards. Audit identifies explicit nine-existing-file interface amendment (including runtime, delete-reference, global-environment and global declaration helper); no new script-reference or Realm change needed. Zero old-test edits proposed. Literal semantic/negative/descriptor/cross-Realm/reentrant/abrupt controls,12 traces190fresh/seven-seeded prefixes and two runtime sources are frozen but unexecuted. Pinned edition16/engine262 source retained; offline audit passes3460protected/45source/387mentionfiles/212records52gates/H1-H3/60blocked. Source syntax/whitespace checks pass; no production/existing-test/history/compiler/pin/manifest/observation/admission changes or fresh semantic/native claim. Stop for actual/second review;no implementation/successor/publication/main merge.

Coordinator H4-P acceptance (2026-11-04):1014c6f accepted after actual source/interface/prefix review and independent second review with no actionable findings. Root audit3460protected/45source/387mentions/190futureprefixes/212records52gates/60blocked passes;producer evidence restored,log build/ts034h4p-root-audit.log. Approve exact nine-existing-production-file amendment in harness-nonstrict.md;zero old-test migrations. Design only,no runtime claim.

### TS-034H4 — Atomic bounded non-strict Script implementation

Status: **in progress — implementation complete; awaiting actual and independent second review** — sole implementation writer Codex chat `01a1a660-5424-7162-a720-37063e1ebc6e`, base `3742d71`, branch `codex/test262-classification`, 2026-11-04. Dependency accepted H4-P1014c6f. Implement docs/harness-nonstrict.md exactly. Own its nine production files only: src/script-execution-internal.ts,src/script-record.ts,src/parser.ts,src/script-declarations.ts,src/script-environment.ts,src/global-environment.ts,src/runtime.ts,src/delete-reference.ts,src/script-global-declarations.ts;new test/harness-nonstrict.ts,fixtures/harness-nonstrict/,one additive native gate,own inventory/task status,new docs/validation/ts-034h4/. No existing tests or historical evidence edits. Freeze all M/R (including R17)/D/X/N controls and12traces190fresh/seven-seeded prefixes/two runtime inputs before implementation. Separate bounded preparation/source-derived strictness;strict entry and legacy default semantics unchanged. Callee-owned thisMode/defining-Realm boxing,distinct non-strict FDI lexical environment/private body environment,captured reference mode,unresolved and deleted global writes/delete/descriptors/restricted properties,profile-first capability guards and exact abrupt/provenance/Realm cleanup. Atomic integration only,no partial semantics. Require212oldrecords52oldgates+additive static-only/separatezero-dynamic,full Node/native,H1/H2/H3/E4/all inherited,runner20/probes10/host73/observations22/typecheck/60blocked. Known typed throw-local/actual Builtin callback annotations approved within ownership;retain/reduce/review new substantive failures before scope/API/pin changes. No duplicates/arguments/eval/with/Annex B/new grammar/construct/errors/public CLI/observation/conformance admission. Preserve C++,pins,history. Coherent tested commit then stop for actual/second independent review;no successor or main publication. Coordinator owns COORDINATION.md.

H4 compiler checkpoint (2026-11-04): Nine-file candidate/new H4 driver passes both runtime inputs and190prefixes on Node/native (4067static/zero dynamic). Full53builds succeed, but unchanged script-function-setup has2dynamic operations from unequal union method signatures; native guests211/212 fail unchanged key-coercion saved-key assertion after optional Reference widening. Node212/212,typecheck/runner20/host73/observations22/probes10 pass. Both failures reduced with two-lane controls; exact unapplied proposals in docs/validation/ts-034h4/compiler-investigation/PROPOSAL.md and REFERENCE-PROPOSAL.md. Zero old-test migrations,3458protected/60blocked. Stopped before workaround/API changes as required;full inherited acceptance and coherent commit pending coordinator review. No publication/successor.

H4 final handoff (2026-11-04): Applied only independently approved local-read signature and private Script property-reference wrapper amendments;shared Reference original shape,one inner mutable key cache,default-strict Put/Delete and zero old-test edits. Minimal wrapper42static/zero dynamic passes both hosts before integration;original compiler failures retained. Fresh full53static-only/separatezero-dynamic gates pass (H4 driver4076);Node/native212exactrecords each;H4 twoinputs190prefixes/full matrix,H1/H2/H3/E4 plus17inherited groups and both Node-only boundary checks pass. Typecheck/runner20/host73/observations22/probes10,3458protected/60blocked pass. Retained unrelated pre-H4 narrower-base structural-widening diagnostic has no production workaround. Evidence docs/validation/ts-034h4/README.md and validation-summary.json. Candidate ready for actual/second review;not accepted or published,no successor.

Coordinator H4 acceptance (2026-11-04):13fa6d2 accepted after actual source/amendment and second review,root independent212/212 Node/native,53static-only/separatezero-dynamic gates,H4driver4076/twoinputs190prefixes,H1/H2/H3/E4 and17inherited replays,both Node boundary controls,wrapper preflight42static,typecheck/runner20/probes10/host73/observations22,preservation3458/zero old-test migrations/60blocked. Producer evidence restored;root logs build/ts034h4-root-*.log. Original failed compiler evidence retained. Internal bounded Script support only,public admission unchanged.

### TS-034H5-P — Ordinary construction and instanceof interface checkpoint

Status: **design complete; awaiting actual and independent second review**. Owner: Codex chat `01a1a6a4-37bf-7642-8abb-53114d46b1af`, base `a0f3332`, branch `codex/test262-classification`, 2026-11-04. Dependency accepted H4 13fa6d2. Own new docs/harness-construct.md,new docs/validation/ts-034h5-p/ and this task status only. Read accepted harness-prerequisites H5 and audit actual runtime/Realm/context/callable/parser/record/builtin/symbol consumers before freezing exact ownership and signatures;tentative seven-file table is not authorization. Separate callability/constructibility,private internal construct(callee,args,loc),newTarget=callee subset,constructor slot and exact one-use capability/Realm/session guard integration. Preserve shared evaluator,source provenance,budgets,abrupt identity/finally cleanup;never reinterpret OperationContext.call as construction. Freeze new-expression grammar/operand-argument/check ordering,ordinary receiver allocation/GetPrototypeFromConstructor and defining-Realm fallback,object-return override/primitive-return receiver,strict/nonstrict constructor behavior. Freeze @@hasInstance lookup/call and ordinary fallback,prototype-chain/cross-Realm identity and exact Function.prototype symbol descriptor;no prototype-only or constructor-name shortcuts. Enumerate complete API/callsite/old-negative migrations,semantic positives/negative neighbors/abrupt and host failure controls,fresh/seven-seeded literal tick prefixes,two runtime sources. Audit required well-known symbol exposure versus excluded Symbol factory. No production/existing tests/history/compiler/pin edits before actual/second design acceptance;no implementation or public admission. No classes/derived/new.target syntax/bound functions/Reflect/Proxy/genuine Errors/other grammar. Preserve212records53gates,H1-H4 matrices,60blocked,C++,pins. Use retained spec/relevant engine evidence;only bounded feasibility probe for real uncertainty. Return precise implementation-ready contract or evidence-backed smaller slice,then stop. Coordinator owns COORDINATION/main publication.

H5-P handoff (2026-11-04): new docs/harness-construct.md and ts-034h5-p evidence freeze separate constructor slot/private Construct, unchanged OperationContext.call and builtin one-use permits, shared activation/body, operand/argument/check order, caller-frame prototype Get and defining-Realm fallback, strict/sloppy receiver/return semantics, full @@hasInstance dispatch and descriptors. Exact proposed ownership includes declaration traversal beyond tentative outline; no Symbol factory/global placeholder. Literal semantic/negative/guest+host abrupt/guard controls,12 traces172fresh/seven-seeded prefixes,two runtime sources and two precise future negative migrations frozen,UNEXECUTED. Offline audit passes3609protected/45source/165mentionfiles/212records53gates/H1-H4/60blocked;syntax/whitespace checks pass. Pinned edition16 and engine262 evidence retained. No production/existingtest/history/compiler/pin changes or repeated H4 builds. Stop for actual/second review;no implementation/successor/main publication. Coordinator owns COORDINATION.

Coordinator H5-P acceptance (2026-11-04):8ebaeab accepted after actual full contract/source/tick review and independent second review,no actionable findings. Root audit3609protected/45source/165mentions/172futureprefixes/212records53gates/60blocked passes,producer evidence restored,build/ts034h5p-root-audit.log. Approve exact seven-file ownership and two old-negative source replacements in contract;whole-file baseline verification required during implementation. Design only,no runtime/native feasibility claim.

### TS-034H5 — Ordinary base Script construction and instanceof

Status: **in progress — implementation complete; awaiting actual and independent second review** — sole writer chat `01a1a6cb-63ce-7f42-9fa2-f5b40ef01cd2`, base `7f80383`, 2026-11-04. Dependency accepted H5-P8ebaeab. Implement docs/harness-construct.md exactly. Own src/runtime.ts,src/script-execution-internal.ts,src/syntax.ts,src/parser.ts,src/script-declarations.ts,src/builtins/function.ts,src/symbols.ts;new test/harness-construct.ts,fixtures/harness-construct/,one additive native gate,own inventory/task status,new ts-034h5 evidence. Only two exact old-test source replacements from accepted contract (script-execution.ts and harness-nonstrict.ts),with whole-file baseline verifier;retain original-source preparation/runtime controls and historical evidence/verifiers. Freeze C01-C18/I01-I12/D01-D05/N01-N16/A01-A11/X01-X12,12traces172fresh/seven-seeded prefixes,two semantic runtime sources before edits. Separate constructor slot/private Construct,newTarget=callee,unchanged context.call/permits,shared function activation/body;callee/arguments/check order,caller-frame prototype Get/allocation and defining-Realm fallback,object return override,exact call/resource/provenance cleanup. Full @@hasInstance dispatch/ordinary fallback/Script-only metadata;no constructor-name/prototype-only shortcut. No classes/derived/new.target/bound/Reflect/Proxy/Errors/Symbol factory/public admission. Require212oldrecords53oldgates+additive static-only/separatezero-dynamic,full Node/native,H1-H4/E4/17inherited/both Node boundaries,typecheck/runner20/probes10/host73/observations22/60blocked. Known typed throw-local/actual Builtin callback patterns approved within ownership;new substantive compiler/union consumer/ownership failures retain/reduce/review before workaround/API/pins/scope changes. Preserve C++,pins,history. One writer,no branch switch. Coherent tested candidate then stop for actual/second independent acceptance;no successor/main publication. Coordinator owns COORDINATION.

H5 compiler checkpoint (2026-11-04): seven-file production candidate and partial new C/I/D/N driver typecheck; partial driver passes Node with both frozen runtime inputs. First native driver build fails SC1090 on nullable/union constructorSlot===callable assertion. Retained actual-source reduction reproduces; unapplied test-only local-narrowing proposal passes Node/native true false false,3481static/zero dynamic. Exact proposal docs/validation/ts-034h5/compiler-investigation/PROPOSAL.md. Frozen complete contract/12traces172prefixes/twoinputs preserved;3607protected/two exact whole-file migrations/60blocked pass. Stopped before applying compiler correction as assigned. Prefix/A/X/full inherited validation and coherent commit remain incomplete;no acceptance/publication/successor. Coordinator owns COORDINATION.

H5 migration checkpoint (2026-11-04): approved matchingConstructorSlot test helper applied;known Builtin callback annotation pattern retained before/after zero-dynamic evidence. Final H5driver4274static,172prefixes/twoinputs/full C/I/D/N/A/X pass Node/native;all54gates and212exactoldrecords per lane pass;H1-H4/E4/both Node boundaries,typecheck/runner20/probes10/host73/observations22 pass. 16/17 inherited groups pass;untouched bootstrap B03 exact Function.prototype key inventory omits required @@hasInstance and fails both hosts/twoinputs. Exact third old-test migration proposed but UNAPPLIED in docs/validation/ts-034h5/migration-investigation/PROPOSAL.md;isolated proposal passes strict typecheck3926static/zero dynamic,B01-B18 bothhosts/twoinputs. Stop before unauthorized old-test edit/verifier expansion. Preservation3607protected/twoapprovedwholefilemigrations/60blocked passes. No coherent commit/implementation acceptance/publication yet;no successor.

H5 final handoff (2026-11-04): implemented exact seven-file Construct/instanceof contract with separate branded slot/private dispatcher/shared activation,caller prototype/allocation and callee fallback/return semantics,complete hook dispatch and Script-only symbol metadata. All54static-only/separatezero-dynamic gates,H5driver4274,212exactoldrecords per host,172fresh/seven-seeded prefixes/twoinputs/full C/I/D/N/A/X,H1-H4/E4/all17inherited/both Node boundaries,typecheck/runner20/probes10/host73/observations22 pass. Applied only approved local test narrowing/actual Builtin signature pattern and three exact old-test migrations;actual bootstrap3926static/B01-B18 bothhosts/twoinputs passes. Preservation3606protected/threewholefilemigrations/60blocked passes. Original compiler/bootstrap/environment failures and historical evidence remain. Final evidence docs/validation/ts-034h5/README.md and validation-summary.json. Coherent candidate ready for actual/second review;not accepted/published,no successor. Coordinator owns COORDINATION.

Coordinator H5 acceptance (2026-11-04):25aa258 accepted actual final source/three-migration review and independent second review;root212/212 Node/native,54static-only/separatezero-dynamic gates,H5driver4274/twoinputs172prefixes,H1-H4/E4/all17inherited,both Node boundaries/Node slots,typecheck/runner20/probes10/host73/observations22,preservation3606/three exact whole-file migrations/60blocked. Producer evidence restored,root logs build/ts034h5-root-*.log. Internal ordinary Script construction/instanceof only,no public admission.

### TS-034H6-P — Genuine errors and harness formatting globals checkpoint

Status: design complete — candidate awaiting actual/second review (2026-11-04); see docs/harness-errors.md and docs/validation/ts-034h6-p/. First proposed slice: three-file internal Error allocation kernel; no implementation/admission/publication. Dependency accepted H5 25aa258. Own new docs/harness-errors.md,new docs/validation/ts-034h6-p/ and this task status only. Read harness-prerequisites H6;enumerate every language-error producer/caller/override and actual Realm/context/diagnostic/Completion/observer consumer before freezing exact interfaces and file ownership. failure(name,message,loc) currently lacks Realm;outer-return/catch relabeling is insufficient. Freeze genuine Error/TypeError/ReferenceError/RangeError/SyntaxError per-Realm constructor/prototype/instance identity,call/new behavior,descriptors/toString/message coercion,allocation at originating semantic site,exact guest throw identity and cross-Realm source/cleanup. Keep resource/unsupported/host failures distinct and uncatchable as required;preserve legacy behavior and honest old-output migrations. Audit necessary String/Object call/construct globals and H5's Script-only constructor slot:propose precise reviewed builtin constructor extension if required,never reinterpret call or relax guards. Symbol factory/JSON/map/other builtins excluded. Complete inventory must cover environments,property/coercion/accessor/builtin/parser/runtime sites and missing-context paths;do not infer tentative five files suffice. Propose smallest ordered implementable slices or justified atomic boundary,each exact ownership/APIs/callsites,dependency/gate/migration matrix,literal expected objects/Realm/provenance/effects/negative neighbors/fresh+seeded budgets/two runtime sources. Retain diagnostics for observers without substituting strings for guest errors. No production/existingtest/history/compiler/pin/manifest/observation changes,implementation or public admission before actual/second design review. Preserve212records54gates/H1-H5 matrices/60blocked,C++,pins. Use pinned specification/relevant engine evidence;bounded feasibility probes only for real interface uncertainty. Return first implementable bounded slice and full migration inventory,commit coherent design/evidence then stop. Coordinator owns COORDINATION/publication.
