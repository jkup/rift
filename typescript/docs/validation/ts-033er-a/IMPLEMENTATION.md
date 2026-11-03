# ER-A ordinary accessors and shared operation context

Implementation follows the accepted [ER contract](../../script-accessor-integration.md)
and the unchanged [frozen matrix](frozen-matrix.md). The prior compiler-stop
[README](README.md), candidate patch, attempted sources and failed results remain
historical evidence. Coordinator resumption `ae9383a` approved completing the
exact override parameter/storage types within the existing ownership.

## Implementation

The eleven production files in the contract are the complete production delta.
`runtime.ts` stores tagged complete data/accessor descriptors. Structural update
validation rejects mixed records and noncallable endpoints before exotic work.
The pure compatibility helper returns a fresh complete descriptor; ordinary
definition commits it once. Frozen data SameValue requests preserve the original
stored Value wrapper, including the symbol-payload identity regression caught by
the first 211/212 run. Generic updates preserve kind; configurable transitions
discard the old kind's fields. Snapshots copy records without invoking endpoints.

Get/Set retain the original receiver throughout the iterative prototype walk.
Accessor invocation uses exactly the supplied context's `call`, with zero wrapper
ticks. Missing endpoints produce undefined/false; setter normal return values are
ignored and thrown completions retain identity. The data Set branch continues to
dispatch definition on the receiver and refuses receiver accessors. Existing
strict adapters retain false-to-TypeError translation.

Array entries validate before conversion and copy all six update fields before
reentrant length conversion. Length remains nonconfigurable numeric data; index
accessors can extend it and participate in descending shrink/deletion/rollback.
String virtual indices use the same pure compatibility helper without storing a
slot. Global binding reads, E2 reads, Realm host reads and all eleven semantic Get
call sites receive the existing context explicitly. Realm profile transfer checks
cover every present value/get/set endpoint.

Evaluator, Script records/setup, parser, function builtins and execution guards
are unchanged. No restricted bootstrap, reflection, accessor syntax, Proxy,
Script execution or conformance admission is added. ER-B and E4 remain separate.

## Host migration

Only the approved 45-file allowlist was eligible for existing test changes.
Semantic `.get` calls remain semantic calls with explicit context/location;
instrumented Get overrides forward the same arguments. Object-toString's observer
callback receives the actual caller context, including its fallback call. Existing
descriptor inspections add data-kind checks; small `dataDescriptor` helpers only
narrow existing descriptor reads, never replace semantic Get. Definition overrides
and their stored request fields use the exact base update type and validate before
instrumentation. Expected records, traces, assertions and fixture sources remain.

Most reads use the caller's existing evaluator/context. Inspection scopes with
no existing context declare a named no-call context beside their existing Realm;
it throws on any unexpected invocation/tick and creates no evaluator/session.
E3 setup and D2 inspection helpers accept explicit contexts. The existing E3A
hostile-cast split remains unchanged and separately replayed.

## Focused controls

`test/property-accessors.ts` reads two input files at runtime (`seed|7` and
`other|11`). The name seeds symbol identity and the number appears in a genuinely
prepared Script function's retained source. Generic accessor execution uses legacy
builtins/evaluators; Script endpoints are inspected and transferred without calling
them. No dispatch projection is reported as Script execution.

| Frozen rows | Executable assertions |
|---|---|
| R01–R08 | Missing/generic defaults, host-undefined absence, invalid mixed/endpoints in semantic/bootstrap/exotic entries, detached updates/maps/descriptors, kind transitions, resets, frozen accessor SameValue and rejection atomicity, NaN/signed-zero/freeze, nonextensible updates. String and identity-symbol keys. Opposite-kind fields absent. |
| R09–R14 | Integer/string/symbol key order, delete/reinsert, absent endpoint no-call behavior, zero-argument Get, object and primitive receivers through own/inherited lookup, exact setter argument and ignored return, data receiver rejection/creation and preserved flags. |
| R15–R16/R33 | Original abrupt record/payload/origin/location, retained note mutation, no receiver fallback, current versus subsequent lookup after self-redefinition/deletion, contextful host Get normal result and exact host-inspection error. |
| R17–R21 | Accessor array indices/length growth, frozen length refusal, two conversions of copied original request despite mutation, late old-length read, partial shrink/freeze rollback, virtual String compatibility/nonindex accessors, original primitive receivers and strict index-write failure. |
| R22–R23/R34 | Live global references, unresolved capture, TDZ shadow with no Get, identifier receiver undefined, function declaration admission by kind/flags, conversion to data without old setter, local read identity, cross-profile rejection for value/get/set and same-profile stored endpoints. Genuine Script/legacy/builtin callable validation without invocation. |
| R24–R26 | Protocol and ordinary conversion getter/method order, abrupt stop, map length/Has/Get/callback/hole trace and constructor failure, join element read, noncallable join's captured Object fallback, tag getter normal/throw. |
| R27–R28 | Both getter/setter paths: initial steps5/calls2/depth3, defining Realm B during call and restored A afterward, normal/guest-throw/host-Error identity, exactly one callback tick (steps6), step exhaustion6/5 and monotonic7, calls64/64 refusal, recursion2/2 and complete unwind with zero wrapper ticks. |

Inherited tests remain additional preservation evidence, including exact E3B
18/6/12 prefixes and the original D2 eleven-tick marker.

## Compiler evidence

The approved SC1090 exact-signature correction changes host override types only.
The resumed driver's first diagnostics are retained in `resumed-focused-build.txt`
and `resumed-focused-coverage.txt`, with source `resumed-focused-attempt.ts`.
Test authoring corrections use existing supported patterns: literal key-array
length/index assertions instead of joining a string-or-symbol union; an observer
instance's trace field instead of capturing a block local in a class method;
discriminant/null narrowing before completion identity comparison. The known
inferred-never callback adapter is removed with an explicit ValueCompletion return
annotation, as documented in compiler-contract TS-026A. No production workaround,
new host-negative split or toolchain change was needed.

## Validation

Final validation passes: 212/212 old records per lane, 47/47 static-only and
separate zero-dynamic gates (CLI2665, accessor3193), typecheck, runner20, probes10,
host73 and observations22. All inherited replays pass: E3B18/6/12 plus original11
marker, E3A/E2/E1 two inputs, D1 135/207, metadata136/42/stress8, global15,
bootstrap18 and D2. Preservation confirms 2737 protected files and 60 blocked
variants. No skips or new Script execution claims.

`suite-test-guest-node.json` retains the full suite commands, results and output.
`final-driver-results.json` retains the final focused rebuild after strengthening
the invalid-record zero-call/zero-tick assertion, and replaces only the additive
gate entry in the aggregate build results. Both inputs/lane pass again; production
and inherited drivers did not change after their full rebuild.

The initial inherited stress replay failed while reopening its results JSON on
Windows, after Node8 had passed. `initial-replays-results.json`,
`initial-replays-log.txt`, `attempted-replay-stress.mjs` and `stress-results.json`
retain that attempt. The task-local replay now writes once in finally to
`stress-final-results.json`; all original assertions pass for Node8/native8.
Earlier passing replays were retained, and stress/global/bootstrap/D2 completed
without changing production or historical evidence.

The first resumed full build also caught one missed host `get` override; its
old signature and diagnostic remain in `resumed-initial-native-build-results.json`
and `resumed-initial-suites.json`. The approved exact-signature correction was
applied before the final complete rebuild. `validate.mjs` asserts literal focused stdout for both inputs and both lanes;
`replays.mjs` executes inherited controls with outputs confined to this directory.
`preserve.mjs` compares all 212 records per lane exactly to accepted E3B, verifies
46 retained gates plus the additive accessor gate, independently parses raw static
coverage and rejects any dynamic tier, checks ownership and the unchanged original
ER-A failure evidence, and verifies all 60 corpus variants remain blocked.

`final-source-hashes.json` binds all changed production/host sources; preservation
checks them. `host-migration-literals.json` confirms each of the45 original host
files retains its string-token sequence and check count (a supplementary lexical
check, not a substitute for executable expected records or source review).

Implementation is ready for independent review. No successor or publication was
performed by this writer.
