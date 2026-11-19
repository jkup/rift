# Suspended lexical for-loop initializers

The loop environment is created before its initializer executes. A retained
declaration sequence uses the ordinary initialization receiver in that environment;
the loop frame stays below it and performs normal per-iteration preparation only
after initialization completes. The sequence's declaration node is an execution
adapter for the existing binding, not a new declaration or scope.

Tests distinguish the initializer's captured binding from later let iterations,
check TDZ before and during suspension, and cover const, labels, delegation and
abrupt restoration. Async bodies and cross-Realm current-session limits also run.
The historical rejected lexical initializer inputs now suspend normally.

See [ECMA-262 for evaluation](https://262.ecma-international.org/16.0/#sec-for-statement-runtime-semantics-labelledevaluation)
and CreatePerIterationEnvironment. Evidence stays under ignored
build/generator-for-binding-* paths pending combined canonical acceptance.
