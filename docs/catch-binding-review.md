# Catch binding boundary review

TS-549 ran fourteen independently specified programs against Node and the frozen
TS-547 isolated Node/native CLIs. Both Rift hosts agree exactly. Three existing
identifier controls pass: outer shadowing, the legacy same-name var binding, and
closure capture. Eight valid optional/pattern controls reject during parsing.
Three invalid controls reject too; pattern rejection alone does not establish
correct duplicate-name or conflict certification.

Evidence is retained in build/catch-binding-review/reviewed.json, including raw
programs, all process results, the static coverage gate hash and executable hash.
The producer verifies engine source hashes against the reviewed predecessor.
Neither original fixtures nor active validation inputs changed.

The C++ parse_catch_clause explicitly requires parentheses and an identifier.
Optional catch bindings and catch patterns are therefore shared gaps, not missing
C++ fixture passes. This review advances the remaining TS-152 language work.

The [ECMAScript 2025 catch semantics](https://tc39.es/ecma262/2025/multipage/ecmascript-language-statements-and-declarations.html#sec-runtime-semantics-catchclauseevaluation)
provide two paths. Without a parameter, evaluate the handler block directly.
With a parameter, create bindings before initialization, restore the outer
environment on abrupt initialization, and then evaluate the handler. Pattern
names must be distinct and avoid conflicting handler declarations; preserve the
separate legacy rule for a simple identifier.

Optional bindings are the next bounded implementation. Represent absence
explicitly, preserve source spans, and avoid inventing a catch parameter or a
parameter environment. Declaration planning and executable associations currently
require a catch scope with exactly one lexical name. Update those invariants
alongside both synchronous and suspended catch execution. Keep handler block
scope and existing finally/completion restoration. Test strict code, nested
handlers, closure lifetime, var/lexical scope, direct eval, return/break/continue,
generator/async suspension and resource cleanup.

Catch patterns need a separate follow-up using existing binding initialization.
The controls cover defaults, renamed properties, iterator closing, abrupt default
initializers and TDZ. Planning must collect every bound name and traverse pattern
expressions; activation must initialize all names in the catch environment.
Do not broaden the simple-identifier var exception to destructuring patterns.
Review suspension inside computed keys/defaults before admitting this path.
