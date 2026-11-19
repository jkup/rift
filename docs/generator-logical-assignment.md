# Suspended logical assignments

Logical assignments share the ordinary short-circuit predicate after capturing
and reading their reference. A decisive old value skips the RHS continuation and
returns immediately; otherwise the existing compound frame retains the reference
until the RHS resumes. The writing branch puts the RHS directly, without a
binary conversion. Property and super targets use the same cached-key references.

Tests cover all operators with skipped and evaluated yields, suspended property
keys and super targets, captured bases, mutation during suspension, accessors,
const errors, cleanup, async methods, error Realms and current-session budgets.
The original generator nullish-assignment rejection and the logical-assignment
RHS/target/await boundaries are retained as executing tests.

See [ECMA-262 assignment evaluation](https://262.ecma-international.org/16.0/#sec-assignment-operators-runtime-semantics-evaluation)
and the pinned engine review in [logical assignment](logical-assignment.md).
Evidence stays under ignored build/generator-logical-assignment-* paths pending
combined canonical acceptance.
