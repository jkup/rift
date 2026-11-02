# TS-030A implementation evidence

Implementation for independent review, 2026-11-02. Owner chat
`01a19baf-2549-75f0-84bd-e8094fe3de3d`, dispatch `f587e86`, existing
`codex/primitive-computed-keys`. Accepted design `a7294bb`; baseline `5169978`.
This handoff does not self-accept the task or authorize a successor/main merge.

## Change and scope

Only +=, -=, *=, /= and %= are admitted. A separate compound Expr captures a
reference once, gets its old Value before evaluating RHS, applies the existing
binary helper, and puts the result using the same reference. Assignment parses
right-associatively. Existing reference/binary helper bodies, runtime.ts,
conversion, boxing and Array definition paths are unchanged. No synthetic
binary AST or extra tick. Other operator families, built-ins, pins, C++, Claude
outputs and COORDINATION.md are unchanged.

The [178-row map](matrix.md) links every frozen row to the dedicated readable
[test driver](../../../test/compound-assignment.ts). Every applicable five-op
variant runs under both hosts; literal values include NaN and signed zero.
Seven committed disk-read CLI fixtures plus the new driver add eight cases.
Their literal stdout, stderr and status records live in run-guests.mjs.

## Final validation

| Check | Result | Evidence |
|---|---|---|
| Typecheck | PASS | typecheck.log |
| Runner acceptance regressions | 20/20 | runner.log |
| Compiler probes | 10/10, both hosts and parsed static coverage | probes.log, probe-results.json |
| Rebuilt Node suite | 211/211, no skips | node.log, guest-node-results.json |
| Rebuilt native suite | 211/211, no skips | native.log, guest-native-results.json |
| Native static-only builds and separately parsed coverage | 32/32; zero dynamic statements | native-build-results.json, preservation-and-coverage.json |
| Dedicated driver coverage | 2756/2756 static statements | coverage-final.log |
| Preservation audit | PASS | audit.mjs, audit.log, preservation-and-coverage.json |

The actual omitted-constructor-limit64 native runs pass for each of the five
operators: key host261/guest325 steps, operand host326/guest390; peaks67/131.
Right-operand reentry uses the same counts. Small0/1/2 limits, step-before-call,
foreign defining Realms, primitive key-recursion box count65, caller/defining
Realm box split1/64, seeded calls2/depth4 cleanup and postfailure evaluator reuse
are asserted. No native crash, timeout, skip or unresolved oracle contradiction.
This is bounded Windows x64 evidence, not a general native safety, performance
or ECMAScript conformance claim.

## Exact baseline migration audit

`node docs/validation/ts-030a/audit.mjs` from typescript/ independently reparses
retained coverage with the unchanged fail-closed gate. It checks all203 previous
case names and their expected records, all31 native gate entries,70 prior
fixtures and35 prior TypeScript drivers against baseline5169978. Only two old
expected records change: primitive-reads-parse and property-assignment-parse now
reject **= with the same status2 and empty stdout. Their files replace only +=
with **= (including preservation of their differing final-newline bytes).
Abstract-equality retains `1 += 1;` and its label, now invalid-target at1:1.
Primitive-reads W16 and property-assignment C8 migrate only the obsolete += row
to **=; C8's source-derived sublabel follows that source. No case name removed.

A8 updates current scope and appends an architecture decision. Historical
validation evidence and frozen matrices are untouched. Runtime helpers and
binary/reference source bodies compare exactly after repository newline
normalization. No weakened baseline assertion or old preservation script edit.

## Retained failures and reductions

See [corrections](corrections.md). The initial new CLI throw record was a local
fixture-authoring error, corrected from source inspection; the frozen matrix
needed no adjustment. The sandboxed Zig access failure is retained separately.
The first elevated native build exposed three test-only dynamic statements,
correctly rejected despite static-only build success. Minimal before/after
nested-index and callback reductions retain builds, coverage, and literal Node/
native execution results. Full-signature callback typing and string slice fix
the tests without changing engine semantics, guards, pins or acceptance rules.
The intermediate parameters-only reduction still inferred a dynamic adapter;
its failed transcript is retained and explicit types make that reduction static.

Independent coordinator review and acceptance remain pending.

## Independent review revision

The coordinator independently reproduced the original211/211 suites and32 gates,
then identified three assertion gaps. This revision leaves production unchanged:

- R1–R28 now use a literal progress/state table for Get, Set, RHS evaluator entry,
  successful RHS completion, builtin RHS body execution and stored target state.
  R27 additionally checks progress on the exhausted second attempt. The original
  resource/diagnostic/hook/cleanup assertions remain intact.
- C3 enables old/right operand hooks and asserts BKCGRLHS. The existing per-stage
  Realm checks now require foreign R followed by caller L/H/S.
- Explicit stored values cover E21/E22 freeze, E25/E26/E27 immutable bindings,
  E28 outer binding, W3 readonly property, W8/W10 prototype property and W16/W17
  Array indices. Expected values are frozen literals, never copied from results.

The earlier final evidence is preserved under pre-review/. The refreshed evidence
above represents the review revision; no test, production or oracle failure was
encountered in this revision. Independent re-review and acceptance remain pending.
