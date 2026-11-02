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
