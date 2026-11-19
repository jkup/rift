# Computed object property names

Object literal data properties, methods and accessors evaluate computed names
before their values. The key expression and ToPropertyKey each run once; abrupt
completion prevents the value and later properties from running. Symbols remain
symbols. Function names use the same symbol-description formatting as classes.
Methods retain their home object, including when their name is computed.

Literal keys remain strings in the AST; computed keys hold expressions. Both
metadata and declaration traversals visit those expressions before values, so
functions and early errors inside keys are registered during inert preparation.
Cover entries keep their existing expression keys for assignment patterns.

Computed __proto__ defines an ordinary own property. The separately unsupported
literal prototype setter remains rejected. Legacy-profile parsing is unchanged.
The old Script computed-key rejection cases now assert inert preparation and
actual lookup. Their original source strings are retained.

References: [ECMAScript 2025 property evaluation](https://262.ecma-international.org/16.0/#sec-object-initializer-runtime-semantics-propertydefinitionevaluation)
and [engine262 18cdeb03 PropertyDefinitionEvaluation](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/PropertyDefinitionEvaluation.mts).
The change uses Rift's existing explicit completion and property operations.
