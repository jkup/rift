# TS-027A readability follow-up

Review base: `987d83b`. The coordinator accepted the production semantics and
P18/P23 complete diagnostic suffixes, then requested this bounded driver cleanup.
Edits began only after clearance that the coordinator's rebuild had completed.

`test/in-operator.ts` now expands setup/action/assertion statements and control
flow onto separate, consistently indented lines. Four dense resource selections
(conversion ticks, calls, trace, recursive ticks) now use explicit branches.
Their before/after source fragments are retained in `selection-edits.json`.
No new test framework, production edit, fixture, expectation or scenario change.

`source-audit.mjs` reverses exactly those four recorded changes and compares
formatter-normalized content with the original driver. All remaining changes
are formatting-only. It separately compares the full multiset of 702 raw string
literal occurrences, confirms assertions are outside the four selection edits,
and asserts an empty production diff. Report: `source-preservation.json`.
The formatter was existing cached Prettier3.6.2, applied only to this driver;
no package/dependency/pin changes. Reproduce from typescript/ with:

```text
node docs/validation/ts-027a/readability/source-audit.mjs <installed-prettier>/index.mjs
node docs/validation/ts-027a/readability/audit.mjs
```

Validation: typecheck passes; full rebuilt Node/native189/189 each, no skips;
all29 static-only builds and separately parsed coverage pass, zero dynamic.
CLI remains1530 static statements; expanded driver is2215. Resource behavior
remains exactly261/325 ticks at actual default64 host/guest recursion, depth131
for guest recursion, with all cleanup assertions preserved and passing.
The acceptance audit preserves all189 previous case names/expected records and
all29 previous native gate entries. Original milestone runner20/20 and probes10/10
remain applicable; those unchanged tools/probes were not rerun for formatting.

No validation failure or new compiler workaround. An initial formatter-edit
script invocation used the repository root instead of typescript/ and failed
before reading/writing the driver; rerun from typescript/ succeeded.
Independent review remains pending. No COORDINATION/Claude/C++/production changes,
branch switch, main merge or successor work. The earlier delegated push was
blocked by approval review; the coordinator can push the local follow-up commit
under the original authorization recorded in the coordinating chat.
