<img src="docs/assets/rift.png" alt="Rift logo" width="160">

# Rift

Rift is a JavaScript interpreter written in TypeScript, built to make the workings
of a JavaScript engine easy to understand.

## How it works

Rift parses JavaScript into a syntax tree and walks that tree to execute it. It
implements its own values, objects, scopes and control flow. The same TypeScript
source runs under Node.js or compiles to a native executable with ScriptC.

Rift is a work in progress. See the [feature inventory](docs/feature-inventory.md)
for supported JavaScript features and known gaps.

## Run locally

With Node.js 24 or later, run these commands from the repository root:

```sh
npm ci
npm run build:node
node build/node/src/cli.js examples/counter.js
node build/node/src/cli.js -e 'console.log(6 * 7);'
```

To run natively, first build the [pinned ScriptC toolchain](toolchain/scriptc/README.md),
then run:

```sh
npm run build:native
./build/native/rift examples/counter.js
```

On Windows, use `./build/native/rift.exe`. See the [usage guide](docs/usage.md)
for platform setup and CLI options.

To build a single native driver and run Test262 with parallel workers:

```sh
git -c core.autocrlf=false clone --depth 1 https://github.com/tc39/test262.git ../test262
npm run test262
```

Reuse an existing corpus with `-- --corpus PATH`. See the
[runner guide](tools/test262/README.md#native-corpus-runner) for filtering,
worker counts, explicit unsupported-feature skips and reports.

Read the [architecture guide](docs/architecture-decisions.md) to explore the code,
or [CONTRIBUTING.md](CONTRIBUTING.md) to get involved.

Licensed under [MIT](LICENSE).
