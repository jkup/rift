# Running and testing Rift

With Node 24 or later, run from the repository root:

```sh
npm ci
npm run build:node
node build/node/src/cli.js examples/counter.js
node build/node/src/cli.js -e 'console.log(6 * 7);'
```

The counter prints `total 36`, `next 14`, and `same object true` on separate lines.

## Native builds (optional)

Prepare the [patched compiler](../toolchain/scriptc/README.md) and put Zig 0.16.0
on PATH. `npm ci` does not install either. Then run:

```sh
npm run build:native
./build/native/rift examples/counter.js
```

On Windows use `.\build\native\rift.exe`. The build compiles the CLI and all
native test drivers. It uses two workers; `RIFT_NATIVE_JOBS` sets another positive
worker count. Reports are written to `build/native-build-results.json`.

## CLI

Use a filename or `-e SOURCE`. A leading `--time-zone America/New_York` or
`--time-zone +05:30` selects the Date timezone. UTC is the default, independent
of the host timezone. Named-zone gaps move forward; overlaps use the earlier
instant. Invalid options fail before reading or executing the script.

| Exit | Meaning |
| --- | --- |
| 0 | Success |
| 1 | Guest runtime failure or uncaught throw |
| 2 | Parse failure, including source or syntax limits |
| 64 | Invalid invocation |
| 66 | Unreadable source file |
| 70 | Unexpected host or implementation fault |

Diagnostics include the filename and one-based line and UTF-16 column.

## Embedding

For a TypeScript host inside this checkout, import the current API from `src/script.ts`
(use a relative `.js` import as below). External Node hosts can import the emitted
`build/node/src/script.js` after building. The API is experimental.

```ts
import {
    createScriptRealm,
    prepareBoundedScript,
    createScriptSession,
    evaluateScript,
    drainScriptJobs,
} from "./src/script.js";

const realm = createScriptRealm((line: string) => console.log(line));
const prepared = prepareBoundedScript(
    { id: "example.js", text: "Promise.resolve(42).then(value => console.log(value));" },
    realm,
);
if (prepared.kind !== "ready") {
    throw new Error("Script preparation failed: " + prepared.kind);
}
const session = createScriptSession({ maxSteps: 100000, maxCalls: 64 });
const result = evaluateScript(session, prepared.record);
if (result.completion.type === "throw") {
    console.error(result.completion.diagnostic);
}
// Run queued jobs even after a guest throw, as the CLI does.
const jobs = drainScriptJobs(session);
for (const failure of jobs.failures) {
    console.error(failure.completion.diagnostic);
}
```

A Realm owns guest globals and builtins. A session tracks execution and its shared
budget; reuse both to run successive scripts in the same guest world. Use a fresh
Realm and session for an independent run. Preparation returns an opaque executable
record or a rejection; guest throws are completion records, not host exceptions.
Job failures and resource stops must be checked as well as the script's completion.
The older `interpreter.ts` and `evaluator.ts` interfaces serve legacy regression
tests and are not the starting point for new hosts.

## Validation

The normal contributor checks are in [CONTRIBUTING.md](../CONTRIBUTING.md).
For native or toolchain work, also use:

```sh
npm run test:compiler
npm run test:guest:native
```

`test:guest:node` and `test:guest:native` build their respective lane before
running it. Each case checks expected output, exit status and relevant error
details. Reports go to `build/guest-{node,native}-results.json`. Unsupported-input
tests check rejection; they do not establish support for those features.

The broader tooling suite requires built Node and native drivers and a small
pinned Test262 selection:

```sh
node tools/test262/prepare-corpus.mjs
npm run test:test262
node tools/test262/script-observation.integration.mjs
```

Preparation verifies upstream Git blob hashes. Pass an existing Test262 checkout
for offline preparation. `RIFT_TEST262_ROOT` overrides `build/test262-corpus`;
`RIFT_TEST_OUTPUT_ROOT` overrides scratch output under `build/test262-tests`.

For corpus execution, use `npm run test262`; see the
[Test262 guide](../tools/test262/README.md). Keep passes, failures, skips,
unsupported cases, resource limits, crashes and harness errors separate.
A focused run is not a full conformance result.
