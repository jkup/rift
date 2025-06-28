#include "rift/memory/gc_environment.h"
#include "rift/runtime/values/value.h"
#include "rift/runtime/values/object.h"

namespace rift::memory {

std::vector<GCObject*> GCEnvironment::getReferences() const {
    std::vector<GCObject*> refs;
    
    if (!env_) {
        return refs;
    }
    
    // Get all variable names in this environment
    auto varNames = env_->getVariableNames();
    
    // Check each variable for object references
    for (const auto& varName : varNames) {
        try {
            auto value = env_->get(varName);
            
            // If the value is an object or function, add it to references
            if (value.isObject() || value.isFunction()) {
                rift::runtime::JSObject* obj = value.getObject();  // Fully qualified name
                if (obj) {
                    refs.push_back(obj);
                }
            }
        } catch (...) {
            // Ignore errors when getting variables during GC
            continue;
        }
    }
    
    // Also add parent environment references if we implement GC for environments
    // For now, we'll let the shared_ptr handle environment lifecycle
    
    return refs;
}

}  // namespace rift::memory 