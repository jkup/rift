#pragma once

#include <memory>

#include "rift/execution/environment.h"
#include "rift/frontend/ast/ast_node.h"
#include "rift/types/value.h"

namespace rift::core {

using namespace rift::runtime;
using namespace rift::ast;

// Forward declaration
class Rift;

class ExpressionEvaluator {
  public:
    // Main evaluation dispatcher for expressions
    static Value evaluate(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                          Rift* engine);

  private:
    // Expression evaluation methods
    static Value evaluateIdentifier(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                                    Rift* engine);
    static Value evaluateLiteral(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                                 Rift* engine);
    static Value evaluateBinaryExpression(std::shared_ptr<ASTNode> node,
                                          std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateUnaryExpression(std::shared_ptr<ASTNode> node,
                                         std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateUpdateExpression(std::shared_ptr<ASTNode> node,
                                          std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateAssignmentExpression(std::shared_ptr<ASTNode> node,
                                              std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateCallExpression(std::shared_ptr<ASTNode> node,
                                        std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateMemberExpression(std::shared_ptr<ASTNode> node,
                                          std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateArrayLiteral(std::shared_ptr<ASTNode> node,
                                      std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateObjectLiteral(std::shared_ptr<ASTNode> node,
                                       std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateFunctionExpression(std::shared_ptr<ASTNode> node,
                                            std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateArrowFunctionExpression(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateNewExpression(std::shared_ptr<ASTNode> node,
                                       std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateTemplateLiteral(std::shared_ptr<ASTNode> node,
                                         std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateClassExpression(std::shared_ptr<ASTNode> node,
                                         std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateSuperExpression(std::shared_ptr<ASTNode> node,
                                         std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateGeneratorFunctionExpression(std::shared_ptr<ASTNode> node,
                                                     std::shared_ptr<Environment> env,
                                                     Rift* engine);
    static Value evaluateYieldExpression(std::shared_ptr<ASTNode> node,
                                         std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateAsyncFunctionExpression(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateAwaitExpression(std::shared_ptr<ASTNode> node,
                                         std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateRegExpLiteral(std::shared_ptr<ASTNode> node,
                                       std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateConditionalExpression(std::shared_ptr<ASTNode> node,
                                               std::shared_ptr<Environment> env, Rift* engine);
    static Value evaluateSequenceExpression(std::shared_ptr<ASTNode> node,
                                            std::shared_ptr<Environment> env, Rift* engine);
};

}  // namespace rift::core