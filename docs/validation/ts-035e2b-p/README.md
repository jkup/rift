# TS-035E2b-P design evidence

Candidate against cbdf4fc8d99ece3672414267e3c155e86172ec72, accepted E2a44f6530.
No production or real existing test edit. Contract: ../../script-policy-ledger.md.
All commands below run from typescript/. No native build or full suite is run.

```powershell
node docs/validation/ts-035e2b-p/audit.mjs
node docs/validation/ts-035e2b-p/model.mjs
node docs/validation/ts-035e2b-p/verify.mjs
```

audit.mjs is bounded, read-only against actual old code/evidence. It prepares
both existing E2a lanes and compares every selection field except random runId
against complete frozen literals: 33 files, 60 blocked slots, 19 feature and 41
profile per lane. It records actual v1 boundaries: v1 newLedger accepts a v2
selection structurally but report throws TypeError because variants is absent;
an empty opaque token fails at construction. This is not an explicit v1 version
validator and does not authorize changing v1.

It also copies the exact proposed planner and dependencies into a fresh ignored
closure-probe-* directory. Its script-ledger.mjs is an inert comment, not an
implementation. Successful planning proves only the byte-closure proposal:
242 entries and v3 policy ID. The exact proposed old-test migration helper runs
against all six selection and five input-failure literals, retaining every
non-policy field and 240 unchanged closure entries. Four bad baseline controls
reject. Complete migrated outputs are stored separately, with the inert marker
hash; they must not become production ledger-hash expectations. Repeated audits
create new isolated directories, never reuse/modify old evidence or modules.

model.mjs is a private evidence model with no exports or production authority.
It replays 24 complete main report/attempt literals plus four supplemental
Module-input and mixed-known/null-slot cases. It checks fresh recursively frozen
inspections/reports, exact arities/function lengths/errors, duplicate and foreign
tokens, separate planner/ledger module ownership, selection consumption and
failure nonconsumption, argument/type precedence without caller coercion,
out-of-order slots/global and per-slot counters, original retry text, cancellation
as no call, rejected append atomicity and first-headline retention.

Its selection-validation oracle is deliberately **full equality to known literal
fixtures**, not a general schema implementation. Synthetic internal selection,
history and candidate-validation faults are requirements controls. They are not
evidence of an absent production validator or IO failure handling. E2b must
translate these into real API tests and isolated copied-module faults, without
public injection. Initial model code incorrectly matched normalized retained
fixture runIds; its original source and failure explanation are retained in
model.mjs.initial and initial-model-failure.txt. The correction uses full value
equality, leaving original literals untouched.

The model's v3 selections have an explicitly synthetic closure hash entry named
syntheticClosureMarker. They cannot mint actual E2a tokens. All attempts are
policy-only. Full eight-status report keys remain present, but pass/fail/resource/
timeout/host-fault terminals are unreachable here. E2-P's all-status transport,
receipt spending, durable anchor and reopen examples remain future E3/E2c
requirements, not reachable E2b tests. No storage/power-loss proof is claimed.

verify.mjs compares 5,811 tracked baseline files byte-for-byte, including C++,
all old production/tests and historical evidence. TASKS and coordinator-owned
COORDINATION are the only baseline exclusions. It checks all three complete
proposal original/proposed hashes, reverses exactly the proposed deltas and
compares whole files. All eight E2a tests and their assertions remain; the test
amendment adds one guarded closure helper and changes only the two expected-
literal loaders. The support amendment adds the ledger copy; the production
amendment adds the ledger closure entry and changes only the policy ID.
The verifier also checks retained 212 passing guest records in each lane,
71 native gates, 60 blocked19/41 and full initial/final/retry report totals.
These are retained evidence, never fresh build claims.
The optional --proposed mode is for a later authorized implementation: it
requires exactly the three complete proposed replacements and preserves every
other baseline byte. It does not apply changes and has not been run against
this unchanged production checkout. All three rendered proposals pass Node's
module syntax check.

freeze.mjs and freeze-supplemental.mjs are one-time authoring records and refuse
to overwrite existing captures. Do not run them during validation or regenerate
old expectations. consumer-inventory.txt records actual old import/literal
consumers. proposal-manifest.json lists full files and hashes. preservation.json
is the frozen baseline. actual-results, closure-probe-results, migrated-closure-
literals, model-results, audit-results and verify-results are new outputs only.

Future implementation ownership and suite closure are in the contract. The old
E2a freeze/runner/raw files stay historical; execute its migrated tests using a
new isolated E2b runner, with output paths wholly inside new evidence. No broad
restoration or historical overwrite is needed. Stop for actual/independent
audit/second review; this candidate neither implements nor publishes E2b.
