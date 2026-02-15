// ============================================================================
// ECMA-262 -- Array Constructor and Static Methods (23.1.1, 23.1.2)
// @spec https://tc39.es/ecma262/#sec-array-constructor
// @spec https://tc39.es/ecma262/#sec-properties-of-the-array-constructor
//
// This file covers:
//   - Array constructor (23.1.1.1)
//   - Array.isArray (23.1.2.2)
//   - Array.from (23.1.2.1)
//   - Array.of (23.1.2.5)
//   - Array.prototype.keys / .values / .entries (23.1.3.16, 23.1.3.32, 23.1.3.5)
//   - Array.prototype[@@iterator] (23.1.3.34)
//   - Internal utility methods (getArrayLength, setArrayLength, createArrayObject)
//
// See also: array_mutators.cpp, array_accessors.cpp, array_iterators.cpp,
//           array_iterator.cpp
// ============================================================================

#include "rift/builtins/array/array.h"

#include <cmath>
#include <limits>

#include "rift/builtins/array/array_iterator.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/call_context.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/core/engine/this_helpers.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

// ============================================================================
// Setup Methods
// 23.1.2 Properties of the Array Constructor
// @spec https://tc39.es/ecma262/#sec-properties-of-the-array-constructor
// ============================================================================

void Array::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // 23.1.2.2 Array.isArray ( arg )
    RIFT_STATIC_METHOD(constructor, "isArray", Array::isArray);
    // 23.1.2.1 Array.from ( items [ , mapfn [ , thisArg ] ] )
    RIFT_STATIC_METHOD(constructor, "from", Array::from);
    // 23.1.2.5 Array.of ( ...items )
    RIFT_STATIC_METHOD(constructor, "of", Array::of);
}

// 23.1.3 Properties of the Array Prototype Object
// @spec https://tc39.es/ecma262/#sec-properties-of-the-array-prototype-object
void Array::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    // Mutator methods (array_mutators.cpp)
    // Spec comments with @spec URLs are on the implementations in array_mutators.cpp.
    RIFT_METHOD(prototype, "push", Array::push);
    RIFT_METHOD(prototype, "pop", Array::pop);
    RIFT_METHOD(prototype, "shift", Array::shift);
    RIFT_METHOD(prototype, "unshift", Array::unshift);
    RIFT_METHOD(prototype, "splice", Array::splice);
    RIFT_METHOD(prototype, "reverse", Array::reverse);
    RIFT_METHOD(prototype, "sort", Array::sort);

    // Callback-based iteration methods (array_iterators.cpp)
    // Spec comments with @spec URLs are on the implementations in array_iterators.cpp.
    RIFT_METHOD(prototype, "forEach", Array::forEach);
    RIFT_METHOD(prototype, "map", Array::map);
    RIFT_METHOD(prototype, "filter", Array::filter);
    RIFT_METHOD(prototype, "reduce", Array::reduce);
    RIFT_METHOD(prototype, "reduceRight", Array::reduceRight);
    RIFT_METHOD(prototype, "find", Array::find);
    RIFT_METHOD(prototype, "findIndex", Array::findIndex);
    RIFT_METHOD(prototype, "findLast", Array::findLast);
    RIFT_METHOD(prototype, "findLastIndex", Array::findLastIndex);
    RIFT_METHOD(prototype, "every", Array::every);
    RIFT_METHOD(prototype, "some", Array::some);
    RIFT_METHOD(prototype, "flat", Array::flat);
    RIFT_METHOD(prototype, "flatMap", Array::flatMap);

    // Accessor methods (array_accessors.cpp)
    // Spec comments with @spec URLs are on the implementations in array_accessors.cpp.
    RIFT_METHOD(prototype, "indexOf", Array::indexOf);
    RIFT_METHOD(prototype, "lastIndexOf", Array::lastIndexOf);
    RIFT_METHOD(prototype, "includes", Array::includes);
    RIFT_METHOD(prototype, "slice", Array::slice);
    RIFT_METHOD(prototype, "concat", Array::concat);
    RIFT_METHOD(prototype, "join", Array::join);
    RIFT_METHOD(prototype, "toString", Array::toString);

    // Iterator creation methods (implemented below in this file)
    RIFT_METHOD(prototype, "keys", Array::keys);
    RIFT_METHOD(prototype, "values", Array::values);
    RIFT_METHOD(prototype, "entries", Array::entries);

    // 23.1.3.34 Array.prototype [ @@iterator ] ( )
    // @spec https://tc39.es/ecma262/#sec-array.prototype-@@iterator
    // The initial value of the @@iterator property is %Array.prototype.values%.
    std::string iterator_key = core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());
    auto* iterator_func = factory->createJSFunction(Array::values);
    prototype->defineProperty(iterator_key,
        rift::runtime::PropertyDescriptor(Value(iterator_func), true, false, true));
}

// ============================================================================
// Constructor
// 23.1.1.1 Array ( ...values )
// @spec https://tc39.es/ecma262/#sec-array
// ============================================================================

Value Array::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // SIMPLIFIED: The spec distinguishes Array() vs new Array() and checks
    // NewTarget for subclassing (steps 1-2). Rift always creates an ordinary
    // array with %Array.prototype% and does not support subclassed constructors.

    // 3. Let numberOfArgs be the number of elements in values.
    // 4. If numberOfArgs = 0, then
    //    a. Return ! ArrayCreate(0, proto).
    // 5. Else if numberOfArgs = 1, then
    //    a. Let len be values[0].
    //    b-g. (numeric length vs element cases)
    // 6. Else,
    //    a-e. Create array from all arguments.

    auto* arrayPrototype = getGlobalPrototype();
    auto* arrayObj = getObjectFactory()->createJSObject(arrayPrototype);

    rift::memory::GCProtector protect(arrayObj, getObjectFactory()->getObjectManager());

    size_t effectiveArgCount = args.size();

    if(effectiveArgCount == 0) {
        // 4. If numberOfArgs = 0, then
        //    a. Return ! ArrayCreate(0, proto).
        setArrayLength(arrayObj, 0);
    } else if(effectiveArgCount == 1 && args[0].isNumber()) {
        // 5. Else if numberOfArgs = 1, then
        //    a. Let len be values[0].
        //    b. If len is not a Number, ... (handled by the outer if check)
        //    c. If IsArray(len) is false, ...
        //    d. Let intLen be ! ToUint32(len).
        //    e. If intLen is not the same value as len, throw a RangeError.
        // DEVIATION: Rift silently clamps invalid lengths to 0 instead of
        // throwing RangeError as spec requires in step 5e.
        double length = args[0].toNumber();
        size_t safeLength;
        if(!core::EvaluationUtils::toSafeArrayLength(length, safeLength)) {
            setArrayLength(arrayObj, 0);
        } else {
            //    f. Set the length of array to intLen.
            setArrayLength(arrayObj, safeLength);
        }
    } else {
        // 6. Else (numberOfArgs >= 2, or single non-number arg),
        //    a. Assert: numberOfArgs >= 2.
        //    b. Let array be ? ArrayCreate(numberOfArgs, proto).
        //    c. Let k be 0.
        //    d. Repeat, while k < numberOfArgs,
        //       i. Let Pk be ! ToString(k).
        //       ii. Let itemK be values[k].
        //       iii. Perform ! CreateDataPropertyOrThrow(array, Pk, itemK).
        //       iv. Set k to k + 1.
        for(size_t i = 0; i < effectiveArgCount; ++i) {
            arrayObj->setProperty(std::to_string(i), args[i]);
        }
        //    e. Assert: the mathematical value of array's "length" property is numberOfArgs.
        setArrayLength(arrayObj, effectiveArgCount);
    }

    //    Return array.
    return Value(arrayObj);
}

// ============================================================================
// Utility Methods
// These are Rift-internal helpers, not direct spec methods. They correspond to
// abstract operations used throughout the Array spec algorithms:
//   - getArrayLength: corresponds to 7.3.18 LengthOfArrayLike ( obj )
//     @spec https://tc39.es/ecma262/#sec-lengthofarraylike
//   - setArrayLength: corresponds to 10.4.2.4 ArraySetLength ( A, Desc )
//     @spec https://tc39.es/ecma262/#sec-arraysetlength
//   - createArrayObject: corresponds to 10.4.2.2 ArrayCreate ( length [ , proto ] )
//     @spec https://tc39.es/ecma262/#sec-arraycreate
// ============================================================================

// 7.3.18 LengthOfArrayLike ( obj )
// @spec https://tc39.es/ecma262/#sec-lengthofarraylike
// SIMPLIFIED: The spec calls Get(obj, "length") then ToLength. Rift reads the
// property directly and clamps to size_t, returning 0 for invalid values
// instead of throwing TypeError on non-object inputs.
size_t Array::getArrayLength(JSObject* obj) {
    if(!obj) {
        return 0;
    }

    // 1. Assert: Type(obj) is Object. (Rift returns 0 for null instead.)
    // 2. Return ? ToLength(? Get(obj, "length")).
    Value lengthValue = obj->getProperty("length");
    if(lengthValue.isNumber()) {
        double length = lengthValue.toNumber();
        if(length >= 0 && !std::isnan(length) && !std::isinf(length)) {
            return static_cast<size_t>(length);
        }
    }

    return 0;
}

// 10.4.2.4 ArraySetLength ( A, Desc )
// @spec https://tc39.es/ecma262/#sec-arraysetlength
// SIMPLIFIED: Only sets the numeric length value. Does not implement the full
// ArraySetLength algorithm (steps for deleting elements when shrinking, or
// making length non-writable).
void Array::setArrayLength(JSObject* obj, size_t length) {
    if(obj) {
        // Per spec, Array "length" is { writable: true, enumerable: false, configurable: false }.
        obj->defineProperty("length",
            rift::runtime::PropertyDescriptor(
                Value(static_cast<double>(length)), true, false, false));
    }
}

// 10.4.2.2 ArrayCreate ( length [ , proto ] )
// @spec https://tc39.es/ecma262/#sec-arraycreate
// SIMPLIFIED: Does not validate length against 2^32 - 1 upper bound. Does not
// set the internal [[DefineOwnProperty]] exotic behavior for arrays.
JSObject* Array::createArrayObject(rift::memory::ObjectFactory* factory,
                                   std::vector<Value> elements) {
    auto* arrayPrototype = getGlobalPrototype();
    auto* arrayObj = factory->createJSObject(arrayPrototype);

    rift::memory::GCProtector protect(arrayObj, factory->getObjectManager());

    for(size_t i = 0; i < elements.size(); ++i) {
        arrayObj->setProperty(std::to_string(i), elements[i]);
    }

    setArrayLength(arrayObj, elements.size());

    return arrayObj;
}

// Returns %Array.prototype% from the global builtin manager.
JSObject* Array::getGlobalPrototype() {
    return rift::core::BuiltinManager::getArrayPrototype();
}

// ============================================================================
// Static Methods (23.1.2)
// @spec https://tc39.es/ecma262/#sec-properties-of-the-array-constructor
// ============================================================================

// 23.1.2.2 Array.isArray ( arg )
// @spec https://tc39.es/ecma262/#sec-array.isarray
// DEVIATION: The spec algorithm is:
//   1. Return ? IsArray(arg).
// Where IsArray (7.2.2) checks the [[Class]] internal slot or Proxy target.
// Rift does not have an internal [[Class]] or exotic Array slot, so it uses
// heuristic detection: checks for numeric .length, presence of .push method,
// and existence of indexed properties. This can produce false positives for
// array-like objects that happen to have a .push method.
Value Array::isArray(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(false);
    }

    Value arg = args[0];

    // Non-objects are never arrays.
    if(!arg.isObject() && !arg.isFunction()) {
        return Value(false);
    }

    auto* obj = arg.getObject();
    if(!obj) {
        return Value(false);
    }

    // Heuristic: must have a numeric .length property.
    Value lengthValue = obj->getProperty("length");
    if(!lengthValue.isNumber()) {
        return Value(false);
    }

    double length = lengthValue.toNumber();
    if(length < 0 || std::isnan(length) || std::isinf(length)) {
        return Value(false);
    }

    // Heuristic: if it has a .push method, treat as array.
    Value pushMethod = obj->getProperty("push");
    if(pushMethod.isFunction()) {
        return Value(true);
    }

    // Heuristic: empty length-0 objects count as arrays.
    if(length == 0) {
        return Value(true);
    }

    // Heuristic: check for indexed properties in the first few slots.
    size_t arrayLength = static_cast<size_t>(length);
    for(size_t i = 0; i < std::min(arrayLength, static_cast<size_t>(3)); ++i) {
        Value element = obj->getProperty(std::to_string(i));
        if(!element.isUndefined()) {
            return Value(true);
        }
    }

    return Value(false);
}

// 23.1.2.1 Array.from ( items [ , mapfn [ , thisArg ] ] )
// @spec https://tc39.es/ecma262/#sec-array.from
Value Array::from(const CallContext& ctx, const std::vector<Value>& args) {
    // DEVIATION: Spec step 1 checks "Let C be the this value" to support
    // subclass constructors (e.g., MyArray.from(...)). Rift always creates
    // a plain Array.

    if(args.empty()) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    // DEVIATION: Spec throws TypeError on null/undefined items (via
    // GetMethod/GetIterator). Rift returns an empty array instead.
    Value arrayLike = args[0];

    if(arrayLike.isNull() || arrayLike.isUndefined()) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    // 2. If mapfn is undefined, then let mapping be false.
    // 3. Else,
    //    a. If IsCallable(mapfn) is false, throw a TypeError.
    //    b. Let mapping be true.
    // SIMPLIFIED: mapfn check is deferred to after iteration (see below).

    std::vector<Value> result;

    if(arrayLike.isString()) {
        // Strings are iterable via @@iterator; Rift handles them as a special
        // case by splitting into characters.
        // DEVIATION: Spec iterates strings via their @@iterator which yields
        // full Unicode code points. Rift splits by byte (char), which breaks
        // multi-byte UTF-8 characters.
        std::string str = arrayLike.getString();
        for(char c : str) {
            result.push_back(Value(std::string(1, c)));
        }
    } else if(arrayLike.isObject()) {
        auto* obj = arrayLike.getObject();

        // 4. Let usingIterator be ? GetMethod(items, @@iterator).
        std::string iterator_key =
            rift::core::EvaluationUtils::symbolToPropertyKey(Symbol::getIteratorId());
        Value iterator_method = obj->getProperty(iterator_key);

        // 5. If usingIterator is not undefined, then
        if(iterator_method.isFunction()) {
            //    a. If IsConstructor(C) is true, ... (skipped, no subclass support)
            //    b. Let iteratorRecord be ? GetIterator(items, sync, usingIterator).
            auto* iterator_func = dynamic_cast<JSFunction*>(iterator_method.getObject());
            if(iterator_func) {
                rift::core::CallContext iter_ctx(rift::core::CallType::Function, arrayLike);
                Value iterator = iterator_func->call(iter_ctx, {});

                if(iterator.isObject()) {
                    auto* iterator_obj = iterator.getObject();

                    //    d. Repeat,
                    while(true) {
                        //       i. Let next be ? IteratorStepValue(iteratorRecord).
                        Value next_method = iterator_obj->getProperty("next");
                        if(!next_method.isFunction()) {
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

                        //       ii. If next is done, then set A's length to k, return A.
                        auto* result_obj = iter_result.getObject();
                        Value done = result_obj->getProperty("done");
                        if(done.toBool()) {
                            break;
                        }

                        //       v. (If mapping, call mapfn — deferred below in Rift.)
                        //       vi. Perform ? CreateDataPropertyOrThrow(A, Pk, mappedValue).
                        Value value = result_obj->getProperty("value");
                        result.push_back(value);
                    }
                }
            }
        } else {
            // 6. Else (no @@iterator — array-like path),
            //    a. Let arrayLike be ! ToObject(items).
            //    b. Let len be ? LengthOfArrayLike(arrayLike).
            Value lengthVal = obj->getProperty("length");

            if(lengthVal.isNumber()) {
                size_t length = static_cast<size_t>(lengthVal.toNumber());

                //    e. Repeat, while k < len,
                for(size_t i = 0; i < length; ++i) {
                    //       i. Let Pk be ! ToString(k).
                    //       ii. Let kValue be ? Get(arrayLike, Pk).
                    Value element = obj->getProperty(std::to_string(i));
                    //       iii-iv. (If mapping, call mapfn — deferred below.)
                    //       v. Perform ? CreateDataPropertyOrThrow(A, Pk, mappedValue).
                    result.push_back(element);
                }
            }
        }
    }

    // Apply mapfn if provided (steps 5.d.v / 6.e.iii-iv in the spec).
    // DEVIATION: Spec applies mapfn during iteration (lazily, per element).
    // Rift collects all values first, then maps. This changes observable behavior
    // if mapfn has side effects that interact with the iterator.
    // INCOMPLETE: thisArg (args[2]) is not passed as the this-value for mapfn.
    // Spec step 3 requires "Let T be thisArg" and step 5.d.v / 6.e.iv calls
    // mapfn with T as this.
    if(args.size() >= 2 && args[1].isFunction()) {
        auto* mapFn = dynamic_cast<JSFunction*>(args[1].getObject());
        if(!mapFn) {
            throw rift::core::JavaScriptException(
                Value("TypeError: Array.from mapFn is not a function"));
        }
        for(size_t i = 0; i < result.size(); ++i) {
            std::vector<Value> callArgs = {result[i], Value(static_cast<double>(i))};
            rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
            result[i] = mapFn->call(cbCtx, callArgs);
        }
    }

    return Value(createArrayObject(getObjectFactory(), std::move(result)));
}

// 23.1.2.5 Array.of ( ...items )
// @spec https://tc39.es/ecma262/#sec-array.of
Value Array::of(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let len be the number of elements in items.
    // 2. Let lenNumber be F(len).
    // 3. Let C be the this value.
    // INCOMPLETE: Steps 3-4 check IsConstructor(C) for subclass support.
    // Rift always creates a plain Array.
    // 5. Let A be ? ArrayCreate(len).
    // 6. Let k be 0.
    // 7. Repeat, while k < len,
    //    a. Let kValue be items[k].
    //    b. Let Pk be ! ToString(k).
    //    c. Perform ? CreateDataPropertyOrThrow(A, Pk, kValue).
    //    d. Set k to k + 1.
    std::vector<Value> elements;

    for(size_t i = 0; i < args.size(); ++i) {
        elements.push_back(args[i]);
    }

    // 8. Perform ? Set(A, "length", lenNumber, true).
    // 9. Return A.
    return Value(createArrayObject(getObjectFactory(), std::move(elements)));
}

// ============================================================================
// Iterator Methods - keys(), values(), entries()
// These all delegate to CreateArrayIterator (23.1.5.1) with different kinds.
// @spec https://tc39.es/ecma262/#sec-createarrayiterator
// ============================================================================

// 23.1.3.16 Array.prototype.keys ( )
// @spec https://tc39.es/ecma262/#sec-array.prototype.keys
Value Array::keys(const CallContext& ctx, const std::vector<Value>& /* args */) {
    // 1. Let O be ? ToObject(this value).
    if(!ctx.thisValue.isObject()) {
        throw core::JavaScriptException(
            Value("TypeError: Array.prototype.keys called on non-object"));
    }
    // 2. Return CreateArrayIterator(O, key).
    return Value(ArrayIterator::create(getObjectFactory(), ctx.thisValue.getObject(),
                                       ArrayIterationKind::Key));
}

// 23.1.3.32 Array.prototype.values ( )
// @spec https://tc39.es/ecma262/#sec-array.prototype.values
Value Array::values(const CallContext& ctx, const std::vector<Value>& /* args */) {
    // 1. Let O be ? ToObject(this value).
    if(!ctx.thisValue.isObject()) {
        throw core::JavaScriptException(
            Value("TypeError: Array.prototype.values called on non-object"));
    }
    // 2. Return CreateArrayIterator(O, value).
    return Value(ArrayIterator::create(getObjectFactory(), ctx.thisValue.getObject(),
                                       ArrayIterationKind::Value));
}

// 23.1.3.5 Array.prototype.entries ( )
// @spec https://tc39.es/ecma262/#sec-array.prototype.entries
Value Array::entries(const CallContext& ctx, const std::vector<Value>& /* args */) {
    // 1. Let O be ? ToObject(this value).
    if(!ctx.thisValue.isObject()) {
        throw core::JavaScriptException(
            Value("TypeError: Array.prototype.entries called on non-object"));
    }
    // 2. Return CreateArrayIterator(O, key+value).
    return Value(ArrayIterator::create(getObjectFactory(), ctx.thisValue.getObject(),
                                       ArrayIterationKind::KeyValue));
}

// 23.1.3.34 Array.prototype [ @@iterator ] ( )
// @spec https://tc39.es/ecma262/#sec-array.prototype-@@iterator
// Aliased to Array.prototype.values in setupPrototypeMethods above.

}  // namespace rift::builtins
