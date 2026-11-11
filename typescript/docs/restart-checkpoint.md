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
