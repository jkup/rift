#include "rift/types/object.h"

#include <algorithm>

namespace rift::runtime {

// Symbol property key prefix - must match evaluation_utils.h
static const char* SYMBOL_KEY_PREFIX = "@@sym:";

static bool isSymbolKey(const std::string& key) {
    return key.rfind(SYMBOL_KEY_PREFIX, 0) == 0;
}

bool JSObject::hasProperty(const std::string& key) const {
    // O(1) lookup via hash map
    if(property_index_.find(key) != property_index_.end()) {
        return true;
    }

    // Check prototype chain
    if(prototype_) {
        return prototype_->hasProperty(key);
    }

    return false;
}

bool JSObject::hasOwnProperty(const std::string& key) const {
    return property_index_.find(key) != property_index_.end();
}

Value JSObject::getProperty(const std::string& key) const {
    // O(1) lookup via hash map
    auto it = property_index_.find(key);
    if(it != property_index_.end()) {
        return properties_[it->second].second.value;
    }

    // Check prototype chain
    if(prototype_) {
        return prototype_->getProperty(key);
    }

    return Value::undefined();
}

PropertyDescriptor JSObject::getOwnPropertyDescriptor(const std::string& key) const {
    auto it = property_index_.find(key);
    if(it != property_index_.end()) {
        return properties_[it->second].second;
    }
    // Return undefined descriptor if not found
    return PropertyDescriptor(Value::undefined(), false, false, false);
}

std::pair<bool, PropertyDescriptor> JSObject::findPropertyDescriptor(const std::string& key) const {
    auto it = property_index_.find(key);
    if(it != property_index_.end()) {
        return {true, properties_[it->second].second};
    }
    if(prototype_) {
        return prototype_->findPropertyDescriptor(key);
    }
    return {false, PropertyDescriptor()};
}

void JSObject::setProperty(const std::string& key, const Value& value) {
    // O(1) lookup for existing property
    auto it = property_index_.find(key);
    if(it != property_index_.end()) {
        auto& desc = properties_[it->second].second;
        // Check if property is writable
        if(desc.writable) {
            desc.value = value;
        }
        // If not writable, silently fail (or could throw TypeError in strict mode)
        return;
    }

    // Property doesn't exist - check if object is extensible
    if(!extensible_) {
        // Cannot add new properties to non-extensible object
        // Silently fail (or could throw TypeError in strict mode)
        return;
    }

    // Add new property with default descriptor (all true)
    property_index_[key] = properties_.size();
    properties_.emplace_back(key, PropertyDescriptor(value));
}

void JSObject::defineProperty(const std::string& key, const PropertyDescriptor& descriptor) {
    // O(1) lookup for existing property
    auto it = property_index_.find(key);
    if(it != property_index_.end()) {
        auto& existing = properties_[it->second].second;
        // Check if property is configurable
        if(!existing.configurable) {
            // §10.1.6.3 ValidateAndApplyPropertyDescriptor for non-configurable properties:
            // - Cannot change from data to accessor or vice versa
            // - Can change writable from true to false (but not false to true)
            // - Can update value if writable is true
            if(!existing.is_accessor && !descriptor.is_accessor) {
                if(existing.writable) {
                    // Allow changing writable true->false
                    if(!descriptor.writable) {
                        existing.writable = false;
                    }
                    existing.value = descriptor.value;
                }
            }
            return;
        }
        // Update the descriptor
        existing = descriptor;
        return;
    }

    // Property doesn't exist - check if object is extensible
    if(!extensible_) {
        // Cannot add new properties to non-extensible object
        return;
    }

    // Add new property
    property_index_[key] = properties_.size();
    properties_.emplace_back(key, descriptor);
}

bool JSObject::deleteProperty(const std::string& key) {
    auto it = property_index_.find(key);
    if(it != property_index_.end()) {
        size_t idx = it->second;
        // Check if property is configurable
        if(!properties_[idx].second.configurable) {
            // Cannot delete non-configurable property
            return false;
        }
        // Erase from vector
        properties_.erase(properties_.begin() + static_cast<ptrdiff_t>(idx));
        // Rebuild property_index_ (deletion is rare, so this is acceptable)
        property_index_.clear();
        for(size_t i = 0; i < properties_.size(); ++i) {
            property_index_[properties_[i].first] = i;
        }
        return true;
    }
    return false;  // Property doesn't exist
}

std::vector<std::string> JSObject::getPropertyNames() const {
    std::vector<std::string> names;

    // Get own property names from vector (including non-enumerable)
    // Exclude symbol-keyed properties per ECMAScript spec
    for(const auto& prop : properties_) {
        if(!isSymbolKey(prop.first)) {
            names.push_back(prop.first);
        }
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
    // Exclude symbol-keyed properties per ECMAScript spec
    for(const auto& pair : properties_) {
        if(!isSymbolKey(pair.first)) {
            names.push_back(pair.first);
        }
    }

    return names;
}

std::vector<std::string> JSObject::getEnumerablePropertyNames() const {
    std::vector<std::string> names;

    // Get only own enumerable property names
    // Exclude symbol-keyed properties per ECMAScript spec
    for(const auto& [key, descriptor] : properties_) {
        if(descriptor.enumerable && !isSymbolKey(key)) {
            names.push_back(key);
        }
    }

    return names;
}

std::vector<std::string> JSObject::getOwnPropertySymbols() const {
    std::vector<std::string> symbols;

    // Get only symbol-keyed property names
    for(const auto& pair : properties_) {
        if(isSymbolKey(pair.first)) {
            symbols.push_back(pair.first);
        }
    }

    return symbols;
}

void JSObject::setWeakProperty(const std::string& key, const Value& value) {
    // Set the property value
    setProperty(key, value);
    // Mark it as a weak property (excluded from GC traversal)
    weak_properties_.insert(key);
}

bool JSObject::isWeakProperty(const std::string& key) const {
    return weak_properties_.find(key) != weak_properties_.end();
}

void JSObject::clearWeakProperty(const std::string& key) {
    weak_properties_.erase(key);
    deleteProperty(key);
}

std::vector<rift::memory::GCObject*> JSObject::getReferences() const {
    std::vector<rift::memory::GCObject*> refs;

    // Add prototype reference
    if(prototype_) {
        refs.push_back(prototype_);  // prototype_ is now a raw pointer
    }

    // Add object references from property descriptors
    // Skip weak properties - they should not keep referenced objects alive
    for(const auto& [key, descriptor] : properties_) {
        // Skip weak properties (used by WeakMap/WeakSet)
        if(weak_properties_.find(key) != weak_properties_.end()) {
            continue;
        }
        if(descriptor.value.isObject() || descriptor.value.isFunction()) {
            JSObject* obj = descriptor.value.getObject();  // getObject() now returns raw pointer
            if(obj) {
                refs.push_back(obj);
            }
        }
        // Traverse getter/setter function references for accessor properties
        if(descriptor.getter.isObject() || descriptor.getter.isFunction()) {
            JSObject* getter_obj = descriptor.getter.getObject();
            if(getter_obj) {
                refs.push_back(getter_obj);
            }
        }
        if(descriptor.setter.isObject() || descriptor.setter.isFunction()) {
            JSObject* setter_obj = descriptor.setter.getObject();
            if(setter_obj) {
                refs.push_back(setter_obj);
            }
        }
    }

    return refs;
}

}  // namespace rift::runtime
