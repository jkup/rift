# TS-025P evidence and review boundary

2026-11-02. Sole design writer: assigned Codex chat on existing
`codex/primitive-computed-keys`. Assignment base `1bb6ed8`; observed checkout
`b9075885b866d03ea1fd1c7de91a9986140259ed`. Runtime baseline remains independently
accepted `fc19afe`:172/172 both hosts,26 static-only/separate coverage gates.
[Design](../../delete-operator.md), [fixed matrix](matrix.md),
[inventory script](inventory.mjs), [inventory](inventory.txt).

## Sources inspected

Fixed edition retrieved with web tools on 2026-11-02:

- [ECMA-262 2025 13.5.1](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-delete-operator):
  early identifier errors, recursive parenthesis rule, property/nonreference split,
  ToObject before deferred key conversion, strict false translation.
- [13.3.3-4](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-evaluate-property-access-with-expression-key):
  base and key evaluation leave a Value in the reference; no eager key conversion.
- [6.2.5 and GetValue/PutValue](https://tc39.es/ecma262/2025/multipage/ecmascript-data-types-and-values.html#sec-reference-record-specification-type):
  reference fields, distinction from values, deferred key conversion. Rift's
  object-only reads/writes are a retained restriction, not the full spec algorithm.

Pinned sources retrieved with the connected GitHub fetch_file tool:

| Engine/ref | File/function inspected | Git blob |
|---|---|---|
| engine262 `d553e7b52501fbc47eae981c8d0fa7a5c26d0171` | [UnaryExpression.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/runtime-semantics/UnaryExpression.mts), Evaluate_UnaryExpression_Delete | `4414ff45fc189bac0339624adfa4695a3c9864ca` |
| V8 `13.0.245` | [bytecode-generator.cc](https://github.com/v8/v8/blob/13.0.245/src/interpreter/bytecode-generator.cc), VisitDelete | `c0f7bca3472c857d88fdd29b51d9dd412cfbce12` |
| V8 `13.0.245` | [parser-base.h](https://github.com/v8/v8/blob/13.0.245/src/parsing/parser-base.h), ParseUnaryOrPrefixExpression strict identifier branch | `f9df40e6b63421e3990b7fef43d6dbdae6a0162e` |

engine262 confirms boxing/key/delete/strict-result order and completion handling.
V8 confirms separate property deletion without target load, value operand effects,
and parser rejection in strict mode. V8's sloppy environment deletion and optional
chain branches are intentionally not adopted. This inspection does not claim V8
runtime builtin behavior was exhaustively audited. No guest programs were sent to
another engine and no source was copied. First GitHub request used an incorrect
parameter name and was rejected before retrieval; corrected repository_full_name
retrieval succeeded. This was not a compiler or semantic failure.

## Local inspection

Read AGENTS, project goals, compiler contract, frozen task, current scope notes;
inspected parser primary/precedence/parentheses/nesting/source offsets, lexer
tokens, syntax unions, evaluator reference/evaluate/call/tick/finally, Reference
and GetValue/PutValue, internalDelete and descriptors, Array storage/truncation,
String virtual indices, ToObject factories, primitive/key conversion and symbols.
Read the current C3 assertion and runtime fixture, internal deletion controls,
primitive-base restriction timing and existing equality design conventions.

The proposed helper uses already demonstrated interfaces. No concrete compiler
uncertainty justified a probe. There is no implemented delete prototype, generated
AST execution, compiler workaround or runtime evidence hidden in this directory.

## Reproducible inventory and exact future migrations

From repository root:

```powershell
node typescript/docs/validation/ts-025p/inventory.mjs
git diff --check
```

Result: **109 files inspected;117 candidate lines**. The script scans src/test,
top-level tooling and the two current scope documents; it deliberately excludes
historical evidence and reserved assistance outputs. It is a candidate search,
not proof of semantic exhaustiveness. Manually inspected the expression/object
scope rows too (the word deletion does not match the inventory's delete token).

| Current site | Required future disposition |
|---|---|
| test/array-string-conversion.ts:596-599 | Replace the C3 parse rejection for `let object = {}; delete object.x;` with parse success and successful evaluation/true capture. Existing parse failure at1:18 is historical only. |
| same file:600-610 host loop | Keep its exact empty/pair ToPropertyKey and internalDelete assertions as low-level controls; add guest-path assertions, do not replace away coverage. |
| test/fixtures/array-string-conversion.js:24 | Replace the comment with `check(delete object[empty]); check(delete object[pair]); check(object[''] === undefined); check(object['1,2'] === undefined);`. Later custom pair.join/method test remains unchanged. Driver additionally inspects absence of own descriptors. |
| src/parser.ts unary branch and RESERVED | Add delete handling; retain delete as reserved binding word, all other unsupported words, literal/source offset behavior and parse limits. Lexer/AST shape need no change. |
| src/evaluator.ts unary branch | Route member delete through reference, not evaluate/GetValue; nonreferences still evaluate normally. Preserve other unary, binary, assignment and call branches. |
| docs/feature-inventory.md Expressions/Objects/Own keys-deletion rows | Record strict-delete subset and its primitive-base exception; distinguish legacy internal false from guest failure. Remove only current guest-delete absence statements; retain historical TS-004C stage meaning. |
| docs/architecture-decisions.md strict-call paragraph, deletion paragraph at205, C3 paragraph at783-785 | Explicitly add strict-delete policy without claiming complete strict Scripts; mark C3 closed only after implementation validation. |
| docs/validation/ts-022a/c3-unsupported-delete.txt and earlier task/design history | Preserve verbatim; new evidence links backward rather than rewriting failure history. |

All internalDelete tests in object-keys/descriptors/prototypes, array-like/storage,
coercion consumers and Realm tests retain their exact expectations. They cover
normal false, virtual indices, inherited descriptors, nonextensible objects,
symbol identity and order; the new strict wrapper must not change that API.
Existing primitive read/write timing in property-key-conversion.ts remains BK/BKR
before base restriction and before key conversion. Saved methods, Number string
hint limitations, Function retained source, null-root and both-object negatives
remain unchanged. No other current delete rejection assertion was found.

## Review and validation limits

P1-P27, D1-D26, E1-E26, R1-R21 and C1-C10 specify 110 primary rows plus their
explicit variants. Expected values/effects come from the proposed fixed semantics
and current source, not engine agreement or a self-generated expected output.
Manual position review corrected the draft recursive guest-hook member column
to30 for the exact declaration shown; no parser changes or test expectations
were edited. Counts assume preseeded bindings and exclude setup/inspection.
No new runtime, native build, full suite or static coverage was run. Native
default64 recursion and the precise proposed guard boundaries remain unvalidated
until implementation; a crash would block acceptance.

Documentation checks: inventory reproduced; git diff --check passes. The one
initial shell inspection command used unsupported PowerShell brace syntax and
failed before the task claim; corrected command claimed the task successfully.
Missing guessed filenames were resolved by rg file inventory; no files outside
the owned paths were changed. These read/command errors are not hidden skips.

The strict-delete policy is proposed for coordinator acceptance before code.
No production/integrated tests/manifests, pins, C++, Claude paths or COORDINATION
were edited; no branch switch/main merge/successor. Commit/push design and stop
for independent review. Baseline172/172/26 proves no guest delete support.
