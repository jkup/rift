# H6-CP exact C proposal

Base `4eb954daf8ae62f5e2c168df74259a4c6b152edd`, accepted/published H6-B.
This directory is an offline proposal, not C implementation or runtime evidence.
Await actual and independent second review before C assignment. No publication
or successor is authorized by this handoff.

`replacement-manifest.json` specifies five byte-range replacements in two complete
proposed files. `proposed.patch` passes `git apply --check`; do not apply it during
CP. All other bytes reconstruct exactly from the base Git blobs. Checkout line
ending normalization is handled by Git's check, not described as a semantic edit.
`baseline-hashes.json` covers 4059 tracked files, including 140 old test files;
TASKS and coordinator-owned COORDINATION are excluded. The verifier rejects tracked
changes elsewhere. The manifest includes the inherited A inventory; inherited B
does not need an edit. No test row, assertion, legacy record or gate is removed.
The copied bootstrap file retains its baseline blank line at EOF; Git's staged
whitespace check flags it as new because this is a new full-file copy. Removing
that line would violate the exact preservation contract, so it is retained.

Bootstrap B03 appends constructor to the Object and String key lists. It checks
the new entries as genuine constructors (global/prototype identity, descriptor
flags, name/length, Function.prototype, matching callable/constructor records),
and keeps the old method/restricted endpoint checks. B04's existing identity loop
also covers the new constructor objects. A03 extends its exact global inventory
and positively checks new links/flags/guarded slots while preserving Error graph,
brand, identity, negative and legacy checks.

`frozen-traces.json` retains corrected BP T13–T18 events unchanged and adds ten
explicit numeric/Symbol/boxing traces: 16 total, 200 fresh/seven-seeded prefixes
per input, 400 across both inputs. Every terminal, prefix and call-limit oracle
is input-specific. `matrix-map.json` retains all F01–F12 source clauses and gives
literal per-input results; fixed rows intentionally have identical results.
Runtime input files contain String(7) and String(11); other trace sources are
explicit per-input variants loaded as separate prepared units bearing that input
ID. Hook payloads are seven and eleven. No observed output supplies an oracle.

Read `REVIEW.md` before acceptance, especially the additional map consumer and
the limits of proving prototype-read ordering without an authority seam.

Reproduce offline:

```powershell
node typescript/docs/validation/ts-034h6-cp/freeze.mjs
node typescript/docs/validation/ts-034h6-cp/verify.mjs
node typescript/docs/validation/ts-034h6-cp/syntax.mjs
```

Renderer regeneration (Python3, on this host available through WSL):
`wsl python3 /mnt/c/Users/jonku/code/rift/typescript/docs/validation/ts-034h6-cp/render.py`.
It reads the fixed Git base and writes only this directory. Windows Python was
unavailable; WSL initially denied sandbox access and then ran with approved
escalation. No runtime builds/tests were attempted. Syntax checking deliberately
uses detached copies with unresolved imports; it is not a typecheck or native
feasibility result. The first verifier run exceeded its subprocess output buffer
while reading historical blobs; raising that offline buffer to 1GiB allowed the
same checks without altering any preserved data.

Future acceptance remains the full inherited H6 contract, both hosts and runtime
inputs, original 212 records/56 inherited gates plus C's additive gate, preserved
H1–H6B/E4/17 replay groups/boundaries/slots and host suites. No H7 original harness
bundle or P6 admission claim follows from CP.
