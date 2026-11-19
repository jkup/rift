# TS-035D1 non-emitting block-function audit

Base `dbb1cf1`. Candidate implementation; actual and second independent acceptance
remain the coordinator's responsibility. No publication or successor work.

The only production edits are `src/parser.ts` and `src/script-declarations.ts`.
The parser shares its existing full lexical/structural path between plans and
`auditBoundedScriptBlockFunctions(source)`, checking both EOF offsets after
trailing trivia. The collector's existing traversal and node associations are
unchanged. Ordinary projection retains its interleaved catch/conflict precedence.
The audit additionally checks all catch scopes, every lexical duplicate group,
lexical/var intersections and formal/lexical intersections. Only strict ordinary
block function/function pairs survive. Sites and locations are copied per pair;
candidates sort by second binding start, then first binding start.

This evidence is not a preparation input, executable record, syntax-error
emission or conformance certificate. Parameters retain the ordinary immediate
duplicate rejection. Switch duplicates and mixed conflicts remain vetoes. D2's
legacy-return fallback information-flow problem remains explicitly unresolved;
X06 is still blocked and no fallback mechanism is added.

## Frozen inputs and assertions

Before production edits, `freeze.mjs` captured all 62 design sources and ordinary
legacy/return-audit/declaration/bounded-plan outputs in `frozen.json`, including
the retained design audit hash and original binding offsets. `expected.mjs`
records literal scope/binding spans for eligible rows. `validate.mjs` compares
both structural equality and JSON serialization of ordinary outputs, exact
candidate evidence, consumed/source lengths, reasons, diagnostics and rejection
codes. B15 preserves its ordinary first duplicate while the audit reports the
later catch restriction. B16 and B21 report the later non-target duplicate.

All parameter rows remain blocked, including L06's early duplicate-parameter
failure (not the future parameter continuation's depth129 result). L02/L05 retain
source count100001/limit100000; L04 retains depth129/limit128. L01 and L03 consume
all trailing spaces and all 127 extra nested blocks respectively. Whole pinned
S21 and S22 retain comments, metadata and `$DONOTEVALUATE()` text without running
guest bodies.

Both exact runtime fixtures are read through `readFileSync(process.argv[2])` in
each host, as are all other matrix sources. R0 has 53 units, scope[14,53), alpha
bindings[24,29)/[43,48), selected location1:44. R1 has 69 units, scope[31,68), beta
bindings[41,45)/[59,63), selected location1:60. Additional nonconflicting neighbors
assert R0 Script-owned mode and R1 function-owned/inherited block mode.

The new driver also mutates one triple's first site/location, checks that its
other pair remains detached, then checks a fresh audit. `extra-controls.mjs`
adds twelve literal triple/order/global-veto/mode controls in each host.

## Validation and preservation

`tools/build-native.mjs` adds exactly one gate. Each gate requires static-only
build plus separately parsed zero-dynamic coverage. `finish.mjs` runs native
guests, both-host 62-row and supplemental matrices, `required-suites.mjs`, and
`preserve.mjs`. The required runner replays C's real transport and host controls,
B, H7, H1-H6, inherited parser/declaration/execution controls, both A serializer
lanes, A21, typecheck, runner20, host73, observations22 and probes10. It snapshots
all historical validation directories recursively, captures changed evidence
under this directory's `inherited/`, then restores every prior byte in `finally`.

`preserve.mjs` requires all 212 old guest records in each host, the original 63
gates plus one, zero old-test edits, only owned changed/untracked paths, unchanged
historical evidence, and all 60 selected corpus variants still blocked.
COORDINATION is excluded because its writer is the coordinator.

The initial sandboxed native attempt hit the documented Zig installation access
error (`unable to find zig installation directory ... FileNotFound`) and was
stopped after three failed gates. The interrupted redirected stdout log is empty;
`native-sandbox-attempt.json` summarizes the command/tool transcript's linker
stderr and capture limitation. The authorized retry uses the
same pinned compiler and installed Zig with access to its libraries. No compiler
workaround or pin change was made.

`extra-offset-attempt.json` retains the supplemental nested-order assertion
failure. Independently counting the literal function binding characters showed
39/54 and 24/72, correcting the hand-counted 38/53 and 24/70 expectation; no
production change resulted. Original 62-row expectations remain unchanged.

`transport-io-attempt/` retains the first C integration failure: Windows returned
`UNKNOWN`/errno -4094 opening its evidence JSON for writing in the Node/alpha
group. The other three groups passed. Historical outputs were restored by the
runner. The retry reuses unchanged binaries/tests, does not read the actively
written evidence file, and resumes only required suites/preservation; the already
passing native guest and audit matrices are not repeated. No semantic assertion,
transport rule or protected test was altered to address the I/O failure.

Final measured outcomes are recorded in `completion.json`, `matrix-results.json`,
`extra-results.json`, `native-build-results.json`, `required-suite-results.json`
and `preservation.json`; missing or failed records mean acceptance is incomplete.

Final producer run passed: 212/212 guest records in each host; all 64 static-only
builds and separate zero-dynamic coverage reports (new driver 876/876 statements);
124 runtime matrix runs and 24 supplemental runs; all 26 required suite stages,
including C's 172 real transport cases/21 host tests, B/H1–H7 and inherited
replays, both A serializer lanes/A21, typecheck, runner20, host73, observations22
and probes10. Preservation verified 4,598 protected tracked paths, 176 unchanged
old test paths and all60blocked. The final retry passed without production or
old-test changes. The work stops here for actual and second independent review.
