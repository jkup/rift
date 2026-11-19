# TS-025A implementation handoff (review pending)

Dispatch base `bd7342c`, existing `codex/primitive-computed-keys`, sole implementation
writer. Implements accepted TS-025P without changing the frozen contract or matrix.
No acceptance is inferred from these implementation tests.

## Change and policy

`src/delete-reference.ts` implements ToObject before deferred ToPropertyKey, then
one captured-object internalDelete. Original abrupt records survive; false becomes
TypeError at the delete token. Parser rejects identifier operands including
parentheses; evaluator consumes member References without a final GetValue and
evaluates nonreferences once. Existing general member reads/writes are unchanged.

The explicitly accepted unconditional strict-delete profile does not implement
full strict Scripts, sloppy deletion, binding deletion, accessors/proxies or new
reflection APIs. No C++, pins, frozen design, Claude paths or COORDINATION changes.

Sources: the accepted [design](../../delete-operator.md) and its pinned engine262 /
V8 evidence were consulted, and fixed [ECMA-262 2025 delete](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-delete-operator)
was rechecked. No upstream code was copied or guest source executed in a host engine.

## Validation

Final typecheck PASS; runner20/20; probes10/10; rebuilt Node177/177 and native177/177, no skips. All27 static-only builds and separately parsed coverage gates PASS (CLI1500/1500, delete driver2243/2243, zero dynamic statements). The suite retains all
172 baseline cases and26 baseline gates, adding one driver/gate and four CLI
phase/status cases. Both hosts execute runtime-read delete-effects.js and
delete-operator.js plus the migrated Array fixture. Literal expectations assert
values, error messages/locations, effect order, storage and completion identity;
matching hosts is not the oracle. No denominator reduction or skips.

`test/delete-operator.ts` uses default64 evaluators for actual host-recursive and
guest-recursive conversion hooks. Exact expected step counts are261 and325,
respectively; call-limit failures must unwind to calls/depth0. Small-limit controls
and the step-limit-before-call-limit boundary remain separate assertions.

## Retained failures and reductions

- `initial-node.txt`: the first resource test mistakenly re-entered a statement
  wrapper on every host callback. The frozen R16 says recursive delete AST
  evaluation; re-entering the expression preserves only the initial statement
  tick and produces the specified9 steps at bound1. Corrected the test, not the
  runtime or oracle.
- `second-node.txt`: integration attempted guest `.map`, which remains absent.
  Moved the map consumer to the existing `mapObjectDefaultArray` host API, as
  permitted by H setup in the matrix. Guest deletion and join remain runtime-read.
- `initial-native-failure.log` / `initial-native-results.json`: Zig could not find
  its installation through sandbox access. Retried with approved access. During
  that unsuccessful build a test-only whitespace pass temporarily split an `as`
  assertion; typecheck caught it and it was corrected before final validation.
- `dynamic-native-results.json` / `dynamic-explanation.txt`: execution passed but
  the independent parsed coverage gate rejected3 dynamic statements. The minimal
  `catch-identity-reduction.ts` shows un-narrowed catch identity becoming dynScalarEq;
  `never-callback-reduction.ts` shows an inferred never-returning callback adapter.
  Their retained coverage reports independently reproduce the failures. Both minimal
  reductions build under static-only and execute with fixed Node/native outputs
  true/caught, demonstrating why the separate coverage gate is required. Tests now
  narrow with `instanceof Error` before checking the same Error identity and
  explicitly declare the throwing callback's Completion return type. No production
  workaround, relaxed assertion, compiler pin or gate change.
- Initial read-only shell commands guessed docs at repository root and used an
  unavailable Python launcher. Corrected to typescript paths and Node/patch tools;
  no implementation state was lost. These are not guest/compiler failures.

No contradictory frozen semantic oracle was found or adjusted.

## Migration

`inventory-before.txt` preserves109 inspected files/117 candidate lines.
`inventory.mjs` repeats the exact bounded candidate search into this directory,
leaving frozen evidence unchanged. `inventory.txt` records current sites.

Only current C3 rejection expectations migrated: array-string-conversion.ts now
accepts and executes guest deletion, and inspects absence of both fixture own
properties. Its raw internalDelete empty/pair controls remain verbatim. The fixture
now checks both delete booleans and subsequent undefined reads; the later method
key conversion/call assertion is unchanged. Historical TS-022A rejection evidence
is untouched. Current feature and architecture notes explicitly document strict-delete
and deletion-only primitive boxing. Number formatting, strict/equality, tags,
Function source, primitive read/write and detached-method controls remain intact.

## Matrix mapping

The following table maps all110 primary rows plus variants to concrete assertions
in the dedicated driver and fixtures. Labels identify stable search strings;
E scenario numbers are deliberately listed so fixed trace literals can be audited.
All rows run in both integrated lanes; existing unchanged drivers supplement the
new assertions where indicated. P newline variants cover all five line terminators
and block comments; String tests cover null/relinked/foreign box prototypes.

| Rows | Concrete coverage |
|---|---|
| P1-P6 | badSources/messages/columns literal arrays; reserved/missing/function/builtin name variants; whole-source parse fails before execution. |
| P7 | nonreference this/null/number/string/boolean loop, true with no object reads/deletes. |
| P8 | both parenthesized member forms; target read count0 and removal. |
| P9 | assignment result true and initialized binding value1 retained. |
| P10-P11 | conditional/logical forms: exactly one target read, no deletion, own property retained. |
| P12 | call once without result coercion; separate throwing-call record identity assertion. |
| P13-P14 | literal ReferenceError messages at1:8 and1:17. |
| P15-P16 | strict comparison, !, + and nested delete produce literal true/false/1 results. |
| P17-P19 | exact invalid assignment, missing operand and reserved binding diagnostics. |
| P20 | deleted binding initialized and read as1. |
| P21 | reserved word dot/computed property names. |
| P22 | LF/CR/CRLF/LS/PS and block-comment variants; direct operand line2 column1. |
| P23-P25 | typeof/void/super/comma remain rejected at frozen locations. |
| P26 | runtime fixture exact original Function.toString, nested slices, comment/string delete text and f.call(o). |
| P27 |127 parentheses gives literal nesting error1:134. Existing unsupported lexer/parser controls remain in177-case suite. |
| D1-D4 | descriptor flag cross product; own removal/repeated delete and inherited9 reveal; nonconfigurable inherited variants. |
| D5 | four writable/enumerable combinations, retained value/flags/key order/prototype/sibling; raw false and strict TypeError. |
| D6 | nonextensible own and inherited/absent deletion retains nonextensibility. |
| D7 | Number.NaN strict error at1:1; unchanged Number driver asserts constants. |
| D8-D10 | exact Array keys0,2,length; hole/out-of-range success; length3 and index value retained on failures; C3 inherited index exposure. |
| D11 | numeric order2,9 then a,c,b after delete/reinsert and overwrite. |
| D12-D13 | equal-description symbol identities, string x retention, reinsert symbol order and strict Symbol(x) diagnostic. |
| D14 | null/undefined ToObject error1:8. |
| D15 | both booleans, signed zeros, NaN, infinities, symbol; inherited x/valueOf/toString never removed. |
| D16-D19 | String virtual index/length strict sites; noncanonical/out-of-range/empty strings and numeric -0. |
| D20-D22 | surrogate pair indices0/1 versus2, explicit box payload/extra property/symbol0; null/relinked/foreign prototypes. |
| D23-D24 | primitive nested read preserves old failure; nested object reads child once and never final x. |
| D25 | own name/length deletion, saved callable returns7, exact source retained. |
| D26 | shared foreign aliases mutate one object; fresh/unshared roots and target remain distinct. |
| E1-E7 | scenario0 success BKHD;1 base throw B;2/27 key throw BK including null;3/26 nullish BK;4 hook throw BKH;5 object result;6 noncallable canonical. |
| E8-E11 |7/8 absent/null canonical BKTD;9 fallback BKTVD;10 both-object BKTV and20 missing-method BK;11 noncallable toString BKVD. |
| E12 |21 replacement,22 prototype relink BKTVD to y;23 deletion/null prototype BKT failure. |
| E13-E15 |12 base rebind at key evaluation,13 hook rebind/prototype mutation,14 key rebind; original target/key captured. |
| E16-E19 |15 hook deletes x (BKHDD includes hook's deletion),16 defines x,17 freezes x then strict error,18 exact deletion throw,19 false override. |
| E20 | all nine primitive keys with literal keyNames and BKD trace. |
| E21 | direct/canonical-returned symbol identity with same-description and string controls. |
| E22-E23 | empty/pair arrays, retained Function source, Boolean/String/Number boxes with fixed string-hint keys. |
| E24-E25 | BoxingRealm observes caller Number box before foreign hook; success/guest/host/limit cleanup; separate internalDelete host fault identity. |
| E26 | fresh replacement lookup trace ABA and saved callable; C4 repeats actual guest method deletion. Key canonical and ordinary throwing internalGet preserve original record. |
| R1 | primitive/object/box/nullish helper zero charges; separate false/throw zero-cost checks. |
| R2-R5 | helper kind0-4 loop: fixed costs0/1/2/3/3, invocation counts and peak calls1. |
| R6-R8 | limits0-4 and configurable/nonconfigurable cross product; exact columns1/1/8/10,4 success steps and peak depth3. |
| R9 | nonreference three steps; maxSteps2 fails at1:8. |
| R10-R12 | canonical/ordinary/fallback source costs5/6/7; maxSteps4 and maxCalls0 boundaries, no body invocation. |
| R13 | nullish source four steps and no conversion hook. |
| R14-R15 | helper boundary loop uses original7:9 for failed lookup tick;0/1 completed methods. |
| R16-R17 | host recursive expression at0/1/2/actual default64 gives5/9/13/261, exact invocation counts and unwind. |
| R18-R19 | exact guest declaration and separate evaluator setup;15 at2,325 at actual default64; measured guest invocations and column30. maxSteps14 wins at step15. |
| R20 | depth256 early failure, one tick, restored256. |
| R21 | foreign success/guest/host failures and nested foreign call-limit; previous nonzero calls/depth restored; subsequent operation preserves monotonic budget. |
| C1 | migrated Array runtime fixture booleans/reads plus host descriptor absence; original raw controls retained. |
| C2-C3 | inherited data/method receiver; delete then join/map true hole versus inherited index, exact visits02/012 and length3. Map remains host API. |
| C4 | all three own conversion method kinds deleted through guest source; inherited fallback and saved function ABA. Existing null-root/both-object negatives retained. |
| C5-C6 | runtime fixture ==/===/!/conditional/assignment boolean consumers and retained assignment9. |
| C7 | unchanged property-key-conversion and CLI primitive/detached negatives. |
| C8 | shared foreign mutation and unrelated/fresh roots; D26 assertions. |
| C9 | all baseline raw descriptor/Array/String/symbol/order drivers retained; new helper explicitly contrasts false. |
| C10 | unchanged Number/equality/strict/Function/tag suites; no expectation migration beyond C3. |

Presentation .log files have trailing whitespace normalized; JSON subprocess
records retain original stdout/stderr and statuses.

## Coordinator-requested readability correction

The [readability follow-up](readability/README.md) preserves every assertion and
oracle while expanding the dedicated driver's control flow and replacing opaque
scenario numbers with local descriptive names. Original scenario28 is explicitly
a repeated success, not added coverage. Rebuilt Node/native177/177 each and all27
gates pass again; the revised driver has2259 fully static statements. Independent
re-review remains pending.
