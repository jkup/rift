// ============================================================================
// ECMA-262 -- Expression Parsing (Chapter 13)
// Implements syntactic grammar productions for expressions:
//   - Primary expressions: literals, identifiers, this, arrays, objects (13.2)
//   - Left-hand-side: member access, calls, new, optional chaining (13.3)
//   - Update and unary operators (13.4-13.5)
//   - Binary operators via precedence climbing (13.6-13.13)
//   - Conditional, assignment, comma (13.14-13.16)
//   - Arrow function expressions (15.3)
//   - Async function / async arrow expressions (15.8)
//   - Template literals (13.2.8)
//   - Spread element, yield, await
// @spec https://tc39.es/ecma262/#sec-ecmascript-language-expressions-and-operators
//
// See also: parser.cpp (core utilities, parameter lists, statement dispatch)
//           parser_statements.cpp (statements, class expressions, generator expressions)
// ============================================================================

#include <iostream>
#include <stdexcept>

#include "rift/frontend/parser/parser.h"

namespace rift::frontend {

using namespace rift::ast;
using ASTFactory = ast::ASTFactory;

// 13.2 Primary Expression
// PrimaryExpression :: this | IdentifierReference | Literal | ArrayLiteral |
//                      ObjectLiteral | FunctionExpression | ClassExpression |
//                      GeneratorExpression | AsyncFunctionExpression |
//                      RegularExpressionLiteral | TemplateLiteral |
//                      CoverParenthesizedExpressionAndArrowParameterList
// @spec https://tc39.es/ecma262/#sec-primary-expression
//
// Also handles productions that appear in primary position but are defined
// elsewhere in the spec:
//   - 15.3 ArrowFunction (via CoverParenthesizedExpressionAndArrowParameterList)
//   - 15.8 AsyncFunctionExpression / AsyncArrowFunction
//   - 14.4 YieldExpression (parsed here when encountered in primary position)
//   - 15.8.1 AwaitExpression
//   - 13.3.7 SuperProperty / SuperCall
std::shared_ptr<ASTNode> Parser::parse_primary() {
    Token& token = current_token();

    switch(token.type) {
        // 13.2.1 Literals
        // Literal :: NullLiteral | BooleanLiteral | NumericLiteral | StringLiteral
        // @spec https://tc39.es/ecma262/#sec-literals
        // DEVIATION: 'undefined' is parsed as a literal here; in the spec it is
        // an IdentifierReference that resolves to the global undefined value.
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
            // @spec https://tc39.es/ecma262/#sec-additional-syntax-numeric-literals
            // B.1.1: LegacyOctalIntegerLiteral is not allowed in strict mode code.
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
        // 13.1 Identifiers
        // IdentifierReference :: Identifier | [~Yield] yield | [~Await] await
        // @spec https://tc39.es/ecma262/#sec-identifiers
        case TokenType::Identifier: {
            auto node = ASTFactory::makeIdentifier(token.value);
            node->setLocation(token.line, token.column);
            current++;
            return node;
        }
        // 13.2.1 The this Keyword
        // PrimaryExpression :: this
        // @spec https://tc39.es/ecma262/#sec-this-keyword
        case TokenType::This: {
            auto node = ASTFactory::makeIdentifier("this");
            node->setLocation(token.line, token.column);
            current++;
            return node;
        }
        // 13.2.2 CoverParenthesizedExpressionAndArrowParameterList
        // Handles both parenthesized expressions and arrow function parameters.
        // The spec uses a "cover grammar" where ( ... ) is parsed as one production
        // and then refined. Rift uses lookahead to disambiguate eagerly.
        // @spec https://tc39.es/ecma262/#sec-grouping-operator
        // DEVIATION: The spec parses CoverParenthesizedExpressionAndArrowParameterList
        // as a single cover grammar and refines it post-parse. Rift uses
        // looks_like_arrow_params() to eagerly disambiguate at parse time.
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

            // ParenthesizedExpression :: ( Expression[+In] )
            // Not arrow function - parse as grouped expression.
            // Per spec, parentheses reset the [In] parameter to [+In],
            // allowing 'in' as a binary operator inside grouping.
            // current is already past '(' so just parse expression
            bool old_suppress = suppress_in_;
            suppress_in_ = false;
            auto expr = parse_expression();
            suppress_in_ = old_suppress;
            consume(TokenType::RightParen);
            return expr;
        }
        // 13.2.4 Array Initializer
        // ArrayLiteral :: [ Elision? ] | [ ElementList ] | [ ElementList , Elision? ]
        // @spec https://tc39.es/ecma262/#sec-array-initializer
        case TokenType::LeftBracket: {
            return parse_array_literal();
        }
        // 13.2.5 Object Initializer
        // ObjectLiteral :: { } | { PropertyDefinitionList } | { PropertyDefinitionList , }
        // @spec https://tc39.es/ecma262/#sec-object-initializer
        case TokenType::LeftBrace: {
            return parse_object_literal();
        }
        // 13.2.8 Template Literals
        // TemplateLiteral :: NoSubstitutionTemplate | SubstitutionTemplate
        // NoSubstitutionTemplate :: ` TemplateCharacters? `
        // @spec https://tc39.es/ecma262/#sec-template-literals
        case TokenType::TemplateString: {
            // Basic template string without expressions (NoSubstitutionTemplate)
            auto templateLiteral = ASTFactory::makeTemplateLiteral();
            auto element = ASTFactory::makeTemplateElement(token.value);
            ASTFactory::addTemplateElement(templateLiteral, element);
            current++;
            return templateLiteral;
        }
        // 13.2.7 Regular Expression Literals
        // RegularExpressionLiteral :: / RegularExpressionBody / RegularExpressionFlags
        // @spec https://tc39.es/ecma262/#sec-literals-regular-expression-literals
        case TokenType::RegExpLiteral: {
            auto node = std::make_shared<ASTNode>(ASTNodeType::RegExpLiteral, token.value);
            node->setLocation(token.line, token.column);
            current++;
            return node;
        }
        // 13.2.8 Template Literals (with substitutions)
        // SubstitutionTemplate :: TemplateHead Expression TemplateSpans
        // TemplateSpans :: TemplateTail | TemplateMiddleList TemplateTail
        // @spec https://tc39.es/ecma262/#sec-template-literals
        case TokenType::TemplateStart:
        case TokenType::TemplateMiddle:
        case TokenType::TemplateEnd: {
            // Template literal with interpolation
            return parse_template_literal();
        }
        // 15.2 Function Definitions / 15.5 Generator Function Definitions
        // FunctionExpression :: function BindingIdentifier? ( FormalParameters ) { FunctionBody }
        // GeneratorExpression :: function * BindingIdentifier? ( FormalParameters ) { GeneratorBody
        // }
        // @spec https://tc39.es/ecma262/#sec-function-definitions
        // @spec https://tc39.es/ecma262/#sec-generator-function-definitions
        case TokenType::Function: {
            // Check for generator function expression: function*() {}
            if(peek_token().type == TokenType::Multiply) {
                return parse_generator_function_expression();
            }
            return parse_function_expression();
        }
        // 14.4 Yield
        // YieldExpression :: yield | yield [no LineTerminator here] AssignmentExpression
        //                  | yield [no LineTerminator here] * AssignmentExpression
        // @spec https://tc39.es/ecma262/#sec-yield
        case TokenType::Yield: {
            // yield expression - must be inside a generator
            return parse_yield_expression();
        }
        // 15.8 Async Function Definitions / 15.9 Async Arrow Function Definitions
        // AsyncFunctionExpression :: async function BindingIdentifier? ( FormalParameters )
        //                           { AsyncFunctionBody }
        // AsyncArrowFunction :: async AsyncArrowBindingIdentifier => AsyncConciseBody
        //                     | CoverCallExpressionAndAsyncArrowHead => AsyncConciseBody
        // @spec https://tc39.es/ecma262/#sec-async-function-definitions
        // @spec https://tc39.es/ecma262/#sec-async-arrow-function-definitions
        // DEVIATION: The spec uses CoverCallExpressionAndAsyncArrowHead as a cover
        // grammar. Rift uses eager lookahead to distinguish async function expressions,
        // async arrow functions, and plain 'async' used as an identifier.
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
            // AsyncArrowFunction :: async AsyncArrowBindingIdentifier => AsyncConciseBody
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
        // 15.8.1 Await
        // AwaitExpression :: await UnaryExpression
        // @spec https://tc39.es/ecma262/#sec-async-function-definitions
        case TokenType::Await: {
            // await expression - must be inside an async function
            return parse_await_expression();
        }
        // 15.7 Class Definitions
        // ClassExpression :: class BindingIdentifier? ClassTail
        // @spec https://tc39.es/ecma262/#sec-class-definitions
        case TokenType::Class: {
            return parse_class_expression();
        }
        // 13.3.7 The super Keyword
        // SuperProperty :: super [ Expression ] | super . IdentifierName
        // SuperCall :: super Arguments
        // @spec https://tc39.es/ecma262/#sec-super-keyword
        case TokenType::Super: {
            // super or super.method or super[expr]
            Token& startToken = current_token();
            current++;  // consume 'super'

            if(current_token().type == TokenType::Dot) {
                // SuperProperty :: super . IdentifierName
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
                // SuperProperty :: super [ Expression[+In] ]
                current++;  // consume '['
                bool old_suppress_in = suppress_in_;
                suppress_in_ = false;
                auto property = parse_expression();
                suppress_in_ = old_suppress_in;
                consume(TokenType::RightBracket);
                auto node = ASTFactory::makeSuperMemberExpression(property, true);
                node->setLocation(startToken.line, startToken.column);
                return node;
            } else {
                // SuperCall :: super Arguments (the Arguments are parsed by
                // parse_call_expression in the postfix loop)
                auto node = ASTFactory::makeSuperExpression();
                node->setLocation(startToken.line, startToken.column);
                return node;
            }
        }
        default: {
            // Keywords and spread in expression position are always SyntaxErrors (not recoverable).
            // Other unexpected tokens may be recoverable parser gaps, so use a non-SyntaxError
            // message to allow error recovery in parse_program().
            bool is_hard_error = false;
            switch(token.type) {
                case TokenType::Switch:
                case TokenType::Case:
                case TokenType::Break:
                case TokenType::Continue:
                case TokenType::Default:
                case TokenType::If:
                case TokenType::Else:
                case TokenType::For:
                case TokenType::While:
                case TokenType::Do:
                case TokenType::Try:
                case TokenType::Catch:
                case TokenType::Finally:
                case TokenType::With:
                case TokenType::Var:
                case TokenType::Let:
                case TokenType::Const:
                case TokenType::Return:
                case TokenType::Throw:
                case TokenType::Static:
                case TokenType::Extends:
                case TokenType::In:
                case TokenType::Instanceof:
                case TokenType::Spread:
                    is_hard_error = true;
                    break;
                default:
                    break;
            }
            if(is_hard_error) {
                throw std::runtime_error("SyntaxError: Unexpected token '" + token.value +
                                         "' in expression");
            }
            throw std::runtime_error("Unexpected token '" + token.value +
                                     "' in primary expression");
        }
    }
}

// 13.4 Update Expressions + 13.5 Unary Operators + 13.3.5 The new Operator
// UpdateExpression :: ++ UnaryExpression | -- UnaryExpression  (prefix forms)
// UnaryExpression :: delete UnaryExpression | void UnaryExpression |
//                    typeof UnaryExpression | + UnaryExpression |
//                    - UnaryExpression | ~ UnaryExpression |
//                    ! UnaryExpression | AwaitExpression | UpdateExpression
// @spec https://tc39.es/ecma262/#sec-update-expressions
// @spec https://tc39.es/ecma262/#sec-unary-operators
//
// SIMPLIFIED: The spec defines UpdateExpression and UnaryExpression as separate
// productions with specific precedence. Rift combines prefix update, unary
// operators, and the new operator into a single method. Postfix update (x++,
// x--) is handled in parse_postfix_expression instead.
std::shared_ptr<ASTNode> Parser::parse_unary_expression() {
    Token& token = current_token();

    // 13.4.1 Prefix Increment / Prefix Decrement
    // UpdateExpression :: ++ UnaryExpression | -- UnaryExpression
    // @spec https://tc39.es/ecma262/#sec-prefix-increment-operator
    // @spec https://tc39.es/ecma262/#sec-prefix-decrement-operator
    if(token.type == TokenType::Increment || token.type == TokenType::Decrement) {
        std::string operator_ = token.value;
        current++;  // consume the operator
        auto operand = parse_postfix_expression();
        // 13.4.1 Static Semantics: Early Errors
        // It is an early Syntax Error if IsValidSimpleAssignmentTarget of
        // UnaryExpression is false.
        if(operand->type != ASTNodeType::Identifier &&
           operand->type != ASTNodeType::MemberExpression) {
            throw std::runtime_error(
                "SyntaxError: Invalid left-hand side expression in prefix operation");
        }
        return ASTFactory::makeUpdateExpression(operator_, operand, true);  // prefix = true
    }

    // 13.5.3 The void Operator
    // UnaryExpression :: void UnaryExpression
    // @spec https://tc39.es/ecma262/#sec-void-operator
    if(token.type == TokenType::Void) {
        current++;  // consume 'void'
        auto operand = parse_postfix_expression();
        return ASTFactory::makeUnaryExpression("void", operand);
    }

    // 13.5.2 The delete Operator
    // UnaryExpression :: delete UnaryExpression
    // @spec https://tc39.es/ecma262/#sec-delete-operator
    if(token.type == TokenType::Delete) {
        current++;  // consume 'delete'
        auto operand = parse_postfix_expression();

        // In strict mode, delete on an unqualified identifier is a SyntaxError
        // per 13.5.2.1 Static Semantics: Early Errors
        if(in_strict_mode_ && operand->type == ASTNodeType::Identifier) {
            throw std::runtime_error(
                "SyntaxError: Delete of an unqualified identifier in strict mode");
        }

        return ASTFactory::makeUnaryExpression("delete", operand);
    }

    // 13.5.4 The typeof Operator: typeof UnaryExpression
    // 13.5.5 Unary + Operator: + UnaryExpression
    // 13.5.6 Unary - Operator: - UnaryExpression
    // 13.5.7 Bitwise NOT Operator: ~ UnaryExpression
    // 13.5.8 Logical NOT Operator: ! UnaryExpression
    // @spec https://tc39.es/ecma262/#sec-typeof-operator
    // @spec https://tc39.es/ecma262/#sec-unary-plus-operator
    // @spec https://tc39.es/ecma262/#sec-unary-minus-operator
    // @spec https://tc39.es/ecma262/#sec-bitwise-not-operator
    // @spec https://tc39.es/ecma262/#sec-logical-not-operator
    if(token.type == TokenType::Plus || token.type == TokenType::Minus ||
       token.type == TokenType::LogicalNot || token.type == TokenType::Typeof ||
       token.type == TokenType::BitwiseNot) {
        std::string operator_ = token.value;
        current++;  // consume the operator
        auto operand = parse_postfix_expression();
        return ASTFactory::makeUnaryExpression(operator_, operand);
    }

    // 13.3.5 The new Operator
    // NewExpression :: MemberExpression | new NewExpression
    // MemberExpression :: new MemberExpression Arguments
    // @spec https://tc39.es/ecma262/#sec-new-operator
    if(token.type == TokenType::New) {
        current++;  // consume 'new'
        return parse_new_expression();
    }

    // Not a unary expression, continue with postfix parsing
    // (falls through to LeftHandSideExpression -> MemberExpression -> PrimaryExpression)
    return parse_postfix_expression();
}

// 13.6-13.16 Binary Operators, Conditional, Assignment, Comma (Precedence Climbing)
// Uses precedence climbing to handle all binary operator grammar productions:
//   - 13.6  ExponentiationExpression :: UnaryExpression ** ExponentiationExpression
//   - 13.7  MultiplicativeExpression :: MultiplicativeExpression * / % UnaryExpression
//   - 13.8  AdditiveExpression :: AdditiveExpression + - MultiplicativeExpression
//   - 13.9  ShiftExpression :: ShiftExpression << >> >>> AdditiveExpression
//   - 13.10 RelationalExpression :: RelationalExpression < > <= >= instanceof in ShiftExpression
//   - 13.11 EqualityExpression :: EqualityExpression == != === !== RelationalExpression
//   - 13.12 BitwiseANDExpression / BitwiseXORExpression / BitwiseORExpression
//   - 13.13 LogicalANDExpression :: LogicalANDExpression && BitwiseORExpression
//           LogicalORExpression :: LogicalORExpression || LogicalANDExpression
//           CoalesceExpression :: CoalesceExpressionHead ?? BitwiseORExpression
//   - 13.14 ConditionalExpression :: ShortCircuitExpression ? AssignmentExpression
//                                    : AssignmentExpression
//   - 13.15 AssignmentExpression :: LeftHandSideExpression = AssignmentExpression
//           (and compound assignment: +=, -=, *=, /=, %=, **=, <<=, >>=, >>>=,
//            &=, |=, ^=, ??=)
// SIMPLIFIED: The spec defines each binary precedence level as a separate left-recursive
// grammar production (e.g., AdditiveExpression :: AdditiveExpression + MultiplicativeExpression).
// Rift collapses all of these into a single precedence-climbing loop, including the
// conditional operator and assignment operators which the spec treats as separate
// productions (ConditionalExpression, AssignmentExpression).
// @spec https://tc39.es/ecma262/#sec-exp-operator
// @spec https://tc39.es/ecma262/#sec-multiplicative-operators
// @spec https://tc39.es/ecma262/#sec-additive-operators
// @spec https://tc39.es/ecma262/#sec-bitwise-shift-operators
// @spec https://tc39.es/ecma262/#sec-relational-operators
// @spec https://tc39.es/ecma262/#sec-equality-operators
// @spec https://tc39.es/ecma262/#sec-binary-bitwise-operators
// @spec https://tc39.es/ecma262/#sec-binary-logical-operators
// @spec https://tc39.es/ecma262/#sec-conditional-operator
// @spec https://tc39.es/ecma262/#sec-assignment-operators
std::shared_ptr<ASTNode> Parser::parse_binary_expression(int precedence) {
    auto left = parse_unary_expression();

    while(true) {
        Token& op = current_token();
        int op_precedence = 0;
        bool is_assignment = false;
        bool is_right_associative = false;

        switch(op.type) {
            // 13.8 Additive Operators (+, -)
            case TokenType::Plus:
            case TokenType::Minus:
                op_precedence = 11;  // Additive operators
                break;
            // 13.7 Multiplicative Operators (*, /, %)
            case TokenType::Multiply:
            case TokenType::Divide:
            case TokenType::Modulo:
                op_precedence = 12;  // Multiplicative operators
                break;
            // 13.6 Exponentiation Operator (**)
            // ExponentiationExpression :: UnaryExpression ** ExponentiationExpression
            // Right-associative per spec: 2 ** 3 ** 2 === 2 ** (3 ** 2) === 512
            case TokenType::Exponent:
                op_precedence = 13;           // Exponentiation (higher than multiply)
                is_right_associative = true;  // ** is right-associative
                break;
            // 13.9 Bitwise Shift Operators (<<, >>, >>>)
            case TokenType::LeftShift:
            case TokenType::RightShift:
            case TokenType::UnsignedRightShift:
                op_precedence = 10;  // Shift operators (between additive and relational)
                break;
            // 13.11 Equality Operators (==, ===, !=, !==)
            case TokenType::Equal:
            case TokenType::EqualStrict:
            case TokenType::NotEqual:
            case TokenType::NotEqualStrict:
                op_precedence = 8;  // Equality operators
                break;
            // 13.10 Relational Operators (<, >, <=, >=, instanceof, in)
            case TokenType::Less:
            case TokenType::LessEqual:
            case TokenType::Greater:
            case TokenType::GreaterEqual:
            case TokenType::Instanceof:
                op_precedence = 9;  // Relational operators
                break;
            // 'in' operator: suppressed in for-statement initializers per spec
            // [~In] parameter (14.7.4 ForStatement, 14.7.5 ForInOfStatement)
            case TokenType::In:
                if(suppress_in_) {
                    return left;  // Don't consume 'in' as binary operator
                }
                op_precedence = 9;  // Relational operators
                break;
            // 13.12 Binary Bitwise Operators (&, ^, |)
            // BitwiseANDExpression :: BitwiseANDExpression & EqualityExpression
            case TokenType::BitwiseAnd:
                op_precedence = 7;  // Bitwise AND (between equality and bitwise XOR)
                break;
            // BitwiseXORExpression :: BitwiseXORExpression ^ BitwiseANDExpression
            case TokenType::BitwiseXor:
                op_precedence = 6;  // Bitwise XOR (between bitwise AND and bitwise OR)
                break;
            // BitwiseORExpression :: BitwiseORExpression | BitwiseXORExpression
            case TokenType::BitwiseOr:
                op_precedence = 5;  // Bitwise OR (between bitwise XOR and logical AND)
                break;
            // 13.13 Binary Logical Operators (&&, ||, ??)
            // LogicalANDExpression :: LogicalANDExpression && BitwiseORExpression
            case TokenType::LogicalAnd:
                op_precedence = 4;  // Logical AND
                break;
            // LogicalORExpression :: LogicalORExpression || LogicalANDExpression
            case TokenType::LogicalOr:
                op_precedence = 3;  // Logical OR (lower than equality!)
                break;
            // CoalesceExpression :: CoalesceExpressionHead ?? BitwiseORExpression
            // INCOMPLETE: Per spec, ?? cannot be mixed with && or || without
            // parentheses (13.13.1 Static Semantics: Early Errors). Rift does
            // not enforce this restriction.
            case TokenType::NullishCoalescing:
                op_precedence = 3;  // Nullish coalescing (same level as logical OR)
                break;
            // 13.14 Conditional Operator (?:)
            // ConditionalExpression :: ShortCircuitExpression ?
            //                          AssignmentExpression : AssignmentExpression
            case TokenType::QuestionMark:
                op_precedence = 2;            // Ternary conditional
                is_right_associative = true;  // a ? b : c ? d : e == a ? b : (c ? d : e)
                break;
            // 13.15 Assignment Operators
            // AssignmentExpression :: LeftHandSideExpression = AssignmentExpression
            //                       | LeftHandSideExpression AssignmentOperator
            //                       AssignmentExpression | LeftHandSideExpression &&=
            //                       AssignmentExpression | LeftHandSideExpression ||=
            //                       AssignmentExpression | LeftHandSideExpression ??=
            //                       AssignmentExpression
            // @spec https://tc39.es/ecma262/#sec-assignment-operators
            // INCOMPLETE: Logical assignment operators (&&=, ||=) are not yet
            // handled. Only ??= is present.
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
            case TokenType::NullishCoalescingAssign:
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

        // 13.14 Conditional Operator (?:)
        // ConditionalExpression :: ShortCircuitExpression ?
        //                          AssignmentExpression : AssignmentExpression
        // @spec https://tc39.es/ecma262/#sec-conditional-operator
        if(op.type == TokenType::QuestionMark) {
            // Parse consequent: AssignmentExpression[+In] — always allow 'in'
            bool old_suppress_in = suppress_in_;
            suppress_in_ = false;
            auto consequent = parse_binary_expression(0);
            suppress_in_ = old_suppress_in;
            consume(TokenType::Colon);
            // Parse alternate (right-associative: parse at ternary precedence)
            auto alternate = parse_binary_expression(op_precedence);
            auto node = std::make_shared<ASTNode>(ASTNodeType::ConditionalExpression);
            node->children.push_back(left);
            node->children.push_back(consequent);
            node->children.push_back(alternate);
            left = node;
            continue;
        }

        // Right-associative operators use op_precedence, left-associative use op_precedence + 1
        // This implements the spec's left-recursive grammar via precedence climbing:
        // left-associative: parse RHS at (current + 1) so same-precedence binds left
        // right-associative: parse RHS at (current) so same-precedence binds right
        int next_precedence = is_right_associative ? op_precedence : op_precedence + 1;
        auto right = parse_binary_expression(next_precedence);

        if(is_assignment) {
            // 13.15.1 Static Semantics: Early Errors
            // AssignmentExpression : LeftHandSideExpression = AssignmentExpression
            // It is an early Reference Error if LeftHandSideExpression is neither an
            // ObjectLiteral, ArrayLiteral (destructuring) nor IsValidSimpleAssignmentTarget.
            // IsValidSimpleAssignmentTarget returns true only for IdentifierReference
            // and MemberExpression (non-optional-chaining).
            if(left->type != ASTNodeType::Identifier &&
               left->type != ASTNodeType::MemberExpression &&
               left->type != ASTNodeType::ObjectPattern &&
               left->type != ASTNodeType::ArrayPattern &&
               left->type != ASTNodeType::ObjectLiteral &&
               left->type != ASTNodeType::ArrayLiteral) {
                throw std::runtime_error(
                    "SyntaxError: Invalid left-hand side in assignment at line " +
                    std::to_string(op.line) + ":" + std::to_string(op.column));
            }
            // Optional chaining is not a valid assignment target
            if(left->type == ASTNodeType::MemberExpression &&
               (left->metadata.find("optional") != std::string::npos)) {
                throw std::runtime_error(
                    "SyntaxError: Invalid left-hand side in assignment at line " +
                    std::to_string(op.line) + ":" + std::to_string(op.column));
            }
            // In strict mode, assignment to eval or arguments is a SyntaxError
            if(in_strict_mode_ && left->type == ASTNodeType::Identifier) {
                validateIdentifier(left->value, op.line, op.column);
            }
            left = ASTFactory::makeAssignmentExpression(left, right, op.value);
        } else {
            left = ASTFactory::makeBinaryExpression(op.value, left, right);
        }
    }
}

// 13.16 Comma Operator / Expression
// Expression :: AssignmentExpression | Expression , AssignmentExpression
// @spec https://tc39.es/ecma262/#sec-comma-operator
//
// SIMPLIFIED: The spec's comma operator creates a sequence. Rift delegates to
// parse_binary_expression(0) which starts at the lowest precedence (assignment).
// The comma operator itself is not handled here as a binary operator; instead,
// comma-separated expressions are handled by the caller context (e.g., argument
// lists, variable declarations, for-loop headers).
std::shared_ptr<ASTNode> Parser::parse_expression() {
    return parse_binary_expression(0);
}

// 13.3 Left-Hand-Side Expressions + 13.4 Postfix Update Expressions
// Combines several spec productions into one postfix/access loop:
//   13.3.1 Property Accessors:
//     MemberExpression :: MemberExpression . IdentifierName
//                       | MemberExpression [ Expression ]
//   13.3.2 Function Calls:
//     CallExpression :: CoverCallExpressionAndAsyncArrowHead
//                     | CallExpression Arguments
//                     | CallExpression [ Expression ]
//                     | CallExpression . IdentifierName
//   13.3.5 The new Operator (handled in parse_unary_expression)
//   13.3.8 Optional Chains:
//     OptionalExpression :: MemberExpression OptionalChain
//                         | CallExpression OptionalChain
//     OptionalChain :: ?. Arguments | ?. [ Expression ] | ?. IdentifierName
//                    | OptionalChain Arguments | OptionalChain [ Expression ]
//                    | OptionalChain . IdentifierName
//   13.4.2 Postfix Increment / 13.4.3 Postfix Decrement:
//     UpdateExpression :: LeftHandSideExpression [no LineTerminator here] ++
//                       | LeftHandSideExpression [no LineTerminator here] --
//   15.3 Arrow Function (single-param form: Identifier => ...)
// @spec https://tc39.es/ecma262/#sec-left-hand-side-expressions
// @spec https://tc39.es/ecma262/#sec-update-expressions
//
// SIMPLIFIED: The spec defines MemberExpression, CallExpression, and
// OptionalExpression as separate recursive productions. Rift merges them into
// a single while-true loop that checks for '.', '[', '(', '?.', '++', '--'.
std::shared_ptr<ASTNode> Parser::parse_postfix_expression() {
    auto expr = parse_primary();

    // 15.3 Arrow Function Definitions
    // ArrowFunction :: ArrowParameters => ConciseBody
    // ArrowParameters :: BindingIdentifier (single-param shorthand, no parens)
    // Check for single-param arrow function: x => ...
    if(expr->type == ASTNodeType::Identifier && current_token().type == TokenType::Arrow) {
        // 15.3 ArrowFunction :: ArrowParameters [no LineTerminator here] => ConciseBody
        if(current_token().line != expr->line) {
            throw std::runtime_error("SyntaxError: Line terminator not permitted before '=>'");
        }
        return parse_arrow_function_from_identifier(expr);
    }

    while(true) {
        if(current_token().type == TokenType::Dot) {
            // 13.3.1 MemberExpression :: MemberExpression . IdentifierName
            expr = parse_member_expression(expr);
        } else if(current_token().type == TokenType::LeftBracket) {
            // 13.3.1 MemberExpression :: MemberExpression [ Expression ]
            expr = parse_computed_member_expression(expr);
        } else if(current_token().type == TokenType::LeftParen) {
            // 13.3.2 CallExpression :: MemberExpression Arguments
            expr = parse_call_expression(expr);
        } else if(current_token().type == TokenType::OptionalChain) {
            // 13.3.8 Optional Chaining
            // OptionalChain :: ?. Arguments | ?. [ Expression ] | ?. IdentifierName
            // @spec https://tc39.es/ecma262/#sec-optional-chains
            current++;  // consume '?.'
            if(current_token().type == TokenType::LeftBracket) {
                // OptionalChain :: ?. [ Expression ] -- optional computed member access
                expr = parse_computed_member_expression(expr);
                expr->metadata = "computed-optional";
            } else if(current_token().type == TokenType::LeftParen) {
                // OptionalChain :: ?. Arguments -- optional call
                expr = parse_call_expression(expr);
                expr->metadata = "optional";
            } else {
                // OptionalChain :: ?. IdentifierName -- optional member access
                Token& tok = current_token();
                auto property = std::make_shared<ASTNode>(ASTNodeType::Identifier, tok.value,
                                                          tok.line, tok.column);
                current++;  // consume property name
                expr = ASTFactory::makeMemberExpression(expr, property);
                expr->metadata = "optional";
            }
        } else if(current_token().type == TokenType::Increment ||
                  current_token().type == TokenType::Decrement) {
            // 13.4.2 Postfix Increment Operator
            // 13.4.3 Postfix Decrement Operator
            // UpdateExpression :: LeftHandSideExpression [no LineTerminator here] ++
            //                   | LeftHandSideExpression [no LineTerminator here] --
            // @spec https://tc39.es/ecma262/#sec-postfix-increment-operator
            // INCOMPLETE: The spec requires [no LineTerminator here] between the
            // operand and ++/--. Rift does not check for an intervening newline,
            // so `x\n++` would be incorrectly parsed as postfix increment.
            // 13.4.2/13.4.3 Static Semantics: Early Errors
            // It is an early Syntax Error if IsValidSimpleAssignmentTarget of
            // LeftHandSideExpression is false.
            if(expr->type != ASTNodeType::Identifier &&
               expr->type != ASTNodeType::MemberExpression) {
                throw std::runtime_error(
                    "SyntaxError: Invalid left-hand side expression in postfix operation");
            }
            std::string operator_ = current_token().value;
            current++;  // consume the operator
            expr = ASTFactory::makeUpdateExpression(operator_, expr, false);  // prefix = false
        } else {
            break;
        }
    }

    return expr;
}

// 13.3.6 Function Calls
// CallExpression :: CoverCallExpressionAndAsyncArrowHead
//                 | CallExpression Arguments
// Arguments :: ( ) | ( ArgumentList ) | ( ArgumentList , )
// ArgumentList :: AssignmentExpression | ... AssignmentExpression
//              | ArgumentList , AssignmentExpression
//              | ArgumentList , ... AssignmentExpression
// @spec https://tc39.es/ecma262/#sec-function-calls
// @spec https://tc39.es/ecma262/#sec-argument-lists
std::shared_ptr<ASTNode> Parser::parse_call_expression(std::shared_ptr<ASTNode> callee) {
    consume(TokenType::LeftParen);  // consume '('
    // Per spec, Arguments uses AssignmentExpression[+In] — re-enable 'in' as binary operator
    bool old_suppress_in = suppress_in_;
    suppress_in_ = false;

    auto call = ASTFactory::makeCallExpression(callee);

    // Parse Arguments production
    if(current_token().type != TokenType::RightParen) {
        do {
            // Allow trailing comma before ')' per Arguments :: ( ArgumentList , )
            if(current_token().type == TokenType::RightParen) {
                break;
            }
            // ArgumentList :: ... AssignmentExpression (SpreadElement in arguments)
            // @spec https://tc39.es/ecma262/#sec-argument-lists
            if(current_token().type == TokenType::Spread) {
                current++;                                     // consume '...'
                auto spread_arg = parse_binary_expression(1);  // Parse at assignment precedence
                auto spread_element = ASTFactory::makeSpreadElement(spread_arg);
                ASTFactory::addArgument(call, spread_element);
            } else {
                // ArgumentList :: AssignmentExpression
                auto arg = parse_expression();
                ASTFactory::addArgument(call, arg);
            }
        } while(match(TokenType::Comma));
    }

    consume(TokenType::RightParen);  // consume ')'
    suppress_in_ = old_suppress_in;

    return call;
}

// 13.3.1 Property Accessors (dot notation)
// MemberExpression :: MemberExpression . IdentifierName
// @spec https://tc39.es/ecma262/#sec-property-accessors
//
// Per the spec, IdentifierName includes all reserved words. The dot notation
// allows any keyword as a property name (e.g., obj.delete, obj.class).
// @spec https://tc39.es/ecma262/#prod-IdentifierName
std::shared_ptr<ASTNode> Parser::parse_member_expression(std::shared_ptr<ASTNode> object) {
    consume(TokenType::Dot);  // consume '.'

    // IdentifierName :: IdentifierStart IdentifierPart* | ReservedWord
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
         tok.type == TokenType::Await || tok.type == TokenType::Instanceof);
    if(!is_identifier_name) {
        throw std::runtime_error("Expected property name after '.'");
    }

    auto property = ASTFactory::makeIdentifier(current_token().value);
    current++;

    return ASTFactory::makeMemberExpression(object, property);
}

// 13.3.1 Property Accessors (bracket notation)
// MemberExpression :: MemberExpression [ Expression ]
// @spec https://tc39.es/ecma262/#sec-property-accessors
std::shared_ptr<ASTNode> Parser::parse_computed_member_expression(std::shared_ptr<ASTNode> object) {
    consume(TokenType::LeftBracket);  // consume '['
    // Per spec, MemberExpression[Expression[+In]] — re-enable 'in' inside brackets
    bool old_suppress_in = suppress_in_;
    suppress_in_ = false;

    auto index = parse_expression();

    consume(TokenType::RightBracket);  // consume ']'
    suppress_in_ = old_suppress_in;

    return ASTFactory::makeMemberExpression(object, index, true);  // Mark as computed
}

// 13.2.4 Array Initializer
// ArrayLiteral :: [ Elision? ] | [ ElementList ] | [ ElementList , Elision? ]
// ElementList :: Elision? AssignmentExpression
//             | Elision? SpreadElement
//             | ElementList , Elision? AssignmentExpression
//             | ElementList , Elision? SpreadElement
// Elision :: , | Elision ,
// SpreadElement :: ... AssignmentExpression
// @spec https://tc39.es/ecma262/#sec-array-initializer
std::shared_ptr<ASTNode> Parser::parse_array_literal() {
    Token& startToken = current_token();  // Save location before consuming
    consume(TokenType::LeftBracket);      // consume '['
    // Per spec, ArrayLiteral elements use AssignmentExpression[+In]
    bool old_suppress_in = suppress_in_;
    suppress_in_ = false;

    auto array = ASTFactory::makeArrayLiteral();
    array->setLocation(startToken.line, startToken.column);

    // ArrayLiteral :: [ ] (empty array)
    if(current_token().type == TokenType::RightBracket) {
        current++;  // consume ']'
        suppress_in_ = old_suppress_in;
        return array;
    }

    // Parse ElementList with Elision support
    // Elisions (holes) are represented as nullptr children.
    // Leading elisions: [,1] means hole at index 0, value 1 at index 1.
    // Middle elisions: [1,,3] means value 1, hole at index 1, value 3 at index 2.
    // Trailing elisions: [1,2,] is a trailing comma (length 2), [1,2,,] has a hole (length 3).
    while(true) {
        // Check for closing bracket (end of array or after trailing comma/elision)
        if(current_token().type == TokenType::RightBracket) {
            break;
        }

        // Elision :: , (comma without a preceding element in this position)
        // Each comma at element position represents a hole (elision).
        if(current_token().type == TokenType::Comma) {
            // This is an elision — push nullptr to represent the hole
            array->children.push_back(nullptr);
            current++;  // consume ','
            continue;
        }

        // SpreadElement :: ... AssignmentExpression
        if(current_token().type == TokenType::Spread) {
            current++;                                     // consume '...'
            auto spread_arg = parse_binary_expression(1);  // Parse at assignment precedence
            auto spread_element = ASTFactory::makeSpreadElement(spread_arg);
            ASTFactory::addArrayElement(array, spread_element);
        } else {
            // ElementList :: AssignmentExpression
            auto element = parse_expression();
            ASTFactory::addArrayElement(array, element);
        }

        // After an element, expect either ',' or ']'
        if(current_token().type == TokenType::Comma) {
            current++;  // consume ','
            // Continue to next iteration — if next token is ']', it's a trailing comma;
            // if next token is ',', it's another elision; otherwise parse next element.
        } else {
            // No comma — must be ']'
            break;
        }
    }

    consume(TokenType::RightBracket);  // consume ']'
    suppress_in_ = old_suppress_in;
    return array;
}

// 13.2.5 Object Initializer
// ObjectLiteral :: { } | { PropertyDefinitionList } | { PropertyDefinitionList , }
// PropertyDefinitionList :: PropertyDefinition | PropertyDefinitionList , PropertyDefinition
// PropertyDefinition :: IdentifierReference
//                     | CoverInitializedName
//                     | PropertyName : AssignmentExpression
//                     | MethodDefinition
//                     | ... AssignmentExpression
// PropertyName :: LiteralPropertyName | ComputedPropertyName
// LiteralPropertyName :: IdentifierName | StringLiteral | NumericLiteral
// ComputedPropertyName :: [ AssignmentExpression ]
// MethodDefinition :: PropertyName ( UniqueFormalParameters ) { FunctionBody }
//                   | get PropertyName ( ) { FunctionBody }
//                   | set PropertyName ( PropertySetParameterList ) { FunctionBody }
//                   | GeneratorMethod | AsyncMethod | AsyncGeneratorMethod
// @spec https://tc39.es/ecma262/#sec-object-initializer
//
// INCOMPLETE: Shorthand property syntax (e.g., { x } equivalent to { x: x }) is
// not handled here. Spread properties ({ ...obj }) are also not handled.
// Generator methods (e.g., { *gen() {} }) are not yet supported.
std::shared_ptr<ASTNode> Parser::parse_object_literal() {
    Token& startToken = current_token();  // Save location before consuming
    consume(TokenType::LeftBrace);        // consume '{'
    // Per spec, PropertyDefinition values use AssignmentExpression[+In]
    bool old_suppress_in = suppress_in_;
    suppress_in_ = false;

    auto object = ASTFactory::makeObjectLiteral();
    object->setLocation(startToken.line, startToken.column);

    // ObjectLiteral :: { } (empty object)
    if(current_token().type == TokenType::RightBrace) {
        current++;  // consume '}'
        suppress_in_ = old_suppress_in;
        return object;
    }

    // Parse PropertyDefinitionList
    do {
        // ObjectLiteral :: { PropertyDefinitionList , } (trailing comma allowed)
        if(current_token().type == TokenType::RightBrace) {
            break;  // Trailing comma is allowed, stop parsing properties
        }

        // Parse PropertyName (can be identifier, string, number, or computed)
        std::shared_ptr<ASTNode> key;
        bool is_async_method = false;
        bool is_getter = false;
        bool is_setter = false;

        // MethodDefinition :: get PropertyName ( ) { FunctionBody }
        //                   | set PropertyName ( PropertySetParameterList ) { FunctionBody }
        // Disambiguate from: { get: 1 } (data property) and { get() {} } (method shorthand)
        if(current_token().type == TokenType::Identifier &&
           (current_token().value == "get" || current_token().value == "set")) {
            TokenType next = peek_token().type;
            // If next token is a property name (not '(' or ':'), it's a getter/setter
            if(next == TokenType::Identifier || next == TokenType::String ||
               next == TokenType::Number || next == TokenType::LeftBracket) {
                if(current_token().value == "get") {
                    is_getter = true;
                } else {
                    is_setter = true;
                }
                current++;  // consume 'get'/'set'
            }
        }

        // MethodDefinition :: async PropertyName ( UniqueFormalParameters ) { AsyncFunctionBody }
        // @spec https://tc39.es/ecma262/#sec-async-function-definitions
        if(!is_getter && !is_setter && current_token().type == TokenType::Async &&
           peek_token().type == TokenType::Identifier) {
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
            // LiteralPropertyName :: IdentifierName
            key = ASTFactory::makeIdentifier(current_token().value);
            current++;  // consume identifier
        } else if(current_token().type == TokenType::String) {
            // LiteralPropertyName :: StringLiteral
            std::string keyLiteralType =
                (current_token().type == TokenType::String) ? "string" : "number";
            key = ASTFactory::makeLiteral(current_token().value, keyLiteralType);
            current++;  // consume string
        } else if(current_token().type == TokenType::Number) {
            // LiteralPropertyName :: NumericLiteral
            key = ASTFactory::makeLiteral(current_token().value, "number");
            current++;  // consume number
        } else if(current_token().type == TokenType::LeftBracket) {
            // ComputedPropertyName :: [ AssignmentExpression ]
            // @spec https://tc39.es/ecma262/#sec-object-initializer
            current++;  // consume '['
            auto expr = parse_expression();
            consume(TokenType::RightBracket);
            // Wrap in a marker node so the evaluator knows to evaluate the expression
            key = std::make_shared<ASTNode>(ASTNodeType::ExpressionStatement);
            key->metadata = "computed_key";
            key->children.push_back(expr);
        } else {
            // 12.2.6 IdentifierName includes reserved words as property names
            // @spec https://tc39.es/ecma262/#prod-PropertyName
            // PropertyName :: LiteralPropertyName | ComputedPropertyName
            // LiteralPropertyName :: IdentifierName | StringLiteral | NumericLiteral
            // IdentifierName includes reserved words (return, if, for, class, etc.)
            TokenType tt = current_token().type;
            if(tt == TokenType::Return || tt == TokenType::If || tt == TokenType::Else ||
               tt == TokenType::For || tt == TokenType::While || tt == TokenType::Do ||
               tt == TokenType::Switch || tt == TokenType::Case || tt == TokenType::Default ||
               tt == TokenType::Break || tt == TokenType::Continue || tt == TokenType::Throw ||
               tt == TokenType::Try || tt == TokenType::Catch || tt == TokenType::Finally ||
               tt == TokenType::New || tt == TokenType::This || tt == TokenType::In ||
               tt == TokenType::Instanceof || tt == TokenType::Of || tt == TokenType::Class ||
               tt == TokenType::Extends || tt == TokenType::Super || tt == TokenType::Static ||
               tt == TokenType::Var || tt == TokenType::Let || tt == TokenType::Const ||
               tt == TokenType::Function || tt == TokenType::Typeof || tt == TokenType::Delete ||
               tt == TokenType::Void || tt == TokenType::Yield || tt == TokenType::Async ||
               tt == TokenType::Await || tt == TokenType::Boolean || tt == TokenType::Null ||
               tt == TokenType::Undefined || tt == TokenType::With) {
                key = ASTFactory::makeIdentifier(current_token().value);
                current++;
            } else {
                throw std::runtime_error("Expected property name in object literal");
            }
        }

        // MethodDefinition :: get PropertyName ( ) { FunctionBody }
        //                   | set PropertyName ( PropertySetParameterList ) { FunctionBody }
        if(is_getter || is_setter) {
            consume(TokenType::LeftParen);
            auto parameters = parse_parameter_list(true);
            consume(TokenType::RightParen);
            auto body = parse_block_statement(true);
            auto value = ASTFactory::makeFunctionExpression(parameters, body);
            value->metadata = is_getter ? "getter" : "setter";
            ASTFactory::addObjectProperty(object, key, value);
        } else if(is_async_method || current_token().type == TokenType::LeftParen) {
            // MethodDefinition :: PropertyName ( UniqueFormalParameters ) { FunctionBody }
            // (or async variant)
            consume(TokenType::LeftParen);
            auto parameters = parse_parameter_list(true);
            consume(TokenType::RightParen);

            bool was_in_async = in_async_context_;
            if(is_async_method) {
                in_async_context_ = true;
            }
            auto method_body = parse_block_statement(true);
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
            // PropertyDefinition :: PropertyName : AssignmentExpression
            consume(TokenType::Colon);
            auto value = parse_expression();
            ASTFactory::addObjectProperty(object, key, value);
        }

    } while(match(TokenType::Comma));

    consume(TokenType::RightBrace);  // consume '}'
    suppress_in_ = old_suppress_in;
    return object;
}

// 13.3.5 The new Operator
// NewExpression :: MemberExpression | new NewExpression
// MemberExpression :: new MemberExpression Arguments
// @spec https://tc39.es/ecma262/#sec-new-operator
//
// The spec distinguishes NewExpression (no arguments: `new Foo`) from
// MemberExpression with Arguments (`new Foo(arg)`). Both are handled here.
// The constructor can include member access (e.g., `new a.b.C()`).
std::shared_ptr<ASTNode> Parser::parse_new_expression() {
    // MemberExpression :: new MemberExpression Arguments
    // Parse the constructor - can be an identifier or member expression (e.g., new
    // Temporal.Duration)
    auto constructor = parse_primary();

    // Allow member access (dot and bracket) on the constructor expression
    // This handles cases like: new Temporal.Duration(), new a.b.C()
    while(current_token().type == TokenType::Dot ||
          current_token().type == TokenType::LeftBracket) {
        if(current_token().type == TokenType::Dot) {
            constructor = parse_member_expression(constructor);
        } else {
            constructor = parse_computed_member_expression(constructor);
        }
    }

    auto newExpr = ASTFactory::makeNewExpression(constructor);

    // MemberExpression :: new MemberExpression Arguments
    // Arguments :: ( ) | ( ArgumentList ) | ( ArgumentList , )
    // If no parentheses, this is NewExpression :: new NewExpression (no args)
    if(current_token().type == TokenType::LeftParen) {
        consume(TokenType::LeftParen);  // consume '('
        // Per spec, Arguments uses AssignmentExpression[+In]
        bool old_suppress_in = suppress_in_;
        suppress_in_ = false;

        // Parse Arguments (same production as in function calls)
        if(current_token().type != TokenType::RightParen) {
            do {
                // Allow trailing comma before ')'
                if(current_token().type == TokenType::RightParen) {
                    break;
                }
                // ArgumentList :: ... AssignmentExpression
                if(current_token().type == TokenType::Spread) {
                    current++;  // consume '...'
                    auto spread_arg = parse_binary_expression(1);
                    auto spread_element = ASTFactory::makeSpreadElement(spread_arg);
                    ASTFactory::addNewArgument(newExpr, spread_element);
                } else {
                    auto arg = parse_expression();
                    ASTFactory::addNewArgument(newExpr, arg);
                }
            } while(match(TokenType::Comma));
        }

        consume(TokenType::RightParen);  // consume ')'
        suppress_in_ = old_suppress_in;
    }

    return newExpr;
}

// 13.2.8 Template Literals (with substitutions)
// SubstitutionTemplate :: TemplateHead Expression TemplateSpans
// TemplateSpans :: TemplateTail | TemplateMiddleList TemplateTail
// TemplateMiddleList :: TemplateMiddle Expression
//                     | TemplateMiddleList TemplateMiddle Expression
// @spec https://tc39.es/ecma262/#sec-template-literals
//
// The lexer produces TemplateStart, TemplateMiddle, and TemplateEnd tokens
// that correspond to TemplateHead, TemplateMiddle, and TemplateTail in the spec.
// Each ${...} expression boundary is a token boundary from the lexer.
// INCOMPLETE: Tagged templates (tag`string`) are not yet supported.
std::shared_ptr<ASTNode> Parser::parse_template_literal() {
    // Per spec, template expressions use Expression[+In]
    bool old_suppress_in = suppress_in_;
    suppress_in_ = false;

    auto templateLiteral = ASTFactory::makeTemplateLiteral();

    // SubstitutionTemplate :: TemplateHead Expression TemplateSpans
    if(current_token().type == TokenType::TemplateStart) {
        // TemplateHead (the text before the first ${...})
        auto startElement = ASTFactory::makeTemplateElement(current_token().value);
        ASTFactory::addTemplateElement(templateLiteral, startElement);
        current++;

        // TemplateSpans :: TemplateMiddleList? TemplateTail
        // Parse expressions and template parts until TemplateEnd
        while(current_token().type != TokenType::TemplateEnd &&
              current_token().type != TokenType::EndOfFile) {
            // Parse the Expression inside ${...}
            auto expression = parse_expression();
            auto templateExpr = ASTFactory::makeTemplateExpression(expression);
            ASTFactory::addTemplateElement(templateLiteral, templateExpr);

            // TemplateMiddle (text between }...${) or TemplateTail (text after last })
            if(current_token().type == TokenType::TemplateMiddle) {
                auto middleElement = ASTFactory::makeTemplateElement(current_token().value);
                ASTFactory::addTemplateElement(templateLiteral, middleElement);
                current++;
            } else if(current_token().type == TokenType::TemplateEnd) {
                // TemplateTail (the text after the last ${...} up to closing backtick)
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

    suppress_in_ = old_suppress_in;
    return templateLiteral;
}

// 15.2 Function Definitions
// FunctionExpression :: function BindingIdentifier? ( FormalParameters ) { FunctionBody }
// @spec https://tc39.es/ecma262/#sec-function-definitions
//
// INCOMPLETE: Named function expressions (function name() {}) are not handled;
// the BindingIdentifier is not parsed. Only anonymous function expressions are
// supported (function() {}).
std::shared_ptr<ASTNode> Parser::parse_function_expression() {
    Token& startToken = current_token();  // Save 'function' location
    consume(TokenType::Function);         // consume 'function'

    // FormalParameters :: (see parse_parameter_list in parser.cpp)
    consume(TokenType::LeftParen);
    auto parameters = parse_parameter_list();
    consume(TokenType::RightParen);

    // FunctionBody :: FunctionStatementList
    auto body = parse_block_statement(true);

    auto node = ASTFactory::makeFunctionExpression(parameters, body);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

// Helper for 15.3 Arrow Function Definitions
// Used to disambiguate CoverParenthesizedExpressionAndArrowParameterList.
// The spec resolves this ambiguity by parsing the cover grammar and then
// applying supplemental syntax (Static Semantics: CoveredFormalsList).
// Rift uses a lookahead heuristic instead: scan for (id, id, ...) followed by ) =>.
// @spec https://tc39.es/ecma262/#sec-arrow-function-definitions
//
// DEVIATION: The spec uses cover grammar refinement after parsing the full
// parenthesized expression. Rift scans ahead to check if the token pattern
// matches arrow parameters before parsing. This means some edge cases with
// complex default values or destructuring patterns may not be recognized.
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

        // Destructuring pattern parameter: { ... } or [ ... ]
        if(current_token().type == TokenType::LeftBrace ||
           current_token().type == TokenType::LeftBracket) {
            TokenType open_token = current_token().type;
            TokenType close_token = (open_token == TokenType::LeftBrace) ? TokenType::RightBrace
                                                                         : TokenType::RightBracket;
            int depth = 1;
            current++;  // skip '{' or '['
            // Skip to matching close bracket/brace
            while(current < tokens.size() && depth > 0) {
                if(current_token().type == open_token) {
                    depth++;
                } else if(current_token().type == close_token) {
                    depth--;
                } else if(current_token().type == TokenType::EndOfFile) {
                    break;
                }
                current++;
            }

            // Check for default value: pattern = expr
            if(current_token().type == TokenType::Assign) {
                current++;  // skip '='
                paren_depth = 0;
                int brace_depth = 0;
                int bracket_depth = 0;
                while(current < tokens.size()) {
                    TokenType tok = current_token().type;
                    if(tok == TokenType::LeftParen) {
                        paren_depth++;
                    } else if(tok == TokenType::LeftBrace) {
                        brace_depth++;
                    } else if(tok == TokenType::LeftBracket) {
                        bracket_depth++;
                    } else if(tok == TokenType::RightParen && paren_depth == 0 &&
                              brace_depth == 0 && bracket_depth == 0) {
                        break;
                    } else if(tok == TokenType::RightParen) {
                        paren_depth--;
                    } else if(tok == TokenType::RightBrace) {
                        brace_depth--;
                    } else if(tok == TokenType::RightBracket) {
                        bracket_depth--;
                    } else if(tok == TokenType::Comma && paren_depth == 0 && brace_depth == 0 &&
                              bracket_depth == 0) {
                        break;
                    } else if(tok == TokenType::EndOfFile) {
                        break;
                    }
                    current++;
                }
            }

            if(current_token().type == TokenType::Comma) {
                current++;
                continue;
            }
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

// 15.3 Arrow Function Definitions
// ArrowFunction :: ArrowParameters => ConciseBody
// ArrowParameters :: BindingIdentifier
//                  | CoverParenthesizedExpressionAndArrowParameterList
// ConciseBody :: [lookahead != {] ExpressionBody
//              | { FunctionBody }
// ExpressionBody :: AssignmentExpression
// @spec https://tc39.es/ecma262/#sec-arrow-function-definitions
//
// Handles both parenthesized and single-identifier parameter forms.
// The expression body form produces an implicit return.
std::shared_ptr<ASTNode> Parser::parse_arrow_function() {
    Token& startToken = current_token();

    // Parse parameters
    std::shared_ptr<ASTNode> parameters;

    size_t params_end_line;
    if(current_token().type == TokenType::Identifier) {
        // ArrowParameters :: BindingIdentifier (single param without parens: x => ...)
        std::string paramValue = current_token().value;
        size_t paramLine = current_token().line;
        size_t paramColumn = current_token().column;
        params_end_line = paramLine;
        parameters = ASTFactory::makeParameterList();
        ASTFactory::addParameter(parameters, ASTFactory::makeIdentifier(paramValue));
        current++;  // consume identifier
        // 15.3.1 Static Semantics: Early Errors -- validate parameter in strict mode
        validateIdentifier(paramValue, paramLine, paramColumn);
    } else {
        // ArrowParameters :: CoverParenthesizedExpressionAndArrowParameterList
        // Parenthesized params: () => ... or (x) => ... or (x, y) => ...
        // Arrow functions use UniqueFormalParameters — duplicates always an error
        consume(TokenType::LeftParen);
        parameters = parse_parameter_list(true);
        params_end_line = current_token().line;  // line of ')'
        consume(TokenType::RightParen);
    }

    // 15.3 ArrowFunction :: ArrowParameters [no LineTerminator here] => ConciseBody
    if(current_token().type == TokenType::Arrow && current_token().line != params_end_line) {
        throw std::runtime_error("SyntaxError: Line terminator not permitted before '=>'");
    }

    // ArrowFunction :: ArrowParameters => ConciseBody
    consume(TokenType::Arrow);

    // ConciseBody :: [lookahead != {] ExpressionBody | { FunctionBody }
    std::shared_ptr<ASTNode> body;
    bool isExpressionBody = false;

    if(current_token().type == TokenType::LeftBrace) {
        // ConciseBody :: { FunctionBody }
        body = parse_block_statement(true);

        // 15.3.1 Static Semantics: Early Errors
        // It is a Syntax Error if FunctionBodyContainsUseStrict of ConciseBody is
        // true and IsSimpleParameterList of ArrowParameters is false.
        if(!body->children.empty()) {
            const auto& first = body->children[0];
            if(first->type == ASTNodeType::ExpressionStatement && !first->children.empty()) {
                const auto& expr = first->children[0];
                if(expr->type == ASTNodeType::Literal && expr->metadata == "string" &&
                   expr->value == "use strict") {
                    for(const auto& p : parameters->children) {
                        if(p->type != ASTNodeType::Identifier) {
                            throw std::runtime_error(
                                "SyntaxError: Illegal 'use strict' directive in function with "
                                "non-simple parameter list");
                        }
                    }
                }
            }
        }
    } else {
        // ConciseBody :: [lookahead != {] ExpressionBody[+In]
        // ExpressionBody :: AssignmentExpression[+In]
        // Per spec, arrow expression body always uses [+In]
        bool old_suppress_in = suppress_in_;
        suppress_in_ = false;
        body = parse_binary_expression(0);
        suppress_in_ = old_suppress_in;
        isExpressionBody = true;
    }

    auto node = ASTFactory::makeArrowFunctionExpression(parameters, body, isExpressionBody);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

// 15.3 Arrow Function Definitions (single-identifier parameter variant)
// ArrowFunction :: ArrowParameters => ConciseBody
// ArrowParameters :: BindingIdentifier
// @spec https://tc39.es/ecma262/#sec-arrow-function-definitions
//
// Called from parse_postfix_expression when we've already parsed the identifier
// as a primary expression and then see '=>'. This avoids backtracking.
std::shared_ptr<ASTNode> Parser::parse_arrow_function_from_identifier(
    std::shared_ptr<ASTNode> param) {
    // param is the identifier node, we're positioned at '=>'
    size_t line = param->line;
    size_t column = param->column;

    // 15.3.1 Static Semantics: Early Errors -- validate parameter in strict mode
    validateIdentifier(param->value, line, column);

    // ArrowParameters :: BindingIdentifier
    auto parameters = ASTFactory::makeParameterList();
    ASTFactory::addParameter(parameters, param);

    // ArrowFunction :: ArrowParameters => ConciseBody
    consume(TokenType::Arrow);

    // ConciseBody :: [lookahead != {] ExpressionBody | { FunctionBody }
    std::shared_ptr<ASTNode> body;
    bool isExpressionBody = false;

    if(current_token().type == TokenType::LeftBrace) {
        // ConciseBody :: { FunctionBody }
        body = parse_block_statement(true);
    } else {
        // ConciseBody :: [lookahead != {] ExpressionBody[+In]
        bool old_suppress_in = suppress_in_;
        suppress_in_ = false;
        body = parse_binary_expression(0);
        suppress_in_ = old_suppress_in;
        isExpressionBody = true;
    }

    auto node = ASTFactory::makeArrowFunctionExpression(parameters, body, isExpressionBody);
    node->setLocation(line, column);
    return node;
}

// 14.4 Yield
// YieldExpression :: yield
//                  | yield [no LineTerminator here] AssignmentExpression
//                  | yield [no LineTerminator here] * AssignmentExpression
// @spec https://tc39.es/ecma262/#sec-yield
//
// INCOMPLETE: The [no LineTerminator here] restriction is not enforced. Rift
// uses a heuristic to determine if the next token starts an expression rather
// than checking for an intervening line terminator.
std::shared_ptr<ASTNode> Parser::parse_yield_expression() {
    Token& startToken = current_token();

    // 14.4 Static Semantics: Early Errors
    // It is a Syntax Error if this production is not nested within a GeneratorBody.
    if(!in_generator_context_) {
        if(in_strict_mode_) {
            throw std::runtime_error("SyntaxError: 'yield' is a reserved word in strict mode");
        }
        throw std::runtime_error(
            "SyntaxError: 'yield' expression is only allowed inside generator functions");
    }

    consume(TokenType::Yield);  // consume 'yield'

    // YieldExpression :: yield [no LineTerminator here] * AssignmentExpression
    bool is_delegate = false;
    if(current_token().type == TokenType::Multiply) {
        is_delegate = true;
        current++;  // consume '*'
    }

    // Determine if there's an AssignmentExpression following yield.
    // YieldExpression :: yield (no argument -- yields undefined)
    // YieldExpression :: yield [no LineTerminator here] AssignmentExpression
    // yield* always requires an argument (the iterable to delegate to)
    std::shared_ptr<ASTNode> argument = nullptr;

    // SIMPLIFIED: Instead of checking for [no LineTerminator here], we check if
    // the next token could start an expression. Tokens like ';', ')', '}' etc.
    // indicate no argument follows.
    TokenType next = current_token().type;
    bool has_argument =
        (next != TokenType::Semicolon && next != TokenType::RightParen &&
         next != TokenType::RightBrace && next != TokenType::RightBracket &&
         next != TokenType::Comma && next != TokenType::Colon && next != TokenType::EndOfFile);

    if(is_delegate) {
        // yield* requires an argument (the iterable to delegate to)
        if(!has_argument) {
            throw std::runtime_error("'yield*' requires an iterable expression");
        }
        argument = parse_binary_expression(2);  // Parse with assignment precedence
    } else if(has_argument) {
        // yield with optional AssignmentExpression argument
        argument = parse_binary_expression(2);  // Parse with assignment precedence
    }

    auto node = ASTFactory::makeYieldExpression(argument, is_delegate);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

// 15.8 Async Function Definitions / 15.6 Async Generator Function Definitions
// AsyncFunctionExpression :: async function BindingIdentifier? ( FormalParameters )
//                           { AsyncFunctionBody }
// AsyncGeneratorExpression :: async function * BindingIdentifier? ( FormalParameters )
//                            { AsyncGeneratorBody }
// @spec https://tc39.es/ecma262/#sec-async-function-definitions
// @spec https://tc39.es/ecma262/#sec-async-generator-function-definitions
std::shared_ptr<ASTNode> Parser::parse_async_function_expression() {
    Token& startToken = current_token();  // Save 'async' location
    consume(TokenType::Async);            // consume 'async'
    consume(TokenType::Function);         // consume 'function'

    // Check for async generator: async function* () {}
    bool is_async_generator = false;
    if(current_token().type == TokenType::Multiply) {
        is_async_generator = true;
        current++;  // consume '*'
    }

    // AsyncFunctionExpression :: async function BindingIdentifier? ...
    // Optional function name for named async function expressions
    std::string name;
    if(current_token().type == TokenType::Identifier) {
        name = current_token().value;
        size_t nameLine = current_token().line;
        size_t nameColumn = current_token().column;
        current++;  // consume function name
        // 15.8.1 Static Semantics: Early Errors -- validate name in strict mode
        validateIdentifier(name, nameLine, nameColumn);
    }

    // ( UniqueFormalParameters ) — async functions use UniqueFormalParameters
    consume(TokenType::LeftParen);
    auto parameters = parse_parameter_list(true);
    consume(TokenType::RightParen);

    // AsyncFunctionBody / AsyncGeneratorBody
    // Set async (and generator) context so await/yield are recognized
    bool was_in_async = in_async_context_;
    bool was_in_generator = in_generator_context_;
    in_async_context_ = true;
    if(is_async_generator) {
        in_generator_context_ = true;
    }
    auto body = parse_block_statement(true);
    in_async_context_ = was_in_async;
    in_generator_context_ = was_in_generator;

    if(is_async_generator) {
        auto node = ASTFactory::makeGeneratorFunctionExpression(parameters, body, name);
        node->metadata = node->metadata.empty() ? "async" : node->metadata + ",async";
        node->setLocation(startToken.line, startToken.column);
        return node;
    }

    auto node = ASTFactory::makeAsyncFunctionExpression(parameters, body, name);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

// 15.8.1 AwaitExpression
// AwaitExpression :: await UnaryExpression
// @spec https://tc39.es/ecma262/#sec-async-function-definitions
//
// INCOMPLETE: The spec defines await as taking a UnaryExpression operand.
// Rift parses the operand with parse_binary_expression(2) which corresponds
// to assignment-level precedence, not unary. This is slightly different from
// the spec's grammar but works in practice for common usage patterns.
std::shared_ptr<ASTNode> Parser::parse_await_expression() {
    Token& startToken = current_token();

    // 15.8.1 Static Semantics: Early Errors
    // It is a Syntax Error if this production is not nested within an AsyncFunctionBody
    // or an AsyncGeneratorBody.
    if(!in_async_context_) {
        throw std::runtime_error(
            "SyntaxError: 'await' expression is only allowed inside async functions");
    }

    consume(TokenType::Await);  // consume 'await'

    // AwaitExpression :: await UnaryExpression
    auto argument = parse_binary_expression(2);  // Parse with assignment precedence

    auto node = ASTFactory::makeAwaitExpression(argument);
    node->setLocation(startToken.line, startToken.column);
    return node;
}

// 15.9 Async Arrow Function Definitions
// AsyncArrowFunction :: async AsyncArrowBindingIdentifier => AsyncConciseBody
//                     | CoverCallExpressionAndAsyncArrowHead => AsyncConciseBody
// AsyncArrowBindingIdentifier :: BindingIdentifier
// AsyncConciseBody :: [lookahead != {] ExpressionBody
//                   | { AsyncFunctionBody }
// @spec https://tc39.es/ecma262/#sec-async-arrow-function-definitions
//
// DEVIATION: For expression body (async x => expr), Rift wraps the expression
// in a synthetic ReturnStatement + BlockStatement so the async executor can
// handle it uniformly. The non-async arrow uses isExpressionBody=true instead.
std::shared_ptr<ASTNode> Parser::parse_async_arrow_function() {
    Token& startToken = current_token();  // Save 'async' location
    consume(TokenType::Async);            // consume 'async'

    // Parse AsyncArrowBindingIdentifier or parenthesized parameters
    std::shared_ptr<ASTNode> parameters;

    size_t params_end_line;
    if(current_token().type == TokenType::Identifier) {
        // AsyncArrowBindingIdentifier :: BindingIdentifier
        // Single param without parens: async x => ...
        std::string paramValue = current_token().value;
        size_t paramLine = current_token().line;
        size_t paramColumn = current_token().column;
        params_end_line = paramLine;
        parameters = ASTFactory::makeParameterList();
        ASTFactory::addParameter(parameters, ASTFactory::makeIdentifier(paramValue));
        current++;  // consume identifier
        validateIdentifier(paramValue, paramLine, paramColumn);
    } else {
        // CoverCallExpressionAndAsyncArrowHead (parenthesized params)
        // Parenthesized params: async () => ... or async (x, y) => ...
        // Async arrow functions use UniqueFormalParameters — duplicates always an error
        consume(TokenType::LeftParen);
        parameters = parse_parameter_list(true);
        params_end_line = current_token().line;  // line of ')'
        consume(TokenType::RightParen);
    }

    // 15.9 AsyncArrowFunction :: ... [no LineTerminator here] => AsyncConciseBody
    if(current_token().type == TokenType::Arrow && current_token().line != params_end_line) {
        throw std::runtime_error("SyntaxError: Line terminator not permitted before '=>'");
    }

    // AsyncArrowFunction :: ... => AsyncConciseBody
    consume(TokenType::Arrow);

    // AsyncConciseBody :: [lookahead != {] ExpressionBody | { AsyncFunctionBody }
    // Set async context so 'await' expressions are allowed inside the body
    bool was_in_async = in_async_context_;
    in_async_context_ = true;

    std::shared_ptr<ASTNode> body;

    if(current_token().type == TokenType::LeftBrace) {
        // AsyncConciseBody :: { AsyncFunctionBody }
        body = parse_block_statement(true);

        // 15.9.1 Static Semantics: Early Errors
        // It is a Syntax Error if AsyncConciseBody contains a "use strict" directive
        // and IsSimpleParameterList of AsyncArrowBindingIdentifier is false.
        if(!body->children.empty()) {
            const auto& first = body->children[0];
            if(first->type == ASTNodeType::ExpressionStatement && !first->children.empty()) {
                const auto& expr = first->children[0];
                if(expr->type == ASTNodeType::Literal && expr->metadata == "string" &&
                   expr->value == "use strict") {
                    for(const auto& p : parameters->children) {
                        if(p->type != ASTNodeType::Identifier) {
                            throw std::runtime_error(
                                "SyntaxError: Illegal 'use strict' directive in function with "
                                "non-simple parameter list");
                        }
                    }
                }
            }
        }
    } else {
        // AsyncConciseBody :: [lookahead != {] ExpressionBody[+In]
        // DEVIATION: Wraps expression in ReturnStatement + BlockStatement so the
        // async executor can handle it uniformly (unlike non-async arrow which uses
        // isExpressionBody=true).
        bool old_suppress_in = suppress_in_;
        suppress_in_ = false;
        auto expr = parse_binary_expression(0);
        suppress_in_ = old_suppress_in;
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
