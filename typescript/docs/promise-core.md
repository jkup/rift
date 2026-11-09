# Promise construction and reactions

Script Realms own a Promise prototype and constructor. `GuestPromise` carries pending/fulfilled/rejected state, the settlement value and separate reaction lists. Settling releases both lists and queues the selected reactions in registration order. The prototype itself is an ordinary object, so borrowing `then` onto it fails the Promise brand check.

Resolving functions share an already-resolved cell. It is set before reading a resolution object's `then` property, preventing reentrant or repeated settlement. Reading `then` is synchronous; invoking a callable `then` happens in a job with fresh resolving functions. A Promise cannot resolve to itself. An endlessly self-reproducing thenable consumes the session's step budget.

`then` selects the species constructor and creates a capability before registering reactions. Capabilities deliberately contain arbitrary guest values: a custom constructor can return an ordinary object and supply its own resolve/reject callbacks. Reactions call those callbacks through the active context, so user effects and thrown completions remain observable. Noncallable handlers implement identity and rejection propagation. `catch` is generic and invokes the receiver's current `then` property.

Every job uses the session queue and the handler's Realm; absent handlers use the enqueue Realm. Resolving functions use their invocation's active context rather than retaining a context from construction. A saved resolver can therefore settle a Promise in a later Script session. The prototype fallback comes from `newTarget`'s Realm; the default species comes from the invoked `then` intrinsic's Realm.

Guest throws become rejections where required by the Promise algorithms. Resource limits and unsupported-operation completions remain fatal and clear queued work. Exceptions thrown by custom capability resolve/reject callbacks are ordinary job failures, allowing unrelated jobs to continue.

## Host checkpoint policy

`evaluateScript` remains synchronous. The CLI retains its session and explicitly calls `drainScriptJobs` after the top-level completion, including ordinary uncaught throws. It reports synchronous errors and job failures independently. Fatal evaluation already discards pending jobs. The observation host has no implicit checkpoint in this increment.

Unhandled-rejection tracking uses the specification's default no-op. A rejected Promise by itself does not set the CLI exit status. Focused tests read guest state after an explicit checkpoint; original fixtures that only print synchronous structure checks are not evidence of asynchronous correctness.

This slice implements the constructor, `resolve`, `reject`, `then`, `catch`, species and metadata. `finally`, combinators, `try`, `withResolvers`, async syntax and observation-host policy are separate tasks.

## References and validation

The design follows [ECMAScript 2025 sections 9.5 and 27.2](https://262.ecma-international.org/16.0/), checked against engine262 at [18cdeb03](https://github.com/engine262/engine262/tree/18cdeb03c363eb31d775648a0d070bdc8a26ced1/src/abstract-ops). Constructor callability validation precedes prototype lookup. The capability executor's guard checks whether stored resolve/reject values are undefined; it is not a generic once-only guard.

`test/promise-core.ts` checks settlement, FIFO chaining, then getter/call errors, self-resolution, nested assimilation, subclassing, generic capabilities/catch, species effects, cross-Realm defaults and errors, saved resolvers and fatal budgets. Tests inspect expected values on both sides of the explicit checkpoint. Full canonical acceptance is recorded in TASKS.md after integration.
