# Class static block integration review

TS-438, 2026-11-11. This review does not enable syntax. The isolated TS-437
field initializer implementation supplies a receiver/home-object boundary that
static blocks can share, but a block also needs its own variable scope.

## Scope and declaration setup

Represent a static block as its own class-element variant with a retained body
and source range. Do not manufacture a function expression or function source.
Give it a strict planner scope whose variable declarations belong to that block,
including var declarations inside nested statements. Each static block has an
independent scope. Nested ordinary functions still establish their own boundaries.

The existing instantiateBlock only creates lexical declarations. Calling it on
an ordinary BlockStmt would leave var declarations owned by the outer Script or
function. Static block setup must create and initialize local var bindings,
instantiate hoisted functions, and create lexical bindings before executing the
body. Review conflicts and retained AST validation alongside the new scope kind.
Keep declaration collection in syntax preorder.

The TS-437 field environment provides this, undefined new.target and super's
home object without a fabricated callable. Reuse those semantics for static
blocks, while distinguishing their statement body and declaration setup. Arrows
retain the block receiver; ordinary functions use their own this and arguments.

## Ordered static execution

Replace the static-field-only list with an ordered union of field and block
records. All computed keys and methods are processed before any static record
runs. Initialize the inner class name before traversing this list. A block runs
once with the constructor as receiver, interleaved with static fields in source
order. Abrupt completion stops the remaining records.

Both ordinary class evaluation and the suspended computed-key continuation must
collect the same records. Instance initialization remains a field-only path.
Preserve defining-Realm errors, source inspection, current execution budgets and
caller restoration. Clear temporary static records after successful execution.

## Parser and eval boundaries

Recognize static followed by an opening brace before parsing a property key.
The body is strict, allows super property access and new.target, and forbids
super calls, return, arguments references, await and yield in its own context.
Nested ordinary functions reset applicable restrictions. Reset enclosing loop
and label contexts so break/continue cannot escape into an enclosing statement.
Keep private names and decorators outside this increment.

Direct eval inherits the static-block receiver and super context. It must reject
arguments references before execution and preserve strict eval variable isolation.
Use the existing explicit rejection policy for unsupported syntax; do not invent
certified early-error provenance solely to broaden a conformance numerator.

## Evidence and implementation acceptance

Eight direct Node reference programs pass in build/check-static-block-context.mjs;
results are in build/static-block-context-oracle.json. They check key/static
ordering, independent var scopes, receiver/new.target/super, hoisted functions and
lexical TDZ, direct eval, abrupt completion, nested function arguments and the
initialized inner class name. These are reference checks, not Rift passes.

Implementation tests must additionally cover invalid control transfers and
declaration conflicts, nested blocks/classes, cross-Realm errors, resource stops,
and yield/await in enclosing computed keys. Preserve historical unsupported
inputs when migrating their expectations. Require focused native static-only
and zero-dynamic coverage, both-host execution, and combined acceptance before
publication.

Sources: ECMAScript [ClassStaticBlockDefinitionEvaluation](https://tc39.es/ecma262/#sec-runtime-semantics-classstaticblockdefinitionevaluation)
and [ClassDefinitionEvaluation](https://tc39.es/ecma262/#sec-runtime-semantics-classdefinitionevaluation);
engine262 ClassStaticBlockDefinitionEvaluation.mts and ClassDefinitionEvaluation.mts
at revision 18cdeb03c363eb31d775648a0d070bdc8a26ced1. The reference implementation
creates a non-lexical-this function with empty source text and applies MakeMethod;
Rift can retain the corresponding lexical boundary without exposing a synthetic
guest callable. Decorator branches are excluded.
