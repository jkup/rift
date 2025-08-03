#include "rift/builtins/global/global.h"

#include <cctype>
#include <cmath>
#include <limits>

#include "rift/runtime/environment/environment.h"
#include "rift/runtime/values/object.h"

namespace rift::builtins {

void Global::setupGlobalFunctions(std::shared_ptr<Environment> global_env,
                                  rift::memory::ObjectFactory* factory) {
    // Add global functions using GC-managed creation
    global_env->define("parseInt", Value(factory->createJSFunction(parseInt)));
    global_env->define("parseFloat", Value(factory->createJSFunction(parseFloat)));
    global_env->define("isNaN", Value(factory->createJSFunction(isNaN)));
    global_env->define("isFinite", Value(factory->createJSFunction(isFinite)));

    // Add array creation helper
    global_env->define("createArray", Value(factory->createJSFunction(createArray)));

    // Add global constants
    global_env->define("undefined", Value::undefined());
    global_env->define("NaN", Value(std::numeric_limits<double>::quiet_NaN()));
    global_env->define("Infinity", Value(std::numeric_limits<double>::infinity()));
}

Value Global::parseInt(const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    std::string str = args[0].toString();
    int radix = 10;

    if(args.size() >= 2) {
        double radixNum = args[1].toNumber();
        if(!std::isnan(radixNum)) {
            radix = static_cast<int>(radixNum);
        }
    }

    // Radix must be between 2 and 36
    if(radix < 2 || radix > 36) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    // Skip whitespace
    size_t i = 0;
    while(i < str.length() && std::isspace(str[i])) {
        i++;
    }

    if(i >= str.length()) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    // Handle sign
    bool negative = false;
    if(str[i] == '-') {
        negative = true;
        i++;
    } else if(str[i] == '+') {
        i++;
    }

    // Handle hex prefix for radix 16
    if(radix == 16 && i + 1 < str.length() && str[i] == '0' &&
       (str[i + 1] == 'x' || str[i + 1] == 'X')) {
        i += 2;
    }

    // Parse digits
    double result = 0;
    bool foundValidDigit = false;

    while(i < str.length()) {
        char c = str[i];
        if(!isValidDigit(c, radix)) {
            break;
        }

        foundValidDigit = true;
        result = result * radix + getDigitValue(c);
        i++;
    }

    if(!foundValidDigit) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    return Value(negative ? -result : result);
}

Value Global::parseFloat(const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    std::string str = args[0].toString();

    // Skip leading whitespace
    size_t i = 0;
    while(i < str.length() && std::isspace(str[i])) {
        i++;
    }

    if(i >= str.length()) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    // Handle infinity
    if(str.substr(i, 8) == "Infinity") {
        return Value(std::numeric_limits<double>::infinity());
    }
    if(str.substr(i, 9) == "-Infinity") {
        return Value(-std::numeric_limits<double>::infinity());
    }
    if(str.substr(i, 9) == "+Infinity") {
        return Value(std::numeric_limits<double>::infinity());
    }

    // Parse using standard library
    try {
        size_t endPos;
        double result = std::stod(str.substr(i), &endPos);
        return Value(result);
    } catch(...) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }
}

Value Global::isNaN(const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(true);  // isNaN(undefined) is true
    }

    double num = args[0].toNumber();
    return Value(std::isnan(num));
}

Value Global::isFinite(const std::vector<Value>& args) {
    if(args.empty()) {
        return Value(false);  // isFinite(undefined) is false
    }

    double num = args[0].toNumber();
    return Value(std::isfinite(num));
}

Value Global::createArray(const std::vector<Value>& args) {
    // Simplified implementation - just return undefined as a placeholder
    // In a real implementation, this would properly create an array using the available factory
    // Since Global functions don't store factory anymore, this function is simplified
    return Value::undefined();
}

bool Global::isValidDigit(char c, int radix) {
    if(radix <= 10) {
        return c >= '0' && c < ('0' + radix);
    } else {
        return (c >= '0' && c <= '9') || (c >= 'a' && c < ('a' + radix - 10)) ||
               (c >= 'A' && c < ('A' + radix - 10));
    }
}

int Global::getDigitValue(char c) {
    if(c >= '0' && c <= '9') {
        return c - '0';
    } else if(c >= 'a' && c <= 'z') {
        return c - 'a' + 10;
    } else if(c >= 'A' && c <= 'Z') {
        return c - 'A' + 10;
    }
    return 0;
}

}  // namespace rift::builtins