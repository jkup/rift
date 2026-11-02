# TS-031C-A internal return coverage

Implementation base `38d1d9e`, on `codex/test262-classification`. Coordinator-only
tracking successor `2a4cf5f` is preserved. This task implements the accepted
non-emitting prerequisite, not syntax certification or conformance admission.

`auditScriptReturns(source)` lexes the original complete string and uses the
existing Parser in a private mode. Only the function-depth-zero return-context
failure becomes a candidate. The same operand, terminator, block, function and
list productions continue normally. Every other failure blocks coverage and
exposes no candidates. Success checks the actual EOF token against source.length,
including trailing trivia. The temporary AST is discarded; the audit returns
only the specified readonly coverage data. Public parse retains its original
first-error path and partial AST behavior. No evaluator is called by the audit.

## Reproduction

Run from `typescript`, with pinned Zig on PATH and its installation readable:

```powershell
npm run typecheck
npm run test:runner
npm run test:probes
npm run test:guest:node
npm run test:guest:native
npm run test:test262
npm run test:observations
node tools/test262/corpus.integration.mjs C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075
node docs/validation/ts-031c-a/run.mjs C:/Users/jonku/AppData/Local/Temp/rift-ts031a-test262-91c7075
node docs/validation/ts-031c-a/metadata.mjs
node docs/validation/ts-031c-a/preservation.mjs
```

`run.mjs` builds the four original parser modules from Git base38d1d9e in
`build/return-audit/js`. It compares complete public parse results (including
partial bodies, function source slices, diagnostics, locations and guard
provenance) before and after audit. Each source then runs through the additive
internal driver and unchanged parser-observation driver on both hosts. Expected
coverage text is literal; host agreement alone cannot pass. No reference engine
or guest evaluation is used. The pinned five blobs are SHA-1 verified and all
eight original variants retain their bytes and exact strict prefix.

## Matrix mapping

- F01–F22/F26–F29: literal `cases.mjs` entries; F28 has empty and trivia inputs.
  Every complete input asserts sourceUnits and consumedUnits, candidate count,
  exact UTF-16 span and location, order and keyword bytes. Every blocked input
  asserts capability/guard, location, and exact resource count/limit.
- F23/F24: exact S18–S22 pinned variants loaded by `run.mjs`; S20 positions are
  checked against the literal final return keyword in original transformed bytes.
- F25/C08: `metadata.mjs` launches six actual parent/child parser observations
  with null, parse/SyntaxError and runtime/TypeError expected metadata. The audit
  signature accepts only source. All these requests use the identical F01 bytes.
- C01/C06: all A01–A10 controls from the accepted design, including patterns and
  legacy call targets. C02: D01–D06 statement-slot controls. C03: R01–R05.
  C04: P01–P08 strict/directive/duplicate controls. C05: B01–B07 scope controls.
  C07: T01–T14 late blockers and candidates. All 50 are run unchanged, with
  literal existing public capability assertions and separate audit expectations.
- X01–X09: nested function expressions, branch context, surrogate-pair/Unicode
  and CRLF offsets, extra/missing delimiters, unsupported nested function tail,
  global/output effects sentinel, infinite loop syntax and bare return.
- The internal driver checks a fresh Realm's output counter, global binding
  count, original Binding identity and numeric payload after every audit. It
  rejects syntax-error public tags. The host checks no AST field is exposed,
  blocked results expose no candidates, and parser observations never evaluate
  a body. X07 would change the sentinel/output if executed; X08 would loop.

## Retained failed attempts

`native.log` and `native-build-failed.json` retain the first sandboxed native
build: installed Zig could not find/read its installation directory. All
coverage reports were static; linking failed. `native-approved.log` records the
retry with installation access. `host.log` retains sandbox EPERM rename failures;
`host-approved.log` is the retry without altering any controls.

`draft-cases.mjs` retains preflight hand-counting mistakes in newly authored
location expectations, discovered before native execution: X01 second return
starts30 (not29), X02 second return25 (not24), X07 return47 (not45), and F12 EOF
column24 (23 source units, not22). These correct source arithmetic; none changes
a frozen span/location expectation or capability/count oracle. No production
workaround, lowered assertion, compiler discrepancy or semantic reduction was
needed. A Python launcher was unavailable and an initial root-level npm command
had no typecheck script; implementation and checks used Node and the TypeScript
package directory instead.

## Limits

Complete means coverage of the existing subset plus the recorded return context
exception, not acceptance as ECMAScript Script. All five certification codes
remain non-emitting, all profiles blocked, and the host classifier/protocol,
strictness, ASI and supported syntax remain unchanged. Windows x64 is the only
native platform tested. This is a review handoff; no emission successor or main
merge is authorized by this milestone.

## Measured checks (2026-11-02)

| Check | Result | Evidence |
|---|---|---|
| Typecheck | pass | typecheck.log |
| Probe runner | 20/20 | runner.log |
| Compiler probes | 10/10, both lanes and static coverage | probes.log, probe-results.json |
| Existing guest cases | Node212/212, native212/212, no skips | node.log, native-approved.log, guest-*-results.json |
| Static-only and separate coverage gates | 36/36; all35 old entries plus internal audit1170/1170, zero dynamic | native-build-results.json, preservation.json |
| Internal matrix | 94 inputs ×2 lanes, exact coverage outputs | matrix.log, results.json |
| Public preservation | 94 full Node ParseResult comparisons against38d1d9e, before/after audit;188 Node/native public parser observations | results.json |
| Metadata independence | 6/6 actual parent/child observations and literal source-only audit checks | metadata.log, metadata-results.json |
| Host controls | 72/72 | host-approved.log |
| Real observation integration | 16/16 | observations.log |
| Pinned corpus planning | 4/4, zero conformance execution/pass | corpus.log |
| Existing source/record preservation | 212 exact old guest records per lane,35 old gates, protected sources/tests/tools/config/fixtures unchanged | preservation.log, preservation.json |

`preservation-initial.log` retains a validation-script startup error: Node
process.chdir requires a path string, not a URL. Conversion with fileURLToPath
fixed the evidence script; the assertions were unchanged. Native and Node matrix
outputs agreed on their first complete run. No compiler or runtime reduction was
necessary. Full public AST equality is checked under Node; native public
preservation is checked through all guest expectations and exact structured
parser observations, not a claim of native AST serialization.

Trailing whitespace was normalized in native.log and typecheck.log for Git whitespace checks; native-build-failed.json retains the complete original subprocess strings.
