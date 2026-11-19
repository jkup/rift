# Async generator methods

Object and class async generator methods combine existing async queues with method
home objects. Computed and symbol names, static methods, borrowed receivers and
super lookup follow the existing method paths. Async constructors, accessors,
duplicate parameters and the static prototype name remain rejected.

The original test-async-generators.js requires an assert host service. A separate
validation driver installs a counted assertion builtin, reads unchanged fixture
bytes, drains all jobs, and requires exactly 37 successful assertions. This makes
its asynchronous outcomes observable without changing the C++ fixture. A silent
corpus completion alone is not evidence that those assertions ran.

See [ECMA-262 async generator methods](https://262.ecma-international.org/16.0/#sec-async-generator-function-definitions)
and the queue design in [async-generator.md](async-generator.md).
Yield-star delegation remains a separate slice.
