#pragma once

#include <memory>

#include "../../frontend/ast/ast_node.h"
#include "../../runtime/environment/environment.h"
#include "../../runtime/values/value.h"

namespace jsruntime::core {

using namespace jsruntime::runtime;
using namespace jsruntime::ast;

// Main JavaScript engine
class JSEngine {
   private:
    std::shared_ptr<Environment> global_env_;

   public:
    JSEngine();
    ~JSEngine() = default;

    // Execution methods
    Value execute(std::shared_ptr<ASTNode> ast);
    Value evaluate(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env);

    // Global environment access
    std::shared_ptr<Environment> getGlobalEnvironment() const { return global_env_; }

    // Built-in setup
    void setupBuiltins();

   private:
    // Expression evaluation
    Value evaluateIdentifier(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env);
    Value evaluateLiteral(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env);
    Value evaluateBinaryExpression(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env);
    Value evaluateUnaryExpression(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env);
    Value evaluateAssignmentExpression(std::shared_ptr<ASTNode> node,
                                       std::shared_ptr<Environment> env);
    Value evaluateCallExpression(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env);
    Value evaluateMemberExpression(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env);

    // Statement evaluation
    Value evaluateBlockStatement(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env);
    Value evaluateExpressionStatement(std::shared_ptr<ASTNode> node,
                                      std::shared_ptr<Environment> env);
    Value evaluateVariableDeclaration(std::shared_ptr<ASTNode> node,
                                      std::shared_ptr<Environment> env);
    Value evaluateIfStatement(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env);
    Value evaluateWhileStatement(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env);
    Value evaluateReturnStatement(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env);

    // Helper methods
    Value performBinaryOperation(const std::string& op, const Value& left, const Value& right);
    Value performUnaryOperation(const std::string& op, const Value& operand);
};

}  // namespace jsruntime::core