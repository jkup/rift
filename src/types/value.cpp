#include "rift/types/value.h"

#include <cmath>
#include <iostream>
#include <limits>
#include <sstream>
#include <stdexcept>

#include "rift/types/object.h"

namespace rift::runtime {

// Constructors
Value::Value() : type_(ValueType::Undefined), data_(std::monostate{}) {
}

Value::Value(bool b) : type_(ValueType::Boolean), data_(b) {
}

Value::Value(double n) : type_(ValueType::Number), data_(n) {
}

Value::Value(const std::string& s) : type_(ValueType::String), data_(s) {
}

Value::Value(std::string&& s) : type_(ValueType::String), data_(std::move(s)) {
}

Value::Value(const char* s) : type_(ValueType::String), data_(std::string(s)) {
}

// Constructor for objects - now takes raw pointer
Value::Value(JSObject* obj) : data_(obj) {
    if(obj) {
        type_ = (obj->getTypeName() == "Function") ? ValueType::Function : ValueType::Object;
    } else {
        type_ = ValueType::Null;
    }
}

// Conversion methods
std::string Value::toString() const {
    switch(type_) {
        case ValueType::Undefined:
            return "undefined";
        case ValueType::Null:
            return "null";
        case ValueType::Boolean:
            return std::get<bool>(data_) ? "true" : "false";
        case ValueType::Number: {
            double num = std::get<double>(data_);
            if(std::isnan(num))
                return "NaN";
            if(std::isinf(num))
                return num > 0 ? "Infinity" : "-Infinity";

            std::ostringstream oss;
            oss << num;
            return oss.str();
        }
        case ValueType::String: {
            return std::get<std::string>(data_);
        }
        case ValueType::Symbol: {
            const SymbolData& sym = std::get<SymbolData>(data_);
            return "Symbol(" + sym.description + ")";
        }
        case ValueType::Object: {
            // Check if this is an Error object (has name and message properties)
            auto* obj = std::get<JSObject*>(data_);
            if(obj) {
                Value nameVal = obj->getProperty("name");
                Value messageVal = obj->getProperty("message");
                // If it has a name property that looks like an error type, format as error
                if(!nameVal.isUndefined() && nameVal.isString()) {
                    std::string name = nameVal.toString();
                    // Check if it's an error-like name
                    if(name == "Error" || name == "TypeError" || name == "ReferenceError" ||
                       name == "SyntaxError" || name == "RangeError" || name == "URIError" ||
                       name == "EvalError" || name == "AggregateError" || name == "Test262Error") {
                        std::string message = messageVal.isUndefined() ? "" : messageVal.toString();
                        if(message.empty()) {
                            return name;
                        } else {
                            return name + ": " + message;
                        }
                    }
                }
            }
            return "[object Object]";
        }
        case ValueType::Function:
            return "[object Function]";
        default:
            return "unknown";
    }
}

bool Value::toBool() const {
    switch(type_) {
        case ValueType::Undefined:
        case ValueType::Null:
            return false;
        case ValueType::Boolean:
            return std::get<bool>(data_);
        case ValueType::Number: {
            double num = std::get<double>(data_);
            return num != 0.0 && !std::isnan(num);
        }
        case ValueType::String:
            return !std::get<std::string>(data_).empty();
        case ValueType::Symbol:
            return true;  // Symbols are always truthy
        case ValueType::Object:
        case ValueType::Function:
            return true;  // Objects are always truthy
        default:
            return false;
    }
}

double Value::toNumber() const {
    switch(type_) {
        case ValueType::Undefined:
            return std::numeric_limits<double>::quiet_NaN();
        case ValueType::Null:
            return 0.0;
        case ValueType::Boolean:
            return std::get<bool>(data_) ? 1.0 : 0.0;
        case ValueType::Number:
            return std::get<double>(data_);
        case ValueType::String: {
            const std::string& str = std::get<std::string>(data_);
            if(str.empty())
                return 0.0;
            try {
                return std::stod(str);
            } catch(const std::invalid_argument&) {
                // String is not a valid number
                return std::numeric_limits<double>::quiet_NaN();
            } catch(const std::out_of_range&) {
                // Number out of range
                return std::numeric_limits<double>::infinity();
            }
        }
        case ValueType::Symbol:
            throw std::runtime_error("TypeError: Cannot convert a Symbol value to a number");
        case ValueType::Object:
        case ValueType::Function:
            return std::numeric_limits<double>::quiet_NaN();
        default:
            return std::numeric_limits<double>::quiet_NaN();
    }
}

JSObject* Value::toObject() const {
    if(type_ == ValueType::Object || type_ == ValueType::Function) {
        return std::get<JSObject*>(data_);
    }
    return nullptr;
}

// Raw value getters
bool Value::getBool() const {
    if(type_ != ValueType::Boolean) {
        throw std::runtime_error("Value is not a boolean");
    }
    return std::get<bool>(data_);
}

double Value::getNumber() const {
    if(type_ != ValueType::Number) {
        throw std::runtime_error("Value is not a number");
    }
    return std::get<double>(data_);
}

const std::string& Value::getString() const {
    if(type_ != ValueType::String) {
        throw std::runtime_error("Value is not a string");
    }
    return std::get<std::string>(data_);
}

const SymbolData& Value::getSymbol() const {
    if(type_ != ValueType::Symbol) {
        throw std::runtime_error("Value is not a symbol");
    }
    return std::get<SymbolData>(data_);
}

Value Value::symbol(uint64_t id, const std::string& description) {
    Value v;
    v.type_ = ValueType::Symbol;
    v.data_ = SymbolData(id, description);
    return v;
}

JSObject* Value::getObject() const {
    if(type_ != ValueType::Object && type_ != ValueType::Function) {
        throw std::runtime_error("Value is not an object");
    }
    return std::get<JSObject*>(data_);
}

bool Value::strictEquals(const Value& other) const {
    // JavaScript strict equality (===) - same as OperationHandler implementation
    if(type_ != other.type_) {
        return false;
    }

    // Same type, compare values
    if(isNumber()) {
        return toNumber() == other.toNumber();
    } else if(isString()) {
        return toString() == other.toString();
    } else if(isBoolean()) {
        return toBool() == other.toBool();
    } else if(isSymbol()) {
        // Symbols are equal only if they have the same ID
        return getSymbol() == other.getSymbol();
    } else if(isNull() && other.isNull()) {
        return true;
    } else if(isUndefined() && other.isUndefined()) {
        return true;
    } else {
        // For objects, compare reference (simplified)
        return toString() == other.toString();
    }
}

}  // namespace rift::runtime