# Contextual await identifiers

TS-501, isolated successor to READY TS-496. Bounded Script parsing admits `await`
as an identifier where the grammar permits it, including strict Script code.
Legacy parsing and Module-goal limitations remain unchanged. Invalid async names,
parameters and static-block forms retain explicit unsupported-syntax rejection;
this feature introduces no new certified syntax-error rule.

Identifier reservation is separate from await-expression parsing. Function names,
formal parameters, ordinary and async arrow bodies, class fields and static
blocks establish and restore their grammar contexts. Potential `async(...)`
arrows collect identifier sites until the call/arrow distinction is known.
Calls retain the enclosing cover's candidates; nested function bodies and class
field initializers establish their own contexts. Property names do not count as
identifier references. See the preceding contextual and await grammar reviews.

Initial Node checks pass all 136 reviewed syntax controls, 72 execution cases and
17 effect-free invalid preparation controls. Execution covers bindings, patterns,
labels, function names/defaults, nested async/ordinary functions, class fields,
eval, Function construction and valid `async(...)` calls. The exact historical
input `var await=1;` moves from unsupported to ready and remains in its original
test driver; the migration is recorded in build/await-expectation-migration.json.

All 953 Node guests and 35 runner tests pass. The focused driver, historical
expectation migration and 136-case reviewed probe pass on both hosts with
static-only compilation and zero dynamic operations. The focused driver analyzes
20,364 static statements. Eight valid Node producer records pass the closed codec.

An initial cleanup-wrapper failure occurred after the first native test passed.
Its log is retained; the corrected wrapper reused that result only after checking
its source snapshot, executable hash and complete verdict, then finished the two
remaining native checks. No engine workaround or gate relaxation was needed.

All 1066 source/control inputs are frozen. All 15 native tooling builds pass
static-only compilation and zero-dynamic coverage; all 296 tooling tests pass
without skips. Eight producer records per host and 16 parent envelopes pass the
closed protocol checks. Final readiness verifies the predecessor, source and
executable hashes, exact manifest additions and owned-file boundaries. Promotion
requires predecessor integration and completion of the canonical native milestone.
