# Classic-for declarations

TS-545 passed full canonical acceptance: 995 guests on each host, 477 native
static-only/zero-dynamic gates, 296 tooling checks, 35 runner checks, ten probes
and typechecking. The original 225-file corpus retains 191 completions with no
changed outcomes. Evidence: `build/classic-for-rollup-*`.

Classic-for heads accept ordered identifier and binding-pattern declarations.
Lexical heads create all names before initialization. Each initializer and pattern
runs in source order using the shared declaration operations. Let loops copy all
bound values into a new environment before the first test and before each update;
initializer closures retain their original environment. Const loops retain one
environment. Empty patterns create no per-iteration binding copies.

Declaration planning retains each binding site and its own initializer span.
The shared loop activation retains the existing for-in/of binding path. Var
patterns use declaration execution without creating a lexical loop environment.
Generator and async initializers use existing sequence frames, including multiple
suspensions, rather than a separate initializer evaluator.

The focused driver covers 23 independently specified positive outputs and ten
independent syntax-error inputs, exact parse error kinds/phases, defining-Realm
allocation, current-caller budgets, session cleanup and initializer/site spans.
For-in/of lists and invalid classic for-await remain rejected. A historical
lexical-for test retains its two previously rejected list/pattern sources and
now checks execution and scope isolation. Original failures and snapshots remain
in the draft validation artifacts.

See [the source and specification review](classic-for-declaration-review.md) for
scope, C++ evidence and the CreatePerIterationEnvironment requirements.
