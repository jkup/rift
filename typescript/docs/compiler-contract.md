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

## Not yet probed

- A realistically large program (thousands of lines, many modules): build time and diagnostics at scale.
- Deep recursion through the evaluator itself, where each guest call costs several host frames.
- Long-running memory with large retained graphs rather than short-lived cycles.
- Native interop for regex or Temporal.
- macOS and Linux lanes.
