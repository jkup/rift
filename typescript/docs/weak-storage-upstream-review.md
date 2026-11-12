# Upstream weak-storage review

TS-497, 2026-11-12. The installed compiler remains pinned to 0.4.7. Official
[scriptc 0.4.12](https://github.com/vercel-labs/scriptc/releases/tag/v0.4.12)
was published on 2026-11-11 at commit cdf8a5b70b6af05cba7b6ee5c9fb8cdc22136866.
The release history includes weak-key identity and collector fixes, including a
0.4.11 fix for a weak collection being freed while values hold its last key
reference. These improvements do not establish the representation Rift requires.

The released [type mapper](https://github.com/vercel-labs/scriptc/blob/v0.4.12/packages/compiler/src/frontend/type-mapper.ts#L4848)
still maps WeakMap, WeakSet and FinalizationRegistry to DYN. Its Git blob is
e7fd049e0b9ae8992a25933f784ff5bbec58750e. The released
[runtime constructors](https://github.com/vercel-labs/scriptc/blob/v0.4.12/packages/runtime/src/scr_json.c#L23155)
still return ScrDyn handles. The downloaded source matches the GitHub blob
926b81bbea2c706615dad65c8816eeac2e4c7114; no downloaded code was executed.

The [current limitations](https://scriptc.dev/docs/limitations#weak-collections-and-memory)
still list WeakRef as unsupported. They describe weak keys but retain restrictions
on symbol keys and back-references from values; FinalizationRegistry cleanup
callbacks do not run. This documentation is supporting context, not a new native
probe or proof of Windows behavior.

Do not upgrade solely to unblock these APIs. The released representation remains
incompatible with Rift's zero-dynamic requirement, and no new binary has been
installed or measured. Reopen the prerequisite when genuine static weak-storage
lowering is available, then rerun the retained reductions and semantic/lifetime
controls before exposing guest globals. Do not substitute strong maps or synthetic
collection behavior to improve fixture counts.

Evidence: build/weak-storage-upstream-review/review.json and the hash-verified
runtime source. The connector could not read the file above its size threshold;
a direct download of the same tagged file supplied the read-only source. All
package pins, installed tools and frozen validation inputs are unchanged.
