# Object literal shorthand

Identifier shorthand evaluates the identifier as a normal lexical read and
defines an own writable, enumerable, configurable data property. It does not
create a method or rename an existing function. __proto__ shorthand is an
ordinary property, not the separately unsupported prototype setter syntax.

Cover-initialized names remain available for assignment patterns but are rejected
when used as object expressions. The parser records that deferred rejection only
when it sees an initializer, preserving the original destructuring disambiguation.
Legacy parsing remains unchanged.

Reference: [ECMAScript 2025 PropertyDefinitionEvaluation](https://262.ecma-international.org/16.0/#sec-object-initializer-runtime-semantics-propertydefinitionevaluation),
IdentifierReference production; also reviewed in engine262's implementation at
18cdeb03c363eb31d775648a0d070bdc8a26ced1 alongside the computed-key work.
