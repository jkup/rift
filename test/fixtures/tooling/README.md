# Tooling regression inputs

These are inputs used by the current tooling tests: parser cases, expected
results, protocol mutation controls and checkpoint fixtures. They were extracted
from the former validation archive. The old IDs keep pinned records identifiable;
the surrounding reports and duplicated snapshots are gone.

Large JSON files use gzip. `tools/test262/test-support/fixture-files.mjs` reads
those files without changing their decoded bytes, including hashes checked by
the tests. Do not regenerate expected values from the implementation under test.
The small executable fixtures retain their assertions and use current tool paths.

`ts-035c/integration-latest.json.gz` contains 144 captured codec records with their
bindings, contexts, raw child bytes and transport outcomes. It needs no old build
directory. These are regression inputs, not a claim about current conformance.

Original records are recoverable from `0f20d8d8:docs/validation` in Git.
