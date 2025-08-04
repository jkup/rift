#include "rift/frontend/lexer/lexer.h"

#include <cctype>
#include <unordered_map>

namespace rift::frontend {

// Lexer implementation
Lexer::Lexer(const std::string& source) : source(source), position(0), line(1), column(1), 
      template_state(TemplateLiteralState::None), template_depth(0), brace_depth(0), template_started(false) {
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
    while(current_char() != quote && current_char() != '\0') {
        if(current_char() == '\\') {
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
                case '"':
                    value += '"';
                    break;
                case '\'':
                    value += '\'';
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
    
    while(current_char() != '\0') {
        // Check for ${ - start of expression
        if(current_char() == '$' && peek_char() == '{') {
            // Always advance past ${ and switch to expression mode
            advance(); // skip $
            advance(); // skip {
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
                case 'n': value += '\n'; break;
                case 't': value += '\t'; break;
                case 'r': value += '\r'; break;
                case '\\': value += '\\'; break;
                case '`': value += '`'; break;
                case '$': value += '$'; break;  // Allow escaping $
                default: value += current_char(); break;
            }
        } else {
            value += current_char();
        }
        advance();
    }
    
    // EOF reached - if we have a simple template, return TemplateString
    if(template_depth == 1) {
        template_state = TemplateLiteralState::None;
        template_depth--;
        template_started = false;  // Reset for next template
        return Token(TokenType::TemplateString, value, line, column);
    }
    
    // Otherwise return what we have as TemplateEnd
    return Token(TokenType::TemplateEnd, value, line, column);
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
        {"while", TokenType::While},   {"throw", TokenType::Throw},
        {"try", TokenType::Try},       {"catch", TokenType::Catch},
        {"new", TokenType::New},       {"this", TokenType::This},
        {"true", TokenType::Boolean},  {"false", TokenType::Boolean},
        {"null", TokenType::Null},     {"undefined", TokenType::Undefined},
        {"typeof", TokenType::Typeof},
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
            return Token(TokenType::Plus, "+", line, column);
        case '-':
            advance();
            if(current_char() == '-') {
                advance();
                return Token(TokenType::Decrement, "--", line, column);
            }
            return Token(TokenType::Minus, "-", line, column);
        case '*':
            advance();
            return Token(TokenType::Multiply, "*", line, column);
        case '/':
            if(peek_char() == '/') {
                // Skip single-line comment
                while(current_char() != '\n' && current_char() != '\0') {
                    advance();
                }
                return next_token();  // Recursively get the next token after the comment
            }
            advance();
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
            return Token(TokenType::Less, "<", line, column);
        case '>':
            advance();
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
            // Single | would be bitwise OR (not implemented yet)
            return Token(TokenType::Invalid, "|", line, column);
        case '&':
            advance();
            if(current_char() == '&') {
                advance();
                return Token(TokenType::LogicalAnd, "&&", line, column);
            }
            // Single & would be bitwise AND (not implemented yet)
            return Token(TokenType::Invalid, "&", line, column);
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