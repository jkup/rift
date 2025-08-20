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

Value JSObject::getProperty(const std::string& key) const {
    // Check own properties first (linear search through vector)
    for(const auto& prop : properties_) {
        if(prop.first == key) {
            return prop.second;
        }
    }

    // Check prototype chain
    if(prototype_) {
        return prototype_->getProperty(key);
    }

    return Value::undefined();
}

void JSObject::setProperty(const std::string& key, const Value& value) {
    // Look for existing property to update
    for(auto& prop : properties_) {
        if(prop.first == key) {
            prop.second = value;
            return;
        }
    }
    
    // Property doesn't exist, add new one
    properties_.emplace_back(key, value);
}

bool JSObject::deleteProperty(const std::string& key) {
    // Find and remove property from vector
    for(auto it = properties_.begin(); it != properties_.end(); ++it) {
        if(it->first == key) {
            properties_.erase(it);
            return true;
        }
    }
    return false;
}

std::vector<std::string> JSObject::getPropertyNames() const {
    std::vector<std::string> names;

    // Get own property names from vector
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

    // Get only own property names (not from prototype)
    for(const auto& pair : properties_) {
        names.push_back(pair.first);
    }

    return names;
}

std::vector<rift::memory::GCObject*> JSObject::getReferences() const {
    std::vector<rift::memory::GCObject*> refs;

    // Add prototype reference
    if(prototype_) {
        refs.push_back(prototype_);  // prototype_ is now a raw pointer
    }

    // Add object references from properties
    for(const auto& [key, value] : properties_) {
        if(value.isObject() || value.isFunction()) {
            JSObject* obj = value.getObject();  // getObject() now returns raw pointer
            if(obj) {
                refs.push_back(obj);
            }
        }
    }

    return refs;
}

}  // namespace rift::runtime