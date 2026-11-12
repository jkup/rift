# Restart checkpoint — 2026-11-11

Paused at the owner's request to restart Windows. All task-owned build/watcher
processes were stopped; no compilation should be restarted until the owner resumes.

- Published main: dd07a6c7 (accepted IANA foundation). Both hosts946 guests,
  453 native static/zero-dynamic gates,296 tooling,35 runner,10 probes pass.
- Development branch: codex/test262-classification. Integrated successor commits
  0793d339 (local resolution),2f76aedf (consumers),fa60ead2 (named identifiers).
  They are not yet accepted or published to main.
- Frozen source: build/iana-temporal-rollup-source-snapshot.json (977 inputs).
  Do not edit canonical runtime/test/tooling inputs until combined validation ends.
- Node pipeline completed:949/949 guests,35 runner,typecheck; corpus node-lR4v4q
  retains191 completions across225 records.
- Native matrix stopped with25/456 checkpoint records. Interrupted in-flight work
  is not accepted. Resumption verifies source hashes and executable hashes and
  skips only matching successful records. Archived pre-restart log/checkpoint:
  build/iana-temporal-rollup-native-{build,checkpoint}-before-restart.*.
- Resume build/build-iana-temporal-rollup.ps1 and
  build/watch-iana-temporal-rollup-corpus.ps1. Do not rerun the freeze/preparation
  scripts. Once matrix and corpus comparison finish, run
  build/finish-iana-temporal-rollup.ps1; its native guests must run alone.
  Then use build/accept-iana-temporal-rollup.mjs, commit and publish after ancestry
  checks. Local main and origin/main currently dd07a6c7.
- TS-491 diagnostic is complete:33 files,60 variants;52 expected,5 unsupported
  syntax,3 profile limitations. Both hosts match;16 controls per host pass;
  focused native20294 static/zero dynamic. See docs/test262-current-script-diagnostic.md.
  Next clear runtime follow-up: bounded Script top-level-return certification;
  claim a new task and use an isolated draft while the Temporal freeze remains.
- Preserve unrelated root Claude Roadmap.md edits, the early TASKS.md proposal,
  and untracked docs/validation/ts-035e3h-unicode-ready-p/. Stage owned TASKS changes
  only through node build/stage-owned-tasks.mjs.
- Free disk space remains about127 GB. Successful LLVM is automatically pruned.

Resumed 2026-11-12 at the owner's request. The frozen inputs and25 checkpoints
were verified, and native validation/corpus watching restarted. TS-492 now has an
isolated return-certification draft; focused42-control checks pass both hosts,
with20,280 static/zero-dynamic coverage. Its full Node suite is running. This
resume entry supersedes the pause instruction above; preserve the same integration
freeze and publication gates.

2026-11-12 publication: zoned Temporal is accepted and pushed to main at52019673.
Both hosts949/949,456 native static/zero-dynamic gates,296 tooling,35 runner and
10 probes pass; corpus node-lR4v4q/native-65hS99 preserves all225 normalized
records and191 completions. The combined Temporal freeze is now accepted.

TS-492 remains isolated. Initial full Node run was949/950: its old eval test
expected top-level return to be unsupported. The original guest source is retained;
one exact expectation migration now asserts a catchable SyntaxError, with direct,
indirect, caller-function, foreign-Realm, no-effect and unsupported-tail controls.
The expanded eval driver passes both hosts with20,313 static statements and zero
dynamic operations. Full Node rerun and15 native tooling builds are active.

## 2026-11-12 resumed development checkpoint

Accepted main remains 52019673 (949 guests per host, 456 native static gates).
Local ab6e0525 integrates bounded return certification after isolated validation;
5b404675 records the 144-case declaration grammar review. The integrated return
fix passes 950/950 Node guests, typechecking and 35 runner tests. Its full native
matrix runs from build/script-return-rollup-source-snapshot.json (1061 inputs,
457 entries), with per-entry checkpoints and successful LLVM pruning. Do not
publish this source before combined native guest/tooling/probe/corpus acceptance.

Active execution sessions at this checkpoint: 45713 native build; 65760 Node
corpus follow-up; 55309 isolated async-declaration Node suite. Verify their live
state before launching replacements. Canonical source is frozen. Once the native
matrix succeeds, build/finish-script-return-rollup.ps1 verifies all 457 executable
hashes before native guests, corpus comparison, tooling and probes. That finish
script is prepared but has not been launched.

TS-494 is isolated at build/async-statement-certification-draft, not READY.
Typechecking, 55 focused Node controls, 144 reviewed syntax controls, both pinned
U02 variants, eight producer codecs, eight parent envelopes and the exact codec
closure checks pass. Full Node regression is running. Native validation waits
for the canonical matrix; do not start a competing compiler build. Ownership
includes parser/outcomes/observation types and producer, both Script decoders,
the exact codec closure assertion, manifests and focused test/documentation.

Cleanup removed 2,023,533,632 bytes of hash-identical validation copies from the
return draft, retaining 126 protected files and all original evidence. About
122 GB remains free. Last account usage check was 42% used for the weekly window.

## 2026-11-12 identifier successor checkpoint

TS-494 passes 951/951 Node guests, 35 runner checks, codec/envelope controls and
its typed reference probe; 1063 inputs remain frozen. TS-496 follows its frozen
source in build/strict-reserved-identifiers-draft and passes 952/952 Node guests,
35 runner checks, 224 initial syntax references, 56 additional strict contexts,
focused execution checks, eight Node codecs/eight envelopes and three codec
closure checks. Its 1065 inputs are frozen after predecessor/ownership checks.
Neither successor is READY; native gates are pending. Do not promote over the
active canonical source freeze.

The combined starter diagnostic now has 57 expected Node outcomes and three
explicit module/async-harness profile limitations, preserving all33 files/60
variants. Raw U03 certifies at17:5; original inputs and capability admission remain
unchanged. Evidence is build/strict-reserved-starter-diagnostic/ and each draft's
build directory. This is diagnostic evidence, not admitted conformance.

Only execution session45713 remains active (canonical native matrix). Sessions
65760,55309,75726 and18972 are terminal; do not restart them. The Node corpus
finished with225 records and191 completions; its exit1 reflects retained diagnostic
noncompletions, not a process failure. Native finish script is still prepared,
not launched. Fetch confirmed origin/main and origin/codex/test262-classification
at52019673 with ancestry intact. No unaccepted milestone has been pushed.
