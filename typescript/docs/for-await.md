# For-await-of

Async function bodies can iterate async protocols or the synchronous adapter.
The existing loop binding path handles var/let/const, references and destructuring.
A suspended iterator frame retains its cached next method and lexical environment;
fulfilled steps validate the result, read done/value and then initialize the body.
Failures while acquiring/awaiting a step or reading its fields do not close it.

Abrupt body exits use an explicit async-close frame. It retains the pending
completion and source inspection while awaiting return. A prior guest throw wins
over cleanup errors, including rejected return Promises; normal exits validate
the awaited object. Continue targeting the same loop does not close. Fatal engine
limits bypass guest cleanup and remain fatal across Promise jobs.

No engine/context is captured by suspension. Pending cleanup can settle in another
session and resumes using that session's budget with the defining function Realm.
Async generators and awaited iterable/head expressions remain unsupported.

Sources: [ECMA-262 AsyncIteratorClose](https://262.ecma-international.org/16.0/#sec-asynciteratorclose)
and [loop evaluation](https://262.ecma-international.org/16.0/#sec-runtime-semantics-forinofbodyevaluation-lhs-stmt-iterator-lhskind-labelset).
The unchanged original for-await-of-test.js has nineteen expected true outcomes.
`ForInOfBodyEvaluation` was also checked against [engine262 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/runtime-semantics/LabelledEvaluation.mts): step/field failures propagate directly; binding/body exits close.
