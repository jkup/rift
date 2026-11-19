# TS033D-P design evidence

Design-only assignment, 2026-11-02, assigned99e8fcf, inspected
250aa1b76e8cb3282f2aa2e867cf22197d783278 (coordinator tracking only).
The writer claimed TASKS before design edits. Owns only
docs/script-declarations.md, this directory and TASKS handoff.
No production, tests, manifests, historical evidence, pins, C++, COORDINATION
or Claude CL006 edits. [Frozen design](../../script-declarations.md).

Read AGENTS, project goals, compiler contract, TASKS/COORDINATION, Claude
Roadmap, accepted Script/bootstrap designs, actual parser/syntax/metadata,
evaluator.block and accepted GlobalEnvironment methods. The audit inventories
all source/test files and relevant declaration/global/factory occurrences.
It is a lexical source inventory, not a reachability proof.

From repository root:

~~~text
node typescript/docs/validation/ts-033d-p/audit.mjs
~~~

Actual result:2436 protected tracked files unchanged,160 source/test identities,
829 seam occurrences,33 named matrix rows inventoried,60/60 selected variants
still blocked. Git diff against the exact base uses Git's line-ending filters;
new files outside the assignment fail the audit. Coordinator-owned COORDINATION
is explicitly excluded and hash-recorded. All other unowned tracked paths,
including old evidence and Claude Roadmap, are protected.

The212 Node records,212 native records and40 static gates are read/hash-recorded
from accepted TS033C evidence. They were not rerun or recertified here.
Only the existing host blocker classifier is imported; no Rift production code
is imported or executed. No guest, native or reference-engine execution, fresh
build/static coverage, simulated instantiation, or conformance result is claimed.
The G/L/T/R expectations are source/spec-derived requirements, not passing tests.
The audit checks row presence, not semantic correctness of their expectations.

Research reproduction (requires network):

~~~text
node typescript/docs/validation/ts-033d-p/research.mjs
~~~

spec.json retains nine clauses from the fixed edition16 document,8169822 bytes,
SHA2566a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713,
matching TS033P. engine.json retains complete GlobalDeclarationInstantiation
and FunctionDeclarationInstantiation source plus MIT license from
engine262 d553e7b52501fbc47eae981c8d0fa7a5c26d0171, with URLs/byte sizes/hashes.
The audit rehashes every retained engine source. Accepted Environment and Script
context source remains in ../ts-033p/upstream.json, unchanged.

Retrieval limitations/failures: web reader rejected the fixed spec for its
content-length limit and could not retrieve the raw engine URL. Initial shell
retrieval failed sandbox DNS ENOTFOUND; approved network retrieval succeeded.
The first GitHub tree matcher expected hyphenated filenames and found none;
corrected matcher finds the pinned PascalCase declaration-instantiation files.
These are research-tool failures, not runtime test skips. The final evidence
contains verified bytes; no toolchain workaround or pin change occurred.

The recommended next task is D1 non-executing planning, with only minimal
unreachable-var consumer arms. D2 host orchestration/markers and P4 real
factory/context work remain separately reviewed assignments. Script execution,
callable factories and all conformance profiles stay closed.
