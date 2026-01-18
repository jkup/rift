#include "rift/builtins/math/math.h"

#include <algorithm>
#include <cmath>
#include <random>

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
    // Create Math object using GC-managed creation
    auto* math = factory->createJSObject();

    // Add Math constants
    math->setProperty("PI", Value(M_PI));
    math->setProperty("E", Value(M_E));
    math->setProperty("SQRT2", Value(M_SQRT2));
    math->setProperty("LN2", Value(M_LN2));
    math->setProperty("LN10", Value(M_LN10));
    math->setProperty("LOG2E", Value(M_LOG2E));
    math->setProperty("LOG10E", Value(M_LOG10E));
    math->setProperty("SQRT1_2", Value(M_SQRT1_2));

    // Add Math methods using GC-managed function creation
    math->setProperty("abs", Value(factory->createJSFunction(abs)));
    math->setProperty("floor", Value(factory->createJSFunction(floor)));
    math->setProperty("ceil", Value(factory->createJSFunction(ceil)));
    math->setProperty("round", Value(factory->createJSFunction(round)));
    math->setProperty("max", Value(factory->createJSFunction(max)));
    math->setProperty("min", Value(factory->createJSFunction(min)));
    math->setProperty("pow", Value(factory->createJSFunction(pow)));
    math->setProperty("sqrt", Value(factory->createJSFunction(sqrt)));
    math->setProperty("random", Value(factory->createJSFunction(random)));
    math->setProperty("sign", Value(factory->createJSFunction(sign)));
    math->setProperty("trunc", Value(factory->createJSFunction(trunc)));
    math->setProperty("sin", Value(factory->createJSFunction(sin)));
    math->setProperty("cos", Value(factory->createJSFunction(cos)));
    math->setProperty("tan", Value(factory->createJSFunction(tan)));

    return math;  // Return raw pointer
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

}  // namespace rift::builtins