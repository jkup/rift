# Private class elements review

TS-457, 2026-11-11. This is an implementation plan, not feature acceptance.
Public fields and static blocks are accepted; private syntax and storage remain
unsupported. The review ran 15 semantic and ten syntax-error checks under
Node 26.13.0. Inputs and results are retained in
`build/review-private-elements-reference.mjs` and
`build/private-elements-reference.json`; these are reference-engine checks only.

## Required semantics

Private names have identity per class evaluation. A lexical private environment
connects names to closures, including nested classes and initializers. Duplicate
declarations are invalid except a matching getter/setter pair with the same
staticness; `#constructor` is invalid. Static private methods are installed before
static fields and blocks. See [class definitions and early errors](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-class-definitions).

Private lookup checks the receiver's own private elements. Missing elements,
assignment to methods, or absent accessor halves throw TypeError. Instance
methods/accessors precede ordered field initialization. Field insertion happens
after its initializer returns, and duplicate insertion fails. Private elements
are independent of ordinary properties and extensibility. See
[private operations and initialization](https://tc39.es/ecma262/multipage/abstract-operations.html#sec-privateelementfind).

The pinned reference is engine262 commit
`18cdeb03c363eb31d775648a0d070bdc8a26ced1`, particularly
[ClassDefinitionEvaluation](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/ClassDefinitionEvaluation.mts),
[ClassFieldDefinitionEvaluation](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/ClassFieldDefinitionEvaluation.mts),
and [MemberExpression](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/MemberExpression.mts).
Its non-decorator paths separate private identities, captured environments and
private references. Adopt that separation, not its generator-based evaluator or
decorator branches. No source code is copied.

## Existing boundaries to change

`syntax.ts` gives class fields and methods ordinary expression keys. Introduce
explicit private declarations and member references rather than encoding names
as strings or guest Symbols. Keep public key coercion on its current path.
The lexer needs a distinct private-identifier token; validate Unicode spelling
with the reviewed identifier backend and retain original source offsets.

`parser.ts` currently processes a class in one forward pass. Resolve private
uses against complete class declarations so forward references work. Nested
classes need lexical shadowing; their heritage uses the enclosing private
environment. Do not certify unresolved private names as runtime errors. Extend
the declaration planner, expression visitors, assignment-target audit and
serialized observations together when syntax becomes admitted.

`script-execution-internal.ts` currently types frame private environments as
null, hard-codes null on capture/restore paths, and requires callable metadata
to report null. Change those invariants deliberately. A private environment
must survive method materialization, field/static-block frames, closures,
cross-session calls, suspension and direct eval. Indirect eval must not inherit
it. Reusing lexical variable bindings would conflate two different namespaces.

Attach identity-keyed private entries directly to each GuestObject. This avoids
a global strong registry retaining otherwise unreachable receivers. Property
enumeration, descriptors, freezing and prototype walks must remain independent.
Keep explicit completions and charge storage/lookup work to the current context.
Do not use a single constructor brand: a failed initializer can leave only some
private fields installed, and a derived constructor can stamp a returned object.

Preserve the uniform `ClassInitializerRecord[]` storage on both constructor
paths. TS-444 already demonstrated that widening mutable arrays can silently
copy them in scriptc; verify any new private-entry or initializer conversions
with native identity probes before integration.

## Bounded implementation order

1. Add internal private-name/environment/storage primitives with native identity,
   duplicate insertion, accessor, budget and Realm tests. Keep syntax unsupported.
2. Extend tokens, AST and complete-class private-name validation; add negative
   phase tests and nested/forward-reference planning. Keep execution explicitly
   unsupported until its environment propagation is complete.
3. Integrate instance/static private fields and references, including read/write,
   update/compound assignment, calls and optional access. Cover returned-object
   stamping, frozen receivers, partial initialization and base/derived shadowing.
4. Add private methods/accessors and `#name in object`, preserving initialization
   order, accessor pairing and method non-writability.
5. Audit suspension, destructuring targets, direct eval and foreign Realms across
   the admitted surface, then run the full combined acceptance gates.

Each increment needs explicit unsupported boundaries for later work and both-host
expected-result tests. The reference cases establish minimum semantics, not full
coverage; add escaped names, initializer failure ordering, resource cutoffs,
caller restoration and static/instance cross-access negatives during implementation.
