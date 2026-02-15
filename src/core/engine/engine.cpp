#include "rift/core/engine/engine.h"

#include <iostream>

#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/call_context.h"
#include "rift/core/engine/expression_evaluator.h"
#include "rift/core/engine/statement_evaluator.h"
#include "rift/runtime/values/object.h"

namespace rift::core {

Rift::Rift() {
    object_manager_ = std::make_unique<rift::memory::ObjectManager>();
    object_factory_ = std::make_unique<rift::memory::ObjectFactory>(object_manager_.get());
    global_env_ = std::make_shared<Environment>();
    global_env_gc_ = std::make_unique<rift::memory::GCEnvironment>(global_env_);

    // Register global environment as a GC root
    object_manager_->addRoot(global_env_gc_.get());

    setupBuiltins();
}

Rift::~Rift() {
    // Clean shutdown - remove roots and disable GC first
    if(object_manager_ && global_env_gc_) {
        object_manager_->removeRoot(global_env_gc_.get());
        object_manager_->setGCEnabled(false);
    }

    // Clear builtin static prototypes to avoid dangling pointers
    BuiltinManager::clearStaticPrototypes();

    // Explicit order of destruction to avoid issues
    global_env_gc_.reset();
    object_factory_.reset();
    object_manager_.reset();
}

Value Rift::execute(std::shared_ptr<ASTNode> ast) {
    return evaluate(ast, global_env_);
}

Value Rift::evaluate(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env) {
    if(!node) {
        return Value::undefined();
    }

    // Delegate to appropriate evaluator based on node type
    switch(node->type) {
        // Expression types
        case ASTNodeType::Identifier:
        case ASTNodeType::Literal:
        case ASTNodeType::BinaryExpression:
        case ASTNodeType::UnaryExpression:
        case ASTNodeType::UpdateExpression:
        case ASTNodeType::AssignmentExpression:
        case ASTNodeType::CallExpression:
        case ASTNodeType::MemberExpression:
        case ASTNodeType::ArrayLiteral:
        case ASTNodeType::ObjectLiteral:
        case ASTNodeType::FunctionExpression:
        case ASTNodeType::ArrowFunctionExpression:
        case ASTNodeType::NewExpression:
        case ASTNodeType::TemplateLiteral:
        case ASTNodeType::ClassExpression:
        case ASTNodeType::SuperExpression:
        case ASTNodeType::GeneratorFunctionExpression:
        case ASTNodeType::YieldExpression:
        case ASTNodeType::AsyncFunctionExpression:
        case ASTNodeType::AwaitExpression:
        case ASTNodeType::RegExpLiteral:
            return ExpressionEvaluator::evaluate(node, env, this);

        // Statement types
        case ASTNodeType::Program:
        case ASTNodeType::BlockStatement:
        case ASTNodeType::ExpressionStatement:
        case ASTNodeType::VariableDeclaration:
        case ASTNodeType::LetDeclaration:
        case ASTNodeType::ConstDeclaration:
        case ASTNodeType::IfStatement:
        case ASTNodeType::WhileStatement:
        case ASTNodeType::DoWhileStatement:
        case ASTNodeType::ForStatement:
        case ASTNodeType::ForInStatement:
        case ASTNodeType::ForOfStatement:
        case ASTNodeType::ForAwaitOfStatement:
        case ASTNodeType::SwitchStatement:
        case ASTNodeType::CaseClause:
        case ASTNodeType::DefaultClause:
        case ASTNodeType::BreakStatement:
        case ASTNodeType::ContinueStatement:
        case ASTNodeType::ReturnStatement:
        case ASTNodeType::ThrowStatement:
        case ASTNodeType::TryStatement:
        case ASTNodeType::CatchClause:
        case ASTNodeType::FinallyClause:
        case ASTNodeType::FunctionDeclaration:
        case ASTNodeType::GeneratorFunctionDeclaration:
        case ASTNodeType::AsyncFunctionDeclaration:
        case ASTNodeType::ClassDeclaration:
            return StatementEvaluator::evaluate(node, env, this);

        default:
            return Value::undefined();
    }
}

void Rift::setupBuiltins() {
    BuiltinManager::setupBuiltins(global_env_, this);
}

void Rift::collectGarbage() {
    // If we're in exception handling, defer collection
    if(isInExceptionHandling()) {
        deferred_collection_needed_.store(true);
        return;
    }

    object_manager_->collect();
    deferred_collection_needed_.store(false);
}

void Rift::printGCStats() const {
    object_manager_->printStats();
}

void Rift::setGCEnabled(bool enabled) {
    object_manager_->setGCEnabled(enabled);
}

bool Rift::isGCEnabled() const {
    return object_manager_->isGCEnabled();
}

void Rift::enterExceptionHandling() {
#ifdef DEBUG_GC
    int new_depth = exception_depth_.fetch_add(1) + 1;
    std::cout << "[GC] Entering exception handling, depth: " << new_depth << std::endl;
#else
    exception_depth_.fetch_add(1);
#endif
}

void Rift::exitExceptionHandling() {
    int depth = exception_depth_.fetch_sub(1);

    // Defensive programming: ensure we don't go negative
    if(depth <= 0) {
// This should never happen in correct code - indicates a bug
#ifdef DEBUG_GC
        std::cerr << "[GC] ERROR: exitExceptionHandling() called without matching "
                     "enterExceptionHandling()!"
                  << std::endl;
        std::cerr << "[GC] Previous depth was: " << depth << std::endl;
#endif

        // Reset to 0 to prevent further issues
        exception_depth_.store(0);
        return;
    }

#ifdef DEBUG_GC
    std::cout << "[GC] Exiting exception handling, depth: " << (depth - 1) << std::endl;
#endif

    // If we've exited all exception handling and have deferred collection
    if(depth == 1 && deferred_collection_needed_.load()) {
#ifdef DEBUG_GC
        std::cout << "[GC] Triggering deferred collection" << std::endl;
#endif

        // Trigger the deferred collection now that it's safe
        object_manager_->collect();
        deferred_collection_needed_.store(false);
    }
}

bool Rift::isInExceptionHandling() const {
    return exception_depth_.load() > 0;
}

// Microtask queue methods for Promise support

void Rift::enqueueMicrotask(rift::runtime::JSFunction* callback,
                            std::vector<rift::runtime::Value> args,
                            rift::runtime::Value this_value) {
    microtask_queue_.enqueue(callback, std::move(args), std::move(this_value));
}

void Rift::drainMicrotasks() {
    // Process all microtasks, including any new ones enqueued during processing
    while(!microtask_queue_.isEmpty()) {
        Microtask task = microtask_queue_.dequeue();

        if(task.callback) {
            try {
                CallContext ctx(CallType::Function, task.this_value);
                task.callback->call(ctx, task.args);
            } catch(const std::exception& e) {
                // Log error but continue processing other microtasks
                // In the future, this should trigger unhandled rejection handling
#ifdef DEBUG_GC
                std::cerr << "[Microtask] Exception during microtask execution: " << e.what()
                          << std::endl;
#endif
            }
        }
    }
}

bool Rift::hasPendingMicrotasks() const {
    return !microtask_queue_.isEmpty();
}

}  // namespace rift::core