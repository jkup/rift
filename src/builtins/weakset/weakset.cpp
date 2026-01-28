#include "rift/builtins/weakset/weakset.h"

#include <sstream>

#include "rift/builtins/symbol/symbol.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/memory/gc_protector.h"
#include "rift/runtime/values/object.h"

namespace rift::builtins {

// ============================================================================
// Setup Methods
// ============================================================================

void WeakSet::setupStaticMethods(JSObject* /*constructor*/,
                                 rift::memory::ObjectFactory* /*factory*/) {
    // WeakSet has no static methods in ES2024
}

void WeakSet::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    RIFT_METHOD(prototype, "add", WeakSet::add);
    RIFT_METHOD(prototype, "has", WeakSet::has);
    RIFT_METHOD(prototype, "delete", WeakSet::deleteMethod);

    // WeakSet is NOT iterable - no Symbol.iterator, no keys/values/entries/forEach
    // No size property either
}

// ============================================================================
// Helper Methods
// ============================================================================

/**
 * Check if a value is valid for WeakSet.
 * Per ECMAScript, only objects (including functions) can be in a WeakSet.
 */
bool WeakSet::isValidWeakValue(const Value& val) {
    return val.getType() == ValueType::Object || val.getType() == ValueType::Function;
}

/**
 * Convert an object pointer to a unique string key for internal lookup.
 */
std::string WeakSet::objectToWeakKey(JSObject* obj) {
    std::ostringstream oss;
    oss << "ws:" << static_cast<const void*>(obj);
    return oss.str();
}

/**
 * Create an empty WeakSet object with internal slots initialized.
 */
JSObject* WeakSet::createWeakSetObject(rift::memory::ObjectFactory* factory) {
    auto* weakSetObj = factory->createJSObject(getGlobalPrototype());
    rift::memory::GCProtector protect(weakSetObj, factory->getObjectManager());

    // Create internal storage object for weak entries
    auto* entries = factory->createJSObject();

    weakSetObj->setProperty("[[WeakSetData]]", Value(entries));

    return weakSetObj;
}

// ============================================================================
// Constructor
// ============================================================================

/**
 * WeakSet constructor.
 * new WeakSet() - creates empty WeakSet
 * new WeakSet(iterable) - creates WeakSet from iterable of objects
 */
Value WeakSet::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    auto* factory = getObjectFactory();

    // Create the WeakSet object
    auto* weakSetObj = createWeakSetObject(factory);
    rift::memory::GCProtector protect(weakSetObj, factory->getObjectManager());

    // If no arguments or undefined/null, return empty WeakSet
    if(args.empty() || args[0].isUndefined() || args[0].isNull()) {
        return Value(weakSetObj);
    }

    const Value& iterable = args[0];

    // Get internal storage
    Value entriesVal = weakSetObj->getProperty("[[WeakSetData]]");
    if(entriesVal.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(Value("TypeError: WeakSet internal slots corrupted"));
    }

    auto* entries = entriesVal.getObject();

    // Check if iterable has Symbol.iterator
    std::string iteratorKey =
        rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());

    if(iterable.getType() == ValueType::Object || iterable.getType() == ValueType::Function) {
        auto* iterableObj = iterable.getObject();
        Value iteratorMethod = iterableObj->getProperty(iteratorKey);

        if(iteratorMethod.getType() == ValueType::Function) {
            // Use iterator protocol
            auto* iteratorFunc = dynamic_cast<JSFunction*>(iteratorMethod.getObject());
            if(iteratorFunc == nullptr) {
                throw rift::core::JavaScriptException(
                    Value("TypeError: Symbol.iterator is not a function"));
            }

            // Call iterator method to get iterator
            CallContext iterCtx = ctx;
            iterCtx.thisValue = iterable;
            Value iterator = iteratorFunc->call(iterCtx, {});

            if(iterator.getType() != ValueType::Object) {
                throw rift::core::JavaScriptException(
                    Value("TypeError: Iterator result is not an object"));
            }

            auto* iteratorObj = iterator.getObject();
            Value nextMethod = iteratorObj->getProperty("next");

            if(nextMethod.getType() != ValueType::Function) {
                throw rift::core::JavaScriptException(
                    Value("TypeError: Iterator next is not a function"));
            }

            auto* nextFunc = dynamic_cast<JSFunction*>(nextMethod.getObject());
            if(nextFunc == nullptr) {
                throw rift::core::JavaScriptException(
                    Value("TypeError: Iterator next is not a function"));
            }

            // Iterate
            while(true) {
                CallContext nextCtx = ctx;
                nextCtx.thisValue = iterator;
                Value result = nextFunc->call(nextCtx, {});

                if(result.getType() != ValueType::Object) {
                    throw rift::core::JavaScriptException(
                        Value("TypeError: Iterator result is not an object"));
                }

                auto* resultObj = result.getObject();
                Value done = resultObj->getProperty("done");

                if(done.toBool()) {
                    break;
                }

                Value val = resultObj->getProperty("value");

                // Validate value is an object
                if(!isValidWeakValue(val)) {
                    throw rift::core::JavaScriptException(
                        Value("TypeError: Invalid value used in weak set"));
                }

                // Store with weak reference
                std::string keyStr = objectToWeakKey(val.getObject());

                // Create entry that holds the value weakly
                auto* entry = factory->createJSObject();
                entry->setWeakProperty("value", val);  // Weak reference

                entries->setProperty(keyStr, Value(entry));
            }
        } else {
            // Try array-like access (fallback for arrays without Symbol.iterator)
            Value lengthVal = iterableObj->getProperty("length");
            if(lengthVal.getType() == ValueType::Number) {
                int length = static_cast<int>(lengthVal.toNumber());

                for(int i = 0; i < length; i++) {
                    Value val = iterableObj->getProperty(std::to_string(i));

                    // Validate value is an object
                    if(!isValidWeakValue(val)) {
                        throw rift::core::JavaScriptException(
                            Value("TypeError: Invalid value used in weak set"));
                    }

                    std::string keyStr = objectToWeakKey(val.getObject());

                    auto* entry = factory->createJSObject();
                    entry->setWeakProperty("value", val);

                    entries->setProperty(keyStr, Value(entry));
                }
            } else {
                throw rift::core::JavaScriptException(Value("TypeError: object is not iterable"));
            }
        }
    } else {
        throw rift::core::JavaScriptException(Value("TypeError: object is not iterable"));
    }

    return Value(weakSetObj);
}

// ============================================================================
// Instance Methods
// ============================================================================

/**
 * WeakSet.prototype.add(value)
 * Adds a value to the WeakSet. Returns the WeakSet for chaining.
 */
Value WeakSet::add(const CallContext& ctx, const std::vector<Value>& args) {
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: WeakSet.prototype.add called on non-object"));
    }

    auto* weakSetObj = ctx.thisValue.getObject();

    Value entriesVal = weakSetObj->getProperty("[[WeakSetData]]");
    if(entriesVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method WeakSet.prototype.add called on incompatible receiver"));
    }

    Value val = args.empty() ? Value() : args[0];

    // WeakSet values must be objects
    if(!isValidWeakValue(val)) {
        throw rift::core::JavaScriptException(Value("TypeError: Invalid value used in weak set"));
    }

    auto* entries = entriesVal.getObject();
    auto* valObj = val.getObject();
    std::string keyStr = objectToWeakKey(valObj);

    // Check if already exists
    Value existingEntry = entries->getProperty(keyStr);
    if(existingEntry.isUndefined()) {
        // Add new entry
        auto* factory = getObjectFactory();
        auto* entry = factory->createJSObject();
        entry->setWeakProperty("value", val);  // Weak reference

        entries->setProperty(keyStr, Value(entry));
    }

    // Return the WeakSet for chaining
    return ctx.thisValue;
}

/**
 * WeakSet.prototype.has(value)
 * Returns true if value exists in the WeakSet and is still alive.
 */
Value WeakSet::has(const CallContext& ctx, const std::vector<Value>& args) {
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: WeakSet.prototype.has called on non-object"));
    }

    auto* weakSetObj = ctx.thisValue.getObject();

    Value entriesVal = weakSetObj->getProperty("[[WeakSetData]]");
    if(entriesVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method WeakSet.prototype.has called on incompatible receiver"));
    }

    Value val = args.empty() ? Value() : args[0];

    // WeakSet values must be objects
    if(!isValidWeakValue(val)) {
        return Value(false);  // Non-objects are never in WeakSet
    }

    auto* valObj = val.getObject();
    std::string keyStr = objectToWeakKey(valObj);

    auto* entries = entriesVal.getObject();
    Value entryVal = entries->getProperty(keyStr);

    if(entryVal.isUndefined()) {
        return Value(false);
    }

    // Check if the value object still exists (lazy cleanup)
    auto* factory = getObjectFactory();
    if(!factory->getObjectManager()->objectExists(valObj)) {
        // Value was garbage collected - remove the entry
        entries->deleteProperty(keyStr);
        return Value(false);
    }

    return Value(true);
}

/**
 * WeakSet.prototype.delete(value)
 * Removes a value. Returns true if value existed, false otherwise.
 */
Value WeakSet::deleteMethod(const CallContext& ctx, const std::vector<Value>& args) {
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: WeakSet.prototype.delete called on non-object"));
    }

    auto* weakSetObj = ctx.thisValue.getObject();

    Value entriesVal = weakSetObj->getProperty("[[WeakSetData]]");
    if(entriesVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method WeakSet.prototype.delete called on incompatible receiver"));
    }

    Value val = args.empty() ? Value() : args[0];

    // WeakSet values must be objects
    if(!isValidWeakValue(val)) {
        return Value(false);  // Non-objects are never in WeakSet
    }

    auto* valObj = val.getObject();
    std::string keyStr = objectToWeakKey(valObj);

    auto* entries = entriesVal.getObject();
    Value entryVal = entries->getProperty(keyStr);

    if(entryVal.isUndefined()) {
        return Value(false);
    }

    // Remove the entry
    entries->deleteProperty(keyStr);

    return Value(true);
}

JSObject* WeakSet::getGlobalPrototype() {
    return rift::core::BuiltinManager::getWeakSetPrototype();
}

}  // namespace rift::builtins
