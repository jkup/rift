#pragma once

#include <memory>

#include "rift/frontend/ast/ast_node.h"
#include "rift/runtime/environment/environment.h"
#include "rift/runtime/values/value.h"

namespace rift {

// Import AST types for convenience
using ASTNode = ast::ASTNode;
using Value = runtime::Value;
using Environment = runtime::Environment;

class Evaluator {
   private:
    std::shared_ptr<Environment> environment;

    Value evaluate_literal(const std::shared_ptr<ASTNode>& node);
    Value evaluate_identifier(const std::shared_ptr<ASTNode>& node);
    Value evaluate_binary_expression(const std::shared_ptr<ASTNode>& node);
    Value evaluate_assignment_expression(const std::shared_ptr<ASTNode>& node);
    Value evaluate_variable_declaration(const std::shared_ptr<ASTNode>& node);
    
    // New function evaluation methods
    Value evaluate_function_declaration(const std::shared_ptr<ASTNode>& node);
    Value evaluate_function_expression(const std::shared_ptr<ASTNode>& node);
    Value evaluate_return_statement(const std::shared_ptr<ASTNode>& node);
    Value evaluate_call_expression(const std::shared_ptr<ASTNode>& node);

   public:
    Evaluator(std::shared_ptr<Environment> env);
    Value evaluate(const std::shared_ptr<ASTNode>& node);
};

}  // namespace rift