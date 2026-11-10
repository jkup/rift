# Assignments across generator suspension

Direct assignment and compound-assignment statements can receive a yield or
yield-star result. The continuation retains an EvaluationReference and, for a
compound operation, the original left Value. It retains no evaluator or session.
Resumption uses the current operation context for coercion and the final write.

The reference is evaluated before yielding. Compound assignment reads once and
caches the property key; plain assignment retains the existing delayed key
conversion described in [the destructuring design](destructuring-design.md).
Mutable coercion methods and setters remain observable when execution resumes.
Abrupt return or throw discards the pending write; delegated completion supplies
the right-hand value only on normal completion.

Tests cover captured references, live setters/coercion, strict and constant writes,
super receivers, delegated results, Realm ownership, current-session budgets and
fatal resource stops. Chained/nested/logical assignment suspension and yielding
assignment targets remain unsupported. The original direct-assignment rejection
in generator-receive is preserved as a positive regression.

Isolated validation: focused Node/native checks pass with static-only compilation
and parsed zero-dynamic coverage. Full-suite results and combined acceptance are
recorded separately in TASKS and COORDINATION.
