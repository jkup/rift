# Synchronous for-of

Lexical heads added later are described in [TS-121](for-of-lexical.md).

TS-119 admits one uninitialized `var` binding or an identifier/member assignment
head in Script execution. `of` remains contextual. Declaration planning visits
the head, iterable and body, so var bindings exist even when iteration is empty
and function expressions retain their enclosing scope. The legacy parser is
unchanged. Lexical heads, destructuring, async iteration and labels remain
unsupported; lexical heads need proper per-iteration environments in a later task.

The evaluator obtains the iterator once and uses its saved next method. Each
value is fetched before resolving and assigning the head. Normal exhaustion and
next/done/value failures do not close the iterator. Assignment failures, body
throws, break and return do. Continue stays within the loop. Completion values
follow the existing loop representation, including empty bodies and breaks.

The shared iterator module now also handles cleanup for a pending non-throw
completion. Missing/null return methods are allowed; non-callable methods and
primitive results throw TypeError. Cleanup errors replace break/return, while
the existing throw-cleanup operation preserves an original guest throw. Engine
resource/capability stops retain their fatal boundary and cannot resume guest
cleanup. Cleanup validation belongs to the active Realm; called functions keep
their own Realm.

Sources consulted 2026-11-09:
[ForIn/OfBodyEvaluation](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-runtime-semantics-forinofbodyevaluation-lhs-stmt-iterator-lhskind-labelset),
[IteratorClose](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-iteratorclose),
and [V8 VisitForOfStatement](https://github.com/v8/v8/blob/main/src/interpreter/bytecode-generator.cc).
V8's separation of iteration-step failures from assignment/body cleanup agrees
with the specification. Rift retains explicit completions rather than host
try/finally for guest control flow. No engine source was copied.

The driver checks arrays, holes, strings, Maps/Sets, mutation, contextual names,
var closures and fresh body blocks, assignment order, cached next, completion
values, cleanup precedence, cross-Realm errors, rejection boundaries and budgets.
The first native compile required the established explicit ThrowCompletion
locals at two ValueCompletion-to-statement return sites. Its diagnostics remain
in `build/for-of-focused-build.log`; no new compiler workaround was introduced.
