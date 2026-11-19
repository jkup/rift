# TS-035D2-P: strict block-rule dispatch proposal

Design/evidence candidate at `62a8787`, 2026-11-05. This is not an implementation
or emission authorization. Actual and second independent review must accept the
proposal before a separately assigned writer changes production. Only this file,
`validation/ts-035d2-p/`, and this task's status are owned here.

## Decision: independent, unchanged return certification

Keep C's existing legacy return fallback exactly. **Do not condition it on
absence of block candidates.** The failed bounded parse contains no such
information. The fallback's positive authority is the existing `parse(text)`
result, whose return promotion requires `auditScriptReturns(text)` to complete
its own entire, narrower grammar with a return candidate. That audit independently
rejects every same-list function/function duplicate. It cannot certify X06.

The old disputed recipe is unnecessary, rather than repaired with a new parser
mode. X06 is `"use strict"; {function f(){} function f(){}} return 1;`:

1. Bounded parsing rejects `return` with `parse.return-context` before collection.
2. Legacy `parse` rejects the second function with `parse.duplicate-binding`.
   Its first failure is not return-context, so it does not promote a return.
3. In the reverse order, `return 1;` is the ordinary legacy first failure, but
   the fresh return audit reaches the later block duplicate and fails. Again no
   promotion. Neither path depends on D1 candidate data.

This is a source-inspected exclusion argument, backed by bounded existing-build
probes in [audit.json](validation/ts-035d2-p/audit.json), not an exhaustive proof
of the parser. `Parser.list` checks every let/function name in its immediate
list for both legacy and return-audit purposes (`structuralPlan()` is false).
`functionTail` enters `list(true, params)` and ordinary braces enter
`list(true, [])`. The audit parses all function bodies and expression functions.
Thus any pair recognized by D1 in an ordinary block is either rejected by this
list check or is behind grammar the legacy audit cannot consume. Catch/switch/
var extensions cannot bypass it: those productions are unavailable in the legacy
path and cause failure. No recovery, skipped body, substring parse, partial AST,
new candidate flag, or duplicate parser is introduced.

**Vetoes are rule-specific.** D1's full-source grammar/resource/scope/other-conflict
veto gates the new block rule, everywhere. Existing return certification keeps
its accepted narrower grammar and behavior. For example `return 1; {function
single(){}}` currently certifies return in C parse-only/test despite the bounded
planner rejecting the sloppy block function. Preserve that result. Applying all
D1 scope vetoes to the return fallback would silently remove existing return
certification. This proposal explicitly rejects that semantic change. It does
not claim return certification proves a valid bounded declaration plan.

| Alternative | Decision |
|---|---|
| Fallback when no block candidate retained | Reject: failed parse has no candidate information; unsound justification. |
| Remove fallback whenever bounded parse fails | Reject: disables the accepted return rule, which necessarily fails bounded return-context. |
| Continue top-level returns in a new bounded audit mode, collect all scopes, then choose a rule | Defer: expands parser certification grammar/precedence and risks changing old return behavior; unnecessary for this slice. |
| Scan tokens/prefixes or parse a stripped/recovered source for duplicate candidates | Reject: divergent or partial-source authority, no exact whole-source certification. |
| Keep independent legacy fallback; add block certification only after successful bounded EOF and global audit | Select: existing return acceptance and X06 exclusion are both supported by actual code. |

If the desired policy instead means *every* D1 veto must also suppress old return
certification, the single sloppy-function witness above makes that incompatible
with preserving existing return behavior. That would require an explicit new
semantic decision, outside this proposal.

## Preparation authority and exact implementation closure

Keep all existing ordinary planner/audit entry points byte-equivalent:
`parse`, `auditScriptReturns`, `parseDeclarationPlan`,
`parseBoundedScriptDeclarationPlan`, `planScriptDeclarations`, and
`auditBoundedScriptBlockFunctions`. Keep strict-only preparation unchanged.
The D1 driver's frozen ordinary-output checks must therefore remain unchanged.

Add a preparation-only internal parser export:

```ts
// Internal to parser -> execution; not exported by the Script facade.
export function parseBoundedScriptPreparation(
    unit: ScriptSourceUnit, nodes: DeclarationNodes
): DeclarationPlanResult;
```

It calls the existing private `parseStructuralPlan(unit, nodes, true, true)`.
Extend that private helper with `certifyBlockFunctions = false`. No public
caller-controlled flag is added. Its first steps remain the exact existing
`parseStructuralSource`: full `lex(text,true)`, same `Parser(...,"bounded-plan")`,
same depth/name/delimiter/parameter checks, and actual EOF start **and** end
equal to original source length including trailing trivia. On any blocked parse,
return that exact original object. No collector runs on partial bodies.

Add one internal collector bridge with the exact same input types as the existing
bridge, except nodes are required and bounded mode is fixed:

```ts
export function collectBoundedScriptPreparation(
    unit: ScriptSourceUnit, body: Stmt[], tokens: Token[],
    bindings: Map<number, ParsedBinding[]>, nodes: DeclarationNodes
): DeclarationPlanResult;
```

Create one `DeclarationCollector(unit,tokens,bindings,nodes,true)` and call
`collect(body)` once. Save `ordinary = analysis.project()` and obtain
`audit = analysis.audit()` from that same instance (its repeated project call
is pure and does not repeat the traversal). If audit is none/blocked return
`ordinary` verbatim, including first-conflict/late-catch precedence and message.
If eligible, require nonempty candidates, `ordinary.kind === "conflict"`, and
sourceUnits/consumedUnits equal to unit.text.length; otherwise throw an internal
invariant error. Select candidates[0], already sorted by second.start then
first.start, and return:

```ts
{ kind: "blocked", goal: "Script", unit,
  rejection: { kind: "syntax-error", ruleCode: "duplicate-block-lexical-function" },
  diagnostic: { phase: "parse", name: "SyntaxError",
    message: "duplicate block lexical function: " + candidate.second.name,
    loc: { line: candidate.second.loc.line, column: candidate.second.loc.column } } }
```

No executable state is created for this result. Retained nodes remain local to
preparation and are discarded. Successful ordinary preparation still gets the
same original node identities, assignment-name map and source object; do not
reparse from C, feed detached audit output into preparation, or expose an AST/
complete flag as authority. D1 audit remains non-emitting and detached.

`ExecutableScript.prepare` in `script-execution-internal.ts` changes only the
bounded arm's parser call to `parseBoundedScriptPreparation`; Realm profile
check stays before allocation/lexing. `ScriptPreparation` already includes
blocked DeclarationPlanResult with Rejection, so no new union arm or facade API
is needed. `prepareStrictScript` and all evaluation/materialization paths stay
unchanged. This deliberately narrows the earlier D-P sketch: ordinary bounded
planning remains evidence, while fresh preparation alone authorizes emission.

## C projection and precedence

In `Attempt.rejected`, retain construction of actual operation, unit, Realm and
diagnostic site. Keep profile rejection and conflict projection first. For the
remaining blocked result, handle `rejection.kind === "syntax-error"` **before**
the existing fallback: accept only `duplicate-block-lexical-function` from this
preparation path; all other codes remain an internal unreviewed-rule fault.
Return the fixed parse/SyntaxError result with this actual rule and site. The
legacy fallback below remains byte-for-byte equivalent: only parse-only/test,
only fresh `parse(unit.text)`, only its return syntax-error with nonnull error,
with its existing diagnostic location. It is not moved into preparation or
enabled for execute/harness. No parser rule-tag inference from diagnostics.

| Precedence | Frozen result |
|---|---|
| Non-Script Realm, even oversized/invalid source | profile-rejected realm, before parse. |
| Lexical/source limit failure | Original bounded rejection/location; new block rule impossible. Legacy fallback remains unchanged and its full lex cannot bypass source/token failure. |
| Bounded grammar/depth failure, including X06 | Original rejection; existing return fallback only at its old parse-only/test boundary. No candidate-based branch. |
| EOF then D1 global veto | Original ordinary blocked/conflict result, not the audit's later veto diagnostic. Conflict projects uncertified-conflict before fallback. |
| EOF, all vetoes clear, eligible pair(s) | Block syntax-error at earliest second binding, both actions and either role. No evaluation/instantiation or constructor inspection. |
| EOF, no pair | Original ordinary result, including ready records and runtime behavior. |
| Legacy return certification | Same parse-only/test result/location as today; execute/harness stay unsupported. |
| Parent deadline/cap/crash facts | Existing independent transport precedence, never overwritten by syntax-error bytes. |

Block result has testBodyEvaluated=false, inspection=null, source.unitId and
realmId equal to the actual operation, phase=parse, constructorName=SyntaxError,
and unchanged completed harness prefix. Failing harness occurrence does not join
the prefix. In conformance-shaped synthetic envelopes the existing classifier
derives harness-error/harness for harness syntax failure; parse-negative test
matches only parse/SyntaxError, wrong phase/type fails. Production C remains
observation-only: **no registry/ledger/corpus admission** is enabled.

## Wire closure and ownership for a later assignment

Necessary production ownership is exactly `src/parser.ts`,
`src/script-declarations.ts`, `src/script-execution-internal.ts`,
`src/script-observation.ts`, `src/script-observation-types.ts`,
`src/script-observation-json.ts`, `tools/test262/script-driver-result.mjs`, and
`tools/test262/script-result.mjs`. New bounded host driver, fixtures, supplemental
codec/transport controls and one additive static gate need explicit assignment.
No ownership of those paths is claimed by this design writer.

Widen only v2 ScriptResult's rule literal to return | block. Replace the
serializer's hardcoded return literal with `jsonString(value.ruleCode)`.
Both independent decoder `resultShape` allowlists add exactly the block code;
no generic SyntaxRule acceptance. `outcomes.ts` already reserves it, no edit.
v1 producer/codec/allowlists, optional-diagnostic validation, source/Realm/phase/
completed-prefix checks, seven limits, request/build/source binding, preflight,
classifier and transport priority remain unchanged. The serializer is a trusted
typed-data encoder, not a validator for hostile casted objects; both decoders
must reject an unknown rule even if such bytes reach them.

## Exact regression proposal and future acceptance

[old-test-proposals.json](validation/ts-035d2-p/old-test-proposals.json) contains
complete file bytes for every inventoried old test and inherited validator,
not snippets; [proposal-manifest.json](validation/ts-035d2-p/proposal-manifest.json)
binds base blobs, original/result SHA-256 and edit intent. The proposed migration
is **identity for every old file**. Existing decoder tests continue replaying
unchanged A serializer rows; new block rows go in a new supplemental serializer
driver/matrix rather than rewriting historical A fixtures. Existing C registry,
integration tests, H7, D1 and inherited assertions remain intact. This is a
concrete no-old-test-edit proposal, not permission to update expectations later.
If implementation reveals a necessary old-test change, render the whole changed
file and obtain actual/second review before applying it. The verifier checks
whole-file bytes and rejects any extra edit; it never writes a real old test.

[semantic-matrix.json](validation/ts-035d2-p/semantic-matrix.json) freezes the full
62 inherited source literals plus focused return/veto/order cases, literal
future preparation/C results and the old ordinary results. Expanded boundary
sources are retained, not shortened. [wire-matrix.json](validation/ts-035d2-p/wire-matrix.json)
freezes exact valid v2 rows and explicit child/envelope mutations. These are
future expectations, not implemented behavior. The audit uses current parser
outputs for ordinary preservation; selected binding locations are checked against
the prior independent D1 literal expectations. New return rows have hand-stated
expected codes, cross-checked by bounded probes.

Future implementation must run every semantic row in Node and native from
runtime-read files, plus both distinct `alpha.js` and `beta.js` sources, with
parse-only and execute, test and failing harness roles, two distinct Realm
instances and profile-rejection controls. Existing 212 records and all 64 gates
remain; one additive driver gate must independently pass static-only build and
zero-dynamic coverage. Run D1's ordinary/detachment/matrix controls unchanged.
No current full-build claim is made here.

New semantic controls must assert absence of body/global effects, unchanged
session steps/calls/depth/active/history for rejected preparation, preserved
completed prefix, actual source/Realm identity, and source-derived mode.
Ready controls exercise parse-only no evaluation versus execute body entry.
Wire controls run actual supplemental serializer bytes from both hosts and two
inputs through **both** decoders independently, plus current inherited A tests,
not only decode/reencode agreement. Both valid rules must survive exact ASCII
serialization; unknown/reserved/empty rules remain protocol faults.

Future full acceptance retains A/B/C/H1-H7 and all current inherited replays,
typecheck, runner20, host73, observation22 and probes10; archive changed replay
outputs separately and restore historical bytes. No repeated full validation is
needed for this design. All 33 selected files/60 variants stay blocked, C++ and
compiler pins remain unchanged. Evidence records inherited 212/64 as inherited,
never as a fresh run.

## Sources and limits

Normative basis retained from accepted D-P: ECMA-262 2025 edition 16
[14.2.1 block early errors](https://tc39.es/ecma262/2025/multipage/ecmascript-language-statements-and-declarations.html#sec-block-static-semantics-early-errors),
[11.2 directives](https://tc39.es/ecma262/2025/multipage/ecmascript-language-source-code.html#sec-directive-prologues-and-the-use-strict-directive),
[14.10 return](https://tc39.es/ecma262/2025/multipage/ecmascript-language-statements-and-declarations.html#sec-return-statement),
and [B.3.2.4 sloppy block exception](https://tc39.es/ecma262/2025/multipage/additional-ecmascript-features-for-web-browsers.html#sec-web-compat-block-static-semantics-early-errors).
Strict duplicate lexical names are invalid; the `[Return]` grammar parameter
separates function bodies from Script. Spec does not prescribe Rift's diagnostic
priority among multiple invalidities. Keep scope/mode distinctions and defer
sloppy web semantics, switch/formal/mixed rules.

Retained engine comparison: V8 `14.6.202.34`, `parser-base.h` return scopes
6219–6264 / statement lists 5675–5735 / post-body parameters 4932–4977, blob
`3810a8f9d1d73559ba073c1f4d6e0af2a63717c5`; `scopes.cc` 1155–1225, blob
`f7cc25027cf177d2578f2fc8c2290b44e5ceaef5`.
[Parser source](https://github.com/v8/v8/blob/14.6.202.34/src/parsing/parser-base.h#L6219)
and [scope source](https://github.com/v8/v8/blob/14.6.202.34/src/ast/scopes.cc#L1155).
The retained [source inspection](validation/ts-031c-p/source-audit.md) and
[accepted D-P audit](script-strict-rule-audit.md) are the offline source record;
this task did not refetch upstream or execute another JavaScript engine.
No external code was copied. The exclusion argument is about Rift's current
parser, not an assertion that V8 uses the same fallback architecture.

Unproven until implementation: static lowering of the new collector bridge,
new native emission path, full integrated transport replay and supplemental
matrix execution. Existing-build probes establish current behavior only.
Any grammar expansion of the legacy return audit requires re-reviewing the
exclusion argument; future parameter certification needs its own continuation
and precedence design. D3/D4 remain outside this assignment.
