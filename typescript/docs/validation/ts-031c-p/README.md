# TS-031C-P audit reproduction

Design only, assigned at c4c2488; actual runs at a814e18 (coordinator tracking
commit only). No runtime/parser/classifier/policy/corpus/companion edits. See
[design](../../syntax-certification.md), [current matrix](current-matrix.md),
[future assertions](acceptance.md) and [source inspection](source-audit.md).

From repository root with the accepted builds already present:

```powershell
node typescript/docs/validation/ts-031c-p/run.mjs C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075
node typescript/docs/validation/ts-031c-p/metadata.mjs
node typescript/docs/validation/ts-031c-p/audit.mjs
git diff --check
```

The first command requires an external local corpus at the pinned manifest
revision; it does not download anything. It checks all five original Git blobs,
preserves all source bytes and the existing strict prefix, and uses existing
Rift observation-driver binaries. Results retain binary hashes, source hashes,
literal records, exit statuses and output. Temporary source/result files live
only under this owned directory and are removed on completion. No upstream
source or licensed engine implementation is checked in. Synthetic source is
retained in cases.mjs; pinned input paths/blobs are in results.json.

Reference `new vm.Script` **compiles only** in the audit host. There is no run,
eval or Function invocation; it is never used as a Rift parser or guest
execution path. This preserves a Script parse goal (Node CommonJS wrapping or
module syntax checks would change return/strictness behavior). A reference
acceptance means compilation accepted, not successful runtime or conformance.

Measured: 50 synthetic inputs plus eight S18–S22 variants; 116 Rift parser-only
observations; 58 reference compilations. Literal expected capability codes and
reference outcomes in cases.mjs and the pinned mapping all matched. Both lanes'
full child records, output and exits match. C08 adds six actual parent/child
observations with three expected-negative settings; tags unchanged, no body,
no harness validation, no classification. All syntax certification codes remain
non-emitting. The reports are observations, not test262 passes or new guest tests.

The accepted baseline 212 guest cases/35 static gates/72 host controls/16
observation controls is inherited. No production file changed, so typecheck,
runner, probes and full native rebuild were not repeated for this design.
Existing binaries were used and hashed; source preservation is checked against
accepted transport 5b42393. Windows x64 only; no fresh compilation claim.

The design recommends no immediate emission. Its bounded next prerequisite is
non-emitting Script-return coverage, with EOF/tail veto and unchanged public
behavior. Other rules require separate target/scope/strictness work. Future
matrix rows are specifications, never presented as observed results.
