// ============================================================================
// ECMA-262 — Statement and Declaration Parsing (Chapters 14-15)
// Implements syntactic grammar productions for statements and declarations:
//   - Variable declarations: var, let, const (14.3)
//   - Control flow: if, for, while, do-while, switch (14.6-14.12)
//   - Jump: break, continue, return, throw (14.8-14.10, 14.14)
//   - Exception: try-catch-finally (14.15)
//   - Function/generator/async/class declarations (15.2, 15.5, 15.7, 15.8)
//   - Destructuring patterns (14.3.3)
//   - Import/export declarations (16.2) — not yet implemented
// @spec https://tc39.es/ecma262/#sec-ecmascript-language-statements-and-declarations
// @spec https://tc39.es/ecma262/#sec-ecmascript-language-functions-and-classes
//
// See also: parser.cpp (core utilities, statement dispatch)
//           parser_expressions.cpp (expression parsing, Chapter 13)
// ============================================================================

#include <iostream>
#include <stdexcept>
#include <unordered_set>

#include "rift/frontend/parser/parser.h"

namespace rift::frontend {

using namespace rift::ast;
using ASTFactory = ast::ASTFactory;

// 14.3.2 Variable Statement / 14.3.1 Let and Const Declarations
// VariableStatement :: var VariableDeclarationList ;
// VariableDeclarationList :: VariableDeclaration | VariableDeclarationList , VariableDeclaration
// VariableDeclaration :: BindingIdentifier Initializer? | BindingPattern Initializer
// LexicalDeclaration :: LetOrConst BindingList ;
// BindingList :: LexicalBinding | BindingList , LexicalBinding
// LexicalBinding :: BindingIdentifier Initializer? | BindingPattern Initializer
// @spec https://tc39.es/ecma262/#sec-variable-statement
// @spec https://tc39.es/ecma262/#sec-let-and-const-declarations
//
// DEVIATION: Multiple declarators (e.g., var a, b = 1, c) are wrapped in a
// BlockStatement with metadata="declaration-list" rather than producing a single
// VariableDeclarationList AST node. The evaluator handles this specially to avoid
// creating a new scope.
std::shared_ptr<ASTNode> Parser::parse_variable_declaration() {
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

    // BindingPattern :: ObjectBindingPattern | ArrayBindingPattern
    // When the next token is '[' or '{', this is a destructuring declaration:
    // VariableDeclaration :: BindingPattern Initializer
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

    // Parses a single VariableDeclaration / LexicalBinding production:
    // VariableDeclaration :: BindingIdentifier Initializer? | BindingPattern Initializer
    auto parse_single_declarator = [&]() -> std::shared_ptr<ASTNode> {
        // Check for destructuring in subsequent declarators
        if(current_token().type == TokenType::LeftBracket ||
           current_token().type == TokenType::LeftBrace) {
            auto pattern = parse_binding_pattern();
            if(!match(TokenType::Assign)) {
                throw std::runtime_error("Destructuring declaration requires initializer");
            }
            auto init = parse_expression();
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
            node->children.push_back(init);
            return node;
        }

        if(current_token().type != TokenType::Identifier) {
            throw std::runtime_error("Expected identifier in variable declaration");
        }

        std::string name = current_token().value;
        size_t line = current_token().line;
        size_t column = current_token().column;
        current++;

        validateIdentifier(name, line, column);

        std::shared_ptr<ASTNode> initializer = nullptr;
        if(match(TokenType::Assign)) {
            initializer = parse_expression();
        } else if(declType == TokenType::Const) {
            throw std::runtime_error("Missing initializer in const declaration");
        }

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
    };

    // Parse first declarator
    auto first = parse_single_declarator();

    // VariableDeclarationList :: VariableDeclaration | VariableDeclarationList , VariableDeclaration
    // Check for comma-separated additional declarators: var a, b = 1, c;
    if(current_token().type != TokenType::Comma) {
        return first;  // Single declarator - return directly
    }

    // Multiple declarators — wrapped in a "declaration-list" block (see DEVIATION above)
    auto block = ASTFactory::makeBlockStatement();
    block->metadata = "declaration-list";
    ASTFactory::addStatement(block, first);

    while(match(TokenType::Comma)) {
        auto next = parse_single_declarator();
        ASTFactory::addStatement(block, next);
    }

    return block;
}

// 14.3.3 Destructuring Binding Patterns
// BindingPattern :: ObjectBindingPattern | ArrayBindingPattern
// @spec https://tc39.es/ecma262/#sec-destructuring-binding-patterns
std::shared_ptr<ASTNode> Parser::parse_binding_pattern() {
    if(current_token().type == TokenType::LeftBracket) {
        return parse_array_pattern();
    } else if(current_token().type == TokenType::LeftBrace) {
        return parse_object_pattern();
    } else {
        throw std::runtime_error("Expected '[' or '{' for destructuring pattern");
    }
}

// 14.3.3 Destructuring Binding Patterns — ArrayBindingPattern
// ArrayBindingPattern :: [ Elision? BindingRestElement? ]
//                      | [ BindingElementList ]
//                      | [ BindingElementList , Elision? BindingRestElement? ]
// BindingElementList :: BindingElisionElement | BindingElementList , BindingElisionElement
// BindingElisionElement :: Elision? BindingElement
// BindingElement :: SingleNameBinding | BindingPattern Initializer?
// SingleNameBinding :: BindingIdentifier Initializer?
// BindingRestElement :: ... BindingIdentifier | ... BindingPattern
// @spec https://tc39.es/ecma262/#sec-destructuring-binding-patterns
//
// INCOMPLETE: BindingRestElement with nested BindingPattern (e.g., ...[a, b]) is
// not supported — only ...identifier form is handled.
std::shared_ptr<ASTNode> Parser::parse_array_pattern() {
    consume(TokenType::LeftBracket);  // consume '['
    auto pattern = ASTFactory::makeArrayPattern();

    // Handle empty pattern: [ ]
    if(current_token().type == TokenType::RightBracket) {
        current++;
        return pattern;
    }

    while(true) {
        // Elision :: , | Elision ,
        // Holes (elisions) in the pattern: [x, , z]
        if(current_token().type == TokenType::Comma) {
            ASTFactory::addArrayPatternElement(pattern, nullptr);
            current++;  // consume ','
            continue;
        }

        // Check for closing bracket (handles trailing comma)
        if(current_token().type == TokenType::RightBracket) {
            break;
        }

        // BindingRestElement :: ... BindingIdentifier
        if(current_token().type == TokenType::Spread) {
            current++;  // consume '...'
            if(current_token().type != TokenType::Identifier) {
                throw std::runtime_error("Expected identifier after '...' in array pattern");
            }
            auto rest_id = ASTFactory::makeIdentifier(current_token().value);
            current++;  // consume identifier
            auto rest_elem = ASTFactory::makeRestElement(rest_id);
            ASTFactory::addArrayPatternElement(pattern, rest_elem);

            // BindingRestElement must be the last element in ArrayBindingPattern
            if(current_token().type != TokenType::RightBracket) {
                throw std::runtime_error("Rest element must be last in array pattern");
            }
            break;
        }

        // BindingElement :: BindingPattern Initializer? | SingleNameBinding
        std::shared_ptr<ASTNode> element;
        if(current_token().type == TokenType::LeftBracket ||
           current_token().type == TokenType::LeftBrace) {
            // Nested BindingPattern (recursive destructuring)
            element = parse_binding_pattern();
        } else if(current_token().type == TokenType::Identifier) {
            // SingleNameBinding :: BindingIdentifier Initializer?
            element = ASTFactory::makeIdentifier(current_token().value);
            current++;  // consume identifier
        } else {
            throw std::runtime_error("Expected identifier or pattern in array destructuring");
        }

        // Initializer :: = AssignmentExpression
        // Default value: [x = 10]
        if(current_token().type == TokenType::Assign) {
            current++;                                      // consume '='
            auto default_val = parse_binary_expression(1);  // Stop before comma
            element = ASTFactory::makeAssignmentPattern(element, default_val);
        }

        ASTFactory::addArrayPatternElement(pattern, element);

        // Comma separator between elements
        if(current_token().type == TokenType::Comma) {
            current++;  // consume ','
        } else if(current_token().type != TokenType::RightBracket) {
            throw std::runtime_error("Expected ',' or ']' in array pattern");
        }
    }

    consume(TokenType::RightBracket);  // consume ']'
    return pattern;
}

// 14.3.3 Destructuring Binding Patterns — ObjectBindingPattern
// ObjectBindingPattern :: { } | { BindingRestProperty } | { BindingPropertyList }
//                       | { BindingPropertyList , BindingRestProperty? }
// BindingPropertyList :: BindingProperty | BindingPropertyList , BindingProperty
// BindingProperty :: SingleNameBinding | PropertyName : BindingElement
// BindingRestProperty :: ... BindingIdentifier
// SingleNameBinding :: BindingIdentifier Initializer?
// @spec https://tc39.es/ecma262/#sec-destructuring-binding-patterns
//
// INCOMPLETE: Computed property names in object patterns ([expr]: pattern) are not
// supported. Number literal keys are not supported. Only Identifier and String
// property names are recognized.
std::shared_ptr<ASTNode> Parser::parse_object_pattern() {
    consume(TokenType::LeftBrace);  // consume '{'
    auto pattern = ASTFactory::makeObjectPattern();

    // Handle empty pattern: { }
    if(current_token().type == TokenType::RightBrace) {
        current++;
        return pattern;
    }

    while(true) {
        // Check for closing brace (handles trailing comma)
        if(current_token().type == TokenType::RightBrace) {
            break;
        }

        // BindingRestProperty :: ... BindingIdentifier
        if(current_token().type == TokenType::Spread) {
            current++;  // consume '...'
            if(current_token().type != TokenType::Identifier) {
                throw std::runtime_error("Expected identifier after '...' in object pattern");
            }
            auto rest_id = ASTFactory::makeIdentifier(current_token().value);
            current++;  // consume identifier
            auto rest_elem = ASTFactory::makeRestElement(rest_id);
            ASTFactory::addObjectPatternProperty(pattern, rest_elem, nullptr);

            // BindingRestProperty must be the last element
            if(current_token().type != TokenType::RightBrace) {
                throw std::runtime_error("Rest element must be last in object pattern");
            }
            break;
        }

        // PropertyName :: LiteralPropertyName | ComputedPropertyName
        // LiteralPropertyName :: IdentifierName | StringLiteral | NumericLiteral
        // INCOMPLETE: Only IdentifierName and StringLiteral are supported here.
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
            // BindingProperty :: PropertyName : BindingElement
            // Handles {key: pattern}, {key: renamed}, {key: [nested]}
            current++;  // consume ':'

            if(current_token().type == TokenType::LeftBracket ||
               current_token().type == TokenType::LeftBrace) {
                // BindingElement :: BindingPattern Initializer?
                value_pattern = parse_binding_pattern();
            } else if(current_token().type == TokenType::Identifier) {
                // BindingElement :: SingleNameBinding
                value_pattern = ASTFactory::makeIdentifier(current_token().value);
                current++;  // consume identifier
            } else {
                throw std::runtime_error(
                    "Expected identifier or pattern after ':' in object pattern");
            }

            // Initializer :: = AssignmentExpression
            // Default value after renaming: {key: renamed = 10}
            if(current_token().type == TokenType::Assign) {
                current++;  // consume '='
                auto default_val = parse_binary_expression(1);
                value_pattern = ASTFactory::makeAssignmentPattern(value_pattern, default_val);
            }
        } else if(current_token().type == TokenType::Assign) {
            // SingleNameBinding :: BindingIdentifier Initializer
            // Shorthand with default: {key = 10}
            current++;  // consume '='
            auto default_val = parse_binary_expression(1);
            value_pattern = ASTFactory::makeAssignmentPattern(ASTFactory::makeIdentifier(key_name),
                                                              default_val);
        } else {
            // SingleNameBinding :: BindingIdentifier (shorthand, no initializer)
            // Shorthand: {key} — key and variable name are the same
            value_pattern = ASTFactory::makeIdentifier(key_name);
        }

        ASTFactory::addObjectPatternProperty(pattern, key, value_pattern);

        // Comma separator between properties
        if(current_token().type == TokenType::Comma) {
            current++;  // consume ','
        } else if(current_token().type != TokenType::RightBrace) {
            throw std::runtime_error("Expected ',' or '}' in object pattern");
        }
    }

    consume(TokenType::RightBrace);  // consume '}'
    return pattern;
}

// 14.6 The if Statement
// IfStatement :: if ( Expression ) Statement else Statement
//              | if ( Expression ) Statement
// @spec https://tc39.es/ecma262/#sec-if-statement
std::shared_ptr<ASTNode> Parser::parse_if_statement() {
    consume(TokenType::If);          // if
    consume(TokenType::LeftParen);   // (

    // Expression — the condition
    auto condition = parse_expression();

    consume(TokenType::RightParen);  // )

    // Statement — the consequent (then branch)
    auto then_statement = parse_statement();

    // Optional: else Statement
    std::shared_ptr<ASTNode> else_statement = nullptr;
    if(current_token().type == TokenType::Else) {
        current++;  // consume 'else'
        else_statement = parse_statement();
    }

    return ASTFactory::makeIfStatement(condition, then_statement, else_statement);
}

// 14.7.2 The while Statement
// IterationStatement :: while ( Expression ) Statement
// @spec https://tc39.es/ecma262/#sec-while-statement
std::shared_ptr<ASTNode> Parser::parse_while_statement() {
    consume(TokenType::While);       // while
    consume(TokenType::LeftParen);   // (

    // Expression — loop condition
    auto condition = parse_expression();

    consume(TokenType::RightParen);  // )

    // Statement — loop body
    auto body = parse_statement();

    return ASTFactory::makeWhileStatement(condition, body);
}

// 14.7.1 The do-while Statement
// IterationStatement :: do Statement while ( Expression ) ;
// @spec https://tc39.es/ecma262/#sec-do-while-statement
std::shared_ptr<ASTNode> Parser::parse_do_while_statement() {
    consume(TokenType::Do);          // do

    // Statement — loop body (executed at least once)
    auto body = parse_statement();

    consume(TokenType::While);       // while
    consume(TokenType::LeftParen);   // (

    // Expression — loop condition
    auto condition = parse_expression();

    consume(TokenType::RightParen);  // )

    // The spec requires a semicolon after do-while (unlike other iteration statements)
    consume(TokenType::Semicolon);   // ;

    return ASTFactory::makeDoWhileStatement(body, condition);
}

// Helper to check for the contextual keyword "of" — used in for-of statements.
// "of" is not a reserved word; it is lexed as an Identifier and recognized
// contextually per 14.7.5 (ForInOfStatement).
static bool isContextualOf(const Token& tok) {
    return tok.type == TokenType::Identifier && tok.value == "of";
}

// 14.7.4 The for Statement / 14.7.5 The for-in and for-of Statements
// IterationStatement ::
//     for ( [lookahead != let [] Expression? ; Expression? ; Expression? ) Statement
//     for ( var VariableDeclarationList ; Expression? ; Expression? ) Statement
//     for ( LexicalDeclaration Expression? ; Expression? ) Statement
//     for ( [lookahead != let] LeftHandSideExpression in Expression ) Statement
//     for ( var ForBinding in Expression ) Statement
//     for ( ForDeclaration in Expression ) Statement
//     for ( [lookahead != let] LeftHandSideExpression of AssignmentExpression ) Statement
//     for ( var ForBinding of AssignmentExpression ) Statement
//     for ( ForDeclaration of AssignmentExpression ) Statement
//     for await ( [lookahead != let] LeftHandSideExpression of AssignmentExpression ) Statement
//     for await ( var ForBinding of AssignmentExpression ) Statement
//     for await ( ForDeclaration of AssignmentExpression ) Statement
// ForDeclaration :: LetOrConst ForBinding
// ForBinding :: BindingIdentifier | BindingPattern
// @spec https://tc39.es/ecma262/#sec-for-statement
// @spec https://tc39.es/ecma262/#sec-for-in-and-for-of-statements
//
// This method handles all for-loop variants (for, for-in, for-of, for-await-of)
// by attempting to parse the initializer and then checking for 'in' or 'of' to
// determine which variant is being used. This requires occasional backtracking.
std::shared_ptr<ASTNode> Parser::parse_for_statement() {
    consume(TokenType::For);  // for

    // for-await-of: only valid in async context
    // for await ( ForDeclaration of AssignmentExpression ) Statement
    bool is_for_await = false;
    if(current_token().type == TokenType::Await) {
        if(!in_async_context_) {
            throw std::runtime_error(
                "SyntaxError: for-await-of is only valid in async functions and async generators");
        }
        is_for_await = true;
        current++;  // consume 'await'
    }

    consume(TokenType::LeftParen);  // (

    // Disambiguate for-in/for-of from regular for by parsing the initializer
    // and then checking if the next token is 'in' or 'of'.
    std::shared_ptr<ASTNode> left = nullptr;
    bool is_for_in = false;

    // Case 1: for ( var/let/const ForBinding in/of Expression )
    //    or:  for ( var/let/const VariableDeclarationList ; ... )
    if(current_token().type == TokenType::Var || current_token().type == TokenType::Let ||
       current_token().type == TokenType::Const) {
        TokenType decl_type = current_token().type;
        current++;  // consume var/let/const

        if(current_token().type == TokenType::Identifier) {
            std::string var_name = current_token().value;
            current++;  // consume identifier

            // ForBinding :: BindingIdentifier
            // Check if followed by 'in' (for-in) or 'of' (for-of)
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
            // ForBinding :: BindingPattern
            // ForDeclaration :: LetOrConst ForBinding
            // Could be for-in/for-of with destructuring or regular for with destructuring init
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
        // Case 2: for ( LeftHandSideExpression in/of Expression )
        //    or:  for ( Expression ; ... )
        // Try to detect for-in/for-of with bare identifier: for (x in obj), for (x of arr)
        std::string var_name = current_token().value;
        current++;  // consume identifier

        if(current_token().type == TokenType::In || isContextualOf(current_token())) {
            // for ( LeftHandSideExpression in Expression ) or for ( ... of AssignmentExpression )
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
        // Case 3: for ( Expression ; ... ) — expression initializer
        left = parse_expression();
    }
    // else: for ( ; ... ) — empty initialization

    // Regular for statement:
    // for ( Expression? ; Expression? ; Expression? ) Statement
    consume(TokenType::Semicolon);  // first ';'

    // Condition expression (optional)
    std::shared_ptr<ASTNode> condition = nullptr;
    if(current_token().type != TokenType::Semicolon) {
        condition = parse_expression();
    }

    consume(TokenType::Semicolon);  // second ';'

    // Update expression (optional)
    std::shared_ptr<ASTNode> update = nullptr;
    if(current_token().type != TokenType::RightParen) {
        update = parse_expression();
    }

    consume(TokenType::RightParen);  // )

    // Statement — loop body
    auto body = parse_statement();

    return ASTFactory::makeForStatement(left, condition, update, body);
}

// 14.12 The switch Statement
// SwitchStatement :: switch ( Expression ) CaseBlock
// CaseBlock :: { CaseClauses? DefaultClause? CaseClauses? }
// CaseClauses :: CaseClause | CaseClauses CaseClause
// CaseClause :: case Expression : StatementList?
// DefaultClause :: default : StatementList?
// @spec https://tc39.es/ecma262/#sec-switch-statement
std::shared_ptr<ASTNode> Parser::parse_switch_statement() {
    consume(TokenType::Switch);      // switch
    consume(TokenType::LeftParen);   // (

    // Expression — the discriminant to match against
    auto discriminant = parse_expression();

    consume(TokenType::RightParen);  // )
    consume(TokenType::LeftBrace);   // { (beginning of CaseBlock)

    auto switchNode = ASTFactory::makeSwitchStatement(discriminant);

    // CaseBlock :: { CaseClauses? DefaultClause? CaseClauses? }
    while(current_token().type != TokenType::RightBrace &&
          current_token().type != TokenType::EndOfFile) {
        if(current_token().type == TokenType::Case) {
            // CaseClause :: case Expression : StatementList?
            current++;  // consume 'case'
            auto test = parse_expression();
            consume(TokenType::Colon);  // :

            auto caseClause = ASTFactory::makeCaseClause(test);

            // StatementList? — parse until next case/default/}
            while(current_token().type != TokenType::Case &&
                  current_token().type != TokenType::Default &&
                  current_token().type != TokenType::RightBrace &&
                  current_token().type != TokenType::EndOfFile) {
                auto stmt = parse_statement();
                ASTFactory::addCaseStatement(caseClause, stmt);
            }

            ASTFactory::addSwitchCase(switchNode, caseClause);

        } else if(current_token().type == TokenType::Default) {
            // DefaultClause :: default : StatementList?
            current++;                  // consume 'default'
            consume(TokenType::Colon);  // :

            auto defaultClause = ASTFactory::makeDefaultClause();

            // StatementList? — parse until next case/}
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

    consume(TokenType::RightBrace);  // } (end of CaseBlock)
    return switchNode;
}

// 15.2 Function Definitions
// FunctionDeclaration :: function BindingIdentifier ( FormalParameters ) { FunctionBody }
// FunctionBody :: FunctionStatementList
// FunctionStatementList :: StatementList?
// @spec https://tc39.es/ecma262/#sec-function-definitions
std::shared_ptr<ASTNode> Parser::parse_function_declaration() {
    Token& startToken = current_token();
    consume(TokenType::Function);         // function

    // BindingIdentifier — function name (required for declarations)
    if(current_token().type != TokenType::Identifier) {
        throw std::runtime_error("Expected function name");
    }
    std::string name = current_token().value;
    size_t nameLine = current_token().line;
    size_t nameColumn = current_token().column;
    current++;  // consume function name

    // Static Semantics: Early Errors — BindingIdentifier must not be a strict reserved word
    validateIdentifier(name, nameLine, nameColumn);

    // ( FormalParameters )
    consume(TokenType::LeftParen);
    auto parameters = parse_parameter_list();
    consume(TokenType::RightParen);

    // { FunctionBody }
    auto body = parse_block_statement();

    auto node = ASTFactory::makeFunctionDeclaration(name, parameters, body);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

// 15.1 Parameter Lists
// FormalParameters :: [empty] | FunctionRestParameter | FormalParameterList
//                   | FormalParameterList , | FormalParameterList , FunctionRestParameter
// FormalParameterList :: FormalParameter | FormalParameterList , FormalParameter
// FunctionRestParameter :: BindingRestElement
// FormalParameter :: BindingElement
// BindingElement :: SingleNameBinding | BindingPattern Initializer?
// SingleNameBinding :: BindingIdentifier Initializer?
// BindingRestElement :: ... BindingIdentifier | ... BindingPattern
// @spec https://tc39.es/ecma262/#sec-parameter-lists
//
// INCOMPLETE: BindingPattern parameters (destructuring in parameter position,
// e.g., function f({a, b}) {}) are not supported. Only BindingIdentifier
// parameters are handled.
std::shared_ptr<ASTNode> Parser::parse_parameter_list() {
    auto parameters = ASTFactory::makeParameterList();
    bool has_rest_param = false;
    std::unordered_set<std::string> seen_params;

    // FormalParameters :: [empty]
    if(current_token().type == TokenType::RightParen) {
        return parameters;
    }

    // Parses a single FormalParameter or FunctionRestParameter
    auto parse_single_parameter = [this, &has_rest_param,
                                   &seen_params]() -> std::shared_ptr<ASTNode> {
        // FunctionRestParameter :: BindingRestElement :: ... BindingIdentifier
        bool is_rest = false;
        if(current_token().type == TokenType::Spread) {
            if(has_rest_param) {
                throw std::runtime_error("Rest parameter must be last formal parameter");
            }
            is_rest = true;
            has_rest_param = true;
            current++;  // consume '...'
        }

        // BindingElement :: SingleNameBinding | BindingPattern Initializer?
        // SingleNameBinding :: BindingIdentifier Initializer?
        // BindingPattern :: ObjectBindingPattern | ArrayBindingPattern

        // Destructuring pattern parameter: { ... } or [ ... ]
        if(current_token().type == TokenType::LeftBrace ||
           current_token().type == TokenType::LeftBracket) {
            auto pattern = parse_binding_pattern();

            // BindingRestElement cannot have an Initializer
            if(is_rest) {
                auto rest_node = ASTFactory::makeRestElement(pattern);
                return rest_node;
            }

            // Initializer :: = AssignmentExpression
            if(current_token().type == TokenType::Assign) {
                current++;  // consume '='
                auto default_value = parse_binary_expression(1);
                return ASTFactory::makeAssignmentPattern(pattern, default_value);
            }

            return pattern;
        }

        if(current_token().type != TokenType::Identifier) {
            throw std::runtime_error("Expected parameter name");
        }
        std::string paramValue = current_token().value;
        size_t paramLine = current_token().line;
        size_t paramColumn = current_token().column;
        auto param_name = ASTFactory::makeIdentifier(paramValue);
        current++;  // consume parameter name

        // Static Semantics: Early Errors — BindingIdentifier must not be strict reserved word
        validateIdentifier(paramValue, paramLine, paramColumn);

        // Static Semantics: Early Errors — It is a Syntax Error if FormalParameters
        // contains any duplicate parameter names in strict mode code.
        if(in_strict_mode_) {
            if(seen_params.count(paramValue)) {
                throw std::runtime_error(
                    "SyntaxError: Duplicate parameter name not allowed in this context at line " +
                    std::to_string(paramLine) + ":" + std::to_string(paramColumn));
            }
            seen_params.insert(paramValue);
        }

        // BindingRestElement cannot have an Initializer
        if(is_rest) {
            param_name->metadata = "rest";  // Mark as rest parameter
            return param_name;
        }

        // Initializer :: = AssignmentExpression
        // Default parameter values
        if(current_token().type == TokenType::Assign) {
            current++;  // consume '='
            // Parse default value — use precedence 1 to stop before comma
            auto default_value = parse_binary_expression(1);
            return ASTFactory::makeAssignmentExpression(param_name, default_value);
        }

        return param_name;
    };

    // FormalParameterList :: FormalParameter | FormalParameterList , FormalParameter
    ASTFactory::addParameter(parameters, parse_single_parameter());

    while(match(TokenType::Comma)) {
        // FunctionRestParameter must be last
        if(has_rest_param) {
            throw std::runtime_error("Rest parameter must be last formal parameter");
        }
        // Trailing comma: FormalParameterList ,
        if(current_token().type == TokenType::RightParen) {
            break;
        }
        ASTFactory::addParameter(parameters, parse_single_parameter());
    }

    return parameters;
}

// 14.10 The return Statement
// ReturnStatement :: return ; | return [no LineTerminator here] Expression ;
// @spec https://tc39.es/ecma262/#sec-return-statement
//
// INCOMPLETE: The spec requires [no LineTerminator here] between 'return' and the
// expression (ASI should insert a semicolon if there is a newline). Rift does not
// currently enforce this restriction — a newline after 'return' will not trigger ASI.
std::shared_ptr<ASTNode> Parser::parse_return_statement() {
    consume(TokenType::Return);  // return

    // Expression (optional — bare 'return;' returns undefined)
    std::shared_ptr<ASTNode> argument = nullptr;
    if(current_token().type != TokenType::Semicolon) {
        argument = parse_expression();
    }

    match(TokenType::Semicolon);  // optional ;
    return ASTFactory::makeReturnStatement(argument);
}

// 14.14 The throw Statement
// ThrowStatement :: throw [no LineTerminator here] Expression ;
// @spec https://tc39.es/ecma262/#sec-throw-statement
//
// Unlike ReturnStatement, the Expression is mandatory — 'throw;' alone is a
// SyntaxError per the spec.
//
// INCOMPLETE: The [no LineTerminator here] restriction is not enforced. A newline
// between 'throw' and the expression should trigger ASI, making it 'throw;' which
// is a SyntaxError. Rift does not currently detect this case.
std::shared_ptr<ASTNode> Parser::parse_throw_statement() {
    consume(TokenType::Throw);  // throw

    // Expression is required (unlike return)
    if(current_token().type == TokenType::Semicolon ||
       current_token().type == TokenType::EndOfFile) {
        throw std::runtime_error("Missing throw expression");
    }

    auto argument = parse_expression();
    match(TokenType::Semicolon);  // optional ;
    return ASTFactory::makeThrowStatement(argument);
}

// 14.15 The try Statement
// TryStatement :: try Block Catch
//              | try Block Finally
//              | try Block Catch Finally
// Catch :: catch ( CatchParameter ) Block
//        | catch Block
// Finally :: finally Block
// CatchParameter :: BindingIdentifier | BindingPattern
// @spec https://tc39.es/ecma262/#sec-try-statement
std::shared_ptr<ASTNode> Parser::parse_try_statement() {
    consume(TokenType::Try);  // try

    // Block — the try block
    auto tryBlock = parse_block_statement();

    // Catch (optional if Finally present)
    std::shared_ptr<ASTNode> catchClause = nullptr;
    if(current_token().type == TokenType::Catch) {
        catchClause = parse_catch_clause();
    }

    // Finally (optional if Catch present)
    // Finally :: finally Block
    std::shared_ptr<ASTNode> finallyClause = nullptr;
    if(current_token().type == TokenType::Finally) {
        current++;  // consume 'finally'
        finallyClause = ASTFactory::makeFinallyClause(parse_block_statement());
    }

    // TryStatement requires at least one of Catch or Finally
    if(!catchClause && !finallyClause) {
        throw std::runtime_error("Missing catch or finally clause after try block");
    }

    return ASTFactory::makeTryStatement(tryBlock, catchClause, finallyClause);
}

// 14.15 The try Statement — Catch clause
// Catch :: catch ( CatchParameter ) Block | catch Block
// CatchParameter :: BindingIdentifier | BindingPattern
// @spec https://tc39.es/ecma262/#sec-try-statement
//
// INCOMPLETE: The optional catch binding (catch without parameter, e.g., catch {})
// introduced in ES2019 is not supported. A CatchParameter is always required.
// Also, BindingPattern in CatchParameter (e.g., catch ({message}) {}) is not
// supported — only BindingIdentifier is handled.
std::shared_ptr<ASTNode> Parser::parse_catch_clause() {
    consume(TokenType::Catch);      // catch
    consume(TokenType::LeftParen);  // (

    // CatchParameter :: BindingIdentifier
    if(current_token().type != TokenType::Identifier) {
        throw std::runtime_error("Expected identifier in catch clause");
    }
    std::string parameter = current_token().value;
    size_t paramLine = current_token().line;
    size_t paramColumn = current_token().column;
    current++;  // consume parameter name

    // Static Semantics: Early Errors — CatchParameter must not be a strict reserved word
    validateIdentifier(parameter, paramLine, paramColumn);

    consume(TokenType::RightParen);  // )

    // Block — the catch body
    auto body = parse_block_statement();

    return ASTFactory::makeCatchClause(parameter, body);
}

// 14.2 Block Statement
// Block :: { StatementList? }
// StatementList :: StatementListItem | StatementList StatementListItem
// StatementListItem :: Statement | Declaration
// @spec https://tc39.es/ecma262/#sec-block
std::shared_ptr<ASTNode> Parser::parse_block_statement() {
    consume(TokenType::LeftBrace);  // {
    auto block = ASTFactory::makeBlockStatement();

    // StatementList — parse StatementListItems until '}'
    while(current_token().type != TokenType::RightBrace &&
          current_token().type != TokenType::EndOfFile) {
        auto stmt = parse_statement();
        ASTFactory::addStatement(block, stmt);
    }

    consume(TokenType::RightBrace);  // }
    return block;
}

// 14.11 The with Statement
// WithStatement :: with ( Expression ) Statement
// @spec https://tc39.es/ecma262/#sec-with-statement
//
// Static Semantics: Early Errors — It is a Syntax Error if the code matched by
// this production is contained in strict mode code.
//
// INCOMPLETE: The with statement is parsed for syntax validation but not evaluated.
// In non-strict mode, parsing succeeds but evaluation throws a runtime error.
// The spec defines with-statement evaluation in terms of creating an object
// environment record, which is not implemented.
std::shared_ptr<ASTNode> Parser::parse_with_statement() {
    size_t with_line = current_token().line;
    size_t with_column = current_token().column;
    consume(TokenType::With);  // with

    // Early Error: with statement is forbidden in strict mode
    if(in_strict_mode_) {
        throw std::runtime_error(
            "SyntaxError: Strict mode code may not include a with statement at line " +
            std::to_string(with_line) + ":" + std::to_string(with_column));
    }

    // Non-strict mode: parse the syntax but throw not-implemented at the end
    consume(TokenType::LeftParen);   // (
    parse_expression();              // Expression
    consume(TokenType::RightParen);  // )
    auto body = parse_statement();   // Statement
    throw std::runtime_error("'with' statement is not supported");
}

// 14.9 The break Statement
// BreakStatement :: break ; | break [no LineTerminator here] LabelIdentifier ;
// @spec https://tc39.es/ecma262/#sec-break-statement
//
// INCOMPLETE: Labelled break (break label;) is not supported. Only the unlabelled
// form is parsed. The [no LineTerminator here] restriction is also not enforced.
std::shared_ptr<ASTNode> Parser::parse_break_statement() {
    consume(TokenType::Break);    // break
    match(TokenType::Semicolon);  // optional ;
    return ASTFactory::makeBreakStatement();
}

// 14.8 The continue Statement
// ContinueStatement :: continue ; | continue [no LineTerminator here] LabelIdentifier ;
// @spec https://tc39.es/ecma262/#sec-continue-statement
//
// INCOMPLETE: Labelled continue (continue label;) is not supported. Only the
// unlabelled form is parsed. The [no LineTerminator here] restriction is also
// not enforced.
std::shared_ptr<ASTNode> Parser::parse_continue_statement() {
    consume(TokenType::Continue);  // continue
    match(TokenType::Semicolon);   // optional ;
    return ASTFactory::makeContinueStatement();
}

// ============================================================================
// 15.7 Class Definitions
// @spec https://tc39.es/ecma262/#sec-class-definitions
// ============================================================================

// 15.7 Class Definitions — ClassDeclaration
// ClassDeclaration :: class BindingIdentifier ClassTail
// ClassTail :: ClassHeritage? { ClassBody? }
// ClassHeritage :: extends LeftHandSideExpression
// @spec https://tc39.es/ecma262/#sec-class-definitions
std::shared_ptr<ASTNode> Parser::parse_class_declaration() {
    Token& startToken = current_token();
    consume(TokenType::Class);  // class

    // BindingIdentifier — class name (required for declarations)
    if(current_token().type != TokenType::Identifier) {
        throw std::runtime_error("Expected class name");
    }
    std::string name = current_token().value;
    size_t nameLine = current_token().line;
    size_t nameColumn = current_token().column;
    current++;  // consume class name

    // Static Semantics: Early Errors — BindingIdentifier must not be strict reserved word
    validateIdentifier(name, nameLine, nameColumn);

    // ClassHeritage :: extends LeftHandSideExpression (optional)
    std::shared_ptr<ASTNode> superClass = nullptr;
    if(current_token().type == TokenType::Extends) {
        current++;  // consume 'extends'
        superClass = parse_expression();
    }

    // { ClassBody? }
    auto body = parse_class_body();

    auto node = ASTFactory::makeClassDeclaration(name, superClass, body);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

// 15.7 Class Definitions — ClassExpression
// ClassExpression :: class BindingIdentifier? ClassTail
// ClassTail :: ClassHeritage? { ClassBody? }
// @spec https://tc39.es/ecma262/#sec-class-definitions
std::shared_ptr<ASTNode> Parser::parse_class_expression() {
    Token& startToken = current_token();
    consume(TokenType::Class);  // class

    // BindingIdentifier (optional for expressions — anonymous classes allowed)
    std::string name;
    if(current_token().type == TokenType::Identifier) {
        name = current_token().value;
        size_t nameLine = current_token().line;
        size_t nameColumn = current_token().column;
        current++;  // consume class name
        validateIdentifier(name, nameLine, nameColumn);
    }

    // ClassHeritage :: extends LeftHandSideExpression (optional)
    std::shared_ptr<ASTNode> superClass = nullptr;
    if(current_token().type == TokenType::Extends) {
        current++;  // consume 'extends'
        superClass = parse_expression();
    }

    // { ClassBody? }
    auto body = parse_class_body();

    auto node = ASTFactory::makeClassExpression(name, superClass, body);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

// 15.7 Class Definitions — ClassBody
// ClassBody :: ClassElementList
// ClassElementList :: ClassElement | ClassElementList ClassElement
// ClassElement :: MethodDefinition | static MethodDefinition | FieldDefinition ;
//              | static FieldDefinition ; | ClassStaticBlock | ;
// @spec https://tc39.es/ecma262/#sec-class-definitions
//
// INCOMPLETE: FieldDefinition (class fields) and ClassStaticBlock (static { })
// are not supported. Only MethodDefinition and static MethodDefinition are parsed.
std::shared_ptr<ASTNode> Parser::parse_class_body() {
    consume(TokenType::LeftBrace);  // {

    auto body = ASTFactory::makeClassBody();
    bool has_constructor = false;

    // ClassElementList — parse ClassElements until '}'
    while(current_token().type != TokenType::RightBrace &&
          current_token().type != TokenType::EndOfFile) {
        // ClassElement :: ; (empty class element, skip)
        if(current_token().type == TokenType::Semicolon) {
            current++;
            continue;
        }

        auto method = parse_method_definition();

        // 15.7.1 Static Semantics: Early Errors
        // It is a Syntax Error if PrototypePropertyNameList of ClassElementList
        // contains more than one occurrence of "constructor".
        bool is_static_method = (method->metadata.find("static") != std::string::npos);
        bool is_getter_or_setter = (method->metadata.find("getter") != std::string::npos ||
                                    method->metadata.find("setter") != std::string::npos);
        if(!is_static_method && !is_getter_or_setter && method->value == "constructor") {
            if(has_constructor) {
                throw std::runtime_error(
                    "SyntaxError: A class may only have one constructor");
            }
            has_constructor = true;
        }

        ASTFactory::addMethodToClassBody(body, method);
    }

    consume(TokenType::RightBrace);  // }
    return body;
}

// 15.4 Method Definitions
// MethodDefinition :: ClassElementName ( UniqueFormalParameters ) { FunctionBody }
//                   | GeneratorMethod | AsyncMethod | AsyncGeneratorMethod
//                   | get ClassElementName ( ) { FunctionBody }
//                   | set ClassElementName ( PropertySetParameterList ) { FunctionBody }
// ClassElementName :: PropertyName | PrivateIdentifier
// PropertyName :: LiteralPropertyName | ComputedPropertyName
// LiteralPropertyName :: IdentifierName | StringLiteral | NumericLiteral
// ComputedPropertyName :: [ AssignmentExpression ]
// @spec https://tc39.es/ecma262/#sec-method-definitions
//
// This method handles all MethodDefinition variants including:
// - Regular methods
// - Static methods (static keyword prefix)
// - Generator methods (15.5 — * prefix)
// - Async methods (15.8 — async prefix)
// - Getter/setter accessors (get/set prefix)
// - Computed property names ([expr])
//
// INCOMPLETE: PrivateIdentifier (#name) is not supported. AsyncGeneratorMethod
// (async * name()) is not supported as a distinct AST node type.
std::shared_ptr<ASTNode> Parser::parse_method_definition() {
    Token& startToken = current_token();
    bool isStatic = false;
    bool isComputed = false;
    bool isGenerator = false;
    bool isAsync = false;
    std::string methodName;
    std::shared_ptr<ASTNode> computedKey = nullptr;

    // ClassElement :: static MethodDefinition
    if(current_token().type == TokenType::Static) {
        isStatic = true;
        current++;  // consume 'static'
    }

    // AsyncMethod :: async [no LineTerminator here] ClassElementName (...)
    // Disambiguate: if followed by '(' then 'async' is the method name itself
    if(current_token().type == TokenType::Async && peek_token().type != TokenType::LeftParen) {
        isAsync = true;
        current++;  // consume 'async'
    }

    // GeneratorMethod :: * ClassElementName ( UniqueFormalParameters ) { GeneratorBody }
    if(current_token().type == TokenType::Multiply) {
        isGenerator = true;
        current++;  // consume '*'
    }

    // get/set accessor methods:
    // MethodDefinition :: get ClassElementName ( ) { FunctionBody }
    //                   | set ClassElementName ( PropertySetParameterList ) { FunctionBody }
    // Disambiguate from a method literally named "get"/"set" by checking if
    // the next token is a valid ClassElementName start (not '(')
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

    // ClassElementName :: PropertyName
    // PropertyName :: ComputedPropertyName | LiteralPropertyName
    if(current_token().type == TokenType::LeftBracket) {
        // ComputedPropertyName :: [ AssignmentExpression ]
        isComputed = true;
        current++;  // consume '['
        computedKey = parse_expression();
        consume(TokenType::RightBracket);
    } else if(current_token().type == TokenType::Identifier) {
        // LiteralPropertyName :: IdentifierName
        methodName = current_token().value;
        size_t methodLine = current_token().line;
        size_t methodColumn = current_token().column;
        current++;  // consume identifier
        validateIdentifier(methodName, methodLine, methodColumn);
    } else if(current_token().type == TokenType::String) {
        // LiteralPropertyName :: StringLiteral
        methodName = current_token().value;
        current++;  // consume string
    } else if(current_token().type == TokenType::Number) {
        // LiteralPropertyName :: NumericLiteral
        methodName = current_token().value;
        current++;  // consume number
    } else {
        throw std::runtime_error("Expected method name in class body");
    }

    // ( FormalParameters ) or ( UniqueFormalParameters )
    consume(TokenType::LeftParen);
    auto parameters = parse_parameter_list();
    consume(TokenType::RightParen);

    // 15.4.1 Static Semantics: Early Errors
    // Getter must have exactly 0 parameters, setter must have exactly 1 parameter.
    if(isGetter && !parameters->children.empty()) {
        throw std::runtime_error(
            "SyntaxError: Getter must not have any formal parameters");
    }
    if(isSetter && parameters->children.size() != 1) {
        throw std::runtime_error(
            "SyntaxError: Setter must have exactly one formal parameter");
    }

    // { FunctionBody } — parse with appropriate context flags for yield/await
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

    // Mark getter/setter in metadata for the evaluator
    if(isGetter) {
        node->metadata = node->metadata.empty() ? "getter" : node->metadata + ",getter";
    } else if(isSetter) {
        node->metadata = node->metadata.empty() ? "setter" : node->metadata + ",setter";
    }

    node->setLocation(startToken.line, startToken.column);
    return node;
}

// ============================================================================
// 15.5 Generator Function Definitions
// @spec https://tc39.es/ecma262/#sec-generator-function-definitions
// ============================================================================

// 15.5 Generator Function Definitions — GeneratorDeclaration
// GeneratorDeclaration :: function * BindingIdentifier ( FormalParameters ) { GeneratorBody }
// GeneratorBody :: FunctionBody
// @spec https://tc39.es/ecma262/#sec-generator-function-definitions
std::shared_ptr<ASTNode> Parser::parse_generator_function_declaration() {
    Token& startToken = current_token();
    consume(TokenType::Function);  // function
    consume(TokenType::Multiply);  // *

    // BindingIdentifier — generator name (required for declarations)
    if(current_token().type != TokenType::Identifier) {
        throw std::runtime_error("Expected generator function name");
    }
    std::string name = current_token().value;
    size_t nameLine = current_token().line;
    size_t nameColumn = current_token().column;
    current++;  // consume function name

    // Static Semantics: Early Errors
    validateIdentifier(name, nameLine, nameColumn);

    // ( FormalParameters )
    consume(TokenType::LeftParen);
    auto parameters = parse_parameter_list();
    consume(TokenType::RightParen);

    // { GeneratorBody } — enable generator context so yield is recognized
    bool was_in_generator = in_generator_context_;
    in_generator_context_ = true;
    auto body = parse_block_statement();
    in_generator_context_ = was_in_generator;

    auto node = ASTFactory::makeGeneratorFunctionDeclaration(name, parameters, body);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

// 15.5 Generator Function Definitions — GeneratorExpression
// GeneratorExpression :: function * BindingIdentifier? ( FormalParameters ) { GeneratorBody }
// @spec https://tc39.es/ecma262/#sec-generator-function-definitions
std::shared_ptr<ASTNode> Parser::parse_generator_function_expression() {
    Token& startToken = current_token();
    consume(TokenType::Function);  // function
    consume(TokenType::Multiply);  // *

    // BindingIdentifier (optional — anonymous generator expressions allowed)
    std::string name;
    if(current_token().type == TokenType::Identifier) {
        name = current_token().value;
        size_t nameLine = current_token().line;
        size_t nameColumn = current_token().column;
        current++;  // consume function name
        validateIdentifier(name, nameLine, nameColumn);
    }

    // ( FormalParameters )
    consume(TokenType::LeftParen);
    auto parameters = parse_parameter_list();
    consume(TokenType::RightParen);

    // { GeneratorBody } — enable generator context so yield is recognized
    bool was_in_generator = in_generator_context_;
    in_generator_context_ = true;
    auto body = parse_block_statement();
    in_generator_context_ = was_in_generator;

    auto node = ASTFactory::makeGeneratorFunctionExpression(parameters, body, name);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

// ============================================================================
// 15.8 Async Function Definitions
// @spec https://tc39.es/ecma262/#sec-async-function-definitions
// ============================================================================

// 15.8 Async Function Definitions — AsyncFunctionDeclaration
// AsyncFunctionDeclaration :: async [no LineTerminator here] function BindingIdentifier
//                             ( FormalParameters ) { AsyncFunctionBody }
// AsyncFunctionBody :: FunctionBody
// @spec https://tc39.es/ecma262/#sec-async-function-definitions
//
// INCOMPLETE: The [no LineTerminator here] restriction between 'async' and 'function'
// is not enforced. A newline between them should cause 'async' to be parsed as an
// identifier expression statement, not as the start of an async function.
std::shared_ptr<ASTNode> Parser::parse_async_function_declaration() {
    Token& startToken = current_token();
    consume(TokenType::Async);     // async
    consume(TokenType::Function);  // function

    // BindingIdentifier — async function name (required for declarations)
    if(current_token().type != TokenType::Identifier) {
        throw std::runtime_error("Expected async function name");
    }
    std::string name = current_token().value;
    size_t nameLine = current_token().line;
    size_t nameColumn = current_token().column;
    current++;  // consume function name

    // Static Semantics: Early Errors
    validateIdentifier(name, nameLine, nameColumn);

    // ( FormalParameters )
    consume(TokenType::LeftParen);
    auto parameters = parse_parameter_list();
    consume(TokenType::RightParen);

    // { AsyncFunctionBody } — enable async context so await is recognized
    bool was_in_async = in_async_context_;
    in_async_context_ = true;
    auto body = parse_block_statement();
    in_async_context_ = was_in_async;

    auto node = ASTFactory::makeAsyncFunctionDeclaration(name, parameters, body);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

}  // namespace rift::frontend
