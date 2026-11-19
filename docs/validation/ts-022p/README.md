# TS-022P design evidence

2026-11-02. See [the design](../../array-string-conversion.md). Design-only
assignment base 3c27e10; observed dispatch checkout 38ca424. No production code,
integrated tests, manifests, pins, C++, companion outputs or COORDINATION edited.

Evidence is source inspection and fixed proposed expectations. No new runtime
support or pass rate is claimed. Accepted runtime baseline 14e3d9d remains the
coordinator's independently verified 164/164 both-host cases and 23 static gates.
No optional compiler probe was needed: this design composes existing typed
callbacks, closures, completion unions and string operations. Their integration
still needs static-only builds, separate coverage and both-host execution in the
future implementation task. No engine executable was used as a semantic oracle.

## Reproduction and source record

Run `node typescript/docs/validation/ts-022p/inventory.mjs` from the checkout.
The retained inventory enumerates candidate tests for manual classification in
the migration table. It is deliberately broader than the required edits, and is
not proof that text search discovers every semantic dependency. Review the
symbolically assembled Array tag in object-valueof.ts as well as literal tags.
Recorded execution: exit 0, `Inventoried 65 test source files; 59 candidate lines.`
`git diff --check` exited 0; only a CRLF-to-LF normalization warning for TASKS.md.

Fixed ECMA-262 2025 indexed-collections page was read through web retrieval:
join 23.1.3.18 (page lines 2846-2867), toString 23.1.3.36 (3434-3445).
Exact source URLs and engine revision/blob identifiers are in the design.
engine262 and V8 files were successfully retrieved through the GitHub connector
at the specified revision/release. Initial web fetches of those engine URLs
failed (cache miss/access failure); these were retrieval failures, not skipped
semantic tests. V8's relevant symbols were ArrayPrototypeJoin,
CycleProtectedArrayJoin, JoinStackPushInline/PopInline and ArrayPrototypeToString;
engine262's were ArrayProto_join, JoinIndexedProperties, ArrayProto_toString and
bootstrapArrayPrototype. Full source copies were not added to the repository.

Local review covered runtime, evaluator, Realm bootstrap, array storage/map/like,
explicit boxing, string/primitive conversions, builtins/object, builtin/function,
and the candidate test files. Commands included git status/branch/log, rg file
and semantic inventories, Get-Content and git diff --check. One attempted task
claim using Set-Content -NoNewline failed due to unavailable parameter, and a
Python fallback could not launch the Windows alias. Neither changed a file;
apply_patch successfully recorded the claim. These are tooling failures only.

## Review limits

J/T/R/C tables are hand-derived acceptance requirements, not measured results.
Budget totals assume direct host-built fixtures and exclude guest AST work unless
specified. No cyclic empty-string convention is implemented or promised. Native
stack safety for the proposed call path, output allocation behavior and exact
integration coverage remain unmeasured. No compiler workaround is proposed.

Smallest next task is the atomic TS-022A scope in the design, after independent
review. Number formatter/CL-005 and cycle-compatibility state remain excluded.
