#pragma once

#include <functional>
#include <memory>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

#include "rift/interpreter/call_context.h"
#include "rift/memory/gc.h"
#include "value.h"

namespace rift::runtime {

// Forward declaration to avoid circular dependency
class Value;

// Property descriptor for Object.defineProperty
struct PropertyDescriptor {
    Value value;
    bool writable = true;
    bool enumerable = true;
    bool configurable = true;

    // Accessor property support
    bool is_accessor = false;
    Value getter;  // [[Get]] function or undefined
    Value setter;  // [[Set]] function or undefined

    // Constructor for default descriptor (all true)
    PropertyDescriptor() = default;

    // Constructor with value and default attributes
    explicit PropertyDescriptor(const Value& val)
        : value(val), writable(true), enumerable(true), configurable(true) {
    }

    // Constructor with all attributes
    PropertyDescriptor(const Value& val, bool w, bool e, bool c)
        : value(val), writable(w), enumerable(e), configurable(c) {
    }

    // Static factory for accessor descriptors
    static PropertyDescriptor accessor(const Value& get, const Value& set, bool e = true,
                                       bool c = true) {
        PropertyDescriptor desc;
        desc.is_accessor = true;
        desc.getter = get;
        desc.setter = set;
        desc.enumerable = e;
        desc.configurable = c;
        return desc;
    }
};

// Base JavaScript object
class JSObject : public rift::memory::GCObject {
  private:
    // Property storage using vector with descriptors (preserves insertion order for enumeration)
    // Parallel hash map provides O(1) name-to-index lookup
    std::vector<std::pair<std::string, PropertyDescriptor>> properties_;
    std::unordered_map<std::string, size_t> property_index_;
    JSObject* prototype_;             // Now a raw pointer to GC-managed object
    mutable bool gc_marked_ = false;  // GC mark bit

    // Track which properties hold weak references (for WeakMap/WeakSet support)
    // Properties in this set are excluded from GC traversal in getReferences()
    std::unordered_set<std::string> weak_properties_;

    // Extensibility flag - when false, no new properties can be added
    bool extensible_ = true;

  public:
    JSObject(JSObject* prototype = nullptr) : prototype_(prototype) {
        // Pre-allocate space for properties to avoid frequent reallocations
        properties_.reserve(64);
        property_index_.reserve(64);
    }

    // Property operations
    bool hasProperty(const std::string& key) const;
    Value getProperty(const std::string& key) const;
    void setProperty(const std::string& key, const Value& value);
    bool deleteProperty(const std::string& key);

    // Property descriptor operations
    bool hasOwnProperty(const std::string& key) const;
    PropertyDescriptor getOwnPropertyDescriptor(const std::string& key) const;
    void defineProperty(const std::string& key, const PropertyDescriptor& descriptor);
    std::pair<bool, PropertyDescriptor> findPropertyDescriptor(const std::string& key) const;

    // Prototype chain
    JSObject* getPrototype() const {
        return prototype_;
    }
    void setPrototype(JSObject* prototype) {
        prototype_ = prototype;
    }

    // Extensibility - controls whether new properties can be added
    bool isExtensible() const {
        return extensible_;
    }
    void preventExtensions() {
        extensible_ = false;
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

    // Get only enumerable own property names
    std::vector<std::string> getEnumerablePropertyNames() const;

    // Get only symbol-keyed own property names
    std::vector<std::string> getOwnPropertySymbols() const;

    // Weak property support (for WeakMap/WeakSet)
    // Weak properties are excluded from GC traversal - their referenced objects
    // can be garbage collected even if this object holds a reference to them
    void setWeakProperty(const std::string& key, const Value& value);
    bool isWeakProperty(const std::string& key) const;
    void clearWeakProperty(const std::string& key);

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
    std::function<Value(const rift::core::CallContext&, const std::vector<Value>&)>
        native_function_;
    JSObject* home_object_ = nullptr;  // [[HomeObject]] for super support in methods

  public:
    JSFunction(std::function<Value(const rift::core::CallContext&, const std::vector<Value>&)> func)
        : JSObject(), native_function_(std::move(func)) {
    }

    virtual Value call(const rift::core::CallContext& callContext,
                       const std::vector<Value>& args) const {
        return native_function_(callContext, args);
    }

    // Check if this function can be used as a constructor
    virtual bool isConstructor() const {
        return true;  // Regular functions can be constructors
    }

    // Home object for super support (set when method is defined in a class)
    void setHomeObject(JSObject* home) {
        home_object_ = home;
    }
    JSObject* getHomeObject() const {
        return home_object_;
    }

    std::string getTypeName() const override {
        return "Function";
    }

    // Override to include home_object_ in GC traversal
    std::vector<rift::memory::GCObject*> getReferences() const override {
        auto refs = JSObject::getReferences();
        if(home_object_) {
            refs.push_back(home_object_);
        }
        return refs;
    }
};

// Arrow function object - has lexical this binding
class JSArrowFunction : public JSFunction {
  private:
    Value captured_this_;  // Lexical this value, captured at creation time

  public:
    JSArrowFunction(
        std::function<Value(const rift::core::CallContext&, const std::vector<Value>&)> func,
        const Value& capturedThis)
        : JSFunction(std::move(func)), captured_this_(capturedThis) {
    }

    // Arrow functions always use captured this, ignoring call context
    Value call(const rift::core::CallContext& callContext,
               const std::vector<Value>& args) const override {
        // Create modified context with captured this
        rift::core::CallContext arrow_context(callContext.type, captured_this_);
        return JSFunction::call(arrow_context, args);
    }

    // Arrow functions cannot be constructors
    bool isConstructor() const override {
        return false;
    }

    std::string getTypeName() const override {
        return "Function";  // Arrow functions still report as "function"
    }

    // For GC - ensure captured_this_ is traversed
    std::vector<rift::memory::GCObject*> getReferences() const override {
        auto refs = JSFunction::getReferences();
        if(captured_this_.isObject()) {
            refs.push_back(captured_this_.getObject());
        }
        return refs;
    }
};

}  // namespace rift::runtime