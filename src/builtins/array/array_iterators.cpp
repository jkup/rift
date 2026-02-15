// ============================================================================
// ECMA-262 -- Array Callback-Based Iteration Methods (23.1.3)
// @spec https://tc39.es/ecma262/#sec-properties-of-the-array-prototype-object
//
// This file covers:
//   - Array.prototype.forEach (23.1.3.15)
//   - Array.prototype.map (23.1.3.21)
//   - Array.prototype.filter (23.1.3.8)
//   - Array.prototype.reduce (23.1.3.24)
//   - Array.prototype.reduceRight (23.1.3.25)
//   - Array.prototype.find (23.1.3.9)
//   - Array.prototype.findIndex (23.1.3.10)
//   - Array.prototype.findLast (23.1.3.11)
//   - Array.prototype.findLastIndex (23.1.3.12)
//   - Array.prototype.every (23.1.3.6)
//   - Array.prototype.some (23.1.3.29)
//   - Array.prototype.flat (23.1.3.13)
//   - Array.prototype.flatMap (23.1.3.14)
//
// See also: array.cpp (constructor, statics, keys/values/entries),
//           array_mutators.cpp (push, pop, shift, unshift, splice, reverse, sort),
//           array_accessors.cpp (indexOf, lastIndexOf, includes, slice, concat, join)
// ============================================================================

#include <cmath>
#include <functional>

#include "rift/builtins/array/array.h"
#include "rift/core/engine/call_context.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/core/engine/this_helpers.h"

namespace rift::builtins {

using rift::core::extractThisObject;

// 23.1.3.15 Array.prototype.forEach ( callbackfn [ , thisArg ] )
// @spec https://tc39.es/ecma262/#sec-array.prototype.foreach
Value Array::forEach(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    // 2. Let len be ? LengthOfArrayLike(O).
    // SIMPLIFIED: Rift uses extractThisObject which combines ToObject + type check,
    // and getArrayLength which reads .length directly instead of LengthOfArrayLike.
    auto* arrayObj = extractThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value::undefined();
    }

    // 3. If IsCallable(callbackfn) is false, throw a TypeError exception.
    Value callback = args[0];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.forEach callback must be a function"));
    }

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);
    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());

    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.forEach callback is not a function"));
    }

    // 4. Let k be 0.
    // 5. Repeat, while k < len,
    for(size_t i = 0; i < length; ++i) {
        // a. Let Pk be ! ToString(F(k)).
        // b. Let kPresent be ? HasProperty(O, Pk).
        Value element = arrayObj->getProperty(std::to_string(i));
        // c. If kPresent is true, then
        // DEVIATION: Rift checks for undefined instead of HasProperty. This skips
        // holes but also skips explicitly-set undefined values, which the spec would visit.
        if(!element.isUndefined()) {
            // i. Let kValue be ? Get(O, Pk).
            // ii. Perform ? Call(callbackfn, thisArg, << kValue, F(k), O >>).
            // INCOMPLETE: thisArg (args[1]) is not forwarded; spec uses it as the
            // this-binding for the callback invocation.
            std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
            rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
            callbackFn->call(cbCtx, callArgs);
        }
        // d. Set k to k + 1.
    }

    // 6. Return undefined.
    return Value::undefined();
}

// 23.1.3.21 Array.prototype.map ( callbackfn [ , thisArg ] )
// @spec https://tc39.es/ecma262/#sec-array.prototype.map
Value Array::map(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = extractThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    // 3. If IsCallable(callbackfn) is false, throw a TypeError exception.
    Value callback = args[0];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.map callback must be a function"));
    }

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);
    // 4. Let A be ? ArraySpeciesCreate(O, len).
    // SIMPLIFIED: Rift creates a plain array instead of calling ArraySpeciesCreate,
    // so subclassed arrays will not produce instances of the subclass.
    std::vector<Value> results;
    results.reserve(length);

    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.map callback is not a function"));
    }

    // 5. Let k be 0.
    // 6. Repeat, while k < len,
    for(size_t i = 0; i < length; ++i) {
        // a. Let Pk be ! ToString(F(k)).
        // b. Let kPresent be ? HasProperty(O, Pk).
        Value element = arrayObj->getProperty(std::to_string(i));
        // c. If kPresent is true, then
        // DEVIATION: Rift checks for undefined instead of HasProperty.
        // Holes should produce holes in the result, but Rift pushes undefined instead.
        if(!element.isUndefined()) {
            // i. Let kValue be ? Get(O, Pk).
            // ii. Let mappedValue be ? Call(callbackfn, thisArg, << kValue, F(k), O >>).
            // INCOMPLETE: thisArg (args[1]) is not forwarded to the callback.
            std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
            rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
            Value result = callbackFn->call(cbCtx, callArgs);
            // iii. Perform ? CreateDataPropertyOrThrow(A, Pk, mappedValue).
            results.push_back(result);
        } else {
            results.push_back(Value::undefined());
        }
        // d. Set k to k + 1.
    }

    // 7. Return A.
    return Value(createArrayObject(getObjectFactory(), std::move(results)));
}

// 23.1.3.8 Array.prototype.filter ( callbackfn [ , thisArg ] )
// @spec https://tc39.es/ecma262/#sec-array.prototype.filter
Value Array::filter(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = extractThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    // 3. If IsCallable(callbackfn) is false, throw a TypeError exception.
    Value callback = args[0];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.filter callback must be a function"));
    }

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);
    // 4. Let A be ? ArraySpeciesCreate(O, 0).
    // SIMPLIFIED: Rift creates a plain array instead of calling ArraySpeciesCreate.
    std::vector<Value> results;

    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.filter callback is not a function"));
    }

    // 5. Let k be 0.
    // 6. Let to be 0.
    // 7. Repeat, while k < len,
    for(size_t i = 0; i < length; ++i) {
        // a. Let Pk be ! ToString(F(k)).
        // b. Let kPresent be ? HasProperty(O, Pk).
        Value element = arrayObj->getProperty(std::to_string(i));
        // c. If kPresent is true, then
        // DEVIATION: Rift checks for undefined instead of HasProperty.
        if(!element.isUndefined()) {
            // i. Let kValue be ? Get(O, Pk).
            // ii. Let selected be ToBoolean(? Call(callbackfn, thisArg, << kValue, F(k), O >>)).
            // INCOMPLETE: thisArg (args[1]) is not forwarded to the callback.
            std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
            rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
            Value result = callbackFn->call(cbCtx, callArgs);

            // iii. If selected is true, then
            if(result.toBool()) {
                // 1. Perform ? CreateDataPropertyOrThrow(A, ! ToString(F(to)), kValue).
                // 2. Set to to to + 1.
                results.push_back(element);
            }
        }
        // d. Set k to k + 1.
    }

    // 8. Return A.
    return Value(createArrayObject(getObjectFactory(), std::move(results)));
}

// 23.1.3.24 Array.prototype.reduce ( callbackfn [ , initialValue ] )
// @spec https://tc39.es/ecma262/#sec-array.prototype.reduce
Value Array::reduce(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = extractThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value::undefined();
    }

    // 3. If IsCallable(callbackfn) is false, throw a TypeError exception.
    Value callback = args[0];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.reduce callback must be a function"));
    }

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);
    // 4. If len = 0 and initialValue is not present, throw a TypeError exception.
    if(length == 0 && args.size() < 2) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Reduce of empty array with no initial value"));
    }

    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.reduce callback is not a function"));
    }

    // 5. Let k be 0.
    // 6. Let accumulator be undefined.
    Value accumulator;
    size_t startIndex = 0;

    // 7. If initialValue is present, then
    if(args.size() >= 2) {
        // a. Set accumulator to initialValue.
        accumulator = args[1];
    } else {
        // 8. Else,
        // a. Let kPresent be false.
        // b. Repeat, while kPresent is false and k < len,
        //    i. Let Pk be ! ToString(F(k)).
        //    ii. Set kPresent to ? HasProperty(O, Pk).
        //    iii. If kPresent is true, then
        //         1. Set accumulator to ? Get(O, Pk).
        //    iv. Set k to k + 1.
        // SIMPLIFIED: Rift just reads index 0 directly instead of searching
        // for the first present property.
        accumulator = arrayObj->getProperty("0");
        startIndex = 1;
        // c. If kPresent is false, throw a TypeError exception.
        // INCOMPLETE: Does not check if element at index 0 was actually present.
    }

    // 9. Repeat, while k < len,
    for(size_t i = startIndex; i < length; ++i) {
        // a. Let Pk be ! ToString(F(k)).
        // b. Let kPresent be ? HasProperty(O, Pk).
        Value element = arrayObj->getProperty(std::to_string(i));
        // c. If kPresent is true, then
        // DEVIATION: Rift checks for undefined instead of HasProperty.
        if(!element.isUndefined()) {
            // i. Set accumulator to ? Call(callbackfn, undefined,
            //    << accumulator, kValue, F(k), O >>).
            std::vector<Value> callArgs = {accumulator, element, Value(static_cast<double>(i)),
                                           Value(arrayObj)};
            rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
            accumulator = callbackFn->call(cbCtx, callArgs);
        }
        // d. Set k to k + 1.
    }

    // 10. Return accumulator.
    return accumulator;
}

// 23.1.3.25 Array.prototype.reduceRight ( callbackfn [ , initialValue ] )
// @spec https://tc39.es/ecma262/#sec-array.prototype.reduceright
Value Array::reduceRight(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = extractThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value::undefined();
    }

    // 3. If IsCallable(callbackfn) is false, throw a TypeError exception.
    Value callback = args[0];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.reduceRight callback must be a function"));
    }

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);
    // 4. If len = 0 and initialValue is not present, throw a TypeError exception.
    if(length == 0 && args.size() < 2) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Reduce of empty array with no initial value"));
    }

    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.reduceRight callback is not a function"));
    }

    // 5. Let k be len - 1.
    // 6. Let accumulator be undefined.
    Value accumulator;
    size_t startIndex;

    // 7. If initialValue is present, then
    if(args.size() >= 2) {
        // a. Set accumulator to initialValue.
        accumulator = args[1];
        startIndex = length;
    } else {
        // 8. Else,
        // a. Let kPresent be false.
        // b. Repeat, while kPresent is false and k >= 0,
        //    i-iv. (search backwards for first present element)
        // SIMPLIFIED: Rift just reads the last index directly instead of searching
        // backwards for the first present property.
        if(length == 0) {
            return Value::undefined();
        }
        accumulator = arrayObj->getProperty(std::to_string(length - 1));
        startIndex = length - 1;
        // c. If kPresent is false, throw a TypeError exception.
        // INCOMPLETE: Does not check if the last element was actually present.
    }

    // 9. Repeat, while k >= 0,
    for(size_t i = startIndex; i > 0; --i) {
        // a. Let Pk be ! ToString(F(k)).
        // b. Let kPresent be ? HasProperty(O, Pk).
        Value element = arrayObj->getProperty(std::to_string(i - 1));

        // c. If kPresent is true, then
        // DEVIATION: Rift does not check HasProperty; it always calls the callback
        // even for holes, which differs from the spec's skip-holes behavior.
        // i. Set accumulator to ? Call(callbackfn, undefined,
        //    << accumulator, kValue, F(k), O >>).
        std::vector<Value> callArgs = {accumulator, element, Value(static_cast<double>(i - 1)),
                                       Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        accumulator = callbackFn->call(cbCtx, callArgs);
        // d. Set k to k - 1.
    }

    // 10. Return accumulator.
    return accumulator;
}

// 23.1.3.9 Array.prototype.find ( predicate [ , thisArg ] )
// @spec https://tc39.es/ecma262/#sec-array.prototype.find
Value Array::find(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = extractThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value::undefined();
    }

    // 3. If IsCallable(predicate) is false, throw a TypeError exception.
    Value callback = args[0];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.find callback must be a function"));
    }

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);

    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.find callback is not a function"));
    }

    // 4. Let k be 0.
    // 5. Repeat, while k < len,
    for(size_t i = 0; i < length; ++i) {
        // a. Let Pk be ! ToString(F(k)).
        // b. Let kValue be ? Get(O, Pk).
        Value element = arrayObj->getProperty(std::to_string(i));

        // c. Let testResult be ToBoolean(? Call(predicate, thisArg, << kValue, F(k), O >>)).
        // INCOMPLETE: thisArg (args[1]) is not forwarded to the callback.
        std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        Value result = callbackFn->call(cbCtx, callArgs);

        // d. If testResult is true, return kValue.
        if(result.toBool()) {
            return element;
        }
        // e. Set k to k + 1.
    }

    // 6. Return undefined.
    return Value::undefined();
}

// 23.1.3.10 Array.prototype.findIndex ( predicate [ , thisArg ] )
// @spec https://tc39.es/ecma262/#sec-array.prototype.findindex
Value Array::findIndex(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = extractThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value(-1.0);
    }

    // 3. If IsCallable(predicate) is false, throw a TypeError exception.
    Value callback = args[0];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.findIndex callback must be a function"));
    }

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);

    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.findIndex callback is not a function"));
    }

    // 4. Let k be 0.
    // 5. Repeat, while k < len,
    for(size_t i = 0; i < length; ++i) {
        // a. Let Pk be ! ToString(F(k)).
        // b. Let kValue be ? Get(O, Pk).
        Value element = arrayObj->getProperty(std::to_string(i));

        // c. Let testResult be ToBoolean(? Call(predicate, thisArg, << kValue, F(k), O >>)).
        // INCOMPLETE: thisArg (args[1]) is not forwarded to the callback.
        std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        Value result = callbackFn->call(cbCtx, callArgs);

        // d. If testResult is true, return F(k).
        if(result.toBool()) {
            return Value(static_cast<double>(i));
        }
        // e. Set k to k + 1.
    }

    // 6. Return -1F.
    return Value(-1.0);
}

// 23.1.3.11 Array.prototype.findLast ( predicate [ , thisArg ] )
// @spec https://tc39.es/ecma262/#sec-array.prototype.findlast
Value Array::findLast(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = extractThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value::undefined();
    }

    // 3. If IsCallable(predicate) is false, throw a TypeError exception.
    Value callback = args[0];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.findLast callback must be a function"));
    }

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);

    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.findLast callback is not a function"));
    }

    // 4. Let k be len - 1.
    // 5. Repeat, while k >= 0,
    for(size_t i = length; i > 0; --i) {
        // a. Let Pk be ! ToString(F(k)).
        // b. Let kValue be ? Get(O, Pk).
        Value element = arrayObj->getProperty(std::to_string(i - 1));

        // c. Let testResult be ToBoolean(? Call(predicate, thisArg, << kValue, F(k), O >>)).
        // INCOMPLETE: thisArg (args[1]) is not forwarded to the callback.
        std::vector<Value> callArgs = {element, Value(static_cast<double>(i - 1)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        Value result = callbackFn->call(cbCtx, callArgs);

        // d. If testResult is true, return kValue.
        if(result.toBool()) {
            return element;
        }
        // e. Set k to k - 1.
    }

    // 6. Return undefined.
    return Value::undefined();
}

// 23.1.3.12 Array.prototype.findLastIndex ( predicate [ , thisArg ] )
// @spec https://tc39.es/ecma262/#sec-array.prototype.findlastindex
Value Array::findLastIndex(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = extractThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value(-1.0);
    }

    // 3. If IsCallable(predicate) is false, throw a TypeError exception.
    Value callback = args[0];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.findLastIndex callback must be a function"));
    }

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);

    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.findLastIndex callback is not a function"));
    }

    // 4. Let k be len - 1.
    // 5. Repeat, while k >= 0,
    for(size_t i = length; i > 0; --i) {
        // a. Let Pk be ! ToString(F(k)).
        // b. Let kValue be ? Get(O, Pk).
        Value element = arrayObj->getProperty(std::to_string(i - 1));

        // c. Let testResult be ToBoolean(? Call(predicate, thisArg, << kValue, F(k), O >>)).
        // INCOMPLETE: thisArg (args[1]) is not forwarded to the callback.
        std::vector<Value> callArgs = {element, Value(static_cast<double>(i - 1)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        Value result = callbackFn->call(cbCtx, callArgs);

        // d. If testResult is true, return F(k).
        if(result.toBool()) {
            return Value(static_cast<double>(i - 1));
        }
        // e. Set k to k - 1.
    }

    // 6. Return -1F.
    return Value(-1.0);
}

// 23.1.3.6 Array.prototype.every ( callbackfn [ , thisArg ] )
// @spec https://tc39.es/ecma262/#sec-array.prototype.every
Value Array::every(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = extractThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value(true);
    }

    // 3. If IsCallable(callbackfn) is false, throw a TypeError exception.
    Value callback = args[0];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.every callback must be a function"));
    }

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);

    if(length == 0) {
        return Value(true);
    }

    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.every callback is not a function"));
    }

    // 4. Let k be 0.
    // 5. Repeat, while k < len,
    for(size_t i = 0; i < length; ++i) {
        // a. Let Pk be ! ToString(F(k)).
        // b. Let kPresent be ? HasProperty(O, Pk).
        Value element = arrayObj->getProperty(std::to_string(i));

        // c. If kPresent is true, then
        // DEVIATION: Rift does not check HasProperty; it always calls the callback,
        // which differs from the spec's skip-holes behavior for sparse arrays.
        // i. Let kValue be ? Get(O, Pk).
        // ii. Let testResult be ToBoolean(? Call(callbackfn, thisArg, << kValue, F(k), O >>)).
        // INCOMPLETE: thisArg (args[1]) is not forwarded to the callback.
        std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        Value result = callbackFn->call(cbCtx, callArgs);

        // iii. If testResult is false, return false.
        if(!result.toBool()) {
            return Value(false);
        }
        // d. Set k to k + 1.
    }

    // 6. Return true.
    return Value(true);
}

// 23.1.3.29 Array.prototype.some ( callbackfn [ , thisArg ] )
// @spec https://tc39.es/ecma262/#sec-array.prototype.some
Value Array::some(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = extractThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value(false);
    }

    // 3. If IsCallable(callbackfn) is false, throw a TypeError exception.
    Value callback = args[0];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.some callback must be a function"));
    }

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);

    if(length == 0) {
        return Value(false);
    }

    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.some callback is not a function"));
    }

    // 4. Let k be 0.
    // 5. Repeat, while k < len,
    for(size_t i = 0; i < length; ++i) {
        // a. Let Pk be ! ToString(F(k)).
        // b. Let kPresent be ? HasProperty(O, Pk).
        Value element = arrayObj->getProperty(std::to_string(i));

        // c. If kPresent is true, then
        // DEVIATION: Rift does not check HasProperty; it always calls the callback,
        // which differs from the spec's skip-holes behavior for sparse arrays.
        // i. Let kValue be ? Get(O, Pk).
        // ii. Let testResult be ToBoolean(? Call(callbackfn, thisArg, << kValue, F(k), O >>)).
        // INCOMPLETE: thisArg (args[1]) is not forwarded to the callback.
        std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        Value result = callbackFn->call(cbCtx, callArgs);

        // iii. If testResult is true, return true.
        if(result.toBool()) {
            return Value(true);
        }
        // d. Set k to k + 1.
    }

    // 6. Return false.
    return Value(false);
}

// 23.1.3.13 Array.prototype.flat ( [ depth ] )
// @spec https://tc39.es/ecma262/#sec-array.prototype.flat
Value Array::flat(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = extractThisObject(ctx);
    if(!arrayObj) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    // 2. Let sourceLen be ? LengthOfArrayLike(O).
    // 3. Let depthNum be 1.
    double depth = 1.0;
    // 4. If depth is not undefined, then
    //    a. Set depthNum to ? ToIntegerOrInfinity(depth).
    //    b. If depthNum < 0, set depthNum to 0.
    if(!args.empty() && args[0].isNumber()) {
        depth = args[0].toNumber();
        if(depth < 0)
            depth = 0;
        // DEVIATION: Rift clamps depth to 100 to avoid excessive recursion.
        // The spec does not impose an upper limit.
        if(depth > 100)
            depth = 100;
    }

    // 5. Let A be ? ArraySpeciesCreate(O, 0).
    // SIMPLIFIED: Rift creates a plain array instead of calling ArraySpeciesCreate.
    std::vector<Value> result;

    // 6. Perform ? FlattenIntoArray(A, O, sourceLen, 0, depthNum).
    // SIMPLIFIED: Rift inlines FlattenIntoArray (23.1.3.13.1) as a local lambda
    // instead of implementing it as a separate abstract operation.
    // The spec's FlattenIntoArray also supports a mapperFunction parameter
    // (used by flatMap) which this implementation does not handle.
    std::function<void(JSObject*, double)> flattenArray = [&](JSObject* arr, double currentDepth) {
        // FlattenIntoArray step 1: If depth <= 0, copy elements without flattening.
        if(currentDepth <= 0) {
            Value lengthVal = arr->getProperty("length");
            if(lengthVal.isNumber()) {
                size_t arrLength = static_cast<size_t>(lengthVal.toNumber());
                for(size_t i = 0; i < arrLength; ++i) {
                    Value element = arr->getProperty(std::to_string(i));
                    result.push_back(element);
                }
            }
            return;
        }

        // FlattenIntoArray steps 2-3: Get source length and iterate.
        Value lengthVal = arr->getProperty("length");
        if(lengthVal.isNumber()) {
            size_t arrLength = static_cast<size_t>(lengthVal.toNumber());
            for(size_t i = 0; i < arrLength; ++i) {
                // FlattenIntoArray step 3.c: Let element be ? Get(source, P).
                Value element = arr->getProperty(std::to_string(i));

                // FlattenIntoArray step 3.e: Let shouldFlatten be false.
                // FlattenIntoArray step 3.f: If depth > 0, set shouldFlatten to
                //   ? IsArray(element).
                // SIMPLIFIED: Rift checks for object with .length instead of IsArray.
                // This means any array-like object will be flattened, not just Arrays.
                if(element.isObject()) {
                    auto* elementObj = element.getObject();
                    Value elementLengthVal = elementObj->getProperty("length");
                    if(elementLengthVal.isNumber()) {
                        // FlattenIntoArray step 3.g: If shouldFlatten is true, then
                        //   i. ... perform FlattenIntoArray recursively with depth - 1.
                        flattenArray(elementObj, currentDepth - 1);
                    } else {
                        // FlattenIntoArray step 3.h: Else, append element to target.
                        result.push_back(element);
                    }
                } else {
                    // FlattenIntoArray step 3.h: Else, append element to target.
                    result.push_back(element);
                }
            }
        }
    };

    flattenArray(arrayObj, depth);
    // 7. Return A.
    return Value(createArrayObject(getObjectFactory(), std::move(result)));
}

// 23.1.3.14 Array.prototype.flatMap ( mapperFunction [ , thisArg ] )
// @spec https://tc39.es/ecma262/#sec-array.prototype.flatmap
Value Array::flatMap(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = extractThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    // 3. If IsCallable(mapperFunction) is false, throw a TypeError exception.
    Value callback = args[0];
    if(!callback.isFunction()) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.flatMap callback must be a function"));
    }

    // 2. Let sourceLen be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);
    // 4. Let A be ? ArraySpeciesCreate(O, 0).
    // SIMPLIFIED: Rift creates a plain array instead of calling ArraySpeciesCreate.
    std::vector<Value> result;

    auto* callbackFn = dynamic_cast<JSFunction*>(callback.getObject());
    if(!callbackFn) {
        throw rift::core::JavaScriptException(
            Value("TypeError: Array.prototype.flatMap callback is not a function"));
    }

    // 5. Perform ? FlattenIntoArray(A, O, sourceLen, 0, 1, mapperFunction, thisArg).
    // SIMPLIFIED: Rift inlines the FlattenIntoArray logic with depth=1 and
    // the mapper function applied inline, rather than calling the abstract operation.
    for(size_t i = 0; i < length; ++i) {
        // FlattenIntoArray step 3.c: Let element be ? Get(source, P).
        Value element = arrayObj->getProperty(std::to_string(i));

        // FlattenIntoArray step 3.d (with mapperFunction):
        //   Set element to ? Call(mapperFunction, thisArg, << element, sourceIndex, source >>).
        // INCOMPLETE: thisArg (args[1]) is not forwarded to the callback.
        std::vector<Value> callArgs = {element, Value(static_cast<double>(i)), Value(arrayObj)};
        rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
        Value mappedValue = callbackFn->call(cbCtx, callArgs);

        // FlattenIntoArray step 3.f-g: If depth > 0 and IsArray(element), flatten one level.
        // SIMPLIFIED: Rift checks for object with .length instead of IsArray.
        if(mappedValue.isObject()) {
            auto* mappedObj = mappedValue.getObject();
            Value lengthVal = mappedObj->getProperty("length");
            if(lengthVal.isNumber()) {
                // Flatten one level: iterate through the mapped array's elements.
                size_t arrayLength = static_cast<size_t>(lengthVal.toNumber());
                for(size_t j = 0; j < arrayLength; ++j) {
                    Value arrayElement = mappedObj->getProperty(std::to_string(j));
                    result.push_back(arrayElement);
                }
            } else {
                // Not array-like, append as-is.
                result.push_back(mappedValue);
            }
        } else {
            // FlattenIntoArray step 3.h: Else, append element to target.
            result.push_back(mappedValue);
        }
    }

    // 6. Return A.
    return Value(createArrayObject(getObjectFactory(), std::move(result)));
}

}  // namespace rift::builtins
