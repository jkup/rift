# TS-035D3-P: non-emitting strict parameter audit

Design candidate at accepted base `f3672ee`, 2026-11-05. This document freezes
the next D3 assignment for actual and independent second review; it does not
authorize implementation or claim that the proposed API exists. D4 emission
and cross-rule precedence require a separate assignment. Only this document,
`validation/ts-035d3-p/`, and the D3-P task status are owned by this writer.

## Decision and current source evidence

Use one private continuation purpose in the existing Parser. Continue past only
the duplicate-simple-formal check, retain the complete original tokens and
parameter occurrences, and run the existing collector after successful full EOF.
No ordinary planner, preparation path, D1 audit or return audit can select this
purpose. It produces detached evidence only, never an executable result.

The actual current sources, rather than the older D-P sketches, establish:

| Current site | Consequence for D3 |
|---|---|
| `parser.ts:parseStructuralSource` | Full `lex(text,true)` first; same Parser.program and original EOF start/end check; no collection on failure. Reuse this helper. |
| `Parser.functionTail` | Every declaration and supported anonymous function expression enters this method. `params.includes(name)` currently fails immediately, with function-token location. Suppress just that failure in the new purpose; preserve `params.push(name)`, loop/error condition, delimiters and body parsing. |
| `Parser.list` / `structuralPlan()` | Structural modes defer list binding collisions to the collector. The new purpose must count as structural or it will wrongly reintroduce legacy list rejection. |
| `Parser.prefix` identifier-delete check | Currently tests literal purpose `bounded-plan`. The new purpose must also defer this check to source-derived collector strictness. E26 is a strict candidate followed by a legal sloppy identifier-delete; it must remain eligible. E25 is strict delete and vetoes. |
| `Parser.bindings` | Map contains retained let/var bindings and function declaration **names**, not formals. Do not overload it or add a parallel formal map. |
| `DeclarationCollector.functionBody` | Already walks the original simple-formal token interval, pushes every non-comma site into `scope.formals`, and records full FunctionSource.start/end in `functions`. Duplicate tokens are retained without deduplication. This existing post-parse extraction is enough. |
| `functionBody` / `scriptPrologue` | Function mode is own raw directive OR enclosing scope mode. Body directives apply to that function's formals. Ordinary block strings never create strictness. |
| `visitStatement` / `visitExpression` | All supported statement/expression containers traverse nested functions, including arrays, object values, call/new arguments, return values, conditional/assignment/member operands, loops, switch and catch. No body is skipped because it cannot execute. |
| `DeclarationCollector.audit()` | D1 already checks ordinary restrictions, every catch, all lexical duplicates and lexical-var/formal-lexical intersections. It permits only strict ordinary-block function/function pairs. D3 must veto those too. |

`current-audit.json` records 77 literal inputs through six existing entry points:
legacy parse, return audit, strict declaration plan, bounded declaration plan,
D1 audit and D2 preparation bridge. Four additional literal distinct-formal
resource probes confirm depth boundaries. These are existing Node-build probes,
not builds, guest execution, native validation or tests of the proposed API.
Source and build artifact SHA-256 values are retained. Full S21 is checked against
its pinned Git blob before strict-prefix transformation; raw S21 is also retained.

## Exact API, types, ownership and call graph

Future production ownership is exactly `src/parser.ts` and
`src/script-declarations.ts`. No lexer, syntax, prologue, outcomes, preparation,
observer, serializer or decoder change is needed. Use existing DeclarationSite,
Diagnostic and Rejection types. Add in script-declarations and re-export the
types from parser, following D1:

```ts
export type StrictParameterCandidate = {
    readonly ruleCode: "duplicate-strict-parameter";
    readonly functionStart: number;
    readonly functionEnd: number;
    readonly first: DeclarationSite;
    readonly second: DeclarationSite;
};
export type StrictParameterAudit =
    | { readonly kind: "eligible"; readonly sourceUnits: number;
        readonly consumedUnits: number;
        readonly candidates: readonly StrictParameterCandidate[] }
    | { readonly kind: "none"; readonly sourceUnits: number;
        readonly consumedUnits: number }
    | { readonly kind: "blocked";
        readonly reason: "grammar-or-resource" | "scope-restriction" | "other-conflict";
        readonly diagnostic: Diagnostic; readonly rejection: Rejection | null };
export function auditBoundedScriptStrictParameters(source: string): StrictParameterAudit;
```

Add the internal bridge in script-declarations:

```ts
export function collectStrictParameterAudit(
    unit: ScriptSourceUnit, body: Stmt[], tokens: Token[],
    bindings: Map<number, ParsedBinding[]>
): StrictParameterAudit;
```

The bridge constructs one `DeclarationCollector(unit,tokens,bindings,null,true)`,
calls collect once, then its new `auditStrictParameters()` method. Internal
collector bridges are not an adapter authority; no Script facade export/caller
may feed an externally supplied AST or evidence into execution.

Exact parser changes:

1. Extend private purpose union with `"bounded-parameter-audit"`.
2. Add it to `structuralPlan()`. Introduce private `boundedPlan()` returning true
   only for bounded-plan or bounded-parameter-audit; use it solely in the existing
   identifier-delete check. All existing purposes retain identical behavior.
3. In functionTail, gate the existing duplicate `fail` with
   `this.purpose !== "bounded-parameter-audit"`. Keep the original failure
   message/location for all other purposes. Keep name validation before this
   check, every params occurrence, and all following parser logic unchanged.
4. Extend private parseStructuralSource with `parameterAudit = false`.
   Assert parameterAudit implies bounded=true and nodes=null. Only the new
   source-only audit passes true; existing callsites keep the default. Select
   the new purpose there; no caller-controlled public flag is introduced.
5. The new audit creates `{id:"",text:source}`, calls
   `parseStructuralSource(unit,null,true,true)`, maps blocked to
   grammar-or-resource without altering rejection/diagnostic, otherwise calls
   collectStrictParameterAudit with that complete parse's body/tokens/bindings.

`parseStructuralPlan` (ordinary and D2 preparation),
`auditBoundedScriptBlockFunctions`, `parse`, `auditScriptReturns`,
`parseDeclarationPlan`, `parseBoundedScriptDeclarationPlan` and
`planScriptDeclarations` retain their current callers and purpose selection.
No return continuation, fallback call, partial AST, substring parse, token
recovery or second parser is permitted. A fatal grammar error can stop parsing:
the whole audit is already blocked, with no candidate result exposed.

## Collector algorithm and veto order

The smallest reuse is to call the existing D1 `this.audit()` inside the new
method, on the same collector. Its project and audit scans are pure; collection
still runs once. Do not modify D1 audit or ordinary project behavior.

1. If D1 audit is blocked, copy its blocked fields into the new return type.
   This retains all scope restrictions and all non-block conflicts, including
   a later catch/conflict behind an earlier potential parameter candidate.
2. If D1 audit is eligible, convert its first sorted block pair to
   other-conflict, rejection=null, diagnostic parse/SyntaxError,
   message `duplicate-lexical: ` plus second.name, at second.loc. Block-only
   sources therefore also block D3. Do not combine parameter and block rules.
3. Otherwise D1 is none. Walk every PlannedFunction, locate scopes[fn.scope],
   and scan scope.formals in source order using a per-function Map from name
   to **first** site. Retain first/second and first/third for a triple; unrelated
   functions never share this map. Do not stop at the first strict duplicate.
4. A duplicate in any non-strict scope vetoes the whole audit. Return
   scope-restriction, unsupported-syntax/parse.duplicate-parameter, diagnostic
   parse/SyntaxError, message `duplicate parameter: ` plus name, location at the
   repeated formal. If several sloppy duplicates exist select earliest repeated
   start, then first.start; scan them all before returning any strict candidates.
   This new audit diagnostic deliberately differs from the unchanged ordinary
   function-token diagnostic. P15/E13/E15 ensure a sloppy duplicate before a
   strict candidate is never lost; E12/E14 check reverse order.
5. For strict duplicates append detached candidates with full fn.start/end
   (the `function` token through closing brace, not body scope span), and copy
   both sites including nested Location objects. Sort by second.start then
   first.start, independent of collector traversal order. If no duplicates,
   return none; otherwise eligible. Both carry original text.length for source
   and consumed units, justified by the shared EOF gate, including trailing trivia.

No new syntax-error Rejection is returned by D3. `ruleCode` is evidence inside
candidate data only. Blocked carries no candidates or completeness field. None
means no target duplicate inside this bounded grammar, not standards validity.
These veto priorities are local diagnostic policy, not a cross-rule emission
policy or an ECMAScript-mandated error ordering.

## Frozen literal acceptance

`future-matrix.json` freezes expanded source strings and future expected kinds,
blocked categories, scope/resource rejection payloads, and every eligible pair's
numeric spans/locations/function bounds. `cases.mjs` preserves exact inherited
P01–P15 and L06 strings. `freeze.mjs` expands explicitly enumerated editorial
function fragments into numeric fixture data; it neither parses grammar nor
discovers eligibility. It does not implement or prove the future API. The
implementation must assert these literal expectations, not regenerate expected
results from its own collector. Grammar rows must additionally preserve the
exact `current.diagnostic` in the matching `grammar-controls.json` control,
including resource diagnostics. Those controls replace repeated a/b with z/y
at equal width; inspection confirms the first later failure and its location
are unaffected by that name substitution in these specific literals. This is a
future expectation inferred from source plus a current neighbor observation,
not observed continuation. No diagnostic comes from expected-negative metadata.

Mandatory coverage includes own/inherited mode, anonymous expressions in nested
containers, both sloppy/strict orders, strict/delete versus sloppy/delete,
triple formals, multiple functions, formal-lexical/lexical-var/switch/catch/block
conflicts, late unsupported grammar/token/assignment/Statement errors, invalid
later formal names and delimiters, and full body/enclosing/EOF consumption.
Default/rest/destructuring/named-expression/arrow/method grammar stays blocked.
P09's hex escape is a lexer veto; E50's supported newline escape is parsed but
is not a directive and yields a sloppy-duplicate veto. Parentheses, preceding
empty/numeric statements and block-local strings do not establish own strictness.

Own-mode eligible cases: P02/E18/E19/E20/E26/E35/E41/E43–E47/Q01/Q03/Q05.
Inherited-mode cases: P01/P03/P08/P14/E16/E17/E24 and nested g in E42.
E42 outer f owns strictness. R0 function inherits Script strictness; R1 anonymous
inner function inherits outer expression's own directive. A parenthesized body
string in E24 does not cancel inherited strictness. All selected sites are strict.

The two actual runtime files are `runtime-0.js` and `runtime-1.js`; both must be
read using argv/file I/O by the future Node and native driver, not embedded
selection constants. R1 contains a non-BMP comment and CRLF: offsets are UTF-16
units, locations count the comment's two surrogate units and CRLF as one line
break. Assert their literal values from the frozen matrix, source length,
actual consumed EOF, distinct left/right names, and fn bounds. Include repeated
calls in both source orders and mutate a detached candidate/site/location after
one call; later calls and ordinary outputs must remain unchanged.

Q01/Q02 are exactly 100000/100001 units. Q03/Q04 have 127/128 top-level nested
blocks after the function; Q05/Q06 have 126/127 blocks inside it. Q04/Q06/L06
must reach count=129/limit=128 in the future audit, while ordinary parsing still
stops earlier at duplicate-parameter. Q02 lexes first and returns source-units
count=100001/limit=100000. No resource limits are increased. Whole pinned S21
includes all comments, `$DONOTEVALUATE();`, and the original declaration; only
the explicitly frozen strict prefix transforms it. Raw S21 remains sloppy and
blocked. No guest body or `$DONOTEVALUATE` is executed by an audit.

## Preservation and exact next assignment

After actual and second design acceptance, assign **D3 non-emitting implementation**:

* Two production files and APIs above only; new
  `test/script-strict-parameter-audit.ts`, new
  `test/fixtures/script-strict-parameter-audit/{a,b}.js` with the frozen runtime
  bytes (and directory-local `.gitattributes` to preserve CRLF), one additive
  gate in `tools/build-native.mjs`, scoped evidence
  `docs/validation/ts-035d3/`, additive validation inventory, and own TASKS status.
  Coordinator owns COORDINATION. No old-test migration is proposed.
* Assert all 77 rows under Node/native with independent expected literals and
  resource payloads, every candidate offset/name/location, whole S21, two runtime
  inputs, all ordinary-result snapshots, and detachment. Preserve the six existing
  APIs' full outputs; compare semantic node associations separately where Maps
  do not serialize. D1 and D2 tests stay unchanged. Test no executable result or
  consumer of new evidence exists; inspect the complete call graph.
* Retain 212 old guest records and all 65 old gates; one new static-only gate
  with independently parsed zero-dynamic coverage. Run full both-host guest
  validation, affected parser/declaration/Script A/B/C/H1–H7/M/E4/inherited/A21,
  D1 and D2 source/wire/extra controls, C transport172/host21, typecheck,
  runner20/host73/observations22/probes10. Preserve original assertions, raw
  records and failure evidence; restore historical outputs recursively and
  archive new replay evidence only in D3. All 33 files/60 variants remain blocked.
* Keep ordinary duplicate rejection and accepted D2 block emission unchanged.
  Leave C's existing legacy-return fallback byte-equivalent; it never calls the
  new continuation. A parameter before/after top-level return cannot acquire D3
  authority. Do not change preparation, outcomes, v1/v2 codecs, registries,
  ledger, admission, CLI/profile/manifest, compiler/pins, C++ or grammar.
* Known isolated throw/discriminant/full Builtin/exact-keys typing patterns may
  be used as already approved. Retain/reduce any new compiler/API/ownership
  issue and request concrete review before workaround. One writer, no branch
  switch. Commit coherent tested candidate then stop for actual and independent
  second acceptance; no publication, successor or D4 work.

The current design audit preserves 4739 base tracked paths outside its ownership
(coordinator file excluded), 212 records/65 gates as **inherited, not rerun**,
and all 60 blocked variants. The proposed collector method, compiler lowering,
new driver and native boundary behavior remain unimplemented/unproven.

## Retained reference basis

This is an offline audit of the exact retained sources already accepted in
`script-strict-rule-audit.md` and `script-strict-rule-dispatch.md`; no upstream
fetch or reference-engine execution occurred. ECMA-262 2025 edition 16,
15.1.1/15.2.1 requires strict duplicate-formal rejection; 11.2.1–2 supplies own
and inherited directive semantics. The retained V8 `14.6.202.34`
`parser-base.h` 4932–4977 (blob
`3810a8f9d1d73559ba073c1f4d6e0af2a63717c5`) checks formals after body strictness;
this supports delayed mode resolution, not copying V8 implementation. Source
links and retained clause audit are in the accepted D-P document. The Test262
revision is `91c70759363c46557b694792bf34a2551a7af5ba`; S21 blob is
`69dc995f6fd6a07f9a5c3c5c16d50e2c5f88537b`. Metadata is never rule authority.
