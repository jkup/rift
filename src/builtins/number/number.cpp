#include "rift/builtins/number/number.h"

#include <cmath>
#include <iomanip>
#include <limits>
#include <sstream>

#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/call_context.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/core/engine/this_helpers.h"
#include "rift/memory/gc_protector.h"

namespace rift::builtins {

using rift::core::CallContext;
using rift::core::extractThisNumber;

// ECMAScript Number constants (20.1.2)
// These values are from the IEEE 754 double-precision 64-bit binary format
static constexpr double MAX_VALUE = 1.7976931348623157e+308;
static constexpr double MIN_VALUE = 5e-324;
static constexpr double MAX_SAFE_INTEGER = 9007199254740991.0;   // 2^53 - 1
static constexpr double MIN_SAFE_INTEGER = -9007199254740991.0;  // -(2^53 - 1)
static constexpr double EPSILON = 2.220446049250313e-16;         // 2^-52

void Number::setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory) {
    // Number static properties (20.1.2)
    RIFT_PROPERTY(constructor, "NaN", Value(std::numeric_limits<double>::quiet_NaN()));
    RIFT_PROPERTY(constructor, "POSITIVE_INFINITY", Value(std::numeric_limits<double>::infinity()));
    RIFT_PROPERTY(constructor, "NEGATIVE_INFINITY",
                  Value(-std::numeric_limits<double>::infinity()));
    RIFT_PROPERTY(constructor, "MAX_VALUE", Value(MAX_VALUE));
    RIFT_PROPERTY(constructor, "MIN_VALUE", Value(MIN_VALUE));
    RIFT_PROPERTY(constructor, "MAX_SAFE_INTEGER", Value(MAX_SAFE_INTEGER));
    RIFT_PROPERTY(constructor, "MIN_SAFE_INTEGER", Value(MIN_SAFE_INTEGER));
    RIFT_PROPERTY(constructor, "EPSILON", Value(EPSILON));

    // Number static methods
    RIFT_STATIC_METHOD(constructor, "isNaN", Number::isNaN);
    RIFT_STATIC_METHOD(constructor, "isFinite", Number::isFinite);
    RIFT_STATIC_METHOD(constructor, "isInteger", Number::isInteger);
    RIFT_STATIC_METHOD(constructor, "isSafeInteger", Number::isSafeInteger);
    RIFT_STATIC_METHOD(constructor, "parseFloat", Number::parseFloat);
    RIFT_STATIC_METHOD(constructor, "parseInt", Number::parseInt);
}

void Number::setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory) {
    RIFT_METHOD(prototype, "toString", Number::toString);
    RIFT_METHOD(prototype, "valueOf", Number::valueOf);
    RIFT_METHOD(prototype, "toFixed", Number::toFixed);
    RIFT_METHOD(prototype, "toExponential", Number::toExponential);
    RIFT_METHOD(prototype, "toPrecision", Number::toPrecision);
}

// 20.1.1.1 Number ( value ) with call context
Value Number::constructor(const CallContext& ctx, const std::vector<Value>& args) {
    double numValue = args.empty() ? 0.0 : args[0].toNumber();

    if(ctx.isConstructorCall()) {
        // Called as constructor: new Number(value)
        // Create a Number object with [[NumberData]] internal slot
        auto numberPrototype = getGlobalPrototype();
        auto* numberObj = getObjectFactory()->createJSObject(numberPrototype);

        // Protect from GC during initialization
        rift::memory::GCProtector protect(numberObj, getObjectFactory()->getObjectManager());

        // Store the primitive number value in a property (represents [[NumberData]])
        numberObj->setProperty("value", Value(numValue));
        return Value(numberObj);
    }

    // Called as function: Number(value)
    // Return primitive number
    return Value(numValue);
}

// ===== Static Methods =====

// 20.1.2.4 Number.isNaN ( number )
Value Number::isNaN(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If Type(number) is not Number, return false.
    if(args.empty() || !args[0].isNumber()) {
        return Value(false);
    }

    // 2. If number is NaN, return true.
    // 3. Otherwise, return false.
    double num = args[0].toNumber();
    return Value(std::isnan(num));
}

// 20.1.2.2 Number.isFinite ( number )
Value Number::isFinite(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If Type(number) is not Number, return false.
    if(args.empty() || !args[0].isNumber()) {
        return Value(false);
    }

    // 2. If number is NaN, +∞, or -∞, return false.
    // 3. Otherwise, return true.
    double num = args[0].toNumber();
    return Value(std::isfinite(num));
}

// 20.1.2.3 Number.isInteger ( number )
Value Number::isInteger(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If Type(number) is not Number, return false.
    if(args.empty() || !args[0].isNumber()) {
        return Value(false);
    }

    double num = args[0].toNumber();

    // 2. If number is NaN, +∞, or -∞, return false.
    if(!std::isfinite(num)) {
        return Value(false);
    }

    // 3. If floor(abs(number)) ≠ abs(number), return false.
    // 4. Otherwise, return true.
    return Value(std::floor(std::abs(num)) == std::abs(num));
}

// 20.1.2.5 Number.isSafeInteger ( number )
Value Number::isSafeInteger(const CallContext& ctx, const std::vector<Value>& args) {
    // 1. If Type(number) is not Number, return false.
    if(args.empty() || !args[0].isNumber()) {
        return Value(false);
    }

    double num = args[0].toNumber();

    // 2. If number is NaN, +∞, or -∞, return false.
    if(!std::isfinite(num)) {
        return Value(false);
    }

    // 3. If floor(abs(number)) ≠ abs(number), return false.
    if(std::floor(std::abs(num)) != std::abs(num)) {
        return Value(false);
    }

    // 4. If abs(number) > 2^53 - 1, return false.
    // 5. Otherwise, return true.
    return Value(std::abs(num) <= MAX_SAFE_INTEGER);
}

// 20.1.2.13 Number.parseFloat ( string )
Value Number::parseFloat(const CallContext& ctx, const std::vector<Value>& args) {
    // Number.parseFloat is the same function as the global parseFloat
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
    } catch(...) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }
}

// 20.1.2.14 Number.parseInt ( string, radix )
Value Number::parseInt(const CallContext& ctx, const std::vector<Value>& args) {
    // Number.parseInt is the same function as the global parseInt
    if(args.empty()) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    std::string str = args[0].toString();
    int radix = 10;

    if(args.size() >= 2) {
        radix = static_cast<int>(args[1].toNumber());
        if(radix != 0 && (radix < 2 || radix > 36)) {
            return Value(std::numeric_limits<double>::quiet_NaN());
        }
        if(radix == 0) {
            radix = 10;
        }
    }

    // Trim leading whitespace
    size_t start = 0;
    while(start < str.length() && std::isspace(str[start])) {
        start++;
    }

    if(start >= str.length()) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    // Handle sign
    int sign = 1;
    if(str[start] == '-') {
        sign = -1;
        start++;
    } else if(str[start] == '+') {
        start++;
    }

    // Try to parse as integer with given radix
    try {
        size_t pos;
        long long result = std::stoll(str.substr(start), &pos, radix);
        return Value(static_cast<double>(sign * result));
    } catch(...) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }
}

// ===== Prototype Methods =====

// 20.1.3.6 Number.prototype.toString ( [ radix ] )
Value Number::toString(const CallContext& ctx, const std::vector<Value>& args) {
    // Get the number value from 'this'
    double numValue = extractThisNumber(ctx);

    // Default radix is 10
    int radix = 10;
    if(!args.empty() && !args[0].isUndefined()) {
        radix = static_cast<int>(args[0].toNumber());

        // Radix must be between 2 and 36
        if(radix < 2 || radix > 36) {
            throw rift::core::JavaScriptException(
                Value("RangeError: toString() radix must be between 2 and 36"));
        }
    }

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

    // For other radixes, convert integer part only
    // (Full implementation would handle fractional parts too)
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

// 20.1.3.7 Number.prototype.valueOf ( )
Value Number::valueOf(const CallContext& ctx, const std::vector<Value>& args) {
    // Get the number value from 'this'
    double numValue = extractThisNumber(ctx);
    return Value(numValue);
}

// 20.1.3.3 Number.prototype.toFixed ( fractionDigits )
Value Number::toFixed(const CallContext& ctx, const std::vector<Value>& args) {
    double numValue = extractThisNumber(ctx);

    // Get fraction digits (default 0)
    int fractionDigits = 0;
    if(!args.empty() && !args[0].isUndefined()) {
        fractionDigits = static_cast<int>(args[0].toNumber());

        // Must be between 0 and 100
        if(fractionDigits < 0 || fractionDigits > 100) {
            throw rift::core::JavaScriptException(
                Value("RangeError: toFixed() digits must be between 0 and 100"));
        }
    }

    // Handle special values
    if(std::isnan(numValue)) {
        return Value("NaN");
    }
    if(std::isinf(numValue)) {
        return Value(numValue < 0 ? "-Infinity" : "Infinity");
    }

    // Format the number
    std::ostringstream oss;
    oss << std::fixed << std::setprecision(fractionDigits) << numValue;
    return Value(oss.str());
}

// 20.1.3.2 Number.prototype.toExponential ( fractionDigits )
Value Number::toExponential(const CallContext& ctx, const std::vector<Value>& args) {
    double numValue = extractThisNumber(ctx);

    // Handle special values
    if(std::isnan(numValue)) {
        return Value("NaN");
    }
    if(std::isinf(numValue)) {
        return Value(numValue < 0 ? "-Infinity" : "Infinity");
    }

    // Get fraction digits
    int fractionDigits = 0;
    bool fractionDigitsSpecified = false;

    if(!args.empty() && !args[0].isUndefined()) {
        fractionDigits = static_cast<int>(args[0].toNumber());
        fractionDigitsSpecified = true;

        // Must be between 0 and 100
        if(fractionDigits < 0 || fractionDigits > 100) {
            throw rift::core::JavaScriptException(
                Value("RangeError: toExponential() digits must be between 0 and 100"));
        }
    }

    // Format the number in exponential notation
    std::ostringstream oss;
    if(fractionDigitsSpecified) {
        oss << std::scientific << std::setprecision(fractionDigits) << numValue;
    } else {
        oss << std::scientific << numValue;
    }

    return Value(oss.str());
}

// 20.1.3.5 Number.prototype.toPrecision ( precision )
Value Number::toPrecision(const CallContext& ctx, const std::vector<Value>& args) {
    double numValue = extractThisNumber(ctx);

    // If precision is undefined, use toString
    if(args.empty() || args[0].isUndefined()) {
        std::ostringstream oss;
        oss << numValue;
        return Value(oss.str());
    }

    // Handle special values
    if(std::isnan(numValue)) {
        return Value("NaN");
    }
    if(std::isinf(numValue)) {
        return Value(numValue < 0 ? "-Infinity" : "Infinity");
    }

    // Get precision
    int precision = static_cast<int>(args[0].toNumber());

    // Must be between 1 and 100
    if(precision < 1 || precision > 100) {
        throw rift::core::JavaScriptException(
            Value("RangeError: toPrecision() precision must be between 1 and 100"));
    }

    // Format the number with specified precision
    std::ostringstream oss;
    oss << std::setprecision(precision) << numValue;
    return Value(oss.str());
}

JSObject* Number::getGlobalPrototype() {
    return rift::core::BuiltinManager::getNumberPrototype();
}

}  // namespace rift::builtins
