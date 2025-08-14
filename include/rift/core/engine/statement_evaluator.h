#pragma once

#include <memory>

#include "../../frontend/ast/ast_node.h"
#include "../../runtime/environment/environment.h"
#include "../../runtime/values/value.h"

namespace rift::core {

using namespace rift::runtime;
using namespace rift::ast;

// Forward declaration
class Rift;

// RAII guard for exception handling state
class ExceptionGuard {
  private:
    Rift* engine_;

  public:
    explicit ExceptionGuard(Rift* engine);
    ~ExceptionGuard();

    // Non-copyable, non-movable
    ExceptionGuard(const ExceptionGuard&) = delete;
    ExceptionGuard& operator=(const ExceptionGuard&) = delete;
    ExceptionGuard(ExceptionGuard&&) = delete;
    ExceptionGuard& operator=(ExceptionGuard&&) = delete;
};

class StatementEvaluator {
  public:
    // Main evaluation dispatcher for statements
    static Value evaluate(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                          Rift* engine);

  private:
    // Statement evaluation methods
    static Value evaluateBlockStatement(std::shared_ptr<ASTNode> node,
                                        std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateExpressionStatement(std::shared_ptr<ASTNode> node,
                                             std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateVariableDeclaration(std::shared_ptr<ASTNode> node,
                                             std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateLetDeclaration(std::shared_ptr<ASTNode> node,
                                        std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateConstDeclaration(std::shared_ptr<ASTNode> node,
                                          std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateIfStatement(std::shared_ptr<ASTNode> node,
                                     std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateWhileStatement(std::shared_ptr<ASTNode> node,
                                        std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateForStatement(std::shared_ptr<ASTNode> node,
                                      std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateSwitchStatement(std::shared_ptr<ASTNode> node,
                                         std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateBreakStatement(std::shared_ptr<ASTNode> node,
                                        std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateReturnStatement(std::shared_ptr<ASTNode> node,
                                         std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateThrowStatement(std::shared_ptr<ASTNode> node,
                                        std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateTryStatement(std::shared_ptr<ASTNode> node,
                                      std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateCatchClause(std::shared_ptr<ASTNode> node,
                                     std::shared_ptr<Environment> env, Rift* engine,
                                     const Value& caughtValue);
    static Value evaluateFunctionDeclaration(std::shared_ptr<ASTNode> node,
                                             std::shared_ptr<Environment> env, Rift* engine);
};

}  // namespace rift::core