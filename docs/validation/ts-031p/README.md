# TS-031P research and validation record

Design only; 2026-11-02; chat `01a19bf5-589e-7b32-a605-f2c419837724`;
base `19f2529`; branch `codex/test262-classification`.
[Design](../../test262-classification.md) and [acceptance matrix](matrix.md).

Read `typescript/AGENTS.md`, approved goals, compiler contract, TASKS, accepted
CL-002/CL-004 documents/manifest and Claude queue acceptance notes. Inspected
actual CLI, interpreter, lexer, parser, Diagnostic, runtime failure/Completion,
Realm bootstrap, evaluator guards and C++ runner setup. Initial root-relative
goal/contract reads failed and were corrected to typescript/docs. No source edits.

## Fixed external evidence actually inspected

All test262 links use revision `91c70759363c46557b694792bf34a2551a7af5ba`:

| Source | Decision supported |
|---|---|
| [INTERPRETING.md](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/INTERPRETING.md) | Variant expansion, global code/Realm isolation, raw/module handling, harness ordering, phase plus constructor-name matching, host services. |
| [CONTRIBUTING.md](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/CONTRIBUTING.md) | One frontmatter; historical metadata; fixture and assertion expectations. |
| [assert.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/harness/assert.js), CL-004 blob `55a0e2a32f2e6259a1b445a9d924f61261e2ca5f` | Actual ordinary-object constructor identity in assert.throws; NaN/signed-zero checks; failure formatting; syntax inventory. |
| [sta.js](https://github.com/tc39/test262/blob/91c70759363c46557b694792bf34a2551a7af5ba/harness/sta.js), CL-004 blob `d291a94f46234908009a7ee909cf9d66034c73fe` | Test262Error construction, instanceof/prototype requirement, thrower and unchanged DONOTEVALUATE. |

Read exact pinned bodies S18–S22 and U07 through connected GitHub, using the
manifest's URLs. S18 assigns to42; S19 places let directly under while; S20
has top-level return; S21 repeats parameters; S22 duplicates block functions.
These support the five proposed audited rules, not a blanket SyntaxError pass.
U07 is `undeclared = (this.undeclared = 5)` with runtime ReferenceError metadata;
its prior Node disagreement is retained, not used to change the upstream oracle.

[ECMAScript 2025 Scripts](https://tc39.es/ecma262/2025/multipage/ecmascript-language-scripts-and-modules.html#sec-parse-script),
16.1.1–16.1.7, inspected through web: ParseScript returns Script records or
SyntaxError objects; ScriptEvaluation performs global declaration instantiation
at runtime. Strictness comes from source context, not a global strict-call flag.
Separate source units must share global bindings without being concatenated into
a different directive scope. These facts motivate the proposed Script prerequisite.

Reference-engine inspection:
[engine262 test262-worker.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/test/test262/test262-worker.mts),
revision `d553e7b52501fbc47eae981c8d0fa7a5c26d0171`, blob
`c27687daf21c65b34b9bd3c40b8a3bdfc0a3f4cc` (directory API identity).
It creates a fresh Realm, evaluates includes separately and inspects guest object
constructor metadata. Those are useful boundaries. It also substitutes sta.js
and async handling, boosts the harness, and its finish handler matches negative
type without comparing observed phase there. Do not copy those choices: Rift's
frozen task requires unchanged harness and explicit phases. No engine262 code
was copied or run. Its separate suite submodule revision is not our corpus pin.

The pinned INTERPRETING text contains an apparent DONOTEVALUATE prose mismatch
(runtime ReferenceError restriction followed by parse/resolution examples).
Do not infer classification from that helper's throw or edit the helper. Use
negative.phase and ensure parse-negative bodies never evaluate. The authoring
negative section's older string-conversion phrasing does not override the more
explicit execution guidance's constructor-name rule. Both ambiguities are
recorded rather than silently implemented as output scraping.

Initial raw web retrieval failed with cache miss; a direct PowerShell HTTP read
failed DNS; the single-page fixed specification exceeded web fetch size. Connected
GitHub and fixed multipage specification reads succeeded. Content from failed
requests is not evidence. Retrieval here returned decoded source for inspection;
**no new byte-for-byte download/hash verification of the 33 files is claimed**.
Their blob identities/earlier measurements are inherited accepted CL-004 evidence.
The future adapter must perform its own exact-byte checks before every run.

## Validation and limits

The matrix uses literal expected classifications and explicit prerequisite
assumptions; it is not a test result file. No guest code, harness, reference
engine, probes, typecheck, runner, native build or coverage command was run for
this documentation task. No new runtime support or speed claim is made.
Accepted baseline remains TS-030A `a190709` (production `682280d`), independently
211/211 both hosts, 32 static-only/separate zero-dynamic gates, Windows x64 only.

Documentation checks: count matrix IDs and reject duplicates; recompute corpus
variant counts from accepted JSON; inspect local links and diff whitespace;
verify only owned docs/TASKS are staged. Existing coordinator COORDINATION edit
is outside this task and must not be staged. No historical assistance or evidence
is rewritten. No successor is started. Independent design acceptance and all
future implementation validation remain pending.

Checks completed: 115 unique named rows (I20/V12/H22/O21/T20/C20), 33 files
expanding to60 variants (30 strict/28 non-strict/1 raw/1 module), all local
document links resolve. Initial row-count expression incorrectly expected a
slash after the ID and returned0; corrected to the actual table layout and
required exactly115. No matrix content was changed to satisfy that check.
Coordinator committed its own dispatch at `8f61e91` during this task; inspected
engine baseline remains `19f2529`. No coordinator content is included in our diff.
