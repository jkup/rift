# test262 runner semantics audit (CL-002)

This audits the C++ project's test262 runner (`scripts/test262/`, `npm run test262`) against the
test262 interpretation rules. It ends with a checklist and a validation matrix for a future
TypeScript adapter. Implementing that adapter is out of scope.

- Base commit: `0819c71` (main, 2026-11-01).
- Upstream consulted: tc39/test262 `main` at
  [`91c7075`](https://github.com/tc39/test262/tree/91c70759363c46557b694792bf34a2551a7af5ba)
  (committed 2026-10-29). The rules come from
  [`INTERPRETING.md`](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/INTERPRETING.md).
  The `harness/assert.js` comparison and the example tests were read at the same revision through
  the GitHub API. The suite was not downloaded.
- Evidence labels: **[static]** means read from runner or engine source. **[upstream]** means read
  from test262 at the revision above. **[inference]** means a consequence of the two that was not
  executed. Neither the runner nor the C++ engine was run for this audit.

File references below are against the base commit. `core.js` means `scripts/test262/core.js`.

## How a result is produced today

[static] `runSingleTest` (`core.js:584-668`) parses YAML frontmatter, skips tests with unsupported
features or the `async` flag, picks strict/non-strict runs from flags, and for each run:

1. Builds the source: optional `"use strict";\n`, then `harness-compat.js`, then each `includes`
   file except `assert.js`/`sta.js` and an `UNSUPPORTED_HARNESS` list, then the test (`core.js:323-366`).
2. Writes it to a temp file and runs `build/rift <file>` with `execSync`, a 5 s timeout and piped
   stdio (`core.js:440-448`).
3. Classifies the result from the **exit status plus substrings of stdout/stderr**
   (`core.js:452-543`).

Two engine facts determine what those substrings mean:

- [static] An uncaught guest exception is printed to **stdout** as `Uncaught <value>` and the
  process **exits 0** (`src/main.cpp`, the `catch(const rift::core::JavaScriptException& e)` branch;
  message built in `include/rift/interpreter/javascript_exception.h:21-28`).
- [static] Parser SyntaxErrors are `std::runtime_error("SyntaxError: …")`
  (for example `src/frontend/parser/parser.cpp:58`). They are rethrown by `rift::JavaScript::execute`
  (`src/api/api.cpp:29-35`) and printed to **stderr** by `main` as `Error: SyntaxError: …`, with
  **exit 1**. Other parse errors are silently recovered by skipping to the next `;`
  (`src/frontend/parser/parser.cpp:141-153`).

So "exit 0" means either success or a guest throw. "Exit nonzero" means a parse SyntaxError, a host
fault, a crash or a timeout.

## Trace by feature

| Feature | Upstream rule | Current behavior | Verdict |
|---|---|---|---|
| Default (no flags) | Run twice, non-strict and strict ([Strict Mode](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/INTERPRETING.md#strict-mode)) | Non-strict, then strict; the first failure wins (`core.js:639-664`) | Correct |
| Strict transform | `"use strict";` + `\n` as the initial text, before other modifications | `'"use strict";\n'` before the harness (`core.js:328-330`) | Correct |
| `onlyStrict` / `noStrict` | One run in the named mode | `core.js:631-637` | Correct |
| `raw` | Unmodified source, **no harness files**, non-strict only | Non-strict only, but harness-compat and includes are still prepended (`core.js:624-626` plus unconditional `core.js:332`) | **Defect D3** |
| `module` | Module goal, strict transform **not** applied | Run as a *script* with `"use strict"` prepended (`core.js:627-630`) | **Defect D4** |
| `async` | Evaluate `doneprintHandle.js`; completion via `print('Test262:AsyncTestComplete')` | Always skipped (`core.js:566-572`, `606-613`). No `print` is defined anywhere (`harness-compat.js` or `src/`) | Skip is honest, but see D8 |
| `includes` | Evaluate in order after assert.js/sta.js | In order, but unsupported or missing files are **silently dropped** (`core.js:336-361`) | **Defect D5** |
| assert.js / sta.js | Must be evaluated (unless raw) | Replaced by the custom `harness-compat.js` (`core.js:28-31`) | **Defect D6** |
| `negative` | Must throw; constructor name **and phase** must match | Type matched by regex over output. Phase is never compared. Exit status decides which branch runs (`core.js:373-430`, `452-457`, `486-500`) | **Defects D1, D2** |
| `_FIXTURE` files | Not standalone tests | Excluded by name (`core.js:687`) | Correct |
| `CanBlockIs*`, `locale` | Run only when applicable | Ignored | Optional improvement |

## Correctness defects

Each defect has a code reference and a minimal scenario where the classification is wrong.

**D1. Runtime-phase negative tests always fail, even on a correct engine.** [static] A guest throw
exits 0, so it takes the success branch, which reports `Expected X to be thrown but test passed
without error` (`core.js:452-457`). [upstream]
[`test/language/global-code/decl-lex-restricted-global.js`](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/global-code/decl-lex-restricted-global.js)
is `negative: {phase: runtime, type: SyntaxError}` with the body `let undefined;`. [inference] An
engine that correctly throws a guest SyntaxError there prints `Uncaught SyntaxError: …` and exits
0, and the runner marks the test **failed**. The same applies to the `unresolvable;`
ReferenceError example in INTERPRETING.md.

**D2. Negative phase is not checked, and type matching is a text search.** [static] `negative.phase`
is parsed (`core.js:241-246`) but never read. A runtime throw cannot pass a negative test (see D1),
but a **parse-phase** test passes whenever the process exits nonzero and the output contains the
expected name anywhere. `extractErrorType` returns the first matching name in a fixed priority list
(`core.js:375-385`), not the type of the thrown value. Scenario: an expected TypeError at parse
phase, where the engine crashes with stderr text mentioning `TypeError:`, is **passed**.
INTERPRETING.md requires failure when "the error occurs at a phase that differs from the indicated
phase" ([negative](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/INTERPRETING.md#negative)).
Also, frontmatter `negative` without a `phase` defaults to `runtime` (`core.js:243`) instead of
being reported as a malformed test.

**D3. `raw` tests get the harness prepended, which changes their meaning.** [upstream]
[`test/language/directive-prologue/10.1.1-2gs.js`](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/directive-prologue/10.1.1-2gs.js)
is `flags: [raw]`, `negative: {phase: parse, type: SyntaxError}`. Its body is `"use strict"` (with
no semicolon) followed by `throw "Test262: …"` and `var public = 1;`. [inference] With
`harness-compat.js` prepended, the string is no longer the first statement of the directive
prologue. The script is not strict, `var public` parses, and the throw runs. That exits 0, so the
runner reports failure. Run unmodified, a correct engine reports a strict-mode SyntaxError and
passes. The runner therefore fails this test whether or not the engine is correct.

**D4. `module` tests run as strict scripts.** [static] `core.js:627-630` (its comment says "We don't
have module support, so run as strict"). [inference] Scenarios:
- Any parse-phase SyntaxError module test whose body contains `import`/`export`, for example a
  duplicate-export early error, is **passed**: script parsing rejects the `export` keyword itself
  with a SyntaxError, and phase and goal are not checked (D2).
- [upstream] Conversely,
  [`test/language/global-code/export.js`](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/global-code/export.js)
  is a *script* test expecting a parse SyntaxError for `export`. It is classified identically to
  the module case, so the runner cannot tell "module unsupported" from "scripts correctly reject
  export".
- Module-only semantics (top-level `this` is `undefined`, no `var` leakage to the global object)
  are tested against script semantics, and failures count as engine failures.

Modules should be skipped as unsupported until a module loader exists, not run in a different goal.

**D5. Unsupported or missing includes are dropped while the test still runs.** [static] Files in
`UNSUPPORTED_HARNESS` (`core.js:33-44`, for example `compareIterator.js`, `promiseHelper.js`,
`nativeFunctionMatcher.js`, `testTypedArray.js`) and includes that do not exist on disk
(`core.js:348-351`) are skipped silently. Only four names in `UNSUPPORTED_INCLUDES`
(`core.js:21-26`) cause a skip. Scenario: a test with `includes: [compareIterator.js]` runs without
`assert.compareIterator` and fails with a ReferenceError/TypeError, which is counted as an
**engine failure**. It is really a harness-setup error.

**D6. `harness-compat.js` weakens assertions relative to upstream assert.js.** [static/upstream]
- `assert.throws` (`harness-compat.js:85-150`) compares only `e.name`, accepts thrown strings that
  contain the expected name, and **accepts any thrown primitive** ("we can only verify something
  was thrown"). [upstream] assert.js fails non-objects and compares
  `thrown.constructor !== expectedErrorConstructor`
  ([assert.js @ 91c7075](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/harness/assert.js)).
  Scenarios: `assert.throws(TypeError, () => { throw 1; })` and
  `assert.throws(TypeError, () => { throw { name: "TypeError" }; })` both **pass**, and
  `assert.throws(Error, () => { throw "x"; })` passes.
- `Test262Error` returns a plain object with no prototype or constructor
  (`harness-compat.js:6-12`), and failures throw **strings** `"Test262Error: …"`. Tests that rely on
  `e instanceof Test262Error`, `e.constructor === Test262Error` or `Test262Error.thrower` see a
  different harness.
- `$262.evalScript` uses indirect `eval` (`harness-compat.js:330-335`). INTERPRETING.md requires
  ParseScript + ScriptEvaluation, where a top-level `let` creates a **global lexical binding**
  visible to later scripts, and a parse error throws without running any of the script. Indirect
  eval scopes `let`/`const` to that eval call.
- Unimplemented `$262.createRealm`, `detachArrayBuffer` and `agent.*` throw `"Test262Error: … not
  implemented"` (`harness-compat.js:338-362`). Those tests are counted as **assertion failures**,
  not as unsupported.

**D7. Positive tests pass or fail on substrings, not on uncaught-exception status.** [static]
`core.js:459-480` and `502-529`. With exit 0:
- `throw 42`, `throw undefined` and `throw {}` print `Uncaught 42` and so on, with no `Error`
  substring. The test is **passed**. Upstream: "Any uncaught exception must be interpreted as test
  failure" ([Test Results](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/INTERPRETING.md#test-results)).
- `main` also prints the script's completion value (`src/main.cpp`, `std::cout << result`). A test
  whose last expression statement evaluates to a string containing `TypeError`, `Error:` or
  `Exception` is **failed** even though nothing was thrown.

With a nonzero exit (crash, abort or timeout) **and any non-empty stdout without those words**, the
test is **passed**, as "Test completed successfully (runtime crashed during cleanup)"
(`core.js:502-528`). Because `main` prints the completion value (often `undefined`) before
teardown, a crash during destruction or GC shutdown counts as a pass.

**D8. Timeouts, crashes and harness errors are not distinct statuses.** [static] Statuses are only
`passed`/`failed`/`skipped`. A 5 s timeout (`core.js:445`) is reported as `Runtime crash: <execSync
message>`, or as a pass under D7. Worker exceptions become `failed` with `Worker error:`
(`worker.js:27-35`). Totals therefore mix engine failures with infrastructure failures.

**D9. Incremental cache keys miss classification inputs.** [static] A cached result is reused when
the test file mtime matches and the runtime binary's `mtime-size` fingerprint is unchanged
(`scripts/test262/cache.js`, `getRuntimeFingerprint` and `checkTest`). The key excludes
`core.js` (including `UNSUPPORTED_FEATURES`), `harness-compat.js`, the included `harness/*.js`
contents and the test262 revision. In `runner.js:409-450` cached results are counted **before** the
skip pre-filter (`runner.js:453-463`). Scenario: remove `"Proxy"` from `UNSUPPORTED_FEATURES` and
run `npm run test262 -- -i`. Every Proxy test keeps its cached `skipped` status until the engine is
rebuilt. Editing `harness-compat.js` likewise leaves stale passes and failures. (Applies only with
`--incremental`; the default run does not use the cache.)

**D10. Results are not tied to a test262 revision.** [static] The suite is cloned with
`--depth 1` from the default branch (`runner.js:285-288`) and never pinned. The results file records
`commit: process.env.GITHUB_SHA || "local"` (`results-tracker.js:15`), which is the Rift commit and
not the test262 revision. Two result files can differ only because upstream moved, and
`test262:diff` cannot tell them apart.

## Count and denominator effects

- [static] Skips are counted and shown separately, and both "Pass Rate (run)" and "Pass Rate (all)"
  are printed (`runner.js:497-516`). That part is sound.
- [inference] D1, D3 and D5 move tests from correct-engine passes into failures. D2, D4, D6 and D7
  move tests into passes that the engine has not earned. D8 merges infrastructure failures into
  engine failures. So none of the published pass rates is a calibrated measure, in either
  direction. This audit does not estimate the size of each effect, because no run was performed.
- [static] `UNSUPPORTED_PATTERNS` skips any test whose text matches `/\bwith\s*\(/`
  (`core.js:17-19`), including matches inside comments and strings, so skips may cover more tests
  than intended.
- [static] On a YAML parse failure, the fallback (`core.js:248-276`) recovers only `description` and
  `includes`. `flags`, `features` and `negative` are lost, so a negative test would silently become
  a positive one.

## Optional improvements (not correctness defects)

- Use a unique temp directory rather than `/tmp/test262_temp_<id>.js` (`worker.js:11`). That path
  is Unix-specific, and on Windows it resolves against the current drive root.
- Exit the runner nonzero when unexpected failures appear (it always exits 0 after printing).
- Honor `CanBlockIsFalse`/`CanBlockIsTrue` and `locale` explicitly, as skip reasons.
- Record the skip reason category (feature, flag, include) in result files so a denominator change
  is visible.

## Checklist for a trustworthy TypeScript adapter

1. **Outcome channel, not text scraping.** The adapter must receive a structured result from the
   engine, roughly
   `{ kind: "normal" | "throw", phase: "parse" | "runtime", value }` plus the thrown value's
   constructor name. For a CLI boundary, use a distinct exit status per outcome and a
   machine-readable line, never substring searches of free-form output.
2. Any uncaught throw in a positive test is a failure, whatever the thrown value is.
3. Negative tests: compare **phase and constructor name**. A parse-phase error must happen before any
   evaluation, so `$DONOTEVALUATE()` must not run.
4. Statuses: `pass`, `fail`, `skip(reason)`, `timeout`, `crash`, `harness-error`. Report each count.
   Never fold timeouts, crashes or harness errors into pass or fail.
5. Use upstream `assert.js` and `sta.js` unmodified. If a shim is unavoidable, it may only add
   missing host functions (`print`, `$262`), never weaken assertions.
6. `raw`: unmodified source, no harness, one non-strict run.
7. `module`: skip with reason `module-unsupported` until module loading exists. Never run as a
   script.
8. `async`: skip with reason until `print` and job draining exist. Afterwards, include
   `doneprintHandle.js`, wait for `Test262:AsyncTestComplete` or `Test262:AsyncTestFailure:`, and
   treat no signal within the time limit as a timeout.
9. Includes: a missing or unsupported include means skip or harness-error, never a silent drop.
10. Unimplemented `$262` features (`createRealm`, `agent`, `detachArrayBuffer`) mean skip with a
    reason.
11. Cache keys include the test content hash, the harness files used, the adapter/classifier
    version, the engine build identity and the test262 revision.
12. Pin a test262 commit and record it in every results file.

## Adapter-validation matrix

These are small synthetic inputs with the expected adapter classification. They describe adapter
behavior, are independent of Rift's internal APIs, and assume a conforming engine. "Harness" means
upstream assert.js + sta.js.

| # | Frontmatter | Body | Expected |
|---|---|---|---|
| 1 | — | `assert.sameValue(1, 1);` | pass (two runs) |
| 2 | — | `throw 42;` | **fail**: uncaught non-Error throw |
| 3 | — | `"TypeError: not really";` | pass: completion text is irrelevant |
| 4 | — | `assert.throws(TypeError, function () { throw 1; });` | **fail**: primitive is not a TypeError |
| 5 | — | `assert.throws(TypeError, function () { throw { name: "TypeError" }; });` | **fail**: constructor mismatch |
| 6 | `flags: [onlyStrict]` | `assert.sameValue((function () { return this; })(), undefined);` | pass, one run |
| 7 | `flags: [noStrict]` | `assert.sameValue((function () { return this; })(), this);` | pass, one run |
| 8 | — | `var public = 1;` | **fail** (strict run gets SyntaxError); non-strict run passes |
| 9 | `negative: {phase: parse, type: SyntaxError}`, `flags: [raw]` | `"use strict"\nthrow "x";\nvar public = 1;` | pass only if source is unmodified (no harness) |
| 10 | `negative: {phase: runtime, type: ReferenceError}` | `unresolvable;` | pass |
| 11 | `negative: {phase: parse, type: SyntaxError}` | `$DONOTEVALUATE();\nvar aⸯ;` | pass, with `$DONOTEVALUATE` never called |
| 12 | `negative: {phase: parse, type: SyntaxError}` | `throw new SyntaxError("late");` | **fail**: right type, wrong phase |
| 13 | `negative: {phase: runtime, type: TypeError}` | `throw new RangeError();` | **fail**: wrong constructor |
| 14 | `negative: {phase: runtime, type: TypeError}` | `1;` | **fail**: did not throw |
| 15 | `flags: [module]` | `export default 1;` | skip(module-unsupported). Later: pass, as a module, with no strict transform |
| 16 | `flags: [module]` | `assert.sameValue(this, undefined);` | skip now; later pass (module `this`) |
| 17 | `negative: {phase: parse, type: SyntaxError}`, `flags: [module]` | `export var a; export var a;` | skip now. Never "pass" because a script rejects `export` |
| 18 | `flags: [async]`, includes `doneprintHandle.js` | `Promise.resolve().then($DONE);` | skip now; later pass when `Test262:AsyncTestComplete` arrives |
| 19 | `flags: [async]` | `Promise.reject(new Error("x")).then($DONE, $DONE);` | later: **fail** (`Test262:AsyncTestFailure:` printed) |
| 20 | `flags: [async]` | `/* never calls $DONE */` | later: **timeout** |
| 21 | `includes: [doesNotExist.js]` | `1;` | harness-error, not fail |
| 22 | — | `while (true) {}` | timeout (distinct status) |
| 23 | — | `$262.createRealm();` (engine without realms) | skip(host-feature) or fail by declared policy, never an "assertion failure" |
| 24 | — | `$262.evalScript("let x = 1;"); assert.sameValue(x, 1);` | pass: global lexical binding persists across scripts |
| 25 | — | `assert.throws(SyntaxError, function () { $262.evalScript("let x; let x;"); });` | pass: parse error thrown and nothing evaluated |

Rows 2–5, 9, 12, 17, 21 and 22 are the cases the current runner gets wrong or cannot express
(D1–D8).

## Proposed follow-ups (not done here)

Each needs a coordinator assignment. This task changes no runner code.

1. C++ `main`: exit nonzero, with a parseable marker, on an uncaught guest exception. This is the
   prerequisite for D1, D2 and D7.
2. Skip `module` tests as unsupported (D4) and stop prepending the harness for `raw` (D3).
3. Make dropped includes and unimplemented `$262` features skip or harness-error (D5, D6).
4. Run upstream `assert.js`/`sta.js` once the C++ engine can, or restore upstream `assert.throws`
   semantics in the shim (D6).
5. Add timeout, crash and harness-error statuses (D8), widen the cache key (D9), pin and record the
   test262 revision (D10).
6. Expect published pass rates to move once these are fixed. They should be re-baselined, not
   compared across the change.
