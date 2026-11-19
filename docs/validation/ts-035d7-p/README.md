# D7-P design/evidence candidate

Accepted base `041982113d292a9035ea644bdb3eae104963942f`. Read
[the design](../../script-lexical-statement-rule.md) for the frozen non-emitting
two-file boundary and separately reviewed future dispatch proposal.

Current evidence uses only the existing accepted D6 Node artifacts. It does not
implement the new audit, build the engine, execute lexical rejected bodies,
claim native results or admit any corpus variant. Seeds, harmless prefixes and
the ready reference control are the only guest code executed. All source,
artifact, protected-history and original-file hashes are frozen in audit.json
and the proposal manifests. All 212 records/69 gates remain inherited; all 60
variants remain blocked.

From the repository root, read-only replay (outputs only in this directory):

```powershell
node typescript/docs/validation/ts-035d7-p/verify.mjs
node typescript/docs/validation/ts-035d7-p/probe.mjs
node typescript/docs/validation/ts-035d7-p/wire.mjs
node typescript/docs/validation/ts-035d7-p/controls.mjs
node typescript/docs/validation/ts-035d7-p/check.mjs
```

`freeze.mjs`, `proposals.mjs` and `make-wire.mjs` are editorial fixture producers,
not acceptance oracles. Review the frozen JSON independently; never regenerate
expected literals from a future implementation. `wire.mjs --future` and
`verify.mjs --dispatch-applied` are obligations for a separately reviewed later
emission; they must fail on this current four-code producer/decoder boundary.
No future/native success is inferred from synthetic serialization.

Files and their roles:

- `references.json`: complete pinned S19 and pinned V8 context excerpt.
- `cases.mjs`, `semantic-matrix.json`: complete sources, editorial slots,
  full current outputs/nodes, full future blocked/none/eligible literals,
  valid-list neighbors, future preparation/child/ASCII results.
- `inherited-preparations.json.gz`: 564 full current D2–D6 snapshots, including
  D5/D6 preparation consumers. Lossless gzip of complete literal JSON; no fields
  or rows omitted. `inherited-manifest.json` hashes compressed and expanded bytes.
  No migration in the first slice.
- `source-consumers.json`: all tracked TS/MJS matching source/codec consumers,
  including historical proposed files; exact lines and hashes.
- `old-test-proposals.json`, `proposal-manifest.json`, `proposed/`: 927 complete
  original Git/checkout/result files. All are identity in D7; five exact later
  codec migrations are separated. Full-file verifier includes SHA-1 and SHA-256.
- `inputs/`: two actual CRLF files, non-BMP alpha; replayed in both orders.
- `probe-results.json`: full current snapshots replay, runtime stdout/stderr,
  full blocked-oracle negative checks. New audit is still unimplemented.
- `wire-matrix.json`, `wire-audit.json`: 320 complete bound child/envelope/ASCII
  fixtures; 256 accepted existing-rule controls and 64 rejected lexical controls;
  95840 malformed checks at both independent decoders. Existing-code surrogate
  used only for malformed lexical controls on the current boundary.
- `future-controls.json`, `control-audit.json`: full prefix/budget/profile/
  metadata/history/ready literals and actual current state/identity probes.
  Seeded zero-prefix history persists; any successful prefix clears it.
- `failures.json`: retained generator and occurrence-message mistakes, causes
  and corrections. No production workaround or weakening of an old assertion.
- `original-oracle/`: complete earlier oracle producer/matrix/results/controls,
  retained with SHA-256 after self-review corrected S19 spacing and scope reasons.
- `checks.json`: offline syntax, complete-file and preservation results.

Future implementation requires both hosts, actual new audit results and later
actual producer bytes. Preserve historical producers recursively on every
replay; do not replace old output with fresh evidence. The coordinator owns
COORDINATION, publication, actual review and independent second review.
