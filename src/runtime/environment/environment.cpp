#include "rift/runtime/environment/environment.h"

#include <stdexcept>

namespace rift::runtime {

void Environment::define(const std::string& name, const Value& value, VariableType type) {
    // Check for redeclaration conflicts
    auto it = variables_.find(name);
    if(it != variables_.end()) {
        // Allow var redeclaration in same scope
        if(type == VariableType::Var && it->second.type == VariableType::Var) {
            it->second.value = value;
            it->second.initialized = true;
            return;
        }
        // let/const cannot be redeclared in same scope
        throw std::runtime_error("Identifier '" + name + "' has already been declared");
    }
    
    variables_[name] = VariableEntry(value, type);
}

void Environment::declare(const std::string& name, VariableType type) {
    // Check for redeclaration conflicts
    auto it = variables_.find(name);
    if(it != variables_.end()) {
        // Allow var redeclaration in same scope
        if(type == VariableType::Var && it->second.type == VariableType::Var) {
            return;  // Already declared
        }
        // let/const cannot be redeclared in same scope
        throw std::runtime_error("Identifier '" + name + "' has already been declared");
    }
    
    variables_[name] = VariableEntry(type);  // Not initialized yet (TDZ)
}

Value Environment::get(const std::string& name) {
    auto it = variables_.find(name);
    if(it != variables_.end()) {
        // Check for TDZ access
        if(!it->second.initialized) {
            throw std::runtime_error("Cannot access '" + name + "' before initialization");
        }
        return it->second.value;
    }

    if(parent_) {
        return parent_->get(name);
    }

    throw std::runtime_error("Undefined variable: " + name);
}

void Environment::set(const std::string& name, const Value& value) {
    auto it = variables_.find(name);
    if(it != variables_.end()) {
        // Check for TDZ access
        if(!it->second.initialized) {
            throw std::runtime_error("Cannot access '" + name + "' before initialization");
        }
        // Check for const assignment
        if(it->second.type == VariableType::Const) {
            throw std::runtime_error("Assignment to constant variable '" + name + "'");
        }
        it->second.value = value;
        return;
    }

    if(parent_) {
        try {
            parent_->set(name, value);
            return;
        } catch(const std::runtime_error&) {
            // Variable not found in parent chain - fall through to define in current scope (for var semantics)
        }
    }

    // Define in current scope if not found (for var semantics)
    variables_[name] = VariableEntry(value, VariableType::Var);
}

bool Environment::has(const std::string& name) const {
    if(variables_.find(name) != variables_.end()) {
        return true;
    }

    if(parent_) {
        return parent_->has(name);
    }

    return false;
}

bool Environment::hasLocal(const std::string& name) const {
    return variables_.find(name) != variables_.end();
}

std::shared_ptr<Environment> Environment::createChild(bool is_block_scope) {
    return std::make_shared<Environment>(shared_from_this(), is_block_scope);
}

std::vector<std::string> Environment::getVariableNames() const {
    std::vector<std::string> names;
    for(const auto& pair : variables_) {
        names.push_back(pair.first);
    }
    return names;
}

}  // namespace rift::runtime