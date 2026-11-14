# Loop pattern suspension

Generator and async loop heads can suspend while evaluating destructuring
defaults, computed keys and assignment targets in for-in, for-of and for-await-of.
The parser admits these expressions through the same pattern traversal used for
declarations and assignments. Function parameter suspension remains invalid.

Both synchronous iteration and awaited iterator results schedule initialization
through one helper. Lexical heads first activate a fresh iteration environment
with every binding in TDZ. The body is queued below the pattern frames, with the
outer loop below both, so initialization finishes before the body and abrupt
completion closes inner iterators before the outer iterator. Non-suspending
heads retain their synchronous initialization path.

Sixteen independent expected-output controls cover lexical versus var captures,
TDZ, const assignment, labels, computed keys, target references, injected throw
and return, and synchronous/asynchronous iterator closing. The focused driver
also checks defining-Realm rest allocation, cross-session resumption, current
caller resource budgets and recovery after fatal exhaustion.

Typechecking, focused checks and reference comparisons pass on Node-hosted Rift.
Full regression, native static-only/zero-dynamic compilation, tooling and final
predecessor reconciliation remain pending. This draft is not accepted for main.
