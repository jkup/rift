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
