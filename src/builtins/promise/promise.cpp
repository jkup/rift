#include "rift/builtins/promise/promise.h"

#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

// ============================================================================
// Setup Methods
// ============================================================================

void Promise::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    RIFT_STATIC_METHOD(constructor, "resolve", Promise::resolve);
    RIFT_STATIC_METHOD(constructor, "reject", Promise::reject);
    RIFT_STATIC_METHOD(constructor, "all", Promise::all);
    RIFT_STATIC_METHOD(constructor, "race", Promise::race);
    RIFT_STATIC_METHOD(constructor, "allSettled", Promise::allSettled);
    RIFT_STATIC_METHOD(constructor, "any", Promise::any);
}

void Promise::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    RIFT_METHOD(prototype, "then", Promise::then);
    RIFT_METHOD(prototype, "catch", Promise::catch_);
    RIFT_METHOD(prototype, "finally", Promise::finally_);
}

// ============================================================================
// Helper Methods
// ============================================================================

JSObject* Promise::getGlobalPrototype() {
    return rift::core::BuiltinManager::getPromisePrototype();
}

/**
 * Create an empty Promise object with internal slots initialized.
 */
JSObject* Promise::createPromiseObject(rift::memory::ObjectFactory* factory) {
    auto* promise_obj = factory->createJSObject(getGlobalPrototype());
    rift::memory::GCProtector protect(promise_obj, factory->getObjectManager());

    // Initialize internal slots
    promise_obj->setProperty("[[PromiseState]]", Value(STATE_PENDING));
    promise_obj->setProperty("[[PromiseResult]]", Value::undefined());

    // Create empty arrays for reaction handlers
    auto* fulfill_reactions = factory->createJSObject();
    fulfill_reactions->setProperty("length", Value(0.0));

    auto* reject_reactions = factory->createJSObject();
    reject_reactions->setProperty("length", Value(0.0));

    promise_obj->setProperty("[[PromiseFulfillReactions]]", Value(fulfill_reactions));
    promise_obj->setProperty("[[PromiseRejectReactions]]", Value(reject_reactions));
    promise_obj->setProperty("[[PromiseIsHandled]]", Value(false));

    return promise_obj;
}

/**
 * Check if a value is a Promise object.
 */
bool Promise::isPromise(const Value& value) {
    if(!value.isObject()) {
        return false;
    }

    auto* obj = value.getObject();
    if(obj == nullptr) {
        return false;
    }

    // Check for [[PromiseState]] internal slot
    Value state = obj->getProperty("[[PromiseState]]");
    return state.isString();
}

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

/**
 * Get the result of a promise.
 */
Value Promise::getResult(JSObject* promise) {
    return promise->getProperty("[[PromiseResult]]");
}

// ============================================================================
// Constructor
// ============================================================================

/**
 * Promise constructor.
 * new Promise(executor) - executor is called with (resolve, reject) functions
 *
 * The executor is called synchronously. If executor throws, the promise is rejected.
 */
Value Promise::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    auto* factory = getObjectFactory();

    // Executor is required and must be a function
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
        throw rift::core::JavaScriptException(
            Value("TypeError: Promise executor is not callable"));
    }

    // Create the Promise object
    auto* promise_obj = createPromiseObject(factory);
    rift::memory::GCProtector protect(promise_obj, factory->getObjectManager());

    // Create resolve function that captures the promise
    // The resolve function will transition the promise to fulfilled state
    auto* resolve_func = factory->createJSFunction(
        [promise_obj](const CallContext& /*resolve_ctx*/,
                      const std::vector<Value>& resolve_args) -> Value {
            // Get resolution value
            Value resolution = resolve_args.empty() ? Value::undefined() : resolve_args[0];

            // Check if already settled (one-shot behavior)
            std::string state = getState(promise_obj);
            if(state != STATE_PENDING) {
                return Value::undefined();  // Already settled, ignore
            }

            // Check for self-resolution
            if(resolution.isObject() && resolution.getObject() == promise_obj) {
                rejectPromise(promise_obj,
                              Value("TypeError: A promise cannot be resolved with itself"));
                return Value::undefined();
            }

            // TODO (Phase 5): Handle thenable adoption
            // For now, directly fulfill
            fulfillPromise(promise_obj, resolution);
            return Value::undefined();
        });

    // Create reject function that captures the promise
    // The reject function will transition the promise to rejected state
    auto* reject_func = factory->createJSFunction(
        [promise_obj](const CallContext& /*reject_ctx*/,
                      const std::vector<Value>& reject_args) -> Value {
            // Get rejection reason
            Value reason = reject_args.empty() ? Value::undefined() : reject_args[0];

            // Check if already settled (one-shot behavior)
            std::string state = getState(promise_obj);
            if(state != STATE_PENDING) {
                return Value::undefined();  // Already settled, ignore
            }

            rejectPromise(promise_obj, reason);
            return Value::undefined();
        });

    // Call the executor synchronously with resolve and reject functions
    try {
        CallContext executor_ctx(rift::core::CallType::Function, Value::undefined());
        executor_func->call(executor_ctx, {Value(resolve_func), Value(reject_func)});
    } catch(const rift::core::JavaScriptException& e) {
        // If executor throws, reject the promise with the thrown value
        std::string state = getState(promise_obj);
        if(state == STATE_PENDING) {
            rejectPromise(promise_obj, e.getValue());
        }
    } catch(const std::exception& e) {
        // Handle other C++ exceptions
        std::string state = getState(promise_obj);
        if(state == STATE_PENDING) {
            rejectPromise(promise_obj, Value(std::string("Error: ") + e.what()));
        }
    }

    return Value(promise_obj);
}

// ============================================================================
// Internal Promise Operations (Phase 3 implementation)
// ============================================================================

/**
 * Fulfill a promise with a value.
 * Transitions state from pending to fulfilled and triggers reactions.
 */
void Promise::fulfillPromise(JSObject* promise, const Value& value) {
    // Set state to fulfilled
    promise->setProperty("[[PromiseState]]", Value(STATE_FULFILLED));
    promise->setProperty("[[PromiseResult]]", value);

    // Trigger fulfillment reactions
    triggerReactions(promise, "fulfill");
}

/**
 * Reject a promise with a reason.
 * Transitions state from pending to rejected and triggers reactions.
 */
void Promise::rejectPromise(JSObject* promise, const Value& reason) {
    // Set state to rejected
    promise->setProperty("[[PromiseState]]", Value(STATE_REJECTED));
    promise->setProperty("[[PromiseResult]]", reason);

    // Trigger rejection reactions
    triggerReactions(promise, "reject");
}

/**
 * Trigger promise reactions.
 * Enqueues handlers as microtasks to be executed after current sync code.
 */
void Promise::triggerReactions(JSObject* promise, const std::string& reaction_type) {
    // Get the appropriate reactions array
    std::string slot_name = (reaction_type == "fulfill") ? "[[PromiseFulfillReactions]]"
                                                         : "[[PromiseRejectReactions]]";

    Value reactions_val = promise->getProperty(slot_name);
    if(!reactions_val.isObject()) {
        return;
    }

    // TODO (Phase 4): Enqueue each reaction as a microtask
    // For now, we just clear the reactions since we don't have .then() yet
    // The actual microtask enqueueing will be added when we implement .then()
    (void)reactions_val;  // Unused until Phase 4

    // Clear the reactions arrays
    auto* factory = getFactory();
    auto* empty_fulfill = factory->createJSObject();
    empty_fulfill->setProperty("length", Value(0.0));
    auto* empty_reject = factory->createJSObject();
    empty_reject->setProperty("length", Value(0.0));

    promise->setProperty("[[PromiseFulfillReactions]]", Value(empty_fulfill));
    promise->setProperty("[[PromiseRejectReactions]]", Value(empty_reject));
}

// ============================================================================
// Instance Methods (Stubs for Phase 4+)
// ============================================================================

Value Promise::then(const CallContext& /*ctx*/, const std::vector<Value>& /*args*/) {
    // TODO: Implement in Phase 4
    throw rift::core::JavaScriptException(Value("Promise.prototype.then not yet implemented"));
}

Value Promise::catch_(const CallContext& /*ctx*/, const std::vector<Value>& /*args*/) {
    // TODO: Implement in Phase 6
    throw rift::core::JavaScriptException(Value("Promise.prototype.catch not yet implemented"));
}

Value Promise::finally_(const CallContext& /*ctx*/, const std::vector<Value>& /*args*/) {
    // TODO: Implement in Phase 6
    throw rift::core::JavaScriptException(Value("Promise.prototype.finally not yet implemented"));
}

// ============================================================================
// Static Methods (Stubs for Phase 7)
// ============================================================================

Value Promise::resolve(const CallContext& /*ctx*/, const std::vector<Value>& args) {
    // Basic implementation for Phase 2 testing
    auto* factory = getObjectFactory();
    Value value = args.empty() ? Value::undefined() : args[0];

    // If already a Promise, return it
    if(isPromise(value)) {
        return value;
    }

    // Create a fulfilled promise
    auto* promise_obj = createPromiseObject(factory);
    fulfillPromise(promise_obj, value);
    return Value(promise_obj);
}

Value Promise::reject(const CallContext& /*ctx*/, const std::vector<Value>& args) {
    // Basic implementation for Phase 2 testing
    auto* factory = getObjectFactory();
    Value reason = args.empty() ? Value::undefined() : args[0];

    // Create a rejected promise
    auto* promise_obj = createPromiseObject(factory);
    rejectPromise(promise_obj, reason);
    return Value(promise_obj);
}

Value Promise::all(const CallContext& /*ctx*/, const std::vector<Value>& /*args*/) {
    // TODO: Implement in Phase 7
    throw rift::core::JavaScriptException(Value("Promise.all not yet implemented"));
}

Value Promise::race(const CallContext& /*ctx*/, const std::vector<Value>& /*args*/) {
    // TODO: Implement in Phase 7
    throw rift::core::JavaScriptException(Value("Promise.race not yet implemented"));
}

Value Promise::allSettled(const CallContext& /*ctx*/, const std::vector<Value>& /*args*/) {
    // TODO: Implement in Phase 7
    throw rift::core::JavaScriptException(Value("Promise.allSettled not yet implemented"));
}

Value Promise::any(const CallContext& /*ctx*/, const std::vector<Value>& /*args*/) {
    // TODO: Implement in Phase 7
    throw rift::core::JavaScriptException(Value("Promise.any not yet implemented"));
}

}  // namespace rift::builtins
