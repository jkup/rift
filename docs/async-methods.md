# Async methods

Object and class async methods reuse async function calls and await continuations.
The parser distinguishes the async prefix from an ordinary method named async,
checks its line boundary, and retains method source spans and home objects.
Instance/static super calls therefore keep ordinary method lookup and receivers.

Async constructors, accessors, duplicate method parameters and async generators
remain rejected. Computed names, symbols, borrowed receivers, defaults, rejection,
cleanup, descriptors and ordinary async-named methods have focused tests. The
unchanged original async-methods fixture has eight expected asynchronous outcomes.

This uses [ECMA-262 async method definitions](https://262.ecma-international.org/16.0/#sec-async-function-definitions)
and the accepted async function/await operations; it adds no second call path.
