# Promise capability helpers

`Promise.try` creates a new capability before calling its callback synchronously with undefined this and the trailing arguments. Callback return values resolve that capability; catchable throws reject it. An invalid callback therefore returns a rejected Promise, while an invalid constructor fails before any callback effects. Returning an existing Promise still creates a fresh result. Custom resolve/reject callback failures propagate to the caller; resource limits remain fatal.

`Promise.withResolvers` uses the same generic capability operation and returns a plain object with enumerable, writable, configurable `promise`, `resolve` and `reject` properties in that order. The object belongs to the invoked method's Realm, independently of the constructor receiver.

The implementation follows [ECMAScript 2025 27.2.4.8–9](https://262.ecma-international.org/16.0/#sec-promise.try). The reviewed [engine262 revision](https://github.com/engine262/engine262/blob/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/intrinsics/Promise.mts) predates the final try ordering: it invokes the callback before constructing a capability and uses PromiseResolve for success. Those differences are deliberately not adopted.

The original `test/promise-try.js` expects a synchronous TypeError for a noncallable callback. Its catch block also accepts its own `Error("Expected TypeError")`, so its success output does not validate that expectation. Preserve the fixture and use the focused regression's explicit post-checkpoint TypeError check. Its four asynchronous OK lines independently verify value, throw, arguments and Promise adoption. The withResolvers fixture also verifies settlement after queued jobs run.

`test/promise-helpers.ts` covers effect order, callback errors and arguments, identity, subclassing, custom capabilities, property descriptors, invalid constructors, cross-Realm object/error allocation and fatal budgets. No combinators or async syntax are introduced.
