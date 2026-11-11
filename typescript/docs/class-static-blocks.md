# Class static blocks

Static blocks retain their actual statement body and source span. Each has a
strict planner scope and its own variable declarations; nested block vars hoist
only to that scope. Setup creates var and lexical bindings and materializes the
winning function declarations before execution. No synthetic function source or
guest initializer callable is created.

Fields and blocks share a class-initialization environment holding this,
undefined new.target and the home object. Blocks execute once with the constructor
as receiver, interleaved with static fields in source order, after all computed
keys and methods and inner-name initialization. Ordinary and suspended class
evaluation collect the same ordered records. Instance initialization remains
field-only.

Both stored initializer arrays use the same union element type. A reduced
scriptc probe shows that widening Field[] to Initializer[] copies the array:
pushing through the widened reference leaves the original length zero natively,
while Node retains length one. The initial native generator-key test exposed
the resulting lost instance field. Uniform storage removes that conversion;
execution still rejects any static block in an instance initializer list.
Evidence: build/class-static-blocks-array-union-* and the retained initial native
report. No dynamic compilation or toolchain change is involved.

Parsing resets outer function/loop/label contexts, rejects return, super calls,
arguments references and suspension in the block itself, and preserves nested
ordinary/async function boundaries. Direct eval inherits the receiver and super
context and rejects free arguments before execution. Existing unsupported-syntax
provenance limits remain explicit; private fields and decorators are unsupported.

Tests cover declaration isolation and hoisting, lexical TDZ, static ordering,
nested classes/functions, this/new.target/super, direct eval, abrupt completion,
outer yield/await keys, cross-Realm errors, source inspection and uncatchable
resource stops. Historical static-block inputs retain positive planning/execution
assertions; the remaining private-field negative preserves the audit veto check.

References and prior native reference checks: docs/class-static-blocks-review.md;
ECMAScript ClassStaticBlockDefinitionEvaluation and ClassDefinitionEvaluation;
engine262 at 18cdeb03c363eb31d775648a0d070bdc8a26ced1. Combined acceptance pending.
