# Synchronous generator delegation

A yield-star statement retains its iterator record in the generator continuation.
The stateless resume helper uses the current context to forward next/return/throw
values. It caches next through GetIterator and looks up return/throw at each
abrupt resume. Suspended state contains no engine or operation context.

A nonterminal delegated result is returned unchanged, including its Realm and
accessors. The helper reads done first and reads value only on completion.
Missing throw performs normal IteratorClose before reporting TypeError; cleanup
errors take precedence. A delegated return may itself yield, while a completed
return terminates the outer generator with the inner result value.

This slice admits delegation only as a standalone statement in already-supported
control flow. Its final expression value is discarded after the required value
read. Return-position and other expression continuations, cleanup scopes and
async remain blocked.

Tests cover forwarding, once-only lookup, result identity, getter ordering,
late method mutation, missing methods, abrupt cleanup precedence, nested loops,
line terminators and foreign Realm errors. Existing yield-star rejection inputs
are retained as positive execution cases.

References: [ECMAScript yield evaluation](https://tc39.es/ecma262/multipage/ecmascript-language-functions-and-classes.html#sec-generator-function-definitions-runtime-semantics-evaluation)
and [engine262 YieldExpression at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/YieldExpression.mts).
TS-220 adds catch boundaries around admitted yields and delegation; see
[generator catch boundaries](generator-catch.md). Finally remains blocked.
