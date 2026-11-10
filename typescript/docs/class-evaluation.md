# Shared class evaluation steps

Class evaluation now separates constructor/prototype creation from method
definition. The ordinary evaluator still owns scope entry, heritage/key order,
inner-name initialization and unconditional restoration of the outer frame.
The same helpers can serve a continuation without duplicating those operations.

Tests cover heritage/key TDZ, closures retaining the inner class binding after
success or failure, strictness and outer-scope restoration, superclass prototype
getters, computed-key order, names/accessors, home objects, default construction,
error Realms and resource budgets. Class suspension remains a separate change.

See [ECMA-262 ClassDefinitionEvaluation](https://262.ecma-international.org/16.0/#sec-runtime-semantics-classdefinitionevaluation).
Evidence stays under ignored build/class-evaluation-* paths pending combined
canonical acceptance.
