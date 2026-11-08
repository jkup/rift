# Rift TypeScript foundation

A tree-walking interpreter for a deliberately bounded JavaScript subset. Guest
source is read **at runtime** by Rift; scriptc compiles the interpreter, never the
guest programs. No host eval, Function, vm, or dynamic compiler fallback is used.
The original C++ engine remains intact.

The CLI uses the Script evaluator: `var`, `for`, prefix/postfix `++` and `--`, `try`/`catch`, and
ordinary `new` calls work alongside the existing subset. Scripts are non-strict
unless they contain a `"use strict"` directive. Unsupported syntax, including
`const`, arrows and automatic semicolon insertion, still fails explicitly.
Object literals accept identifier, string and numeric property names.
See the [current development roadmap](docs/development-roadmap.md).

Array methods include `join`, `toString`, `push`, `pop`, `shift`, `unshift`, `reverse`, `at`, `indexOf`,
`includes`, `every`, `some`, `reduce` and `reduceRight`; see [mutation behavior](docs/array-mutation.md),
[search behavior](docs/array-search.md) and [predicate iteration](docs/array-predicate.md)
for scope and validation.
See [relative indexing](docs/array-at.md) for `at`.
See [reduction behavior](docs/array-reduction.md) for `reduce` and `reduceRight`.
Predicate searches include `find`, `findIndex`, `findLast` and `findLastIndex`;
see [search traversal](docs/array-find.md).
Script Realms also expose `map` and `forEach`; see [array iteration](docs/array-iteration.md)
for the supported default-array behavior and custom species boundary.

`Array` supports calls, construction and `Array.isArray`; see
[Array construction](docs/array-constructor.md) for sparse lengths and brand checks.

Own-property checks support `Object.hasOwn` and `Object.prototype.hasOwnProperty`;
see [property predicates](docs/own-property-predicates.md).

`Object.keys`, `Object.values` and `Object.entries` enumerate own enumerable
string properties; see [enumeration behavior](docs/object-enumeration.md).

`Object.defineProperty` and `Object.getOwnPropertyDescriptor` expose data and
accessor attributes; see [descriptor reflection](docs/property-descriptor-reflection.md).

Strings support `charAt`, `charCodeAt` and `slice` with UTF-16 indexing; see
[string methods](docs/string-methods.md).

Boolean calls and construction preserve primitive versus boxed values; see
[Boolean behavior](docs/boolean-constructor.md). The
[C++ fixture baseline](docs/legacy-fixture-baseline.md) tracks concrete coverage gaps.

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

Prepare the pinned 36-file test262 selection before running tooling tests:

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

Start reading at [architecture decisions](docs/architecture-decisions.md), then
follow `src/cli.ts` into Script preparation and execution. See the
[feature inventory](docs/feature-inventory.md) before writing guest programs.

## Historical milestones

The notes below describe earlier scopes. Use the current reading guide and
feature inventory above for today's CLI behavior.

TS-016A supplies per-Realm Object, Function and Array prototype roots and explicit
allocation factories. Builtin name/length metadata is centralized. These are
partial roots: no constructor globals/back-links are installed. TS-016B adds only
Function.prototype.call (name call, length 1), preserving strict receivers and
shared budgets without proper tail calls. TS-017A enters each function's immutable
defining Realm through one stable evaluator context and restores the caller in
finally, including host faults. Lexical environments and transferred Values retain
identity. Host low-level objects still default to null prototypes; callable host
fixtures require an explicit owner. See the
[Realm entry contract](docs/function-realm-entry.md),
[Realm entry validation](docs/validation/ts-017a/README.md), the
[graph contract](docs/realm-intrinsic-prototypes.md) and
[graph validation](docs/validation/ts-016a/README.md) and
[call validation](docs/validation/ts-016b/README.md).
