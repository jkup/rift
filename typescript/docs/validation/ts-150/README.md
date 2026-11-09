# Eval compiler reductions

Pinned scriptc 0.4.7, Windows x64, Zig 0.17.0; observed 2026-11-09.

- `eval-brand-before.ts`: static-only build rejects the narrowed property-derived operand with SC1090. `eval-brand-after.ts` moves validation into a class method, matching Rift's opaque callable pattern; static-only build passes and input `7` prints `7`.
- `eval-callback-before.ts`: coverage reports one `dyn.this` adapter despite a 100% static banner. `eval-callback-after.ts` retains the callback's four parameters and reports zero dynamic operations. These probes intentionally throw if executed; coverage is the relevant comparison.

Run `scriptc build <brand-probe> --tier static-only -o <output>` and `scriptc coverage <callback-probe> --explain-dynamic`. Original logs are retained locally in `build/eval-brand-*-build.log` and `build/eval-callback-*.log`. Eval's full focused driver subsequently passes static-only compilation, parsed zero-dynamic coverage, and execution under both hosts.
