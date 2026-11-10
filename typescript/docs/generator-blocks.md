# Generator blocks and conditionals

A generator continuation now holds a stack of statement sequences. Each sequence
retains its body, next-statement cursor, lexical frame and relative nesting depth.
Entering a block creates and instantiates its lexical environment once; entering
an if statement evaluates its test once and schedules only the selected branch.
Finishing a sequence exposes its parent, whose frame is restored before the next
statement. Closures retain the same lexical cells across resumes.

The ordinary statement evaluator still performs admission, budget checks, block
instantiation and condition evaluation. When a generator sequence is supplied,
block and if statements schedule their child sequence instead of recursively
executing it. Statements that cannot contain an admitted yield continue through
the existing synchronous path. Stored depth is relative to the current resume
caller, so suspension does not erase the evaluation nesting limit.

No pending cleanup is admitted in this slice: yields in loops, labelled
statements, switch, try/catch/finally and expressions remain blocked. Return or
throw from a suspended block can therefore discard the sequence stack directly.
Supporting cleanup scopes requires explicit unwind records, not replay.

Tests cover nested lexical shadowing, closure mutation, TDZ across suspension,
block function instantiation, selected branches, exact side-effect order,
return/throw, direct eval, cross-session frames and the remaining grammar boundary.
Existing block/if rejection inputs are preserved as positive execution cases.

This extends the [direct-yield state model](generator-yield.md), based on the
same specification and pinned engine262 generator-operation references.
TS-216 extends the sequence stack with while/do-while test/body records and
unlabelled break/continue routing; see [generator loops](generator-loops.md).
