# Suspended var declaration lists

A list containing suspension runs as ordered single-declaration steps in the
existing environment. These execution nodes reuse ordinary binding resolution,
initialization and name inference. Hoisting remains owned by the original plan;
the retained sequence adds no bindings or scope.

For-loop initializers use the same sequence above the pending loop. Later
declarations start only after earlier initializers finish, and abrupt resumption
discards the remaining steps without undoing completed writes.

Tests cover duplicate names, absent initializers, hoisting, closures, one-time
effects, loops, delegation, abrupt cleanup, async bodies and current-session
limits. Historical list rejections now execute. See [ECMA-262 variable statements](https://262.ecma-international.org/16.0/#sec-variable-statement-runtime-semantics-evaluation).
Evidence stays under ignored build/generator-var-list-* paths pending combined
canonical acceptance.
