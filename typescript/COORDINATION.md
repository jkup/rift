# Rewrite coordination state

Owner authorization: continue bounded rewrite tasks autonomously, create new Codex chats, review them rigorously, and commit/push tested milestones while the owner is away. Ask only for material decisions or blockers not resolvable from the approved goals. Do not merge to main, force-push, remove C++, or manufacture work.

Repository: `C:\Users\jonku\code\rift`. Integration branch: `typescript-scriptc-probes`. Host: `local`. Use one implementation writer at a time in this shared checkout. Review actual diffs and evidence before assigning successors. Preserve companion tasks in root `Claude Roadmap.md` for Claude Code.

## Accepted foundation

- TS-001 implementation: `a016967`; original evidence: `b677091`.
- Coordinator found U+2028/U+2029 silently swallowing source after line comments. Review fix: `93adcfe`.
- Accepted `93adcfe` for the explicitly bounded foundation profile after inspecting lexer/tests and readability changes, independently rebuilding/running Node tests (90/90), and rerunning native guest tests (90/90) against the existing native executables. Producer evidence records rebuilt native binaries, 20 runner tests, ten probes, and static CLI/realm coverage. No full ECMAScript conformance claim.
- Foundation chat: `01a19794-baaa-7113-bba5-479887f71000`, host `local`, idle after review fix.
- Last observed cursor: `b0150acc-3b22-45be-9fe9-28f116db770e:4`.

## Current dispatch

- TS-002 accepted at `493fbd4`: reviewed precedence/assignment arms, short-circuiting, abrupt completion and bounded-depth tests; independently rebuilt Node and native guest lanes, 112/112 each. Static native build gates passed. Existing syntax/coercion limitations remain explicit.
- Completed TS-002 chat: `01a197b1-67cb-7e00-87ed-dc86a82b933b`, host `local`, idle. Last cursor: `8e67dac2-0c53-46ac-bf9e-da49a0475e04:4`.
- Next dispatch: TS-003 Number constants/predicates; chat pending creation. TS-004A data-descriptor validation follows after review. Do not run shared-manifest/core writers simultaneously in this checkout.
- Preserve deferred scope and explicitly document partial semantics. Do not turn task completion into claims of complete support.

## Review cycle

1. Inspect current branch/status and compact thread snapshots; preserve concurrent work.
2. Review each coherent commit and test evidence against goals and task acceptance.
3. Reproduce plausible defects; send precise findings to the implementation chat. Do not edit its active files concurrently.
4. Independently validate important outcomes, then record accepted hash, limitations and next ready task here.
5. Create the next bounded implementation chat, record its ID/ownership, and wait for a progress snapshot.
6. Keep the Claude queue useful and independent; review completed companion work before integrating.

The heartbeat continues this cycle every 15 minutes. Unchanged/non-actionable checks remain quiet. Report meaningful completed milestones, material failures, or required owner decisions.
