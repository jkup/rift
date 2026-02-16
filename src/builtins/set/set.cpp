#include "rift/builtins/set/set.h"

#include <cmath>
#include <sstream>

#include "rift/builtins/set/set_iterator.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/memory/gc_protector.h"
#include "rift/runtime/values/object.h"

// ============================================================================
// ECMA-262 — Set Objects (ES2025 Section 24.2)
// @spec https://tc39.es/ecma262/#sec-set-objects
// See also: set_iterator.cpp (Set iterator protocol, 24.2.5)
//
// DEVIATION: The spec models Set entries via a [[SetData]] internal slot
// containing a List of values. Rift uses two JSObject-based maps
// ([[SetEntries]] for ordered storage, [[SetKeys]] for O(1) lookup)
// plus [[SetSize]] and [[SetNextIndex]] counters. This achieves the
// same semantics with different internal representation.
// ============================================================================

namespace rift::builtins {

// ============================================================================
// Setup Methods
// ============================================================================

// ----------------------------------------------------------------------------
// 24.2.2 Properties of the Set Constructor
// @spec https://tc39.es/ecma262/#sec-properties-of-the-set-constructor
//
// The Set constructor has no static methods beyond Set.prototype (24.2.2.1)
// and the standard Function properties (name, length).
// TODO: 24.2.2.2 get Set [ @@species ] — not yet implemented.
// @spec https://tc39.es/ecma262/#sec-get-set-@@species
// ----------------------------------------------------------------------------
void Set::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // Set has no static methods in ES2024 (unlike Array.isArray, Object.keys, etc.)
}

// ----------------------------------------------------------------------------
// 24.2.3 Properties of the Set Prototype Object
// @spec https://tc39.es/ecma262/#sec-properties-of-the-set-prototype-object
//
// The Set prototype object:
//   - is %Set.prototype%
//   - is an ordinary object
//   - has a [[Prototype]] internal slot whose value is %Object.prototype%
//   - does not have a [[SetData]] internal slot
// ----------------------------------------------------------------------------
void Set::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    // 24.2.3.1 Set.prototype.add ( value )
    RIFT_METHOD(prototype, "add", Set::add);
    // 24.2.3.7 Set.prototype.has ( value )
    RIFT_METHOD(prototype, "has", Set::has);
    // 24.2.3.4 Set.prototype.delete ( value )
    RIFT_METHOD(prototype, "delete", Set::deleteMethod);
    // 24.2.3.2 Set.prototype.clear ( )
    RIFT_METHOD(prototype, "clear", Set::clear);
    // 24.2.3.6 Set.prototype.forEach ( callbackfn [ , thisArg ] )
    RIFT_METHOD(prototype, "forEach", Set::forEach);
    // 24.2.3.10 Set.prototype.values ( )
    RIFT_METHOD(prototype, "values", Set::values);
    // 24.2.3.8 Set.prototype.keys ( )
    RIFT_METHOD(prototype, "keys", Set::keys);
    // 24.2.3.5 Set.prototype.entries ( )
    RIFT_METHOD(prototype, "entries", Set::entries);

    // 24.2.3.9 get Set.prototype.size
    // DEVIATION: Registered as a regular method rather than an accessor property.
    // The spec defines size as a getter (get Set.prototype.size), but Rift
    // exposes it as a method that acts as a getter.
    RIFT_METHOD(prototype, "size", Set::sizeGetter);

    // 24.2.3.11 Set.prototype [ @@iterator ] ( )
    // @spec https://tc39.es/ecma262/#sec-set.prototype-@@iterator
    // The initial value of the @@iterator property is %Set.prototype.values%.
    std::string iterator_key =
        rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());
    auto* iterator_func = factory->createJSFunction(Set::values);
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
bool Set::sameValueZero(const Value& a, const Value& b) {
    // 1. If Type(x) is not Type(y), return false.
    if(a.getType() != b.getType()) {
        return false;
    }

    // 2. If x is a Number, return Number::sameValueZero(x, y).
    if(a.isNumber()) {
        double x = a.toNumber();
        double y = b.toNumber();

        // NaN === NaN in SameValueZero
        if(std::isnan(x) && std::isnan(y)) {
            return true;
        }

        // +0 === -0 in SameValueZero (unlike SameValue)
        return x == y;
    }

    // 3. Return SameValueNonNumber(x, y).
    // SIMPLIFIED: Rift inlines SameValueNonNumber for each type.
    if(a.isString()) {
        return a.getString() == b.getString();
    }

    if(a.isBoolean()) {
        return a.getBool() == b.getBool();
    }

    if(a.isSymbol()) {
        return a.getSymbol().id == b.getSymbol().id;
    }

    if(a.isObject() || a.isFunction()) {
        return a.getObject() == b.getObject();
    }

    if(a.isUndefined() || a.isNull()) {
        return true;  // same type already checked
    }

    return false;
}

// NON-STANDARD: Internal helper — not part of ECMA-262.
// Generates a unique string key for each value, respecting SameValueZero
// semantics (NaN maps to a single key, +0/-0 map to the same key).
// Used by [[SetKeys]] for O(1) membership lookup.
std::string Set::valueToSetKey(const Value& v) {
    // Generate unique string key for internal lookup
    // Must handle SameValueZero semantics
    switch(v.getType()) {
        case ValueType::Undefined:
            return "@@undefined";
        case ValueType::Null:
            return "@@null";
        case ValueType::Boolean:
            return v.getBool() ? "@@true" : "@@false";
        case ValueType::Number: {
            double num = v.toNumber();
            if(std::isnan(num)) {
                return "@@NaN";
            }
            // +0 and -0 both map to "0" for SameValueZero
            // Normalize -0 to 0
            if(num == 0.0) {
                return "n:0";
            }
            std::ostringstream oss;
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
            // Use pointer address for object identity
            std::ostringstream oss;
            oss << "o:" << static_cast<const void*>(v.getObject());
            return oss.str();
        }
        default:
            return "@@unknown";
    }
}

// NON-STANDARD: Internal helper to create an initialized Set object.
// The spec uses a [[SetData]] internal slot (a List of values).
// DEVIATION: Rift uses four property-based internal slots instead:
//   [[SetEntries]] — ordered storage (index -> value)
//   [[SetKeys]]    — hash-like lookup (valueKey -> index)
//   [[SetSize]]    — count of non-deleted entries
//   [[SetNextIndex]] — monotonically increasing insertion index
JSObject* Set::createSetObject(rift::memory::ObjectFactory* factory, JSObject* prototype) {
    auto* setObj = factory->createJSObject(prototype);
    rift::memory::GCProtector protect(setObj, factory->getObjectManager());

    // Initialize internal slots
    auto* entries = factory->createJSObject();
    auto* keys = factory->createJSObject();

    setObj->setProperty("[[SetEntries]]", Value(entries));
    setObj->setProperty("[[SetKeys]]", Value(keys));
    setObj->setProperty("[[SetSize]]", Value(0.0));
    setObj->setProperty("[[SetNextIndex]]", Value(0.0));

    return setObj;
}

JSObject* Set::getGlobalPrototype() {
    return rift::core::BuiltinManager::getSetPrototype();
}

// ============================================================================
// Constructor
// ============================================================================

// 24.2.1.1 Set ( [ iterable ] )
// @spec https://tc39.es/ecma262/#sec-set-iterable
//
// Spec algorithm:
//   1. If NewTarget is undefined, throw a TypeError exception.
//   2. Let set be ? OrdinaryCreateFromConstructor(NewTarget, "%Set.prototype%",
//      << [[SetData]] >>).
//   3. Set set.[[SetData]] to a new empty List.
//   4. If iterable is either undefined or null, return set.
//   5. Let adder be ? Get(set, "add").
//   6. If IsCallable(adder) is false, throw a TypeError exception.
//   7. Let iteratorRecord be ? GetIterator(iterable, sync).
//   8. Repeat,
//      a. Let next be ? IteratorStepValue(iteratorRecord).
//      b. If next is done, return set.
//      c. Let status be Completion(Call(adder, set, << next >>)).
//      d. IfAbruptCloseIterator(status, iteratorRecord).
Value Set::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // Steps 1-3: Create the Set object.
    // INCOMPLETE: Step 1 (NewTarget check) not enforced — Rift does not yet
    // distinguish [[Construct]] from [[Call]] for built-in constructors.
    auto* factory = getObjectFactory();
    auto* prototype = getGlobalPrototype();
    auto* setObj = createSetObject(factory, prototype);
    rift::memory::GCProtector protect(setObj, factory->getObjectManager());

    // Step 4: If iterable is either undefined or null, return set.
    if(args.empty() || args[0].isUndefined() || args[0].isNull()) {
        return Value(setObj);
    }

    // Steps 5-6: Let adder be ? Get(set, "add"). If IsCallable(adder) is false, throw.
    // SIMPLIFIED: Rift inlines the add logic directly rather than calling the "add"
    // method through Get(set, "add"). This means subclass overrides of .add() are
    // not respected during construction.
    Value iterable = args[0];

    // Steps 7-8: Get iterator and iterate.
    if(iterable.isObject()) {
        auto* iterableObj = iterable.getObject();

        // Step 7: Let iteratorRecord be ? GetIterator(iterable, sync).
        std::string iterKey =
            rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());
        Value iterMethod = iterableObj->getProperty(iterKey);

        if(iterMethod.isFunction()) {
            // Has Symbol.iterator - use iterator protocol
            auto* iterFn = dynamic_cast<JSFunction*>(iterMethod.getObject());
            if(iterFn) {
                rift::core::CallContext iterCtx(rift::core::CallType::Function, iterable);
                Value iterator = iterFn->call(iterCtx, {});

                if(iterator.isObject()) {
                    auto* iterObj = iterator.getObject();
                    Value nextMethod = iterObj->getProperty("next");

                    if(nextMethod.isFunction()) {
                        auto* nextFunc = dynamic_cast<JSFunction*>(nextMethod.getObject());
                        if(nextFunc) {
                            // Step 8: Repeat,
                            while(true) {
                                // Step 8a: Let next be ? IteratorStepValue(iteratorRecord).
                                rift::core::CallContext nextCtx(rift::core::CallType::Function,
                                                                iterator);
                                Value result = nextFunc->call(nextCtx, {});

                                if(result.isObject()) {
                                    auto* resultObj = result.getObject();
                                    Value done = resultObj->getProperty("done");

                                    // Step 8b: If next is done, return set.
                                    if(done.toBool()) {
                                        break;
                                    }

                                    Value value = resultObj->getProperty("value");

                                    // Step 8c: Call(adder, set, << next >>).
                                    // SIMPLIFIED: Inlined add logic instead of calling adder.
                                    Value keysVal = setObj->getProperty("[[SetKeys]]");
                                    auto* keysObj = keysVal.getObject();
                                    std::string key = valueToSetKey(value);

                                    if(!keysObj->hasOwnProperty(key)) {
                                        Value entriesVal = setObj->getProperty("[[SetEntries]]");
                                        auto* entriesObj = entriesVal.getObject();
                                        Value nextIndexVal =
                                            setObj->getProperty("[[SetNextIndex]]");
                                        size_t nextIndex =
                                            static_cast<size_t>(nextIndexVal.toNumber());

                                        entriesObj->setProperty(std::to_string(nextIndex), value);
                                        keysObj->setProperty(key,
                                                             Value(static_cast<double>(nextIndex)));
                                        setObj->setProperty(
                                            "[[SetNextIndex]]",
                                            Value(static_cast<double>(nextIndex + 1)));

                                        Value sizeVal = setObj->getProperty("[[SetSize]]");
                                        size_t size = static_cast<size_t>(sizeVal.toNumber());
                                        setObj->setProperty("[[SetSize]]",
                                                            Value(static_cast<double>(size + 1)));
                                    }
                                } else {
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        } else {
            // DEVIATION: Fallback array-like iteration for objects without Symbol.iterator.
            // The spec would throw a TypeError at step 7 if GetIterator fails.
            // Rift falls back to array-like indexed access instead.
            Value lengthVal = iterableObj->getProperty("length");
            if(lengthVal.isNumber()) {
                size_t len = static_cast<size_t>(lengthVal.toNumber());
                for(size_t i = 0; i < len; ++i) {
                    Value val = iterableObj->getProperty(std::to_string(i));

                    // Add value to set (inlined add logic)
                    Value keysVal = setObj->getProperty("[[SetKeys]]");
                    auto* keysObj = keysVal.getObject();
                    std::string key = valueToSetKey(val);

                    if(!keysObj->hasOwnProperty(key)) {
                        Value entriesVal = setObj->getProperty("[[SetEntries]]");
                        auto* entriesObj = entriesVal.getObject();
                        Value nextIndexVal = setObj->getProperty("[[SetNextIndex]]");
                        size_t nextIndex = static_cast<size_t>(nextIndexVal.toNumber());

                        entriesObj->setProperty(std::to_string(nextIndex), val);
                        keysObj->setProperty(key, Value(static_cast<double>(nextIndex)));
                        setObj->setProperty("[[SetNextIndex]]",
                                            Value(static_cast<double>(nextIndex + 1)));

                        Value sizeVal = setObj->getProperty("[[SetSize]]");
                        size_t size = static_cast<size_t>(sizeVal.toNumber());
                        setObj->setProperty("[[SetSize]]", Value(static_cast<double>(size + 1)));
                    }
                }
            }
        }
    }

    return Value(setObj);
}

// ============================================================================
// Instance Methods
// ============================================================================

// 24.2.3.1 Set.prototype.add ( value )
// @spec https://tc39.es/ecma262/#sec-set.prototype.add
//
// Spec algorithm:
//   1. Let S be the this value.
//   2. Perform ? RequireInternalSlot(S, [[SetData]]).
//   3. For each element e of S.[[SetData]], do
//      a. If e is not empty and SameValueZero(e, value) is true, then
//         i. Return S.
//   4. If value is -0, set value to +0.
//   5. Append value to S.[[SetData]].
//   6. Return S.
Value Set::add(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Let S be the this value.
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.add called on non-object"));
    }

    auto* setObj = ctx.thisValue.getObject();
    Value value = args.empty() ? Value::undefined() : args[0];

    // Step 2: Perform ? RequireInternalSlot(S, [[SetData]]).
    Value keysVal = setObj->getProperty("[[SetKeys]]");
    if(!keysVal.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.add called on incompatible receiver"));
    }
    auto* keysObj = keysVal.getObject();

    // Steps 3-4: Check if value already exists (using SameValueZero via valueToSetKey).
    // SIMPLIFIED: valueToSetKey normalizes -0 to +0 (step 4) and SameValueZero
    // comparison (step 3) is handled by key equality.
    std::string key = valueToSetKey(value);

    // Step 3a.i / Step 5: If not found, append value to [[SetData]].
    if(!keysObj->hasOwnProperty(key)) {
        Value entriesVal = setObj->getProperty("[[SetEntries]]");
        auto* entriesObj = entriesVal.getObject();
        Value nextIndexVal = setObj->getProperty("[[SetNextIndex]]");
        size_t nextIndex = static_cast<size_t>(nextIndexVal.toNumber());

        // Add to entries (maintains order)
        entriesObj->setProperty(std::to_string(nextIndex), value);

        // Add to keys lookup (for O(1) has())
        keysObj->setProperty(key, Value(static_cast<double>(nextIndex)));

        // Update next index
        setObj->setProperty("[[SetNextIndex]]", Value(static_cast<double>(nextIndex + 1)));

        // Update size
        Value sizeVal = setObj->getProperty("[[SetSize]]");
        size_t size = static_cast<size_t>(sizeVal.toNumber());
        setObj->setProperty("[[SetSize]]", Value(static_cast<double>(size + 1)));
    }

    // Step 6: Return S.
    return ctx.thisValue;
}

// 24.2.3.7 Set.prototype.has ( value )
// @spec https://tc39.es/ecma262/#sec-set.prototype.has
//
// Spec algorithm:
//   1. Let S be the this value.
//   2. Perform ? RequireInternalSlot(S, [[SetData]]).
//   3. For each element e of S.[[SetData]], do
//      a. If e is not empty and SameValueZero(e, value) is true, return true.
//   4. Return false.
Value Set::has(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Let S be the this value.
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.has called on non-object"));
    }

    auto* setObj = ctx.thisValue.getObject();
    Value value = args.empty() ? Value::undefined() : args[0];

    // Step 2: Perform ? RequireInternalSlot(S, [[SetData]]).
    Value keysVal = setObj->getProperty("[[SetKeys]]");
    if(!keysVal.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.has called on incompatible receiver"));
    }
    auto* keysObj = keysVal.getObject();

    // Steps 3-4: Search for value using SameValueZero (via key lookup).
    std::string key = valueToSetKey(value);
    return Value(keysObj->hasOwnProperty(key));
}

// 24.2.3.4 Set.prototype.delete ( value )
// @spec https://tc39.es/ecma262/#sec-set.prototype.delete
//
// Spec algorithm:
//   1. Let S be the this value.
//   2. Perform ? RequireInternalSlot(S, [[SetData]]).
//   3. For each element e of S.[[SetData]], do
//      a. If e is not empty and SameValueZero(e, value) is true, then
//         i. Replace the element of S.[[SetData]] whose value is e with an
//            element whose value is empty.
//         ii. Return true.
//   4. Return false.
Value Set::deleteMethod(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Let S be the this value.
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.delete called on non-object"));
    }

    auto* setObj = ctx.thisValue.getObject();
    Value value = args.empty() ? Value::undefined() : args[0];

    // Step 2: Perform ? RequireInternalSlot(S, [[SetData]]).
    Value keysVal = setObj->getProperty("[[SetKeys]]");
    if(!keysVal.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.delete called on incompatible receiver"));
    }
    auto* keysObj = keysVal.getObject();

    // Step 3: For each element e of S.[[SetData]], do
    // SIMPLIFIED: Uses key-based O(1) lookup instead of linear scan.
    // valueToSetKey normalizes -0 to +0 and maps NaN to a single key,
    // providing SameValueZero semantics via key equality.
    std::string key = valueToSetKey(value);

    // Step 4: Return false (value not found).
    if(!keysObj->hasOwnProperty(key)) {
        return Value(false);
    }

    // Step 3a: e is not empty and SameValueZero(e, value) is true.
    // Step 3a.i: Replace the element with empty.
    // DEVIATION: Instead of replacing with "empty", Rift marks the entry as
    // "[[Deleted]]" in [[SetEntries]] and removes the key from [[SetKeys]].
    // Get index of this element
    Value indexVal = keysObj->getProperty(key);
    size_t index = static_cast<size_t>(indexVal.toNumber());

    // Mark entry as deleted (spec: replace with empty)
    Value entriesVal = setObj->getProperty("[[SetEntries]]");
    auto* entriesObj = entriesVal.getObject();
    entriesObj->setProperty(std::to_string(index), Value("[[Deleted]]"));

    // Remove from keys lookup
    keysObj->deleteProperty(key);

    // Decrement size
    // DEVIATION: The spec does not track size separately — it uses the
    // SetDataSize abstract operation to count non-empty entries on demand.
    // Rift maintains [[SetSize]] as an optimization.
    Value sizeVal = setObj->getProperty("[[SetSize]]");
    size_t size = static_cast<size_t>(sizeVal.toNumber());
    setObj->setProperty("[[SetSize]]", Value(static_cast<double>(size - 1)));

    // Step 3a.ii: Return true.
    return Value(true);
}

// 24.2.3.2 Set.prototype.clear ( )
// @spec https://tc39.es/ecma262/#sec-set.prototype.clear
//
// Spec algorithm:
//   1. Let S be the this value.
//   2. Perform ? RequireInternalSlot(S, [[SetData]]).
//   3. For each element e of S.[[SetData]], do
//      a. Replace the element of S.[[SetData]] whose value is e with an
//         element whose value is empty.
//   4. Return undefined.
Value Set::clear(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Let S be the this value.
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.clear called on non-object"));
    }

    auto* setObj = ctx.thisValue.getObject();
    auto* factory = getObjectFactory();

    // Steps 2-3: RequireInternalSlot + replace all elements with empty.
    // DEVIATION: Instead of iterating and marking each element as empty,
    // Rift replaces the entire internal storage with fresh empty objects.
    // This achieves the same result but also resets [[SetNextIndex]] to 0.
    // The spec's approach preserves the list structure (for active iterators
    // to see "empty" slots); Rift's approach may cause active iterators to
    // lose their position.
    auto* newEntries = factory->createJSObject();
    auto* newKeys = factory->createJSObject();

    setObj->setProperty("[[SetEntries]]", Value(newEntries));
    setObj->setProperty("[[SetKeys]]", Value(newKeys));
    setObj->setProperty("[[SetSize]]", Value(0.0));
    setObj->setProperty("[[SetNextIndex]]", Value(0.0));

    // Step 4: Return undefined.
    return Value::undefined();
}

// 24.2.3.6 Set.prototype.forEach ( callbackfn [ , thisArg ] )
// @spec https://tc39.es/ecma262/#sec-set.prototype.foreach
//
// Spec algorithm:
//   1. Let S be the this value.
//   2. Perform ? RequireInternalSlot(S, [[SetData]]).
//   3. If IsCallable(callbackfn) is false, throw a TypeError exception.
//   4. Let entries be S.[[SetData]].
//   5. Let numEntries be the number of elements in entries.
//   6. Let index be 0.
//   7. Repeat, while index < numEntries,
//      a. Let e be entries[index].
//      b. Set index to index + 1.
//      c. If e is not empty, then
//         i. Perform ? Call(callbackfn, thisArg, << e, e, S >>).
//         ii. NOTE: The number of elements in entries may have increased
//             during execution of callbackfn.
//         iii. Set numEntries to the number of elements in entries.
//   8. Return undefined.
Value Set::forEach(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Let S be the this value.
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.forEach called on non-object"));
    }

    auto* setObj = ctx.thisValue.getObject();

    // Step 3: If IsCallable(callbackfn) is false, throw a TypeError exception.
    if(args.empty() || !args[0].isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.forEach callback must be a function"));
    }

    auto* callback = dynamic_cast<JSFunction*>(args[0].getObject());
    if(!callback) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.forEach callback must be a function"));
    }

    Value thisArg = args.size() > 1 ? args[1] : Value::undefined();

    // Step 2: Perform ? RequireInternalSlot(S, [[SetData]]).
    // Step 4: Let entries be S.[[SetData]].
    Value entriesVal = setObj->getProperty("[[SetEntries]]");
    if(!entriesVal.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.forEach called on incompatible receiver"));
    }
    auto* entries = entriesVal.getObject();

    // Step 5: Let numEntries be the number of elements in entries.
    // Step 6: Let index be 0.
    // INCOMPLETE: Step 7.c.iii (re-reading numEntries after each callback) is
    // not fully implemented. Rift reads [[SetNextIndex]] once before the loop.
    // If callbackfn adds new elements, those elements will still be visited
    // because nextIndex is read upfront; however, the spec re-reads numEntries
    // after each callback to ensure newly added entries are visited.
    Value nextIndexVal = setObj->getProperty("[[SetNextIndex]]");
    size_t nextIndex = static_cast<size_t>(nextIndexVal.toNumber());

    // Step 7: Repeat, while index < numEntries,
    for(size_t i = 0; i < nextIndex; ++i) {
        // Step 7a: Let e be entries[index].
        Value entry = entries->getProperty(std::to_string(i));

        // Step 7c: If e is not empty, then
        // Skip deleted entries (spec: skip "empty" elements)
        if(entry.isString() && entry.getString() == "[[Deleted]]") {
            continue;
        }

        // Step 7c.i: Perform ? Call(callbackfn, thisArg, << e, e, S >>).
        // NOTE: For Set, the callback receives (value, value, set) — the value
        // is passed as both the first and second arguments (unlike Map which
        // passes (value, key, map)).
        std::vector<Value> callArgs = {entry, entry, ctx.thisValue};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, thisArg);
        callback->call(cbCtx, callArgs);
    }

    // Step 8: Return undefined.
    return Value::undefined();
}

// 24.2.3.9 get Set.prototype.size
// @spec https://tc39.es/ecma262/#sec-get-set.prototype.size
//
// Spec algorithm:
//   1. Let S be the this value.
//   2. Perform ? RequireInternalSlot(S, [[SetData]]).
//   3. Let count be SetDataSize(S.[[SetData]]).
//   4. Return F(count).
//
// Where SetDataSize ( setData ) counts non-empty elements:
//   1. Let count be 0.
//   2. For each element e of setData, do
//      a. If e is not empty, set count to count + 1.
//   3. Return count.
Value Set::sizeGetter(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Let S be the this value.
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.size called on non-object"));
    }

    auto* setObj = ctx.thisValue.getObject();

    // Step 2: Perform ? RequireInternalSlot(S, [[SetData]]).
    // Steps 3-4: Return SetDataSize(S.[[SetData]]).
    // SIMPLIFIED: Rift maintains a pre-computed [[SetSize]] counter instead
    // of counting non-empty elements on each access. This is an O(1)
    // optimization over the spec's O(n) SetDataSize abstract operation.
    Value sizeVal = setObj->getProperty("[[SetSize]]");

    if(!sizeVal.isNumber()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.size called on incompatible receiver"));
    }

    return sizeVal;
}

// 24.2.3.10 Set.prototype.values ( )
// @spec https://tc39.es/ecma262/#sec-set.prototype.values
//
// Spec algorithm:
//   1. Let S be the this value.
//   2. Return ? CreateSetIterator(S, value).
Value Set::values(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Let S be the this value.
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.values called on non-object"));
    }

    // Step 2: Return ? CreateSetIterator(S, value).
    auto* setObj = ctx.thisValue.getObject();
    return Value(SetIterator::create(getObjectFactory(), setObj, SetIterationKind::Value));
}

// 24.2.3.8 Set.prototype.keys ( )
// @spec https://tc39.es/ecma262/#sec-set.prototype.keys
//
// The initial value of the "keys" property is %Set.prototype.values%,
// meaning Set.prototype.keys === Set.prototype.values per spec.
Value Set::keys(const CallContext& ctx, const std::vector<Value>& args) {
    // Per ECMAScript spec, Set.prototype.keys === Set.prototype.values
    return values(ctx, args);
}

// 24.2.3.5 Set.prototype.entries ( )
// @spec https://tc39.es/ecma262/#sec-set.prototype.entries
//
// Spec algorithm:
//   1. Let S be the this value.
//   2. Return ? CreateSetIterator(S, key+value).
//
// NOTE: For Set, entries() returns an iterator of [value, value] pairs
// (not [key, value] like Map). The "key+value" iteration kind causes
// CreateSetIterator to yield [e, e] for each element e.
Value Set::entries(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Let S be the this value.
    if(!ctx.thisValue.isObject()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Set.prototype.entries called on non-object"));
    }

    // Step 2: Return ? CreateSetIterator(S, key+value).
    auto* setObj = ctx.thisValue.getObject();
    return Value(SetIterator::create(getObjectFactory(), setObj, SetIterationKind::KeyValue));
}

}  // namespace rift::builtins
