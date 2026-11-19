# Async iterator acquisition

GetAsyncIterator prefers Symbol.asyncIterator, validates it before considering
sync fallback, and caches next. Sync fallback retains an IteratorRecord in a
Realm-owned AsyncFromSyncIterator. Its next/return/throw methods forward argument
presence, unwrap values through the intrinsic Promise and build iterator results
in the method Realm. Reactions capture only iterator state and completion data;
they use the current operation context when another session settles a Promise.

The 2025 continuation closes a non-done sync iterator when its yielded value
rejects. Existing guest rejection wins over cleanup errors; fatal engine limits
still escape. Accessor failures before value wrapping do not close. Return does
not close on rejected values, and a missing return preserves its input value.
A missing throw first closes normally, then rejects the protocol violation.

The adapter and its prototype are not guest-accessible through language features;
the focused test exposes acquisition through a test-only builtin. For-await loop
syntax/scheduling and async generators are subsequent work.

Sources: [ECMA-262 2025](https://262.ecma-international.org/16.0/#sec-asyncfromsynciteratorcontinuation)
and [engine262 iterator operations](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/abstract-ops/iterator-operations.mts).
