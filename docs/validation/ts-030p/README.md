# TS-030P evidence and migration ledger

Design only, 2026-11-02. Owner chat `01a19ba2-6311-7151-a25c-ae793e03d320`,
dispatch/inspected base `fae6ef9`, existing `codex/primitive-computed-keys`.
Accepted baseline `5169978`: coordinator independently203/203 both hosts and
31 static-only/separate coverage gates. No runtime result is added here.
[Design](../../compound-assignment.md), [literal matrices](matrix.md),
[read-only inventory](inventory.mjs), [retained inventory](inventory.txt).

## Sources actually inspected

Read typescript/AGENTS.md, project goals, compiler contract, frozen TS-030P TASKS
entry, COORDINATION and root Claude Roadmap. Initial root-relative documentation
reads failed; corrected to typescript/. Inspected lexer.ts, parser.ts, syntax.ts,
evaluator.ts, runtime.ts (references and data Set), primitive-conversion.ts,
conversion.ts, object-conversion.ts, array-object.ts, current feature inventory,
and surrounding tests/runner registrations at every migration below. Also read
the prior design/resource evidence and TS-029A's reviewed R30 correction.

Retrieved fixed specification 2026-11-02:

| Source | Evidence used |
|---|---|
| [2025 13.15.2](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-assignment-operators-runtime-semantics-evaluation) | One LHS reference, read, RHS, arithmetic, write, result. |
| [2025 13.15.3](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-applystringornumericbinaryoperator) | Addition converts both primitives before selection; numeric forms convert left then right. |
| [2025 6.2.5.5–7](https://tc39.es/ecma262/2025/multipage/ecmascript-data-types-and-values.html#sec-getvalue) | Boxing, successful key caching, original Receiver and strict rejection. |

Engine262 inspected through connected GitHub at fixed revision
`d553e7b52501fbc47eae981c8d0fa7a5c26d0171` (raw web fetch failed; no claim is
based on that failed fetch):

| File / exact blob | Decision |
|---|---|
| [AssignmentExpression.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/runtime-semantics/AssignmentExpression.mts), `735a33962d2cfb1edad9a5a4a313212b79ffce31` | Final arithmetic branch corroborates captured-reference/read/RHS/helper/write order. Reuse Rift explicit completions, not upstream generators or unsupported branches. |
| [reference-operations.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/reference-operations.mts), `56e90e4beb19ff0f441662ff13ea70a3aac7df5f` | Get and Put reuse successful key conversion and original base. Existing Rift helpers already supply this. |

No upstream code copied or engine executed. Numeric/error expectations are
source/spec-derived, and resource counts are derived from local guards. No host
eval/Function/vm, speculative compiler probe, runtime change or feature test run.
The specification is authoritative; engine source corroborates architecture.

## Precise future migrations

Run `node typescript/docs/validation/ts-030p/inventory.mjs` from repo root.
The inventory contains **141 files and 161 candidate lines**. It includes host
code containing compound operators, which is not
guest feature support. It excludes historical validation/generated builds and
Claude assistance. Current candidate lines are retained in inventory.txt.
The following are the complete affected current guest rejection sites found by
manual classification; line numbers refer to fae6ef9. Never bulk replace `+=`.

| ID / current site | Required implementation migration |
|---|---|
| A1 `src/lexer.ts:104` | admit only five tokens; other rejected tokens and comment priority unchanged. Dedicated P matrix covers longest matching. |
| A2 `test/abstract-equality.ts:469` | keep source `1 += 1;` and existing test label; change message from `unsupported operator: +=` to `invalid assignment target`, column3 to1. Still parse SyntaxError, no effects; append separate `1 **= 1;` rejection control if needed. |
| A3 `test/primitive-reads.ts:764`, W16 ParseBoundary | replace only `p.x += 1;` row with `p.x **= 1;`, message `unsupported operator: **`, column remains5. Retain W16 identity and other rows/assertions. Add positive compound coverage in new driver. |
| A4 `test/property-assignment.ts:1355`, C8 Unsupported | same replacement as A3; retain C8 category and every other assertion. The source-suffixed sublabel necessarily reflects **=; document this in implementation audit. |
| A5 `test/fixtures/primitive-reads-parse.js:1` | exact source `effect(); p.x += 1;` becomes `effect(); p.x **= 1;`. Same filename, no output, parse exit2; retains whole-file parse-before-effects. |
| A6 `test/fixtures/property-assignment-parse.js:1` | same exact source replacement, same filename and parse-before-effects intent. |
| A7 `tools/run-guests.mjs:28,37` | only these two baseline expected records change from `1:15: parse SyntaxError: unsupported operator: +=` to `1:15: parse SyntaxError: unsupported operator: **`; status2 and empty stdout preserved. No baseline case is removed or renamed. |
| A8 `docs/feature-inventory.md:12,16` | after implementation passes, list exactly five arithmetic compounds, keep other compound families excluded; distinguish simple assignment RHS-before-Put from compound Get-before-RHS. Append current architecture decision; do not rewrite dated historical sections. |

No baseline test/cases.json entry needs changing. Host compound expressions are
untouched. Existing W17/W18 read-before-write direct API controls stay intact.
All historical design matrices, evidence, transcripts, hashes and audits remain
immutable, including old primitive rejection expectations recorded as history.
Do not rewrite prior preservation scripts to make future suites pass their old
baseline assumptions. The future task needs its own preservation audit.

That audit must compare against `5169978` (or fae6ef9, which only adds task/docs):
all203 case names retained, only the two A7 expected-record changes, all31 gate
entries retained, fixture bytes unchanged except A5/A6, driver changes confined
to A2/A3/A4 and new additive tests. Register the new driver in Node/native and
static coverage without suppressing existing assertions, cases or gate failures.
Do not make existing negative fixtures successful runtime programs: `effect()`
is intentionally unresolved and must never run in these parse checks.

## Review-sensitive choices and limits

Separate compound Expr keeps simple assignment and hand-built assign nodes stable.
Only parser/lexer/syntax/evaluator need core edits. Existing arithmetic and reference
helpers should remain byte-identical apart from a justified comment; no generic
assignment framework, synthetic binary AST or new tick is proposed.

The resource matrix distinguishes key recursion (Get happens before RHS:
261/325 default host/guest) from operand recursion (RHS already evaluated:
326/390). These are derivations, not newly measured native results. Identifier
callee reference adds zero evaluation ticks, so R19 is5, not6. All counts depend
on exactly the stated non-ticking observer bodies and parsed sources. Any changed
setup must have a separate derivation; never adjust an oracle merely to match
both hosts. If actual counts conflict, retain failure and stop for independent
review of the reduction before changing the design or runtime guard behavior.

No unresolved semantic alternative is proposed. Native static compilation of the
new union arm and actual recursion remain unverified until implementation. Full
ECMAScript/test262 compliance, other platforms and performance are unclaimed.
Design checks verify inventory stability, row IDs and links; they are not feature
acceptance. Independent design review is required before implementation.
