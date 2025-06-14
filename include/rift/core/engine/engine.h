#pragma once

#include <memory>

#include "../../frontend/ast/ast_node.h"
#include "../../runtime/environment/environment.h"
#include "../../runtime/values/value.h"

namespace rift::core {

using namespace rift::runtime;
using namespace rift::ast;

// Forward declaration for evaluator function type
class Rift;
using EvaluatorFunction = std::function<Value(std::shared_ptr<ASTNode>, std::shared_ptr<Environment>, Rift*)>;

// Main JavaScript engine - now simplified as a coordinator
class Rift {
   private:
    std::shared_ptr<Environment> global_env_;

   public:
    Rift();
    ~Rift() = default;

    // Main execution methods
    Value execute(std::shared_ptr<ASTNode> ast);
    Value evaluate(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env);

    // Global environment access
    std::shared_ptr<Environment> getGlobalEnvironment() const { return global_env_; }

    // Built-in setup
    void setupBuiltins();
};

}  // namespace rift::core