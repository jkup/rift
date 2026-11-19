# TS-035E3g: synthetic-only implementation checkpoint

Base: `84d6a0541802ca16469ce16399c734e72cd021d9`. The evidence-local reader and fixed archive adapter implement the accepted corrected E3g-P contract. No production file or old design literal is changed. **The fixed adapter has not been invoked against the 42 archived objects; none has been parsed or interpreted in this task.**

`reader.mjs` supplies the pure `inspectCoff` implementation. It copies ordinary fixed Uint8Array input, checks all count/range budgets before reads, preserves raw names/auxiliaries/directives, distinguishes primary symbol slots, and emits the closed Inventory/Rejected forms. It recognizes only the accepted standard AMD64 subset. It performs no I/O, dynamic code execution, library lookup, symbol resolution or linking. Unknown variants and explicit scope limits remain rejections.

`adapter.mjs` exposes only `validateBindings(candidate)` and the no-argument `inventoryBoundArchive()`. The latter is implemented but remains gated by this review boundary: do not invoke it. `pins.mjs` fixes and freezes the accepted binding/inventory/manifest identities and blob directory. Importing the adapter reads no files. Actual archive access uses the fixed pin data, ordinary canonical/single-link file checks, sealed compressed bytes, bounded gzip expansion and full reconstructed hashes before the reader. Filesystem checks use Node's lstat/realpath observations; they do not establish hermeticity, protection from transient mutation or a complete Windows reparse-tag audit.

`_internal/archive-core.mjs` is a private composition seam for synthetic tests. It is not a public injection API. The public entry point always supplies the fixed archive source and the real reader. Internal tests can provide independent in-memory sources and parser stubs to demonstrate ordering and budget failure without accessing the real objects. `_internal/files.mjs` isolates the filesystem operations. The fixed adapter retains at most the batch-budget-bounded result tree plus current object/result/serialization scratch; it does not claim constant heap use.

## Synthetic validation

`test-attempt-3.json` records 226 passing checks against the actual implementation:

- All 83 complete byte/result literals, eight input-domain cases and 94 negative bindings; positive binding and closed output schema checks as well.
- All 13 archive fault plans using synthetic isolated sources, including malformed gzip, expansion limits, chunk/full-file identities and stop-before-parser behavior.
- Six batch boundary vectors, the full synthetic batch serialization and all three precedence cases. The overflow precedence case actually constructs two large synthetic serialized entries, returns BATCH_LIMIT at index1 and proves no later read/parse occurs.
- Ordinary-file, size, noncanonical-path and actual hardlink checks in new synthetic build directories; every-byte mutations, every proper prefix of the comprehensive fixture, byte-offset views, spoofed accessors and unsigned-offset checks.

`boundary-results.json` records eight additional exact-count/resource tests: 4,096 sections, 262,144 symbol slots including auxiliaries, exact/over aggregate relocations, exact/over directive bytes, 4,096 name bytes and 4 MiB aggregate name bytes. None uses real object contents. Fixture equality is supplemented by schema rejection mutations and structural boundary tests; this is not a claim of exhaustive parser verification.

The first test attempt reached an EPERM denial while creating an isolated Windows hardlink. Its report and prior core source remain in `test-attempt-1.json`, `attempt-1-core.txt` and `attempt-history.json`. The permission-enabled second attempt passed. The third attempt revalidated the final sources after deep-freezing the nested pin records; it also passed. Between attempts, two unnecessary restrictions on internal synthetic archive shapes/compressed sizes were removed to match the frozen contract; no expected literal was altered. Exact retained filesystem fixtures are recorded in `filesystem-fixtures.json` and remain in the ignored build tree.

For independently authorized synthetic rechecks, run `node tests.mjs <new-result-path>` with filesystem access sufficient for the isolated hardlink fixture, and `node boundaries.mjs <new-result-path>`. Results are exclusive-create; failures are not overwritten. Do not invoke the fixed archive adapter as part of these checks.

## Preservation and review boundary

`source-identities.json` seals the implementation/test sources associated with the passing reports. `preservation.json` pins all 12,981 accepted-base tracked files (1,869,627,579 checkout bytes), excluding only root-owned COORDINATION and TASKS. The accepted TASKS prefix and exact new entry are checked independently.

`verify.mjs` checks this entire boundary, source identities, reports, frozen synthetic literals and old runtime archive preservation. Its explicitly transformed legacy guards use the exact historical TASKS view expected by those sealed guards; the outer guard separately enforces the real accepted-base TASKS prefix plus this task's exact entry, including coordinator acceptance. Guard relocation and this task-boundary substitution are fully recorded; original guards/seals remain byte-identical. Their byte reconstruction/hashing does not interpret COFF objects.

Return this synthetic implementation for actual/root/second review. No compatibility/provenance authority, library closure, registry grant, production API, compiler/linker invocation, host dump tool, object load or guest execution is inferred. Actual inventory of the 42 objects requires a separate explicit approval after this checkpoint.
