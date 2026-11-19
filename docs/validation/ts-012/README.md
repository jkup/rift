# TS-012 operator integration

Base: `4050de9`, branch `codex/primitive-computed-keys`, 2026-11-01.

Implementation follows the accepted [integration design](../../object-coercion-integration.md),
especially its Observable order section and F1-F4. That design records the
ECMAScript ToPrimitive, ApplyStringOrNumericBinaryOperator and IsLessThan
algorithms, V8 12.0.267 and engine262 d553e7b52501fbc47eae981c8d0fa7a5c26d0171.
No external code was copied.

## Mapping and boundary

Only evaluator operator paths change. Unary +/- converts with number hint after
GetValue. Binary - * / % converts left to primitive/number, then right to
primitive/number. Addition obtains both primitives with default hint before
string selection. Comparisons obtain both primitives with number hint in source
order, including > and <=, before the existing UTF-16/numeric/unordered logic.
Every helper call receives the existing evaluator context and AST location;
throws return unchanged. No ticks or counters were added outside the helper.

The accepted helper, runtime, primitive converters, parser and array APIs are
unchanged. Direct converters, computed keys and array lengths remain
primitive-only. No standard prototypes, symbols, Date/wrappers, proxies or
accessors are added. Synthetic internalGet overrides test abrupt plumbing only.

## Assertions and migration

All previous 158 suite entries remain; operator-coercion is the 159th. Its
runtime-read fixture runs guest methods, verifies receiver and missing argument,
and supplies L/R evaluation plus P/Q conversion traces. Fixed expectations cover
all nine binary operators, unary operators, string selection, mutation of the
second method, replacement of captured operand bindings, inherited methods on
all three object kinds, primitive/fallback returns, located no-method and
both-object failures, exact L/R/P/Q and Get sentinels, UTF-16, NaN, signed zero,
noncoercing predicates/equality/truthiness, nested parsed coercion, realm state,
runaway loops/recursion, monotonic budgets and existing call-finally guarantees.

Migration retains expression counts and original purposes:

- numeric-operators: ten observed Get cases now preserve the sentinel; three
  object kinds times ten hook expressions now assert fixed numeric results and
  one call.
- addition: four observed Get cases now preserve the sentinel; three kinds times
  four hook expressions assert 8, 8, '6x', 'x6' and one call.
- relational: all sixteen observed object/array/function cases preserve the
  sentinel and lookup counts; three kinds times sixteen expressions use fixed
  boolean rows, including unordered string 'x' partners.
- H17: eleven operator expressions become fixed positive results with one Get;
  three direct converters and computed-key rejection still assert zero reads.
  Trace state is checked before operator work, then reset per expression.

All earlier primitive, exact operand/property throw, Number predicate, reference,
array and helper assertions remain. No test entry was removed.

## Validation and initial failures

`node-initial.txt` retains a 157/159 run: the two new/migrated test sections
incorrectly expected block() to return the last expression value. Tests now use
an explicit guest assignment and inspect that binding. An earlier typecheck
caught test setup using a nonexistent proto field; it now uses setPrototypeOf.
These were test authoring failures, not interpreter/backend discrepancies.
The Python Windows Store alias was unavailable during initial editing; edits
were applied with Node. No Python dependency was introduced.

Sandbox attempts cannot access Zig's library directory. Failed native/probe
transcripts are retained separately; full gates are retried with approved access.
Final results and machine-readable transcripts are retained alongside this file.

The initial native coverage also rejected one dynamic adapter in the new test's
intentionally throwing builtin. Its arrow had all four parameters but inferred
`never`; adding the declared `Completion` result matches the existing Builtin
signature and removes the adapter. `operator-coverage.txt` confirms 1220/1220
static statements, zero dynamic functions. No production workaround or pin
change was needed, and coverage rejection was not waived.

Final validation (rebuilt after the test signature correction):

- Typecheck passes; runner 20/20; compiler probes 10/10.
- Node 159/159 and native 159/159, no skips.
- All 18 native static-only build and separate coverage gates pass.
- New operator driver: 1220/1220 static statements, zero dynamic functions.
- Full subprocess records: native-build-results.json, guest-node-results.json,
  guest-native-results.json, probe-results.json. Console transcripts and initial
  failures are also retained here.

No native semantic discrepancy was found. Host-fault cleanup assertions cover
the existing call-finally guarantee only, not general transactional recovery.
This is ordinary conversion in the bounded current object subset, not full
ECMAScript ToPrimitive conformance. Awaiting independent coordinator review.

Console text has trailing whitespace normalized for git diff checks; JSON records preserve full subprocess strings.
