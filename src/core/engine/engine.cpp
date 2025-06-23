#include "rift/core/engine/engine.h"
#include "rift/core/engine/expression_evaluator.h"
#include "rift/core/engine/statement_evaluator.h"
#include "rift/core/engine/builtin_manager.h"
#include <iostream>

namespace rift::core {

Rift::Rift() {
    object_manager_ = std::make_unique<rift::memory::ObjectManager>();
    global_env_ = std::make_shared<Environment>();
    global_env_gc_ = std::make_unique<rift::memory::GCEnvironment>(global_env_);
    
    // Register global environment as a GC root
    object_manager_->addRoot(global_env_gc_.get());
    
    setupBuiltins();
}

Value Rift::execute(std::shared_ptr<ASTNode> ast) { 
    return evaluate(ast, global_env_); 
}

Value Rift::evaluate(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env) {
    if (!node) {
        return Value::undefined();
    }

    // Delegate to appropriate evaluator based on node type
    switch (node->type) {
        // Expression types
        case ASTNodeType::Identifier:
        case ASTNodeType::Literal:
        case ASTNodeType::BinaryExpression:
        case ASTNodeType::UnaryExpression:
        case ASTNodeType::AssignmentExpression:
        case ASTNodeType::CallExpression:
        case ASTNodeType::MemberExpression:
        case ASTNodeType::ArrayLiteral:
        case ASTNodeType::ObjectLiteral:
        case ASTNodeType::FunctionExpression:
        case ASTNodeType::NewExpression:
            return ExpressionEvaluator::evaluate(node, env, this);

        // Statement types
        case ASTNodeType::Program:
        case ASTNodeType::BlockStatement:
        case ASTNodeType::ExpressionStatement:
        case ASTNodeType::VariableDeclaration:
        case ASTNodeType::IfStatement:
        case ASTNodeType::WhileStatement:
        case ASTNodeType::ReturnStatement:
        case ASTNodeType::ThrowStatement:
        case ASTNodeType::TryStatement:
        case ASTNodeType::CatchClause:
        case ASTNodeType::FunctionDeclaration:
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
    if (isInExceptionHandling()) {
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
    exception_depth_.fetch_add(1);
}

void Rift::exitExceptionHandling() {
    int depth = exception_depth_.fetch_sub(1);
    
    // If we've exited all exception handling and have deferred collection
    if (depth == 1 && deferred_collection_needed_.load()) {
        // Trigger the deferred collection now that it's safe
        object_manager_->collect();
        deferred_collection_needed_.store(false);
    }
}

bool Rift::isInExceptionHandling() const {
    return exception_depth_.load() > 0;
}

}  // namespace rift::core