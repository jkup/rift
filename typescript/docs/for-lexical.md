# Traditional lexical for loops

TS-126 adds one identifier binding in `for (let i = start; test; update)` and `for (const i = value; test; update)`. A let initializer may be omitted. Multiple bindings, destructuring, for-in and labels remain outside this slice.

The declaration collector gives the complete loop its own source-ranged scope. The initializer, test, update and body share that lexical parent. Body vars still hoist and conflict with the head name; a nested body block may shadow it. Preparation remains inert.

Execution creates an uninitialized head binding before evaluating its initializer, including function name inference. Let copies its current value into a fresh environment before the first test and after each continuing body, before the update. Every copy has the original outer environment, avoiding an iteration-length environment chain. Initializer closures therefore retain the initial binding; body closures retain that iteration's value. Const uses one immutable binding throughout. All exits restore the outer execution frame, including fatal engine stops and host faults.

The ordinary var/expression for path shares the same body evaluator, retaining completion values and break/continue behavior. Environment creation remains behind the record's execution key with Realm validation and allocation ticks.

Semantics follow [ForLoopEvaluation, ForBodyEvaluation and CreatePerIterationEnvironment](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-for-statement). V8's [DesugarLetBindingsInForStatement](https://github.com/v8/v8/blob/main/src/parsing/parser.cc) was consulted on 2026-11-09 for update timing and completion handling. Rift creates environments directly rather than introducing synthetic loops and temporaries.

Validation is in progress. The focused driver passes Node and native execution with 7396/7396 static statements. Tests cover closures from all four loop positions, TDZ, mutation, const, nested scopes, finally/continue, declaration conflicts, completion values, foreign Realm errors and resource limits. Historical rejection sources are retained with explicit current expectations; infinite loop sources execute only with bounded sessions.
