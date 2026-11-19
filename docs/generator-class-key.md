# Suspended computed class keys

The class-element frame retains the constructor, prototype, element index and
inner class scope while a computed key suspends. Key conversion and method
definition finish before advancing to the next element. The inner name is
initialized only after all methods have been defined; return, throw and resource
failure unwind through the existing class-scope frame.

Tests cover declaration and inferred names, accessors/static/symbol keys,
conversion order and failures, super calls, nested/interleaved classes, escaped
closures and TDZ, delegation cleanup, async resumption, error Realms and current
session budgets. The two earlier rejected computed-key inputs are retained as
executing assertions. Fields, private names and decorators remain separate.

Reference: [ClassDefinitionEvaluation](https://262.ecma-international.org/16.0/#sec-runtime-semantics-classdefinitionevaluation)
and [engine262 at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/ClassDefinitionEvaluation.mts).
Evidence remains in ignored build/generator-class-key-* paths until combined acceptance.
