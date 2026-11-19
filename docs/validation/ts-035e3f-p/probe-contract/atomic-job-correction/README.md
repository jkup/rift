# Creation-time job membership correction — unexecuted design

Root rejected629b0e0for execution. A supervisor could die after CreateProcessW
returned a suspended child but before AssignProcessToJobObject. Normal finally
could not run, the child was outside the kill-on-close job, and the outer runner
had no child PID. Suspended does not mean terminated. A second finding identified
shared read-handle ownership and leaked unstarted pumps on partial Thread.Start
failure. Both findings are addressed by this new full proposal. Every old file,
hash and proposal remains unchanged; no original evidence is regenerated.

**Do not execute the runner, Add-Type, observer or lifecycle harness.** This
correction requires root actual/independent second review first. All source is
evidence-only; no public API, engine, old test, compiler pin or authority change.

## Choice and Windows contract

The corrected supervisor uses PROC_THREAD_ATTRIBUTE_JOB_LIST at CreateProcessW,
alongside the existing handle list. Microsoft documents JOB_LIST on Windows10+
and Server2016+, taking an array of job handles in assignment order. The
attribute's backing memory must remain alive until the attribute list is
destroyed. A zero API return is failure; the original Win32 error is retained.
See [UpdateProcThreadAttribute](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute).

Microsoft's [creation-time job example](https://devblogs.microsoft.com/oldnewthing/20230209-00/?p=107812)
explicitly identifies the same orphan window and uses JOB_LIST to create the
process already assigned. We rely on that supported OS contract, not on a
subsequent managed `Assigned=true` flag. The flag is only diagnostic data.
The independently read installed winbase.h defines JobList attribute number13
with the input flag0x20000, yielding0x2000d; this is recorded in support.json.

Alternative: a live bootstrap helper can wait on the parent handle and a ready
event before doing any work, then create children that inherit its job. This is
the [two-process protocol described by Microsoft](https://devblogs.microsoft.com/oldnewthing/20181116-00/?p=100245).
It needs another lifetime/handshake implementation and a running bootstrap;
simply moving AssignProcessToJobObject earlier, duplicating a PID, polling
taskkill or adding finally does not implement it. We select JOB_LIST for the
measured Windows11host and refuse unsupported environments instead of adding
that alternate fallback. A self-job alone would also alter supervisor shutdown
and zero-member accounting; it is not silently substituted here.

Exact creation order: check Windows>=10; create unnamed noninherited job; set
only KILL_ON_JOB_CLOSE; initialize a two-attribute list; populate inherited pipe/
NUL handles and the one-job JOB_LIST; construct explicit environment; create
suspended with STARTUPINFOEX. On successful creation query IsProcessInJob using
the exact job handle, require true, start both pumps, then resume. There is **no
AssignProcessToJobObject import/call or create-without-job retry**. API/version/
nested-job restrictions fail closed before resume. A successful create with
unexpected membership is an invariant failure, never an instruction to repair
membership and run. Cleanup terminates the job and, if membership was not
verified and the process remains alive, also attempts direct termination of the
known process handle. Failure remains unconfirmed/stop-review.

The job handle is absent from the inheritance allowlist and never duplicated
outside the supervisor. Process death closes its last handle. Creation-time
membership removes the identified user-mode create/assign interval; the design
does not claim a proof about every internal kernel instruction, arbitrary OS
failure or malicious services. Benign boundary kills and timing stress below
are prerequisites for observed local feasibility. No such test has run yet.

## Corrected pump ownership

Each successful Pump constructor owns its file and read handle immediately;
the outer local is zeroed before constructing the next pump. A constructor
failure leaves that handle solely with the outer cleanup. Each Pump allocates
its own Thread, starts it, and separately records started state. On a thrown
Start, an observed non-Unstarted thread conservatively keeps thread ownership;
there is no close beneath a possibly running worker. An unstarted pump releases
its resources itself. Release uses an interlocked once-only guard and exchanges
the native handle to zero before CloseHandle; disposal/close faults are retained.

Thus first-start failure closes two unstarted pumps; second-start failure leaves
the first worker to drain after child termination and closes only the second
unstarted pump. The outer supervisor cannot double-close either handle. Cleanup
requires each allocated pump's Done state, including explicitly closed unstarted
pumps. Successful observation additionally requires both stream Error fields
null. A nonnull Thread object is not treated as evidence of successful Start.

Full corrected files are supervisor.cs, runner.mjs, supervise.ps1, contract.json
and expected-plan.json. Environment/argv/source/limits remain byte-identical to
the previous contract: one source compiler invocation,60s,8MiB each,10s cleanup,
90s outer watchdog. Runner additionally requires JobListConfigured and
MembershipVerified. File layout changes point only to this correction's verifier
and unchanged original input evidence. Cooperative installed-tool/OS trust and
unknown filesystem/network effects remain unchanged; this is not hermeticity.

## Independent benign lifecycle harness — exact proposal, not results

`lifecycle-runner.ps1 -ReviewedLifecycle` is a separately reviewed future action,
**not authorized by this design**. It verifies sealed bytes, creates the fixed
fresh build/ts035e3fp-atomic-job-lifecycle directory and exclusive owner.lock,
and never deletes/reuses it. It records original setup errors and stops on the
first unexpected result. Observer Add-Type failure is setup failure before any
child, not an expected negative. No scriptc package/compiler is used by this
harness. Its only controlled child executable is the pinned Node running
benign-child.mjs (or a deliberately nonexistent local executable).

The harness compiles observer.cs in its own host. That observer owns an outer
kill-on-close job and creates each supervisor in it using JOB_LIST as well.
This prevents the safety harness from repeating the very create/assign gap it
is testing. It does not open or duplicate the inner job, which would invalidate
last-handle-close testing. It kills **only the supervisor process handle** at
the requested boundary, leaving the outer job alive. An independent kernel
member query detects surviving child/descendant PIDs before any safety fallback.
The observer then explicitly terminates its outer job on failure or the legacy
negative, waits for zero members and closes handles. Its own unexpected death
also closes its job handle. Failure to confirm safety cleanup is a stop, not a
passing negative. Parent process handles avoid PID-reuse-based termination.

`instrument.mjs` authors complete supervisor.lifecycle.cs and
supervisor.legacy-control.cs using exact, single-occurrence source substitutions.
It does not compile or execute them. test-hooks.cs is appended only to those
copies. Compiler supervisor.cs has no injected faults, checkpoints or callbacks.
The legacy control uses the original629b0e0supervisor and pauses immediately
after creation, before its defective assignment. It is expected to leave a
survivor **inside the independent safety observer's job** when killed; detecting
that survivor before cleanup proves the harness can expose the original gap.
No known-broken process is deliberately left outside the safety observer job.

25closed case records in lifecycle-cases.json cover:

* normal exact stdout/exit0; actual exit7;60s timeout; stdout and stderr cap;
  a root that exits leaving a live descendant;
* unsupported/job-list setup failure, invalid job handle at process creation,
  missing executable, false membership verification, actual invalid ReadFile
  handle and preexisting output preservation;
* injected first/second Thread.Start failure after the Thread object has been
  allocated but before native start. These reproduce the reviewed partial-start
  states; they are not claims to provoke an actual OS resource-exhaustion error;
* forced supervisor death before creation, immediately after creation returns,
  after exact membership check, before resume, after resume, and with a known
  descendant present. Marker files select boundaries; outer job membership
  independently establishes child presence before deterministic post-create kills;
* three release/kill timing samples (0/1/5ms) around creation, and the legacy gap
  control. Timing samples do not prove death inside a particular kernel instruction.
  They may kill before child creation; deterministic after-create cases must also
  pass and cannot be replaced by those easier outcomes.

pump-literals.json independently specifies all seven fields of both streams for
first/second start failure. The first case has two unstarted empty streams; the
second requires the started stdout reader to reach EOF/flush and the unstarted
stderr stream to close without pretending to have read EOF. stream-literals.json
is derived solely from authored `ok\n`, empty bytes and fixed a/b repetitions,
not supervisor outputs; cap tests compare retained and observed counts/hashes.
All original errors, stream bytes, marker/PID data, actual invocation/environment,
copied-source identities and pre-fallback/safety-cleanup results are retained.

No Add-Type, native API, process creation, deliberate process kill or benign child
execution has occurred in this correction. Node syntax/PowerShell parsing and
pure planning/source audits are the only validation performed. Expected lifecycle
records are not counted as25passing tests. The prior fullplan8mutants remain
preserved history, not evidence of Windows lifecycle correctness.

## Review boundary

The new verifier uses the old9333baseline,39original and44continuation rows
verbatim; old document versions are checked as exact prefixes. It seals the new
full proposals/harness and current appended document separately. Neither prior
manifest nor historical fixture is rewritten. .gitattributes inherited from
probe-contract preserves exact bytes. Only TASKS own entry and the design append
are edited outside this new directory; COORDINATION stays root-owned.

After actual/root/second review, a separate dispatch may allow C# compilation
and benign lifecycle execution. Review those outcomes before even considering
the one scriptc metadata probe. Any unsupported API, setup fault, wrong literal,
survivor, cleanup uncertainty or unexpected effect stops without retry. No
production implementation, public API, publication, F/receipt/preflight authority
or scope expansion is authorized by this correction.
