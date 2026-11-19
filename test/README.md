# Tests

The root TypeScript files are interpreter test drivers. `cases.json` supplies CLI
inputs and expected results for `tools/run-guests.mjs`.

- `fixtures/`: guest programs, runtime inputs, reference data and the legacy regression corpus.
- `compiler/`: ten small checks of TypeScript behavior used by Rift under ScriptC.

Run `npm test` for runner tests and Node guest regressions, or `npm run test:compiler`
for both-host compiler checks. Native setup and further commands are in the
[validation reference](../docs/usage.md).
