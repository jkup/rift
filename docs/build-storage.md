# Development build storage

On 2026-11-11, validation was stopped at the owner's request to reclaim space.
Cleanup removed 115,101,204,203 bytes of hash-identical validation copies from
inactive drafts and 2,598,328,735 bytes of successful LLVM intermediates.
The drive's available space rose from about 3.7 GB to 121.6 GB.

Canonical validation files, differing copies, original fixtures, source,
executables and failure reports were retained. Duplicate removal covered 87,609
files of at least 64 KiB, with no deletion errors. Compressed per-draft manifests
and the canonical hash catalog are in `build/storage-duplicate-cleanup/`.
Successful LLVM removals have separate `build/reflect-*-llvm-cleanup.json` records.

The active development helpers now remove LLVM intermediates only after passing
build/coverage/runtime gates. Executables and reports remain available. A READY
draft's validation copies are removed only after comparison with canonical files;
tooling inputs can be restored when needed. New compilation and draft preparation
require at least 20 GiB free. These are workspace maintenance helpers, separate
from guest engine semantics.

Before rerunning tooling in an old draft, restore its validation inputs through
the corresponding preparation helper. Do not regenerate accepted evidence or
delete distinct failure artifacts to recover space.

A follow-up READY-draft cleanup removed another 2,023,526,912 bytes from
13,070 hash-identical validation files, with no deletion failures. Available
space was about 119.8 GB afterward. The manifest is
`build/iana-timezone-adjacent-validation-copy-cleanup.json`.

A second historical cleanup removed 8,698,694,971 bytes from 5,651
hash-identical validation copies in six inactive implementation directories,
with no deletion failures. Available space rose from about 111 GiB to 119 GiB.
Source, executables, differing evidence, and active builds were retained.
Per-directory compressed manifests and the canonical hash catalog are in
`build/storage-historical-duplicate-cleanup/`.

The two completed Temporal drafts subsequently released 4,047,057,322 bytes
from 25,903 hash-identical validation copies. Their manifests are
`build/temporal-zone-operations-validation-copy-cleanup.json` and
`build/temporal-named-time-zones-validation-copy-cleanup.json`.
Each draft retained 126 read-only files that could not be removed.
A follow-up disk check showed 127.0 GB (118.3 GiB) available.

On 2026-11-18, two further hash-verified duplicate cleanups removed
6,668,566,860 logical bytes across 3,936 files, with no deletion errors.
Their catalogs and per-directory manifests are in
`build/storage-20261118-duplicate-cleanup/` and
`build/storage-20261118-extra-duplicate-cleanup/`.

Lossless gzip archiving then retained 107 historical draft LLVM files
(5,082,319,529 bytes) in 686,415,530 bytes. Each archive was read back,
decompressed and SHA256-checked before removing its original `.ll` file.
The archives remain beside the original paths as `.ll.gz`; restore them
before tools that require those historical LLVM paths. The manifest is
`build/historical-llvm-archive-20261118.jsonl`. Active weak-collection
artifacts, executables, sources and reports were excluded. Physical free
space reached 23.0 GiB, allowing the pending lifetime validation to resume.

A bounded followup archived two more historical LLVM files, reducing
83,944,015 logical bytes to 11,460,714 archive bytes, with both hashes verified.
Its manifest is `build/historical-llvm-archive-20261118-followup.jsonl`.
Free space also changed during compiler code generation; that larger change
is not attributed to these two archives.


During canonical weak-collection integration on 2026-11-18, a further 248 inactive-draft LLVM files were losslessly archived: 9160335278 original bytes became 1264646530 gzip bytes. Each archive was decoded and SHA256-verified before its original was unlinked; canonical source, active weak drafts, executables and reports were excluded. The manifest is build/historical-llvm-archive-canonical-20261118.jsonl (SHA256 E4B25841260E77BD2EE8BAA043436F07FA006FD1630456487126D131761E6E6E). Free space exceeded 27 GiB afterward. Separately, the completed Windows compiler package's 948012104-byte cli.ll was archived to 133224166 bytes with a verified round trip (build/windows-compiler-llvm-archive.json). The new canonical native build uses --no-keep-llvm to avoid accumulating generated text after successful compilation, and this acceptance run caps its private compiler cache at 1024 MiB. Executables and process reports remain available; generation failures and static-coverage failures remain failures.
