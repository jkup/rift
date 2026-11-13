# Rift in TypeScript

A JavaScript interpreter written for people who want to understand how an engine
works. The same TypeScript runs under Node and compiles to a native executable
with scriptc. Rift reads and evaluates guest programs at runtime using its own
parser, values, objects and execution machinery. Guest eval and Function
construction also use Rift; no host eval, vm or dynamic compiler fallback runs
guest code. The original C++ implementation remains intact.

The CLI executes Scripts with strict/sloppy semantics, lexical bindings,
destructuring, classes, generators, async functions and Promise job checkpoints.
Builtins include arrays, strings, Map/Set, JSON, BigInt, RegExp, Date, Reflect and
Temporal. Support is bounded by explicit resource limits and remaining grammar
and API gaps. Modules, Intl and weak-storage APIs are not available.

See the [current feature inventory](docs/feature-inventory.md) for scope, the
[reading guide](docs/architecture-decisions.md) for the execution path, and the
[roadmap](docs/development-roadmap.md) for accepted milestones and pending work.
The [C++ fixture baseline](docs/legacy-fixture-baseline.md) keeps original tests
and distinguishes incompatibilities from engine gaps; it is not a conformance
percentage.

## Build and run

From this directory, with Node >=24 and the pinned npm dependencies:

```sh
npm ci
npm run build:node
node build/node/src/cli.js examples/counter.js
npm run build:native
./build/native/rift examples/counter.js
```

On Windows the executable is `build/native/rift.exe`. Put the installed Zig
directory on the process PATH first (PowerShell):

```powershell
$env:PATH = 'C:\Users\jonku\AppData\Local\Microsoft\WinGet\Packages\zig.zig_Microsoft.Winget.Source_8wekyb3d8bbwe\zig-x86_64-windows-0.17.0;' + $env:PATH
npm run build:native
.\build\native\rift.exe examples/counter.js
.\build\native\rift.exe -e 'console.log(6 * 7);'
```

Native builds use two workers. Set `RIFT_NATIVE_JOBS=1` for sequential builds,
or another positive integer to choose the worker limit. Every entry still runs
static-only compilation and an independent coverage check; the result file keeps
the declared entry order.

Date uses UTC by default. Select a named timezone or fixed minute offset with a
leading `--time-zone` option for either file or inline execution:

```powershell
.\build\native\rift.exe --time-zone America/New_York -e 'console.log(new Date(2024, 2, 10, 2, 30).toISOString());'
.\build\native\rift.exe --time-zone +05:30 examples/counter.js
```

The same option works with `node build/node/src/cli.js`. Named-zone gaps move
forward and overlaps select the earlier instant. Invalid identifiers exit with
status 64 before source I/O or execution. The option does not change the host
timezone or enable system timezone discovery; omitting it always selects UTC.

Expected example output:

```text
total 36
next 14
same object true
```

Use the [compiler contract](docs/compiler-contract.md) for exact tested versions
and Windows linker requirements. A sandbox may require permission to access Zig's
libraries. A blocked native build is a failure, not a reason to disable coverage.
Only Windows x64 has been validated.

## Validation

Prepare the pinned test262 selection before running tooling tests:

```sh
node tools/test262/prepare-corpus.mjs
```

This downloads from the manifest's exact upstream revision and verifies each Git
blob hash. For offline setup, pass an existing test262 checkout as the argument.
Files go under `build/test262-corpus`; set `RIFT_TEST262_ROOT` to use another
location. Existing differing files are rejected rather than overwritten. Test
scratch output goes under `build/test262-tests` (`RIFT_TEST_OUTPUT_ROOT` overrides
it). The tooling tests still require built Node and native drivers; run the build
commands above before `npm run test:test262` on a fresh checkout.

```sh
npm run typecheck
npm run test:runner
npm run test:probes
npm run test:guest:node
npm run test:guest:native
```

Each guest command builds its lane before testing. `build:native` compiles the CLI,
host test drivers and observation drivers with `--tier static-only`, then checks
each coverage report with the same fail-closed gate as the probes.
Guest source is read at runtime. The generated negative and resource
fixtures in `build/guest-fixtures/` are identical across lanes and never passed to
scriptc. Cases assert expected stdout, error phase/name/location where fixed, and
exit status independently; matching two wrong implementations cannot pass.

Full subprocess records are retained in `build/probe-results.json`,
`build/native-build-results.json`, and `build/guest-{node,native}-results.json`.
The runner distinguishes timeout, crash, harness, exit-status, output and diagnostic
failures. Unsupported-syntax tests expect rejection and count in the denominator;
there are no skipped cases and no test262 conformance claim.

The guest runner also executes Script Realm bootstrap, function/accessor checks
and the catch, loop, constructor, error, map and formatting harness checks on two
committed runtime inputs. `tools/script-host-cases.mjs` holds their expectations
or reads accepted transcripts without rewriting them. Each driver retains its
semantic assertions. Other compiled drivers still need an entry-point audit;
see the roadmap. Building a test executable alone does not exercise it.

CLI exit statuses: **0** success, **1** guest runtime failure/uncaught throw,
**2** parse failure (including syntax/source limits), **64** invalid invocation,
**66** unreadable source file, **70** unexpected host/internal fault. Diagnostics
include filename and one-based line/UTF-16 column. The CLI's console adapter emits
one line per `console.log` call; the semantic core has no filesystem/process I/O.
