#include "rift/builtins/map/map.h"

#include <cmath>
#include <sstream>

#include "rift/builtins/map/map_iterator.h"
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

void Map::setupStaticMethods(JSObject* /*constructor*/, rift::memory::ObjectFactory* /*factory*/) {
    // Map has no static methods in ES2024
}

void Map::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    RIFT_METHOD(prototype, "get", Map::get);
    RIFT_METHOD(prototype, "set", Map::set);
    RIFT_METHOD(prototype, "has", Map::has);
    RIFT_METHOD(prototype, "delete", Map::deleteMethod);
    RIFT_METHOD(prototype, "clear", Map::clear);
    RIFT_METHOD(prototype, "forEach", Map::forEach);
    RIFT_METHOD(prototype, "keys", Map::keys);
    RIFT_METHOD(prototype, "values", Map::values);
    RIFT_METHOD(prototype, "entries", Map::entries);

    // size is a getter - register it as a method that acts as getter
    RIFT_METHOD(prototype, "size", Map::sizeGetter);

    // Symbol.iterator - alias for entries() per ECMAScript spec
    std::string iterator_key =
        rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());
    auto* iterator_func = factory->createJSFunction(Map::entries);
    prototype->setProperty(iterator_key, Value(iterator_func));
}

// ============================================================================
// Helper Methods
// ============================================================================

/**
 * SameValueZero comparison algorithm (ECMAScript 7.2.11)
 * Same as SameValue except +0 and -0 are considered equal.
 * NaN is equal to NaN (unlike strict equality).
 */
bool Map::sameValueZero(const Value& a, const Value& b) {
    // If types are different, return false
    if(a.getType() != b.getType()) {
        return false;
    }

    switch(a.getType()) {
        case ValueType::Undefined:
            return true;

        case ValueType::Null:
            return true;

        case ValueType::Boolean:
            return a.getBool() == b.getBool();

        case ValueType::Number: {
            double aNum = a.toNumber();
            double bNum = b.toNumber();

            // NaN === NaN in SameValueZero
            if(std::isnan(aNum) && std::isnan(bNum)) {
                return true;
            }

            // +0 === -0 in SameValueZero (unlike SameValue)
            if(aNum == 0.0 && bNum == 0.0) {
                return true;
            }

            return aNum == bNum;
        }

        case ValueType::String:
            return a.getString() == b.getString();

        case ValueType::Symbol: {
            return a.getSymbol().id == b.getSymbol().id;
        }

        case ValueType::Object:
        case ValueType::Function:
            // Object identity comparison
            return a.getObject() == b.getObject();

        default:
            return false;
    }
}

/**
 * Convert a value to a unique string key for O(1) lookup.
 * This is an internal helper - the actual key stored is the original value.
 */
std::string Map::valueToMapKey(const Value& v) {
    switch(v.getType()) {
        case ValueType::Undefined:
            return "@@undefined";

        case ValueType::Null:
            return "@@null";

        case ValueType::Boolean:
            return v.getBool() ? "@@true" : "@@false";

        case ValueType::Number: {
            double num = v.toNumber();

            // Special handling for NaN
            if(std::isnan(num)) {
                return "@@NaN";
            }

            // Normalize -0 to 0 (SameValueZero treats them as equal)
            if(num == 0.0) {
                return "n:0";
            }

            std::ostringstream oss;
            oss.precision(17);
            oss << "n:" << num;
            return oss.str();
        }

        case ValueType::String:
            return "s:" + v.getString();

        case ValueType::Symbol: {
            std::ostringstream oss;
            oss << "y:" << v.getSymbol().id;
            return oss.str();
        }

        case ValueType::Object:
        case ValueType::Function: {
            // Use object pointer as unique identifier
            std::ostringstream oss;
            oss << "o:" << static_cast<const void*>(v.getObject());
            return oss.str();
        }

        default:
            return "@@unknown";
    }
}

/**
 * Create an empty Map object with internal slots initialized.
 */
JSObject* Map::createMapObject(rift::memory::ObjectFactory* factory) {
    auto* mapObj = factory->createJSObject(getGlobalPrototype());
    rift::memory::GCProtector protect(mapObj, factory->getObjectManager());

    // Create internal storage
    auto* entries = factory->createJSObject();
    auto* keys = factory->createJSObject();

    mapObj->setProperty("[[MapEntries]]", Value(entries));
    mapObj->setProperty("[[MapKeys]]", Value(keys));
    mapObj->setProperty("[[MapSize]]", Value(0.0));
    mapObj->setProperty("[[MapNextIndex]]", Value(0.0));

    return mapObj;
}

// ============================================================================
// Constructor
// ============================================================================

/**
 * Map constructor.
 * new Map() - creates empty Map
 * new Map(iterable) - creates Map from iterable of [key, value] pairs
 */
Value Map::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    auto* factory = getObjectFactory();

    // Create the Map object
    auto* mapObj = createMapObject(factory);
    rift::memory::GCProtector protect(mapObj, factory->getObjectManager());

    // If no arguments or undefined/null, return empty Map
    if(args.empty() || args[0].isUndefined() || args[0].isNull()) {
        return Value(mapObj);
    }

    const Value& iterable = args[0];

    // Get internal storage
    Value entriesVal = mapObj->getProperty("[[MapEntries]]");
    Value keysVal = mapObj->getProperty("[[MapKeys]]");

    if(entriesVal.getType() != ValueType::Object || keysVal.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(Value("TypeError: Map internal slots corrupted"));
    }

    auto* entries = entriesVal.getObject();
    auto* keys = keysVal.getObject();

    double size = 0.0;
    double nextIndex = 0.0;

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

                // Normalize -0 to +0 for keys
                if(key.getType() == ValueType::Number && key.toNumber() == 0.0) {
                    key = Value(0.0);
                }

                // Add to map
                std::string keyStr = valueToMapKey(key);

                // Check if key already exists
                Value existingIndex = keys->getProperty(keyStr);
                if(!existingIndex.isUndefined()) {
                    // Update existing entry
                    int idx = static_cast<int>(existingIndex.toNumber());
                    auto* entryObj = entries->getProperty(std::to_string(idx)).getObject();
                    entryObj->setProperty("value", value);
                } else {
                    // Create new entry
                    auto* entry = factory->createJSObject();
                    entry->setProperty("key", key);
                    entry->setProperty("value", value);

                    entries->setProperty(std::to_string(static_cast<int>(nextIndex)), Value(entry));
                    keys->setProperty(keyStr, Value(nextIndex));
                    nextIndex++;
                    size++;
                }
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

                    // Normalize -0 to +0 for keys
                    if(key.getType() == ValueType::Number && key.toNumber() == 0.0) {
                        key = Value(0.0);
                    }

                    std::string keyStr = valueToMapKey(key);

                    Value existingIndex = keys->getProperty(keyStr);
                    if(!existingIndex.isUndefined()) {
                        int idx = static_cast<int>(existingIndex.toNumber());
                        auto* entryObj = entries->getProperty(std::to_string(idx)).getObject();
                        entryObj->setProperty("value", value);
                    } else {
                        auto* entry = factory->createJSObject();
                        entry->setProperty("key", key);
                        entry->setProperty("value", value);

                        entries->setProperty(std::to_string(static_cast<int>(nextIndex)),
                                             Value(entry));
                        keys->setProperty(keyStr, Value(nextIndex));
                        nextIndex++;
                        size++;
                    }
                }
            } else {
                throw rift::core::JavaScriptException(Value("TypeError: object is not iterable"));
            }
        }
    } else {
        throw rift::core::JavaScriptException(Value("TypeError: object is not iterable"));
    }

    mapObj->setProperty("[[MapSize]]", Value(size));
    mapObj->setProperty("[[MapNextIndex]]", Value(nextIndex));

    return Value(mapObj);
}

// ============================================================================
// Instance Methods
// ============================================================================

/**
 * Map.prototype.get(key)
 * Returns the value associated with key, or undefined if not found.
 */
Value Map::get(const CallContext& ctx, const std::vector<Value>& args) {
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.get called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    Value entriesVal = mapObj->getProperty("[[MapEntries]]");
    Value keysVal = mapObj->getProperty("[[MapKeys]]");

    if(entriesVal.isUndefined() || keysVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method Map.prototype.get called on incompatible receiver"));
    }

    Value key = args.empty() ? Value() : args[0];
    std::string keyStr = valueToMapKey(key);

    auto* keys = keysVal.getObject();
    Value indexVal = keys->getProperty(keyStr);

    if(indexVal.isUndefined()) {
        return Value();  // undefined
    }

    auto* entries = entriesVal.getObject();
    int idx = static_cast<int>(indexVal.toNumber());
    Value entryVal = entries->getProperty(std::to_string(idx));

    if(entryVal.getType() != ValueType::Object) {
        return Value();
    }

    // Check if entry was deleted
    if(entryVal.getType() == ValueType::String && entryVal.getString() == "[[Deleted]]") {
        return Value();
    }

    auto* entry = entryVal.getObject();
    return entry->getProperty("value");
}

/**
 * Map.prototype.set(key, value)
 * Adds or updates an entry. Returns the Map for chaining.
 */
Value Map::set(const CallContext& ctx, const std::vector<Value>& args) {
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.set called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    Value entriesVal = mapObj->getProperty("[[MapEntries]]");
    Value keysVal = mapObj->getProperty("[[MapKeys]]");
    Value sizeVal = mapObj->getProperty("[[MapSize]]");
    Value nextIndexVal = mapObj->getProperty("[[MapNextIndex]]");

    if(entriesVal.isUndefined() || keysVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method Map.prototype.set called on incompatible receiver"));
    }

    auto* entries = entriesVal.getObject();
    auto* keys = keysVal.getObject();

    Value key = args.empty() ? Value() : args[0];
    Value value = args.size() > 1 ? args[1] : Value();

    // Normalize -0 to +0 for keys (per ECMAScript spec)
    if(key.getType() == ValueType::Number && key.toNumber() == 0.0) {
        key = Value(0.0);
    }

    std::string keyStr = valueToMapKey(key);

    Value existingIndex = keys->getProperty(keyStr);
    if(!existingIndex.isUndefined()) {
        // Update existing entry
        int idx = static_cast<int>(existingIndex.toNumber());
        Value entryVal = entries->getProperty(std::to_string(idx));

        if(entryVal.getType() == ValueType::Object) {
            auto* entry = entryVal.getObject();
            entry->setProperty("value", value);
        }
    } else {
        // Add new entry
        double nextIndex = nextIndexVal.toNumber();
        double size = sizeVal.toNumber();

        auto* entry = getObjectFactory()->createJSObject();
        entry->setProperty("key", key);
        entry->setProperty("value", value);

        entries->setProperty(std::to_string(static_cast<int>(nextIndex)), Value(entry));
        keys->setProperty(keyStr, Value(nextIndex));

        mapObj->setProperty("[[MapSize]]", Value(size + 1));
        mapObj->setProperty("[[MapNextIndex]]", Value(nextIndex + 1));
    }

    // Return the Map for chaining
    return ctx.thisValue;
}

/**
 * Map.prototype.has(key)
 * Returns true if key exists in the Map.
 */
Value Map::has(const CallContext& ctx, const std::vector<Value>& args) {
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.has called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    Value keysVal = mapObj->getProperty("[[MapKeys]]");

    if(keysVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method Map.prototype.has called on incompatible receiver"));
    }

    Value key = args.empty() ? Value() : args[0];
    std::string keyStr = valueToMapKey(key);

    auto* keys = keysVal.getObject();
    Value indexVal = keys->getProperty(keyStr);

    return Value(!indexVal.isUndefined());
}

/**
 * Map.prototype.delete(key)
 * Removes an entry. Returns true if entry existed, false otherwise.
 */
Value Map::deleteMethod(const CallContext& ctx, const std::vector<Value>& args) {
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.delete called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    Value entriesVal = mapObj->getProperty("[[MapEntries]]");
    Value keysVal = mapObj->getProperty("[[MapKeys]]");
    Value sizeVal = mapObj->getProperty("[[MapSize]]");

    if(entriesVal.isUndefined() || keysVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method Map.prototype.delete called on incompatible receiver"));
    }

    Value key = args.empty() ? Value() : args[0];
    std::string keyStr = valueToMapKey(key);

    auto* keys = keysVal.getObject();
    Value indexVal = keys->getProperty(keyStr);

    if(indexVal.isUndefined()) {
        return Value(false);
    }

    // Mark entry as deleted (preserve indices for iteration)
    auto* entries = entriesVal.getObject();
    int idx = static_cast<int>(indexVal.toNumber());
    entries->setProperty(std::to_string(idx), Value("[[Deleted]]"));

    // Remove from keys lookup
    keys->deleteProperty(keyStr);

    // Decrement size
    double size = sizeVal.toNumber();
    mapObj->setProperty("[[MapSize]]", Value(size - 1));

    return Value(true);
}

/**
 * Map.prototype.clear()
 * Removes all entries from the Map.
 */
Value Map::clear(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.clear called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    Value entriesVal = mapObj->getProperty("[[MapEntries]]");
    if(entriesVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method Map.prototype.clear called on incompatible receiver"));
    }

    // Create fresh internal structures
    auto* entries = getObjectFactory()->createJSObject();
    auto* keys = getObjectFactory()->createJSObject();

    mapObj->setProperty("[[MapEntries]]", Value(entries));
    mapObj->setProperty("[[MapKeys]]", Value(keys));
    mapObj->setProperty("[[MapSize]]", Value(0.0));
    mapObj->setProperty("[[MapNextIndex]]", Value(0.0));

    return Value();  // undefined
}

/**
 * Map.prototype.forEach(callback[, thisArg])
 * Calls callback for each entry in insertion order.
 */
Value Map::forEach(const CallContext& ctx, const std::vector<Value>& args) {
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.forEach called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    Value entriesVal = mapObj->getProperty("[[MapEntries]]");
    Value nextIndexVal = mapObj->getProperty("[[MapNextIndex]]");

    if(entriesVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method Map.prototype.forEach called on incompatible receiver"));
    }

    if(args.empty() || args[0].getType() != ValueType::Function) {
        throw rift::core::JavaScriptException(Value("TypeError: callback is not a function"));
    }

    auto* callback = dynamic_cast<JSFunction*>(args[0].getObject());
    if(callback == nullptr) {
        throw rift::core::JavaScriptException(Value("TypeError: callback is not a function"));
    }

    Value thisArg = args.size() > 1 ? args[1] : Value();

    auto* entries = entriesVal.getObject();
    int nextIndex = static_cast<int>(nextIndexVal.toNumber());

    for(int i = 0; i < nextIndex; i++) {
        Value entryVal = entries->getProperty(std::to_string(i));

        // Skip deleted entries
        if(entryVal.getType() == ValueType::String && entryVal.getString() == "[[Deleted]]") {
            continue;
        }

        if(entryVal.getType() != ValueType::Object) {
            continue;
        }

        auto* entry = entryVal.getObject();
        Value key = entry->getProperty("key");
        Value value = entry->getProperty("value");

        // Call callback(value, key, map)
        CallContext cbCtx = ctx;
        cbCtx.thisValue = thisArg;
        callback->call(cbCtx, {value, key, ctx.thisValue});
    }

    return Value();  // undefined
}

/**
 * Map.prototype.keys()
 * Returns an iterator over keys.
 */
Value Map::keys(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.keys called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    Value entriesVal = mapObj->getProperty("[[MapEntries]]");
    if(entriesVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method Map.prototype.keys called on incompatible receiver"));
    }

    auto* iterator = MapIterator::create(getObjectFactory(), mapObj, MapIterationKind::Key);
    return Value(iterator);
}

/**
 * Map.prototype.values()
 * Returns an iterator over values.
 */
Value Map::values(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.values called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    Value entriesVal = mapObj->getProperty("[[MapEntries]]");
    if(entriesVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method Map.prototype.values called on incompatible receiver"));
    }

    auto* iterator = MapIterator::create(getObjectFactory(), mapObj, MapIterationKind::Value);
    return Value(iterator);
}

/**
 * Map.prototype.entries()
 * Returns an iterator over [key, value] pairs.
 * This is also the default iterator (Symbol.iterator).
 */
Value Map::entries(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.entries called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    Value entriesVal = mapObj->getProperty("[[MapEntries]]");
    if(entriesVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method Map.prototype.entries called on incompatible receiver"));
    }

    auto* iterator = MapIterator::create(getObjectFactory(), mapObj, MapIterationKind::KeyValue);
    return Value(iterator);
}

/**
 * Map.prototype.size (getter)
 * Returns the number of entries in the Map.
 */
Value Map::sizeGetter(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.size called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    Value sizeVal = mapObj->getProperty("[[MapSize]]");
    if(sizeVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method get Map.prototype.size called on incompatible receiver"));
    }

    return sizeVal;
}

JSObject* Map::getGlobalPrototype() {
    return rift::core::BuiltinManager::getMapPrototype();
}

}  // namespace rift::builtins
