# TS-031B-B observation driver and parent transport

Implementation on `codex/test262-classification`, assignment base `71e4b63`.
Scope B only; independent review is required. No syntax certification, Error
extraction, harness execution, profile admission or conformance execution was added.

`src/observation-driver.ts` is a separate entry point. It validates all seven
arguments before creating a Realm, observes one source unit, and writes only the
fixed child schema. Guest stdout stays on its own pipe. Host failures exit 70.
`observation-json.ts` serializes known typed fields, escaping all non-ASCII UTF-16
units individually, including lone surrogates. It never traverses guest objects.

`tools/test262/observe.mjs` owns verified source bytes and transforms, private fresh
attempt directories, nonce, actual build digest, engine commit/dirty source digest,
policy and adapter digests, and transport events. A private snapshot binds each
plan, including across asynchronous launch validation. Attempts launch once.
Original selection metadata (including required harness, negative and blockers)
is archived separately; loaded harness is always empty. Node build identity hashes
the Node executable and emitted source modules; native identity hashes the actual
driver executable. Source is written exclusively and read-only, and reverified
along with executable identity before launch.

The strict child parser rejects duplicate decoded keys, invalid UTF-8/JSON,
unknown or extra fields, stale bindings and payloads above 65536 bytes. Parent
composition uses terminalRecord/validateRecord/assertContext and inspectEnvelope.
Deadline wins over independent crash, which wins over output cap, then protocol
and semantic observation. A deliberate cap kill retains its real exit/signal;
the first crossing count is retained even if further buffered output arrives.
Both pipes contribute bytes, not characters. Cancellation retains an unfinished
archive. No observation goes through classification or appendAttempt.

The only old fixture migration was explicitly approved by the coordinator:
`harnessValidated: stage === 'test' && mode === 'conformance'`. This repairs the
synthetic observation inputs to match the frozen invariant while preserving every
old assertion and every conformance fixture value. The result.mjs change is only
the specified mode-gated harness invariant. The audit enforces these exact diffs.

## Validation

| Check | Result | Evidence |
|---|---|---|
| Typecheck | PASS | typecheck.log |
| Runner rules | 20/20 | runner.log |
| Compiler probes | 10/10, both hosts and static coverage | probes.log, probe-results.json |
| Full rebuilt guest lanes | Node 212/212; native 212/212; no skips | node.log, native.log, guest-*-results.json |
| Static-only builds and separate coverage | 35/35; all 33 old gates preserved | native-build-results.json, preservation-and-coverage.json |
| New driver | 1614/1614 static | native-build-results.json |
| Serializer/getter host control | 1601/1601 static; both hosts | serialization-build.log, serialization-coverage.log, observations.log |
| Host controls | 71/71 = 66 old + 5 additive | host.log |
| Real observation controls | 14/14, Node and native | observations.log, observations-final/ |
| Pinned corpus controls | 4/4; 33 files/60 variants per lane, zero execution/pass | corpus.log, *-ledger.json, *-report.json |
| Preservation/CLI/inventory | PASS | audit.log, audit.mjs, cli.json, inventory.json, callers.json |

All 212 old names, expectations and actual stdout/stderr/status records are
unchanged in each lane. All old semantic source/test files, CLI, conformance
planner/input/ledger, pins and probes are unchanged. The serializer control was
rebuilt again after making the lone high/low surrogate inputs explicitly separate;
its independent coverage remains 1601/1601. The [matrix](matrix.md) maps T01–T32
and applicable V controls. Existing A checks continue to exercise seeded cleanup,
foreign Realms, and actual default64 native recursion. The separate observation
suite also executes actual default100000-step/default64-call limits in both lanes.

`observations-final/manifest.json` indexes the successful run's raw attempt
archives: verified source, untrusted child JSON, stdout/stderr bytes, parent
transport facts, original selection and accepted observation, plus the unfinished
cancelled attempt. These are synthetic observation sources, not conformance
results. The corpus ledgers remain the unchanged host-only planning controls.

## Retained failures and limits

- `driver-build-initial.log`: sandbox could not access Zig's installation. The
  authorized native build succeeded; initial separate coverage was already static.
- `host-initial-failed.log`: 64/70 before fixture approval, with three fixture
  construction failures and three Windows sandbox filesystem failures. The
  approved one-line migration and authorized filesystem run yield 71/71 after
  adding the byte-counter control. No old assertion was removed or relaxed.
- `observations-initial.log`: 10/12 during an early run before the final native
  serializer target existed, plus sandbox junction denial. This was a premature
  test run, not an accepted native result.
- `observations-file-symlink-denied.log`: Windows denies creation of a file symlink
  even outside the sandbox. Actual junctions at the result path and archive root,
  plus a hardlink result alias and a preexisting regular file, exercise rejection
  and preservation. File-symlink creation itself is not claimed as measured.
- `observations-archive-reuse-denied.log`: rerunning evidence export encountered
  read-only archived source files. Export now requires a fresh destination, as
  production attempts already did. The earlier `observations/` directory is
  retained as non-final evidence; only `observations-final/` is the final run.

No static compiler failure or dynamic-tier workaround occurred, so no compiler
reduction was necessary. Evidence is Windows x64 only. Nonce/path controls do not
authenticate a malicious arbitrary executable; that remains outside the frozen
trust model. The parent does not implement a conformance runner. Raw constructor
accessors cannot be defined in current guest syntax; T32 uses an effectful host
GuestObject property hook, through a real body observation and serializer, in
both compiled hosts. CLI host-fault injection is Node-only; existing native
host-fault/cleanup controls remain in the unchanged structured-outcomes suite.

## Reproduction

From `typescript/`, with the pinned Zig directory on PATH and filesystem access:

```text
npm run typecheck
npm run test:runner
npm run test:probes
npm run test:guest:node
npm run test:guest:native
npm run test:test262
npm run test:observations
node tools/test262/corpus.integration.mjs C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075
node docs/validation/ts-031b-b/audit.mjs
```

For a pinned-corpus observation, create an empty archive parent and a limits JSON
object (use `{}` for defaults), then invoke:

```text
node tools/test262/observe.mjs ROOT REVISION PATH VARIANT node|native parser-observation|body-observation ARCHIVE_PARENT LIMITS.json
```

The CLI uses planCorpus to verify the selected pinned bytes and metadata first.
Modules remain rejected. This opt-in operation observes source with the requested
strict/raw/non-strict transform and without loading any required harness; the
original blockers remain archived. It never creates a conformance pass/fail.
