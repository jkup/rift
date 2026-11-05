# TS-035D3 candidate evidence

Base: `88ba287`; sole implementation writer, Windows x64, pinned Node 26.13.0,
scriptc 0.4.7 and Zig 0.17.0. Candidate awaits actual and independent second
acceptance. No publication or successor work is authorized by this handoff.

## Implementation

Only `src/parser.ts` and `src/script-declarations.ts` change production behavior.
The new source-only API selects the private `bounded-parameter-audit` purpose.
It bypasses only the duplicate-simple-formal failure, retains every parameter,
and shares the full lexer/parser/EOF path with bounded planning. The existing
collector runs once, reuses D1's unchanged audit veto, rejects block pairs, then
scans existing function formals. Any sloppy duplicate vetoes all strict pairs.
Candidates are detached, first/repeated occurrences sorted by repeated then first
offset, with complete function source bounds. No new rejection code, executable
result, preparation call, observation path, codec or runtime consumer exists.

## Frozen assertions

`frozen.json` copies the accepted 77 source rows and 30 numeric candidate pairs
from D3-P. It incorporates all 26 exact grammar/resource diagnostics from the
accepted distinct-formal controls. Six ordinary API outputs come from the
accepted `current-audit.json`; retained-node Map associations were captured from
the existing pre-D3 Node build before rebuilding. `freeze.mjs` is a one-shot
baseline capture and deliberately refuses a build exposing the new API.

`blocked-diagnostics.json` adds exact diagnostic expectations for the other 23
blocked rows. `freeze-diagnostics.mjs` uses explicit editorial source anchors,
not the parser or target audit. It freezes repeated-formal, delete, catch,
block-function and lexical-conflict locations and messages.

`validate.mjs` compares complete ordinary results and separately serialized node
associations on every row, requires exact eligible/none shapes and blocked keys,
and compares all candidate fields and all blocked diagnostics. It checks the
whole S21 Git blob and exact strict-prefix transformation, without executing its
body. The source/depth boundary rows preserve original resource payloads.
Both fixtures are read through file I/O in both compiled lanes; `b.js` retains
non-BMP text and CRLF through directory-local `.gitattributes`. The driver checks
both runtime source orders, repeated calls, independent first sites across triple
pairs, candidate/site/location mutation isolation, and fresh ordinary results
after the audits. No fixture body is executed.

## Reproduction and preservation

From `typescript/`, with the pinned Zig installation on PATH and library access,
set `NODE_OPTIONS` to `--import ./docs/validation/ts-035d3/evidence-io.mjs`
(the validation commands and their Node children run from `typescript/`):

```
node docs/validation/ts-035d3/run.mjs
node docs/validation/ts-035d3/preserve.mjs
```

The full run rebuilds both lanes, retains the original 212 guest records and all
65 old native gates, and adds one static-only/separate zero-dynamic gate. The
required-suite wrapper reruns D1/D2 source, wire and extra controls, A/B/C,
H1-H7/M/E4/inherited controls, A21, C transport/host, typecheck, runner, host,
observations and probes. It backs up all historical validation directories
recursively, saves changed replay evidence only under D3 `inherited/`, and
restores exact previous bytes in `finally`. No old test is edited.

`protected-baseline.json` records 4,748 protected tracked paths before replay;
`preserve.mjs` verifies every byte, ownership, the exact additive native gate,
unchanged guest expectations, independently parsed static gates, all selected
33 files/60 blocked variants and the new source-only call graph. Coordinator
changes to COORDINATION are excluded and are not owned by this candidate.

## Retained attempts and limits

- `gate-path-attempt.json`: Zig absent from PATH.
- `gate-sandbox-attempt.json`: sandbox could not resolve Zig installation files.
  The approved library-access run succeeded; no compiler workaround was used.
- The first full pass started before final test-strengthening and a literal
  structural-purpose predicate cleanup. A final clean-source run supersedes it;
  first-pass outputs are retained separately and are not final-build evidence.
- `first-pass/required-suite-results.json` and `required.log`: Windows
  `UNKNOWN/open` while updating the old D2 matrix evidence. Recursive restoration
  was verified against all 4,748 protected hashes. The final run uses the
  established D2 evidence-write helper, copied locally with retry logging; only
  `UNKNOWN/open` is retried (at most 20 attempts, 50 ms apart). No assertion,
  process failure, compiler failure or semantic test is retried by this helper.

- `linker-attempt/` retains the final-source full sweep: 65 builds passed;
  global-declarations failed at Zig's `ntdll.lib` cache read with
  `file_open FileNotFound ... ntdll.def`. Its coverage was fully static.
  A separate unchanged raw build exited 0, followed by a separate coverage run
  (4,259/4,259 static); see `linker-retry-*.log` and actual exit-code files.
  The failed sweep record is deliberately never rewritten or relabeled PASS.
  `verify-gates.mjs` checks the original 65 passes plus this separate retry,
  using actual build exits and the pinned complete static coverage format.
  `continue.mjs` resumes remaining suites without recompiling unchanged passes.
- Automatic approval review rejected the initial combined retry-and-summary
  update proposal as potentially substituting synthetic success. That command
  never ran. The approved alternative recorded raw process results separately;
  no failed record was overwritten and no synthetic execution result was used
  to accept the retry. This resolved the approval concern without an engine or
  test change.

## Final candidate measurements

All results below are fresh on the final source hashes in
`run-source-hashes.json`, except the explicitly retained pre-D3 ordinary
expectations and earlier failed/partial attempts described above.

- Node and native guest suites: 212/212 each; original names and expected records
  unchanged.
- Native compilation: all 65 old gates plus the new gate have successful actual
  static-only builds and separately checked zero-dynamic coverage. The final
  sweep passed 65 gates; its one linker failure was resolved by the separately
  recorded unchanged raw build/coverage retry. The new D3 driver is 960/960 static.
  `native-build-results.json` retains the sweep failure; consult
  `native-build-summary.json`, `verify-gates.mjs` and the raw retry logs together.
- D3: 154 runtime-read runs (77 rows per host), 30 literal candidate pairs,
  26 exact grammar/resource diagnostics, 23 additional exact veto diagnostics,
  six complete ordinary outputs and retained-node associations per row.
- D1 unchanged: 124 matrix runs and 24 supplemental controls. D2 unchanged:
  360 source runs, 64 real wire rows through both decoders, 14 extra controls.
  The five suites were additionally rerun using `capture-D1-D2.mjs` to save
  explicit fresh `D1-*-results.json` / `D2-*-results.json` even when their
  bytes equal historical results. The initial changed-files-only archival
  wrapper had omitted equal outputs; assertions and production stayed unchanged.
  The earlier partial D2 failure output is retained in `first-pass/`.
  `required-suites.mjs` now always captures these five raw result files.
- All 31 required stages pass: A/B/C, H1-H7/M/E4/inherited/A21, C transport
  172 and C host 21, typecheck, runner 20, host 73, observations 22 and probes 10.
  Full raw outputs are in `required-suite-results.json`; replay records are
  archived under `inherited/` and original historical files restored recursively.
- Preservation: 4,748 protected tracked paths, including 183 old test files,
  match original bytes. All 33 selected files/60 variants remain blocked.
  Production changes are exactly the two assigned files; ordinary preparation,
  legacy return fallback, codecs, registry, manifest, pins and C++ are unchanged.

`completion.json` honestly records the stopped full sweep; `continuation.json`
records the successful remaining guest/matrix/required-suite stages after the
separate retry. No prior failed result is relabeled as a pass. The initial
standalone gate (949 statements before driver strengthening), first-pass outputs,
Zig access failures, Windows evidence-write failure and rejected approval proposal
remain retained.

This is bounded Windows evidence, not standards conformance, parameter execution
or emission. Candidate stops for actual and independent second review; no
publication, successor or D4 work has been started.
