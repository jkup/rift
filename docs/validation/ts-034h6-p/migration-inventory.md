# Migration inventory and exact compatibility policy

This proposes future changes; no existing test/evidence is changed by H6-P.
Base file hashes and full matching lines are in inventory.json. The main design
enumerates all production owners and semantic Realm rules. This file enumerates
the old tests and outputs. A needs **zero** old test edits. B and C need explicit
review of the following patches, with whole-file baseline comparisons. The
enumeration does not authorize a blanket test refresh.

## API migrations in B

All nine contextless primitive/receiver helpers acquire one mandatory trailing
`realm: Realm | null` argument: toNumber, toString, toUint32,
toIntegerOrInfinity, toLength, thisNumberValue, thisStringValue, thisBooleanValue,
thisSymbolValue. No default Realm and no optional argument. Production semantic
callers always pass context.realm; numeric wrappers pass their own realm argument;
Array bootstrap passes null. Null explicitly preserves the old direct, primitive-
only host API contract. It is not permitted at a Script semantic callsite.
Direct old helper tests append literal null, preserving their existing assertion,
diagnostic, output and unsupported boundaries. New B tests independently exercise
these helpers with a Script Realm and real guest errors.

Exact old test callsite lines (some contain multiple helper calls; every direct
call on the listed line gets the new argument; guest strings are not edited):

| File under test/ | Base lines |
|---|---|
| array-like.ts | 121,122,134,135 |
| array-string-conversion.ts | 655 |
| boolean-string-conversions.ts | 111,168,181,229 |
| conversion.ts | 23,24,34,114,126,130 |
| function-string-conversion.ts | 470 |
| key-coercion.ts | 210 |
| number-conversions.ts | 106,131,213 |
| length-coercion.ts | 314,315,317,318,339,340,341,342 |
| object-valueof.ts | 238,293 |
| primitive-conversion.ts | 285 |
| primitive-reads.ts | 787 |
| property-assignment.ts | 1056 |
| property-key-conversion.ts | 98,115,299 |
| realms.ts | 359 |
| structured-outcomes.ts | 227 |
| symbol-conversions.ts | 110,128,191 |

GlobalEnvironment.createMutableBinding(name,loc,realm) also acquires a mandatory
trailing Realm|null. ScriptLocalBindings.createMutableBinding is **unchanged**.
The production caller is script-global-declarations.ts114, passing context.realm.
Exact test migrations:

| File | Base line / patch |
|---|---|
| test/global-environment.ts | 99,138,166,246,264,279,329,354,355: append null to each global createMutableBinding call (historical trusted host semantics). |
| test/script-environment.ts | 81 only: globalRecord.createMutableBinding("live",loc,context.realm). All local binding calls unchanged. |
| test/script-realm-bootstrap.ts | 112,166: append context.realm to global createMutableBinding calls. |
| test/harness-nonstrict.ts | 591: append c.realm to r.globalEnvironment.createMutableBinding("ghost",loc); retained effects/prefix unchanged. |
| test/script-global-declarations.ts | 51: add `realm: Realm | null` parameter (Realm already imported), forward it to super; preserve visit/abrupt identity. 176,258: append h.context.realm to h.env.createMutableBinding. |

No OperationContext shape change; existing contexts need no extra field. No
GuestObject override signature change. Exact synthetic completion/failure calls
remain unchanged. No need to migrate test/script-function-setup local creates,
test/property-accessors local creates, or unrelated guest `.toString()` strings.

## Old semantic outputs and negative controls

| Existing surface | Old expectation → proposed expectation / responsible slice |
|---|---|
| test/script-realm-bootstrap.ts globals array and B02 | Original five stay in original order. B Script globals append Error,TypeError,ReferenceError,RangeError,SyntaxError in this order. C appends String,Object in this order. Keep a separate legacy list of exactly original five for B01; do not enlarge that list or reduce its count. B02 descriptor loop includes all Script additions as Wtrue/Efalse/Ctrue. Arbitrary installGlobal name still host rejects. |
| test/script-realm-bootstrap.ts B03 `prototypes`/`lists`/method loop | B existing seven prototype key lists unchanged (new Error prototypes tested in new driver). C objectPrototype list becomes [valueOf,toString,constructor]; stringPrototype list becomes [length,toString,valueOf,constructor]. For these two constructor entries use explicit constructor graph/length1/prototype descriptor assertions; do not pass them to the old method-only helper that requires own keys [name,length]. Preserve checks for every old method, restricted endpoint and @@hasInstance. |
| test/script-realm-bootstrap.ts B04 | Existing fresh-object checks remain, including distinct old method objects. The C constructor additions are data properties with distinct objects across Realms, so old iteration remains valid; new driver checks entire new graph. |
| test/harness-construct.ts C10/C11 line73 | No edit. Ordinary createBuiltin remains nonconstructible; Function.prototype, Number namespace, ordinary objects and primitives remain nonconstructible. Genuine Error/String/Object constructors are not members of that negative input list. Add positive neighbors in new drivers. |
| test/harness-construct.ts X08 line568 | No edit. Mismatched ordinary Script callable/constructor metadata remains a host fault before prototype effects. Add separate new builtin-copy/permit negatives. |
| test/script-execution.ts negative new f(...xs); test/harness-nonstrict.ts new C(...xs) | No edit. H5's three reviewed migrations remain exactly inherited. Spread/newTarget/class/derived/bound/Reflect/Proxy remain blocked. |
| test/harness-catch.ts diagnostic mode (178–183) | Its assertion is normal completion and one effect, not a string-value assertion. Keep unchanged; new E15 proves the object identity. Existing primitive/sentinel catches unchanged. |
| test/harness-switch.ts P07 TDZ; H3 update errors; H4 strict writes; H5 TypeErrors | Keep diagnostic/origin/source/prefix expectations; Script thrown Value changes string→object in new B evidence. Old tests check names/origins, not constructor identity; do not misrepresent those old assertions as new object proof. |
| script-global-declarations, script-environment, script-restricted-properties, script-function-setup and script-execution error controls | Preserve Diagnostic name/message/phase/location and engine-diagnostic origin. New B assertions strengthen Realm/brand/identity without rewriting old records. Injected arbitrary completion values remain exact. |
| 212 legacy guest records, CLI, observations22, structured resource/unsupported outcomes | No output/status/value-kind migration. Default Realm stays legacy and all legacy language errors stay strings; resource and unsupported strings stay exact in both profiles. |
| New B public Error names / C String,Object | Earlier Script `typeof Error`/String/Object was undefined or unresolved reference threw a diagnostic string. These names now resolve to real functions. Existing negative controls that use unrelated f/C/Number remain unchanged; no old source is replaced to hide admission. The global inventory is the identified affected old expectation. |

Origin `engine-diagnostic` is retained as the existing engine-language-failure
provenance tag even when value is an Error. It is neither a string-shape promise
nor a constructor classifier. Renaming it would unnecessarily change outcomes,
transport and old tests, so that migration is explicitly rejected here.

Public Error constructors allocate language-error objects but a normal return is
normal completion. Guest `throw new Error(...)` has guest origin and existing
Uncaught diagnostic. Engine languageFailure still carries its original name and
message, regardless of mutable guest properties. Only object value changes.

## Evidence replay policy

Do not edit previous validation JSON, freeze files, source hashes, expected
stdout snapshots or preservation scripts in place. Their original commits remain
evidence of the earlier behavior. New successor evidence records exact baseline,
approved source substitutions and old/new semantic projections separately.
If a historical replay script asserts byte-for-byte preservation against an old
source hash, run a new scoped replay with the approved patch manifest and explain
that difference; never delete the assertion or claim that old preservation check
still passed unchanged. Every original semantic row must still run.

An implementation writer must render the above source edits as exact whole-file
proposed patches and verify all other bytes against this base before review.
No unknown output delta is preapproved: stop for a specific reviewed amendment.
There is no old-negative removal, record count change, gate removal, corpus
unblocking or observer-constructor migration in this checkpoint.
