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
    : tokens(tokens),
      current(0),
      in_generator_context_(false),
      in_async_context_(false),
      in_strict_mode_(false) {
}

// Check if a name is a strict mode reserved word
bool Parser::isStrictModeReservedWord(const std::string& name) const {
    // These are reserved as variable/parameter names in strict mode
    return name == "eval" || name == "arguments" || name == "implements" || name == "interface" ||
           name == "let" || name == "package" || name == "private" || name == "protected" ||
           name == "public" || name == "static" || name == "yield";
}

// Validate that an identifier is not a reserved word in strict mode
void Parser::validateIdentifier(const std::string& name, size_t line, size_t column) {
    if(in_strict_mode_ && isStrictModeReservedWord(name)) {
        throw std::runtime_error("SyntaxError: Unexpected strict mode reserved word '" + name +
                                 "' at line " + std::to_string(line) + ":" +
                                 std::to_string(column));
    }
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

    // Check for "use strict" directive at the start of the program
    // This must be done before parsing statements to correctly validate identifiers
    bool checked_directives = false;
    while(current_token().type != TokenType::EndOfFile) {
        try {
            // Check for directive prologue (string literals at the start)
            if(!checked_directives && current_token().type == TokenType::String) {
                std::string directive = current_token().value;
                // Remove quotes from the string value
                if((directive == "\"use strict\"" || directive == "'use strict'" ||
                    directive == "use strict")) {
                    in_strict_mode_ = true;
                }
                // Parse the directive as a statement
                auto stmt = parse_statement();
                ASTFactory::addStatement(program, stmt);
                continue;
            }
            checked_directives = true;

            auto stmt = parse_statement();
            ASTFactory::addStatement(program, stmt);
        } catch(const std::exception& e) {
            // Re-throw SyntaxError exceptions (strict mode violations, etc.)
            std::string error_msg = e.what();
            if(error_msg.find("SyntaxError") != std::string::npos) {
                throw;
            }
            // Skip to next statement on other errors
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

    if(current_token().type == TokenType::Async) {
        // async function declaration: async function name() {}
        if(peek_token().type == TokenType::Function) {
            return parse_async_function_declaration();
        }
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

    if(current_token().type == TokenType::With) {
        return parse_with_statement();
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
