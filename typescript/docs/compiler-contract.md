# scriptc compiler contract

What the pinned toolchain has been shown to do, by the probes in `probes/`. This file records evidence; the rewrite plan (`../../TypeScript Rewrite.md`) records intent. Update both when the toolchain changes.

## Pinned toolchain (2026-11-01)

| Component | Version | Source |
|---|---|---|
| scriptc | 0.4.7 | npm, exact pin in `package.json` |
| TypeScript (Node lane) | 7.0.2 | npm, exact pin |
| Node | 26.13.0 | local install (scriptc requires ≥24) |
| zig (linker on Windows) | 0.17.0 | `winget install zig.zig` (official ziglang.org zip) |
| OS / arch | Windows 11 10.0.26200, x64 | scriptc target `windows-x64-msvc` |

scriptc on Windows links with `zig cc` found on `PATH`; it is not bundled. macOS uses Xcode command-line tools, glibc Linux uses clang. Only Windows x64 has been exercised.

npm reports scriptc's postinstall script as not approved under `allowScripts`. Builds work without it on this machine; revisit if a fresh checkout fails to find the native CLI.

## Commands

```bash
npm install
npm run test:runner        # regression tests for probe acceptance rules
npm run test:probes        # tsc + node lane, scriptc native lane, coverage gate, diff
```

The runner builds each probe with `scriptc build --tier static-only` and also runs `scriptc coverage`. A probe passes only when the build and coverage commands succeed, a recognized coverage report confirms every analyzed statement is static, and both executions produce matching stdout with their expected exit status (0 normally; 3 for the host probe). Subprocess errors, signals, timeouts, unknown coverage formats and unknown probe names fail the run. Full coverage and execution transcripts are retained in `build/probe-results.json`; stderr is retained but not compared because the memory probe reports host-specific RSS there.

## Static-only is two checks, not one

- `--tier static-only` makes constructs without a static lowering a build error. It does **not** reject values typed only at runtime: a program reading `any` from `JSON.parse` builds successfully under it.
- `scriptc coverage` reports those as "in dynamic tier". `--fail-on dynamic` did not fail on such a program, so the runner matches the report text instead.

The engine must keep both checks green. The dynamic tier is not the QuickJS fallback, but it is runtime-typed code inside the binary, and allowing it would undercut "compiled TypeScript."

## Results

All ten probes pass both lanes and the coverage gate.

| Probe | Shows |
|---|---|
| values | Discriminated-union `Value`, `switch` narrowing, arrays of unions, shared object identity through two union values |
| objects | Class objects with `Map<string, …>` and `Map<class, …>` (identity keys), nullable prototype chain, optional-field descriptors, insertion order after delete/reinsert. A single `Map<string \| GuestSymbol, …>` was also checked separately: static, strings by value, symbols by identity, insertion order kept |
| interpreter | Recursive AST union, environment chain, closures capturing environments, completion records, recursion (fib 20), loops |
| strings | Lone surrogates, pairs, slicing a pair, NUL, `fromCharCode`, code-unit comparison, `JSON.stringify` of a lone surrogate: all identical to Node |
| numbers | Signed zero, NaN, int32/uint32 conversions, shifts, `%`, number→string (incl. `1e+21`, `5e-324`, radix, `toFixed`, `toPrecision`), `Number()` parsing of hex/binary/octal/whitespace/`1_000`: all identical to Node |
| dispatch | Function values in a `Map` with a uniform signature, closures with private state, function identity across containers, `const enum` + `switch` |
| control | Guest throw/return as completion data, host `try/finally` ordering, host `catch` without a binding |
| memory | 2,000,000 short-lived `Env ↔ Fn` reference cycles: native RSS stays at 6 MB, so cycles are collected |
| suspension | Host generators (recursive `yield*`, values sent into `next`, `return()` running `finally`) and an explicit program-counter frame |
| host | `process.argv`, `readFileSync(path, "utf8")` with non-ASCII source, stderr, `process.exitCode` |

## Rules for engine code

The following rules record observed constraints. The probe files exercise the adopted patterns; not every original failing experiment is retained.

1. **No class field named `prototype`.** It is treated as class-prototype machinery and moves every method of that class into the dynamic tier. Use `proto` or `prototypeSlot`. (`objects.ts`)
2. **Function values must declare the full parameter list of their target signature.** An arrow with fewer parameters than the declared function type is adapted through the dynamic tier. Write `(_thisValue, _args) => …`. (`dispatch.ts`)
3. **Catch-binding inspection is not categorically forbidden.** The committed `interpreter.ts` narrows a caught value with `instanceof Error` and reads its message; scriptc 0.4.7 reports all 83 statements static. The earlier blanket restriction was unsupported by this reproducer and is withdrawn. Check coverage for any new pattern rather than avoid readable error handling. Guest throws remain completion values by design; host exceptions indicate implementation faults.
4. **Bound guest recursion explicitly.** Native stack overflow terminates the process silently (exit 127, no output, no catchable `RangeError`), at somewhere between 300,000 and 1,000,000 frames of a trivial function. Node throws a catchable `RangeError` near 10,000. The evaluator needs its own call-depth limit that produces a guest `RangeError` well before either.

## Performance snapshot

Not a benchmark; one machine, one workload, recorded to set expectations.

| Measurement | Native | Node |
|---|---|---|
| Startup, `console.log` hello (warm, median of 5) | ~31 ms | ~57 ms |
| `interpreter.ts` scaled to fib(27) + 1e6-iteration loop | ~735 ms | ~237 ms |
| Same, `--optimization speed` | ~690 ms | — |
| Executable size per probe | 1.8–2.2 MB | — |
| Cold first build | ~20 s | — |
| Warm build per probe | ~0.3 s | — |

The compiled interpreter is about 3× slower than the same TypeScript under Node's JIT on this workload. Startup and footprint favour native; throughput does not. Claims about speed should say which.

## Remaining platform and scaling questions

- Build performance beyond the current integrated engine. The accepted TS-183–185 milestone compiles 191 entries, with full-engine drivers exceeding 11,000 analyzed static statements and zero dynamic operations. That matrix took 1,471,527 ms with two workers; reachable statement counts are not source-line counts. Evidence: build/array-factories-native-results.json and its build log.
- Recursion beyond the evaluator's explicit call/depth limits. Existing bounded recursion checks do not prove arbitrary native-stack safety.
- Long-running memory with large retained graphs rather than short-lived cycles.
- Native interop for regex or Temporal.
- macOS and Linux lanes.

## Integrated foundation evidence (TS-001, 2026-11-01)

The module-based interpreter at implementation commit `a016967` builds with the
same pinned toolchain. `npm run build:native` applies static-only and separate
coverage gates to `src/cli.ts` (644/644 static statements) and the realm host test
driver `test/realms.ts` (657/657). No new compiler workaround or dynamic tier was
needed. Both `npm run test:guest:node` and `npm run test:guest:native` pass 47/47
expected-result cases, with no skips. All ten existing compiler probes and all
20 runner regression tests pass; typechecking passes.

Windows native linking succeeded with the installed Zig directory on PATH and
approved sandbox access to its libraries. The initial sandboxed linker attempt
failed to locate Zig's installation directory; that was an environment failure,
not a skipped test or a relaxed gate. Native startup and performance have not been
benchmarked for this integrated engine. The earlier probe measurements above do
not imply interpreter throughput.

The evaluator now enforces explicit call, frame and step limits, tested with
runaway loops, recursion, deep expressions and recursion inside nested blocks.
This supplies bounded integration evidence, not proof of arbitrary stack or heap
safety. See [architecture decisions](architecture-decisions.md) for the limits and
[retained TS-001 transcripts](validation/ts-001/README.md) for full subprocess records.

### Coordinator review correction

The follow-up to `b677091` fixes U+2028/U+2029 being swallowed by single-line
comments. A shared line-terminator check now governs whitespace, comment endings
and source positions; CRLF counts once. Return/throw restrictions see line breaks
inside block comments as well. Parser/evaluator control-flow formatting was also
expanded without architecture changes. Rebuilt Node and native lanes pass 90/90
cases, including 43 additional newline regressions. Coverage is 642/642 for the CLI
and 655/655 for the realm driver, both fully static. All ten probes, 20 runner
regressions and typechecking pass again. The retained transcripts now reflect this
review correction; the initial evidence remains available at `b677091`.


## Ordinary symbol integration (TS-019A, 2026-11-02)

The integrated symbol Value and string-or-GuestSymbol PropertyKey compile with
the pinned toolchain. GuestObject retains one Map; tests distinguish equal-text
symbol identities, preserve key/payload references in detached snapshots, and
exercise String/Array subclass dispatch through GuestObject. Readonly symbol
payloads and defining-Realm boxes are reachable across modules without a new
compiler workaround. All 23 static-only builds and separately parsed coverage
gates pass (CLI 1244/1244; object-keys 1046/1046; object-valueof 1455/1455).
Node/native each pass 164/164 cases, runner 20/20 and probes 10/10. The initial
Zig installation-access failure is retained separately from the successful
approved run. See [TS-019A evidence](validation/ts-019a/README.md) for the complete
migration inventory and A1-A24/O1-O6 matrix. This does not establish symbol
protocols, a guest Symbol factory/registry, other platforms or performance.

## Symbol primitive-conversion protocol (TS-019B1, 2026-11-02)

The shared canonical symbol and completion-aware protocol build with the pinned
toolchain without a new workaround. All 23 static-only builds and separately
parsed coverage gates pass (CLI 1260/1260; primitive-conversion 1761/1761 after the test readability review).
Rebuilt Node/native each pass 164/164, runner 20/20, probes 10/10 and typecheck.
The initial Zig sandbox installation-access failure is retained separately from
the successful authorized run. [P1-P9 evidence and exact budget migrations](validation/ts-019b1/README.md).
No Symbol methods/global/registry, tag consumer, accessor or implicit boxing
support is implied; this is the frozen B1 protocol only.

## Typeof and void integration (TS-026A, 2026-11-02)

The pure Value classifier and guarded optional unresolved-identifier evaluation
compile with the pinned toolchain. Both measured evaluator overrides explicitly
forward the flag. Rebuilt Node/native182/182 each pass; all28 static-only builds
and separate parsed coverage gates pass (CLI1519, typeof-void2039, delete2295;
zero dynamic). Runner20/20 and probes10/10 pass. Baseline177cases/27gates remain.
Native actual default64 host/guest key recursion returns guest call-limit errors
at326/390 steps with restored state. No production workaround was needed.

A reduced inferred-never throwing callback in test setup produced one dynamic
adapter; declaring its Completion return type preserves the test's host throw
and removes the adapter. The minimal before/after reduction and failed attempts
are retained alongside the final evidence in [TS-026A](validation/ts-026a/README.md).
This is bounded Windows x64 evidence; no new platform or performance claim.

## In operator integration (TS-027A, 2026-11-02)

The minimal parser admission and binary branch pass rebuilt Node/native189/189,
runner20/20 and probes10/10. All29 static-only builds and independently parsed
coverage reports pass (CLI1530/1530, in-operator2185/2185, zero dynamic).
All182 baseline case names/expected records and28 gates are preserved.
Actual default64 host/guest recursive keys stop at261/325 ticks with original
Realm and calls/depth restored; guest peak depth131. No production workaround.

A test-only unknown catch-value identity comparison lowered to dynScalarEq even
though static-only build succeeded. Explicit instanceof Error narrowing preserves
same-instance assertion and removes the dynamic operation. Eight-statement
before/after reductions, both executions, coverage and the rejected initial gate
are retained in [TS-027A evidence](validation/ts-027a/README.md).

## Short callback adapters (TS-056)

A two-statement probe shows that a callback with fewer declared parameters than
its contextual function type can introduce a dynamic adapter (`dyn.this`), even
with an explicit Completion return type. Declaring the full four-parameter
Builtin signature removes it. The affected update-expression host tests use
that signature; no semantic-core workaround is needed. Reductions and coverage:
`build/update-callback-probe-{short,full}.{ts,log}`. The short version has one
dynamic statement; the full version has none.

### Shared Node emission directory

run-probes.mjs invokes TypeScript with tsconfig.json and rewrites build/node. Do not overlap it, typecheck or build:node with a Node guest or Node fixture run. Finish emission first; Node guest/fixture runs may then overlap a native build on frozen source. TS-100 initially overlapped probes and Node guests: one module import reported a missing registerMath export during emission (build/object-reflection-node.log). With no source change, the serialized rerun passed 587/587 (build/object-reflection-node-corrected.log); retain the initial failure and avoid the race rather than adding automatic retries.

### Native executable replacement

Finish the entire native build matrix before starting native guest, corpus or tooling readers. On Windows an active executable reader can prevent the compiler from replacing that binary. TS-177–182 retained one EPERM rename failure from overlapping tooling; an unchanged isolated rebuild and later installation passed. Keep the initial failure and retry evidence distinct. Build successors in isolated drafts while canonical source is frozen, and validate their baselines before integration.

### Measured host boundaries

Static-only compilation is not a substitute for semantic checks. The [weak-storage review](native-host-prerequisites.md) finds dynamic-tier handles for WeakMap/WeakSet and no WeakRef lowering. The [Date review](date-host-boundary.md) passes broader UTC checks but finds named-zone and historical local-time disagreements on Windows. The [String locale review](string-locale-prerequisites.md) finds default comparison violating canonical equivalence even though its smoke tests and static gate pass. These are feature prerequisites, not permission to emulate weak storage with strong maps or approximate locale semantics.

### Initializer predicate callback (TS-143)

The complete default-parameter driver built and executed, but coverage reported one dyn.this adapter at the initializer-detection Array.some callback. Declaring all three callback parameters did not remove it. Replacing the repeated predicate with a shared direct-loop helper produces 7984/7984 static statements and zero dynamic operations. Small constant, runtime-input, recursive-type and private-method probes did not reproduce the adapter, so this is evidence about this complete entry rather than a general Array.some restriction. Original/corrected coverage and probe sources/results are retained in build/default-parameters-*-coverage.log, build/default-parameters-dynamic.log and build/default-initializer-*.

### Temporary record projection (TS-154)

A reduced class method returning a record with an array gives an incorrect native result when the caller immediately selects an array element through the temporary return value. The Node execution passes; retaining the returned record in a named local also passes natively. The initial full duplicate-parameter driver crashed in this path despite fully static coverage. Its final collector returns the candidate array directly and retains it before indexing. See [the original reduction and passing variant](validation/ts-154/README.md); this is an execution failure, so static coverage alone cannot detect it.

## Shared context projection (TS-157)

A structural projection from a required callback property to an optional callback property copies the accompanying mutable Realm field in the pinned native compiler. Node retains the object alias. Matching optional declarations in the writable context and its readonly public view preserves the alias on both hosts. Keep those field shapes aligned; do not treat static coverage as proof of alias semantics. The six-statement original and matched probes, outputs and static-only build/coverage logs are retained in [ts-157](validation/ts-157/README.md).

### Private brand predicates after narrowing (TS-213)

A private-field in check inside a type predicate after instanceof can trigger
SC1090 in the pinned compiler. Binding the caller argument alone does not fix it.
Bind the narrowed instance to an explicitly typed local inside the predicate,
then check the private field on that local. Both the instanceof and private brand
checks remain. The reduced computed/bound probes and initial failures are in
build/generator-start-draft/build/brand-probe; the corrected probe and generator
semantic suite pass static-only compilation with zero dynamic coverage.

## BigInt snapshot boundary (TS-303)

The pinned compiler rejects host JSON.stringify of record unions containing a
bigint field (SC1090), even when a particular input contains only Numbers.
BigInt literal AST nodes therefore store validated normalized text; evaluation
charges its length before constructing the exact numeric value. The committed
bigint-literal-storage test checks native snapshots and resource behavior.
The original failure and two-statement before/after reduction remain in
build/bigint-literal-storage-draft/build. This does not change guest JSON semantics.
