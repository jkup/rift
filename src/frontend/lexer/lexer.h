#pragma once

#include <string>
#include <vector>

#include "token.h"

namespace jsruntime::frontend {

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

}  // namespace jsruntime::frontend