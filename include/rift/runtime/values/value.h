#pragma once

#include <memory>
#include <string>
#include <variant>

namespace rift::runtime {

// Forward declarations
class JSObject;
class JSFunction;

// Modern value system
enum class ValueType {
    Undefined,
    Null,
    Boolean,
    Number,
    String,
    Object,
    Function,
};

// Rich value representation
class Value {
  private:
    ValueType type_;
    std::variant<std::monostate,  // Undefined/Null
                 bool,            // Boolean
                 double,          // Number
                 std::string,     // String
                 JSObject*        // Object/Function (GC-managed raw pointer)
                 >
        data_;

  public:
    // Constructors
    Value();
    explicit Value(bool b);
    explicit Value(double n);
    explicit Value(const std::string& s);
    explicit Value(const char* s);
    explicit Value(JSObject* obj);  // Now takes raw pointer

    // Static factory methods
    static Value undefined() {
        return Value();
    }
    static Value null() {
        Value v;
        v.type_ = ValueType::Null;
        return v;
    }

    // Type checking
    bool isUndefined() const {
        return type_ == ValueType::Undefined;
    }
    bool isNull() const {
        return type_ == ValueType::Null;
    }
    bool isBoolean() const {
        return type_ == ValueType::Boolean;
    }
    bool isNumber() const {
        return type_ == ValueType::Number;
    }
    bool isString() const {
        return type_ == ValueType::String;
    }
    bool isObject() const {
        return type_ == ValueType::Object;
    }
    bool isFunction() const {
        return type_ == ValueType::Function;
    }

    // Conversion methods
    std::string toString() const;
    bool toBool() const;
    double toNumber() const;
    JSObject* toObject() const;  // Now returns raw pointer

    // Getters
    ValueType getType() const {
        return type_;
    }

    // Get raw values (for internal use)
    bool getBool() const;
    double getNumber() const;
    const std::string& getString() const;
    JSObject* getObject() const;  // Now returns raw pointer
};

}  // namespace rift::runtime