# Audit of the legacy custom JavaScript tests (CL-001)

Scope: the C++ project's `test/` tree and its harness, `test-runner.js` (`npm test`). The goal is to
find regression evidence the TypeScript rewrite can reuse, without assuming that today's harness
establishes correctness.

Base commit: `0819c71` (main, 2026-11-01). Evidence types are labeled throughout:

- **[static]**: read from source; file/line references are against the base commit.
- **[node]**: measured by running a copy of the file under Node v26.13.0 as a CommonJS script
  (sloppy mode). This shows reference behavior only, not Rift behavior.
- **[inference]**: a conclusion drawn from the two above, not measured.

The C++ engine was **not** built or run for this audit, so this document reports no Rift pass
rates.

## Reproducing the counts

```bash
node typescript/tools/assistance/custom-test-audit/inventory.mjs          # summary tables
node typescript/tools/assistance/custom-test-audit/inventory.mjs --json   # per-file records
```

The script only reads files. It walks `test/` recursively (nested directories included) and applies
ordered regular-expression rules for area and failure visibility. Its categories are heuristics,
since a comment mentioning `FAIL` counts as a marker, for example. The examples cited below were
checked by hand.

## Inventory

[static] `test/` contains **240 files, all `.js`**. `npm test` runs **225** of them, because
`findTestFiles` skips any directory named `skipped` (`test-runner.js:164-165`). No file starts with
`temp_`, which is the runner's other exclusion.

| Directory | .js files |
|---|---:|
| `test/` (root) | 208 |
| `test/skipped/` (not run) | 15 |
| `test/promise/` | 8 |
| `test/functions/` | 4 |
| `test/generators/` | 4 |
| `test/arrow-functions/` | 1 |

By area, for the 225 files that run. Areas come from filename rules, first match wins, so read these
as approximate groupings:

| Area | Files | Throw on failure | Print `FAIL:`/`❌` | Invisible markers | Comparison booleans only | Demo/trace only |
|---|---:|---:|---:|---:|---:|---:|
| arrays | 28 | 0 | 21 | 0 | 7 | 0 |
| strings/templates | 21 | 1 | 7 | 1 | 12 | 0 |
| promise/async/generators/iterators | 20 | 2 | 7 | 2 | 4 | 5 |
| loops/control flow | 18 | 1 | 11 | 0 | 6 | 0 |
| exceptions/errors | 17 | 4 | 4 | 1 | 8 | 0 |
| objects/properties | 17 | 2 | 7 | 1 | 7 | 0 |
| gc/memory | 16 | 0 | 4 | 1 | 9 | 2 |
| primitives (boolean/number/symbol/math) | 14 | 1 | 8 | 1 | 4 | 0 |
| operators | 13 | 1 | 9 | 1 | 2 | 0 |
| debug scripts (`debug-*`) | 12 | 0 | 4 | 0 | 8 | 0 |
| functions/closures | 11 | 1 | 3 | 0 | 6 | 1 |
| classes/this/new | 9 | 1 | 2 | 3 | 3 | 0 |
| temporal | 9 | 9 | 0 | 0 | 0 | 0 |
| keyed collections | 6 | 2 | 3 | 0 | 1 | 0 |
| other / mixed status scripts | 6 | 0 | 1 | 3 | 2 | 0 |
| regexp | 4 | 0 | 2 | 1 | 0 | 1 |
| scope/declarations/destructuring/spread | 3 | 0 | 0 | 0 | 3 | 0 |
| eval/json | 1 | 1 | 0 | 0 | 0 | 0 |
| **Total** | **225** | **26** | **93** | **15** | **82** | **9** |

Category definitions, in precedence order:

1. **Assertion-bearing (throws)**: defines an `assert*` helper that throws, or has an
   `if (…) throw new …Error(…)` guard. The run stops at the first failure. Temporal files also
   print `FAIL:` from `assert`, but they throw from `assertThrows`.
2. **Assertion-bearing (prints `FAIL:`/`❌`)**: prints a marker the harness detects.
3. **Marker-only, invisible to the harness**: prints a failure marker the harness does not
   recognize (`FAIL` without a colon, `FAIL -`, `✗`). See defect H2.
4. **Output-only (comparison booleans)**: prints values such as `size === 0: true`. A `false`
   never fails the run.
5. **Output-only (demo/trace)**: no comparison output at all.

Other signals, counted over the 225 files that run (a file may have several):

| Signal | Files | Meaning |
|---|---:|---|
| prints comparison expressions | 164 | `console.log(… === …)` style output |
| has any PASS/✅/✓ marker | 140 | |
| unconditional PASS/✅ at column 0 | 35 | success printed whatever happened (defect H4) |
| undetected failure marker present | 35 | includes files that also use detected markers |
| `throw "string"` / thrown primitives | 16 | mostly deliberate exception tests in gc-* files |
| Promise/async/await | 16 | needs a microtask queue; output order depends on it |
| simulated GC helpers (`gc()`, `gcStats()`, `createArray()`) | 12 | see "Host dependencies" |
| Temporal | 10 | Rust/temporal_rs backed; out of first-milestone scope |
| self-declared UNSUPPORTED/SKIP | 10 | stale status scripts (see M1) |
| `eval(` | 4 | the rewrite forbids host eval; needs a guest eval design |
| WeakRef/FinalizationRegistry | 3 | GC-observable; deferred by project goals |
| `toLocale*`/Intl | 2 | locale-dependent output |

### Host dependencies and simulated helpers

- [static] The runner prepends a prelude defining `createArray`, `createTempObjects`, `gcStats` and
  `gc` (`test-runner.js:20-45`), where `gc`/`gcStats` print a "[Simulated …]" line. The C++ engine
  also defines real globals `gc` and `gcStats` (`src/builtins/builtin_manager.cpp:720-721`), and
  the prelude's function declarations then shadow them. **[inference]** So the 12 files that call
  these helpers never exercise real collection under `npm test`. They test only that the code runs,
  whatever their names (`gc-verification-test.js`, `gc_soundness.js`) suggest.
- [static] No test uses `require`, `import`, `process`, files or the network. The one
  `setTimeout` mention is a comment (`test/promise/promise-thenable-test.js:129`). Host coupling
  is limited to `console.log` formatting, the GC helpers, Temporal and locale methods.

## Harness defects (test-runner.js and src/main.cpp)

Each item is a concrete defect with a minimal scenario. Fixes are proposed, not made.

**H1. Uncaught guest exceptions exit 0.** [static] `src/main.cpp` catches
`JavaScriptException`, prints `e.what()` to **stdout** and `return 0;` (the "Don't treat thrown
exceptions as system errors" branch, after `js.execute`). `e.what()` is `"Uncaught " +
value.toString()` plus an optional location (`include/rift/interpreter/javascript_exception.h:21-28`).
A throw is therefore seen only if the printed text happens to contain `Error:` (`test-runner.js:104`).
Scenarios, which follow from the code ([inference], not run):
- `throw new Error()` prints `Uncaught Error at line N` with no colon. The test **passes**.
- `throw "boom"` prints `Uncaught boom`. The test **passes**.
- `throw new Error("x")` prints `Uncaught Error: x`. The test fails, as intended.

Proposed fix: exit nonzero on an uncaught guest exception, and have the runner treat a nonzero
status as failure (its `catch` at `test-runner.js:139` already does).

**H2. Failure markers are matched by exact substring.** [static] Only lines containing `FAIL:`,
`❌` or `Error:` count as failures (`test-runner.js:100-107`). 15 run files print *only*
unrecognized markers, and 35 contain at least one. Examples:
- `test/test-getter-setter.js:6` prints `FAIL - basic getter, …`, which is invisible.
- `test/test-class-getter-setter.js:7` has `assert` print `FAIL - ` + msg, which is invisible.
- `test/dynamic-cast-safety-test.js:14` has `assert` print `✗ ` + message, which is invisible.
- `test/promise/promise-basic-test.js:5` uses `… ? "PASS" : "FAIL"` (no colon), which is invisible.

Proposed fix: one assertion helper with nonzero exit, or a single documented marker grammar checked
with a regex anchored to the line start.

**H3. `Error:` anywhere in output is a failure, with spurious exemptions.** [static] Any line that
contains `Error:` and none of the PASS markers fails the file (`test-runner.js:104`). A
legitimately printed message such as `console.log("caught", e.toString())` → `caught TypeError: x`
therefore fails the run (20 run files print caught errors directly). The `PASS:` branch is checked
first, so a line like `PASS: Error: fake` counts as a pass, and a line containing both `PASS:` and
`FAIL:` counts only as a pass.

**H4. Unconditional success claims inflate assertion counts.** [static] 35 run files print
PASS/✅ at top level regardless of outcome, and the runner counts each one as an assertion
(`test-runner.js:99`). For example, `test/functions/function-expression.js` ends with
`✅ All function expression tests passed!` after printing values it never checks. [node] It prints
the right values under Node, but that line prints even if the values were wrong.

**H5. A file passes when it prints nothing recognizable.** [static] `success = testFailed === 0`
(`test-runner.js:121`). Comparison-boolean files (82) and demos (9) therefore always pass unless
they crash. Together with H1–H2, 106 of the 225 run files (82 + 9 + 15) have no failure signal the
harness can see, apart from a crash or an `Error:`-shaped uncaught throw.

**H6. Silent parse recovery hides syntax gaps.** [static] `Parser::parse()` catches non-SyntaxError
exceptions and skips to the next `;` (`src/frontend/parser/parser.cpp:141-153`, labeled DEVIATION
in its own comment). A statement the parser cannot handle is dropped. Any check inside it vanishes,
and under H5 the file still passes. [inference] Every reuse of a fixture should be checked against
its expected output, never against "no FAIL lines".

**H7. Smaller issues.** [static]
- The runner writes `<test>.js.temp` next to each test (`test-runner.js:78-80`), which mutates the
  source tree. Parallel or interrupted runs can leave or race on these files.
- The prelude shifts reported line numbers by its length (lines 21-44 plus a separator, about 25 lines).
- Only stdout is captured. stderr goes to the terminal and never counts. Today `console.error`
  writes to stdout (`src/host/console/console.cpp:23-24`), which hides this.
- Every `npm test` invocation runs `./build.sh` (a clean build) first (`test-runner.js:48-67`).
- The pass rate and denominator exclude `test/skipped/` without reporting a skip count.

## Misleading test claims

**M1. Stale "unsupported" scripts counted as passes.** [static] `test/functions/basic.js`,
`test/functions/scope.js`, `test/functions/return.js` and `test/simple-function-test.js` contain
only `console.log("UNSUPPORTED: Function declarations are not yet implemented")`-style lines and
then `PASS: Test skipped due to unimplemented features`. Function declarations and `return` are
used widely elsewhere in the suite (for example `test/comma_operator.js:4` and
`test/for-destructuring-test.js:6`). Each of these files adds one passing "assertion" and no
coverage.

**M2. `this-keyword-simple-test.js` asserts non-spec behavior.** [static] Test 1
(`test/this-keyword-simple-test.js:4-19`) says that calling a sloppy-mode function that does
`this.message = …` "should throw TypeError". In a non-strict script `this` is the global object, so
no exception is thrown (ECMA-262 OrdinaryCallBindThis, §10.2.1.2). [node] Under Node it prints
`Test 1 PASSED: false`. That output does not fail the harness (H5), so the incorrect expectation
is silent either way.

**M3. Names overstate evidence.** [static] `*-success`, `*-final`, `*-complete` and
`working-features-comprehensive-test.js` are mostly output-only or carry unconditional ✅ lines
(H4). `gc-*` tests do not observe collection under the harness (see "Host dependencies").

## Reusable fixtures for the first milestone

The approved first milestone is variables, functions, closures, ordinary objects and loops. The
current TypeScript subset (`typescript/docs/feature-inventory.md`) has `let` but no `var`, no
`for`, no `==`, no `typeof`, no update/compound operators, no `switch` and no ASI. Every legacy
fixture therefore needs mechanical adaptation, and none should be imported verbatim. Ranked by
semantic value per adaptation cost:

| Rank | Fixture | Behavior it pins down | Adaptation / harness dependency |
|---|---|---|---|
| 1 | `test/while-break-test.js` tests 1–3 | `break` exits at threshold, statements after `break` don't run, inner `break` leaves the outer loop running (`i === 5 && iterations === 6`, `i === 1`, `outer === 3 && innerBreakCount === 3`) | `var`→`let`. Drop test 4 (`switch`). PASS/FAIL markers; better as exact expected stdout |
| 2 | `test/while-continue-test.js` | `continue` skips the rest of the body and re-tests the condition | `var`→`let`, `==`→`===`. Check `%` usage against the numeric subset |
| 3 | `test/for-break-test.js` / `test/for-continue-test.js` | `for` break/continue, including "continue still runs the update" (`updates === 2`) | Needs `for`. Defer, or rewrite as `while` (losing the update-clause rule) |
| 4 | `test/functions/function-expression.js` | Expression functions, zero/one/two params, IIFE, function as property, function in array | Output-only. Expected values are in comments (`// Should be 7`). Remove the unconditional ✅ line. [node] output recorded above |
| 5 | `test/simple-object-literal-test.js` | Empty and multi-property literals, property reads | Replace `typeof … == "object"`. `==`→`===` |
| 6 | `test/test-file.js` | Variable declaration and reassignment | Trivial. `var`→`let`, `==`→`===` |
| 7 | `test/while-edge-cases-test.js` | Block-local state across iterations, counter variables | Output-only. Relies on `var` hoisting in places; re-derive expectations under `let` |

**[static] Coverage gap:** no file that runs is dedicated to closures. The closure/counter matches
in `class-test.js`, `generator-test.js`, `gc_soundness.js` and others are incidental. The same holds
for method receivers on ordinary objects (receiver tests are `new`/constructor oriented). The first
milestone's most important behaviors (retained mutable bindings, closure independence, receiver
binding) need new fixtures, which CL-003 provides, rather than legacy reuse.

## Proposed follow-ups (not done here)

1. Exit nonzero on an uncaught guest exception in `src/main.cpp` (H1).
2. Replace substring scraping with exit status plus an anchored marker grammar, and report skipped
   files (H2, H3, H5, H7).
3. Convert or delete the stale UNSUPPORTED scripts and the unconditional ✅ lines (M1, H4).
4. Fix or delete Test 1 of `this-keyword-simple-test.js` (M2).
5. Stop the runner writing `.temp` files into `test/`, for example by passing the prelude through
   a temp directory (H7).

Each touches core code or existing tests, so each needs a coordinator assignment.
