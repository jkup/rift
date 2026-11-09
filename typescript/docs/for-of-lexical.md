# Lexical for-of heads

TS-121 adds single-identifier let/const heads to synchronous for-of. Traditional
lexical for loops, destructuring, async iteration and labels remain unsupported.
Parser lookahead distinguishes the admitted head from those existing boundaries.

Declaration plans give a lexical loop its own source-ranged scope. The head is a
lexical declaration in that scope; iterable expressions and the body are its
children. Body vars still propagate to the enclosing variable scope, with
head/body var conflicts rejected. A nested body block can shadow the head with
its own lexical declaration. No synthetic source block is introduced.

The iterable expression runs with uninitialized mutable head bindings, including
for a const head. That temporary environment is never initialized. Closures
created there retain its temporal dead zone. Iterator acquisition and stepping
use the restored outer frame.

Each yielded value gets a fresh environment, with a mutable let or immutable
const binding initialized directly from the value. This does not infer a name
for an anonymous function value. Closures in the body retain that iteration's
binding. The outer frame is restored before cleanup and on every completion or
host fault. Var and assignment heads keep their existing path.

Activation requires the internal execution key and a parser-owned node/scope
association. Creation, binding setup and initialization are metered; engine stops
remain uncatchable and do not resume guest cleanup. Tests cover closure capture,
TDZ, shadowing/conflicts, mutation, cleanup, foreign Realms, retained var behavior
and resource limits. The historical unsupported-head cases now test successful
execution without leaking bindings. One lexical-audit row now has no candidates.

Sources consulted 2026-11-09:
[ForIn/OfHeadEvaluation](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-runtime-semantics-forinofheadevaluation-uninitializedboundnames-expr-iterationkind),
[ForIn/OfBodyEvaluation](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-runtime-semantics-forinofbodyevaluation-lhs-stmt-iterator-lhskind-labelset),
and [V8 VisitForOfStatement](https://github.com/v8/v8/blob/main/src/interpreter/bytecode-generator.cc).
Rift uses explicit environments and completions rather than bytecode lowering.
No engine source was copied.

The initial full Node run passed 606/608 cases: both error-harness inputs still
expected an empty lexical for-of tail to reject the whole script. The original
source now checks inert preparation and successful execution; unsupported for-in
retains whole-script rejection coverage. Its native driver was rebuilt after the
full 120-entry build, with both initial and replacement records retained.
