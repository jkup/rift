# Unicode diagnostic readiness proposal — inert

Status: proposal and synthetic readiness checks only. The runner root and diagnostic root are both absent. No file has been materialized there and no diagnostic has run. Execution is not authorized by this proposal.

## What this proposal would run

The prior recorder observation remains failed: isolated D800/DC00 became FFFD in the recorder's raw command, environment and argv. Offline source inspection found a matching Newtonsoft JSON parsing behavior, but did not establish which installed assembly or conversion layer ran. This diagnostic would only locate the same behavior across staged text, parsed value, cast and direct-control boundaries. It cannot repair the failed recorder result or establish source-to-binary provenance.

The accepted bounded controller remains unchanged. It stages the two accepted child inputs under a fresh diagnostic root, launches one pinned PowerShell process with no inherited environment, captures at most 8192 bytes plus one overflow sentinel per stream, and waits no longer than five seconds for execution and five seconds for known-process cleanup. Any bytes after the sentinel are unknown. Its inventory limits are 10 entries, 6 directories, 4 files, depth 3, 8192 bytes per file and 32768 bytes aggregate. Unexpected cache metadata stops unread.

## Two separate roots

The future runner bundle root is `C:\Users\jonku\code\rift\typescript\build\ts035e3h-unicode-runner-1`. The controller's diagnostic root is `C:\Users\jonku\code\rift\typescript\build\ts035e3h-unicode-diagnostic-1`. Both must be absent before any future action. The runner root is materialized first with five exclusive files and five private home/temp directories. The controller creates the separate diagnostic root only after its own preflight. Thus the diagnostic root remains absent at Node launch, and the Node process does not receive TEMP/HOME paths that point inside that absent root.

The runner bundle contains `entry.mjs`, `bindings.json`, `controller.mjs`, `transport.mjs` and `inventory.mjs`. The three modules are byte-for-byte copies of the accepted corrected controller. `bindings.json` is a derived copy of the accepted 11-row binding: only the three module paths change to their bundle locations. Their lengths and hashes remain the same. The checker independently verifies each copy against its accepted source and checks the complete ordered transformed binding bytes. The transformed entry has two exact single-occurrence replacements: `RUN=false` to `RUN=true`, and the embedded binding digest to the digest of those exact transformed binding bytes. Both transformed outputs and their complete hashes are frozen in this proposal. The accepted source entry and binding remain unchanged and inert.

The runner's future outer Node invocation uses the pinned Node executable, argv containing only the bundle `entry.mjs`, repository cwd, and exactly ten environment keys. TEMP/TMP and HOME/USERPROFILE point into the private directories included in the runner bundle. The child PowerShell invocation remains the unchanged accepted contract, including its own ten-key environment rooted under the diagnostic root. These are distinct environments; no claim is made that the child environment was observed in the prior failed attempt.

## Future materialization and stop behavior

`materialization.json` lists the exact five runner files, their source bytes, exclusive destinations and hashes. The five private directories and exact ordered staging protocol are frozen in materialization.json. After a separate execution approval, preflight must recheck both roots are absent, verify named ancestor and file identities, verify every source/tool/input hash and alias policy, then create the runner root and its listed directories and files exclusively. It must verify the writes and preserve any partial output on failure. Only after that complete check could the exact pinned Node invocation be dispatched once. The accepted controller then owns creation and inventory of the separate diagnostic root and runs the one child attempt.

Any setup, identity, write, status, capture, cleanup, inventory or publication failure stops the attempt and retains all bytes, errors and partial output. There is no retry, fallback command, oracle normalization or generated-program launch. Cleanup claims remain limited to the known process; no descendant census or complete-provenance claim is made.

## Validation boundary

The checker pins the previously accepted six-group/15-name alias policy by exact path, size and digest; it adds no aliases or broad filesystem scan. It validates the exact source-to-bundle transforms, both root paths, complete outer and child environments, executable and input pins, binding rows, exact materialization destinations, output bytes, limits and absence of both roots. Sixty-eight in-memory mutation controls cover altered/missing/extra/reordered rows and directories, each environment key, launcher arguments and identities, limits, root changes, alias-policy broadening, protocol omission, and source/contract/derived-byte tampering. It is read-only. No fixed root is created by these checks. The gate is enabled only in the proposal text artifacts; accepted sources remain unchanged and false-gated.

Actual, root and second review are still required. After those reviews, the owner must separately approve one diagnostic attempt. Until then, do not create either fixed root, materialize files, launch Node or PowerShell, load assemblies or execute any helper, compiler, recorder, linker or scan. This observation would only measure the selected diagnostic path; it would not change the failed recorder status or grant runtime authority.
