# Named function expressions

A named expression creates a private declarative environment outside the function
activation. Its immutable name is initialized to the new function before the
function is returned. Parameters and body declarations can shadow it; recursion
and default parameter expressions can read it. The name never becomes a binding
in the enclosing scope. Explicit names take precedence over contextual inference.

Local binding cells now record the immutable binding's strict flag. Constants
retain strict bindings and still reject writes in non-strict code. Named-function
bindings use false, so non-strict writes are ignored and strict references throw.
This is separate from whether the function body itself is strict. eval and
arguments names are validated using the function's inherited/own strictness.

The existing materializer, callable provenance and source spans are retained.
There is no second function implementation, guest-source host evaluation or
change to legacy function-expression parsing.

References: [ECMAScript 2025 InstantiateOrdinaryFunctionExpression](https://262.ecma-international.org/16.0/#sec-runtime-semantics-instantiateordinaryfunctionexpression)
and [engine262 at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/InstantiateOrdinaryFunctionExpression.mts).
