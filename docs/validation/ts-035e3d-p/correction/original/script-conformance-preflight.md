# TS-035E3d-P: construction and preflight audit — review stop

Base: `bf02056238bce71d46505a6f92640305d640a5eb`, including accepted
E3b positional producer and E3c input-only snapshots. This is an incomplete
design stopped at a substantive dispatch/codec boundary, not an implementable
contract or an execution certificate. No production or old test changes are
proposed in the manifest. Actual/root and independent second review must resolve
the stopping boundary below before a writer freezes whole-file proposals.

## Reduced dependency that prevents a mode-only preflight adaptation

C's `preflight()` executes each H7 control as a harness occurrence, followed by
a strict empty dummy test. On normal B01/B05/B11/N01, `Attempt.run()` continues
to that test and returns its test/body normal result. On deliberately throwing
controls it returns the harness result. This is valid **observation** behavior.

Both accepted v2 decoders require a nonnull preflight ID and
`harnessValidated=true` for a nonraw **conformance** test-stage operation. E3b's
positional validator independently requires that ID before it constructs an
Attempt. Preflight itself has no successful result ID yet. Consequently changing
only C's mode/profile strings cannot implement conformance preflight. The
parse-only dummy does not avoid this rule; it applies to test/parse too.

The retained offline reduction has twelve complete synthetic child/envelope
inputs, six cases for each lane label, twenty-four checks against the two actual
decoders, and three exact argv/parser controls. Native is a synthetic identity
field in these records; no native program ran. A full returned object is compared
on each accepted decode, and rejected decodes require exactly `protocol`.
The isolated parser span is copied byte-for-byte from the accepted source and
has no imports, Realm, IO or launcher. It requires
`script-producer/variant-preflight` for strict/null, while raw/null and a strict
fabricated ID are accepted as data. This does not run the complete producer.

| Literal case, each lane | Child decoder | Full decoder | Meaning |
|---|---|---|---|
| Observation strict positive at dummy test, null ID | Full normal child | Full observation envelope | Existing C protocol can represent this. |
| Conformance strict positive at dummy test, null ID | `protocol` | `protocol` | Cannot reuse C's positive terminal unchanged. |
| Conformance strict parse-only dummy, null ID | `protocol` | `protocol` | Changing action is not a solution. |
| Conformance non-strict positive, null ID | `protocol` | `protocol` | Variant relabeling is not a solution. |
| Conformance actual harness normal terminal, null ID | Full normal harness child | Full envelope, classification `harness-error/harness` | Representable data, but current Attempt does not stop there on success. |
| Conformance dummy positive with fabricated ID | Full normal test child | Full envelope, classification `pass/normal` | Codecs validate data, not preflight authority. This is intentionally synthetic and never an admission witness. |

The last two rows are not proposed workarounds. A normal harness result must be
returned from that actual operation, not relabeled from the subsequent test.
The conformance classifier's `harness-error` is a corpus classification, not a
preflight control verdict. Inventing an ID or reading a classification as a
control verdict would confuse the two boundaries. This finding is not a defect
in either accepted decoder; their existing invariants are correct and preserved.

## Alternatives and recommended first prerequisite, subject to review

1. **Relabel the existing C route:** reject. Besides the cycle above, C binds
   observation mode, an observation profile, nullable capability/rule identity,
   old argv and additional control callbacks. Equal output is insufficient.
2. **Pass a fixed/predicted ID before preflight:** reject. A stable descriptor
   digest is not the result of an executed successful control bundle. It would
   falsely set `harnessValidated` in the actual producer.
3. **Relax both existing decoders or put controls in raw mode:** reject. This
   widens a preserved conformance invariant; raw excludes all harness occurrences.
4. **Introduce a separate preflight result protocol:** feasible but larger.
   It needs an exact new record and decoder with independently authored literals,
   resource/host/timeout transport rules and constructor provenance. It must not
   duplicate the corpus classifier. No names or schema are frozen here.
5. **Stop at the actual designated control-harness occurrence:** recommended
   smallest prerequisite. A private dispatch path inside the existing Attempt
   owner would return the observed harness completion (including normal) after
   fixed control verification and before the dummy test. Main execution and
   observation would retain their current behavior. A separately validated
   control request must permit null preflight without weakening E3b's production
   positional validator. Parent control verification would consume full child
   and control evidence, never corpus pass/fail. The actual operator remains
   harness/body, and no test body is claimed. The existing codecs can represent
   that child without alteration, as the reduction demonstrates.

Alternative 5 changes the terminal boundary and introduces a distinct request
purpose. It is a consequential consumer/API decision, not an error-string or
fixture repair. Per this assignment's ambiguity rule, retain the reduction and
obtain actual/second review before freezing it. No public callback, AST, Realm,
register/mint/load function, injected verifier, arbitrary profile or test-only
authority export is authorized. There are **zero frozen implementation files,
exports, types, argv additions, error additions or old-test replacements** at
this stop; `proposal-manifest.json` states that explicitly. In particular this
document is not permission to add alternative 5 to production.

## Actual construction and callback identity

`src/script-observation.ts` is the sole private Attempt owner. Main observation
and conformance producers both allocate its `new Realm(throwingSink,"script")`.
The constructor registers that exact Realm as `test`. Source projection uses
Maps keyed by real ExecutableScript and Realm identities, checking recorded
unit ID too. An ID string cannot substitute for registration. Conformance mode
only changes wire data. There is no conformance parent or grant in this route.

The initial main global own properties are undefined, NaN, Infinity, console,
Number, Error, TypeError, ReferenceError, RangeError, SyntaxError, String and
Object. Number is the current partial namespace, not a constructor. Function,
Array, Boolean and Symbol prototype objects and conversion callbacks exist in
the Realm, but that does not install corresponding guest global constructors.
There is no `$262`, `$DONE`, print or arbitrary host-service registration in the
main Attempt. `console.log` formats its arguments with the existing `display`
routine and invokes the sink, which throws `unexpected Script output`.
It is neither a successful logger nor an absent global. The driver catches host
faults and reports its generic exit70, which cannot prove the cause or no effects.

Realm bootstrap creates distinct object/function/array/primitive prototypes,
five error prototypes/constructors, restricted function properties and conversion
methods. It then installs globals and the script-only Error/String/Object
registrations. The complete source graph, including all registration modules,
runtime objects, parser, static plan, evaluator and Script private owner, is in
the audit. Source hashes must bind this actual sequence, not a manually assigned
profile name. `guardBuiltin` checks profile and consumes a private invocation
permit bound to actual callback, receiver, args and location. Constructor
permits are separate. Main host-service identity must include these paths.

Control setup is an explicit extension of that construction, never its alias:

| Setup | Additional state and observable behavior |
|---|---|
| S02 | Nonwritable, nonconfigurable `reserved` binding. |
| S01 / loop | Guarded `observe` / `entered`; actual active record, body phase, Realm and context checks; loop marker only at reached guest entry. |
| B09 / registered-other / guest-other* | Distinct Script Realm, registered as `other`; B09 transfers its actual ReferenceError as `Other`. |
| unregistered / foreign | Unregistered Script Realm / legacy-profile Realm; neither may be projected as main `test`. |
| U01 | `unsupported` callback invokes actual map/species unsupported path. |
| X03 and constructor/name/guest controls | Actual target and ctor objects, getter receivers, ordered C/N effects; secondary sentinel and completion identities; guest getter installation on the actual selected Realm. |
| B/N/I controls | Fixed assertions of original constructor/prototype/message/value identity; no generic successful exit oracle. |

The additional Realms use the distinct throwing `control output` sink. A future
descriptor must retain main construction and each closed extension separately,
including all callback sources. It must not install B09's `Other`, S01's
`observe`, `entered`, `target`, `ctor`, `sentinel` or U01's service in corpus runs.

## Execution invariants that the first proposal must retain

Each Attempt has a new session; every ordered harness and test shares that
session's step/call budget. `prepareBoundedScript` runs sequentially, so a current
source-size rejection precedes that unit's evaluation, while an earlier harness
failure precedes a later source's preparation. Parse-only still evaluates all
harness occurrences; it prepares but does not instantiate/evaluate the test.
Raw permits exactly one test and null preflight. Seven explicit limits retain
source100000, parse128 and evaluation256; steps/calls zero are values. Parent
wall/output enforcement is not supplied by the producer's data fields.

Observed throw inspection performs actual Get(constructor) with thrown value as
receiver, then Get(name) with constructor as receiver. It preserves original
record/source/Realm while separately capturing secondary abrupt inspection.
Resource/unsupported completions bypass ordinary throw conversion. The private
evaluator restores active Realm, frame, call count and depth in finally, and
restores original abrupt history after inspection; steps remain monotonic.
Attempt additionally checks cleanup and original record/Realm/location identity.
Any future stopping path must remain inside these mechanisms.

Successful preflight must discard every control AST, prepared record, Realm,
session, global, callback, thrown object and completion. Reload whole original
harness bytes in occurrence order into a newly allocated main Attempt; do not
reuse a prepared record, share a mutable object or import a control Realm. The
fresh attempt restarts its own budget; within each attempt all original harness,
control and inspection work shares one monotonic budget. Recheck unchanged
bytes and the complete source/build binding before this reload and at eventual
launch. A stable descriptor contains neither nonce, run ID, preflight result ID,
attempt ID nor receipt ID. Equal stable data never mints success.

## Closure and immutable original inputs

`closure-audit.json` inventories all 270 tracked live TS/JS/MJS/CJS files under
src/test/tools with hashes, import lines and numbered relevant references, all
2,088 historical source/script files separately, and 1,161 import edges. The two
driver entry graphs each conservatively include 48 project members, counting
type imports. Core facade exports lead to `script-execution-internal.ts`, not a
second implementation. The audit also enumerates E3c input, E2 ledger, C parent
and both codec entry closures. This is a lexical graph, not a claim that regular
expressions certify arbitrary dynamic imports or runtime external packages.

The future source/build closure must include every actual src TS, main/control
drivers, input/policy/ledger/snapshot/parent helpers, both codecs and classifier,
fixed manifests and rule registries, all fixtures and LICENSE, package/lock,
tsconfig, native build script and coverage verdict. Node generated modules and
the actual Node executable, native driver/control binaries and their build
provenance, YAML contents, scriptc/TypeScript packages and native linker/sysroot
contents must be resolved explicitly. Those external member lists and
source-to-build certification remain **unresolved**, not empty/default fields.
Two C/E2 summary digests do not close these dependencies.

Full original assert.js, sta.js, LICENSE, C frozen rows/control registry, H7
literal rows and corrected timeout contract are retained byte-for-byte as base64
with byte lengths/hashes. Harness order is assert then sta; a repeated sta is a
distinct occurrence with a newly created constructor and record. These are input
evidence, not newly executed H7 or conformance proof. E3c retains the full E2
anchor, Module and null-slot denominator; input identity stays executionBinding
null/admission blocked. E1 registry stays empty; all60 blocked (19 feature/41
profile), executed0/body0 remains inherited evidence, not a newly run suite.

## Outstanding literal acceptance matrix — not yet frozen

The following rows remain mandatory for the resumed design. They require full
independent expected objects/streams and actual mutations before a proposal can
be called complete. The twelve reduction literals above do not replace them.

| Family, both future hosts unless explicitly host-only | Required literal observations and distinguishing mutations |
|---|---|
| B01–B16, N01/N02, I01 alpha/beta | Ordered complete original harness/control bytes, full child/report/transport expectations; 7 versus 11; original Test262Error prototype+constructor and exact message/value, B09 actual other constructor. Omit/reorder/relabel controls; forge matching name; replace original constructor. |
| Original getters and provenance | Exact receivers, C then N once, guest and host getters, same completion thrown twice, secondary original locations and actual defining Realm; foreign/unregistered and repeated sta occurrence. Mutate unit/role/stage/Realm/location independently, not solely hashes. |
| Budget/finally/priority | Low steps/calls, seeded shared budget, source/parse limits, unsupported and resource during original evaluation and constructor/name inspection, host sentinel identity. Exact count/limit and idle state; no conversion to a language-negative pass. Parent deadline before crash/cap, crash before cap, output before protocol. |
| Preparation versus body | Instantiation throw body=false, test/body actual entry; parse-only harness executes while test has no effects. Later oversized source cannot erase earlier harness failure. Wrong action and relabeled phase must fail. |
| Reached-loop timeout | Exactly one marker from guarded callback in actual first loop iteration plus real deadline; preparation reject, no marker, duplicate marker or fabricated timeout metadata must fail. Parent-only timeout retains null operation/source/body=false. |
| Input and dispatch | Seven limits, exact strict prefix, raw excludes harness/control, original repeated occurrences, malformed argv/role/mode/variant/action, missing/aliased/drifted bytes, descriptor/code mismatch and error precedence. Direct boundary errors and unchanged state, not generic exit70. |
| Ownership/lifecycle | No reuse/reentry, discard all preflight state, new original-byte reload and actual main construction. Changed closure after await, omitted callback, changed throwing sink or copied descriptor must fail before relevant effects. No cached success by digest. |
| Admission/denominator | Full original both-lane reports, unknown metadata/includes, partial inputs, Module/nullslots, all60blocked; no profile label, stable hash or fabricated ID becomes authority. |

No future pass counts, full expected control outputs, successful conformance
dispatch or construction-bound descriptor API are claimed. Complete full-file
old-source/test proposals and their hashes/verifier are deliberately **not
frozen** while this new boundary is under review. Retained 212 records in each
guest lane and 71 static gates are untouched; no builds/full suites were run.
Toolchain/build certification, archive schema, private parent ownership, receipts,
durable restart and F activation remain separately reviewed dependencies.

Stop here for actual/root audit and independent second review of alternative 5
versus a separate preflight protocol. No implementation, publication or successor
work is authorized by this handoff.
