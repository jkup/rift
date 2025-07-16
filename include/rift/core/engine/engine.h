#pragma once

#include <atomic>
#include <functional>
#include <memory>

#include "../../frontend/ast/ast_node.h"
#include "../../memory/gc_environment.h"
#include "../../memory/object_factory.h"
#include "../../memory/object_manager.h"
#include "../../runtime/environment/environment.h"
#include "../../runtime/values/value.h"

namespace rift::core {

using namespace rift::runtime;
using namespace rift::ast;

// Forward declaration for evaluator function type
class Rift;
using EvaluatorFunction =
    std::function<Value(std::shared_ptr<ASTNode>, std::shared_ptr<Environment>, Rift*)>;

// Main JavaScript engine - now simplified as a coordinator
class Rift {
  private:
    std::shared_ptr<Environment> global_env_;
    std::unique_ptr<rift::memory::ObjectManager> object_manager_;
    std::unique_ptr<rift::memory::ObjectFactory> object_factory_;
    std::unique_ptr<rift::memory::GCEnvironment> global_env_gc_;

    // Exception handling state tracking
    std::atomic<int> exception_depth_{0};
    std::atomic<bool> deferred_collection_needed_{false};

  public:
    Rift();
    ~Rift();

    // Main execution methods
    Value execute(std::shared_ptr<ASTNode> ast);
    Value evaluate(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env);

    // Global environment access
    std::shared_ptr<Environment> getGlobalEnvironment() const {
        return global_env_;
    }

    // Object management
    rift::memory::ObjectManager* getObjectManager() const {
        return object_manager_.get();
    }
    rift::memory::ObjectFactory* getObjectFactory() const {
        return object_factory_.get();
    }

    // GC control
    void collectGarbage();
    void printGCStats() const;
    void setGCEnabled(bool enabled);
    bool isGCEnabled() const;

    // Exception handling state management
    void enterExceptionHandling();
    void exitExceptionHandling();
    bool isInExceptionHandling() const;

    // Built-in setup
    void setupBuiltins();
};

}  // namespace rift::core