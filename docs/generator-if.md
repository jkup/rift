# Suspended if conditions

Generator if statements pass a branch receiver to the existing expression
continuation. Normal completion selects one branch using ToBoolean and schedules
it in the saved lexical frame. A rejected/returned resume discards that receiver
through the same catch/finally unwind path as other expressions.

The receiver retains AST branches, not an execution engine or session. Statement
nesting and budgets remain charged when the selected branch runs. Tests cover
empty and nested branches, lexical TDZ, loops and labels, delegation, abrupt
resumption, current-session resource failure and the exact old rejection input.
Loop conditions and calls containing yield remain separate boundaries.

The branch rule follows [ECMA-262 IfStatement evaluation](https://262.ecma-international.org/16.0/#sec-if-statement-runtime-semantics-evaluation).
