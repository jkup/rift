# Generator start and detached bodies

Generator declarations and expressions prepare their function activation when
called, then return an iterator without executing the body. The first next()
installs the saved source and lexical frame in the current execution engine and
executes the real body. Parameter initializers run at call time. this, arguments,
closures and direct eval use the retained function environment.

This slice supports bodies without yield. Yield expressions, delegation,
generator methods, async functions and async generators remain explicit parser
boundaries. An admitted body is executed; this is not a placeholder iterator
that discards the body to report completion.

Suspended-start, executing and completed are distinct states. return() and
throw() before the first next() complete without entering the body. Completed
next() returns undefined/done; completed return() uses its argument; throw()
throws its argument. Reentrant next/return/throw are rejected while executing.
Abrupt body completion, resource stops and host faults close the iterator and
restore the caller frame, Realm and counters.

The stored activation contains AST, frame and environment data, with no
ExecutionEngine, OperationContext or execution permit. Resume intrinsics have a
private callable kind dispatched only by the active Script engine. Generator
allocation and activation access require the private execution key; private
fields protect the saved state. Body errors retain the body Realm and source;
terminal result objects use the resume caller Realm. Current-session budgets
pay for body execution, while the creation session remains unchanged.

The standard GeneratorFunction/Generator prototype graph, metadata and dynamic
GeneratorFunction construction are included. Generator functions have an own
prototype property but are not constructors; their prototype objects have no own
constructor backlink. Generator block declarations are lexical and excluded
from Annex B var-like copying. Prototype selection requires a callable, matching
GetPrototypeFromConstructor; callers that construct still enforce IsConstructor.

Focused checks cover deferred effects, defaults, mapped/strict arguments, rest,
this, closures, eval, finally, all start/completed operations, reentry, prototype
mutation, dynamic construction, foreign sessions/Realms and cleanup. The original
empty-generator rejection in the Script execution matrix remains the same
source with an explicit preparation/execution expectation migration.

References: [generator objects and resumption](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-generator-objects),
[engine262 EvaluateGeneratorBody at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/EvaluateBody.mts)
and [its generator state operations](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/abstract-ops/generator-operations.mts).
The implementation uses Rift's explicit completions and private activation data,
not engine262's surrounding-agent context stack.

Evidence: test/generator-start.ts and build/generator-start-draft/build. The
initial native private-brand failure and reduced workaround remain separate
from passing validation; see the compiler contract. Mid-expression suspension,
cleanup that yields and iterator delegation are subsequent work.

TS-214 adds direct generator-body yield statements using an explicit completion
and saved next-statement cursor. See [direct generator yields](generator-yield.md)
for the supported boundary and state invariants. Nested suspension is still blocked.
