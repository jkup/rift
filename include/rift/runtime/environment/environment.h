#pragma once

#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

#include "../values/value.h"

namespace rift::runtime {

// Environment for variable storage and scope management
class Environment : public std::enable_shared_from_this<Environment> {
   private:
    std::unordered_map<std::string, Value> variables_;
    std::shared_ptr<Environment> parent_;

   public:
    Environment(std::shared_ptr<Environment> parent = nullptr) : parent_(parent) {}

    // Variable operations
    void define(const std::string& name, const Value& value);
    Value get(const std::string& name);
    void set(const std::string& name, const Value& value);
    bool has(const std::string& name) const;

    // Scope management
    std::shared_ptr<Environment> getParent() const { return parent_; }
    void setParent(std::shared_ptr<Environment> parent) { parent_ = parent; }

    // Create child environment
    std::shared_ptr<Environment> createChild();

    // Get all variable names in this scope
    std::vector<std::string> getVariableNames() const;
};

}  // namespace rift::runtime