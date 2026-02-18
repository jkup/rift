#include "rift/execution/environment.h"

#include <stdexcept>

#include "rift/interpreter/javascript_exception.h"
#include "rift/types/object.h"

namespace rift::runtime {

using rift::core::JavaScriptException;

void Environment::define(const std::string& name, const Value& value, VariableType type) {
    // Check for redeclaration conflicts
    auto it = variables_.find(name);
    if(it != variables_.end()) {
        // Allow var redeclaration in same scope
        if(type == VariableType::Var && it->second.type == VariableType::Var) {
            it->second.value = value;
            it->second.initialized = true;
            if(binding_object_) {
                binding_object_->setProperty(name, value);
            }
            return;
        }
        // let/const cannot be redeclared in same scope
        throw JavaScriptException(
            Value("SyntaxError: Identifier '" + name + "' has already been declared"));
    }

    variables_[name] = VariableEntry(value, type);
    if(binding_object_) {
        binding_object_->setProperty(name, value);
    }
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
        throw JavaScriptException(
            Value("SyntaxError: Identifier '" + name + "' has already been declared"));
    }

    variables_[name] = VariableEntry(type);  // Not initialized yet (TDZ)
}

Value Environment::get(const std::string& name) {
    auto it = variables_.find(name);
    if(it != variables_.end()) {
        // Check for TDZ access
        if(!it->second.initialized) {
            throw JavaScriptException(
                Value("ReferenceError: Cannot access '" + name + "' before initialization"));
        }
        return it->second.value;
    }

    if(parent_) {
        return parent_->get(name);
    }

    throw JavaScriptException(Value("ReferenceError: " + name + " is not defined"));
}

void Environment::set(const std::string& name, const Value& value) {
    auto it = variables_.find(name);
    if(it != variables_.end()) {
        // Check for TDZ access
        if(!it->second.initialized) {
            throw JavaScriptException(
                Value("ReferenceError: Cannot access '" + name + "' before initialization"));
        }
        // Check for const assignment
        if(it->second.type == VariableType::Const) {
            throw JavaScriptException(
                Value("TypeError: Assignment to constant variable '" + name + "'"));
        }
        it->second.value = value;
        if(binding_object_) {
            binding_object_->setProperty(name, value);
        }
        return;
    }

    // Variable not in current scope - check if it exists anywhere in the parent chain
    if(parent_) {
        if(parent_->has(name)) {
            // Variable exists in parent chain - delegate to parent
            parent_->set(name, value);
            return;
        }
    }

    // Variable doesn't exist anywhere in the scope chain
    // In strict mode, this is an error
    if(inheritsStrictMode()) {
        throw JavaScriptException(Value("ReferenceError: " + name + " is not defined"));
    }

    // In non-strict mode, create as global (define in current scope for simplicity)
    // Note: Ideally this should go to the global scope, but for now this works
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