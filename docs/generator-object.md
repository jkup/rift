# Suspended object literals

Object literals retain the new object, property cursor, converted key and current
evaluation stage across suspension. Computed keys convert before values run;
throw and return abandon the pending definition. Spread, prototype setters and
data/accessor definitions share the ordinary object-literal implementation.

Nonsuspending anonymous definitions retain name inference, and methods retain
their home object. A function supplied by a resumed yield is not renamed.
Allocation uses the function's Realm; resumption uses the caller's session.

Tests cover key coercion order, symbols, getters, spread descriptors, prototype
setters, method super, anonymous definitions, nested literals and async bodies.
Focused evidence is retained under ignored build/generator-object-* paths;
combined canonical acceptance is required before publication.

Reviewed [ECMAScript PropertyDefinitionEvaluation](https://262.ecma-international.org/16.0/#sec-object-initializer-runtime-semantics-propertydefinitionevaluation),
including computed-key conversion, NamedEvaluation and CopyDataProperties.
