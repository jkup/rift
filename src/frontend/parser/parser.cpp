/**
 * Parser Core Implementation
 *
 * This file contains the core parser functionality including:
 * - Constructor and utility methods (current_token, peek_token, match, consume)
 * - Main entry point (parse)
 * - Statement dispatcher (parse_statement)
 *
 * Expression parsing methods are in parser_expressions.cpp
 * Statement parsing methods are in parser_statements.cpp
 */

#include "rift/frontend/parser/parser.h"

#include <iostream>
#include <stdexcept>

namespace rift::frontend {

using namespace rift::ast;
using ASTFactory = ast::ASTFactory;

// Constructor
Parser::Parser(const std::vector<Token>& tokens)
    : tokens(tokens), current(0), in_generator_context_(false) {
}

// Utility methods
Token& Parser::current_token() {
    if(current >= tokens.size()) {
        static Token eof(TokenType::EndOfFile, "");
        return eof;
    }
    return tokens[current];
}

Token& Parser::peek_token() {
    if(current + 1 >= tokens.size()) {
        static Token eof(TokenType::EndOfFile, "");
        return eof;
    }
    return tokens[current + 1];
}

bool Parser::match(TokenType type) {
    if(current_token().type == type) {
        current++;
        return true;
    }
    return false;
}

void Parser::consume(TokenType type) {
    if(current_token().type != type) {
        throw std::runtime_error("Expected token type, got different type");
    }
    current++;
}

// Main entry point
std::shared_ptr<ASTNode> Parser::parse() {
    auto program = ASTFactory::makeProgram();

    while(current_token().type != TokenType::EndOfFile) {
        try {
            auto stmt = parse_statement();
            ASTFactory::addStatement(program, stmt);
        } catch(const std::exception& e) {
            // Skip to next statement on error
            while(current_token().type != TokenType::Semicolon &&
                  current_token().type != TokenType::EndOfFile) {
                current++;
            }
            if(current_token().type == TokenType::Semicolon) {
                current++;
            }
        }
    }

    return program;
}

// Statement dispatcher
std::shared_ptr<ASTNode> Parser::parse_statement() {
    if(current_token().type == TokenType::Var) {
        auto stmt = parse_variable_declaration();
        match(TokenType::Semicolon);  // optional semicolon
        return stmt;
    }
    if(current_token().type == TokenType::Let || current_token().type == TokenType::Const) {
        auto stmt = parse_variable_declaration();
        match(TokenType::Semicolon);  // optional semicolon
        return stmt;
    }

    if(current_token().type == TokenType::If) {
        return parse_if_statement();
    }

    if(current_token().type == TokenType::While) {
        return parse_while_statement();
    }

    if(current_token().type == TokenType::Do) {
        return parse_do_while_statement();
    }

    if(current_token().type == TokenType::For) {
        return parse_for_statement();
    }

    if(current_token().type == TokenType::Switch) {
        return parse_switch_statement();
    }

    if(current_token().type == TokenType::Break) {
        return parse_break_statement();
    }

    if(current_token().type == TokenType::Continue) {
        return parse_continue_statement();
    }

    if(current_token().type == TokenType::Function) {
        // Check for generator function: function* name() {}
        if(peek_token().type == TokenType::Multiply) {
            return parse_generator_function_declaration();
        }
        return parse_function_declaration();
    }

    if(current_token().type == TokenType::Class) {
        return parse_class_declaration();
    }

    if(current_token().type == TokenType::Return) {
        return parse_return_statement();
    }

    if(current_token().type == TokenType::Throw) {
        return parse_throw_statement();
    }

    if(current_token().type == TokenType::Try) {
        return parse_try_statement();
    }

    if(current_token().type == TokenType::LeftBrace) {
        return parse_block_statement();
    }

    // Expression statement
    auto expr = parse_expression();
    match(TokenType::Semicolon);  // optional semicolon
    return ASTFactory::makeExpressionStatement(expr);
}

}  // namespace rift::frontend
