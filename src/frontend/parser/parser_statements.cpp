/**
 * Parser Statement Methods
 *
 * This file contains all statement parsing methods for the Parser class.
 * Split from parser.cpp for better maintainability.
 */

#include "rift/frontend/parser/parser.h"

#include <iostream>
#include <stdexcept>

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

    // Parse the initialization (can be variable declaration or assignment expression or empty)
    std::shared_ptr<ASTNode> initialization = nullptr;
    if(current_token().type == TokenType::Var || current_token().type == TokenType::Let ||
       current_token().type == TokenType::Const) {
        // Variable declaration: for (var i = 0; ...)
        initialization = parse_variable_declaration();
    } else if(current_token().type != TokenType::Semicolon) {
        // Assignment expression: for (i = 0; ...)
        initialization = parse_expression();
    }
    // else: empty initialization: for (; ...)

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

    return ASTFactory::makeForStatement(initialization, condition, update, body);
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
    consume(TokenType::Function);  // consume 'function'

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

    // Handle empty parameter list
    if(current_token().type == TokenType::RightParen) {
        return parameters;
    }

    // Parse first parameter
    if(current_token().type != TokenType::Identifier) {
        throw std::runtime_error("Expected parameter name");
    }
    ASTFactory::addParameter(parameters, ASTFactory::makeIdentifier(current_token().value));
    current++;  // consume parameter name

    // Parse remaining parameters
    while(match(TokenType::Comma)) {
        if(current_token().type != TokenType::Identifier) {
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
