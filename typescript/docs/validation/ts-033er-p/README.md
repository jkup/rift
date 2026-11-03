# TS-033ER-P design evidence

2026-11-03, base `b33fae6`, sole design writer. Proposed contract is
[script-accessor-integration.md](../../script-accessor-integration.md); no runtime,
existing test, runner, pin, C++, historical evidence or coordinator file edits.
The mandatory ER section in script-execution-integration.md remains authoritative
and unchanged; this design specializes it within the assigned owned paths.

Offline replay from repository root:

```text
node typescript/docs/validation/ts-033er-p/audit.mjs
node --check typescript/docs/validation/ts-033er-p/audit.mjs
node --check typescript/docs/validation/ts-033er-p/research.mjs
git diff --check
```

Audit result: **2,786 protected tracked files; 172 src/test files hashed;
1,254 matched source lines; 45 conservative host migration files; 36 proposed
matrix rows; inherited records 212/212 and 46 static gates; 60/60 corpus variants
still blocked.** Categories overlap: Get131, Set75, descriptor598, inspection400,
binding63, guard21. These are lexical matched-line counts, not semantic call-site
or test-pass counts. In production, semantic Get has 11 callers across seven
files plus its sole implementation; no production Get/Set overrides. Array and
String definition overrides and String descriptor/snapshot overrides are
explicitly reviewed. Host overrides and their super calls are retained verbatim
with locations in audit.json. Map.get occurrences are intentional conservative
false positives in the 45-file allowlist, not guest reads to change.

The audit checks only this TASKS entry changed, rejects edits/untracked output
outside ownership (COORDINATION excluded for its separate owner), hashes every
protected file and records base Git blobs, checks inherited build entrypoints
remain registered, re-evaluates the closed corpus blockers, and verifies pinned
engine-source hashes. No existing evidence gets rewritten. It does not rebuild
Rift, execute any semantic row, prove compiler lowering, or measure conformance.
Current source preservation plus retained successful E3B records is the evidence;
212/212/46 are inherited, not newly executed results.

Network retrieval replay (writes only this new evidence directory):

```text
node typescript/docs/validation/ts-033er-p/research.mjs
```

The fixed 2025 edition is checked against its previously retained whole-document
hash before extracting 13 relevant clauses. engine262 revision
`d553e7b52501fbc47eae981c8d0fa7a5c26d0171` has 12 retained files, including LICENSE.
Relevant ordinary algorithms, descriptor helpers, restricted-property helper,
prototype bootstrap and thrower bootstrap were source-reviewed; extra async and
generator prototypes fetched by the selector confer no scope/support. No engine
was executed for comparison. MIT attribution is retained with the sources; this
proposal contains no transplanted production implementation.

Retrieval attempts (failures preserved here as a factual attempt log): the web
service open request returned 503 Service Unavailable. Initial sandboxed Node
fetch failed `getaddrinfo ENOTFOUND 262.ecma-international.org` (exit1). Approved
network execution fetched the edition, then failed on the guessed anchor
`sec-global-environment-records-candeclareglobalfunction-n` (exit1). Corrected
fixed-edition anchors `sec-candeclareglobalfunction` and
`sec-createglobalfunctionbinding` succeeded. Subsequent retrieval added the exact
objects/spec-types/realms files after checking the pinned tree. Final retrieval
exit0, 13 clauses/12 files. These are retrieval failures, not compiler failures
or skipped engine tests. The first audit used one git process per file and was
slow; final audit batches base tree/blob metadata and reproduces the same counts.

Remaining review decisions/gaps: explicitly accept the eleven-file ER-A production
ownership and conservative 45-file signature/inspection migration allowlist;
approve the new contextful host-read APIs and internal invalid-record host-error
boundary; later demonstrate static compilation and actual semantic rows in both
hosts. Actual Script thrower invocation/frame cleanup is exclusively E4 R36,
which needs source-level literal ticks before activation. Genuine Error objects,
reflection/syntax exposure, Proxy/exotic Get dispatch and broader conformance
remain blocked. No subagent, successor, branch switch or main merge occurred.
