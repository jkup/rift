#include "environment.h"

#include <stdexcept>

namespace rift::runtime {

void Environment::define(const std::string& name, const Value& value) { variables_[name] = value; }

Value Environment::get(const std::string& name) {
    auto it = variables_.find(name);
    if (it != variables_.end()) {
        return it->second;
    }

    if (parent_) {
        return parent_->get(name);
    }

    throw std::runtime_error("Undefined variable: " + name);
}

void Environment::set(const std::string& name, const Value& value) {
    auto it = variables_.find(name);
    if (it != variables_.end()) {
        it->second = value;
        return;
    }

    if (parent_) {
        try {
            parent_->set(name, value);
            return;
        } catch (...) {
            // Fall through to define in current scope
        }
    }

    // Define in current scope if not found
    variables_[name] = value;
}

bool Environment::has(const std::string& name) const {
    if (variables_.find(name) != variables_.end()) {
        return true;
    }

    if (parent_) {
        return parent_->has(name);
    }

    return false;
}

std::shared_ptr<Environment> Environment::createChild() {
    return std::make_shared<Environment>(shared_from_this());
}

std::vector<std::string> Environment::getVariableNames() const {
    std::vector<std::string> names;
    for (const auto& pair : variables_) {
        names.push_back(pair.first);
    }
    return names;
}

}  // namespace rift::runtime