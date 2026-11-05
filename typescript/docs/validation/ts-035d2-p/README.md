# TS-035D2-P design evidence

Base `62a8787`. Candidate only; stop for actual and independent second review.
No production, real old test, historical validation, registry, ledger, admission,
CLI, profile, manifest, compiler, pin or C++ changes. Coordinator owns COORDINATION.

The [design](../../script-strict-rule-dispatch.md) resolves X06 without obtaining
candidate information from a failed parse. The accepted legacy full-source return
audit independently rejects same-list function duplicates. Keep that fallback
unchanged, and enable the new block rule only through a fresh bounded preparation
that reaches EOF and passes D1's global veto. Ordinary planner/audit outputs stay
unchanged through a separate internal preparation bridge using the same parser
and collector. New block syntax errors can project in either action or role;
existing return certification remains parse-only/test.

## Reproduce the design checks

From `typescript/`, run:

```text
node docs/validation/ts-035d2-p/verify.mjs
```

This reads complete proposed old-file bytes, checks all 815 original/result
hashes against base Git blobs and current whole files, checks 4649 protected
file hashes, runtime inputs, source matrices and ownership. It writes nothing.
`--old-tests-only` omits the production/history protection check when a future
reviewed implementation is being evaluated; whole old files remain mandatory.
The identity proposal means **no old test edit is authorized**.

`freeze.mjs` generated `semantic-matrix.json`, `audit.json`, the two runtime input
files and the complete old-file proposals/manifest. It ran 90 current Node parser
and parse-only C observations, compared all 62 inherited ordinary results to D1,
checked inherited exact candidate sites, and asserted the hand-stated additional
return cases. No guest bodies ran. It imports the existing accepted Node build;
source and recursive build hashes are retained. It is a freeze generator, not a
future implementation verifier: do not overwrite this baseline with D2 results.

The 815 proposals include all tracked `test/` files, current host `.test.mjs` and
`.integration.mjs` files, and all historical validation `.mjs` files. This covers
both decoder tests and A codec fixtures, C's current registry/transport/host
controls, B/H7, D1, and the inherited replay chain without a filename heuristic
that accidentally omits older replays. Each entry is the **entire byte sequence**
encoded as base64, with original Git blob/hash and working/result SHA-256 in the
manifest. CRLF checkout bytes and original LF Git bytes are distinguished.

`wire-freeze.mjs` generated 64 exact future synthetic v2 records: both host
identities, both runtime inputs, both actions, both roles, both rule codes, with
and without diagnostics. These are codec controls, not actual native bytes.
Return execute/harness records are explicitly marked synthetic-only: production
C does not newly emit them. Both current decoders reject all 32 block records.
The existing allowlist's accepted return code was substituted solely to check
the other shape/provenance constraints: 1792 mutation cases and 256 independent
parent transport priority cases pass. This does **not** validate a widened codec
or new producer. Exact claims are in `wire-audit.json`.

`check.mjs` records the read-only whole-file verifier, script syntax checks, and
`verify-future-wire.mjs --current-return-controls`: 32 current return-only
synthetic rows with 9952 independently checked mutations. The block-rule swap
control is omitted in that current-only mode because today's allowlist rejects
it. `checks.json` retains exact commands, exits and output; no block pass claim
is inferred from these checks.

`verify-future-wire.mjs` is a concrete future host test proposal. Do not run it
as a current success gate: it must fail on today's block allowlist. After a
separately accepted implementation it checks both decoders independently,
required/extra fields, binding/shape changes, classification, v1 rejection,
diagnostic variants, byte corruption and parent transport priority. Actual
Node/native supplemental serializer bytes and C end-to-end cases still must be
compared to the literal rows; synthetic data is not producer evidence.

In-range wrong coordinates and swapping two known rule codes are intentionally
codec-valid controls. Producer tests must catch their semantic wrongness. The
decoder validates closed shape/binding, not whether source text contains the
claimed error. This distinction avoids overstating the wire tests.

## Scope and limitations

The inherited 212 guest records per host, 64 static gates, all accepted suites,
and 33-file/60-variant blocked selection are preserved, not freshly rerun.
No native compilation, native execution, full suite, upstream refetch, guest body
or other-engine execution occurred in this design task. Existing-build probes
are bounded evidence, not exhaustive parser or compiler proof. Proposed future
collector/serializer/native behavior remains unimplemented and must be reviewed
and measured. No D2 implementation or successor ownership is granted here.
