#pragma once

#include <string>
#include <vector>

#include "../../core/engine/call_context.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"
#include "../builtin_base.h"

// Forward declaration
namespace rift::core {
class Rift;
}

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/**
 * Promise builtin implementation following ECMAScript specification.
 *
 * A Promise represents the eventual result of an asynchronous operation.
 * Promises can be in one of three states:
 * - pending: initial state, neither fulfilled nor rejected
 * - fulfilled: the operation completed successfully
 * - rejected: the operation failed
 *
 * Internal slots (stored as properties):
 * - [[PromiseState]]: "pending" | "fulfilled" | "rejected"
 * - [[PromiseResult]]: fulfillment value or rejection reason
 * - [[PromiseFulfillReactions]]: Array of reaction records for fulfillment
 * - [[PromiseRejectReactions]]: Array of reaction records for rejection
 * - [[PromiseIsHandled]]: Boolean for unhandled rejection tracking
 */
class Promise : public BuiltinBase<Promise> {
  public:
    // Promise state constants
    static constexpr const char* STATE_PENDING = "pending";
    static constexpr const char* STATE_FULFILLED = "fulfilled";
    static constexpr const char* STATE_REJECTED = "rejected";

    // Required by BuiltinBase
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    // Instance methods (to be implemented in Phase 4)
    static Value then(const CallContext& ctx, const std::vector<Value>& args);
    static Value catch_(const CallContext& ctx, const std::vector<Value>& args);
    static Value finally_(const CallContext& ctx, const std::vector<Value>& args);

    // Static methods
    static Value resolve(const CallContext& ctx, const std::vector<Value>& args);
    static Value reject(const CallContext& ctx, const std::vector<Value>& args);
    static Value all(const CallContext& ctx, const std::vector<Value>& args);
    static Value race(const CallContext& ctx, const std::vector<Value>& args);
    static Value allSettled(const CallContext& ctx, const std::vector<Value>& args);
    static Value any(const CallContext& ctx, const std::vector<Value>& args);
    static Value withResolvers(const CallContext& ctx, const std::vector<Value>& args);

    // Global prototype access
    static JSObject* getGlobalPrototype();

    // Helper: Create initialized Promise object with internal slots
    static JSObject* createPromiseObject(rift::memory::ObjectFactory* factory);

    // Helper: Check if value is a Promise
    static bool isPromise(const Value& value);

    // Helper: Check if value is a thenable (has a callable .then property)
    static bool isThenable(const Value& value);

    // Helper: Get the .then method from a thenable (returns nullptr if not thenable)
    static JSFunction* getThenMethod(const Value& value);

    // Helper: Get promise state
    static std::string getState(JSObject* promise);

    // Helper: Get promise result
    static Value getResult(JSObject* promise);

    // Internal: Fulfill a promise (Phase 3)
    static void fulfillPromise(JSObject* promise, const Value& value);

    // Internal: Reject a promise (Phase 3)
    static void rejectPromise(JSObject* promise, const Value& reason);

    // Internal: Resolve a promise with thenable adoption (Phase 5)
    // If value is a thenable, adopts its state; otherwise fulfills with value
    static void resolvePromise(JSObject* promise, const Value& value);

    // Internal: Trigger promise reactions (Phase 3)
    static void triggerReactions(JSObject* promise, const std::string& reaction_type);

    // Expose factory for internal use
    static rift::memory::ObjectFactory* getFactory() {
        return BuiltinBase<Promise>::getObjectFactory();
    }

    // Engine access for microtask queue
    static void setEngine(rift::core::Rift* engine) {
        engine_ = engine;
    }
    static rift::core::Rift* getEngine() {
        return engine_;
    }

    // Internal: Add a reaction to a promise
    // reactionType is "fulfill" or "reject"
    // handler can be nullptr for pass-through behavior
    // resultPromise is the promise returned by .then()
    static void addReaction(JSObject* promise, const std::string& reaction_type,
                            JSFunction* handler, JSObject* result_promise);

    // Internal: Execute a single reaction (called as microtask)
    static void executeReaction(JSFunction* handler, JSObject* result_promise,
                                const Value& argument, bool is_fulfill);

  private:
    static rift::core::Rift* engine_;
};

}  // namespace rift::builtins
