# TS035B pre-implementation controls

Base 91ae047; frozen before engine or test implementation, 2026-11-05.
Runtime inputs are `missing;\n` and `otherMissing;\n`. They select distinct
ReferenceError messages and sentinel values 7 and 11. No parity-only oracle.

X01: actual strict missing-reference throw, available ReferenceError, original
record/Realm/location (line 1, column 15 with strict prefix). Ordinary entry
must perform no inspection; observed normal has null source/inspection.
X02: strict string ReferenceError, number 7/11, null, undefined, boolean and
Symbol throws are absent. Diagnostic names do not determine constructor names.
X03: `throw target;` has two ticks at columns 1 and 7. Host accessor constructor
then name each run once with exact target/callable receiver and each tick once
at original column 1. Total four ticks; effect order C,N. Constructor null or
undefined absent; numeric/object noncallable; callable name 7 non-string-name;
empty name available. Actual guest accessors also run through captured dispatch.
X04: either getter throws same sentinel completion: exact secondary completion,
value, record/Realm/location retained; no sentinel constructor read. Original
completion and lastAbrupt survive, including when a getter throws the original
completion again. Guest getter throws preserve defining source identities.
X05: same/other Script Realm callable retains actual Realm; legacy callable
foreign-profile and skips name. Registry/unregistered-realm is adapter-owned.
X06: either getter resource/unsupported/host failure; direct resource and
unsupported bypass Gets. Nested cross-Realm host fault restores BOTH original
sessions, whose subsequent ordinary and observed evaluations succeed.
U01/U02: actual map custom-species unsupported operation directly and from
constructor/name getters; exact runtime.map-species origin and original/secondary
source retained, never recursively inspected or converted into negative match.

Exact host getter prefixes, for fresh and seven-empty-statement seeded sessions:
additional limits 0,1,2,3 fail steps at counts seed+1,seed+2,seed+3,seed+4,
locations 1,7,1,1 and effects '', '', C, CN respectively. At additional limit4
inspection succeeds, steps seed+4. Call limits0 fails first getter at steps
seed+2 with effects ''; limits1 and2 succeed at seed+4. Exhausted sessions keep
their limits; later empty source may succeed without ticks, but `;` fails.
Each failure restores active=null,calls=depth=0 and original lastAbrupt where
inspection began. Successful sessions reuse the SAME session, never substitutes.
Mutating detached source locations and result shells cannot alter session state;
real guest object/completion/Realm identity intentionally remains shared.

All X/U controls run both inputs in Node and native. Existing H7/H1-H6/M/E4,
inherited identity controls and A's 21 host tests remain required independently.
