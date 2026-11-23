<img src=".github/assets/rift.png" alt="Rift logo" width="160">

# Rift

Rift is a JavaScript interpreter written in TypeScript, built to make the workings
of a JavaScript engine easy to understand.

## How it works

Rift parses JavaScript into a syntax tree and walks that tree to execute it. It
implements its own values, objects, scopes and control flow. The same TypeScript
source runs under Node.js or compiles to a native executable with ScriptC.

Rift is a work in progress. It runs JavaScript scripts, but does not support
modules (`import`/`export`) or provide Node.js or browser APIs such as filesystem
access, networking or the DOM. See [supported features and limits](docs/architecture.md#supported-features-and-limits)
for supported JavaScript features and other known gaps.
The [Test262 support tables](docs/test262.md) show measured results by API and
language area, including failures, skips and execution limits.

## Try Rift

Download a native preview and run it without installing Node.js or build tools:

| Platform | Download |
| --- | --- |
| Windows x64 | [ZIP](https://github.com/jkup/rift/releases/download/native-preview-2026-11-20.4/rift-native-preview-2026-11-20.4-win32-x64.zip) |
| Linux x64 (glibc 2.34+) | [tar.gz](https://github.com/jkup/rift/releases/download/native-preview-2026-11-20.4/rift-native-preview-2026-11-20.4-linux-x64.tar.gz) |
| macOS Apple Silicon | [tar.gz](https://github.com/jkup/rift/releases/download/native-preview-2026-11-20.4/rift-native-preview-2026-11-20.4-darwin-arm64.tar.gz) |
| macOS Intel | [tar.gz](https://github.com/jkup/rift/releases/download/native-preview-2026-11-20.4/rift-native-preview-2026-11-20.4-darwin-x64.tar.gz) |

Extract the entire archive and open a terminal in the extracted directory.
On Windows (PowerShell):

```powershell
.\rift.exe -e "console.log(6 * 7);"
```

On macOS or Linux:

```sh
./rift -e 'console.log(6 * 7);'
```

Both print `42`. To run the bundled example, replace `-e` and its source with
`examples/counter.js`; use `--help` for CLI options.

See [download verification and run instructions](docs/native-releases.md), or
[all releases and checksums](https://github.com/jkup/rift/releases). These are
preview binaries without publisher signing or macOS notarization. See the
[platform requirements](docs/native-releases.md#download-and-run) before downloading.

### Run from source

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
[native release packages](docs/native-releases.md) for downloadable previews
and checksum verification. Building native executables from source
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
