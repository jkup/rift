# H6-M paused at a frozen-oracle discrepancy

This is an incomplete implementation workspace, **not an acceptance candidate**.
The assignment requires substantive failures to be retained, reduced and reviewed
before changing an oracle or expanding scope. No production workaround, changed
historical verifier, publication, successor, or C activation was attempted.

## Finding

The accepted MP narrative gives a parsed getter three ticks: activation at column
1, return at 14, expression at 21. However, its exact source
`function g(){return holder;}` is nonstrict. Existing
`ExecutableScript.instantiateFunction` creates a separate body lexical environment
for nonstrict functions, including empty bodies, and charges another tick at the
function location (column 1). This behavior predates the two-file map change.

The new driver fails at constructor getter, same Realm, seed 0, step limit 4:
expected getter source column 14, observed getter source column 1. The isolated
`development/parsed-getter-reduction.ts` uses an ordinary accessor and guarded
builtin, **no map or species operation**, and confirms identical Node/native:

| Limit | Steps | Completion | Source |
|---|---|---|---|
| 3 | 4 | throw | getter:1 |
| 4 | 5 | throw | getter:1 |
| 5 | 6 | throw | getter:14 |
| 6 | 7 | throw | getter:21 |
| 7 | 7 | normal | none |
| 8 | 7 | normal | none |

Native reduction: static-only build passes; separate coverage 3644/3644 static,
zero dynamic; Node/native stdout identical. See `development/reduction-results.json`.
Initial missing Zig PATH and sandbox library-access failures are retained.

## Requested narrow review decision

Approve correcting only the new H6-M parsed-getter oracle to include the existing
nonstrict body-environment tick. Keep the immutable MP evidence unchanged and
document its omitted tick as a design correction in this new evidence directory.
No evaluator change or strict-source substitution is proposed.

Derived corrected schedules to review before adoption:

- Returning getter: outer columns 1,1,7; getter columns 1,1,14,21; outer iteration
  column 1. Total 8. Allocation follows tick 7; HECD follows tick 8.
- Throwing getter: outer columns 1,1,7; getter columns 1,1,14,20. Total 7, no result
  allocation/callback. Getter ticks 4 and 5 are instantiation; 6 and 7 are body.
- Constructor/species positions, both inputs, same/cross Realm, seeds 0/7 and
  every step limit must be expanded accordingly. Call limits remain 0/1 reject,
  2 sufficient. Existing 14 machine traces are unaffected.

## Current workspace and validation limits

- Claimed only H6-M. Production draft changes only `array-map.ts` and `symbols.ts`.
- Exact approved H6-B replacement applied from complete proposed file.
- Frozen MP copies and initial test-source hashes precede production edits.
  Subsequent test typing fixes construct readonly ThrowCompletion values rather
  than assigning origin; diagnostic assertion text now prints actual provenance.
  The parsed-getter oracle has **not** been changed to fit execution.
- Typecheck passes. Input-a Node execution passes 308 step-prefix controls,
  224 call-limit controls, 108 selection dimensions, 480 abrupt-prefix controls,
  then stops at the parsed-getter mismatch. This is not all 54 semantic rows.
- The new driver's later parsed/reentry/length/mutation/profile sections remain
  unvalidated. CP replay source has explicit revised expectations but is unexecuted.
- No additive native gate, feature-inventory acceptance claim, full 212-record
  suites, 57-gate sweep, inherited replays, host/observation/probe suites or final
  preservation acceptance audit has run. All remain required after review.
- No commit is offered as a tested candidate. Changes remain in the assigned
  shared checkout; coordinator owns COORDINATION and review dispatch.
