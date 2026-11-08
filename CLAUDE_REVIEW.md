# TypeScript rewrite: teammate review

Reviewer: Claude Code. Date: 2026-11-08, at `main` `6bb95501`.

Scope: `typescript/` only. I touched the C++ engine only to compare what it supports. This is
a high-level pass, not a line-by-line code review. Every number below comes from the commands
in the appendix.

## TL;DR

The core engine design is good. It uses discriminated-union values, explicit completion
records, per-Realm state, spec-shaped property operations and evaluation-order tests. The
tests are thorough, and running both Node and native lanes is a real asset.

The project's attention has moved away from the engine, though. After a week and 564 commits:

- **The CLI can't run everyday JavaScript.** It fails on a `for` loop, `const`, `try`/`catch`,
  `++`, arrow functions, `new` and a missing semicolon. The internal Script path handles
  several of these, but the CLI doesn't use it.
- **Verification has outgrown the engine.** There are about 6,400 lines of engine source and
  29k lines of tests. Against that sit 21k lines of design docs and 12,600 files (1.9 GB) of
  validation evidence. That evidence already breaks a default Windows checkout.
- **The current task chain is about the toolchain, not the engine.** TS-035E3 covers Windows
  job-object supervision, linker provenance and COFF object inventories. No test262 test has
  run as conformance yet.

My main suggestion is to rebalance: one engine path, a visible conformance number soon, and a
much lighter evidence and process budget per change.

## What is working well

- **Value and completion model.** `runtime.ts` is close to how the spec reads. Its parts are
  the `Value` union, `Completion`, `ThrowCompletion` with origin, and descriptors. One
  example: `validatePropertyDescriptor` is a clear, faithful ValidateAndApplyPropertyDescriptor
  with step references.
- **Honest unsupported behavior.** Unsupported syntax and operations fail explicitly, with
  capability codes, rather than silently misbehaving. Keep this.
- **Semantic tests with effects.** Files such as `test/delete-operator.ts`,
  `test/in-operator.ts` and `test/compound-assignment.ts` check evaluation order and
  coercion side effects, not just results. That is the right kind of test for an engine.
- **Two lanes from one source.** Both the Node-hosted and the native scriptc build run the
  same tests. Resource bounds (steps, calls, depth) are in from the start.
- **Realm isolation and explicit OperationContext.** Builtins receive their context instead
  of reaching for globals. That will pay off when more builtins land.

## Suggestions, most important first

### 1. Rebalance from verification to engine progress

| | Size |
|---|---|
| Engine source (`src/`) | 6,360 lines, 51 files |
| Tests (`test/*.ts`) | 28,773 lines |
| Tooling (`tools/*.mjs`) | 6,289 lines |
| Design docs (`docs/*.md`, excluding validation) | 20,617 lines, 68 files |
| `TASKS.md` / `COORDINATION.md` | 2,870 / 1,615 lines |
| `docs/validation/` | 12,632 files, 1.9 GB, 165 task directories |

The work since about TS-035C is almost entirely conformance-execution plumbing. It runs from
TS-035E-P to TS-035E3h, 33 task entries. Examples include Job Object lifecycle
harnesses, `cmd.exe` hard-link identity amendments, a COFF archive inventory and a helper
build that needed explicit owner approval for one `Add-Type`. Each step is careful, but
together they guard against threats a learning engine doesn't have yet. Meanwhile the
language subset the CLI accepts has barely moved.

Suggestions:

- **Pause the build-provenance and link-observation chain** (E3f–E3h). Write down what is
  "good enough" for now, for example: pinned tool versions, a recorded `scriptc --version`
  and a hash of the output binary. Revisit hermetic provenance only when a real
  reproducibility problem shows up.
- **Give each task an evidence budget.** For example: one README, the commands run and a
  summary table. Raw logs and transcripts only when a result is disputed. Most `-P`
  ("proposal") design tasks could be a paragraph inside the implementation task.
- **Use vertical slices.** For example, "for loops work in the CLI end to end, with tests and
  both lanes" in place of separate audit, dispatch, rejection and refresh tasks per grammar
  rule. TS-035D5–D8 is eight task entries for numeric assignment and lexical-statement
  rejections alone.

### 2. One engine and one entry point

There are two execution profiles. The `legacy` Realm, used by `interpreter.run`, the CLI and
observations, has its own `Environment`. The `script` Realm, reachable only through an
opaque session facade, has `ScriptDeclarativeEnvironment`, `ScriptFunctionEnvironment`,
`GlobalEnvironment` and activation classes. One `ExecutionEngine` serves both, so many
branches carry an `env === null` mode switch.

The result is that features land where users can't see them:

| Program | CLI (`build/node/src/cli.js`) | Internal Script path |
|---|---|---|
| `var` + `for (…; i++)` loop | parse error (`++`) | runs, prints `10` |
| closure counter | runs | runs |
| `try { throw new Error("boom") } catch (e) { … }` | parse error (`try`) | runs, prints `boom` |
| `function Point(x){this.x=x}; new Point(3)` | parse error (`new`) | runs, prints `3` |
| `const xs = [1,2,3]` | parse error | blocked (`const`) |
| missing final semicolon (ASI) | parse error | blocked (expected `;`) |
| `for (let k in o)` | parse error | blocked (`let` in a `for` head) |
| `(x) => x * 2` | parse error | blocked (`=>`) |
| `` `n=${n}` `` (template) | parse error (`++` first) | blocked (backtick) |
| `a.push(4)` | runtime TypeError (not callable) | runtime TypeError |

Suggestions:

- **Make the Script path the only path.** Point the CLI and the observation driver at it,
  then delete the legacy profile, `Environment`, the `evaluator.ts` re-export and the
  `realm.profile` checks. The project has no compatibility obligations, so this is cheap
  now and expensive later.
- **Replace the capability-token pattern with ordinary module privacy.** That pattern is the
  `ExecutionKey`, `ActivationKey` and `BuiltinPermit` objects, plus the
  `consumeScriptBuiltinPermit` checks that compare seven fields. These guard the engine
  against its own code. For a reader learning engines, an unexported class and a short
  invariant comment teach more.

### 3. Get a real conformance number soon

Every other priority would benefit from a visible metric. The test262 starter corpus (CL-004)
already identifies 22 candidate tests and the adapter prerequisites. A crude
"pass / fail / unsupported per directory" run on a pinned revision would show progress and
regressions. It needs only honest skip categories and no denominator games, both of which
`AGENTS.md` already requires; it does not need provenance-grade receipts. The first blocker
is that `assert.js` and `sta.js` don't parse yet, so that is the natural next target.

The full native lane can run per milestone rather than per change, as long as the Node lane
and the static-coverage gate stay per change.

### 4. Move raw validation evidence out of git

- **Windows checkout breaks.** The longest tracked path is 287 characters, repo-relative
  (`typescript/docs/validation/ts-035e3f-p/probe-contract/atomic-job-correction/lifecycle-execution/…`).
  A plain `git worktree add` failed with "Filename too long" until I set `core.longpaths`.
- **The repository is large.** It contains a 59 MB `transport-artifacts.zip`, two identical
  35 MB `results.json` files and five 21–31 MB `old-test-proposals.json` snapshots. It
  also holds 3,658 `.gz` files and 343 `.bin` files. The pack is 303 MiB and will keep
  growing.

Suggestions: keep a short README per task (commands, summary, hashes). Store raw artifacts
outside git, as release assets, in an ignored `build/evidence/`, or in an artifact store.
Keep directory nesting shallow. Add a size check (for example, fail CI above a few MB per
task directory) so this doesn't creep back.

### 5. Make the source match the "readable first" goal

`project-goals.md` makes readability the primary objective. Today:

- **Long lines.** 491 source lines exceed 120 columns, and the longest is 5,120.
  `script-observation.ts:436` embeds the whole test262 `assert.js` harness as a string
  literal. `parser.ts:1` is a 531-character import line. Adopt a formatter such as Prettier
  or dprint at 100 columns, like the C++ side's `make format`, and run it in CI.
- **Harness files in engine source.** Move them to fixture files that the tooling loads.
  Engine source shouldn't contain the conformance suite's harness.
- **Analysis mixed into the parser.** The parser has seven `purpose` modes
  (`legacy`, `return-audit`, `declaration-plan`, `bounded-plan`,
  `bounded-parameter-audit`, `bounded-numeric-assignment-audit`,
  `bounded-lexical-statement-audit`). About 15 `collect…Audit` / `audit…` functions feed
  it. Recognizable engine architecture is a stated goal, and the usual shape is parse to an
  AST once, then run early-error and declaration-instantiation passes over the AST. That
  would make the parser readable on its own and delete most of the modes. The
  re-parse-after-failure in `parse()`, which re-audits returns to reclassify an error, is
  a symptom of this.
- **One very large file.** `script-execution-internal.ts` is 1,595 lines (100 KB). Splitting
  it into statements, expressions, references, calls and function instantiation would
  match the spec's chapter structure and the C++ layout learners may compare against.

### 6. Docs a learner, or the owner, can read

- **The inventory doesn't say what works now.** `feature-inventory.md` (966 lines) is a
  layered changelog. Its first table still says "no var/const, for, try/catch" while later
  sections add some of these, but only on the internal path. Replace it with one
  current-state table ("works in the CLI / works internally / not yet"), and move milestone
  history to git or the task log.
- **The coordination log is unreadable.** Recent `COORDINATION.md` entries have lost their
  spaces and read as compressed tokens, for example
  "Inertintegration milestoneab588ab5 publishedverified". `TASKS.md` entries are single
  paragraphs of several hundred words. Keep `TASKS.md` to open tasks, archive done ones,
  and keep coordinator notes to short dated bullets written for a human.
- **No single entry point for learners.** Add one short `ARCHITECTURE.md`: pipeline,
  values, environments, completions, realms and how a builtin is added. Link the 60+ topic
  design docs from it. Many of those topic docs could then be merged or retired.

### 7. Use the C++ engine as a backlog, not only as a reference

According to the root `CLAUDE.md`, the C++ engine already supports a large surface: classes,
generators, async/await, Promise, Map/Set and more. The audited C++ custom tests (CL-001) and
the semantic examples (CL-003) are a ready-made, ordered list of "what should work next."
Agreement with C++ is still not proof, as `AGENTS.md` says. But picking the next slice from
"most common constructs in those tests" is a cheap way to prioritize.

## A suggested next sequence

1. **CLI on the Script path.** Delete the legacy profile. Everything the internal path runs
   (`var`, `for`, `++`, `try`/`catch`, `new`, `Error`) then works from `rift file.js`.
2. **Everyday syntax:** `const`, ASI, arrow functions, template literals, `for…in`/`for…of`
   (once iterators exist) and `switch`, each end to end with tests in both lanes.
3. **Basic builtins:** `Array.prototype.push/pop/slice/indexOf`, `String.prototype`
   basics, `Object.keys`.
4. **Harness parsing:** make `assert.js` and `sta.js` parse, then run the CL-004 starter
   corpus with a simple runner and publish the pass/skip table.
5. **Then** decide how much more build provenance is worth, based on any real problem
   that turned up.

## Smaller notes

- `cli.js` exit codes (0, 1, 2, 64, 66, 70) are tidy. Document them in the CLI usage text.
- `RESERVED` is a space-joined string searched with `includes(" " + word + " ")`. A `Set` is
  clearer and avoids the leading/trailing-space convention.
- Engine errors are still diagnostic strings, not Error objects, outside the Script path.
  Unifying the paths (suggestion 2) fixes this as a side effect.

## Appendix: how these numbers were measured

Measured from a worktree of `main` at `6bb95501` (checked out with `core.longpaths=true`):

- Size counts: `find src -name '*.ts' | xargs wc -l` (and the same for `test`, `tools` and
  the non-validation docs), `du -sh docs/validation`, `ls docs/validation | wc -l`, and
  `git count-objects -vH` (size-pack) in the main checkout.
- Commit count: `git log --oneline -- typescript | wc -l`. The first commit is dated
  2026-11-01.
- Line length: `awk` over `src/**/*.ts`, counting lines longer than 120 columns and the
  maximum.
- Program table: the Node lane, built with `npm ci` and `npm run build:node`. Each program
  ran through `build/node/src/cli.js`, then through
  `prepareBoundedScript` → `createScriptSession` → `evaluateScript` on a `script`-profile
  Realm. The native lane was not run for this table.
- I did not run the full test suites for this review; these are observations, not
  regressions.
