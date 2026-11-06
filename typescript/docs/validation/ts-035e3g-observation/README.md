# One fixed offline invocation: stopped for review

Base `ca7c74ed9e321c5c6567e1115bcbcf8dd38987f6`. The exact accepted `inventoryBoundArchive()` was invoked once. It returned one complete 42-entry batch containing **42 rejections**, then the observation stopped with exit1. No retry, parser change, alternate tool or compatibility analysis followed.

All 41 runtime inputs returned `{code:"RAW_POINTER",offset:40}`. The program input `probe.obj` returned the same code at offset80. `result.json` preserves the complete raw compact batch: 25,049 bytes, SHA-256 `08d570de07ff25640475027945f5424975df49fde4558005e14ccb5a4921d617`. All 42 binding paths/order/identities and returned input identities match the sealed literal; the batch conforms to the closed schema and lies within its fixed128MiB bound. This is a validated rejected observation, not a successful inventory.

The accepted all-results adapter returns Rejected entries as part of its single batch. It therefore visited all42 inputs within the one invocation; the outer observer stopped immediately on receiving that batch. There was no second adapter or reader invocation on these objects.

`before.json` and `after.json` record exact implementation/test-source and archive-pin hashes; they are equal and match the accepted pins. `status.json` retains the invocation count, full rejection list, outcome and raw-result identity. `started.json` and exclusive-create outputs prevent rerunning the observation in this subtree.

`rejection-bytes.json` provides each exact binding/error plus eight supporting bytes from four bytes before the reported offset through four bytes after it. Those bytes were reconstructed from the sealed gzip archive and checked against each complete input hash without invoking the parser again. For the first runtime object, the window at offset36 is `000000008c050000`; for `probe.obj`, the window at offset76 is `000000009d030000`. No additional field interpretation or relaxed acceptance rule is proposed here.

No entry returned an Inventory payload. Consequently there is no completed machine/section/symbol/relocation/directive/_fltused inventory to report from this run. Common, undefined and defined symbols were not reported; raw directives were not reported. Their absence from rejected results must not be treated as absence from the objects or as empty dependency closure. The original full object bytes remain sealed. MSVC/GNU compatibility and full build provenance remain unresolved.

`validate-result.mjs` only checks the retained JSON, identities, before/after records and exact byte windows; it never invokes the reader or adapter. `verify.mjs` additionally preserves all13,019 accepted-base tracked files (1,875,678,406 raw checkout bytes), exact TASKS boundary, historical sources/seals and original archive/output trees. Legacy guard copies have only explicit path relocation and the new task boundary added, with complete source hashes/replacements. No accepted source or old seal was edited or regenerated.

One supporting-byte retention script initially mixed CommonJS require and top-level await, before performing reads; `authoring-error.json` records the correction to ES module imports. It did not repeat the adapter invocation or alter the observation.

No compiler, linker, host dump tool, library resolution, object loading or execution occurred. E3c null binding, E2 ownership, all60blocked and inherited212both71gates remain unchanged. Return the exact rejected batch for actual/root/second review before further work; no expansion, retry or successor is authorized by this handoff.
