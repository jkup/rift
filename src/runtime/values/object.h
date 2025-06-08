#pragma once

#include <functional>
#include <memory>
#include <unordered_map>
#include <vector>

#include "value.h"

namespace jsruntime::runtime {

// Forward declaration to avoid circular dependency
class Value;

// Base JavaScript object
class JSObject {
   private:
    std::unordered_map<std::string, Value> properties_;
    std::shared_ptr<JSObject> prototype_;

   public:
    JSObject(std::shared_ptr<JSObject> prototype = nullptr) : prototype_(prototype) {}

    // Property operations
    bool hasProperty(const std::string& key) const;
    Value getProperty(const std::string& key) const;
    void setProperty(const std::string& key, const Value& value);
    bool deleteProperty(const std::string& key);

    // Prototype chain
    std::shared_ptr<JSObject> getPrototype() const { return prototype_; }
    void setPrototype(std::shared_ptr<JSObject> prototype) { prototype_ = prototype; }

    // Object type identification
    virtual std::string getTypeName() const { return "Object"; }
    virtual ~JSObject() = default;

    // Get all property names
    std::vector<std::string> getPropertyNames() const;
};

// Function object
class JSFunction : public JSObject {
   private:
    std::function<Value(const std::vector<Value>&)> native_function_;

   public:
    JSFunction(std::function<Value(const std::vector<Value>&)> func)
        : JSObject(), native_function_(func) {}

    Value call(const std::vector<Value>& args) const { return native_function_(args); }

    std::string getTypeName() const override { return "Function"; }
};

}  // namespace jsruntime::runtime