# Array filter

TS-086 adds Script Array.prototype.filter. Receiver boxing and length capture
precede callback validation; species construction precedes traversal. The
operation skips absent indices, reads inherited properties, and observes changes
to not-yet-visited entries while retaining the original length limit.

Callbacks receive the saved value, index and boxed input, with the supplied this
argument and normal cross-Realm call behavior. Selection uses ToBoolean without
coercion hooks. Selected original values become dense own data properties, even
when the callback changes the source value. Result setters inherited from a
prototype are bypassed. Throws propagate unchanged and each visited index consumes
the active step budget, including holes.

The [species constructor](array-species.md) receives zero rather than the source
length. Default arrays start empty in the method's Realm; custom constructors may
return arbitrary objects. Filter defines selected values without assigning result
length. Huge sparse sources remain bounded by resource guards. Invalid species or
rejected property creation throws TypeError. Legacy Realms retain their previous
public surface.

References: [Array.prototype.filter](https://tc39.es/ecma262/multipage/indexed-collections.html#sec-array.prototype.filter)
and src/builtins/array/array_iterators.cpp at base 98c9df33. The C++ implementation
validates callback callability before reading length; this implementation follows
the specified observable order. Tests cover that order, sparse and inherited
entries, mutation, saved values, this/arguments/Realm behavior, descriptor creation,
truthiness, exact throws, species and resource limits.
