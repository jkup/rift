#include "parser.h"
#include <stdexcept>
#include <cctype>
#include <unordered_map>

namespace jsruntime {

// Lexer implementation
Lexer::Lexer(const std::string& source) : source(source), position(0), line(1), column(1) {}

char Lexer::current_char() {
    if (position >= source.length()) {
        return '\0';
    }
    return source[position];
}

char Lexer::peek_char() {
    if (position + 1 >= source.length()) {
        return '\0';
    }
    return source[position + 1];
}

void Lexer::advance() {
    if (position < source.length() && source[position] == '\n') {
        line++;
        column = 1;
    } else {
        column++;
    }
    position++;
}

void Lexer::skip_whitespace() {
    while (std::isspace(current_char())) {
        advance();
    }
}

Token Lexer::read_number() {
    std::string value;
    while (std::isdigit(current_char()) || current_char() == '.') {
        value += current_char();
        advance();
    }
    return Token(TokenType::Number, value, line, column);
}

Token Lexer::read_string() {
    char quote = current_char();
    advance(); // Skip opening quote
    
    std::string value;
    while (current_char() != quote && current_char() != '\0') {
        if (current_char() == '\\') {
            advance();
            switch (current_char()) {
                case 'n': value += '\n'; break;
                case 't': value += '\t'; break;
                case 'r': value += '\r'; break;
                case '\\': value += '\\'; break;
                case '"': value += '"'; break;
                case '\'': value += '\''; break;
                default: value += current_char(); break;
            }
        } else {
            value += current_char();
        }
        advance();
    }
    
    if (current_char() == quote) {
        advance(); // Skip closing quote
    }
    
    return Token(TokenType::String, value, line, column);
}

Token Lexer::read_identifier() {
    std::string value;
    while (std::isalnum(current_char()) || current_char() == '_' || current_char() == '$') {
        value += current_char();
        advance();
    }
    
    // Check for keywords
    static std::unordered_map<std::string, TokenType> keywords = {
        {"var", TokenType::Var},
        {"let", TokenType::Let},
        {"const", TokenType::Const},
        {"function", TokenType::Function},
        {"return", TokenType::Return},
        {"if", TokenType::If},
        {"else", TokenType::Else},
        {"for", TokenType::For},
        {"while", TokenType::While},
        {"true", TokenType::Boolean},
        {"false", TokenType::Boolean},
        {"null", TokenType::Null},
        {"undefined", TokenType::Undefined}
    };
    
    auto it = keywords.find(value);
    if (it != keywords.end()) {
        return Token(it->second, value, line, column);
    }
    
    return Token(TokenType::Identifier, value, line, column);
}

Token Lexer::next_token() {
    skip_whitespace();
    
    char ch = current_char();
    
    if (ch == '\0') {
        return Token(TokenType::EndOfFile, "", line, column);
    }
    
    if (std::isdigit(ch)) {
        return read_number();
    }
    
    if (ch == '"' || ch == '\'') {
        return read_string();
    }
    
    if (std::isalpha(ch) || ch == '_' || ch == '$') {
        return read_identifier();
    }
    
    // Single character tokens
    switch (ch) {
        case '+': advance(); return Token(TokenType::Plus, "+", line, column);
        case '-': advance(); return Token(TokenType::Minus, "-", line, column);
        case '*': advance(); return Token(TokenType::Multiply, "*", line, column);
        case '/': advance(); return Token(TokenType::Divide, "/", line, column);
        case '(': advance(); return Token(TokenType::LeftParen, "(", line, column);
        case ')': advance(); return Token(TokenType::RightParen, ")", line, column);
        case '{': advance(); return Token(TokenType::LeftBrace, "{", line, column);
        case '}': advance(); return Token(TokenType::RightBrace, "}", line, column);
        case ';': advance(); return Token(TokenType::Semicolon, ";", line, column);
        case ',': advance(); return Token(TokenType::Comma, ",", line, column);
        case '=':
            advance();
            if (current_char() == '=') {
                advance();
                return Token(TokenType::Equal, "==", line, column);
            }
            return Token(TokenType::Assign, "=", line, column);
        case '!':
            advance();
            if (current_char() == '=') {
                advance();
                return Token(TokenType::NotEqual, "!=", line, column);
            }
            return Token(TokenType::Invalid, "!", line, column);
        case '<': advance(); return Token(TokenType::Less, "<", line, column);
        case '>': advance(); return Token(TokenType::Greater, ">", line, column);
        default:
            advance();
            return Token(TokenType::Invalid, std::string(1, ch), line, column);
    }
}

std::vector<Token> Lexer::tokenize() {
    std::vector<Token> tokens;
    Token token = next_token();
    
    while (token.type != TokenType::EndOfFile) {
        tokens.push_back(token);
        token = next_token();
    }
    
    tokens.push_back(token); // Add EOF token
    return tokens;
}

// Parser implementation
Parser::Parser(const std::vector<Token>& tokens) : tokens(tokens), current(0) {}

Token& Parser::current_token() {
    if (current >= tokens.size()) {
        static Token eof(TokenType::EndOfFile, "");
        return eof;
    }
    return tokens[current];
}

Token& Parser::peek_token() {
    if (current + 1 >= tokens.size()) {
        static Token eof(TokenType::EndOfFile, "");
        return eof;
    }
    return tokens[current + 1];
}

bool Parser::match(TokenType type) {
    if (current_token().type == type) {
        current++;
        return true;
    }
    return false;
}

void Parser::consume(TokenType type) {
    if (current_token().type != type) {
        throw std::runtime_error("Expected token type, got different type");
    }
    current++;
}

std::shared_ptr<ASTNode> Parser::parse_primary() {
    Token& token = current_token();
    
    switch (token.type) {
        case TokenType::Number:
        case TokenType::String:
        case TokenType::Boolean:
        case TokenType::Null:
        case TokenType::Undefined: {
            auto node = std::make_shared<ASTNode>(ASTNodeType::Literal, token.value);
            current++;
            return node;
        }
        case TokenType::Identifier: {
            auto node = std::make_shared<ASTNode>(ASTNodeType::Identifier, token.value);
            current++;
            return node;
        }
        case TokenType::LeftParen: {
            current++; // consume '('
            auto expr = parse_expression();
            consume(TokenType::RightParen);
            return expr;
        }
        default:
            throw std::runtime_error("Unexpected token in primary expression");
    }
}

std::shared_ptr<ASTNode> Parser::parse_binary_expression(int precedence) {
    auto left = parse_primary();
    
    while (true) {
        Token& op = current_token();
        int op_precedence = 0;
        
        switch (op.type) {
            case TokenType::Plus:
            case TokenType::Minus:
                op_precedence = 1;
                break;
            case TokenType::Multiply:
            case TokenType::Divide:
                op_precedence = 2;
                break;
            default:
                return left;
        }
        
        if (op_precedence < precedence) {
            return left;
        }
        
        current++; // consume operator
        auto right = parse_binary_expression(op_precedence + 1);
        
        auto binary_node = std::make_shared<ASTNode>(ASTNodeType::BinaryExpression, op.value);
        binary_node->children.push_back(left);
        binary_node->children.push_back(right);
        left = binary_node;
    }
}

std::shared_ptr<ASTNode> Parser::parse_expression() {
    return parse_binary_expression(0);
}

std::shared_ptr<ASTNode> Parser::parse_variable_declaration() {
    consume(TokenType::Var); // consume 'var'
    
    if (current_token().type != TokenType::Identifier) {
        throw std::runtime_error("Expected identifier after 'var'");
    }
    
    std::string name = current_token().value;
    current++;
    
    auto decl_node = std::make_shared<ASTNode>(ASTNodeType::VariableDeclaration, name);
    
    if (match(TokenType::Assign)) {
        auto init_expr = parse_expression();
        decl_node->children.push_back(init_expr);
    }
    
    return decl_node;
}

std::shared_ptr<ASTNode> Parser::parse_statement() {
    if (current_token().type == TokenType::Var) {
        auto stmt = parse_variable_declaration();
        match(TokenType::Semicolon); // optional semicolon
        return stmt;
    }
    
    // Expression statement
    auto expr = parse_expression();
    auto stmt = std::make_shared<ASTNode>(ASTNodeType::ExpressionStatement);
    stmt->children.push_back(expr);
    match(TokenType::Semicolon); // optional semicolon
    return stmt;
}

std::shared_ptr<ASTNode> Parser::parse() {
    auto program = std::make_shared<ASTNode>(ASTNodeType::Program);
    
    while (current_token().type != TokenType::EndOfFile) {
        try {
            auto stmt = parse_statement();
            program->children.push_back(stmt);
        } catch (const std::exception& e) {
            // Skip to next statement on error
            while (current_token().type != TokenType::Semicolon && 
                   current_token().type != TokenType::EndOfFile) {
                current++;
            }
            if (current_token().type == TokenType::Semicolon) {
                current++;
            }
        }
    }
    
    return program;
}

} // namespace jsruntime 