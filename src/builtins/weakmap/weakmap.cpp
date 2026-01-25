#include "rift/builtins/weakmap/weakmap.h"

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

void WeakMap::setupStaticMethods(JSObject* /*constructor*/,
                                  rift::memory::ObjectFactory* /*factory*/) {
    // WeakMap has no static methods in ES2024
}

void WeakMap::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    RIFT_METHOD(prototype, "get", WeakMap::get);
    RIFT_METHOD(prototype, "set", WeakMap::set);
    RIFT_METHOD(prototype, "has", WeakMap::has);
    RIFT_METHOD(prototype, "delete", WeakMap::deleteMethod);

    // WeakMap is NOT iterable - no Symbol.iterator, no keys/values/entries/forEach
    // No size property either
}

// ============================================================================
// Helper Methods
// ============================================================================

/**
 * Check if a value is a valid WeakMap key.
 * Per ECMAScript, only objects (including functions) can be WeakMap keys.
 */
bool WeakMap::isValidWeakKey(const Value& key) {
    return key.getType() == ValueType::Object || key.getType() == ValueType::Function;
}

/**
 * Convert an object pointer to a unique string key for internal lookup.
 */
std::string WeakMap::objectToWeakKey(JSObject* obj) {
    std::ostringstream oss;
    oss << "wk:" << static_cast<const void*>(obj);
    return oss.str();
}

/**
 * Create an empty WeakMap object with internal slots initialized.
 */
JSObject* WeakMap::createWeakMapObject(rift::memory::ObjectFactory* factory) {
    auto* weakMapObj = factory->createJSObject(getGlobalPrototype());
    rift::memory::GCProtector protect(weakMapObj, factory->getObjectManager());

    // Create internal storage object for weak entries
    // This object will use weak properties for key references
    auto* entries = factory->createJSObject();

    weakMapObj->setProperty("[[WeakMapData]]", Value(entries));

    return weakMapObj;
}

// ============================================================================
// Constructor
// ============================================================================

/**
 * WeakMap constructor.
 * new WeakMap() - creates empty WeakMap
 * new WeakMap(iterable) - creates WeakMap from iterable of [key, value] pairs
 */
Value WeakMap::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    auto* factory = getObjectFactory();

    // Create the WeakMap object
    auto* weakMapObj = createWeakMapObject(factory);
    rift::memory::GCProtector protect(weakMapObj, factory->getObjectManager());

    // If no arguments or undefined/null, return empty WeakMap
    if(args.empty() || args[0].isUndefined() || args[0].isNull()) {
        return Value(weakMapObj);
    }

    const Value& iterable = args[0];

    // Get internal storage
    Value entriesVal = weakMapObj->getProperty("[[WeakMapData]]");
    if(entriesVal.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(Value("TypeError: WeakMap internal slots corrupted"));
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

                Value pair = resultObj->getProperty("value");

                // Each item must be an array-like with [key, value]
                if(pair.getType() != ValueType::Object) {
                    throw rift::core::JavaScriptException(
                        Value("TypeError: Iterator value is not an object"));
                }

                auto* pairObj = pair.getObject();
                Value key = pairObj->getProperty("0");
                Value value = pairObj->getProperty("1");

                // Validate key is an object
                if(!isValidWeakKey(key)) {
                    throw rift::core::JavaScriptException(
                        Value("TypeError: Invalid value used as weak map key"));
                }

                // Store with weak reference to key
                std::string keyStr = objectToWeakKey(key.getObject());

                // Create entry object storing the value
                // The key reference is stored as a weak property
                auto* entry = factory->createJSObject();
                entry->setWeakProperty("key", key);  // Weak reference to key
                entry->setProperty("value", value);  // Strong reference to value

                entries->setProperty(keyStr, Value(entry));
            }
        } else {
            // Try array-like access (fallback for arrays without Symbol.iterator)
            Value lengthVal = iterableObj->getProperty("length");
            if(lengthVal.getType() == ValueType::Number) {
                int length = static_cast<int>(lengthVal.toNumber());

                for(int i = 0; i < length; i++) {
                    Value pair = iterableObj->getProperty(std::to_string(i));

                    if(pair.getType() != ValueType::Object) {
                        throw rift::core::JavaScriptException(
                            Value("TypeError: Iterator value is not an object"));
                    }

                    auto* pairObj = pair.getObject();
                    Value key = pairObj->getProperty("0");
                    Value value = pairObj->getProperty("1");

                    // Validate key is an object
                    if(!isValidWeakKey(key)) {
                        throw rift::core::JavaScriptException(
                            Value("TypeError: Invalid value used as weak map key"));
                    }

                    std::string keyStr = objectToWeakKey(key.getObject());

                    auto* entry = factory->createJSObject();
                    entry->setWeakProperty("key", key);
                    entry->setProperty("value", value);

                    entries->setProperty(keyStr, Value(entry));
                }
            } else {
                throw rift::core::JavaScriptException(Value("TypeError: object is not iterable"));
            }
        }
    } else {
        throw rift::core::JavaScriptException(Value("TypeError: object is not iterable"));
    }

    return Value(weakMapObj);
}

// ============================================================================
// Instance Methods
// ============================================================================

/**
 * WeakMap.prototype.get(key)
 * Returns the value associated with key, or undefined if not found.
 * Also performs lazy cleanup of collected keys.
 */
Value WeakMap::get(const CallContext& ctx, const std::vector<Value>& args) {
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: WeakMap.prototype.get called on non-object"));
    }

    auto* weakMapObj = ctx.thisValue.getObject();

    Value entriesVal = weakMapObj->getProperty("[[WeakMapData]]");
    if(entriesVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method WeakMap.prototype.get called on incompatible receiver"));
    }

    Value key = args.empty() ? Value() : args[0];

    // WeakMap keys must be objects
    if(!isValidWeakKey(key)) {
        return Value();  // Return undefined for invalid keys (per spec)
    }

    auto* keyObj = key.getObject();
    std::string keyStr = objectToWeakKey(keyObj);

    auto* entries = entriesVal.getObject();
    Value entryVal = entries->getProperty(keyStr);

    if(entryVal.isUndefined() || entryVal.getType() != ValueType::Object) {
        return Value();  // undefined
    }

    auto* entry = entryVal.getObject();

    // Check if the key object still exists (lazy cleanup)
    auto* factory = getObjectFactory();
    if(!factory->getObjectManager()->objectExists(keyObj)) {
        // Key was garbage collected - remove the entry
        entries->deleteProperty(keyStr);
        return Value();
    }

    return entry->getProperty("value");
}

/**
 * WeakMap.prototype.set(key, value)
 * Adds or updates an entry. Returns the WeakMap for chaining.
 */
Value WeakMap::set(const CallContext& ctx, const std::vector<Value>& args) {
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: WeakMap.prototype.set called on non-object"));
    }

    auto* weakMapObj = ctx.thisValue.getObject();

    Value entriesVal = weakMapObj->getProperty("[[WeakMapData]]");
    if(entriesVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method WeakMap.prototype.set called on incompatible receiver"));
    }

    Value key = args.empty() ? Value() : args[0];
    Value value = args.size() > 1 ? args[1] : Value();

    // WeakMap keys must be objects
    if(!isValidWeakKey(key)) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Invalid value used as weak map key"));
    }

    auto* entries = entriesVal.getObject();
    auto* keyObj = key.getObject();
    std::string keyStr = objectToWeakKey(keyObj);

    Value existingEntry = entries->getProperty(keyStr);
    if(!existingEntry.isUndefined() && existingEntry.getType() == ValueType::Object) {
        // Update existing entry's value
        auto* entry = existingEntry.getObject();
        entry->setProperty("value", value);
    } else {
        // Add new entry
        auto* factory = getObjectFactory();
        auto* entry = factory->createJSObject();
        entry->setWeakProperty("key", key);  // Weak reference to key
        entry->setProperty("value", value);  // Strong reference to value

        entries->setProperty(keyStr, Value(entry));
    }

    // Return the WeakMap for chaining
    return ctx.thisValue;
}

/**
 * WeakMap.prototype.has(key)
 * Returns true if key exists in the WeakMap and key object is still alive.
 */
Value WeakMap::has(const CallContext& ctx, const std::vector<Value>& args) {
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: WeakMap.prototype.has called on non-object"));
    }

    auto* weakMapObj = ctx.thisValue.getObject();

    Value entriesVal = weakMapObj->getProperty("[[WeakMapData]]");
    if(entriesVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method WeakMap.prototype.has called on incompatible receiver"));
    }

    Value key = args.empty() ? Value() : args[0];

    // WeakMap keys must be objects
    if(!isValidWeakKey(key)) {
        return Value(false);  // Non-objects are never in WeakMap
    }

    auto* keyObj = key.getObject();
    std::string keyStr = objectToWeakKey(keyObj);

    auto* entries = entriesVal.getObject();
    Value entryVal = entries->getProperty(keyStr);

    if(entryVal.isUndefined()) {
        return Value(false);
    }

    // Check if the key object still exists (lazy cleanup)
    auto* factory = getObjectFactory();
    if(!factory->getObjectManager()->objectExists(keyObj)) {
        // Key was garbage collected - remove the entry
        entries->deleteProperty(keyStr);
        return Value(false);
    }

    return Value(true);
}

/**
 * WeakMap.prototype.delete(key)
 * Removes an entry. Returns true if entry existed, false otherwise.
 */
Value WeakMap::deleteMethod(const CallContext& ctx, const std::vector<Value>& args) {
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: WeakMap.prototype.delete called on non-object"));
    }

    auto* weakMapObj = ctx.thisValue.getObject();

    Value entriesVal = weakMapObj->getProperty("[[WeakMapData]]");
    if(entriesVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method WeakMap.prototype.delete called on incompatible receiver"));
    }

    Value key = args.empty() ? Value() : args[0];

    // WeakMap keys must be objects
    if(!isValidWeakKey(key)) {
        return Value(false);  // Non-objects are never in WeakMap
    }

    auto* keyObj = key.getObject();
    std::string keyStr = objectToWeakKey(keyObj);

    auto* entries = entriesVal.getObject();
    Value entryVal = entries->getProperty(keyStr);

    if(entryVal.isUndefined()) {
        return Value(false);
    }

    // Remove the entry
    entries->deleteProperty(keyStr);

    return Value(true);
}

JSObject* WeakMap::getGlobalPrototype() {
    return rift::core::BuiltinManager::getWeakMapPrototype();
}

}  // namespace rift::builtins
