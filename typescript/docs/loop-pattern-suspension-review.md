# Loop pattern suspension review

TS-558 establishes nine independent Node reference programs in
`build/loop-pattern-suspension-review/`. No new Rift support is claimed.

The controls distinguish per-iteration lexical bindings from shared var bindings,
for-in destructuring of an empty property name, retained assignment target bases,
and initialization suspended before the loop body. Nested iterators close from
inner to outer. When the inner close changes an injected return into a throw,
an outer close failure preserves that throw. Await rejection and async-generator
return also require the outer async close to finish before completion is observed.

The current runtime has two continuation entry points for iteration values:
the synchronous iterator/enumerator branch in `#runContinuation` and the awaited
iterator-result handler. Both call synchronous `#initializeForEach` and then push
the body sequence. They must share the new scheduling path; changing just one
would leave for-await behavior inconsistent.

For lexical heads, `ExecutableScript.activateLoop` already creates all bound names
in a fresh environment and leaves pattern bindings uninitialized. Retain that
activation before scheduling pattern initialization. Var and assignment heads use
existing references. Keep the outer loop frame below the body and pattern frames:
the pattern must finish before the body starts, and a failure must unwind the
pattern's inner iterators before reaching the loop's outer iterator.

Preserve the ordinary synchronous path for non-suspending patterns. Admission
should traverse the loop-head pattern only after both continuation entry points
handle suspension. Function parameter grammar remains a separate boundary.

Before acceptance, add focused tests for TDZ, const assignment, continue/break and
labels, once-only iteration/default/key effects, injected throw/return, iterator
close precedence, cross-session defining Realm and caller budgets, and fatal
resource cleanup. Require original fixtures, complete Node regression, both-host
semantics, static-only/zero-dynamic gates and final predecessor reconciliation.
