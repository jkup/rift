# Date JSON serialization

TS-403 implements generic Date.prototype.toJSON. It boxes the receiver, converts with the number hint, returns null for non-finite numeric primitives and otherwise invokes the receiver's observable toISOString method with no arguments. It does not require a Date brand, stringify the returned value or coerce nonnumeric primitives to numbers.

Tests cover JSON.stringify integration, invalid dates, generic and boxed receivers, mutation of conversion methods, getter/call ordering, short-circuiting, abrupt completions, metadata and defining-Realm errors.
