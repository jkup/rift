#include "rift/frontend/lexer/lexer.h"

#include <cctype>
#include <stdexcept>
#include <unordered_map>

#include "rift/core/runtime_limits.h"

namespace rift::frontend {

// Lexer implementation
Lexer::Lexer(const std::string& source)
    : source(source),
      position(0),
      line(1),
      column(1),
      template_state(TemplateLiteralState::None),
      template_depth(0),
      brace_depth(0),
      template_started(false) {
}

char Lexer::current_char() {
    if(position >= source.length()) {
        return '\0';
    }
    return source[position];
}

char Lexer::peek_char() {
    if(position + 1 >= source.length()) {
        return '\0';
    }
    return source[position + 1];
}

void Lexer::advance() {
    if(position < source.length() && source[position] == '\n') {
        line++;
        column = 1;
    } else {
        column++;
    }
    position++;
}

void Lexer::skip_whitespace() {
    while(std::isspace(current_char())) {
        advance();
    }
}

// Helper function to parse hex digit
int Lexer::parse_hex_digit(char c) {
    if(c >= '0' && c <= '9') return c - '0';
    if(c >= 'a' && c <= 'f') return 10 + (c - 'a');
    if(c >= 'A' && c <= 'F') return 10 + (c - 'A');
    return -1;  // Invalid hex digit
}

// Helper function to parse 2-digit hex escape (\xHH)
char Lexer::parse_hex_escape() {
    // Current char should be first hex digit after \x
    int digit1 = parse_hex_digit(current_char());
    if(digit1 == -1) {
        throw std::runtime_error("Invalid hex escape sequence: expected hex digit");
    }
    advance();
    
    int digit2 = parse_hex_digit(current_char());
    if(digit2 == -1) {
        throw std::runtime_error("Invalid hex escape sequence: expected second hex digit");
    }
    
    return static_cast<char>((digit1 << 4) | digit2);
}

// Helper function to parse 4-digit unicode escape (\uHHHH)
std::string Lexer::parse_unicode_escape() {
    // Parse 4 hex digits
    int codepoint = 0;
    for(int i = 0; i < 4; i++) {
        int digit = parse_hex_digit(current_char());
        if(digit == -1) {
            throw std::runtime_error("Invalid unicode escape sequence: expected 4 hex digits");
        }
        codepoint = (codepoint << 4) | digit;
        advance();
    }
    
    // Convert Unicode code point to UTF-8
    std::string result;
    if(codepoint <= 0x7F) {
        // 1-byte sequence (ASCII)
        result += static_cast<char>(codepoint);
    } else if(codepoint <= 0x7FF) {
        // 2-byte sequence
        result += static_cast<char>(0xC0 | (codepoint >> 6));
        result += static_cast<char>(0x80 | (codepoint & 0x3F));
    } else {
        // 3-byte sequence (covers BMP 0x0800 to 0xFFFF)
        result += static_cast<char>(0xE0 | (codepoint >> 12));
        result += static_cast<char>(0x80 | ((codepoint >> 6) & 0x3F));
        result += static_cast<char>(0x80 | (codepoint & 0x3F));
    }
    
    // Back up one character since the loop will advance again
    position--;
    column--;
    
    return result;
}

// Helper function to parse unicode code point escape (\u{H...})
std::string Lexer::parse_unicode_codepoint_escape() {
    // Current char should be '{' after \u
    if(current_char() != '{') {
        throw std::runtime_error("Invalid unicode code point escape: expected '{'");
    }
    advance();
    
    // Parse hex digits until we hit '}'
    int codepoint = 0;
    int digitCount = 0;
    while(current_char() != '}' && current_char() != '\0') {
        int digit = parse_hex_digit(current_char());
        if(digit == -1) {
            throw std::runtime_error("Invalid unicode code point escape: expected hex digit or '}'");
        }
        codepoint = (codepoint << 4) | digit;
        digitCount++;
        if(digitCount > 6) {  // Max 6 hex digits (0x10FFFF)
            throw std::runtime_error("Invalid unicode code point escape: code point too large");
        }
        advance();
    }
    
    if(current_char() != '}') {
        throw std::runtime_error("Invalid unicode code point escape: expected '}'");
    }
    
    // Validate code point range
    if(codepoint > 0x10FFFF) {
        throw std::runtime_error("Invalid unicode code point escape: code point out of range");
    }
    
    // Convert Unicode code point to UTF-8
    std::string result;
    if(codepoint <= 0x7F) {
        // 1-byte sequence
        result += static_cast<char>(codepoint);
    } else if(codepoint <= 0x7FF) {
        // 2-byte sequence
        result += static_cast<char>(0xC0 | (codepoint >> 6));
        result += static_cast<char>(0x80 | (codepoint & 0x3F));
    } else if(codepoint <= 0xFFFF) {
        // 3-byte sequence
        result += static_cast<char>(0xE0 | (codepoint >> 12));
        result += static_cast<char>(0x80 | ((codepoint >> 6) & 0x3F));
        result += static_cast<char>(0x80 | (codepoint & 0x3F));
    } else {
        // 4-byte sequence (for code points above BMP)
        result += static_cast<char>(0xF0 | (codepoint >> 18));
        result += static_cast<char>(0x80 | ((codepoint >> 12) & 0x3F));
        result += static_cast<char>(0x80 | ((codepoint >> 6) & 0x3F));
        result += static_cast<char>(0x80 | (codepoint & 0x3F));
    }
    
    return result;
}

Token Lexer::read_number() {
    std::string value;
    while(std::isdigit(current_char()) || current_char() == '.') {
        value += current_char();
        advance();
    }
    return Token(TokenType::Number, value, line, column);
}

Token Lexer::read_string() {
    char quote = current_char();
    advance();  // Skip opening quote

    std::string value;
    value.reserve(256);  // Reserve some space to reduce allocations

    while(current_char() != quote && current_char() != '\0') {
        // Check string length limit (prevent DoS via huge strings)
        if(value.length() >= rift::core::RuntimeLimits::MAX_STRING_LENGTH) {
            throw std::runtime_error("String literal exceeds maximum length (" +
                                     std::to_string(rift::core::RuntimeLimits::MAX_STRING_LENGTH) +
                                     " characters)");
        }

        if(current_char() == '\\') {
            advance();
            
            // Validate escape sequence exists
            if(current_char() == '\0') {
                throw std::runtime_error("Unterminated escape sequence in string literal");
            }
            
            switch(current_char()) {
                case 'n':
                    value += '\n';
                    break;
                case 't':
                    value += '\t';
                    break;
                case 'r':
                    value += '\r';
                    break;
                case '\\':
                    value += '\\';
                    break;
                case '"':
                    value += '"';
                    break;
                case '\'':
                    value += '\'';
                    break;
                case '0':
                    value += '\0';
                    break;
                case 'b':
                    value += '\b';
                    break;
                case 'f':
                    value += '\f';
                    break;
                case 'v':
                    value += '\v';
                    break;
                case 'x':
                    // Hex escape: \xHH
                    advance();
                    value += parse_hex_escape();
                    break;
                case 'u':
                    // Unicode escape: \uHHHH or \u{H...}
                    advance();
                    if(current_char() == '{') {
                        value += parse_unicode_codepoint_escape();
                    } else {
                        value += parse_unicode_escape();
                    }
                    break;
                case '\n':
                case '\r':
                    // Line continuation: backslash followed by newline
                    // Just skip the newline, don't add anything to the string
                    if(current_char() == '\r' && peek_char() == '\n') {
                        advance();  // Skip \r\n
                    }
                    break;
                // For unrecognized escape sequences, include the backslash
                // (ECMAScript behavior for non-standard escapes)
                default:
                    value += '\\';
                    value += current_char();
                    break;
            }
        } else {
            value += current_char();
        }
        advance();
    }

    // Check for unterminated string
    if(current_char() != quote) {
        throw std::runtime_error("Unterminated string literal");
    }

    if(current_char() == quote) {
        advance();  // Skip closing quote
    }

    return Token(TokenType::String, value, line, column);
}

Token Lexer::read_template_string() {
    advance();  // Skip opening backtick
    template_state = TemplateLiteralState::InTemplate;
    template_depth++;
    template_started = false;  // Reset for new template

    return read_template_part();
}

Token Lexer::read_template_part() {
    std::string value;
    value.reserve(256);  // Reserve some space

    while(current_char() != '\0') {
        // Check string length limit
        if(value.length() >= rift::core::RuntimeLimits::MAX_STRING_LENGTH) {
            throw std::runtime_error("Template literal exceeds maximum length (" +
                                     std::to_string(rift::core::RuntimeLimits::MAX_STRING_LENGTH) +
                                     " characters)");
        }

        // Check for ${ - start of expression
        if(current_char() == '$' && peek_char() == '{') {
            // Always advance past ${ and switch to expression mode
            advance();  // skip $
            advance();  // skip {
            template_state = TemplateLiteralState::InExpression;
            brace_depth = 1;

            // Return the text before ${ (if any)
            TokenType type;
            if(!template_started) {
                template_started = true;
                type = TokenType::TemplateStart;
            } else {
                type = TokenType::TemplateMiddle;
            }
            return Token(type, value, line, column);
        }
        // Check for end of template
        else if(current_char() == '`') {
            advance();  // Skip closing backtick
            template_state = TemplateLiteralState::None;
            template_depth--;
            template_started = false;  // Reset for next template

            // Return final part
            TokenType type = TokenType::TemplateEnd;
            return Token(type, value, line, column);
        }
        // Handle escape sequences
        else if(current_char() == '\\') {
            advance();
            switch(current_char()) {
                case 'n':
                    value += '\n';
                    break;
                case 't':
                    value += '\t';
                    break;
                case 'r':
                    value += '\r';
                    break;
                case '\\':
                    value += '\\';
                    break;
                case '`':
                    value += '`';
                    break;
                case '$':
                    value += '$';
                    break;  // Allow escaping $
                case 'x':
                    // Hex escape: \xHH
                    advance();
                    value += parse_hex_escape();
                    break;
                case 'u':
                    // Unicode escape: \uHHHH or \u{H...}
                    advance();
                    if(current_char() == '{') {
                        value += parse_unicode_codepoint_escape();
                    } else {
                        value += parse_unicode_escape();
                    }
                    break;
                case '\n':
                case '\r':
                    // Line continuation in template literals
                    if(current_char() == '\r' && peek_char() == '\n') {
                        advance();  // Skip \r\n
                    }
                    break;
                default:
                    value += current_char();
                    break;
            }
        } else {
            value += current_char();
        }
        advance();
    }

    // EOF reached while inside template literal - this is an error!
    // Template literals must be properly closed with a backtick
    template_state = TemplateLiteralState::None;
    template_depth = 0;
    template_started = false;
    throw std::runtime_error("Unterminated template literal");
}

Token Lexer::read_identifier() {
    std::string value;
    while(std::isalnum(current_char()) || current_char() == '_' || current_char() == '$') {
        value += current_char();
        advance();
    }

    // Check for keywords
    static std::unordered_map<std::string, TokenType> keywords = {
        {"var", TokenType::Var},       {"let", TokenType::Let},
        {"const", TokenType::Const},   {"function", TokenType::Function},
        {"return", TokenType::Return}, {"if", TokenType::If},
        {"else", TokenType::Else},     {"for", TokenType::For},
        {"while", TokenType::While},   {"do", TokenType::Do},
        {"switch", TokenType::Switch}, {"case", TokenType::Case},
        {"default", TokenType::Default}, {"break", TokenType::Break},
        {"continue", TokenType::Continue}, {"throw", TokenType::Throw},
        {"try", TokenType::Try},       {"catch", TokenType::Catch},
        {"finally", TokenType::Finally}, {"new", TokenType::New},
        {"this", TokenType::This},     {"in", TokenType::In},
        {"true", TokenType::Boolean},
        {"false", TokenType::Boolean}, {"null", TokenType::Null},
        {"undefined", TokenType::Undefined}, {"typeof", TokenType::Typeof},
    };

    auto it = keywords.find(value);
    if(it != keywords.end()) {
        return Token(it->second, value, line, column);
    }

    return Token(TokenType::Identifier, value, line, column);
}

Token Lexer::next_token() {
    // Handle template literal state transitions
    if(template_state == TemplateLiteralState::InTemplate) {
        // We're inside a template, continue reading template part
        return read_template_part();
    }

    skip_whitespace();

    char ch = current_char();

    if(ch == '\0') {
        return Token(TokenType::EndOfFile, "", line, column);
    }

    if(std::isdigit(ch)) {
        return read_number();
    }

    if(ch == '"' || ch == '\'') {
        return read_string();
    }

    if(ch == '`') {
        return read_template_string();
    }

    if(std::isalpha(ch) || ch == '_' || ch == '$') {
        return read_identifier();
    }

    // Single character tokens
    switch(ch) {
        case '+':
            advance();
            if(current_char() == '+') {
                advance();
                return Token(TokenType::Increment, "++", line, column);
            }
            if(current_char() == '=') {
                advance();
                return Token(TokenType::PlusAssign, "+=", line, column);
            }
            return Token(TokenType::Plus, "+", line, column);
        case '-':
            advance();
            if(current_char() == '-') {
                advance();
                return Token(TokenType::Decrement, "--", line, column);
            }
            if(current_char() == '=') {
                advance();
                return Token(TokenType::MinusAssign, "-=", line, column);
            }
            return Token(TokenType::Minus, "-", line, column);
        case '*':
            advance();
            if(current_char() == '*') {
                advance();
                if(current_char() == '=') {
                    advance();
                    return Token(TokenType::ExponentAssign, "**=", line, column);
                }
                return Token(TokenType::Exponent, "**", line, column);
            }
            if(current_char() == '=') {
                advance();
                return Token(TokenType::MultiplyAssign, "*=", line, column);
            }
            return Token(TokenType::Multiply, "*", line, column);
        case '%':
            advance();
            if(current_char() == '=') {
                advance();
                return Token(TokenType::ModuloAssign, "%=", line, column);
            }
            return Token(TokenType::Modulo, "%", line, column);
        case '/':
            if(peek_char() == '/') {
                // Skip single-line comment
                while(current_char() != '\n' && current_char() != '\0') {
                    advance();
                }
                return next_token();  // Recursively get the next token after the comment
            }
            advance();
            if(current_char() == '=') {
                advance();
                return Token(TokenType::DivideAssign, "/=", line, column);
            }
            return Token(TokenType::Divide, "/", line, column);
        case '(':
            advance();
            return Token(TokenType::LeftParen, "(", line, column);
        case ')':
            advance();
            return Token(TokenType::RightParen, ")", line, column);
        case '{':
            advance();
            if(template_state == TemplateLiteralState::InExpression) {
                brace_depth++;
            }
            return Token(TokenType::LeftBrace, "{", line, column);
        case '}':
            advance();
            if(template_state == TemplateLiteralState::InExpression) {
                brace_depth--;
                if(brace_depth == 0) {
                    // End of template expression, return to template parsing
                    template_state = TemplateLiteralState::InTemplate;
                    return read_template_part();
                }
            }
            return Token(TokenType::RightBrace, "}", line, column);
        case '[':
            advance();
            return Token(TokenType::LeftBracket, "[", line, column);
        case ']':
            advance();
            return Token(TokenType::RightBracket, "]", line, column);
        case ';':
            advance();
            return Token(TokenType::Semicolon, ";", line, column);
        case ',':
            advance();
            return Token(TokenType::Comma, ",", line, column);
        case '.':
            advance();
            return Token(TokenType::Dot, ".", line, column);
        case ':':
            advance();
            return Token(TokenType::Colon, ":", line, column);
        case '=':
            advance();
            // Arrow function =>
            if(current_char() == '>') {
                advance();
                return Token(TokenType::Arrow, "=>", line, column);
            }
            // Double equals
            if(current_char() == '=') {
                advance();
                // Strict equals
                if(current_char() == '=') {
                    advance();
                    return Token(TokenType::EqualStrict, "===", line, column);
                }
                return Token(TokenType::Equal, "==", line, column);
            }
            return Token(TokenType::Assign, "=", line, column);
        case '!':
            advance();
            if(current_char() == '=') {
                advance();
                // Strict not equals
                if(current_char() == '=') {
                    advance();
                    return Token(TokenType::NotEqualStrict, "!==", line, column);
                }
                return Token(TokenType::NotEqual, "!=", line, column);
            }
            return Token(TokenType::LogicalNot, "!", line, column);
        case '<':
            advance();
            if(current_char() == '<') {
                advance();
                if(current_char() == '=') {
                    advance();
                    return Token(TokenType::LeftShiftAssign, "<<=", line, column);
                }
                return Token(TokenType::LeftShift, "<<", line, column);
            }
            if(current_char() == '=') {
                advance();
                return Token(TokenType::LessEqual, "<=", line, column);
            }
            return Token(TokenType::Less, "<", line, column);
        case '>':
            advance();
            if(current_char() == '>') {
                advance();
                if(current_char() == '>') {
                    advance();
                    if(current_char() == '=') {
                        advance();
                        return Token(TokenType::UnsignedRightShiftAssign, ">>>=", line, column);
                    }
                    return Token(TokenType::UnsignedRightShift, ">>>", line, column);
                }
                if(current_char() == '=') {
                    advance();
                    return Token(TokenType::RightShiftAssign, ">>=", line, column);
                }
                return Token(TokenType::RightShift, ">>", line, column);
            }
            if(current_char() == '=') {
                advance();
                return Token(TokenType::GreaterEqual, ">=", line, column);
            }
            return Token(TokenType::Greater, ">", line, column);
        case '~':
            advance();
            return Token(TokenType::BitwiseNot, "~", line, column);
        case '|':
            advance();
            if(current_char() == '|') {
                advance();
                return Token(TokenType::LogicalOr, "||", line, column);
            }
            if(current_char() == '=') {
                advance();
                return Token(TokenType::BitwiseOrAssign, "|=", line, column);
            }
            return Token(TokenType::BitwiseOr, "|", line, column);
        case '&':
            advance();
            if(current_char() == '&') {
                advance();
                return Token(TokenType::LogicalAnd, "&&", line, column);
            }
            if(current_char() == '=') {
                advance();
                return Token(TokenType::BitwiseAndAssign, "&=", line, column);
            }
            return Token(TokenType::BitwiseAnd, "&", line, column);
        case '^':
            advance();
            if(current_char() == '=') {
                advance();
                return Token(TokenType::BitwiseXorAssign, "^=", line, column);
            }
            return Token(TokenType::BitwiseXor, "^", line, column);
        default:
            advance();
            return Token(TokenType::Invalid, std::string(1, ch), line, column);
    }
}

std::vector<Token> Lexer::tokenize() {
    std::vector<Token> tokens;
    Token token = next_token();

    while(token.type != TokenType::EndOfFile) {
        tokens.push_back(token);
        token = next_token();
    }

    tokens.push_back(token);  // Add EOF token
    return tokens;
}

}  // namespace rift::frontend