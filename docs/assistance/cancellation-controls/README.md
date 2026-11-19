# CL-006 — Deterministic observation cancellation controls

Scope: test-only changes to `tools/test262/observation.integration.mjs`, plus this
evidence. `observe.mjs` is unchanged, so no seam was added. The engine, the schemas,
the timers and limits, the timeout and output-cap paths, and the existing assertions are
unchanged.

## Cause of the retained failure

[source inspection] `launchObservation` (`tools/test262/observe.mjs:119-126`) awaits
`validateLaunch` first. That function re-hashes the build files (`buildIdentity`) and
then checks `signal.aborted`. If the signal is already aborted at that point, it returns
`{ state: 'unfinished' }` before any spawn. No `transport.json` is written, because that
file is persisted only after a child closes (line 164).

The old T30 aborted on a 100 ms timer and then read `transport.json`. Under load, the
timer could fire while validation was still running. That is the ts-031c-b
`cancellation-attempt/` archive and the TS-033D2 `observation-cancellation-attempt.json`
ENOENT (15/16). Both retained records are untouched.

[measured] `run.mjs` reproduces this deterministically against the unchanged
`observe.mjs`. It runs the old T30 sequence, but calls `abort()` synchronously after
`launchObservation` starts. In 5 of 5 runs the result was: `state: 'unfinished'`, an
unfinished `attempt.json` without a record, only `attempt.json` and `source.js` in the
directory, and `transport.json` ENOENT. So the production behaviour is correct, and the
old test's assumption that a child had launched was wrong.

## What the tests now cover

There are three cancellation stages, each run for both the `node` and `native` lanes,
plus the retained T30 test.

| Test | Lifecycle stage and synchronization | Assertions |
|---|---|---|
| `<lane> T30 prelaunch … already-aborted signal` | `abort()` before `launchObservation` is called | Unfinished result with no `record`; unfinished `attempt.json` without a record; no `child.json`; directory holds exactly `attempt.json` and `source.js` (no transport or stdout/stderr); zero spawn calls; relaunch rejected with `context` |
| `<lane> T30 prelaunch … during launch validation` | Signal is live when launch starts; `abort()` runs synchronously before `validateLaunch` can settle (it awaits file I/O). This is the stage the retained failure hit | Same as above |
| `<lane> T30 … after actual child launch` | Aborts only after observe.mjs's own `spawn` call happened, the child emitted the real `'spawn'` event, and the child printed its first line (`console.log('started')`), all raced against the launch settling | Unfinished, as above; `transport.json` present with `cancelled: true`, `spawnError: null`, no deadline, no cap, `exitCode: null`, `signal: 'SIGTERM'`; ChildProcess `killed`, `signalCode: 'SIGTERM'`; PID gone (`process.kill(pid, 0)` → ESRCH); `stdout.bin` hash matches transport and starts with `started`; no `child.json` |
| `T30 cancellation retains unfinished archive without terminal success` (retained name, node) | Same launched-child synchronization in place of the 100 ms timer | All original assertions, plus the launched-child set |

How synchronization works: `observingSpawn` replaces `child_process.spawn` for the
duration of one test, and calls `module.syncBuiltinESMExports()` so that observe.mjs's
named import sees the wrapper. The wrapper forwards the exact arguments to the real
`spawn` and returns the same ChildProcess. It only adds listeners for `'spawn'`,
`'error'` and stdout. The original is restored in `finally`.

Nothing sleeps or retries. Every wait is raced against the launch promise, so a child
that ends early fails the test instead of hanging it.

The retained T30's source changed from `while(true){}` to
`console.log('started'); while(true){}`, so the child can show that it is actually
evaluating. Its limits (`steps: MAX_SAFE_INTEGER`, default 10 s wall) are unchanged.

## Measured checks (2026-11-03, Windows x64, Node v26.13.0)

Both lanes were built in this worktree at base `ffcf7f0`: `npm run build:node` and
`npm run build:native` (scriptc 0.4.7, Zig 0.17.0). The native lane was rebuilt only to
run these tests. No native semantic claim is made.

| Check | Result | Evidence |
|---|---|---|
| Observation suite before the change | 16/16, with the old T30 passing idle (the race needs load) | — |
| Observation suite after the change | 22/22 (16 retained plus 6 new) | `observations.log` |
| Deterministic reproduction of the retained failure | 5/5 ENOENT on unchanged observe.mjs | `results.json` `reproduce` |
| Mutation detection (`--test-name-pattern=T30`, mutated copies under `build/`) | Control copy: 7/7 pass. `cancel-does-not-kill`, `cancel-completes-record` and `cancel-skips-transport` each fail the 3 launched-child tests. `no-prelaunch-abort-check` fails the 4 prelaunch tests | `results.json` `mutants` |
| Repeats, idle | 10 of 10 runs 22/22 | `results.json` `repeats.idle` |
| Repeats under load (24 spin-loop processes, one per logical CPU) | 5 of 5 runs 22/22 | `results.json` `repeats.loaded` |
| Host controls (`npm run test:test262`) | 73/73 | `host.log` |
| Runner (`npm run test:runner`) | 20/20 | `runner.log` |

To reproduce, from `typescript/` after both builds:
`node docs/assistance/cancellation-controls/run.mjs 10 5` (exit 0, about 3 minutes).

## Limitations

- The wrapper depends on observe.mjs importing `spawn` as a named binding from
  `node:child_process`. If that import changes, the launched-child tests fail closed: no
  spawn is observed, the wait loses the race to the launch settling, and the test fails.
  The prelaunch tests' zero-spawn check is shown not to be vacuous by the
  `no-prelaunch-abort-check` mutant.
- Run on Windows x64 only. The `'SIGTERM'` signal values are what Node reports for
  `child.kill()` on Windows, and were not checked on POSIX hosts.
- One possible race was not exercised: an abort that arrives after the child exits but
  before `close`. The existing code would then mark a completed child unfinished and
  cancelled. That is conservative, not a false success. The tests use looping bodies, so
  this cannot occur in them, and the behaviour is unchanged here.
- T31 needs junction creation, which passed in this unsandboxed session. A sandboxed run
  may still hit the EPERM recorded in ts-031c-b.
