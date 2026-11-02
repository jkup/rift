# Host-only test262 adapter, TS-031A

This directory verifies and plans the frozen CL-004 selection. It cannot launch
Rift, Node guest execution, a native driver, or any other engine. Every production
variant is blocked. Synthetic classifier passes are test data, never corpus results.

From `typescript/`:

```
npm run test:test262
node tools/test262/corpus.integration.mjs EXTERNAL_CORPUS_ROOT
node tools/test262/plan.mjs EXTERNAL_CORPUS_ROOT 91c70759363c46557b694792bf34a2551a7af5ba node PATHS.json NEW_OUTPUT_DIRECTORY
```

`PATHS.json` is an explicit array of unique paths drawn only from the frozen
33-entry manifest. To select the whole corpus, use its `entries[].path`, in order.
The output directory must not exist; its parent must exist. Choose a distinct
directory for each lane/run. The CLI writes an initial selection ledger, then
terminal preflight records and a report. Exit 1 is expected for a complete blocked
selection; exit 2 means unknown denominators, missing records or infrastructure
failure. It never reports success for blocked profiles. Exit 0 is reserved for an
all-pass selection (currently reachable only by synthetic report tests). Empty
production selections are rejected. No cache is implemented. Explicit retry attempts preserve the first result
as the headline and retain subsequent attempts without enlarging the denominator.

The external root must contain exact bytes from the full revision, including
`harness/assert.js`, `harness/sta.js`, and, for the async control,
`harness/doneprintHandle.js`. No corpus is downloaded by these tools or checked in.
The revision argument is checked against the pin; each selected test and needed
harness file is then independently attested by its frozen Git blob identity. This
does not trust a checkout's line-ending conversion or an unverified revision label.
Missing/corrupt includes are input errors even when the profile would be blocked.
Additional includes without a frozen blob fail closed; the frozen selection has
none. Raw includes retain validated metadata but load no harness.

`input.mjs` owns byte identity, strict UTF-8 decoding, YAML validation, path
containment and planning. `result.mjs` owns the closed v1 envelope and pure
classifier. `ledger.mjs` preserves selection/attempts and reports per lane.
`plan.mjs` supplies host-only `not-run` records with unavailable engine facts null.
`fixtures.mjs` contains synthetic test data and is not imported by production.
The repository's broad `test262/` ignore rule also matches this tooling; initial
files are explicitly tracked without changing the root ignore policy.

The v1 envelope groups the design's fields into `identity`, `inputs`, `evidence`,
`observation`, and, only in conformance mode, `classification`. All records are
closed. `inspectEnvelope` takes separately supplied parent transport facts and a
closed parent-owned context `{identity, inputs, expectedNegative, blockers}`; it
never reads stdout as protocol. The parent prepares this context from verified
metadata and configured policy before receiving any envelope. Every Identity and
Inputs field, including ordered harness inputs and limits, must match it. Expected
negative phase/type/null and blockers also must match; self-consistent envelope
classifications do not select their own expectations. The old identity-only call
fails closed. Deadline, abnormal
termination and output caps override a nominal envelope. This is a pure boundary,
not an implemented subprocess supervisor. `parseEnvelope` requires JSON syntax
and rejects duplicate keys, including equivalent escaped keys. Observation modes
omit classification and cannot enter a conformance ledger.

`prepareSelection` attaches a parent-owned `resultContext` to each planned variant
before `newLedger` snapshots the selection and before any result is constructed.
`appendAttempt` requires that context and checks its expectation/blockers against
the planned metadata/policy as well as checking the received result against the
full context. Missing metadata, context or policy fails closed. Known input errors
and blockers require the corresponding input/preflight not-run stage. The pure
`classify` API and `validateRecord` share all schema and cross-field validation;
`classify` rejects observation-only modes and contradictory supplied classifications.
`parseEnvelope` alone checks self-consistency; ingestion must use `inspectEnvelope`
or `appendAttempt` to bind the result to its parent-owned plan.

Resource-limit counts describe the actual guard state, not a fabricated attempted
count. `calls` is the active call depth checked before increment in
`src/evaluator.ts`: `count >= limit`, including 64/64 and 0/0, is a guard failure.
`source-units` is measured source length; `parse-depth`, `steps`, and
`evaluation-depth` count after increment; `output` is measured captured bytes.
Those guards require `count > limit`. Counts/limits are nonnegative safe integers,
unknown guard codes are rejected, and any known corresponding Inputs limit must
equal the observation limit. Every guard remains resource-limit even when negative
metadata names RangeError or SyntaxError. No runtime guard changed.

A runtime throw contains `valueKind` and a closed `constructor` record with
`outcome`, `name`, `realmId`, `secondary`. `available` represents evidence that a
future trusted driver read an actual callable guest constructor's string name;
it requires a name and defining Realm. `absent`, `abrupt`, and `unsupported` carry
no inferred name; abrupt retains secondary completion evidence as an opaque string.
No extraction code or real guest Error implementation exists here. Audited parse
rule names are accepted only as injected evidence until the engine supplies them.
Unknown rules are rejected, never promoted from diagnostic text. A future driver
must establish trust, effect counts and all semantic H/C prerequisites before
these envelopes can become execution evidence.

YAML uses exact host-only dev dependency `yaml@2.8.3` (ISC, Eemeli Aro), with the
registry tarball/integrity in package-lock.json. Its documented parseDocument API
supports duplicate-key rejection, flow/block YAML, folded prose and error reporting:
https://eemeli.org/yaml/. Aliases, anchors, explicit tags, unknown execution fields
and warnings fail closed in this bounded adapter. Legacy numeric es5id/es6id values
are retained as informational scalars. The 2.8.3 patch fixes the deep-collection
stack-overflow advisory GHSA-48c2-rrv3-qjmp; install used `--ignore-scripts` and npm
audit reported zero vulnerabilities. Existing toolchain pins are unchanged.

See `docs/validation/ts-031a/` for actual evidence and all 115 acceptance rows.
No Script profile, harness execution, Error identity, native execution, conformance
coverage or new compiler capability is claimed by this milestone.
