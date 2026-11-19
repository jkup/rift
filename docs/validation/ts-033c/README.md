# TS-033C: Script Realm bootstrap and closed execution guards

Implementation base abca67a on codex/test262-classification, Windows x64,
pinned scriptc 0.4.7. Implements the accepted e460858
[bootstrap contract](../../script-realm-bootstrap.md). No reference engine code
was copied. Fixed ECMA-262 2025 clauses and pinned engine262 d553e7b were read
from the accepted TS-033C-P supplemental-spec.json and TS-033P upstream.json:
api.mts208–245, Environment.mts644–665, engine.mts172–203 and
function-operations.mts170–205. Their separation of Realm storage, initialization
and execution informs this slice; execution/context work remains deferred.

## Interfaces and scope

RealmProfile is legacy | script; the default is legacy. Private nullable storage
allocates only the selected environment branch. The legacy global getter/setter
preserves existing host replacement. Script getters expose one ordinary object,
its composite GlobalEnvironment, and a Value wrapping that same object as this.
All mutable intrinsics and namespace/method objects remain per-Realm allocations.
The five global names, order and descriptors are literal contract values.
installGlobal accepts only those bootstrap names; defineScriptGlobal seeds a
complete data descriptor, rejecting directly supplied foreign-profile callables;
readScriptGlobal delegates to the composite record, including TDZ precedence.

Guards are host errors. Run rejects before parsing; body observation rejects
after limit validation and before parsing; parser observation stays profile
neutral. Evaluator construction/block/closure and the guest-function factory
require legacy. Evaluator.call first preserves its noncallable TypeError, then
checks profile mismatch, then Script unavailability, then the existing budget.
The full four-argument shared builtin wrapper covers createBuiltin and the
inline callable functionPrototype, without ticks or context changes. Existing
Function.call forwarding and legacy try/finally remain unchanged.

No runtime/schema/classifier/Reference/GlobalEnvironment/grammar changes,
Script execution, new globals, cross-profile dispatch, toolchain pin changes,
C++ changes, historical evidence edits or CL006 work. No interface conflict
required broadening the assignment.

## Runtime controls

The additive driver test/script-realm-bootstrap.ts reads B01–B18 rows from a
file after compilation. validate.mjs runs the literal seed/7 fixture and a
separately written other/11 fixture against each executable. It compares exact
18-row stdout, exit status, signal and stderr, in addition to in-driver literal
assertions. No guest source is executed by the host engine.

B01–B05 check legacy compatibility, descriptors, seven prototype inventories,
factory identities, isolation and wrong-profile access. B06–B08 check ordinary
seeding, nonextensibility, unresolved reference capture, TDZ and later lexical
shadowing. B09–B11 check closed entries, malformed/empty source, parser neutrality,
limit precedence and guest-factory precedence over invalid source ranges.
B12–B15 check maxCalls0 priority, noncallable priority, saved/deleted methods,
Function.call forwarding, direct inline/builtin invocation and direct transfer.
B16–B17 check receiver preservation, defining-Realm allocation, original guest
abrupt and host sentinel identity, literal tick counts, resource exits, nested
storage, coercion, array callback and returned callable paths, with restored
Realm/calls/depth. B18 repeats lexical, descriptor-admission (all eight flag
combinations), declaration, inherited-property and deleted-reference controls
on the actual Script global with call/tick stubs that throw.

The unchanged TS-033B H01–H15 driver is additionally rerun with both runtime
inputs. Its fault-injection H13/H14 preserve exact abrupt identity/location and
operation order on trusted host test objects. These do not inject exotic globals
into a Script Realm: that remains forbidden by the frozen construction API.

## Reproduction

From typescript/, using the installed Zig directory on PATH:

```
npm run typecheck
npm run test:guest:node
npm run test:guest:native
npm run test:runner
npm run test:probes
npm run test:test262
npm run test:observations
node docs/validation/ts-033c/validate.mjs node native
node docs/validation/ts-033c/global.mjs node native
node docs/validation/ts-033c/stress.mjs node native
node docs/validation/ts-033c/preserve.mjs
```

Run `node docs/validation/ts-033c/metadata.mjs node native`. This task-local copy
of TS-033A validation retains every assertion and writes evidence once per lane
in a finally block, avoiding repeated Windows opens of the same file. The copied global and
stress orchestration scripts write only new TS-033C evidence. Preservation checks
all 212 old records per lane, all 39 prior gate names and the exact additive
build-list edit, protected tracked paths and all 60 blocked test262 variants.

## Retained development/environment failures

The first B13 assertion incorrectly expected one Function.call tick. Inspection
of the unchanged forwarding implementation showed it charges none; the literal
assertion is now zero. The first Node run passed B01–B12 then failed that assertion;
the diagnostic appeared in the tool transcript before evidence redirection.
No production change was made for this assertion correction.

native-attempt.log retains the interrupted sandbox attempt: Zig could not locate
its installed library directory. host-attempt.log retains sandbox temporary-file
rename failures. The required suites were then run with approved library and
host temporary-file access. An attempted local Python edit failed before writing
because the Windows application alias was inaccessible; edits used Node instead.
An optional formatting attempt could not load the pinned TypeScript package as a
legacy compiler API; it failed before writing and changed no dependencies.

## Validation status

Node and native each pass B01–B18 with both post-compilation input files (36 row
executions per lane). The new driver is 2287/2287 static, zero dynamic; all 40
static-only builds and separately parsed coverage gates pass. Both full guest
suites pass 212/212 with no skips and byte-equivalent parsed result records to
the accepted baseline. Runner20/20, probes10/10, host73/73, observations16/16
and typecheck pass. Metadata136/42, deep-chain stress8 and composite global15
with both inputs pass in each lane. Final complete metadata evidence is under
metadata-complete/; earlier partial outputs are retained as failure evidence.
Preservation records 2386 protected tracked files and 60/60 blocked variants.

The observation sandbox attempt failed its symlink control; the approved run
passes16/16. Both metadata-open-failure.log and metadata-second-open-failure.log
retain repeated-open failures, including one with approved access. The task-local
metadata.mjs changes only import/output paths and evidence-write timing; it uses
the same inputs, literal expectations and every original assertion. The initial
preservation audit used cwd-relative untracked paths against repository-relative
allowlisted paths; preservation-path-failure.log retains the false rejection.
Running Git from the repository root fixes the audit without broadening its list.

No compiler lowering workaround or dynamic-tier relaxation was required.
This is bounded Windows x64 validation, not Script execution or conformance.
The milestone stops for independent review before any successor task or merge.
