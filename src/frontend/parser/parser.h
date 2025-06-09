#pragma once

#include <memory>
#include <vector>

#include "../ast/ast_factory.h"
#include "../ast/ast_node.h"
#include "../lexer/token.h"

namespace jsruntime::frontend {

using namespace ast;

// Parser class
class Parser {
   private:
    std::vector<Token> tokens;
    size_t current;

    Token& current_token();
    Token& peek_token();
    bool match(TokenType type);
    void consume(TokenType type);

    std::shared_ptr<ASTNode> parse_expression();
    std::shared_ptr<ASTNode> parse_primary();
    std::shared_ptr<ASTNode> parse_unary_expression();
    std::shared_ptr<ASTNode> parse_binary_expression(int precedence);
    std::shared_ptr<ASTNode> parse_assignment_expression();
    std::shared_ptr<ASTNode> parse_statement();
    std::shared_ptr<ASTNode> parse_postfix_expression();
    std::shared_ptr<ASTNode> parse_call_expression(std::shared_ptr<ASTNode> callee);
    std::shared_ptr<ASTNode> parse_member_expression(std::shared_ptr<ASTNode> object);
    std::shared_ptr<ASTNode> parse_variable_declaration();
    std::shared_ptr<ASTNode> parse_if_statement();

   public:
    Parser(const std::vector<Token>& tokens);
    std::shared_ptr<ASTNode> parse();
};

}  // namespace jsruntime::frontend