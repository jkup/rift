#include "rift/builtins/number/number.h"

#include <cmath>
#include <iomanip>
#include <limits>
#include <sstream>

#include "rift/builtins/builtin_manager.h"
#include "rift/interpreter/call_context.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/interpreter/this_helpers.h"
#include "rift/memory/gc_protector.h"

// ============================================================================
// ECMA-262 — Number Objects
// @spec https://tc39.es/ecma262/#sec-number-objects
// ============================================================================

namespace rift::builtins {

using rift::core::CallContext;
using rift::core::extractThisNumber;

// 21.1.2 Properties of the Number Constructor
// @spec https://tc39.es/ecma262/#sec-properties-of-the-number-constructor
// These values are from the IEEE 754 double-precision 64-bit binary format
static constexpr double MAX_VALUE = 1.7976931348623157e+308;
static constexpr double MIN_VALUE = 5e-324;
static constexpr double MAX_SAFE_INTEGER = 9007199254740991.0;   // 2^53 - 1
static constexpr double MIN_SAFE_INTEGER = -9007199254740991.0;  // -(2^53 - 1)
static constexpr double EPSILON = 2.220446049250313e-16;         // 2^-52

// 21.1.2 Properties of the Number Constructor
// @spec https://tc39.es/ecma262/#sec-properties-of-the-number-constructor
void Number::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // 21.1.2.10 Number.NaN
    // @spec https://tc39.es/ecma262/#sec-number.nan
    RIFT_PROPERTY(constructor, "NaN", Value(std::numeric_limits<double>::quiet_NaN()));
    // 21.1.2.14 Number.POSITIVE_INFINITY
    // @spec https://tc39.es/ecma262/#sec-number.positive_infinity
    RIFT_PROPERTY(constructor, "POSITIVE_INFINITY", Value(std::numeric_limits<double>::infinity()));
    // 21.1.2.11 Number.NEGATIVE_INFINITY
    // @spec https://tc39.es/ecma262/#sec-number.negative_infinity
    RIFT_PROPERTY(constructor, "NEGATIVE_INFINITY",
                  Value(-std::numeric_limits<double>::infinity()));
    // 21.1.2.7 Number.MAX_VALUE
    // @spec https://tc39.es/ecma262/#sec-number.max_value
    RIFT_PROPERTY(constructor, "MAX_VALUE", Value(MAX_VALUE));
    // 21.1.2.9 Number.MIN_VALUE
    // @spec https://tc39.es/ecma262/#sec-number.min_value
    RIFT_PROPERTY(constructor, "MIN_VALUE", Value(MIN_VALUE));
    // 21.1.2.6 Number.MAX_SAFE_INTEGER
    // @spec https://tc39.es/ecma262/#sec-number.max_safe_integer
    RIFT_PROPERTY(constructor, "MAX_SAFE_INTEGER", Value(MAX_SAFE_INTEGER));
    // 21.1.2.8 Number.MIN_SAFE_INTEGER
    // @spec https://tc39.es/ecma262/#sec-number.min_safe_integer
    RIFT_PROPERTY(constructor, "MIN_SAFE_INTEGER", Value(MIN_SAFE_INTEGER));
    // 21.1.2.1 Number.EPSILON
    // @spec https://tc39.es/ecma262/#sec-number.epsilon
    RIFT_PROPERTY(constructor, "EPSILON", Value(EPSILON));

    // Number static methods (21.1.2)
    RIFT_STATIC_METHOD(constructor, "isNaN", Number::isNaN);
    RIFT_STATIC_METHOD(constructor, "isFinite", Number::isFinite);
    RIFT_STATIC_METHOD(constructor, "isInteger", Number::isInteger);
    RIFT_STATIC_METHOD(constructor, "isSafeInteger", Number::isSafeInteger);
    RIFT_STATIC_METHOD(constructor, "parseFloat", Number::parseFloat);
    RIFT_STATIC_METHOD(constructor, "parseInt", Number::parseInt);
}

// 21.1.3 Properties of the Number Prototype Object
// @spec https://tc39.es/ecma262/#sec-properties-of-the-number-prototype-object
void Number::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    RIFT_METHOD(prototype, "toString", Number::toString);
    RIFT_METHOD(prototype, "valueOf", Number::valueOf);
    RIFT_METHOD(prototype, "toFixed", Number::toFixed);
    RIFT_METHOD(prototype, "toExponential", Number::toExponential);
    RIFT_METHOD(prototype, "toPrecision", Number::toPrecision);
}

// 21.1.1.1 Number ( value )
// @spec https://tc39.es/ecma262/#sec-number-constructor-number-value
Value Number::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If value is not present, let n be +0.
    // 2. Else, let n be ? ToNumeric(value).
    // 3. If n is a BigInt, let n be the Number value for n.
    // INCOMPLETE: Step 3 BigInt-to-Number conversion not implemented (no BigInt support).
    double numValue = args.empty() ? 0.0 : args[0].toNumber();

    if(ctx.isConstructorCall()) {
        // 4. If NewTarget is undefined, return n.
        //    (handled below — this branch is when NewTarget is NOT undefined)
        // 5. Let O be ? OrdinaryCreateFromConstructor(NewTarget, "%Number.prototype%",
        //    << [[NumberData]] >>).
        auto numberPrototype = getGlobalPrototype();
        auto* numberObj = getObjectFactory()->createJSObject(numberPrototype);

        // Protect from GC during initialization
        rift::memory::GCProtector protect(numberObj, getObjectFactory()->getObjectManager());

        // 6. Set O.[[NumberData]] to n.
        numberObj->setProperty("value", Value(numValue));
        // 7. Return O.
        return Value(numberObj);
    }

    // 4. If NewTarget is undefined, return n.
    return Value(numValue);
}

// ===== Static Methods =====

// 21.1.2.4 Number.isNaN ( number )
// @spec https://tc39.es/ecma262/#sec-number.isnan
Value Number::isNaN(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If number is not a Number, return false.
    if(args.empty() || !args[0].isNumber()) {
        return Value(false);
    }

    // 2. If number is NaN, return true.
    // 3. Otherwise, return false.
    double num = args[0].toNumber();
    return Value(std::isnan(num));
}

// 21.1.2.2 Number.isFinite ( number )
// @spec https://tc39.es/ecma262/#sec-number.isfinite
Value Number::isFinite(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If number is not a Number, return false.
    if(args.empty() || !args[0].isNumber()) {
        return Value(false);
    }

    // 2. If number is not finite, return false.
    // 3. Otherwise, return true.
    double num = args[0].toNumber();
    return Value(std::isfinite(num));
}

// 21.1.2.3 Number.isInteger ( number )
// @spec https://tc39.es/ecma262/#sec-number.isinteger
Value Number::isInteger(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Return IsIntegerNumber(number).
    //    (IsIntegerNumber abstract operation inlined below)
    // IsIntegerNumber step 1: If number is not a Number, return false.
    if(args.empty() || !args[0].isNumber()) {
        return Value(false);
    }

    double num = args[0].toNumber();

    // IsIntegerNumber step 2: If number is not finite, return false.
    if(!std::isfinite(num)) {
        return Value(false);
    }

    // IsIntegerNumber step 3: If truncate(R(number)) != R(number), return false.
    // IsIntegerNumber step 4: Otherwise, return true.
    return Value(std::floor(std::abs(num)) == std::abs(num));
}

// 21.1.2.5 Number.isSafeInteger ( number )
// @spec https://tc39.es/ecma262/#sec-number.issafeinteger
Value Number::isSafeInteger(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If IsIntegerNumber(number) is false, return false.
    if(args.empty() || !args[0].isNumber()) {
        return Value(false);
    }

    double num = args[0].toNumber();

    // (IsIntegerNumber check: not finite => false)
    if(!std::isfinite(num)) {
        return Value(false);
    }

    // (IsIntegerNumber check: truncate(number) != number => false)
    if(std::floor(std::abs(num)) != std::abs(num)) {
        return Value(false);
    }

    // 2. If abs(R(number)) <= 2^53 - 1, return true.
    // 3. Otherwise, return false.
    return Value(std::abs(num) <= MAX_SAFE_INTEGER);
}

// 21.1.2.12 Number.parseFloat ( string )
// @spec https://tc39.es/ecma262/#sec-number.parsefloat
// NOTE: This method is the same function object as the global parseFloat function.
Value Number::parseFloat(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let inputString be ? ToString(string).
    // 2. Let trimmedString be a substring of inputString ... (trimmed of leading whitespace).
    // 3. ... parse trimmedString as a StrDecimalLiteral.
    // SIMPLIFIED: Uses C++ std::stod instead of the full StrDecimalLiteral grammar.
    if(args.empty()) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    std::string str = args[0].toString();

    // Trim leading whitespace
    size_t start = 0;
    while(start < str.length() && std::isspace(str[start])) {
        start++;
    }

    if(start >= str.length()) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    // Try to parse as float
    try {
        size_t pos;
        double result = std::stod(str.substr(start), &pos);
        return Value(result);
    } catch(const std::invalid_argument&) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    } catch(const std::out_of_range&) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }
}

// 21.1.2.13 Number.parseInt ( string, radix )
// @spec https://tc39.es/ecma262/#sec-number.parseint
// NOTE: This method is the same function object as the global parseInt function.
Value Number::parseInt(const CallContext& ctx, const std::vector<Value>& args) {
    // SIMPLIFIED: Uses C++ std::stoll instead of the full spec algorithm.
    // The spec defines 19 steps involving ToString, trim, sign detection,
    // radix defaulting (including 0x prefix handling), and digit-by-digit parsing.
    if(args.empty()) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    // 1. Let inputString be ? ToString(string).
    std::string str = args[0].toString();
    // 5. Let R be ? ToInt32(radix).
    int radix = 10;

    if(args.size() >= 2) {
        radix = static_cast<int>(args[1].toNumber());
        // 9. If R != 0, then ... if R < 2 or R > 36, return NaN.
        if(radix != 0 && (radix < 2 || radix > 36)) {
            return Value(std::numeric_limits<double>::quiet_NaN());
        }
        // 10. If R = 0, let R be 10.
        if(radix == 0) {
            radix = 10;
        }
    }

    // 2. Let S be a substring of inputString ... (trimmed of leading whitespace).
    size_t start = 0;
    while(start < str.length() && std::isspace(str[start])) {
        start++;
    }

    if(start >= str.length()) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    // 3. Let sign be 1.
    // 4. If S is not empty and the first code unit of S is U+002D (HYPHEN-MINUS), ...
    int sign = 1;
    if(str[start] == '-') {
        sign = -1;
        start++;
    } else if(str[start] == '+') {
        start++;
    }

    // 11-19. Parse digits in the given radix.
    try {
        size_t pos;
        long long result = std::stoll(str.substr(start), &pos, radix);
        return Value(static_cast<double>(sign * result));
    } catch(const std::invalid_argument&) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    } catch(const std::out_of_range&) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }
}

// ===== Prototype Methods =====

// 21.1.3.6 Number.prototype.toString ( [ radix ] )
// @spec https://tc39.es/ecma262/#sec-number.prototype.tostring
Value Number::toString(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let x be ? ThisNumberValue(this value).
    // SIMPLIFIED: Rift uses extractThisNumber which combines ThisNumberValue steps.
    double numValue = extractThisNumber(ctx);

    // 2. If radix is undefined, let radixMV be 10.
    int radix = 10;
    if(!args.empty() && !args[0].isUndefined()) {
        // 3. Else, let radixMV be ? ToIntegerOrInfinity(radix).
        radix = static_cast<int>(args[0].toNumber());

        // 4. If radixMV is not in the inclusive interval from 2 to 36, throw a RangeError.
        if(radix < 2 || radix > 36) {
            throw rift::core::JavaScriptException(
                Value("RangeError: toString() radix must be between 2 and 36"));
        }
    }

    // 5. If radixMV = 10, return ! ToString(x).
    // 6. Return the String representation of this Number value using the radix specified
    //    by radixMV. ... (see spec for full algorithm).

    // Handle special values
    if(std::isnan(numValue)) {
        return Value("NaN");
    }
    if(std::isinf(numValue)) {
        return Value(numValue < 0 ? "-Infinity" : "Infinity");
    }
    if(numValue == 0.0) {
        return Value("0");
    }

    // For radix 10, use standard conversion
    if(radix == 10) {
        std::ostringstream oss;
        oss << numValue;
        return Value(oss.str());
    }

    // INCOMPLETE: For non-decimal radixes, only the integer part is converted.
    // The spec requires fractional parts to be represented in the given radix as well.
    long long intValue = static_cast<long long>(numValue);
    bool negative = intValue < 0;
    if(negative)
        intValue = -intValue;

    std::string result;
    const char* digits = "0123456789abcdefghijklmnopqrstuvwxyz";

    if(intValue == 0) {
        result = "0";
    } else {
        while(intValue > 0) {
            result = digits[intValue % radix] + result;
            intValue /= radix;
        }
    }

    if(negative)
        result = "-" + result;
    return Value(result);
}

// 21.1.3.7 Number.prototype.valueOf ( )
// @spec https://tc39.es/ecma262/#sec-number.prototype.valueof
Value Number::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Return ? ThisNumberValue(this value).
    double numValue = extractThisNumber(ctx);
    return Value(numValue);
}

// 21.1.3.3 Number.prototype.toFixed ( fractionDigits )
// @spec https://tc39.es/ecma262/#sec-number.prototype.tofixed
Value Number::toFixed(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let x be ? ThisNumberValue(this value).
    double numValue = extractThisNumber(ctx);

    // 2. Let f be ? ToIntegerOrInfinity(fractionDigits).
    // 3. Assert: If fractionDigits is undefined, then f is 0.
    int fractionDigits = 0;
    if(!args.empty() && !args[0].isUndefined()) {
        fractionDigits = static_cast<int>(args[0].toNumber());

        // 4. If f is not finite, throw a RangeError exception.
        // 5. If f < 0 or f > 100, throw a RangeError exception.
        if(fractionDigits < 0 || fractionDigits > 100) {
            throw rift::core::JavaScriptException(
                Value("RangeError: toFixed() digits must be between 0 and 100"));
        }
    }

    // 6. If x is not finite, return Number::toString(x).
    if(std::isnan(numValue)) {
        return Value("NaN");
    }
    if(std::isinf(numValue)) {
        return Value(numValue < 0 ? "-Infinity" : "Infinity");
    }

    // 7-12. (Spec defines digit string construction algorithm.)
    // SIMPLIFIED: Uses C++ std::fixed formatting instead of the spec's
    // manual digit-string construction algorithm (steps 7-12).
    std::ostringstream oss;
    oss << std::fixed << std::setprecision(fractionDigits) << numValue;
    return Value(oss.str());
}

// 21.1.3.2 Number.prototype.toExponential ( fractionDigits )
// @spec https://tc39.es/ecma262/#sec-number.prototype.toexponential
Value Number::toExponential(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let x be ? ThisNumberValue(this value).
    double numValue = extractThisNumber(ctx);

    // 2. Let f be ? ToIntegerOrInfinity(fractionDigits).
    // 3. Assert: If fractionDigits is undefined, then f is 0.

    // 4. If x is not finite, return Number::toString(x).
    if(std::isnan(numValue)) {
        return Value("NaN");
    }
    if(std::isinf(numValue)) {
        return Value(numValue < 0 ? "-Infinity" : "Infinity");
    }

    // 5. If f < 0 or f > 100, throw a RangeError exception.
    int fractionDigits = 0;
    bool fractionDigitsSpecified = false;

    if(!args.empty() && !args[0].isUndefined()) {
        fractionDigits = static_cast<int>(args[0].toNumber());
        fractionDigitsSpecified = true;

        if(fractionDigits < 0 || fractionDigits > 100) {
            throw rift::core::JavaScriptException(
                Value("RangeError: toExponential() digits must be between 0 and 100"));
        }
    }

    // 6-16. (Spec defines exponential notation string construction algorithm.)
    // SIMPLIFIED: Uses C++ std::scientific formatting instead of the spec's
    // manual digit/exponent string construction (steps 6-16).
    std::ostringstream oss;
    if(fractionDigitsSpecified) {
        oss << std::scientific << std::setprecision(fractionDigits) << numValue;
    } else {
        oss << std::scientific << numValue;
    }

    return Value(oss.str());
}

// 21.1.3.5 Number.prototype.toPrecision ( precision )
// @spec https://tc39.es/ecma262/#sec-number.prototype.toprecision
Value Number::toPrecision(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. Let x be ? ThisNumberValue(this value).
    double numValue = extractThisNumber(ctx);

    // 2. If precision is undefined, return ! ToString(x).
    if(args.empty() || args[0].isUndefined()) {
        std::ostringstream oss;
        oss << numValue;
        return Value(oss.str());
    }

    // 3. Let p be ? ToIntegerOrInfinity(precision).

    // 4. If x is not finite, return Number::toString(x).
    if(std::isnan(numValue)) {
        return Value("NaN");
    }
    if(std::isinf(numValue)) {
        return Value(numValue < 0 ? "-Infinity" : "Infinity");
    }

    // 5. If p < 1 or p > 100, throw a RangeError exception.
    int precision = static_cast<int>(args[0].toNumber());

    if(precision < 1 || precision > 100) {
        throw rift::core::JavaScriptException(
            Value("RangeError: toPrecision() precision must be between 1 and 100"));
    }

    // 6-14. (Spec defines precision string construction algorithm.)
    // SIMPLIFIED: Uses C++ std::setprecision instead of the spec's
    // manual digit-string construction (steps 6-14).
    std::ostringstream oss;
    oss << std::setprecision(precision) << numValue;
    return Value(oss.str());
}

// Helper: returns the %Number.prototype% intrinsic object.
JSObject* Number::getGlobalPrototype() {
    return rift::core::BuiltinManager::getNumberPrototype();
}

}  // namespace rift::builtins
