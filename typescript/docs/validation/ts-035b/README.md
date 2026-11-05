# TS035B observed throw inspection

Base: `91ae047`. Candidate work; acceptance requires actual and independent
second review. No publication or successor is authorized.

**Corrected tested candidate: awaiting independent acceptance.** The original
source-provenance checkpoint below is resolved by the exact coordinator-approved
five-edit amendment. The old witness, proposal and full results are preserved;
`source-review.mjs` intentionally still asserts the pre-amendment defect and is
historical evidence, not a validator of the corrected candidate. See the final
correction validation section below.

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

## Approved correction and final candidate validation

The coordinator approved exactly the five private edits with source SHA-256
`a9d69ee2a0439653817aa116ad491c413d4a82f6aa4dcf1228cea3d42bba8614`.
The applied source matches that hash. The coordinator-authored admission
amendment is included byte-for-byte. `correction/audit.mjs` verifies both facts,
the unchanged original X/U controls, and preservation of the original witness,
proposal and full suite outputs. Prior gate/driver/evidence snapshots are under
`correction/previous/`; neither the rejected source rule nor prior results were
silently rewritten.

The private anchor supplies only original record/unit/location to synthetic
Get failure capture. Execution retains the current entry/builtin Realm. Actual
Script function execution suspends the anchor before allocation/instantiation,
restoring it in finally; first-propagation identity keeps genuine guest source
through builtin unwind. Original history and the anchor restore on every exit.

The freshly rebuilt B gate passes static-only and separate coverage at
**4228/4228 static, zero dynamic**. Fresh Node compilation and both inputs on
both hosts pass all original X/U plus P01-P09: per input/host, 56 synthetic
rows, 16 guest-source rows, four pre-dispatch call-limit rows and 16 exact guest
setup/body prefixes. Every axis includes constructor/name and fresh/seven-seeded
sessions. Controls cover same-record guest getters, builtin wrappers, actual
defining Realms, exact reused completions, host unwind, both-original-session
reuse and reentry denial. The observed Node boundary also passes.

Affected E4 identity/cleanup, both Node boundaries, slot checks and eight
inherited accessors/setup/dispatch/host/reduction groups pass. The first reduction
attempt lacked Zig on PATH; `correction/results.json` retains that environment
failure. `correction/results-resumed.json` records the successful remaining
checks with configured Zig and authorized library access. Completed checks were
not repeated. Historical evidence was recursively restored on both attempts.

The preceding full 212/212 lanes, 60 old native gates, H7/H1-H6/M, all17 inherited
groups, A21/both serializer lanes, runner20/host73/observations22/probes10 remain
preserved and reused. They were not all rebuilt/rerun for the amendment. Targeted
inherited runs use freshly rebuilt Node modules and the prior unchanged native
executables; the new B native driver is freshly compiled with the correction.
Final preservation covers 4435 protected paths, 163 unchanged old test paths and
all60blocked; the sole extra permitted historical file is the exact approved
admission amendment. No codec/API/registry/pin/compiler/CLI or admission change.

Final status: coherent tested candidate for actual and second independent
review, not accepted. No publication or successor. See `completion.json`.
