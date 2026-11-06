# Exact metadata experiment runner — design only

Root authorized this continuation after actual/second review of0e733798. This
directory is **not permission to invoke the compiler**. Await actual+second
review of these exact files. No implementation/public API/build authority.

## Frozen executable proposal

* `contract.json`: complete21-key environment, measured absolute tools/system
  locators, fixed fresh root, original argv and limits. Any environment key not
  present is absent from the explicit compiler block. No caller options/defaults.
* `runner.mjs`: optional future `--reviewed-run` entry; ordinary imports only
  expose a pure plan builder for offline evidence. It first invokes the new
  read-only verifier, then exclusively creates the fixed root. No reuse/delete.
* `supervise.ps1`: PowerShell with NoProfile/NonInteractive, reads retained
  contract, compiles the exact supervisor.cs using Add-Type, invokes it once,
  exclusively writes status and exits. Add-Type has NOT been executed here.
* `supervisor.cs`: explicit Win32 suspended CreateProcess + pre-resume Job Object,
  dedicated pipes, exact environment block and handle list, termination and
  confirmation. This source has NOT been compiled or executed during design.

Potential future command, **only after review and explicit dispatch**:

```text
"C:\Program Files\nodejs\node.exe" C:\Users\jonku\code\rift\typescript\docs\validation\ts-035e3f-p\probe-contract\runner.mjs --reviewed-run
```

No other runner flags, root overrides or retries exist. The runner validates the
known copied tool/package bytes and fails before compiler setup on drift. It
copies all3,478 package entries except the exact runtime-pack.verified.json
entry listed in contract.json; retains the excluded original identity; copies
the three original source/package strings unchanged. No npm installer/cache warm
or network fetch. Original package/Zig inputs remain read-only; fresh temp/cache
and user-profile directories live under the new root. No parent environment
mutation occurs. Absolute Zig and its lib tree stay installed read-only inputs.

SystemRoot/WINDIR/COMSPEC/SystemDrive come from measured Windows locations;
PATH is exactly installed Zig directory;C:\WINDOWS\system32;C:\WINDOWS.
PATHEXT is explicitly .EXE, an experimental lookup restriction, not an inherited
default. SCRIPTC_NO_CACHE=1 and isolated cache directories are requested settings,
not proven cache enforcement. No SCRIPTC_LINKER/TARGET/TOOLCHAIN/CC override is
silently added; the copied manifest supplies its original target/linker choice.
NODE_OPTIONS/NODE_PATH/HOME and all other unlisted variables are absent. USERPROFILE,
HOMEDRIVE/HOMEPATH, APPDATA/LOCALAPPDATA and PROGRAMDATA point to fresh local
directories. PSModulePath is the exact installed PowerShell Modules directory,
a trusted supervisor dependency. Compiler block comes from the copied contract,
not whatever PowerShell may add to its own environment during startup.

## Process and failure boundary

The compiler starts suspended with explicit Unicode environment, no window and
STARTUPINFOEX handle list. Only inheritable stdin NUL/stdout/stderr handles are
passed. The Job Object handle is noninherited, unnamed and held solely by the
supervisor; KILL_ON_JOB_CLOSE is its sole limit flag. AssignProcessToJobObject
must succeed before ResumeThread. Assignment failure terminates the suspended
root, records original error and requires confirmed cleanup; it never resumes.

60seconds starts immediately before CreateProcessW. ReadFile worker threads
retain at most8MiB per stream, hash/count observed bytes, and set cap crossing
on byte8388609 or later in the observed chunk. Thus retained and observed hashes
can differ. Collection after crossing is bounded by termination/cleanup, not an
assertion that the child emitted no more than8MiB. Raw partial files are never
discarded. Completed pipe hashes require EOF; read/flush failures remain faults.

Timeout, overflow or pipe fault terminates the job. Root exit with any active
descendant is also a failed observation and terminates the remainder. Cleanup
allows10seconds for root termination, zero active processes (queried from the
job), and both readers to finish. See Microsoft
[Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects),
[CreateProcessW](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw),
and [accounting information](https://learn.microsoft.com/en-us/windows/win32/api/winnt/ns-winnt-jobobject_basic_accounting_information).
No child/descendant is knowingly left running on a claimed completed observation.
If Windows cannot terminate/query/confirm, result is cleanup-unconfirmed, stop
and inspect, never success/retry. Last-handle close is fallback containment,
not an observed proof that cleanup completed.

Outer supervisor watchdog90seconds covers Add-Type, startup, compiler60seconds
and cleanup10seconds. It force-terminates the supervisor once; no second launch.
It permits a further10seconds for close before returning an unconfirmed failure.
Supervisor diagnostics have a separate1MiB threshold (one extra retained crossing
byte), unrelated to the compiler's8MiB streams. Missing or partial supervisor
status, outer spawn errors, kill failure, watchdog or unconfirmed close prevents
normal collection outcome. Any partial post-inventory is observational, possibly
concurrent with uncertain cleanup; the reservation stays in place for review.

This is cooperative installed-tool/OS trust, not containment of filesystem or
network access. It does not prevent reads/writes through Windows APIs, registry,
DLL loading, services or another process outside the Job. Pre/post inventories
cannot detect changed-and-restored writes. No sandbox guarantee or complete DLL/
SDK closure is claimed. PowerShell/.NET modules and OS libraries beyond the four
executable identities are trusted installations. Unknown external effects are
always reported as unobserved, not absent.

## Evidence and ordering

1. Exclusive directory reservation; record exact contract/invocation and tool
   hashes. Verify full current original package and Zig trees against retained
   bytes; missing/added/changed/alias/hardlink input stops. No source mutation.
2. Copy exact ordinary package files, exclude only the recorded verification
   sidecar, verify every copy, write original three source files and supervisor
   source. Capture complete fresh-root before inventory. Recheck original package
   tree and complete copied package tree immediately before supervisor invocation.
3. One supervisor launch. Retain actual spawn/error/exit/signal/close and raw
   diagnostic streams, then compiler job/status/raw streams. Missing state stays
   unknown; a failed supervisor cannot be reported as zero compiler attempts.
4. Only confirmed zero-status/cleanup observation reaches metadata parse. Raw
   bytes/hash retained regardless. Parsed JSON has no accepted schema or inferred
   defaults: all interpretations remain independent review work.
5. Independently attempt original package, Zig, executable and fresh-root post
   inventories after any outcome. Retain differences and original exceptions.
   Compare every captured input to its before row. Added outputs/sidecars remain
   explicit generated data, not cache provenance. No old output is reused.
6. Exclusive final result write, no publication marker/load/mint/receipt/token.
   Failed final write leaves partial evidence; it cannot imply success. The
   result says collected-needs-schema-review or failed-stop-review only.

Preflight source helpers/runtime package checks do not establish that source
inputs stayed immutable between checks. Root accepted that cooperative limitation
for this experiment; it remains unacceptable as full build certification.

The fresh root sits below the real project. Upward configuration/package lookup
is not prevented: the original311project members, including ancestor package/
lock/tsconfig, are additionally inventoried and compared before/after. They are
possible ambient inputs, not claimed actual reads. No extra tsconfig is added to
the original three-source proposal and no inferred compiler defaults fill that
gap. A metadata result that fails to expose this dependency remains incomplete.

## Offline checks and preservation

Run only `node .../probe-contract/offline.test.mjs` in an isolated reviewer copy
of this directory plus ../probe-proposal.json, not in sealed history. It imports
runner.mjs without invoking its main, checks a complete independently authored
plan/environment literal and8actual plan-source mutants. Every mutant imports
and returns a plan before literal rejection. No errors count as rejections.
It also inspects selected source ordering/flags; this is not a Win32 runtime test.
`lifecycle-literals.json` contains8prospective lifecycle requirements only.
Node --check and PowerShell Parser.ParseFile validate syntax without executing
the proposed entry points. No C# parse/typecheck/native feasibility is claimed.

`verify.mjs` checks all9,333baseline rows and original39artifact rows. For the
original design document it requires the preserved exact bytes as a prefix and
an identical retained original-design.md, then verifies the complete appended
document through the new manifest. It checks the original artifact-manifest
itself by its frozen hash. It does not call or alter the original verifier, which
properly rejects unsealed additions/document edits. New hashes apply only to
this continuation's files and the appended document; never regenerated history.

All E3e/E3c/E2/E1 authority boundaries and60blocked remain unchanged. Stop after
coherent proposal commit for actual/root/second review before any invocation.
