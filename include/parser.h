#pragma once

#include <memory>
#include <string>
#include <vector>

namespace jsruntime {

// Token types for lexical analysis
enum class TokenType {
    // Literals
    Number,
    String,
    Boolean,
    Null,
    Undefined,

    // Identifiers
    Identifier,

    // Keywords
    Var,
    Let,
    Const,
    Function,
    Return,
    If,
    Else,
    For,
    While,

    // Operators
    Plus,
    Minus,
    Multiply,
    Divide,
    Assign,
    Equal,
    NotEqual,
    Less,
    Greater,

    // Punctuation
    LeftParen,
    RightParen,
    LeftBrace,
    RightBrace,
    Semicolon,
    Comma,

    // Special
    EndOfFile,
    Invalid
};

struct Token {
    TokenType type;
    std::string value;
    size_t line;
    size_t column;

    Token(TokenType t, const std::string& v, size_t l = 0, size_t c = 0)
        : type(t), value(v), line(l), column(c) {}

    std::string toString() const {
        return "Token(" + std::to_string(static_cast<int>(type)) + ", \"" + value + "\", " +
               std::to_string(line) + ":" + std::to_string(column) + ")";
    }
};

// Simple AST node types
enum class ASTNodeType {
    Program,
    Literal,
    Identifier,
    BinaryExpression,
    UnaryExpression,
    AssignmentExpression,
    VariableDeclaration,
    ExpressionStatement,
    BlockStatement
};

struct ASTNode {
    ASTNodeType type;
    std::vector<std::shared_ptr<ASTNode>> children;
    std::string value;

    ASTNode(ASTNodeType t) : type(t) {}
    ASTNode(ASTNodeType t, const std::string& v) : type(t), value(v) {}
};

// Lexer class
class Lexer {
   private:
    std::string source;
    size_t position;
    size_t line;
    size_t column;

    char current_char();
    char peek_char();
    void advance();
    void skip_whitespace();
    Token read_number();
    Token read_string();
    Token read_identifier();

   public:
    Lexer(const std::string& source);
    Token next_token();
    std::vector<Token> tokenize();
};

// Parser class
class Parser {
   private:
    std::vector<Token> tokens;
    size_t current;

    Token& current_token();
    Token& peek_token();
    bool match(TokenType type);
    void consume(TokenType type);

    std::shared_ptr<ASTNode> parse_expression();
    std::shared_ptr<ASTNode> parse_primary();
    std::shared_ptr<ASTNode> parse_binary_expression(int precedence);
    std::shared_ptr<ASTNode> parse_statement();
    std::shared_ptr<ASTNode> parse_variable_declaration();

   public:
    Parser(const std::vector<Token>& tokens);
    std::shared_ptr<ASTNode> parse();
};

}  // namespace jsruntime