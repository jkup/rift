# TS-035A synthetic v2 codec candidate

Base `c4310c7`; tested candidate requires actual and second independent review.
Full regression validation passed: 212/212 old guest records in each lane,
59 old native gates plus the additive serializer gate, old host 73, observations
22, runner 20, probes 10 and typechecking. The serializer gate reports 370/370
static statements with separate zero-dynamic coverage. All 154 frozen rows are
checked in both lanes, using both runtime inputs (77 records per input/lane).
The final affected host rerun passed 21 tests; see final-host-tests.log. That
rerun includes the final parent-fault diagnostic and null-binding input-rejection
roundtrip fixes, after the full pipeline's 20-test host run. Only the new host
decoder/tests changed after the full pipeline; no native source changed.

suite-results.json records every full-pipeline subprocess and output.
preservation.json records 4400 protected tracked files, including 157 existing
test/fixture or host-test paths, and the unchanged 33-file/60-variant blocked
selection. No acceptance or publication is implied by this directory.

The four new production files implement closed v2 data types, an explicit ASCII
UTF-16 encoder, a child decoder and a full-envelope decoder. Exported host
entrypoints are parseScriptDriverResult, validateScriptRecord,
parseScriptEnvelope, assertScriptContext and inspectScriptEnvelope. The encoder
exports scriptObservationJSONRecord. No v1 production module is imported by the
new host modules. The TypeScript encoder reuses the existing jsonString helper
without modifying it or traversing guest objects.

Both decoder modules keep the same private binding and operation checks within
the assigned four-file surface. Binding validation recomputes the canonical
request hash, verifies all seven limits and every ordered source text/hash,
and enforces the coordinator-approved variant amendment. Source coordinates
are one-based UTF-16 positions with CRLF and ECMAScript line separators handled
explicitly. Available constructors may refer to any registered Script Realm.
Original and secondary sites stay distinct. Optional diagnostics are validated
for placement and type but never used for classification.

The retained binding-review.mjs witness predates implementation. It exposed an
indistinguishable raw/non-strict binding. The coordinator approved the minimal
variant amendment now appended to docs/script-admission.md; that root-authored
amendment is the sole authorized design change. The original witness remains
unchanged. TASKS.md retains the review request and its resolution.

## Frozen oracle and reproduction

Before implementation, freeze.mjs wrote 154 literal fixture rows across alpha
and beta, including child records, full envelopes, literal classifications and
exact ASCII bytes. frozen-controls.md records the required mutation matrix and
parent-only alternatives. frozen-sha256.txt authenticates the unchanged fixture
file. prepare-driver.mjs materializes typed synthetic literals; it never imports
or derives expectations from the codecs.

From typescript/, run:

```
node docs/validation/ts-035a/run-all.mjs
node docs/validation/ts-035a/capture.mjs
node docs/validation/ts-035a/preserve.mjs
```

The run uses the installed pinned Zig linker. Windows sandbox library-access
failure is retained in gate-sandbox-failure.json, separate from the successful
authorized build. The initial shell invocation also lacked Zig on PATH; the
reproducible scripts supply its existing installation path. No compiler
workaround or pin change was introduced.

Both new host test files execute Node and native serializer programs with both
runtime-read fixture inputs. Each stream is checked against the frozen literal
ASCII before mutation or envelope composition. Captured JSONL is synthetic test
output, not a production protocol parsed from stdout. Production stdout remains
untrusted; no launcher or driver is implemented here.

The tests independently rederive classification, reject unknown/missing keys at
every object depth, exercise malformed UTF-8/duplicate-equivalent JSON keys and
byte boundaries, binding/context/source/Realm/prefix drift, direct and secondary
runtime unsupported outcomes, every constructor/guard/result arm, and optional
diagnostics. Full-envelope inspection applies deadline, independent crash and
output priority using separate trusted transport facts. Authenticated parent
timeout/crash/output envelopes preserve diagnostics; missing or mismatched
envelopes return the parent-priority status. A cap-killed envelope roundtrips
with its real killed process and remains output resource-limit.

validateScriptRecord/parseScriptEnvelope validate structural classification;
they cannot authenticate a cap-kill without transport facts. Archive consumers
must call inspectScriptEnvelope with the saved parent context, binding and
transport artifact. Cancelled launches remain the future launcher's unfinished
work; no cancellation or launch API is introduced by this codec slice.

## Scope and limitations

There is no live Script throw inspection, engine observation driver, launcher,
capability registry, rule certification, v2 ledger or admission. T04's future
appendScriptAttempt step remains reserved for the ledger slice: A tests the
complete available codec/context roundtrip and preserves the v1 ledger's v2
rejection. It does not invent a substitute public append API.

Preservation checks compare all protected tracked paths to the accepted base,
assert the exact single additive native gate, compare all 212 old guest record
names/expectations in both lanes and all 59 old gate entries, and independently
recompute the original 33-file/60-variant blocked selection. No old test,
historical evidence, compiler, manifest, CLI, profile, registry or admission
policy is changed. COORDINATION.md belongs to the coordinator and is excluded
from this candidate's ownership and commit.
