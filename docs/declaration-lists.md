# Standalone declaration lists

TS-543 is accepted after full canonical validation.

Script `let`, `const`, and `var` declarations accept ordered lists of identifiers
and array/object binding patterns. Patterns may occur first or later. Lexical
names enter declaration planning before initialization begins; initializers and
patterns then execute in source order in the existing environment. Defaults,
rest, computed keys, function names and iterator cleanup use the shared binding
operations. Abrupt completion prevents later declarators from running.

The syntax tree uses a declaration-list node containing existing declaration
nodes. It creates no block scope. Generator and async execution use the existing
sequence frames, preserving the current caller's budget and defining Realm.
Plain identifier-only `var` lists retain their existing representation. Legacy
profile parsing is unchanged.

Classic-for lexical lists and binding-pattern initializers remain a separate
follow-up. Catch patterns and optional catch bindings remain unsupported.

Eighteen independent Node Script controls cover ordering, TDZ, closures, mixed
patterns, inferred names, abrupt completion, iterator closing and suspension.
Nine invalid programs have independent Node syntax-error evidence. Additional
typed controls check defining-Realm allocation, caller budgets and session
cleanup after resuming a declaration list.

The first full Node suite passed 991/994 cases. Two historical test files still
expected valid const/let lists to reject; their original sources and failing
results are retained. Reviewed replacements check const values and declaration
setup TDZ while preserving malformed-declaration rejection. The amended suite
passes all 994 cases and 35 runner checks. The extended edge-test run also passes
994/994 and 35/35; all 991 unaffected results and all 994 expectations are unchanged.

Reference: [ECMAScript 2025 lexical declaration evaluation](https://262.ecma-international.org/16.0/#sec-let-and-const-declarations-runtime-semantics-evaluation).

The first tooling run passed 294/296 checks. One frozen plan still expected a
valid let list to reject. The other failure exposed a lexical-Statement audit
that recognized a single let node but omitted declaration-list nodes. Normal
parsing continued to reject declarations in that Statement position; the audit
now records the same-parse keyword candidate for the list as well. Explicit
current expectations preserve both original historical fixtures. The repaired
draft passes 994/994 Node guests, 35 runner checks, 19 fresh native static-only
and zero-dynamic gates, 31 native semantic cases and all 296 tooling tests.
Canonical validation passed on integrated source: 994/994 guests per host,
476 static-only/zero-dynamic native gates, 296 tooling checks, 35 runner checks,
ten probes and typechecking. All 225 corpus records match the preceding accepted
milestone, retaining 191 completions. Evidence: build/declaration-list-rollup-*.
