#include "rift/runtime/values/value.h"

#include <cmath>
#include <iostream>
#include <limits>
#include <sstream>
#include <stdexcept>

#include "rift/runtime/values/object.h"

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
        case ValueType::Object:
            return "[object Object]";
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
            } catch(...) {
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