# TS-035E3e implementation evidence

Base: `12859d45c30ef274c822969f36de5c237755cbfa`. Accepted design: `d3ec094`.
The two installed host files match the accepted proposal manifest exactly:

| File | SHA256 |
|---|---|
| tools/test262/script-host-services.mjs | 7249222abfb858a4f6f5448722e80bb03335585157090ad6dd1201b03a768636 |
| tools/test262/script-host-services.test.mjs | 8553a16b0c7557428f826cefeb5235d8d0af7929b17f5bad4317864c735b6bc0 |

Run `node typescript/docs/validation/ts-035e3e/run.mjs` from the repository.
This writes only this new evidence directory. `stages.json` retains commands,
exit statuses, stdout and stderr for all six passing stages:

1. Accepted verifier in implemented mode: 9,198 baseline identities, 98 indexed
   prior evidence files, original design/build/request references, two additions
   and zero replacements.
2. Installed full test: 20 independent complete descriptors, 52 actual source
   hashes, canonical order, freezing, exact export/arity and ten boundary errors.
3. Twelve mutants generated from the installed module, all 240 calls completed;
   every mutant rejected by the original frozen literal oracle. Sixteen mutations
   of the original frozen identity witness remain detectable despite correct
   candidate digests. These are data-oracle controls, not provenance verification.
4. Byte-identical accepted inert construction reduction reading current installed
   source: 20 traces, fresh attempts/allocations, 100 record/Realm identity controls
   and six completed mutants rejected. It uses inert stubs and does not execute
   actual Realm bootstrap, parser, evaluator or guest source.
5. Additional controls: 40 calls across all 20 variants; 2,994 recursively frozen
   objects with no cross-call or cross-variant references shared, including nested
   source records, realm arrays, global arrays and tuples. Eight invalid argument
   cases preserve error priority with zero coercion getter reads or hook calls.
6. Accepted verifier repeated after execution. A complete recursive before/after
   comparison additionally preserves all 100 prior E3e-P files, including its
   manifest and verifier. Original literals and evidence were never regenerated.

`installed-mutants.mjs` preserves the accepted operators and comparison logic;
its read paths select installed source and frozen prior fixtures, while its write
paths select this directory. It reuses the frozen identity witness rather than
recreating historical evidence from the current host. `construction-probe.mjs`
is copied without any byte change. No setup failures occurred in this run.

Import/caller review (`rg --no-ignore` across src, test and tools) found the new
offline test as the only production-tree consumer. The descriptor imports only
Node crypto, exports only describeScriptHostServices, and has no engine import,
I/O, callback, factory or registration hook. Evidence controls are additional
offline callers. No existing importer, policy closure or producer changed.

This is historical descriptive data only: currentSourceVerified=false,
buildCertification=unavailable, authority=none. E3c executionBinding remains null;
all 60 slots remain blocked through unchanged source/policy bytes. No new corpus
execution is claimed. The accepted 212 records in each lane and 71 static gates
are inherited, not rerun. No native build, compiler probe, transport test or full
historical suite was run. Root-owned COORDINATION changes are excluded from this
implementation commit. Await coordinator actual/independent/final second review;
no publication or successor is authorized by this handoff.
