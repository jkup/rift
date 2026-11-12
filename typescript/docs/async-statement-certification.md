# Async function declarations in Statement positions

TS-494, isolated implementation, 2026-11-12. Bounded Script preparation audits
only parse.declaration-statement rejections. A fresh supported-grammar parse may
record ordinary async function declarations in branch or labelled Statement
positions; certification requires a complete parse and the same first diagnostic.
The audit cannot emit executable nodes. Ordinary functions, generators, async
generators and classes retain their existing rejection behavior.

The new async-function-statement rule is distinct from lexical declarations.
See [the grammar review](declaration-statement-review.md) for the specification
and Annex B boundaries. The observation type, producer and two closed Script
decoders admit the rule together. The exact historical codec-closure test records
this one rule addition without changing its retained baseline.

The focused driver passes on both hosts with 55 controls: 30 strict/sloppy invalid declarations,
12 valid neighbors, 11 unsupported/resource precedence cases and two eval checks.
All 144 reviewed syntax inputs retain their expected classifications on both hosts. Both
unchanged pinned U02 variants certify with the original diagnostics. Eight real
Node producer/codec records pass across parse-only/execute and harness/test roles;
unknown rules and wrong phases are rejected.

An initial typecheck exposed the separate Script observation rule union. Its
matching addition is part of this task; subsequent typechecking passes. All 951
Node guests and 35 runner tests pass. Focused native builds and the reviewed probe
pass static-only compilation and zero-dynamic coverage; executable hashes and all
1063 frozen inputs were verified before execution. All 15 native tooling builds,
296 tooling tests, eight producer records per host and 16 parent envelopes pass.
Capability admission remains unchanged. Integration and combined acceptance
remain pending; canonical return-certification inputs stay frozen while their
native validation runs.
