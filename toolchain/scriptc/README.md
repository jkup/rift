# Building Rift's ScriptC compiler

To try Rift, use the [Node quick start](../../README.md#try-rift).
Native builds need the patched compiler in this directory. Installing the
unmodified npm compiler is not enough: Rift's weak collections need the patch.

`source.json` pins the upstream revision, patched tree, patch hash and LLVM
helpers. It also records the tested Node, pnpm and Zig versions. The source is
covered by the accompanying [Apache-2.0 license](LICENSE).

## Prepare the source

### Automated setup

Install Git, tar and Node 24 or later. Windows requires Git for Windows for
upstream build scripts and uses the downloaded Zig linker.
Linux also requires Clang and system C development tools. On Ubuntu, install them
first with `sudo apt-get install clang build-essential`. The helper checks for
Clang before starting downloads or builds.
macOS setup supports Apple Silicon and Intel and requires Xcode Command Line Tools
(`xcode-select --install`). Hosted release builds use macOS 15 runners.

From the Rift repository root, install dependencies and clone ScriptC beside
Rift, then build the pinned compiler:

```sh
npm ci
git -c core.autocrlf=false clone https://github.com/vercel-labs/scriptc.git ../scriptc
npm run setup:native -- ../scriptc
```

If `../scriptc` already exists, reuse it instead of cloning over it. It must be
an upstream ScriptC checkout containing the revision in `source.json`; run
`git -C ../scriptc fetch origin` if that revision is missing. If your checkout is
elsewhere, replace `../scriptc` with its path. The helper selects the pinned
revision without changing that checkout's working tree.

The helper verifies the source tree and patch using `prepare.mjs`, downloads
hash-pinned Zig and LLVM packages, installs the pinned pnpm version through npm,
and builds and verifies the patched runtime and compiler. It uses a fresh build
directory and refuses to overwrite an existing compiler or previous build.
Pass a new output directory as a second argument if the default is already used.
It requires network access and can take substantial time and disk space.

The resulting `rift-toolchain.json` records the compiler pin and downloaded Zig
location. Add that Zig directory to PATH in the current terminal. With the default
output directory, use PowerShell on Windows x64:

```powershell
$riftToolchain = Get-Content ./build/toolchain/win32-x64/rift-toolchain.json -Raw | ConvertFrom-Json
$env:PATH = $riftToolchain.zigDirectory + [IO.Path]::PathSeparator + $env:PATH
npm run test:compiler
npm run build:native
.\build\native\rift.exe examples/counter.js
```

On Linux or macOS, use a POSIX shell:

```sh
RIFT_ZIG_DIRECTORY=$(node -p "require('./build/toolchain/' + process.platform + '-' + process.arch + '/rift-toolchain.json').zigDirectory")
export PATH="$RIFT_ZIG_DIRECTORY:$PATH"
npm run test:compiler
npm run build:native
./build/native/rift examples/counter.js
```

The counter prints `total 36`, `next 14`, and `same object true`. The native build
also compiles the test drivers. Repeat the PATH setup in each new terminal.
For a custom compiler output, read its manifest instead and set `RIFT_SCRIPTC`
to its `bin/scriptc` (or `bin/scriptc.exe`).

The verified source archive is retained beside the output in `<output>-build/`.
Only build inputs are extracted; the upstream test and documentation trees are
not needed for this compiler build. For a full upstream development checkout or
manual setup, follow the steps below.

### Manual setup

From the Rift repository root, use an upstream ScriptC checkout containing the
pinned base revision:

```sh
node toolchain/scriptc/prepare.mjs /path/to/scriptc build/scriptc-source.tar
```

The helper verifies the patch, reconstructs the pinned tree in a separate Git
index and exports an LF archive with a hash manifest. It does not change the
upstream checkout and refuses an existing destination. Extract the archive into
a new directory. Use native Git for a Windows worktree, rather than WSL Git.

## Build

Follow the pinned compiler revision's CONTRIBUTING.md for its prerequisites.
Use the Node, pnpm and Zig versions in `source.json`. From the extracted source:

```sh
pnpm install --frozen-lockfile
pnpm -r --filter './packages/*' run build
```

Install the published LLVM helper identified in `source.json`. Verify its archive
integrity and executable hash, then put its `bin` directory under
`packages/llvm-<target>/`. Use `linux-x64-gnu`, `win32-x64-msvc`, `darwin-arm64`,
or `darwin-x64` for `<target>`.
This reuses the unchanged LLVM helper; the patched native runtime must be rebuilt.

With Zig 0.16.0 on PATH, run from the prepared source directory:

```sh
node packages/runtime-<target>/scripts/build.mjs
node packages/runtime-<target>/scripts/verify.mjs
node --max-old-space-size=8192 --import tsx scripts/build-native-cli.mts /absolute/path/to/rift/build/toolchain/<platform>-<arch>
```

Choose the package target and output directory suffix for the host:

| Host | `<target>` | `<platform>-<arch>` |
| --- | --- | --- |
| Windows x64 | `win32-x64-msvc` | `win32-x64` |
| Linux x64 | `linux-x64-gnu` | `linux-x64` |
| macOS Apple Silicon | `darwin-arm64` | `darwin-arm64` |
| macOS Intel | `darwin-x64` | `darwin-x64` |

Use a new output directory. These instructions build for the host platform. Leave
development `SCRIPTC_*`, `CC` and `AR` overrides unset so the build uses the local
helper and patched runtime. The resulting package still needs the host linker.

On Windows, append Git for Windows' `usr/bin` to PATH because upstream scripts
use `true`. Windows tar may fail to restore symlink fixtures or Unicode filenames;
check extraction before treating it as a complete compiler test checkout.

## Use with Rift

The default executable is `build/toolchain/<platform>-<arch>/bin/scriptc[.exe]`.
Set `RIFT_SCRIPTC` to select another built compiler; relative paths resolve from
the Rift root. An invalid path fails without falling back. Keep Zig 0.16.0 on PATH.

From Rift, validate the compiler before use:

```sh
npm run test:compiler
```

The native release workflow builds Windows x64, Linux x64, macOS arm64 and macOS
x64 packages. See [native releases](../../docs/native-releases.md) for platform
requirements and the scope of release validation, and the
[compiler constraints](../../docs/compiler-contract.md) for required coverage
checks and workarounds.
