#include "math.h"

#include <algorithm>
#include <limits>

namespace rift::builtins {

// Math constants
const double Math::E = M_E;
const double Math::PI = M_PI;
const double Math::SQRT2 = M_SQRT2;

// Random number generator static members
std::random_device Math::rd;
std::mt19937 Math::gen(Math::rd());
std::uniform_real_distribution<> Math::dis(0.0, 1.0);

std::shared_ptr<JSObject> Math::create() {
    auto math = std::make_shared<JSObject>();

    // Add constants
    math->setProperty("E", Value(E));
    math->setProperty("PI", Value(PI));
    math->setProperty("SQRT2", Value(SQRT2));
    math->setProperty("LN2", Value(M_LN2));
    math->setProperty("LN10", Value(M_LN10));
    math->setProperty("LOG2E", Value(M_LOG2E));
    math->setProperty("LOG10E", Value(M_LOG10E));
    math->setProperty("SQRT1_2", Value(M_SQRT1_2));

    // Add methods
    math->setProperty("abs", Value(std::make_shared<JSFunction>(Math::abs)));
    math->setProperty("ceil", Value(std::make_shared<JSFunction>(Math::ceil)));
    math->setProperty("floor", Value(std::make_shared<JSFunction>(Math::floor)));
    math->setProperty("round", Value(std::make_shared<JSFunction>(Math::round)));
    math->setProperty("max", Value(std::make_shared<JSFunction>(Math::max)));
    math->setProperty("min", Value(std::make_shared<JSFunction>(Math::min)));
    math->setProperty("pow", Value(std::make_shared<JSFunction>(Math::pow)));
    math->setProperty("sqrt", Value(std::make_shared<JSFunction>(Math::sqrt)));
    math->setProperty("random", Value(std::make_shared<JSFunction>(Math::random)));
    math->setProperty("sign", Value(std::make_shared<JSFunction>(Math::sign)));
    math->setProperty("trunc", Value(std::make_shared<JSFunction>(Math::trunc)));
    math->setProperty("sin", Value(std::make_shared<JSFunction>(Math::sin)));
    math->setProperty("cos", Value(std::make_shared<JSFunction>(Math::cos)));
    math->setProperty("tan", Value(std::make_shared<JSFunction>(Math::tan)));

    return math;
}

double Math::validateAndGetNumber(const std::vector<Value>& args, size_t index) {
    if (args.size() <= index) {
        return std::numeric_limits<double>::quiet_NaN();
    }

    double num = args[index].toNumber();

    if (std::isnan(num)) {
        return std::numeric_limits<double>::quiet_NaN();
    }

    return num;
}

Value Math::abs(const std::vector<Value>& args) {
    double num = validateAndGetNumber(args);

    if (std::isnan(num)) {
        return Value(num);
    }

    return Value(::fabs(num));
}

Value Math::ceil(const std::vector<Value>& args) {
    double num = validateAndGetNumber(args);

    if (std::isnan(num) || std::isinf(num)) {
        return Value(num);
    }

    return Value(std::ceil(num));
}

Value Math::floor(const std::vector<Value>& args) {
    double num = validateAndGetNumber(args);

    if (std::isnan(num) || std::isinf(num)) {
        return Value(num);
    }

    return Value(std::floor(num));
}

Value Math::round(const std::vector<Value>& args) {
    double num = validateAndGetNumber(args);

    if (std::isnan(num) || std::isinf(num)) {
        return Value(num);
    }

    // ECMAScript rounding: round half away from zero
    if (num >= 0) {
        return Value(std::floor(num + 0.5));
    } else {
        return Value(std::ceil(num - 0.5));
    }
}

Value Math::max(const std::vector<Value>& args) {
    if (args.empty()) {
        return Value(-std::numeric_limits<double>::infinity());
    }

    double result = -std::numeric_limits<double>::infinity();

    for (const auto& arg : args) {
        double num = arg.toNumber();

        // If any argument is NaN, return NaN
        if (std::isnan(num)) {
            return Value(std::numeric_limits<double>::quiet_NaN());
        }

        result = std::max(result, num);
    }

    return Value(result);
}

Value Math::min(const std::vector<Value>& args) {
    if (args.empty()) {
        return Value(std::numeric_limits<double>::infinity());
    }

    double result = std::numeric_limits<double>::infinity();

    for (const auto& arg : args) {
        double num = arg.toNumber();

        // If any argument is NaN, return NaN
        if (std::isnan(num)) {
            return Value(std::numeric_limits<double>::quiet_NaN());
        }

        result = std::min(result, num);
    }

    return Value(result);
}

Value Math::pow(const std::vector<Value>& args) {
    if (args.size() < 2) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    double base = args[0].toNumber();
    double exponent = args[1].toNumber();

    return Value(std::pow(base, exponent));
}

Value Math::sqrt(const std::vector<Value>& args) {
    double num = validateAndGetNumber(args);

    if (std::isnan(num) || num < 0) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    return Value(std::sqrt(num));
}

Value Math::random(const std::vector<Value>& args) { return Value(dis(gen)); }

Value Math::sign(const std::vector<Value>& args) {
    double num = validateAndGetNumber(args);

    if (std::isnan(num)) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    if (num > 0) {
        return Value(1.0);
    } else if (num < 0) {
        return Value(-1.0);
    } else {
        // Handle both +0 and -0
        return Value(num);  // This preserves the sign of zero
    }
}

Value Math::trunc(const std::vector<Value>& args) {
    double num = validateAndGetNumber(args);

    if (std::isnan(num) || std::isinf(num)) {
        return Value(num);
    }

    // Remove fractional part by truncating towards zero
    return Value(std::trunc(num));
}

Value Math::sin(const std::vector<Value>& args) {
    double num = validateAndGetNumber(args);

    if (std::isnan(num)) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    if (std::isinf(num)) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    return Value(std::sin(num));
}

Value Math::cos(const std::vector<Value>& args) {
    double num = validateAndGetNumber(args);

    if (std::isnan(num)) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    if (std::isinf(num)) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    return Value(std::cos(num));
}

Value Math::tan(const std::vector<Value>& args) {
    double num = validateAndGetNumber(args);

    if (std::isnan(num)) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    if (std::isinf(num)) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    return Value(std::tan(num));
}

}  // namespace rift::builtins