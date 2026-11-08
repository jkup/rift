# Do-while loops

TS-070 adds `do…while` to Script parsing and execution. The body runs before the
first test. Normal and continue completions reach the test; break exits without
testing, and return/throw propagate. The existing loop machinery preserves the
last nonempty completion value and consumes the normal execution budget.

Block environments are fresh on each iteration. Declaration collection visits
the body before the condition, including functions embedded in either. Bare
lexical/function declarations remain invalid statement bodies. The lexical
statement audit now recognizes the do-while body context. Labels remain
unsupported. The trailing semicolon may be omitted for do-while; this does not
enable general automatic semicolon insertion. Legacy parsing is unchanged.

This follows [DoWhileLoopEvaluation](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-do-while-statement-runtime-semantics-dowhileloopevaluation).
The C++ parser and control-flow evaluator were consulted. Tests cover condition
order, abrupt completions, completion values, nested loops, closures and var
hoisting, source retention, invalid contexts and resource limits.
Native acceptance pending.
