#pragma once

#include <string>
#include <vector>

#include "token.h"

namespace rift::frontend {

// Template literal parsing state
enum class TemplateLiteralState {
    None,         // Not in template literal
    InTemplate,   // Inside template string part
    InExpression  // Inside ${expression} part
};

// Lexer class
class Lexer {
  private:
    std::string source;
    size_t position;
    size_t line;
    size_t column;

    // Template literal state management
    TemplateLiteralState template_state;
    int template_depth;     // Track nested templates
    int brace_depth;        // Track {} depth in expressions
    bool template_started;  // Track if we've returned TemplateStart yet

    char current_char();
    char peek_char();
    void advance();
    void skip_whitespace();
    Token read_number();
    Token read_string();
    Token read_template_string();
    Token read_template_part();  // New: read template string part
    Token read_identifier();

  public:
    Lexer(const std::string& source);
    Token next_token();
    std::vector<Token> tokenize();
};

}  // namespace rift::frontend