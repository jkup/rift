# Update expressions

The Script profile supports prefix and postfix `++` and `--` using one update
AST node. Evaluation resolves the target once, reads its value, converts it to a
number, writes the adjusted value, then returns the old value for postfix or the
new value for prefix. The existing reference operations preserve property-key
conversion, getter/setter order, strict/sloppy writes and resource limits.

This follows [ECMA-262 update expressions](https://tc39.es/ecma262/multipage/ecmascript-language-expressions.html#sec-update-expressions).
The C++ implementation in `src/interpreter/expression_evaluator_assignment.cpp`
was consulted. TypeScript shares its existing reference path for identifiers and
members rather than duplicating their update logic. BigInt remains unsupported.

Invalid assignment targets are rejected before execution. Prefix operators can
precede a newline; postfix operators cannot cross one. Automatic semicolon
insertion remains unsupported. The legacy expression evaluator still rejects
Script-only update ASTs.

Tests preserve the old postfix increment traces and add all four forms, coercion,
signed zero, precedence, property access order, strict/sloppy failures and grammar
neighbors. Previously rejected source cases are retained with their new expected
behavior.

Both guest suites pass 327/327, runner30 and probes10 pass. Native acceptance covers 73 entries in the full run plus separate successful retries of the global-environment and update drivers (a Zig cache read failure and two callback adapters respectively). Corrected update coverage is 4787/4787 static with zero dynamic statements. Full tooling passed 289/290; the updated ++42 diagnostic expectation then passed all five parser-audit groups (1318 child runs), accounting for all 290 checks. Original failures are retained; no single all-green full invocation is claimed. Logs: build/update-*.

The fixed C++ fixture selection gains three reported-success files (43 to 46).
See [fixture coverage](legacy-fixture-baseline.md) for the unchanged denominator
and the newly exposed invalid array-length assignment.
