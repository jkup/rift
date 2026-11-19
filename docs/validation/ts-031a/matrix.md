# TS-031A coverage and deferred map

All 115 accepted rows are accounted for. Host assertions are literal tests, not Rift execution. Test filenames are relative to `typescript/tools/test262/`. Production local-byte integration ran separately with an explicit external corpus root. Every H/C semantic claim remains deferred.

Independent-review supplements (R1-R3): `boundary.test.mjs` strengthens O03/O05/O07
and T06/T17 with parent-owned phase/type/null, blocker and complete Inputs binding
at both ingestion boundaries. It exercises every shared schema/cross-field
invariant directly through the exported classifier. O12/O13/O14 additionally cover
calls at 64/64 and 0/0, below-limit rejection, and unchanged overflow semantics for
source/parse/steps/evaluation/output guards. These eight named tests supplement
the same 115 rows; no H/C semantic prerequisite is promoted to executed evidence.

| ID | Scenario | Host evidence / deferred prerequisite |
|---|---|---|
| I01 | ExactPin | Exercised: input.test.mjs (I01). Exact production bytes: corpus.integration.mjs. |
| I02 | WrongBlob | Exercised: input.test.mjs (I02). Exact production bytes: corpus.integration.mjs. |
| I03 | WrongRevision | Exercised: input.test.mjs (I03). |
| I04 | NewlineRewrite | Exercised: input.test.mjs (I04). Exact production bytes: corpus.integration.mjs. |
| I05 | ExactUnicode | Exercised: input.test.mjs (I05). Exact production bytes: corpus.integration.mjs. |
| I06 | InvalidUtf8 | Exercised: input.test.mjs (I06). |
| I07 | FetchMissing | Exercised: input.test.mjs (I07). |
| I08 | BrokenYaml | Exercised: input.test.mjs (I08). |
| I09 | MissingPhase | Exercised: input.test.mjs (I09). |
| I10 | DuplicateKey | Exercised: input.test.mjs (I10). |
| I11 | WrongArray | Exercised: input.test.mjs (I11). |
| I12 | MissingDescription | Exercised: input.test.mjs (I12). |
| I13 | MultipleFrontmatter | Exercised: input.test.mjs (I13). |
| I14 | MetadataDrift | Exercised: input.test.mjs (I14). |
| I15 | Conflict | Exercised: input.test.mjs (I15). |
| I16 | Traversal | Exercised: input.test.mjs (I16). |
| I17 | MissingInclude | Exercised: input.test.mjs (I17). Exact production bytes: corpus.integration.mjs. |
| I18 | UnknownFlag | Exercised: input.test.mjs (I18). |
| I19 | UnknownFeature | Exercised: input.test.mjs (I19). |
| I20 | ResolutionScript | Exercised: input.test.mjs (I20). |
| V01 | DefaultPair | Exercised: input.test.mjs (V01); V01 also ledger.test.mjs retains the second variant. |
| V02 | StrictOnly | Exercised: input.test.mjs (V02); V01 also ledger.test.mjs retains the second variant. |
| V03 | SloppyOnly | Exercised: input.test.mjs (V03); V01 also ledger.test.mjs retains the second variant. |
| V04 | Raw | Exercised: input.test.mjs (V04); V01 also ledger.test.mjs retains the second variant. |
| V05 | RawIncludes | Exercised: input.test.mjs (V05); V01 also ledger.test.mjs retains the second variant. |
| V06 | Module | Exercised: input.test.mjs (V06); V01 also ledger.test.mjs retains the second variant. |
| V07 | AsyncPair | Exercised: input.test.mjs (V07); V01 also ledger.test.mjs retains the second variant. |
| V08 | Generated | Exercised: input.test.mjs (V08); V01 also ledger.test.mjs retains the second variant. |
| V09 | CurrentStrict | Exercised: input.test.mjs (V09); V01 also ledger.test.mjs retains the second variant. |
| V10 | Environment | Exercised: input.test.mjs (V10); V01 also ledger.test.mjs retains the second variant. |
| V11 | Nondeterministic | Exercised: input.test.mjs (V11); V01 also ledger.test.mjs retains the second variant. |
| V12 | KeywordInComment | Exercised: input.test.mjs (V12); V01 also ledger.test.mjs retains the second variant. Admitted execution is deferred; current profile stays blocked. |
| H01 | OrderedUnits | Ordered paths and repetitions exercised; ABA effects await separate Script units and real harness. |
| H02 | HarnessParse | Synthetic harness syntax outcome exercised; actual harness parsing awaits engine support. |
| H03 | HarnessThrow | Synthetic harness throw exercised; actual setup throw awaits real Error values and harness. |
| H04 | IndependentRealm | Disposable Realm isolation awaits a batch driver and independent harness evaluation. |
| H05 | AssertionTrue | Unmodified assert execution awaits harness language and Script support. |
| H06 | AssertionFalse | Actual Test262Error failure identity awaits constructors and harness support. |
| H07 | SameNaN | Unmodified assert.sameValue NaN execution awaits harness support. |
| H08 | SignedZero | Signed-zero assertion failure awaits Test262Error and harness support. |
| H09 | NotSameZero | Unmodified assert.notSameValue execution awaits harness support. |
| H10 | SameStringFailure | String failure formatting awaits Test262Error and harness support. |
| H11 | ThrowsIdentity | assert.throws identity semantics await actual guest Error constructors and harness. |
| H12 | ThrowsPrimitive | Primitive rejection by real assert.throws awaits harness. |
| H13 | ThrowsNameOnly | Plain-object assertion/formatting failure awaits real harness. |
| H14 | ThrowsWrongObject | Wrong Error object assertion awaits constructors and harness. |
| H15 | ThrowsNothing | No-throw assertion failure awaits real harness. |
| H16 | SameNameForeign | Foreign Realm same-name constructor identity control awaits real constructors and harness. |
| H17 | ErrorShape | Actual TDZ ReferenceError object awaits engine Error values. |
| H18 | ErrorFactory | Call/new Test262Error shape awaits ordinary constructors and harness. |
| H19 | Thrower | Test262Error.thrower execution awaits real harness. |
| H20 | HarnessGuard | Synthetic harness guard classified; real evaluator guard during harness awaits driver/harness. |
| H21 | MissingService | Host-service capability certification awaits separately scoped host bindings; no stubs implemented. |
| H22 | EvalScriptBoundary | Persistent Script bindings/effect-free parse service awaits authorized $262.evalScript. |
| O01 | PositiveNormal | Exercised with injected records: result.test.mjs (O01). No real Error object or engine outcome claimed. |
| O02 | PositiveThrows | Exercised with injected records: result.test.mjs (O02). No real Error object or engine outcome claimed. |
| O03 | RuntimeNegative | Exercised with injected records: result.test.mjs (O03). No real Error object or engine outcome claimed. |
| O04 | DiagnosticOnly | Exercised with injected records: result.test.mjs (O04). No real Error object or engine outcome claimed. |
| O05 | WrongPhase | Exercised with injected records: result.test.mjs (O05). No real Error object or engine outcome claimed. |
| O06 | ParseNormal | Exercised with injected records: result.test.mjs (O06). No real Error object or engine outcome claimed. |
| O07 | WrongType | Exercised with injected records: result.test.mjs (O07). No real Error object or engine outcome claimed. |
| O08 | NoThrow | Exercised with injected records: result.test.mjs (O08). No real Error object or engine outcome claimed. |
| O09 | EarlyError | Exercised with injected records: result.test.mjs (O09). No real Error object or engine outcome claimed. |
| O10 | UnsupportedNegative | Exercised with injected records: result.test.mjs (O10). No real Error object or engine outcome claimed. |
| O11 | UnknownExpect | Exercised with injected records: result.test.mjs (O11). No real Error object or engine outcome claimed. |
| O12 | SourceCap | Exercised with injected records: result.test.mjs (O12). No real Error object or engine outcome claimed. |
| O13 | ParseDepth | Exercised with injected records: result.test.mjs (O13). No real Error object or engine outcome claimed. |
| O14 | RuntimeGuard | Exercised with injected records: result.test.mjs (O14). No real Error object or engine outcome claimed. |
| O15 | RealRangeError | Exercised with injected records: result.test.mjs (O15). No real Error object or engine outcome claimed. |
| O16 | RuntimeSyntax | Exercised with injected records: result.test.mjs (O16). No real Error object or engine outcome claimed. |
| O17 | ConstructorName | Exercised with injected records: result.test.mjs (O17). No real Error object or engine outcome claimed. |
| O18 | ConstructorAbrupt | Exercised with injected records: result.test.mjs (O18). No real Error object or engine outcome claimed. |
| O19 | ConstructorFault | Exercised with injected records: result.test.mjs (O19). No real Error object or engine outcome claimed. |
| O20 | HarnessFunction | Exercised with injected records: result.test.mjs (O20). No real Error object or engine outcome claimed. |
| O21 | UnsupportedAfterError | Exercised with injected records: result.test.mjs (O21). No real Error object or engine outcome claimed. |
| T01 | Timeout | Exercised: result.test.mjs (T01), injected transport facts; no supervisor implementation. |
| T02 | CrashAfterOutput | Exercised: result.test.mjs (T02), injected transport facts; no supervisor implementation. |
| T03 | CrashAfterEnvelope | Exercised: result.test.mjs (T03), injected transport facts; no supervisor implementation. |
| T04 | MissingEnvelope | Exercised: result.test.mjs (T04), injected transport facts; no supervisor implementation. |
| T05 | SpoofedOutput | Exercised: result.test.mjs (T05), injected transport facts; no supervisor implementation. |
| T06 | MalformedEnvelope | Exercised: result.test.mjs (T06), injected transport facts; no supervisor implementation. |
| T07 | OutputLimit | Exercised: result.test.mjs (T07), injected transport facts; no supervisor implementation. |
| T08 | HostText | Exercised: result.test.mjs (T08), injected transport facts; no supervisor implementation. |
| T09 | SeparateLanes | Exercised: ledger.test.mjs (T09). |
| T10 | AllStatuses | Exercised: ledger.test.mjs (T10). |
| T11 | PairPartial | Exercised: ledger.test.mjs (T11). |
| T12 | CorpusCount | Exercised: ledger.test.mjs (T12). corpus.integration.mjs verifies both real local 33/60 production ledgers. |
| T13 | UnknownDenominator | Exercised: ledger.test.mjs (T13). |
| T14 | FixtureExclusion | Exercised: ledger.test.mjs (T14). |
| T15 | Cancellation | Exercised: ledger.test.mjs (T15). |
| T16 | Retry | Exercised: ledger.test.mjs (T16). |
| T17 | CacheInputs | Exercised: ledger.test.mjs (T17). |
| T18 | ObservationOnly | Exercised: ledger.test.mjs (T18). result.test.mjs rejects classification fields on observations. |
| T19 | ExitPolicy | Exercised: ledger.test.mjs (T19). |
| T20 | Baseline | Preservation evidence: preservation.txt (exact base diff and unchanged 211 cases / 32 gates). Typecheck and runner rerun; guest/native/probe measurements are inherited, not rerun. |
| C01 | MissingASI | Current U01 asi blocker recorded; actual ASI semantic controls deferred. |
| C02 | AsyncGrammar | Current U02 async-functions blocker recorded; no async engine work. |
| C03 | RawDirective | Raw plan has zero harness; directive/ASI semantics remain deferred. General precedence records asi before profile. |
| C04 | ModuleThis | Module preflight blocked; no module parser or evaluation. |
| C05 | RawObservation | Observation envelopes excluded from counts; U05 engine/harness semantics deferred. |
| C06 | SloppyReceiver | U06 sloppy profile blocked; receiver semantics deferred. |
| C07 | GlobalThis | U07 error-object/global Script blockers recorded; global declaration semantics deferred. |
| C08 | AsyncDone | U08 async blocked; completion protocol deferred. |
| C09 | PartialAssertions | U09 RegExp blocker covers whole file; assertions never run or rewritten. |
| C10 | NestedIIFE | U10 asi blocked; nested evaluation/resource control awaits engine prerequisites. |
| C11 | ReturnBytes | U11 bytes verified exactly and return-asi blocked; return semantics deferred. |
| C12 | AssignmentNeighbors | assignment-target rule accepted only as injected evidence; genuine valid/invalid engine pair deferred. |
| C13 | WhileNeighbors | lexical-declaration-statement certification awaits genuine valid/invalid engine pair. |
| C14 | ReturnNeighbors | return-outside-function certification awaits genuine valid/invalid engine pair. |
| C15 | ParameterNeighbors | duplicate-strict-parameter certification awaits strict context and valid/invalid engine controls. |
| C16 | BlockNeighbors | duplicate-block-lexical-function certification awaits strict context and engine controls. |
| C17 | CandidateErrors | S01/S02 bytes verified; actual runtime ReferenceError requires engine/Script/harness prerequisites. |
| C18 | CandidateAssertions | S03/S04 bytes verified; real assert.throws identity requires constructors/Script/harness. |
| C19 | CandidateBodies | All S05-S17 bytes verified and variants retained separately; whole-file execution remains blocked. |
| C20 | CandidateParse | All S18-S22 bytes verified and variants retained; audited parse rules/independent harness remain deferred. |
