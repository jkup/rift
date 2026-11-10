# Suspension context prerequisite

The probe retains a host generator and guest callback values, with an
OperationContext slot installed only for the synchronous duration of resume.
The slot is cleared in finally. Callback invocation obtains the current context
inside a non-suspending method, so no context local survives a yield.

Both Node and native checks exercise real Script callbacks from different
sessions and Realms. They verify that earlier sessions' step counts stay fixed,
the resuming session pays for callback execution, a current-session resource
limit stops work, guest throws preserve identity, and callback Realm state is
restored. Reentry produces a guest TypeError. Injected abrupt completion and host
faults release the context; attempts to call while suspended have no authority.

This is test-only machinery, not a production resume API. It proves that the
pinned compiler can support this context-lifetime mechanism with zero dynamic
operations. The existing interpreter still evaluates each guest callback to
completion. It does not suspend a guest AST, transfer a partially evaluated
expression, or install a saved lexical frame in another execution engine.

The next generator boundary must prove those properties using guest pending
operands and explicit completion records, including finally and iterator cleanup.
Do not retain an ExecutionEngine inside suspended host-generator frames or
replay statements to reach a prior yield. See [the activation boundary](generator-boundary.md).

Evidence: test/suspension-context.ts; isolated results in
build/suspension-context-draft/build/suspension-context-reviewed.json.

The [GeneratorResume/GeneratorYield algorithms](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-generatorresume)
and [engine262's generator operations at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/abstract-ops/generator-operations.mts)
separate suspended execution state from the active caller and reject reentry.
The probe follows that separation. It does not adopt engine262's surrounding-agent
context stack or its production generator object implementation.
