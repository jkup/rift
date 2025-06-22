#pragma once

#include <memory>
#include "gc.h"
#include "../runtime/values/object.h"

namespace rift::memory {

class ObjectManager {
private:
    std::unique_ptr<GarbageCollector> gc_;
    
public:
    ObjectManager();
    ~ObjectManager();
    
    // Object creation methods
    template<typename T, typename... Args>
    std::shared_ptr<T> createObject(Args&&... args) {
        static_assert(std::is_base_of_v<GCObject, T>, "T must inherit from GCObject");
        
        auto obj = std::make_shared<T>(std::forward<Args>(args)...);
        gc_->addObject(obj.get());
        return obj;
    }
    
    // Specialized creation methods for common types
    std::shared_ptr<rift::runtime::JSObject> createJSObject(std::shared_ptr<rift::runtime::JSObject> prototype = nullptr);
    std::shared_ptr<rift::runtime::JSFunction> createJSFunction(std::function<rift::runtime::Value(const std::vector<rift::runtime::Value>&)> func);
    
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
    GarbageCollector* getGC() const { return gc_.get(); }
};

}  // namespace rift::memory 