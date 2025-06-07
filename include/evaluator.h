#pragma once

#include <memory>

#include "parser.h"
#include "runtime.h"

namespace jsruntime {

class Evaluator {
   private:
    std::shared_ptr<Environment> environment;

    Value evaluate_literal(const std::shared_ptr<ASTNode>& node);
    Value evaluate_identifier(const std::shared_ptr<ASTNode>& node);
    Value evaluate_binary_expression(const std::shared_ptr<ASTNode>& node);
    Value evaluate_assignment_expression(const std::shared_ptr<ASTNode>& node);
    Value evaluate_variable_declaration(const std::shared_ptr<ASTNode>& node);

   public:
    Evaluator(std::shared_ptr<Environment> env);
    Value evaluate(const std::shared_ptr<ASTNode>& node);
};

}  // namespace jsruntime