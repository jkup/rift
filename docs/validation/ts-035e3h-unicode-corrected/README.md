# Unicode controller: guarded inert correction

This sibling corrects three defects in rejected candidate 97e6d662. That candidate, its fixtures, source, reports and seals remain unchanged. The entry gate is false. No real child, diagnostic, PowerShell, native API, helper, compiler, recorder or linker was invoked; the diagnostic fixed root remains absent.

`source-transformations.json` records exact old/new bytes for controller, adapter, entry and inherited tests. `bindings.json` pins the corrected source, inventory module, explicit amendment, unchanged accepted diagnostic contract/script/input/full stdout literals, and named Node/PowerShell executables. Entry verifies the binding file and code hashes before dynamic imports. The future invocation pins entry separately to avoid circular self-hashing. No enabled entry is supplied.

The actual adapter now takes an injected spawn function. Only the false-gated entry can supply Node spawn; tests import the same adapter and supply fake child handles. Close independently attempts stdout destroy, stderr destroy and child unref, returning every failure to capture status. A failed kill and absent exit still mean unconfirmed known-process cleanup. Unref does not terminate a process, confirm cleanup or establish a descendant census. Destroy/unref failures remain explicit; this is no claim that a throwing OS operation succeeded.

`finalizeFiles` independently attempts fsync and close for every opened stream descriptor. `run` retains the original capture exception/state and the complete finalization-error array; a later failure cannot mask the original or skip another descriptor. Tests cover all 16 flush/close failure combinations, actual-run capture error plus four finalization errors, and failure opening the second stream followed by two finalization errors on the first. Partial files remain on disk.

`boundedInventory` uses incremental directory handles. Depth, entry/directory/file counts, alias/type checks, per-file and aggregate byte limits precede content reads. Opened-file identity is checked; reads are bounded to prechecked size plus one growth byte. Inventory stops on errors and reports unvisited entries as unknown. It never recursively reads arbitrary unexpected cache files or exempts guessed names. Inspection occurs before status/inventory publication; those two exclusive publications are excluded to avoid self-reference and require subsequent archival/sealing. Publication errors still produce a stopped outer error with partial evidence retained.

## Explicit amendments requiring review

`amendment.json` is the proposed contract change; the original contract is immutable. Each stream retains at most 8192 raw prefix bytes plus one overflow byte in status. Remaining produced/buffered bytes are unknown. Overflow fails, requests bounded known-process termination, and never fabricates EOF or claims full retention.

Inventory is limited to 10 entries, 6 directories including root, 4 files, depth 3, 8192 bytes per file and 32768 bytes aggregate. The only permitted directories are the five explicitly staged home/tmp directories and root. Permitted files are diagnostic.ps1, input.json and the two raw streams. Any unexpected startup-cache entry stops before reading/traversing it; no cache filename was assumed observed. A real run may therefore stop on new cache metadata. That is an explicit strict policy, not an exemption or automatic permission to broaden the tree.

The diagnostic source/input/oracles, exact ten-key child environment, tool pin, one-process/zero-retry rule and five-second observation plus five-second cleanup remain unchanged. Review must accept these amendments separately before readiness; no execution is authorized here.

## Validation and handoff

271 synthetic controls passed against actual corrected code: 119 correction controls, 24 additional boundary controls, and inherited 90+38 controls in distinct retained roots. Actual adapter tests cover fake-child failed kill/no exit, every destroy/unref failure combination, readable/end/exit processing and complete byte output. Inventory tests independently cover limits before content access, exact aggregate boundaries, growth, unexpected files/cache directories and retained stopped outcomes. The final controller hash is recorded in reports. `filesystem-fixtures.json` seals synthetic files/link identities; no fixture is deleted or reused.

One authoring patch was rejected because it specified the wrong original binding hash; the failure is retained in `authoring-error.json`. No source or runtime state changed in that failed patch. The coordinator's original teardown reproduction is retained as read-only evidence.

The full guard preserves 13854 baseline files and all historical seals, including the failed recorder observation. Stop for actual/root/second review; no readiness, runtime acceptance, cleanup census or provenance authority is claimed.
