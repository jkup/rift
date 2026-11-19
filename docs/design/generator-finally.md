# Generator finally continuations

Finally boundaries participate in the same explicit unwind path as catch and
loop control. Leaving a protected body schedules its finalizer with a pending
completion. A cleanup record retains that completion while the finalizer yields;
normal cleanup restores it, while a new return/throw/break/continue overrides it.
Nested boundaries unwind from inner to outer without replaying any body prefix.

Pending throws also retain their diagnostic source snapshot across sessions.
A caught cleanup throw does not replace the source of an original pending throw
when cleanup later completes normally. Fatal resource/unsupported stops and host
faults bypass guest cleanup, consistent with synchronous execution.

Tests cover normal cleanup, pending and overriding returns/throws, nested
finalizers, catch/finally ordering, break/continue through yielding cleanup,
delegation during cleanup, foreign-session throw identity/source, and resource
and host-fault bypass. Preserved historical finally-yield rejection inputs now
have explicit positive execution expectations.

Expression-position yields and iterator-loop cleanup remain unsupported.
The design follows the completion precedence in [ECMAScript try evaluation](https://tc39.es/ecma262/multipage/ecmascript-language-statements-and-declarations.html#sec-try-statement-runtime-semantics-evaluation)
and [engine262 TryStatement at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/TryStatement.mts),
using stored records rather than a host generator stack.
TS-222 admits direct yield expressions in single binding initializers and returns;
see [yield expression receivers](generator-receive.md). Nested expression
continuations and iterator-loop cleanup remain subsequent work.
