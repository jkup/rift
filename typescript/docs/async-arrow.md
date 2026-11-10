# Async arrows

Async arrows use the existing async activation with lexical this, arguments,
super and new.target. Metadata selects AsyncFunction.prototype and keeps arrows
nonconstructable. Parameter failures reject the intrinsic Promise before body
execution, just as for ordinary async functions.

The parser shares suspension admission between function and arrow bodies. It
isolates nested await/yield tracking and extends the existing parameter cover to
recognize async parenthesized parameters or ordinary calls without reparsing.
The async prefix and arrow each enforce their line boundary. Async remains a
contextual identifier, including shorthand and ordinary calls. Rest parameters
must remain last, while call spread arguments may precede other arguments.

Sources: [ECMA-262 async arrow definitions](https://262.ecma-international.org/16.0/#sec-async-arrow-function-definitions)
and [engine262 18cdeb03 instantiation](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/InstantiateAsyncArrowFunctionExpression.mts).
Async generators and suspension in unsupported expression positions remain separate.
