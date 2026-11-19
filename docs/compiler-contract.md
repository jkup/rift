# scriptc compiler contract

Native build requirements, compiler checks and known workarounds.

## Current native toolchain (2026-11-18)

Weak collections require the patched compiler pinned in
[`toolchain/scriptc/source.json`](../toolchain/scriptc/source.json).
Follow its [source-build instructions](../toolchain/scriptc/README.md); native
tools use `build/toolchain/<platform>-<arch>/bin/scriptc[.exe]` or the explicit
`RIFT_SCRIPTC` path. They do not fall back to the unmodified npm compiler.
The source pin includes the upstream revision, patch/tree hashes and platform
LLVM helper hashes. Node 24.22.0, pnpm 11.1.3 and Zig 0.16.0 were used for the
validated Linux and Windows package builds. Both pass relocation and typed weak
storage consumer checks.

## Commands

```bash
npm ci
npm run test:runner      # regression tests for probe acceptance rules
npm run test:compiler    # tsc + node lane, scriptc native lane, coverage gate, diff
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

## Short callback adapters (TS-056)

A two-statement probe shows that a callback with fewer declared parameters than
its contextual function type can introduce a dynamic adapter (`dyn.this`), even
with an explicit Completion return type. Declaring the full four-parameter
Builtin signature removes it. The affected update-expression host tests use
that signature; no semantic-core workaround is needed. Reductions and coverage:
`build/update-callback-probe-{short,full}.{ts,log}`. The short version has one
dynamic statement; the full version has none.

### Shared Node emission directory

test-compiler.mjs invokes TypeScript with tsconfig.json and rewrites build/node. Do not overlap it, typecheck or build:node with a Node guest or Node fixture run. Finish emission first; Node guest/fixture runs may then overlap a native build on frozen source. TS-100 initially overlapped probes and Node guests: one module import reported a missing registerMath export during emission (build/object-reflection-node.log). With no source change, the serialized rerun passed 587/587 (build/object-reflection-node-corrected.log); retain the initial failure and avoid the race rather than adding automatic retries.

### Native executable replacement

Finish the entire native build matrix before starting native guest, corpus or tooling readers. On Windows an active executable reader can prevent the compiler from replacing that binary. TS-177–182 retained one EPERM rename failure from overlapping tooling; an unchanged isolated rebuild and later installation passed. Keep the initial failure and retry evidence distinct. Build successors in isolated drafts while canonical source is frozen, and validate their baselines before integration.

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

## Mutable array widening can lose aliasing (2026-11-11)

The pinned compiler loses a mutation when a helper returns `Field[]` as
`(Field | Block)[]`: pushing through the returned reference leaves the original
array empty natively, while Node observes the new element. Both the failing
reproducer and a control compile entirely statically (7 statements each).
Declaring the stored array with the same union element type as the helper's
return type preserves aliasing in the control and the class static-block tests.
Keep shared mutable initializer storage uniformly typed; narrow individual
elements when consuming them. Static coverage alone cannot detect this bug.

The exact programs, outputs and reproduction commands are retained in
[TS-444 evidence](validation/ts-444-array-widening/README.md). Audit other mutable
array widening paths when they share storage across helper boundaries; the
finding does not imply that all union arrays are unsafe.

## Narrowed unions with incompatible instruction payloads (2026-11-11)

scriptc 0.4.7 rejects an AST-to-instruction union conversion with SC2003 even
after the incompatible named-reference arm has been handled by a discriminant
check. Constructing the remaining dot, numeric-reference and assertion
instructions explicitly avoids the conversion and keeps the representation
boundary clear. The reduced failing example reports six of seven statements
static; the control builds entirely statically (eleven statements) and agrees
on both hosts. Preserve the static coverage gate: coverage exits zero even for
the failing example. See [TS-451 evidence](validation/ts-451-instruction-union/README.md).

## Callback adaptation (TS-458, 2026-11-11)

An inferred zero-argument callback passed through a wider builtin signature creates a dynamic adapter despite a successful static-only build. The four-statement [reduction and explicit-signature control](validation/ts-458-callback-adaptation/README.md) both produce matching Node/native output; only the control passes zero-dynamic coverage. State the full callback contract at this test boundary.

## Nullable instanceof guard after narrowing (TS-463)

The pinned compiler rejects a null-first guard on an optional class-or-null parameter with SC1090, even after assigning a local alias or moving that guard into a helper. Testing instanceof before the null comparison preserves the union and passes both-host execution with four static statements and zero dynamic statements. Keep this ordering where validating captured private environments; see [the reduced repro/control](validation/ts-463-nullable-instanceof/README.md). Full-engine acceptance remains separate.

## Private field-key property narrowing (TS-465)

The full private-field engine build reports SC2003 when passing a narrowed
`field.key` union to `defineOwnProperty`. Capturing the key in a local before
the initializer-name calculation passes the same focused both-host assertions
and all 19,788 static statements. Smaller controls do not reproduce the failure;
the full-engine trigger remains an open compiler investigation. See the
[exact boundary and evidence limitations](validation/ts-465-private-key-union/README.md).

