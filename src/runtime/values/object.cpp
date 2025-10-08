#include "rift/runtime/values/object.h"

#include <algorithm>

namespace rift::runtime {

bool JSObject::hasProperty(const std::string& key) const {
    // Check own properties first (linear search through vector)
    for(const auto& prop : properties_) {
        if(prop.first == key) {
            return true;
        }
    }

    // Check prototype chain
    if(prototype_) {
        return prototype_->hasProperty(key);
    }

    return false;
}

bool JSObject::hasOwnProperty(const std::string& key) const {
    // Check only own properties, not prototype
    for(const auto& prop : properties_) {
        if(prop.first == key) {
            return true;
        }
    }
    return false;
}

Value JSObject::getProperty(const std::string& key) const {
    // Check own properties first (linear search through vector)
    for(const auto& prop : properties_) {
        if(prop.first == key) {
            return prop.second.value;  // Return the value from descriptor
        }
    }

    // Check prototype chain
    if(prototype_) {
        return prototype_->getProperty(key);
    }

    return Value::undefined();
}

PropertyDescriptor JSObject::getOwnPropertyDescriptor(const std::string& key) const {
    // Check only own properties
    for(const auto& prop : properties_) {
        if(prop.first == key) {
            return prop.second;
        }
    }
    // Return undefined descriptor if not found
    return PropertyDescriptor(Value::undefined(), false, false, false);
}

void JSObject::setProperty(const std::string& key, const Value& value) {
    // Look for existing property to update
    for(auto& prop : properties_) {
        if(prop.first == key) {
            // Check if property is writable
            if(prop.second.writable) {
                prop.second.value = value;
            }
            // If not writable, silently fail (or could throw TypeError in strict mode)
            return;
        }
    }
    
    // Property doesn't exist, add new one with default descriptor (all true)
    properties_.emplace_back(key, PropertyDescriptor(value));
}

void JSObject::defineProperty(const std::string& key, const PropertyDescriptor& descriptor) {
    // Look for existing property
    for(auto& prop : properties_) {
        if(prop.first == key) {
            // Check if property is configurable
            if(!prop.second.configurable) {
                // Cannot redefine non-configurable property
                // In strict mode, should throw TypeError
                return;
            }
            // Update the descriptor
            prop.second = descriptor;
            return;
        }
    }
    
    // Property doesn't exist, add new one
    properties_.emplace_back(key, descriptor);
}

bool JSObject::deleteProperty(const std::string& key) {
    // Find property and check if configurable
    for(auto it = properties_.begin(); it != properties_.end(); ++it) {
        if(it->first == key) {
            // Check if property is configurable
            if(!it->second.configurable) {
                // Cannot delete non-configurable property
                return false;
            }
            properties_.erase(it);
            return true;
        }
    }
    return false;  // Property doesn't exist
}

std::vector<std::string> JSObject::getPropertyNames() const {
    std::vector<std::string> names;

    // Get own property names from vector (including non-enumerable)
    for(const auto& prop : properties_) {
        names.push_back(prop.first);
    }

    // Add prototype property names (avoiding duplicates)
    if(prototype_) {
        auto prototype_names = prototype_->getPropertyNames();
        // Append only names that are not already present in names
        std::copy_if(prototype_names.begin(), prototype_names.end(), std::back_inserter(names),
                     [&](const std::string& name) {
                         return std::find(names.begin(), names.end(), name) == names.end();
                     });
    }

    return names;
}

std::vector<std::string> JSObject::getOwnPropertyNames() const {
    std::vector<std::string> names;

    // Get only own property names (not from prototype), including non-enumerable
    for(const auto& pair : properties_) {
        names.push_back(pair.first);
    }

    return names;
}

std::vector<std::string> JSObject::getEnumerablePropertyNames() const {
    std::vector<std::string> names;

    // Get only own enumerable property names
    for(const auto& [key, descriptor] : properties_) {
        if(descriptor.enumerable) {
            names.push_back(key);
        }
    }

    return names;
}

std::vector<rift::memory::GCObject*> JSObject::getReferences() const {
    std::vector<rift::memory::GCObject*> refs;

    // Add prototype reference
    if(prototype_) {
        refs.push_back(prototype_);  // prototype_ is now a raw pointer
    }

    // Add object references from property descriptors
    for(const auto& [key, descriptor] : properties_) {
        if(descriptor.value.isObject() || descriptor.value.isFunction()) {
            JSObject* obj = descriptor.value.getObject();  // getObject() now returns raw pointer
            if(obj) {
                refs.push_back(obj);
            }
        }
    }

    return refs;
}

}  // namespace rift::runtime