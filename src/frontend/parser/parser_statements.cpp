/**
 * Parser Statement Methods
 *
 * This file contains all statement parsing methods for the Parser class.
 * Split from parser.cpp for better maintainability.
 */

#include <iostream>
#include <stdexcept>
#include <unordered_set>

#include "rift/frontend/parser/parser.h"

namespace rift::frontend {

using namespace rift::ast;
using ASTFactory = ast::ASTFactory;

std::shared_ptr<ASTNode> Parser::parse_variable_declaration() {
    // Support var/let/const with proper distinction
    TokenType declType = current_token().type;

    if(declType == TokenType::Var) {
        consume(TokenType::Var);
    } else if(declType == TokenType::Let) {
        consume(TokenType::Let);
    } else if(declType == TokenType::Const) {
        consume(TokenType::Const);
    } else {
        throw std::runtime_error("Expected variable declaration keyword");
    }

    // Check for destructuring pattern: [ or {
    bool is_destructuring = (current_token().type == TokenType::LeftBracket ||
                             current_token().type == TokenType::LeftBrace);

    if(is_destructuring) {
        // Parse destructuring pattern
        auto pattern = parse_binding_pattern();

        // Destructuring requires an initializer
        if(!match(TokenType::Assign)) {
            throw std::runtime_error("Destructuring declaration requires initializer");
        }
        auto initializer = parse_expression();

        // Create declaration node with pattern in children[0] and initializer in children[1]
        // Use metadata to mark this as a destructuring declaration
        std::shared_ptr<ASTNode> node;
        switch(declType) {
            case TokenType::Var:
                node = std::make_shared<ASTNode>(ASTNodeType::VariableDeclaration);
                break;
            case TokenType::Let:
                node = std::make_shared<ASTNode>(ASTNodeType::LetDeclaration);
                break;
            case TokenType::Const:
                node = std::make_shared<ASTNode>(ASTNodeType::ConstDeclaration);
                break;
            default:
                throw std::runtime_error("Invalid declaration type");
        }
        node->metadata = "destructuring";
        node->children.push_back(pattern);
        node->children.push_back(initializer);
        return node;
    }

    // Simple identifier declaration (existing behavior)
    if(current_token().type != TokenType::Identifier) {
        throw std::runtime_error("Expected identifier after variable declaration keyword");
    }

    std::string name = current_token().value;
    size_t line = current_token().line;
    size_t column = current_token().column;
    current++;

    // Validate identifier in strict mode
    validateIdentifier(name, line, column);

    std::shared_ptr<ASTNode> initializer = nullptr;
    if(match(TokenType::Assign)) {
        initializer = parse_expression();
    } else if(declType == TokenType::Const) {
        throw std::runtime_error("Missing initializer in const declaration");
    }

    // Create appropriate AST node based on declaration type
    switch(declType) {
        case TokenType::Var:
            return ASTFactory::makeVariableDeclaration(name, initializer);
        case TokenType::Let:
            return ASTFactory::makeLetDeclaration(name, initializer);
        case TokenType::Const:
            return ASTFactory::makeConstDeclaration(name, initializer);
        default:
            throw std::runtime_error("Invalid declaration type");
    }
}

std::shared_ptr<ASTNode> Parser::parse_binding_pattern() {
    if(current_token().type == TokenType::LeftBracket) {
        return parse_array_pattern();
    } else if(current_token().type == TokenType::LeftBrace) {
        return parse_object_pattern();
    } else {
        throw std::runtime_error("Expected '[' or '{' for destructuring pattern");
    }
}

std::shared_ptr<ASTNode> Parser::parse_array_pattern() {
    consume(TokenType::LeftBracket);  // consume '['
    auto pattern = ASTFactory::makeArrayPattern();

    // Handle empty pattern []
    if(current_token().type == TokenType::RightBracket) {
        current++;
        return pattern;
    }

    while(true) {
        // Check for hole (elision): [x, , z]
        if(current_token().type == TokenType::Comma) {
            ASTFactory::addArrayPatternElement(pattern, nullptr);
            current++;  // consume ','
            continue;
        }

        // Check for closing bracket (handles trailing comma)
        if(current_token().type == TokenType::RightBracket) {
            break;
        }

        // Check for rest element: [...rest]
        if(current_token().type == TokenType::Spread) {
            current++;  // consume '...'
            if(current_token().type != TokenType::Identifier) {
                throw std::runtime_error("Expected identifier after '...' in array pattern");
            }
            auto rest_id = ASTFactory::makeIdentifier(current_token().value);
            current++;  // consume identifier
            auto rest_elem = ASTFactory::makeRestElement(rest_id);
            ASTFactory::addArrayPatternElement(pattern, rest_elem);

            // Rest element must be last
            if(current_token().type != TokenType::RightBracket) {
                throw std::runtime_error("Rest element must be last in array pattern");
            }
            break;
        }

        // Check for nested pattern
        std::shared_ptr<ASTNode> element;
        if(current_token().type == TokenType::LeftBracket ||
           current_token().type == TokenType::LeftBrace) {
            element = parse_binding_pattern();
        } else if(current_token().type == TokenType::Identifier) {
            element = ASTFactory::makeIdentifier(current_token().value);
            current++;  // consume identifier
        } else {
            throw std::runtime_error("Expected identifier or pattern in array destructuring");
        }

        // Check for default value: [x = 10]
        if(current_token().type == TokenType::Assign) {
            current++;                                      // consume '='
            auto default_val = parse_binary_expression(1);  // Stop before comma
            element = ASTFactory::makeAssignmentPattern(element, default_val);
        }

        ASTFactory::addArrayPatternElement(pattern, element);

        // Check for comma or end
        if(current_token().type == TokenType::Comma) {
            current++;  // consume ','
        } else if(current_token().type != TokenType::RightBracket) {
            throw std::runtime_error("Expected ',' or ']' in array pattern");
        }
    }

    consume(TokenType::RightBracket);  // consume ']'
    return pattern;
}

std::shared_ptr<ASTNode> Parser::parse_object_pattern() {
    consume(TokenType::LeftBrace);  // consume '{'
    auto pattern = ASTFactory::makeObjectPattern();

    // Handle empty pattern {}
    if(current_token().type == TokenType::RightBrace) {
        current++;
        return pattern;
    }

    while(true) {
        // Check for closing brace (handles trailing comma)
        if(current_token().type == TokenType::RightBrace) {
            break;
        }

        // Check for rest element: {...rest}
        if(current_token().type == TokenType::Spread) {
            current++;  // consume '...'
            if(current_token().type != TokenType::Identifier) {
                throw std::runtime_error("Expected identifier after '...' in object pattern");
            }
            auto rest_id = ASTFactory::makeIdentifier(current_token().value);
            current++;  // consume identifier
            auto rest_elem = ASTFactory::makeRestElement(rest_id);
            ASTFactory::addObjectPatternProperty(pattern, rest_elem, nullptr);

            // Rest element must be last
            if(current_token().type != TokenType::RightBrace) {
                throw std::runtime_error("Rest element must be last in object pattern");
            }
            break;
        }

        // Expect property name (identifier or string)
        if(current_token().type != TokenType::Identifier &&
           current_token().type != TokenType::String) {
            throw std::runtime_error("Expected property name in object pattern");
        }

        std::string key_name = current_token().value;
        // Remove quotes from string keys
        if(current_token().type == TokenType::String && key_name.size() >= 2) {
            key_name = key_name.substr(1, key_name.size() - 2);
        }
        auto key = ASTFactory::makeIdentifier(key_name);
        current++;  // consume key

        std::shared_ptr<ASTNode> value_pattern;

        if(current_token().type == TokenType::Colon) {
            // {key: pattern} or {key: renamed} or {key: [nested]}
            current++;  // consume ':'

            if(current_token().type == TokenType::LeftBracket ||
               current_token().type == TokenType::LeftBrace) {
                // Nested destructuring
                value_pattern = parse_binding_pattern();
            } else if(current_token().type == TokenType::Identifier) {
                value_pattern = ASTFactory::makeIdentifier(current_token().value);
                current++;  // consume identifier
            } else {
                throw std::runtime_error(
                    "Expected identifier or pattern after ':' in object pattern");
            }

            // Check for default value after renaming: {key: renamed = 10}
            if(current_token().type == TokenType::Assign) {
                current++;  // consume '='
                auto default_val = parse_binary_expression(1);
                value_pattern = ASTFactory::makeAssignmentPattern(value_pattern, default_val);
            }
        } else if(current_token().type == TokenType::Assign) {
            // Shorthand with default: {key = 10}
            current++;  // consume '='
            auto default_val = parse_binary_expression(1);
            value_pattern = ASTFactory::makeAssignmentPattern(ASTFactory::makeIdentifier(key_name),
                                                              default_val);
        } else {
            // Shorthand: {key} - key and variable name are the same
            value_pattern = ASTFactory::makeIdentifier(key_name);
        }

        ASTFactory::addObjectPatternProperty(pattern, key, value_pattern);

        // Check for comma or end
        if(current_token().type == TokenType::Comma) {
            current++;  // consume ','
        } else if(current_token().type != TokenType::RightBrace) {
            throw std::runtime_error("Expected ',' or '}' in object pattern");
        }
    }

    consume(TokenType::RightBrace);  // consume '}'
    return pattern;
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
    if(current_token().type == TokenType::Else) {
        current++;  // consume 'else' token
        else_statement = parse_statement();
    }

    return ASTFactory::makeIfStatement(condition, then_statement, else_statement);
}

std::shared_ptr<ASTNode> Parser::parse_while_statement() {
    consume(TokenType::While);

    consume(TokenType::LeftParen);

    // Parse the condition expression
    auto condition = parse_expression();

    // Expect and consume ')'
    consume(TokenType::RightParen);

    // Parse the body statement
    auto body = parse_statement();

    return ASTFactory::makeWhileStatement(condition, body);
}

std::shared_ptr<ASTNode> Parser::parse_do_while_statement() {
    consume(TokenType::Do);  // consume 'do'

    // Parse the body statement first
    auto body = parse_statement();

    // Expect 'while' keyword
    consume(TokenType::While);

    // Expect '('
    consume(TokenType::LeftParen);

    // Parse the condition expression
    auto condition = parse_expression();

    // Expect ')'
    consume(TokenType::RightParen);

    // Expect semicolon (do-while requires semicolon at end)
    consume(TokenType::Semicolon);

    return ASTFactory::makeDoWhileStatement(body, condition);
}

// Helper to check for contextual keyword "of" (which is lexed as an identifier)
static bool isContextualOf(const Token& tok) {
    return tok.type == TokenType::Identifier && tok.value == "of";
}

std::shared_ptr<ASTNode> Parser::parse_for_statement() {
    consume(TokenType::For);  // consume 'for'

    // Check for 'for await' syntax
    bool is_for_await = false;
    if(current_token().type == TokenType::Await) {
        if(!in_async_context_) {
            throw std::runtime_error(
                "SyntaxError: for-await-of is only valid in async functions and async generators");
        }
        is_for_await = true;
        current++;  // consume 'await'
    }

    consume(TokenType::LeftParen);  // consume '('

    // Check for for-in: for (var x in obj) or for (x in obj)
    std::shared_ptr<ASTNode> left = nullptr;
    bool is_for_in = false;

    if(current_token().type == TokenType::Var || current_token().type == TokenType::Let ||
       current_token().type == TokenType::Const) {
        // Save position to potentially backtrack
        TokenType decl_type = current_token().type;
        current++;  // consume var/let/const

        if(current_token().type == TokenType::Identifier) {
            std::string var_name = current_token().value;
            current++;  // consume identifier

            // Check if this is for-in or for-of (no initializer, followed by 'in' or 'of')
            // Note: "of" is a contextual keyword, lexed as identifier
            if(current_token().type == TokenType::In || isContextualOf(current_token())) {
                bool is_for_of = isContextualOf(current_token());
                is_for_in = !is_for_of;

                if(is_for_await && !is_for_of) {
                    throw std::runtime_error(
                        "SyntaxError: for-await is only valid with for-of loops");
                }

                if(decl_type == TokenType::Var) {
                    left = ASTFactory::makeVariableDeclaration(var_name, nullptr);
                } else if(decl_type == TokenType::Let) {
                    left = ASTFactory::makeLetDeclaration(var_name, nullptr);
                } else {
                    left = ASTFactory::makeConstDeclaration(var_name, nullptr);
                }
                current++;  // consume 'in' or 'of'

                // Parse the object/iterable expression
                auto right = parse_expression();

                consume(TokenType::RightParen);  // consume ')'

                // Parse the body statement
                auto body = parse_statement();

                if(is_for_of) {
                    if(is_for_await) {
                        return ASTFactory::makeForAwaitOfStatement(left, right, body);
                    }
                    return ASTFactory::makeForOfStatement(left, right, body);
                }
                return ASTFactory::makeForInStatement(left, right, body);
            } else {
                if(is_for_await) {
                    throw std::runtime_error(
                        "SyntaxError: for-await is only valid with for-of loops");
                }
                // Not for-in, backtrack and parse as regular for loop
                // We need to re-parse the variable declaration properly
                current -= 2;  // go back to var/let/const
                left = parse_variable_declaration();
            }
        } else if(current_token().type == TokenType::LeftBracket ||
                  current_token().type == TokenType::LeftBrace) {
            // Destructuring pattern: could be for-in/for-of or regular for with destructuring init
            auto pattern = parse_binding_pattern();

            if(current_token().type == TokenType::In || isContextualOf(current_token())) {
                // for (let [a,b] of arr) or for (let {x} in obj)
                bool is_for_of = isContextualOf(current_token());
                is_for_in = !is_for_of;
                if(is_for_await && !is_for_of) {
                    throw std::runtime_error(
                        "SyntaxError: for-await is only valid with for-of loops");
                }

                // Build declaration node with metadata="destructuring", pattern as children[0]
                auto decl_node = std::make_shared<ASTNode>(
                    decl_type == TokenType::Var   ? ASTNodeType::VariableDeclaration
                    : decl_type == TokenType::Let ? ASTNodeType::LetDeclaration
                                                  : ASTNodeType::ConstDeclaration);
                decl_node->metadata = "destructuring";
                decl_node->children.push_back(pattern);
                left = decl_node;

                current++;  // consume 'in' or 'of'
                auto right = parse_expression();
                consume(TokenType::RightParen);
                auto body = parse_statement();

                if(is_for_of) {
                    if(is_for_await) {
                        return ASTFactory::makeForAwaitOfStatement(left, right, body);
                    }
                    return ASTFactory::makeForOfStatement(left, right, body);
                }
                return ASTFactory::makeForInStatement(left, right, body);
            } else {
                // Regular for with destructuring init: for (let [a,b] = expr; ...; ...)
                if(is_for_await) {
                    throw std::runtime_error(
                        "SyntaxError: for-await is only valid with for-of loops");
                }
                if(!match(TokenType::Assign)) {
                    throw std::runtime_error("Destructuring declaration requires initializer");
                }
                auto initializer = parse_expression();
                auto decl_node = std::make_shared<ASTNode>(
                    decl_type == TokenType::Var   ? ASTNodeType::VariableDeclaration
                    : decl_type == TokenType::Let ? ASTNodeType::LetDeclaration
                                                  : ASTNodeType::ConstDeclaration);
                decl_node->metadata = "destructuring";
                decl_node->children.push_back(pattern);
                decl_node->children.push_back(initializer);
                left = decl_node;
            }
        } else {
            // No identifier after var/let/const - syntax error or edge case
            current--;  // go back
            left = parse_variable_declaration();
        }
    } else if(current_token().type == TokenType::Identifier) {
        // Could be for (x in obj), for (x of arr), or for (x = 0; ...)
        std::string var_name = current_token().value;
        current++;  // consume identifier

        // Note: "of" is a contextual keyword, lexed as identifier
        if(current_token().type == TokenType::In || isContextualOf(current_token())) {
            // This is for-in or for-of: for (x in obj) or for (x of arr)
            bool is_for_of = isContextualOf(current_token());
            is_for_in = !is_for_of;

            if(is_for_await && !is_for_of) {
                throw std::runtime_error("SyntaxError: for-await is only valid with for-of loops");
            }

            left = ASTFactory::makeIdentifier(var_name);
            current++;  // consume 'in' or 'of'

            // Parse the object/iterable expression
            auto right = parse_expression();

            consume(TokenType::RightParen);  // consume ')'

            // Parse the body statement
            auto body = parse_statement();

            if(is_for_of) {
                if(is_for_await) {
                    return ASTFactory::makeForAwaitOfStatement(left, right, body);
                }
                return ASTFactory::makeForOfStatement(left, right, body);
            }
            return ASTFactory::makeForInStatement(left, right, body);
        } else {
            if(is_for_await) {
                throw std::runtime_error("SyntaxError: for-await is only valid with for-of loops");
            }
            // Not for-in, backtrack and parse as regular for loop expression
            current--;  // go back to identifier
            left = parse_expression();
        }
    } else if(current_token().type != TokenType::Semicolon) {
        // Some other expression
        left = parse_expression();
    }
    // else: empty initialization: for (; ...)

    // Regular for loop
    consume(TokenType::Semicolon);  // consume first ';'

    // Parse the condition (optional)
    std::shared_ptr<ASTNode> condition = nullptr;
    if(current_token().type != TokenType::Semicolon) {
        condition = parse_expression();
    }

    consume(TokenType::Semicolon);  // consume second ';'

    // Parse the update expression (optional)
    std::shared_ptr<ASTNode> update = nullptr;
    if(current_token().type != TokenType::RightParen) {
        update = parse_expression();
    }

    consume(TokenType::RightParen);  // consume ')'

    // Parse the body statement
    auto body = parse_statement();

    return ASTFactory::makeForStatement(left, condition, update, body);
}

std::shared_ptr<ASTNode> Parser::parse_switch_statement() {
    consume(TokenType::Switch);     // consume 'switch'
    consume(TokenType::LeftParen);  // consume '('

    // Parse discriminant expression
    auto discriminant = parse_expression();

    consume(TokenType::RightParen);  // consume ')'
    consume(TokenType::LeftBrace);   // consume '{'

    auto switchNode = ASTFactory::makeSwitchStatement(discriminant);

    // Parse case clauses
    while(current_token().type != TokenType::RightBrace &&
          current_token().type != TokenType::EndOfFile) {
        if(current_token().type == TokenType::Case) {
            current++;  // consume 'case'
            auto test = parse_expression();
            consume(TokenType::Colon);  // consume ':'

            auto caseClause = ASTFactory::makeCaseClause(test);

            // Parse statements until next case/default/}
            while(current_token().type != TokenType::Case &&
                  current_token().type != TokenType::Default &&
                  current_token().type != TokenType::RightBrace &&
                  current_token().type != TokenType::EndOfFile) {
                auto stmt = parse_statement();
                ASTFactory::addCaseStatement(caseClause, stmt);
            }

            ASTFactory::addSwitchCase(switchNode, caseClause);

        } else if(current_token().type == TokenType::Default) {
            current++;                  // consume 'default'
            consume(TokenType::Colon);  // consume ':'

            auto defaultClause = ASTFactory::makeDefaultClause();

            // Parse statements until next case/}
            while(current_token().type != TokenType::Case &&
                  current_token().type != TokenType::RightBrace &&
                  current_token().type != TokenType::EndOfFile) {
                auto stmt = parse_statement();
                ASTFactory::addCaseStatement(defaultClause, stmt);
            }

            ASTFactory::addSwitchCase(switchNode, defaultClause);

        } else {
            throw std::runtime_error("Expected 'case' or 'default' in switch statement");
        }
    }

    consume(TokenType::RightBrace);  // consume '}'
    return switchNode;
}

std::shared_ptr<ASTNode> Parser::parse_function_declaration() {
    Token& startToken = current_token();  // Save 'function' location
    consume(TokenType::Function);         // consume 'function'

    // Get function name
    if(current_token().type != TokenType::Identifier) {
        throw std::runtime_error("Expected function name");
    }
    std::string name = current_token().value;
    size_t nameLine = current_token().line;
    size_t nameColumn = current_token().column;
    current++;  // consume function name

    // Validate function name in strict mode
    validateIdentifier(name, nameLine, nameColumn);

    // Parse parameters
    consume(TokenType::LeftParen);
    auto parameters = parse_parameter_list();
    consume(TokenType::RightParen);

    // Parse function body
    auto body = parse_block_statement();

    auto node = ASTFactory::makeFunctionDeclaration(name, parameters, body);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

std::shared_ptr<ASTNode> Parser::parse_parameter_list() {
    auto parameters = ASTFactory::makeParameterList();
    bool has_rest_param = false;
    std::unordered_set<std::string> seen_params;

    // Handle empty parameter list
    if(current_token().type == TokenType::RightParen) {
        return parameters;
    }

    // Helper lambda to parse a single parameter (with optional default value or rest)
    auto parse_single_parameter = [this, &has_rest_param,
                                   &seen_params]() -> std::shared_ptr<ASTNode> {
        // Check for rest parameter (...name)
        bool is_rest = false;
        if(current_token().type == TokenType::Spread) {
            if(has_rest_param) {
                throw std::runtime_error("Rest parameter must be last formal parameter");
            }
            is_rest = true;
            has_rest_param = true;
            current++;  // consume '...'
        }

        if(current_token().type != TokenType::Identifier) {
            throw std::runtime_error("Expected parameter name");
        }
        std::string paramValue = current_token().value;
        size_t paramLine = current_token().line;
        size_t paramColumn = current_token().column;
        auto param_name = ASTFactory::makeIdentifier(paramValue);
        current++;  // consume parameter name

        // Validate parameter name in strict mode
        validateIdentifier(paramValue, paramLine, paramColumn);

        // Check for duplicate parameter names in strict mode
        if(in_strict_mode_) {
            if(seen_params.count(paramValue)) {
                throw std::runtime_error(
                    "SyntaxError: Duplicate parameter name not allowed in this context at line " +
                    std::to_string(paramLine) + ":" + std::to_string(paramColumn));
            }
            seen_params.insert(paramValue);
        }

        // Rest parameters cannot have default values
        if(is_rest) {
            param_name->metadata = "rest";  // Mark as rest parameter
            return param_name;
        }

        // Check for default value (= expression)
        if(current_token().type == TokenType::Assign) {
            current++;  // consume '='
            // Parse default value expression (but stop at comma or right paren)
            // Use parse_binary_expression with assignment precedence
            auto default_value = parse_binary_expression(1);  // precedence 1 to stop before commas
            // Create an AssignmentExpression to represent param = defaultValue
            return ASTFactory::makeAssignmentExpression(param_name, default_value);
        }

        return param_name;
    };

    // Parse first parameter
    ASTFactory::addParameter(parameters, parse_single_parameter());

    // Parse remaining parameters
    while(match(TokenType::Comma)) {
        if(has_rest_param) {
            throw std::runtime_error("Rest parameter must be last formal parameter");
        }
        // Allow trailing comma before ')'
        if(current_token().type == TokenType::RightParen) {
            break;
        }
        ASTFactory::addParameter(parameters, parse_single_parameter());
    }

    return parameters;
}

std::shared_ptr<ASTNode> Parser::parse_return_statement() {
    consume(TokenType::Return);  // consume 'return'

    std::shared_ptr<ASTNode> argument = nullptr;
    if(current_token().type != TokenType::Semicolon) {
        argument = parse_expression();
    }

    match(TokenType::Semicolon);  // optional semicolon
    return ASTFactory::makeReturnStatement(argument);
}

std::shared_ptr<ASTNode> Parser::parse_throw_statement() {
    consume(TokenType::Throw);  // consume 'throw'

    // throw requires an expression (unlike return which is optional)
    if(current_token().type == TokenType::Semicolon ||
       current_token().type == TokenType::EndOfFile) {
        throw std::runtime_error("Missing throw expression");
    }

    auto argument = parse_expression();
    match(TokenType::Semicolon);  // optional semicolon
    return ASTFactory::makeThrowStatement(argument);
}

std::shared_ptr<ASTNode> Parser::parse_try_statement() {
    consume(TokenType::Try);  // consume 'try'

    // Parse the try block
    auto tryBlock = parse_block_statement();

    // Parse optional catch clause
    std::shared_ptr<ASTNode> catchClause = nullptr;
    if(current_token().type == TokenType::Catch) {
        catchClause = parse_catch_clause();
    }

    // Parse optional finally clause
    std::shared_ptr<ASTNode> finallyClause = nullptr;
    if(current_token().type == TokenType::Finally) {
        current++;  // consume 'finally'
        // finally must be followed by a block
        finallyClause = ASTFactory::makeFinallyClause(parse_block_statement());
    }

    // Require at least catch or finally
    if(!catchClause && !finallyClause) {
        throw std::runtime_error("Missing catch or finally clause after try block");
    }

    return ASTFactory::makeTryStatement(tryBlock, catchClause, finallyClause);
}

std::shared_ptr<ASTNode> Parser::parse_catch_clause() {
    consume(TokenType::Catch);  // consume 'catch'

    consume(TokenType::LeftParen);  // consume '('

    // Parse catch parameter (the variable that will hold the exception)
    if(current_token().type != TokenType::Identifier) {
        throw std::runtime_error("Expected identifier in catch clause");
    }
    std::string parameter = current_token().value;
    size_t paramLine = current_token().line;
    size_t paramColumn = current_token().column;
    current++;  // consume parameter name

    // Validate catch parameter in strict mode
    validateIdentifier(parameter, paramLine, paramColumn);

    consume(TokenType::RightParen);  // consume ')'

    // Parse catch body
    auto body = parse_block_statement();

    return ASTFactory::makeCatchClause(parameter, body);
}

std::shared_ptr<ASTNode> Parser::parse_block_statement() {
    consume(TokenType::LeftBrace);  // consume '{'
    auto block = ASTFactory::makeBlockStatement();

    while(current_token().type != TokenType::RightBrace &&
          current_token().type != TokenType::EndOfFile) {
        auto stmt = parse_statement();
        ASTFactory::addStatement(block, stmt);
    }

    consume(TokenType::RightBrace);  // consume '}'
    return block;
}

std::shared_ptr<ASTNode> Parser::parse_with_statement() {
    size_t with_line = current_token().line;
    size_t with_column = current_token().column;
    consume(TokenType::With);  // consume 'with'

    if(in_strict_mode_) {
        throw std::runtime_error(
            "SyntaxError: Strict mode code may not include a with statement at line " +
            std::to_string(with_line) + ":" + std::to_string(with_column));
    }

    // Non-strict mode: parse but throw not-implemented
    consume(TokenType::LeftParen);
    parse_expression();
    consume(TokenType::RightParen);
    auto body = parse_statement();
    // with is not implemented in non-strict mode, but we parse it to avoid syntax errors
    throw std::runtime_error("'with' statement is not supported");
}

std::shared_ptr<ASTNode> Parser::parse_break_statement() {
    consume(TokenType::Break);    // consume 'break'
    match(TokenType::Semicolon);  // optional semicolon
    return ASTFactory::makeBreakStatement();
}

std::shared_ptr<ASTNode> Parser::parse_continue_statement() {
    consume(TokenType::Continue);  // consume 'continue'
    match(TokenType::Semicolon);   // optional semicolon
    return ASTFactory::makeContinueStatement();
}

// Class parsing methods

std::shared_ptr<ASTNode> Parser::parse_class_declaration() {
    Token& startToken = current_token();
    consume(TokenType::Class);  // consume 'class'

    // Get class name (required for declarations)
    if(current_token().type != TokenType::Identifier) {
        throw std::runtime_error("Expected class name");
    }
    std::string name = current_token().value;
    size_t nameLine = current_token().line;
    size_t nameColumn = current_token().column;
    current++;  // consume class name

    // Validate class name in strict mode
    validateIdentifier(name, nameLine, nameColumn);

    // Check for extends clause
    std::shared_ptr<ASTNode> superClass = nullptr;
    if(current_token().type == TokenType::Extends) {
        current++;  // consume 'extends'
        // Parse superclass expression (can be complex expression like Foo.Bar)
        superClass = parse_expression();
    }

    // Parse class body
    auto body = parse_class_body();

    auto node = ASTFactory::makeClassDeclaration(name, superClass, body);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

std::shared_ptr<ASTNode> Parser::parse_class_expression() {
    Token& startToken = current_token();
    consume(TokenType::Class);  // consume 'class'

    // Optional class name
    std::string name;
    if(current_token().type == TokenType::Identifier) {
        name = current_token().value;
        size_t nameLine = current_token().line;
        size_t nameColumn = current_token().column;
        current++;  // consume class name
        // Validate class name in strict mode
        validateIdentifier(name, nameLine, nameColumn);
    }

    // Check for extends clause
    std::shared_ptr<ASTNode> superClass = nullptr;
    if(current_token().type == TokenType::Extends) {
        current++;  // consume 'extends'
        superClass = parse_expression();
    }

    // Parse class body
    auto body = parse_class_body();

    auto node = ASTFactory::makeClassExpression(name, superClass, body);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

std::shared_ptr<ASTNode> Parser::parse_class_body() {
    consume(TokenType::LeftBrace);  // consume '{'

    auto body = ASTFactory::makeClassBody();

    while(current_token().type != TokenType::RightBrace &&
          current_token().type != TokenType::EndOfFile) {
        // Skip any semicolons in class body (empty statements)
        if(current_token().type == TokenType::Semicolon) {
            current++;
            continue;
        }

        auto method = parse_method_definition();
        ASTFactory::addMethodToClassBody(body, method);
    }

    consume(TokenType::RightBrace);  // consume '}'
    return body;
}

std::shared_ptr<ASTNode> Parser::parse_method_definition() {
    Token& startToken = current_token();
    bool isStatic = false;
    bool isComputed = false;
    bool isGenerator = false;
    bool isAsync = false;
    std::string methodName;
    std::shared_ptr<ASTNode> computedKey = nullptr;

    // Check for 'static' keyword
    if(current_token().type == TokenType::Static) {
        isStatic = true;
        current++;  // consume 'static'
    }

    // Check for 'async' keyword (must not be followed by '(' which would mean a method named
    // "async")
    if(current_token().type == TokenType::Async && peek_token().type != TokenType::LeftParen) {
        isAsync = true;
        current++;  // consume 'async'
    }

    // Check for generator method: *methodName() {}
    if(current_token().type == TokenType::Multiply) {
        isGenerator = true;
        current++;  // consume '*'
    }

    // Check for getter/setter syntax: get x() {} / set x(v) {}
    // Disambiguate from method named "get"/"set" (next token would be '(')
    bool isGetter = false;
    bool isSetter = false;
    if(!isGenerator && !isAsync && current_token().type == TokenType::Identifier &&
       (current_token().value == "get" || current_token().value == "set")) {
        TokenType next = peek_token().type;
        if(next == TokenType::Identifier || next == TokenType::String ||
           next == TokenType::Number || next == TokenType::LeftBracket) {
            if(current_token().value == "get") {
                isGetter = true;
            } else {
                isSetter = true;
            }
            current++;  // consume 'get'/'set'
        }
    }

    // Get method name
    if(current_token().type == TokenType::LeftBracket) {
        // Computed property name: [expression]
        isComputed = true;
        current++;  // consume '['
        computedKey = parse_expression();
        consume(TokenType::RightBracket);
    } else if(current_token().type == TokenType::Identifier) {
        methodName = current_token().value;
        size_t methodLine = current_token().line;
        size_t methodColumn = current_token().column;
        current++;  // consume identifier
        // Validate method name in strict mode
        validateIdentifier(methodName, methodLine, methodColumn);
    } else if(current_token().type == TokenType::String) {
        methodName = current_token().value;
        current++;  // consume string
    } else {
        throw std::runtime_error("Expected method name in class body");
    }

    // Parse parameters
    consume(TokenType::LeftParen);
    auto parameters = parse_parameter_list();
    consume(TokenType::RightParen);

    // Parse method body (with appropriate context flags)
    bool was_in_generator = in_generator_context_;
    bool was_in_async = in_async_context_;
    if(isGenerator) {
        in_generator_context_ = true;
    }
    if(isAsync) {
        in_async_context_ = true;
    }
    auto methodBody = parse_block_statement();
    in_generator_context_ = was_in_generator;
    in_async_context_ = was_in_async;

    std::shared_ptr<ASTNode> node;
    if(isGenerator) {
        node = ASTFactory::makeGeneratorMethod(methodName, parameters, methodBody, isStatic,
                                               isComputed, computedKey);
    } else if(isAsync) {
        node = ASTFactory::makeAsyncMethod(methodName, parameters, methodBody, isStatic, isComputed,
                                           computedKey);
    } else {
        node = ASTFactory::makeMethodDefinition(methodName, parameters, methodBody, isStatic,
                                                isComputed, computedKey);
    }

    // Append getter/setter to metadata
    if(isGetter) {
        node->metadata = node->metadata.empty() ? "getter" : node->metadata + ",getter";
    } else if(isSetter) {
        node->metadata = node->metadata.empty() ? "setter" : node->metadata + ",setter";
    }

    node->setLocation(startToken.line, startToken.column);
    return node;
}

// Generator function parsing

std::shared_ptr<ASTNode> Parser::parse_generator_function_declaration() {
    Token& startToken = current_token();  // Save 'function' location
    consume(TokenType::Function);         // consume 'function'
    consume(TokenType::Multiply);         // consume '*'

    // Get function name (required for declarations)
    if(current_token().type != TokenType::Identifier) {
        throw std::runtime_error("Expected generator function name");
    }
    std::string name = current_token().value;
    size_t nameLine = current_token().line;
    size_t nameColumn = current_token().column;
    current++;  // consume function name

    // Validate generator function name in strict mode
    validateIdentifier(name, nameLine, nameColumn);

    // Parse parameters
    consume(TokenType::LeftParen);
    auto parameters = parse_parameter_list();
    consume(TokenType::RightParen);

    // Parse function body with generator context enabled
    bool was_in_generator = in_generator_context_;
    in_generator_context_ = true;
    auto body = parse_block_statement();
    in_generator_context_ = was_in_generator;

    auto node = ASTFactory::makeGeneratorFunctionDeclaration(name, parameters, body);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

std::shared_ptr<ASTNode> Parser::parse_generator_function_expression() {
    Token& startToken = current_token();  // Save 'function' location
    consume(TokenType::Function);         // consume 'function'
    consume(TokenType::Multiply);         // consume '*'

    // Optional function name for named generator expressions
    std::string name;
    if(current_token().type == TokenType::Identifier) {
        name = current_token().value;
        size_t nameLine = current_token().line;
        size_t nameColumn = current_token().column;
        current++;  // consume function name
        // Validate generator function name in strict mode
        validateIdentifier(name, nameLine, nameColumn);
    }

    // Parse parameters
    consume(TokenType::LeftParen);
    auto parameters = parse_parameter_list();
    consume(TokenType::RightParen);

    // Parse function body with generator context enabled
    bool was_in_generator = in_generator_context_;
    in_generator_context_ = true;
    auto body = parse_block_statement();
    in_generator_context_ = was_in_generator;

    auto node = ASTFactory::makeGeneratorFunctionExpression(parameters, body, name);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

// Async function parsing

std::shared_ptr<ASTNode> Parser::parse_async_function_declaration() {
    Token& startToken = current_token();  // Save 'async' location
    consume(TokenType::Async);            // consume 'async'
    consume(TokenType::Function);         // consume 'function'

    // Get function name (required for declarations)
    if(current_token().type != TokenType::Identifier) {
        throw std::runtime_error("Expected async function name");
    }
    std::string name = current_token().value;
    size_t nameLine = current_token().line;
    size_t nameColumn = current_token().column;
    current++;  // consume function name

    // Validate function name in strict mode
    validateIdentifier(name, nameLine, nameColumn);

    // Parse parameters
    consume(TokenType::LeftParen);
    auto parameters = parse_parameter_list();
    consume(TokenType::RightParen);

    // Parse function body with async context enabled
    bool was_in_async = in_async_context_;
    in_async_context_ = true;
    auto body = parse_block_statement();
    in_async_context_ = was_in_async;

    auto node = ASTFactory::makeAsyncFunctionDeclaration(name, parameters, body);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

}  // namespace rift::frontend
