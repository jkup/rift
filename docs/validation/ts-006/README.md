# TS-006 validation (2026-11-01)

Scope: array literal AST, parser and evaluator only, using existing GuestArray
storage and evaluator budget. Base: b33af7039cee2617950ab1b936afcfedc836290b.
The fixture is read at runtime by the compiled host driver and CLI; guest source
is never executed by host eval or compiled as an engine substitute.

## Matrix

- `test/fixtures/array-literals.js`: empty, one/two holes, trailing separator and
  trailing hole; explicit undefined/null; repeated allocation and shared object;
  assignment, conditional, function, object and nested array elements; ordered
  effects; growth and truncation via guest assignments. Fixed expected stdout
  lives in cases.json. This is also a small runnable CLI demonstration.
- `test/array-literals.ts`: inspect those actual guest results for GuestArray
  class, exact length and flags, key order, absent holes, present undefined/null,
  W/E/C element descriptors, null prototype, identity and realm isolation.
  Parsed builtin calls prove exact abrupt-record identity, retained earlier
  effects, skipped later effects and no partially initialized binding.
- Budget assertions: three holes require exactly five ticks (statement + array
  + three slots), success at five and failure at four; nested arrays share ticks;
  present slots are charged before their expressions; 50,000 holes fail after
  exactly 21 ticks under a limit of 20. The CLI loop case also exhausts its
  standard budget. No wall-time assertions or relaxed timeout handling.
- Generated expected-result cases: EOF, missing separator/wrong delimiter,
  spread, binding/assignment destructuring, comma operator, unsupported numeric
  keys, 200-level nesting rejection, 30-level success, guest throw and missing
  binding with exact locations/effects. All prior 137 cases are retained;
  15 additions bring each lane to 152 cases. No skips.

## Reproduction and evidence

Run from typescript/: `npm run typecheck`, `npm run test:runner`,
`npm run test:probes`, `npm run test:guest:node`, `npm run test:guest:native`.
Both guest commands rebuild. Native build enforces static-only compilation plus
separate fail-closed coverage for all twelve entry points. Runner subprocess
records distinguish errors, crashes, timeouts and output/diagnostic failures.

Windows linking requires installed Zig 0.17.0 on command-local PATH and access to
its installation libraries. `native-sandbox-failure.txt` retains the initial
sandbox linker failure; it is an environment failure, not a skipped test.
The first Node run exposed a test expectation typo (missing identifier starts at
column 32, not 31); corrected to the verified source coordinate before final runs.
No semantic or compiler workaround was required. Final transcripts and JSON
subprocess results are retained beside this file.

Source-backed design and deliberate final-length update rationale are in the
TS-006 section of ../../architecture-decisions.md. No runtime/conversion API,
pins, C++, companion output or coordinator file changed. No standard Array API,
map installation, spread, destructuring, comma operator or numeric key coercion.
Initial array prototype remains null. Awaiting coordinator review; no successor
work started.

Final results: typecheck PASS; runner 20/20; probes 10/10; rebuilt Node and
native guest suites 152/152 each, no skips/failures/timeouts/crashes. All twelve
native static gates PASS, including array-literals 1034/1034 statements (100%,
zero dynamic). The evidence JSON records exact coverage for every entry point.
