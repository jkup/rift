#include "parser.h"

#include <stdexcept>

namespace jsruntime::frontend {

using namespace jsruntime::ast;

// Parser implementation
Parser::Parser(const std::vector<Token>& tokens) : tokens(tokens), current(0) {}

Token& Parser::current_token() {
    if (current >= tokens.size()) {
        static Token eof(TokenType::EndOfFile, "");
        return eof;
    }
    return tokens[current];
}

Token& Parser::peek_token() {
    if (current + 1 >= tokens.size()) {
        static Token eof(TokenType::EndOfFile, "");
        return eof;
    }
    return tokens[current + 1];
}

bool Parser::match(TokenType type) {
    if (current_token().type == type) {
        current++;
        return true;
    }
    return false;
}

void Parser::consume(TokenType type) {
    if (current_token().type != type) {
        throw std::runtime_error("Expected token type, got different type");
    }
    current++;
}

std::shared_ptr<ASTNode> Parser::parse_primary() {
    Token& token = current_token();

    switch (token.type) {
        case TokenType::Number:
        case TokenType::String:
        case TokenType::Boolean:
        case TokenType::Null:
        case TokenType::Undefined: {
            auto node = std::make_shared<ASTNode>(ASTNodeType::Literal, token.value);
            current++;
            return node;
        }
        case TokenType::Identifier: {
            auto node = std::make_shared<ASTNode>(ASTNodeType::Identifier, token.value);
            current++;
            return node;
        }
        case TokenType::LeftParen: {
            current++;  // consume '('
            auto expr = parse_expression();
            consume(TokenType::RightParen);
            return expr;
        }
        default:
            throw std::runtime_error("Unexpected token in primary expression");
    }
}

std::shared_ptr<ASTNode> Parser::parse_binary_expression(int precedence) {
    auto left = parse_postfix_expression();

    while (true) {
        Token& op = current_token();
        int op_precedence = 0;
        bool is_assignment = false;

        switch (op.type) {
            case TokenType::Plus:
            case TokenType::Minus:
                op_precedence = 1;
                break;
            case TokenType::Multiply:
            case TokenType::Divide:
                op_precedence = 2;
                break;
            case TokenType::Equal:
            case TokenType::EqualStrict:
            case TokenType::NotEqual:
            case TokenType::NotEqualStrict:
            case TokenType::Less:
            case TokenType::LessEqual:
            case TokenType::Greater:
            case TokenType::GreaterEqual:
                op_precedence = 0;
                break;
            case TokenType::Assign:
                op_precedence = 0;  // Try same precedence as comparison
                is_assignment = true;
                break;
            default:
                // Not a binary operator, return what we have so far
                return left;
        }

        if (op_precedence < precedence) {
            return left;
        }

        current++;  // consume operator
        auto right = parse_binary_expression(op_precedence + 1);

        if (is_assignment) {
            auto assign_node = std::make_shared<ASTNode>(ASTNodeType::AssignmentExpression);
            assign_node->children.push_back(left);
            assign_node->children.push_back(right);
            left = assign_node;
        } else {
            auto binary_node = std::make_shared<ASTNode>(ASTNodeType::BinaryExpression, op.value);
            binary_node->children.push_back(left);
            binary_node->children.push_back(right);
            left = binary_node;
        }
    }
}

std::shared_ptr<ASTNode> Parser::parse_expression() { return parse_binary_expression(0); }

std::shared_ptr<ASTNode> Parser::parse_variable_declaration() {
    consume(TokenType::Var);  // consume 'var'

    if (current_token().type != TokenType::Identifier) {
        throw std::runtime_error("Expected identifier after 'var'");
    }

    std::string name = current_token().value;
    current++;

    auto decl_node = std::make_shared<ASTNode>(ASTNodeType::VariableDeclaration, name);

    if (match(TokenType::Assign)) {
        auto init_expr = parse_expression();
        decl_node->children.push_back(init_expr);
    }

    return decl_node;
}

std::shared_ptr<ASTNode> Parser::parse_statement() {
    if (current_token().type == TokenType::Var) {
        auto stmt = parse_variable_declaration();
        match(TokenType::Semicolon);  // optional semicolon
        return stmt;
    }

    if (current_token().type == TokenType::If) {
        return parse_if_statement();
    }

    // Expression statement
    auto expr = parse_expression();
    auto stmt = std::make_shared<ASTNode>(ASTNodeType::ExpressionStatement);
    stmt->children.push_back(expr);
    match(TokenType::Semicolon);  // optional semicolon
    return stmt;
}

std::shared_ptr<ASTNode> Parser::parse_if_statement() {
    consume(TokenType::If);

    consume(TokenType::LeftParen);

    // Parse the condition expression
    auto condition = parse_expression();

    // Expect and consume ')'
    consume(TokenType::RightParen);

    // Parse the 'then' statement (what happens if condition is true)
    auto then_statement = parse_statement();

    // Create the if statement node
    auto if_node = std::make_shared<ASTNode>(ASTNodeType::IfStatement);
    if_node->children.push_back(condition);       // Child 0: condition
    if_node->children.push_back(then_statement);  // Child 1: then branch

    // Check for optional 'else' clause
    if (current_token().type == TokenType::Else) {
        current++;  // consume 'else' token
        auto else_statement = parse_statement();
        if_node->children.push_back(else_statement);  // Child 2: else branch
    }

    return if_node;
}

std::shared_ptr<ASTNode> Parser::parse_postfix_expression() {
    auto expr = parse_primary();

    while (true) {
        if (current_token().type == TokenType::Dot) {
            expr = parse_member_expression(expr);
        } else if (current_token().type == TokenType::LeftParen) {
            expr = parse_call_expression(expr);
        } else {
            break;
        }
    }

    return expr;
}

std::shared_ptr<ASTNode> Parser::parse_call_expression(std::shared_ptr<ASTNode> callee) {
    consume(TokenType::LeftParen);  // consume '('

    auto call = std::make_shared<ASTNode>(ASTNodeType::CallExpression);
    call->children.push_back(callee);  // First child is the function being called

    // Parse arguments
    if (current_token().type != TokenType::RightParen) {
        do {
            auto arg = parse_expression();
            call->children.push_back(arg);
        } while (match(TokenType::Comma));
    }

    consume(TokenType::RightParen);  // consume ')'

    return call;
}

std::shared_ptr<ASTNode> Parser::parse_member_expression(std::shared_ptr<ASTNode> object) {
    consume(TokenType::Dot);  // consume '.'

    if (current_token().type != TokenType::Identifier) {
        throw std::runtime_error("Expected property name after '.'");
    }

    auto property = std::make_shared<ASTNode>(ASTNodeType::Identifier, current_token().value);
    current++;

    auto member = std::make_shared<ASTNode>(ASTNodeType::MemberExpression);
    member->children.push_back(object);
    member->children.push_back(property);

    return member;
}

std::shared_ptr<ASTNode> Parser::parse() {
    auto program = std::make_shared<ASTNode>(ASTNodeType::Program);

    while (current_token().type != TokenType::EndOfFile) {
        try {
            auto stmt = parse_statement();
            program->children.push_back(stmt);
        } catch (const std::exception& e) {
            // Skip to next statement on error
            while (current_token().type != TokenType::Semicolon &&
                   current_token().type != TokenType::EndOfFile) {
                current++;
            }
            if (current_token().type == TokenType::Semicolon) {
                current++;
            }
        }
    }

    return program;
}

}  // namespace jsruntime::frontend