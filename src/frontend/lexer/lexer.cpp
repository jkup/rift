// ============================================================================
// ECMA-262 -- Lexical Grammar (Chapter 12)
// Implements the tokenizer for ECMAScript source text, converting a stream of
// Unicode code points into a sequence of input elements (tokens).
// @spec https://tc39.es/ecma262/#sec-ecmascript-language-lexical-grammar
//
// Key grammar productions implemented:
//   - WhiteSpace (12.2)
//   - LineTerminator (12.3)
//   - SingleLineComment, MultiLineComment (12.4)
//   - IdentifierName, ReservedWord (12.6)
//   - Punctuator, DivPunctuator (12.7)
//   - NullLiteral, BooleanLiteral (12.8.1, 12.8.2)
//   - NumericLiteral (12.8.3)
//   - StringLiteral (12.8.4)
//   - RegularExpressionLiteral (12.8.5)
//   - Template, TemplateHead, TemplateMiddle, TemplateTail (12.8.6)
//
// 12.5 Tokens
// InputElementDiv :: WhiteSpace | LineTerminator | Comment | CommonToken | DivPunctuator
// InputElementRegExp :: WhiteSpace | LineTerminator | Comment | CommonToken |
//                       RegularExpressionLiteral
// InputElementTemplateTail :: WhiteSpace | LineTerminator | Comment | CommonToken |
//                             TemplateSubstitutionTail
// SIMPLIFIED: The spec uses multiple goal symbols (InputElementDiv, InputElementRegExp,
// InputElementRegExpOrTemplateTail, InputElementTemplateTail) selected by the parser.
// Rift uses a last_token_type_ heuristic to disambiguate `/` as division vs regex,
// and tracks template_state to handle template literal re-scanning.
// @spec https://tc39.es/ecma262/#sec-ecmascript-language-lexical-grammar
//
// INCOMPLETE: 12.1 Unicode Format-Control Characters (U+200C ZWNJ, U+200D ZWJ,
// U+FEFF BOM) are not handled. Only ASCII whitespace and identifiers are supported.
// ============================================================================

#include "rift/frontend/lexer/lexer.h"

#include <cctype>
#include <stdexcept>
#include <unordered_map>
#include <unordered_set>

#include "rift/runtime_limits.h"

namespace rift::frontend {

// Constructor -- initializes the lexer state for scanning source text.
// The spec describes source text as a sequence of Unicode code points (10.1).
// SIMPLIFIED: Rift operates on std::string (UTF-8 bytes) rather than
// decoded Unicode code points. ASCII characters are handled correctly;
// multi-byte UTF-8 sequences are passed through but not decoded for
// identifier/whitespace classification.
// @spec https://tc39.es/ecma262/#sec-source-text
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

// Returns the current source character, or '\0' at end of input.
char Lexer::current_char() {
    if(position >= source.length()) {
        return '\0';
    }
    return source[position];
}

// Returns the next source character (lookahead by 1), or '\0' at end of input.
char Lexer::peek_char() {
    if(position + 1 >= source.length()) {
        return '\0';
    }
    return source[position + 1];
}

// Advances the position by one character, tracking line/column for
// error reporting. Recognizes '\n' as a line terminator.
// 12.3 Line Terminators
// LineTerminator :: <LF> | <CR> | <LS> | <PS>
// INCOMPLETE: Only LF (\n) is tracked for line counting. CR (\r), LS (U+2028),
// and PS (U+2029) are not recognized as line terminators by advance().
// @spec https://tc39.es/ecma262/#sec-line-terminators
void Lexer::advance() {
    if(position < source.length() && source[position] == '\n') {
        line++;
        column = 1;
    } else {
        column++;
    }
    position++;
}

// 12.2 White Space
// WhiteSpace :: <TAB> | <VT> | <FF> | <SP> | <NBSP> | <ZWNBSP> | <USP>
// Consumes all whitespace characters before the next meaningful token.
// SIMPLIFIED: Uses C++ std::isspace() which covers TAB, VT, FF, SP, CR, LF
// but not NBSP (U+00A0), ZWNBSP (U+FEFF), or other Unicode space separators (USP).
// Note: std::isspace() also matches CR and LF, which the spec classifies as
// LineTerminators (12.3) rather than WhiteSpace, but skipping them here is
// harmless since Rift does not implement automatic semicolon insertion in the lexer.
// @spec https://tc39.es/ecma262/#sec-white-space
void Lexer::skip_whitespace() {
    while(std::isspace(current_char())) {
        advance();
    }
}

// Helper: converts a single hex character to its numeric value (0-15).
// Used by HexEscapeSequence and UnicodeEscapeSequence parsing.
// HexDigit :: one of 0 1 2 3 4 5 6 7 8 9 a b c d e f A B C D E F
// @spec https://tc39.es/ecma262/#prod-HexDigit
int Lexer::parse_hex_digit(char c) {
    if(c >= '0' && c <= '9')
        return c - '0';
    if(c >= 'a' && c <= 'f')
        return 10 + (c - 'a');
    if(c >= 'A' && c <= 'F')
        return 10 + (c - 'A');
    return -1;  // Invalid hex digit
}

// 12.8.4 String Literals -- HexEscapeSequence
// HexEscapeSequence :: x HexDigit HexDigit
// Parses the two hex digits after \x and returns the corresponding character.
// @spec https://tc39.es/ecma262/#prod-HexEscapeSequence
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

// 12.8.4 String Literals -- UnicodeEscapeSequence (4-digit form)
// UnicodeEscapeSequence :: u Hex4Digits
// Hex4Digits :: HexDigit HexDigit HexDigit HexDigit
// Parses exactly 4 hex digits after \u and converts the code point to UTF-8.
// INCOMPLETE: Does not handle surrogate pairs. A \uD800\uDC00 sequence should
// be combined into a single supplementary code point, but each \uHHHH is decoded
// independently, producing potentially invalid surrogate code points in the output.
// @spec https://tc39.es/ecma262/#prod-UnicodeEscapeSequence
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

// 12.8.4 String Literals -- UnicodeEscapeSequence (code point form)
// UnicodeEscapeSequence :: u{ CodePoint }
// CodePoint :: HexDigits[~Sep] but only if MV of HexDigits <= 0x10FFFF
// Parses a variable-length hex sequence inside \u{...} and converts to UTF-8.
// This form supports the full Unicode range (U+0000 to U+10FFFF), including
// supplementary characters above the BMP which require 4-byte UTF-8 sequences.
// @spec https://tc39.es/ecma262/#prod-UnicodeEscapeSequence
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

    // Validate code point range (must be <= 0x10FFFF per spec)
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

// 12.8.3 Numeric Literals
// NumericLiteral :: DecimalLiteral | DecimalBigIntegerLiteral |
//                   NonDecimalIntegerLiteral | NonDecimalIntegerLiteral BigIntLiteralSuffix |
//                   LegacyOctalIntegerLiteral
// @spec https://tc39.es/ecma262/#sec-literals-numeric-literals
Token Lexer::read_number() {
    std::string value;
    // Check for leading zero: dispatches to non-decimal integer literals or legacy octal.
    if(current_char() == '0') {
        value += current_char();
        advance();
        char next = current_char();

        // HexIntegerLiteral :: 0x HexDigits | 0X HexDigits
        // @spec https://tc39.es/ecma262/#prod-HexIntegerLiteral
        if(next == 'x' || next == 'X') {
            value += current_char();
            advance();
            if(!std::isxdigit(current_char())) {
                throw std::runtime_error("SyntaxError: Invalid or unexpected token");
            }
            // HexDigits :: HexDigit | HexDigits NumericLiteralSeparator HexDigit
            // NumericLiteralSeparator :: _
            {
                bool last_was_separator = false;
                while(std::isxdigit(current_char()) || current_char() == '_') {
                    if(current_char() == '_') {
                        if(last_was_separator) {
                            throw std::runtime_error("SyntaxError: Invalid or unexpected token");
                        }
                        last_was_separator = true;
                    } else {
                        last_was_separator = false;
                        value += current_char();
                    }
                    advance();
                }
                if(last_was_separator) {
                    throw std::runtime_error("SyntaxError: Invalid or unexpected token");
                }
            }
            // BigIntLiteralSuffix :: n
            // SIMPLIFIED: BigInt suffix is consumed but the value is treated as a
            // regular Number since Rift does not implement BigInt.
            if(current_char() == 'n')
                advance();
            return Token(TokenType::Number, value, line, column);
        }

        // OctalIntegerLiteral :: 0o OctalDigits | 0O OctalDigits
        // @spec https://tc39.es/ecma262/#prod-OctalIntegerLiteral
        if(next == 'o' || next == 'O') {
            value += current_char();
            advance();
            if(current_char() < '0' || current_char() > '7') {
                throw std::runtime_error("SyntaxError: Invalid or unexpected token");
            }
            // OctalDigits :: OctalDigit | OctalDigits NumericLiteralSeparator OctalDigit
            {
                bool last_was_separator = false;
                while((current_char() >= '0' && current_char() <= '7') || current_char() == '_') {
                    if(current_char() == '_') {
                        if(last_was_separator) {
                            throw std::runtime_error("SyntaxError: Invalid or unexpected token");
                        }
                        last_was_separator = true;
                    } else {
                        last_was_separator = false;
                        value += current_char();
                    }
                    advance();
                }
                if(last_was_separator) {
                    throw std::runtime_error("SyntaxError: Invalid or unexpected token");
                }
            }
            if(std::isdigit(current_char())) {
                throw std::runtime_error("SyntaxError: Invalid or unexpected token");
            }
            if(current_char() == 'n')
                advance();  // BigInt suffix
            return Token(TokenType::Number, value, line, column);
        }

        // BinaryIntegerLiteral :: 0b BinaryDigits | 0B BinaryDigits
        // @spec https://tc39.es/ecma262/#prod-BinaryIntegerLiteral
        if(next == 'b' || next == 'B') {
            value += current_char();
            advance();
            if(current_char() != '0' && current_char() != '1') {
                throw std::runtime_error("SyntaxError: Invalid or unexpected token");
            }
            // BinaryDigits :: BinaryDigit | BinaryDigits NumericLiteralSeparator BinaryDigit
            {
                bool last_was_separator = false;
                while(current_char() == '0' || current_char() == '1' || current_char() == '_') {
                    if(current_char() == '_') {
                        if(last_was_separator) {
                            throw std::runtime_error("SyntaxError: Invalid or unexpected token");
                        }
                        last_was_separator = true;
                    } else {
                        last_was_separator = false;
                        value += current_char();
                    }
                    advance();
                }
                if(last_was_separator) {
                    throw std::runtime_error("SyntaxError: Invalid or unexpected token");
                }
            }
            if(std::isdigit(current_char())) {
                throw std::runtime_error("SyntaxError: Invalid or unexpected token");
            }
            if(current_char() == 'n')
                advance();  // BigInt suffix
            return Token(TokenType::Number, value, line, column);
        }

        // LegacyOctalIntegerLiteral :: 0 OctalDigit | LegacyOctalIntegerLiteral OctalDigit
        // NonOctalDecimalIntegerLiteral :: 0 NonOctalDigit | ...
        // Neither production allows NumericLiteralSeparator.
        // @spec https://tc39.es/ecma262/#prod-LegacyOctalIntegerLiteral
        if(next >= '0' && next <= '7') {
            while(current_char() >= '0' && current_char() <= '7') {
                value += current_char();
                advance();
            }
            // NumericLiteralSeparator not allowed in legacy octal
            if(current_char() == '_') {
                throw std::runtime_error("SyntaxError: Invalid or unexpected token");
            }
            // NonOctalDecimalIntegerLiteral extension (e.g., 08, 079)
            if(current_char() >= '8' && current_char() <= '9') {
                while(std::isdigit(current_char())) {
                    value += current_char();
                    advance();
                }
                // NumericLiteralSeparator not allowed in non-octal decimal
                if(current_char() == '_') {
                    throw std::runtime_error("SyntaxError: Invalid or unexpected token");
                }
                // Fall through to decimal point / exponent handling
            } else {
                Token tok(TokenType::Number, value, line, column);
                tok.has_legacy_octal = true;
                return tok;
            }
        }

        // NonOctalDecimalIntegerLiteral starting with 08 or 09 (no prior octal digits)
        // NumericLiteralSeparator not allowed.
        // @spec https://tc39.es/ecma262/#prod-NonOctalDecimalIntegerLiteral
        if(next == '8' || next == '9') {
            while(std::isdigit(current_char())) {
                value += current_char();
                advance();
            }
            if(current_char() == '_') {
                throw std::runtime_error("SyntaxError: Invalid or unexpected token");
            }
            // Fall through to decimal point / exponent handling
        }

        // NumericLiteralSeparator immediately after leading 0 is invalid
        // (DecimalIntegerLiteral :: 0 has no separator production)
        if(next == '_') {
            throw std::runtime_error("SyntaxError: Invalid or unexpected token");
        }
        // Otherwise fall through to normal decimal parsing (0., 0e, or just 0)
    }

    // DecimalLiteral :: DecimalIntegerLiteral . DecimalDigits? ExponentPart?
    //                 | . DecimalDigits ExponentPart?
    //                 | DecimalIntegerLiteral ExponentPart?
    // DecimalDigits :: DecimalDigit | DecimalDigits NumericLiteralSeparator DecimalDigit
    // NumericLiteralSeparator may only appear between two DecimalDigits (not adjacent
    // to '.' or at the start/end of a digit sequence).
    // @spec https://tc39.es/ecma262/#prod-DecimalLiteral
    {
        bool last_was_separator = false;
        bool last_was_dot = false;
        while(std::isdigit(current_char()) || current_char() == '.' || current_char() == '_') {
            if(current_char() == '_') {
                if(last_was_separator || last_was_dot) {
                    throw std::runtime_error("SyntaxError: Invalid or unexpected token");
                }
                last_was_separator = true;
                last_was_dot = false;
            } else if(current_char() == '.') {
                if(last_was_separator) {
                    throw std::runtime_error("SyntaxError: Invalid or unexpected token");
                }
                last_was_dot = true;
                last_was_separator = false;
                value += current_char();
            } else {
                last_was_separator = false;
                last_was_dot = false;
                value += current_char();
            }
            advance();
        }
        if(last_was_separator) {
            throw std::runtime_error("SyntaxError: Invalid or unexpected token");
        }
    }

    // ExponentPart :: ExponentIndicator SignedInteger
    // ExponentIndicator :: one of e E
    // SignedInteger :: DecimalDigits | + DecimalDigits | - DecimalDigits
    // NumericLiteralSeparator not allowed adjacent to 'e'/'E'/'+'/'-'.
    // @spec https://tc39.es/ecma262/#prod-ExponentPart
    if(current_char() == 'e' || current_char() == 'E') {
        value += current_char();
        advance();
        if(current_char() == '+' || current_char() == '-') {
            value += current_char();
            advance();
        }
        // First character of exponent digits must be a digit, not a separator
        if(current_char() == '_') {
            throw std::runtime_error("SyntaxError: Invalid or unexpected token");
        }
        bool last_was_separator = false;
        while(std::isdigit(current_char()) || current_char() == '_') {
            if(current_char() == '_') {
                if(last_was_separator) {
                    throw std::runtime_error("SyntaxError: Invalid or unexpected token");
                }
                last_was_separator = true;
            } else {
                last_was_separator = false;
                value += current_char();
            }
            advance();
        }
        if(last_was_separator) {
            throw std::runtime_error("SyntaxError: Invalid or unexpected token");
        }
    }

    // DecimalBigIntegerLiteral :: ... BigIntLiteralSuffix
    // SIMPLIFIED: BigInt suffix 'n' is consumed but the literal is treated as a
    // regular Number since Rift does not implement BigInt.
    if(current_char() == 'n')
        advance();

    return Token(TokenType::Number, value, line, column);
}

// 12.8.4 String Literals
// StringLiteral :: " DoubleStringCharacters? " | ' SingleStringCharacters? '
// DoubleStringCharacter :: SourceCharacter but not one of " or \ or LineTerminator
//                        | <LS> | <PS> | \ EscapeSequence | LineContinuation
// SingleStringCharacter :: SourceCharacter but not one of ' or \ or LineTerminator
//                        | <LS> | <PS> | \ EscapeSequence | LineContinuation
// @spec https://tc39.es/ecma262/#sec-literals-string-literals
Token Lexer::read_string() {
    char quote = current_char();
    advance();  // Skip opening quote

    std::string value;
    value.reserve(256);  // Reserve some space to reduce allocations
    bool has_octal_escape = false;

    // Scan DoubleStringCharacters / SingleStringCharacters until closing quote.
    // A string literal may not contain an unescaped LineTerminator (LF, CR).
    // INCOMPLETE: LS (U+2028) and PS (U+2029) are allowed unescaped in string
    // literals since ES2019, but are not specifically handled here (they would
    // pass through as raw bytes in the UTF-8 stream).
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

            // EscapeSequence :: CharacterEscapeSequence
            //                 | 0 [lookahead not in DecimalDigit]
            //                 | LegacyOctalEscapeSequence  (Annex B)
            //                 | NonOctalDecimalEscapeSequence  (Annex B)
            //                 | HexEscapeSequence
            //                 | UnicodeEscapeSequence
            // CharacterEscapeSequence :: SingleEscapeCharacter | NonEscapeCharacter
            // SingleEscapeCharacter :: one of ' " \ b f n r t v
            // @spec https://tc39.es/ecma262/#prod-EscapeSequence
            switch(current_char()) {
                // SingleEscapeCharacter mappings:
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

                // EscapeSequence :: 0 [lookahead not in DecimalDigit]
                // When followed by another digit, falls into LegacyOctalEscapeSequence (Annex B).
                case '0':
                    if(peek_char() >= '0' && peek_char() <= '9') {
                        has_octal_escape = true;
                    }
                    value += '\0';
                    break;

                // LegacyOctalEscapeSequence (Annex B, B.1.4)
                // LegacyOctalEscapeSequence :: 0 [lookahead in {8,9}]
                //     | NonZeroOctalDigit [lookahead not in OctalDigit]
                //     | ZeroToThree OctalDigit [lookahead not in OctalDigit]
                //     | FourToSeven OctalDigit
                //     | ZeroToThree OctalDigit OctalDigit
                // These are forbidden in strict mode but allowed in sloppy mode.
                // @spec https://tc39.es/ecma262/#prod-LegacyOctalEscapeSequence
                case '1':
                case '2':
                case '3':
                case '4':
                case '5':
                case '6':
                case '7':
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

                // More SingleEscapeCharacter mappings:
                case 'b':
                    value += '\b';
                    break;
                case 'f':
                    value += '\f';
                    break;
                case 'v':
                    value += '\v';
                    break;

                // HexEscapeSequence :: x HexDigit HexDigit
                case 'x':
                    advance();
                    value += parse_hex_escape();
                    break;

                // UnicodeEscapeSequence :: u Hex4Digits | u{ CodePoint }
                case 'u':
                    advance();
                    if(current_char() == '{') {
                        value += parse_unicode_codepoint_escape();
                    } else {
                        value += parse_unicode_escape();
                    }
                    break;

                // LineContinuation :: \ LineTerminatorSequence
                // The SV of LineContinuation is the empty String.
                // @spec https://tc39.es/ecma262/#prod-LineContinuation
                case '\n':
                case '\r':
                    if(current_char() == '\r' && peek_char() == '\n') {
                        advance();  // Skip \r\n as a single LineTerminatorSequence
                    }
                    break;

                // NonEscapeCharacter :: SourceCharacter but not one of EscapeCharacter or
                // LineTerminator DEVIATION: The spec says unrecognized single-character escapes
                // like \a should produce just the character (e.g., \a -> "a"). Rift instead
                // preserves the backslash (\a -> "\a"), which differs from spec behavior.
                // In practice this only affects non-standard escape sequences.
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

    // Check for unterminated string (hit EOF, LF, or CR before closing quote)
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

// 12.8.6 Template Literal Lexical Components
// Template :: NoSubstitutionTemplate | TemplateHead
// NoSubstitutionTemplate :: ` TemplateCharacters? `
// TemplateHead :: ` TemplateCharacters? ${
// Initiates scanning of a template literal upon encountering a backtick.
// Handles nested template literals by saving/restoring outer template state
// on a stack (e.g., `outer ${`inner`} outer`).
// @spec https://tc39.es/ecma262/#sec-template-literal-lexical-components
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

// 12.8.6 Template Literal Lexical Components (continued)
// Scans template character sequences, producing one of:
//   - TemplateStart (TemplateHead):   text before first ${
//   - TemplateMiddle (TemplateMiddle): text between }...${
//   - TemplateEnd (TemplateTail or NoSubstitutionTemplate): text before closing `
//
// TemplateCharacter :: $ [lookahead != {] | \ TemplateEscapeSequence | \ NotEscapeSequence
//                    | LineContinuation | LineTerminatorSequence
//                    | SourceCharacter but not one of ` or \ or $ or LineTerminator
//
// TemplateHead :: ` TemplateCharacters? ${
// TemplateMiddle :: } TemplateCharacters? ${
// TemplateTail :: } TemplateCharacters? `
// NoSubstitutionTemplate :: ` TemplateCharacters? `
//
// SIMPLIFIED: The spec uses separate goal symbols (InputElementTemplateTail) for
// rescanning } as the start of a TemplateMiddle/TemplateTail. Rift tracks
// template_state and brace_depth to achieve the same effect without goal switching.
// @spec https://tc39.es/ecma262/#prod-Template
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

        // ${ starts a TemplateExpression substitution
        // TemplateHead :: ` TemplateCharacters? ${
        // TemplateMiddle :: } TemplateCharacters? ${
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
                type = TokenType::TemplateStart;  // TemplateHead
            } else {
                type = TokenType::TemplateMiddle;  // TemplateMiddle
            }
            return Token(type, value, line, column);
        }
        // Closing backtick ends the template
        // TemplateTail :: } TemplateCharacters? `
        // NoSubstitutionTemplate :: ` TemplateCharacters? `
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

            // Return final part (TemplateTail or NoSubstitutionTemplate)
            TokenType type = TokenType::TemplateEnd;
            return Token(type, value, line, column);
        }
        // TemplateEscapeSequence handling
        // TemplateCharacter :: \ TemplateEscapeSequence | \ NotEscapeSequence
        //                    | LineContinuation
        // TemplateEscapeSequence :: CharacterEscapeSequence | 0 [lookahead not in DecimalDigit]
        //                         | HexEscapeSequence | UnicodeEscapeSequence
        // INCOMPLETE: Tagged templates should return undefined for illegal escape sequences
        // (ES2018+), but Rift throws an error instead of returning the raw text.
        // @spec https://tc39.es/ecma262/#prod-TemplateEscapeSequence
        else if(current_char() == '\\') {
            advance();
            switch(current_char()) {
                // SingleEscapeCharacter mappings (same as string literals)
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

                // HexEscapeSequence :: x HexDigit HexDigit
                case 'x':
                    advance();
                    value += parse_hex_escape();
                    break;

                // UnicodeEscapeSequence :: u Hex4Digits | u{ CodePoint }
                case 'u':
                    advance();
                    if(current_char() == '{') {
                        value += parse_unicode_codepoint_escape();
                    } else {
                        value += parse_unicode_escape();
                    }
                    break;

                // LineContinuation :: \ LineTerminatorSequence
                case '\n':
                case '\r':
                    if(current_char() == '\r' && peek_char() == '\n') {
                        advance();  // Skip \r\n
                    }
                    break;

                // NotEscapeSequence fallthrough -- in templates, unrecognized escapes
                // produce just the escaped character (no backslash preservation).
                default:
                    value += current_char();
                    break;
            }
        } else {
            // TemplateCharacter :: SourceCharacter but not one of ` or \ or $ or LineTerminator
            // Note: LineTerminatorSequence is also a TemplateCharacter (unlike string literals,
            // template literals CAN span multiple lines).
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

// 12.6 Names and Keywords
// IdentifierName :: IdentifierStart | IdentifierName IdentifierPart
// IdentifierStart :: UnicodeIDStart | $ | _ | \ UnicodeEscapeSequence
// IdentifierPart :: UnicodeIDContinue | $ | \ UnicodeEscapeSequence | <ZWNJ> | <ZWJ>
//
// SIMPLIFIED: The spec allows any Unicode ID_Start/ID_Continue characters and
// UnicodeEscapeSequences in identifiers. Rift supports ASCII alphanumeric
// characters, underscore (_), dollar sign ($), and \uHHHH escape sequences.
// Non-ASCII Unicode letters (e.g., accented characters without escapes) and
// \u{HHHH} brace-form escapes in identifiers are not supported.
// @spec https://tc39.es/ecma262/#sec-names-and-keywords
Token Lexer::read_identifier() {
    std::string value;
    bool has_escape = false;
    while(std::isalnum(current_char()) || current_char() == '_' || current_char() == '$' ||
          (current_char() == '\\' && peek_char() == 'u')) {
        if(current_char() == '\\') {
            has_escape = true;
            advance();  // consume '\'
            if(current_char() != 'u') {
                throw std::runtime_error(
                    "SyntaxError: Invalid Unicode escape sequence in identifier");
            }
            advance();  // consume 'u'
            // Parse 4 hex digits inline (don't use parse_unicode_escape which backs up position)
            int codepoint = 0;
            for(int i = 0; i < 4; i++) {
                int digit = parse_hex_digit(current_char());
                if(digit == -1) {
                    throw std::runtime_error(
                        "SyntaxError: Invalid Unicode escape sequence: expected 4 hex digits");
                }
                codepoint = (codepoint << 4) | digit;
                advance();
            }
            // Convert code point to UTF-8 and append to value
            if(codepoint <= 0x7F) {
                value += static_cast<char>(codepoint);
            } else if(codepoint <= 0x7FF) {
                value += static_cast<char>(0xC0 | (codepoint >> 6));
                value += static_cast<char>(0x80 | (codepoint & 0x3F));
            } else {
                value += static_cast<char>(0xE0 | (codepoint >> 12));
                value += static_cast<char>(0x80 | ((codepoint >> 6) & 0x3F));
                value += static_cast<char>(0x80 | (codepoint & 0x3F));
            }
        } else {
            value += current_char();
            advance();
        }
    }

    // 12.6.2 Keywords and Reserved Words
    // ReservedWord :: one of
    //   await break case catch class const continue debugger default delete
    //   do else enum export extends false finally for function if import in
    //   instanceof new null return super switch this throw true try typeof
    //   var void while with yield
    //
    // The following are also matched here as keyword tokens:
    //   - true/false -> BooleanLiteral (12.8.2)
    //   - null -> NullLiteral (12.8.1)
    //   - undefined -> not a reserved word in spec (it's a global property),
    //     but Rift tokenizes it as a keyword for convenience
    //
    // INCOMPLETE: The following reserved words are not yet tokenized as keyword
    // TokenTypes: debugger, export, import. They are handled separately below
    // (enum throws SyntaxError, the others are checked for escaped keywords).
    // DEVIATION: 'undefined' is tokenized as a keyword (TokenType::Undefined).
    // In the spec, undefined is simply a property of the global object, not a
    // reserved word or literal. This means `let undefined = 5` would be rejected
    // by Rift but is valid (though ill-advised) in sloppy mode per the spec.
    // DEVIATION: 'async' and 'await' are tokenized as unconditional keywords.
    // In the spec, 'await' is only a reserved word inside async functions/modules,
    // and 'async' is a contextual keyword, not a reserved word.
    // @spec https://tc39.es/ecma262/#sec-keywords-and-reserved-words
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
        {"true", TokenType::Boolean},         // 12.8.2 BooleanLiteral :: true
        {"false", TokenType::Boolean},        // 12.8.2 BooleanLiteral :: false
        {"null", TokenType::Null},            // 12.8.1 NullLiteral :: null
        {"undefined", TokenType::Undefined},  // DEVIATION: not a spec keyword
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
        if(has_escape) {
            // 12.6.2 Keywords and Reserved Words
            // A keyword written with Unicode escapes (e.g., bre\u0061k) is an
            // IdentifierName that is a ReservedWord. It cannot be used as an
            // identifier — the parser must reject it in binding positions.
            // We return it as an Identifier token with the escaped_keyword flag.
            Token token(TokenType::Identifier, value, line, column);
            token.escaped_keyword = true;
            return token;
        }
        return Token(it->second, value, line, column);
    }

    // 12.6.2 Keywords and Reserved Words
    // 'enum' is a reserved word per the spec (always reserved, not just in strict mode).
    // It has no TokenType because it's not used by any production, but it must be
    // rejected as an identifier.
    if(value == "enum") {
        if(has_escape) {
            Token token(TokenType::Identifier, value, line, column);
            token.escaped_keyword = true;
            return token;
        }
        throw std::runtime_error("SyntaxError: 'enum' is a reserved word");
    }

    // Additional reserved words not in the keyword table (debugger, export, import)
    // and strict mode FutureReservedWords (implements, interface, package, private,
    // protected, public). When written with unicode escapes, they must be flagged
    // so the parser can reject them in binding positions.
    if(has_escape) {
        static const std::unordered_set<std::string> additional_reserved = {
            "debugger", "export",  "import",    "implements", "interface",
            "package",  "private", "protected", "public"};
        if(additional_reserved.count(value)) {
            Token token(TokenType::Identifier, value, line, column);
            token.escaped_keyword = true;
            return token;
        }
    }

    return Token(TokenType::Identifier, value, line, column);
}

// 12.5 Tokens -- Regex vs Division Disambiguation
// InputElementDiv :: ... DivPunctuator ...
// InputElementRegExp :: ... RegularExpressionLiteral ...
// InputElementRegExpOrTemplateTail :: ... RegularExpressionLiteral ...
//
// The spec uses multiple lexical goal symbols to disambiguate `/` and `/=` as
// either division operators (DivPunctuator) or the start of a RegularExpressionLiteral.
// The syntactic grammar selects the appropriate goal symbol based on parsing context.
//
// SIMPLIFIED: Instead of goal-symbol switching driven by the parser, Rift uses a
// heuristic based on the last emitted token type. If the previous token could end
// an expression (literal, identifier, closing bracket/paren/brace, postfix operator),
// then `/` is treated as division. Otherwise it starts a regex literal.
// This heuristic covers the vast majority of real-world cases but can be fooled by
// pathological inputs (e.g., a regex after a closing brace of a block statement
// vs an object literal).
// @spec https://tc39.es/ecma262/#sec-ecmascript-language-lexical-grammar
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

// 12.8.5 Regular Expression Literals
// RegularExpressionLiteral :: / RegularExpressionBody / RegularExpressionFlags
// RegularExpressionBody :: RegularExpressionFirstChar RegularExpressionChars
// RegularExpressionChars :: [empty] | RegularExpressionChars RegularExpressionChar
// RegularExpressionFirstChar :: RegularExpressionNonTerminator but not one of * or \ or / or [
//                             | RegularExpressionBackslashSequence
//                             | RegularExpressionClass
// RegularExpressionChar :: RegularExpressionNonTerminator but not one of \ or / or [
//                        | RegularExpressionBackslashSequence
//                        | RegularExpressionClass
// RegularExpressionNonTerminator :: SourceCharacter but not LineTerminator
// RegularExpressionBackslashSequence :: \ RegularExpressionNonTerminator
// RegularExpressionClass :: [ RegularExpressionClassChars ]
// RegularExpressionFlags :: [empty] | RegularExpressionFlags IdentifierPartChar
// @spec https://tc39.es/ecma262/#sec-literals-regular-expression-literals
Token Lexer::read_regex() {
    size_t start_line = line;
    size_t start_column = column;

    advance();  // consume opening '/'

    std::string pattern;
    // RegularExpressionBody: read pattern characters until unescaped '/'
    // A RegularExpressionNonTerminator is any SourceCharacter except LineTerminator,
    // so we stop at '\0' (EOF) or '\n' (LF).
    // INCOMPLETE: CR (\r), LS (U+2028), and PS (U+2029) should also terminate
    // regex scanning per the RegularExpressionNonTerminator production.
    while(current_char() != '\0' && current_char() != '\n') {
        if(current_char() == '\\') {
            // RegularExpressionBackslashSequence :: \ RegularExpressionNonTerminator
            // Escape sequence - include both backslash and next char verbatim
            pattern += current_char();
            advance();
            if(current_char() == '\0' || current_char() == '\n') {
                throw std::runtime_error("Unterminated regular expression literal");
            }
            pattern += current_char();
            advance();
        } else if(current_char() == '[') {
            // RegularExpressionClass :: [ RegularExpressionClassChars ]
            // RegularExpressionClassChars :: [empty]
            //     | RegularExpressionClassChars RegularExpressionClassChar
            // RegularExpressionClassChar :: RegularExpressionNonTerminator but not ] or \
            //     | RegularExpressionBackslashSequence
            pattern += current_char();
            advance();
            while(current_char() != '\0' && current_char() != '\n' && current_char() != ']') {
                if(current_char() == '\\') {
                    // RegularExpressionBackslashSequence inside class
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
            break;  // End of RegularExpressionBody
        } else {
            // RegularExpressionChar :: RegularExpressionNonTerminator but not \ or / or [
            pattern += current_char();
            advance();
        }
    }

    if(current_char() != '/') {
        throw std::runtime_error("Unterminated regular expression literal");
    }
    advance();  // consume closing '/'

    // RegularExpressionFlags :: [empty] | RegularExpressionFlags IdentifierPartChar
    // Valid flags per 22.2.2.1: d (hasIndices), g (global), i (ignoreCase),
    // m (multiline), s (dotAll), u (unicode), v (unicodeSets), y (sticky)
    // 12.9.5.1 Static Semantics: Early Errors — duplicate or invalid flags are SyntaxErrors.
    std::string flags;
    while(current_char() != '\0' && std::isalpha(static_cast<unsigned char>(current_char()))) {
        char c = current_char();
        if(c != 'g' && c != 'i' && c != 'm' && c != 's' && c != 'u' && c != 'd' && c != 'v' &&
           c != 'y') {
            throw std::runtime_error(std::string("SyntaxError: Invalid regular expression flag '") +
                                     c + "'");
        }
        if(flags.find(c) != std::string::npos) {
            throw std::runtime_error(
                std::string("SyntaxError: Duplicate regular expression flag '") + c + "'");
        }
        flags += c;
        advance();
    }

    // Store as /<pattern>/<flags> for later parsing by the RegExp constructor
    std::string value = "/" + pattern + "/" + flags;
    return Token(TokenType::RegExpLiteral, value, start_line, start_column);
}

// 12.5 Tokens -- Main tokenization entry point
// This is the core lexer dispatch function that identifies the next input element
// from the source text. It implements the top-level lexical grammar:
//
// InputElementDiv :: WhiteSpace | LineTerminator | Comment | CommonToken | DivPunctuator |
//                    RightBracePunctuator
// CommonToken :: IdentifierName | PrivateIdentifier | Punctuator | NumericLiteral |
//                StringLiteral | Template
//
// The function first skips whitespace and comments, then dispatches based on the
// current character to the appropriate sub-scanner (read_number, read_string,
// read_identifier, read_regex, read_template_string, or inline punctuator matching).
// @spec https://tc39.es/ecma262/#sec-tokens
Token Lexer::next_token() {
    // Handle template literal state transitions.
    // When template_state is InTemplate, we are between ` or }...and need to
    // continue scanning TemplateCharacters until we hit ${ or closing `.
    // This corresponds to the InputElementTemplateTail goal symbol in the spec.
    if(template_state == TemplateLiteralState::InTemplate) {
        // We're inside a template, continue reading template part
        auto token = read_template_part();
        last_token_type_ = token.type;
        return token;
    }

    // 12.2 White Space -- skip whitespace before the next token
    skip_whitespace();

    char ch = current_char();

    if(ch == '\0') {
        return Token(TokenType::EndOfFile, "", line, column);
    }

    // 12.8.3 Numeric Literals
    // NumericLiteral :: DecimalLiteral | ...
    // DecimalLiteral starts with a DecimalDigit (0-9).
    // Note: `.5` (leading dot) is handled in the '.' punctuator case below,
    // not here -- it falls through to decimal parsing after the dot.
    // INCOMPLETE: The spec production `. DecimalDigits ExponentPart?` is not
    // handled; `.5` is tokenized as Dot + Number(5) rather than Number(0.5).
    if(std::isdigit(ch)) {
        auto token = read_number();
        last_token_type_ = token.type;
        return token;
    }

    // 12.8.4 String Literals
    // StringLiteral :: " DoubleStringCharacters? " | ' SingleStringCharacters? '
    if(ch == '"' || ch == '\'') {
        auto token = read_string();
        last_token_type_ = token.type;
        return token;
    }

    // 12.8.6 Template Literal Lexical Components
    // Template :: NoSubstitutionTemplate | TemplateHead
    // NoSubstitutionTemplate :: ` TemplateCharacters? `
    // TemplateHead :: ` TemplateCharacters? ${
    if(ch == '`') {
        auto token = read_template_string();
        last_token_type_ = token.type;
        return token;
    }

    // 12.6 Names and Keywords
    // IdentifierName :: IdentifierStart IdentifierPart*
    // IdentifierStart :: UnicodeIDStart | $ | _ | \ UnicodeEscapeSequence
    // SIMPLIFIED: Only ASCII alpha, underscore, dollar sign, and \u escape sequences
    // are recognized as IdentifierStart. Non-ASCII Unicode ID_Start characters are
    // not supported.
    if(std::isalpha(ch) || ch == '_' || ch == '$' || (ch == '\\' && peek_char() == 'u')) {
        auto token = read_identifier();
        last_token_type_ = token.type;
        return token;
    }

    // Single character tokens - use lambda to track last_token_type_ for all return paths
    auto make_token = [this](TokenType type, const std::string& val, size_t l, size_t c) {
        last_token_type_ = type;
        return Token(type, val, l, c);
    };

    // 12.7 Punctuators
    // Punctuator :: OptionalChainingPunctuator | OtherPunctuator
    // OtherPunctuator :: one of { ( ) [ ] . ... ; , < > <= >= == != === !== + - * % **
    //   ++ -- << >> >>> & | ^ ! ~ && || ?? ? : = += -= *= %= **= <<= >>= >>>= &= |= ^= &&= ||= ??=
    //   =>
    // DivPunctuator :: / | /=
    // @spec https://tc39.es/ecma262/#sec-punctuators
    switch(ch) {
        // + ++ +=
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

        // - -- -=
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

        // * ** *= **=
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

        // % %=
        case '%':
            advance();
            if(current_char() == '=') {
                advance();
                return make_token(TokenType::ModuloAssign, "%=", line, column);
            }
            return make_token(TokenType::Modulo, "%", line, column);

        // / /= // /* RegularExpressionLiteral
        // 12.4 Comments
        // SingleLineComment :: // SingleLineCommentChars?
        // MultiLineComment :: /* MultiLineCommentChars? */
        // DivPunctuator :: / | /=
        // @spec https://tc39.es/ecma262/#sec-comments
        case '/':
            if(peek_char() == '/') {
                // SingleLineComment :: // SingleLineCommentChars?
                // SingleLineCommentChar :: SourceCharacter but not LineTerminator
                while(current_char() != '\n' && current_char() != '\0') {
                    advance();
                }
                return next_token();  // Recursively get the next token after the comment
            }
            if(peek_char() == '*') {
                // MultiLineComment :: /* MultiLineCommentChars? */
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
            // Disambiguation: RegularExpressionLiteral (12.8.5) vs DivPunctuator (12.7)
            if(slash_starts_regex()) {
                auto regex_token = read_regex();
                last_token_type_ = regex_token.type;
                return regex_token;
            }
            // DivPunctuator :: / | /=
            advance();
            if(current_char() == '=') {
                advance();
                return make_token(TokenType::DivideAssign, "/=", line, column);
            }
            return make_token(TokenType::Divide, "/", line, column);

        // ( )
        case '(':
            advance();
            return make_token(TokenType::LeftParen, "(", line, column);
        case ')':
            advance();
            return make_token(TokenType::RightParen, ")", line, column);

        // { } -- also handles template expression brace tracking
        // When inside a template expression (${...}), braces must be tracked so
        // that the closing } of the expression is distinguished from nested braces
        // in object literals or blocks.
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
                    // End of template expression -- rescan as TemplateMiddle or TemplateTail
                    // This corresponds to the spec's InputElementTemplateTail goal symbol.
                    template_state = TemplateLiteralState::InTemplate;
                    auto token = read_template_part();
                    last_token_type_ = token.type;
                    return token;
                }
            }
            return make_token(TokenType::RightBrace, "}", line, column);

        // [ ]
        case '[':
            advance();
            return make_token(TokenType::LeftBracket, "[", line, column);
        case ']':
            advance();
            return make_token(TokenType::RightBracket, "]", line, column);

        // ;
        case ';':
            advance();
            return make_token(TokenType::Semicolon, ";", line, column);

        // ,
        case ',':
            advance();
            return make_token(TokenType::Comma, ",", line, column);

        // . ...
        case '.':
            advance();
            // ... (spread/rest operator)
            if(current_char() == '.' && peek_char() == '.') {
                advance();  // consume second dot
                advance();  // consume third dot
                return make_token(TokenType::Spread, "...", line, column);
            }
            return make_token(TokenType::Dot, ".", line, column);

        // :
        case ':':
            advance();
            return make_token(TokenType::Colon, ":", line, column);

        // = == === =>
        case '=':
            advance();
            // Arrow function: =>
            if(current_char() == '>') {
                advance();
                return make_token(TokenType::Arrow, "=>", line, column);
            }
            // == ===
            if(current_char() == '=') {
                advance();
                if(current_char() == '=') {
                    advance();
                    return make_token(TokenType::EqualStrict, "===", line, column);
                }
                return make_token(TokenType::Equal, "==", line, column);
            }
            return make_token(TokenType::Assign, "=", line, column);

        // ! != !==
        case '!':
            advance();
            if(current_char() == '=') {
                advance();
                if(current_char() == '=') {
                    advance();
                    return make_token(TokenType::NotEqualStrict, "!==", line, column);
                }
                return make_token(TokenType::NotEqual, "!=", line, column);
            }
            return make_token(TokenType::LogicalNot, "!", line, column);

        // < << <= <<=
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

        // > >> >>> >= >>= >>>=
        case '>':
            advance();
            if(current_char() == '>') {
                advance();
                if(current_char() == '>') {
                    advance();
                    if(current_char() == '=') {
                        advance();
                        return make_token(TokenType::UnsignedRightShiftAssign, ">>>=", line,
                                          column);
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

        // ~
        case '~':
            advance();
            return make_token(TokenType::BitwiseNot, "~", line, column);

        // | || |=
        // INCOMPLETE: ||= (LogicalOrAssign) is not implemented.
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

        // & && &=
        // INCOMPLETE: &&= (LogicalAndAssign) is not implemented.
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

        // ^ ^=
        case '^':
            advance();
            if(current_char() == '=') {
                advance();
                return make_token(TokenType::BitwiseXorAssign, "^=", line, column);
            }
            return make_token(TokenType::BitwiseXor, "^", line, column);

        // ? ?? ??= ?.
        // OptionalChainingPunctuator :: ?. [lookahead not in DecimalDigit]
        // @spec https://tc39.es/ecma262/#prod-OptionalChainingPunctuator
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
                // OptionalChainingPunctuator :: ?. [lookahead not in DecimalDigit]
                // Must not match `?.5` which should be `?` then `.5` (numeric literal)
                if(peek_char() < '0' || peek_char() > '9') {
                    advance();
                    return make_token(TokenType::OptionalChain, "?.", line, column);
                }
            }
            return make_token(TokenType::QuestionMark, "?", line, column);

        // INCOMPLETE: The following punctuators from the spec are not handled:
        // # (PrivateIdentifier prefix), @ (decorators proposal).
        // Also, the HashbangComment production (#!/...) for script preambles
        // is not recognized.
        default:
            advance();
            return make_token(TokenType::Invalid, std::string(1, ch), line, column);
    }
}

// Convenience method: tokenizes the entire source text into a vector of tokens.
// Repeatedly calls next_token() until EndOfFile is reached.
// The EndOfFile token is included as the last element of the returned vector.
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