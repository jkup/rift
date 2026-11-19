# Destructuring suspended initializers

Array/object declarations and destructuring assignment statements accept a direct
yield or yield-star initializer. The receiver holds the pattern and, for lexical
declarations, its initialization environment. Normal resumption runs the existing
pattern evaluator in the saved frame. It does not pre-evaluate assignment targets,
computed keys or defaults before the right-hand value becomes available.

Var patterns resolve bindings during resumed destructuring; lexical cells remain
in the TDZ until initialized. Return/throw discards the receiver. Iterators, rest,
defaults, setters and abrupt close retain the shared destructuring semantics.

Focused Node/native tests cover these effects, delegated completion, catch-var
shadowing, error Realm ownership and current-session accounting. Static-only and
parsed zero-dynamic checks pass. The initial full Node run inherited the stale
throw-yield rejection (718/719); that input is preserved as a positive regression
in the preceding throw slice. The reviewed rerun is recorded separately.

Yield inside a pattern/default and formal parameter patterns remain unsupported.
