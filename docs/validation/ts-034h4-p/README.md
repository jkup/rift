# TS-034H4-P evidence

Design only, baseline `677aa31802e498e2430066505415dc7b27c1c221` on
`codex/test262-classification`, 2026-11-04. Accepted H3 is included. The sole
writer owns this directory, `docs/harness-nonstrict.md` and the H4-P task status.
Coordinator changes to COORDINATION are explicitly excluded from preservation
and were not edited or staged here.

## Reproduce

From repository root:

```text
node typescript/docs/validation/ts-034h4-p/audit.mjs
node --check typescript/docs/validation/ts-034h4-p/audit.mjs
node --check typescript/docs/validation/ts-034h4-p/research.mjs
git diff --check
```

The offline audit passes: 3460 protected tracked files; all45 production source
files inventoried; 387 historical test/tool/evidence files with relevant mentions;
12 future traces and190 fresh/seven-seeded prefixes; inherited212 records/lane,
52 static gates and60 blocked variants preserved. Full protected git blob tree,
line-numbered source/test hits and hashes, unchanged inherited matrix hashes and
future source hashes live in `audit.json`. Counts describe the stated baseline,
not an implementation pass rate. The two input files are actual future guest
sources, not executed in this task.

`prefixes.json` is hand-derived from source control flow and the explicitly
proposed extra non-strict FDI lexical-allocation tick. No trace was inferred from
Rift output. Its audit checks literal shape/coordinate/effect bounds and total,
not the correctness of future execution. Semantic implementation acceptance must
assert every prefix independently in both freshly built lanes; disagreement
requires review, never regeneration from observed output.

## Findings requiring review

The tentative six-file scope is insufficient. The proposed nine existing files
are script-execution-internal, script-record, parser, script-declarations,
script-environment, global-environment, runtime, delete-reference and
script-global-declarations. A new script-reference file and realm edit are
unnecessary. The global declaration helper contains a separate strict guard;
runtime property Set and delete throw unconditionally; the var initializer has a
second binding-resolution callsite; frame/callable strictness is hard-coded;
non-strict FDI needs its own lexical environment. Each has an explicit API and
callsite proposal in the design. This is a requested interface amendment for the
future task, not permission to edit production during H4-P.

All old negative assertions can remain unchanged by adding a distinct bounded
preparation/parser path and retaining strict host wrappers. In particular:

| Existing control | Required disposition |
|---|---|
| `test/script-record.ts` lines59,121: empty / `var x;` strict preparation | Preserve profile-rejected; add bounded positive separately |
| `test/harness-catch.ts` line77: `try{}catch(e){}` strict preparation | Preserve blocked; bounded positive separately |
| `test/script-global-declarations.ts` lines276–277 | Preserve profile-first and strict-plan host guard diagnostics |
| `test/delete-operator.ts` lines136–141 and1397 | Preserve parser diagnostics and legacy host-AST guard |
| `fixtures/script-declarations/literal.json` parse.delete-identifier control | Preserve old planner behavior |
| `test/script-function-materialization.ts` lines73,88; restricted-properties/bootstrap tests | Preserve strict metadata, own-property absence, intrinsic flags/Realm identity |
| All historical executable replay scripts | Preserve whole bytes; use new audit against H4 baseline for implementation migrations |

No old-test edit is proposed. Public admission and compiler/toolchain/pins/history
are unchanged. No implementation, native build, guest/reference-engine execution,
typechecking or full suite rerun was needed or claimed for this documentation task.

## Research and limitations

`research.mjs` retrieves exact ECMA-262 edition16 and engine262 revision
`d553e7b52501fbc47eae981c8d0fa7a5c26d0171`, preserving source lines, hashes and MIT
license in `upstream.json`. It writes only this directory. The initial sandboxed
retrieval failed DNS with `getaddrinfo ENOTFOUND 262.ecma-international.org`, Node
v26.13.0, exit1. The authorized network retry succeeded exit0; edition hash matches
prior evidence. Web-reader access separately failed on document-size/cache limits;
the retained direct retrieval supplied actual source inspection. No engine source
was executed or copied into production. Offline checks validate retained engine
source hashes; refreshing the edition requires the explicit research command.

Strict/sloppy/callee/caller, descriptors, references, lexical separation,
cross-Realm, reentrancy, abrupt identity and cleanup expectations are future
requirements. Arguments objects, duplicate formals, eval/with/Annex B and the
other explicit exclusions remain unsupported before record creation. This design
does not make the pinned assert.js/sta.js executable or remove their H5/H6 blockers.

Stop for actual coordinator and independent second review. No successor,
implementation, publication, branch switch or main merge was performed.
