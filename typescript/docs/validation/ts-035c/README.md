# TS035C: parallel Script observation transport

Candidate based on `e66876d`. Actual and second independent review are required;
this task does not publish or admit corpus variants. Final host checks and the
scoped preservation audit passed; this is a tested candidate, not acceptance.

## Implementation boundary

New `src/script-observation.ts`, `src/script-observation-driver.ts` and
`tools/test262/script-observe.mjs` implement the parallel mode. The parent APIs
are `prepareScriptObservation`, `validateScriptLaunch` and
`launchScriptObservation`. Production preparation accepts the corpus root,
revision, selected path/variant, lane, action, existing archive root and bounded
limits. It independently reconstructs the frozen selection and verifies original
pin/blob/metadata/UTF-8 before the exact strict transformation. It does not trust
a caller-created selection, AST, context or Realm registry.

Plans are deeply frozen, parent-owned and single-use. Source occurrences retain
order, repeated paths and distinct IDs. Saved bindings contain all seven limits,
mode, variant, action, exact transformed text, ordered unit and Realm identities,
and the canonical request hash. Source identity recursively covers engine
modules including builtins, control source/data, build configuration and pins.
Build identity covers the complete Node module closure/runtime or both native
entries. Adapter identity includes both v2 decoders, input preparation, the
launcher, the Node runtime and all YAML dependency files. These commitments and
source artifacts are rechecked before launch and after preflight.

The child creates actual private Realms/records; projection matches their object
identities, not just strings supplied by a caller. Constructor/name Gets use B's
fixed observed entry. Original and secondary sources remain distinct, including
an earlier defining record in another registered Realm. Normal results contain
no guest value. Fixed registered controls have deterministic setup inside the
new module and separate host reports; S01 checks actual numeric arguments in a
host-owned array. Controls do not accept callbacks or execution authority.

Every non-raw attempt runs fresh B01–B16, N01/N02 and runtime-read I01 preflight
controls. Whole original assert.js/sta.js and all ordered includes execute as
separate units. Deliberate negative outcomes require actual constructor identity
and literal messages. Each control has a separate process/Realm/session, followed
by fresh reload for the selected test. Shared per-session steps are monotonic
across units and Realms; calls/depth/active state are checked after every exit.
No successful-preflight cache exists. The strict synthetic test unit in each
preflight uses the same exact strict prefix as its bound variant. The verified
original BSD license accompanies every attempt.

Invalid preparation inputs reject before test launch. A failed preflight plan
has no preflight ID and returns its separate failed-control packet without
launching the selected test. Resource/unsupported failures keep their actual
outcome, operation and source; parent-only faults retain known harness stage
without inventing body entry. A mismatch in an otherwise successful control is
an explicit preflight-control fault. Cancellation returns unfinished and consumes
the plan. Completed observations never carry conformance classification.

Deadline, independent crash/host failure, shared stdout+stderr cap, protocol,
resource and unsupported outcomes retain their specified priority. Only the
result file supplies protocol. Trusted capCount/capKilled/crashBeforeCap facts
are archived separately and used for exact full-envelope replay. Pipe hashes
cover every received byte; retained pipe files are bounded. Actual timeout
controls require one guarded first-iteration marker, and a pre-entry negative
cannot satisfy that proof.

## Approved closure change

The original [parse-only witness](parse-only-review.md), executable and JSON are
unchanged historical evidence. Coordinator and second review approved exactly
one predicate in each A decoder: non-null inspection is permitted for harness
execution under parse-only, while every test-stage restriction remains intact.
`coordinator-admission.md.txt` preserves the exact root-authored amendment.
The new codec test and preservation verifier compare both decoders against the
accepted base and require exactly those two edits. Existing A tests are intact.

No existing engine, B facade, v1 codec/launcher, CLI, profile, manifest, compiler,
pin, registry or conformance ledger changed. The only other existing production
edit is the two additive native gates.

## Validation and retained corrections

| Check | Evidence |
|---|---|
| Full old baseline: 212/212 both lanes, no skips; 61 old native gates plus 2 additive gates | `guest-*-results.json`, `native-build-results.json`, `full-native.log` |
| Current C entries: 4146 / 4149 static, zero dynamic, separate static-only builds and coverage | `control-priority-correction/gates.json` |
| 43 literal registered controls × 2 runtime inputs × 2 real hosts = 172 attempts | `binding-finalization/integration.log`, `integration-latest.json` |
| B X/U/P01–P09, H7, H1–H6/M/E4, all 17 inherited groups and both boundary/slot checks | `required-suite-results.json`, `inherited/` |
| Unchanged A21 consuming both serializers, runner20, old host73, observations22, probes10 and typecheck | `required-suite-results.json` |
| 21 new codec, live-byte mutations, lifecycle, preflight and pinned-input checks | `new-host-results.json` and final host log |
| Pinned S01/S02/S05/S08 observation only, original bytes and strict transforms; all 33 files/60 variants still blocked per lane | `pinned-results.json`, `blocked-results.json` |
| Exact allowed old-file changes, unchanged old tests, preserved denominator, original engine source | `preserve.mjs`, `preservation.json` |

The first sandboxed Zig installation-access failure is retained in
`initial-build.log`; authorized installed-library access succeeded. A new test
initially read an inherited `constructor` property from its expected-result
object; the own-property correction and original failing log are retained.
An early parent mapping replaced an ordinary harness failure with a generic
control fault; the corrected mapping preserves the original phase/source.
A later low-budget control exposed an oracle assertion replacing a resource
outcome. The C-owned correction bypasses expectations for resource/unsupported
results, preserves ordinary mismatches, and leaves preflight unverified. The
previous source, full gates and failing host output remain under
`control-priority-correction/`. Only the two affected native entries were rebuilt;
the unchanged 61 old gates and old engine suites were not redundantly rebuilt.
The correction's first runner import-path failure is also retained.

`binding-finalization/` preserves the earlier adapter and control matrix. The
finalization applies the exact strict prefix to the preflight test unit and adds
parse-only instantiation/conflict neighbors. Test-only process/lease helpers live
in this evidence directory, avoiding empty entries in the host test glob.

Historical validation directories were backed up recursively before replay,
changed/new replay outputs were captured in this scope, and original bytes were
restored in finally. No historical validator or test was edited. Historical
B preservation/correction audits have their original closed task contract;
this task uses its own scoped verifier rather than relaxing those audits.

`initial-attempts.zip` preserves 8922 initial raw artifact files, verified against
per-file SHA-256 entries in `initial-attempts-index.json`. Final transport
artifacts are retained in `transport-artifacts.zip` with every archived byte
verified by `transport-artifacts-index.json`. The final typecheck also passed
(`typecheck-final.json`). Preservation covers 4512 tracked paths and 166 old
test paths. Saved bindings and
trusted transport facts accompany child bytes; received envelope JSON alone is
not sufficient to authenticate replay.

## Reproduction

From `typescript/`, with the pinned installed Zig directory on PATH:

```powershell
node node_modules/typescript/bin/tsc -p tsconfig.json
node tools/build-native.mjs
node tools/run-guests.mjs node
node tools/run-guests.mjs native
node tools/test262/script-observation.integration.mjs
node docs/validation/ts-035c/new-host-suites.mjs
node docs/validation/ts-035c/required-suites.mjs
node docs/validation/ts-035c/preserve.mjs
```

The pinned-input host suite uses the existing local export at
`C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075`; no retrieval is
performed. Run integration before the live-byte host tests. C test suites share
a lease because fault tests temporarily alter only C-owned artifacts and restore
their exact bytes. Attempt directories are append-only; reruns use new UUIDs.
The original parse-only review reproducer intentionally records the pre-amendment
failure and is not a post-amendment success test.

All observations are bounded Windows x64 evidence. No claim of full ECMAScript
support or conformance admission follows; all 60 variants remain blocked.
