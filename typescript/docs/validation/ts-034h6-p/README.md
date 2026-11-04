# TS-034H6-P design evidence

Candidate for actual and independent second review; no implementation acceptance.
Base9918775 on codex/test262-classification, accepted H5 25aa258. This task owns
only new harness-errors.md, this new evidence directory and its TASKS status.
COORDINATION changes in the shared checkout belong to the coordinator and are
excluded from the design commit.

* [Design and exact successor ownership](../../harness-errors.md).
* [54 actual failure callsites](producer-index.md), classified in the design.
* [Full source/test call/override/context/host-fault line inventory](inventory.json):
  102 source/test files hashed,2377 matching rows at initial extraction. Lexical
  owner hints are not an AST claim; quoted guest snippets can also match, so the
  classified tables govern actual edits. Full original lines are retained.
* [Literal semantic and prefix matrix](matrix.md).
* [Old API/negative/output migration inventory](migration-inventory.md).
* [Pinned normative/engine evidence](upstream.json), produced by research.mjs.
* [Preservation audit](audit.json), produced by audit.mjs. This is a source and
  inherited-evidence check, **not** a new212/54 build or runtime validation claim.

The first implementation proposal is A: runtime.ts ErrorData representation,
realm.ts internal per-Realm prototype allocation/factory, and builtins/object.ts
ErrorData classification, one new test/fixture/evidence/gate. No new guest global,
constructor dispatch, failure conversion or old test edit in A. B completes
constructors/guarded dispatch and all semantic-site migrations atomically; C
installs String/Object. Assignment/review is still required for each successor.

Research fetched ECMA-262 edition16 with SHA256
6a28f9423133ed7b7c59a40baf620c2740f12f0bc9c251042f2a85b9cc5ed713,
matching TS-034P. Engine reference is engine262 commit
d553e7b52501fbc47eae981c8d0fa7a5c26d0171. Full URLs/file hashes/line numbers are in
upstream.json. No code is copied into production. Relevant algorithms are
interpreted under edition16; newer Error.isError/stack behavior is excluded.

Tool limitations retained honestly: web fetch could not return the large spec
page and had a raw-GitHub cache miss. The initial Node fetch hit sandbox DNS
ENOTFOUND; approved read-only network retry fetched the pinned sources. Initial
inventory attempt assumed the old TypeScript AST API; installed TS7 exports only
version at its main entry. Replaced it with explicitly labelled line extraction,
without compiler changes or installing another TypeScript. Neither was a compiler
feasibility failure. No engine builds, implementation probe, host eval/vm guest
execution or old evidence regeneration was performed for this design task.

Reproduce local checks from the repository root:

```
node typescript/docs/validation/ts-034h6-p/inventory.mjs
node typescript/docs/validation/ts-034h6-p/audit.mjs
git diff --check
```

Research refresh requires network and writes only this evidence directory.
The audit permits coordinator-owned COORDINATION changes but does not stage them.
No successor or publication is authorized by a passing design audit.
