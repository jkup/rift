# Private environment capture

TS-463 replaces null-only private-environment metadata with explicit captured
identity. Private fields, methods, accessors and references remain unavailable
to guest execution; this prerequisite tests the environment path using actual
Script functions and public classes.

Each class evaluation activates a fresh PrivateEnvironment after heritage and
prototype-parent evaluation. Nested classes link to the enclosing environment.
Constructors, methods, public field initializers, static blocks, parameter/body
declarations and closures capture the active environment. Function activation
uses the callable's captured environment, including cross-Realm calls. Opaque
callable checks compare the public getter against the retained metadata rather
than assuming null. Global functions and dynamic Function construction keep
null roots.

Direct eval inherits the caller's private environment for closures and declared
functions; indirect eval starts at null. This does not yet admit private tokens
inside eval. Frame inspection reports the real identity. Existing saved-frame
restoration handles ordinary and abrupt exits.

For suspended class evaluation, the class-scope continuation's frame is updated
after heritage and before keys. Otherwise resuming a computed key would restore
the enclosing private environment. Tests check this boundary, generator return
while a class key is suspended, async/generator closures, direct and indirect
eval, cross-Realm invocation and abrupt static initialization. The initializer
arrays retain their uniform union element type from TS-444.

The reference design is the pinned engine262 implementation recorded in
`class-private-elements-review.md` and the specification's
[ClassDefinitionEvaluation](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-runtime-semantics-classdefinitionevaluation)
and [DefineMethod](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-runtime-semantics-definemethod).
The implementation defers allocating the currently empty private environment
until it becomes active; the specification allocates it before evaluating
heritage but keeps the enclosing one active during heritage. No guest operation
can observe that allocation timing in this prerequisite.

Isolated validation passes 932 Node guests, the focused native test with
19,649 static statements and zero dynamic statements, eight regression groups
(including both function-materialization inputs), 15 native tooling builds
and all 295 tooling tests. Integration remains queued behind the Unicode rollup.

The initial native build rejected null-first validation of an optional private
environment with SC1090. The reduced TS-463 compiler probe shows that testing
the instance before narrowing null preserves semantics and compiles statically.
The original full source and failed build remain retained; acceptance requires
fresh checks of the corrected ordering.
