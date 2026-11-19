# Revised E3d-P design candidate

Root actual/second review approved alternative5 for design only after checkpoint
56fd992. The first frozen slice is a distinct closed control request and actual
designated-harness return, not a conformance parent or success credential.
See `../../../script-conformance-preflight.md` for exact contracts and deferrals.

`proposal-manifest.json` maps three complete existing-file replacements and one
new test. `implementationAuthorized:false` means review is still required; it
does not mean those proposed files are installed. `--implemented` is a future
preservation mode that permits only the mapped exact bytes. The proposal test
is a **future guest/native suite and must not run during design**.

Offline reproduction from repository root:

```text
node typescript/docs/validation/ts-035e3d-p/correction/verify.mjs
node typescript/docs/validation/ts-035e3d-p/correction/probe.mjs
node typescript/docs/validation/ts-035e3d-p/correction/dispatch-probe.mjs
node typescript/docs/validation/ts-035e3d-p/correction/driver-probe.mjs
node typescript/docs/validation/ts-035e3d-p/correction/oracle-audit.mjs
```

Each probe creates only a new task-local directory and retains its exact reduced
source and result. They never import the complete proposed engine or run guest
source, launch a control/conformance process, compile native or change history.

Evidence:

- 160 independently authored future full binding/child/report/argv/source/stream
 records: all19H7/I01 ×2inputs ×2layouts ×2lane labels, plus8low-budget cases.
 Native labels are requirements, not executions. Expected throw sites come from
 original source statements and the accepted H7 contract. Full literals and the
 64argv/7source-negative sets are SHA-pinned in the future test, with an
 independently enumerated full160-ID order to detect omission/reordering.
- Pure-boundary probe:160full prepared records,64argv negatives,7source negatives,
 shape/extra/inherited-index/zero/leading-zero controls;13actual isolated source
 mutants rejected;160existing codec validations;1280output-field oracle checks.
- Exact run-method inert reduction:9independent traces,5mutants rejected. Includes
 normal completion with false oracle, earlier abrupt/preparation, designated
 resource/unsupported, actual host-sentinel identity in the reduction, cleanup
 ordering, and unchanged main fall-through. This is not evaluator semantics.
- Exact driver-branch inert reduction:6independent traces and3mutants, covering
 validate-before-reads, read-all-before-producer and sequential exclusive writes.
 No no-IO/no-Realm conclusion is inferred from a generic status code.
- Full oracle audit:160baseline records and13bundle/role/Realm/ID/source/repeated
 occurrence/report/summary mutants. A self-consistent nonce/request-hash/child/
 report/argv forgery remains codec-valid and is rejected by the pinned full oracle.
- Dispatch source descriptor:291project files with proposed bytes overlaid,
 actual main/control construction distinction and full literal file identity.
 It is source data only. No build/toolchain or parent host-services certification.
- Preservation:8498original files and15checkpoint evidence files unchanged;
 original main design retained in `original/`. C++ and prior212both71gates,
 all60blocked/full Module-nullslot denominator remain inherited and untouched.

Initial authoring errors are retained, not accepted proposals:

| Artifact | Failure and resolution |
|---|---|
| `original/freeze-literals-initial.mjs` | I01 guessed columns35/37 failed the pinned-source `throw` assertion. Exact source positions38/40 fixed before literal JSON creation. No engine output was used. |
| `original/probe-initial.mjs`, `boundary-dgz36X` | Changing unitID to u0 was a no-op for zero-step records, so the mutation assertion failed. Mutations now use u99 to actually change the candidate. |
| `original/dispatch-probe-initial.mjs`, `dispatch-ULKe40` | Inert projector lacked result.kind expected by the exact run method. Fix only the reduction, retaining actual proposed engine bytes. |
| `dispatch-tDg4pS` | Initial successful inert run; later stub refinement makes B01 abrupt/resource/unsupported reportfalse, matching actual verification priority. Final result is `dispatch-yEWiKr`. |
| `original/*-first.json`, `original/script-preflight-producer.test-initial.mjs` | First candidate metadata/test before adding fixed oracle hashes and the independent full-ID list. Final manifest hashes the strengthened test only. |
| `original/script-preflight-producer.test-before-dispatch-scope.mjs` | Clarified executable scope:57of64argv negatives select the new branch; other prefixes retain legacy IO. Added all7source mismatches to both-host executable tests. Direct exact API checks still cover all64argv/7source failures. |
| `original/verify-before-driver-newline.mjs` | Exact inverse proof initially left the branch insertion's CRLF at the main header, while original used LF. Verifier now reverses that one known inserted newline as well; no proposal or baseline bytes changed. |

`prepare-proposals.mjs`, `freeze-literals.mjs`, `freeze-manifest.mjs` are authoring
recipes using wx, not replay/update commands. `finalize-proposal.mjs` recorded the
one candidate-only oracle-pin strengthening; do not run it to accept a drift.
Old checkpoint manifests/verifiers remain historical. New verifier redirects
their old main-document hash to the preserved original and checks all old
evidence bytes, without rewriting a single old hash.

Stop after the coherent candidate commit for actual/root and independent second
review. No production implementation, native/guest success, parent admission,
publication or successor is claimed.

The two retained `dispatch-*/no-stop.mts` mutants intentionally preserve the
indentation left by deleting the stopping statement. Git's whitespace check
flags those two evidence lines; proposed production/test files pass that check.
