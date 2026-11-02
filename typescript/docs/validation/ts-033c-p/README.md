# TS-033C-P source evidence

2026-11-02. Design only; no engine execution, tests, build, native coverage or
conformance admission. The proposed B01-B18 matrix is unexecuted. See
[frozen design](../../script-realm-bootstrap.md).

Assigned base a4680f3; actual inspected HEAD c15f27b adds coordinator tracking.
The writer claimed TASKS before design edits. Ownership is only the design,
this evidence directory and TASKS handoff. COORDINATION is coordinator-owned
and excluded explicitly from preservation; all other tracked paths outside the
assignment, including Claude Roadmap/CL006 and historical evidence, are protected.

Run from repository root:

```
node typescript/docs/validation/ts-033c-p/audit.mjs
```

This checks the Git diff against the exact base (Git clean filters account for
Windows line endings), rejects out-of-scope new files, records SHA256 and base
Git blob for every source/test file, and generates a numbered migration inventory
of entries, global access, callable factories/dispatch and context forwarding.
The inventory is lexical source evidence, not a reachability proof. The design
interprets the relevant paths; no production file is imported by the audit.
Host-only test262 blocker classification is imported to verify all 60 existing
variants remain blocked. Counts of 212 guest records per lane and 39 gates are
read from accepted TS033B evidence, hash-recorded and explicitly inherited.
This does not rerun or recertify any historical runtime result.

Read AGENTS, approved goals/compiler contract, TASKS, COORDINATION, Claude
Roadmap, accepted Script design, TS033B interfaces and actual source paths.
The source audit covers the direct builtin-invoke tests as well as production
Evaluator dispatch, Function.call forwarding, global installers and Map host
seeds. No historical test or manifest changed.

Research: the web reader failed to load the 8MB fixed specification (content
length limit). Initial Node retrieval failed sandbox DNS (ENOTFOUND); an approved
network retry succeeded but exposed attribute-order/alias-anchor matching in the
extractor. Corrected extraction locates the exact id then its enclosing clause.
The final retrieval verified the entire fixed edition's SHA256 against TS033P
before retaining six clauses. `sec-setrealmglobalobject` is an alias inside
InitializeHostDefinedRealm in edition16, not a standalone numbered operation.
`research.mjs` reproduces retrieval; `supplemental-spec.json` retains text, URL,
byte length and original document hash. The large function-properties clause
is contextual research only; it does not authorize those globals.

Pinned engine262 sources/license are reused in place from
`../ts-033p/upstream.json`, never rewritten. Inspected api.mts208-245,
Environment.mts644-665, host-defined/engine.mts172-203 and
function-operations.mts170-205. Their original hashes and URLs are recorded in
audit.json; retained excerpts are not represented as newly downloaded full files.
No reference engine was executed or implementation copied. All implementation
and runtime acceptance remains a separately assigned, reviewed task.
