#pragma once

#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

#include "../values/value.h"

namespace rift::runtime {

// Variable declaration types for let/const support
enum class VariableType {
    Var,    // function-scoped, hoisted
    Let,    // block-scoped, TDZ
    Const   // block-scoped, TDZ, immutable
};

// Variable entry with type information
struct VariableEntry {
    Value value;
    VariableType type;
    bool initialized;  // For TDZ support
    
    // Default constructor for unordered_map
    VariableEntry() 
        : value(Value::undefined()), type(VariableType::Var), initialized(true) {}
    
    VariableEntry(const Value& v, VariableType t) 
        : value(v), type(t), initialized(true) {}
    
    VariableEntry(VariableType t) 
        : value(Value::undefined()), type(t), initialized(false) {}
};

// Environment for variable storage and scope management
class Environment : public std::enable_shared_from_this<Environment> {
  private:
    std::unordered_map<std::string, VariableEntry> variables_;
    std::shared_ptr<Environment> parent_;
    bool is_block_scope_;  // true for let/const block scopes

  public:
    Environment(std::shared_ptr<Environment> parent = nullptr, bool is_block_scope = false) 
        : parent_(parent), is_block_scope_(is_block_scope) {
    }

    // Variable operations
    void define(const std::string& name, const Value& value, VariableType type = VariableType::Var);
    void declare(const std::string& name, VariableType type);  // For TDZ support
    Value get(const std::string& name);
    void set(const std::string& name, const Value& value);
    bool has(const std::string& name) const;
    bool hasLocal(const std::string& name) const;  // Check only current scope

    // Scope management
    std::shared_ptr<Environment> getParent() const {
        return parent_;
    }
    void setParent(std::shared_ptr<Environment> parent) {
        parent_ = parent;
    }
    bool isBlockScope() const {
        return is_block_scope_;
    }

    // Create child environment
    std::shared_ptr<Environment> createChild(bool is_block_scope = false);

    // Get all variable names in this scope
    std::vector<std::string> getVariableNames() const;
};

}  // namespace rift::runtime