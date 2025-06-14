#include "rift/frontend/parser/parser.h"

#include <stdexcept>

namespace rift::frontend {

using namespace rift::ast;
using ASTFactory = ast::ASTFactory;

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
            auto node = ASTFactory::makeLiteral(token.value);
            current++;
            return node;
        }
        case TokenType::Identifier: {
            auto node = ASTFactory::makeIdentifier(token.value);
            current++;
            return node;
        }
        case TokenType::LeftParen: {
            current++;  // consume '('
            auto expr = parse_expression();
            consume(TokenType::RightParen);
            return expr;
        }
        case TokenType::LeftBracket: {
            return parse_array_literal();
        }
        default:
            throw std::runtime_error("Unexpected token in primary expression");
    }
}

std::shared_ptr<ASTNode> Parser::parse_unary_expression() {
    Token& token = current_token();

    // Check for unary operators
    if (token.type == TokenType::Plus || token.type == TokenType::Minus ||
        token.type == TokenType::LogicalNot || token.type == TokenType::Typeof ||
        token.type == TokenType::BitwiseNot) {
        std::string operator_ = token.value;
        current++;  // consume the operator
        auto operand = parse_postfix_expression();
        return ASTFactory::makeUnaryExpression(operator_, operand);
    }

    // Not a unary expression, continue with postfix parsing
    return parse_postfix_expression();
}

std::shared_ptr<ASTNode> Parser::parse_binary_expression(int precedence) {
    auto left = parse_unary_expression();

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
            left = ASTFactory::makeAssignmentExpression(left, right);
        } else {
            left = ASTFactory::makeBinaryExpression(op.value, left, right);
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

    std::shared_ptr<ASTNode> initializer = nullptr;
    if (match(TokenType::Assign)) {
        initializer = parse_expression();
    }

    return ASTFactory::makeVariableDeclaration(name, initializer);
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

    if (current_token().type == TokenType::Function) {
        return parse_function_declaration();
    }

    if (current_token().type == TokenType::Return) {
        return parse_return_statement();
    }

    // Expression statement
    auto expr = parse_expression();
    match(TokenType::Semicolon);  // optional semicolon
    return ASTFactory::makeExpressionStatement(expr);
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

    // Check for optional 'else' clause
    std::shared_ptr<ASTNode> else_statement = nullptr;
    if (current_token().type == TokenType::Else) {
        current++;  // consume 'else' token
        else_statement = parse_statement();
    }

    return ASTFactory::makeIfStatement(condition, then_statement, else_statement);
}

std::shared_ptr<ASTNode> Parser::parse_function_declaration() {
    consume(TokenType::Function);  // consume 'function'

    // Get function name
    if (current_token().type != TokenType::Identifier) {
        throw std::runtime_error("Expected function name");
    }
    std::string name = current_token().value;
    current++;  // consume function name

    // Parse parameters
    consume(TokenType::LeftParen);
    auto parameters = parse_parameter_list();
    consume(TokenType::RightParen);

    // Parse function body
    auto body = parse_block_statement();

    return ASTFactory::makeFunctionDeclaration(name, parameters, body);
}

std::shared_ptr<ASTNode> Parser::parse_function_expression() {
    consume(TokenType::Function);  // consume 'function'

    // Parse parameters (anonymous function)
    consume(TokenType::LeftParen);
    auto parameters = parse_parameter_list();
    consume(TokenType::RightParen);

    // Parse function body
    auto body = parse_block_statement();

    return ASTFactory::makeFunctionExpression(parameters, body);
}

std::shared_ptr<ASTNode> Parser::parse_parameter_list() {
    auto parameters = ASTFactory::makeParameterList();

    // Handle empty parameter list
    if (current_token().type == TokenType::RightParen) {
        return parameters;
    }

    // Parse first parameter
    if (current_token().type != TokenType::Identifier) {
        throw std::runtime_error("Expected parameter name");
    }
    ASTFactory::addParameter(parameters, ASTFactory::makeIdentifier(current_token().value));
    current++;  // consume parameter name

    // Parse remaining parameters
    while (match(TokenType::Comma)) {
        if (current_token().type != TokenType::Identifier) {
            throw std::runtime_error("Expected parameter name");
        }
        ASTFactory::addParameter(parameters, ASTFactory::makeIdentifier(current_token().value));
        current++;  // consume parameter name
    }

    return parameters;
}

std::shared_ptr<ASTNode> Parser::parse_return_statement() {
    consume(TokenType::Return);  // consume 'return'

    std::shared_ptr<ASTNode> argument = nullptr;
    if (current_token().type != TokenType::Semicolon) {
        argument = parse_expression();
    }

    match(TokenType::Semicolon);  // optional semicolon
    return ASTFactory::makeReturnStatement(argument);
}

std::shared_ptr<ASTNode> Parser::parse_block_statement() {
    consume(TokenType::LeftBrace);  // consume '{'
    auto block = ASTFactory::makeBlockStatement();

    while (current_token().type != TokenType::RightBrace && 
           current_token().type != TokenType::EndOfFile) {
        auto stmt = parse_statement();
        ASTFactory::addStatement(block, stmt);
    }

    consume(TokenType::RightBrace);  // consume '}'
    return block;
}

std::shared_ptr<ASTNode> Parser::parse_postfix_expression() {
    auto expr = parse_primary();

    while (true) {
        if (current_token().type == TokenType::Dot) {
            expr = parse_member_expression(expr);
        } else if (current_token().type == TokenType::LeftBracket) {
            expr = parse_computed_member_expression(expr);
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

    auto call = ASTFactory::makeCallExpression(callee);

    // Parse arguments
    if (current_token().type != TokenType::RightParen) {
        do {
            auto arg = parse_expression();
            ASTFactory::addArgument(call, arg);
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

    auto property = ASTFactory::makeIdentifier(current_token().value);
    current++;

    return ASTFactory::makeMemberExpression(object, property);
}

std::shared_ptr<ASTNode> Parser::parse_computed_member_expression(std::shared_ptr<ASTNode> object) {
    consume(TokenType::LeftBracket);  // consume '['

    auto index = parse_expression();

    consume(TokenType::RightBracket);  // consume ']'

    return ASTFactory::makeMemberExpression(object, index);
}

std::shared_ptr<ASTNode> Parser::parse() {
    auto program = ASTFactory::makeProgram();

    while (current_token().type != TokenType::EndOfFile) {
        try {
            auto stmt = parse_statement();
            ASTFactory::addStatement(program, stmt);
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

std::shared_ptr<ASTNode> Parser::parse_array_literal() {
    consume(TokenType::LeftBracket);  // consume '['

    auto array = ASTFactory::makeArrayLiteral();

    // Handle empty array []
    if (current_token().type == TokenType::RightBracket) {
        current++;  // consume ']'
        return array;
    }

    // Parse array elements
    do {
        auto element = parse_expression();
        ASTFactory::addArrayElement(array, element);
    } while (match(TokenType::Comma));

    consume(TokenType::RightBracket);  // consume ']'
    return array;
}

}  // namespace rift::frontend