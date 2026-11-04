# Legacy diagnostic review correction

Correction to candidate76a0718, requested by second review on 2026-11-04.
The legacy statement dispatcher now has separate var and try-catch rejection
arms. Var again throws exactly `Script var AST requires Script execution`;
the new arm throws `Script try-catch AST requires Script execution`.

The new H1 test directly exercises both trusted-host legacy AST paths, checks
literal Error messages and verifies zero steps/calls/depth/binding effects.
All existing tests remain unchanged from the approved76a0718 amendment.

Typecheck passed. `final-driver-build.json` retains a fresh catch-driver
static-only build and separate zero-dynamic coverage. `catch-results.json`
passes both runtime sources in Node and native, including the added diagnostic
controls and the entire prior H1 matrix/104 resource prefixes.
`final-source-hashes.json` binds corrected production and tests.

`preservation.json` again verifies212 exact prior records,3154 protected files,
the exact two-site E4 amendment and60 blocked variants. The aggregate50-gate
file contains the fresh catch gate plus49 retained prior gates: those49 and the
full suites were deliberately not rerun for this correction, per coordinator
instruction. Original candidate evidence remains unchanged. Root independent
full validation follows this corrected candidate; no acceptance/publication claim.

From `typescript` with pinned Zig on PATH:

```text
npm run typecheck
node docs/validation/ts-034h1/legacy-diagnostic/build.mjs
node docs/validation/ts-034h1/legacy-diagnostic/validate.mjs
node docs/validation/ts-034h1/legacy-diagnostic/preserve.mjs
```

Use this validation entry for the corrected driver: its expected stdout includes
the additional diagnostic-control label. The original H1 validator and results
remain the historical76a0718 evidence.
