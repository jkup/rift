# TS-033B: host-only global environment foundation

Base f9073a7 on codex/test262-classification, Windows x64; pinned scriptc 0.4.7.
[Preimplementation interface freeze](interfaces.md) records the exact supported
subset and named H01–H15 controls. Only src/global-environment.ts is new production
code. Existing runtime Environment/Reference, Realm, parser, evaluator and entries
are untouched. No upstream implementation code was copied.

The module uses a private lexical Map and the existing GuestObject APIs for the
object half. Global this may be a distinct host-supplied guest object; binding
calls have undefined receiver. Reference capture saves the composite environment
or null and a detached call-site location. Subsequent Get/Put dispatch through
that environment, so a later lexical binding can shadow a captured object binding;
an unresolved base never becomes resolved. Strict reads/writes recheck object
presence and preserve TDZ. A resolved name deleted before Put throws rather than
creating a new property.

Declaration checks are individual queries. A missing nonextensible var creation
is deliberately a normal no-op; a future caller must check CanDeclareGlobalVar.
Creation does not enforce lexical conflicts or multi-name atomicity. Function
creation defines then performs Set(false); allowed nonconfigurable replacement
retains descriptor flags. No VarNames list is added. Public binding access is
strict-only, lexical creation is mutable/nondeletable only, and declaration
creation uses D=false. Normal unused results use normal(UNDEFINED).

Fixed 2025 Global Environment text and pinned engine262 source were read from
the accepted TS-033P archive before production edits. `research.mjs` additionally
retrieves the fixed edition and verifies the same SHA256 before retaining five
declarative/object/reference clauses in supplemental-spec.json. This later
cross-check agrees with the frozen design. Engine source is evidence only, not
an execution oracle. The host tests assert literal results/flags/traces; they do
not compare only Node with native or execute guest source through another engine.

## Validation commands

From typescript/, with the installed Zig directory on PATH and library access:

```
npm run typecheck
npm run test:guest:node
npm run test:guest:native
npm run test:runner
npm run test:probes
npm run test:test262
npm run test:observations
node docs/validation/ts-033b/validate.mjs node native
```

Set RIFT_METADATA_EVIDENCE to the absolute ts-033b evidence directory, then:

```
node docs/validation/ts-033a/validate.mjs node native
node docs/validation/ts-033b/stress.mjs node native
node docs/validation/ts-033b/preserve.mjs
```

The stress runner is the accepted TS-033A runner copied with only its relative
root adjusted so that fresh evidence does not overwrite historical evidence.
The metadata runner writes to its existing output-directory override.
Preservation compares every old guest result, all 38 old gate entry names and
the exact additive build-script edit against the base. Host input files are read
after compilation: literal H01–H15 and a separately generated renamed variant.
H08 checks all eight W/E/C combinations; H13 checks original abrupt object and
location identity and dispatch order, plus partial mutations after abrupt Set.
Fault-injection subclasses test existing host dispatch seams, not guest exotics.
H12 checks separate state and unchanged legacy Realm/context identities; no
Script Realm switching or cleanup algorithm is exercised or claimed.

## Retained failures and limits

The initial test helper passed GuestObject.set's broader Completion to a
ValueCompletion assertion, producing TS2345 at test/global-environment.ts:239.
It was changed to assert internalSet's normal boolean result; production semantics
were unaffected. This initial diagnostic is recorded here because the first
tool output was not redirected to disk.

native-sandbox-failure.log retains an interrupted initial build: Zig could not
locate its installed libraries in the sandbox. host-temp-failure.log retains
70/73 host tests, with three temporary-file rename EPERM errors;
host-symlink-failure.log retains 72/73 with workspace-local TEMP/TMP and the
symlink control denied by the sandbox. The unchanged suite passes with approved
toolchain/symlink access. These are environment failures, not skipped assertions.
The web reader rejected the large specification document; an initial shell fetch
failed DNS in the sandbox, then the approved fetch verified the pinned hash.

No new compiler workaround, pins, C++ changes, bootstrap, evaluator integration,
full global declaration instantiation, source G/L result, conformance admission,
other platform or performance claim. Historical evidence and CL006 are unchanged.
Independent review is required before integration or a successor assignment.

## Final measured results

Node and native each pass all 15 named host rows with both literal and renamed
runtime inputs (30 row executions per lane). Native global-environment driver:
1331/1331 static statements, zero dynamic; all 38 prior gates plus this additive
gate pass. Full guest suites preserve the exact 212 old records per lane.
Metadata/parse/audit: 136 exact records and 42 literal controls per lane; eight
deep-chain controls per lane pass, including the original 30002-unit reproduction
and 100000-unit boundary. Typecheck, runner20/20, probes10/10, host73/73 and real
Node/native observation controls16/16 pass, with no skips. Exact raw records,
coverage/build results, source hashes and preservation summary accompany this file.
The implementation requires no new workaround for the pinned compiler.
