# TS-035E3b implementation: compiler review required

Base `47dc88e`, accepted corrected design `fd16afb`. The two replacements and two
new files are installed byte-exact from the accepted manifests. No proposal,
old test, compiler pin, build gate, semantic implementation, or authority API was
changed. TASKS is the writer's only coordination edit; COORDINATION is root-owned.

Implementation acceptance is incomplete. No commit or publication was made.
All processes launched for this task have completed; session `27550` ended with
exit 1. No validation sandbox has been created and no conformance child was run.

## Completed evidence

- Accepted `verify.mjs --implemented` passes: 6,790 protected baseline files,
  exactly two replacements and two new files, 175 proposal/evidence artifacts.
- Fresh Node compilation/typecheck passes (`node.txt`, `build-stages.json`).
- Actual built request module passes 20 parser positives and 21 exact request
  shape errors (`data-controls.mjs`, `data-controls.json`).
- Fresh actual E2 selection/ledger calls in both lane labels preserve the empty
  registry, 242-file policy closure, all 60 blocked slots (19 feature, 41 profile),
  zero executed variants and zero test-body entries. These are policy calls,
  not native child executions.
- The unchanged 71-entry native builder ran sequentially to completion. All 71
  link attempts failed with Zig installation-directory access failure under the
  sandbox. Complete build/coverage records and stdout/stderr are retained in
  `native-build-results.json` and `native.txt`. No stale executable is used as
  evidence of the new producer.

## Independent substantive compiler failure

The new driver reports 4,453 analyzed/static statements **and two dynamic-tier
operations**. The compiler also prints “fully static”; that text does not remove
the dynamic count. `dynamic-explanation.json` locates both operations in the
new, exact accepted request module:

1. `keys`, line 14: `Object.keys(value)` with `value: object`,
   `dyn.objKeyStrings`.
2. `decimal`, line 33: `Number(text)`, `dyn.numberConstructor`.

`reduction-keys.ts` and `reduction-decimal.ts` reproduce each independently with
the unchanged pinned compiler: respectively 3 analyzed statements/1 dynamic and
9 analyzed statements/1 dynamic. `reductions.json` preserves their complete
coverage outputs and the existing verdict parser's coverage-only results for
all 71 entries. Its synthetic successful build/execution records deliberately
isolate coverage parsing; they are not native build or execution evidence.
The driver yields `DYNAMIC`, independently of the Zig link failure. The other
70 entries yield `PASS` for this coverage-only calculation.

The assignment requires retaining/reducing and requesting actual plus independent
review before any compiler workaround or proposal amendment. No source workaround
has been attempted. Fixing Zig access alone cannot satisfy the zero-dynamic gate.

## Remaining work and prepared runners

`prepare.mjs` and `validate.mjs` are **unexecuted preparation**, not passing
evidence. They describe ordinary-file isolation, complete helper binary copying,
and affected suite execution. The original history stays read-only. Once a
separately reviewed compiler resolution exists, reassess these runners and build
again with approved Zig library access, retaining this failed run separately.

Still unrun: 66 full child literals, 114 corrected driver negatives, eight late
failures, 57 actual built-parser negative checks, fresh full 212 guest records per
host, successful 71 native gates, A serializers/decoders both inputs and hosts,
C codec/live/172 transport, E3a, affected D1-D8, B/H7, host73, observations22,
runner20, and probes10. Prior accepted evidence is preserved, not relabeled as
fresh validation. Generic driver exit70 would not establish zero reads, zero
Realm creation, or exact native error precedence.

Initial environment discovery found Zig absent from PATH and the sandbox's
LOCALAPPDATA redirected to a package directory. The actual pinned Zig was located
under the user's WinGet packages; explicit version checks returned Zig 0.17.0 and
scriptc 0.4.7. A sandbox CIM process query was denied; a read-only escalated query
confirmed forward progress near the last gates. No processes were killed or
duplicate builds started. Those diagnostic queries changed no repository files.

No admission, receipts, preflight certification, archive guarantees, F activation,
or successor work is claimed or authorized by this partial implementation.
