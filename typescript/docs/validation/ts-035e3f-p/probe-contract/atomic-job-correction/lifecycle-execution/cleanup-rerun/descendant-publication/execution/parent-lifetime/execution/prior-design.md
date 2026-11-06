# TS-035E3f-P: controlled build provenance — blocked design disposition

Base `ef2ef4e88030105997688e2904e48a1e4dbb30fa`, 2026-11-06. This audit does
**not freeze a production implementation**. The concrete next review item is the
single non-executing compilation experiment below. The installed toolchain has
more inputs than its package pins identify, and this task has not established
either effective native link inputs or an exclusive filesystem owner. Adding
another historical identity descriptor would not resolve either problem.

This uses the task's explicit blocker alternative. `proposal-manifest.json`
therefore has no production additions or replacements, no exported API, and no
success schema. It must not be interpreted as permission for an E3f implementation.
There are zero old-test migrations. The coordinator must review this disposition
and any probe before further work. No compilation was performed here.

## What was measured

All paths below are relative to `typescript` unless absolute. Machine-readable
evidence is in `validation/ts-035e3f-p`. These are local observations at reads,
not an atomic snapshot, accepted build provenance, or an execution credential.

* `preservation.json` pins 9,333 prior tracked repository files, excluding only
  TASKS and coordinator-owned COORDINATION. Existing history is read-only.
* `project-inputs.json` inventories 311 files under src/test/probes/tools plus
  package.json/package-lock.json/tsconfig.json. This includes transitive engine,
  builtin, private owner, driver, codec, input, policy and host-service modules.
* `installed-packages.json` inventories 3,478 installed files, including dotfiles,
  npm shims, platform executables, declaration libraries, runtime pack and LLVM.
  `zig-tree.json` inventories 19,505 files in the observed Zig installation.
  Neither directory inventory asserts that every member is consumed or that
  dependencies outside the directory are absent. No links/hardlinks or read
  failures were observed in these inventories; ancestors are not thereby locked.
* `installed-source-texts.json` retains complete relevant wrapper/manifests and
  README bytes, not merely version fields. `entry-mapping.json` retains all
  137 Node mappings and all 71 native entries/commands. `discovery-commands.json`
  retains exact commands, cwd, statuses, errors and streams, including failures.
* `host.json` retains Node identity, OS/architecture, ordered PATH candidates and
  an explicitly limited build-environment allowlist with absent distinct from
  empty. It is not the prior build's environment or a complete environment dump.

### Compiler and runtime paths

`tools/build-native.mjs` directly invokes
`node_modules/scriptc/bin/scriptc.exe`, cwd project root, inheriting the process
environment. Every entry gets `build ENTRY --tier static-only -o ABSOLUTE_OUTPUT`
then a separate `coverage ENTRY`. It creates/reuses `build/native`, continues
after failed entries, and overwrites `build/native-build-results.json` at the end.
It neither reserves exclusive ownership nor removes stale binaries. The separate
coverage parser requires positive analyzed count, exactly equal static count,
100%, and the pinned fully-static text; a build status alone is insufficient.
Its synthetic Node/native success placeholders do not establish execution.

The installed scriptc native manifest says compiler0.4.7,
target `windows-x64-msvc`, linker `zig`, linker_args `["cc"]`. Relative paths
resolve from `node_modules/scriptc/bin` into:

| Manifest field | Actual installed path |
|---|---|
| ts7 | @scriptc/cli-win32-x64-msvc/dist/lib/typescript/lib/tsc.exe |
| tsc_ts | @scriptc/cli-win32-x64-msvc/dist/lib/tsc-ts/lib/tsc-ts.exe |
| comptime | @scriptc/cli-win32-x64-msvc/dist/lib/scriptc-comptime.exe |
| runtime_sources | @scriptc/cli-win32-x64-msvc/dist/lib/runtime-sources |
| declarations / lib_diagnostics | @scriptc/cli-win32-x64-msvc/dist/lib/declarations, including lib-diagnostics.json |
| llvm_package | @scriptc/llvm-win32-x64-msvc (bin/scriptc-llvm-codegen.exe) |
| runtime_pack / runtime_packs | @scriptc/runtime-win32-x64-msvc |

The table is rooted at node_modules. WASI runner and dsymutil are also present
in the manifest; their presence is not evidence that this Windows build uses
them. Installation relocates manifest paths and copies the platform CLI. The
installer's source is retained; it was not executed. Direct native builds do
not run the npm scriptc shim, but npm/Node resolution affects other entry paths.

The runtime pack declares ABI48, LLVM triple x86_64-pc-windows-msvc, release and
speed flavors, predicates/defines, precompiled runtime objects and external
library families. Its compiler identity strings describe package production,
not the compiler invocation being audited. All 1,483 manifest path/hash
occurrences match current bytes/declared size in `runtime-pack-check.json`.
This does not authenticate package origin, which predicates were selected, or
cache reuse. `runtime-pack.verified.json` is an existing mutable verification
sidecar containing file metadata; it is not trusted build ownership. It must
not be imported as a certificate or copied as a cache-authority token.

Node is `C:\Program Files\nodejs\node.exe`, v26.13.0. Its hash and the absolute
Zig executable hash match the accepted E3d descriptive records. That equality
does not recover the old environment, link arguments or library files.
`package.json` requires Node>=24 rather than pinning the actual executable.
The Node compiler route is npm shim -> typescript/bin/tsc -> lib/tsc.js ->
#getExePath -> @typescript/typescript-win32-x64/lib/tsc.exe. The Windows wrapper
uses execFileSync with inherited environment/cwd. The platform resolver examines
package name/bin and import.meta.resolve; wrapper identity alone misses the
native compiler. This platform compiler and scriptc's bundled ts7 are separate
files even when they report related versions.

The read-only `--showConfig` command reports 137 inputs, nodenext module and
resolution, es2024 target, strict true, types[node], rootDir '.', outDir
build/node, and moduleDetection force. Source suffix/path determines the
intended generated JS mapping. It proves file enumeration/configuration for
this invocation, not emitted output or all resolver reads. Node driver maps to
build/node/src/script-observation-driver.js; the observation control driver
maps to build/node/test/script-observation.js. Native equivalents are
build/native/script-observation-driver.exe and script-observation.exe. All
other entries remain explicit in the mapping, not dropped from acceptance.

### Effective settings remain partly unknown

Installed CLI help documents release/-O2, emit exe, baseline CPU, console
subsystem and keep-llvm defaults. These are **advertised defaults**, not measured
effective options for the accepted build. Current native argv does not specify
them. README documents SCRIPTC_LINKER, SCRIPTC_TARGET, SCRIPTC_RUNTIME_PACK,
SCRIPTC_CACHE_DIR and SCRIPTC_NO_CACHE. Binary string hints additionally include
SCRIPTC_TOOLCHAIN, SCRIPTC_CC, SCRIPTC_CHECKER, SCRIPTC_LLVM_HELPER and many debug
or optimization names. `compiler-string-hints.json` and presence checks are
discovery aids; strings do not prove supported semantics or precedence. We
cannot safely invent a closed override allowlist from them.

In the original sandbox environment bare `zig version` failed ENOENT; none of
the recorded PATH candidates supplied Zig. The absolute executable under
`C:/Users/jonku/AppData/Local/Microsoft/WinGet/Packages/zig.zig_Microsoft.Winget.Source_8wekyb3d8bbwe/zig-x86_64-windows-0.17.0/zig.exe`
reported 0.17.0. Its sandbox `env` failed to locate the installation directory.
Permission-enabled **read-only** `env` succeeded: lib_dir is the sibling lib,
std_dir lib/std, global cache `C:\Users\jonku\AppData\Local\zig`, reported host
target `x86_64-windows.win11_br...win11_br-gnu`. That host default is not the
scriptc MSVC effective link target. No PATH or process environment was changed.
The original failure remains evidence; the retry is recorded separately.

Conventional Windows Kits registry/root and Visual Studio directories were
absent in the queried namespace. This is not proof of no SDK/sysroot input:
the linker can select bundled libraries, other installations or cached inputs.
We have no actual selected SDK version, include search order, library search
order or expanded link argv. These fields stay **unresolved**, never `[]`.

`pe-imports.json` reads nine installed PE import tables offline. Node imports
system libraries including CRYPT32/WS2_32/KERNEL32; scriptc and Zig also import
CRT API-set names; the TypeScript compiler imports kernel32. Static names are
not resolved DLL paths. API-set forwarding, delay/dynamic loading, transitive
DLLs, loader configuration and OS updates are not closed. No existing engine
binary was executed or inspected as if it represented current build provenance.

## Accepted past evidence versus this audit

E3d retained copied-inputs, generated-closure, fresh-native-outputs, full build
results and immutable archive/index establish its reviewed fresh-build and gate
claims. The inherited acceptance is 212 records in each lane and 71 static gates.
This task neither reruns those tests nor retroactively certifies that build's
ambient dependency closure. Current installed package content is not substituted
for its recorded inputs. The accepted cache inode-only review likewise establishes
the specific reviewed byte preservation, not a general cache-provenance rule.

E3a remains a data constructor; E3b's accepted private positional parser supersedes
its original public request-object proposal. E3d still constructs private Attempts
and actual Realm/record maps, stops after the designated harness regardless of
report.passed and never enters its dummy test. B09's actual other-Realm constructor
identity cannot be represented by a compiler hash. E3e stays historical description
only/currentSourceVerified=false/buildCertification=unavailable/authority=none.
E3c stays input-only/executionBinding=null/admission=blocked. E2's lexical policy
ownership and exact 242-member closure are untouched. E1 stays byte-exact empty;
all 60 slots remain blocked (19 feature/41 profile), executed0/body0.

## Compare the smallest candidate slices

| Candidate | Useful claim | Why not freeze it now |
|---|---|---|
| Ordered source/config/package capture | Bytes actually copied, with complete member/absence list and source-to-copy correspondence | Independently possible under a declared cooperative writer assumption, but alone supplies another input snapshot. It cannot bind compiler reads; target membership/defaults and snapshot owner are not resolved. Do not call it controlled build provenance. |
| Exclusive build owner with private staging | One cooperative process consumes a sealed snapshot and owns fresh outputs | Best next implementation direction, after effective-input/ownership review. mkdir/wx and WeakMap alone do not exclude other filesystem writers or close executable/library lookup. |
| Source-to-output record | Full inputs, commands, actual outcomes and produced bytes from that owner | Depends on the owner and complete effective options. A public record builder taking hashes/statuses would merely mint forgeable data. No such API is proposed. |
| Hermetic filesystem/OS boundary | Enforce all compiler reads and deny hidden external dependencies | Strongest claim; no such sandbox/toolchain image is configured or proven here. OS/DLL inclusion remains material. |
| Explicit constrained non-hermetic owner | Bind controlled project/tool inputs, keep named OS/SDK trust assumptions | Potentially practical. Must be approved as this weaker contract, with actual selected external inputs and enforcement limits. It cannot populate a future full-certification field silently. |

The six actual isolated filesystem traces demonstrate the ownership gap without
compiling: changed/restored source across copy, changed/restored sealed input
across a simulated consumer read, cooperating owner conflict with an outside
writer still able to edit, partial wx publication, hardlink identity, and a
regular leaf beneath a junction. Full independent trace literals passed; 66
field-change/omission comparisons demonstrate only oracle sensitivity. These
are not production-owner rejection tests or compiler mutants. The sandbox
hardlink EPERM is retained as a setup failure; it did not count as rejection.
Permission-enabled rerun completed all six. Live alias entries were then removed
individually after exact identity/containment checks; original targets remain.

## Required owner contract before APIs can be frozen

The following are design constraints, **not exported APIs or implementable
success schemas**. No reserved version/kind/token is introduced for a partial
solution. Unknowns must not become empty lists or caller assertions.

1. Reserve a process-local private owner synchronously before the first await.
   Reject foreign/cloned/reopened handles and busy/revoked owners before effects.
   A second process needs an exclusive owned destination reservation too. Stale
   lock recovery must not infer authority from PID, JSON or a prior success file.
2. Fix a complete ordered member set from reviewed source/config/package rules,
   retaining additions/omissions, raw bytes and logical identity. Bind build
   coordinator, coverage parser, wrappers and platform tools as inputs too.
   Reject ambiguous case, dot/dotdot, ADS, device/UNC/extended spellings, ancestor
   reparse points, leaf links/hardlinks and duplicate physical identities under
   the chosen Windows path contract. lstat/realpath checks alone are not a lock.
3. Copy into a fresh nonaliased private root; compare source-before, actual copy,
   source-after and whole member set. Recheck after capture, immediately before
   every compiler/coverage invocation, after every child closes and before final
   publication. These checks detect ordinary drift, not changed/restored races:
   either enforce no writers during consumption or explicitly limit the claim.
4. Invoke fixed absolute executables with copied argv/cwd and a complete explicit
   child environment, no shell/npm lookup. Bind helper resolution, runtime pack,
   Zig lib/SDK/search paths and cache policy. Absolute executable paths still
   need loader/dependency treatment. Enforce the selected no-network rule or
   explicitly identify its trust assumption; absence of a download log is not proof.
5. Use fresh output and cache locations. Existing output, unknown cache contents,
   partial prior records and stale verification sidecars cannot supply success.
   Runtime prebuilt objects are package inputs requiring bytes and provenance
   scope; they are not newly compiled outputs. Disable-or-isolate each cache
   only with evidence of the option's actual behavior. Do not assume one flag
   closes compiler, checker-server, Zig and runtime verification caches together.
6. Retain each actual command, executable identity, environment, cwd, spawn/error/
   signal/status and raw stdout/stderr. Failed compiler, coverage parser or linker
   is a failure with original diagnostics and any partial outputs retained. Never
   accept a preexisting executable after a failed command. Coverage must refer
   to the same sealed source, with no intervening mutation.
7. Bind all Node generated files or selected native entries to that captured
   input set and actual completed commands. Record unexpected and missing outputs,
   not only named primary files. Keep intermediate/object/IR/cache evidence needed
   to explain reuse. No generated JS path or executable hash alone proves causality.
8. Publish no-overwrite immutable records only after all required outputs and
   final rechecks succeed. Sequential wx writes are not an atomic transaction;
   incomplete sets stay failed/unpublished. A marker is data unless an authentic
   live owner observed successful writes/closes and all checks. No restart/load
   authority, public status injection or JSON-to-token converter is allowed.

Before assigning code, freeze **complete whole-file proposals** for the owner
and tests, all old-file replacements (possibly none), closed request/data schemas,
exact error priority and all failure paths. This audit has not done that because
the effective-input/ownership choices above remain unresolved. Calling that
absence a production-ready first slice would be misleading.

The future independent full-output test matrix must cover transitive source,
config, lockfile, wrapper/platform executable/runtime library mutation; omitted,
added and reordered members; case/ancestor reparse/hardlink aliases; PATH/tool/
environment substitutions; changes during copy and actual compiler consumption;
two live owners and stale locks; partial/stale/unexpected outputs; actual failed
compiler/coverage/linker; untrusted cache hit and changed verification sidecar;
failed write/flush/close/recheck and immutable no-overwrite publication. For every
case retain the complete expected input/copy/command/output/failure trace and the
original failure. A setup exception is neither rejection nor coverage. No such
live-build acceptance is claimed by the six filesystem traces or local hashes.

## Concrete next review item: one bounded compilation metadata probe

`probe-proposal.json` freezes the proposed experiment, including exact source
bytes, argv, effect boundary and stop conditions. It is **not executed** and is
not an implementation proposal. Root review is required before any compilation.

Question: does pinned scriptc0.4.7 `--print native-link-info` expose the actual
required object/runtime/library and intended link arguments for a two-module
static input, and which dependencies remain implicit? CLI help says this mode
implies emit=obj and never links. This is an advertised behavior to test, not
an established guarantee. The source uses process.exitCode solely to keep a
runtime reference; the output must never be launched.

Use one fresh root under this task's isolated evidence, ordinary byte copies of
the pinned installed package tree with verification sidecars excluded and their
absence recorded. Do not run installers or mutate the original packages. Bind
the copied scriptc manifest and executable and full pre/post inventory. Invoke
the copied scriptc absolute path, cwd that root, exact argv from the proposal.
Collect complete streams/exit and every generated file. Limit one compiler
invocation, 60 seconds, 8MiB stdout and 8MiB stderr; output overflow/timeout is a
failed probe, no retry with relaxed limits. No guest execution, full engine,
linker, native suite or cache warm command is authorized by this proposal.

The child environment must be separately reviewed before running: fixed Windows
system locator plus isolated temp/cache paths, with SCRIPTC_NO_CACHE=1 and a
fresh SCRIPTC_CACHE_DIR, no inherited SCRIPTC_*/ZIG_*/NODE_OPTIONS overrides,
and explicit Zig lib/cache paths. These settings are experiment inputs; their
enforcement is unproven. Root must also decide how to prevent reads/writes outside
that root and the permitted OS/tool installation. Until that decision, the
proposal has status blocked-environment-review and cannot run automatically.

A successful JSON printout would still be data. Independently compare all
reported paths/bytes to the copied inventories; preserve unknown/missing inputs.
If it lacks effective linker argv/sysroot/SDK/DLL/cache facts, return that exact
gap for a subsequent reviewed tool-tracing decision. Do not fill defaults, add
an empty external list, silently run a full link or treat the probe as a build
certificate. No expected success-output literal can honestly be authored before
the metadata schema is observed and independently reviewed.

Target preflight authority, execution selection, archive/receipts and F remain
explicitly deferred. Stop at the coherent design/evidence commit for actual,
root and independent second review; no publication or successor assignment.

## Root-authorized continuation: exact observational probe contract

After review of `0e733798`, root authorized DESIGN ONLY continuation in
`validation/ts-035e3f-p/probe-contract/`. The original text above and every
original sealed evidence file remain preserved. The new guarded verifier checks
the original document as an exact prefix and verifies the old hashes without
regenerating them. This appendix supersedes only the unresolved experiment
environment choice above, not the blocked production-provenance disposition.

Root chose **cooperative installed-tool and Windows OS trust**, explicitly not
hermeticity, external-write prevention or build authority. The complete proposed
runner is runner.mjs, supervise.ps1 and supervisor.cs, with contract.json.
PowerShell7.6.5 and its .NET/Add-Type C# compilation are additional trusted
supervision dependencies; they have not been exercised here. No native or C#
compiler was invoked. Root actual and independent second review remain required
before running this proposal. It is not a production API or successor assignment.

The fixed fresh root is
`C:\Users\jonku\code\rift\typescript\build\ts035e3fp-link-info-observation`.
Exclusive mkdir reserves it; an existing root is an unconditional stop with no
cleanup/reuse. contract.json contains every child environment entry, exact PATH,
absolute Windows locators, Zig lib path and isolated home-like/temp/cache paths.
There is no inherited environment spread or fallback. Windows/System32/cmd.exe
realpaths and the absolute PowerShell executable were measured read-only; their
observed identities are frozen. Compiler invocation, original two-module source
bytes and package manifest, one-invocation limit, 60-second timeout and 8MiB
per-stream threshold remain exactly the original proposal. There is no output
launch, package installation or network-dependent setup.

The proposed Windows supervisor creates the compiler suspended, associates it
with a Job Object before resuming, and enables kill-on-last-handle-close without
breakaway. It supplies an explicit Unicode environment and an inherited-handle
allowlist containing only stdin NUL and the two output pipes. These choices
follow [Microsoft's process-creation contract](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw)
and [Job Object lifecycle documentation](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects).
They are source-level design choices, not demonstrated local feasibility.

Two pipe readers retain at most8MiB each, record all bytes actually read and
their separate observed hash, and request termination at the first observed cap
crossing. Raw retained-byte identities are recorded in the final inventory;
they may differ from observed stream hashes. Timeout, pipe fault, overflow,
root exit with surviving descendants, assignment/resume failure and supervisor
fault all stop the experiment. Cleanup calls TerminateJobObject (or terminates
an unresumed root if assignment failed), then checks root termination, zero
active job processes and closed pipe readers within10seconds. No optimistic
taskkill/PID-tree fallback or retry exists. A90second outer watchdog can terminate
the supervisor, closing its noninherited job handle; without explicit confirmed
cleanup this remains failure requiring inspection, never a no-orphan claim.

The OS may reject job assignment/termination or fail to report clean shutdown.
The supervisor itself may fail to compile or start. **This design cannot promise
successful cleanup before that behavior is tested.** Any inability to confirm
cleanup, missing status or unknown child state stops for root review, leaves
the reservation and partial evidence intact, and forbids retry. Job Objects do
not isolate file/network/registry access; unknown external effects remain
unknown. PowerShell/.NET/OS dependencies outside the frozen executables are
trusted installations, not a claimed closed hashed image.

The runner records source-package and Zig inventories before/after, exact copy
and verification-sidecar exclusion records, generated file identities/differences,
full environment/argv/cwd, original failure objects, status and partial raw files.
It compares copied inputs immediately before invocation and after completion.
Post-collection stages continue independently after a failure and retain each
error; they do not turn failed or concurrent reads into an atomic snapshot.
Metadata is retained raw first and parsed only as unreviewed JSON. Unknown schema,
implicit paths/defaults or missing dependency facts require review; JSON syntax,
zero status and exact hashes never mint success authority.

Offline validation checks one independently authored complete plan/environment
literal and eight actual plan-source mutants, each completing its plan call
before whole-literal rejection. Eight lifecycle records are prospective design
requirements, not executed Win32 traces. Node syntax and PowerShell parsing are
checked without execution. No C# compilation, Job Object test, compiler process,
metadata success or process-cleanup feasibility is claimed. See the new README
for exact command boundary and retained limitations. The original six filesystem
controls/66data mutations remain historical evidence unchanged.

## Review correction: creation-time job membership and partial pump startup

Root actual/second review did **not** approve629b0e0for execution. Two concrete
defects remained: supervisor death between suspended creation and separate job
assignment could orphan the child; partial pump-thread startup could double-close
a running reader's handle or leave an unstarted pump undisposed. The original
proposal and all evidence remain intact, including the statements above as
historical design. The exact correction is now in
`validation/ts-035e3f-p/probe-contract/atomic-job-correction/`.

The corrected full supervisor requires Windows10+ JOB_LIST assignment as part of
CreateProcessW, verifies membership in the exact job before resume, and has no
separate assignment or unsupported-platform fallback. Attribute memory/handles
remain owned through process creation and attribute-list teardown. This follows
the documented creation-time mechanism, replacing the identified user-mode gap;
it does not claim measured local feasibility or perfect behavior under OS failure.
The correction README compares it with an explicit two-process parent-handle/
ready-event inheritance protocol and explains why polling/finally is insufficient.

Each pump now owns its read handle immediately after successful construction,
separately records whether its worker started, and releases resources through a
once-only path. A thrown Start with an unstarted Thread closes only that pump;
an uncertain/running thread retains ownership until its read loop finishes.
The outer code cannot close a handle already transferred to a pump. First- and
second-start failures have complete independent stream-state literals.

The exact proposed benign lifecycle harness uses a separate outer safety job,
also assigned at process creation. While it kills only the supervisor under test,
it observes outer-job survivors before safety cleanup, avoiding a test that
accidentally hides the inner-job defect. A retained legacy control must expose
the original suspended survivor inside that safety job. Twenty-five future cases
cover deterministic creation/membership/resume death boundaries, descendant death,
timing samples, timeout, both caps, spawn/job/membership/pipe faults and both
partial thread-start failures. Test hooks exist only in separately retained full
instrumented sources; they never enter the compiler supervisor proposal.

The full corrected runner preserves the exact21-key environment, original source
strings/argv, one scriptc invocation60s/8MiB each, cooperative installed-tool/OS
trust, unknown external effects and stop/no-retry policy. No C#, supervisor,
benign child or scriptc execution has occurred. Syntax, pure planning, instrumented
source reproduction and preservation checks are offline evidence only. Root
actual/second review must precede even supervisor compilation or benign lifecycle
execution; those results then require review before the metadata probe. No
production/public API/authority/publication/successor work is authorized here.

## Authorized benign lifecycle attempt: stopped for review

The exact atomic-job-correction lifecycle harness ran once under root authorization from reviewed commit 629def3. Ten cases matched; membership-false (case 11) stopped the harness with exit 1 because inner cleanup was unconfirmed. The successful job-termination request was followed by Win32 error 5 on the separate unverified-root termination call; its exception skipped the bounded cleanup observation. All eleven independent outer jobs were empty before fallback; no fallback or retry occurred. Fourteen cases remain unrun. No scriptc probe was invoked or authorized.

See [the retained attempt and exact unexecuted correction proposal](validation/ts-035e3f-p/probe-contract/atomic-job-correction/lifecycle-execution/README.md). All 163 original output files (19,246,373 bytes), invocation log, copied-source identities and original errors are retained byte-for-byte. The proposal retains a failed direct-termination error while allowing the existing bounded cleanup checks to run; it does not suppress failure, resume the child, change limits/oracles or retry termination. It has not been compiled or executed. Original sealed evidence and document prefixes remain unchanged. Return to root actual/independent review before any fresh harness design or invocation; the existing output root must never be reused. E3e descriptive/E3c null binding/E2 ownership/242-member closure/empty registry and all 60 blocked remain unchanged.

## Authorized cleanup rerun: stopped at checkpoint publication

Root approved the exact cleanup correction and one fresh full25 benign rerun. The guarded runner changed only its output root and sealed-verifier call; eight supporting files were identical and both supervisor files matched the accepted replacement. Thirteen cases matched, including membership failure with original error5 retained and cleanup confirmed, plus both full pump-start literals. Case14 stdout-read-error failed while reading the hook checkpoint file during publication; it never reached its expected pipe-fault assertion. Eleven cases remain unrun. The first13 outer jobs were empty before fallback; the failed case required outer safety termination, whose unchanged bounded empty confirmation returned successfully. No automatic retry or scriptc invocation occurred.

[The retained cleanup rerun](validation/ts-035e3f-p/probe-contract/atomic-job-correction/lifecycle-execution/cleanup-rerun/README.md) preserves all205output files/19,725,266bytes, source transformations, original sharing error and incomplete status. An exact unexecuted hook correction proposes flush/close of a CreateNew staging file before non-overwriting publication to the checkpoint name; no wait/limit/oracle change. A separate offline CRLF-authoring assertion is retained. Both original output trees and earlier sealed evidence remain unchanged. Stop for root/independent review before any new invocation; no compiler authority or production change.

## Descendant PID publication and remaining-case design

Root/second accepted the checkpoint proposal but withheld execution after identifying the same publication window in descendant-pid.txt. The new [bounded descendant-publication design](validation/ts-035e3f-p/probe-contract/atomic-job-correction/lifecycle-execution/cleanup-rerun/descendant-publication/README.md) freezes a fixture-only change: exclusive staging write, fsync, close, then non-overwriting hard-link publication of the unchanged PID payload/name. Original errors propagate; combined write/close errors retain both; staging aliases remain evidence, and unsupported/denied linking stops with no fallback or retry. Exact source hashes and the narrow future two-alias evidence requirement are explicit.

The fresh runner plan retains exactly original cases14–25 and approved checkpoint sources, supervisor cleanup, observer, assertions, literals, environment and limits. Only the runner root/verifier call change; cases1–13 are not repeated. Layered preservation plus exact source/whole-plan guards, Node syntax and PowerShell parsing pass. No lifecycle/fixture/hard-link experiment/C# or scriptc compilation occurs in this design continuation. Await root/second review of exact additional bytes before any invocation; all previous execution artifacts and authority boundaries remain unchanged.

## Remaining-case invocation stopped on descendant membership

Root/second authorized the exact bfe7b4f remaining-case runner once. Seven cases matched (original14–20); death-with-descendant (21) failed before supervisor kill because the published PID3272 was absent from independent membership[28800,568]. Child marker33336 and missing leaf-started/status records do not establish the cause or identity of member568. The final four cases were not run. Seven outer jobs were empty before fallback; the failed case required successful bounded outer safety cleanup. No retry, speculative correction or scriptc invocation occurred.

[Runtime evidence](validation/ts-035e3f-p/probe-contract/atomic-job-correction/lifecycle-execution/cleanup-rerun/descendant-publication/execution/README.md) preserves108files/625,783bytes and both PID-file paths with identical device/fileidentity, linkcount2 and five-byte content. Only this exact pair is permitted in the new archive metadata check; earlier checks/seals and all three output trees remain intact. Return the unexplained membership failure for root/second review before further diagnosis or execution. No acceptance or authority is inferred.

## Parent lifetime and ready-descendant proposal

Read-only audit of the pinned Node v26.13.0/libuv1.52.1 and matching upstream Windows spawn source supports parent-owned kill-on-close as a hypothesis, not the measured cause of the PID3272 failure; member568 remains unidentified. The new [parent-lifetime design](validation/ts-035e3f-p/probe-contract/atomic-job-correction/lifecycle-execution/cleanup-rerun/descendant-publication/execution/parent-lifetime/README.md) preserves the historical descendant mode and proposes a distinct live-parent mode with closed leaf-ready publication, IPC acknowledgement, independent parent+leaf membership and retained process identities before supervisor-only kill. The original descendant membership and empty-before-fallback assertions remain.

A separately gated parent-exit diagnostic starts from that readiness, requests normal parent exit while the supervisor stays paused, then records parent/leaf native handle outcomes before supervisor kill. Exit versus bounded survival is labeled diagnostic observation, not lifecycle acceptance. Whole sources/hash transformations freeze fixture, observer query/handle additions and two full runners; all supervisor/cleanup sources, limits and prior evidence stay unchanged. Main plan is new live-descendant replacement for slot21 plus unchanged22–25; no repeat of prior13+7 matches. No lifecycle/fixture/C#/scriptc execution; source, preservation, Node syntax and PowerShell parse checks only. Await actual+second review.
