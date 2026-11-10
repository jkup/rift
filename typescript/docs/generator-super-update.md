# Suspended super updates

Computed super updates retain actual this through key suspension, then reuse the
ordinary update helper. That helper reads once, performs numeric conversion,
writes once and returns the appropriate prefix or postfix result. Both accesses
share the converted key and captured super base.

Tests cover all four update forms, negative zero, string conversion, accessor
order, borrowed receivers, prototype and descriptor changes, strict failures,
async methods/arrows, abrupt cleanup, error Realms and current-session limits.
The original rejected super update now executes.

See [ECMA-262 update evaluation](https://262.ecma-international.org/16.0/#sec-update-expressions)
and [SuperProperty](https://262.ecma-international.org/16.0/#sec-super-keyword-runtime-semantics-evaluation).
Super deletion remains separate. Evidence stays under ignored
build/generator-super-update-* paths pending combined canonical acceptance.
