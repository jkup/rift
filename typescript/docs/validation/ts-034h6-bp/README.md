# H6-BP exact migration review package

UNAPPLIED evidence proposal based on accepted/published c8bd4bb. No production
implementation, old-test edit, B/C activation or runtime acceptance claim.

Read REVIEW.md first: it identifies the inherited A-driver changes requiring
actual and independent second review, exact proposed strengthening, and the
private-permit testability limitation. closure.md and closure.json audit complete
B ownership/signature/callsite closure. No additional production path is requested.

* proposed/test/ contains 22 complete proposed files, including the new inherited
  A driver. proposed.patch is the exact unified patch. replacement-manifest.json
  provides 94 replacements with byte offsets, old/new text, justification and
  whole-file hashes. All other bytes are preserved.
* baseline-hashes.json protects 3,896 existing files (139 old test files), including
  historical evidence and verifiers. Task status and coordinator-owned COORDINATION
  are the only baseline exclusions; verify.mjs protects all task text before BP.
* frozen-traces.json contains 21 algorithm-derived traces,328 limit rows/input,
  callback abrupt variants, call limits, cross-Realm rules, guard controls and two
  hashed input files. matrix-map.json covers all36 E,10 G and12 F rows. F remains C.
* verification.json records offline checks only: exact whole-file reconstruction,
  mutation rejection,70 direct helper calls covered,zero live old-test edits and
  all60 corpus variants still blocked. Previous accepted runtime/native results
  are inherited, not rebuilt here.

Reproduce offline checks from the repository root:

```
node typescript/docs/validation/ts-034h6-bp/closure.mjs
node typescript/docs/validation/ts-034h6-bp/verify.mjs
node typescript/docs/validation/ts-034h6-bp/syntax.mjs
git apply --check typescript/docs/validation/ts-034h6-bp/proposed.patch
git diff --check
```

render.py is the evidence-only renderer (Python3, run via WSL on this machine);
it writes only this directory. freeze.mjs regenerates literal expected data from
specified events, never from implementation outputs. Review changes to these
generators and frozen artifacts together. Do not regenerate baseline hashes to
hide changes: the renderer checks accepted Git blobs and the verifier checks
exact working bytes. Native Windows Python launcher was unavailable and sandboxed
WSL denied access; the same offline renderer ran through approved WSL execution.

syntax.json retains the no-emit/no-resolve parsing pass: no TS1xxx syntax errors;
unresolved imports and dependent type diagnostics are expected in detached copies.
The command exits1 and is explicitly not a successful production typecheck.

Stop at this coherent proposal. Coordinator owns review assignment, acceptance,
COORDINATION and publication. Neither B implementation nor a successor is started.
