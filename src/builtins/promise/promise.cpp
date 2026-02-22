#include "rift/builtins/promise/promise.h"

#include "rift/builtins/builtin_manager.h"
#include "rift/interpreter/engine.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/memory/gc_protector.h"

// ============================================================================
// ECMA-262 -- Promise Objects (ES2025 Section 27.2)
// @spec https://tc39.es/ecma262/#sec-promise-objects
//
// Promise is the most spec-complex builtin. Key internal abstract operations:
//   27.2.1.3  CreateResolvingFunctions ( promise )
//   27.2.1.4  FulfillPromise ( promise, value )
//   27.2.1.5  NewPromiseReactionJob ( reaction, argument )
//   27.2.1.6  NewPromiseResolveThenableJob ( promiseToResolve, thenable, then )
//   27.2.1.7  RejectPromise ( promise, reason )
//   27.2.1.9  TriggerPromiseReactions ( reactions, argument )
//
// DEVIATION: The spec models Promise internal state via internal slots:
//   [[PromiseState]]             -- enum { pending, fulfilled, rejected }
//   [[PromiseResult]]            -- the fulfillment value or rejection reason
//   [[PromiseFulfillReactions]]  -- List of PromiseReaction Records
//   [[PromiseRejectReactions]]   -- List of PromiseReaction Records
//   [[PromiseIsHandled]]         -- Boolean
// Rift stores these as string-keyed properties on JSObjects (e.g.,
// "[[PromiseState]]" with string values "pending"/"fulfilled"/"rejected").
// The reaction lists use JSObject-based arrays (index -> reaction object)
// instead of the spec's internal Lists of PromiseReaction Records.
//
// DEVIATION: The spec uses HostEnqueuePromiseJob to schedule microtasks.
// Rift uses engine->enqueueMicrotask() with a fallback to synchronous
// execution when engine is nullptr (NON-STANDARD testing mode).
// ============================================================================

namespace rift::builtins {

// Static member initialization
rift::core::Rift* Promise::engine_ = nullptr;

// ============================================================================
// Setup Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 27.2.4 Properties of the Promise Constructor
// @spec https://tc39.es/ecma262/#sec-properties-of-the-promise-constructor
// ----------------------------------------------------------------------------
void Promise::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // 27.2.4.7 Promise.resolve ( x )
    RIFT_STATIC_METHOD(constructor, "resolve", 1, Promise::resolve);
    // 27.2.4.6 Promise.reject ( r )
    RIFT_STATIC_METHOD(constructor, "reject", 1, Promise::reject);
    // 27.2.4.1 Promise.all ( iterable )
    RIFT_STATIC_METHOD(constructor, "all", 1, Promise::all);
    // 27.2.4.5 Promise.race ( iterable )
    RIFT_STATIC_METHOD(constructor, "race", 1, Promise::race);
    // 27.2.4.2 Promise.allSettled ( iterable )
    RIFT_STATIC_METHOD(constructor, "allSettled", 1, Promise::allSettled);
    // 27.2.4.3 Promise.any ( iterable )
    RIFT_STATIC_METHOD(constructor, "any", 1, Promise::any);
    // 27.2.4.8 Promise.withResolvers ( )
    RIFT_STATIC_METHOD(constructor, "withResolvers", 0, Promise::withResolvers);
    // TODO: 27.2.4.4 get Promise [ @@species ] -- not yet implemented.
    // @spec https://tc39.es/ecma262/#sec-get-promise-@@species
}

// ----------------------------------------------------------------------------
// 27.2.5 Properties of the Promise Prototype Object
// @spec https://tc39.es/ecma262/#sec-properties-of-the-promise-prototype-object
//
// The Promise prototype object:
//   - is %Promise.prototype%
//   - is an ordinary object
//   - has a [[Prototype]] internal slot whose value is %Object.prototype%
//   - does not have a [[PromiseState]] internal slot
// ----------------------------------------------------------------------------
void Promise::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    // 27.2.5.4 Promise.prototype.then ( onFulfilled, onRejected )
    RIFT_METHOD(prototype, "then", 2, Promise::then);
    // 27.2.5.1 Promise.prototype.catch ( onRejected )
    RIFT_METHOD(prototype, "catch", 1, Promise::catch_);
    // 27.2.5.3 Promise.prototype.finally ( onFinally )
    RIFT_METHOD(prototype, "finally", 1, Promise::finally_);
    // TODO: 27.2.5.2 Promise.prototype.constructor -- should point to %Promise%.
    // TODO: 27.2.5.5 Promise.prototype [ @@toStringTag ] -- "Promise"
}

// ============================================================================
// Helper Methods
// ============================================================================

JSObject* Promise::getGlobalPrototype() {
    return rift::core::BuiltinManager::getPromisePrototype();
}

// NON-STANDARD: Internal helper to create an initialized Promise object.
// Corresponds to steps within 27.2.3.1 Promise ( executor ) that allocate
// and initialize the internal slots, but factored out for reuse by
// Promise.resolve, Promise.reject, Promise.all, etc.
//
// The spec initializes these slots in 27.2.3.1 steps 3-7:
//   3. Set promise.[[PromiseState]] to pending.
//   4. Set promise.[[PromiseFulfillReactions]] to a new empty List.
//   5. Set promise.[[PromiseRejectReactions]] to a new empty List.
//   6. Set promise.[[PromiseIsHandled]] to false.
//   7. Set promise.[[PromiseResult]] to undefined.
//
// DEVIATION: Rift stores internal slots as string-keyed properties rather
// than true internal slots. Reaction lists are JSObject-based arrays
// (with a "length" property) instead of spec's internal Lists.
/**
 * Create an empty Promise object with internal slots initialized.
 */
JSObject* Promise::createPromiseObject(rift::memory::ObjectFactory* factory) {
    auto* promise_obj = factory->createJSObject(getGlobalPrototype());
    rift::memory::GCProtector protect(promise_obj, factory->getObjectManager());

    // Step 3: Set promise.[[PromiseState]] to pending.
    promise_obj->setProperty("[[PromiseState]]", Value(STATE_PENDING));
    // Step 7: Set promise.[[PromiseResult]] to undefined.
    promise_obj->setProperty("[[PromiseResult]]", Value::undefined());

    // Step 4: Set promise.[[PromiseFulfillReactions]] to a new empty List.
    // DEVIATION: Uses JSObject-based array with "length" property instead of internal List.
    auto* fulfill_reactions = factory->createJSObject();
    fulfill_reactions->setProperty("length", Value(0.0));

    // Step 5: Set promise.[[PromiseRejectReactions]] to a new empty List.
    auto* reject_reactions = factory->createJSObject();
    reject_reactions->setProperty("length", Value(0.0));

    promise_obj->setProperty("[[PromiseFulfillReactions]]", Value(fulfill_reactions));
    promise_obj->setProperty("[[PromiseRejectReactions]]", Value(reject_reactions));
    // Step 6: Set promise.[[PromiseIsHandled]] to false.
    promise_obj->setProperty("[[PromiseIsHandled]]", Value(false));

    return promise_obj;
}

// 27.2.1.1 IsPromise ( x )
// @spec https://tc39.es/ecma262/#sec-ispromise
//
// Spec algorithm:
//   1. If x is not an Object, return false.
//   2. If x does not have a [[PromiseState]] internal slot, return false.
//   3. Return true.
/**
 * Check if a value is a Promise object.
 */
bool Promise::isPromise(const Value& value) {
    // 1. If x is not an Object, return false.
    if(!value.isObject()) {
        return false;
    }

    auto* obj = value.getObject();
    if(obj == nullptr) {
        return false;
    }

    // 2. If x does not have a [[PromiseState]] internal slot, return false.
    // DEVIATION: Checks for "[[PromiseState]]" string property existence
    // instead of a true internal slot.
    Value state = obj->getProperty("[[PromiseState]]");
    // 3. Return true.
    return state.isString();
}

// NON-STANDARD: Internal helper to read [[PromiseState]] from a promise object.
// The spec accesses [[PromiseState]] directly as an internal slot; Rift reads
// it as a string property.
/**
 * Get the state of a promise.
 */
std::string Promise::getState(JSObject* promise) {
    Value state = promise->getProperty("[[PromiseState]]");
    if(!state.isString()) {
        return "";
    }
    return state.getString();
}

// NON-STANDARD: Internal helper to read [[PromiseResult]] from a promise object.
/**
 * Get the result of a promise.
 */
Value Promise::getResult(JSObject* promise) {
    return promise->getProperty("[[PromiseResult]]");
}

// NON-STANDARD: Internal helper used by resolvePromise to check thenability.
// The spec checks thenability inline within 27.2.1.3.2 Promise Resolve
// Functions step 8: "Let then be ? Get(resolution, "then")." followed by
// step 9: "If IsCallable(then) is false..." Rift factors this out into
// a separate helper for reuse.
/**
 * Check if a value is a thenable (has a callable .then property).
 * Per ES spec, a thenable is any object with a .then method.
 */
bool Promise::isThenable(const Value& value) {
    if(!value.isObject()) {
        return false;
    }

    auto* obj = value.getObject();
    if(obj == nullptr) {
        return false;
    }

    // Check if .then property exists and is callable
    Value then_val = obj->getProperty("then");
    return then_val.isFunction();
}

// NON-STANDARD: Internal helper to extract the .then method from a thenable.
// Used by resolvePromise and finally_ to call thenable.then(resolve, reject).
/**
 * Get the .then method from a thenable.
 * Returns nullptr if not a thenable or .then is not a function.
 */
JSFunction* Promise::getThenMethod(const Value& value) {
    if(!value.isObject()) {
        return nullptr;
    }

    auto* obj = value.getObject();
    if(obj == nullptr) {
        return nullptr;
    }

    Value then_val = obj->getProperty("then");
    if(!then_val.isFunction()) {
        return nullptr;
    }

    return dynamic_cast<JSFunction*>(then_val.getObject());
}

// ============================================================================
// Reaction Management
// ============================================================================

// NON-STANDARD: Internal helper to append a PromiseReaction Record to a
// promise's [[PromiseFulfillReactions]] or [[PromiseRejectReactions]] list.
//
// In the spec, reactions are added in 27.2.5.4 PerformPromiseThen steps 5-8.
// Each PromiseReaction Record has fields:
//   [[Capability]] -- a PromiseCapability Record { [[Promise]], [[Resolve]], [[Reject]] }
//   [[Type]]       -- "Fulfill" or "Reject"
//   [[Handler]]    -- a function or empty
//
// DEVIATION: Rift simplifies the PromiseReaction Record to a JSObject with:
//   "handler"       -- the handler function (or undefined for pass-through)
//   "resultPromise" -- the promise to resolve/reject (replaces [[Capability]])
// The [[Type]] field is implicit: reactions are stored in separate fulfill
// vs reject lists. The [[Capability]].[[Resolve]] and [[Reject]] functions
// are not stored; instead, Rift calls fulfillPromise/rejectPromise directly
// on the result promise in executeReaction.
/**
 * Add a reaction to a promise's reaction list.
 * reaction_type is "fulfill" or "reject"
 * handler can be nullptr for pass-through behavior
 * result_promise is the promise returned by .then()
 */
void Promise::addReaction(JSObject* promise, const std::string& reaction_type, JSFunction* handler,
                          JSObject* result_promise) {
    std::string slot_name =
        (reaction_type == "fulfill") ? "[[PromiseFulfillReactions]]" : "[[PromiseRejectReactions]]";

    Value reactions_val = promise->getProperty(slot_name);
    if(!reactions_val.isObject()) {
        return;
    }

    auto* reactions = reactions_val.getObject();
    Value length_val = reactions->getProperty("length");
    int length = length_val.isNumber() ? static_cast<int>(length_val.getNumber()) : 0;

    // Create reaction record object
    // DEVIATION: Simplified PromiseReaction Record -- see comment above.
    auto* factory = getFactory();
    auto* reaction = factory->createJSObject();
    rift::memory::GCProtector protect(reaction, factory->getObjectManager());

    // Store handler (can be null/undefined for pass-through)
    // Spec: [[Handler]] is either a function or empty.
    if(handler != nullptr) {
        reaction->setProperty("handler", Value(handler));
    } else {
        reaction->setProperty("handler", Value::undefined());
    }

    // Store result promise
    // DEVIATION: Replaces [[Capability]] PromiseCapability Record.
    reaction->setProperty("resultPromise", Value(result_promise));

    // Add to reactions array
    reactions->setProperty(std::to_string(length), Value(reaction));
    reactions->setProperty("length", Value(static_cast<double>(length + 1)));
}

// 27.2.1.5 NewPromiseReactionJob ( reaction, argument )
// @spec https://tc39.es/ecma262/#sec-newpromisereactionjob
//
// Spec algorithm (the job itself, created at step 1):
//   1. Let promiseCapability be reaction.[[Capability]].
//   2. Let type be reaction.[[Type]].
//   3. Let handler be reaction.[[Handler]].
//   4. If handler is empty, then
//      a. If type is "Fulfill", let handlerResult be NormalCompletion(argument).
//      b. Else (type is "Reject"),
//         i. Let handlerResult be ThrowCompletion(argument).
//   5. Else, let handlerResult be Completion(HostCallJobCallback(handler, undefined, << argument
//   >>)).
//   6. If promiseCapability is undefined, then
//      a. Assert: handlerResult is not an abrupt completion.
//      b. Return empty.
//   7. If handlerResult is an abrupt completion, then
//      a. Return ? Call(promiseCapability.[[Reject]], undefined, << handlerResult.[[Value]] >>).
//   8. Return ? Call(promiseCapability.[[Resolve]], undefined, << handlerResult.[[Value]] >>).
//
// SIMPLIFIED: Rift inlines the reaction job logic rather than creating a
// formal Job abstract closure. The handler is called directly, and
// fulfillPromise/rejectPromise/resolvePromise are called on the result
// promise instead of going through [[Capability]].[[Resolve]]/[[Reject]].
/**
 * Execute a single reaction.
 * This is called as a microtask after the promise settles.
 */
void Promise::executeReaction(JSFunction* handler, JSObject* result_promise, const Value& argument,
                              bool is_fulfill) {
    // Step 4: If handler is empty, then
    if(handler == nullptr) {
        // Step 4a: If type is "Fulfill", let handlerResult be NormalCompletion(argument).
        if(is_fulfill) {
            fulfillPromise(result_promise, argument);
        } else {
            // Step 4b: Else, let handlerResult be ThrowCompletion(argument).
            rejectPromise(result_promise, argument);
        }
        return;
    }

    // Step 5: Else, let handlerResult be Completion(HostCallJobCallback(handler, undefined, <<
    // argument >>)).
    try {
        CallContext ctx(rift::core::CallType::Function, Value::undefined());
        Value result = handler->call(ctx, {argument});

        // Step 8: Return ? Call(promiseCapability.[[Resolve]], undefined, <<
        // handlerResult.[[Value]] >>). SIMPLIFIED: Calls resolvePromise directly instead of going
        // through
        // [[Capability]].[[Resolve]]. resolvePromise handles thenable adoption.
        resolvePromise(result_promise, result);
    } catch(const rift::core::JavaScriptException& e) {
        // Step 7: If handlerResult is an abrupt completion, then
        // Step 7a: Return ? Call(promiseCapability.[[Reject]], undefined, <<
        // handlerResult.[[Value]] >>).
        rejectPromise(result_promise, e.getValue());
    } catch(const std::exception& e) {
        // NON-STANDARD: C++ exception fallback -- reject with error message.
        rejectPromise(result_promise, Value(std::string("Error: ") + e.what()));
    }
}

// ============================================================================
// Constructor
// ============================================================================

// 27.2.3.1 Promise ( executor )
// @spec https://tc39.es/ecma262/#sec-promise-executor
//
// Spec algorithm:
//   1. If NewTarget is undefined, throw a TypeError exception.
//   2. If IsCallable(executor) is false, throw a TypeError exception.
//   3. Let promise be ? OrdinaryCreateFromConstructor(NewTarget, "%Promise.prototype%",
//      << [[PromiseState]], [[PromiseResult]], [[PromiseFulfillReactions]],
//         [[PromiseRejectReactions]], [[PromiseIsHandled]] >>).
//   4. Set promise.[[PromiseState]] to pending.
//   5. Set promise.[[PromiseFulfillReactions]] to a new empty List.
//   6. Set promise.[[PromiseRejectReactions]] to a new empty List.
//   7. Set promise.[[PromiseIsHandled]] to false.
//   8. Let resolvingFunctions be CreateResolvingFunctions(promise).
//   9. Let completion be Completion(Call(executor, undefined,
//      << resolvingFunctions.[[Resolve]], resolvingFunctions.[[Reject]] >>)).
//   10. If completion is an abrupt completion, then
//       a. Perform ? Call(resolvingFunctions.[[Reject]], undefined, << completion.[[Value]] >>).
//   11. Return promise.
//
// INCOMPLETE: Step 1 (NewTarget check) not enforced -- Rift does not yet
// distinguish [[Construct]] from [[Call]] for built-in constructors.
/**
 * Promise constructor.
 * new Promise(executor) - executor is called with (resolve, reject) functions
 *
 * The executor is called synchronously. If executor throws, the promise is rejected.
 */
Value Promise::constructor(const CallContext& /*ctx*/, const std::vector<Value>& args) {
    auto* factory = getObjectFactory();

    // Step 2: If IsCallable(executor) is false, throw a TypeError exception.
    if(args.empty()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Promise resolver undefined is not a function"));
    }

    const Value& executor = args[0];
    if(!executor.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Promise resolver " + executor.toString() + " is not a function"));
    }

    auto* executor_func = dynamic_cast<JSFunction*>(executor.getObject());
    if(executor_func == nullptr) {
        throw rift::core::JavaScriptException(Value("TypeError: Promise executor is not callable"));
    }

    // Steps 3-7: Create the Promise object with internal slots initialized.
    // (Factored into createPromiseObject -- see its comment for step mapping.)
    auto* promise_obj = createPromiseObject(factory);
    rift::memory::GCProtector protect(promise_obj, factory->getObjectManager());

    // Step 8: Let resolvingFunctions be CreateResolvingFunctions(promise).
    // @spec https://tc39.es/ecma262/#sec-createresolvingfunctions
    //
    // 27.2.1.3 CreateResolvingFunctions ( promise ):
    //   1. Let alreadyResolved be the Record { [[Value]]: false }.
    //   2. Let stepsResolve be the algorithm steps defined in Promise Resolve Functions.
    //   3. ... (create resolve function with [[Promise]] and [[AlreadyResolved]] slots)
    //   4. Let stepsReject be the algorithm steps defined in Promise Reject Functions.
    //   5. ... (create reject function with [[Promise]] and [[AlreadyResolved]] slots)
    //   6. Return the Record { [[Resolve]]: resolve, [[Reject]]: reject }.
    //
    // DEVIATION: Rift uses the promise's [[PromiseState]] to implement the
    // "alreadyResolved" guard (checking state != pending) instead of a
    // separate { [[Value]]: false } Record shared between resolve and reject.
    // This is functionally equivalent since settling the promise also changes
    // the state, but it means the resolve/reject functions don't share a
    // single boolean -- they each independently check the promise state.

    // Create resolve function (27.2.1.3.2 Promise Resolve Functions)
    auto* resolve_func =
        factory->createJSFunction([promise_obj](const CallContext& /*resolve_ctx*/,
                                                const std::vector<Value>& resolve_args) -> Value {
            Value resolution = resolve_args.empty() ? Value::undefined() : resolve_args[0];

            // 27.2.1.3.2 step 1: Let F be the active function object.
            // 27.2.1.3.2 step 3: Let alreadyResolved be F.[[AlreadyResolved]].
            // 27.2.1.3.2 step 4: If alreadyResolved.[[Value]] is true, return undefined.
            // DEVIATION: Checks [[PromiseState]] instead of [[AlreadyResolved]].
            std::string state = getState(promise_obj);
            if(state != STATE_PENDING) {
                return Value::undefined();
            }

            // 27.2.1.3.2 step 5: Set alreadyResolved.[[Value]] to true.
            // (Implicitly handled by resolvePromise changing [[PromiseState]].)
            // 27.2.1.3.2 steps 6-12: Resolution logic (see resolvePromise).
            resolvePromise(promise_obj, resolution);
            return Value::undefined();
        });

    // Create reject function (27.2.1.3.1 Promise Reject Functions)
    auto* reject_func =
        factory->createJSFunction([promise_obj](const CallContext& /*reject_ctx*/,
                                                const std::vector<Value>& reject_args) -> Value {
            Value reason = reject_args.empty() ? Value::undefined() : reject_args[0];

            // 27.2.1.3.1 step 4: If alreadyResolved.[[Value]] is true, return undefined.
            // DEVIATION: Checks [[PromiseState]] instead of [[AlreadyResolved]].
            std::string state = getState(promise_obj);
            if(state != STATE_PENDING) {
                return Value::undefined();
            }

            // 27.2.1.3.1 step 7: Perform RejectPromise(promise, reason).
            rejectPromise(promise_obj, reason);
            return Value::undefined();
        });

    // Step 9: Let completion be Completion(Call(executor, undefined,
    //         << resolvingFunctions.[[Resolve]], resolvingFunctions.[[Reject]] >>)).
    try {
        CallContext executor_ctx(rift::core::CallType::Function, Value::undefined());
        executor_func->call(executor_ctx, {Value(resolve_func), Value(reject_func)});
    } catch(const rift::core::JavaScriptException& e) {
        // Step 10: If completion is an abrupt completion, then
        // Step 10a: Perform ? Call(resolvingFunctions.[[Reject]], undefined, <<
        // completion.[[Value]] >>).
        std::string state = getState(promise_obj);
        if(state == STATE_PENDING) {
            rejectPromise(promise_obj, e.getValue());
        }
    } catch(const std::exception& e) {
        // NON-STANDARD: C++ exception fallback.
        std::string state = getState(promise_obj);
        if(state == STATE_PENDING) {
            rejectPromise(promise_obj, Value(std::string("Error: ") + e.what()));
        }
    }

    // Step 11: Return promise.
    return Value(promise_obj);
}

// ============================================================================
// Internal Promise Operations
// ============================================================================

// 27.2.1.4 FulfillPromise ( promise, value )
// @spec https://tc39.es/ecma262/#sec-fulfillpromise
//
// Spec algorithm:
//   1. Assert: The value of promise.[[PromiseState]] is pending.
//   2. Let reactions be promise.[[PromiseFulfillReactions]].
//   3. Set promise.[[PromiseResult]] to value.
//   4. Set promise.[[PromiseFulfillReactions]] to undefined.
//   5. Set promise.[[PromiseRejectReactions]] to undefined.
//   6. Set promise.[[PromiseState]] to fulfilled.
//   7. Perform TriggerPromiseReactions(reactions, value).
//   8. Return unused.
//
// DEVIATION: Rift sets state and result first, then calls triggerReactions
// which reads the reactions from the promise. The spec extracts reactions
// before clearing them (steps 2-6), then triggers. Rift's triggerReactions
// reads and clears the reaction lists internally, achieving the same effect.
/**
 * Fulfill a promise with a value.
 */
void Promise::fulfillPromise(JSObject* promise, const Value& value) {
    // Steps 3, 6: Set [[PromiseResult]] and [[PromiseState]].
    promise->setProperty("[[PromiseState]]", Value(STATE_FULFILLED));
    promise->setProperty("[[PromiseResult]]", value);
    // Step 7: Perform TriggerPromiseReactions(reactions, value).
    // (triggerReactions reads reactions from the promise and clears them.)
    triggerReactions(promise, "fulfill");
}

// 27.2.1.7 RejectPromise ( promise, reason )
// @spec https://tc39.es/ecma262/#sec-rejectpromise
//
// Spec algorithm:
//   1. Assert: The value of promise.[[PromiseState]] is pending.
//   2. Let reactions be promise.[[PromiseRejectReactions]].
//   3. Set promise.[[PromiseResult]] to reason.
//   4. Set promise.[[PromiseFulfillReactions]] to undefined.
//   5. Set promise.[[PromiseRejectReactions]] to undefined.
//   6. Set promise.[[PromiseState]] to rejected.
//   7. If promise.[[PromiseIsHandled]] is false, perform
//      HostPromiseRejectionTracker(promise, "reject").
//   8. Perform TriggerPromiseReactions(reactions, reason).
//   9. Return unused.
//
// INCOMPLETE: Step 7 (HostPromiseRejectionTracker) is not implemented.
// Rift does not yet support unhandled rejection tracking/reporting.
/**
 * Reject a promise with a reason.
 */
void Promise::rejectPromise(JSObject* promise, const Value& reason) {
    // Steps 3, 6: Set [[PromiseResult]] and [[PromiseState]].
    promise->setProperty("[[PromiseState]]", Value(STATE_REJECTED));
    promise->setProperty("[[PromiseResult]]", reason);
    // Step 8: Perform TriggerPromiseReactions(reactions, reason).
    triggerReactions(promise, "reject");
}

// 27.2.1.3.2 Promise Resolve Functions
// @spec https://tc39.es/ecma262/#sec-promise-resolve-functions
//
// Spec algorithm (Promise Resolve Functions, the [[Resolve]] function
// created by CreateResolvingFunctions):
//   1. Let F be the active function object.
//   2. Assert: F has a [[Promise]] internal slot.
//   3. Let promise be F.[[Promise]].
//   4. Let alreadyResolved be F.[[AlreadyResolved]].
//   5. If alreadyResolved.[[Value]] is true, return undefined.
//   6. Set alreadyResolved.[[Value]] to true.
//   7. If SameValue(resolution, promise) is true, then
//      a. Let selfResolutionError be a newly created TypeError object.
//      b. Perform RejectPromise(promise, selfResolutionError).
//      c. Return undefined.
//   8. If resolution is not an Object, then
//      a. Perform FulfillPromise(promise, resolution).
//      b. Return undefined.
//   9. Let then be Completion(Get(resolution, "then")).
//   10. If then is an abrupt completion, then
//       a. Perform RejectPromise(promise, then.[[Value]]).
//       b. Return undefined.
//   11. Let thenAction be then.[[Value]].
//   12. If IsCallable(thenAction) is false, then
//       a. Perform FulfillPromise(promise, resolution).
//       b. Return undefined.
//   13. Let thenJobCallback be HostMakeJobCallback(thenAction).
//   14. Let job be NewPromiseResolveThenableJob(promise, resolution, thenJobCallback).
//   15. Perform HostEnqueuePromiseJob(job.[[Job]], job.[[Realm]]).
//   16. Return undefined.
//
// SIMPLIFIED: This function combines the Promise Resolve Functions algorithm
// with parts of NewPromiseResolveThenableJob (27.2.1.6). The alreadyResolved
// guard is checked by the caller (constructor or CreateResolvingFunctions)
// via [[PromiseState]] rather than a shared Record.
/**
 * Resolve a promise with thenable adoption.
 * Per ES spec:
 * - If value is a thenable (has a .then method), adopt its state by calling value.then(resolve,
 * reject)
 * - Otherwise, fulfill the promise with the value
 * - Self-resolution throws TypeError
 */
void Promise::resolvePromise(JSObject* promise, const Value& value) {
    // Step 7: If SameValue(resolution, promise) is true, then
    //   7a: Let selfResolutionError be a newly created TypeError object.
    //   7b: Perform RejectPromise(promise, selfResolutionError).
    if(value.isObject() && value.getObject() == promise) {
        rejectPromise(promise, Value("TypeError: A promise cannot be resolved with itself"));
        return;
    }

    // Steps 8-9: If resolution is not an Object, FulfillPromise.
    // Otherwise, let then be Get(resolution, "then").
    if(!isThenable(value)) {
        // Step 8a / Step 12a: Not a thenable -- fulfill directly.
        fulfillPromise(promise, value);
        return;
    }

    // Step 11: Let thenAction be then.[[Value]].
    auto* then_method = getThenMethod(value);
    if(then_method == nullptr) {
        // Step 12: If IsCallable(thenAction) is false, then
        // Step 12a: Perform FulfillPromise(promise, resolution).
        fulfillPromise(promise, value);
        return;
    }

    // Steps 13-15: Create and enqueue NewPromiseResolveThenableJob.
    // 27.2.1.6 NewPromiseResolveThenableJob ( promiseToResolve, thenable, then )
    // @spec https://tc39.es/ecma262/#sec-newpromiseresolvethenablejob
    //
    // The job (step 1 of NewPromiseResolveThenableJob):
    //   a. Let resolvingFunctions be CreateResolvingFunctions(promiseToResolve).
    //   b. Let thenCallResult be Completion(HostCallJobCallback(then, thenable,
    //      << resolvingFunctions.[[Resolve]], resolvingFunctions.[[Reject]] >>)).
    //   c. If thenCallResult is an abrupt completion, then
    //      i. Return ? Call(resolvingFunctions.[[Reject]], undefined, << thenCallResult.[[Value]]
    //      >>).
    //   d. Return ? Completion(thenCallResult).
    auto* factory = getFactory();
    auto* engine = getEngine();

    // Step a: Let resolvingFunctions be CreateResolvingFunctions(promiseToResolve).
    auto* resolve_func =
        factory->createJSFunction([promise](const CallContext& /*resolve_ctx*/,
                                            const std::vector<Value>& resolve_args) -> Value {
            Value resolution = resolve_args.empty() ? Value::undefined() : resolve_args[0];

            std::string state = getState(promise);
            if(state != STATE_PENDING) {
                return Value::undefined();  // Already settled
            }

            // Recursively resolve (handles thenable chains)
            resolvePromise(promise, resolution);
            return Value::undefined();
        });

    auto* reject_func =
        factory->createJSFunction([promise](const CallContext& /*reject_ctx*/,
                                            const std::vector<Value>& reject_args) -> Value {
            Value reason = reject_args.empty() ? Value::undefined() : reject_args[0];

            std::string state = getState(promise);
            if(state != STATE_PENDING) {
                return Value::undefined();  // Already settled
            }

            rejectPromise(promise, reason);
            return Value::undefined();
        });

    // Step 15: Perform HostEnqueuePromiseJob(job.[[Job]], job.[[Realm]]).
    // DEVIATION: Uses engine->enqueueMicrotask instead of HostEnqueuePromiseJob.
    auto* thenable_obj = value.getObject();
    if(engine != nullptr) {
        auto* microtask_func = factory->createJSFunction(
            [then_method, thenable_obj, resolve_func, reject_func](
                const CallContext& /*mt_ctx*/, const std::vector<Value>& /*mt_args*/) -> Value {
                try {
                    // Step b: Let thenCallResult be Completion(HostCallJobCallback(then, thenable,
                    // ...)).
                    CallContext then_ctx(rift::core::CallType::Function, Value(thenable_obj));
                    then_method->call(then_ctx, {Value(resolve_func), Value(reject_func)});
                } catch(const rift::core::JavaScriptException& e) {
                    // Step c: If thenCallResult is an abrupt completion, reject.
                    CallContext reject_ctx(rift::core::CallType::Function, Value::undefined());
                    reject_func->call(reject_ctx, {e.getValue()});
                } catch(const std::exception& e) {
                    // NON-STANDARD: C++ exception fallback.
                    CallContext reject_ctx(rift::core::CallType::Function, Value::undefined());
                    reject_func->call(reject_ctx, {Value(std::string("Error: ") + e.what())});
                }
                return Value::undefined();
            });
        engine->enqueueMicrotask(microtask_func, {}, Value::undefined());
    } else {
        // NON-STANDARD: No engine -- execute synchronously (for testing).
        // The spec always enqueues as a job; this fallback runs the thenable
        // adoption synchronously when there is no microtask queue available.
        try {
            CallContext then_ctx(rift::core::CallType::Function, Value(thenable_obj));
            then_method->call(then_ctx, {Value(resolve_func), Value(reject_func)});
        } catch(const rift::core::JavaScriptException& e) {
            CallContext reject_ctx(rift::core::CallType::Function, Value::undefined());
            reject_func->call(reject_ctx, {e.getValue()});
        } catch(const std::exception& e) {
            CallContext reject_ctx(rift::core::CallType::Function, Value::undefined());
            reject_func->call(reject_ctx, {Value(std::string("Error: ") + e.what())});
        }
    }
}

// 27.2.1.9 TriggerPromiseReactions ( reactions, argument )
// @spec https://tc39.es/ecma262/#sec-triggerpromisereactions
//
// Spec algorithm:
//   1. For each element reaction of reactions, do
//      a. Let job be NewPromiseReactionJob(reaction, argument).
//      b. Perform HostEnqueuePromiseJob(job.[[Job]], job.[[Realm]]).
//   2. Return unused.
//
// DEVIATION: The spec receives the reactions list as a parameter (already
// extracted from the promise by FulfillPromise/RejectPromise). Rift reads
// the reactions from the promise object directly and clears both reaction
// lists afterward. This achieves the same result since the promise state
// has already been set before this function is called.
//
// DEVIATION: Uses engine->enqueueMicrotask instead of HostEnqueuePromiseJob.
// Falls back to synchronous execution when engine is nullptr (NON-STANDARD).
/**
 * Trigger promise reactions.
 * Enqueues handlers as microtasks to be executed after current sync code.
 */
void Promise::triggerReactions(JSObject* promise, const std::string& reaction_type) {
    std::string slot_name =
        (reaction_type == "fulfill") ? "[[PromiseFulfillReactions]]" : "[[PromiseRejectReactions]]";

    Value reactions_val = promise->getProperty(slot_name);
    if(!reactions_val.isObject()) {
        return;
    }

    auto* reactions = reactions_val.getObject();
    Value length_val = reactions->getProperty("length");
    int length = length_val.isNumber() ? static_cast<int>(length_val.getNumber()) : 0;
    Value result = promise->getProperty("[[PromiseResult]]");
    bool is_fulfill = (reaction_type == "fulfill");

    // Get engine for microtask queue
    auto* engine = getEngine();

    // Step 1: For each element reaction of reactions, do
    for(int i = 0; i < length; i++) {
        Value reaction_val = reactions->getProperty(std::to_string(i));
        if(!reaction_val.isObject()) {
            continue;
        }

        auto* reaction = reaction_val.getObject();
        Value handler_val = reaction->getProperty("handler");
        Value result_promise_val = reaction->getProperty("resultPromise");

        JSFunction* handler = nullptr;
        if(handler_val.isFunction()) {
            handler = dynamic_cast<JSFunction*>(handler_val.getObject());
        }

        JSObject* result_promise = nullptr;
        if(result_promise_val.isObject()) {
            result_promise = result_promise_val.getObject();
        }

        if(result_promise == nullptr) {
            continue;  // Invalid reaction
        }

        // Step 1a: Let job be NewPromiseReactionJob(reaction, argument).
        // Step 1b: Perform HostEnqueuePromiseJob(job.[[Job]], job.[[Realm]]).
        if(engine != nullptr) {
            auto* factory = getFactory();
            auto* microtask_func = factory->createJSFunction(
                [handler, result_promise, result, is_fulfill](
                    const CallContext& /*mt_ctx*/, const std::vector<Value>& /*mt_args*/) -> Value {
                    executeReaction(handler, result_promise, result, is_fulfill);
                    return Value::undefined();
                });

            engine->enqueueMicrotask(microtask_func, {}, Value::undefined());
        } else {
            // NON-STANDARD: No engine -- execute synchronously.
            executeReaction(handler, result_promise, result, is_fulfill);
        }
    }

    // Clear the reactions arrays (spec: done in FulfillPromise/RejectPromise steps 4-5).
    // DEVIATION: Rift clears reactions here after triggering instead of in
    // FulfillPromise/RejectPromise before triggering. The ordering difference
    // does not affect behavior since reactions are already captured above.
    auto* factory = getFactory();
    auto* empty_fulfill = factory->createJSObject();
    empty_fulfill->setProperty("length", Value(0.0));
    auto* empty_reject = factory->createJSObject();
    empty_reject->setProperty("length", Value(0.0));

    promise->setProperty("[[PromiseFulfillReactions]]", Value(empty_fulfill));
    promise->setProperty("[[PromiseRejectReactions]]", Value(empty_reject));
}

// ============================================================================
// Instance Methods
// ============================================================================

// 27.2.5.4 Promise.prototype.then ( onFulfilled, onRejected )
// @spec https://tc39.es/ecma262/#sec-promise.prototype.then
//
// This method implements PerformPromiseThen (27.2.5.4.1) inline.
//
// Spec algorithm (PerformPromiseThen):
//   1. Assert: IsPromise(promise) is true.
//   2. If resultCapability is not present, set resultCapability to undefined.
//   3. If IsCallable(onFulfilled) is false, let onFulfilledJobCallback be empty.
//   4. Else, let onFulfilledJobCallback be HostMakeJobCallback(onFulfilled).
//   5. If IsCallable(onRejected) is false, let onRejectedJobCallback be empty.
//   6. Else, let onRejectedJobCallback be HostMakeJobCallback(onRejected).
//   7. Let fulfillReaction be the PromiseReaction Record { [[Capability]]: resultCapability,
//      [[Type]]: "Fulfill", [[Handler]]: onFulfilledJobCallback }.
//   8. Let rejectReaction be the PromiseReaction Record { [[Capability]]: resultCapability,
//      [[Type]]: "Reject", [[Handler]]: onRejectedJobCallback }.
//   9. If promise.[[PromiseState]] is pending, then
//      a. Append fulfillReaction to promise.[[PromiseFulfillReactions]].
//      b. Append rejectReaction to promise.[[PromiseRejectReactions]].
//   10. Else if promise.[[PromiseState]] is fulfilled, then
//       a. Let value be promise.[[PromiseResult]].
//       b. Let fulfillJob be NewPromiseReactionJob(fulfillReaction, value).
//       c. Perform HostEnqueuePromiseJob(fulfillJob.[[Job]], fulfillJob.[[Realm]]).
//   11. Else,
//       a. Assert: The value of promise.[[PromiseState]] is rejected.
//       b. Let reason be promise.[[PromiseResult]].
//       c. If promise.[[PromiseIsHandled]] is false, perform
//          HostPromiseRejectionTracker(promise, "handle").
//       d. Let rejectJob be NewPromiseReactionJob(rejectReaction, reason).
//       e. Perform HostEnqueuePromiseJob(rejectJob.[[Job]], rejectJob.[[Realm]]).
//   12. Set promise.[[PromiseIsHandled]] to true.
//   13. If resultCapability is undefined, return undefined.
//   14. Return resultCapability.[[Promise]].
//
// INCOMPLETE: Step 11c (HostPromiseRejectionTracker with "handle") not implemented.
// SIMPLIFIED: Rift does not use PromiseCapability Records. Instead, it creates
// a plain promise and uses addReaction/executeReaction with the result promise
// directly. The [[Resolve]]/[[Reject]] of the PromiseCapability are replaced by
// direct calls to resolvePromise/rejectPromise in executeReaction.
/**
 * Promise.prototype.then(onFulfilled, onRejected)
 * Returns a new promise that resolves/rejects based on the handler results.
 */
Value Promise::then(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Assert: IsPromise(promise) is true.
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Promise.prototype.then called on non-object"));
    }

    auto* promise = ctx.thisValue.getObject();
    if(!isPromise(Value(promise))) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Promise.prototype.then called on non-Promise"));
    }

    auto* factory = getFactory();

    // Steps 3-6: Check callability of onFulfilled and onRejected.
    // If not callable, set to nullptr (empty in spec terms) for pass-through.
    Value on_fulfilled_val = !args.empty() ? args[0] : Value::undefined();
    Value on_rejected_val = args.size() > 1 ? args[1] : Value::undefined();

    JSFunction* on_fulfilled = nullptr;
    if(on_fulfilled_val.isFunction()) {
        on_fulfilled = dynamic_cast<JSFunction*>(on_fulfilled_val.getObject());
    }

    JSFunction* on_rejected = nullptr;
    if(on_rejected_val.isFunction()) {
        on_rejected = dynamic_cast<JSFunction*>(on_rejected_val.getObject());
    }

    // Step 2/14: Create resultCapability (the promise returned by .then()).
    // SIMPLIFIED: Creates a plain promise instead of a full PromiseCapability Record.
    auto* result_promise = createPromiseObject(factory);
    rift::memory::GCProtector protect(result_promise, factory->getObjectManager());

    // Step 12: Set promise.[[PromiseIsHandled]] to true.
    // (Done early here rather than at step 12 position, but equivalent.)
    promise->setProperty("[[PromiseIsHandled]]", Value(true));

    std::string state = getState(promise);

    // Step 9: If promise.[[PromiseState]] is pending, then
    if(state == STATE_PENDING) {
        // Step 9a: Append fulfillReaction to promise.[[PromiseFulfillReactions]].
        addReaction(promise, "fulfill", on_fulfilled, result_promise);
        // Step 9b: Append rejectReaction to promise.[[PromiseRejectReactions]].
        addReaction(promise, "reject", on_rejected, result_promise);
    } else if(state == STATE_FULFILLED) {
        // Step 10: Else if promise.[[PromiseState]] is fulfilled, then
        // Step 10a: Let value be promise.[[PromiseResult]].
        Value result = getResult(promise);
        auto* engine = getEngine();

        // Step 10b-c: Let fulfillJob be NewPromiseReactionJob(fulfillReaction, value).
        //             Perform HostEnqueuePromiseJob(fulfillJob.[[Job]], ...).
        if(engine != nullptr) {
            auto* microtask_func = factory->createJSFunction(
                [on_fulfilled, result_promise, result](
                    const CallContext& /*mt_ctx*/, const std::vector<Value>& /*mt_args*/) -> Value {
                    executeReaction(on_fulfilled, result_promise, result, true);
                    return Value::undefined();
                });
            engine->enqueueMicrotask(microtask_func, {}, Value::undefined());
        } else {
            // NON-STANDARD: Synchronous fallback.
            executeReaction(on_fulfilled, result_promise, result, true);
        }
    } else {
        // Step 11: Else (promise.[[PromiseState]] is rejected).
        // Step 11b: Let reason be promise.[[PromiseResult]].
        Value reason = getResult(promise);
        auto* engine = getEngine();

        // Step 11d-e: Let rejectJob be NewPromiseReactionJob(rejectReaction, reason).
        //             Perform HostEnqueuePromiseJob(rejectJob.[[Job]], ...).
        if(engine != nullptr) {
            auto* microtask_func = factory->createJSFunction(
                [on_rejected, result_promise, reason](
                    const CallContext& /*mt_ctx*/, const std::vector<Value>& /*mt_args*/) -> Value {
                    executeReaction(on_rejected, result_promise, reason, false);
                    return Value::undefined();
                });
            engine->enqueueMicrotask(microtask_func, {}, Value::undefined());
        } else {
            // NON-STANDARD: Synchronous fallback.
            executeReaction(on_rejected, result_promise, reason, false);
        }
    }

    // Step 14: Return resultCapability.[[Promise]].
    return Value(result_promise);
}

// 27.2.5.1 Promise.prototype.catch ( onRejected )
// @spec https://tc39.es/ecma262/#sec-promise.prototype.catch
//
// Spec algorithm:
//   1. Let promise be the this value.
//   2. Return ? Invoke(promise, "then", << undefined, onRejected >>).
/**
 * Promise.prototype.catch(onRejected)
 * Sugar for .then(undefined, onRejected)
 */
Value Promise::catch_(const CallContext& ctx, const std::vector<Value>& args) {
    // Steps 1-2: Return ? Invoke(promise, "then", << undefined, onRejected >>).
    // SIMPLIFIED: Calls then() directly instead of going through Invoke.
    std::vector<Value> then_args = {Value::undefined()};
    if(!args.empty()) {
        then_args.push_back(args[0]);
    }
    return then(ctx, then_args);
}

// 27.2.5.3 Promise.prototype.finally ( onFinally )
// @spec https://tc39.es/ecma262/#sec-promise.prototype.finally
//
// Spec algorithm:
//   1. Let promise be the this value.
//   2. If promise is not an Object, throw a TypeError exception.
//   3. Let C be ? SpeciesConstructor(promise, %Promise%).
//   4. Assert: IsConstructor(C) is true.
//   5. If IsCallable(onFinally) is false, then
//      a. Let thenFinally be onFinally.
//      b. Let catchFinally be onFinally.
//   6. Else,
//      a. Let thenFinallyClosure be a new Abstract Closure with parameters (value) that
//         captures onFinally and C and performs the following steps:
//         i. Let result be ? Call(onFinally, undefined).
//         ii. Let promise be ? PromiseResolve(C, result).
//         iii. Let returnValue be a new Abstract Closure with no parameters that captures
//              value and performs: return value.
//         iv. Return ? Invoke(promise, "then", << returnValue >>).
//      b. Let thenFinally be CreateBuiltinFunction(thenFinallyClosure, 1, "", << >>).
//      c. Let catchFinallyClosure be a new Abstract Closure with parameters (reason) that
//         captures onFinally and C and performs the following steps:
//         i. Let result be ? Call(onFinally, undefined).
//         ii. Let promise be ? PromiseResolve(C, result).
//         iii. Let throwReason be a new Abstract Closure with no parameters that captures
//              reason and performs: throw reason.
//         iv. Return ? Invoke(promise, "then", << throwReason >>).
//      d. Let catchFinally be CreateBuiltinFunction(catchFinallyClosure, 1, "", << >>).
//   7. Return ? Invoke(promise, "then", << thenFinally, catchFinally >>).
//
// INCOMPLETE: Step 3 (SpeciesConstructor) not implemented -- always uses %Promise%.
// SIMPLIFIED: Rift inlines the PromiseResolve + thenable chaining logic
// rather than going through PromiseResolve(C, result) and Invoke(promise, "then").
// When onFinally() returns a thenable, Rift manually chains via .then()
// instead of using the formal PromiseResolve abstract operation.
/**
 * Promise.prototype.finally(onFinally)
 *
 * The finally() method runs a callback regardless of whether the promise
 * fulfilled or rejected, but preserves the original value/reason.
 *
 * Equivalent to:
 *   .then(
 *     value => Promise.resolve(onFinally()).then(() => value),
 *     reason => Promise.resolve(onFinally()).then(() => { throw reason; })
 *   )
 */
Value Promise::finally_(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Let promise be the this value.
    // Step 2: If promise is not an Object, throw a TypeError exception.
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Promise.prototype.finally called on non-object"));
    }

    auto* promise = ctx.thisValue.getObject();
    if(!isPromise(Value(promise))) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Promise.prototype.finally called on non-Promise"));
    }

    auto* factory = getFactory();

    // Get onFinally callback
    Value on_finally_val = !args.empty() ? args[0] : Value::undefined();

    // Step 5: If IsCallable(onFinally) is false, then
    //   5a: Let thenFinally be onFinally.
    //   5b: Let catchFinally be onFinally.
    // SIMPLIFIED: When onFinally is not callable, Rift passes undefined/undefined
    // to then() which creates pass-through behavior (equivalent to the spec
    // passing onFinally directly, since non-callable handlers are treated as
    // identity/thrower by PerformPromiseThen).
    if(!on_finally_val.isFunction()) {
        return then(ctx, {Value::undefined(), Value::undefined()});
    }

    auto* on_finally = dynamic_cast<JSFunction*>(on_finally_val.getObject());

    // Step 6a: Let thenFinallyClosure be a new Abstract Closure...
    // value => Promise.resolve(onFinally()).then(() => value)
    auto* then_finally = factory->createJSFunction(
        [on_finally, factory](const CallContext& /*wrapper_ctx*/,
                              const std::vector<Value>& wrapper_args) -> Value {
            Value original_value = wrapper_args.empty() ? Value::undefined() : wrapper_args[0];

            // Step 6a.i: Let result be ? Call(onFinally, undefined).
            Value callback_result;
            try {
                CallContext finally_ctx(rift::core::CallType::Function, Value::undefined());
                callback_result = on_finally->call(finally_ctx, {});
            } catch(const rift::core::JavaScriptException& e) {
                // onFinally threw -- propagate the exception
                throw;
            }

            // Step 6a.ii: Let promise be ? PromiseResolve(C, result).
            // Step 6a.iv: Return ? Invoke(promise, "then", << returnValue >>).
            // SIMPLIFIED: Instead of PromiseResolve + Invoke, Rift checks if
            // callback_result is thenable and manually chains.
            if(isThenable(callback_result)) {
                auto* result_promise = createPromiseObject(factory);
                rift::memory::GCProtector protect(result_promise, factory->getObjectManager());

                auto* then_method = getThenMethod(callback_result);
                auto* thenable_obj = callback_result.getObject();

                // Step 6a.iii: returnValue closure -- ignores thenable result,
                // returns original value.
                auto* value_resolver =
                    factory->createJSFunction([result_promise, original_value](
                                                  const CallContext& /*res_ctx*/,
                                                  const std::vector<Value>& /*res_args*/) -> Value {
                        fulfillPromise(result_promise, original_value);
                        return Value::undefined();
                    });

                auto* value_rejecter = factory->createJSFunction(
                    [result_promise](const CallContext& /*rej_ctx*/,
                                     const std::vector<Value>& rej_args) -> Value {
                        Value reason = rej_args.empty() ? Value::undefined() : rej_args[0];
                        rejectPromise(result_promise, reason);
                        return Value::undefined();
                    });

                try {
                    CallContext then_ctx(rift::core::CallType::Function, Value(thenable_obj));
                    then_method->call(then_ctx, {Value(value_resolver), Value(value_rejecter)});
                } catch(const rift::core::JavaScriptException& e) {
                    rejectPromise(result_promise, e.getValue());
                }

                return Value(result_promise);
            }

            // Not a thenable -- just return the original value
            return original_value;
        });

    // Step 6c: Let catchFinallyClosure be a new Abstract Closure...
    // reason => Promise.resolve(onFinally()).then(() => { throw reason; })
    auto* catch_finally = factory->createJSFunction(
        [on_finally, factory](const CallContext& /*wrapper_ctx*/,
                              const std::vector<Value>& wrapper_args) -> Value {
            Value original_reason = wrapper_args.empty() ? Value::undefined() : wrapper_args[0];

            // Step 6c.i: Let result be ? Call(onFinally, undefined).
            Value callback_result;
            try {
                CallContext finally_ctx(rift::core::CallType::Function, Value::undefined());
                callback_result = on_finally->call(finally_ctx, {});
            } catch(const rift::core::JavaScriptException& e) {
                // onFinally threw -- propagate the new exception
                throw;
            }

            // Step 6c.ii: Let promise be ? PromiseResolve(C, result).
            // Step 6c.iv: Return ? Invoke(promise, "then", << throwReason >>).
            if(isThenable(callback_result)) {
                auto* result_promise = createPromiseObject(factory);
                rift::memory::GCProtector protect(result_promise, factory->getObjectManager());

                auto* then_method = getThenMethod(callback_result);
                auto* thenable_obj = callback_result.getObject();

                // Step 6c.iii: throwReason closure -- re-throws original reason.
                auto* reason_rethrower =
                    factory->createJSFunction([result_promise, original_reason](
                                                  const CallContext& /*res_ctx*/,
                                                  const std::vector<Value>& /*res_args*/) -> Value {
                        rejectPromise(result_promise, original_reason);
                        return Value::undefined();
                    });

                auto* reason_rejecter = factory->createJSFunction(
                    [result_promise](const CallContext& /*rej_ctx*/,
                                     const std::vector<Value>& rej_args) -> Value {
                        Value reason = rej_args.empty() ? Value::undefined() : rej_args[0];
                        rejectPromise(result_promise, reason);
                        return Value::undefined();
                    });

                try {
                    CallContext then_ctx(rift::core::CallType::Function, Value(thenable_obj));
                    then_method->call(then_ctx, {Value(reason_rethrower), Value(reason_rejecter)});
                } catch(const rift::core::JavaScriptException& e) {
                    rejectPromise(result_promise, e.getValue());
                }

                return Value(result_promise);
            }

            // Not a thenable -- re-throw the original reason
            throw rift::core::JavaScriptException(original_reason);
        });

    // Step 7: Return ? Invoke(promise, "then", << thenFinally, catchFinally >>).
    return then(ctx, {Value(then_finally), Value(catch_finally)});
}

// ============================================================================
// Static Methods
// ============================================================================

// 27.2.4.7 Promise.resolve ( x )
// @spec https://tc39.es/ecma262/#sec-promise.resolve
//
// This calls 27.2.4.7.1 PromiseResolve ( C, x ):
//   1. If IsPromise(x) is true, then
//      a. Let xConstructor be ? Get(x, "constructor").
//      b. If SameValue(xConstructor, C) is true, return x.
//   2. Let promiseCapability be ? NewPromiseCapability(C).
//   3. Perform ? Call(promiseCapability.[[Resolve]], undefined, << x >>).
//   4. Return promiseCapability.[[Promise]].
//
// SIMPLIFIED: Rift skips step 1a-1b (constructor identity check) and always
// returns the promise if IsPromise(x) is true, regardless of its constructor.
// This means Promise.resolve on a subclass instance would incorrectly return
// it directly. Also, Rift does not use NewPromiseCapability -- it creates a
// promise and calls resolvePromise directly.
Value Promise::resolve(const CallContext& /*ctx*/, const std::vector<Value>& args) {
    auto* factory = getObjectFactory();
    Value value = args.empty() ? Value::undefined() : args[0];

    // Step 1: If IsPromise(x) is true, return x.
    // SIMPLIFIED: Skips constructor identity check (step 1a-1b).
    if(isPromise(value)) {
        return value;
    }

    // Steps 2-4: Create a promise and resolve it.
    // resolvePromise handles thenable adoption (equivalent to calling
    // promiseCapability.[[Resolve]] which triggers Promise Resolve Functions).
    auto* promise_obj = createPromiseObject(factory);
    resolvePromise(promise_obj, value);
    return Value(promise_obj);
}

// 27.2.4.6 Promise.reject ( r )
// @spec https://tc39.es/ecma262/#sec-promise.reject
//
// Spec algorithm:
//   1. Let C be the this value.
//   2. Let promiseCapability be ? NewPromiseCapability(C).
//   3. Perform ? Call(promiseCapability.[[Reject]], undefined, << r >>).
//   4. Return promiseCapability.[[Promise]].
//
// SIMPLIFIED: Rift does not use NewPromiseCapability. Creates a promise
// directly and calls rejectPromise.
Value Promise::reject(const CallContext& /*ctx*/, const std::vector<Value>& args) {
    auto* factory = getObjectFactory();
    Value reason = args.empty() ? Value::undefined() : args[0];

    // Steps 2-4: Create a rejected promise.
    auto* promise_obj = createPromiseObject(factory);
    rejectPromise(promise_obj, reason);
    return Value(promise_obj);
}

// 27.2.4.1 Promise.all ( iterable )
// @spec https://tc39.es/ecma262/#sec-promise.all
//
// Calls 27.2.4.1.2 PerformPromiseAll ( iteratorRecord, constructor, resultCapability,
// promiseResolve )
//
// Spec algorithm (PerformPromiseAll):
//   1. Let values be a new empty List.
//   2. Let remainingElementsCount be the Record { [[Value]]: 1 }.
//   3. Let index be 0.
//   4. Repeat,
//      a. Let next be ? IteratorStepValue(iteratorRecord).
//      b. If next is done, then
//         i. Set remainingElementsCount.[[Value]] to remainingElementsCount.[[Value]] - 1.
//         ii. If remainingElementsCount.[[Value]] is 0, then
//             1. Let valuesArray be CreateArrayFromList(values).
//             2. Perform ? Call(resultCapability.[[Resolve]], undefined, << valuesArray >>).
//         iii. Return resultCapability.[[Promise]].
//      c. Append undefined to values.
//      d. Let nextPromise be ? Call(promiseResolve, constructor, << next >>).
//      e. Let steps be the algorithm steps defined in Promise.all Resolve Element Functions.
//      f. ... (create resolve element function with index, values, remainingElementsCount, etc.)
//      g. Set remainingElementsCount.[[Value]] to remainingElementsCount.[[Value]] + 1.
//      h. Perform ? Invoke(nextPromise, "then", << resolveElement, resultCapability.[[Reject]] >>).
//      i. Set index to index + 1.
//
// DEVIATION: Rift uses array-like indexed access (getProperty("length"), getProperty("0"), etc.)
// instead of the Iterator protocol (GetIterator/IteratorStepValue). This means non-array
// iterables (e.g., Set, Map, generators) are not supported -- only array-like objects.
// SIMPLIFIED: Uses a "remaining" counter + "rejected" flag on a shared state object
// instead of the spec's remainingElementsCount Record. The counter starts at `length`
// and decrements, whereas the spec starts at 1, increments per element, then decrements
// the initial 1 after iteration completes.
/**
 * Promise.all(iterable)
 *
 * Returns a promise that:
 * - Resolves with an array of all values when ALL input promises resolve
 * - Rejects immediately with the first rejection reason if ANY rejects
 * - Resolves with [] if given an empty iterable
 */
Value Promise::all(const CallContext& /*ctx*/, const std::vector<Value>& args) {
    auto* factory = getObjectFactory();

    // Create the result promise (spec: NewPromiseCapability)
    auto* result_promise = createPromiseObject(factory);
    rift::memory::GCProtector protect(result_promise, factory->getObjectManager());

    // Get the iterable (first argument)
    if(args.empty()) {
        // Empty iterable case -- resolve with empty array
        auto* empty_array = factory->createJSObject();
        empty_array->setProperty("length", Value(0.0));
        fulfillPromise(result_promise, Value(empty_array));
        return Value(result_promise);
    }

    const Value& iterable = args[0];

    // DEVIATION: Uses array-like access instead of GetIterator.
    if(!iterable.isObject()) {
        rejectPromise(result_promise, Value("TypeError: Promise.all requires an iterable"));
        return Value(result_promise);
    }

    auto* iterable_obj = iterable.getObject();
    Value length_val = iterable_obj->getProperty("length");

    if(!length_val.isNumber()) {
        rejectPromise(result_promise, Value("TypeError: Promise.all requires an iterable"));
        return Value(result_promise);
    }

    int length = static_cast<int>(length_val.getNumber());

    // Step 4b: If next is done (empty iterable), resolve with empty array.
    if(length == 0) {
        auto* empty_array = factory->createJSObject();
        empty_array->setProperty("length", Value(0.0));
        fulfillPromise(result_promise, Value(empty_array));
        return Value(result_promise);
    }

    // Step 1: Let values be a new empty List.
    auto* results = factory->createJSObject();
    results->setProperty("length", Value(static_cast<double>(length)));

    // Step 2: Let remainingElementsCount be the Record { [[Value]]: 1 }.
    // SIMPLIFIED: Starts at `length` instead of 1, no +1 per element / -1 at end.
    auto* state = factory->createJSObject();
    state->setProperty("remaining", Value(static_cast<double>(length)));
    state->setProperty("rejected", Value(false));

    // Step 4: Repeat (for each element)
    for(int i = 0; i < length; i++) {
        Value element = iterable_obj->getProperty(std::to_string(i));

        // Step 4d: Let nextPromise be ? Call(promiseResolve, constructor, << next >>).
        auto* element_promise = createPromiseObject(factory);
        resolvePromise(element_promise, element);

        // Step 4e-f: Create Promise.all Resolve Element Function.
        // 27.2.4.1.3 Promise.all Resolve Element Functions
        // @spec https://tc39.es/ecma262/#sec-promise.all-resolve-element-functions
        int index = i;  // Capture by value
        auto* on_fulfilled =
            factory->createJSFunction([results, state, result_promise, index](
                                          const CallContext& /*handler_ctx*/,
                                          const std::vector<Value>& handler_args) -> Value {
                // Check if already rejected
                Value rejected = state->getProperty("rejected");
                if(rejected.isBoolean() && rejected.getBool()) {
                    return Value::undefined();
                }

                // Store the value at the correct index (spec step 9: Set values[index] to x).
                Value value = handler_args.empty() ? Value::undefined() : handler_args[0];
                results->setProperty(std::to_string(index), value);

                // Step 10: Set remainingElementsCount.[[Value]] to
                //          remainingElementsCount.[[Value]] - 1.
                Value remaining_val = state->getProperty("remaining");
                int remaining = static_cast<int>(remaining_val.getNumber()) - 1;
                state->setProperty("remaining", Value(static_cast<double>(remaining)));

                // Step 11: If remainingElementsCount.[[Value]] is 0, then
                //   11a: Let valuesArray be CreateArrayFromList(values).
                //   11b: Perform ? Call(resultCapability.[[Resolve]], undefined, << valuesArray
                //   >>).
                if(remaining == 0) {
                    fulfillPromise(result_promise, Value(results));
                }

                return Value::undefined();
            });

        // Create rejection handler (rejects with first rejection reason)
        auto* on_rejected = factory->createJSFunction(
            [state, result_promise](const CallContext& /*handler_ctx*/,
                                    const std::vector<Value>& handler_args) -> Value {
                // Only first rejection counts
                Value rejected = state->getProperty("rejected");
                if(rejected.isBoolean() && rejected.getBool()) {
                    return Value::undefined();
                }

                state->setProperty("rejected", Value(true));

                Value reason = handler_args.empty() ? Value::undefined() : handler_args[0];
                rejectPromise(result_promise, reason);

                return Value::undefined();
            });

        // Step 4h: Perform ? Invoke(nextPromise, "then", << resolveElement,
        // resultCapability.[[Reject]] >>).
        CallContext then_ctx(rift::core::CallType::Function, Value(element_promise));
        then(then_ctx, {Value(on_fulfilled), Value(on_rejected)});
    }

    return Value(result_promise);
}

// 27.2.4.5 Promise.race ( iterable )
// @spec https://tc39.es/ecma262/#sec-promise.race
//
// Calls 27.2.4.5.1 PerformPromiseRace ( iteratorRecord, constructor, resultCapability,
// promiseResolve )
//
// Spec algorithm (PerformPromiseRace):
//   1. Repeat,
//      a. Let next be ? IteratorStepValue(iteratorRecord).
//      b. If next is done, then
//         i. Return resultCapability.[[Promise]].
//      c. Let nextPromise be ? Call(promiseResolve, constructor, << next >>).
//      d. Perform ? Invoke(nextPromise, "then", << resultCapability.[[Resolve]],
//      resultCapability.[[Reject]] >>).
//
// DEVIATION: Uses array-like indexed access instead of the Iterator protocol.
// DEVIATION: Uses a shared "settled" state flag to guard against multiple
// settlements, whereas the spec relies on the PromiseCapability's resolve/reject
// functions being one-shot (via the [[AlreadyResolved]] guard in CreateResolvingFunctions).
/**
 * Promise.race(iterable)
 *
 * Returns a promise that settles with the first promise to settle.
 * - Resolves with the first fulfilled value
 * - Rejects with the first rejection reason
 * - Never settles if given an empty iterable (pending forever)
 */
Value Promise::race(const CallContext& /*ctx*/, const std::vector<Value>& args) {
    auto* factory = getObjectFactory();

    // Create the result promise (spec: NewPromiseCapability)
    auto* result_promise = createPromiseObject(factory);
    rift::memory::GCProtector protect(result_promise, factory->getObjectManager());

    if(args.empty()) {
        // No argument -- promise stays pending forever
        return Value(result_promise);
    }

    const Value& iterable = args[0];

    // DEVIATION: Uses array-like access instead of GetIterator.
    if(!iterable.isObject()) {
        rejectPromise(result_promise, Value("TypeError: Promise.race requires an iterable"));
        return Value(result_promise);
    }

    auto* iterable_obj = iterable.getObject();
    Value length_val = iterable_obj->getProperty("length");

    if(!length_val.isNumber()) {
        rejectPromise(result_promise, Value("TypeError: Promise.race requires an iterable"));
        return Value(result_promise);
    }

    int length = static_cast<int>(length_val.getNumber());

    // Step 1b: If next is done, return resultCapability.[[Promise]].
    // (Empty iterable -- promise stays pending forever per spec.)
    if(length == 0) {
        return Value(result_promise);
    }

    // NON-STANDARD: Track settlement state to prevent multiple settlements.
    // The spec relies on [[AlreadyResolved]] in the PromiseCapability's functions.
    auto* state = factory->createJSObject();
    state->setProperty("settled", Value(false));

    // Step 1: Repeat (for each element)
    for(int i = 0; i < length; i++) {
        Value element = iterable_obj->getProperty(std::to_string(i));

        // Step 1c: Let nextPromise be ? Call(promiseResolve, constructor, << next >>).
        auto* element_promise = createPromiseObject(factory);
        resolvePromise(element_promise, element);

        // Step 1d: Perform ? Invoke(nextPromise, "then",
        //          << resultCapability.[[Resolve]], resultCapability.[[Reject]] >>).
        // SIMPLIFIED: Creates inline resolve/reject handlers instead of passing
        // the PromiseCapability's [[Resolve]]/[[Reject]] directly.
        auto* on_fulfilled = factory->createJSFunction(
            [state, result_promise](const CallContext& /*handler_ctx*/,
                                    const std::vector<Value>& handler_args) -> Value {
                Value settled = state->getProperty("settled");
                if(settled.isBoolean() && settled.getBool()) {
                    return Value::undefined();
                }

                state->setProperty("settled", Value(true));
                Value value = handler_args.empty() ? Value::undefined() : handler_args[0];
                fulfillPromise(result_promise, value);

                return Value::undefined();
            });

        auto* on_rejected = factory->createJSFunction(
            [state, result_promise](const CallContext& /*handler_ctx*/,
                                    const std::vector<Value>& handler_args) -> Value {
                Value settled = state->getProperty("settled");
                if(settled.isBoolean() && settled.getBool()) {
                    return Value::undefined();
                }

                state->setProperty("settled", Value(true));
                Value reason = handler_args.empty() ? Value::undefined() : handler_args[0];
                rejectPromise(result_promise, reason);

                return Value::undefined();
            });

        CallContext then_ctx(rift::core::CallType::Function, Value(element_promise));
        then(then_ctx, {Value(on_fulfilled), Value(on_rejected)});
    }

    return Value(result_promise);
}

// 27.2.4.2 Promise.allSettled ( iterable )
// @spec https://tc39.es/ecma262/#sec-promise.allsettled
//
// Calls 27.2.4.2.1 PerformPromiseAllSettled ( iteratorRecord, constructor, resultCapability,
// promiseResolve )
//
// Similar structure to PerformPromiseAll, but:
//   - The resolve element function creates { status: "fulfilled", value: x }
//   - The reject element function creates { status: "rejected", reason: x }
//   - Both decrement remainingElementsCount; when it hits 0, resolve with values array
//   - Never rejects the result promise (unless iteration itself throws)
//
// 27.2.4.2.2 Promise.allSettled Resolve Element Functions
// @spec https://tc39.es/ecma262/#sec-promise.allsettled-resolve-element-functions
// 27.2.4.2.3 Promise.allSettled Reject Element Functions
// @spec https://tc39.es/ecma262/#sec-promise.allsettled-reject-element-functions
//
// DEVIATION: Uses array-like indexed access instead of the Iterator protocol.
// SIMPLIFIED: Same counter approach as Promise.all (starts at length, decrements).
/**
 * Promise.allSettled(iterable)
 *
 * Returns a promise that resolves when ALL promises have settled (fulfilled or rejected).
 * Never rejects. Resolves with an array of result objects:
 * - { status: "fulfilled", value: ... } for fulfilled promises
 * - { status: "rejected", reason: ... } for rejected promises
 */
Value Promise::allSettled(const CallContext& /*ctx*/, const std::vector<Value>& args) {
    auto* factory = getObjectFactory();

    // Create the result promise (spec: NewPromiseCapability)
    auto* result_promise = createPromiseObject(factory);
    rift::memory::GCProtector protect(result_promise, factory->getObjectManager());

    if(args.empty()) {
        // Empty iterable -- resolve with empty array
        auto* empty_array = factory->createJSObject();
        empty_array->setProperty("length", Value(0.0));
        fulfillPromise(result_promise, Value(empty_array));
        return Value(result_promise);
    }

    const Value& iterable = args[0];

    // DEVIATION: Uses array-like access instead of GetIterator.
    if(!iterable.isObject()) {
        rejectPromise(result_promise, Value("TypeError: Promise.allSettled requires an iterable"));
        return Value(result_promise);
    }

    auto* iterable_obj = iterable.getObject();
    Value length_val = iterable_obj->getProperty("length");

    if(!length_val.isNumber()) {
        rejectPromise(result_promise, Value("TypeError: Promise.allSettled requires an iterable"));
        return Value(result_promise);
    }

    int length = static_cast<int>(length_val.getNumber());

    // Empty iterable -- resolve with empty array
    if(length == 0) {
        auto* empty_array = factory->createJSObject();
        empty_array->setProperty("length", Value(0.0));
        fulfillPromise(result_promise, Value(empty_array));
        return Value(result_promise);
    }

    // Create results array and remaining counter
    auto* results = factory->createJSObject();
    results->setProperty("length", Value(static_cast<double>(length)));

    auto* state = factory->createJSObject();
    state->setProperty("remaining", Value(static_cast<double>(length)));

    // Iterate each element
    for(int i = 0; i < length; i++) {
        Value element = iterable_obj->getProperty(std::to_string(i));

        // Wrap with Promise.resolve (spec: Call(promiseResolve, constructor, << next >>))
        auto* element_promise = createPromiseObject(factory);
        resolvePromise(element_promise, element);

        int index = i;

        // 27.2.4.2.2 Promise.allSettled Resolve Element Functions
        // Creates { status: "fulfilled", value: x } and decrements remaining.
        auto* on_fulfilled =
            factory->createJSFunction([factory, results, state, result_promise, index](
                                          const CallContext& /*handler_ctx*/,
                                          const std::vector<Value>& handler_args) -> Value {
                Value value = handler_args.empty() ? Value::undefined() : handler_args[0];

                // Step 9: Let obj be OrdinaryObjectCreate(%Object.prototype%).
                // Step 10: Perform ! CreateDataPropertyOrThrow(obj, "status", "fulfilled").
                // Step 11: Perform ! CreateDataPropertyOrThrow(obj, "value", x).
                auto* result_obj = factory->createJSObject();
                result_obj->setProperty("status", Value("fulfilled"));
                result_obj->setProperty("value", value);
                // Step 12: Set values[index] to obj.
                results->setProperty(std::to_string(index), Value(result_obj));

                // Step 13: Set remainingElementsCount.[[Value]] to
                //          remainingElementsCount.[[Value]] - 1.
                Value remaining_val = state->getProperty("remaining");
                int remaining = static_cast<int>(remaining_val.getNumber()) - 1;
                state->setProperty("remaining", Value(static_cast<double>(remaining)));

                // Step 14: If remainingElementsCount.[[Value]] is 0, then
                //   14a: Let valuesArray be CreateArrayFromList(values).
                //   14b: Perform ? Call(resultCapability.[[Resolve]], undefined, << valuesArray
                //   >>).
                if(remaining == 0) {
                    fulfillPromise(result_promise, Value(results));
                }

                return Value::undefined();
            });

        // 27.2.4.2.3 Promise.allSettled Reject Element Functions
        // Creates { status: "rejected", reason: x } and decrements remaining.
        auto* on_rejected =
            factory->createJSFunction([factory, results, state, result_promise, index](
                                          const CallContext& /*handler_ctx*/,
                                          const std::vector<Value>& handler_args) -> Value {
                Value reason = handler_args.empty() ? Value::undefined() : handler_args[0];

                // Step 9: Let obj be OrdinaryObjectCreate(%Object.prototype%).
                // Step 10: Perform ! CreateDataPropertyOrThrow(obj, "status", "rejected").
                // Step 11: Perform ! CreateDataPropertyOrThrow(obj, "reason", x).
                auto* result_obj = factory->createJSObject();
                result_obj->setProperty("status", Value("rejected"));
                result_obj->setProperty("reason", reason);
                // Step 12: Set values[index] to obj.
                results->setProperty(std::to_string(index), Value(result_obj));

                // Step 13-14: Same as resolve element -- decrement and check.
                Value remaining_val = state->getProperty("remaining");
                int remaining = static_cast<int>(remaining_val.getNumber()) - 1;
                state->setProperty("remaining", Value(static_cast<double>(remaining)));

                if(remaining == 0) {
                    fulfillPromise(result_promise, Value(results));
                }

                return Value::undefined();
            });

        // Attach handlers via .then()
        CallContext then_ctx(rift::core::CallType::Function, Value(element_promise));
        then(then_ctx, {Value(on_fulfilled), Value(on_rejected)});
    }

    return Value(result_promise);
}

// 27.2.4.3 Promise.any ( iterable )
// @spec https://tc39.es/ecma262/#sec-promise.any
//
// Calls 27.2.4.3.1 PerformPromiseAny ( iteratorRecord, constructor, resultCapability,
// promiseResolve )
//
// Spec algorithm (PerformPromiseAny):
//   1. Let errors be a new empty List.
//   2. Let remainingElementsCount be the Record { [[Value]]: 1 }.
//   3. Let index be 0.
//   4. Repeat,
//      a. Let next be ? IteratorStepValue(iteratorRecord).
//      b. If next is done, then
//         i. Set remainingElementsCount.[[Value]] to remainingElementsCount.[[Value]] - 1.
//         ii. If remainingElementsCount.[[Value]] is 0, then
//             1. Let error be a newly created AggregateError object.
//             2. Perform ! DefinePropertyOrThrow(error, "errors", PropertyDescriptor { ... }).
//             3. Return ThrowCompletion(error).
//         iii. Return resultCapability.[[Promise]].
//      c. Append undefined to errors.
//      d. Let nextPromise be ? Call(promiseResolve, constructor, << next >>).
//      e. Let stepsRejected be ... Promise.any Reject Element Functions.
//      f. ... (create reject element function with captures)
//      g. Set remainingElementsCount.[[Value]] to remainingElementsCount.[[Value]] + 1.
//      h. Perform ? Invoke(nextPromise, "then", << resultCapability.[[Resolve]], rejectElement >>).
//      i. Set index to index + 1.
//
// DEVIATION: Uses array-like indexed access instead of the Iterator protocol.
// INCOMPLETE: The spec creates a proper AggregateError object with an .errors
// property containing the array of rejection reasons. Rift currently rejects
// with a plain string "AggregateError: All promises were rejected" instead of
// an AggregateError object, so the individual error reasons are lost.
/**
 * Promise.any(iterable)
 *
 * Returns a promise that:
 * - Resolves with the first fulfilled value
 * - Rejects with AggregateError if ALL promises reject
 * - Rejects immediately if given an empty iterable
 */
Value Promise::any(const CallContext& /*ctx*/, const std::vector<Value>& args) {
    auto* factory = getObjectFactory();

    // Create the result promise (spec: NewPromiseCapability)
    auto* result_promise = createPromiseObject(factory);
    rift::memory::GCProtector protect(result_promise, factory->getObjectManager());

    if(args.empty()) {
        // Empty iterable -- reject with AggregateError (spec step 4b.ii)
        // INCOMPLETE: Should create an actual AggregateError object.
        rejectPromise(result_promise, Value("AggregateError: All promises were rejected"));
        return Value(result_promise);
    }

    const Value& iterable = args[0];

    // DEVIATION: Uses array-like access instead of GetIterator.
    if(!iterable.isObject()) {
        rejectPromise(result_promise, Value("TypeError: Promise.any requires an iterable"));
        return Value(result_promise);
    }

    auto* iterable_obj = iterable.getObject();
    Value length_val = iterable_obj->getProperty("length");

    if(!length_val.isNumber()) {
        rejectPromise(result_promise, Value("TypeError: Promise.any requires an iterable"));
        return Value(result_promise);
    }

    int length = static_cast<int>(length_val.getNumber());

    // Step 4b: If next is done and remainingElementsCount is 0,
    // reject with AggregateError (empty iterable case).
    if(length == 0) {
        // INCOMPLETE: Should create an actual AggregateError object.
        rejectPromise(result_promise, Value("AggregateError: All promises were rejected"));
        return Value(result_promise);
    }

    // Step 1: Let errors be a new empty List.
    auto* errors = factory->createJSObject();
    errors->setProperty("length", Value(static_cast<double>(length)));

    // Step 2: Let remainingElementsCount be the Record { [[Value]]: 1 }.
    // SIMPLIFIED: Starts at `length` instead of 1 (same approach as Promise.all).
    auto* state = factory->createJSObject();
    state->setProperty("remaining", Value(static_cast<double>(length)));
    state->setProperty("fulfilled", Value(false));

    // Step 4: Repeat (for each element)
    for(int i = 0; i < length; i++) {
        Value element = iterable_obj->getProperty(std::to_string(i));

        // Step 4d: Let nextPromise be ? Call(promiseResolve, constructor, << next >>).
        auto* element_promise = createPromiseObject(factory);
        resolvePromise(element_promise, element);

        int index = i;

        // Step 4h: The resolve handler is resultCapability.[[Resolve]] -- first
        // fulfillment wins and resolves the result promise.
        auto* on_fulfilled = factory->createJSFunction(
            [state, result_promise](const CallContext& /*handler_ctx*/,
                                    const std::vector<Value>& handler_args) -> Value {
                Value fulfilled = state->getProperty("fulfilled");
                if(fulfilled.isBoolean() && fulfilled.getBool()) {
                    return Value::undefined();
                }

                state->setProperty("fulfilled", Value(true));
                Value value = handler_args.empty() ? Value::undefined() : handler_args[0];
                fulfillPromise(result_promise, value);

                return Value::undefined();
            });

        // 27.2.4.3.2 Promise.any Reject Element Functions
        // @spec https://tc39.es/ecma262/#sec-promise.any-reject-element-functions
        //
        // Collects rejection reasons; when all have rejected, creates AggregateError.
        auto* on_rejected =
            factory->createJSFunction([errors, state, result_promise, index](
                                          const CallContext& /*handler_ctx*/,
                                          const std::vector<Value>& handler_args) -> Value {
                Value fulfilled = state->getProperty("fulfilled");
                if(fulfilled.isBoolean() && fulfilled.getBool()) {
                    return Value::undefined();
                }

                // Step 9: Set errors[index] to x.
                Value reason = handler_args.empty() ? Value::undefined() : handler_args[0];
                errors->setProperty(std::to_string(index), reason);

                // Step 10: Set remainingElementsCount.[[Value]] to
                //          remainingElementsCount.[[Value]] - 1.
                Value remaining_val = state->getProperty("remaining");
                int remaining = static_cast<int>(remaining_val.getNumber()) - 1;
                state->setProperty("remaining", Value(static_cast<double>(remaining)));

                // Step 11: If remainingElementsCount.[[Value]] is 0, then
                //   11a: Let error be a newly created AggregateError object.
                //   11b: Perform ! DefinePropertyOrThrow(error, "errors", ...).
                //   11c: Return ThrowCompletion(error).
                // INCOMPLETE: Should create an actual AggregateError object with
                // an .errors property containing the collected rejection reasons.
                if(remaining == 0) {
                    rejectPromise(result_promise,
                                  Value("AggregateError: All promises were rejected"));
                }

                return Value::undefined();
            });

        // Step 4h: Perform ? Invoke(nextPromise, "then", << resultCapability.[[Resolve]],
        // rejectElement >>).
        CallContext then_ctx(rift::core::CallType::Function, Value(element_promise));
        then(then_ctx, {Value(on_fulfilled), Value(on_rejected)});
    }

    return Value(result_promise);
}

// 27.2.4.8 Promise.withResolvers ( )
// @spec https://tc39.es/ecma262/#sec-promise.withResolvers
//
// Spec algorithm:
//   1. Let C be the this value.
//   2. Let promiseCapability be ? NewPromiseCapability(C).
//   3. Let obj be OrdinaryObjectCreate(%Object.prototype%).
//   4. Perform ! CreateDataPropertyOrThrow(obj, "promise", promiseCapability.[[Promise]]).
//   5. Perform ! CreateDataPropertyOrThrow(obj, "resolve", promiseCapability.[[Resolve]]).
//   6. Perform ! CreateDataPropertyOrThrow(obj, "reject", promiseCapability.[[Reject]]).
//   7. Return obj.
//
// SIMPLIFIED: Rift creates the promise and resolve/reject functions directly
// instead of going through NewPromiseCapability. The resolve/reject functions
// are equivalent to what CreateResolvingFunctions would produce.
/**
 * Promise.withResolvers()
 *
 * ES2024 addition that returns an object with:
 * - promise: A new pending Promise
 * - resolve: Function to resolve the promise
 * - reject: Function to reject the promise
 *
 * This is useful when you need the resolve/reject functions outside the executor.
 */
Value Promise::withResolvers(const CallContext& /*ctx*/, const std::vector<Value>& /*args*/) {
    auto* factory = getObjectFactory();

    // Step 2: Let promiseCapability be ? NewPromiseCapability(C).
    // (Inlined: create promise + resolve/reject functions directly.)
    auto* promise_obj = createPromiseObject(factory);
    rift::memory::GCProtector protect(promise_obj, factory->getObjectManager());

    // Create resolve function (equivalent to promiseCapability.[[Resolve]])
    auto* resolve_func =
        factory->createJSFunction([promise_obj](const CallContext& /*resolve_ctx*/,
                                                const std::vector<Value>& resolve_args) -> Value {
            Value resolution = resolve_args.empty() ? Value::undefined() : resolve_args[0];

            std::string state = getState(promise_obj);
            if(state != STATE_PENDING) {
                return Value::undefined();
            }

            resolvePromise(promise_obj, resolution);
            return Value::undefined();
        });

    // Create reject function (equivalent to promiseCapability.[[Reject]])
    auto* reject_func =
        factory->createJSFunction([promise_obj](const CallContext& /*reject_ctx*/,
                                                const std::vector<Value>& reject_args) -> Value {
            Value reason = reject_args.empty() ? Value::undefined() : reject_args[0];

            std::string state = getState(promise_obj);
            if(state != STATE_PENDING) {
                return Value::undefined();
            }

            rejectPromise(promise_obj, reason);
            return Value::undefined();
        });

    // Steps 3-7: Create the result object { promise, resolve, reject }.
    auto* result = factory->createJSObject();
    // Step 4: Perform ! CreateDataPropertyOrThrow(obj, "promise", promiseCapability.[[Promise]]).
    result->setProperty("promise", Value(promise_obj));
    // Step 5: Perform ! CreateDataPropertyOrThrow(obj, "resolve", promiseCapability.[[Resolve]]).
    result->setProperty("resolve", Value(resolve_func));
    // Step 6: Perform ! CreateDataPropertyOrThrow(obj, "reject", promiseCapability.[[Reject]]).
    result->setProperty("reject", Value(reject_func));

    // Step 7: Return obj.
    return Value(result);
}

}  // namespace rift::builtins
