# TS035B observed throw inspection

Base: `91ae047`. Candidate work; acceptance requires actual and independent
second review. No publication or successor is authorized.

**Checkpoint: source-provenance review required.** See `source-review.md` and
the executable witness `source-review.mjs`. A secondary builtin completion can
inherit an original foreign-source coordinate while capture names the entry
record. No provenance workaround has been adopted. This blocks completion,
regardless of the other control/suite results below.

`src/script-throw-inspection.ts` exposes a fixed observed evaluation. Both
entries use the original private session engine and `runScript`; the ordinary
entry selects no property inspection. Only guest/engine-diagnostic throws are
inspected, by one completion-aware constructor Get followed, for a Script
callable, by one name Get. The internal result retains the callable's actual
Realm. Registry projection belongs to the future adapter.

The original ScriptEvaluation, throw completion and guest value references are
retained. Original and secondary source snapshots are detached records with
copied locations. As elsewhere in this engine, Realm/record/guest-value identity
is deliberately shared. Inspection clears private propagation identity before
Gets, then restores original history in finally; even throwing the original
completion again captures a distinct secondary source. Existing outer cleanup
restores frame/Realm/calls/depth; step counts never rewind. Host exceptions
escape unchanged.

The normative operation and ownership are the accepted constructor inspection
section of `docs/script-admission.md`, building on the accepted internal Get,
accessor, Script dispatch, shared budget and first-abrupt contracts. This slice
adds no language semantics or authority seam. In particular, Diagnostic.name,
constructorSlot and Error branding are not constructor-name evidence.

`frozen-controls.md` was written before implementation. Both runtime input
fixtures select distinct missing-reference text and sentinel payloads. The
compiled control includes X01-X06/U01-U02, literal fresh/seven-seeded prefixes,
call limits, exact receivers/order, empty and invalid names, Script/legacy Realm
outcomes, actual guest accessors, original and secondary completion identity,
cross-Realm defining sources, actual custom-species rejection, host exceptions,
same-completion secondary throws, reentry denial and both-session reuse.

Validation commands (from typescript):

```
node docs/validation/ts-035b/run-all.mjs
node docs/validation/ts-035b/preserve.mjs
```

The full runner builds all 60 prior gates plus the additive inspection gate,
with static-only compilation and separate zero-dynamic coverage. It runs both
212-record guest lanes, both new runtime inputs in both hosts, H7 including
timeouts, H1-H6/M/E4 and all 17 inherited groups, both hostile Node boundaries,
slot controls, unchanged A21 against both serializer lanes, runner20, host73,
observations22 and probes10. Historical evidence is recursively backed up;
changed/new replay outputs are retained under `inherited/`, then original bytes
are restored in finally. The preservation audit checks old records/gates,
scoped tracked changes, zero old-test changes and all 60 variants still blocked.

The initial sandbox Zig library-access failure is retained in
`gate-sandbox-access.json`; the authorized retry passed with zero dynamic
statements. Final counts/status are recorded after the complete pipeline.

## Completed checkpoint validation (2026-11-05)

The running full pipeline completed successfully before the implementation hold:
212/212 old records per lane, all 61 static-only/separate-coverage gates, and
4051/4051 static statements in the new inspection gate. Both runtime inputs and
all compiled X/U controls pass. H7/H1-H6/M/E4, all 17 inherited groups, both Node
boundaries and slots, unchanged A21 consuming both serializer lanes, typecheck,
runner20, host73, observations22 and probes10 pass. The new observed boundary
checks also pass. Historical evidence was restored recursively; preservation
passes 4436 protected paths, 163 old test paths, zero old-test edits and all 60
variants blocked. See `suite-results.json`, `inspection-results.json`,
`boundary-results.json`, `native-build-results.json` and `preservation.json`.

These successes do not resolve the retained source-review witness. The exact
five-edit private fallback proposal and nine literal controls are rendered in
`proposed-source.patch`, `proposed-source.ts.txt`, `proposed-source.json` and
`proposed-source-controls.json`. `proposal-audit.mjs` reproduces the proposal
exactly, checks source coordinates and confirms production remains unchanged.
The proposed code has not been compiled or executed. Per coordinator request,
implementation is held for precise actual/second review; no commit, publication,
successor, codec relaxation or source-provenance workaround was made.
