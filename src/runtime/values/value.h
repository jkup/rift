#pragma once

#include <memory>
#include <string>
#include <variant>

namespace jsruntime::runtime {

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
    std::variant<std::monostate,            // Undefined/Null
                 bool,                      // Boolean
                 double,                    // Number
                 std::string,               // String
                 std::shared_ptr<JSObject>  // Object/Function
                 >
        data_;

   public:
    // Constructors
    Value() : type_(ValueType::Undefined), data_(std::monostate{}) {}
    explicit Value(bool b) : type_(ValueType::Boolean), data_(b) {}
    explicit Value(double n) : type_(ValueType::Number), data_(n) {}
    explicit Value(const std::string& s) : type_(ValueType::String), data_(s) {}
    explicit Value(std::shared_ptr<JSObject> obj);

    // Static factory methods
    static Value undefined() { return Value(); }
    static Value null() {
        Value v;
        v.type_ = ValueType::Null;
        return v;
    }

    // Type checking
    bool isUndefined() const { return type_ == ValueType::Undefined; }
    bool isNull() const { return type_ == ValueType::Null; }
    bool isBoolean() const { return type_ == ValueType::Boolean; }
    bool isNumber() const { return type_ == ValueType::Number; }
    bool isString() const { return type_ == ValueType::String; }
    bool isObject() const { return type_ == ValueType::Object; }
    bool isFunction() const { return type_ == ValueType::Function; }

    // Conversion methods
    std::string toString() const;
    bool toBool() const;
    double toNumber() const;
    std::shared_ptr<JSObject> toObject() const;

    // Getters
    ValueType getType() const { return type_; }

    // Get raw values (for internal use)
    bool getBool() const;
    double getNumber() const;
    const std::string& getString() const;
    std::shared_ptr<JSObject> getObject() const;
};

}  // namespace jsruntime::runtime