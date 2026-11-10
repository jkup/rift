# Direct generator yields

Generator bodies can suspend at direct `yield value;` or `yield;` statements.
The saved continuation contains the prepared function frame and the index of the
next statement. A yield completion carries the value and source location out of
statement evaluation. Resumption installs that frame in the current engine and
continues at the saved cursor; it never reruns the prefix of the body.

This first slice admits no pending enclosing control flow at a yield. Blocks,
loops and try statements can execute normally between yields, but yields inside
them remain parse-blocked. Expression-level yields and delegation also remain
blocked. These restrictions allow return/throw resumes to terminate directly;
there is no pending finally clause or iterator to unwind. Extending the grammar
requires corresponding structured continuation records first.

The generator transitions from suspended-start to executing, then suspended-yield
or completed. Reentry is rejected. A failure before entering the resume operation
leaves the continuation intact; a body resource stop or host fault completes it
and restores the caller. Suspended state contains data, not an old engine or
operation context. Each resume uses the current session's budget.

Yield result objects are allocated while the generator frame and Realm are
active. Terminal result objects are allocated after returning to the resume
caller. Abrupt resumes retain the yield source location and captured Realm.
A normal next argument is unused for a bare yield statement, whose expression
result is discarded.

The original generator-start yield rejection source is preserved as an explicit
positive execution case. Focused tests exercise effects once, lexical retention,
multiple resumes, defaults, iteration consumers, abrupt resumes, reentry,
foreign Realms, current budgets and host-fault cleanup. The full acceptance
matrix remains a separate integration gate.

References: [GeneratorYield and GeneratorResumeAbrupt](https://tc39.es/ecma262/multipage/control-abstraction-objects.html#sec-generatoryield)
and [engine262 generator operations at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/abstract-ops/generator-operations.mts).
