# Suspended for-loop var initializers

A single var initializer runs in a sequence above the pending loop frame. The
ordinary declaration receiver stores its resumed value before the loop starts.
This preserves hoisting, existing binding values during suspension and shared
var bindings across iterations without adding a separate initialization path.

Tests cover labels, closures, delegation, one-time initialization, later test and
update suspension, abrupt cleanup and async bodies. Cross-Realm resumption uses
current budgets. The original rejected initializer source now suspends normally.
Multiple declarations and lexical initializers remain separate boundaries.

See [ECMA-262 for evaluation](https://262.ecma-international.org/16.0/#sec-for-statement-runtime-semantics-labelledevaluation).
Focused evidence stays under ignored build/generator-for-var-* paths pending
combined canonical acceptance.
