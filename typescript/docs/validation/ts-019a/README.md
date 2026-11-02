# TS-019A implementation and validation

2026-11-02, `codex/primitive-computed-keys`, assigned base `c80ee2c`; coordinator dispatch `535926f` preserved.
Frozen contract: [symbol-foundation.md](../../symbol-foundation.md), accepted
`eaf73d4`. Implementation owner: chat `01a199e9-c608-7162-952d-a1a1a3465f4d`.

## Scope

Ordinary symbol primitives use GuestSymbol reference identity, immutable optional
UTF-16 descriptions, and a widened Value/PropertyKey. GuestObject retains its
single Map. Explicit boxing allocates a GuestSymbolObject in the active defining
Realm, while each Symbol root is an ordinary payload-free GuestObject. Diagnostic
formatting is separate from guest conversion. No guest Symbol global, factory,
registry, well-known constants, exotic hook lookup, Symbol methods, Object
toString, parser features, constructors, accessors or implicit boxing were added.

Followed the accepted design's fixed ECMA-262 2025 and pinned engine262 comparison
and its recorded adoption/rejection decisions. Rechecked fixed
[ToPropertyKey](https://tc39.es/ecma262/2025/multipage/abstract-operations.html#sec-topropertykey)
(symbol preservation after string-hint primitive conversion) and
[Symbol prototype](https://tc39.es/ecma262/2025/multipage/fundamental-objects.html#sec-properties-of-the-symbol-prototype-object)
(no SymbolData on the root), including descriptive formatting. No engine source
copied; deferred protocol stages remain deferred.

## Requirement-to-test map

Every existing driver retains its final success line after all assertions.
New runtime-read fixtures are loaded by existing drivers, with Values supplied
by host bridges; the manifest remains 164 cases and 23 native targets.

| Requirement | Driver and expected result |
| --- | --- |
| A1 | object-keys: two carrier records compare equal/SameValue only for the same payload; distinct same-description symbols and descriptive string differ |
| A2 | object-keys: fresh identities for absent, empty, repeated and NUL/lone-surrogate descriptions; object-valueof: payload crosses Realms and independent Evaluators unchanged |
| A3 | object-keys: `Symbol(x)`, `@@x`, s and t occupy four entries; update only s |
| A4 | object-keys: exact mixed identity sequence `2,10,z,01,4294967295,s,t`; update stable |
| A5 | object-keys: deletion/reinsert yields `2,10,01,4294967295,z,t,s`; failed t deletion stable |
| A6 | object-descriptors: same-payload nonwritable definition accepted; different payload and Set rejected atomically |
| A7 | object-keys: detached descriptor/map/key array mutation, same key in separate objects; raw snapshot insertion order distinct from own-key order |
| A8 | object-prototypes: inherited undefined presence/read, readonly rejection, absent own deletion, parent survival and direct shadow |
| A9 | object-prototypes: readonly inherited property defeats writable distinct Receiver; writable path updates exact Receiver key |
| A10 | object-keys: symbols described 0/length never extend length; nonconfigurable symbol survives shrink; original array-storage rollback tests retained |
| A11 | object-keys: boxed ab has `0,1,2,length,z,n,s`; virtual 0 still a; String snapshot uses own-key order |
| A12 | object-keys: symbol index helpers return undefined; ordinary symbol delete/nonextensibility; virtual deletion rejected and compatible definition accepted |
| A13 | property-key-conversion: primitive zero-tick key identity, toString returns symbol, fallback `sv` returns symbol, both-object exact failure |
| A14 | conversion: exact located numeric/string TypeErrors; Uint32/IntegerOrInfinity/Length propagate numeric error; primitive path has no hook machinery |
| A15 | conversion/property-key-conversion + symbol-values.js: truthiness, !, &&/|| carrier identity, conditional, Number predicates false, distinct-symbol/string equality false |
| A16 | object-valueof: fresh B boxes with same payload; existing foreign object unchanged; explicit ToObject in independent C; original exact nullish negatives retained |
| A17 | object-valueof: distinct extensible noncallable payload-free roots, empty keys and O link; prototype lookalike has no slot; relinked box retains payload |
| A18 | object-valueof: A -> C bridge -> C.call -> B.valueOf allocates B box and restores C/A; exact guest/host abrupt cleanup; shared step/call limits; original B allocation/abrupt observers retained |
| A19 | object-valueof: direct box converters keep unsupported-object errors without ticks; rooted/null-root Symbol boxes fail ordinary default conversion; explicit hook negatives retained |
| A20 | conversion/object-keys/property-key-conversion: explicit UTF-16 Symbol display, Set/bootstrap/host-inspection messages, raw lookup identity, exact guest thrown payload and location |
| A21 | property-key-conversion: runtime-read symbol reads/writes/member and detached calls; exact raw observed key, receiver, RHS/Get/argument traces |
| A22 | property-key-conversion: new symbol primitive base plus all original null/other primitive bases reject before key hook; assignment RHS remains earlier |
| A23 | array-length-coercion/array-like/array-map: symbol length rejects before mutation/callback validation, symbol callback retains callable error, symbol element reaches callback/result unchanged |
| A24 | object-valueof and retained realms/number/negative fixtures: no Symbol binding or own root methods; exact original O/F/A/B/N/String keys and missing methods preserved |
| O1 | addition + symbol-operators.js: LRH, then exact symbol-to-string error |
| O2 | numeric-operators + symbol-operators.js: LR, no RHS conversion, all four arithmetic operators |
| O3 | relational + symbol-operators.js: LRH before symbol numeric error, all four comparisons |
| O4 | same three drivers: exact RHS symbol sentinel and LR before conversion for all nine operators |
| O5 | property-key-conversion: string-hint H once before exact key Get/Set; abrupt H skips operation/args; assignment RHS precedes H |
| O6 | array-length-coercion existing runtime fixture: first/second hook returns bridge symbol, one/two vv effects, exact 37:12 error, length and element 2 unchanged |

## Exhaustive production migration inventory

Mechanical searches are retained in inspection-index.txt, value-audit.txt and
key-audit.txt. They accompany the following disposition, not a replacement for it.

| Area | Disposition |
| --- | --- |
| symbols.ts | New dependency-light identity and explicit diagnostic formatter; only GuestString type import; no runtime/Realm ownership or global table |
| runtime.ts Value/PropertyKey | Added symbol arm and string/class key union |
| storage/properties/getOwnProperty/define/bootstrap/ordinaryDefine/delete | Existing single Map and detached descriptor copies preserve exact keys/values; no algorithm change |
| ownPropertyKeys | Numeric strings sorted; other strings then symbols in their insertion order; properties snapshot still raw storage order |
| Get/Has/Set/get/set/bootstrapDefine | Existing iterative virtual descriptor/Receiver dispatch preserved; three key diagnostics use formatPropertyKey |
| Reference/getValue/putValue | Existing Value-to-key conversion point and base-first validation unchanged; no eager key conversion |
| truthy/display/equal/sameValue | Three exhaustive switches widened; SameValue delegates identity while retaining NaN/signed-zero handling |
| conversion.ts | Two exhaustive switches reject symbols; ToPropertyKey returns exact payload; numeric derived conversions unchanged |
| property-keys.ts | Both index helpers return undefined before reading nonstring keys |
| primitive-objects.ts | New readonly Symbol payload subclass; existing String virtual descriptor/define/bootstrap/delete/keys/snapshot paths inherit symbol-aware filtering/order |
| object-conversion.ts | Sixth Value switch boxes symbols in context.realm; object/nullish behavior unchanged |
| realm.ts | Ordinary Symbol root after B/N/String roots; factory returns fresh box; metadata/global names remain strings; console already uses display |
| array-object.ts | Exact string length checks unchanged; shrink skips symbol indices; two independent original-Value conversions remain in original order |
| primitive-conversion.ts | Non-object result/input guards already include symbols; ordinary hooks and ticks unchanged; stale scope comment corrected |
| evaluator.ts | AST switches are not Value switches; Value forwarding/throw, unary/binary/truthiness/equality, computed references and call order use widened helpers; Realm finally and budgets unchanged |
| array-like.ts/array-map.ts | Length errors naturally propagate; callbacks still require callable objects; symbol elements preserved; string index/length/constructor keys unchanged |
| builtins/number.ts | Predicates guard number kind, so symbols/boxes remain false without coercion |
| builtins/function.ts/object.ts | Exact Values forwarded; Object.valueOf delegates to new explicit ToObject; no hidden extraction |
| cli.ts/interpreter.ts | Existing display path handles diagnostic symbols; no serialization scheme or execution changes |
| syntax.ts/parser.ts/lexer.ts/strings.ts | Syntax, identifier names and string backend remain strings; no grammar or primitive member boxing expansion |

## Exhaustive fixture/observer migration inventory

| Driver(s) | Migration and preserved intent |
| --- | --- |
| array-like | internalGet widened; existing throws/length negatives unchanged; A23 added |
| array-length-coercion | both Get observers and getOwnProperty widened; every legacy own-key join checks all-string first; A23/O6 added |
| array-map | Get/Has observers widened, trace keys explicitly formatted; original callback/constructor/Realm/limit tests unchanged; A23 added |
| function-call | forbidden Get widened; metadata keys checked all-string; original negatives/budgets unchanged |
| key-coercion | Get/Set/throwing Get widened; original null-root/hook failure traces unchanged |
| length-coercion | all Get observers widened; trace keys explicitly formatted; exact old budgets and failures preserved |
| object-valueof | forbidden Get widened and legacy key joins checked; V1-V8 retained; A2/A16-A19/A24 added |
| operator-coercion | forbidden Get widened; all negative paths and budgets retained |
| primitive-conversion | three Get observers widened, Get trace uses formatter; ordinary helper tests remain ordinary, without a new lookup tick |
| property-key-conversion | Get/Set/forbidden Get/get widened; observer additionally saves raw key for identity assertions; all old scenarios retained; A13/A15/A20-A22/O5 added |
| realms | forbidden Get widened; every old own-key join checks all-string; Number key diagnostics explicitly formatted; original G/W and shared context tests retained |
| addition/numeric-operators/relational | existing wide overrides retained; O1-O4 added in existing drivers; runtime-read common fixture, no new native target |
| array-storage/array-literals | existing wide array override retained; old own-key joins now explicitly all-string; original truncation/bootstrap/negative tests unchanged |
| object-keys | list/add accept PropertyKey; list compares lengths and each raw identity; A1-A5/A7/A10-A12 added |
| object-descriptors | old String key/snapshot joins check all-string; A6 added; existing descriptor negatives retained |
| object-prototypes | A8/A9 added; original prototype/Receiver tests unchanged |
| definition-dispatch | existing define/bootstrap overrides already wide; seenKey widened to retain raw identity; false/throw/dispatch/virtual bootstrap tests retained |
| conversion | accepted side-effect array-object import untouched; A14/diagnostic assertions added |
| operation-context | Unchanged: exact context identity, reentry and shared limits remain required |
| key-assertions.ts | Shared test-only checked narrowing for legacy string-only joins; rejects symbols, never formats them |
| fixtures | Existing fixtures unchanged; symbol-values.js and symbol-operators.js read at runtime by existing drivers; existing property-key and array-length fixtures reused with bridge Values |

String-only put/read/descriptor helpers remain narrow where their call sites are
exclusively string keys; Environment seed/binding names stay string. No mixed-key
assertion joins formatted descriptions. No prior result, denominator, budget,
error phase/location or negative fixture was relaxed. Development corrected an
observer setup read contaminating its own trace and an expected array assignment
line (37, not 38); no production ordering change was needed.

## Compiler and validation evidence

The initial sandboxed build reached Zig but could not locate its installation
libraries. native-initial.log and native-initial-results.json retain that failure;
all separate coverage reports were static. The authorized rerun grants installed
Zig 0.17.0 access and retains the same static-only and parsed coverage gates.
No new compiler lowering failure or dynamic adapter was encountered, so no
reduction/workaround was necessary. Existing side-effect imports, callback return
annotations, compiler pins and manifests remain unchanged.

| Command | Result | Evidence |
| --- | --- | --- |
| npm run typecheck | PASS | typecheck.log |
| npm run test:runner | 20/20 | runner.log |
| npm run test:probes | 10/10 both hosts, static builds and coverage | probes.log, probe-results.json |
| npm run test:guest:node | 164/164, no skips | node.log, guest-node-results.json |
| npm run test:guest:native | 23/23 static builds and separate parsed coverage, then 164/164 | native.log, native-build-results.json, guest-native-results.json |
| git diff --check | PASS | whitespace.log |

CLI is 1244/1244 static statements; realms 1575/1575; object-keys 1046/1046;
property-key-conversion 1555/1555; object-valueof 1455/1455. All 23 full counts
are retained in native-build-results.json. This integrated build and both-host
execution exercise union Map keys, readonly payloads, class reachability across
modules and subclass dispatch through GuestObject. No split map, unsafe cast or
extra import workaround was needed. There are no final timeouts, crashes,
unsupported omissions or harness failures. Windows x64 evidence only, with no
performance or other-platform claim.

Implementation and validation complete; coordinator review/acceptance pending.
No C++, Claude queue/assistance, COORDINATION, manifest or pin changes. No branch
switch, main merge or successor dispatch. Source/evidence hashes: sha256.txt.

Logs normalize trailing whitespace; original subprocess streams remain in JSON.
SHA-256 entries normalize CRLF to LF to match committed text across checkouts.
