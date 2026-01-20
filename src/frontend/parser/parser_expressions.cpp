/**
 * Parser Expression Methods
 *
 * This file contains all expression parsing methods for the Parser class.
 * Split from parser.cpp for better maintainability.
 */

#include "rift/frontend/parser/parser.h"

#include <iostream>
#include <stdexcept>

namespace rift::frontend {

using namespace rift::ast;
using ASTFactory = ast::ASTFactory;

std::shared_ptr<ASTNode> Parser::parse_primary() {
    Token& token = current_token();

    switch(token.type) {
        case TokenType::Number:
        case TokenType::String:
        case TokenType::Boolean:
        case TokenType::Null:
        case TokenType::Undefined: {
            std::string literalType;
            switch(token.type) {
                case TokenType::Number:
                    literalType = "number";
                    break;
                case TokenType::String:
                    literalType = "string";
                    break;
                case TokenType::Boolean:
                    literalType = "boolean";
                    break;
                case TokenType::Null:
                    literalType = "null";
                    break;
                case TokenType::Undefined:
                    literalType = "undefined";
                    break;
                default:
                    break;
            }
            auto node = ASTFactory::makeLiteral(token.value, literalType);
            node->setLocation(token.line, token.column);
            current++;
            return node;
        }
        case TokenType::Identifier: {
            auto node = ASTFactory::makeIdentifier(token.value);
            node->setLocation(token.line, token.column);
            current++;
            return node;
        }
        case TokenType::This: {
            auto node = ASTFactory::makeIdentifier("this");
            node->setLocation(token.line, token.column);
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
        case TokenType::LeftBrace: {
            return parse_object_literal();
        }
        case TokenType::TemplateString: {
            // Basic template string without expressions
            auto templateLiteral = ASTFactory::makeTemplateLiteral();
            auto element = ASTFactory::makeTemplateElement(token.value);
            ASTFactory::addTemplateElement(templateLiteral, element);
            current++;
            return templateLiteral;
        }
        case TokenType::TemplateStart:
        case TokenType::TemplateMiddle:
        case TokenType::TemplateEnd: {
            // Template literal with interpolation
            return parse_template_literal();
        }
        case TokenType::Function: {
            return parse_function_expression();
        }
        default:
            throw std::runtime_error("Unexpected token in primary expression");
    }
}

std::shared_ptr<ASTNode> Parser::parse_unary_expression() {
    Token& token = current_token();

    // Check for increment/decrement operators (prefix)
    if(token.type == TokenType::Increment || token.type == TokenType::Decrement) {
        std::string operator_ = token.value;
        current++;  // consume the operator
        auto operand = parse_postfix_expression();
        return ASTFactory::makeUpdateExpression(operator_, operand, true);  // prefix = true
    }

    // Check for unary operators
    if(token.type == TokenType::Plus || token.type == TokenType::Minus ||
       token.type == TokenType::LogicalNot || token.type == TokenType::Typeof ||
       token.type == TokenType::BitwiseNot) {
        std::string operator_ = token.value;
        current++;  // consume the operator
        auto operand = parse_postfix_expression();
        return ASTFactory::makeUnaryExpression(operator_, operand);
    }

    // Check for new operator
    if(token.type == TokenType::New) {
        current++;  // consume 'new'
        return parse_new_expression();
    }

    // Not a unary expression, continue with postfix parsing
    return parse_postfix_expression();
}

std::shared_ptr<ASTNode> Parser::parse_binary_expression(int precedence) {
    auto left = parse_unary_expression();

    while(true) {
        Token& op = current_token();
        int op_precedence = 0;
        bool is_assignment = false;

        switch(op.type) {
            case TokenType::Plus:
            case TokenType::Minus:
                op_precedence = 11;  // Additive operators
                break;
            case TokenType::Multiply:
            case TokenType::Divide:
            case TokenType::Modulo:
                op_precedence = 12;  // Multiplicative operators
                break;
            case TokenType::Equal:
            case TokenType::EqualStrict:
            case TokenType::NotEqual:
            case TokenType::NotEqualStrict:
                op_precedence = 8;  // Equality operators
                break;
            case TokenType::Less:
            case TokenType::LessEqual:
            case TokenType::Greater:
            case TokenType::GreaterEqual:
                op_precedence = 9;  // Relational operators
                break;
            case TokenType::LogicalAnd:
                op_precedence = 4;  // Logical AND
                break;
            case TokenType::LogicalOr:
                op_precedence = 3;  // Logical OR (lower than equality!)
                break;
            case TokenType::Assign:
                op_precedence = 0;  // Assignment lowest precedence
                is_assignment = true;
                break;
            default:
                // Not a binary operator, return what we have so far
                return left;
        }

        if(op_precedence < precedence) {
            return left;
        }

        current++;  // consume operator
        auto right = parse_binary_expression(op_precedence + 1);

        if(is_assignment) {
            left = ASTFactory::makeAssignmentExpression(left, right);
        } else {
            left = ASTFactory::makeBinaryExpression(op.value, left, right);
        }
    }
}

std::shared_ptr<ASTNode> Parser::parse_expression() {
    return parse_binary_expression(0);
}

std::shared_ptr<ASTNode> Parser::parse_postfix_expression() {
    auto expr = parse_primary();

    while(true) {
        if(current_token().type == TokenType::Dot) {
            expr = parse_member_expression(expr);
        } else if(current_token().type == TokenType::LeftBracket) {
            expr = parse_computed_member_expression(expr);
        } else if(current_token().type == TokenType::LeftParen) {
            expr = parse_call_expression(expr);
        } else if(current_token().type == TokenType::Increment ||
                  current_token().type == TokenType::Decrement) {
            // Handle postfix increment/decrement
            std::string operator_ = current_token().value;
            current++;  // consume the operator
            expr = ASTFactory::makeUpdateExpression(operator_, expr, false);  // prefix = false
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
    if(current_token().type != TokenType::RightParen) {
        do {
            auto arg = parse_expression();
            ASTFactory::addArgument(call, arg);
        } while(match(TokenType::Comma));
    }

    consume(TokenType::RightParen);  // consume ')'

    return call;
}

std::shared_ptr<ASTNode> Parser::parse_member_expression(std::shared_ptr<ASTNode> object) {
    consume(TokenType::Dot);  // consume '.'

    if(current_token().type != TokenType::Identifier) {
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

    return ASTFactory::makeMemberExpression(object, index, true);  // Mark as computed
}

std::shared_ptr<ASTNode> Parser::parse_array_literal() {
    Token& startToken = current_token();  // Save location before consuming
    consume(TokenType::LeftBracket);  // consume '['

    auto array = ASTFactory::makeArrayLiteral();
    array->setLocation(startToken.line, startToken.column);

    // Handle empty array []
    if(current_token().type == TokenType::RightBracket) {
        current++;  // consume ']'
        return array;
    }

    // Parse array elements
    do {
        // Check for trailing comma (closing bracket after comma)
        if(current_token().type == TokenType::RightBracket) {
            break;  // Trailing comma is allowed, stop parsing elements
        }

        auto element = parse_expression();
        ASTFactory::addArrayElement(array, element);
    } while(match(TokenType::Comma));

    consume(TokenType::RightBracket);  // consume ']'
    return array;
}

std::shared_ptr<ASTNode> Parser::parse_object_literal() {
    Token& startToken = current_token();  // Save location before consuming
    consume(TokenType::LeftBrace);  // consume '{'

    auto object = ASTFactory::makeObjectLiteral();
    object->setLocation(startToken.line, startToken.column);

    // Handle empty object {}
    if(current_token().type == TokenType::RightBrace) {
        current++;  // consume '}'
        return object;
    }

    // Parse object properties
    do {
        // Check for trailing comma (closing brace after comma)
        if(current_token().type == TokenType::RightBrace) {
            break;  // Trailing comma is allowed, stop parsing properties
        }

        // Parse property key (can be identifier or string literal)
        std::shared_ptr<ASTNode> key;

        if(current_token().type == TokenType::Identifier) {
            // Property key as identifier: { name: value }
            key = ASTFactory::makeIdentifier(current_token().value);
            current++;  // consume identifier
        } else if(current_token().type == TokenType::String) {
            // Property key as string: { "name": value }
            std::string keyLiteralType =
                (current_token().type == TokenType::String) ? "string" : "number";
            key = ASTFactory::makeLiteral(current_token().value, keyLiteralType);
            current++;  // consume string
        } else {
            throw std::runtime_error("Expected property name in object literal");
        }

        // Expect colon
        consume(TokenType::Colon);

        // Parse property value
        auto value = parse_expression();

        // Add property to object
        ASTFactory::addObjectProperty(object, key, value);

    } while(match(TokenType::Comma));

    consume(TokenType::RightBrace);  // consume '}'
    return object;
}

std::shared_ptr<ASTNode> Parser::parse_new_expression() {
    // Parse the constructor (should be an identifier or member expression, not a call)
    auto constructor = parse_primary();
    auto newExpr = ASTFactory::makeNewExpression(constructor);

    // Check if there are arguments (parentheses)
    if(current_token().type == TokenType::LeftParen) {
        consume(TokenType::LeftParen);  // consume '('

        // Parse arguments
        if(current_token().type != TokenType::RightParen) {
            do {
                auto arg = parse_expression();
                ASTFactory::addNewArgument(newExpr, arg);
            } while(match(TokenType::Comma));
        }

        consume(TokenType::RightParen);  // consume ')'
    }

    return newExpr;
}

std::shared_ptr<ASTNode> Parser::parse_template_literal() {
    auto templateLiteral = ASTFactory::makeTemplateLiteral();

    // Handle TemplateStart
    if(current_token().type == TokenType::TemplateStart) {
        auto startElement = ASTFactory::makeTemplateElement(current_token().value);
        ASTFactory::addTemplateElement(templateLiteral, startElement);
        current++;

        // Parse expressions and template parts until TemplateEnd
        while(current_token().type != TokenType::TemplateEnd &&
              current_token().type != TokenType::EndOfFile) {
            // Parse the expression inside ${}
            auto expression = parse_expression();
            auto templateExpr = ASTFactory::makeTemplateExpression(expression);
            ASTFactory::addTemplateElement(templateLiteral, templateExpr);

            // Next should be TemplateMiddle or TemplateEnd
            if(current_token().type == TokenType::TemplateMiddle) {
                auto middleElement = ASTFactory::makeTemplateElement(current_token().value);
                ASTFactory::addTemplateElement(templateLiteral, middleElement);
                current++;
            } else if(current_token().type == TokenType::TemplateEnd) {
                auto endElement = ASTFactory::makeTemplateElement(current_token().value);
                ASTFactory::addTemplateElement(templateLiteral, endElement);
                current++;
                break;
            } else {
                throw std::runtime_error("Expected template middle or end");
            }
        }
    }
    // Handle TemplateMiddle/TemplateEnd directly (shouldn't happen in normal parsing)
    else if(current_token().type == TokenType::TemplateMiddle ||
            current_token().type == TokenType::TemplateEnd) {
        auto trailingElement = ASTFactory::makeTemplateElement(current_token().value);
        ASTFactory::addTemplateElement(templateLiteral, trailingElement);
        current++;
    }

    return templateLiteral;
}

std::shared_ptr<ASTNode> Parser::parse_function_expression() {
    Token& startToken = current_token();  // Save 'function' location
    consume(TokenType::Function);  // consume 'function'

    // Parse parameters (anonymous function)
    consume(TokenType::LeftParen);
    auto parameters = parse_parameter_list();
    consume(TokenType::RightParen);

    // Parse function body
    auto body = parse_block_statement();

    auto node = ASTFactory::makeFunctionExpression(parameters, body);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

}  // namespace rift::frontend
