# Rift TypeScript foundation

A tree-walking interpreter for a deliberately bounded JavaScript subset. Guest
source is read **at runtime** by Rift; scriptc compiles the interpreter, never the
guest programs. No host eval, Function, vm, or dynamic compiler fallback is used.
The original C++ engine remains intact.

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

```sh
npm run typecheck
npm run test:runner
npm run test:probes
npm run test:guest:node
npm run test:guest:native
```

Each guest command builds its lane before testing. `build:native` compiles the CLI
and the independent-realm host test driver with `--tier static-only`, then checks
the separate coverage report with the same fail-closed gate as the probes.
Both drivers read guest files at runtime. The generated negative and resource
fixtures in `build/guest-fixtures/` are identical across lanes and never passed to
scriptc. Cases assert expected stdout, error phase/name/location where fixed, and
exit status independently; matching two wrong implementations cannot pass.

Full subprocess records are retained in `build/probe-results.json`,
`build/native-build-results.json`, and `build/guest-{node,native}-results.json`.
The runner distinguishes timeout, crash, harness, exit-status, output and diagnostic
failures. Unsupported-syntax tests expect rejection and count in the denominator;
there are no skipped cases and no test262 conformance claim.

CLI exit statuses: **0** success, **1** guest runtime failure/uncaught throw,
**2** parse failure (including syntax/source limits), **64** invalid invocation,
**66** unreadable source file, **70** unexpected host/internal fault. Diagnostics
include filename and one-based line/UTF-16 column. The CLI's console adapter emits
one line per `console.log` call; the semantic core has no filesystem/process I/O.

Start reading at [architecture decisions](docs/architecture-decisions.md), then
follow `src/interpreter.ts` into the parser and evaluator. See the
[feature inventory](docs/feature-inventory.md) before writing guest programs.

TS-016A supplies per-Realm Object, Function and Array prototype roots and explicit
allocation factories. Builtin name/length metadata is centralized. These are
partial roots: no constructor globals/back-links or standard prototype methods
are installed. Host low-level objects still default to null prototypes; foreign
function execution still uses the caller context. See the
[graph contract](docs/realm-intrinsic-prototypes.md) and
[validation](docs/validation/ts-016a/README.md).
