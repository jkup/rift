# Historical validation input footprint

TS-522 is a read-only review. The initial inventory covers 13,085 tracked files
under `docs/validation`. About 1.63 GB is JSON and 256 MB is compressed data;
compiler binaries are not the main source of these repeated copies. Current
successor preparation copies roughly 2.02 GB, then hash-verified cleanup removes
identical copies after READY. Original tracked evidence stays in place.

The largest files include archived context results, old test proposals and
transport artifacts. Size alone does not establish that a file is unnecessary.
Current tooling directly imports archived control modules and reads historical
JSON snapshots. It also builds paths dynamically: parser audits select a
directory from a table, dispatch tests pass proposal directories to a helper,
and some tests launch archived scripts that can have further dependencies.

`build/review-validation-input-footprint.mjs` records file sizes and literal
archive-directory references from tracked tooling. Its output explicitly marks
the inventory as incomplete dependency evidence. A directory mentioned in code
is not proof that all its files are needed; absence of a literal reference is
not proof that its files are unused.

The initial scan finds 29 referenced directories containing 576,860,426 bytes,
against 2,023,536,854 bytes in the full archive. This is a useful starting set,
not a validated space-saving estimate: archived scripts may require additional
directories, and dynamically constructed paths remain unresolved.

Next, derive the transitive input set, retain the dynamic-path cases explicitly,
and run all 296 unchanged tooling tests against an isolated copy containing only
that set. Compare results with the full-copy baseline and preserve any missing
dependency failures. Only then propose a preparation change. Do not delete
archives, redirect tests to mutable originals, or change active frozen inputs
as part of this review.
