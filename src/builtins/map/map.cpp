#include "rift/builtins/map/map.h"

#include <cmath>
#include <sstream>

#include "rift/builtins/builtin_manager.h"
#include "rift/builtins/map/map_iterator.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/interpreter/evaluation_utils.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/memory/gc_protector.h"
#include "rift/types/object.h"

// For Array::createArrayObject used by Map.groupBy
#include "rift/builtins/array/array.h"

// ============================================================================
// ECMA-262 — Map Objects (ES2025 Section 24.1)
// @spec https://tc39.es/ecma262/#sec-map-objects
// See also: map_iterator.cpp (Map iterator protocol, 24.1.5)
//           set/set.cpp (Set objects, 24.2 — parallel structure)
//
// DEVIATION: The spec models Map entries via a [[MapData]] internal slot
// containing a List of { [[Key]], [[Value]] } Records. Rift uses two
// JSObject-based maps ([[MapEntries]] for ordered storage, [[MapKeys]] for
// O(1) lookup) plus [[MapSize]] and [[MapNextIndex]] counters. This achieves
// the same semantics with different internal representation.
// ============================================================================

namespace rift::builtins {

// ============================================================================
// Setup Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 24.1.2 Properties of the Map Constructor
// @spec https://tc39.es/ecma262/#sec-properties-of-the-map-constructor
//
// The Map constructor has no static methods beyond Map.prototype (24.1.2.1)
// and the standard Function properties (name, length).
// TODO: 24.1.2.2 get Map [ @@species ] — not yet implemented.
// @spec https://tc39.es/ecma262/#sec-get-map-@@species
// ----------------------------------------------------------------------------
void Map::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // 24.1.2.1 Map.groupBy ( items, callbackfn )
    RIFT_STATIC_METHOD(constructor, "groupBy", 2, Map::groupBy);
}

// ----------------------------------------------------------------------------
// 24.1.3 Properties of the Map Prototype Object
// @spec https://tc39.es/ecma262/#sec-properties-of-the-map-prototype-object
//
// The Map prototype object:
//   - is %Map.prototype%
//   - is an ordinary object
//   - has a [[Prototype]] internal slot whose value is %Object.prototype%
//   - does not have a [[MapData]] internal slot
// ----------------------------------------------------------------------------
void Map::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    // 24.1.3.6 Map.prototype.get ( key )
    RIFT_METHOD(prototype, "get", 1, Map::get);
    // 24.1.3.9 Map.prototype.set ( key, value )
    RIFT_METHOD(prototype, "set", 2, Map::set);
    // 24.1.3.7 Map.prototype.has ( key )
    RIFT_METHOD(prototype, "has", 1, Map::has);
    // 24.1.3.3 Map.prototype.delete ( key )
    RIFT_METHOD(prototype, "delete", 1, Map::deleteMethod);
    // 24.1.3.1 Map.prototype.clear ( )
    RIFT_METHOD(prototype, "clear", 0, Map::clear);
    // 24.1.3.5 Map.prototype.forEach ( callbackfn [ , thisArg ] )
    RIFT_METHOD(prototype, "forEach", 1, Map::forEach);
    // 24.1.3.8 Map.prototype.keys ( )
    RIFT_METHOD(prototype, "keys", 0, Map::keys);
    // 24.1.3.11 Map.prototype.values ( )
    RIFT_METHOD(prototype, "values", 0, Map::values);
    // 24.1.3.4 Map.prototype.entries ( )
    RIFT_METHOD(prototype, "entries", 0, Map::entries);

    // Map.prototype.getOrInsert ( key, value )
    RIFT_METHOD(prototype, "getOrInsert", 2, Map::getOrInsert);
    // Map.prototype.getOrInsertComputed ( key, callbackfn )
    RIFT_METHOD(prototype, "getOrInsertComputed", 2, Map::getOrInsertComputed);

    // 24.1.3.10 get Map.prototype.size
    // @spec https://tc39.es/ecma262/#sec-get-map.prototype.size
    RIFT_GETTER(prototype, "size", Map::sizeGetter);

    // 24.1.3.12 Map.prototype [ @@iterator ] ( )
    // @spec https://tc39.es/ecma262/#sec-map.prototype-@@iterator
    // The initial value of the @@iterator property is %Map.prototype.entries%.
    std::string iterator_key =
        rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());
    auto* iterator_func = factory->createJSFunction(Map::entries);
    prototype->setProperty(iterator_key, Value(iterator_func));
}

// ============================================================================
// Helper Methods
// ============================================================================

// 7.2.12 SameValueZero ( x, y )
// @spec https://tc39.es/ecma262/#sec-samevaluezero
//
// The SameValueZero comparison algorithm:
//   1. If Type(x) is not Type(y), return false.
//   2. If x is a Number, then
//      a. Return Number::sameValueZero(x, y).
//   3. Return SameValueNonNumber(x, y).
//
// Number::sameValueZero(x, y):
//   - If x is NaN and y is NaN, return true.
//   - If x is +0 and y is -0, return true.
//   - If x is -0 and y is +0, return true.
//   - If x is y, return true.
//   - Return false.
/**
 * SameValueZero comparison algorithm (ECMAScript 7.2.11)
 * Same as SameValue except +0 and -0 are considered equal.
 * NaN is equal to NaN (unlike strict equality).
 */
bool Map::sameValueZero(const Value& a, const Value& b) {
    // 1. If Type(x) is not Type(y), return false.
    if(a.getType() != b.getType()) {
        return false;
    }

    switch(a.getType()) {
        // 3. Return SameValueNonNumber(x, y).
        // SIMPLIFIED: Rift inlines SameValueNonNumber for each type.
        case ValueType::Undefined:
            return true;

        case ValueType::Null:
            return true;

        case ValueType::Boolean:
            return a.getBool() == b.getBool();

        // 2. If x is a Number, return Number::sameValueZero(x, y).
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

        // 3. Return SameValueNonNumber(x, y) — continued.
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

// NON-STANDARD: Internal helper — not part of ECMA-262.
// Generates a unique string key for each value, respecting SameValueZero
// semantics (NaN maps to a single key, +0/-0 map to the same key).
// Used by [[MapKeys]] for O(1) membership lookup.
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

// NON-STANDARD: Internal helper to create an initialized Map object.
// The spec uses a [[MapData]] internal slot (a List of { [[Key]], [[Value]] } Records).
// DEVIATION: Rift uses four property-based internal slots instead:
//   [[MapEntries]]   — ordered storage (index -> {key, value} object)
//   [[MapKeys]]      — hash-like lookup (valueKey -> index)
//   [[MapSize]]      — count of non-deleted entries
//   [[MapNextIndex]] — monotonically increasing insertion index
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

// 24.1.1.1 Map ( [ iterable ] )
// @spec https://tc39.es/ecma262/#sec-map-iterable
//
// Spec algorithm:
//   1. If NewTarget is undefined, throw a TypeError exception.
//   2. Let map be ? OrdinaryCreateFromConstructor(NewTarget, "%Map.prototype%",
//      << [[MapData]] >>).
//   3. Set map.[[MapData]] to a new empty List.
//   4. If iterable is either undefined or null, return map.
//   5. Let adder be ? Get(map, "set").
//   6. If IsCallable(adder) is false, throw a TypeError exception.
//   7. Let iteratorRecord be ? GetIterator(iterable, sync).
//   8. Repeat,
//      a. Let next be ? IteratorStepValue(iteratorRecord).
//      b. If next is done, return map.
//      c. If next is not an Object, then
//         i. Let error be ThrowCompletion(a newly created TypeError object).
//         ii. Return ? IteratorClose(iteratorRecord, error).
//      d. Let k be Completion(Get(next, "0")).
//      e. IfAbruptCloseIterator(k, iteratorRecord).
//      f. Let v be Completion(Get(next, "1")).
//      g. IfAbruptCloseIterator(v, iteratorRecord).
//      h. Let status be Completion(Call(adder, map, << k, v >>)).
//      i. IfAbruptCloseIterator(status, iteratorRecord).
/**
 * Map constructor.
 * new Map() - creates empty Map
 * new Map(iterable) - creates Map from iterable of [key, value] pairs
 */
Value Map::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // Steps 1-3: Create the Map object.
    // INCOMPLETE: Step 1 (NewTarget check) not enforced — Rift does not yet
    // distinguish [[Construct]] from [[Call]] for built-in constructors.
    auto* factory = getObjectFactory();

    // Step 2-3: Let map be ? OrdinaryCreateFromConstructor(...). Set map.[[MapData]] to empty List.
    auto* mapObj = createMapObject(factory);
    rift::memory::GCProtector protect(mapObj, factory->getObjectManager());

    // Step 4: If iterable is either undefined or null, return map.
    if(args.empty() || args[0].isUndefined() || args[0].isNull()) {
        return Value(mapObj);
    }

    // Steps 5-6: Let adder be ? Get(map, "set"). If IsCallable(adder) is false, throw.
    // SIMPLIFIED: Rift inlines the set logic directly rather than calling the "set"
    // method through Get(map, "set"). This means subclass overrides of .set() are
    // not respected during construction.
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

    // Step 7: Let iteratorRecord be ? GetIterator(iterable, sync).
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

            // Step 8: Repeat,
            while(true) {
                // Step 8a: Let next be ? IteratorStepValue(iteratorRecord).
                CallContext nextCtx = ctx;
                nextCtx.thisValue = iterator;
                Value result = nextFunc->call(nextCtx, {});

                if(result.getType() != ValueType::Object) {
                    throw rift::core::JavaScriptException(
                        Value("TypeError: Iterator result is not an object"));
                }

                auto* resultObj = result.getObject();
                Value done = resultObj->getProperty("done");

                // Step 8b: If next is done, return map.
                if(done.toBool()) {
                    break;
                }

                Value pair = resultObj->getProperty("value");

                // Step 8c: If next is not an Object, throw a TypeError.
                if(pair.getType() != ValueType::Object) {
                    throw rift::core::JavaScriptException(
                        Value("TypeError: Iterator value is not an object"));
                }

                // Steps 8d-8e: Let k be ? Get(next, "0").
                auto* pairObj = pair.getObject();
                Value key = pairObj->getProperty("0");
                // Steps 8f-8g: Let v be ? Get(next, "1").
                Value value = pairObj->getProperty("1");

                // Normalize -0 to +0 for keys (per spec step in Map.prototype.set)
                if(key.getType() == ValueType::Number && key.toNumber() == 0.0) {
                    key = Value(0.0);
                }

                // Steps 8h-8i: Call(adder, map, << k, v >>).
                // SIMPLIFIED: Inlined set logic instead of calling adder.
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
            // DEVIATION: Fallback array-like iteration for objects without Symbol.iterator.
            // The spec would throw a TypeError at step 7 if GetIterator fails.
            // Rift falls back to array-like indexed access instead.
            Value lengthVal = iterableObj->getProperty("length");
            if(lengthVal.getType() == ValueType::Number) {
                int length = static_cast<int>(lengthVal.toNumber());

                for(int i = 0; i < length; i++) {
                    Value pair = iterableObj->getProperty(std::to_string(i));

                    // Step 8c equivalent: If next is not an Object, throw.
                    if(pair.getType() != ValueType::Object) {
                        throw rift::core::JavaScriptException(
                            Value("TypeError: Iterator value is not an object"));
                    }

                    // Steps 8d-8g equivalent: Get key and value from pair.
                    auto* pairObj = pair.getObject();
                    Value key = pairObj->getProperty("0");
                    Value value = pairObj->getProperty("1");

                    // Normalize -0 to +0 for keys
                    if(key.getType() == ValueType::Number && key.toNumber() == 0.0) {
                        key = Value(0.0);
                    }

                    // Steps 8h-8i equivalent: Inlined set logic.
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

// 24.1.3.6 Map.prototype.get ( key )
// @spec https://tc39.es/ecma262/#sec-map.prototype.get
//
// Spec algorithm:
//   1. Let M be the this value.
//   2. Perform ? RequireInternalSlot(M, [[MapData]]).
//   3. For each Record { [[Key]], [[Value]] } p of M.[[MapData]], do
//      a. If p.[[Key]] is not empty and SameValueZero(p.[[Key]], key) is true,
//         return p.[[Value]].
//   4. Return undefined.
/**
 * Map.prototype.get(key)
 * Returns the value associated with key, or undefined if not found.
 */
Value Map::get(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Let M be the this value.
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.get called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    // Step 2: Perform ? RequireInternalSlot(M, [[MapData]]).
    Value entriesVal = mapObj->getProperty("[[MapEntries]]");
    Value keysVal = mapObj->getProperty("[[MapKeys]]");

    if(entriesVal.isUndefined() || keysVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method Map.prototype.get called on incompatible receiver"));
    }

    Value key = args.empty() ? Value() : args[0];

    // Steps 3-4: Search for key using SameValueZero (via key lookup).
    // SIMPLIFIED: Uses O(1) key lookup instead of linear scan of [[MapData]].
    std::string keyStr = valueToMapKey(key);

    auto* keys = keysVal.getObject();
    Value indexVal = keys->getProperty(keyStr);

    // Step 4: Return undefined.
    if(indexVal.isUndefined()) {
        return Value();  // undefined
    }

    // Step 3a: Return p.[[Value]].
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

// 24.1.3.9 Map.prototype.set ( key, value )
// @spec https://tc39.es/ecma262/#sec-map.prototype.set
//
// Spec algorithm:
//   1. Let M be the this value.
//   2. Perform ? RequireInternalSlot(M, [[MapData]]).
//   3. For each Record { [[Key]], [[Value]] } p of M.[[MapData]], do
//      a. If p.[[Key]] is not empty and SameValueZero(p.[[Key]], key) is true, then
//         i. Set p.[[Value]] to value.
//         ii. Return M.
//   4. If key is -0, set key to +0.
//   5. Let p be the Record { [[Key]]: key, [[Value]]: value }.
//   6. Append p to M.[[MapData]].
//   7. Return M.
/**
 * Map.prototype.set(key, value)
 * Adds or updates an entry. Returns the Map for chaining.
 */
Value Map::set(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Let M be the this value.
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.set called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    // Step 2: Perform ? RequireInternalSlot(M, [[MapData]]).
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

    // Step 4: If key is -0, set key to +0.
    if(key.getType() == ValueType::Number && key.toNumber() == 0.0) {
        key = Value(0.0);
    }

    // Step 3: Search for existing entry using SameValueZero (via key lookup).
    std::string keyStr = valueToMapKey(key);

    Value existingIndex = keys->getProperty(keyStr);
    if(!existingIndex.isUndefined()) {
        // Step 3a: Key found — update existing entry.
        // Step 3a.i: Set p.[[Value]] to value.
        int idx = static_cast<int>(existingIndex.toNumber());
        Value entryVal = entries->getProperty(std::to_string(idx));

        if(entryVal.getType() == ValueType::Object) {
            auto* entry = entryVal.getObject();
            entry->setProperty("value", value);
        }
    } else {
        // Steps 5-6: Create new Record { [[Key]]: key, [[Value]]: value } and append.
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

    // Step 7 (or 3a.ii): Return M.
    return ctx.thisValue;
}

// 24.1.3.7 Map.prototype.has ( key )
// @spec https://tc39.es/ecma262/#sec-map.prototype.has
//
// Spec algorithm:
//   1. Let M be the this value.
//   2. Perform ? RequireInternalSlot(M, [[MapData]]).
//   3. For each Record { [[Key]], [[Value]] } p of M.[[MapData]], do
//      a. If p.[[Key]] is not empty and SameValueZero(p.[[Key]], key) is true,
//         return true.
//   4. Return false.
/**
 * Map.prototype.has(key)
 * Returns true if key exists in the Map.
 */
Value Map::has(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Let M be the this value.
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.has called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    // Step 2: Perform ? RequireInternalSlot(M, [[MapData]]).
    Value keysVal = mapObj->getProperty("[[MapKeys]]");

    if(keysVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method Map.prototype.has called on incompatible receiver"));
    }

    Value key = args.empty() ? Value() : args[0];

    // Steps 3-4: Search for key using SameValueZero (via key lookup).
    std::string keyStr = valueToMapKey(key);

    auto* keys = keysVal.getObject();
    Value indexVal = keys->getProperty(keyStr);

    return Value(!indexVal.isUndefined());
}

// 24.1.3.3 Map.prototype.delete ( key )
// @spec https://tc39.es/ecma262/#sec-map.prototype.delete
//
// Spec algorithm:
//   1. Let M be the this value.
//   2. Perform ? RequireInternalSlot(M, [[MapData]]).
//   3. For each Record { [[Key]], [[Value]] } p of M.[[MapData]], do
//      a. If p.[[Key]] is not empty and SameValueZero(p.[[Key]], key) is true, then
//         i. Set p.[[Key]] to empty.
//         ii. Set p.[[Value]] to empty.
//         iii. Return true.
//   4. Return false.
/**
 * Map.prototype.delete(key)
 * Removes an entry. Returns true if entry existed, false otherwise.
 */
Value Map::deleteMethod(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Let M be the this value.
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.delete called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    // Step 2: Perform ? RequireInternalSlot(M, [[MapData]]).
    Value entriesVal = mapObj->getProperty("[[MapEntries]]");
    Value keysVal = mapObj->getProperty("[[MapKeys]]");
    Value sizeVal = mapObj->getProperty("[[MapSize]]");

    if(entriesVal.isUndefined() || keysVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method Map.prototype.delete called on incompatible receiver"));
    }

    Value key = args.empty() ? Value() : args[0];

    // Step 3: Search for key using SameValueZero (via key lookup).
    std::string keyStr = valueToMapKey(key);

    auto* keys = keysVal.getObject();
    Value indexVal = keys->getProperty(keyStr);

    // Step 4: Return false (key not found).
    if(indexVal.isUndefined()) {
        return Value(false);
    }

    // Step 3a: Key found.
    // Step 3a.i-ii: Set p.[[Key]] to empty. Set p.[[Value]] to empty.
    // DEVIATION: Instead of setting key/value to "empty", Rift replaces the
    // entry with a "[[Deleted]]" sentinel string to preserve iteration indices.
    auto* entries = entriesVal.getObject();
    int idx = static_cast<int>(indexVal.toNumber());
    entries->setProperty(std::to_string(idx), Value("[[Deleted]]"));

    // Remove from keys lookup
    keys->deleteProperty(keyStr);

    // Decrement size
    double size = sizeVal.toNumber();
    mapObj->setProperty("[[MapSize]]", Value(size - 1));

    // Step 3a.iii: Return true.
    return Value(true);
}

// 24.1.3.1 Map.prototype.clear ( )
// @spec https://tc39.es/ecma262/#sec-map.prototype.clear
//
// Spec algorithm:
//   1. Let M be the this value.
//   2. Perform ? RequireInternalSlot(M, [[MapData]]).
//   3. For each Record { [[Key]], [[Value]] } p of M.[[MapData]], do
//      a. Set p.[[Key]] to empty.
//      b. Set p.[[Value]] to empty.
//   4. Return undefined.
/**
 * Map.prototype.clear()
 * Removes all entries from the Map.
 */
Value Map::clear(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    // Step 1: Let M be the this value.
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.clear called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    // Step 2: Perform ? RequireInternalSlot(M, [[MapData]]).
    Value entriesVal = mapObj->getProperty("[[MapEntries]]");
    if(entriesVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method Map.prototype.clear called on incompatible receiver"));
    }

    // Steps 3-4: Set all entries to empty, return undefined.
    // DEVIATION: Instead of marking each entry as empty, Rift replaces the
    // internal slot objects with fresh empty objects and resets counters.
    auto* entries = getObjectFactory()->createJSObject();
    auto* keys = getObjectFactory()->createJSObject();

    mapObj->setProperty("[[MapEntries]]", Value(entries));
    mapObj->setProperty("[[MapKeys]]", Value(keys));
    mapObj->setProperty("[[MapSize]]", Value(0.0));
    mapObj->setProperty("[[MapNextIndex]]", Value(0.0));

    return Value();  // undefined
}

// 24.1.3.5 Map.prototype.forEach ( callbackfn [ , thisArg ] )
// @spec https://tc39.es/ecma262/#sec-map.prototype.foreach
//
// Spec algorithm:
//   1. Let M be the this value.
//   2. Perform ? RequireInternalSlot(M, [[MapData]]).
//   3. If IsCallable(callbackfn) is false, throw a TypeError exception.
//   4. Let entries be M.[[MapData]].
//   5. Let numEntries be the number of elements in entries.
//   6. Let index be 0.
//   7. Repeat, while index < numEntries,
//      a. Let e be entries[index].
//      b. Set index to index + 1.
//      c. If e.[[Key]] is not empty, then
//         i. Perform ? Call(callbackfn, thisArg, << e.[[Value]], e.[[Key]], M >>).
//         ii. NOTE: The number of elements in entries may have increased during
//             execution of callbackfn.
//         iii. Set numEntries to the number of elements in entries.
//   8. Return undefined.
/**
 * Map.prototype.forEach(callback[, thisArg])
 * Calls callback for each entry in insertion order.
 */
Value Map::forEach(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Let M be the this value.
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.forEach called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    // Step 2: Perform ? RequireInternalSlot(M, [[MapData]]).
    Value entriesVal = mapObj->getProperty("[[MapEntries]]");
    Value nextIndexVal = mapObj->getProperty("[[MapNextIndex]]");

    if(entriesVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method Map.prototype.forEach called on incompatible receiver"));
    }

    // Step 3: If IsCallable(callbackfn) is false, throw a TypeError exception.
    if(args.empty() || args[0].getType() != ValueType::Function) {
        throw rift::core::JavaScriptException(Value("TypeError: callback is not a function"));
    }

    auto* callback = dynamic_cast<JSFunction*>(args[0].getObject());
    if(callback == nullptr) {
        throw rift::core::JavaScriptException(Value("TypeError: callback is not a function"));
    }

    Value thisArg = args.size() > 1 ? args[1] : Value();

    // Steps 4-6: Let entries be M.[[MapData]]. Let index be 0.
    auto* entries = entriesVal.getObject();
    int nextIndex = static_cast<int>(nextIndexVal.toNumber());

    // Step 7: Repeat, while index < numEntries,
    // INCOMPLETE: Steps 7c.ii-iii (re-reading numEntries after each callback
    // to account for entries added during iteration) not fully implemented.
    // Rift uses the snapshot of [[MapNextIndex]] taken before the loop.
    for(int i = 0; i < nextIndex; i++) {
        Value entryVal = entries->getProperty(std::to_string(i));

        // Step 7c: If e.[[Key]] is not empty, then ...
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

        // Step 7c.i: Perform ? Call(callbackfn, thisArg, << e.[[Value]], e.[[Key]], M >>).
        CallContext cbCtx = ctx;
        cbCtx.thisValue = thisArg;
        callback->call(cbCtx, {value, key, ctx.thisValue});
    }

    // Step 8: Return undefined.
    return Value();  // undefined
}

// 24.1.3.8 Map.prototype.keys ( )
// @spec https://tc39.es/ecma262/#sec-map.prototype.keys
//
// Spec algorithm:
//   1. Let M be the this value.
//   2. Perform ? RequireInternalSlot(M, [[MapData]]).
//   3. Return CreateMapIterator(M, key).
/**
 * Map.prototype.keys()
 * Returns an iterator over keys.
 */
Value Map::keys(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    // Step 1: Let M be the this value.
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.keys called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    // Step 2: Perform ? RequireInternalSlot(M, [[MapData]]).
    Value entriesVal = mapObj->getProperty("[[MapEntries]]");
    if(entriesVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method Map.prototype.keys called on incompatible receiver"));
    }

    // Step 3: Return CreateMapIterator(M, key).
    auto* iterator = MapIterator::create(getObjectFactory(), mapObj, MapIterationKind::Key);
    return Value(iterator);
}

// 24.1.3.11 Map.prototype.values ( )
// @spec https://tc39.es/ecma262/#sec-map.prototype.values
//
// Spec algorithm:
//   1. Let M be the this value.
//   2. Perform ? RequireInternalSlot(M, [[MapData]]).
//   3. Return CreateMapIterator(M, value).
/**
 * Map.prototype.values()
 * Returns an iterator over values.
 */
Value Map::values(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    // Step 1: Let M be the this value.
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.values called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    // Step 2: Perform ? RequireInternalSlot(M, [[MapData]]).
    Value entriesVal = mapObj->getProperty("[[MapEntries]]");
    if(entriesVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method Map.prototype.values called on incompatible receiver"));
    }

    // Step 3: Return CreateMapIterator(M, value).
    auto* iterator = MapIterator::create(getObjectFactory(), mapObj, MapIterationKind::Value);
    return Value(iterator);
}

// 24.1.3.4 Map.prototype.entries ( )
// @spec https://tc39.es/ecma262/#sec-map.prototype.entries
//
// Spec algorithm:
//   1. Let M be the this value.
//   2. Perform ? RequireInternalSlot(M, [[MapData]]).
//   3. Return CreateMapIterator(M, key+value).
/**
 * Map.prototype.entries()
 * Returns an iterator over [key, value] pairs.
 * This is also the default iterator (Symbol.iterator).
 */
Value Map::entries(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    // Step 1: Let M be the this value.
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.entries called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    // Step 2: Perform ? RequireInternalSlot(M, [[MapData]]).
    Value entriesVal = mapObj->getProperty("[[MapEntries]]");
    if(entriesVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method Map.prototype.entries called on incompatible receiver"));
    }

    // Step 3: Return CreateMapIterator(M, key+value).
    auto* iterator = MapIterator::create(getObjectFactory(), mapObj, MapIterationKind::KeyValue);
    return Value(iterator);
}

// 24.1.3.10 get Map.prototype.size
// @spec https://tc39.es/ecma262/#sec-get-map.prototype.size
//
// Spec algorithm:
//   1. Let M be the this value.
//   2. Perform ? RequireInternalSlot(M, [[MapData]]).
//   3. Let count be 0.
//   4. For each Record { [[Key]], [[Value]] } p of M.[[MapData]], do
//      a. If p.[[Key]] is not empty, set count to count + 1.
//   5. Return count.
//
// SIMPLIFIED: Instead of counting non-empty entries (steps 3-4), Rift reads
// the pre-computed [[MapSize]] counter, which is maintained by set/delete/clear.
/**
 * Map.prototype.size (getter)
 * Returns the number of entries in the Map.
 */
Value Map::sizeGetter(const CallContext& ctx, const std::vector<Value>& /*args*/) {
    // Step 1: Let M be the this value.
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.size called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    // Step 2: Perform ? RequireInternalSlot(M, [[MapData]]).
    Value sizeVal = mapObj->getProperty("[[MapSize]]");
    if(sizeVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method get Map.prototype.size called on incompatible receiver"));
    }

    // Steps 3-5: Return count of non-empty entries.
    // SIMPLIFIED: Returns pre-computed [[MapSize]] instead of counting.
    return sizeVal;
}

// Map.prototype.getOrInsert ( key, value )
// @spec https://tc39.es/proposal-upsert/#sec-map.prototype.getorinsert
//
// Spec algorithm:
//   1. Let M be the this value.
//   2. Perform ? RequireInternalSlot(M, [[MapData]]).
//   3. For each Record { [[Key]], [[Value]] } p of M.[[MapData]], do
//      a. If p.[[Key]] is not empty and SameValueZero(p.[[Key]], key) is true,
//         return p.[[Value]].
//   4. Let key be CanonicalizeKeyedCollectionKey(key).
//   5. Let p be the Record { [[Key]]: key, [[Value]]: value }.
//   6. Append p to M.[[MapData]].
//   7. Return value.
Value Map::getOrInsert(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Let M be the this value.
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.getOrInsert called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    // Step 2: Perform ? RequireInternalSlot(M, [[MapData]]).
    Value entriesVal = mapObj->getProperty("[[MapEntries]]");
    Value keysVal = mapObj->getProperty("[[MapKeys]]");
    Value sizeVal = mapObj->getProperty("[[MapSize]]");
    Value nextIndexVal = mapObj->getProperty("[[MapNextIndex]]");

    if(entriesVal.isUndefined() || keysVal.isUndefined()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Method Map.prototype.getOrInsert called on incompatible receiver"));
    }

    Value key = args.empty() ? Value() : args[0];
    Value value = args.size() > 1 ? args[1] : Value();

    // Step 3: Search for existing entry using SameValueZero.
    std::string keyStr = valueToMapKey(key);
    auto* keys = keysVal.getObject();
    Value existingIndex = keys->getProperty(keyStr);

    if(!existingIndex.isUndefined()) {
        // Step 3a: Key found — return existing value.
        auto* entries = entriesVal.getObject();
        int idx = static_cast<int>(existingIndex.toNumber());
        Value entryVal = entries->getProperty(std::to_string(idx));

        if(entryVal.getType() == ValueType::Object) {
            auto* entry = entryVal.getObject();
            return entry->getProperty("value");
        }
    }

    // Step 4: Let key be CanonicalizeKeyedCollectionKey(key).
    // Normalize -0 to +0.
    if(key.getType() == ValueType::Number && key.toNumber() == 0.0) {
        key = Value(0.0);
    }

    // Steps 5-6: Create new entry and append.
    double nextIndex = nextIndexVal.toNumber();
    double size = sizeVal.toNumber();

    auto* entry = getObjectFactory()->createJSObject();
    entry->setProperty("key", key);
    entry->setProperty("value", value);

    auto* entries = entriesVal.getObject();
    entries->setProperty(std::to_string(static_cast<int>(nextIndex)), Value(entry));
    keys->setProperty(valueToMapKey(key), Value(nextIndex));

    mapObj->setProperty("[[MapSize]]", Value(size + 1));
    mapObj->setProperty("[[MapNextIndex]]", Value(nextIndex + 1));

    // Step 7: Return value.
    return value;
}

// Map.prototype.getOrInsertComputed ( key, callbackfn )
// @spec https://tc39.es/proposal-upsert/#sec-map.prototype.getorinsertcomputed
//
// Spec algorithm:
//   1. Let M be the this value.
//   2. Perform ? RequireInternalSlot(M, [[MapData]]).
//   3. If IsCallable(callbackfn) is false, throw a TypeError exception.
//   4. For each Record { [[Key]], [[Value]] } p of M.[[MapData]], do
//      a. If p.[[Key]] is not empty and SameValueZero(p.[[Key]], key) is true,
//         return p.[[Value]].
//   5. Let key be CanonicalizeKeyedCollectionKey(key).
//   6. Let value be ? Call(callbackfn, undefined, << key >>).
//   7. For each Record { [[Key]], [[Value]] } p of M.[[MapData]], do
//      a. If p.[[Key]] is not empty and SameValueZero(p.[[Key]], key) is true, then
//         i. Set p.[[Value]] to value.
//         ii. Return value.
//   8. Let p be the Record { [[Key]]: key, [[Value]]: value }.
//   9. Append p to M.[[MapData]].
//   10. Return value.
Value Map::getOrInsertComputed(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Let M be the this value.
    if(ctx.thisValue.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Map.prototype.getOrInsertComputed called on non-object"));
    }

    auto* mapObj = ctx.thisValue.getObject();

    // Step 2: Perform ? RequireInternalSlot(M, [[MapData]]).
    Value entriesVal = mapObj->getProperty("[[MapEntries]]");
    Value keysVal = mapObj->getProperty("[[MapKeys]]");

    if(entriesVal.isUndefined() || keysVal.isUndefined()) {
        throw rift::core::JavaScriptException(Value(
            "TypeError: Method Map.prototype.getOrInsertComputed called on incompatible receiver"));
    }

    Value key = args.empty() ? Value() : args[0];
    Value callbackfn = args.size() > 1 ? args[1] : Value();

    // Step 3: If IsCallable(callbackfn) is false, throw a TypeError exception.
    if(callbackfn.getType() != ValueType::Function) {
        throw rift::core::JavaScriptException(Value("TypeError: callbackfn is not a function"));
    }

    auto* callback = dynamic_cast<JSFunction*>(callbackfn.getObject());
    if(callback == nullptr) {
        throw rift::core::JavaScriptException(Value("TypeError: callbackfn is not a function"));
    }

    // Step 4: Search for existing entry using SameValueZero.
    std::string keyStr = valueToMapKey(key);
    auto* keys = keysVal.getObject();
    Value existingIndex = keys->getProperty(keyStr);

    if(!existingIndex.isUndefined()) {
        // Step 4a: Key found — return existing value without calling callback.
        auto* entries = entriesVal.getObject();
        int idx = static_cast<int>(existingIndex.toNumber());
        Value entryVal = entries->getProperty(std::to_string(idx));

        if(entryVal.getType() == ValueType::Object) {
            auto* entry = entryVal.getObject();
            return entry->getProperty("value");
        }
    }

    // Step 5: Let key be CanonicalizeKeyedCollectionKey(key).
    if(key.getType() == ValueType::Number && key.toNumber() == 0.0) {
        key = Value(0.0);
    }

    // Step 6: Let value be ? Call(callbackfn, undefined, << key >>).
    CallContext cbCtx = ctx;
    cbCtx.thisValue = Value();  // undefined
    Value value = callback->call(cbCtx, {key});

    // Step 7: Re-scan after callback (callback may have mutated the map).
    keyStr = valueToMapKey(key);
    existingIndex = keys->getProperty(keyStr);

    if(!existingIndex.isUndefined()) {
        // Step 7a: Key was inserted during callback — overwrite with computed value.
        auto* entries = entriesVal.getObject();
        int idx = static_cast<int>(existingIndex.toNumber());
        Value entryVal = entries->getProperty(std::to_string(idx));

        if(entryVal.getType() == ValueType::Object) {
            auto* entry = entryVal.getObject();
            entry->setProperty("value", value);
            return value;
        }
    }

    // Steps 8-9: Create new entry and append.
    Value sizeVal = mapObj->getProperty("[[MapSize]]");
    Value nextIndexVal = mapObj->getProperty("[[MapNextIndex]]");
    double nextIndex = nextIndexVal.toNumber();
    double size = sizeVal.toNumber();

    auto* entry = getObjectFactory()->createJSObject();
    entry->setProperty("key", key);
    entry->setProperty("value", value);

    auto* entries = entriesVal.getObject();
    entries->setProperty(std::to_string(static_cast<int>(nextIndex)), Value(entry));
    keys->setProperty(valueToMapKey(key), Value(nextIndex));

    mapObj->setProperty("[[MapSize]]", Value(size + 1));
    mapObj->setProperty("[[MapNextIndex]]", Value(nextIndex + 1));

    // Step 10: Return value.
    return value;
}

// 24.1.2.1 Map.groupBy ( items, callbackfn )
// @spec https://tc39.es/ecma262/#sec-map.groupby
//
// Spec algorithm:
//   1. Let groups be ? GroupBy(items, callbackfn, collection).
//   2. Let map be ! Construct(%Map%).
//   3. For each Record { [[Key]], [[Elements]] } g of groups, do
//      a. Let elements be CreateArrayFromList(g.[[Elements]]).
//      b. Let entry be the Record { [[Key]]: g.[[Key]], [[Value]]: elements }.
//      c. Append entry to map.[[MapData]].
//   4. Return map.
Value Map::groupBy(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let items be the first argument.
    Value items = args.size() > 0 ? args[0] : Value();
    Value callback = args.size() > 1 ? args[1] : Value();

    // Validate items is not null/undefined
    if(items.isUndefined() || items.isNull()) {
        throw rift::core::JavaScriptException(Value("TypeError: Cannot read properties of " +
                                                    items.toString() +
                                                    " (reading 'Symbol(Symbol.iterator)')"));
    }

    // Validate callbackfn is callable
    if(callback.getType() != ValueType::Function) {
        throw rift::core::JavaScriptException(
            Value("TypeError: " + callback.toString() + " is not a function"));
    }

    auto* callback_func = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callback_func) {
        throw rift::core::JavaScriptException(Value("TypeError: callbackfn is not a function"));
    }

    auto* factory = getObjectFactory();

    // 2. Let map be ! Construct(%Map%).
    auto* mapObj = createMapObject(factory);
    rift::memory::GCProtector protect(mapObj, factory->getObjectManager());

    // We need to track group keys in insertion order, and for each key maintain an array.
    // Unlike Object.groupBy, Map.groupBy uses SameValueZero for keys (not ToString).
    // We collect groups inline: for each element, look up by key in the map,
    // create array if new, push element.

    auto* entries = mapObj->getProperty("[[MapEntries]]").getObject();
    auto* keys = mapObj->getProperty("[[MapKeys]]").getObject();
    double size = 0.0;
    double nextIndex = 0.0;

    double index = 0;
    auto processElement = [&](const Value& value) {
        // Call callbackfn(value, index)
        rift::core::CallContext cb_ctx(rift::core::CallType::Function, Value());
        Value key_result = callback_func->call(cb_ctx, {value, Value(index)});

        // Normalize -0 to +0 for map keys
        if(key_result.getType() == ValueType::Number && key_result.toNumber() == 0.0) {
            key_result = Value(0.0);
        }

        std::string keyStr = valueToMapKey(key_result);

        Value existingIdx = keys->getProperty(keyStr);
        if(!existingIdx.isUndefined()) {
            // Existing group — push element to its array
            int idx = static_cast<int>(existingIdx.toNumber());
            auto* entry = entries->getProperty(std::to_string(idx)).getObject();
            Value arr_val = entry->getProperty("value");
            auto* arr = arr_val.getObject();
            Value length_val = arr->getProperty("length");
            double length = length_val.toNumber();
            arr->setProperty(std::to_string(static_cast<int>(length)), value);
            arr->setProperty("length", Value(length + 1));
        } else {
            // New group — create array with this element, add entry to map
            auto* group_array = Array::createArrayObject(factory, {value});

            auto* entry = factory->createJSObject();
            entry->setProperty("key", key_result);
            entry->setProperty("value", Value(group_array));

            entries->setProperty(std::to_string(static_cast<int>(nextIndex)), Value(entry));
            keys->setProperty(keyStr, Value(nextIndex));
            nextIndex++;
            size++;
        }

        index++;
    };

    // String fast path
    if(items.isString()) {
        std::string str = items.getString();
        for(char c : str) {
            processElement(Value(std::string(1, c)));
        }
        mapObj->setProperty("[[MapSize]]", Value(size));
        mapObj->setProperty("[[MapNextIndex]]", Value(nextIndex));
        return Value(mapObj);
    }

    // Iterator protocol
    if(!items.isObject() && !items.isFunction()) {
        throw rift::core::JavaScriptException(Value("TypeError: items is not iterable"));
    }

    auto* items_obj = items.getObject();
    std::string iterator_key =
        rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());
    Value iterator_method = items_obj->getProperty(iterator_key);

    if(iterator_method.getType() != ValueType::Function) {
        throw rift::core::JavaScriptException(Value(
            "TypeError: items is not iterable (cannot read property Symbol(Symbol.iterator))"));
    }

    auto* iterator_func = dynamic_cast<JSFunction*>(iterator_method.getObject());
    if(!iterator_func) {
        throw rift::core::JavaScriptException(Value("TypeError: items is not iterable"));
    }

    rift::core::CallContext iter_ctx(rift::core::CallType::Function, items);
    Value iterator = iterator_func->call(iter_ctx, {});

    if(!iterator.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Result of the Symbol.iterator method is not an object"));
    }

    auto* iterator_object = iterator.getObject();

    while(true) {
        Value next_method = iterator_object->getProperty("next");
        if(next_method.getType() != ValueType::Function) {
            break;
        }

        auto* next_func = dynamic_cast<JSFunction*>(next_method.getObject());
        if(!next_func) {
            break;
        }

        rift::core::CallContext next_ctx(rift::core::CallType::Function, iterator);
        Value iter_result = next_func->call(next_ctx, {});

        if(!iter_result.isObject()) {
            break;
        }

        auto* result_object = iter_result.getObject();
        Value done = result_object->getProperty("done");
        if(done.toBool()) {
            break;
        }

        Value value = result_object->getProperty("value");
        processElement(value);
    }

    mapObj->setProperty("[[MapSize]]", Value(size));
    mapObj->setProperty("[[MapNextIndex]]", Value(nextIndex));
    return Value(mapObj);
}

JSObject* Map::getGlobalPrototype() {
    return rift::core::BuiltinManager::getMapPrototype();
}

}  // namespace rift::builtins
