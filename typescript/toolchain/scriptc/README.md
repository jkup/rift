# Typed weak-storage compiler candidate

This patch preserves the compiler used by the isolated Rift WeakMap/WeakSet
trial. It adds typed weak storage and ownership tracing, plus the runtime-link
and test-selection repairs recorded under TS-565 in `../../TASKS.md`.
The installed Rift compiler remains the npm `scriptc@0.4.7` dependency;
this directory does not activate or install the candidate.

`source.json` pins the upstream base, patch hash and resulting Git tree.
Applying the patch to a separate index at that base reproduced the complete
tested tree, including all 97 changed files. The local tested revision need
not be published: the upstream base and this patch contain the source changes.
The source is covered by the accompanying upstream Apache-2.0 license.

To export the pinned source from an upstream checkout containing `baseRevision`,
run from the Rift TypeScript directory:

```sh
node toolchain/scriptc/prepare.mjs /path/to/scriptc build/scriptc-source.tar
```

The helper verifies the patch, reconstructs the exact source tree in a separate
Git index and exports an LF source archive with a hash manifest. It preserves
the upstream worktree and its index, and refuses an existing destination.
Extract the archive into a new directory on the build host. Use native Git
for a Windows-created worktree; WSL Git interprets its Windows `.git` pointer
and global line-ending settings differently.

Build prerequisites and package commands are defined by that revision's
`CONTRIBUTING.md` and package scripts. `source.json` records the exercised
Node, pnpm and Zig versions. Install dependencies with `pnpm install
--frozen-lockfile`, then build the workspace with `pnpm -r --filter
'./packages/*' run build`. The exported source passes both steps without
changing any of its 19,943 archived files and symlinks.

For Linux, the published LLVM helper package pinned in `source.json` supplies
the code-generation executable. Verify its archive integrity and executable
hash, then place its `bin` directory under `packages/llvm-linux-x64-gnu/`.
Its bytes match the helper used for the validated compiler trials; the patch
does not change LLVM helper source. This avoids requiring an LLVM development
SDK solely to rebuild that unchanged dependency. Rebuild the native runtime pack
with the patched sources; an unchanged published runtime pack is insufficient.
Build the compiler workspace and then run its `scripts/build-native-cli.mts`
entry with Node's `tsx` loader and an 8 GiB heap limit. Its default asset staging
creates a relocatable distribution. For Linux release packaging, leave
`SCRIPTC_CC` unset so the versioned libc target selects upstream's Zig default.

The Linux distribution passed a relocation trial with development compiler
overrides and `NODE_PATH` removed: version, typed WeakMap compilation,
execution, and 4/4 static coverage. It also compiled the three affected Rift
inventory-test drivers, whose six executions and static coverage passed.
The clean-source runtime rebuild passes all seven runtime flavors and six vendor
archives; its verifier accepts 1,608 artifacts. A second source audit finds no
changes to the 19,943 archived files and symlinks. The runtime build's configured
LLVM helper is byte-identical to the pinned helper in the clean source tree.
The complete clean-source Linux package also builds and passes relocation,
version, typed WeakMap consumer compilation/execution, and 5/5 static coverage
with development overrides removed. Node and native consumer output agree.
Production installation and canonical Rift integration remain pending.

Windows preparation uses the same pinned Node, pnpm and Zig versions, plus
the Windows LLVM helper pinned in `source.json`. Frozen dependency installation
and the compiler/CLI workspace build pass. The upstream package scripts use
`true`; the exercised Windows build appends Git for Windows' `usr/bin` directory
to PATH to supply that command. A separate patched runtime build passes all
seven flavors and five vendor archives; its verifier accepts 1,573 artifacts.
The native Windows compiler package also builds and passes relocation, version,
typed WeakMap compilation/execution and 5/5 static coverage. Its Node and native
consumer output agree with empty execution stderr. The compiler build retains
a 75.2% profile-match warning; this establishes no performance result.
Windows tar failed to create 12 archived symlinks and mishandled two Unicode
test filenames. Restoring those two files from the archive leaves all regular
source files byte-identical; the symlink fixtures remain unavailable. These
results do not establish a complete Windows compiler test-suite run.
