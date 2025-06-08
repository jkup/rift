#pragma once

#include <memory>
#include <vector>

#include "../ast/ast_node.h"
#include "../lexer/token.h"

namespace jsruntime::frontend {

// Parser class
class Parser {
   private:
    std::vector<Token> tokens;
    size_t current;

    Token& current_token();
    Token& peek_token();
    bool match(TokenType type);
    void consume(TokenType type);

    std::shared_ptr<ast::ASTNode> parse_expression();
    std::shared_ptr<ast::ASTNode> parse_primary();
    std::shared_ptr<ast::ASTNode> parse_binary_expression(int precedence);
    std::shared_ptr<ast::ASTNode> parse_assignment_expression();
    std::shared_ptr<ast::ASTNode> parse_statement();
    std::shared_ptr<ast::ASTNode> parse_postfix_expression();
    std::shared_ptr<ast::ASTNode> parse_call_expression(std::shared_ptr<ast::ASTNode> callee);
    std::shared_ptr<ast::ASTNode> parse_member_expression(std::shared_ptr<ast::ASTNode> object);
    std::shared_ptr<ast::ASTNode> parse_variable_declaration();
    std::shared_ptr<ast::ASTNode> parse_if_statement();

   public:
    Parser(const std::vector<Token>& tokens);
    std::shared_ptr<ast::ASTNode> parse();
};

}  // namespace jsruntime::frontend