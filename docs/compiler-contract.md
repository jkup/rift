# Native compiler constraints

Rift needs the patched ScriptC pinned in
[`toolchain/scriptc/source.json`](../toolchain/scriptc/source.json).
Follow the [build instructions](../toolchain/scriptc/README.md), including Zig
0.16.0. Native tools use `build/toolchain/<platform>-<arch>/bin/scriptc[.exe]`
or `RIFT_SCRIPTC`. The unpatched npm compiler is not a substitute.

## Checks

`npm run test:compiler` builds and runs ten probes under Node and ScriptC. Each
native build must pass `--tier static-only` and a separate `scriptc coverage`
check with zero dynamic statements. Static-only compilation can still allow
runtime-typed operations; coverage catches those. Unknown coverage formats,
timeouts, crashes, unexpected exits and incorrect output fail the check.
Each lane must also match the literal stdout expectations in
`tools/compiler-expectations.mjs`; agreement between two incorrect outputs is not
a pass. New probes need reviewed expectations. Variable memory diagnostics stay
on stderr. Reports include the expected stdout and go to `build/probe-results.json`.

These checks do not prove native correctness. Some compiler bugs produce fully
static code with wrong behavior, so semantic changes also need expected-result
tests under both hosts.

## Patterns to preserve

These are observed constraints of the pinned compiler, not general TypeScript
rules. Keep workarounds small and explain them where they are used.

- Do not name a class field `prototype`; use `proto` or `prototypeSlot`.
- Declare every parameter required by a callback's type. Use `_` prefixes for
  unused parameters. Short callbacks can introduce dynamic adapters.
- Keep mutable array types identical across shared references. Returning `T[]`
  as `(T | U)[]` can lose aliasing in native code.
- Keep optional callback properties aligned between a mutable context and its
  public view. Required-to-optional projections can copy accompanying Realm state.
- Store a returned record or array in a named local before indexing it. Access
  through a temporary record has produced incorrect native results.
- Bind narrowed private-field keys and private-brand instances to explicitly
  typed locals when the compiler rejects the direct expression.
- For nullable class values, an `instanceof` check before the null check avoids
  a known narrowing failure.
- Construct incompatible union variants explicitly when a narrowed union cannot
  be passed across an instruction boundary.
- BigInt literal nodes store normalized text. Host JSON.stringify of unions with
  a bigint field can fail compilation even when the input contains only numbers.
- A full default-parameter driver needed a direct loop in place of Array.some
  to avoid a dynamic adapter. Small probes did not reproduce it; this is not a
  general ban on Array.some.
- Bound guest recursion explicitly. Native stack overflow can terminate the
  process without a catchable exception.

Host catch-binding inspection is allowed when coverage passes. Guest errors
still use completion records rather than host exceptions.

## Build ordering

Typecheck, build:node and test:compiler all write `build/node`. Finish emission
before running tests that read it. Finish native builds before running those
executables; Windows can prevent replacement of a running binary. Keep source
fixed while tooling tests check its hashes.

The detailed investigations and original reproductions are in Git at
`0f20d8d8:docs/validation`. They are historical evidence, not setup instructions.
