#pragma once

#include <memory>
#include <functional>
#include "object_manager.h"
#include "../runtime/values/object.h"
#include "../runtime/values/value.h"

namespace rift::memory {

// Forward declaration
class ObjectManager;

/**
 * Object Factory - provides convenient methods for creating GC-managed objects
 * This replaces direct std::make_shared calls throughout the codebase
 */
class ObjectFactory {
private:
    ObjectManager* object_manager_;
    
public:
    explicit ObjectFactory(ObjectManager* manager) : object_manager_(manager) {}
    
    // Create a JS object with optional prototype
    std::shared_ptr<rift::runtime::JSObject> createJSObject(
        std::shared_ptr<rift::runtime::JSObject> prototype = nullptr
    ) {
        return object_manager_->createJSObject(prototype);
    }
    
    // Create a JS function
    std::shared_ptr<rift::runtime::JSFunction> createJSFunction(
        std::function<rift::runtime::Value(const std::vector<rift::runtime::Value>&)> func
    ) {
        return object_manager_->createJSFunction(func);
    }
    
    // Generic object creation (for future extensibility)
    template<typename T, typename... Args>
    std::shared_ptr<T> createObject(Args&&... args) {
        return object_manager_->createObject<T>(std::forward<Args>(args)...);
    }
};

}  // namespace rift::memory 