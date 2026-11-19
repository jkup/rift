# TS-024P evidence and review boundary

2026-11-02. Sole writer Codex chat `01a19aaa-a328-7690-9911-1ecb6b386e9b`.
Assignment base `1a438b5`, current inspected checkout `c695409c`; existing branch
`codex/primitive-computed-keys`. Coordinator owns COORDINATION.md. Claude queue
and assistance paths were not edited. [Contract](../../abstract-equality.md),
[matrix](matrix.md), [inventory script](inventory.mjs), [inventory](inventory.txt).

## Sources actually inspected

Normative fixed edition, retrieved through web tools 2026-11-02:

- [ECMA-262 2025 IsLooselyEqual and IsStrictlyEqual, 7.2.13-14](https://tc39.es/ecma262/2025/multipage/abstract-operations.html#sec-islooselyequal).
  Governs dispatch and supported-kind reductions; no HTMLDDA/BigInt claims.
- [ECMA-262 2025 Equality Operators, 13.11](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-equality-operators-runtime-semantics-evaluation).
  Governs operand evaluation/GetValue order, right/left helper arguments,
  left association and successful-result negation. Swapping source operands
  is not generally effect-equivalent even though captured-value equality is.

Pinned engine evidence retrieved with connected GitHub file reads:

| Revision | File and inspected function | Git blob |
|---|---|---|
| engine262 d553e7b52501fbc47eae981c8d0fa7a5c26d0171 | [testing-comparison.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/abstract-ops/testing-comparison.mts), IsLooselyEqual/IsStrictlyEqual | 18baea3ff8751aaee7aaa1ce6d4d857feff26cdf |
| same revision | [EqualityExpression.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/runtime-semantics/EqualityExpression.mts), Evaluate_EqualityExpression | fcd3617f53a0d78bc25731cc3ff18bac88517a9e |
| V8 release 13.0.245 | [objects.cc](https://github.com/v8/v8/blob/13.0.245/src/objects/objects.cc), Object::Equals/StrictEquals | eda5636e187c368ec849c6ab204fe49c335a691e |

engine262 follows spec-shaped recursive generator dispatch and uses explicit
completion propagation. Rift retains its existing synchronous completion model
and avoids recursive helper dispatch. V8's loop confirms iterative reduction is
a practical approach, but its optimized Oddball, undetectable and BigInt branches
are not imported. No upstream code was copied or guest code run by those engines.
The specification governs the proposal; engine agreement is not an oracle.
Initial raw GitHub web retrieval of engine262 failed with a cache miss; connected
GitHub retrieval succeeded. This was a retrieval failure, not a semantic test.

## Local inspection and migration decisions

Read project goals, compiler contract and task; inspected lexer/parser/syntax,
evaluator evaluate/binary/call/tick, runtime Value/equal/sameValue/internalGet,
primitive conversion, numeric-string scanner, Array/Symbol/Function builtins,
Realm factories, CLI statuses and the existing C2/C3 test sites. No new static
compiler uncertainty arose: unions, loops, completions and these calls are
already exercised. Therefore no optional compiler probe is warranted. This does
not prove that the future integrated helper will compile statically.

Reproduce the candidate inventory from repository root:

```powershell
node typescript/docs/validation/ts-024p/inventory.mjs
git diff --check
```

Result: **103 files inspected; 8 candidate lines**.
The script reads src/test, top-level tools and the two current scope documents;
it excludes historical evidence and reserved assistance subtrees. It records
candidate lines, not an exhaustive semantic proof. Broader read-only rg search
found an assistance audit regex and historical C2 transcript; neither changes.

| Candidate | Future disposition |
|---|---|
| src/lexer.ts rejected-operator list | move exactly == and != to accepted two-character branch |
| test/array-string-conversion.ts C2 parse/assertion (currently around 588-591) | replace rejection with successful equality and inequality checks; preserve case count and all other assertions |
| test/fixtures/array-string-conversion.js C2 comment | replace with `check(empty == 0); check(!(empty != 0));` |
| docs/feature-inventory.md expression row | add supported bounded ==/!=; remove loose-equality exclusion only |
| docs/architecture-decisions.md C2/C3 gap paragraph | state C2 closed by future implementation; C3 remains open; preserve historical meaning |
| tools/probe-verdict.mjs host null checks | no change: harness JavaScript, not guest equality |
| tools/assistance/custom-test-audit/inventory.mjs regex | no change; reserved assistance |
| docs/validation/ts-022a/c2-unsupported-equality.txt and prior design/task history | retain historical failure verbatim; link new evidence |

No existing integrated `!=` rejection assertion was found. The old C2 guest
parse failed at 1:23 (`let empty = []; empty == 0;`); retained fixture transcript
failed at 14:13. Those are historic inputs, not new diagnostic expectations.
Strict equal, SameValue NaN/signed-zero, truthiness, Object explicit tags,
Number string-hint formatting boundary, Function source/native form, root keys,
symbol payload identity and null-root/two-object negative tests are controls.
Do not change their expectations as a side effect of this feature.

## Oracle review and validation limits

K is a complete 7 by 7 independent constant table; V1-V18, O1-O23, R1-R19,
P1-P19 and C1-C16 cover variants that representative kinds alone cannot prove.
All normal rows require both operators and both operand orders. Effect traces
are source-ordered, not generated by the proposed implementation. Exact resource
rows distinguish direct-helper cost from AST/builtin cost. Host-only setup is
explicit where guest syntax cannot express a case.

Manual source checks corrected two draft clerical assumptions before handoff:
Parser.expect says `found`, not `got`; cli.ts uses exit1 for guest throws, not3.
No production behavior was changed to fit an oracle. The matrix now freezes the
existing diagnostics. Parser locations and resource counts are source-derived
proposals to verify independently during implementation, not observed new runs.

No production, integrated tests, manifests, C++, pins or workarounds changed.
No runtime suite/build/coverage run was needed for this design-only task.
The supplied accepted baseline remains `0de8488`: independently 167/167 in both
hosts, 25 static-only builds and separate coverage gates. It proves no new
equality support. Optional probes: none; no compiler or execution evidence
is hidden behind the documentation checks.

Hand off coherent design/evidence commit on the existing branch and stop for
independent review. No branch switch, main merge or successor assignment.
