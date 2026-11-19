# Test262 pass-count milestone

This evidence closes the owner's bounded milestone: pass at least as many Test262
files as the preserved C++ engine, on the same pinned corpus. It does not claim
full conformance, identical passing subsets, or implementation parity.

Completed 2026-11-18:

| Engine | Primary passes | After metadata-only followup |
|---|---:|---:|
| Preserved C++ | 17,785 | 17,785 |
| TypeScript on Node | 32,366 | 32,367 |
| TypeScript native | 32,365 | 32,366 |

**32,366 files pass on both TypeScript hosts**, exceeding the baseline by 14,581.
The one host classification difference is `Number.prototype.toPrecision`
exponential formatting. All other file classifications agree; this does not
assert identical diagnostic text or prove every semantic detail.

The authoritative totals and host differences are in
[`comparison-summary.json`](comparison-summary.json). All three runs select the
same 53,751 files from Test262 revision
`91c70759363c46557b694792bf34a2551a7af5ba`, excluding `_FIXTURE` files exactly as
the original C++ runner does. The archive SHA256 is
`9869ee47ade3ed1f4d08c06e1b9a7c7e84391394575e2267064335917decb903`.
The extracted corpus audit checked all 57,202 regular files without differences.

## Counting and limitations

C++ uses its preserved runner and compatibility harness, with only path adaptation
and direct process spawning to prevent timeout-orphaned subprocesses. Its last
source commit is `2505497bcfe8745d456bcb7b360f057008e42117`. These are historical
classifications: the old runner does not implement today's harness/variant rules,
and even accepts some results after cleanup crashes. The summary exposes those
crash-associated passes. No surviving historical result manifest was available;
this is a fresh measurement of the preserved engine.

TypeScript uses unmodified upstream `sta.js`, `assert.js` and requested includes
as separate Scripts in a fresh Realm. Each file must pass every required strict
and non-strict variant. Parse/early negatives must fail during parsing with the
expected constructor; runtime negatives must throw the expected constructor.
Unsupported features, resource limits, harness errors and runner errors never
count as passes. Async and module files remain in the denominator but are
explicitly unsupported by this synchronous comparison adapter. Each variant has
a one-million-step and ten-thousand-call budget. Fifteen classifier controls
passed on each host before the corpus runs.

Primary results remain unchanged. A separate scan found twelve files with CR or
CRLF frontmatter; normalizing metadata line endings alone gave matching results
on both hosts. The summary applies the one recovered metadata parsing error per
host transparently, without changing guest source or discarding the original
error. It compares the intersection of Node/native passes against the C++ count.

Known followups are recorded in the [development roadmap](../../development-roadmap.md):
native numeric formatting, eval source tracking, escaped class-name source ranges
and nested harness filenames. They remain visible failures or exclusions, not
requirements to prolong this milestone.

## Artifacts and reproduction

`manifest.json` records both original and stored hashes. Gzip files retain full
per-file primary observations, fixed selection, combined classifications and the
canonical Node guest report. Decompress them to inspect; compression was verified
by round-trip hashing. `canonical-inputs.json` fingerprints the 1,042 source,
test and toolchain inputs used for acceptance; `node-engine-inputs.json` identifies
the emitted Node engine. Compiler and CLI reports retain command results, static
coverage and executable hashes. No binaries or corpus archive are committed here.

The `.mjs` and `.py` files are the exact bounded measurement scripts, preserved
as validation evidence rather than installed as a production runner. Their
relative imports expect `typescript/build/test262-baseline-comparison/`; copy
them there to reproduce. They use the recorded checkout and `/var/tmp` paths,
so adjust those paths for another machine. Keep original reports separate:
result writers deliberately refuse to overwrite them.

1. Build the preserved C++ engine using the root instructions, and build the
   TypeScript Node lane with `npm ci` and `npm run build:node` in `typescript/`.
   Use the [pinned compiler](../../../toolchain/scriptc/README.md) for native builds.
2. Obtain the pinned Test262 archive, verify its hash, and extract it to the
   corpus path above. Run `prepare-cpp.mjs`, `prepare-cpp-direct.mjs` and
   `prepare-selection.mjs` from the comparison directory. `audit-corpus.py`
   verifies the extracted corpus against the archive.
3. Build the native observer with `build-native-observer.mjs`. Run
   `node-controls.mjs` and `native-controls.mjs`; then `run-cpp.mjs`, `run-node.mjs`
   and `run-native.mjs`. The recorded runs used Linux Node 24.22.0, two workers
   per runner and two-CPU affinity. Native linking used Clang 22.1.8.
4. Run `metadata-followup.mjs`, then `summarize.mjs`. The summarizer also expects
   the original canonical manifest at `../weak-canonical-acceptance/inputs.json`,
   the archive and native executable. For a fresh build, record new input/binary
   hashes rather than passing off new binaries as the historical artifacts.

## Integration acceptance

The same frozen canonical source passed 1,003/1,003 Node guest cases, typechecking
and 36 runner tests. Focused weak-collection validation passed 75 semantic checks
on Windows and Linux, with separate Linux sanitizer/lifetime controls recorded
in TS-565. Ten standard compiler probes passed. The tooling run had 292 passes
and four sandbox filesystem failures; elevated focused followups passed all 24
affected tests plus the separate planner case. This is not labeled a clean
296-test rerun.

The Linux observer compiles all 21,758 statements statically. The Windows CLI
compiles all 21,302 statements statically and passes 17 expected-result cases on
both hosts; the tested executable is installed locally at `build/native/rift.exe`.
The old 485-entry Windows build matrix was deliberately stopped in favor of this
bounded acceptance. No complete new native guest-suite or matrix pass is claimed.
