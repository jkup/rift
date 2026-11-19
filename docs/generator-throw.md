# Suspended throw operands

A throw statement can consume a direct yield or yield-star expression. Its
receiver stores the throw location. Normal resumption creates the guest throw
in the saved generator frame and uses the existing catch/finally/iterator unwind.
An abrupt return or throw discards the receiver. A delegated abrupt return remains
an outer return; a normal delegated completion becomes the thrown value.

Focused checks cover exact values, yielding cleanup, replacement returns,
iterator close, delegation and foreign-session source/Realm restoration. Native
static-only compilation and parsed zero-dynamic coverage pass. Nested expression
suspension and line terminators after throw remain rejected. Full acceptance is
tracked separately from these isolated checks.

The first full Node run retained the old direct-throw rejection and reported
717/718. The same source is now a positive throw-identity regression; the original
log is preserved. The reviewed rerun is recorded separately.
