# Assignment pattern suspension

The isolated draft supports yield/await in destructuring assignment defaults,
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
budgets and recovery after resource failure. Loop binding suspension and function
parameter grammar remain guarded. Full Node, native and canonical acceptance are
pending; integration requires final predecessor reconciliation.
