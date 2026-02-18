#pragma once

#include <string>
#include <vector>

#include "../../memory/object_factory.h"
#include "../builtin_base.h"
#include "rift/interpreter/call_context.h"
#include "rift/types/object.h"
#include "rift/types/value.h"

// Forward declaration
namespace rift::core {
class Rift;
}

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// 27.2 Promise Objects
/// @spec https://tc39.es/ecma262/#sec-promise-objects
///
/// A Promise represents the eventual result of an asynchronous operation.
/// Promises can be in one of three states:
/// - pending: initial state, neither fulfilled nor rejected
/// - fulfilled: the operation completed successfully
/// - rejected: the operation failed
///
/// Internal slots (stored as properties):
/// - [[PromiseState]]: "pending" | "fulfilled" | "rejected"
/// - [[PromiseResult]]: fulfillment value or rejection reason
/// - [[PromiseFulfillReactions]]: Array of reaction records for fulfillment
/// - [[PromiseRejectReactions]]: Array of reaction records for rejection
/// - [[PromiseIsHandled]]: Boolean for unhandled rejection tracking
class Promise : public BuiltinBase<Promise> {
  public:
    // Promise state constants
    static constexpr const char* STATE_PENDING = "pending";
    static constexpr const char* STATE_FULFILLED = "fulfilled";
    static constexpr const char* STATE_REJECTED = "rejected";

    /// 27.2.3.1 Promise ( executor )
    /// @spec https://tc39.es/ecma262/#sec-promise-executor
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    /// 27.2.4 Properties of the Promise Constructor
    /// @spec https://tc39.es/ecma262/#sec-properties-of-the-promise-constructor
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);

    /// 27.2.5 Properties of the Promise Prototype Object
    /// @spec https://tc39.es/ecma262/#sec-properties-of-the-promise-prototype-object
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// 27.2.5.4 Promise.prototype.then ( onFulfilled, onRejected )
    /// @spec https://tc39.es/ecma262/#sec-promise.prototype.then
    static Value then(const CallContext& ctx, const std::vector<Value>& args);

    /// 27.2.5.1 Promise.prototype.catch ( onRejected )
    /// @spec https://tc39.es/ecma262/#sec-promise.prototype.catch
    static Value catch_(const CallContext& ctx, const std::vector<Value>& args);

    /// 27.2.5.3 Promise.prototype.finally ( onFinally )
    /// @spec https://tc39.es/ecma262/#sec-promise.prototype.finally
    static Value finally_(const CallContext& ctx, const std::vector<Value>& args);

    /// 27.2.4.7 Promise.resolve ( x )
    /// @spec https://tc39.es/ecma262/#sec-promise.resolve
    static Value resolve(const CallContext& ctx, const std::vector<Value>& args);

    /// 27.2.4.6 Promise.reject ( r )
    /// @spec https://tc39.es/ecma262/#sec-promise.reject
    static Value reject(const CallContext& ctx, const std::vector<Value>& args);

    /// 27.2.4.1 Promise.all ( iterable )
    /// @spec https://tc39.es/ecma262/#sec-promise.all
    static Value all(const CallContext& ctx, const std::vector<Value>& args);

    /// 27.2.4.5 Promise.race ( iterable )
    /// @spec https://tc39.es/ecma262/#sec-promise.race
    static Value race(const CallContext& ctx, const std::vector<Value>& args);

    /// 27.2.4.2 Promise.allSettled ( iterable )
    /// @spec https://tc39.es/ecma262/#sec-promise.allsettled
    static Value allSettled(const CallContext& ctx, const std::vector<Value>& args);

    /// 27.2.4.3 Promise.any ( iterable )
    /// @spec https://tc39.es/ecma262/#sec-promise.any
    static Value any(const CallContext& ctx, const std::vector<Value>& args);

    /// 27.2.4.8 Promise.withResolvers ( )
    /// @spec https://tc39.es/ecma262/#sec-promise.withResolvers
    static Value withResolvers(const CallContext& ctx, const std::vector<Value>& args);

    /// NON-STANDARD: Global prototype access for internal use.
    static JSObject* getGlobalPrototype();

    /// NON-STANDARD: Create initialized Promise object with internal slots.
    static JSObject* createPromiseObject(rift::memory::ObjectFactory* factory);

    /// 27.2.1.1 IsPromise ( x )
    /// @spec https://tc39.es/ecma262/#sec-ispromise
    static bool isPromise(const Value& value);

    /// NON-STANDARD: Check if value is a thenable (has a callable .then property).
    static bool isThenable(const Value& value);

    /// NON-STANDARD: Get the .then method from a thenable (returns nullptr if not thenable).
    static JSFunction* getThenMethod(const Value& value);

    /// NON-STANDARD: Get promise state string.
    static std::string getState(JSObject* promise);

    /// NON-STANDARD: Get promise result value.
    static Value getResult(JSObject* promise);

    /// 27.2.1.4 FulfillPromise ( promise, value )
    /// @spec https://tc39.es/ecma262/#sec-fulfillpromise
    static void fulfillPromise(JSObject* promise, const Value& value);

    /// 27.2.1.7 RejectPromise ( promise, reason )
    /// @spec https://tc39.es/ecma262/#sec-rejectpromise
    static void rejectPromise(JSObject* promise, const Value& reason);

    /// 27.2.1.3.2 Promise Resolve Functions
    /// @spec https://tc39.es/ecma262/#sec-promise-resolve-functions
    static void resolvePromise(JSObject* promise, const Value& value);

    /// 27.2.1.9 TriggerPromiseReactions ( reactions, argument )
    /// @spec https://tc39.es/ecma262/#sec-triggerpromisereactions
    static void triggerReactions(JSObject* promise, const std::string& reaction_type);

    /// NON-STANDARD: Expose factory for internal use.
    static rift::memory::ObjectFactory* getFactory() {
        return BuiltinBase<Promise>::getObjectFactory();
    }

    /// NON-STANDARD: Engine access for microtask queue.
    static void setEngine(rift::core::Rift* engine) {
        engine_ = engine;
    }
    static rift::core::Rift* getEngine() {
        return engine_;
    }

    /// NON-STANDARD: Add a reaction to a promise.
    /// reactionType is "fulfill" or "reject".
    /// handler can be nullptr for pass-through behavior.
    /// resultPromise is the promise returned by .then().
    static void addReaction(JSObject* promise, const std::string& reaction_type,
                            JSFunction* handler, JSObject* result_promise);

    /// 27.2.1.5 NewPromiseReactionJob ( reaction, argument )
    /// @spec https://tc39.es/ecma262/#sec-newpromisereactionjob
    static void executeReaction(JSFunction* handler, JSObject* result_promise,
                                const Value& argument, bool is_fulfill);

  private:
    static rift::core::Rift* engine_;
};

}  // namespace rift::builtins
