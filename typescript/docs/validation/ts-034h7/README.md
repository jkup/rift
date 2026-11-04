# H7: unchanged pinned assertion bundle

Validation-only candidate based on `f58693f`; independent actual-source and
second review are still required. No production source or old test was changed.

## Frozen inputs and source identity

`identities.json` copies the accepted corpus records for original assert.js,
sta.js and LICENSE at Test262 `91c70759363c46557b694792bf34a2551a7af5ba`.
`validate.mjs` checks exact bytes, length, SHA-256, Git blob identity and the
immutable manifest. Added-byte negative controls must fail the hash comparison.
The native driver reads the verified files at runtime. Harness units remain
separate, ordered assert.js then sta.js; no concatenation, directive injection,
shim, replacement helper, host eval or partial AST is used.

`frozen-rows.json` was derived from the accepted H7 literal contract before
running B01-B16 or notSameValue. `frozen-inputs.json` fixes two complete test
sources: successful sameValue followed by guest throw7 versus throw11. These
are semantic runtime inputs; neither modifies the original harness. Both hosts
and both inputs execute every fixed row. Original load-only preparation evidence
is retained in `initial-whole-unit.json`; it is not the oracle for semantic rows.

Each B/N row discards an isolated preflight Realm/session, then reloads both
whole units into its fresh test Realm/session. The test host retains the thrown
object, checks the actual Test262Error prototype and constructor identities and
exact message. B09 supplies a distinct Realm's ReferenceError. B14 checks object
message retention; a separate guest-bound message control compares the exact
retained Value. B16 checks guest7, never diagnostic-name matching.

## Source, failure and resource controls

The literal throw-site table is read directly from the pinned original throw
statements, including formatSimpleValue's rethrow. It checks defining Realm,
ordered occurrence ID and exact line/column. A repeated sta.js unit creates a
new constructor and a new record; the subsequent throw must identify occurrence2.
This never deduplicates equal source bytes.

Twenty-four fresh/seven-seeded resource prefixes cover the first twelve global
declaration instantiation ticks. The source-derived schedule is the forward
conflict scan and reverse function scan of the six original declarations, each
at column10. The seed runs in a different Realm using the same session. Limits
must stop before publication, preserve exact source/record/Realm identity, retain
monotonic steps and restore active/call/depth state.

Seven stage/fault controls exercise host sentinel, unsupported completion and
call-depth exhaustion in preflight versus test. Guest assert.throws must not
consume these as expected language throws. Preflight failure retains stage
harness/harnessValidated=false; post-preflight failure retains test/true. Host
exceptions are compared by exact identity, and both original sessions restore in finally and execute a fresh-Realm reuse unit at exactly two additional ticks. A language-failure neighbor explicitly retains stage=test while its defining source is the reloaded assert.js; unsupported and resource controls also check their exact source occurrence IDs.
The supervisor additionally kills each host while an actual guest loop is
running after verified harness load, requires ETIMEDOUT and exactly one test/validated
readiness marker emitted by a guarded builtin from the first guest loop iteration, and does not accept a negative expectation instead of timeout.
These stage checks are private test orchestration, not new observation transport.

Private record, captured-owner, one-use call/construct permit, first-abrupt and
same-session restoration guarantees are additionally replayed through the
unchanged E4/H1-H6/M suites. Node hostile reflection controls remain explicitly
Node-only. No new engine hooks or authority seams are introduced.

## Reproduction and preservation

From `typescript`, run `node docs/validation/ts-034h7/run-all.mjs`, then
`node docs/validation/ts-034h7/preserve.mjs`. Installed Zig libraries require the
same authorized access as previous tasks. `gate-sandbox-access.json` retains
the initial environment-only Zig lookup failure; authorized builds passed.
`build.mjs` is an optional affected-driver rebuild, not another full sweep.

The full runner executes typecheck, all59 static-only builds with separate
zero-dynamic reports, both212 guest-record lanes, the H7 exact-output validator,
unchanged H1-H6/M/E4 and seventeen inherited groups, both Node boundaries and
slots, runner20, host73, observations22 and probes10. It backs up the entire
prior C evidence tree and restores it in finally, retaining changed replay
outputs only under this task. `supplementary.mjs` records the E4/boundary checks
added to the reproduction runner while the first full sweep was already active.
`preserve.mjs` requires the exact original212 records, all58 prior gate entries,
only one additive gate, unchanged production/old tests/pins/transport, and all60
corpus variants still blocked. Coordinator-owned COORDINATION changes are exempt.

## Scope and review boundary

Only B01-B16/notSameValue and the named fault/source controls establish runtime
evidence. Dormant compareArray/format and Array map/join, JSON, BigInt, Symbol
factory/methods, async/$DONE and unknown helpers/includes remain explicitly
unsupported or unvalidated. Parsing their function bodies is not runtime proof.
H7 neither admits any corpus variant nor changes CLI/default profile, manifests,
classifiers, observations, decoders or pins. P6 remains blocked and unassigned.

The first full sweep passed all59 gates, both212 lanes and H7/H1-H6/M, then
the inherited aggregate runner hit a host filesystem UNKNOWN write error saving
replays-results.json after eight groups. The failed transcript is retained in
suite-results.json, and the old evidence tree was restored. No guest/runtime or
compiler failure occurred. resume.mjs runs the remaining nine groups directly
without editing historical validators, the supplementary checks and host suites.
It rebuilds only the strengthened new H7 driver and replaces only gate59; the
original full59 results remain in full-native-before-strengthening.json.

Final completion status is recorded below after preservation checks finish. No publication or successor is authorized by this handoff.

## Completed candidate validation

All required checks pass: Node/native212/212 exact old records,58+1 native
static gates, H7 corrected3847static/zero dynamic, both semantic inputs,14literal
throw sites,24resource prefixes, sevenstage/fault controls, same-owner reuse,
message/occurrence identities and two actual subprocess timeouts. H1-H6/M/E4,
all17inherited groups, both Node boundaries/slots, typecheck, runner20, host73,
observations22 and probes10 pass. Preservation protects4347files including146
old test files. All60variants remain blocked. The prior C producer tree is
restored. This is a tested candidate awaiting actual and second independent
review, not acceptance or permission to publish/start a successor.

## Timeout readiness review correction

Candidate e1b909b was not accepted: its readiness marker was emitted before
preparation/evaluation, so that marker plus a timeout did not prove loop entry.
The original gate/results/oracle/completion/preservation evidence is retained in
`correction/previous/`; the original source remains at that commit.

The corrected test source calls an ordinary guarded builtin only from its first
loop iteration. The callback checks the active original record, Realm, body
phase, operation-context Realm and test stage before emitting readiness once.
The supervisor requires exactly one marker plus ETIMEDOUT and nonzero status in
both hosts. A whole-unit preparation rejection leaves steps unchanged, never
invokes the callback, exits normally and cannot satisfy timeout acceptance.
Negative validator mutations also reject timeout metadata without readiness
and duplicate readiness markers. No production/harness source or authority seam
changed; immutable caps are retained.

Node compilation, the H7-only native static/coverage gate (3847/3847), both
semantic inputs, both reached-loop timeouts, both preparation negatives, frozen
row/source audit and preservation pass. The unchanged 58 prior gates and all
inherited suite evidence are reused, not rebuilt/replayed. See
`correction/timeout-contract.json`, `correction/audit.json`, `bundle-results.json`
and `completion.json`. Stop for actual and second independent re-review; no
acceptance, publication or successor is claimed.
