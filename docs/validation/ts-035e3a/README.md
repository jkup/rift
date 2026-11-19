# TS-035E3a implementation evidence

Base: b32e833. Sole implementation writer: chat
01a1adf0-f1a1-7322-9f35-a9e33c81ec12. This is an implementation handoff,
not coordinator acceptance, publication, or permission for a successor.

The two existing files and new script-compose.test.mjs are copied byte-for-byte
from accepted E3-P6cbfa62 proposals. script-result.mjs SHA256 is
a5b6de2a0211f31e7e9c48a981bd51a77cd936a040b05757978555a848070d80;
script-observe-codec.test.mjs SHA256 is
cda6e896a0757c574f3a2e187f27013b597c0f9787e84f433da4a09d9046d017.
The original classifier/decoder prefix and independent driver decoder remain
unchanged. Mixed line endings in the accepted proposals are intentional byte
constraints; these exact files are staged with core.autocrlf=false.

composeScriptEnvelope takes exactly three arguments and constructs classified
conformance data using existing validation and classification. It rejects an
injected classification, validates full context/binding, detaches metadata, and
enforces the final serialized envelope's inclusive 65536-byte limit. It confers
no receipt, process provenance, execution permission, or admission authority.
Context/binding retain the existing trusted-host contract; no getter/Proxy
defense is promised. All E3b/F work remains excluded.

## Validation provenance

validate.mjs first checks the 6703-file baseline, allowing only the two exact
approved replacements, and all frozen E3-P artifacts (including the original
size failure and initial candidate). It creates a fresh ordinary-file sandbox
under build/ts035e3a-validation-*; run-location.json identifies this run.
copied-inputs.json records original input hashes, including retained Node/native
binaries and dependencies. There are no links to mutable original test inputs.
Inherited test source is unchanged. Tests run sequentially in this sandbox,
with C integration-latest.json and all output archives local to it. Original
history and build products are read-only and checked again after validation.
Typecheck uses --noEmit. No build, probes, broad restore, or deletion is used.

suite-results.json and named transcripts retain exact commands and outcomes:
constructor; A-decoders (both serializer lanes, alpha/beta); C-codec; full
C-transport (172 actual records); C-live-codec (reads this fresh C run);
host73; observations22; runner20; typecheck. transport-results.json retains
all C records and their local archive locations. The archived child, request,
context, stream, preflight, plan and transport bytes remain at those paths.

serializer-evidence.mjs separately saves fresh exact stdout/stderr for both
retained lanes and both inputs, with invocation provenance and byte digests.
These are actual serializer outputs, not frozen rows relabeled as new output.
The frozen 154 rows remain the expected literals. constructor-controls.mjs
exercises the actual installed constructor against every literal, all identity/
input-field drifts and top-level missing binding fields, detached negative and
blocker metadata, nonconformance rejection, and the accepted null-binding
unlaunched case with a launched negative neighbor. These are synthetic data
controls, not actual conformance launches.

preservation-results.json distinguishes retained 212 passing guest records per
lane and 71 native gates from fresh execution; those suites are not rebuilt or
rerun. The unchanged empty registry yields 60 blocked variants: 19 feature,
41 profile, with runtime coverage debt intact. corpus-debts.json records these
unchanged debts. No result changes the selected denominator or activates a slot.

## Reproduction and review

From typescript, `node docs/validation/ts-035e3a/verify.mjs` is read-only and
checks source, accepted proposal history, original copied inputs and recorded
successful suite results. `constructor-controls.mjs` and
`serializer-evidence.mjs` write only their own evidence files. validate.mjs is
the full producer harness; rerunning creates a new sandbox, but reviewers should
use their own evidence destination rather than overwrite this producer handoff.

## Final results and retained failed attempts

Fresh passing results: constructor 4/4; A decoders 21/21 with both lanes/two
inputs; migrated C codec 3/3; C transport 172 records across four passing
lane/input groups; C live-codec 2/2; host 73/73; observations 22/22; runner
20/20; typecheck exit0. Supplemental constructor checks pass 154 complete
literals, 154 detachment cases, 6160 negative context/binding controls, and
the null-binding positive/negative pair. Four fresh serializer captures each
contain the expected 77 records. No skips or denominator changes.

Main exec session 20855 completed constructor/A/C successfully, then retained
host73.txt: 70 pass, 3 Windows sandbox EPERM failures (symlink and two temporary
renames). finish.mjs ran with approved filesystem access in session 21545;
host73-permissions.txt passed all 73. Its observations22.txt retained 21 pass,
1 ENOENT because the producer sandbox omitted observation-serialization.exe.
That retained binary was copied without rebuilding, with its original hash in
additional-inputs.json. finish-final.mjs, session 31048, passed observations22,
runner20 and typecheck. Earlier scripts, results, logs and partial archives are
preserved; no inherited test or production workaround was made. The failed
attempts are explicitly expected by verify.mjs, alongside all final successes.
The omissions/failures concern validation setup, not schema, compiler or
consumer semantics. All 6703 baseline files still match except the two exact
approved replacements; original copied source/build/dependencies also match.

Initial discovery errors were a guessed root COORDINATION.md path, a guessed
script-observe.integration.mjs filename, unsupported PowerShell brace syntax,
and a nonexistent root .gitattributes read. They made no changes. No semantic
failure was suppressed or addressed through a production workaround.

COORDINATION.md is coordinator-owned and excluded from the implementation
commit. Actual coordinator audit, independent tests and second review remain
required after this handoff.
