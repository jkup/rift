# TS-010 validation — 2026-11-01

Implemented primitive <, >, <= and >= on codex/primitive-computed-keys, base
b87b3e5. Awaiting coordinator review. Source research and algorithm rationale are
in ../../architecture-decisions.md (TS-010 section).

## Gates

- `npm run typecheck`: pass.
- `npm run test:runner`: 20/20, no skips.
- `npm run test:probes`: 10/10, both hosts and separate static coverage.
- `npm run test:guest:node`: rebuilt, 157/157, no skips.
- `npm run test:guest:native`: rebuilt, 157/157, no skips.
- All 16 native entry points passed static-only builds and separate fail-closed
  static coverage. CLI 1059/1059, relational driver 1161/1161.

Final logs and full JSON subprocess records are retained here. Initial sandbox
native/probe builds could not locate the installed Zig libraries; authorized
escalation with the installed Zig directory on PATH resolved the failures.
Those failed transcripts are retained separately. No compiler workaround,
backend discrepancy, weakened gate or pin change was needed. The first Node run
failed two test assertions because the new tests read block completion values;
blocks intentionally discard expression statement results. Tests now assign and
inspect guest bindings. The failure JSON remains here. A local Python launcher
was unavailable during file preparation; Node was used instead.

## Assertions and migration inventory

Before editing, searched test/, tools/ and scoped docs for relational boundaries
and the old numeric-operands error. The two superseded rejection assertions in
numeric-operators.ts (`'1' < 2`, `true >= 0`) now assert normal boolean true via
bindings. Neither was deleted. There were no generated relational rejection
cases in run-guests.mjs or cases.json. All 156 previous suite entries remain;
the compiled relational driver adds one entry, with many fixed expectations.

The driver runs real parsed guest expressions with fixed <, >, <=, >= rows:
all primitive kinds on both sides, two-string versus numeric selection, numeric
string grammar, equal values, signed zero, NaN either side, infinities and finite
extremes. Injected UTF-16 strings test empty/equal/prefix/NUL, lone surrogates,
surrogate pairs and supplementary-vs-BMP order. Expected results are constants,
not calculated using the comparison implementation or a host JS guest evaluator.
Runtime-read closure source proves one-time LR effects for each operator.
Call/property sentinel records preserve identity; left errors skip RHS, right
errors beat unsupported left conversion. Ordinary/array/function operands with
number/string partners reject with source locations, zero hook reads and calls.
Existing numeric, budget, realm and equality coverage remains; additional strict
equality and precedence assertions guard this boundary.

## Limits

Only current primitive Values are supported. Object-to-primitive conversion
(number hint), symbols, BigInt, boxing and broader grammar remain excluded.
No equality/logic/addition behavior, parser, conversion APIs, Array APIs, C++,
pins, Claude outputs or COORDINATION.md changed. Only Windows x64 and the pinned
Node/static-native toolchain were exercised. This is bounded semantic evidence,
not a claim of complete ECMAScript conformance. No main merge or successor work.
