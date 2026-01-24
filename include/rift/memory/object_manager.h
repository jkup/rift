#pragma once

#include <memory>

#include "../runtime/values/object.h"
#include "gc.h"

namespace rift::memory {

class ObjectManager {
  private:
    std::unique_ptr<GarbageCollector> gc_;

  public:
    ObjectManager();
    ~ObjectManager();

    // Object creation methods - now return raw pointers to GC-managed objects
    template <typename T, typename... Args>
    T* createObject(Args&&... args) {
        static_assert(std::is_base_of_v<GCObject, T>, "T must inherit from GCObject");

        T* obj = new T(std::forward<Args>(args)...);
        gc_->addObject(obj);  // GC now owns this object
        return obj;
    }

    // Specialized creation methods for common types - now return raw pointers
    rift::runtime::JSObject* createJSObject(rift::runtime::JSObject* prototype = nullptr);
    rift::runtime::JSFunction* createJSFunction(
        std::function<rift::runtime::Value(const rift::core::CallContext&, const std::vector<rift::runtime::Value>&)> func);

    // Overload for legacy-style functions without CallContext
    rift::runtime::JSFunction* createJSFunction(
        std::function<rift::runtime::Value(const std::vector<rift::runtime::Value>&)> func);

    // Create arrow function with captured this
    rift::runtime::JSArrowFunction* createJSArrowFunction(
        std::function<rift::runtime::Value(const rift::core::CallContext&, const std::vector<rift::runtime::Value>&)> func,
        const rift::runtime::Value& capturedThis);

    // Root management
    void addRoot(GCObject* root);
    void removeRoot(GCObject* root);

    // GC control
    void collect();
    void setCollectionThreshold(size_t threshold);
    bool shouldCollect() const;

    // GC state control for exception handling
    void setGCEnabled(bool enabled);
    bool isGCEnabled() const;

    // Statistics
    size_t getObjectCount() const;
    size_t getLastCollectionCount() const;
    void printStats() const;

    // Get the underlying GC (for advanced usage)
    GarbageCollector* getGC() const {
        return gc_.get();
    }
};

}  // namespace rift::memory