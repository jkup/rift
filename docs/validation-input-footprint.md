# Historical validation input footprint

TS-522 completed the dependency review and isolated validation. The initial inventory covers 13,085 tracked files
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

The first isolated run passed 269/296 tests. Its setup omitted the pinned YAML
package and Test262 corpus and lacked the baseline's host symlink permission.
Restoring those inputs and permissions yielded 295/296. The remaining migration
test reads a JSON manifest naming two additional archived files:
`ts-035e2b/support.mjs` and `ts-035e2b/extended.mjs`. The source scan alone could
not establish this data-driven dependency.

With those two files included, all 296 unchanged tests pass, with zero skips.
The experiment uses the same verified native binaries and checks every source,
dependency and archived input hash before and after execution. Original failure
logs remain alongside the successful result in
`build/validation-footprint-experiment/result-closure.json`.

The validated archive set contains 2,609 files and 576,878,359 bytes. It saves
1,446,658,495 bytes, about 71%, per successor. YAML and the prepared corpus add
269 files and 714,677 bytes, matching the baseline. TS-524 preparation now copies
this exact hash-verified set while checking its frozen engine inputs unchanged.
This result covers the current tooling suite; changed archival dependencies must
be reviewed again. No original archives were deleted or redirected to mutable
shared files, and the active canonical validation inputs were not changed.
