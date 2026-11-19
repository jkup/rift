# Generator methods

Object and class method parsing recognizes a leading star and passes the existing
generator flag through function source metadata. Computed and static names use
the existing key evaluation and method-definition paths. Materialization already
selects GeneratorFunction/Generator prototypes, creates a nonconstructible
callable and installs the method home object; no alternate execution path is added.

Focused tests cover names, source text, descriptors, computed keys, static and
instance methods, live super lookup across suspension, this and arguments modes,
iteration consumers and nonconstructibility. Generator constructors, accessor
combinations, duplicate parameters, static prototype methods, async generators
and delegation remain rejected. The original empty object-generator rejection
source is retained as a positive execution case.

Bodies use the same admitted statement continuations as generator functions.
Yield delegation, expression suspension and cleanup scopes remain unsupported.
See [generator start](generator-start.md) and [generator for loops](generator-for.md)
for execution and validation boundaries.
TS-219 adds standalone synchronous yield-star statements and iterator protocol
resumption; see [generator delegation](generator-delegation.md).
