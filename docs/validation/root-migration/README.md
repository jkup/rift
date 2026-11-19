# Root migration validation — 2026-11-19

- Typechecking: passed.
- Tooling tests: 36 passed, no failures or skips (runner.txt).
- Compiler probes: all 10 pass Node, native and static coverage (probes.txt).
- Fresh native CLI: built from root src/cli.ts with the pinned patched scriptc and Zig 0.16.0. All 21,302 analyzed statements pass the static coverage gate (cli-coverage.txt).
- Node guest suite: 1,003/1,003 passed; no skips.
- Native guest suite: 1,003/1,003 passed; no skips. The CLI was rebuilt; unchanged auxiliary native test drivers were relocated from the accepted build. This was not a full rebuild of every native driver.
- examples/counter.js: expected output under both hosts.
- Repository audit: no tracked C++ sources, headers or CMake files; no tracked files missing from disk and no old typescript/ tree. Current top-level documentation links checked.

Initial native attempts exposed a relocated compiler junction and the wrong Zig on PATH, followed by sandbox linker-cache write failures. Repairing the junction, selecting pinned Zig 0.16.0 and running with approved filesystem access resolved these environment issues.

Saved benchmark JSON SHA-256 hashes:

```json
{
  "native-comparison-first-run.json": "9d267538d87306e7958d23b552d6ee2f4db9b4e0802946615b92f256f34ecb85",
  "native-comparison-preflight.json": "270b3b7d740e307f5b62e251ad3d90d4471da322ccc1f07c5cae22bb68e9cb33",
  "native-comparison-results.json": "b01a4f75c2dbfb781cc788fef9240fc1b254b84a285963436d492721c6963391"
}
```
