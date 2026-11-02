# TS-024A implementation and review handoff

2026-11-02. Existing `codex/primitive-computed-keys`; dispatch/base
`d6ba7f952a40c1d49ca2318e6555507de822cab8`. Accepted design `1b79203`.
Sole implementation writer; coordinator owns acceptance and COORDINATION.md.
Coordinator-only dispatch commit fddf235 arrived during implementation; it
changes only COORDINATION.md. Dispatch base remains d6ba7f9.
No reserved Claude paths, C++, pins, branch switch, main merge or successor work.

## Implementation

`src/abstract-equality.ts` implements the frozen iterative reductions using the
existing InternalBooleanCompletion, equal, stringToNumber and toPrimitive APIs.
Its decreasing weight documents termination; only guest hook reentry recurses,
under the unchanged shared guards. The evaluator passes already captured
right/left Values as specified by fixed ECMA-262 2025 13.11.1 and negates only
normal results. Lexer longest-match and precedence 5 are the only frontend edits.
Strict equality, SameValue, truthiness, primitive converters and wrapper methods
are untouched. Normative/pinned-engine sources remain in the accepted
[design evidence](../ts-024p/README.md); no upstream implementation was copied.

## Required oracle correction: R18

The exact frozen input (129 opening parentheses, `1 == 1`, closing parentheses,
semicolon) produces parse SyntaxError `syntax nesting limit exceeded` at **1:128**,
not the design's 1:129. Statement and expression parsing share the existing depth
counter. The test preserves current behavior; no limit/location logic changed.
[r18-reduction.mjs](r18-reduction.mjs) and [output](r18-observed.txt) retain the
failure reduction, including the already supported strict-operator control.
Acceptance of this correction requires coordinator review. The attempted direct
cross-chat notification was rejected by automatic approval review because the
delegated request did not supply direct human authorization for messaging another
chat. The discrepancy was reported in this chat and retained here; no workaround
was used to send it.

## Validation

Final rebuilt Node/native suites: **172/172 each**, no skips. All original 167
cases remain, plus one equality driver and four CLI diagnostic cases. All original
25 static-only/separate coverage gates remain, plus the equality driver (26 total).
Typecheck passes, runner20/20 and probes10/10. Final CLI coverage is1474/1474;
equality driver1873/1873. Full subprocess and coverage records
are retained alongside the concise command logs (trailing whitespace normalized). Each coverage result is parsed
by the existing fail-closed probeVerdict; no gate or denominator changed.

Commands from typescript/:

```text
npm run typecheck
npm run test:runner
npm run test:probes
npm run test:guest:node
npm run build:native
node tools/run-guests.mjs native
node docs/validation/ts-024a/r18-reduction.mjs
node docs/validation/ts-024a/inventory.mjs
```

Native/probes use the pinned Zig 0.17.0 directory on PATH and approved access to
its installation. Missing-PATH and then sandbox installation-access failures are
retained in `*-missing-zig.log` and `equality-build-first.log`. The initial separate
coverage already passed; there was no semantic/compiler workaround or dynamic
coverage failure. Initial test authoring type errors (Completion narrowing and
method spelling) were corrected without production changes. A guest assignment
to nonwritable function.name was corrected to host descriptor setup for C7,
preserving existing metadata semantics. The function still compares with its
original literal source after the configurable public name changes.

## Matrix mapping

All mappings below refer to `test/abstract-equality.ts` and its runtime fixtures.
Normal pair helpers execute both source orders and both operators against literal
expected booleans; no expected result comes from host loose comparison. K creates
fresh objects for every cell/order/mode. Stateful O rows likewise recreate their
objects and evaluator; runtime mutation examples explicitly reset bindings/traces.
Direct resource checks additionally invoke the evaluator's binary entry with both
operators, separating operation cost from the separately tested AST charges.

| Frozen rows | Executed assertions |
|---|---|
| K all49 | Literal seven-row truth table; direct API and runtime-read x/y operators, both orders including diagonals; exact p:default trace, receiver/hint, zero/one tick and body counts, cleanup. |
| V1-V13 | Typed literal payload table covers NaN, signed zero/infinities, Boolean reductions, string identity, lone surrogates/normalization distinction, whitespace/radix/exponent grammar, invalid strings, under/overflow, nullish and symbol identity. |
| V14-V15 | Same/distinct ordinary objects, identical property/poison-hook objects, wrapper identities and equal-payload distinct boxes; null-root primitive TypeError versus object/nullish noncoercion. |
| V16-V18 | Every frozen primitive hook return opposite zero and symbol; explicit nullish-returning and poison-hook nullish comparisons verify no call. |
| O1-O2 | Runtime fixture logs L;R;P:default for both source orders/operators. |
| O3-O5 | Runtime-read L()/R() operator sources with host builtin marker records assert original completion, Value, diagnostic and location identities and exact left/right/protocol failure traces. |
| O6-O8 | Runtime fixture tests replacement of the captured object's method, captured primitive versus rebound binding, captured object versus rebound variable. Mirrored sources retain source-order effects; moving the read after mutation intentionally changes O7/O8's equality result, asserted literally. |
| O9-O13 | Fresh ordinary-method scenarios: replace next method, change prototype, early primitive skips throwing T, noncallable V skip, null/undefined protocol absence; exact traces/ticks/calls and receiver/args. |
| O14-O18 | All four noncallable protocol values, object protocol result, two object results, original V throw, missing/noncallable methods. Exact TypeError message/location and empty/partial trace, both operators/orders. Guest throw statement location tested separately. |
| O19-O20 | Nullish and same/distinct objects with poison hooks produce fixed booleans without calls, including zero-budget cases. |
| O21 | Runtime-read computed key and opposite operand calls assert K:string;R;P:default and mirrored L;K:string;P:default. |
| O22-O23 | Seeded protocol/valueOf/toString internalGet failures retain exact record identities; scenario hooks check original receiver Value, exact default argument and zero ordinary arguments. |
| R1 | Zero maxSteps/maxCalls primitive/identity/nullish dispatch, both operators/orders; K additionally covers every representative pair's direct charge. |
| R2-R7 | Protocol, ordinary-first, second-method, noncallable-first, absent methods and malformed protocol scenarios have fixed ticks/calls/peak1 counts. |
| R8-R11 | Exact step boundaries and failed ticks, call-depth rejection before body entry; both operator entries/orders preserve costs. |
| R12 | Foreign defining Realm observed inside hook; success, exact guest marker and identical escaping host Error; caller Realm/calls/depth restored, step retained. |
| R13-R14 | Small maxCalls2 and actual default64: recursive host hooks reach exactly3/65 ticks,2/64 bodies/peak, original Realm and calls/depth0 on unwind; subsequent primitive comparison adds0. Runtime-read recursive guest hooks exercise both operators at default64 without a crash. |
| R15-R17 | Statements assert4/5/6 ticks, normal results and exact failing tick locations; no hook body at failed boundary. |
| R18-R19 | R18 corrected1:128 diagnostic retained as above; trusted257-binary AST gives tick257/depth error at original7:9 and restores depth0, both operators. |
| P1-P11/P19 | Fixed runtime values, explicit association/conditional/assignment/unary AST assertions, strict longest-match tokens and comment offsets[6,8). |
| P12-P18 | Exact parse phase/name/message/column for malformed equality, assignment target, comma and unchanged unsupported operators. CLI additionally checks parse exit2 and runtime TypeError exit1 for both operators. |
| C1-C7 | Runtime arrays/holes/nullish/nested arrays, host inherited index, replaced/noncallable join, exact parsed/native function text, public name descriptor mutation and toString override. |
| C8-C13 | Every box category, symbol-box negatives, distinct equal-payload boxes, ordinary objects, null-root failures/identity, foreign and relinked box hook dispatch. |
| C14-C16 | Number equality payload versus unchanged string hint, explicit Object Array/Function tags, strict/truthiness poison-hook controls, Function/Array/Object roots. Existing realm metadata/root-key tests are unchanged. |

## Migration inventory and historical controls

`inventory-before.txt` retains the accepted103-file/8-candidate baseline, inspected
before changes. `inventory.mjs` repeats the same bounded search after implementation
without touching the design's historical output. The only existing test expectation
migration is Array C2: the rejected equality parse becomes executed equality and
inequality success; the runtime fixture now asserts both. The adjacent C3 guest
`delete` rejection and all internal deletion tests remain. Historical TS-022A C2
failure transcripts, prior design/task history and strict/Number/tag controls
remain unchanged. Current feature inventory and architecture notes describe the
new bounded support without changing historical conformance claims.

No BigInt/HTMLDDA, other syntax, new value kind, constructor/accessor/proxy, implicit
boxing or formatter support. Existing Array cycle-empty-string compatibility and
output-allocation limitations remain. Stop after tested commit/push and evidence
handoff; independent review and R18 correction acceptance are outstanding.
