# Generator catch boundaries

A catch continuation retains the try statement's lexical frame until its body
finishes. Guest throws unwind sequence and loop records to the nearest catch,
instantiate its binding once, then schedule the handler in that frame. A handler
has no copy of its own catch boundary, so errors thrown from it reach an outer
handler. Return and loop control discard catch boundaries without running them.

Throw routing applies to resumed yield statements, loop tests/updates and
iterator delegation. Catching a delegated error clears its iterator continuation.
Resource and unsupported-operation stops bypass handlers, matching synchronous
Script execution; host faults still escape with caller restoration.

Tests cover nested handlers, rethrows, catch closures and eval, delegated errors,
loop control and tests, foreign Realm bindings and resource-stop bypass. Finally
and expression-level suspension remain outside this slice.
