#include "rift/builtins/promise/promise.h"

#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/engine.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

// Static member initialization
rift::core::Rift* Promise::engine_ = nullptr;

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
    // Each reaction is stored as an object with {handler, resultPromise}
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

/**
 * Add a reaction to a promise's reaction list.
 * reaction_type is "fulfill" or "reject"
 * handler can be nullptr for pass-through behavior
 * result_promise is the promise returned by .then()
 */
void Promise::addReaction(JSObject* promise, const std::string& reaction_type,
                          JSFunction* handler, JSObject* result_promise) {
    std::string slot_name = (reaction_type == "fulfill") ? "[[PromiseFulfillReactions]]"
                                                         : "[[PromiseRejectReactions]]";

    Value reactions_val = promise->getProperty(slot_name);
    if(!reactions_val.isObject()) {
        return;
    }

    auto* reactions = reactions_val.getObject();
    Value length_val = reactions->getProperty("length");
    int length = length_val.isNumber() ? static_cast<int>(length_val.getNumber()) : 0;

    // Create reaction record object
    auto* factory = getFactory();
    auto* reaction = factory->createJSObject();

    // Store handler (can be null/undefined for pass-through)
    if(handler != nullptr) {
        reaction->setProperty("handler", Value(handler));
    } else {
        reaction->setProperty("handler", Value::undefined());
    }

    // Store result promise
    reaction->setProperty("resultPromise", Value(result_promise));

    // Add to reactions array
    reactions->setProperty(std::to_string(length), Value(reaction));
    reactions->setProperty("length", Value(static_cast<double>(length + 1)));
}

/**
 * Execute a single reaction.
 * This is called as a microtask after the promise settles.
 */
void Promise::executeReaction(JSFunction* handler, JSObject* result_promise,
                              const Value& argument, bool is_fulfill) {
    if(handler == nullptr) {
        // No handler - pass through the value/reason
        if(is_fulfill) {
            fulfillPromise(result_promise, argument);
        } else {
            rejectPromise(result_promise, argument);
        }
        return;
    }

    // Call the handler
    try {
        CallContext ctx(rift::core::CallType::Function, Value::undefined());
        Value result = handler->call(ctx, {argument});

        // Handler returned successfully - resolve the result promise with the return value
        // Uses resolvePromise to handle thenable adoption
        resolvePromise(result_promise, result);
    } catch(const rift::core::JavaScriptException& e) {
        // Handler threw - reject the result promise
        rejectPromise(result_promise, e.getValue());
    } catch(const std::exception& e) {
        // C++ exception - reject with error message
        rejectPromise(result_promise, Value(std::string("Error: ") + e.what()));
    }
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
Value Promise::constructor(const CallContext& /*ctx*/, const std::vector<Value>& args) {
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
    auto* resolve_func = factory->createJSFunction(
        [promise_obj](const CallContext& /*resolve_ctx*/,
                      const std::vector<Value>& resolve_args) -> Value {
            Value resolution = resolve_args.empty() ? Value::undefined() : resolve_args[0];

            // One-shot: ignore if already settled
            std::string state = getState(promise_obj);
            if(state != STATE_PENDING) {
                return Value::undefined();
            }

            // resolvePromise handles self-resolution check and thenable adoption
            resolvePromise(promise_obj, resolution);
            return Value::undefined();
        });

    // Create reject function that captures the promise
    auto* reject_func = factory->createJSFunction(
        [promise_obj](const CallContext& /*reject_ctx*/,
                      const std::vector<Value>& reject_args) -> Value {
            Value reason = reject_args.empty() ? Value::undefined() : reject_args[0];

            // One-shot: ignore if already settled
            std::string state = getState(promise_obj);
            if(state != STATE_PENDING) {
                return Value::undefined();
            }

            rejectPromise(promise_obj, reason);
            return Value::undefined();
        });

    // Call the executor synchronously
    try {
        CallContext executor_ctx(rift::core::CallType::Function, Value::undefined());
        executor_func->call(executor_ctx, {Value(resolve_func), Value(reject_func)});
    } catch(const rift::core::JavaScriptException& e) {
        std::string state = getState(promise_obj);
        if(state == STATE_PENDING) {
            rejectPromise(promise_obj, e.getValue());
        }
    } catch(const std::exception& e) {
        std::string state = getState(promise_obj);
        if(state == STATE_PENDING) {
            rejectPromise(promise_obj, Value(std::string("Error: ") + e.what()));
        }
    }

    return Value(promise_obj);
}

// ============================================================================
// Internal Promise Operations
// ============================================================================

/**
 * Fulfill a promise with a value.
 */
void Promise::fulfillPromise(JSObject* promise, const Value& value) {
    promise->setProperty("[[PromiseState]]", Value(STATE_FULFILLED));
    promise->setProperty("[[PromiseResult]]", value);
    triggerReactions(promise, "fulfill");
}

/**
 * Reject a promise with a reason.
 */
void Promise::rejectPromise(JSObject* promise, const Value& reason) {
    promise->setProperty("[[PromiseState]]", Value(STATE_REJECTED));
    promise->setProperty("[[PromiseResult]]", reason);
    triggerReactions(promise, "reject");
}

/**
 * Resolve a promise with thenable adoption.
 * Per ES spec:
 * - If value is a thenable (has a .then method), adopt its state by calling value.then(resolve, reject)
 * - Otherwise, fulfill the promise with the value
 * - Self-resolution throws TypeError
 */
void Promise::resolvePromise(JSObject* promise, const Value& value) {
    // Self-resolution check
    if(value.isObject() && value.getObject() == promise) {
        rejectPromise(promise, Value("TypeError: A promise cannot be resolved with itself"));
        return;
    }

    // Check if value is a thenable
    if(!isThenable(value)) {
        // Not a thenable - fulfill directly
        fulfillPromise(promise, value);
        return;
    }

    // Value is a thenable - adopt its state via microtask
    auto* then_method = getThenMethod(value);
    if(then_method == nullptr) {
        // .then exists but is not callable - fulfill with the value
        fulfillPromise(promise, value);
        return;
    }

    auto* factory = getFactory();
    auto* engine = getEngine();

    // Create resolve/reject functions for the thenable adoption
    auto* resolve_func = factory->createJSFunction(
        [promise](const CallContext& /*resolve_ctx*/,
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

    auto* reject_func = factory->createJSFunction(
        [promise](const CallContext& /*reject_ctx*/,
                  const std::vector<Value>& reject_args) -> Value {
            Value reason = reject_args.empty() ? Value::undefined() : reject_args[0];

            std::string state = getState(promise);
            if(state != STATE_PENDING) {
                return Value::undefined();  // Already settled
            }

            rejectPromise(promise, reason);
            return Value::undefined();
        });

    // Per spec, the thenable.then() call is made as a microtask
    auto* thenable_obj = value.getObject();
    if(engine != nullptr) {
        auto* microtask_func = factory->createJSFunction(
            [then_method, thenable_obj, resolve_func, reject_func](
                const CallContext& /*mt_ctx*/,
                const std::vector<Value>& /*mt_args*/) -> Value {
                try {
                    // Call then() with thenable as 'this'
                    CallContext then_ctx(rift::core::CallType::Function, Value(thenable_obj));
                    then_method->call(then_ctx, {Value(resolve_func), Value(reject_func)});
                } catch(const rift::core::JavaScriptException& e) {
                    // If .then() throws, reject the promise
                    CallContext reject_ctx(rift::core::CallType::Function, Value::undefined());
                    reject_func->call(reject_ctx, {e.getValue()});
                } catch(const std::exception& e) {
                    CallContext reject_ctx(rift::core::CallType::Function, Value::undefined());
                    reject_func->call(reject_ctx, {Value(std::string("Error: ") + e.what())});
                }
                return Value::undefined();
            });
        engine->enqueueMicrotask(microtask_func, {}, Value::undefined());
    } else {
        // No engine - execute synchronously (for testing)
        try {
            // Call then() with thenable as 'this'
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

/**
 * Trigger promise reactions.
 * Enqueues handlers as microtasks to be executed after current sync code.
 */
void Promise::triggerReactions(JSObject* promise, const std::string& reaction_type) {
    std::string slot_name = (reaction_type == "fulfill") ? "[[PromiseFulfillReactions]]"
                                                         : "[[PromiseRejectReactions]]";

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

    // Enqueue each reaction as a microtask
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

        // Enqueue microtask to execute this reaction
        if(engine != nullptr) {
            // Create a function that executes the reaction
            auto* factory = getFactory();
            auto* microtask_func = factory->createJSFunction(
                [handler, result_promise, result, is_fulfill](
                    const CallContext& /*mt_ctx*/,
                    const std::vector<Value>& /*mt_args*/) -> Value {
                    executeReaction(handler, result_promise, result, is_fulfill);
                    return Value::undefined();
                });

            engine->enqueueMicrotask(microtask_func, {}, Value::undefined());
        } else {
            // No engine - execute synchronously (for testing)
            executeReaction(handler, result_promise, result, is_fulfill);
        }
    }

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
// Instance Methods
// ============================================================================

/**
 * Promise.prototype.then(onFulfilled, onRejected)
 * Returns a new promise that resolves/rejects based on the handler results.
 */
Value Promise::then(const CallContext& ctx, const std::vector<Value>& args) {
    // Get the promise (this value)
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

    // Get handlers (can be undefined for pass-through)
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

    // Create the result promise (what .then() returns)
    auto* result_promise = createPromiseObject(factory);
    rift::memory::GCProtector protect(result_promise, factory->getObjectManager());

    // Mark this promise as handled (for unhandled rejection tracking)
    promise->setProperty("[[PromiseIsHandled]]", Value(true));

    std::string state = getState(promise);

    if(state == STATE_PENDING) {
        // Promise is pending - queue the reactions
        addReaction(promise, "fulfill", on_fulfilled, result_promise);
        addReaction(promise, "reject", on_rejected, result_promise);
    } else if(state == STATE_FULFILLED) {
        // Promise is already fulfilled - enqueue fulfillment handler as microtask
        Value result = getResult(promise);
        auto* engine = getEngine();

        if(engine != nullptr) {
            auto* microtask_func = factory->createJSFunction(
                [on_fulfilled, result_promise, result](const CallContext& /*mt_ctx*/,
                                                       const std::vector<Value>& /*mt_args*/)
                    -> Value {
                    executeReaction(on_fulfilled, result_promise, result, true);
                    return Value::undefined();
                });
            engine->enqueueMicrotask(microtask_func, {}, Value::undefined());
        } else {
            executeReaction(on_fulfilled, result_promise, result, true);
        }
    } else {
        // Promise is rejected - enqueue rejection handler as microtask
        Value reason = getResult(promise);
        auto* engine = getEngine();

        if(engine != nullptr) {
            auto* microtask_func = factory->createJSFunction(
                [on_rejected, result_promise, reason](const CallContext& /*mt_ctx*/,
                                                      const std::vector<Value>& /*mt_args*/)
                    -> Value {
                    executeReaction(on_rejected, result_promise, reason, false);
                    return Value::undefined();
                });
            engine->enqueueMicrotask(microtask_func, {}, Value::undefined());
        } else {
            executeReaction(on_rejected, result_promise, reason, false);
        }
    }

    return Value(result_promise);
}

/**
 * Promise.prototype.catch(onRejected)
 * Sugar for .then(undefined, onRejected)
 */
Value Promise::catch_(const CallContext& ctx, const std::vector<Value>& args) {
    // .catch(onRejected) is .then(undefined, onRejected)
    std::vector<Value> then_args = {Value::undefined()};
    if(!args.empty()) {
        then_args.push_back(args[0]);
    }
    return then(ctx, then_args);
}

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
    // Get the promise (this value)
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

    // If onFinally is not callable, pass through the value/reason unchanged
    if(!on_finally_val.isFunction()) {
        // .finally(nonFunction) is like .then(x => x, r => { throw r; })
        // which is essentially a pass-through
        return then(ctx, {Value::undefined(), Value::undefined()});
    }

    auto* on_finally = dynamic_cast<JSFunction*>(on_finally_val.getObject());

    // Create the fulfillment wrapper:
    // value => Promise.resolve(onFinally()).then(() => value)
    auto* then_finally = factory->createJSFunction(
        [on_finally, factory](const CallContext& /*wrapper_ctx*/,
                              const std::vector<Value>& wrapper_args) -> Value {
            Value original_value = wrapper_args.empty() ? Value::undefined() : wrapper_args[0];

            // Call onFinally()
            Value callback_result;
            try {
                CallContext finally_ctx(rift::core::CallType::Function, Value::undefined());
                callback_result = on_finally->call(finally_ctx, {});
            } catch(const rift::core::JavaScriptException& e) {
                // onFinally threw - propagate the exception
                throw;
            }

            // If callback_result is a thenable, we need to wait for it
            // then return the original value
            if(isThenable(callback_result)) {
                // Create a promise that waits for the callback result
                // then resolves with the original value
                auto* result_promise = createPromiseObject(factory);
                rift::memory::GCProtector protect(result_promise, factory->getObjectManager());

                // Get the then method from the callback result
                auto* then_method = getThenMethod(callback_result);
                auto* thenable_obj = callback_result.getObject();

                // Create resolve handler that ignores thenable result and uses original value
                auto* value_resolver = factory->createJSFunction(
                    [result_promise, original_value](const CallContext& /*res_ctx*/,
                                                     const std::vector<Value>& /*res_args*/)
                        -> Value {
                        fulfillPromise(result_promise, original_value);
                        return Value::undefined();
                    });

                // Create reject handler that rejects with thenable's rejection
                auto* value_rejecter = factory->createJSFunction(
                    [result_promise](const CallContext& /*rej_ctx*/,
                                     const std::vector<Value>& rej_args) -> Value {
                        Value reason = rej_args.empty() ? Value::undefined() : rej_args[0];
                        rejectPromise(result_promise, reason);
                        return Value::undefined();
                    });

                // Call thenable.then(valueResolver, valueRejecter)
                try {
                    CallContext then_ctx(rift::core::CallType::Function, Value(thenable_obj));
                    then_method->call(then_ctx, {Value(value_resolver), Value(value_rejecter)});
                } catch(const rift::core::JavaScriptException& e) {
                    rejectPromise(result_promise, e.getValue());
                }

                return Value(result_promise);
            }

            // Not a thenable - just return the original value
            return original_value;
        });

    // Create the rejection wrapper:
    // reason => Promise.resolve(onFinally()).then(() => { throw reason; })
    auto* catch_finally = factory->createJSFunction(
        [on_finally, factory](const CallContext& /*wrapper_ctx*/,
                              const std::vector<Value>& wrapper_args) -> Value {
            Value original_reason = wrapper_args.empty() ? Value::undefined() : wrapper_args[0];

            // Call onFinally()
            Value callback_result;
            try {
                CallContext finally_ctx(rift::core::CallType::Function, Value::undefined());
                callback_result = on_finally->call(finally_ctx, {});
            } catch(const rift::core::JavaScriptException& e) {
                // onFinally threw - propagate the new exception
                throw;
            }

            // If callback_result is a thenable, we need to wait for it
            // then re-throw the original reason
            if(isThenable(callback_result)) {
                // Create a promise that waits for the callback result
                // then rejects with the original reason
                auto* result_promise = createPromiseObject(factory);
                rift::memory::GCProtector protect(result_promise, factory->getObjectManager());

                auto* then_method = getThenMethod(callback_result);
                auto* thenable_obj = callback_result.getObject();

                // Create resolve handler that re-throws original reason
                auto* reason_rethrower = factory->createJSFunction(
                    [result_promise, original_reason](const CallContext& /*res_ctx*/,
                                                      const std::vector<Value>& /*res_args*/)
                        -> Value {
                        rejectPromise(result_promise, original_reason);
                        return Value::undefined();
                    });

                // Create reject handler that rejects with thenable's rejection
                auto* reason_rejecter = factory->createJSFunction(
                    [result_promise](const CallContext& /*rej_ctx*/,
                                     const std::vector<Value>& rej_args) -> Value {
                        Value reason = rej_args.empty() ? Value::undefined() : rej_args[0];
                        rejectPromise(result_promise, reason);
                        return Value::undefined();
                    });

                // Call thenable.then(reasonRethrower, reasonRejecter)
                try {
                    CallContext then_ctx(rift::core::CallType::Function, Value(thenable_obj));
                    then_method->call(then_ctx, {Value(reason_rethrower), Value(reason_rejecter)});
                } catch(const rift::core::JavaScriptException& e) {
                    rejectPromise(result_promise, e.getValue());
                }

                return Value(result_promise);
            }

            // Not a thenable - re-throw the original reason
            throw rift::core::JavaScriptException(original_reason);
        });

    // Call .then(thenFinally, catchFinally)
    return then(ctx, {Value(then_finally), Value(catch_finally)});
}

// ============================================================================
// Static Methods
// ============================================================================

Value Promise::resolve(const CallContext& /*ctx*/, const std::vector<Value>& args) {
    auto* factory = getObjectFactory();
    Value value = args.empty() ? Value::undefined() : args[0];

    // If already a Promise, return it
    if(isPromise(value)) {
        return value;
    }

    // Create a promise and resolve it
    // resolvePromise handles thenable adoption
    auto* promise_obj = createPromiseObject(factory);
    resolvePromise(promise_obj, value);
    return Value(promise_obj);
}

Value Promise::reject(const CallContext& /*ctx*/, const std::vector<Value>& args) {
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
