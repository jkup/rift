# Public class fields without initializers

Class elements now distinguish fields from methods/accessors. This first slice
supports public fields with no initializer. Initializer expressions, private
elements and static blocks remain explicitly unsupported.

Keys are evaluated once at class definition. Instance records stay with the
constructor; static records run after all keys and methods and after the inner
class name is initialized. Both ordinary and suspended class evaluation share
that finalization path. Fields define own writable/enumerable/configurable
properties with undefined values, bypassing inherited setters.

Base construction defines fields before parameter defaults and the body. Default
derived construction defines its fields on the parent's returned object. Explicit
super calls bind this before field definition, preserving the binding if a field
throws and the constructor catches it. Field definition uses the class's Realm
and source record and restores the calling frame, including on budget/error exits.

Parsing distinguishes static/get/set/async field names and modifiers, supports
semicolon insertion, and retains the special constructor/prototype restrictions.
Computed constructor keys are ordinary property keys. Existing constructor
name/length keys retain their original order when overwritten by static fields.

Tests cover descriptors, field order, parameter timing, parent replacement
objects, inherited setters, duplicate/computed/symbol fields, modifier parsing,
class-name TDZ, suspended keys/heritage, source text, exotic receivers, preserved
derived this after errors and defining-Realm source attribution. Initial tests
incorrectly expected overwritten name/length keys in field-source order; that
expectation was corrected, with the initial test retained in build/initial-test.ts.

References:
- https://tc39.es/ecma262/#sec-runtime-semantics-classdefinitionevaluation
- https://tc39.es/ecma262/#sec-initializeinstanceelements
- https://tc39.es/ecma262/#sec-definefield
- engine262 ClassDefinitionEvaluation.mts and function-operations.mts at
  18cdeb03c363eb31d775648a0d070bdc8a26ced1 (decorator branches excluded).

Additional coverage exercises suspended async keys and super calls, replacement/frozen parent objects, cross-Realm ownership, and uncatchable construction budgets. The old BigInt field rejection becomes a positive own-property assertion; a comma-separated field remains invalid.
