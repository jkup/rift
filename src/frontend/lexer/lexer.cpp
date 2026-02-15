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
      brace_depth(0),
      template_started(false),
      last_token_type_(TokenType::Invalid) {
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
    if(c >= '0' && c <= '9')
        return c - '0';
    if(c >= 'a' && c <= 'f')
        return 10 + (c - 'a');
    if(c >= 'A' && c <= 'F')
        return 10 + (c - 'A');
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
            throw std::runtime_error(
                "Invalid unicode code point escape: expected hex digit or '}'");
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
    // Check for legacy octal: starts with 0 followed by octal digits
    if(current_char() == '0') {
        value += current_char();
        advance();
        char next = current_char();
        // 0x/0X = hex, 0o/0O = modern octal, 0b/0B = binary — not legacy octal
        if(next == 'x' || next == 'X') {
            value += current_char();
            advance();
            if(!std::isxdigit(current_char())) {
                throw std::runtime_error("Invalid or unexpected token");
            }
            while(std::isxdigit(current_char()) || current_char() == '_') {
                if(current_char() != '_') value += current_char();
                advance();
            }
            if(current_char() == 'n') advance();  // BigInt suffix (treat as number)
            return Token(TokenType::Number, value, line, column);
        }
        if(next == 'o' || next == 'O') {
            value += current_char();
            advance();
            if(current_char() < '0' || current_char() > '7') {
                throw std::runtime_error("Invalid or unexpected token");
            }
            while((current_char() >= '0' && current_char() <= '7') || current_char() == '_') {
                if(current_char() != '_') value += current_char();
                advance();
            }
            if(std::isdigit(current_char())) {
                throw std::runtime_error("Invalid or unexpected token");
            }
            if(current_char() == 'n') advance();  // BigInt suffix
            return Token(TokenType::Number, value, line, column);
        }
        if(next == 'b' || next == 'B') {
            value += current_char();
            advance();
            if(current_char() != '0' && current_char() != '1') {
                throw std::runtime_error("Invalid or unexpected token");
            }
            while(current_char() == '0' || current_char() == '1' || current_char() == '_') {
                if(current_char() != '_') value += current_char();
                advance();
            }
            if(std::isdigit(current_char())) {
                throw std::runtime_error("Invalid or unexpected token");
            }
            if(current_char() == 'n') advance();  // BigInt suffix
            return Token(TokenType::Number, value, line, column);
        }
        // 0 followed by octal digits (0-7) = legacy octal
        if(next >= '0' && next <= '7') {
            while(current_char() >= '0' && current_char() <= '7') {
                value += current_char();
                advance();
            }
            Token tok(TokenType::Number, value, line, column);
            tok.has_legacy_octal = true;
            return tok;
        }
        // Otherwise fall through to normal decimal parsing (e.g., 0.5, just 0)
    }

    while(std::isdigit(current_char()) || current_char() == '.' || current_char() == '_') {
        if(current_char() != '_') value += current_char();
        advance();
    }

    // Support exponential notation (e.g., 1e10, 2.5E-3)
    if(current_char() == 'e' || current_char() == 'E') {
        value += current_char();
        advance();
        if(current_char() == '+' || current_char() == '-') {
            value += current_char();
            advance();
        }
        while(std::isdigit(current_char()) || current_char() == '_') {
            if(current_char() != '_') value += current_char();
            advance();
        }
    }

    // BigInt suffix (treat as regular number since we don't have BigInt support)
    if(current_char() == 'n') advance();

    return Token(TokenType::Number, value, line, column);
}

Token Lexer::read_string() {
    char quote = current_char();
    advance();  // Skip opening quote

    std::string value;
    value.reserve(256);  // Reserve some space to reduce allocations
    bool has_octal_escape = false;

    while(current_char() != quote && current_char() != '\0' && current_char() != '\n' &&
          current_char() != '\r') {
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
                    // \0 followed by another digit is a legacy octal escape
                    if(peek_char() >= '0' && peek_char() <= '9') {
                        has_octal_escape = true;
                    }
                    value += '\0';
                    break;
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
                    // Legacy octal escape sequences \1-\7
                    has_octal_escape = true;
                    {
                        int octal_val = current_char() - '0';
                        if(peek_char() >= '0' && peek_char() <= '7') {
                            advance();
                            octal_val = octal_val * 8 + (current_char() - '0');
                            if(octal_val <= 037 && peek_char() >= '0' && peek_char() <= '7') {
                                advance();
                                octal_val = octal_val * 8 + (current_char() - '0');
                            }
                        }
                        value += static_cast<char>(octal_val);
                    }
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

    Token tok(TokenType::String, value, line, column);
    tok.has_legacy_octal = has_octal_escape;
    return tok;
}

Token Lexer::read_template_string() {
    // If we're inside a template expression, save the outer state before nesting
    if(template_state == TemplateLiteralState::InExpression) {
        template_stack.push_back({brace_depth, template_started});
    }

    advance();  // Skip opening backtick
    template_state = TemplateLiteralState::InTemplate;
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

            // Restore outer template state if we were nested
            if(!template_stack.empty()) {
                auto outer = template_stack.back();
                template_stack.pop_back();
                template_state = TemplateLiteralState::InExpression;
                brace_depth = outer.brace_depth;
                template_started = outer.template_started;
            } else {
                template_state = TemplateLiteralState::None;
                template_started = false;
            }

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
    template_started = false;
    template_stack.clear();
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
        {"var", TokenType::Var},
        {"let", TokenType::Let},
        {"const", TokenType::Const},
        {"function", TokenType::Function},
        {"return", TokenType::Return},
        {"if", TokenType::If},
        {"else", TokenType::Else},
        {"for", TokenType::For},
        {"while", TokenType::While},
        {"do", TokenType::Do},
        {"switch", TokenType::Switch},
        {"case", TokenType::Case},
        {"default", TokenType::Default},
        {"break", TokenType::Break},
        {"continue", TokenType::Continue},
        {"throw", TokenType::Throw},
        {"try", TokenType::Try},
        {"catch", TokenType::Catch},
        {"finally", TokenType::Finally},
        {"new", TokenType::New},
        {"this", TokenType::This},
        {"in", TokenType::In},
        {"instanceof", TokenType::Instanceof},
        // Note: "of" is a contextual keyword, handled in parser (not here)
        {"true", TokenType::Boolean},
        {"false", TokenType::Boolean},
        {"null", TokenType::Null},
        {"undefined", TokenType::Undefined},
        {"typeof", TokenType::Typeof},
        {"delete", TokenType::Delete},
        {"void", TokenType::Void},
        {"with", TokenType::With},
        {"class", TokenType::Class},
        {"extends", TokenType::Extends},
        {"super", TokenType::Super},
        {"static", TokenType::Static},
        {"yield", TokenType::Yield},
        {"async", TokenType::Async},
        {"await", TokenType::Await},
    };

    auto it = keywords.find(value);
    if(it != keywords.end()) {
        return Token(it->second, value, line, column);
    }

    return Token(TokenType::Identifier, value, line, column);
}

bool Lexer::slash_starts_regex() {
    switch(last_token_type_) {
        // Division context: after tokens that can end an expression
        case TokenType::Number:
        case TokenType::String:
        case TokenType::Boolean:
        case TokenType::Null:
        case TokenType::Undefined:
        case TokenType::Identifier:
        case TokenType::This:
        case TokenType::RightParen:
        case TokenType::RightBracket:
        case TokenType::RightBrace:
        case TokenType::Increment:
        case TokenType::Decrement:
        case TokenType::TemplateEnd:
        case TokenType::TemplateString:
        case TokenType::RegExpLiteral:
            return false;

        // Everything else is regex context (operators, keywords, punctuation, start of file)
        default:
            return true;
    }
}

Token Lexer::read_regex() {
    size_t start_line = line;
    size_t start_column = column;

    advance();  // consume opening '/'

    std::string pattern;
    // Read pattern until unescaped '/'
    while(current_char() != '\0' && current_char() != '\n') {
        if(current_char() == '\\') {
            // Escape sequence - include both backslash and next char
            pattern += current_char();
            advance();
            if(current_char() == '\0' || current_char() == '\n') {
                throw std::runtime_error("Unterminated regular expression literal");
            }
            pattern += current_char();
            advance();
        } else if(current_char() == '[') {
            // Character class - read until unescaped ']'
            pattern += current_char();
            advance();
            while(current_char() != '\0' && current_char() != '\n' && current_char() != ']') {
                if(current_char() == '\\') {
                    pattern += current_char();
                    advance();
                    if(current_char() == '\0' || current_char() == '\n') {
                        throw std::runtime_error("Unterminated regular expression literal");
                    }
                    pattern += current_char();
                    advance();
                } else {
                    pattern += current_char();
                    advance();
                }
            }
            if(current_char() != ']') {
                throw std::runtime_error("Unterminated character class in regular expression");
            }
            pattern += current_char();
            advance();
        } else if(current_char() == '/') {
            break;  // End of pattern
        } else {
            pattern += current_char();
            advance();
        }
    }

    if(current_char() != '/') {
        throw std::runtime_error("Unterminated regular expression literal");
    }
    advance();  // consume closing '/'

    // Read flags: consecutive flag characters
    std::string flags;
    while(current_char() != '\0' &&
          (current_char() == 'g' || current_char() == 'i' || current_char() == 'm' ||
           current_char() == 's' || current_char() == 'u' || current_char() == 'd' ||
           current_char() == 'v' || current_char() == 'y')) {
        flags += current_char();
        advance();
    }

    // Store as /<pattern>/<flags>
    std::string value = "/" + pattern + "/" + flags;
    return Token(TokenType::RegExpLiteral, value, start_line, start_column);
}

Token Lexer::next_token() {
    // Handle template literal state transitions
    if(template_state == TemplateLiteralState::InTemplate) {
        // We're inside a template, continue reading template part
        auto token = read_template_part();
        last_token_type_ = token.type;
        return token;
    }

    skip_whitespace();

    char ch = current_char();

    if(ch == '\0') {
        return Token(TokenType::EndOfFile, "", line, column);
    }

    if(std::isdigit(ch)) {
        auto token = read_number();
        last_token_type_ = token.type;
        return token;
    }

    if(ch == '"' || ch == '\'') {
        auto token = read_string();
        last_token_type_ = token.type;
        return token;
    }

    if(ch == '`') {
        auto token = read_template_string();
        last_token_type_ = token.type;
        return token;
    }

    if(std::isalpha(ch) || ch == '_' || ch == '$') {
        auto token = read_identifier();
        last_token_type_ = token.type;
        return token;
    }

    // Single character tokens - use lambda to track last_token_type_ for all return paths
    auto make_token = [this](TokenType type, const std::string& val, size_t l, size_t c) {
        last_token_type_ = type;
        return Token(type, val, l, c);
    };

    switch(ch) {
        case '+':
            advance();
            if(current_char() == '+') {
                advance();
                return make_token(TokenType::Increment, "++", line, column);
            }
            if(current_char() == '=') {
                advance();
                return make_token(TokenType::PlusAssign, "+=", line, column);
            }
            return make_token(TokenType::Plus, "+", line, column);
        case '-':
            advance();
            if(current_char() == '-') {
                advance();
                return make_token(TokenType::Decrement, "--", line, column);
            }
            if(current_char() == '=') {
                advance();
                return make_token(TokenType::MinusAssign, "-=", line, column);
            }
            return make_token(TokenType::Minus, "-", line, column);
        case '*':
            advance();
            if(current_char() == '*') {
                advance();
                if(current_char() == '=') {
                    advance();
                    return make_token(TokenType::ExponentAssign, "**=", line, column);
                }
                return make_token(TokenType::Exponent, "**", line, column);
            }
            if(current_char() == '=') {
                advance();
                return make_token(TokenType::MultiplyAssign, "*=", line, column);
            }
            return make_token(TokenType::Multiply, "*", line, column);
        case '%':
            advance();
            if(current_char() == '=') {
                advance();
                return make_token(TokenType::ModuloAssign, "%=", line, column);
            }
            return make_token(TokenType::Modulo, "%", line, column);
        case '/':
            if(peek_char() == '/') {
                // Skip single-line comment
                while(current_char() != '\n' && current_char() != '\0') {
                    advance();
                }
                return next_token();  // Recursively get the next token after the comment
            }
            if(peek_char() == '*') {
                // Skip multi-line comment /* ... */
                advance();  // skip /
                advance();  // skip *
                while(current_char() != '\0') {
                    if(current_char() == '*' && peek_char() == '/') {
                        advance();  // skip *
                        advance();  // skip /
                        break;
                    }
                    advance();
                }
                return next_token();  // Recursively get the next token after the comment
            }
            // Check if '/' starts a regex literal or is division
            if(slash_starts_regex()) {
                auto regex_token = read_regex();
                last_token_type_ = regex_token.type;
                return regex_token;
            }
            advance();
            if(current_char() == '=') {
                advance();
                return make_token(TokenType::DivideAssign, "/=", line, column);
            }
            return make_token(TokenType::Divide, "/", line, column);
        case '(':
            advance();
            return make_token(TokenType::LeftParen, "(", line, column);
        case ')':
            advance();
            return make_token(TokenType::RightParen, ")", line, column);
        case '{':
            advance();
            if(template_state == TemplateLiteralState::InExpression) {
                brace_depth++;
            }
            return make_token(TokenType::LeftBrace, "{", line, column);
        case '}':
            advance();
            if(template_state == TemplateLiteralState::InExpression) {
                brace_depth--;
                if(brace_depth == 0) {
                    // End of template expression, return to template parsing
                    template_state = TemplateLiteralState::InTemplate;
                    auto token = read_template_part();
                    last_token_type_ = token.type;
                    return token;
                }
            }
            return make_token(TokenType::RightBrace, "}", line, column);
        case '[':
            advance();
            return make_token(TokenType::LeftBracket, "[", line, column);
        case ']':
            advance();
            return make_token(TokenType::RightBracket, "]", line, column);
        case ';':
            advance();
            return make_token(TokenType::Semicolon, ";", line, column);
        case ',':
            advance();
            return make_token(TokenType::Comma, ",", line, column);
        case '.':
            advance();
            // Check for spread operator ...
            if(current_char() == '.' && peek_char() == '.') {
                advance();  // consume second dot
                advance();  // consume third dot
                return make_token(TokenType::Spread, "...", line, column);
            }
            return make_token(TokenType::Dot, ".", line, column);
        case ':':
            advance();
            return make_token(TokenType::Colon, ":", line, column);
        case '=':
            advance();
            // Arrow function =>
            if(current_char() == '>') {
                advance();
                return make_token(TokenType::Arrow, "=>", line, column);
            }
            // Double equals
            if(current_char() == '=') {
                advance();
                // Strict equals
                if(current_char() == '=') {
                    advance();
                    return make_token(TokenType::EqualStrict, "===", line, column);
                }
                return make_token(TokenType::Equal, "==", line, column);
            }
            return make_token(TokenType::Assign, "=", line, column);
        case '!':
            advance();
            if(current_char() == '=') {
                advance();
                // Strict not equals
                if(current_char() == '=') {
                    advance();
                    return make_token(TokenType::NotEqualStrict, "!==", line, column);
                }
                return make_token(TokenType::NotEqual, "!=", line, column);
            }
            return make_token(TokenType::LogicalNot, "!", line, column);
        case '<':
            advance();
            if(current_char() == '<') {
                advance();
                if(current_char() == '=') {
                    advance();
                    return make_token(TokenType::LeftShiftAssign, "<<=", line, column);
                }
                return make_token(TokenType::LeftShift, "<<", line, column);
            }
            if(current_char() == '=') {
                advance();
                return make_token(TokenType::LessEqual, "<=", line, column);
            }
            return make_token(TokenType::Less, "<", line, column);
        case '>':
            advance();
            if(current_char() == '>') {
                advance();
                if(current_char() == '>') {
                    advance();
                    if(current_char() == '=') {
                        advance();
                        return make_token(TokenType::UnsignedRightShiftAssign, ">>>=", line, column);
                    }
                    return make_token(TokenType::UnsignedRightShift, ">>>", line, column);
                }
                if(current_char() == '=') {
                    advance();
                    return make_token(TokenType::RightShiftAssign, ">>=", line, column);
                }
                return make_token(TokenType::RightShift, ">>", line, column);
            }
            if(current_char() == '=') {
                advance();
                return make_token(TokenType::GreaterEqual, ">=", line, column);
            }
            return make_token(TokenType::Greater, ">", line, column);
        case '~':
            advance();
            return make_token(TokenType::BitwiseNot, "~", line, column);
        case '|':
            advance();
            if(current_char() == '|') {
                advance();
                return make_token(TokenType::LogicalOr, "||", line, column);
            }
            if(current_char() == '=') {
                advance();
                return make_token(TokenType::BitwiseOrAssign, "|=", line, column);
            }
            return make_token(TokenType::BitwiseOr, "|", line, column);
        case '&':
            advance();
            if(current_char() == '&') {
                advance();
                return make_token(TokenType::LogicalAnd, "&&", line, column);
            }
            if(current_char() == '=') {
                advance();
                return make_token(TokenType::BitwiseAndAssign, "&=", line, column);
            }
            return make_token(TokenType::BitwiseAnd, "&", line, column);
        case '^':
            advance();
            if(current_char() == '=') {
                advance();
                return make_token(TokenType::BitwiseXorAssign, "^=", line, column);
            }
            return make_token(TokenType::BitwiseXor, "^", line, column);
        case '?':
            advance();
            if(current_char() == '?') {
                advance();
                if(current_char() == '=') {
                    advance();
                    return make_token(TokenType::NullishCoalescingAssign, "??=", line, column);
                }
                return make_token(TokenType::NullishCoalescing, "??", line, column);
            }
            if(current_char() == '.') {
                // Optional chaining: ?. but NOT ?.digits (that would be ? .5)
                if(peek_char() < '0' || peek_char() > '9') {
                    advance();
                    return make_token(TokenType::OptionalChain, "?.", line, column);
                }
            }
            return make_token(TokenType::QuestionMark, "?", line, column);
        default:
            advance();
            return make_token(TokenType::Invalid, std::string(1, ch), line, column);
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