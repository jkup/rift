# TS-035E3e-P: descriptive host services and the build-provenance boundary

Design candidate against `760b25fead20bc0f10a41aba53db1a2b07d3e430`, following
accepted E3d `4bdc9bb`. This freezes a two-addition **description-only** slice.
It does not certify source-to-build provenance, current loaded code, target
preflight success, execution selection, admission, transport or receipts.
Implementation requires coordinator actual and independent second review.

## Decision and alternatives

| Candidate | What it would establish | Decision |
|---|---|---|
| Pure ordered host-service description, with historical source member identities | An inspectable, immutable statement of reviewed main/control construction | Freeze below; independently implementable without engine or ownership changes. |
| Fresh filesystem closure snapshot | Which bytes were observed at particular reads | Deferred. It would need its own path/alias/concurrency contract and cannot establish how an executable was built. Do not silently present the proposed pure API as this checker. |
| Source-to-build certification | Controlled inputs, effective compiler/linker configuration, fresh output and trusted provenance owner | Deferred. Accepted evidence does not close linker/sysroot/environment/platform dependencies. |
| Parent preflight success and execution receipts | Authentic target-bound controls, fresh main reload and actual transport, append/spend ownership | Deferred until full build and target binding exist; cannot be represented by a digest or caller report. |

The first slice is deliberately smaller than an execution identity schema. Its
descriptor is data. `currentSourceVerified:false`, `buildCertification:"unavailable"`
and `authority:"none"` are literal statements, not placeholders that a caller may
fill. There is no v3 execution schema. E3c retains `executionBinding:null` and
`admission:"blocked"`. E2's exact 242-member policy closure and lexical ownership
remain untouched. Hashing this description cannot upgrade any of those states.

## Actual construction and source ownership

`src/script-observation.ts` owns the private Attempt. A class-field initializer
allocates `new Realm(throwingOutput,"script")`; the constructor registers that
actual Realm object as `test`. Main `produceConformanceScripts(args,texts)` first
uses the private positional E3b parser, then calls `new Attempt(request,"conformance")`.
It installs no control callback. The default preflight flag is false.

`produceConformancePreflightControl(args,texts)` validates all E3d arguments and
complete original source strings, allocates `new Attempt(request.observation,
"conformance",true)`, invokes fixed `controlSetup`, runs, and returns child/report
data. B01–B16, N01, N02 and I01 are the complete closed set. B09 alone adds another
Script Realm with the throwing `control output` sink, registers it as `other`,
and defines writable/nonenumerable/configurable `Other` on `test` using the
**actual other Realm's intrinsic ReferenceError constructor**. Both Realms have
their own bootstrap objects, guarded builtin wrappers and console sink.

Every closed control's source is prepared in `test`: `realmFor` selects `other`
only for the separate observation `guest-other*` controls, which the E3d parser
rejects. B09 thus has test operation/source Realm and potentially other constructor
inspection Realm. I01 records completion data in verification; it does not
install `observe` or another guest-callable host callback. Equal bootstrap for
B01 and B02 does not erase their distinct control-purpose identity. Main and
preflight differ in dispatch even for the same Realm shape.

The actual registered host callbacks outside the closed set remain observation
only: S01/loop install guarded `observe`/`entered`; U01 installs `unsupported`;
X03, null/noncallable/nonstring/empty, registered-other/foreign/unregistered,
constructor-*, name-* and guest-* install target/constructor/getter arrangements.
S02 defines reserved. registered-other, unregistered and guest-other* allocate
other Script Realms with different registration rules; foreign allocates a
legacy Realm. Those distinctions must never be collapsed into the conformance
description, or imported through a user profile/control string. Existing
observation setup, fault/receiver checks, output and report semantics are unchanged.

`Realm` bootstrap creates prototypes, restricted function properties and conversion
builtins before publishing globals. Global publication order is exactly undefined,
NaN, Infinity, console, Number, Error, TypeError, ReferenceError, RangeError,
SyntaxError, String, Object. The first three are nonwritable/nonenumerable/
nonconfigurable; the remainder writable/nonenumerable/configurable. Number is the
existing namespace, not a newly promised constructor. This list describes initial
globals, not every method or guest mutation after harness execution. Full bootstrap
and semantic builtin implementations remain bound as source snapshot members.

The external output service is console.log, name log/length0 with ordinary builtin
property flags. Its implementation calls `display` on arguments, joins with spaces,
then invokes the supplied throwing sink. These are host faults, not guest throw
completions. `Realm.guardBuiltin` checks profile before consuming the one-use Script
permit. The full receiver/argument/location/defining-Realm tuple remains owned by
script-execution-internal; the descriptor neither constructs nor exports permits.

`Attempt.records` maps actual ExecutableScript identity to occurrence ID, while
`Attempt.realms` maps actual Realm identity to label. `site` requires both maps
and equality with snapshot.unitId. A matching string ID, cloned snapshot record,
or another attempt's Realm is insufficient. `prepareBoundedScript` receives the
actual selected Realm; evaluation uses that record's ownership. Original and
secondary throws/constructor inspection retain the source Realm and existing
priority, not a guessed Realm from constructor name/message.

Each run creates a fresh session shared across occurrences. The existing finally
cleanup, monotonic steps, original abrupt history and verification precede
projection. E3d stops after the designated harness even when report.passed is
false; it never prepares the dummy test. Main retains normal fall-through.
A future parent must discard control ASTs, Realms, globals, callbacks, sessions,
completions and reports as authority, recheck inputs/build, and reload every
original occurrence into a fresh main Attempt. This slice implements no parent.

## Exact first implementation proposal

`validation/ts-035e3e-p/proposal-manifest.json` is the complete two-file mapping:

* New `tools/test262/script-host-services.mjs`.
* New `tools/test262/script-host-services.test.mjs`.

There are **zero old-file replacements**, including zero old-test migrations.
`preservation.json` pins all 9,198 prior tracked files except TASKS and root-owned
COORDINATION. Full current engine/driver source is retained in the ordinary
`offline-copy/src` and `offline-copy/test` evidence tree. It is not installed.
No src, native driver, build entry, package script, compiler, profile, registry,
manifest, blockers, CLI, parent launcher, decoder or ledger change is proposed.

Exactly one runtime export:

```ts
describeScriptHostServices(
  purpose: "main" | "conformance-preflight-v1",
  control: null | "B01" | "B02" | "B03" | "B04" | "B05" | "B06" |
    "B07" | "B08" | "B09" | "B10" | "B11" | "B12" | "B13" | "B14" |
    "B15" | "B16" | "N01" | "N02" | "I01"
): Readonly<{ data: HostServiceDescription; sha256: string }>;
```

It is synchronous, Function.length2, exactly two arguments. Main requires null;
preflight requires a listed primitive string. Errors are native Error, in order:
`script-host-services/arguments`, `script-host-services/purpose`,
`script-host-services/control`. No input objects, callbacks, paths, tokens,
readers, hashes, options, injected Realm or default argument exist. No IO occurs.
Purpose validation does not coerce objects; control membership does not coerce.

The exact record type and key order are the complete proposal and all twenty
independent `descriptor-literals.json` records. Data has descriptorVersion1,
kind, purpose, control, mode, preflightControl, ordered construction, ordered
realms, extensions, sourceBinding, session, lifetime, sourceSnapshot,
currentSourceVerified, buildCertification, authority. Realm entries contain id,
profile, outputFault, globals and hostServices; global tuples are
`[name,writable,enumerable,configurable]`. The B09 extension contains targetRealm,
name, value, definingRealm and all three property flags. sourceSnapshot is the
ordered 52-member historical source list with logical path, byte length and SHA256.
All arrays/objects are fresh per call and recursively frozen. SHA256 hashes UTF8
`JSON.stringify(data)` with no trailing newline. It is a descriptive checksum.

The only installed caller is the new offline test. Existing producers do not
consume descriptors, and descriptors never configure producers. This avoids a
second construction path or a descriptor-controlled Realm factory. Future
execution selection must independently bind this new module's own bytes (not
self-hash it), recheck engine bytes and full construction, and bind actual build
provenance. This API intentionally returns the historical description after a
source change; the test's independent baseline fails that source drift. It makes
no current-source check promise. A later current-source API needs separate review.

## Request identity versus construction identity

The descriptor is not a request or execution context. It therefore does not take
lane, variant, action, limits, source text, alpha/beta, nonce, runId, attempt or
preflight result ID. The stable **future execution** binding must contain both
the descriptor and all request distinctions; omission of those fields is not an
approved execution identity. Limits are never supplied by this API as defaults.

`request-literal-reference.json` pins the complete accepted E3d 160-record bundle;
`identity-witness.json` retains those full records alongside the identity lists.
They retain original/transformed texts, every occurrence (including repeated sta),
mode conformance, strict variant, execute action, harness/test roles, actual
request/binding/child/report fields and all seven explicit limits. Alpha/beta and
zero steps/calls remain distinct. The designated control is penultimate; the
last dummy is exactly `"use strict";\n`. Original assert/sta retain comments,
license, line endings and order; no concatenation, deduplication or prefixing.

Main E3b still permits strict/non-strict/raw and parse-only/execute under its
existing private positional boundary. Its arbitrary source bytes and ordered
roles are supplied by E3c snapshots and the future target owner, not by a finite
host descriptor. Raw and non-strict equal bytes remain distinct target identities;
Module and null-input slots stay outside the Script producer and in the full
denominator. No generic include certification is implied by the two pinned
harness files. The existing E3b full producer tests remain unchanged.

Stable descriptions omit runId, nonce, attempt/retry identity and preflight result
ID. Future execution stable data must additionally bind exact mode/variant/action,
seven limits, full original/transformed bytes, ordered occurrence IDs/roles/paths,
metadata and all source/build/adapter/toolchain/host-service facts. Attempt data
adds nonce/run/attempt/preflight result identities without deleting stable data.
Neither a self-consistent request hash nor E3d report.passed authenticates this.

## Full closure audit and what accepted builds actually prove

`closure-inventory.json` lists 52 source members (all src TS plus control driver),
49 host tool/test modules, three project configuration files, nine harness/control
fixtures, and 3,468 installed package files. `imports.json` records literal imports
and dynamic-import syntax for 101 source/host files; it is an audit index, not a
general JavaScript dependency resolver. The conservative directory inventories
avoid depending on that regex to certify reachability. Source driver imports
script-observation and serializer; their transitive runtime/parser/Realm/builtin/
execution/inspection/types closure is included in full, including type imports.

The host closure includes input, E1 capabilities, E2 selection/ledger/checkpoints,
E3c inputs, both decoders, E3a classification constructor, C observation adapter,
v1 CLI/planner/ledger and build/probe tools. Existing consumers comprise A
decoders/serializers, B inspection, C transport/codecs/launch/preflight, D1–D8
dispatch, H7 controls and E1/E2/E3 tests. All remain byte-identical. The new
descriptor does not enter E2's policy list; C's four adapter modules and E2's
eight project policy files are each incomplete execution closures. Combining
their digest strings would still omit new owner/descriptor/provenance dependencies.

Installed package inventory includes scriptc and platform package/runtime,
TypeScript and platform package, YAML, @types/node and undici-types. The actual
TypeScript path is bin/tsc -> lib/tsc.js -> package #getExePath ->
@typescript-win32-x64/lib/tsc.exe. Its wrapper calls execFileSync on
Windows. A top-level TypeScript package version or wrapper hash alone misses the
compiler. build-native invokes node_modules/scriptc/bin/scriptc.exe with
`build ENTRY --tier static-only -o OUTPUT`, then separate `coverage ENTRY`;
probeVerdict enforces parsed zero-dynamic coverage. CLI's target/linker search and
ambient PATH are not controlled by this script. No target, sysroot or linker
defaults are invented here. OS runtime/DLL dependencies remain unclosed.

Accepted E3d evidence supplies:

| Available retained evidence | Exact meaning and limit |
|---|---|
| copied-inputs.json: 17,345 hashes and preparation/copy source | Source, tests, historical replay inputs and copied package contents at collection. Not all are runtime dependencies; hash list is not build causality. |
| generated-closure.json: 137 generated JS files, actual Node and Zig executable hashes, 71 gate entries | Descriptive output/executable identities from the isolated fresh build. No assertion that current root build output is equivalent. |
| fresh-native-outputs.json: 71 entry/binary hashes | Exact retained binary identities; no syscall-level compiler/linker input trace. |
| native-build-results.json, completion.json, full archive/index | Actual commands, statuses, streams and parsed build/coverage gates; successful suites and fresh-build orchestration. The archive retains outputs; index pins bytes. |
| source mapping | Node tsconfig rootDir/outDir gives the intended TS-to-JS layout; native entry table maps 71 sources to binaries. These mappings and successful commands are evidence of the accepted run, not cryptographic proof of the transformation. |

The accepted root review's 212 records in both lanes, 71 static gates and
37 primary plus seven supplemental stages are inherited acceptance, **not rerun**.
No active root output was read or reused. This audit reads committed producer
evidence only. Current installed package hashes are separately labeled local
observations; they are not silently substituted for the accepted compiler inputs.

Missing for trustworthy new certification: a reviewed exclusive build-input owner,
complete effective compiler/runtime/linker/sysroot/SDK/library closure, platform
and ambient environment controls, resolved tool paths/options/search rules,
fresh output ownership and contemporaneous input/output binding. Zig executable
identity does not identify its libraries. Gate success proves the gate's property,
not source-to-binary provenance. Dirty source/commit labels, equal output bytes,
self-consistent member digests and matching version strings cannot fill these gaps.
The next provenance design must retain unknowns and request review, not add empty
lists, inferred defaults or a public `certified:true` field.

## Bounded validation and limitations

The complete proposed new test runs in `offline-copy` with source files only:
20 whole independent descriptor literals including canonical key/array order,
fresh recursively frozen outputs, exact export/arity, ten boundary errors and
all 52 actual source hashes. It executes no interpreter or guest. Twelve actual
proposal mutants complete all twenty calls and are then rejected by the literal
oracle: mode/profile/sink/B09 omission/control purpose/service omission/global
order/source omission/reorder/transitive hash/authority/freshness.

`construction-probe.mjs` extracts the installed private Attempt class and runs
only constructor/controlSetup/site with inert Realm/Object stubs. Twenty literal
construction traces, fresh allocations and 100 record/Realm-map controls pass;
six completed construction mutants reject. This does not execute actual Realm
bootstrap, parser, session, evaluator or guest code and is not native evidence.
The exact source manifest separately pins the actual Realm/builtin implementations;
their accepted E3d tests provide prior semantic evidence, not a new probe result.

Sixteen complete witness mutations cover stale generated/binary/package/compiler/
Node/Zig identity, wrong platform, partial package evidence, omitted/reordered/
transitive source and request omissions/occurrence reorder/limit/role/variant.
Each mutated witness is given its own correct digest and still differs from the
independent frozen witness. These are **data-oracle controls**, not an implemented
provenance verifier or live detection of a stale process. Setup errors do not
count: each descriptor mutation imports/calls successfully and each construction
mutation produces a trace before comparison.

Retained failures: initial PowerShell brace expansion was invalid; two exploratory
historical filenames did not exist; python.exe was an inaccessible WindowsApps
alias, so the unused audit.py and failure note remain and audit.mjs was used.
The initial inert probe requested Node's unsupported transform mode. Its original
source/log remain. The successful probe uses strip mode and explicitly expands
the one parameter-property constructor into assignments in the inert copy only.
This is not a production/compiler workaround or native feasibility claim.

## Acceptance boundary and deferred work

Run the new test and exact byte verifier for any separately assigned implementation;
no native rebuild is required by these two host-only additions. The reviewed
two-addition verifier permits only those exact new bytes, preserves every old test
and verifies all baseline history. Future changes to construction must deliberately
revise the description with new full literals/source snapshots and review; do not
regenerate old identities to make new code appear historical.

Deferred separately: current closure checking and provenance owner; target-specific
host/preflight equivalence; original arbitrary includes; exact request/selection
schema; discard/reload/recheck parent; complete artifacts/archive schema; transport
facts and private success ownership; receipts and synchronous append/spend; F
registry entries and conformance launch. No public mint/load/register/append-envelope
is added. E2 checkpoint reopen transfers only existing policy ownership.

Empty E1 bytes, all 60 blocked slots (19 feature/41 profile), zero execution/body,
Module/null-input denominator, codecs/classifier and original observation priorities
remain preserved by byte identity. No new policy or corpus run is claimed. Stop
after this coherent design/evidence commit for actual/root/second review; no
implementation, publication or successor is authorized by this handoff.
