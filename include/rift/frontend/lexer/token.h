#pragma once

#include <string>

namespace rift::frontend {

// Token types for lexical analysis
enum class TokenType {
    // Literals
    Number,
    String,
    Boolean,
    Null,
    Undefined,

    // Template literals
    TemplateString,
    TemplateStart,
    TemplateMiddle,
    TemplateEnd,

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
    Do,
    Switch,
    Case,
    Default,
    Break,
    Continue,
    Throw,
    Try,
    Catch,
    Finally,
    New,
    This,
    In,
    Of,
    Class,
    Extends,
    Super,
    Static,

    // Operators
    Plus,
    Minus,
    Multiply,
    Divide,
    Modulo,
    Exponent,  // **
    Assign,
    Arrow,           // =>
    PlusAssign,      // +=
    MinusAssign,     // -=
    MultiplyAssign,  // *=
    DivideAssign,    // /=
    ModuloAssign,    // %=
    ExponentAssign,  // **=
    Increment,
    Decrement,
    Equal,
    EqualStrict,
    NotEqual,
    NotEqualStrict,
    Less,
    LessEqual,
    Greater,
    GreaterEqual,
    LogicalNot,
    LogicalOr,
    LogicalAnd,
    BitwiseNot,
    BitwiseAnd,                // &
    BitwiseOr,                 // |
    BitwiseXor,                // ^
    LeftShift,                 // <<
    RightShift,                // >>
    UnsignedRightShift,        // >>>
    BitwiseAndAssign,          // &=
    BitwiseOrAssign,           // |=
    BitwiseXorAssign,          // ^=
    LeftShiftAssign,           // <<=
    RightShiftAssign,          // >>=
    UnsignedRightShiftAssign,  // >>>=
    Typeof,

    // Punctuation
    LeftParen,
    RightParen,
    LeftBrace,
    RightBrace,
    LeftBracket,
    RightBracket,
    Semicolon,
    Comma,
    Dot,
    Spread,  // ... (rest/spread operator)
    Colon,

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
        : type(t), value(v), line(l), column(c) {
    }

    std::string toString() const {
        return "Token(" + std::to_string(static_cast<int>(type)) + ", \"" + value + "\", " +
               std::to_string(line) + ":" + std::to_string(column) + ")";
    }
};

}  // namespace rift::frontend