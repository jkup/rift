# TS-033E4-P evidence

Design-only work at semantic base `9b540e7`, with coordinator dispatch `6014cc2`.
No production/existing-test edits, guard changes, guest execution, native build,
admission change or new conformance claim. The proposed implementation is not
accepted merely because this audit passes.

## Deliverables

- [Activation design](../../script-execution-activation.md): exact future file
  ownership, co-located private record/shared evaluator boundary, opaque session,
  frame restoration and one-use exact builtin authorization; grammar/debt audit.
- [execution-matrix.md](execution-matrix.md): byte-identical accepted E-P matrix,
  all55 rows, including F04–F09 source restrictions and ordinary neighbors.
- [setup-matrix.md](setup-matrix.md): byte-identical E3B matrix, including literal
  18/6/12 setup traces, naming eligibility and allocation/publication prefixes.
- [accessor-matrix.md](accessor-matrix.md): byte-identical ER matrix, R36 mandatory
  actual invocation distinguished from previously accepted descriptor projections.
- [activation-matrix.md](activation-matrix.md):18 extra activation controls,
  seeded-counter restoration, authorization negatives and literal root/call/loop
  traces. [restricted-traces.json](restricted-traces.json) freezes13 complete
  restricted read/set/compound/typeof variants with source and numeric columns.
- [audit.json](audit.json): current source hashes/numbered seams, protected paths
  count, inherited evidence hashes, pinned research integrity and current blockers.

## Repeatable checks

From repository root:

```text
node --check typescript/docs/validation/ts-033e4-p/audit.mjs
node --check typescript/docs/validation/ts-033e4-p/freeze-traces.mjs
node typescript/docs/validation/ts-033e4-p/audit.mjs
git diff --check
```

Observed offline audit: **2956 protected files**,175 source/test hashes,
279 source-seam occurrences; inherited212/212 records and48 fully static gates;
all60 selected variants still blocked;13 proposed restricted traces structurally
checked. The source tree and historical evidence are compared to the accepted
base. TASKS modifications are restricted to the final E4-P entry; COORDINATION
is explicitly excluded as coordinator-owned. The audit verifies exact matrix
copies and engine source byte hashes, not semantic truth of the proposed traces.

`freeze-traces.mjs` was used once to author literal source-position arrays from
the frozen placement rules. It has no parser/evaluator import and executes no
guest/reference source. Re-running it is optional authoring arithmetic, not a
test or permission to alter the oracle to match a future implementation.

The48-gate/212-record evidence is read from accepted ER-B retained files. It is
**inherited evidence only**, not a rebuild or rerun in this assignment. Its files,
production, old tests, pins, C++, observation controls and previous failures are
protected. Future E4 must actually run both lanes and the full preservation suite.

## Research and limitations

Reviewed retained fixed ECMA-2622025 excerpts and engine262 revision
`d553e7b52501fbc47eae981c8d0fa7a5c26d0171` source in E-P and ER-P evidence.
Audit verifies the expected full-spec hash metadata and every retained engine
file's hash/size; it does not re-fetch the full edition. See the design for exact
clauses and consequential decisions. No engine262 execution was performed.

The co-location/facade/private-context shape has not been tested under scriptc.
The design specifies a bounded reduction if actual compilation fails; it does
not assert feasibility or authorize a compiler workaround. No new artifacts are
claimed to satisfy actual R36 or Script execution. Error objects, standard
arguments, nonstrict execution and harness/transport/admission remain separate
blocked capabilities. Stop at independent design review.
