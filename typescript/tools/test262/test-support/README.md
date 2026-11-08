# Active test helpers

`plan-support.mjs`, `ledger-support.mjs`, and `checkpoint/` carry the behavioral
controls formerly invoked from TS-035E2A/B/C evidence directories. The original
files and literal expectations remain untouched. These live copies use the
shared corpus and scratch paths from `environment.mjs`; copied-module fault hooks
still operate only inside isolated fixtures.

The checkpoint runner passes absolute paths to its subprocesses so a temporary
change of working directory cannot select a different corpus. `RIFT_TEST262_ROOT`
selects the corpus; `RIFT_TEST_OUTPUT_ROOT` selects scratch output. The defaults
are ignored directories under `typescript/build/`.

`dispatch-driver.mjs` runs assignment-target and lexical-statement wire checks
against the current drivers. It retains their historical literal inputs while
writing runtime sources, reports and failure diagnostics to shared scratch.

`driver-runner.mjs` provides runtime input files, bounded child execution and
failure transcripts for parser and inspection regressions. Each suite retains
its own expected data and assertions; successful runs produce a concise process
summary under a fresh scratch directory.
