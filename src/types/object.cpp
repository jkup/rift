#include "rift/types/object.h"

#include <algorithm>
#include <cctype>
#include <cmath>
#include <cstdint>

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

Value JSObject::getProperty(const std::string& key, const Value& receiver) const {
    // O(1) lookup via hash map
    auto it = property_index_.find(key);
    if(it != property_index_.end()) {
        return properties_[it->second].second.value;
    }

    // Check prototype chain, threading the receiver through so an exotic
    // object (e.g. Proxy) in the chain sees the original receiver
    if(prototype_) {
        return prototype_->getProperty(key, receiver);
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

bool JSObject::setProperty(const std::string& key, const Value& value, const Value& /*receiver*/) {
    // O(1) lookup for existing property
    auto it = property_index_.find(key);
    if(it != property_index_.end()) {
        auto& desc = properties_[it->second].second;
        // Check if property is writable
        if(desc.writable) {
            desc.value = value;
            return true;
        }
        // Property is not writable — reject
        return false;
    }

    // Property doesn't exist - check if object is extensible
    if(!extensible_) {
        // Cannot add new properties to non-extensible object
        return false;
    }

    // Add new property with default descriptor (all true)
    property_index_[key] = properties_.size();
    properties_.emplace_back(key, PropertyDescriptor(value));
    return true;
}

bool JSObject::defineProperty(const std::string& key, const PropertyDescriptor& descriptor) {
    // §10.1.6.3 ValidateAndApplyPropertyDescriptor ( O, P, extensible, Desc, current )
    // @spec https://tc39.es/ecma262/#sec-validateandapplypropertydescriptor

    // O(1) lookup for existing property
    auto it = property_index_.find(key);
    if(it != property_index_.end()) {
        auto& existing = properties_[it->second].second;

        // Step 4: If current.[[Configurable]] is false, then
        if(!existing.configurable) {
            // Step 4.a: If Desc.[[Configurable]] is true, return false.
            if(descriptor.configurable) {
                return false;
            }

            // Step 4.b: If Desc.[[Enumerable]] differs from current, return false.
            if(descriptor.enumerable != existing.enumerable) {
                return false;
            }

            // Step 6: If current and Desc differ in accessor vs data type
            if(existing.is_accessor != descriptor.is_accessor) {
                // Non-configurable: cannot change between data and accessor
                return false;
            }

            // Step 7: If both are accessor descriptors
            if(existing.is_accessor) {
                // Step 7.a: Cannot change getter when non-configurable
                // Compare getter identity (both must be same function or both undefined)
                if(existing.getter.isFunction() || descriptor.getter.isFunction()) {
                    if(existing.getter.getType() != descriptor.getter.getType()) {
                        return false;
                    }
                    if(existing.getter.isFunction() &&
                       existing.getter.getObject() != descriptor.getter.getObject()) {
                        return false;
                    }
                }
                // Step 7.b: Cannot change setter when non-configurable
                if(existing.setter.isFunction() || descriptor.setter.isFunction()) {
                    if(existing.setter.getType() != descriptor.setter.getType()) {
                        return false;
                    }
                    if(existing.setter.isFunction() &&
                       existing.setter.getObject() != descriptor.setter.getObject()) {
                        return false;
                    }
                }
                return true;
            }

            // Step 8: Both are data descriptors, current is non-configurable
            if(!existing.writable) {
                // Step 8.a.i: Cannot change writable from false to true
                if(descriptor.writable) {
                    return false;
                }
                // Step 8.a.ii: Cannot change value if non-writable
                // Use SameValue comparison (§7.2.11): NaN === NaN, +0 !== -0
                if(descriptor.value.getType() != existing.value.getType()) {
                    return false;
                }
                if(descriptor.value.isNumber()) {
                    double a = descriptor.value.toNumber();
                    double b = existing.value.toNumber();
                    // SameValue: NaN equals NaN, +0 != -0
                    if(std::isnan(a) && std::isnan(b)) {
                        // Both NaN — same value
                    } else if(a != b) {
                        return false;
                    }
                } else if(descriptor.value.isString()) {
                    if(descriptor.value.toString() != existing.value.toString()) {
                        return false;
                    }
                } else if(descriptor.value.isBoolean()) {
                    if(descriptor.value.toBool() != existing.value.toBool()) {
                        return false;
                    }
                } else if(descriptor.value.isObject() || descriptor.value.isFunction()) {
                    if(descriptor.value.getObject() != existing.value.getObject()) {
                        return false;
                    }
                }
                // null === null, undefined === undefined — same type is enough
                return true;
            }

            // Writable is true: can change writable true->false, and can update value
            if(!descriptor.writable) {
                existing.writable = false;
            }
            existing.value = descriptor.value;
            return true;
        }
        // Step 9: Property is configurable — update the descriptor freely
        existing = descriptor;
        return true;
    }

    // Step 2: Property doesn't exist — check if object is extensible
    if(!extensible_) {
        // Step 2.a: If extensible is false, return false.
        return false;
    }

    // Step 3: Add new property
    property_index_[key] = properties_.size();
    properties_.emplace_back(key, descriptor);
    return true;
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

std::vector<std::string> JSObject::getOwnPropertyKeys() const {
    // 10.1.11 OrdinaryOwnPropertyKeys ( O )
    // @spec https://tc39.es/ecma262/#sec-ordinaryownpropertykeys

    // Step 2: array-index keys in ascending numeric order
    std::vector<std::pair<uint64_t, std::string>> index_keys;
    // Step 3: string keys in property creation order
    std::vector<std::string> string_keys;
    // Step 4: symbol keys in property creation order
    std::vector<std::string> symbol_keys;

    for(const auto& pair : properties_) {
        const std::string& key = pair.first;
        if(isSymbolKey(key)) {
            symbol_keys.push_back(key);
            continue;
        }
        // An array index is a canonical numeric string in [0, 2^32-1)
        uint64_t index = 0;
        bool is_index = !key.empty() && key.size() <= 10 &&
                        (key == "0" ||
                         (key[0] != '0' && std::all_of(key.begin(), key.end(), [](unsigned char c) {
                              return std::isdigit(c);
                          })));
        if(is_index) {
            index = std::stoull(key);
            is_index = index < 4294967295ULL;
        }
        if(is_index) {
            index_keys.emplace_back(index, key);
        } else {
            string_keys.push_back(key);
        }
    }

    std::sort(index_keys.begin(), index_keys.end());

    std::vector<std::string> keys;
    keys.reserve(index_keys.size() + string_keys.size() + symbol_keys.size());
    for(const auto& [index, key] : index_keys) {
        keys.push_back(key);
    }
    keys.insert(keys.end(), string_keys.begin(), string_keys.end());
    keys.insert(keys.end(), symbol_keys.begin(), symbol_keys.end());
    return keys;
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
