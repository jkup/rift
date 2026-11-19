# Building Rift's ScriptC compiler

To try Rift, use the [Node quick start](../../README.md#try-rift).
Native builds need the patched compiler in this directory. Installing the
unmodified npm compiler is not enough: Rift's weak collections need the patch.

`source.json` pins the upstream revision, patched tree, patch hash and LLVM
helpers. It also records the tested Node, pnpm and Zig versions. The source is
covered by the accompanying [Apache-2.0 license](LICENSE).

## Prepare the source

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
`packages/llvm-<target>/`. Use `linux-x64-gnu` or `win32-x64-msvc` for `<target>`.
This reuses the unchanged LLVM helper; the patched native runtime must be rebuilt.

With Zig 0.16.0 on PATH, run from the prepared source directory:

```sh
node packages/runtime-<target>/scripts/build.mjs
node packages/runtime-<target>/scripts/verify.mjs
node --max-old-space-size=8192 --import tsx scripts/build-native-cli.mts /absolute/path/to/rift/build/toolchain/<platform>-x64
```

Use `linux` or `win32` for `<platform>` and a new output directory. Leave
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

Linux x64 and Windows x64 packages have been exercised. Other targets are not
established by those checks. See the [compiler constraints](../../docs/compiler-contract.md)
for required coverage checks and workarounds.
