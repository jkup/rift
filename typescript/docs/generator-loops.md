# Generator while and do-while loops

Loop continuation records retain the test, body, enclosing lexical frame and
whether a do-while loop is entering its first iteration. Each iteration schedules
a fresh body sequence. Blocks create fresh lexical cells on entry, while a yield
inside that body retains the existing cells until the iteration finishes.

Resumption continues the pending body before testing again. Unlabelled continue
discards child sequences up to the nearest loop record; break also discards that
loop. Ordinary nested loops and cleanup statements without yield still execute
through the existing synchronous evaluator, which consumes their own completions.

Return and throw can discard these records because no admitted yield is enclosed
by pending iterator cleanup or finally. Labelled suspension, for loops, iterator
loops, try/finally and expression-level yields remain outside this slice.

Expected-result tests cover while/do test order, nested loops, break/continue,
closure identity across iterations, return/throw, a failing test, cross-session
resumption and resource termination. Prior while-yield rejection sources remain
as positive execution cases. Full integration validation is separate from the
focused native and Node checks.

See [generator blocks](generator-blocks.md) and [the yield state model](generator-yield.md)
for the continuation invariants and specification/engine references.
TS-217 adds ordinary and lexical for-loop continuations, sharing iteration setup
with synchronous execution. See [generator for loops](generator-for.md).
