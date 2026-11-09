# Script jobs and host checkpoints

TS-161 supplies scheduling infrastructure for Promise work. It does not expose Promise, timers, async syntax or a guest queueMicrotask function.

An active Script operation can enqueue a job with a requested Realm and a host implementation callback. The session copies the callback, Realm and enqueue source into its FIFO queue. A null Realm uses the enqueue context's Realm. Callbacks receive the active OperationContext when run; they must not retain an earlier evaluation context. Enqueue rejects calls made after execution ends.

`evaluateScript` remains synchronous and leaves ordinary queued work pending. The host explicitly calls `drainScriptJobs` while the session is idle. A checkpoint runs jobs in enqueue order, including jobs added during the drain. Guest failures are reported with their original completion identities and detached source records; subsequent jobs still run. Fatal resource/unsupported-operation failures abort the checkpoint and discard pending work. A fatal synchronous evaluation or host fault also clears pending jobs. Reentrant checkpoints are rejected before touching the queue.

Enqueue and invocation each consume a step from the session's existing budget. The queue uses an index, clearing consumed slots as it advances, so nested enqueue does not incur repeated array shifts or retain completed callbacks. The final cleanup restores an idle frame and the prior active Realm, including on a host exception. Job source attribution uses the enqueue location for host implementation failures and the actual callback source for guest throws. Returned source records do not alias session history.

The session is the host scheduling boundary. Hosts that evaluate related scripts with pending work must reuse it and choose checkpoint timing explicitly. This increment does not automatically change CLI or observation-host behavior; Promise integration will add their checkpoint policy and separately test unhandled rejection handling.

Reviewed against ECMAScript 2025 [Jobs](https://262.ecma-international.org/16.0/#sec-jobs) and [HostEnqueuePromiseJob](https://262.ecma-international.org/16.0/#sec-hostenqueuepromisejob), and engine262 revision `18cdeb03c363eb31d775648a0d070bdc8a26ced1`, `src/execution-context/Job.mts`. The queue preserves requested Realm, enqueue source and FIFO ordering. Rift uses explicit completions and its own interpreter invocation path, with no host Promise execution.

Canonical acceptance is pending. Focused tests exercise synchronous deferral, nested enqueue, guest failure continuation, fatal cancellation, cross-Realm errors, source identity, retained capability rejection, reentrancy and all-exit cleanup.
