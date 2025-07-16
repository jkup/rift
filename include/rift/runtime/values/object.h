#pragma once

#include <functional>
#include <memory>
#include <unordered_map>
#include <vector>

#include "../../memory/gc.h"
#include "value.h"

namespace rift::runtime {

// Forward declaration to avoid circular dependency
class Value;

// Base JavaScript object
class JSObject : public rift::memory::GCObject {
  private:
    std::unordered_map<std::string, Value> properties_;
    JSObject* prototype_;             // Now a raw pointer to GC-managed object
    mutable bool gc_marked_ = false;  // GC mark bit

  public:
    JSObject(JSObject* prototype = nullptr) : prototype_(prototype) {
    }

    // Property operations
    bool hasProperty(const std::string& key) const;
    Value getProperty(const std::string& key) const;
    void setProperty(const std::string& key, const Value& value);
    bool deleteProperty(const std::string& key);

    // Prototype chain
    JSObject* getPrototype() const {
        return prototype_;
    }
    void setPrototype(JSObject* prototype) {
        prototype_ = prototype;
    }

    // Object type identification
    virtual std::string getTypeName() const {
        return "Object";
    }
    virtual ~JSObject() = default;

    // Get all property names
    std::vector<std::string> getPropertyNames() const;

    // Get only own property names (not inherited from prototype)
    std::vector<std::string> getOwnPropertyNames() const;

    // GC interface implementation
    std::vector<rift::memory::GCObject*> getReferences() const override;
    void markReachable() override {
        gc_marked_ = true;
    }
    bool isMarked() const override {
        return gc_marked_;
    }
    void clearMark() override {
        gc_marked_ = false;
    }
    std::string getGCTypeName() const override {
        return getTypeName();
    }
};

// Function object
class JSFunction : public JSObject {
  private:
    std::function<Value(const std::vector<Value>&)> native_function_;

  public:
    JSFunction(std::function<Value(const std::vector<Value>&)> func)
        : JSObject(), native_function_(func) {
    }

    Value call(const std::vector<Value>& args) const {
        return native_function_(args);
    }

    std::string getTypeName() const override {
        return "Function";
    }
};

}  // namespace rift::runtime