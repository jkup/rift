# Declaration pattern suspension

Declaration patterns support yield and await in array/object defaults
and computed keys, including nested patterns, declaration lists and classic for
initializers. Lexical declarations retain their precreated environment and TDZ.
Var declarations retain resolved binding references across suspended defaults.

Pattern traversal uses the catch-pattern continuation. Array iterators remain on
the unwind stack until initialization completes or exits abruptly. Rest objects
and arrays use the defining Realm; resumed evaluation uses the caller's session
and resource limits.

Assignment expressions and for-in/of/await-of patterns support suspension through
the same continuation machinery. Function parameter grammar is unchanged.

Eleven independent references and focused Node tests pass, including TDZ,
once-only initialization, nested iterator closing, rejected await, defining-Realm
allocation, caller budgets and resource cleanup. Isolated acceptance includes
1000 Node guests, 41 native compiler checks, 48 native semantic executions and
296 tooling checks. Combined TS-560 acceptance passes 1002 guests on each host,
484 compiler checks and the unchanged 225-file original corpus. See the
[publication record](shared-pattern-publication.md).
