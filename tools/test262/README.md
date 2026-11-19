# test262 tooling

## Native corpus runner

With the pinned compiler installed and Zig 0.16.0 on PATH, run:

```sh
# One-time corpus setup, alongside the Rift checkout (disable CRLF conversion).
git -c core.autocrlf=false clone --depth 1 https://github.com/tc39/test262.git ../test262
npm run test262

# Focused development runs:
npm run test262 -- --filter built-ins/Math --jobs 8
npm run test262 -- --corpus /path/to/test262 --timeout 5000
npm run test262 -- --help
```

On Windows x64, the runner automatically uses the existing pinned bundle at
`build/windows-toolchains/zig/zig-x86_64-windows-0.16.0/zig.exe` when available.
Otherwise it checks the Zig on PATH and reports a setup error for another version.

The command builds **one** native execution driver in a unique run directory,
checks static-only compilation and zero-dynamic coverage, checks the corpus's
assertion harness, then runs selected tests. It does not rebuild the hundreds of
native regression executables. Each variant has its own process and fresh Realm;
a bounded worker pool defaults to available CPUs capped at eight. Shared includes
are read once and snapshotted by content hash. No per-test source-tree hashing,
preflight matrix, Node comparison lane, or historical ledger is needed.

The runner follows [Test262's execution instructions](https://github.com/tc39/test262/blob/main/INTERPRETING.md):
ordinary tests run in both modes, flags select strict/sloppy/raw variants, fixtures
are excluded, and the actual assert/sta/includes execute before the test. Parse
negatives never evaluate the test body. A negative passes only with structured
evidence for the expected phase and error type. Unsupported parser diagnostics
cannot satisfy a SyntaxError expectation. The existing validated driver and its
closed protocol decoder are reused without changing the engine.

Module loading, async completion/agents, Intl, and test262 host services are not
available in this driver and are reported as explicit profile skips. The host
service check conservatively scans test and include text for `$262`/`$DONE`, so
mentions in comments or strings can also skip a variant. Known unsupported
features are maintained in `runner-policy.json`; `--no-feature-skips` attempts
those features for auditing. Unrecognized features are attempted, not silently
excluded. Actual unsupported execution, resource limits, timeouts, output limits,
crashes, malformed results, input errors and harness failures remain separate.

`build/test262-runs/run-*/report.json` contains every selected variant, skip reason,
structured observation, process outcome and elapsed time. `selection.json` records
input hashes before execution; `build.json` retains build/coverage logs and
`controls.json` the assertion checks. Sources remain available for reproductions.
Files with invalid metadata have one `input-error` entry and a null variant because
their variant count is unknown; known variants with missing includes each retain
their own input error. Reports include the discovered and selected file counts;
filtered results are not a full-suite conformance claim. Exit 0 means all attempted
variants passed (explicit skips may remain), 1 means semantic failures, unsupported
execution or resource limits, and 2 means infrastructure/input failure or interruption.

`--corpus` overrides `RIFT_TEST262_ROOT`, which overrides `../test262`. The old
`prepare-corpus.mjs` downloads only 33 pinned regression files; use that directory
explicitly for a small smoke run. The new runner accepts any local corpus and
identifies its actual input bytes rather than asserting the old frozen revision.

Run `npm run build:node && npm run test:test262:runner` for focused runner tests.
The older tools below remain available for historical evidence and specialized
protocol regression tests; they are not the new command's execution path.

Build the Node and native drivers first; see the [project README](../../README.md#validation)
for the pinned toolchain and preparation steps. From the repository root:

```sh
node tools/test262/prepare-corpus.mjs
npm run test:test262
node tools/test262/script-observation.integration.mjs
```

Preparation verifies 33 test files and three harness files from the pinned
revision. An existing checkout can be supplied for offline preparation.
`RIFT_TEST262_ROOT` overrides the default `build/test262-corpus` location;
`RIFT_TEST_OUTPUT_ROOT` overrides shared test scratch output under
`build/test262-tests`. Some older tests have separate directories under `build/`.
Historical fixtures remain read-only inputs. The tooling source is explicitly
allowed by `.gitignore`; downloaded corpus files remain ignored.

The ordinary test suite covers planning, decoding, classification, execution
controls and failure handling. The Script integration command launches the real
drivers on registered controls in both hosts. These are regression and
observation results, not a test262 conformance score. A published corpus
conformance baseline remains roadmap work.

`parser-audits.test.mjs` runs the five standalone parser-audit drivers in both
hosts. It preserves 36 return sources, 62 block-function cases, 77 strict-parameter
cases, 102 assignment-target cases and 140 lexical-statement cases, including
both runtime input orders where supported (1318 child runs). It checks complete
audit outputs and internal driver invariants. Historical replay scripts also
compare whole-parser snapshots from their own milestones; those remain archival.

`script-inspection-drivers.test.mjs` exercises 136 metadata snapshots, 135
declaration plans and function winners, and 154 frozen serializer records in both
hosts. The declaration expectations use the accepted catch-scope schema. All
136/135 inputs are read after compilation; serializer checks cover both runtime
input files and exact ASCII bytes.

`number-radix.test.mjs` runs the existing exact radix oracle on all 14768 inputs
per host, including malformed controls, shortest-roundtrip checks and resource
bounds. Its reports go to a unique scratch directory. Direct invocation of
`tools/test-number-radix.mjs` defaults to `build/number-radix/`.

Start with `input.mjs` for pinned input validation, `script-plan.mjs` for Script
selection, `script-observe.mjs` for observation launches, and `script-result.mjs`
for result decoding. `test-support/` contains live test helpers; files under
`docs/validation/` record earlier milestones.

## Original host-only adapter, TS-031A

The following describes the original v1 adapter (`plan.mjs`, `result.mjs` and
`ledger.mjs`). Its implementation limits are historical and do not describe all
current Script tools in this directory.

This directory verifies and plans the frozen CL-004 selection. It cannot launch
Rift, Node guest execution, a native driver, or any other engine. Every production
variant is blocked. Synthetic classifier passes are test data, never corpus results.

From the repository root:

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
`harness/doneprintHandle.js`. The v1 planner does not download corpus files;
use the preparation command above.
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
The original files were explicitly tracked under the broad `test262/` ignore
rule. The current policy allows this tooling directory explicitly.

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
