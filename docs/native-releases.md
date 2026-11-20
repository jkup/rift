# Native release packages

Native packaging targets Windows x64 and Linux x64. The release workflow creates
a draft preview only after both platforms succeed. Published downloads, when
available, are on [GitHub Releases](https://github.com/jkup/rift/releases).
Drafts are visible only to repository collaborators. macOS and ARM packages are
not provided by this workflow.

## Download and run

Choose `rift-<version>-win32-x64.zip` for Windows or
`rift-<version>-linux-x64.tar.gz` for Linux, and download its `.sha256` file too.
Verify the archive before extracting it:

```powershell
# Windows: compare this hash with the value in the downloaded .sha256 file.
Get-FileHash .\rift-<version>-win32-x64.zip -Algorithm SHA256
```

```sh
# Linux: run alongside both downloaded files.
sha256sum --check rift-<version>-linux-x64.tar.gz.sha256
```

Replace `<version>` with the release's version. Extract the entire archive and
open a terminal inside the extracted directory. On Windows:

```powershell
.\rift.exe examples/counter.js
.\rift.exe -e "console.log(6 * 7);"
.\rift.exe --help
```

On Linux:

```sh
./rift examples/counter.js
./rift -e 'console.log(6 * 7);'
./rift --help
```

The counter prints `total 36`, `next 14`, and `same object true`; the inline
program prints `42`. Node.js, npm, ScriptC and Zig are not required to run the
executable. These are unsigned preview binaries. Windows builds target x64;
Linux builds use glibc rather than musl (Alpine). The workflow uses Windows
Server 2022 and Ubuntu 22.04; compatibility with other OS versions is not
established by those jobs.

Rift runs scripts, with the [same feature limits](architecture.md#supported-features-and-limits)
as the Node-hosted interpreter. It does not provide Node or browser APIs.

## Build a package locally

Use a clean checkout with Node 24 or later, dependencies installed with `npm ci`,
the [patched compiler](../toolchain/scriptc/README.md) and Zig 0.16.0 on PATH.
Linux also needs Clang and system C development tools (`sudo apt-get install
clang build-essential` on Ubuntu). Then run:

```sh
npm run package:native -- v0.1.0-preview.1
```

The version is a filename-safe label; packaging does not create a tag or publish
anything. An optional second argument chooses the output directory. Existing
release assets are never overwritten. The default output is `build/releases/`:

- A ZIP (Windows) or compressed tar archive (Linux), containing the executable,
  counter example, documentation, licenses and `manifest.json`.
- An archive `.sha256` file.
- A platform-specific JSON report with compiler, coverage and smoke-test results.

The command runs all ten compiler probes freshly under Node and native execution,
then builds only the CLI with `--tier static-only` and checks its separate
coverage report for zero dynamic statements. It extracts the archive into a new
path containing spaces, verifies the executable hash, and runs the shared CLI
cases plus counter, inline, promise, weak-collection and uncaught-throw checks.
The extracted binary runs with an empty PATH to check independence from build
tools. Any failed check prevents creation of the final release assets. Failed
work and diagnostics remain under `build/releases/.native-release-*/`.

The source commit must remain clean and unchanged throughout packaging. Do not
run another build or guest suite concurrently: compiler probes emit `build/node`
and native probe executables. This command does not replace the complete native
guest suite or Test262. It records its narrower validation scope in the manifest.

## Maintainer workflow

Run **Native release** in GitHub Actions against the intended source revision,
with a new version/tag such as `v0.1.0-preview.1`. Both jobs build the pinned patched
compiler from source, verify downloaded Zig and LLVM assets, run the Node checks,
and package their native CLI. Only the final draft job has repository write
permission; all build jobs use read-only permissions.

After both jobs succeed, inspect the draft's archives and validation reports.
The workflow marks it as a prerelease and leaves publication to a maintainer.
The draft job first creates a new tag at the build's exact source commit and
refuses an existing tag. If uploading the draft fails after tag creation, inspect
that tag and the retained artifacts before retrying with a new version. Failed
build jobs do not create a draft. This workflow requires available GitHub Actions
billing/quota.

The local packaging command produces the same asset layout when hosted runners
are unavailable. Publish only packages from the same source commit and retain
their reports and checksums. Avoid presenting a one-platform local build as a
successful two-platform workflow run.
