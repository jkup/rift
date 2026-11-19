# TS-005D validation — 2026-11-01

Base: e174a355780b265d198396b8222b186e3133c715 on typescript-scriptc-probes.
Implemented only the frozen definition completion/location migration.

Commands from typescript/: npm run typecheck; npm run test:runner;
npm run test:probes; npm run test:guest:node; npm run test:guest:native.
Native commands used the installed Zig 0.17.0 directory on command-local PATH
and authorized library access. No compiler pins or acceptance gates changed.

Results: typecheck passes; runner 20/20; compiler probes 10/10; rebuilt
Node/native guest and host suites 133/133 each, no skips, crashes, timeouts or
harness failures in the retained final runs. Full subprocess results accompany
console transcripts. All seven native entries pass static-only builds and the
separate fail-closed coverage gate:

| Entry | Static/analyzed |
|---|---|
| CLI | 785/785 |
| realms | 850/850 |
| object-descriptors | 250/250 |
| object-prototypes | 857/857 |
| object-keys | 295/295 |
| conversion | 340/340 |
| definition-dispatch | 879/879 |

The new driver imports and subclasses the actual GuestObject. Six distinct-receiver
cases cross new/own update with success/false/throw; twelve strict cases cross
new/own update, success/false/throw and set/putValue. Assertions check exact throw
record/value/diagnostic/location identity, descriptor fields, original RHS identity,
lookup-base preservation and fixed override call counts. Further cases exercise
readonly lookup/receiver and primitive rejection before dispatch, nonextensible
rejection inside ordinary definition, successful nonextensible updates, inherited
readonly rejection, all three evaluator outcomes with RHS side effects, abrupt RHS
skipping definition, subsequent statement suppression, and both bootstrap faults.
Existing descriptor/key/prototype assertions now supply locations and discriminate
completion results; the formerly unchecked prototype definition is asserted.

An initial Node test incorrectly expected run() to return the final expression.
Evaluator.block deliberately returns normal undefined on successful completion.
The test now captures the assignment in a guest binding and checks its exact RHS
identity; no evaluator change was needed. Final retained runs include that fix.

Ordinary definition itself still returns only normal booleans. Synthetic bootstrap
location is 1:1; guest Set passes its actual location. Private storage and iterative
ordinary lookup remain unchanged. This establishes definition override dispatch,
not generic exotic objects, arrays, coercion or guest reflection. No C++, pins,
conversion implementation, coordinator file or Claude outputs changed.

Awaiting coordinator review; no successor dispatched.
