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
`CONTRIBUTING.md` and package scripts. They include Node, locked pnpm
dependencies, LLVM 22 and Zig 0.16.0. Rebuild the matching native runtime pack
with the patched sources; an unchanged published runtime pack is insufficient.
Build the compiler workspace and then run its `scripts/build-native-cli.mts`
entry with Node's `tsx` loader and an 8 GiB heap limit. Its default asset staging
creates a relocatable distribution. For Linux release packaging, leave
`SCRIPTC_CC` unset so the versioned libc target selects upstream's Zig default.

The Linux distribution passed a relocation trial with development compiler
overrides and `NODE_PATH` removed: version, typed WeakMap compilation,
execution, and 4/4 static coverage. It also compiled the three affected Rift
inventory-test drivers, whose six executions and static coverage passed.
This is not yet a clean-machine build recipe or a validated Windows package.
Production installation and canonical Rift integration remain pending.
