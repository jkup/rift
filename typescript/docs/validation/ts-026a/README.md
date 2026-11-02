# TS-026A implementation evidence

Implementation on `codex/primitive-computed-keys`, dispatch base `01c2ab8`,
2026-11-02. Ready for independent coordinator review; this handoff does not self-accept
the task.

## Implementation and scope

`src/typeof.ts` exhaustively classifies represented Values using only the kind
and internal callable slot. Parser integration retains expression(9), token
reservation, erased parentheses and source spans. The evaluator's optional
`allowUnresolvable` flag is consumed only for a direct identifier after tick and
depth entry, inside the existing finally. Only a null binding environment bypasses
GetValue. TDZ, nested missing names, abrupt records and host faults retain their
normal behavior. Neither operator performs coercion on the resulting Value.

The sole preexisting evaluate override, delete's MeasuredEvaluator, now forwards
the optional flag. The new measured driver does likewise. Both test missing and
TDZ behavior and guard priority. No Reference/Environment interface or broad
boxing change was needed. Primitive member reads still reject before key
conversion; delete retains its accepted boxing exception. No BigInt, HTMLDDA,
accessor/proxy or additional syntax support is claimed.

## Matrix and independent oracles

[All 120 named rows](matrix.md) map to the [frozen contract](../ts-026p/matrix.md).
The readable driver uses explicit braces, named scenarios and literal expected
values, traces and diagnostic locations. Test setup is outside resource counts.

- V1-V17 cover each primitive variant, null-root/nonextensible/inherited objects,
  arrays/holes/elements, all wrapper/prototype kinds, source/null-source guest
  functions, builtins and namespaces. The full set repeats with Realm B owners.
  Fake visible callability and deleted/replaced function properties do not affect
  classification. Poison objects instrument internalGet; canonical/valueOf/
  toString/tag properties are never read. R25 repeats the classifier with an
  exhausted evaluator budget.
- B1-B20 cover absent/initialized/shadowed/TDZ/self-initializing bindings,
  parentheses, outer environments, hoisted functions, omitted/null/number
  parameters, shadowed undefined and nested reference forms. Block instantiation
  establishes TDZ before execution. Sentinel ReferenceError completions preserve
  identity and values through both operators.
- E1-E24 use BKCG/BKG/B/BK/BKC literal traces, exact captured receivers/keys,
  symbol identity, base/key rebinding, target mutation and all invalid primitive
  bases. Ordinary fallback is TVG. Reads and assignment writes occur once.
  Foreign success/guest failure/host fault cases restore nonzero calls2/depth4
  and Realm A; subsequent classification advances the same budget by three.
- P1-P26 assert grouping and runtime values, unary/delete combinations, all exact
  parse diagnostics, all five line terminators and comment variants, retained
  named/anonymous source through inherited and saved Function toString, and the
  frozen nesting failures at columns134/132.
- R1-R18/R24 fix ticks, peak depth, hook counts, frame/step/call priority and
  monotonic reuse. R19-R23 exercise both operators and defining Realms with host
  recursion at limits0/1/2/actual default64 (6/11/16/326 ticks), and guest recursion
  at2/actual default64 (18/390 ticks). Default64 uses the actual constructor
  default. All fail with the specified guest RangeError rather than crashing;
  target Gets remain zero and cleanup permits another operation.
- C1-C3 read committed fixtures at runtime, with independent literal guest
  assertions. C4 checks exact source consumers. C5 migrates only the named delete
  rejections. C6 retains baseline consumers. C7 adds four runtime-read CLI cases
  with exact stdout, stderr including filenames/locations and statuses. C8 uses
  the real interpreter entry point and verifies an injected effect never runs
  when whole-program parsing fails.

## Migrations and preservation

Only `test/delete-operator.ts` P23/P24's current `delete typeof x` / `delete void x`
parse-rejection entries, messages and columns were removed. Replacement assertions
cover initialized x (true and binding retained), missing typeof (true), missing
void (ReferenceError at1:13), measured TDZ and step guards. All other delete
assertions, raw internalDelete tests, Array C3 success and historical evidence
remain. No baseline case or gate was removed: one driver and four CLI cases add
five cases, and one native entry adds a gate.

No pins, C++, Claude paths, COORDINATION edits, branch switch, main merge or
successor work. The formatter was an existing cached tool, applied only to the
new driver; no dependency or configuration changed.

## Failures, reductions and limitations

- Initial exploratory commands used the repository root for npm, and an append
  used a duplicated `typescript/` prefix; both failed before executing tests or
  writing the intended file. The append was reapplied at the correct path.
- Initial Node driver setup attempted to bootstrap a configurable Array length.
  Existing invariants correctly rejected it. The fixture now uses the ordinary
  defineOwnProperty length path; no production change was made.
- The initial full native attempt failed to locate Zig's installation from the
  sandbox. `native-initial.txt` and `native-initial-results.json` retain the
  failure; subsequent approved runs use installed libraries without pin changes.
- Initial coverage found an inferred-never throwing callback adapted dynamically.
  `never-callback-before.ts` reduces it to three statements plus one dynamic
  adapter; `never-callback-after.ts` gives the callback its declared Result return
  type and has zero dynamic operations. The corresponding test callbacks now
  declare Completion. The second full run exposed the same issue in the saved
  builtin callback after test expansion (`native-second*`, `coverage-explain-second`).
  The same reduced fix applies. No semantic/production workaround or gate
  relaxation was introduced. Both failed attempts are retained.
- A test-strengthening edit seeded calls2/depth4 but initially retained its old
  zero-state assertion; that assertion was corrected to the explicitly seeded
  state. No frozen oracle changed. No contradictory semantic oracle was found.

Only Windows x64 is exercised. Host-injected Values and instrumented objects
supply absent guest factories/observability; they do not establish new guest
constructors, accessors or proxies. These tests are bounded implementation
acceptance, not full ECMAScript conformance or performance evidence.

## Final validation

- Typecheck PASS (`typecheck.txt`).
- Runner20/20 PASS (`runner.txt`); probes10/10 PASS (`probes.txt`, `probe-results.json`).
- Final rebuilt Node182/182 and native182/182 PASS, no skips (`node-final.txt`,
  `native-final.txt`, `guest-{node,native}-results.json`).
- All28 static-only builds AND separately parsed coverage gates PASS
  (`native-build-results.json`). CLI1519/1519, typeof-void2039/2039,
  delete2295/2295; zero dynamic operations at every gate.
- `preservation-and-coverage.json` independently re-parses every gate and verifies
  all177 baseline case names and expected records, plus all27 baseline entries,
  remain present. Reproduce from the TypeScript directory with
  `node docs/validation/ts-026a/audit.mjs`.

Presentation `.txt` transcripts have trailing whitespace normalized. JSON
subprocess records retain original stdout/stderr, status and harness details.
