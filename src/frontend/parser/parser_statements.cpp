/**
 * Parser Statement Methods
 *
 * This file contains all statement parsing methods for the Parser class.
 * Split from parser.cpp for better maintainability.
 */

#include <iostream>
#include <stdexcept>

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

    if(current_token().type != TokenType::Identifier) {
        throw std::runtime_error("Expected identifier after variable declaration keyword");
    }

    std::string name = current_token().value;
    current++;

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

std::shared_ptr<ASTNode> Parser::parse_for_statement() {
    consume(TokenType::For);  // consume 'for'

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

            // Check if this is for-in (no initializer, followed by 'in')
            if(current_token().type == TokenType::In) {
                // This is for-in: for (var x in obj)
                is_for_in = true;
                if(decl_type == TokenType::Var) {
                    left = ASTFactory::makeVariableDeclaration(var_name, nullptr);
                } else if(decl_type == TokenType::Let) {
                    left = ASTFactory::makeLetDeclaration(var_name, nullptr);
                } else {
                    left = ASTFactory::makeConstDeclaration(var_name, nullptr);
                }
                current++;  // consume 'in'

                // Parse the object expression
                auto right = parse_expression();

                consume(TokenType::RightParen);  // consume ')'

                // Parse the body statement
                auto body = parse_statement();

                return ASTFactory::makeForInStatement(left, right, body);
            } else {
                // Not for-in, backtrack and parse as regular for loop
                // We need to re-parse the variable declaration properly
                current -= 2;  // go back to var/let/const
                left = parse_variable_declaration();
            }
        } else {
            // No identifier after var/let/const - syntax error or edge case
            current--;  // go back
            left = parse_variable_declaration();
        }
    } else if(current_token().type == TokenType::Identifier) {
        // Could be for (x in obj) or for (x = 0; ...)
        std::string var_name = current_token().value;
        current++;  // consume identifier

        if(current_token().type == TokenType::In) {
            // This is for-in: for (x in obj)
            is_for_in = true;
            left = ASTFactory::makeIdentifier(var_name);
            current++;  // consume 'in'

            // Parse the object expression
            auto right = parse_expression();

            consume(TokenType::RightParen);  // consume ')'

            // Parse the body statement
            auto body = parse_statement();

            return ASTFactory::makeForInStatement(left, right, body);
        } else {
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
    current++;  // consume function name

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

    // Handle empty parameter list
    if(current_token().type == TokenType::RightParen) {
        return parameters;
    }

    // Helper lambda to parse a single parameter (with optional default value or rest)
    auto parse_single_parameter = [this, &has_rest_param]() -> std::shared_ptr<ASTNode> {
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
        auto param_name = ASTFactory::makeIdentifier(current_token().value);
        current++;  // consume parameter name

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
    current++;  // consume parameter name

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

}  // namespace rift::frontend
