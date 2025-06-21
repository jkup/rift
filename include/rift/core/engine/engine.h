#pragma once

#include <functional>
#include <memory>

#include "../../frontend/ast/ast_node.h"
#include "../../runtime/environment/environment.h"
#include "../../runtime/values/value.h"
#include "../../memory/object_manager.h"
#include "../../memory/gc_environment.h"

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
    std::unique_ptr<rift::memory::ObjectManager> object_manager_;
    std::unique_ptr<rift::memory::GCEnvironment> global_env_gc_;

   public:
    Rift();
    ~Rift() = default;

    // Main execution methods
    Value execute(std::shared_ptr<ASTNode> ast);
    Value evaluate(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env);

    // Global environment access
    std::shared_ptr<Environment> getGlobalEnvironment() const { return global_env_; }

    // Object management
    rift::memory::ObjectManager* getObjectManager() const { return object_manager_.get(); }
    
    // GC control
    void collectGarbage();
    void printGCStats() const;

    // Built-in setup
    void setupBuiltins();
};

}  // namespace rift::core