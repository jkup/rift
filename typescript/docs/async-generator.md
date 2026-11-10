# Async generator requests

Async generator calls prepare parameters synchronously and return a lazy generator.
The generator owns its detached continuation and a request queue. next/return/throw
allocate intrinsic Promises in the method Realm, enqueue the request and resume
only when no body execution or Promise wait is active. A queue cursor avoids
repeated array shifts. Reentrant requests join the same queue.

Await and yield reuse the expression/statement continuation. Yield values are
implicitly awaited; a rejection resumes the body as a throw. Return expressions
are awaited before unwinding finally, while bare return has no extra checkpoint.
Return requests after yield also await their argument before body cleanup.
Completed queues settle next/throw directly and await each return in order.

Promise reactions retain only generator state and mode. They run with the current
session budget and reconstruct the defining frame for body assimilation. Repeated
synchronous PromiseResolve failures feed an iterative queue drain, avoiding host
recursion. Fatal failures discard the activation and pending requests rather than
becoming guest rejections or entering guest cleanup.

Declarations, expressions and the intrinsic AsyncGeneratorFunction constructor
are supported. Methods and yield-star delegation remain separate slices.

Sources: [ECMA-262 async generator objects](https://262.ecma-international.org/16.0/#sec-asyncgenerator-objects),
[engine262 18cdeb03 operations](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/abstract-ops/async-generator-objects.mts)
and [return evaluation](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/ReturnStatement.mts).
`build/catch-probe.ts` and `build/callback-probe.ts` reproduce dynamic coverage in test-only unknown-error comparison and never-return callback adaptation. Explicit Error narrowing and callback result types remove those statements; before/after coverage and the initial failed report are retained. Completed activations release their frame, and consumed queue prefixes compact amortized linearly.
