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

## Try Rift

The easiest way to try Rift is with Node.js 24 or later. From the repository root:

```sh
npm ci
npm run build:node
node build/node/src/cli.js examples/counter.js
```

You should see:

```text
total 36
next 14
same object true
```

Replace `examples/counter.js` with your own JavaScript file, or run a short program:

```sh
node build/node/src/cli.js -e 'console.log(6 * 7);'
```

## Node and native builds

Both builds run the same Rift interpreter:

| Build | What it produces | How it runs |
| --- | --- | --- |
| `npm run build:node` | JavaScript compiled from Rift's TypeScript | Node.js runs Rift |
| `npm run build:native` | A native executable (`rift`, or `rift.exe` on Windows) and test drivers | The executable runs without Node.js |

In both cases, Rift parses and interprets your program. ScriptC compiles the
interpreter itself; it does not compile the JavaScript files you give Rift.

The Node route above is all you need to explore Rift. Native builds currently
require building a specific, patched version of the ScriptC compiler and setting
up Zig. That is a separate developer setup, not part of the quick start. See
[native setup](docs/usage.md#native-builds-optional) if you want to work on it.

## Explore further

See the [usage guide](docs/usage.md) for CLI options and validation commands, or
the [Test262 runner guide](tools/test262/README.md#native-corpus-runner) for
conformance testing (requires native compiler setup).
Read the [architecture guide](docs/architecture-decisions.md) to explore the code,
or [CONTRIBUTING.md](CONTRIBUTING.md) to get involved.

Licensed under [MIT](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md)
for bundled data, compiler patches and test material.
