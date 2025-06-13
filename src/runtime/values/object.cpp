#include "rift/runtime/values/object.h"

#include <algorithm>

namespace rift::runtime {

bool JSObject::hasProperty(const std::string& key) const {
    // Check own properties first
    if (properties_.find(key) != properties_.end()) {
        return true;
    }

    // Check prototype chain
    if (prototype_) {
        return prototype_->hasProperty(key);
    }

    return false;
}

Value JSObject::getProperty(const std::string& key) const {
    // Check own properties first
    auto it = properties_.find(key);
    if (it != properties_.end()) {
        return it->second;
    }

    // Check prototype chain
    if (prototype_) {
        return prototype_->getProperty(key);
    }

    return Value::undefined();
}

void JSObject::setProperty(const std::string& key, const Value& value) { properties_[key] = value; }

bool JSObject::deleteProperty(const std::string& key) {
    auto it = properties_.find(key);
    if (it != properties_.end()) {
        properties_.erase(it);
        return true;
    }
    return false;
}

std::vector<std::string> JSObject::getPropertyNames() const {
    std::vector<std::string> names;

    // Get own property names
    for (const auto& pair : properties_) {
        names.push_back(pair.first);
    }

    // Add prototype property names (avoiding duplicates)
    if (prototype_) {
        auto prototype_names = prototype_->getPropertyNames();
        for (const std::string& name : prototype_names) {
            if (std::find(names.begin(), names.end(), name) == names.end()) {
                names.push_back(name);
            }
        }
    }

    return names;
}

}  // namespace rift::runtime