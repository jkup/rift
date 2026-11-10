# JSON.parse reviver

The reviver follows the repository's ECMAScript 2025 baseline: post-order
traversal, two callback arguments, and a fresh root holder in the parse builtin's
Realm. Arrays capture their length; other objects capture enumerable string
keys. Values are read when visited, so earlier callbacks can replace later
values, install getters, or delete properties. Deletion and data definition
ignore false results while preserving abrupt completions.

An explicit stack replaces host recursion. Every traversal step and key scan
consumes the operation budget, including cycles introduced by a callback.
Tests cover 5,000 nested arrays, inserted cycles, live mutations, frozen targets,
accessors, callback throws, root replacement, reentrancy and borrowed methods.
The existing parser's syntax errors still precede all callback execution.

References: [ECMAScript 2025 InternalizeJSONProperty](https://262.ecma-international.org/16.0/#sec-internalizejsonproperty)
and [engine262 JSON at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/JSON.mts).
The latter implements newer parse-with-source context arguments as well; those
are a separate feature and are not claimed here. Rift retains its dedicated
JSON parser and does not execute JSON text as guest or host JavaScript.
