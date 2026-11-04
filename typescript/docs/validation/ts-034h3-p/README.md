# For/update design evidence

Base `a978442`, 2026-11-04. The [contract](../../harness-for-update.md) is proposed
for actual and independent second review. This directory contains source and
preservation evidence only. No new interpreter, guest execution, native build,
harness success or admission is claimed. The design audit does not parse or run
the proposed sources, nor generate semantic expectations from an implementation.

## Frozen prefix oracle

prefixes.json has eleven hand-derived traces, lengths **4,4,13,9,17,4,6,8,5,8,6**.
Coordinates are one-based, including the literal strict directive and shown LF
newlines. All traces start with unchanged directive statement/expression ticks,
except P17-var whose four GDI ticks precede the body. No source rewriting.

For each length N, run fresh Realm/session for seed in [0,7] and k=0..N inclusive:
**190 distinct prefixes**. Seed7 first runs exact `"use strict";this.seed=1;`
under the same maxSteps=7+k; it takes seven ticks and stores seed=1. Seed0 omits
that unit. Set limits before both units, never reset steps or change limits later.
Set up ordinary host properties/callbacks before execution, without session ticks.

For k<N expect resource steps count=seed+k+1, limit=seed+k, Location=ticks[k].
Phase is instantiation only for P17-var k<4, otherwise body. lastAbrupt is the
target source/Realm; no remaining effects. At k=N require the row's exact normal
or language-throw completion and steps=seed+N, not an automatic normal result.
After every exit assert idle active, calls0/depth0, restored Realm and preserved
seed property. Materializations=0 in all these rows. At full update-throw endpoint
assert exact preallocated completion identity, Value and diagnostic900:9; source
provenance stays the target unit. Engine-generated resource diagnostics use the
failing tick's location instead of the sentinel's location.

Observable prefix effects (successful tick count k, before the failing tick):

* P13/P09: host x remains9 for k<5, becomes0 for k>=5; P13 alone becomes1 for
  k>=10. No update after break. At P13 k=9 update tick fails with x still0.
* P17: i absent k<4; own global i=undefined for 4<=k<9; i=0 for 9<=k<14;
  i=1 for k>=14. Do not roll back a successful GDI creation or update.
* P04-postfix: host x remains7 until k=4 then8. P06-member: o.p remains7 until
  k=6 then8. Compare final postfix result to old7, not stored8.
* P08-accessor-hooks: empty trace k<7; trace K,G at k=7; K,G,N,S8 at k=8.
  All callbacks are real registered builtins, with unchanged context.call permit
  handling, no hidden tick. Key hint string, numeric hint number, getter/setter
  receivers identical to o, hook receivers identical to their objects. Setter
  records number8. Failed numeric-hook tick must preserve preceding K,G effects.
* P06-update-throw: no F for k<6; F only at6, after continue. No second test.
* Other rows have no exposed mutable effects. Block activation at P08 tick5
  and var setup phases are source-review invariants, not new introspection APIs.

These expectations derive from existing #statement/#evaluate wrappers, GDI's four
var passes, createBlockEnvironment, Reference's cached key and primitive-conversion
ticks plus the explicitly frozen new-node dispatch in the contract. No artificial
loop tick, identifier-target tick, arithmetic tick or absent-header tick. All
eleven source traces are literal data; audit.mjs only checks shape/coordinates.

## Two actual runtime inputs

input-seven.js and input-eleven.js are entire distinct strict Script sources,
including final newline. Compile each future driver once, then read each input
file at runtime in Node/native and compare fixed output [number7]/[number11],
normal undefined completion. Seven's loop continues at i=2 and finishes with
i=4,total=4. Eleven's loop breaks at i=2 with i=2,total=1; break skips update.
Check these state differences too, and hash bytes before each lane run. Neither
file is a marker selecting a host-embedded program. Run all fixed semantic/
negative/identity/prefix controls for both inputs. Runtime acceptance is deferred
until H3 is independently assigned and implemented.

## Source and preservation audit

Run from repository root:

```
node typescript/docs/validation/ts-034h3-p/audit.mjs
node --check typescript/docs/validation/ts-034h3-p/audit.mjs
node --check typescript/docs/validation/ts-034h3-p/research.mjs
git diff --check
```

audit.json lists baseline protected Git blobs, unchanged source seams and all
tracked executable for/++/ToNumeric mentions under src/test/fixtures/tools and
historical validation scripts. This is a mention inventory, not a claim that
host-language for loops are guest tests. It binds the contract, prefix/input and
upstream files; verifies retained212 records/lane and51 successful static gates;
recomputes all60 blockers and every byte/blob/SHA256 in the pinned corpus snapshot.
No tests, corpus, compiler settings, old evidence or production files are edited.
Only this TASKS entry may change; unrelated coordinator COORDINATION changes are
allowed by the preservation check and must remain unstaged by this writer.

proposed-migrations.json contains literal one-occurrence replacements and before/
after whole-file LF hashes for two active drivers. Its proposed E4 changes keep
H1-empty/H2-empty and old neighboring negatives intact; switch N08 retains its
label and moves to prefix ++. It is **not** applied. Historical verifiers that
embed the old E4 bytes remain historical, not silently rebaselined. The future H3
verifier must enforce these exact whole-file changes and preserve everything else.

Legacy negatives are explicitly preserved: tools/run-guests increment, compound-
assignment P20 UpdatesExcluded, primitive-reads and property-assignment postfix/
prefix rows. script-metadata.inspectScript uses legacy parse and default lex,
so it also remains unable to inspect these new Script-only forms; the executable
record uses declaration planning directly. No scope expansion to that module.

research.mjs retrieves edition16 and engine262 at the pinned revision, retaining
numbered source and license. First sandbox attempt failed DNS ENOTFOUND. Authorized
network retrieval found ForStatement.mts absent; inspecting the pinned tree located
the algorithm in LabelledEvaluation.mts. Final evidence has the same edition hash
as H1/H2. Relevant engine lines: LabelledEvaluation278–352 initialization,
465–503 test/body/continue/update, and UpdateExpression24–45 old-result ordering.
Source inspection only; engine262 was not run. No code is copied into production.

Pinned assert.js has one for loop at170; compareArray.format at178–180 calls map,
not a second loop. The selected consumers do not reach compareArray, but entire
dormant bodies must parse. Existing `new`/`instanceof`/sloppy/error blockers still
prevent faithful unchanged harness execution. Parsing H3 alone cannot unblock a
variant or validate an assertion helper. Preserve H1/H2 controls and history.

Measured source-audit result on Node v26.13.0: **3339 protected tracked files,
405 executable mention files, 190 frozen prefixes, retained212/51, 60blocked**.
Both audit/research syntax checks and git diff --check pass. These are design and
preservation checks only; no production test suite or native build ran for H3-P.
