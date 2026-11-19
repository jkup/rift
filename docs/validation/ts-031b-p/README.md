# TS-031B-P evidence and migration inventory

Design only. Assignment base a87e86c, inspected HEAD70689df (coordinator dispatch).
The [design](../../structured-engine-outcomes.md) and [matrix](matrix.md) are
normative. Existing accepted engine evidence remains TS-030A:211/211 each host,
32 native gates; accepted host boundary is500d09a with66 tests plus4 exact-corpus
checks. Those are inherited results, not reruns or new conformance measurements.

## Retained source audit

- [construction-sites.txt](construction-sites.txt): all95 production candidates
  from `rg -n 'failure\(|throw new|diagnostic:|\bfail\(' typescript/src` at repository
  root. Includes helper definitions/type declarations as well as actual producers.
- [callers.txt](callers.txt):1390 matched lines across src/test, guest/build runners
  and accepted host tools. Pattern:
  `\b(parse|lex|run|failure)\(|diagnostic|ThrowCompletion|maxSteps|maxCalls|\.steps|\.depth|\.calls`.
- [imports.txt](imports.txt): direct test imports of parse/lex/run/failure/Evaluator/
  Diagnostic/ThrowCompletion. This is a migration index, not a permission to
  rewrite all consumers.
- [manual-throws.txt](manual-throws.txt): all manually constructed test throws and
  diagnostic literals. Ten throw records across six files, listed below.
- [audit.mjs](audit.mjs): reproducible protected-file/hash,95-site,10-throw,
 124-row and local-link checks; run from typescript. [audit.json](audit.json)
  retains the output. It does not execute guest code or change production files.

The inventory scan covers all tracked src modules, all tests and tools, not just
lexer/parser message text. Production emitters and exceptions are individually
assigned in the design; callers that merely propagate do not become new emitters.
`failure` constructs one shared shape for helpers throughout the engine and tests.
No runtime consumers catch thrown host exceptions to turn them into completions;
CLI catch is the human process boundary. The new driver gets its own boundary.

## Exact interface and caller migration

| Interface/path | Existing callers and required change |
|---|---|
| syntax.Diagnostic | Keep unchanged; CLI and diagnostic assertion consumers need no migrations |
| lexer.lex/LexResult | parser.parse and direct lexer tests; additive rejection paired with error; preserve tokens/locations |
| parser.parse/ParseResult | interpreter.run and host drivers importing parse (imports inventory); additive rejection only, no new required argument |
| interpreter.run/RunResult | CLI, realms, arrays, function/conversion/coercion/operator drivers; additive parse rejection; same run(source,realm) and runtime completion |
| runtime.ThrowCompletion/Completion | conversion Number/String completions, internal boolean completions, ReferenceResult and Builtin/OperationContext; use shared required origin shape; all propagation preserves identity |
| runtime.failure | Existing callers unchanged arguments; implementation supplies engine-diagnostic origin, no name-based category deduction |
| evaluator.tick/statement/evaluate/call | Four guard constructors migrate to resourceFailure; count snapshot before unwind; no signature or budget changes |
| evaluator guest throw | Single literal at108 gains guest origin |
| conversion80/126, array-map15 | Three subset constructors migrate to unsupportedFailure; guest-facing value and diagnostics unchanged |
| observation projection | New API only; cannot substitute for run in existing tests/CLI |
| CLI | No source change required; existing object diagnostic mutation/display behavior remains |
| run-guests/build-native | Add dedicated outcome driver execution/gate; preserve every existing case and entry |
| test262 result | Only later B observation invariant correction and dedicated child validator; no changes in A |
| test262 plan/input/ledger | No migration; still blocked conformance, observations cannot be appended |

Ten exact manual test construction migrations: addition.ts114,199;
definition-dispatch.ts24,142; key-coercion.ts43; numeric-operators.ts93,183;
property-key-conversion.ts151; relational.ts126,227. Add `origin:{kind:"guest"}`
without replacing the marker, changing values, messages, budgets, expectations
or effect assertions. These use object/symbol/other Values as host-injected
guest abrupt completions; choosing guest provenance does not certify an Error.
Other tests using failure keep the helper's engine-diagnostic origin. No expected
record migrations are authorized. Any unexpected compile consumer is audited
and reported before broadening ownership.

AST/source interfaces remain unchanged: source unit is supplied at the observation
boundary. OperationContext signatures, Realm layout, Environment, callable slots,
references, property operations and all completion propagation stay unchanged.
The driver is deliberately single-unit so it cannot misattribute a harness
function's source location to the active test; multi-unit provenance is deferred.

## Research and limitations

Read AGENTS, project goals, compiler contract, accepted TS-031P classification
and matrix, TS-031A corrected result/plan/ledger/input interfaces and task handoff.
Inspected all producer branches listed in the design plus their completion,
parse/execute, callback and runner paths. Key discovered boundary: result.mjs's
test-stage harness validation applies to observation modes too. Changing variant
to raw would conceal the bug; a mode-specific correction with negative controls
is explicitly reserved for B. Another boundary: explicit unsupported runtime
conversion/species diagnostics cannot become genuine error evidence.

Consulted fixed ECMAScript2025 expressions and statements multipages on2026-11-02
(links in design). The monolithic Ecma page failed due to tool size limit; the
tc39 2025 multipages succeeded. They support candidate scoping, not a claim of
full parser audit/certification. Consulted
[engine262](https://github.com/engine262/engine262), specification-oriented engine
overview; attempted src/engine.mts retrieval failed (path/cache unavailable).
No engine262 code copied or API decision claimed from unavailable source. Our
completion/provenance design extends Rift's established discriminated records.
No new subsystem semantics or Error-constructor behavior is implemented here.

No compiler probe is warranted for a documentation-only provenance design. The
new driver writer/JSON serializer must be built and separately coverage-checked
when assigned; readFileSync/argv/string support is inherited compiler evidence,
not proof the entire future driver compiles. No native run, corpus guest run,
host-suite rerun, toolchain update or success percentage is claimed by this task.

## Review handoff

Review the empty emitting certification set explicitly: it keeps all generic
rejections honest while providing a small independently testable provenance
slice. Reserved rules and their controls remain deferred. The separate driver
contract fixes trusted parent facts, a narrow child schema, exact modes and
transport precedence; it never lets a child claim conformance or harness setup.
All Script/harness/real Error extraction work remains blocked and out of scope.
Coordinator owns task acceptance and COORDINATION. No successor, branch switch,
main merge, C++/Claude/PR79 or runtime edits were performed.
