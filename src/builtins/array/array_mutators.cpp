// ============================================================================
// ECMA-262 -- Array Mutator Methods (23.1.3)
// Methods that modify the array in place: push, pop, shift, unshift,
// splice, reverse, sort.
// @spec https://tc39.es/ecma262/#sec-properties-of-the-array-prototype-object
//
// See also: array.cpp (constructor, statics, setup),
//           array_accessors.cpp (indexOf, slice, concat, join, includes),
//           array_iterators.cpp (forEach, map, filter, reduce, find, every, some)
// ============================================================================

#include <algorithm>
#include <cmath>
#include <limits>

#include "rift/builtins/array/array.h"
#include "rift/builtins/error/range_error.h"
#include "rift/interpreter/call_context.h"
#include "rift/interpreter/evaluation_utils.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/interpreter/this_helpers.h"

namespace rift::builtins {

using rift::core::thisToObject;

// 23.1.3.21 Array.prototype.push ( ...items )
// @spec https://tc39.es/ecma262/#sec-array.prototype.push
Value Array::push(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = thisToObject(ctx, "Array.prototype.push");

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);

    // 3. Let argCount be the number of elements in items.
    // 5. For each element E of items, do
    for(size_t i = 0; i < args.size(); ++i) {
        //   a. Perform ? Set(O, ! ToString(𝔽(len)), E, true).
        arrayObj->setProperty(std::to_string(length), args[i]);
        //   b. Set len to len + 1𝔽.
        length++;
    }

    // 4. If len + argCount > 2^53 - 1, throw a TypeError exception.
    // For arrays, throw RangeError when resulting length > MAX_ARRAY_LENGTH.
    // DEVIATION: Properties are set above before this check (spec says check first).
    // This matches V8's observable behavior where the property is set before the throw.
    if(length > core::EvaluationUtils::MAX_ARRAY_LENGTH) {
        Value err = RangeError::constructor({Value("Invalid array length")});
        throw rift::core::JavaScriptException(err);
    }

    // 6. Perform ? Set(O, "length", 𝔽(len), true).
    setArrayLength(arrayObj, length);

    // 7. Return 𝔽(len).
    return Value(static_cast<double>(length));
}

// 23.1.3.20 Array.prototype.pop ( )
// @spec https://tc39.es/ecma262/#sec-array.prototype.pop
Value Array::pop(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = thisToObject(ctx, "Array.prototype.pop");

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);

    // 3. If len = 0, then
    if(length == 0) {
        //   a. Perform ? Set(O, "length", +0𝔽, true).
        //   DEVIATION: length is already 0, no explicit Set needed.
        //   b. Return undefined.
        return Value::undefined();
    }

    // 4. Else,
    //   a. Assert: len > 0.
    //   b. Let newLen be 𝔽(len - 1).
    //   c. Let index be ! ToString(newLen).
    //   d. Let element be ? Get(O, index).
    Value lastElement = arrayObj->getProperty(std::to_string(length - 1));
    //   e. Perform ? DeletePropertyOrThrow(O, index).
    // DEVIATION: Rift sets to undefined instead of deleting the property.
    // The spec requires DeletePropertyOrThrow which removes the property entirely.
    arrayObj->setProperty(std::to_string(length - 1), Value::undefined());
    //   f. Perform ? Set(O, "length", newLen, true).
    setArrayLength(arrayObj, length - 1);

    //   g. Return element.
    return lastElement;
}

// 23.1.3.24 Array.prototype.shift ( )
// @spec https://tc39.es/ecma262/#sec-array.prototype.shift
Value Array::shift(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = thisToObject(ctx, "Array.prototype.shift");

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);

    // 3. If len = 0, then
    if(length == 0) {
        //   a. Perform ? Set(O, "length", +0𝔽, true).
        //   b. Return undefined.
        return Value::undefined();
    }

    // 4. Let first be ? Get(O, "0").
    Value firstElement = arrayObj->getProperty("0");

    // 5. Let k be 1.
    // 6. Repeat, while k < len,
    for(size_t i = 1; i < length; ++i) {
        //   a. Let from be ! ToString(𝔽(k)).
        //   b. Let to be ! ToString(𝔽(k - 1)).
        //   c. Let fromPresent be ? HasProperty(O, from).
        //   d. If fromPresent is true, then
        //     i. Let fromVal be ? Get(O, from).
        Value element = arrayObj->getProperty(std::to_string(i));
        //     ii. Perform ? Set(O, to, fromVal, true).
        arrayObj->setProperty(std::to_string(i - 1), element);
        //   e. Else, (fromPresent is false)
        //     i. Perform ? DeletePropertyOrThrow(O, to).
        //   INCOMPLETE: Does not handle holes (missing properties). All indices are
        //   treated as present. The spec distinguishes present vs absent properties.
        //   f. Set k to k + 1.
    }

    // 7. Perform ? DeletePropertyOrThrow(O, ! ToString(𝔽(len - 1))).
    arrayObj->deleteProperty(std::to_string(length - 1));
    // 8. Perform ? Set(O, "length", 𝔽(len - 1), true).
    setArrayLength(arrayObj, length - 1);

    // 9. Return first.
    return firstElement;
}

// 23.1.3.33 Array.prototype.unshift ( ...items )
// @spec https://tc39.es/ecma262/#sec-array.prototype.unshift
Value Array::unshift(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = thisToObject(ctx, "Array.prototype.unshift");

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);
    // 3. Let argCount be the number of elements in items.
    size_t numArgs = args.size();

    // 4. If argCount > 0, then
    if(numArgs == 0) {
        // (No items to unshift — skip to step 5.)
        return Value(static_cast<double>(length));
    }

    //   a. If len + argCount > 2^53 - 1, throw a TypeError exception.
    //   INCOMPLETE: No overflow check / TypeError for len + argCount > 2^53 - 1.

    //   b. Let k be len.
    //   c. Repeat, while k > 0,
    for(size_t i = length; i > 0; --i) {
        //     i. Let from be ! ToString(𝔽(k - 1)).
        //     ii. Let to be ! ToString(𝔽(k + argCount - 1)).
        //     iii. Let fromPresent be ? HasProperty(O, from).
        //     iv. If fromPresent is true, then
        //       1. Let fromValue be ? Get(O, from).
        Value element = arrayObj->getProperty(std::to_string(i - 1));
        //       2. Perform ? Set(O, to, fromValue, true).
        arrayObj->setProperty(std::to_string(i - 1 + numArgs), element);
        //     v. Else, (fromPresent is false)
        //       1. Perform ? DeletePropertyOrThrow(O, to).
        //     INCOMPLETE: Does not handle holes (missing properties).
        //     vi. Set k to k - 1.
    }

    //   d. Let j be +0𝔽.
    //   e. For each element E of items, do
    for(size_t i = 0; i < numArgs; ++i) {
        //     i. Perform ? Set(O, ! ToString(j), E, true).
        arrayObj->setProperty(std::to_string(i), args[i]);
        //     ii. Set j to j + 1𝔽.
    }

    // 5. Perform ? Set(O, "length", 𝔽(len + argCount), true).
    size_t newLength = length + numArgs;
    setArrayLength(arrayObj, newLength);

    // 6. Return 𝔽(len + argCount).
    return Value(static_cast<double>(newLength));
}

// 23.1.3.28 Array.prototype.splice ( start, deleteCount, ...items )
// @spec https://tc39.es/ecma262/#sec-array.prototype.splice
Value Array::splice(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = thisToObject(ctx, "Array.prototype.splice");

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);

    // 3. Let relativeStart be ? ToIntegerOrInfinity(start).
    // 4. If relativeStart = -Infinity, let actualStart be 0.
    // 5. Else if relativeStart < 0, let actualStart be max(len + relativeStart, 0).
    // 6. Else, let actualStart be min(relativeStart, len).
    int start = 0;
    if(!args.empty()) {
        start = static_cast<int>(args[0].toNumber());
        if(start < 0) {
            start = std::max(0, static_cast<int>(length) + start);
        } else {
            start = std::min(start, static_cast<int>(length));
        }
    }

    // 7. Let insertCount and actualDeleteCount be 0.
    // 8. If the number of actual arguments is 0, then (no-op).
    // 9. Else if the number of actual arguments is 1, then
    //   a. Let actualDeleteCount be len - actualStart.
    // 10. Else,
    //   a. Let dc be ? ToIntegerOrInfinity(deleteCount).
    //   b. Let actualDeleteCount be the result of clamping dc between 0 and len - actualStart.
    int deleteCount = static_cast<int>(length) - start;
    if(args.size() > 1) {
        deleteCount = std::max(0, static_cast<int>(args[1].toNumber()));
        deleteCount = std::min(deleteCount, static_cast<int>(length) - start);
    }

    // 11. If len + insertCount - actualDeleteCount > 2^53 - 1, throw a TypeError.
    // INCOMPLETE: No overflow check / TypeError.

    // Collect items to insert (spec step 10 context: items are args[2..]).
    std::vector<Value> itemsToInsert;
    for(size_t i = 2; i < args.size(); ++i) {
        itemsToInsert.push_back(args[i]);
    }

    // 12. Let A be ? ArraySpeciesCreate(O, actualDeleteCount).
    // SIMPLIFIED: Rift creates a plain array instead of using ArraySpeciesCreate.
    // This means subclassed arrays won't get the correct species constructor.
    // 13. Let k be 0.
    // 14. Repeat, while k < actualDeleteCount,
    std::vector<Value> deletedElements;
    for(int i = 0; i < deleteCount; ++i) {
        //   a. Let from be ! ToString(𝔽(actualStart + k)).
        //   b. If ? HasProperty(O, from) is true, then
        //     i. Let fromValue be ? Get(O, from).
        Value element = arrayObj->getProperty(std::to_string(start + i));
        //     ii. Perform ! CreateDataPropertyOrThrow(A, ! ToString(𝔽(k)), fromValue).
        deletedElements.push_back(element);
        //   c. Set k to k + 1.
    }
    // 15. Perform ? Set(A, "length", 𝔽(actualDeleteCount), true).
    // (Handled implicitly by createArrayObject below.)

    // 16. Let itemCount be the number of elements in items.
    int lengthChange = static_cast<int>(itemsToInsert.size()) - deleteCount;
    size_t newLength;

    if(lengthChange >= 0) {
        size_t itemsAdded = static_cast<size_t>(lengthChange);
        if(length > core::EvaluationUtils::MAX_ARRAY_LENGTH - itemsAdded) {
            newLength = core::EvaluationUtils::MAX_ARRAY_LENGTH;
        } else {
            newLength = length + itemsAdded;
        }
    } else {
        newLength = length - static_cast<size_t>(-lengthChange);
    }

    // 17. If itemCount < actualDeleteCount, then
    //   a. Let k be actualStart.
    //   b. Repeat, while k < (len - actualDeleteCount),
    //     i. ... shift elements left ...
    //   c. Let k be len.
    //   d. Repeat, while k > (len - actualDeleteCount + itemCount),
    //     i. Perform ? DeletePropertyOrThrow(O, ! ToString(𝔽(k - 1))).
    //     ii. Set k to k - 1.
    // 18. Else if itemCount > actualDeleteCount, then
    //   a. Let k be (len - actualDeleteCount).
    //   b. Repeat, while k > actualStart,
    //     i. ... shift elements right ...
    if(static_cast<int>(itemsToInsert.size()) > deleteCount) {
        // Step 18: itemCount > actualDeleteCount — shift elements right.
        int shift = static_cast<int>(itemsToInsert.size()) - deleteCount;
        for(int i = static_cast<int>(length) - 1; i >= start + deleteCount; --i) {
            Value element = arrayObj->getProperty(std::to_string(i));
            arrayObj->setProperty(std::to_string(i + shift), element);
        }
    } else if(static_cast<int>(itemsToInsert.size()) < deleteCount) {
        // Step 17: itemCount < actualDeleteCount — shift elements left.
        int shift = deleteCount - static_cast<int>(itemsToInsert.size());
        for(int i = start + deleteCount; i < static_cast<int>(length); ++i) {
            Value element = arrayObj->getProperty(std::to_string(i));
            arrayObj->setProperty(std::to_string(i - shift), element);
        }
        // Step 17c-d: Delete trailing properties.
        // DEVIATION: Rift sets trailing slots to undefined instead of using
        // DeletePropertyOrThrow. The spec requires actual property deletion.
        for(size_t i = newLength; i < length; ++i) {
            arrayObj->setProperty(std::to_string(i), Value::undefined());
        }
    }

    // 19. Let k be actualStart.
    // 20. For each element E of items, do
    for(int i = 0; i < static_cast<int>(itemsToInsert.size()); ++i) {
        //   a. Perform ? Set(O, ! ToString(𝔽(k)), E, true).
        arrayObj->setProperty(std::to_string(start + i), itemsToInsert[static_cast<size_t>(i)]);
        //   b. Set k to k + 1.
    }

    // 21. Perform ? Set(O, "length", 𝔽(len - actualDeleteCount + itemCount), true).
    setArrayLength(arrayObj, newLength);

    // 22. Return A.
    return Value(createArrayObject(getObjectFactory(), deletedElements));
}

// 23.1.3.22 Array.prototype.reverse ( )
// @spec https://tc39.es/ecma262/#sec-array.prototype.reverse
Value Array::reverse(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = thisToObject(ctx, "Array.prototype.reverse");

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);

    // 3. Let middle be floor(len / 2).
    // 4. Let lower be 0.
    // 5. Repeat, while lower != middle,
    for(size_t i = 0; i < length / 2; ++i) {
        //   a. Let upper be len - 1 - lower.
        size_t j = length - 1 - i;

        //   b. Let upperP be ! ToString(𝔽(upper)).
        //   c. Let lowerP be ! ToString(𝔽(lower)).
        //   d. Let lowerExists be ? HasProperty(O, lowerP).
        //   e. If lowerExists is true, let lowerValue be ? Get(O, lowerP).
        Value temp = arrayObj->getProperty(std::to_string(i));
        //   f. Let upperExists be ? HasProperty(O, upperP).
        //   g. If upperExists is true, let upperValue be ? Get(O, upperP).
        Value other = arrayObj->getProperty(std::to_string(j));

        //   h-k. Swap/delete based on lowerExists and upperExists.
        // SIMPLIFIED: Rift always swaps both values without checking HasProperty.
        // The spec handles four cases: both exist, only lower, only upper, neither.
        // Holes (missing properties) are not preserved — they become undefined.
        arrayObj->setProperty(std::to_string(i), other);
        arrayObj->setProperty(std::to_string(j), temp);
        //   l. Set lower to lower + 1.
    }

    // 6. Return O.
    return Value(arrayObj);
}

// 23.1.3.27 Array.prototype.sort ( comparefn )
// @spec https://tc39.es/ecma262/#sec-array.prototype.sort
Value Array::sort(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If comparefn is not undefined and IsCallable(comparefn) is false,
    //    throw a TypeError exception.
    // INCOMPLETE: Rift silently ignores non-callable, non-undefined comparefn
    // values instead of throwing TypeError.

    // 2. Let obj be ? ToObject(this value).
    auto* arrayObj = thisToObject(ctx, "Array.prototype.sort");

    // 3. Let len be ? LengthOfArrayLike(obj).
    size_t length = getArrayLength(arrayObj);

    if(length <= 1) {
        return Value(arrayObj);
    }

    // Resolve comparefn (spec step 1 context).
    JSFunction* compareFn = nullptr;
    if(!args.empty() && args[0].isFunction()) {
        compareFn = dynamic_cast<JSFunction*>(args[0].getObject());
    }

    // 4-5. The spec defines SortCompare as an Abstract Closure and then says:
    //   "Sort the elements of obj ... using ... SortCompare."
    //   The implementation-defined sort algorithm must be stable and consistent.

    // SIMPLIFIED: Rift collects all elements into a vector, sorts with std::sort,
    // then writes back. The spec operates on the object's properties directly and
    // handles holes (absent properties) by moving them to the end. Rift treats all
    // indices as present and does not distinguish holes from undefined values.

    // Collect elements into a temporary vector.
    std::vector<Value> elements;
    for(size_t i = 0; i < length; ++i) {
        elements.push_back(arrayObj->getProperty(std::to_string(i)));
    }

    // Sort using SortCompare:
    //   - If comparefn is not undefined, return comparefn(x, y).
    //   - Otherwise, compare ToString(x) < ToString(y).
    // DEVIATION: The spec's SortCompare (23.1.3.27.1) handles undefined values
    // specially (they sort to the end). Rift's comparator does not special-case
    // undefined, so undefined values sort lexicographically as "undefined".
    std::sort(elements.begin(), elements.end(), [compareFn](const Value& a, const Value& b) {
        if(compareFn) {
            rift::core::CallContext cbCtx(rift::core::CallType::Function, Value::undefined());
            Value result = compareFn->call(cbCtx, {a, b});
            return result.toNumber() < 0;
        }
        return a.toString() < b.toString();
    });

    // Write sorted elements back to the array.
    for(size_t i = 0; i < length; ++i) {
        arrayObj->setProperty(std::to_string(i), elements[i]);
    }

    // 6. Return obj.
    return Value(arrayObj);
}

// 23.1.3.7 Array.prototype.fill ( value [ , start [ , end ] ] )
// @spec https://tc39.es/ecma262/#sec-array.prototype.fill
Value Array::fill(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = thisToObject(ctx, "Array.prototype.fill");

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);

    // 3. Let value be the first argument (or undefined if not provided).
    Value value = args.empty() ? Value::undefined() : args[0];

    // 4. Let relativeStart be ? ToIntegerOrInfinity(start).
    // 5. If relativeStart = -inf, let k be 0.
    // 6. Else if relativeStart < 0, let k be max(len + relativeStart, 0).
    // 7. Else, let k be min(relativeStart, len).
    size_t k = 0;
    if(args.size() >= 2 && !args[1].isUndefined()) {
        double start_num = args[1].toNumber();
        if(std::isnan(start_num)) {
            k = 0;
        } else if(start_num < 0) {
            double resolved = static_cast<double>(length) + start_num;
            k = resolved < 0 ? 0 : static_cast<size_t>(resolved);
        } else {
            k = static_cast<size_t>(std::min(start_num, static_cast<double>(length)));
        }
    }

    // 8. If end is undefined, let relativeEnd be len; else let relativeEnd be
    //    ? ToIntegerOrInfinity(end).
    // 9. If relativeEnd = -inf, let final be 0.
    // 10. Else if relativeEnd < 0, let final be max(len + relativeEnd, 0).
    // 11. Else, let final be min(relativeEnd, len).
    size_t final_idx = length;
    if(args.size() >= 3 && !args[2].isUndefined()) {
        double end_num = args[2].toNumber();
        if(std::isnan(end_num)) {
            final_idx = 0;
        } else if(end_num < 0) {
            double resolved = static_cast<double>(length) + end_num;
            final_idx = resolved < 0 ? 0 : static_cast<size_t>(resolved);
        } else {
            final_idx = static_cast<size_t>(std::min(end_num, static_cast<double>(length)));
        }
    }

    // 12. Repeat, while k < final,
    while(k < final_idx) {
        //   a. Let Pk be ! ToString(𝔽(k)).
        //   b. Perform ? Set(O, Pk, value, true).
        arrayObj->setProperty(std::to_string(k), value);
        //   c. Set k to k + 1.
        k++;
    }

    // 13. Return O.
    return Value(arrayObj);
}

// 23.1.3.4 Array.prototype.copyWithin ( target, start [ , end ] )
// @spec https://tc39.es/ecma262/#sec-array.prototype.copywithin
Value Array::copyWithin(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = thisToObject(ctx, "Array.prototype.copyWithin");

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);

    // 3. Let relativeTarget be ? ToIntegerOrInfinity(target).
    // 4-6. Resolve to based on sign.
    double target_num = args.empty() ? 0.0 : args[0].toNumber();
    size_t to;
    if(std::isnan(target_num)) {
        to = 0;
    } else if(target_num < 0) {
        double resolved = static_cast<double>(length) + target_num;
        to = resolved < 0 ? 0 : static_cast<size_t>(resolved);
    } else {
        to = static_cast<size_t>(std::min(target_num, static_cast<double>(length)));
    }

    // 7. Let relativeStart be ? ToIntegerOrInfinity(start).
    // 8-10. Resolve from based on sign.
    double start_num = args.size() >= 2 ? args[1].toNumber() : 0.0;
    size_t from;
    if(std::isnan(start_num)) {
        from = 0;
    } else if(start_num < 0) {
        double resolved = static_cast<double>(length) + start_num;
        from = resolved < 0 ? 0 : static_cast<size_t>(resolved);
    } else {
        from = static_cast<size_t>(std::min(start_num, static_cast<double>(length)));
    }

    // 11. If end is undefined, let relativeEnd be len; else let relativeEnd be
    //     ? ToIntegerOrInfinity(end).
    // 12-14. Resolve final based on sign.
    size_t final_idx = length;
    if(args.size() >= 3 && !args[2].isUndefined()) {
        double end_num = args[2].toNumber();
        if(std::isnan(end_num)) {
            final_idx = 0;
        } else if(end_num < 0) {
            double resolved = static_cast<double>(length) + end_num;
            final_idx = resolved < 0 ? 0 : static_cast<size_t>(resolved);
        } else {
            final_idx = static_cast<size_t>(std::min(end_num, static_cast<double>(length)));
        }
    }

    // 15. Let count be min(final - from, len - to).
    size_t count = 0;
    if(final_idx > from && length > to) {
        count = std::min(final_idx - from, length - to);
    }

    // 16. If from < to and to < from + count, then
    //   a. Let direction be -1.
    //   b. Set from to from + count - 1.
    //   c. Set to to to + count - 1.
    // 17. Else,
    //   a. Let direction be 1.
    int direction;
    if(from < to && to < from + count) {
        // Copy backwards to handle overlapping ranges
        direction = -1;
        from = from + count - 1;
        to = to + count - 1;
    } else {
        direction = 1;
    }

    // 18. Repeat, while count > 0,
    while(count > 0) {
        //   a. Let fromKey be ! ToString(𝔽(from)).
        //   b. Let toKey be ! ToString(𝔽(to)).
        //   c. Let fromPresent be ? HasProperty(O, fromKey).
        //   d. If fromPresent is true, then
        //     i. Let fromVal be ? Get(O, fromKey).
        //     ii. Perform ? Set(O, toKey, fromVal, true).
        Value val = arrayObj->getProperty(std::to_string(from));
        arrayObj->setProperty(std::to_string(to), val);
        //   e. Else, (fromPresent is false)
        //     i. Perform ? DeletePropertyOrThrow(O, toKey).
        //   INCOMPLETE: Does not handle holes (missing properties).
        //   f. Set from to from + direction.
        //   g. Set to to to + direction.
        if(direction == 1) {
            from++;
            to++;
        } else {
            from--;
            to--;
        }
        //   h. Set count to count - 1.
        count--;
    }

    // 19. Return O.
    return Value(arrayObj);
}

}  // namespace rift::builtins
