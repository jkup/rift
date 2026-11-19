# TS-035E1 candidate

Host-only empty capability authority and debt reconstruction, based on fa840f4.
This is an implementation candidate awaiting actual, independent second, and root
acceptance. No authority grants, E2/E3 implementation, or conformance admission.

Production exports only `readScriptCapabilities` and `reconstructScriptDebts`.
The reader checks exact canonical bytes at its fixed sibling URL on every call.
The synchronous projection validator checks own descriptors before values and
uses the private pinned-manifest table loaded at module initialization. Existing
blockers are mapped in occurrence order, then runtime:coverage is appended.

From `typescript`, reproduce with:

```
node docs/validation/ts-035e1/validate.mjs
```

The unchanged Windows symlink and rename tests need normal host permissions.
The initial sandbox run failed three existing tests on EPERM, retained in
host73-sandbox-failure.txt and suite-results-sandbox-failure.json. The approved
host rerun passed. initial-tests.txt retains the test-only Windows --import path
failure; using the loader's file URL fixed it without a production change.

Validation passed:

- 133 new tests: all 130 frozen debt cases (including every full corpus array),
  33 frozen reader cases, actual fixed reader, no-cache/argument-before-IO,
  environment no-effect, fresh-import malformed/pin-mismatch manifest rejection,
  exact native errors, private unknown duplicate mapping, 16 array accessor
  zero-call controls plus root/negative accessors, non-JSON data rejection,
  preserved mutable and accepted frozen inputs, detached frozen results.
- Unchanged host suite: 73/73, including input, planner CLI, ledger, v1 decoders
  and boundary tests. Script v2 decoder suites: 21/21. Observation suite: 22/22.
  Probe runner regression suite: 20/20. Typecheck passed.
- 5,227 prior whole-file hashes matched before and after suites. Retained D8
  records remain 212 PASS per lane and 71 native gates. No native build/probes
  were rerun. All 33 corpus files/60 variants remain blocked, with first-status
  counts 19 unsupported-feature / 41 unsupported-profile.

## Import closure

The new production module imports only node:fs/promises, node:util, and unchanged
input.mjs (which imports node:crypto, node:fs/promises, node:path and yaml).
The new test additionally imports node:test/assert, child_process and url, and
reads the unchanged E-P e1-literals.json. There is no existing production consumer.
The host73 selection in validate.mjs is the established non-script test set:
input, ledger, boundary, result and driver-result. ledger.test exercises plan.mjs;
plan imports input, ledger and result. Both Script decoder tests cover unchanged
independent v2 boundaries. observations22 covers the existing launch/transport
consumer of input. No old suite, package registration or source was edited.
Exact commands and exit statuses are in suite-results.json.

## Isolated evidence

Tests create only `isolated/` beneath this new evidence directory: byte-identical
production module/input copies, a copied manifest, fresh child runners and an IO
fault loader. Reader mutation and manifest corruption occur only there. The
mapping-witness copy appends one private export solely in evidence; production
has no injection hook or mapper export. Frozen expected literals are read from
E-P without regeneration. corpus-debts.json records all actual full arrays.
The normal host observation suite creates its usual fresh ignored build archives;
no historical validation output is rewritten. validate.mjs verifies preservation
before and after and records retained (not freshly rebuilt) native evidence.

Ownership ends at this candidate. Coordinator owns COORDINATION.md and acceptance.
