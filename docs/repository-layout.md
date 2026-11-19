# Repository layout migration

On 2026-11-19, the TypeScript package moved from typescript/ to the repository root. The retired engine sources, headers, REPL, CMake configuration, build scripts and CI jobs were removed. JavaScript regression inputs moved from test/ to fixtures/legacy/.

The saved benchmark reports in bench/ and historical validation reports remain evidence of their original runs. Their captured paths, commands and binary hashes are historical provenance. Current source imports and tools resolve from the root.

The exploration and companion backlog are retained under docs/history/. Current contributor instructions are in AGENTS.md and CONTRIBUTING.md.
