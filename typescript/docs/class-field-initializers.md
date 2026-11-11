# Public class field initializers

Field initializers have their own strict planner scope and a lexical environment holding the receiver, home object and undefined new.target. Nested arrows retain this environment; ordinary functions establish their own. The field scope retains its actual source range without inventing a source-function body or exposing an initializer callable.

Computed keys run during class definition. Instance initializers run in declaration order at the existing base/derived constructor initialization points. Static initializers run after keys and methods, with the inner class name initialized. Fields define own data properties after evaluating their initializer, bypassing inherited setters. Anonymous functions/classes receive the field key's inferred name.

Direct eval inherits the field receiver and super context. Fully prepared eval source with an arguments reference outside an ordinary function is rejected with SyntaxError before execution. Syntactic arguments references in field initializers remain an explicit preparation rejection under the existing parser provenance policy. Private fields, decorators and static blocks remain unsupported.

The historical `class C{x=1}` input now has execution and planning assertions rather than an unsupported-feature expectation. Original sources are retained in originals.json. Audit snapshot and setup helpers widen their internal types for the new scope/environment; historical expected data is unchanged.

References: [ClassFieldDefinitionEvaluation](https://tc39.es/ecma262/#sec-runtime-semantics-classfielddefinitionevaluation), [DefineField](https://tc39.es/ecma262/#sec-definefield), and engine262 ClassFieldDefinitionEvaluation.mts/function-operations.mts at revision 18cdeb03c363eb31d775648a0d070bdc8a26ced1. Decorator branches are excluded. Combined acceptance remains pending.
