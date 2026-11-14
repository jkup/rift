# Declaration pattern suspension

The isolated draft supports yield and await in array/object declaration defaults
and computed keys, including nested patterns, declaration lists and classic for
initializers. Lexical declarations retain their precreated environment and TDZ.
Var declarations retain resolved binding references across suspended defaults.

Pattern traversal uses the catch-pattern continuation. Array iterators remain on
the unwind stack until initialization completes or exits abruptly. Rest objects
and arrays use the defining Realm; resumed evaluation uses the caller's session
and resource limits.

Assignment expressions and for-in/of/await-of patterns keep their existing
unsupported suspension boundary. Function parameter grammar is unchanged.

Eleven independent references and focused Node tests pass, including TDZ,
once-only initialization, nested iterator closing, rejected await, defining-Realm
allocation, caller budgets and resource cleanup. Full Node regression, native
validation and canonical acceptance remain pending. Integration also requires
completed TS-551 canonical acceptance and predecessor reconciliation.
