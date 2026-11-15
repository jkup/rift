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

Isolated acceptance passes typechecking, 1002 Node guests, 57 native compiler
checks, 65 native semantic executions, 296 tooling checks and final predecessor
reconciliation. Combined TS-560 acceptance passes 1002 guests on each host, 484
compiler checks and the unchanged 225-file original corpus. See the
[publication record](shared-pattern-publication.md).
