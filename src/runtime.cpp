#include "runtime.h"

#include <cmath>
#include <limits>
#include <sstream>
#include <stdexcept>

#include "evaluator.h"
#include "parser.h"

namespace jsruntime {

// Value implementation
std::string Value::toString() const {
    switch (type) {
        case ValueType::Undefined:
            return "undefined";
        case ValueType::Null:
            return "null";
        case ValueType::Boolean:
            return boolean_value ? "true" : "false";
        case ValueType::Number: {
            std::ostringstream oss;
            oss << number_value;
            return oss.str();
        }
        case ValueType::String:
            return string_value;
        case ValueType::Object:
            return "[object Object]";
        case ValueType::Function:
            return "[function Function]";
        default:
            return "unknown";
    }
}

bool Value::toBool() const {
    switch (type) {
        case ValueType::Undefined:
        case ValueType::Null:
            return false;
        case ValueType::Boolean:
            return boolean_value;
        case ValueType::Number:
            return number_value != 0.0 && !std::isnan(number_value);
        case ValueType::String:
            return !string_value.empty();
        case ValueType::Object:
        case ValueType::Function:
            return true;
        default:
            return false;
    }
}

double Value::toNumber() const {
    switch (type) {
        case ValueType::Undefined:
            return std::numeric_limits<double>::quiet_NaN();
        case ValueType::Null:
            return 0.0;
        case ValueType::Boolean:
            return boolean_value ? 1.0 : 0.0;
        case ValueType::Number:
            return number_value;
        case ValueType::String: {
            if (string_value.empty()) return 0.0;
            try {
                return std::stod(string_value);
            } catch (...) {
                return std::numeric_limits<double>::quiet_NaN();
            }
        }
        case ValueType::Object:
        case ValueType::Function:
            return std::numeric_limits<double>::quiet_NaN();
        default:
            return std::numeric_limits<double>::quiet_NaN();
    }
}

// Environment implementation
void Environment::define(const std::string& name, const Value& value) { variables[name] = value; }

Value Environment::get(const std::string& name) {
    auto it = variables.find(name);
    if (it != variables.end()) {
        return it->second;
    }

    if (parent) {
        return parent->get(name);
    }

    throw std::runtime_error("Undefined variable: " + name);
}

void Environment::set(const std::string& name, const Value& value) {
    auto it = variables.find(name);
    if (it != variables.end()) {
        it->second = value;
        return;
    }

    if (parent) {
        try {
            parent->set(name, value);
            return;
        } catch (...) {
            // Fall through to define in current scope
        }
    }

    // Define in current scope if not found
    variables[name] = value;
}

// Runtime implementation
Runtime::Runtime() {
    global_env = std::make_shared<Environment>();

    // Add some basic global functions/values
    global_env->define("undefined", Value::undefined());
    global_env->define("null", Value::null());

    // TODO improve later
    global_env->define("console", Value("[object Console]"));
}

Value Runtime::execute(const std::string& code) {
    try {
        // Tokenize
        Lexer lexer(code);
        auto tokens = lexer.tokenize();
        // debugging only
        for (const auto& token : tokens) {
            printf("%s\n", token.toString().c_str());
        }

        // Parse
        Parser parser(tokens);
        auto ast = parser.parse();

        // Evaluate
        Evaluator evaluator(global_env);
        return evaluator.evaluate(ast);

    } catch (const std::exception& e) {
        // For now, return undefined on any error
        // In a real implementation, you'd want proper error handling
        throw std::runtime_error("Runtime error: " + std::string(e.what()));
    }
}

}  // namespace jsruntime