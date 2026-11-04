# H6-A internal Error allocation kernel

Implementation candidate on `codex/test262-classification`, base
`fdac41d0754a838197fe828a5f11c819314f9a01`. Awaiting coordinator actual and
independent second acceptance. No successor work or publication is authorized.

The three owned production files add the `ErrorName` union and `GuestError`
brand, five internal per-Script-Realm ordinary prototypes with name/message
metadata, and trusted `getErrorPrototype`/`createError` APIs. The factory uses
intrinsic identity, performs no guest calls or ticks, and rejects legacy/missing
entries. Object.prototype.toString classifies branded objects as Error before
the unchanged toStringTag lookup. Relinking does not remove the brand, and
ordinary objects borrowing a prototype do not acquire it.

No Error constructor, public global, Error.prototype.toString, failure producer,
conversion signature, construction dispatcher, observer or admission changed.
Legacy behavior and all old tests remain unchanged.

## Frozen controls

`frozen-contract.md` and `freeze.json` were written before production edits.
Both exact runtime inputs are read after compilation. `test/harness-errors-a.ts`
runs A01–A09 for each: fresh identities/messages, all five family graphs and
descriptors, private brand under relinking, fake/prototype Object tags, string
and nonstring toStringTag plus exact abrupt identity and tick-before-Get,
defining-Realm allocation from another Realm, fabricated/retained callback
denial, exact three-tick budgets and source provenance, and legacy misuse.

A08 runs all three failures and two success limits for fresh and seven-seeded
sessions in both same-Realm and cross-Realm calls (20 cases per runtime input),
plus calls0/1 for both seeds (four more). Source columns are literally1,1,6;
the failure prefixes allocate nothing and all exits restore idle state. A06
also checks active defining Realm/caller record and unchanged steps across the
factory call. The two source payloads remain seven and eleven, not constants
compiled into the driver.

## Validation

`validation-summary.json` and the retained subprocess records report:

- A01–A09 on Node/native, both runtime inputs; kernel3728/3728 static.
- All55 static-only builds, each with separate zero-dynamic coverage.
- Original212 exact records per host; original54 gates preserved.
- H1–H5 literal matrices including H5's172 prefixes, E4, all17 inherited
  replay groups, both Node boundaries and Node forged-slot controls.
- Typecheck, runner20, probes10, Test262 host73, observations22.
- 3780 protected files,138 unchanged old test files, zero migrations,
  and60 still-blocked corpus variants.

`AMENDMENTS.md` explains the independently approved test-only key comparison,
the already-authorized Builtin callback annotation and retained unsuccessful
environment/compiler attempts. The full-build first54 entries are final;
only the new driver gate was refreshed after its approved test adjustment.
The checkpoint summary intentionally retains the earlier pre-approval state.

From the TypeScript directory, replay with `npm run build:node`,
`npm run build:native`, this directory's `validate.mjs`, `feature-checks.mjs`,
`final-checks.mjs`, `preserve.mjs` and `summarize.mjs`, plus
`suites.mjs typecheck runner guests-node host observations probes`.
Native compilation requires the installed pinned Zig on PATH with library
access. Replays write only this new evidence directory or ignored build output;
all historical evidence remains untouched.

Sole writer chat `01a1a72c-af5d-7a72-9340-0b7bc8dbb5d4`.
COORDINATION.md is coordinator-owned and excluded from the candidate commit.
