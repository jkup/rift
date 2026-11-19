# TS-031P literal acceptance matrix

These are required future tests, **not executed results**. Each row is a named
scenario, with literal status and important side effects. Run classifier rows
with injected structured records; run semantic/harness rows in both Rift lanes
only after their prerequisites exist. Injected success never counts as corpus
conformance. Unless overridden, assume verified bytes/metadata, admitted strict
Script profile, valid harness preflight, fresh Realm, clean exit and valid result.
`parse/SyntaxError(rule)` means an audited engine outcome, not diagnostic text.
Every row also asserts unchanged input bytes, exact variant identity and one
terminal record. CL-004 IDs refer to its unchanged manifest paths/blobs.

## Input, metadata and planning

| ID / name | Input or event | Literal expected result |
|---|---|---|
| I01 ExactPin | S01 bytes, blob `74c1e27da8023494448f616d1796c3aaadcef17e` at full pin | verified; planned non-strict,strict; source bytes unchanged |
| I02 WrongBlob | S01 with one byte changed | harness-error/input/blob-mismatch; guest launches=0 |
| I03 WrongRevision | requested pin differs from CL-004 | harness-error/input/revision-mismatch; launches=0 |
| I04 NewlineRewrite | U11 CR converted to LF | harness-error/input/blob-mismatch; launches=0 |
| I05 ExactUnicode | U11 exact bytes with CR/U+2028/U+2029 | verification succeeds; decoded code points unchanged; no pass inference |
| I06 InvalidUtf8 | verified synthetic blob bytes `ff` | harness-error/input/invalid-utf8; launches=0 |
| I07 FetchMissing | selected path cannot be fetched | harness-error/input/retrieval; selected file retained |
| I08 BrokenYaml | `negative: [` | harness-error/input/metadata; no default positive record |
| I09 MissingPhase | `negative: {type: TypeError}` | harness-error/input/metadata; variants unknown |
| I10 DuplicateKey | two `negative` mapping keys | harness-error/input/metadata; no last-key-wins |
| I11 WrongArray | `flags: onlyStrict` | harness-error/input/metadata |
| I12 MissingDescription | valid mapping without description | harness-error/input/metadata |
| I13 MultipleFrontmatter | two frontmatter blocks | harness-error/input/metadata |
| I14 MetadataDrift | verified file metadata differs from selection ledger | harness-error/input/manifest-metadata-mismatch |
| I15 Conflict | onlyStrict+noStrict; raw+onlyStrict; raw+module; module+noStrict; module+onlyStrict; raw+async; both CanBlock flags (seven separate cases) | each harness-error/input/incompatible-flags; launches=0 |
| I16 Traversal | includes `../outside.js` | harness-error/input/include-path; no outside read |
| I17 MissingInclude | includes `missing.js`, absent at pin | harness-error/input/include-missing; no body execution |
| I18 UnknownFlag | flags `[futureMode]` | harness-error/input/unknown-flag |
| I19 UnknownFeature | features `[future-feature]` | unsupported-feature/preflight/unrecognized-feature; variants retained |
| I20 ResolutionScript | negative resolution/ReferenceError without module | harness-error/input/metadata |
| V01 DefaultPair | flags=[] | exactly [non-strict,strict]; second record retained after first fail |
| V02 StrictOnly | flags=[onlyStrict] | exactly [strict]; test begins exact bytes `22 75 73 65 20 73 74 72 69 63 74 22 3b 0a` |
| V03 SloppyOnly | flags=[noStrict] | exactly [non-strict]; unsupported-profile/sloppy-script on current Rift |
| V04 Raw | raw source begins `'use strict'` | exactly [raw]; zero harness units, zero prepended bytes; current Rift unsupported-profile |
| V05 RawIncludes | raw+noStrict, includes=[assert.js] | one raw variant; zero harness evaluations; metadata retained |
| V06 Module | flags=[module], body `export default 1;` | exactly [module]; unsupported-feature/module; no Script parse |
| V07 AsyncPair | flags=[async] | two variants; each unsupported-feature/async; no body execution |
| V08 Generated | flags=[generated,onlyStrict] | exactly [strict], identical planning to onlyStrict |
| V09 CurrentStrict | flags=[onlyStrict], body `1;`, current profile | unsupported-profile/strict-script-contract; not pass |
| V10 Environment | CanBlockIsTrue with false host; locale=[en] with no verified locale support (two cases) | each unsupported-profile; no body execution |
| V11 Nondeterministic | flags=[non-deterministic] | two variants, unsupported-profile/nondeterministic-policy |
| V12 KeywordInComment | supported synthetic body with comment `/* with (x) */` | no feature skip from comment text; normal admitted execution passes |

## Harness trust

| ID / name | Input or event | Literal expected result |
|---|---|---|
| H01 OrderedUnits | default harness + includes=[a.js,b.js,a.js], synthetic include effects A,B,A | ordered units assert,sta,a,b,a; trace ABA; duplicates preserved |
| H02 HarnessParse | assert unit returns syntax-error; test expects parse/SyntaxError | harness-error/harness; bodyEvaluated=false; never pass |
| H03 HarnessThrow | sta/include setup throws genuine TypeError; test expects runtime/TypeError | harness-error/harness; bodyEvaluated=false |
| H04 IndependentRealm | preflight adds a global/prototype property | test Realm lacks preflight property; no state reuse; test's own harness loaded again |
| H05 AssertionTrue | unchanged harness; `assert(true);` | normal, pass |
| H06 AssertionFalse | unchanged harness; `assert(false);` | actual Test262Error object; positive test fail |
| H07 SameNaN | `assert.sameValue(NaN, NaN);` | normal, pass |
| H08 SignedZero | `assert.sameValue(0, -0);` | Test262Error, fail |
| H09 NotSameZero | `assert.notSameValue(0, -0);` | normal, pass |
| H10 SameStringFailure | `assert.sameValue('a', 'b');` | Test262Error, fail; real formatting path completes |
| H11 ThrowsIdentity | `assert.throws(TypeError, function () { throw new TypeError(); });` | normal, pass |
| H12 ThrowsPrimitive | same call with `throw 1;` | Test262Error, fail; never accept primitive |
| H13 ThrowsNameOnly | same call with `throw {name: 'TypeError'};` | fail; no pass from `.name`; retain actual thrown failure even if formatting itself fails |
| H14 ThrowsWrongObject | same call with `throw new RangeError();` | Test262Error, fail |
| H15 ThrowsNothing | same call with `return;` | Test262Error, fail |
| H16 SameNameForeign | expected TypeError from A, thrown TypeError from B, host-created two-Realm control | Test262Error, fail; constructor names both TypeError do not satisfy identity |
| H17 ErrorShape | actual TDZ ReferenceError value | object; constructor is Realm ReferenceError; name ReferenceError; not diagnostic string |
| H18 ErrorFactory | `Test262Error('x')` and `new Test262Error('x')`, independently | each instance has message x, correct constructor; toString `Test262Error: x` |
| H19 Thrower | `Test262Error.thrower('x');` | uncaught actual Test262Error, fail |
| H20 HarnessGuard | evaluator step guard while loading include | resource-limit/harness; harnessValidated=false; no test body |
| H21 MissingService | selected test requires `$262.createRealm`, capability unavailable | unsupported-feature/preflight/host-service; no stub execution |
| H22 EvalScriptBoundary | future service: first unit `let x=1;`, second reads x; invalid third has an effect before invalid syntax | second sees 1; third effect count=0; service remains unsupported until separately implemented |

H01 uses adapter-owned synthetic include files, not substitutions in a corpus
run. H16 is a host-level harness control and does not authorize guest createRealm.
H13 must fail, but its missing constructor can itself cause a TypeError while
formatting; independent validation must not falsely demand Test262Error there.

## Outcome and phase matching

| ID / name | Expected / injected or real observation | Literal expected result |
|---|---|---|
| O01 PositiveNormal | positive; normal; stdout=`TypeError: not really` | pass |
| O02 PositiveThrows | positive; throw 42, undefined, null, string `TypeError`, plain object (five cases) | each fail/uncaught-throw; constructorName=null except object if actually available |
| O03 RuntimeNegative | runtime/ReferenceError; actual object constructor name ReferenceError, runtime | pass |
| O04 DiagnosticOnly | runtime/ReferenceError; current `failure` string plus diagnostic ReferenceError | unsupported-feature/error-objects when preflight knows current engine; injected admitted primitive throw fails/type-mismatch |
| O05 WrongPhase | runtime/SyntaxError; genuine parse/SyntaxError | fail/phase-mismatch |
| O06 ParseNormal | parse/SyntaxError; parse succeeds, body would throw SyntaxError | fail/expected-parse-error; bodyEvaluated=false, effects=0 |
| O07 WrongType | runtime/TypeError; actual RangeError object | fail/type-mismatch |
| O08 NoThrow | runtime/TypeError; normal | fail/expected-throw |
| O09 EarlyError | parse/SyntaxError; S18 audited assignment-target at test unit | pass; bodyEvaluated=false; harness validated |
| O10 UnsupportedNegative | parse/SyntaxError; unsupported-syntax async | unsupported-feature; no pass |
| O11 UnknownExpect | parse/SyntaxError; generic expect diagnostic without audited rule | unsupported-feature/indeterminate-syntax |
| O12 SourceCap | parse/SyntaxError expected; source guard count=100001 limit=100000 | resource-limit/source-units |
| O13 ParseDepth | parse/SyntaxError expected; parser depth count=129 limit=128 | resource-limit/parse-depth |
| O14 RuntimeGuard | runtime/RangeError expected; step count=100001 limit=100000 | resource-limit/steps |
| O15 RealRangeError | runtime/RangeError expected; semantic RangeError object, no guard | pass; distinct from O14 |
| O16 RuntimeSyntax | runtime/SyntaxError from global declaration instantiation | pass; stage test, phase runtime even before body statements |
| O17 ConstructorName | runtime/TypeError; ordinary thrown object has actual callable constructor with name TypeError | pass by negative constructor-name rule; does not imply assert.throws identity success |
| O18 ConstructorAbrupt | constructor lookup throws guest sentinel | fail/constructor-inspection-abrupt; original throw and sentinel retained |
| O19 ConstructorFault | constructor inspection causes host exception | host-fault; no inferred type |
| O20 HarnessFunction | assert defined in harness throws during body evaluation | fail/test/uncaught-throw; not harness-error |
| O21 UnsupportedAfterError | valid early-error witness also contains unsupported token elsewhere; lexer returns unsupported | unsupported-feature; no retry/edit/pass |

## Transport, counts and preservation

| ID / name | Input or event | Literal expected result |
|---|---|---|
| T01 Timeout | supervisor deadline reached; stdout contains `PASS` | timeout; no pass |
| T02 CrashAfterOutput | stdout=`undefined`, abnormal termination | host-fault/crash |
| T03 CrashAfterEnvelope | valid normal envelope then abnormal exit | host-fault/crash |
| T04 MissingEnvelope | exit0 without complete result file | host-fault/protocol |
| T05 SpoofedOutput | guest prints JSON-shaped `status:pass`, actual throw | fail/uncaught-throw; stdout not protocol |
| T06 MalformedEnvelope | truncated JSON, duplicate key, unknown schema, wrong variant ID (four cases) | each host-fault/protocol |
| T07 OutputLimit | captured output exceeds configured cap | resource-limit/output; no truncated-success claim |
| T08 HostText | host exception text mentions SyntaxError; expected parse/SyntaxError | host-fault; no pass |
| T09 SeparateLanes | Node pass, native timeout for same variant | Node pass=1; native timeout=1; no combined pass |
| T10 AllStatuses | 8 planned variants, one of each status | total=8; pass/all=1/8; conditional=1/2; all eight counts=1 |
| T11 PairPartial | one file, strict pass and non-strict unsupported-profile | file passes=0/1; variant passes=1/2; retain both |
| T12 CorpusCount | unchanged 33-entry CL-004 manifest | files=33; variants=60 per lane; strict=30, non-strict=28, raw=1, module=1 |
| T13 UnknownDenominator | one malformed metadata entry alongside one valid pair | selected files=2; planned variants=2; unplanned input errors=1; batch incomplete, no full-selection percentage |
| T14 FixtureExclusion | selection discovery sees `dep_FIXTURE.js` | excluded dependency=1; standalone tests added=0 |
| T15 Cancellation | process stops with 3 planned, 1 terminal | planned=3; completed=1; missing=2; incomplete, never shrink to1 |
| T16 Retry | same variant fails then passes | denominator=1; attempts=2; first fail retained; no silent first-attempt overwrite |
| T17 CacheInputs | alter adapter, capability, harness byte, include order, pin, limits, engine build (seven independent cases) | no cache reuse in v1; future cache key differs in each case |
| T18 ObservationOnly | parser/body observation returns normal | no classification/pass field; corpus pass increment=0 |
| T19 ExitPolicy | all pass; complete with unsupported; incomplete (three cases) | batch exits 0,1,2 respectively |
| T20 Baseline | future changes against accepted TS-030A | all211 case names/assertions and32 gates retained; full required validation passes |

## CL-004 whole-file controls and early-error neighbors

These are preflight expectations for the currently missing capability, not new
measurements. For default-pair files, non-strict remains unsupported-profile;
strict stays blocked by the general profile/harness gates as well as the listed
file-specific blocker. The primary status follows the design's precedence.

| ID / name | Corpus/control | Literal expectation after unrelated general gates are satisfied |
|---|---|---|
| C01 MissingASI | U01 | unsupported-feature/asi; no parse-negative pass from `expected ';'` |
| C02 AsyncGrammar | U02 | unsupported-feature/async-functions; no execution |
| C03 RawDirective | U03 | unsupported-profile/directive-script until correct raw profile, then unsupported-feature/asi until ASI; never prepend harness |
| C04 ModuleThis | U04 | unsupported-feature/module; no Script normal counted |
| C05 RawObservation | U05 bare source normal | observation only; strict conformance requires real harness, non-strict unsupported-profile |
| C06 SloppyReceiver | U06 | unsupported-profile/sloppy-script; no strict-call substitution |
| C07 GlobalThis | U07 | unsupported-profile/global-script; diagnostic TypeError is not expected ReferenceError |
| C08 AsyncDone | U08 | unsupported-feature/async; exit0 without completion never pass |
| C09 PartialAssertions | U09 | unsupported-feature/RegExp; preserve both assertions and whole-file denominator |
| C10 NestedIIFE | U10 | unsupported-feature/asi; after ASI, an actual guard becomes resource-limit, never syntax pass |
| C11 ReturnBytes | U11 | unsupported-feature/return-asi with exact bytes; no rewritten control substituted |
| C12 AssignmentNeighbors | `42 = 42;` / `let x; x = 42;` | audited parse/SyntaxError(assignment-target) / parses |
| C13 WhileNeighbors | `while(false) let x;` / `while(false) { let x; }` | audited parse/SyntaxError(lexical-declaration-statement) / parses |
| C14 ReturnNeighbors | `return;` / `function f(){ return; }` | audited parse/SyntaxError(return-outside-function) / parses |
| C15 ParameterNeighbors | strict `function f(x,x){}` / strict `function f(x,y){}` / sloppy duplicate | audited parse/SyntaxError(duplicate-strict-parameter) / parses / unsupported-profile |
| C16 BlockNeighbors | strict `{function f(){} function f(){}}` / strict `{function f(){} function g(){}}` / sloppy duplicate | audited parse/SyntaxError(duplicate-block-lexical-function) / parses / unsupported-profile |
| C17 CandidateErrors | S01,S02 after Error/Script/harness gates | genuine runtime ReferenceError required; exact pinned bodies, no rewritten assertion |
| C18 CandidateAssertions | S03,S04 | unchanged assert.throws observes actual ReferenceError identity; no diagnostic-string acceptance |
| C19 CandidateBodies | S05–S17 (each separately) | no raw/probe promotion; all whole-file capabilities checked; normal only passes after actual unmodified run |
| C20 CandidateParse | S18,S19,S20,S21,S22 (each separately) | respective audited rules from C12–C16, test body effects=0, independent harness validation required |

Coverage of accepted audit: D1=O03/O16; D2=O05–O13/T08;
D3=V04/V05/C03; D4=V06/C04; D5=I17/H01/C05;
D6=H05–H19/H21/H22; D7=O01/O02/T02/T05;
D8=H20/O12–O15/T01–T08; D9=T17; D10=I01/I03/T12.
No row weakens assertions or treats the reference engine as an oracle.
