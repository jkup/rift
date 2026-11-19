# H6-CP2 formatting proposal after accepted M

Candidate for actual and independent second review, based on published
`89d3796869742acc01b1876311efa39f953dd62d`. C semantics remain UNEXECUTED.
This assignment changes only this new evidence directory and its TASKS status.
No production, real old test, original CP/MP/M evidence, pin, observer or admission
file changed. No full builds, runtime probes, publication or successor work.

The original CP map blocker is resolved by accepted M `3c35f62` and coordinator
independent replay recorded at `89d3796`. Inherit, without rerunning or rewriting,
[M's 80-row replay](../ts-034h6-m/cp-replay/results.json),
[M completion](../ts-034h6-m/completion.json), and the coordinator acceptance in
`../../../COORDINATION.md`. These are evidence of the bounded map fix and trusted
Object-link simulation, not evidence that C has executed.

The exact proposal is **three complete test files / seven replacements**:

| Old test | Replacements | Reason |
|---|---:|---|
| script-realm-bootstrap.ts | 4 | Original CP globals, prototype keys, guarded constructor metadata |
| harness-errors-a.ts | 1 | Original CP exact globals and positive graph assertions |
| harness-map-default.ts | 2 | Preserve absent-constructor coverage and account for inherited Object under legacy operation policy |

The first five replacements and their entire proposed files are byte-identical
to CP. The new two replacements require explicit adoption by review before C:
they are not permission to edit old tests now. [REVIEW.md](REVIEW.md) explains
the one newly false expected outcome and the added controls preserving coverage.
All other bytes, including accepted M's H6-B migration, remain unchanged.

`replacement-manifest.json` has baseline/proposed SHA-256 hashes, byte offsets,
old/new text and reasons. `proposed/test/` contains complete files;
`proposed.patch` is check-only applicable to the accepted checkout.
`baseline-hashes.json` protects 4221 tracked files, including 143 old test files
and all CP/MP/M history. TASKS and coordinator-owned COORDINATION are excluded.
`consumer-search.json` retains 334 broad test matches; it is an audit aid, not
blanket ownership. No extra production consumer or API change is proposed.

`frozen-traces.json` retains CP's 16 literal host-hook traces, including T13–T18
and F12: 200 fresh/seven-seeded prefixes per input, explicit per-input terminals,
calls and abrupt variants. `matrix-map.json` retains all F01–F12 fixed rows.
`parsed-traces.json` adds four explicitly nonstrict parsed-accessor schedules:
94 prefixes and 32 call controls per input. These are offline proposals, not
executed controls. The accepted M parsed schedule remains immutable (return8,
throw7); new C schedules include its previously omitted lexical setup tick.

Reproduce from the repository root:

```
wsl python3 /mnt/c/Users/jonku/code/rift/typescript/docs/validation/ts-034h6-cp2/render.py
node typescript/docs/validation/ts-034h6-cp2/freeze.mjs
node typescript/docs/validation/ts-034h6-cp2/parsed-freeze.mjs
node typescript/docs/validation/ts-034h6-cp2/verify.mjs
node typescript/docs/validation/ts-034h6-cp2/parsed-verify.mjs
node typescript/docs/validation/ts-034h6-cp2/audit.mjs
node typescript/docs/validation/ts-034h6-cp2/syntax.mjs
```

`verification.json` records whole-file reconstruction, patch check, independent
literal oracle checks, 13 rejected oracle mutations and one rejected manifest
mutation. `parsed-verification.json` records five additional rejected mutations.
`audit.json` records actual API/source hashes, unchanged M schedules and inventory
assertions, the one changed profile case, and the inherited 80 replay rows.
`syntax.json` establishes only absence of TS1xxx diagnostics in detached copies;
unresolved imports are expected, and no typecheck/native feasibility is claimed.
The Windows Python alias was unavailable and sandbox WSL initially denied access;
the approved WSL renderer completed successfully, writing only here.

Future C acceptance needs actual implementation, fresh targeted and inherited
runtime validation, and review. At this base there are **57** accepted native
gates; C adds one for **58**, preserving all 212 records per lane. The older
H6-P cumulative count predates M. No new gate is added by CP2. All 60 blocked
variants remain unchanged. Stop here for coordinator review.
