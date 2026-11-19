# Rift

A JavaScript interpreter written for people who want to understand how an engine
works. The same TypeScript runs under Node and compiles to a native executable
with scriptc. Rift parses and evaluates guest JavaScript itself, including eval
and Function construction; it never delegates guest execution to the host engine.

## Try it

With Node >=24:

```sh
npm ci
npm run build:node
node build/node/src/cli.js examples/counter.js
node build/node/src/cli.js -e 'console.log(6 * 7);'
```

The counter example prints:

```text
total 36
next 14
same object true
```

For a native executable, first build the
[pinned patched scriptc toolchain](toolchain/scriptc/README.md), then run
`npm run build:native`. The executable is `build/native/rift`
(`rift.exe` on Windows). See the [CLI and validation reference](docs/usage.md)
for platform setup, timezone options, exit codes and detailed test commands.

## Scope

Rift supports Scripts with strict/sloppy semantics, closures, classes,
destructuring, generators, async functions and Promise job checkpoints.
Builtins include arrays, strings, Map/Set, object-keyed WeakMap/WeakSet, JSON,
BigInt, RegExp, Date, Reflect and Temporal. Resource limits and grammar/API gaps
remain; modules, Intl, WeakRef and FinalizationRegistry are not available.
See the [feature inventory](docs/feature-inventory.md) for precise boundaries.

A bounded comparison recorded **32,366 files passing on both TypeScript hosts**
over the same 53,751-file selection used for the retired engine's 17,785 passes.
This is not full conformance: the [saved comparison](docs/validation/test262-count-milestone/README.md)
retains harness differences, failures, exclusions and a metadata-only followup.
[Saved benchmarks](docs/validation/native-benchmarks/README.md) are historical
measurements from one machine.

## Explore and contribute

Start with the [architecture reading guide](docs/architecture-decisions.md),
[contributor guide](CONTRIBUTING.md) and [documentation index](docs/README.md).
Run `npm test` for the runner and Node guest regressions.

- `src/`: interpreter and CLI.
- `test/`: host tests, expectations and focused guest cases.
- `fixtures/`: runtime inputs, reference oracles and historical regression programs.
- `probes/`: small Node/native checks of the compiler contract.
- `examples/`: the quick-start program.
- `tools/` and `toolchain/`: validation tools and the pinned compiler build.
- `docs/`: architecture, feature notes and preserved evidence.

See the [repository layout](docs/repository-layout.md) for the purpose of the
root configuration files and generated directories. Licensed under [MIT](LICENSE).
