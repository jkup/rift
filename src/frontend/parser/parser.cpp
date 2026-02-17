// ============================================================================
// ECMA-262 — Parser Core (Chapters 13-15)
// Core parser infrastructure: token utilities, statement dispatch.
//
// This file contains the core parser functionality including:
// - Constructor and utility methods (current_token, peek_token, match, consume)
// - Main entry point (parse) — implements Script/Module parsing (16.1)
// - Statement dispatcher (parse_statement) — routes to statement/declaration parsers
//
// @spec https://tc39.es/ecma262/#sec-ecmascript-language-statements-and-declarations
// @spec https://tc39.es/ecma262/#sec-ecmascript-language-functions-and-classes
//
// See also: parser_expressions.cpp (expression parsing, Chapter 13)
//           parser_statements.cpp (statement/declaration parsing, Chapters 14-15)
// ============================================================================

#include "rift/frontend/parser/parser.h"

#include <iostream>
#include <stdexcept>

namespace rift::frontend {

using namespace rift::ast;
using ASTFactory = ast::ASTFactory;

// Parser constructor — initializes token stream and context flags.
// Context flags (in_generator_context_, in_async_context_, in_strict_mode_) track
// the current parsing context for validating context-sensitive syntax (e.g., yield
// is only allowed in generators, await only in async functions).
Parser::Parser(const std::vector<Token>& tokens)
    : tokens(tokens),
      current(0),
      in_generator_context_(false),
      in_async_context_(false),
      in_strict_mode_(false) {
}

// 13.1 Identifiers — Strict Mode Reserved Words
// In strict mode code, the following identifiers are reserved and cannot be used
// as BindingIdentifier: implements, interface, let, package, private, protected,
// public, static, yield. Additionally, "eval" and "arguments" cannot be used as
// BindingIdentifier in strict mode.
// @spec https://tc39.es/ecma262/#sec-identifiers-static-semantics-early-errors
bool Parser::isStrictModeReservedWord(const std::string& name) const {
    return name == "eval" || name == "arguments" || name == "implements" || name == "interface" ||
           name == "let" || name == "package" || name == "private" || name == "protected" ||
           name == "public" || name == "static" || name == "yield";
}

// 13.1 Identifiers — Static Semantics: Early Errors
// It is a Syntax Error if the BindingIdentifier is a strict mode reserved word
// in strict mode code. This enforces the early error rules for BindingIdentifier.
// @spec https://tc39.es/ecma262/#sec-identifiers-static-semantics-early-errors
void Parser::validateIdentifier(const std::string& name, size_t line, size_t column) {
    if(in_strict_mode_ && isStrictModeReservedWord(name)) {
        throw std::runtime_error("SyntaxError: Unexpected strict mode reserved word '" + name +
                                 "' at line " + std::to_string(line) + ":" +
                                 std::to_string(column));
    }
}

// Token stream utility methods — these provide the core lookahead and consumption
// primitives used by all parsing methods. The parser is LL(1) with occasional LL(2)
// lookahead via peek_token(). These are not directly specified by ECMA-262 but
// implement the implicit token stream operations used in the syntactic grammar.
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

// 16.1 Scripts
// Script :: ScriptBody?
// ScriptBody :: StatementList
// Parses a complete JavaScript program as a sequence of StatementListItems.
// @spec https://tc39.es/ecma262/#sec-scripts
//
// 11.2.1 Directive Prologues and the Use Strict Directive
// A Directive Prologue is a sequence of ExpressionStatements at the start of a
// FunctionBody, ScriptBody, or ModuleBody where each is a string literal.
// If "use strict" appears, the code is strict mode code.
// @spec https://tc39.es/ecma262/#sec-directive-prologues-and-the-use-strict-directive
//
// DEVIATION: On parse errors (except SyntaxErrors), the parser attempts error recovery
// by skipping tokens to the next semicolon. The spec does not define error recovery —
// any parse error should be a SyntaxError that aborts parsing. This recovery behavior
// can mask bugs (see CLAUDE.md "Silent parse recovery" section).
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

// 14.1 Statement Semantics
// Statement :: BlockStatement | VariableStatement | EmptyStatement | ExpressionStatement
//            | IfStatement | BreakableStatement | ContinueStatement | BreakStatement
//            | ReturnStatement | WithStatement | LabelledStatement | ThrowStatement
//            | TryStatement | DebuggerStatement
// Declaration :: HoistableDeclaration | ClassDeclaration | LexicalDeclaration
// HoistableDeclaration :: FunctionDeclaration | GeneratorDeclaration
//                       | AsyncFunctionDeclaration | AsyncGeneratorDeclaration
// @spec https://tc39.es/ecma262/#sec-ecmascript-language-statements-and-declarations
//
// This method dispatches to the appropriate parse method based on the current
// token. It implements the StatementListItem production which unions Statement
// and Declaration.
//
// INCOMPLETE: LabelledStatement (14.13), EmptyStatement (14.4), and
// DebuggerStatement (14.16) are not handled. Empty statements (lone semicolons)
// will fall through to the expression statement path. Labelled statements are
// not recognized and will be parsed as expression statements.
std::shared_ptr<ASTNode> Parser::parse_statement() {
    // 14.3.2 Variable Statement: var VariableDeclarationList ;
    if(current_token().type == TokenType::Var) {
        auto stmt = parse_variable_declaration();
        match(TokenType::Semicolon);  // optional semicolon
        return stmt;
    }
    // 14.3.1 Let and Const Declarations: LexicalDeclaration :: LetOrConst BindingList ;
    if(current_token().type == TokenType::Let || current_token().type == TokenType::Const) {
        auto stmt = parse_variable_declaration();
        match(TokenType::Semicolon);  // optional semicolon
        return stmt;
    }

    // 14.6 The if Statement
    if(current_token().type == TokenType::If) {
        return parse_if_statement();
    }

    // 14.7.2 The while Statement
    if(current_token().type == TokenType::While) {
        return parse_while_statement();
    }

    // 14.7.1 The do-while Statement
    if(current_token().type == TokenType::Do) {
        return parse_do_while_statement();
    }

    // 14.7.4 The for Statement / 14.7.5 The for-in and for-of Statements
    if(current_token().type == TokenType::For) {
        return parse_for_statement();
    }

    // 14.12 The switch Statement
    if(current_token().type == TokenType::Switch) {
        return parse_switch_statement();
    }

    // 14.9 The break Statement
    if(current_token().type == TokenType::Break) {
        return parse_break_statement();
    }

    // 14.8 The continue Statement
    if(current_token().type == TokenType::Continue) {
        return parse_continue_statement();
    }

    // 15.8 Async Function Definitions
    // AsyncFunctionDeclaration :: async function BindingIdentifier ( FormalParameters ) {
    // AsyncFunctionBody }
    if(current_token().type == TokenType::Async) {
        if(peek_token().type == TokenType::Function) {
            return parse_async_function_declaration();
        }
    }

    // 15.2 Function Definitions / 15.5 Generator Function Definitions
    // FunctionDeclaration :: function BindingIdentifier ( FormalParameters ) { FunctionBody }
    // GeneratorDeclaration :: function * BindingIdentifier ( FormalParameters ) { GeneratorBody }
    if(current_token().type == TokenType::Function) {
        if(peek_token().type == TokenType::Multiply) {
            return parse_generator_function_declaration();
        }
        return parse_function_declaration();
    }

    // 15.7 Class Definitions
    // ClassDeclaration :: class BindingIdentifier ClassTail
    if(current_token().type == TokenType::Class) {
        return parse_class_declaration();
    }

    // 14.10 The return Statement
    if(current_token().type == TokenType::Return) {
        return parse_return_statement();
    }

    // 14.14 The throw Statement
    if(current_token().type == TokenType::Throw) {
        return parse_throw_statement();
    }

    // 14.15 The try Statement
    if(current_token().type == TokenType::Try) {
        return parse_try_statement();
    }

    // 14.11 The with Statement
    if(current_token().type == TokenType::With) {
        return parse_with_statement();
    }

    // 14.2 Block Statement: Block :: { StatementList? }
    if(current_token().type == TokenType::LeftBrace) {
        return parse_block_statement();
    }

    // 14.5 Expression Statement
    // ExpressionStatement :: [lookahead not in { {, function, async function, class, let [ }]
    // Expression ; DEVIATION: The spec requires lookahead restrictions to disambiguate from
    // BlockStatement, FunctionDeclaration, etc. These are handled above by checking
    // specific token types first, so the fallthrough here is the expression case.
    auto expr = parse_expression();
    match(TokenType::Semicolon);  // optional semicolon
    return ASTFactory::makeExpressionStatement(expr);
}

}  // namespace rift::frontend
