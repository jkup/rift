# Class definition and construction

TS-153 is in design. Classes remain unsupported while TS-152 object assignments validate. The first implementation boundary is base class declarations/expressions, ordinary methods, accessors and static methods. Inheritance follows after newTarget and derived-this state are designed; fields, private elements, static blocks, async methods and generators remain separate.

## Source and scope

Use an explicit class node with original name, body and element spans. Add class declaration/scope metadata to the closed planner and serializer schemas. The outer declaration is mutable and lexical; the optional inner name is immutable. All class code is strict, including method bodies and computed keys. The inner name remains uninitialized during key evaluation. Retain each method's original source and the whole class source independently.

A default constructor has no source function body. Do not invent parameters or a function declaration for the parser. Class-constructor metadata should refer to the validated class node and an optional actual constructor-body scope. The default base path allocates and returns an instance directly; explicit constructor bodies reuse function activation. Both expose whole-class source and reject ordinary calls with errors from the defining Realm. Ordinary methods remain nonconstructable.

## Runtime integration

Reuse declaration environments, property descriptors and guest completion records. Class evaluation creates the prototype and constructor, installs nonenumerable methods/accessors in source order, and initializes the inner name only after successful element evaluation. Keep class-constructor prototype property attributes distinct from ordinary function attributes. Anonymous class names must participate in existing declaration, assignment and destructuring-default name inference.

Current Script construction always uses the callee as newTarget and allocates this before body execution. Derived construction needs explicit newTarget propagation and an uninitialized this binding, with super binding that receiver once. Home-object metadata and super references must preserve receiver identity. Default derived forwarding must not invoke an array iterator. Review built-in and bound constructors when generalizing construction; ordinary function behavior must stay covered.

## Validation boundary

Base-class tests should cover lexical TDZ, inner versus outer names, strict code, duplicate constructors/formals, accessors/static methods, computed-key side effects, descriptors, constructor return rules, call-without-new, method nonconstructability, original source, inferred names, and cross-Realm allocation/errors. Whole-source audits must reject unsupported class elements before execution. Require focused and full Node/native validation with parsed zero-dynamic coverage.

The original class-test.js needs inheritance, explicit super calls and super property access; test-class-getter-setter.js needs default derived construction. Do not count either as a completion at the base-class boundary. scoping-redeclaration-test.js is another source to inspect after class declarations work.

## References

Review [ECMAScript 2025 class definitions](https://262.ecma-international.org/16.0/#sec-class-definitions), especially early errors and ClassDefinitionEvaluation. The initial design also uses engine262 [ClassDefinitionEvaluation.mts](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/ClassDefinitionEvaluation.mts) and [MethodDefinitionEvaluation.mts](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/MethodDefinitionEvaluation.mts), pinned at 18cdeb03c363eb31d775648a0d070bdc8a26ced1. The engine's optional decorator branches are outside this design. Complete the early-error and constructor algorithm review before implementation.
