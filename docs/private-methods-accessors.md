# Private methods and accessors

TS-466 is in progress. Each class keeps separate insertion-ordered maps of
instance and static private methods/accessors. Getter and setter declarations
share one private name and one accessor record. Function materialization keeps
the class private environment, strictness, inferred name and home object.

Initialization installs all applicable private methods and accessors before any
field initializer or static block. A duplicate stamp therefore fails before
field side effects. An abrupt later field initializer leaves the installed
methods present. Ordinary property storage and extensibility remain separate.
Static installation metadata is released after successful static initialization.

The existing private reference path handles reads, calls, assignments, updates,
optional access, direct eval and suspension. Method writes and missing accessor
halves produce TypeError through the private-element backend. A shared class
element frame supplies the defining Realm and private environment during
installation; field initializers extend it with their own lexical scope.

The design follows the specification and pinned engine262 revision recorded in
`class-private-elements-review.md`, particularly ClassDefinitionEvaluation and
InitializeInstanceElements. Twelve independent Node reference checks cover
initialization order, partial failure, accessor pairing, names and home objects.
Focused Rift Node tests and typechecking pass. Native/full-suite validation
remains pending. Private brand checks (`#name in object`) remain unsupported.

Two historical test files retain their exact input strings while migrating
method/accessor declarations to supported expectations. The exact replacements
are retained in `build/private-method-test-migrations.json`.

Isolated validation passes935/935 Node guests, focused native static-only/zero-dynamic execution, ten native regression groups, fifteen tooling-driver builds and296/296 tooling tests. Eight real native producer records match Node, and sixteen records pass parent envelopes. Combined canonical acceptance remains pending.
