# Assignment pattern suspension

Destructuring assignments support yield/await in defaults,
computed keys and member/private/super targets. It retains outer expression
frames and receivers while initializing a pattern, then resumes that expression
with the original RHS value. Nested patterns inside defaults use the same stack.

Suspended target evaluation finishes before a source property read, iterator
step or rest copy. The resulting reference survives default evaluation. Property
key coercion follows the existing reference/PutValue path; it is not moved ahead
of the source read. Abrupt completion closes outstanding pattern iterators and
restores saved class scopes before continuing outer unwind.

Sixteen independent references and focused Node-hosted tests pass, including
class/private/super contexts, defining-Realm rest allocation, current-caller
budgets and recovery after resource failure. Loop binding suspension is supported;
function parameter suspension remains invalid. Isolated acceptance includes 1001
Node guests, 49 native compiler checks, 57 native semantic executions and 296
tooling checks. Combined TS-560 acceptance passes 1002 guests on each host, 484
compiler checks and the unchanged 225-file original corpus. See the
[publication record](shared-pattern-publication.md).
