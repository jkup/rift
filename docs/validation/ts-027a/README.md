# TS-027A implementation evidence

Implementation on 2026-11-02, dispatch base `f3b962f`, existing
`codex/primitive-computed-keys`. Independent review is pending.

The production change only admits the word token `in` at relational precedence
and adds the agreed branch to Evaluator.binary. Both captured operand Values
precede RHS object validation, one string-hint ToPropertyKey and one existing
internalHasProperty. No new AST, object API, conversion subsystem, boxing or
semantic target Get. Existing guards and Realm transitions remain unchanged.

The [accepted matrix](../ts-027p/matrix.md) has 125 primary rows plus variants.
The dedicated `test/in-operator.ts` driver uses named scenarios, literal values,
traces and error locations. Target overrides poison semantic Get and count Has;
Array/String subclasses retain their actual exotic descriptor dispatch. The
preservation helper checks identity, ordered keys, descriptors and prototype.
Wrapper payloads, array lengths, explicit mutations, sentinel identity, host
fault identity, Realm restoration and reuse are checked separately.

## Validation

- `npm run typecheck`: pass.
- `npm run test:runner`: 20/20.
- `npm run test:probes`: 10/10, both lanes and separately parsed coverage.
- Rebuilt Node and native guest suites: 189/189 each, no skips.
- `audit.mjs` re-parses every native coverage report using the fail-closed
  acceptance parser and compares every baseline case name/expected record and
  every native entry against TS-026A. Verified totals: 189 cases and 29 gates (CLI1530, driver2185 static statements),
  preserving all 182 baseline cases and 28 baseline gates without migrations.
- R18-R23 invoke actual default maxCalls64 (no override) in both hosts. Host
  recursion fails at261 ticks; guest recursion at325 ticks, maximum depth131;
  exactly64 hooks, zero target Has calls, restored calls/depth/Realm. Small
  limits, step-before-call priority and seeded frame restoration are distinct.

Native linking uses the installed pinned Zig directory on PATH, with authorized
access to the linker/libraries. No toolchain pin or production workaround changed.
This is Windows x64 evidence, not a new portability or performance claim.

## Retained failures and oracle discrepancy

1. `driver-node-initial.txt`: a harness error used block's normal(undefined)
   result as an expression oracle in P1. Single expressions now use statement;
   P16 checks its initialized binding after the program. No engine or semantic
   expected value changed.
2. `driver-node-second.txt` and `parse-reduction.mjs` / `parse-reduction.txt`:
   P18 and P23's frozen message text omitted the existing parser's found-token
   suffix. The actual diagnostics are `expected ';', found 'in'` at1:3 and
   `expected ';', found 'instanceof'` at1:3. This contradiction was reported in
   the implementation chat before adjustment. Tests assert the complete existing
   diagnostics; parser error formatting was not changed. The accepted historical
   matrix remains intact for review. All other frozen diagnostics/counts matched.
3. `driver-node-third.txt` records the first complete driver pass. Subsequent
   additions strengthen Array/String no-Get/one-Has checks and align E21's added
   payload exactly with the contract's undefined. Final driver and suite runs
   cover those changes.

No prior rejection assertion was removed or weakened. Existing raw presence,
map, typeof/void, delete, equality and source-retention controls remain in their
original gates. No C++, Claude output, coordination file, branch switch, main
merge or successor task was touched by this implementation.

4. The first native gate run rejected one dynamic operation in the new driver,
   despite static-only build success and a misleading 100% static headline.
   `native-initial-results.json` and `coverage-explain-initial.txt` retain the
   failure. `catch-identity-before.ts` reduces it to comparing unknown catch
   value directly with Error; its coverage has one dynScalarEq. The after case
   narrows with `instanceof Error` before identity comparison: eight/eight static,
   zero dynamic. Both reductions retain build, Node/native and coverage evidence.
   The driver uses that explicit narrowing without changing the required same
   Error-instance assertion. Production code is unchanged.

Readability follow-up: [test-only cleanup and preservation audit](readability/README.md)
expands statements/blocks and four resource selections. Rebuilt Node/native189/189
and29 static/coverage gates pass again (driver2215); all702 string literal
occurrences, assertions, prior189 expected records and29 entries are preserved.
