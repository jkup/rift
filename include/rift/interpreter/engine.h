#pragma once

#include <atomic>
#include <functional>
#include <memory>

#include "rift/execution/environment.h"
#include "rift/execution/microtask_queue.h"
#include "rift/frontend/ast/ast_node.h"
#include "rift/memory/gc_environment.h"
#include "rift/memory/object_factory.h"
#include "rift/memory/object_manager.h"
#include "rift/types/value.h"

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

    // Microtask queue for Promise reactions and other async operations
    MicrotaskQueue microtask_queue_;

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

    // Microtask queue for Promise support
    void enqueueMicrotask(rift::runtime::JSFunction* callback,
                          std::vector<rift::runtime::Value> args,
                          rift::runtime::Value this_value = rift::runtime::Value::undefined());
    void drainMicrotasks();
    bool hasPendingMicrotasks() const;

    // Built-in setup
    void setupBuiltins();
};

}  // namespace rift::core