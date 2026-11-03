# TS-033E3B declaration setup

Base: `3c76a88`, following accepted E3A `d33504c`. The literal design matrix was
copied to `frozen-matrix.md` and TASKS claimed before production edits.

Production changes are confined to `src/script-record.ts`. Function setup uses
E3A's private callable, activation key and phase. Block allocation introduces the
same activation-owned key/scope/phase discipline. The record owns no activation
collection. Both setup paths validate before beginning, copy function arguments
before ticking, preserve partial bindings on failure, and reject subsequent
setup of started or completed activations.

Function setup scans all var occurrences in reverse, creates/initializes formals,
visits vars forward, creates body lexical TDZ bindings, and publishes only the
last function per name in winning source order. Block functions initialize
immediately in lexical order. Genuine closures capture the new environment.
The global wrapper passes the private plan to the unchanged D2 orchestrator; its
five-argument adapter checks exact declaration/function/unit/environment/context
identities and invokes the accepted factory. Global admission is rerun each time.

No initializer or body is evaluated, no frame is activated, no guard is relaxed,
and no ER/E4/profile/CLI/observation/conformance admission is added. No arguments
binding/object is created; this remains the accepted subset debt. Restricted
function properties still await ER. There is no mutable AST or plan accessor.

## Controls

`test/script-function-setup.ts` runs with `seed|7` and `other|11`. It asserts the
literal function18/block6/global12 trace arrays, every successful budget0..N and
host exception at each failed prefix, original completion/Error identity and
resource origin/location, full binding absence/TDZ/value state, detached completed
allocation counts, saved nonzero calls/depth and Realm, and monotonic steps.
The original D2 eleven-tick marker trace is also replayed.

S01/S02 cover missing/extra and tick-mutated argument arrays with exact Value
identity. S03/S07 cover parameter/var/function collisions, last winner/source
ordering, duplicate var occurrences and preparation conflicts. S04 checks sibling
and invocation function/prototype freshness, live capture and same-Realm
cross-record outers. S06 and B03 reject base/copied-public-field environments,
foreign records/contexts/scopes and retries; mismatch checks leave fresh ownership
usable. B01-B03 cover lexical publication prefixes, untaken host projection,
sibling and nested block identity. G01-G03 cover marker/real adapters, current
admission after nonwritable global changes, detached inspection mutations and
rejection of substituted public identities. A function-only neighbor tests G02's
function admission specifically because repeating G01's let would fail earlier.

P02 is explicitly **tick-boundary coverage**, not environment-subclass injection:
the activation constructors/brands are private. P03 checks exhaustion after a
successful setup and an independent context. All new typed controls run in both
runtime lanes. No new hostile-cast lane split is used; unchanged E3A's two approved
Node-only negatives/native compile-rejection controls are replayed separately.

## Compiler evidence

`initial-build.txt` and `initial-coverage.txt` retain the first test-only SC1090
failure: shorthand access to a constructor parameter property has no lowering.
`parameter-before.ts` and `parameter-after.ts`, with `reduction-results.json`,
reduce this to explicit `this.realm` access, the form already used by E3A's test.
Both compile with TypeScript and print11 in Node; only the latter builds under
scriptc and prints11 natively with zero dynamic coverage. This changes no
production API or compiler pin. Native linking initially encountered the known
sandbox Zig installation-access failure; the elevated pinned build succeeded.

## Reproduction

From `typescript`, with pinned Zig on PATH and library access:

```
node docs/validation/ts-033e3b/suites.mjs typecheck test:runner test:guest:node test:guest:native test:probes test:test262 test:observations
node docs/validation/ts-033e3b/validate.mjs node native
node docs/validation/ts-033e3b/reduce.mjs
node docs/validation/ts-033e3b/replays.mjs
node docs/validation/ts-033e3b/preserve.mjs
```

The replay harness copies unchanged earlier validators into this evidence
directory, so new transcripts do not overwrite historical evidence. Its E3A
compiler reductions read the original unchanged sources and write new results
here. Preservation compares all inherited212 exact result objects in each lane
and all45 old native gate entries, independently parses every separate raw
coverage report, checks all60 blocked corpus variants and protects every
non-owned tracked path (including C++, pins and earlier evidence).

## Final results

Full rebuilt Node/native guest lanes each pass212/212 with no skips; every old
result object is unchanged. All46 static-only builds and separate coverage gates
pass (45 inherited plus setup); independently parsed coverage is zero dynamic
throughout: CLI2622, E3A2851, E3B2484 static statements. Runner20, probes10,
host73, observations22 and typecheck pass. `suite-typecheck.json` retains the full
suite. The final explicit numeric S02 and adapter-copy additions were followed
by `refresh-driver.mjs`: it typechecks, rebuilds the affected native driver,
parses its separate coverage and reruns both inputs in both hosts, replacing only
that additive gate's record. `final-driver-results.json` includes its source hash.

`replays-results.json` and individual transcripts retain E3A/E2/E1 two-input
controls, unchanged E3A hostile-cast and reachability reductions, D1 planner135
and baseline207, metadata136/42 and stress8, global15/bootstrap18, and D2 two-input
replays. All pass. `preservation.json` verifies2727 protected files, all60 blocked
corpus variants, exact old212 result objects per lane and all45 old gate entries.
No historical evidence, C++, pin, admission policy or inherited source fixture
changed. The only new compiler adjustment is the reduced test-context parameter
property spelling described above.

Implementation is complete for independent review; it is not coordinator
acceptance. No successor, main merge or publication was performed.
