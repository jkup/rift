# Promise cleanup

`Promise.prototype.finally` selects species before looking up `then`, even for noncallable cleanup arguments. It is generic for object receivers: an overridden `then` receives the original noncallable argument twice, or two distinct cleanup wrappers. Primitive receivers are rejected.

Callable cleanup runs with undefined this and no arguments. Its result goes through the shared PromiseResolve operation, not the constructor's replaceable `resolve` property. The inner `then` waits for cleanup and returns the original value or throws the original reason. A cleanup throw or rejection replaces that outcome. Custom species and overridden `then` methods remain observable at each step.

Wrapper functions belong to the finally intrinsic's Realm. Their invocation uses the current context, and fatal resource/unsupported completions propagate unchanged through Promise reactions.

This follows [ECMAScript 2025 27.2.5.3](https://262.ecma-international.org/16.0/#sec-promise.prototype.finally), reviewed alongside [engine262 PromisePrototype.mts at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/PromisePrototype.mts). Tests cover post-checkpoint values, cleanup assimilation/errors, generic receivers, observable lookup order, metadata, subclassing, cross-Realm defaults, deferred cleanup and budget exhaustion. The unchanged C++ finally fixture separately checks eight asynchronous outcomes.
