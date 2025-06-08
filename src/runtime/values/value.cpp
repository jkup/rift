#include "value.h"

#include <cmath>
#include <limits>
#include <sstream>
#include <stdexcept>

#include "object.h"

namespace jsruntime::runtime {

// Constructor for objects
Value::Value(std::shared_ptr<JSObject> obj) : data_(obj) {
    if (obj && obj->getTypeName() == "Function") {
        type_ = ValueType::Function;
    } else {
        type_ = ValueType::Object;
    }
}

// Conversion methods
std::string Value::toString() const {
    switch (type_) {
        case ValueType::Undefined:
            return "undefined";
        case ValueType::Null:
            return "null";
        case ValueType::Boolean:
            return std::get<bool>(data_) ? "true" : "false";
        case ValueType::Number: {
            double num = std::get<double>(data_);
            if (std::isnan(num)) return "NaN";
            if (std::isinf(num)) return num > 0 ? "Infinity" : "-Infinity";

            std::ostringstream oss;
            oss << num;
            return oss.str();
        }
        case ValueType::String:
            return std::get<std::string>(data_);
        case ValueType::Object:
            return "[object Object]";
        case ValueType::Function:
            return "[object Function]";
        default:
            return "unknown";
    }
}

bool Value::toBool() const {
    switch (type_) {
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
    switch (type_) {
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
            if (str.empty()) return 0.0;
            try {
                return std::stod(str);
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

std::shared_ptr<JSObject> Value::toObject() const {
    if (type_ == ValueType::Object || type_ == ValueType::Function) {
        return std::get<std::shared_ptr<JSObject>>(data_);
    }
    return nullptr;
}

// Raw value getters
bool Value::getBool() const {
    if (type_ != ValueType::Boolean) {
        throw std::runtime_error("Value is not a boolean");
    }
    return std::get<bool>(data_);
}

double Value::getNumber() const {
    if (type_ != ValueType::Number) {
        throw std::runtime_error("Value is not a number");
    }
    return std::get<double>(data_);
}

const std::string& Value::getString() const {
    if (type_ != ValueType::String) {
        throw std::runtime_error("Value is not a string");
    }
    return std::get<std::string>(data_);
}

std::shared_ptr<JSObject> Value::getObject() const {
    if (type_ != ValueType::Object && type_ != ValueType::Function) {
        throw std::runtime_error("Value is not an object");
    }
    return std::get<std::shared_ptr<JSObject>>(data_);
}

}  // namespace jsruntime::runtime