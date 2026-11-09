# Promise all and race

Both combinators create a capability, read the constructor's `resolve` once, then acquire and consume the iterator synchronously. Every value calls that captured resolver with the constructor as receiver and invokes the result's current `then`. Custom resolvers may return primitives with callable inherited `then` methods; those calls preserve the original primitive receiver.

`all` stores values by input position and gives each element an independently guarded fulfillment callback. A shared remaining count starts at one so synchronously invoked custom `then` callbacks cannot settle the aggregate before iteration ends. Empty input resolves to an empty array. `race` passes the capability callbacks through directly and leaves empty input pending; custom capability callbacks are not given extra once-only guards.

Iterator step/value failures mark the iterator done and are not closed. Resolver/then failures close an unfinished iterator before rejecting the capability. The original throw wins over catchable cleanup errors. Resource limits remain fatal, skip guest cleanup and clear pending jobs. A finite step budget also bounds infinite input.

Result arrays are created in the current abstract-operation Realm. Resolve-element functions belong to the combinator method's Realm, even when its constructor receiver belongs elsewhere.

Reviewed against [ECMAScript 2025 27.2.4.1 and 27.2.4.5](https://262.ecma-international.org/16.0/#sec-promise.all) and [engine262 Promise.mts at 18cdeb03](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/Promise.mts). Focused tests assert synchronous effects and post-checkpoint values, including overridden resolvers, duplicate callbacks, iterator failure phases and cross-Realm allocation. The unchanged original all/race fixtures verify six and four asynchronous outcomes respectively. `allSettled` and `any` remain separate work.
