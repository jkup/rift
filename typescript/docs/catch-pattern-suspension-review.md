# Catch pattern suspension review

TS-552 records six independently specified Node reference programs in
build/catch-pattern-suspension-review/. They cover yield in a default, yield in a
computed property key, return/throw injected during an array default, fulfilled
await and rejected await. All match their explicit output. These are reference
controls only; no Rift or native acceptance is claimed.

The key boundary is wider than catch activation. ExecutableScript.activateCatch
currently creates and initializes one identifier synchronously. Both ordinary
statement execution and continuation unwinding call it before entering the
handler. The catch boundary is already consumed when an exception is handled,
so a failure during initialization must propagate outward rather than re-enter
the same handler.

The shared #initializePattern, #arrayPattern and #objectPattern methods are also
synchronous. They evaluate defaults/keys through #value, which requires a value
completion. The generator pattern receiver resumes a suspended input expression
and then invokes this synchronous initializer. It is not evidence of a retained
continuation for defaults or computed keys inside a binding pattern.

TS-551 therefore needs explicit continuation support for pattern initialization
where those expressions suspend. Reuse the ordinary binding/coercion/iterator
operations, but retain the active pattern position, iterator/close obligation,
object exclusions, current value/reference, environment and pending completion.
A resumed initializer must not repeat iterator acquisition, property getters or
previous defaults. All catch names must exist before initialization begins.

Separate environment creation from binding initialization and schedule the
handler only after successful initialization. Preserve the outer frame across
suspension and abrupt exit. Injected return/throw must unwind outstanding pattern
iterators before the surrounding finally or outer catch. The reference array
controls distinguish this from prematurely running the handler or skipping close.

Before acceptance, extend these references with once-only side effects, nested
patterns, iterator-close failures, current caller budgets, defining-Realm
allocation, async/generator resumption from a different session and cleanup after
resource exhaustion. Optional catch bindings remain a separate, smaller change;
they require no pattern initializer or fabricated parameter binding.
