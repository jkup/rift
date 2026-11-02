# TS-026P design evidence and handoff

2026-11-02. Design owner: Codex chat `01a19afd-670b-7703-9dcf-262da02d06bf`.
Dispatch base `b856f28`; inspected checkout `9a3c5bd5281674491f11a97b9e204dfdf80fec1e`
adds the coordinator's dispatch record. Existing branch
`codex/primitive-computed-keys`; no branch switch or main merge.

[Design](../../typeof-void.md), [named matrices](matrix.md),
[reproducible inventory](inventory.mjs), [candidate lines](inventory.txt).

## References actually inspected

Retrieved fixed-edition specification with web tools on 2026-11-02:

- [ECMA-262 2025 13.5.2 and 13.5.3](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-typeof-operator):
  operand evaluation, the unresolvable-reference exception, GetValue and
  classification; void's mandatory GetValue before discarding. Also inspected
  adjacent delete early errors and unary grammar for nested operator cases.
- [2025 Reference records and GetValue](https://tc39.es/ecma262/2025/multipage/ecmascript-data-types-and-values.html#sec-getvalue):
  unresolved reference versus binding reference; property boxing/deferred key
  conversion. Rift's existing object-only reads remain a stated restriction.
- [2025 Declarative GetBindingValue](https://tc39.es/ecma262/2025/multipage/executable-code-and-execution-contexts.html#sec-declarative-environment-records-getbindingvalue-n-s):
  an existing uninitialized binding fails independently of strictness.

Pinned engine files retrieved with connected GitHub fetch_file:

| Revision / file | Inspected path | Git blob |
|---|---|---|
| engine262 `d553e7b52501fbc47eae981c8d0fa7a5c26d0171` [UnaryExpression.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/runtime-semantics/UnaryExpression.mts) | Evaluate_UnaryExpression_Typeof and Void; dispatch | `4414ff45fc189bac0339624adfa4695a3c9864ca` |
| V8 tag `13.0.245` [bytecode-generator.cc](https://github.com/v8/v8/blob/13.0.245/src/interpreter/bytecode-generator.cc) | VisitVoid, VisitForTypeOfValue, VisitTypeOf, BuildVariableLoad and its accumulator wrapper | `c0f7bca3472c857d88fdd29b51d9dd412cfbce12` |

engine262 preserves completion propagation and checks the unresolved reference
before GetValue, then classifies callability. Adopt that ordering, without its
generator architecture or absent BigInt. V8 confines typeof's special variable
load mode to direct variable operands; local/context/module loads still retain
hole checks. Its void effect visit and undefined result confirm mandatory
operand effects. Adopt the localized mode idea at Rift's guarded evaluate entry;
do not import bytecode, optimizing effect elimination, dynamic-scope handling,
global undefined optimizations or HTMLDDA. No engine code was copied; no guest
program was executed by another engine. These references support the design,
not a claim to have audited every V8 runtime builtin.

## Local paths inspected

Read typescript/AGENTS.md, project-goals, compiler-contract, assigned TASKS
contract, current feature inventory and preceding delete design/evidence.
Inspected lexer word/terminator/source offsets; parser primary, precedence,
parentheses, reserved binding names, nesting, functionTail source range;
syntax Expr/Completion-related types; evaluator block instantiation, reference,
evaluate, unary/call, ticks/depth/Realm finally; runtime Value, callable slot,
Environment.resolve, getValue/putValue; Realm factories/prototypes/Number and
Function registration; primitive conversion and ToPropertyKey; interpreter/CLI
phase handling. Read current delete badSources/columns/messages and its runtime
fixtures, previous resource recurrences and source-retention consumers.

The special identifier path reuses the guards rather than bypassing them.
Classification and discard add no calls or coercion. Resource recurrences are
derived from the actual call/reference split (calls do not evaluate the direct
callee identifier as a separate node). R19 explicitly distinguishes recursive
evaluate from statement; R21 includes the guest return statement.

## Reproducible rejection audit and exact migrations

From repository root:

```powershell
node typescript/docs/validation/ts-026p/inventory.mjs
git diff --check
```

**113 files inspected; 183 candidate lines.** The broad search deliberately
retains host TypeScript void annotations and typeof checks; they are not guest
operator support. Manually reviewed candidates: the only current guest rejection
assertions found are the two TS-025A rows below. No JS fixture/cases.json/tooling
operator rejection was found. Scope expression rows require an addition even
though they do not contain either keyword and thus are not candidate hits.
Historical validation, earlier task prose and reserved Claude outputs are excluded.

| Current location | Exact eventual migration |
|---|---|
| `test/delete-operator.ts:128-129` badSources indices9/10 | Move `delete typeof x;` and `delete void x;` from rejection loop into named parse-success/runtime assertions. With initialized x=7 both return true without deleting/changing x. With absent x, first returns true and second throws ReferenceError `x is not defined` at1:13. Add TDZ variants: both throw at1:15 /1:13. |
| same file columns at134 and messages145-146 | Remove exactly corresponding two column8 entries and two unsupported messages together with source entries. Keep all other parallel-array indices aligned; all remaining strict-delete/assignment/super/comma/nesting assertions unchanged. Prefer named migration scenarios, not opaque index labels. |
| `test/fixtures/delete-operator.js`, `delete-effects.js` | No typeof/void rejection text found; retain existing content. New runtime-read typeof/void fixtures carry new coverage; no gratuitous old-fixture rewrite. |
| `test/array-string-conversion.ts` C3 and fixture | Already migrated to success by TS-025A. Keep guest-delete assertions and raw internalDelete controls intact. |
| `src/parser.ts` primary/RESERVED | Add unary recognition only; retain reserved binding rejection and all unrelated unsupported syntax. |
| `src/evaluator.ts` evaluate/unary | Add localized allowUnresolvable path with unchanged guards and default false; void/typeof before numeric fallback. Do not change normal identifier/member/call behavior. |
| `docs/feature-inventory.md` Expressions and Scope | Add bounded typeof/void, missing-name exception vs TDZ, no coercion and unchanged primitive-read restriction only after implementation validation. Keep historical staged rows and absent features honest. |
| `docs/architecture-decisions.md` expression/reference/resource discussion | Document localized identifier handling, pure classification, effectful operand GetValue and exact guard invariants; append implementation evidence link. |
| `docs/validation/ts-025p/matrix.md` P23/P24 and ts-025a evidence | Preserve historical unsupported expectations and transcripts verbatim. Link new migration evidence rather than rewriting history. |

No host typeof checks, host void return types, Number namespace semantics,
internalDelete, binding mutation rules, function source, or unrelated reserved
word failures migrate. Compiler/toolchain pins and C++ stay unchanged.

## Evidence limits and review boundary

V1-V17, B1-B20, E1-E24, P1-P26, R1-R25, C1-C8 are **120 named primary rows**
plus explicit variants. Values, diagnostics and resources are proposed fixed
oracles derived from specification and current source. They require independent
review and implementation validation. A native stack crash or dynamic coverage
would block implementation acceptance, not justify a relaxed gate.

Inventory reproduced and documentation whitespace checked. No runtime suites,
typecheck, native build or coverage were run for this documentation-only task.
No concrete compiler uncertainty warranted an isolated probe. Accepted baseline
through27e5b27 remains177/177 each host and27 gates; that is prior coordinator
evidence, not new typeof/void support or a rerun here.

Initial inspection used root-relative docs names rather than typescript-relative
names and guessed split runtime filenames; those reads failed and were corrected
by actual source inspection. One Set-Content -NoNewline command was unsupported
by the shell; the task claim was then written with File.WriteAllText. No semantic
probe/test failure was hidden by these command corrections.

Only the design, this evidence directory and TS-026P claim/handoff are owned.
No production/integrated tests/manifests/pins/C++/Claude/COORDINATION edits.
Commit/push coherent design as authorized, then stop for coordinator's independent
review. No successor is claimed and this task is not self-accepted.
