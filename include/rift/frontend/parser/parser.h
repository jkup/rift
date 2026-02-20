#pragma once

#include <memory>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>

#include "../ast/ast_factory.h"
#include "../ast/ast_node.h"
#include "../lexer/token.h"

namespace rift::frontend {

using namespace ast;

// Parser class
class Parser {
  private:
    std::vector<Token> tokens;
    size_t current;
    bool in_generator_context_;  // Track if we're inside a generator function
    bool in_async_context_;      // Track if we're inside an async function
    bool in_strict_mode_;        // Track if we're in strict mode
    bool suppress_in_;  // [~In] flag: suppress 'in' as binary operator (for-statement init)

    // Scope stack for detecting lexical redeclarations and var/lexical conflicts at parse time.
    // Block scopes track let/const/class/function-in-block declarations.
    // Function scopes act as boundaries that stop var hoisting propagation.
    struct ParserScope {
        enum class Kind { Block, Function };
        Kind kind;
        std::unordered_map<std::string, bool> lexical_names;  // name -> is_function_decl
        std::unordered_set<std::string> var_names;
        std::string catch_parameter;  // Non-empty if this is a catch block scope
        ParserScope(Kind k) : kind(k) {
        }
    };
    std::vector<ParserScope> scope_stack_;

    void pushScope(ParserScope::Kind kind);
    void popScope();
    void declareLexicalName(const std::string& name, bool is_func_decl, size_t line, size_t column);
    void declareVarName(const std::string& name, size_t line, size_t column);
    static void collectBoundNames(const std::shared_ptr<ASTNode>& node,
                                  std::vector<std::string>& names);

    Token& current_token();

    // Strict mode reserved word checking
    bool isStrictModeReservedWord(const std::string& name) const;
    void validateIdentifier(const std::string& name, size_t line, size_t column);
    Token& peek_token();
    bool match(TokenType type);
    void consume(TokenType type);

    std::shared_ptr<ASTNode> parse_expression();
    std::shared_ptr<ASTNode> parse_primary();
    std::shared_ptr<ASTNode> parse_unary_expression();
    std::shared_ptr<ASTNode> parse_binary_expression(int precedence);
    std::shared_ptr<ASTNode> parse_statement();
    std::shared_ptr<ASTNode> parse_postfix_expression();
    std::shared_ptr<ASTNode> parse_call_expression(std::shared_ptr<ASTNode> callee);
    std::shared_ptr<ASTNode> parse_member_expression(std::shared_ptr<ASTNode> object);
    std::shared_ptr<ASTNode> parse_computed_member_expression(std::shared_ptr<ASTNode> object);
    std::shared_ptr<ASTNode> parse_variable_declaration();
    std::shared_ptr<ASTNode> parse_if_statement();
    std::shared_ptr<ASTNode> parse_while_statement();
    std::shared_ptr<ASTNode> parse_do_while_statement();
    std::shared_ptr<ASTNode> parse_for_statement();
    std::shared_ptr<ASTNode> parse_switch_statement();
    std::shared_ptr<ASTNode> parse_break_statement();
    std::shared_ptr<ASTNode> parse_continue_statement();
    std::shared_ptr<ASTNode> parse_array_literal();
    std::shared_ptr<ASTNode> parse_object_literal();
    std::shared_ptr<ASTNode> parse_template_literal();

    // New function-related parsing methods
    std::shared_ptr<ASTNode> parse_function_declaration();
    std::shared_ptr<ASTNode> parse_function_expression();
    std::shared_ptr<ASTNode> parse_arrow_function();
    std::shared_ptr<ASTNode> parse_arrow_function_from_identifier(std::shared_ptr<ASTNode> param);
    bool looks_like_arrow_params();
    std::shared_ptr<ASTNode> parse_parameter_list(bool require_unique = false);
    std::shared_ptr<ASTNode> parse_return_statement();
    std::shared_ptr<ASTNode> parse_throw_statement();
    std::shared_ptr<ASTNode> parse_try_statement();
    std::shared_ptr<ASTNode> parse_with_statement();
    std::shared_ptr<ASTNode> parse_catch_clause();
    std::shared_ptr<ASTNode> parse_block_statement(bool is_function_body = false);
    std::shared_ptr<ASTNode> parse_new_expression();

    // Generator-related parsing methods
    std::shared_ptr<ASTNode> parse_generator_function_declaration();
    std::shared_ptr<ASTNode> parse_generator_function_expression();
    std::shared_ptr<ASTNode> parse_yield_expression();

    // Async-related parsing methods
    std::shared_ptr<ASTNode> parse_async_function_declaration();
    std::shared_ptr<ASTNode> parse_async_function_expression();
    std::shared_ptr<ASTNode> parse_async_arrow_function();
    std::shared_ptr<ASTNode> parse_await_expression();

    // Destructuring pattern parsing
    std::shared_ptr<ASTNode> parse_array_pattern();
    std::shared_ptr<ASTNode> parse_object_pattern();
    std::shared_ptr<ASTNode> parse_binding_pattern();  // Dispatches to array or object pattern

    // Class parsing
    std::shared_ptr<ASTNode> parse_class_declaration();
    std::shared_ptr<ASTNode> parse_class_expression();
    std::shared_ptr<ASTNode> parse_class_body();
    std::shared_ptr<ASTNode> parse_method_definition();

  public:
    Parser(const std::vector<Token>& tokens);
    std::shared_ptr<ASTNode> parse();
};

}  // namespace rift::frontend
