# Explicit derived constructors

TS-159 extends the default-derived constructor path with constructor bodies and `super(...)`. Super property references, fields and private elements remain unsupported.

Each private function activation retains its actual callee and a separate this-binding state. Derived activations start uninitialized; reading this produces a guest ReferenceError. Arrows and direct eval resolve the nearest non-arrow function activation, so creating or calling an arrow does not eagerly read this. An escaped arrow retains the binding even after its constructor returns. Inspection projects its current value without triggering a guest read.

A super call captures the active constructor's current prototype before evaluating arguments. Argument effects precede constructor validation. Construction receives the original newTarget; only after construction succeeds does it bind this. A second super call therefore runs the parent constructor before failing to reinitialize this. The parent's returned object becomes this, including for builtin subclasses.

An explicit derived constructor can return an object without calling super. A non-undefined primitive return produces TypeError; normal completion or an undefined return reads the initialized binding. These final checks run in the restored caller Realm, unlike an early this read in the constructor body. Default derived constructors retain their direct forwarding path without an argument iterator.

Parser context permits super calls in derived constructor parameters/bodies and their arrows, but resets it in ordinary nested functions and methods. Direct eval inherits that context; indirect eval and Function do not. All rejection-only parse retries preserve the same context. Unsupported super property syntax remains a full-source veto.

Reviewed against ECMAScript 2025 [function environments](https://262.ecma-international.org/16.0/#sec-function-environment-records), [Construct](https://262.ecma-international.org/16.0/#sec-ecmascript-function-objects-construct-argumentslist-newtarget) and [super evaluation](https://262.ecma-international.org/16.0/#sec-super-keyword), and engine262 revision `18cdeb03c363eb31d775648a0d070bdc8a26ced1`: `src/execution-context/Environment.mts`, `src/abstract-ops/function-operations.mts` and `src/runtime-semantics/SuperCall.mts`. The implementation uses Rift's completion records and private activation ownership rather than copying the reference engine's execution machinery.

Validation is pending canonical integration. Focused tests cover binding order, returns, parameters, arrows, eval, parent mutation, builtin allocation, cross-Realm errors, snapshots and resource bounds. The prior default-derived boundary test retains both original explicit-constructor source strings and now checks that they execute normally as declarations.
