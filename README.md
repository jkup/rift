<img src=".github/assets/rift.png" alt="Rift logo" width="160">

# Rift

Rift is a JavaScript interpreter written in TypeScript, built to make the workings
of a JavaScript engine easy to understand.

## How it works

Rift parses JavaScript into a syntax tree and walks that tree to execute it. It
implements its own values, objects, scopes and control flow. The same TypeScript
source runs under Node.js or compiles to a native executable with ScriptC.

Rift is a work in progress. See [supported features and limits](docs/architecture.md#supported-features-and-limits)
for supported JavaScript features and known gaps.

## Try Rift

Install Git and Node.js 24 or later, then run these commands in your terminal
(PowerShell on Windows, or a shell on macOS/Linux):

```sh
git clone https://github.com/jkup/rift.git
cd rift
npm ci
npm run build:node
npm start -- examples/counter.js
```

You should see:

```text
total 36
next 14
same object true
```

Replace `examples/counter.js` with your own JavaScript file, or run a short program:

```sh
npm start -- -e "console.log(6 * 7);"
```

This prints `42`. Use `npm start -- --help` for CLI options. The `--` passes
arguments through npm to Rift. Run these commands from the checkout; if you
already have it, skip the clone and change into that directory. After changing
Rift's TypeScript source or pulling updates, run `npm ci` and `npm run build:node`
again before running it.

Next, [experiment with the counter](examples/counter.js),
[follow the code](docs/architecture.md#where-to-start-reading), or
[make a contribution](CONTRIBUTING.md). The [usage guide](docs/usage.md)
also shows how to embed Rift in your own host.

## Node and native builds

Both builds run the same Rift interpreter:

| Build | What it produces | How it runs |
| --- | --- | --- |
| `npm run build:node` | JavaScript compiled from Rift's TypeScript | Node.js runs Rift |
| `npm run build:native` | A native executable (`rift`, or `rift.exe` on Windows) and test drivers | The executable runs without Node.js |

In both cases, Rift parses and interprets your program. ScriptC compiles the
interpreter itself; it does not compile the JavaScript files you give Rift.

The Node route above is all you need to explore Rift. See
[native release packages](docs/native-releases.md) for downloadable previews,
when available, and checksum verification. Building native executables from source
requires a specific, patched ScriptC compiler and Zig; the
[native setup guide](docs/usage.md#native-builds-optional) covers that separate
developer setup.

## Explore further

See the [usage guide](docs/usage.md) for CLI options and validation commands, or
the [Test262 runner guide](tools/test262/README.md#native-corpus-runner) for
conformance testing (requires native compiler setup).
Read the [architecture guide](docs/architecture.md) to explore the code,
or [CONTRIBUTING.md](CONTRIBUTING.md) to get involved.

Licensed under [MIT](LICENSE). See [third-party notices](THIRD_PARTY_NOTICES.md)
for bundled data, compiler patches and test material.
