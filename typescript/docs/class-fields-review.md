# Public class fields: integration review

Reviewed 2026-11-10 after the isolated Temporal successor chain. No class-field
syntax or runtime behavior is enabled by this review.

Public instance and static fields are the next bounded class increment. Keep
private names, decorators and static blocks explicitly unsupported. Parse fields
only when their planner, certification and execution paths land together.

## Representation and ownership

Use a discriminated ClassElement union: existing method/accessor records retain
their function value; a field has its own nullable initializer and source span.
Do not overload a null function value: both class evaluators currently skip an
element whose value equals constructorMethod, and both can be null for a default
constructor. An explicit field branch prevents silently dropping empty fields.

Computed keys run once at class definition, in source order, in the outer
execution's class lexical environment. Initializers run later in a separate
strict field-initializer context. Keep that distinction in declaration scopes,
metadata, snapshots and validation. Do not synthesize a constructor body or
pretend an initializer has source-function text.

A stored field record needs its resolved PropertyKey, initializer node/scope,
class lexical environment and home object. The constructor owns the ordered
instance records. Static records are temporary until class initialization ends.
Keep all mutable records within their defining Realm/ExecutableScript lifetime.

## Execution sites that must change together

- script-execution-internal.ts #construct: base classes initialize instance fields
  after allocating this and before parameter/default/body evaluation, including
  the default-base fast path.
- The default-derived fast path must initialize its own fields on the actual
  object returned by the parent constructor, after parent initialization.
- #finishSuperCall must bind derived this before initializing derived fields.
  If an initializer throws and the constructor catches it, this is already bound.
- #classExpression and the suspended class-element continuation both collect
  fields while evaluating keys/installing methods. Initialize the inner class
  name and finish all key/method processing before executing static fields.

A field defines an own writable/enumerable/configurable data property. It must
not invoke an inherited setter. An initializer uses its receiver as this and
its home object for super properties; new.target is undefined. The function name
of an anonymous initializer result is inferred from the field key. Preserve
explicit completions, budget stops, defining-Realm errors and caller restoration.

## Parser and audit boundary

Disambiguate static/get/set/async as field names versus modifiers; implement
field semicolon/line-terminator handling rather than treating every missing
parenthesis as a field. Check constructor/prototype restrictions against the
normative early errors before enabling syntax. Initializers need their own
arguments/await/yield/super-call restrictions while nested ordinary functions
reset the relevant contexts and arrows inherit lexical restrictions.

All current element-value traversals must branch on the new kind. In particular,
review script-declarations.ts class scope collection, parser generator-expression
admission, retained AST validation and the existing source-only audits. Preserve
historical negative inputs when updating certifications; do not simply remove
old rejection tests that become executable.

## Acceptance

Cover base/default/explicit/derived constructors, parent replacement objects,
field order before parameter defaults, duplicate fields, inherited setters,
computed symbol keys, all keys before static initialization, inner-name TDZ,
static this/super, abrupt initializer handling, recursive construction, anonymous
function naming, cross-Realm construction and frozen receiver failures. Exercise
class keys suspended by yield/await and initialization after resuming another
session with current budgets. Reject private fields and static blocks explicitly.

Require focused Node/native execution and zero-dynamic coverage, then the full
canonical guest/tooling/runner/probe/corpus gates before publication. The original
225 fixtures do not establish field conformance; keep expected-result tests.

## Sources

- Existing docs/class-design.md and the current parser, declaration collector,
  callable state, constructor paths and generator class-element continuation.
- https://tc39.es/ecma262/#sec-runtime-semantics-classdefinitionevaluation
- https://tc39.es/ecma262/#sec-initializeinstanceelements
- https://tc39.es/ecma262/#sec-definefield
- engine262 ClassDefinitionEvaluation.mts and function-operations.mts at
  18cdeb03c363eb31d775648a0d070bdc8a26ced1; decorator branches excluded.
