#include "rift/builtins/weakset/weakset.h"

#include <sstream>

#include "rift/builtins/symbol/symbol.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/memory/gc_protector.h"
#include "rift/runtime/values/object.h"

// ============================================================================
// ECMA-262 -- WeakSet Objects (24.4)
// @spec https://tc39.es/ecma262/#sec-weakset-objects
// Covers: WeakSet constructor (24.4.1), WeakSet.prototype methods (24.4.3):
//         add, delete, has
// See also: weakmap/weakmap.cpp (24.3), set/set.cpp (24.2)
// ============================================================================

namespace rift::builtins {

// ============================================================================
// Setup Methods
// ============================================================================

// 24.4.2 Properties of the WeakSet Constructor
// @spec https://tc39.es/ecma262/#sec-properties-of-the-weakset-constructor
void WeakSet::setupStaticMethods(JSObject* /*constructor*/,
                                 rift::memory::ObjectFactory* /*factory*/) {
    // WeakSet has no static methods in ES2025
}

// 24.4.3 Properties of the WeakSet Prototype Object
// @spec https://tc39.es/ecma262/#sec-properties-of-the-weakset-prototype-object
void WeakSet::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    RIFT_METHOD(prototype, "add", WeakSet::add);              // 24.4.3.1
    RIFT_METHOD(prototype, "has", WeakSet::has);              // 24.4.3.4
    RIFT_METHOD(prototype, "delete", WeakSet::deleteMethod);  // 24.4.3.3

    // WeakSet is NOT iterable - no Symbol.iterator, no keys/values/entries/forEach
    // No size property either

    // TODO: 24.4.3.5 WeakSet.prototype [ @@toStringTag ]
    // @spec https://tc39.es/ecma262/#sec-weakset.prototype-@@tostringtag
    // The initial value is "WeakSet". Not yet implemented.
}

// ============================================================================
// Helper Methods
// ============================================================================

/**
 * Check if a value is valid for WeakSet.
 * Corresponds to the CanBeHeldWeakly abstract operation (7.2.16).
 * @spec https://tc39.es/ecma262/#sec-canbeheldweakly
 *
 * Per spec, an object or a non-registered symbol can be held weakly.
 * SIMPLIFIED: Rift only accepts objects/functions as weak values;
 * registered symbols as weak values are not yet supported.
 */
bool WeakSet::isValidWeakValue(const Value& val) {
    return val.getType() == ValueType::Object || val.getType() == ValueType::Function;
}

/**
 * Convert an object pointer to a unique string key for internal lookup.
 * NON-STANDARD: This is a Rift implementation detail. The spec uses a List
 * of values searched by identity (SameValue); Rift uses pointer-based string
 * keys for O(1) lookup instead of linear scanning.
 */
std::string WeakSet::objectToWeakKey(JSObject* obj) {
    std::ostringstream oss;
    oss << "ws:" << static_cast<const void*>(obj);
    return oss.str();
}

/**
 * Create an empty WeakSet object with internal slots initialized.
 * Sets up the [[WeakSetData]] internal slot required by the spec.
 * DEVIATION: The spec defines [[WeakSetData]] as a List of values.
 * Rift stores entries in a JSObject keyed by pointer-based string
 * identifiers for O(1) lookup, with weak references for GC integration.
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

// 24.4.1.1 WeakSet ( [ iterable ] )
// @spec https://tc39.es/ecma262/#sec-weakset-iterable
Value WeakSet::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    auto* factory = getObjectFactory();

    // 1. If NewTarget is undefined, throw a TypeError exception.
    // SIMPLIFIED: Rift does not distinguish NewTarget; always creates a new object.

    // 2. Let set be ? OrdinaryCreateFromConstructor(NewTarget, "%WeakSet.prototype%",
    //    << [[WeakSetData]] >>).
    // 3. Set set.[[WeakSetData]] to a new empty List.
    auto* weakSetObj = createWeakSetObject(factory);
    rift::memory::GCProtector protect(weakSetObj, factory->getObjectManager());

    // 4. If iterable is either undefined or null, return set.
    if(args.empty() || args[0].isUndefined() || args[0].isNull()) {
        return Value(weakSetObj);
    }

    const Value& iterable = args[0];

    // 5. Let adder be ? Get(set, "add").
    // 6. If IsCallable(adder) is false, throw a TypeError exception.
    // SIMPLIFIED: Rift calls the internal add logic directly rather than
    // looking up the "add" method on the new WeakSet object.

    // Get internal storage
    Value entriesVal = weakSetObj->getProperty("[[WeakSetData]]");
    if(entriesVal.getType() != ValueType::Object) {
        throw rift::core::JavaScriptException(Value("TypeError: WeakSet internal slots corrupted"));
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
                CallContext nextCtx = ctx;
                nextCtx.thisValue = iterator;
                Value result = nextFunc->call(nextCtx, {});

                if(result.getType() != ValueType::Object) {
                    throw rift::core::JavaScriptException(
                        Value("TypeError: Iterator result is not an object"));
                }

                auto* resultObj = result.getObject();
                Value done = resultObj->getProperty("done");

                // a. If next is done, return set.
                if(done.toBool()) {
                    break;
                }

                // b. Let nextValue be next.
                Value val = resultObj->getProperty("value");

                // c. Let status be Completion(Call(adder, set, << nextValue >>)).
                // SIMPLIFIED: Rift validates and inserts directly instead of calling adder.
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
            // DEVIATION: Fallback array-like access for iterables without Symbol.iterator.
            // The spec requires Symbol.iterator; this is a Rift convenience fallback.
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

// 24.4.3.1 WeakSet.prototype.add ( value )
// @spec https://tc39.es/ecma262/#sec-weakset.prototype.add
Value WeakSet::add(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let S be the this value.
    // 2. Perform ? RequireInternalSlot(S, [[WeakSetData]]).
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

    // 3. If CanBeHeldWeakly(value) is false, throw a TypeError exception.
    if(!isValidWeakValue(val)) {
        throw rift::core::JavaScriptException(Value("TypeError: Invalid value used in weak set"));
    }

    auto* entries = entriesVal.getObject();
    auto* valObj = val.getObject();
    std::string keyStr = objectToWeakKey(valObj);

    // 4. For each element e of S.[[WeakSetData]], do
    //    a. If e is not empty and SameValue(e, value) is true, return S.
    // DEVIATION: Rift uses pointer-based O(1) lookup instead of linear List scan.
    Value existingEntry = entries->getProperty(keyStr);
    if(existingEntry.isUndefined()) {
        // 5. Append value to S.[[WeakSetData]].
        auto* factory = getObjectFactory();
        auto* entry = factory->createJSObject();
        entry->setWeakProperty("value", val);  // Weak reference

        entries->setProperty(keyStr, Value(entry));
    }

    // 6. Return S.
    return ctx.thisValue;
}

// 24.4.3.4 WeakSet.prototype.has ( value )
// @spec https://tc39.es/ecma262/#sec-weakset.prototype.has
Value WeakSet::has(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let S be the this value.
    // 2. Perform ? RequireInternalSlot(S, [[WeakSetData]]).
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

    // If value cannot be held weakly, it is never in the set — return false.
    // (Spec steps 3-4 only iterate [[WeakSetData]] for object/symbol values.)
    if(!isValidWeakValue(val)) {
        return Value(false);
    }

    auto* valObj = val.getObject();
    std::string keyStr = objectToWeakKey(valObj);

    // 3. For each element e of S.[[WeakSetData]], do
    //    a. If e is not empty and SameValue(e, value) is true, return true.
    // DEVIATION: Rift uses pointer-based O(1) lookup instead of linear List scan.
    auto* entries = entriesVal.getObject();
    Value entryVal = entries->getProperty(keyStr);

    if(entryVal.isUndefined()) {
        // 4. Return false.
        return Value(false);
    }

    // NON-STANDARD: Lazy GC cleanup — check if the value object still exists.
    // The spec relies on the implementation's GC to remove empty entries.
    auto* factory = getObjectFactory();
    if(!factory->getObjectManager()->objectExists(valObj)) {
        entries->deleteProperty(keyStr);
        return Value(false);
    }

    return Value(true);
}

// 24.4.3.3 WeakSet.prototype.delete ( value )
// @spec https://tc39.es/ecma262/#sec-weakset.prototype.delete
Value WeakSet::deleteMethod(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let S be the this value.
    // 2. Perform ? RequireInternalSlot(S, [[WeakSetData]]).
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

    // If value cannot be held weakly, it is never in the set — return false.
    if(!isValidWeakValue(val)) {
        return Value(false);
    }

    auto* valObj = val.getObject();
    std::string keyStr = objectToWeakKey(valObj);

    // 3. For each element e of S.[[WeakSetData]], do
    //    a. If e is not empty and SameValue(e, value) is true, then
    //       i. Replace the element of S.[[WeakSetData]] whose value is e
    //          with an element whose value is empty.
    //       ii. Return true.
    // DEVIATION: Rift uses pointer-based O(1) lookup and deleteProperty instead
    // of linear List scan and replacing with empty.
    auto* entries = entriesVal.getObject();
    Value entryVal = entries->getProperty(keyStr);

    if(entryVal.isUndefined()) {
        // 4. Return false.
        return Value(false);
    }

    entries->deleteProperty(keyStr);

    return Value(true);
}

JSObject* WeakSet::getGlobalPrototype() {
    return rift::core::BuiltinManager::getWeakSetPrototype();
}

}  // namespace rift::builtins
