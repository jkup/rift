# TS-033P audit evidence

Design-only, 2026-11-02, base `dc460ac`; see [design](../../script-execution.md).
No guest program, host reference engine or native target was executed. No production
implementation, integrated test, policy, manifest or historical evidence was edited.

Measured in this task:

- `research.mjs` retrieved fixed ECMA-262 edition16 and engine262 commit
  `d553e7b52501fbc47eae981c8d0fa7a5c26d0171`; `upstream.json` contains source
  byte counts/SHA-256, seven extracted normative clauses and numbered engine
  files. Engine MIT copyright/license is retained in its LICENSE entry. This is
  source inspection, not a run of engine262 or a proof of native compilability.
- The same script retrieved all33 selected test262 tests and three harness files
  at `91c70759363c46557b694792bf34a2551a7af5ba`, verifying every Git blob against
  the unchanged selection manifest. `corpus.json` retains exact decoded UTF-8 text,
  hashes, paths and copyright notices plus upstream BSD license. Re-encoding is
  checked byte-for-byte by size/SHA-256/blob identity. No line-ending repair.
- `audit.mjs` verifies retained identities offline, imports the unchanged pure
  planner blocker function, checks all60 variants remain blocked and checks the
  protected tracked tree against base (Git clean-filter semantics on Windows).
  Coordinator commit `b8c2f83` independently added the assignment to COORDINATION
  during this work, followed by a 17:23 progress entry. Initial audits rejected
  those concurrent deltas; both were inspected. COORDINATION is now explicitly
  excluded from this writer's preservation assertion and its observed hash is
  recorded separately. The writer never edits/stages it. `audit.json` binds
  inspected local files by working-byte SHA-256.

Reproduce from repository root:

```powershell
node typescript/docs/validation/ts-033p/audit.mjs
# Optional network refresh of owned source evidence only:
node typescript/docs/validation/ts-033p/research.mjs
node typescript/docs/validation/ts-033p/audit.mjs
```

Research retrieval fails closed on HTTP/known blob mismatch. ECMA edition URL is
versioned but not content-addressed: compare the retained hash before replacing
evidence if its bytes change. The pinned engine commit came from the GitHub API;
source bytes were then fetched at that full commit. Engine/spec excerpts are
research copies, not dependencies. Read-only upstream fetches required approved
network escalation after sandbox DNS failed. Web fetch of the single-page spec
also failed due to its size; the successful direct fetch and hash supersede that
attempt. An initial audit passed every protected path as a command argument and
hit Windows ENAMETOOLONG; the final audit filters the complete Git diff instead.
Initial path lookup used root docs rather than typescript/docs; corrected
before claiming the task. Python was unavailable; all evidence scripts use Node.

Inherited evidence only: accepted TS-032B reports212 Node and212 native cases,
37 static-only/separate coverage gates, runner20/probes10 and host73. This audit
checks retained case/gate counts and preservation, **does not rerun** those gates,
and makes no claim about new runtime functionality, test262 passes, Windows
performance or other platforms. No isolated semantic probe was needed: the
uncertainties here were settled by source/algorithm inspection. The matrix in
the design has not been executed. Future implementation may expose compiler
constraints and must earn its own Node/native evidence.

Review focus: opt-in profile isolation; whole-source strictness certification;
2025 declaration checks and phase boundaries; separate harness units; retained
unresolved references; completion empty-value representation; cross-Realm and
abrupt cleanup; all blockers and finite resource limits. No owner choice is
currently required. Stop after commit/publication for independent review.
