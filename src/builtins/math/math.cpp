#include "rift/builtins/math/math.h"

#include <algorithm>
#include <cmath>
#include <random>

#include "rift/builtins/builtin_base.h"  // For RIFT_METHOD and RIFT_PROPERTY macros
#include "rift/core/engine/call_context.h"

namespace rift::builtins {

using rift::core::CallContext;

// Math constants
const double Math::E = M_E;
const double Math::PI = M_PI;
const double Math::SQRT2 = M_SQRT2;

// Random number generator static members
std::random_device Math::rd;
std::mt19937 Math::gen(Math::rd());
std::uniform_real_distribution<> Math::dis(0.0, 1.0);

JSObject* Math::create(rift::memory::ObjectFactory* factory) {
    auto* math = factory->createJSObject();

    // Math constants
    RIFT_PROPERTY(math, "PI", Value(M_PI));
    RIFT_PROPERTY(math, "E", Value(M_E));
    RIFT_PROPERTY(math, "SQRT2", Value(M_SQRT2));
    RIFT_PROPERTY(math, "LN2", Value(M_LN2));
    RIFT_PROPERTY(math, "LN10", Value(M_LN10));
    RIFT_PROPERTY(math, "LOG2E", Value(M_LOG2E));
    RIFT_PROPERTY(math, "LOG10E", Value(M_LOG10E));
    RIFT_PROPERTY(math, "SQRT1_2", Value(M_SQRT1_2));

    // Math methods
    RIFT_METHOD(math, "abs", abs);
    RIFT_METHOD(math, "floor", floor);
    RIFT_METHOD(math, "ceil", ceil);
    RIFT_METHOD(math, "round", round);
    RIFT_METHOD(math, "max", max);
    RIFT_METHOD(math, "min", min);
    RIFT_METHOD(math, "pow", pow);
    RIFT_METHOD(math, "sqrt", sqrt);
    RIFT_METHOD(math, "random", random);
    RIFT_METHOD(math, "sign", sign);
    RIFT_METHOD(math, "trunc", trunc);
    RIFT_METHOD(math, "sin", sin);
    RIFT_METHOD(math, "cos", cos);
    RIFT_METHOD(math, "tan", tan);

    // Inverse trigonometric methods
    RIFT_METHOD(math, "acos", acos);
    RIFT_METHOD(math, "asin", asin);
    RIFT_METHOD(math, "atan", atan);
    RIFT_METHOD(math, "atan2", atan2);

    // Hyperbolic methods
    RIFT_METHOD(math, "cosh", cosh);
    RIFT_METHOD(math, "sinh", sinh);
    RIFT_METHOD(math, "tanh", tanh);
    RIFT_METHOD(math, "acosh", acosh);
    RIFT_METHOD(math, "asinh", asinh);
    RIFT_METHOD(math, "atanh", atanh);

    // Exponential and logarithmic methods
    RIFT_METHOD(math, "exp", exp);
    RIFT_METHOD(math, "expm1", expm1);
    RIFT_METHOD(math, "log", log);
    RIFT_METHOD(math, "log1p", log1p);
    RIFT_METHOD(math, "log2", log2);
    RIFT_METHOD(math, "log10", log10);

    // Other methods
    RIFT_METHOD(math, "cbrt", cbrt);
    RIFT_METHOD(math, "clz32", clz32);
    RIFT_METHOD(math, "fround", fround);
    RIFT_METHOD(math, "hypot", hypot);
    RIFT_METHOD(math, "imul", imul);

    return math;
}

double Math::validateAndGetNumber(const std::vector<Value>& args, size_t index) {
    if(args.size() <= index) {
        return std::numeric_limits<double>::quiet_NaN();
    }

    double num = args[index].toNumber();

    if(std::isnan(num)) {
        return std::numeric_limits<double>::quiet_NaN();
    }

    return num;
}

Value Math::abs(const CallContext& ctx, const std::vector<Value>& args) {
    double num = validateAndGetNumber(args, 0);

    if(std::isnan(num)) {
        return Value(num);
    }

    return Value(::fabs(num));
}

Value Math::ceil(const CallContext& ctx, const std::vector<Value>& args) {
    double num = validateAndGetNumber(args, 0);

    if(std::isnan(num) || std::isinf(num)) {
        return Value(num);
    }

    return Value(std::ceil(num));
}

Value Math::floor(const CallContext& ctx, const std::vector<Value>& args) {
    double num = validateAndGetNumber(args, 0);

    if(std::isnan(num) || std::isinf(num)) {
        return Value(num);
    }

    return Value(std::floor(num));
}

Value Math::round(const CallContext& ctx, const std::vector<Value>& args) {
    double num = validateAndGetNumber(args, 0);

    if(std::isnan(num) || std::isinf(num)) {
        return Value(num);
    }

    // ECMAScript rounding: round half away from zero
    if(num >= 0) {
        return Value(std::floor(num + 0.5));
    } else {
        return Value(std::ceil(num - 0.5));
    }
}

Value Math::max(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(-std::numeric_limits<double>::infinity());
    }

    double result = -std::numeric_limits<double>::infinity();

    for(size_t i = 0; i < args.size(); ++i) {
        double num = args[i].toNumber();

        // If any argument is NaN, return NaN
        if(std::isnan(num)) {
            return Value(std::numeric_limits<double>::quiet_NaN());
        }

        result = std::max(result, num);
    }

    return Value(result);
}

Value Math::min(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(std::numeric_limits<double>::infinity());
    }

    double result = std::numeric_limits<double>::infinity();

    for(size_t i = 0; i < args.size(); ++i) {
        double num = args[i].toNumber();

        // If any argument is NaN, return NaN
        if(std::isnan(num)) {
            return Value(std::numeric_limits<double>::quiet_NaN());
        }

        result = std::min(result, num);
    }

    return Value(result);
}

Value Math::pow(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.size() < 2) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    double base = args[0].toNumber();
    double exponent = args[1].toNumber();

    return Value(std::pow(base, exponent));
}

Value Math::sqrt(const CallContext& ctx, const std::vector<Value>& args) {
    double num = validateAndGetNumber(args, 0);

    if(std::isnan(num) || num < 0) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    return Value(std::sqrt(num));
}

Value Math::random(const CallContext& ctx, const std::vector<Value>& args) {
    return Value(dis(gen));
}

Value Math::sign(const CallContext& ctx, const std::vector<Value>& args) {
    double num = validateAndGetNumber(args, 0);

    if(std::isnan(num)) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    if(num > 0) {
        return Value(1.0);
    } else if(num < 0) {
        return Value(-1.0);
    } else {
        // Handle both +0 and -0
        return Value(num);  // This preserves the sign of zero
    }
}

Value Math::trunc(const CallContext& ctx, const std::vector<Value>& args) {
    double num = validateAndGetNumber(args, 0);

    if(std::isnan(num) || std::isinf(num)) {
        return Value(num);
    }

    // Remove fractional part by truncating towards zero
    return Value(std::trunc(num));
}

Value Math::sin(const CallContext& ctx, const std::vector<Value>& args) {
    double num = validateAndGetNumber(args, 0);

    if(std::isnan(num)) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    if(std::isinf(num)) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    return Value(std::sin(num));
}

Value Math::cos(const CallContext& ctx, const std::vector<Value>& args) {
    double num = validateAndGetNumber(args, 0);

    if(std::isnan(num)) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    if(std::isinf(num)) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    return Value(std::cos(num));
}

Value Math::tan(const CallContext& ctx, const std::vector<Value>& args) {
    double num = validateAndGetNumber(args, 0);

    if(std::isnan(num)) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    if(std::isinf(num)) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    return Value(std::tan(num));
}

// --- Inverse trigonometric methods ---

Value Math::acos(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::acos(x));
}

Value Math::asin(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::asin(x));
}

Value Math::atan(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::atan(x));
}

Value Math::atan2(const CallContext& ctx, const std::vector<Value>& args) {
    double y = validateAndGetNumber(args, 0);
    double x = validateAndGetNumber(args, 1);
    return Value(std::atan2(y, x));
}

// --- Hyperbolic methods ---

Value Math::cosh(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::cosh(x));
}

Value Math::sinh(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::sinh(x));
}

Value Math::tanh(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::tanh(x));
}

Value Math::acosh(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::acosh(x));
}

Value Math::asinh(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::asinh(x));
}

Value Math::atanh(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::atanh(x));
}

// --- Exponential and logarithmic methods ---

Value Math::exp(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::exp(x));
}

Value Math::expm1(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::expm1(x));
}

Value Math::log(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::log(x));
}

Value Math::log1p(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::log1p(x));
}

Value Math::log2(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::log2(x));
}

Value Math::log10(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::log10(x));
}

// --- Other methods ---

Value Math::cbrt(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::cbrt(x));
}

Value Math::clz32(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);

    if(std::isnan(x) || std::isinf(x)) {
        // ToUint32(NaN) = 0, ToUint32(Infinity) = 0, clz32(0) = 32
        return Value(32.0);
    }

    // Convert to uint32_t per ECMAScript ToUint32
    auto n = static_cast<uint32_t>(static_cast<int64_t>(x));

    if(n == 0) {
        return Value(32.0);
    }

    return Value(static_cast<double>(__builtin_clz(n)));
}

Value Math::fround(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(static_cast<double>(static_cast<float>(x)));
}

Value Math::hypot(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(0.0);
    }

    // Check for Infinity first (spec: if any arg is ±Infinity, return +Infinity)
    bool has_nan = false;
    for(size_t i = 0; i < args.size(); ++i) {
        double val = args[i].toNumber();
        if(std::isinf(val)) {
            return Value(std::numeric_limits<double>::infinity());
        }
        if(std::isnan(val)) {
            has_nan = true;
        }
    }

    if(has_nan) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    if(args.size() == 1) {
        return Value(std::fabs(args[0].toNumber()));
    }

    if(args.size() == 2) {
        return Value(std::hypot(args[0].toNumber(), args[1].toNumber()));
    }

    // For 3+ args, compute manually to avoid overflow
    double sum = 0.0;
    for(size_t i = 0; i < args.size(); ++i) {
        double val = args[i].toNumber();
        sum += val * val;
    }
    return Value(std::sqrt(sum));
}

Value Math::imul(const CallContext& ctx, const std::vector<Value>& args) {
    double a_val = validateAndGetNumber(args, 0);
    double b_val = validateAndGetNumber(args, 1);

    if(std::isnan(a_val) || std::isnan(b_val)) {
        return Value(0.0);
    }

    // Convert to int32_t per ECMAScript ToInt32
    auto a = static_cast<int32_t>(static_cast<int64_t>(a_val));
    auto b = static_cast<int32_t>(static_cast<int64_t>(b_val));

    // Multiply and return lower 32 bits as a signed int32
    auto result = static_cast<int32_t>(static_cast<uint32_t>(a) * static_cast<uint32_t>(b));
    return Value(static_cast<double>(result));
}

}  // namespace rift::builtins