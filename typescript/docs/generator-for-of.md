# Generator for-of iteration

A for-of continuation retains its iterator, outer frame and binding plan. Each
step initializes a fresh lexical iteration environment or writes the captured
loop target, then schedules the body. Binding initialization is shared with
synchronous for-of/for-in execution.

Unwinding closes active iterators in nesting order. Same-loop continue retains
the iterator; break closes it and stops at that loop. Return and throw continue
through outer cleanup. Yielding body finalizers finish before the iterator is
closed. Failures from next/done/value remove that iterator before unwinding, and
normal exhaustion performs no close. Fatal engine stops bypass guest cleanup.

A pending guest throw wins over a guest error from iterator return. Its original
source snapshot is restored as well as its value identity; cleanup from another
Realm must not overwrite that provenance. Cleanup errors can replace a pending
return or break.

Tests cover bindings/patterns, closures, TDZ, next caching, loop control, nested
close order, yielding finally, failed steps/initialization, cleanup precedence,
foreign throw provenance and resource-stop bypass. For-in suspension, labels
and nested expression continuations remain subsequent work.
