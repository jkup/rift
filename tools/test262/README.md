# Test262

## Native corpus runner

With the [pinned compiler](../../toolchain/scriptc/README.md) installed and Zig
0.16.0 on PATH:

```sh
# One-time setup beside Rift. Reuse an existing checkout if you have one.
git -c core.autocrlf=false clone --depth 1 https://github.com/tc39/test262.git ../test262
npm run test262

# Focused runs:
npm run test262 -- --filter built-ins/Math --jobs 8
npm run test262 -- --corpus /path/to/test262 --timeout 5000
npm run test262 -- --help
```

`--corpus` overrides `RIFT_TEST262_ROOT`, which overrides `../test262`. The runner
records the actual input hashes; it accepts any local corpus revision. On Windows,
it uses the pinned Zig bundle under `build/windows-toolchains/zig/` when available.
Otherwise it checks Zig on PATH.

The command builds one execution driver, checks static-only compilation and zero
dynamic coverage, checks the assertion harness, then runs each variant in a fresh
process and Realm. Workers default to available CPUs capped at eight. Includes
are snapshotted once by content hash.

Ordinary tests run in strict and sloppy modes; flags select other combinations.
Harness includes execute before the test. Parse negatives never execute the body.
A negative test passes only when the reported phase and error type match;
unsupported syntax cannot satisfy a SyntaxError expectation.

Modules, async completion/agents, Intl and Test262 host services are explicit
profile skips. The conservative `$262`/`$DONE` scan can also skip mentions in
comments or strings. `runner-policy.json` lists known unsupported features;
`--no-feature-skips` attempts them. Unknown features are attempted.

## Results

Each run writes `build/test262-runs/run-*/` with input hashes, build and coverage
logs, harness checks and a report for every selected variant. Invalid metadata
has an unknown variant count. Failures, skips, unsupported execution, limits,
timeouts, crashes and input/harness errors remain separate. Filtered runs are not
full-suite conformance claims.

Exit 0 means all attempted variants passed; explicit skips may remain. Exit 1
means semantic failures, unsupported execution or resource limits. Exit 2 means
an infrastructure/input failure or interruption.

## Runner tests

```sh
npm run build:node
npm run test:test262:runner
```

The broader tooling suite also needs built native drivers and a small pinned
corpus. See [validation](../../docs/usage.md#validation). `prepare-corpus.mjs`
fetches only 33 regression tests and three harness files, not the full corpus.

`test-support/` contains helpers. `test/fixtures/tooling/` contains the fixed
regression inputs, including compressed protocol records. These test planning,
decoding, result classification, parser audits, checkpoint recovery and both-host
execution. Keep their expected results independent of the implementation under test.
