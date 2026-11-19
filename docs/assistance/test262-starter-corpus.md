# test262 starter corpus (CL-004)

This document selects a small set of revision-pinned test262 tests that a future conformance adapter
could start from, and explains why each one is included or deferred. It records what was actually
run. It does not change the interpreter, add a runner, or claim conformance.

- Upstream: tc39/test262 at
  [`91c7075`](https://github.com/tc39/test262/tree/91c70759363c46557b694792bf34a2551a7af5ba)
  (committed 2026-10-29), the same pin CL-002 used. All links below point at that revision; none
  depend on the default branch.
- Capability baseline: accepted TS-017A final `b02cfc3`. For comparison, everything was also run on
  `609c2f3`, the integration-branch head when this task was claimed, which adds TS-018A through
  TS-029A (for example typeof/void, `in`, `==` and primitive property reads).
- Machine-readable manifest: [`manifest.json`](../../fixtures/assistance/test262-starter-corpus/manifest.json).
  It holds every field below plus the exact Rift diagnostics, the Node reference result, and each
  file's git blob SHA.
- License: test262 is under the BSD License, Copyright Ecma International (see `LICENSE` at the
  revision). No upstream test or harness content is copied into this repository; only paths,
  metadata, and short descriptions are recorded.

Evidence labels: **[measured]** means a command run for this task, with the result recorded in the
manifest. **[upstream]** means read from test262 at the pinned revision. **[static]** means read from
Rift source or docs. **[inference]** means a consequence not executed. **[reference]** means Node
output, which is never counted as Rift conformance.

## Summary

1. **[measured] No non-raw test can run faithfully on either build.** Every test that is not flagged
   `raw` must be preceded by `assert.js` and `sta.js`. At this revision neither file parses in the
   subset:
   - `assert.js`: the first diagnostic is `87:13 unsupported operator: +=`.
   - `sta.js`: `14:14 expected ')', found 'instanceof'`.
   - [upstream] Beyond those two diagnostics, the harness also uses `var`, `for`, `switch`,
     try/catch, `new`, `++`, `typeof` and `instanceof`.
2. **[measured] Unsupported syntax is reported as an ordinary parse SyntaxError.**
   - Rift reports unsupported syntax as `parse SyntaxError` and exits 2, exactly like a genuine
     early error.
   - The 2,000 surveyed files include 308 parse-negative tests. TS-017A rejects all 308 at parse,
     but 173 of those rejections carry an `unsupported…` message. Others fail for unrelated reasons,
     such as missing ASI (U01, U03).
   - An adapter that checks only phase and type would count all 308 as passes. This is CL-002 D2 in
     a new form.
3. **[static] Thrown errors are diagnostic records, not Error objects** (`docs/feature-inventory.md`,
   Errors row). This affects two things:
   - Runtime-negative tests need the thrown value's constructor to match.
   - `assert.throws` compares `thrown.constructor`, and the Error constructor globals are absent.
   - So the TDZ behavior Rift already implements (S01–S04) cannot yet be checked faithfully.
4. **[static] Rift uses a strict-call profile.**
   - Top-level and detached `this` are `undefined`, and sloppy-mode semantics are not implemented.
   - Variants that run in non-strict mode (the default pair's non-strict run and `noStrict` tests)
     should be reported as profile-unsupported, not as passes or failures (U06, U07).
5. **Readiness of the bodies themselves.**
   - [measured] On the TS-017A build, 13 of the 22 candidate bodies already produce the expected
     outcome with no harness or under a labeled probe shim: 8 runtime results and 5 genuine parse
     rejections. S14 and S17 join them at head.
   - The [smallest prerequisite set](#adapter-prerequisite-checklist) that unlocks them is the harness
     syntax, Test262Error, Error objects, and a distinct diagnostic for unsupported syntax.

## How the corpus was chosen

[measured] All files in 41 directories at the pin were fetched by revision and path: 2,000 tests.
Three more were fetched individually for the unsuitable examples. The directories were the
`test/language/` subtrees for:
- let and block scope;
- function declarations, expressions and function code;
- `return`/`throw`/`while`/`if`/`break`/`continue`/block/empty statements;
- assignment, the arithmetic, relational, equality, logical, conditional, unary, typeof and void
  operators;
- grouping, call, property accessors, object literals, and identifier resolution.

Each file was scanned for frontmatter and for syntax outside the subset, then run through both
builds. Candidates were chosen to cover the five requested areas with the fewest prerequisites;
where several tests were equivalent, the shortest single-purpose test was kept. All 33 local copies
match upstream blob SHAs, checked through the GitHub contents API at the pin.

### What "run" means here

Every Rift run used the Node-hosted lane, `node build/node/src/cli.js <file>`. The CLI exits 0 on
normal completion, 1 on a runtime throw, 2 on a parse error and 70 on a host fault (`src/cli.ts`).
The native lane was not built for this task.

| Mode | What runs | Use |
|---|---|---|
| Raw | The unmodified test file, with no harness and no directive | Shows how far the body itself parses and runs |
| Probe | The unmodified test file, preceded by the probe shim below | Shows whether `assert`/`assert.sameValue` checks hold. It is **not** the upstream harness |
| Node reference | Pinned `assert.js` + `sta.js` + includes + test as a `vm.Script` in a fresh context, per variant, Node v26.13.0 | Confirms the test's expectation in another engine. [reference] only |

The probe shim is written in the subset and defines `assert`, `assert.sameValue` (SameValue,
including NaN and -0) and `assert.notSameValue`, each throwing a string. It cannot define
`assert.throws` (no try/catch), `Test262Error` (no `new`) or Error constructors. A probe or raw exit
of 0 is **not a pass**: the required harness was not evaluated, and only one variant was run, with
no `"use strict"` prepended.

[measured] Totals across the 2,000-file raw survey give parse reach, not conformance:
- TS-017A: 1,934 rejected at parse, 58 threw at runtime, 8 completed.
- Head: 1,888 rejected at parse, 89 threw at runtime, 23 completed.

## Candidates

Unless listed, every candidate has `features: []` and `includes: []`. All non-raw tests also need
the default includes `assert.js` and `sta.js`. The "Variants" column follows the INTERPRETING.md
flag rules. "Probe" and "Raw" results are from the TS-017A build; the manifest also has head results.

| ID | Test at pin | Flags → variants | Negative | Helpers used | TS-017A observed [measured] | Readiness |
|---|---|---|---|---|---|---|
| S01 | [let/global-use-before-initialization-in-prior-statement.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/statements/let/global-use-before-initialization-in-prior-statement.js) | none → non-strict, strict | runtime ReferenceError | none | Raw: runtime ReferenceError `x is not initialized` | runtime observed |
| S02 | [let/global-use-before-initialization-in-declaration-statement.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/statements/let/global-use-before-initialization-in-declaration-statement.js) | none → both | runtime ReferenceError | none | Raw: runtime ReferenceError `x is not initialized` | runtime observed |
| S03 | [let/block-local-closure-get-before-initialization.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/statements/let/block-local-closure-get-before-initialization.js) | none → both | — | `assert.throws` | Probe: `ReferenceError is not defined` (the argument to `assert.throws`) | supported, not run |
| S04 | [let/function-local-closure-set-before-initialization.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/statements/let/function-local-closure-set-before-initialization.js) | none → both | — | `assert.throws` | Probe: `ReferenceError is not defined` | supported, not run |
| S05 | [block-scope/return-from/block-let.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/block-scope/return-from/block-let.js) | none → both | — | `assert.sameValue` | Probe: exit 0 | runtime observed |
| S06 | [function-code/10.4.3-1-62-s.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/function-code/10.4.3-1-62-s.js) | none → both | — | `assert.sameValue` | Probe: exit 0 | runtime observed |
| S07 | [function-code/10.4.3-1-71-s.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/function-code/10.4.3-1-71-s.js) | none → both | — | `assert` | Probe: exit 0 | runtime observed |
| S08 | [unary-minus/11.4.7-4-1.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/expressions/unary-minus/11.4.7-4-1.js) | none → both | — | `assert.sameValue` | Probe: exit 0 | runtime observed |
| S09 | [unary-plus/11.4.6-2-1.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/expressions/unary-plus/11.4.6-2-1.js) | none → both | — | `assert.sameValue` | Probe: exit 0 | runtime observed |
| S10 | [strict-equals/S11.9.4_A3.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/expressions/strict-equals/S11.9.4_A3.js) | none → both | — | `Test262Error` via `new`, on failure only | Raw: parse `unsupported … syntax: new` | supported, not run |
| S11 | [logical-and/S11.11.1_A3_T4.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/expressions/logical-and/S11.11.1_A3_T4.js) | none → both | — | same as S10 | Raw: parse `… new` | supported, not run |
| S12 | [conditional/S11.12_A3_T4.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/expressions/conditional/S11.12_A3_T4.js) | none → both | — | same as S10 | Raw: parse `… new` | supported, not run |
| S13 | [addition/S11.6.1_A4_T3.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/expressions/addition/S11.6.1_A4_T3.js) | none → both | — | same as S10 | Raw: parse `… new` | supported, not run |
| S14 | [typeof/undefined.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/expressions/typeof/undefined.js) | none → both | — | `assert.sameValue` | Raw: parse `… typeof`; at head the probe exits 0 | post-baseline (TS-026A) |
| S15 | [subtraction/order-of-evaluation.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/expressions/subtraction/order-of-evaluation.js) | none → both; `features: [Symbol]` | — | `assert.sameValue`, `assert.throws`, `Test262Error` | Raw: parse `unsupported operator: +=` | deferred |
| S16 | [object/property-name-yield.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/expressions/object/property-name-yield.js) | none → both | — | none (passes if it completes) | Raw: exit 0 | runtime observed |
| S17 | [object/prop-dup-data-data.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/expressions/object/prop-dup-data-data.js) | none → both | — | none (passes if it completes) | Raw: parse `… void`; at head the raw run exits 0 | post-baseline (TS-026A) |
| S18 | [assignment/target-number.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/expressions/assignment/target-number.js) | none → both | parse SyntaxError | `$DONOTEVALUATE` | Raw: parse `invalid assignment target` | parse rejection observed |
| S19 | [while/decl-let.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/statements/while/decl-let.js) | none → both | parse SyntaxError | `$DONOTEVALUATE` | Raw: parse `declarations require a block` | parse rejection observed |
| S20 | [return/S12.9_A1_T4.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/statements/return/S12.9_A1_T4.js) | none → both | parse SyntaxError | `$DONOTEVALUATE` | Raw: parse `return outside function` | parse rejection observed |
| S21 | [function/param-duplicated-strict-1.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/statements/function/param-duplicated-strict-1.js) | `onlyStrict` → strict | parse SyntaxError | `$DONOTEVALUATE` | Raw: parse `duplicate parameter: param` | parse rejection observed |
| S22 | [redeclaration/function-name-redeclaration-attempt-with-function.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/block-scope/syntax/redeclaration/function-name-redeclaration-attempt-with-function.js) | `generated, onlyStrict` → strict | parse SyntaxError | `$DONOTEVALUATE` | Raw: parse `duplicate binding: f` | parse rejection observed |

[reference] Node v26.13.0 matched the expectation for every variant of S01–S22.

### Expectations and blockers

Every non-raw candidate shares blocker **B0**: the default harness must parse and run in the subset
(Summary item 1). Only the blockers beyond B0 are listed here.

**Lexical bindings and closures**
- **S01, S02.** Reading a script-level `let` binding before it is initialized throws ReferenceError
  at runtime. S01 reads it in an earlier statement; S02 reads it from its own initializer.
  - The phase and name already match.
  - Blocker: the thrown value must be a ReferenceError object. Rift throws a diagnostic named
    ReferenceError. Accepting the diagnostic name instead would be an adapter-level equivalence
    that the coordinator must approve and document [inference].
- **S03, S04.** A closure that reads (S03) or writes (S04) a `let` binding before its declaration
  runs throws ReferenceError. S03 is in a block; S04 is in a function scope.
  - The underlying TDZ check is the path S01 exercises.
  - Blockers: `assert.throws` needs try/catch, a global `ReferenceError`, and Error objects with
    `constructor`.
- **S05.** `return` from inside a nested block reads the outer and the block-level bindings, giving 9.

**Functions and `this`**
- **S06.** A function with a `"use strict"` directive, called with no receiver from a non-strict
  function, sees `this === undefined`. The strictness comes from the callee, so both variants expect
  the same result.
- **S07.** A strict function called through `f.call()` with no thisArg sees `this === undefined`.
  This uses TS-016B's `Function.prototype.call`.

**Primitive operators**
- **S08, S09.** Unary minus of `""` is -0, and unary plus of `""` is +0. The -0 distinction relies on
  the harness's own SameValue check, not on `===`.
- **S10–S13.** These cover:
  - S10: boolean `===`.
  - S11: `&&` returning a falsy left operand (`undefined`, `null`) unchanged.
  - S12: conditional arm selection of `undefined`/`null`.
  - S13: the sum of two infinities of the same sign. It uses `Number.POSITIVE_INFINITY` and
    `NEGATIVE_INFINITY` from TS-003, and the `Infinity` binding.

  Blocker: these legacy tests throw `new Test262Error(...)` only on failure, but the parser rejects
  `new` even in branches that never run. Test262Error itself comes from `sta.js`, which needs
  constructor calls on a plain function and `instanceof`. [measured] In the survey, 732 of the
  2,000 files reference Test262Error. For 123 of them, `new` is the only syntax outside the subset
  that the heuristic scanner found.
- **S14.** `typeof undefined` and `typeof void 0` are `"undefined"`. TS-017A rejects `typeof` at
  parse; head completes under the probe. This shows why each result must record the Rift commit.
- **S15.** Deferred, but the most valuable evaluation-order test found. Both operands are evaluated
  left to right before either `valueOf`, and each abrupt completion stops the later steps. This is
  the ordering TS-012 implements.
  - Blockers: `var`, `+=`, `new MyError()` on a user constructor, and `assert.throws`.
  - Check `features: [Symbol]` against TS-019A before un-skipping.

**Ordinary data properties**
- **S16.** `yield` as an identifier-name key in an object literal is accepted. There is no
  assertion, so a pass shows only that the literal parses and evaluates.
- **S17.** Duplicate data property names in one literal are allowed in both modes.
  - The ES5-era description says "if not in strict mode", but the test has no mode flag and Node
    passes both variants. The flags, not the description, determine the expectation.
  - Blocker: it uses `void`, which needs TS-026A.

**Genuine early errors (S18–S22)**
- Rift's diagnostic names the specified reason in each case:
  - S18: assigning to a numeric literal.
  - S19: a `let` declaration as a `while` body.
  - S20: `return` at top level.
  - S21: duplicate strict parameters.
  - S22: duplicate block function declarations, which are strict-only because of Annex B.
- Blockers, beyond B0:
  1. The harness must be shown to parse on its own first. Otherwise a harness parse failure is
     indistinguishable from the expected SyntaxError.
  2. Unsupported-syntax rejections must be classified separately (Summary item 2).
- Profile note for S21: Rift also rejects duplicate parameters in sloppy functions, where the spec
  allows them [measured with `-e`]. Sloppy counterparts must be reported as profile-unsupported.

## Deliberately unsuitable examples

Each of these would be misclassified by a naive adapter. The pitfall column references CL-002
defects where they apply.

| ID | Test at pin | Flags / negative | Pitfall | Observed [measured] |
|---|---|---|---|---|
| U01 | [redeclaration/let-name-redeclaration-attempt-with-let.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/block-scope/syntax/redeclaration/let-name-redeclaration-attempt-with-let.js) | generated; parse SyntaxError | **Coincidental rejection** (D2). The test omits the last semicolon, and Rift fails on missing ASI before reaching the redeclaration. With a semicolon added, Rift does report `duplicate binding: f` (`-e` probe), but adding one would modify the test | parse `expected ';', found '}'` |
| U02 | [while/decl-async-fun.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/statements/while/decl-async-fun.js) | `features: [async-functions]`; parse SyntaxError | **Coincidental rejection** of unsupported `async`. Feature skips must run before execution | parse `unsupported … syntax: async` |
| U03 | [directive-prologue/10.1.1-2gs.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/directive-prologue/10.1.1-2gs.js) | `raw`; parse SyntaxError | **raw** (D3): no harness and no prepend. Rift also rejects it for missing ASI rather than for the strict reserved word | parse `expected ';', found 'throw'` |
| U04 | [module-code/eval-this.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/module-code/eval-this.js) | `module` | **Module run as a script** (D4). It completes under the probe only because Rift's script top-level `this` is already `undefined` | Probe: exit 0 (false pass) |
| U05 | [function-code/10.4.3-1-62gs.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/function-code/10.4.3-1-62gs.js) | none | **Raw-run pass without the required harness** (D5). It signals failure by throwing a string, so the bare file completes, but a faithful run fails at harness parse | Raw: exit 0 |
| U06 | [function-code/10.4.3-1-1-s.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/function-code/10.4.3-1-1-s.js) | `noStrict` | **Profile mismatch.** It expects sloppy primitive-`this` boxing. TS-017A rejects `typeof` at parse | Head probe: fails at the `bar.call(1)` assertion |
| U07 | [identifier-resolution/assign-to-global-undefined.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/identifier-resolution/assign-to-global-undefined.js) | `onlyStrict`; runtime ReferenceError | **Right phase, wrong cause.** Rift's top-level `this` is `undefined`, so the right-hand side throws TypeError before the ReferenceError check. [reference] Node completes without throwing, so Node is not an oracle | runtime TypeError |
| U08 | [async-function/evaluation-body-that-returns.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/statements/async-function/evaluation-body-that-returns.js) | `async` | **async** (D7/D8): needs `doneprintHandle.js`, a host `print`, and Promise jobs | parse `… async` |
| U09 | [typeof/null.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/expressions/typeof/null.js) | none | **Whole-file granularity.** The first assertion is in the head profile, the second needs `RegExp`. No partial passes, and assertions are never deleted | Head probe: `RegExp is not defined` |
| U10 | [function/S13.2.1_A1_T1.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/statements/function/S13.2.1_A1_T1.js) | none | **ASI plus resource bounds** (D8). Deeply nested IIFEs without semicolons; depth limits may differ between the Node and native lanes | parse `expected ';', found '}'` |
| U11 | [return/line-terminators.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/test/language/statements/return/line-terminators.js) | none | **Byte preservation.** The file contains raw CR, U+2028 and U+2029; any newline or encoding normalization changes the test. Rift's diagnostic is an explicit "unsupported" message, which is the model to follow | parse `newline after return/throw is unsupported` |

## Retrieving a test exactly

```bash
REV=91c70759363c46557b694792bf34a2551a7af5ba
P=test/language/statements/let/global-use-before-initialization-in-prior-statement.js
curl -sfL "https://raw.githubusercontent.com/tc39/test262/$REV/$P" -o test.js
git hash-object test.js   # must equal the manifest "blob" (74c1e27… for S01)
```

Save the file as bytes; do not convert line endings. The harness blobs are recorded in the manifest
`upstream.harnessBlobs`.

## What was not done

- No runner, adapter, package, core or test changes. No test262 content was committed.
- The native lane was not built. Raw and probe runs are Node-hosted Rift only.
- Variants were not run separately on Rift: raw and probe runs use the file as-is, with no
  `"use strict"` prepend. Only the Node reference ran both variants.
- The survey covered 41 directories, not the whole suite. Raw-survey totals are parse reach, not
  pass rates.

## Adapter prerequisite checklist

This is the smallest ordered set before any result from this corpus can be reported as a test262
result. Engine items are prerequisites to assign, not designs.

1. **Pin and retrieve.** Record the test262 revision and fetch by path at that revision. Verify each
   file's git blob SHA, and read it as exact bytes with no newline or encoding normalization (U11).
   Record the Rift commit and lane (Node/native) with every result (S14, S17).
2. **Classify before running.** Parse the frontmatter. Then:
   - skip unimplemented `features` (U02, U08);
   - skip `module` and `async` tests as unsupported until those exist (U04, U08);
   - for `raw`, run unmodified with no harness and no prepend (U03).
3. **Variants under the strict-call profile.** Derive variants from the flags. Run the strict
   variant. Report non-strict and `noStrict` variants as `unsupported: profile`, kept in the
   denominator and never counted as passes (U06).
4. **Make the real harness parse and run.**
   - Engine prerequisites: `var`, `for`, `switch`, try/catch, `+=`, `++`, `new` with ordinary
     constructor functions and `.prototype`, and `instanceof`. `typeof` is already done (TS-026A).
   - Runtime calls `String()`, `JSON` and `Object.prototype.toString` occur only on failure-message
     paths, but must still parse.
   - Do not substitute a rewritten harness. Any interim shim must be a separately labeled mode whose
     results are never reported as test262 results (D6).
5. **Error objects.** The engine must throw ReferenceError, TypeError and SyntaxError instances with
   their global constructors, `constructor` and `name`. Both `assert.throws` and runtime-negative
   type checks depend on this (S01–S04).
6. **Separate "unsupported" from early errors.** Give unsupported-syntax rejections a distinct
   diagnostic kind and report them as `unsupported`. Verify that the harness parses alone before
   trusting any parse-negative result (Summary item 2, U01, U02).
7. **Check phase and type from structured results.** Rift's CLI already separates parse (exit 2) from
   runtime (exit 1) and host fault (exit 70). Compare both phase and type for negatives, and never
   search text (D1, D2, D7).
8. **Separate statuses.** Keep pass, fail, unsupported-feature, unsupported-profile, harness-error,
   resource-limit/timeout and host-fault distinct, and run both lanes (U10, D8).

With items 1–8 in place, the "runtime observed" and "parse rejection observed" candidates (S01, S02,
S05–S09, S16, S18–S22) become the first trustworthy runs. S03, S04 and S10–S13 follow from items 4–5,
then S14 and S17 at the TS-026A baseline, and S15 last.
