# TS-027P evidence and handoff

Design only, 2026-11-02. Owner chat `01a19b26-9e7e-7271-9031-5f9c3c16bad0`.
Dispatch base `80204eb`; inspected HEAD `66046b8634b45f941e077166e7a51c8c720a6fa1`
includes coordination changes. Existing branch `codex/primitive-computed-keys`.
[Design](../../in-operator.md), [fixed named matrices](matrix.md),
[reproducible audit](inventory.mjs), [candidate lines](inventory.txt).

## Sources inspected

Fixed-edition specification, retrieved on 2026-11-02:

- [ECMA-262 2025 relational evaluation](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-relational-operators-runtime-semantics-evaluation):
  left evaluation/GetValue, right evaluation/GetValue, object check, key conversion,
  HasProperty. Ordinary in grammar is relational and left associative. Private
  membership is a separate production and remains excluded.
- [2025 ToPropertyKey](https://tc39.es/ecma262/2025/multipage/abstract-operations.html#sec-topropertykey):
  string-hint primitive conversion and symbol preservation.
- [2025 OrdinaryHasProperty](https://tc39.es/ecma262/2025/multipage/ordinary-and-exotic-objects-behaviours.html#sec-ordinaryhasproperty):
  own descriptor presence followed by prototype presence; adjacent OrdinaryGet
  explicitly distinguishes obtaining a property's value.

Pinned implementations fetched through connected GitHub:

| Revision/file | Inspected behavior | Git blob |
|---|---|---|
| engine262 `d553e7b52501fbc47eae981c8d0fa7a5c26d0171` [RelationalExpression.mts](https://github.com/engine262/engine262/blob/d553e7b52501fbc47eae981c8d0fa7a5c26d0171/src/runtime-semantics/RelationalExpression.mts) | Evaluate_RelationalExpression, ordinary in branch | `b39863e51491b8ea7f068ad291a261ef23aa96e7` |
| V8 tag `13.0.245` [runtime-object.cc](https://github.com/v8/v8/blob/13.0.245/src/runtime/runtime-object.cc) | Runtime_HasProperty receiver check, ToName then JSReceiver::HasProperty | `9a45b674a368d28d591d7ed9550e32b2f36f52a9` |

engine262 supports the captured-operand/completion ordering; its in branch has
a stale InstanceofOperator comment, so the actual code and fixed specification
govern. V8 independently places receiver validation before key conversion and
presence. Adopt that readable sequence with Rift's existing helpers; do not
import generators, handles, bytecode, caching, private membership or exotic
traps. No engine code copied and no guest source executed by a host engine.
The V8 runtime excerpt is not an audit of every optimized in path.

An initial V8 bytecode-generator.cc line slice landed on unrelated spread/import
code; it supplied no semantic evidence and was replaced by the verified runtime
path above. One redundant spec open returned an internal fetch error after the
actual in algorithm had already been retrieved successfully by find. No semantic
probe or runtime failure is being omitted.

## Local inspection and decisions

Read AGENTS.md, project-goals.md, compiler-contract.md and the bounded TASKS
assignment. Inspected parser precedence/token-kind gate/primary/RESERVED/name/
functionTail, lexer word tokens/source positions, evaluator binary capture,
evaluate/statement ticks and depth, reference/GetValue, call Realm restoration,
conversion.toPropertyKey and primitive-conversion lookup/call/tick order.
Inspected GuestObject.internalHasProperty/prototype storage/data descriptors,
GuestArray ordinary length storage, GuestStringObject virtual descriptor dispatch,
Realm wrapper/callable support, existing presence consumers and prior unary
resource matrices. No new compiler workaround is proposed.

The smallest change is a word-token exception at the existing precedence gate
and a short Evaluator.binary branch. There is no need to add a subsystem or
change internalHasProperty. The latter deliberately iterates descriptor dispatch
through ordinary validated prototype slots; it is not a general proxy/exotic
prototype implementation. Test-only override sentinels check completion handling
without claiming guest traps. Target descriptor copying is distinguished from
semantic Get; tests must not forbid the former accidentally.

## Audit and exact eventual migrations

Run from repository root:

```powershell
node typescript/docs/validation/ts-027p/inventory.mjs
git diff --check
```

**117 files inspected; 118 candidate lines.** The broad word search intentionally
includes English prose and host TypeScript syntax. It scans all source/test
ts/js/mjs/json files, tools mjs files and current feature/architecture docs.
Historical validation and reserved Claude outputs are excluded. Manual inspection
of candidates found **no current guest in rejection assertion or fixture**.
Do not manufacture a rejection migration or delete unrelated baseline tests.

| Current location | Required eventual change or retention |
|---|---|
| `src/parser.ts` precedence / expression operator gate | add in at6 and admit only word in alongside existing punct operators; preserve RESERVED and property-name acceptance |
| `src/evaluator.ts` binary / imports | add the bounded branch and import; operand capture and all other operators unchanged |
| `test/array-like.ts` presence rows, including deep-chain and no-Get controls | retain every existing raw internalHasProperty expectation |
| `test/object-prototypes.ts` W12/A8 | retain inherited virtual String and symbol presence controls |
| `test/array-map.ts` Has overrides and map traversal | retain all consumer behaviors/throws; no API changes |
| `test/array-string-conversion.ts` no-Has controls | retain; join intentionally reads values without Has |
| `test/delete-operator.ts`, `test/typeof-void.ts`, all old fixtures/cases | no in rejection hit; no assertion removal or rewrite |
| `docs/feature-inventory.md` Expressions and internal presence discussion | after validation add bounded guest in: object RHS only, inherited presence, key conversion order; historical internal-only evidence remains historical |
| `docs/architecture-decisions.md` relational and presence sections | append brief integration rationale and evidence link, no rewrite of past evidence |
| new dedicated driver/runtime fixtures and runner/native registration | add matrix coverage and CLI cases; preserve182cases/28gates and every old expected record |

## Validation limits and handoff

V1-V32, E1-E32, P1-P28, R1-R25 and C1-C8 comprise **125 primary rows** plus
explicit variants. Literal outputs, errors, locations, effects and tick recurrences
are derived from the inspected source/specification and require independent
review. Native default64 host/guest recursion, separate static coverage and
baseline preservation remain implementation acceptance gates, not results here.

Documentation whitespace and audit reproducibility are checked for this design.
No runtime tests, typecheck, native builds or coverage were run. No concrete
compiler uncertainty warranted an isolated probe. Accepted `5cdf9e4` remains
182/182 per host and28 gates as prior coordinator evidence only; no new runtime
support or rerun is claimed. No production/tests/manifests/pins/C++ changes.

Only docs/in-operator.md, this directory and TS-027P TASKS claim/handoff are owned.
Coordinator retains COORDINATION.md and acceptance; Claude outputs reserved.
Commit/push the coherent design as authorized, then stop for independent review.
No branch switch, main merge, successor or self-acceptance.
