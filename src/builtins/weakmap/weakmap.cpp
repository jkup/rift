#include "rift/builtins/weakmap/weakmap.h"

#include <sstream>

#include "rift/builtins/builtin_manager.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/interpreter/evaluation_utils.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/memory/gc_protector.h"
#include "rift/types/object.h"

// ============================================================================
// ECMA-262 -- WeakMap Objects (24.3)
// @spec https://tc39.es/ecma262/#sec-weakmap-objects
//
// WeakMap is a collection of key/value pairs where keys must be objects
// (or registered symbols). Keys are held weakly -- if no other references
// exist, they can be garbage collected. WeakMap is NOT iterable and has
// no size property.
//
// Constructor (24.3.1): WeakMap ( [ iterable ] )
// Prototype methods (24.3.3): delete, get, has, set
//
// See also: weakset/weakset.cpp (24.4), map/map.cpp (24.1)
// ============================================================================

namespace rift::builtins {

// ============================================================================
// Setup Methods
// ============================================================================

// 24.3.2 Properties of the WeakMap Constructor
// @spec https://tc39.es/ecma262/#sec-properties-of-the-weakmap-constructor
void WeakMap::setupStaticMethods(JSObject* /*constructor*/,
                                 rift::memory::ObjectFactory* /*factory*/) {
    // WeakMap has no static methods in ES2025
}

// 24.3.3 Properties of the WeakMap Prototype Object
// @spec https://tc39.es/ecma262/#sec-properties-of-the-weakmap-prototype-object
void WeakMap::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    // 24.3.3.3 WeakMap.prototype.get ( key )
    RIFT_METHOD(prototype, "get", WeakMap::get);
    // 24.3.3.5 WeakMap.prototype.set ( key, value )
    RIFT_METHOD(prototype, "set", WeakMap::set);
    // 24.3.3.4 WeakMap.prototype.has ( key )
    RIFT_METHOD(prototype, "has", WeakMap::has);
    // 24.3.3.2 WeakMap.prototype.delete ( key )
    RIFT_METHOD(prototype, "delete", WeakMap::deleteMethod);

    // WeakMap is NOT iterable - no Symbol.iterator, no keys/values/entries/forEach
    // No size property either
    // INCOMPLETE: 24.3.3.6 WeakMap.prototype [ @@toStringTag ] not yet set.
    // Should be a string-valued property with value "WeakMap".
}

// ============================================================================
// Helper Methods
// ============================================================================

/**
 * Check if a value is a valid WeakMap key.
 * Corresponds to the CanBeHeldWeakly abstract operation (7.2.16).
 * @spec https://tc39.es/ecma262/#sec-canbeheldweakly
 *
 * Per spec, an object or a non-registered symbol can be held weakly.
 * SIMPLIFIED: Rift only accepts objects/functions as weak keys;
 * registered symbols as weak keys are not yet supported.
 */
bool WeakMap::isValidWeakKey(const Value& key) {
    return key.getType() == ValueType::Object || key.getType() == ValueType::Function;
}

/**
 * Convert an object pointer to a unique string key for internal lookup.
 * NON-STANDARD: This is a Rift implementation detail. The spec uses a List
 * of Records { [[Key]], [[Value]] } searched by identity; Rift uses pointer-
 * based string keys for O(1) lookup instead of linear scanning.
 */
std::string WeakMap::objectToWeakKey(JSObject* obj) {
    std::ostringstream oss;
    oss << "wk:" << static_cast<const void*>(obj);
    return oss.str();
}

/**
 * Create an empty WeakMap object with internal slots initialized.
 * Sets up the [[WeakMapData]] internal slot required by the spec.
 * DEVIATION: The spec defines [[WeakMapData]] as a List of Records
 * { [[Key]], [[Value]] }. Rift stores entries in a JSObject keyed
 * by pointer-based string identifiers for O(1) lookup.
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

// 24.3.1.1 WeakMap ( [ iterable ] )
// @spec https://tc39.es/ecma262/#sec-weakmap-iterable
Value WeakMap::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    auto* factory = getObjectFactory();

    // 1. If NewTarget is undefined, throw a TypeError exception.
    // SIMPLIFIED: Rift does not distinguish NewTarget; always creates a new object.

    // 2. Let map be ? OrdinaryCreateFromConstructor(NewTarget, "%WeakMap.prototype%",
    //    << [[WeakMapData]] >>).
    // 3. Set map.[[WeakMapData]] to a new empty List.
    auto* weakMapObj = createWeakMapObject(factory);
    rift::memory::GCProtector protect(weakMapObj, factory->getObjectManager());

    // 4. If iterable is either undefined or null, return map.
    if(args.empty() || args[0].isUndefined() || args[0].isNull()) {
        return Value(weakMapObj);
    }

    const Value& iterable = args[0];

    // 5. Let adder be ? Get(map, "set").
    // 6. If IsCallable(adder) is false, throw a TypeError exception.
    // SIMPLIFIED: Rift calls the internal set logic directly rather than
    // looking up the "set" method on the new WeakMap object.

    // Get internal storage
    Value entriesVal = weakMapObj->getProperty("[[WeakMapData]]");
    if(entriesVal.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(Value("TypeError: WeakMap internal slots corrupted"));
    }

    auto* entries = entriesVal.getObject();

    // 7. Let iteratorRecord be ? GetIterator(iterable, sync).
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

            // 8. Repeat,
            while(true) {
                // a. Let next be ? IteratorStepValue(iteratorRecord).
                CallContext nextCtx = ctx;
                nextCtx.thisValue = iterator;
                Value result = nextFunc->call(nextCtx, {});

                if(result.getType() != ValueType::Object) {
                    throw rift::core::JavaScriptException(
                        Value("TypeError: Iterator result is not an object"));
                }

                auto* resultObj = result.getObject();
                Value done = resultObj->getProperty("done");

                // b. If next is done, return map.
                if(done.toBool()) {
                    break;
                }

                Value pair = resultObj->getProperty("value");

                // c. Let nextItem be next.
                // d. If nextItem is not an Object, then
                //    i. Let error be ThrowCompletion(a newly created TypeError object).
                //    ii. Return ? IteratorClose(iteratorRecord, error).
                if(pair.getType() != ValueType::Object) {
                    throw rift::core::JavaScriptException(
                        Value("TypeError: Iterator value is not an object"));
                }

                // e. Let k be ? Get(nextItem, "0").
                // f. Let v be ? Get(nextItem, "1").
                auto* pairObj = pair.getObject();
                Value key = pairObj->getProperty("0");
                Value value = pairObj->getProperty("1");

                // g. Let status be Completion(Call(adder, map, << k, v >>)).
                // SIMPLIFIED: Rift validates and inserts directly instead of calling adder.
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
            // DEVIATION: Fallback array-like access for iterables without Symbol.iterator.
            // The spec requires Symbol.iterator; this is a Rift convenience fallback.
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

// 24.3.3.3 WeakMap.prototype.get ( key )
// @spec https://tc39.es/ecma262/#sec-weakmap.prototype.get
Value WeakMap::get(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let M be the this value.
    // 2. Perform ? RequireInternalSlot(M, [[WeakMapData]]).
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

    // 3. For each Record { [[Key]], [[Value]] } p of M.[[WeakMapData]], do
    //    a. If p.[[Key]] is not empty and SameValue(p.[[Key]], key) is true,
    //       return p.[[Value]].
    // SIMPLIFIED: Rift uses pointer-based O(1) lookup via objectToWeakKey
    // instead of the spec's linear scan through [[WeakMapData]].

    // Non-object keys can never be in a WeakMap — return undefined.
    if(!isValidWeakKey(key)) {
        // 4. Return undefined.
        return Value();
    }

    auto* keyObj = key.getObject();
    std::string keyStr = objectToWeakKey(keyObj);

    auto* entries = entriesVal.getObject();
    Value entryVal = entries->getProperty(keyStr);

    if(entryVal.isUndefined() || entryVal.getType() != ValueType::Object) {
        // 4. Return undefined.
        return Value();
    }

    auto* entry = entryVal.getObject();

    // Check if the key object still exists (lazy cleanup).
    // DEVIATION: The spec models collected keys as "empty" entries that are
    // skipped during the step-3 scan. Rift proactively deletes entries when
    // it detects the key has been garbage collected.
    auto* factory = getObjectFactory();
    if(!factory->getObjectManager()->objectExists(keyObj)) {
        entries->deleteProperty(keyStr);
        return Value();
    }

    // Step 3a: Key found — return p.[[Value]].
    return entry->getProperty("value");
}

// 24.3.3.5 WeakMap.prototype.set ( key, value )
// @spec https://tc39.es/ecma262/#sec-weakmap.prototype.set
Value WeakMap::set(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let M be the this value.
    // 2. Perform ? RequireInternalSlot(M, [[WeakMapData]]).
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

    // 3. If CanBeHeldWeakly(key) is false, throw a TypeError exception.
    if(!isValidWeakKey(key)) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Invalid value used as weak map key"));
    }

    // 4. For each Record { [[Key]], [[Value]] } p of M.[[WeakMapData]], do
    //    a. If p.[[Key]] is not empty and SameValue(p.[[Key]], key) is true, then
    //       i. Set p.[[Value]] to value.
    //       ii. Return M.
    // SIMPLIFIED: Rift uses pointer-based O(1) lookup via objectToWeakKey
    // instead of the spec's linear scan through [[WeakMapData]].
    auto* entries = entriesVal.getObject();
    auto* keyObj = key.getObject();
    std::string keyStr = objectToWeakKey(keyObj);

    Value existingEntry = entries->getProperty(keyStr);
    if(!existingEntry.isUndefined() && existingEntry.getType() == ValueType::Object) {
        // Step 4a: Key exists — update p.[[Value]] to value.
        auto* entry = existingEntry.getObject();
        entry->setProperty("value", value);
    } else {
        // 5. Let p be the Record { [[Key]]: key, [[Value]]: value }.
        // 6. Append p to M.[[WeakMapData]].
        auto* factory = getObjectFactory();
        auto* entry = factory->createJSObject();
        entry->setWeakProperty("key", key);  // Weak reference to key
        entry->setProperty("value", value);  // Strong reference to value

        entries->setProperty(keyStr, Value(entry));
    }

    // 7. Return M.
    return ctx.thisValue;
}

// 24.3.3.4 WeakMap.prototype.has ( key )
// @spec https://tc39.es/ecma262/#sec-weakmap.prototype.has
Value WeakMap::has(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let M be the this value.
    // 2. Perform ? RequireInternalSlot(M, [[WeakMapData]]).
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

    // 3. For each Record { [[Key]], [[Value]] } p of M.[[WeakMapData]], do
    //    a. If p.[[Key]] is not empty and SameValue(p.[[Key]], key) is true,
    //       return true.
    // SIMPLIFIED: Rift uses pointer-based O(1) lookup via objectToWeakKey
    // instead of the spec's linear scan through [[WeakMapData]].

    // Non-object keys can never be in a WeakMap.
    if(!isValidWeakKey(key)) {
        // 4. Return false.
        return Value(false);
    }

    auto* keyObj = key.getObject();
    std::string keyStr = objectToWeakKey(keyObj);

    auto* entries = entriesVal.getObject();
    Value entryVal = entries->getProperty(keyStr);

    if(entryVal.isUndefined()) {
        // 4. Return false.
        return Value(false);
    }

    // Check if the key object still exists (lazy cleanup).
    // DEVIATION: The spec models collected keys as "empty" entries that are
    // skipped during the step-3 scan. Rift proactively deletes entries when
    // it detects the key has been garbage collected.
    auto* factory = getObjectFactory();
    if(!factory->getObjectManager()->objectExists(keyObj)) {
        entries->deleteProperty(keyStr);
        return Value(false);
    }

    // Step 3a: Key found — return true.
    return Value(true);
}

// 24.3.3.2 WeakMap.prototype.delete ( key )
// @spec https://tc39.es/ecma262/#sec-weakmap.prototype.delete
Value WeakMap::deleteMethod(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let M be the this value.
    // 2. Perform ? RequireInternalSlot(M, [[WeakMapData]]).
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

    // 3. For each Record { [[Key]], [[Value]] } p of M.[[WeakMapData]], do
    //    a. If p.[[Key]] is not empty and SameValue(p.[[Key]], key) is true, then
    //       i. Set p.[[Key]] to empty.
    //       ii. Set p.[[Value]] to empty.
    //       iii. Return true.
    // SIMPLIFIED: Rift uses pointer-based O(1) lookup via objectToWeakKey
    // instead of the spec's linear scan through [[WeakMapData]].

    // Non-object keys can never be in a WeakMap.
    if(!isValidWeakKey(key)) {
        // 4. Return false.
        return Value(false);
    }

    auto* keyObj = key.getObject();
    std::string keyStr = objectToWeakKey(keyObj);

    auto* entries = entriesVal.getObject();
    Value entryVal = entries->getProperty(keyStr);

    if(entryVal.isUndefined()) {
        // 4. Return false.
        return Value(false);
    }

    // Step 3a: Key found — remove the entry and return true.
    // DEVIATION: The spec sets p.[[Key]] and p.[[Value]] to empty (leaving a
    // tombstone in the List). Rift deletes the property entirely, which is
    // functionally equivalent since WeakMap is not iterable.
    entries->deleteProperty(keyStr);

    return Value(true);
}

JSObject* WeakMap::getGlobalPrototype() {
    return rift::core::BuiltinManager::getWeakMapPrototype();
}

}  // namespace rift::builtins
