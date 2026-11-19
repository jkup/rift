# Await continuations

Await has its own AST node and suspension result. Async activations share the
statement/expression frame machine with generators, but never expose a guest
iterator or retain an evaluator. Private reaction callables carry only the
activation and fulfillment/rejection mode. Each call enters the current session.

Await performs intrinsic PromiseResolve and attaches internal reactions without
reading a mutable then method or Symbol.species. Even ordinary values resume in
a later job. A synchronous PromiseResolve error re-enters the continuation as a
throw, allowing the surrounding catch/finally to run. Fatal engine limits bypass
guest cleanup as in the existing Promise and generator contracts.

Promise assimilation and job registration reinstall the suspended function frame,
Realm and expression depth. This keeps budget failures and job source inspection
attached to the await site, including when the caller belongs to another source
or Realm. All caller state is restored afterward. Tests cover the job's initial
budget tick, pending promises resolved from another session, nested operands,
cleanup, ordering, intrinsic hooks and the unchanged ten-outcome async error
fixture on both hosts.

Admission follows supported generator expression/statement positions: direct
receivers, arithmetic/conditional/unary expressions, nested awaits, if and while/
do-while tests. Await inside calls, member references, for heads and patterns
remains unsupported; so do async arrows/methods/generators in this slice.

Reviewed [ECMA-262 Await](https://262.ecma-international.org/16.0/#await) and
[engine262 Await at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/completion.mts).
The existing Promise reaction path now supports the specification's absent
result capability for internal await handlers; ordinary then calls retain one.
