# TS-019P design evidence

2026-11-02. Sole design writer: Codex chat
`01a199dc-85b9-7592-b055-6a5814f8243a`. Assigned base `9b8b81d`, inspected clean
checkout `4e36a69` on `codex/primitive-computed-keys`; coordinator dispatch kept.
Deliverable: [symbol-foundation.md](../../symbol-foundation.md).

## What was inspected

Read typescript/AGENTS.md, docs/project-goals.md, docs/compiler-contract.md,
TASKS.md (including exact TS-019P scope), primitive-wrappers.md and accepted
TS-018B evidence. Runtime source review covered all six Value-kind switches in
runtime/conversion/object-conversion; full storage and Reference operations;
primitive-conversion; property-keys; primitive-objects; Realm/bootstrap;
array-object/array-like/array-map; evaluator references, unary/binary/call paths;
builtins object/function/number; CLI/interpreter; parser/lexer/syntax literal and
member boundaries; and existing object compiler probe. Searched host drivers for
key signatures, snapshots, ordering, diagnostic concatenation and overrides.

[inspection-index.txt](inspection-index.txt) retains the mechanical caller/index
search at the inspected revision (paths are repository relative). The command was:

```powershell
rg -n 'ownPropertyKeys|\.properties|PropertyKey|key: string|_key: string|switch\s*\([^)]*\.kind' typescript/src typescript/test
```

Additional searches targeted internalGet/HasProperty/Set/Delete/getOwnProperty,
arrayIndex, key concatenation, own-key joins, parser unsupported keywords, and
symbol/map compiler evidence. The design contains the reviewed disposition of
every production file and the complete narrow-override migration list. The raw
index is an inventory aid, not proof that widening a type alone is sufficient.

## External references actually consulted

Fixed ECMA-262 **2025 edition 16**, sections 6.1.5/6.1.5.1, 7.1 conversion
operations, ordinary/String key ordering, Symbol objects/prototype/extraction,
and Object toString. Exact versioned section links are in the design. Web fetches
confirmed shared well-known values and that Symbol.prototype lacks SymbolData.

Engine262 revision **d553e7b52501fbc47eae981c8d0fa7a5c26d0171**, these exact paths:

- src/value.mts: SymbolValue, PropertyKeyValue, wellKnownSymbols.
- src/abstract-ops/type-conversion.mts: ToPrimitive, OrdinaryToPrimitive,
  ToNumber, ToString, ToObject, ToPropertyKey.
- src/intrinsics/Symbol.mts: separate factory/registry/static registration.
- src/intrinsics/SymbolPrototype.mts: payload extraction and method registration.
- src/intrinsics/ObjectPrototype.mts: builtin classification and real tag Get.

Initial web raw-source requests returned cache misses; sandbox PowerShell fetches
failed DNS resolution. Approved read-only PowerShell Invoke-WebRequest fetches
then succeeded against raw.githubusercontent.com at the pinned revision. These
were source reads, not engine executions or compiler probes. No downloaded engine
source is committed or copied into production. The design records adopted and
rejected patterns and does not adopt the reference engine's living-spec additions.

## Validation and limits

The current accepted baseline comes from TS-018B and its coordinator acceptance:
164/164 Node, 164/164 native, 23 static gates; typecheck, runner20 and probes10
passed there. **These were not rerun for this documentation-only task.** No new
symbol behavior, native compilation or performance result is claimed.

Existing compiler-contract evidence covers an isolated union Map and the
committed objects probe covers split string/class maps. Neither is proof of the
proposed integrated Value/key/subclass migration. No new genuine compiler
uncertainty needed an isolated probe before writing the contract, so none was
created. Implementation must run both hosts and every build/coverage gate.

Design review checks: six Value switch sites accounted for; key diagnostics avoid
implicit host coercion; all narrow observer signatures enumerated; ordinary and
String snapshot order distinguished; symbol root has no slot; Symbol tag fallback
corrected explicitly; well-known sharing does not stop at an agent boundary;
protocol identities appear only with their consumer; matrices specify identity,
effects, errors, receiver/Realm ownership and budget behavior. Existing negatives,
denominators, pins and measured callback/import workarounds remain required.

Scoped whitespace check: `git diff --check` passes (Git reports only the existing
CRLF-to-LF normalization advisory for TASKS.md). Source/tests/manifests/pins,
C++, Claude outputs and COORDINATION.md are unchanged. Handoff stays in progress,
awaiting coordinator acceptance; no successor is assigned.
