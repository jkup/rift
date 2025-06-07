#pragma once

#include <memory>
#include <string>
#include <unordered_map>

namespace jsruntime {

// Forward declarations
class Value;
class Environment;

// Basic JavaScript value types
enum class ValueType { Undefined, Null, Boolean, Number, String, Object, Function };

// Simple JavaScript value representation
class Value {
   public:
    ValueType type;
    union {
        bool boolean_value;
        double number_value;
    };
    std::string string_value;

    Value() : type(ValueType::Undefined) {}
    explicit Value(bool b) : type(ValueType::Boolean), boolean_value(b) {}
    explicit Value(double n) : type(ValueType::Number), number_value(n) {}
    explicit Value(const std::string& s) : type(ValueType::String), string_value(s) {}

    static Value undefined() { return Value(); }
    static Value null() {
        Value v;
        v.type = ValueType::Null;
        return v;
    }

    std::string toString() const;
    bool toBool() const;
    double toNumber() const;
};

// Simple environment for variable storage
class Environment {
   private:
    std::unordered_map<std::string, Value> variables;
    std::shared_ptr<Environment> parent;

   public:
    Environment(std::shared_ptr<Environment> parent = nullptr) : parent(parent) {}

    void define(const std::string& name, const Value& value);
    Value get(const std::string& name);
    void set(const std::string& name, const Value& value);
};

// Main JavaScript runtime
class Runtime {
   private:
    std::shared_ptr<Environment> global_env;

   public:
    Runtime();

    // Execute JavaScript code
    Value execute(const std::string& code);

    // Get global environment
    std::shared_ptr<Environment> getGlobalEnvironment() { return global_env; }
};

}  // namespace jsruntime