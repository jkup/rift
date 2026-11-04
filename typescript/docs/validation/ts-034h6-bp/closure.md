# Current B ownership and callsite closure

The accepted H6-P producer table is rechecked against c8bd4bb. current-sites.json
is a lexical inventory including imports/definitions, with strings/comments
masked; it is not presented as a TypeScript typechecker. closure.json classifies
102 actual production signature/call occurrences, 50 migrating language-error
producers, and every global/local createMutableBinding test mention. Full current
source bytes are in baseline-hashes.json. No new semantic failure producer was
introduced by A's allocation kernel.

## Mandatory signatures

Exactly nine helpers append `realm: Realm | null`, without default/optional:
toNumber, toString, toUint32, toIntegerOrInfinity, toLength, thisNumberValue,
thisStringValue, thisBooleanValue, thisSymbolValue. Return types are unchanged.
GlobalEnvironment.createMutableBinding becomes `(name: string, loc: Location,
realm: Realm | null): ValueCompletion`. ScriptLocalBindings.createMutableBinding
is unchanged. New languageFailure is `(realm: Realm | null, name: ErrorName,
message: string, loc: Location): ThrowCompletion`. failure/resourceFailure/
unsupportedFailure retain current signatures and exact synthetic payloads.

Numeric wrappers forward their argument; conversion.toPropertyKey passes
context.realm. Array semantic setLength passes context.realm to both conversions;
bootstrap definePrimitiveLength passes null to both. array-like, builtins/array,
number radix and evaluator numeric/update/unary/additive/relational branches
forward the active context Realm. Receiver extraction callbacks rename ignored
context parameters and forward that context. Full callback arity remains required.

All 70 direct helper calls across 16 old test files are rendered with null.
verify.mjs independently rescans every test and fails if any direct helper call
is missing its exact insertion. Guest source strings, primitive backend
stringToNumber/numberToString, and host `.toString` calls are not migrated.
New B tests must exercise genuine Script-Realm errors independently; null on
old host compatibility tests is not evidence of Script object semantics.

All global creates in the five accepted files are rendered, including both
bootstrap calls on line166 and the override/super call at declarations line51.
The override forwards Realm without changing visit/abrupt identity. Local creates
in property-accessors, script-environment, script-function-setup and internal
function/block/catch activation remain unchanged. There is one production global
caller: script-global-declarations.ts114. No Realm is saved on an environment.

## Producers and ownership

closure.json names all 22 exact production paths from the accepted B table:
21 existing files and new builtins/error.ts. Its 50 languageFailure sites retain
diagnostic strings, location, origin and existing order. Allocation Realm comes
from the operation, never from inspected object/lexical environment/observer.
The four non-migrating failure calls are runtime resource/unsupported wrappers,
Array bootstrap validation and legacy block duplicate binding; failure's own
definition is also retained. Missing/initialized binding invariants remain host
errors. Lexer/parser/planner rejection has no running Realm and stays unchanged.

runtime constructorSlot widens; its production reader is private #construct in
script-execution-internal.ts1382–1383. Add the reviewed builtin branch and keep
the ScriptGuestCallable branch/brand check unchanged. Realm supplies matching
guarded callable/constructor records, private constructor map and graph completion.
The only old test non-null slot comparison is harness-construct.ts38–40; its
existing local-narrowed matchingConstructorSlot helper is preserved. A future
compiler failure there is not preauthorization for another migration. Bootstrap
slot-null checks remain valid. New A proposal uses only null checks for the new
slot and direct intrinsic constructor object identity, avoiding union equality.

OperationContext remains exactly realm/call/tick. No override signature changes
to GuestObject, GuestArray or GuestStringObject; no constructor reinterpretation
of call. No changes to abstract-equality's primitive backend, parser, public
observation driver/decoder, ledger, compiler, pins or admission.

Source-only negative audit includes H5 nonconstructor lists, X08 inconsistent
ordinary metadata, spread-new negatives, unchanged catch diagnostic mode,
engine-diagnostic origins, injected sentinel completions and all legacy records.
They remain protected whole files except enumerated API insertions and bootstrap
inventory. H6-A's new graph/string assumptions are reviewed separately in REVIEW.md.

## Evidence verification policy

replacement-manifest.json records byte offsets, exact old/new text, reason,
whole-file before/after SHA256 and accepted base. proposed.patch passes
`git apply --check` against unchanged live tests; no apply is performed.
verify.mjs reconstructs each complete proposal from only the listed spans and
compares every other byte, including CRLF and final newline. Its negative controls
alter a baseline byte, an unlisted proposal byte and omit one replacement, and
require rejection. baseline-hashes.json separately retains worktree hashes and
Git-blob hashes because checkout line endings differ. Snapshot generation verifies
the accepted blob modulo CRLF; all subsequent preservation uses exact raw bytes.

All original evidence/verifiers stay intact. Future B replay must overlay only
the approved manifest in a new verifier and execute every inherited semantic row.
Old historical hash assertions must not be edited or falsely reported as passing
after sanctioned migrations. Original 212 records,55 inherited gates, H1–H5,
H6-A, E4,17 replay groups, Node boundary/slot checks and60 blocked variants remain
acceptance obligations; no duplicate builds were run for BP.
