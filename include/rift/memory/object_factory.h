#pragma once

#include <functional>
#include <memory>

#include "../runtime/values/object.h"
#include "../runtime/values/value.h"
#include "object_manager.h"

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
    explicit ObjectFactory(ObjectManager* manager) : object_manager_(manager) {
    }

    // Create a JS object with optional prototype - now returns raw pointer
    rift::runtime::JSObject* createJSObject(rift::runtime::JSObject* prototype = nullptr) {
        return object_manager_->createJSObject(prototype);
    }

    // Create a JS function - now returns raw pointer
    rift::runtime::JSFunction* createJSFunction(
        std::function<rift::runtime::Value(const rift::core::CallContext&, const std::vector<rift::runtime::Value>&)> func) {
        return object_manager_->createJSFunction(func);
    }

    // Overload for legacy-style functions without CallContext
    rift::runtime::JSFunction* createJSFunction(
        std::function<rift::runtime::Value(const std::vector<rift::runtime::Value>&)> func) {
        return object_manager_->createJSFunction(func);
    }

    // Generic object creation (for future extensibility) - now returns raw pointer
    template <typename T, typename... Args>
    T* createObject(Args&&... args) {
        return object_manager_->createObject<T>(std::forward<Args>(args)...);
    }

    // Get the underlying ObjectManager for direct GC control
    ObjectManager* getObjectManager() const {
        return object_manager_;
    }
};

}  // namespace rift::memory