# Promise settlement aggregation

`allSettled` and `any` share the existing generic combinator iterator path. Each input reserves a position before invoking constructor resolve. The remaining count includes an iteration sentinel, allowing custom then methods to call handlers synchronously without finishing the aggregate before iteration ends.

Each allSettled input has one guard shared by its fulfillment and rejection handlers. The winning handler creates an ordinary record with enumerable `status` and `value` or `reason` properties. Any instead guards only its per-input rejection handler and passes the capability's fulfillment callback directly. Values and rejection reasons retain input order regardless of settlement order.

Any creates AggregateError objects from the intrinsic error prototype, ignoring the replaceable global constructor. Their errors arrays are writable, configurable and non-enumerable. Empty input and synchronously rejected custom thenables finish inside iteration; that path returns an abrupt completion to the outer rejection handler. This matters when a custom reject function throws: it must be called once, not retried by an extra rejection layer. Later rejection jobs call the capability reject directly.

Records, arrays and errors belong to the current abstract-operation Realm, including cross-Realm borrowed methods. Iterator cleanup and fatal-budget behavior remain shared with all/race.

The design follows [ECMAScript 2025 27.2.4.2–3](https://262.ecma-international.org/16.0/#sec-promise.any), reviewed against [engine262 at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/Promise.mts). That engine revision calls reject directly at the end of any iteration; the published specification's abrupt-completion behavior governs here. Focused regressions test throwing custom reject callbacks, shared guards, descriptors, constructor replacement, settlement order, cross-Realm allocation, and all four combinators' iterator-error phases and fatal bounds. The unchanged original allSettled/any fixture verifies six asynchronous outcomes.
