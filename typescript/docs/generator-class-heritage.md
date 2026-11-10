# Suspended class heritage

A class-scope frame retains the strict inner environment and its outer frame.
Resumption, including delegation, restores the innermost expression scope;
normal completion and abrupt unwinding restore the outer scope. The inner class
name stays uninitialized until constructor and method creation complete.

The heritage frame reuses shared constructor/method helpers. Named evaluation is
passed explicitly from declarations, assignments and object properties, so an
anonymous class keeps its intended name even when heritage suspends. Names do not
propagate into unrelated conditional or nested expressions.

Tests cover class declarations/expressions, TDZ and escaped closures, nested and
interleaved classes, strictness, naming, return/throw/delegation cleanup, async
resumption, error Realms and current-session budgets. Suspended computed class
keys remain separate.

Reviewed against [ECMA-262 ClassDefinitionEvaluation](https://262.ecma-international.org/16.0/#sec-runtime-semantics-classdefinitionevaluation)
and [engine262 ClassDefinitionEvaluation](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/ClassDefinitionEvaluation.mts).
Private fields/decorators are outside this implementation. Evidence stays under
ignored build/generator-class-heritage-* paths pending combined acceptance.
