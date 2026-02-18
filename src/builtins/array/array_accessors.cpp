// ============================================================================
// ECMA-262 -- Array Accessor Methods (indexOf, lastIndexOf, includes, slice,
//   concat, join, toString)
// @spec https://tc39.es/ecma262/#sec-array.prototype.indexof (and related sections)
// See also: array.cpp (constructor/statics), array_mutators.cpp (push, pop, etc.),
//           array_iterators.cpp (forEach, map, filter, etc.)
// ============================================================================

#include <cmath>

#include "rift/builtins/array/array.h"
#include "rift/interpreter/this_helpers.h"

namespace rift::builtins {

using rift::core::extractThisObject;

// NON-STANDARD: getLength is an internal helper, not a spec method.
// The spec defines "length" as a data property on Array instances (23.1.4.1),
// not a prototype method.
// @spec https://tc39.es/ecma262/#sec-properties-of-array-instances-length
Value Array::getLength(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = extractThisObject(ctx);
    if(!arrayObj) {
        return Value(0.0);
    }

    return Value(static_cast<double>(getArrayLength(arrayObj)));
}

// 23.1.3.14 Array.prototype.indexOf ( searchElement [ , fromIndex ] )
// @spec https://tc39.es/ecma262/#sec-array.prototype.indexof
Value Array::indexOf(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    // SIMPLIFIED: Rift uses extractThisObject which combines ToObject + type check.
    auto* arrayObj = extractThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value(-1.0);
    }

    Value searchElement = args[0];
    size_t fromIndex = 0;

    // 3. Let n be ? ToIntegerOrInfinity(fromIndex).
    // 4. Assert: If fromIndex is undefined, then n is 0.
    // 5-6. Compute k from n and len.
    // INCOMPLETE: Negative fromIndex values are not handled. The spec says if
    // n < 0, let k = max(len + n, 0). This implementation ignores negative values.
    if(args.size() >= 2) {
        double fromIndexNum = args[1].toNumber();
        if(!std::isnan(fromIndexNum) && fromIndexNum >= 0) {
            fromIndex = static_cast<size_t>(fromIndexNum);
        }
    }

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);

    // 7. Repeat, while k < len,
    for(size_t i = fromIndex; i < length; ++i) {
        //    a. Let elementK be ? Get(O, ! ToString(F(k))).
        Value element = arrayObj->getProperty(std::to_string(i));
        //    b. If IsStrictlyEqual(searchElement, elementK) is true, return F(k).
        // DEVIATION: Uses toString() comparison + type check instead of
        // IsStrictlyEqual (7.2.16). This may differ for objects and NaN.
        if(element.toString() == searchElement.toString() &&
           element.getType() == searchElement.getType()) {
            return Value(static_cast<double>(i));
        }
    }

    // 8. Return -1F.
    return Value(-1.0);
}

// 23.1.3.17 Array.prototype.lastIndexOf ( searchElement [ , fromIndex ] )
// @spec https://tc39.es/ecma262/#sec-array.prototype.lastindexof
Value Array::lastIndexOf(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = extractThisObject(ctx);
    if(!arrayObj || args.empty()) {
        return Value(-1.0);
    }

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);
    // 3. If len = 0, return -1F.
    if(length == 0) {
        return Value(-1.0);
    }

    Value searchElement = args[0];

    // 4. If fromIndex is present, let n be ? ToIntegerOrInfinity(fromIndex);
    //    else let n be len - 1.
    // 5-6. Compute k from n.
    // INCOMPLETE: The fromIndex parameter is not handled. The spec says the
    // search starts at fromIndex (defaulting to len - 1), but this
    // implementation always searches from the end.

    // 7. Repeat, while k >= 0,
    for(size_t i = length; i > 0; --i) {
        //    a. Let kPresent be ? HasProperty(O, ! ToString(F(k))).
        //    b. If kPresent is true, then
        //       i. Let elementK be ? Get(O, ! ToString(F(k))).
        Value element = arrayObj->getProperty(std::to_string(i - 1));

        //       ii. If IsStrictlyEqual(searchElement, elementK) is true, return F(k).
        if(element.strictEquals(searchElement)) {
            return Value(static_cast<double>(i - 1));
        }
    }

    // 8. Return -1F.
    return Value(-1.0);
}

// 23.1.3.15 Array.prototype.includes ( searchElement [ , fromIndex ] )
// @spec https://tc39.es/ecma262/#sec-array.prototype.includes
// SIMPLIFIED: Delegates to indexOf and checks result >= 0.
// The spec uses SameValueZero comparison (7.2.12), but this delegates to
// indexOf which uses IsStrictlyEqual-like comparison. This means NaN cannot
// be found (spec says [NaN].includes(NaN) === true, but this returns false).
Value Array::includes(const CallContext& ctx, const std::vector<Value>& args) {
    Value indexResult = indexOf(ctx, args);
    return Value(indexResult.toNumber() >= 0);
}

// 23.1.3.25 Array.prototype.slice ( start, end )
// @spec https://tc39.es/ecma262/#sec-array.prototype.slice
Value Array::slice(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = extractThisObject(ctx);
    if(!arrayObj) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);
    size_t start = 0;
    size_t end = length;

    // 3. Let relativeStart be ? ToIntegerOrInfinity(start).
    // 4. If relativeStart = -Infinity, let k be 0.
    // 5. Else if relativeStart < 0, let k be max(len + relativeStart, 0).
    // 6. Else, let k be min(relativeStart, len).
    if(!args.empty()) {
        double startNum = args[0].toNumber();
        if(!std::isnan(startNum)) {
            if(startNum < 0) {
                start = static_cast<size_t>(std::max(0.0, static_cast<double>(length) + startNum));
            } else {
                start = std::min(static_cast<size_t>(startNum), length);
            }
        }
    }

    // 7. If end is undefined, let relativeEnd be len;
    //    else let relativeEnd be ? ToIntegerOrInfinity(end).
    // 8. If relativeEnd = -Infinity, let final be 0.
    // 9. Else if relativeEnd < 0, let final be max(len + relativeEnd, 0).
    // 10. Else, let final be min(relativeEnd, len).
    if(args.size() >= 2 && !args[1].isUndefined()) {
        double endNum = args[1].toNumber();
        if(!std::isnan(endNum)) {
            if(endNum < 0) {
                end = static_cast<size_t>(std::max(0.0, static_cast<double>(length) + endNum));
            } else {
                end = std::min(static_cast<size_t>(endNum), length);
            }
        }
    }

    // 11. Let count be max(final - k, 0).
    // 12. Let A be ? ArraySpeciesCreate(O, count).
    // INCOMPLETE: ArraySpeciesCreate (23.1.3.1.1) is not used. The spec respects
    // Symbol.species for subclassed arrays; Rift always creates a plain Array.
    std::vector<Value> sliced;
    // 13. Let n be 0.
    // 14. Repeat, while k < final,
    for(size_t i = start; i < end; ++i) {
        //     a. Let Pk be ! ToString(F(k)).
        //     b. Let kPresent be ? HasProperty(O, Pk).
        //     c. If kPresent is true, then
        //        i. Let kValue be ? Get(O, Pk).
        //        ii. Perform ? CreateDataPropertyOrThrow(A, ! ToString(F(n)), kValue).
        Value element = arrayObj->getProperty(std::to_string(i));
        sliced.push_back(element);
    }

    // 15. Perform ? Set(A, "length", F(n), true).
    // 16. Return A.
    return Value(createArrayObject(getObjectFactory(), std::move(sliced)));
}

// 23.1.3.1 Array.prototype.concat ( ...items )
// @spec https://tc39.es/ecma262/#sec-array.prototype.concat
Value Array::concat(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = extractThisObject(ctx);
    if(!arrayObj) {
        return Value(createArrayObject(getObjectFactory(), {}));
    }

    // 2. Let A be ? ArraySpeciesCreate(O, 0).
    // INCOMPLETE: ArraySpeciesCreate is not used; always creates a plain Array.
    // This affects subclassed arrays that override Symbol.species.
    std::vector<Value> result;
    // 3. Let n be 0.
    size_t length = getArrayLength(arrayObj);

    // 4. Prepend O to items.
    // 5. For each element E of items, do
    //    a. Let spreadable be ? IsConcatSpreadable(E).
    // SIMPLIFIED: IsConcatSpreadable (23.1.3.1.1) is not called. The spec checks
    // Symbol.isConcatSpreadable on each element. Rift spreads all objects
    // (treating them as array-like) and appends all non-objects directly.

    //    b. If spreadable is true, then (for the this-array, always spread)
    //       i-iv. Copy elements from E into A.
    for(size_t i = 0; i < length; ++i) {
        Value element = arrayObj->getProperty(std::to_string(i));
        result.push_back(element);
    }

    //    (Continue for each argument in items)
    for(size_t i = 0; i < args.size(); ++i) {
        if(args[i].isObject()) {
            // DEVIATION: Spreads all objects, not just those that are
            // IsConcatSpreadable. Non-array objects with a .length property
            // will be spread when they shouldn't be per spec.
            auto* otherArray = args[i].getObject();
            size_t otherLength = getArrayLength(otherArray);
            for(size_t j = 0; j < otherLength; ++j) {
                Value element = otherArray->getProperty(std::to_string(j));
                result.push_back(element);
            }
        } else {
            //    c. Else (spreadable is false),
            //       i. Perform ? CreateDataPropertyOrThrow(A, ! ToString(F(n)), E).
            //       ii. Set n to n + 1.
            result.push_back(args[i]);
        }
    }

    // 6. Perform ? Set(A, "length", F(n), true).
    // 7. Return A.
    return Value(createArrayObject(getObjectFactory(), std::move(result)));
}

// 23.1.3.16 Array.prototype.join ( separator )
// @spec https://tc39.es/ecma262/#sec-array.prototype.join
Value Array::join(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let O be ? ToObject(this value).
    auto* arrayObj = extractThisObject(ctx);
    if(!arrayObj) {
        return Value("");
    }

    // 2. Let len be ? LengthOfArrayLike(O).
    size_t length = getArrayLength(arrayObj);

    // 3. If separator is undefined, let sep be ",".
    // 4. Else, let sep be ? ToString(separator).
    std::string separator = ",";
    if(!args.empty() && !args[0].isUndefined()) {
        separator = args[0].toString();
    }

    // 5. Let R be the empty String.
    std::string result = "";

    // 6. Let k be 0.
    // 7. Repeat, while k < len,
    for(size_t i = 0; i < length; ++i) {
        //    a. If k > 0, set R to the string-concatenation of R and sep.
        if(i > 0) {
            result += separator;
        }

        //    b. Let element be ? Get(O, ! ToString(F(k))).
        Value element = arrayObj->getProperty(std::to_string(i));
        //    c. If element is undefined or null, let next be the empty String.
        //    d. Else, let next be ? ToString(element).
        if(!element.isUndefined() && !element.isNull()) {
            result += element.toString();
        }
        //    e. Set R to the string-concatenation of R and next.
        //    f. Set k to k + 1.
    }

    // 8. Return R.
    return Value(std::move(result));
}

// 23.1.3.30 Array.prototype.toString ( )
// @spec https://tc39.es/ecma262/#sec-array.prototype.tostring
// SIMPLIFIED: The spec says:
//   1. Let array be ? ToObject(this value).
//   2. Let func be ? Get(array, "join").
//   3. If IsCallable(func) is false, set func to %Object.prototype.toString%.
//   4. Return ? Call(func, array).
// Rift inlines the join logic with "," separator directly instead of
// looking up and calling the "join" method. This means overriding
// Array.prototype.join will not affect toString behavior.
Value Array::toString(const CallContext& ctx, const std::vector<Value>& args) {
    auto* arrayObj = extractThisObject(ctx);
    if(!arrayObj) {
        return Value("");
    }

    size_t length = getArrayLength(arrayObj);
    std::string result = "";

    for(size_t i = 0; i < length; ++i) {
        if(i > 0) {
            result += ",";
        }
        Value element = arrayObj->getProperty(std::to_string(i));
        if(!element.isUndefined() && !element.isNull()) {
            result += element.toString();
        }
    }

    return Value(std::move(result));
}

}  // namespace rift::builtins
