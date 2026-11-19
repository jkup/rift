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
Both guest suites pass 461/461, full tooling290/290, runner30 and probes10 pass. All 84 native entries pass build and static coverage in the restarted invocation; loop driver4904/4904 static. Initial Node457/461 caught a stale do rejection and an unnecessarily reworded legacy host guard; 54d954fc restores the diagnostic and checks break outside the completed loop instead. The initial native run was interrupted; original logs are retained. All 225 C++ fixture results agree across hosts: 64 reported successes, 29 unchecked completions, 55 parse errors, 75 runtime errors and two reported failures. All three do-while fixtures succeed, and all 90 previously successful or unchecked files retain their outcomes. Logs: build/do-while-*.
