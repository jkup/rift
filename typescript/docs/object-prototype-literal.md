# Object literal prototype setters

Non-computed __proto__: values set a fresh object's prototype when the value is
an object or null. Other values are ignored without coercion. No own property is
created, and anonymous function/class values receive no inferred property name.
Ordinary data property definition still bypasses inherited setters.

Duplicate prototype setters are early errors, including unreachable code. That
rejection is deferred through the existing cover grammar so duplicate property
keys in assignment patterns remain legal. Computed keys, shorthand, methods and
accessors named __proto__ remain ordinary properties and may coexist with a setter.
Legacy parsing is unchanged.

Reference: [ECMAScript 2025 PropertyDefinitionEvaluation](https://262.ecma-international.org/16.0/#sec-object-initializer-runtime-semantics-propertydefinitionevaluation)
and its early errors, cross-checked against engine262 at
18cdeb03c363eb31d775648a0d070bdc8a26ced1 during the object-literal review.
