/**
 * Parser Expression Methods
 *
 * This file contains all expression parsing methods for the Parser class.
 * Split from parser.cpp for better maintainability.
 */

#include <iostream>
#include <stdexcept>

#include "rift/frontend/parser/parser.h"

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
            // Check for legacy octal in strict mode
            if(in_strict_mode_ && token.has_legacy_octal) {
                if(token.type == TokenType::Number) {
                    throw std::runtime_error(
                        "SyntaxError: Octal literals are not allowed in strict mode at line " +
                        std::to_string(token.line) + ":" + std::to_string(token.column));
                } else if(token.type == TokenType::String) {
                    throw std::runtime_error(
                        "SyntaxError: Octal escape sequences are not allowed in strict mode at "
                        "line " +
                        std::to_string(token.line) + ":" + std::to_string(token.column));
                }
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
            // Could be: grouped expression (x), arrow params () =>, (x) =>, or (x, y) =>
            // Save position for potential backtrack
            size_t saved_pos = current;

            current++;  // consume '('

            // Check for empty params: () =>
            if(current_token().type == TokenType::RightParen) {
                size_t after_rparen = current + 1;
                if(after_rparen < tokens.size() && tokens[after_rparen].type == TokenType::Arrow) {
                    // Arrow function with no params
                    current = saved_pos;  // backtrack
                    return parse_arrow_function();
                }
                // Just empty parens - syntax error for grouped expression
                throw std::runtime_error("Unexpected token ')'");
            }

            // Check if this looks like arrow params: (id, id, ...) =>
            if(looks_like_arrow_params()) {
                current = saved_pos;  // backtrack
                return parse_arrow_function();
            }

            // Not arrow function - parse as grouped expression
            // current is already past '(' so just parse expression
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
            // Check for generator function expression: function*() {}
            if(peek_token().type == TokenType::Multiply) {
                return parse_generator_function_expression();
            }
            return parse_function_expression();
        }
        case TokenType::Yield: {
            // yield expression - must be inside a generator
            return parse_yield_expression();
        }
        case TokenType::Async: {
            // async function expression: async function() {}
            if(peek_token().type == TokenType::Function) {
                return parse_async_function_expression();
            }
            // async arrow with parenthesized params: async () => {} or async (x) => {}
            if(peek_token().type == TokenType::LeftParen) {
                size_t saved_pos = current;
                current++;  // skip 'async'
                current++;  // skip '('
                if(current_token().type == TokenType::RightParen) {
                    // async () => ...
                    size_t after_rparen = current + 1;
                    if(after_rparen < tokens.size() &&
                       tokens[after_rparen].type == TokenType::Arrow) {
                        current = saved_pos;
                        return parse_async_arrow_function();
                    }
                } else if(looks_like_arrow_params()) {
                    current = saved_pos;
                    return parse_async_arrow_function();
                }
                current = saved_pos;
            }
            // async arrow with single param: async x => ...
            if(peek_token().type == TokenType::Identifier) {
                size_t id_pos = current + 1;
                size_t arrow_pos = id_pos + 1;
                if(arrow_pos < tokens.size() && tokens[arrow_pos].type == TokenType::Arrow) {
                    return parse_async_arrow_function();
                }
            }
            // Otherwise treat 'async' as an identifier (for property access, etc.)
            auto node = ASTFactory::makeIdentifier(token.value);
            node->setLocation(token.line, token.column);
            current++;
            return node;
        }
        case TokenType::Await: {
            // await expression - must be inside an async function
            return parse_await_expression();
        }
        case TokenType::Class: {
            return parse_class_expression();
        }
        case TokenType::Super: {
            // super or super.method or super[expr]
            Token& startToken = current_token();
            current++;  // consume 'super'

            if(current_token().type == TokenType::Dot) {
                // super.property
                current++;  // consume '.'
                if(current_token().type != TokenType::Identifier) {
                    throw std::runtime_error("Expected property name after 'super.'");
                }
                auto property = ASTFactory::makeIdentifier(current_token().value);
                current++;
                auto node = ASTFactory::makeSuperMemberExpression(property, false);
                node->setLocation(startToken.line, startToken.column);
                return node;
            } else if(current_token().type == TokenType::LeftBracket) {
                // super[expr]
                current++;  // consume '['
                auto property = parse_expression();
                consume(TokenType::RightBracket);
                auto node = ASTFactory::makeSuperMemberExpression(property, true);
                node->setLocation(startToken.line, startToken.column);
                return node;
            } else {
                // Just 'super' (for super() call)
                auto node = ASTFactory::makeSuperExpression();
                node->setLocation(startToken.line, startToken.column);
                return node;
            }
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

    // Check for void operator
    if(token.type == TokenType::Void) {
        current++;  // consume 'void'
        auto operand = parse_postfix_expression();
        return ASTFactory::makeUnaryExpression("void", operand);
    }

    // Check for delete operator
    if(token.type == TokenType::Delete) {
        current++;  // consume 'delete'
        auto operand = parse_postfix_expression();

        // In strict mode, delete on an unqualified identifier is a SyntaxError
        if(in_strict_mode_ && operand->type == ASTNodeType::Identifier) {
            throw std::runtime_error(
                "SyntaxError: Delete of an unqualified identifier in strict mode");
        }

        return ASTFactory::makeUnaryExpression("delete", operand);
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
        bool is_right_associative = false;

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
            case TokenType::Exponent:
                op_precedence = 13;           // Exponentiation (higher than multiply)
                is_right_associative = true;  // ** is right-associative
                break;
            case TokenType::LeftShift:
            case TokenType::RightShift:
            case TokenType::UnsignedRightShift:
                op_precedence = 10;  // Shift operators (between additive and relational)
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
            case TokenType::In:
                op_precedence = 9;  // Relational operators
                break;
            case TokenType::BitwiseAnd:
                op_precedence = 7;  // Bitwise AND (between equality and bitwise XOR)
                break;
            case TokenType::BitwiseXor:
                op_precedence = 6;  // Bitwise XOR (between bitwise AND and bitwise OR)
                break;
            case TokenType::BitwiseOr:
                op_precedence = 5;  // Bitwise OR (between bitwise XOR and logical AND)
                break;
            case TokenType::LogicalAnd:
                op_precedence = 4;  // Logical AND
                break;
            case TokenType::LogicalOr:
                op_precedence = 3;  // Logical OR (lower than equality!)
                break;
            case TokenType::Assign:
            case TokenType::PlusAssign:
            case TokenType::MinusAssign:
            case TokenType::MultiplyAssign:
            case TokenType::DivideAssign:
            case TokenType::ModuloAssign:
            case TokenType::ExponentAssign:
            case TokenType::BitwiseAndAssign:
            case TokenType::BitwiseOrAssign:
            case TokenType::BitwiseXorAssign:
            case TokenType::LeftShiftAssign:
            case TokenType::RightShiftAssign:
            case TokenType::UnsignedRightShiftAssign:
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
        // Right-associative operators use op_precedence, left-associative use op_precedence + 1
        int next_precedence = is_right_associative ? op_precedence : op_precedence + 1;
        auto right = parse_binary_expression(next_precedence);

        if(is_assignment) {
            // In strict mode, validate the assignment target is not a reserved word
            if(in_strict_mode_ && left->type == ASTNodeType::Identifier) {
                validateIdentifier(left->value, op.line, op.column);
            }
            left = ASTFactory::makeAssignmentExpression(left, right, op.value);
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

    // Check for single-param arrow function: x => ...
    if(expr->type == ASTNodeType::Identifier && current_token().type == TokenType::Arrow) {
        return parse_arrow_function_from_identifier(expr);
    }

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
            // Allow trailing comma before ')'
            if(current_token().type == TokenType::RightParen) {
                break;
            }
            // Check for spread argument (...expr)
            if(current_token().type == TokenType::Spread) {
                current++;                                     // consume '...'
                auto spread_arg = parse_binary_expression(1);  // Parse at assignment precedence
                auto spread_element = ASTFactory::makeSpreadElement(spread_arg);
                ASTFactory::addArgument(call, spread_element);
            } else {
                auto arg = parse_expression();
                ASTFactory::addArgument(call, arg);
            }
        } while(match(TokenType::Comma));
    }

    consume(TokenType::RightParen);  // consume ')'

    return call;
}

std::shared_ptr<ASTNode> Parser::parse_member_expression(std::shared_ptr<ASTNode> object) {
    consume(TokenType::Dot);  // consume '.'

    // Allow keywords as property names (e.g., obj.delete, obj.class, obj.return)
    // In JavaScript, any IdentifierName (including reserved words) can follow a dot
    Token& tok = current_token();
    bool is_identifier_name =
        (tok.type == TokenType::Identifier || tok.type == TokenType::Delete ||
         tok.type == TokenType::Void || tok.type == TokenType::With ||
         tok.type == TokenType::Typeof || tok.type == TokenType::In || tok.type == TokenType::New ||
         tok.type == TokenType::This || tok.type == TokenType::Return ||
         tok.type == TokenType::Throw || tok.type == TokenType::Try ||
         tok.type == TokenType::Catch || tok.type == TokenType::Finally ||
         tok.type == TokenType::If || tok.type == TokenType::Else || tok.type == TokenType::For ||
         tok.type == TokenType::While || tok.type == TokenType::Do ||
         tok.type == TokenType::Switch || tok.type == TokenType::Case ||
         tok.type == TokenType::Default || tok.type == TokenType::Break ||
         tok.type == TokenType::Continue || tok.type == TokenType::Function ||
         tok.type == TokenType::Class || tok.type == TokenType::Extends ||
         tok.type == TokenType::Super || tok.type == TokenType::Static ||
         tok.type == TokenType::Var || tok.type == TokenType::Let || tok.type == TokenType::Const ||
         tok.type == TokenType::Yield || tok.type == TokenType::Async ||
         tok.type == TokenType::Await);
    if(!is_identifier_name) {
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
    consume(TokenType::LeftBracket);      // consume '['

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

        // Check for spread element (...expr)
        if(current_token().type == TokenType::Spread) {
            current++;                                     // consume '...'
            auto spread_arg = parse_binary_expression(1);  // Parse at assignment precedence
            auto spread_element = ASTFactory::makeSpreadElement(spread_arg);
            ASTFactory::addArrayElement(array, spread_element);
        } else {
            auto element = parse_expression();
            ASTFactory::addArrayElement(array, element);
        }
    } while(match(TokenType::Comma));

    consume(TokenType::RightBracket);  // consume ']'
    return array;
}

std::shared_ptr<ASTNode> Parser::parse_object_literal() {
    Token& startToken = current_token();  // Save location before consuming
    consume(TokenType::LeftBrace);        // consume '{'

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
        bool is_async_method = false;

        // Check for async method shorthand: { async methodName() {} }
        if(current_token().type == TokenType::Async && peek_token().type == TokenType::Identifier) {
            // Lookahead: async IDENTIFIER ( means async method shorthand
            size_t saved = current;
            current++;  // skip 'async'
            std::string method_name = current_token().value;
            current++;  // skip method name
            if(current_token().type == TokenType::LeftParen) {
                // Confirmed async method shorthand
                is_async_method = true;
                key = ASTFactory::makeIdentifier(method_name);
            } else {
                // Not a method shorthand; backtrack, treat 'async' as property name
                current = saved;
                key = ASTFactory::makeIdentifier(current_token().value);
                current++;  // consume 'async' as identifier
            }
        } else if(current_token().type == TokenType::Identifier) {
            // Property key as identifier: { name: value }
            key = ASTFactory::makeIdentifier(current_token().value);
            current++;  // consume identifier
        } else if(current_token().type == TokenType::String) {
            // Property key as string: { "name": value }
            std::string keyLiteralType =
                (current_token().type == TokenType::String) ? "string" : "number";
            key = ASTFactory::makeLiteral(current_token().value, keyLiteralType);
            current++;  // consume string
        } else if(current_token().type == TokenType::Number) {
            // Property key as number: { 0: value, 1: value }
            key = ASTFactory::makeLiteral(current_token().value, "number");
            current++;  // consume number
        } else {
            throw std::runtime_error("Expected property name in object literal");
        }

        // Check for method shorthand: { methodName() {} } or { async methodName() {} }
        if(is_async_method || current_token().type == TokenType::LeftParen) {
            // Method shorthand syntax
            consume(TokenType::LeftParen);
            auto parameters = parse_parameter_list();
            consume(TokenType::RightParen);

            bool was_in_async = in_async_context_;
            if(is_async_method) {
                in_async_context_ = true;
            }
            auto method_body = parse_block_statement();
            in_async_context_ = was_in_async;

            std::shared_ptr<ASTNode> value;
            if(is_async_method) {
                value =
                    ASTFactory::makeAsyncFunctionExpression(parameters, method_body, key->value);
            } else {
                value = ASTFactory::makeFunctionExpression(parameters, method_body);
            }
            ASTFactory::addObjectProperty(object, key, value);
        } else {
            // Standard key: value syntax
            consume(TokenType::Colon);
            auto value = parse_expression();
            ASTFactory::addObjectProperty(object, key, value);
        }

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
    consume(TokenType::Function);         // consume 'function'

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

// Helper to check if current position looks like arrow function parameters
// Called when current position is AFTER the opening '('
bool Parser::looks_like_arrow_params() {
    // Save position
    size_t saved = current;

    // Track parenthesis depth for skipping default value expressions
    int paren_depth = 0;

    // Check for (id, id, id = expr, ...rest) pattern followed by ) =>
    while(current < tokens.size() && current_token().type != TokenType::EndOfFile) {
        // Handle rest parameter: ...id
        if(current_token().type == TokenType::Spread) {
            current++;  // skip '...'
            if(current_token().type != TokenType::Identifier) {
                current = saved;
                return false;
            }
            current++;  // skip identifier
            // Rest param must be last, so check for ) =>
            if(current_token().type == TokenType::RightParen) {
                current++;
                bool is_arrow = (current_token().type == TokenType::Arrow);
                current = saved;
                return is_arrow;
            }
            current = saved;
            return false;
        }

        if(current_token().type == TokenType::Identifier) {
            current++;

            // Check for default value: id = expr
            if(current_token().type == TokenType::Assign) {
                current++;  // skip '='
                // Skip the default value expression (handle nested parens)
                paren_depth = 0;
                while(current < tokens.size()) {
                    TokenType tok = current_token().type;
                    if(tok == TokenType::LeftParen) {
                        paren_depth++;
                        current++;
                    } else if(tok == TokenType::RightParen) {
                        if(paren_depth == 0) {
                            break;  // found the closing paren of params
                        }
                        paren_depth--;
                        current++;
                    } else if(tok == TokenType::Comma && paren_depth == 0) {
                        break;  // found next param separator
                    } else if(tok == TokenType::EndOfFile) {
                        break;
                    } else {
                        current++;
                    }
                }
            }

            if(current_token().type == TokenType::Comma) {
                current++;
                continue;
            }
            if(current_token().type == TokenType::RightParen) {
                current++;
                bool is_arrow = (current_token().type == TokenType::Arrow);
                current = saved;  // restore
                return is_arrow;
            }
        }
        break;
    }
    current = saved;
    return false;
}

// Parse arrow function: () => expr, (x) => expr, (x, y) => expr
std::shared_ptr<ASTNode> Parser::parse_arrow_function() {
    Token& startToken = current_token();

    // Parse parameters
    std::shared_ptr<ASTNode> parameters;

    if(current_token().type == TokenType::Identifier) {
        // Single param without parens: x => ...
        std::string paramValue = current_token().value;
        size_t paramLine = current_token().line;
        size_t paramColumn = current_token().column;
        parameters = ASTFactory::makeParameterList();
        ASTFactory::addParameter(parameters, ASTFactory::makeIdentifier(paramValue));
        current++;  // consume identifier
        // Validate parameter in strict mode
        validateIdentifier(paramValue, paramLine, paramColumn);
    } else {
        // Parenthesized params: () => ... or (x) => ... or (x, y) => ...
        consume(TokenType::LeftParen);
        parameters = parse_parameter_list();
        consume(TokenType::RightParen);
    }

    // Consume =>
    consume(TokenType::Arrow);

    // Parse body - either block or expression
    std::shared_ptr<ASTNode> body;
    bool isExpressionBody = false;

    if(current_token().type == TokenType::LeftBrace) {
        // Block body: x => { statements }
        body = parse_block_statement();
    } else {
        // Expression body: x => expression
        // For expression bodies, we parse using parse_binary_expression to handle
        // operator precedence correctly (arrow has very low precedence)
        body = parse_binary_expression(0);
        isExpressionBody = true;
    }

    auto node = ASTFactory::makeArrowFunctionExpression(parameters, body, isExpressionBody);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

// Parse arrow function when we already have the single identifier param
std::shared_ptr<ASTNode> Parser::parse_arrow_function_from_identifier(
    std::shared_ptr<ASTNode> param) {
    // param is the identifier node, we're positioned at '=>'
    size_t line = param->line;
    size_t column = param->column;

    // Validate parameter in strict mode
    validateIdentifier(param->value, line, column);

    // Create parameter list from the identifier
    auto parameters = ASTFactory::makeParameterList();
    ASTFactory::addParameter(parameters, param);

    // Consume =>
    consume(TokenType::Arrow);

    // Parse body - either block or expression
    std::shared_ptr<ASTNode> body;
    bool isExpressionBody = false;

    if(current_token().type == TokenType::LeftBrace) {
        // Block body: x => { statements }
        body = parse_block_statement();
    } else {
        // Expression body: x => expression
        body = parse_binary_expression(0);
        isExpressionBody = true;
    }

    auto node = ASTFactory::makeArrowFunctionExpression(parameters, body, isExpressionBody);
    node->setLocation(line, column);
    return node;
}

// Parse yield expression: yield, yield expr, yield* expr
std::shared_ptr<ASTNode> Parser::parse_yield_expression() {
    Token& startToken = current_token();

    // Validate we're inside a generator
    if(!in_generator_context_) {
        throw std::runtime_error("'yield' expression is only allowed inside generator functions");
    }

    consume(TokenType::Yield);  // consume 'yield'

    // Check for yield* (delegate)
    bool is_delegate = false;
    if(current_token().type == TokenType::Multiply) {
        is_delegate = true;
        current++;  // consume '*'
    }

    // Parse optional argument
    // yield without argument is valid (yields undefined)
    // yield* requires an argument (the iterable to delegate to)
    std::shared_ptr<ASTNode> argument = nullptr;

    // Check if there's an expression following yield
    // We need to be careful about ASI (automatic semicolon insertion)
    // If the next token could start an expression and is on the same line, parse it
    TokenType next = current_token().type;
    bool has_argument =
        (next != TokenType::Semicolon && next != TokenType::RightParen &&
         next != TokenType::RightBrace && next != TokenType::RightBracket &&
         next != TokenType::Comma && next != TokenType::Colon && next != TokenType::EndOfFile);

    if(is_delegate) {
        // yield* requires an argument
        if(!has_argument) {
            throw std::runtime_error("'yield*' requires an iterable expression");
        }
        argument = parse_binary_expression(2);  // Parse with assignment precedence
    } else if(has_argument) {
        // yield with optional argument
        argument = parse_binary_expression(2);  // Parse with assignment precedence
    }

    auto node = ASTFactory::makeYieldExpression(argument, is_delegate);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

// Parse async function expression: async function() {} or async function name() {}
std::shared_ptr<ASTNode> Parser::parse_async_function_expression() {
    Token& startToken = current_token();  // Save 'async' location
    consume(TokenType::Async);            // consume 'async'
    consume(TokenType::Function);         // consume 'function'

    // Optional function name for named async function expressions
    std::string name;
    if(current_token().type == TokenType::Identifier) {
        name = current_token().value;
        size_t nameLine = current_token().line;
        size_t nameColumn = current_token().column;
        current++;  // consume function name
        // Validate function name in strict mode
        validateIdentifier(name, nameLine, nameColumn);
    }

    // Parse parameters
    consume(TokenType::LeftParen);
    auto parameters = parse_parameter_list();
    consume(TokenType::RightParen);

    // Parse function body with async context enabled
    bool was_in_async = in_async_context_;
    in_async_context_ = true;
    auto body = parse_block_statement();
    in_async_context_ = was_in_async;

    auto node = ASTFactory::makeAsyncFunctionExpression(parameters, body, name);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

// Parse await expression: await expr
std::shared_ptr<ASTNode> Parser::parse_await_expression() {
    Token& startToken = current_token();

    // Validate we're inside an async function
    if(!in_async_context_) {
        throw std::runtime_error(
            "SyntaxError: 'await' expression is only allowed inside async functions");
    }

    consume(TokenType::Await);  // consume 'await'

    // Parse the operand expression
    // await has high precedence, similar to yield
    auto argument = parse_binary_expression(2);  // Parse with assignment precedence

    auto node = ASTFactory::makeAwaitExpression(argument);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

// Parse async arrow function: async () => {}, async (x) => {}, async x => expr
std::shared_ptr<ASTNode> Parser::parse_async_arrow_function() {
    Token& startToken = current_token();  // Save 'async' location
    consume(TokenType::Async);            // consume 'async'

    // Parse parameters
    std::shared_ptr<ASTNode> parameters;

    if(current_token().type == TokenType::Identifier) {
        // Single param without parens: async x => ...
        std::string paramValue = current_token().value;
        size_t paramLine = current_token().line;
        size_t paramColumn = current_token().column;
        parameters = ASTFactory::makeParameterList();
        ASTFactory::addParameter(parameters, ASTFactory::makeIdentifier(paramValue));
        current++;  // consume identifier
        validateIdentifier(paramValue, paramLine, paramColumn);
    } else {
        // Parenthesized params: async () => ... or async (x, y) => ...
        consume(TokenType::LeftParen);
        parameters = parse_parameter_list();
        consume(TokenType::RightParen);
    }

    // Consume =>
    consume(TokenType::Arrow);

    // Parse body with async context enabled
    bool was_in_async = in_async_context_;
    in_async_context_ = true;

    std::shared_ptr<ASTNode> body;

    if(current_token().type == TokenType::LeftBrace) {
        // Block body: async () => { statements }
        body = parse_block_statement();
    } else {
        // Expression body: async x => expr
        // Wrap in ReturnStatement + BlockStatement so AsyncExecutor can handle it
        auto expr = parse_binary_expression(0);
        auto return_stmt = ASTFactory::makeReturnStatement(expr);
        body = ASTFactory::makeBlockStatement();
        body->children.push_back(return_stmt);
    }

    in_async_context_ = was_in_async;

    auto node = ASTFactory::makeArrowFunctionExpression(parameters, body, false);
    node->metadata = "async";
    node->setLocation(startToken.line, startToken.column);
    return node;
}

}  // namespace rift::frontend
