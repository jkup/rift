# Remaining-case invocation: stopped at descendant membership

Root actual/second approval authorized exactly one invocation of bfe7b4f's descendant-publication/lifecycle-runner.ps1 -ReviewedLifecycle with pinned PowerShell and fresh `build/ts035e3fp-atomic-job-lifecycle-publication`. Preflight passed with original-build preservation and pins. The exact invocation ran once and exited **1**. Cases1–13 were not repeated. No scriptc invocation, oracle/limit change, fallback publication mechanism, deletion of aliases or automatic retry occurred.

Seven cases matched: stdout-read-error, output-file-exists, death-before-create, death-after-create, death-membership, death-before-resume and death-after-resume. The eighth attempted case, original ordinal21 death-with-descendant, stopped on `descendant not independently present`. The final four cases (creation-race-0ms/1ms/5ms and legacy-gap-control) were not run. This is not lifecycle acceptance or permission for a compiler probe.

The failure occurred after reading the descendant PID and querying independent outer-job membership, before the supervisor KillRoot action. Original evidence is:

- Supervisor PID: 28800; after-resume child marker: `33336\n`.
- Published descendant PID: `3272\n`; membersBeforeKill snapshot: `[28800,568]`.
- The declared descendant PID is absent from that snapshot. The identity/role of member568 is not established by the retained records.
- child-started.json records PID33336 in descendant mode; no leaf-started.json, status.json or release-after-resume.txt exists. The captured stderr is empty.
- The failed row has null statusData, emptyBeforeSafety and membersBeforeSafety. It is not an expected negative control result.

These observations do not establish why PID3272 was absent, whether it exited before the snapshot, or what member568 represents. No speculative fixture or oracle correction is supplied. Further diagnosis or execution requires root direction; the exact failure and source identity are returned first.

Independent outer safety cleanup completed before follow-up. The seven matched rows record emptyBeforeSafety=true, membersBeforeSafety=[] and safetyCleanup=false. The failed row records safetyCleanup=true, failed-stop-review and exactly the original membership assertion error. The unchanged finally block invokes SafetyCleanup only when the independent outer job is nonempty. Its unchanged implementation requires successful job termination and bounded WaitEmpty before returning; an error would be appended and set cleanup-unconfirmed-stop-review. Neither occurred. Thus fallback cleanup returned successfully; there is no claim of empty-before-fallback for the failed case.

Both expected PID-file aliases are preserved without modification or deletion. `hardlink-pair.json` records the exact paths, device1045235170, file identity281474978332486, link count2 and identical five bytes (`333237320a`, ASCII `3272\n`). This records the published bytes and alias identity for this attempt, not correct descendant membership. All other output files have link count1. The narrowly scoped archive checker permits only this exact two-path pair and requires equal identity, link count and bytes; previous source and artifact checks are unchanged.

`attempt-files.json.gz` retains all108output files/625,783bytes as path, byte count, SHA-256, device/file identity/link count and base64 original bytes. `inventory.json` includes empty directories. The original log, failed row, case plan, copied-source identities, configurations, streams, checkpoints and caches are intact. The observed stale kind labels and preflight historical counters remain byte-for-byte; outcomes.json separately reports this invocation. All three output trees remain untouched, including the pair's metadata. Full copied fixture, instrumented supervisor and wrapper bytes match the approved design sources.

The layered read-only verifier checks both older archives/output trees, all9,333baseline identities,39/44/42original artifact rows, both intervening design layers and document prefixes, this archive and its source identities. Root-owned COORDINATION is excluded. E3e descriptive/E3c nullbinding/E2 ownership/242-member closure/emptyregistry and all60blocked remain unchanged. Stop for root/second review; no further action, publication or successor work is claimed.
