# Shared pattern suspension review

TS-555 is a design review. TS-551's canonical run remains separate; this review
does not change its frozen source or admit new grammar.

The catch continuation retains array/object traversal, defaults, computed keys,
iterator obligations and the binding environment. Its leaf operation initializes
an existing catch binding. General patterns also need assignment references and
an expression result. Reusing only parser admission would reach the synchronous
`#initializePattern` path and is insufficient.

The current synchronous `#objectPattern` obtains a target reference before reading
the source property; `#patternElement` obtains it before advancing the
iterator. Preserve these boundaries when splitting execution into frames. A
reference must survive a suspended default even if the variable used to obtain
its base object changes. Object rest similarly evaluates its target before
copying properties. Destructuring assignment returns the original input value.
These requirements follow the ECMAScript 2025
[destructuring assignment algorithms](https://tc39.es/ecma262/2025/multipage/ecmascript-language-expressions.html#sec-destructuring-assignment).

Lexical declarations must retain their precreated environment and TDZ; `var`
uses assignment to existing bindings. Loop bindings additionally need a fresh
environment each iteration, with initialization completed before the body starts.
See [binding initialization](https://tc39.es/ecma262/2025/multipage/ecmascript-language-statements-and-declarations.html#sec-destructuring-binding-patterns).

Eleven independent Node references pass in
`build/shared-pattern-suspension-review/`. Six preserve the earlier unsupported
boundary controls. Five add reference capture across suspension, a target key
that suspends before iterator advancement, rest-target ordering, nested loop
iterator close order, and TDZ observed through a closure across resumption.
They establish expected behavior, not Rift support.

Implement in three reviewable steps after the catch milestone:

1. Extend pattern frames with explicit initialization/assignment destinations,
   retained references and completion handling. Admit declaration defaults/keys
   only when this path covers lexical and var declarations, including classic
   for initializers. Preserve catch tests and default inferred names.
2. Route assignment patterns through the continuation, including suspended
   targets and nested expression contexts. Preserve the original RHS and resume
   the surrounding expression after initialization, without replaying getters.
3. Schedule for-in/of/await-of binding initialization before the loop body while
   retaining outer iterator cleanup and per-iteration environments. Test injected
   return/throw, rejected await and close-error precedence at each nesting level.

Each step requires both-host semantics, static-only/zero-dynamic gates, defining
Realm and current-caller budgets, cleanup after resource exhaustion, and full
canonical acceptance. Keep remaining unsupported guards until their step passes.
Function parameter grammar is a separate boundary; this review does not authorize
suspending parameter initializers.
