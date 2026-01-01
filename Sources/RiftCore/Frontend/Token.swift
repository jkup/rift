/// Token types for the JavaScript lexer
public enum TokenType: Equatable {
    // MARK: - Literals
    case eof
    case identifier(String)
    case number(Double)
    case string(String)
    case templateLiteral(String)
    case regex(pattern: String, flags: String)

    // MARK: - Keywords
    case `var`
    case `let`
    case `const`
    case function
    case `return`
    case `if`
    case `else`
    case `for`
    case `while`
    case `do`
    case `switch`
    case `case`
    case `default`
    case `break`
    case `continue`
    case `try`
    case `catch`
    case `finally`
    case `throw`
    case `new`
    case `this`
    case `typeof`
    case `instanceof`
    case `in`
    case `of`
    case `delete`
    case `void`
    case `class`
    case `extends`
    case `super`
    case `static`
    case `get`
    case `set`
    case `async`
    case `await`
    case `yield`
    case `import`
    case `export`
    case `from`
    case `as`
    case `with`
    case `debugger`

    // MARK: - Boolean/Null/Undefined Literals
    case `true`
    case `false`
    case null
    case undefined

    // MARK: - Arithmetic Operators
    case plus          // +
    case minus         // -
    case star          // *
    case slash         // /
    case percent       // %
    case starStar      // **

    // MARK: - Increment/Decrement
    case plusPlus      // ++
    case minusMinus    // --

    // MARK: - Assignment Operators
    case equal         // =
    case plusEqual     // +=
    case minusEqual    // -=
    case starEqual     // *=
    case slashEqual    // /=
    case percentEqual  // %=
    case starStarEqual // **=
    case ampEqual      // &=
    case pipeEqual     // |=
    case caretEqual    // ^=
    case lessLessEqual      // <<=
    case greaterGreaterEqual     // >>=
    case greaterGreaterGreaterEqual  // >>>=
    case ampAmpEqual   // &&=
    case pipePipeEqual // ||=
    case questionQuestionEqual  // ??=

    // MARK: - Comparison Operators
    case equalEqual         // ==
    case equalEqualEqual    // ===
    case bangEqual          // !=
    case bangEqualEqual     // !==
    case less               // <
    case lessEqual          // <=
    case greater            // >
    case greaterEqual       // >=

    // MARK: - Logical Operators
    case ampAmp        // &&
    case pipePipe      // ||
    case bang          // !
    case questionQuestion  // ??

    // MARK: - Bitwise Operators
    case ampersand     // &
    case pipe          // |
    case caret         // ^
    case tilde         // ~
    case lessLess      // <<
    case greaterGreater     // >>
    case greaterGreaterGreater  // >>>

    // MARK: - Punctuation
    case leftParen     // (
    case rightParen    // )
    case leftBrace     // {
    case rightBrace    // }
    case leftBracket   // [
    case rightBracket  // ]
    case comma         // ,
    case dot           // .
    case semicolon     // ;
    case colon         // :
    case question      // ?
    case arrow         // =>
    case ellipsis      // ...
    case at            // @
    case hash          // #

    // MARK: - Optional Chaining
    case questionDot   // ?.
}

/// A token with its type and location in source
public struct Token: Equatable, CustomStringConvertible {
    public let type: TokenType
    public let location: SourceLocation

    public init(type: TokenType, location: SourceLocation) {
        self.type = type
        self.location = location
    }

    public init(type: TokenType, line: Int, column: Int, position: Int) {
        self.type = type
        self.location = SourceLocation(line: line, column: column, position: position)
    }

    public var description: String {
        "\(type) at \(location)"
    }
}

// MARK: - Keyword Lookup

extension TokenType {
    /// Map of keyword strings to their token types
    public static let keywords: [String: TokenType] = [
        "var": .var,
        "let": .let,
        "const": .const,
        "function": .function,
        "return": .return,
        "if": .if,
        "else": .else,
        "for": .for,
        "while": .while,
        "do": .do,
        "switch": .switch,
        "case": .case,
        "default": .default,
        "break": .break,
        "continue": .continue,
        "try": .try,
        "catch": .catch,
        "finally": .finally,
        "throw": .throw,
        "new": .new,
        "this": .this,
        "typeof": .typeof,
        "instanceof": .instanceof,
        "in": .in,
        "of": .of,
        "delete": .delete,
        "void": .void,
        "class": .class,
        "extends": .extends,
        "super": .super,
        "static": .static,
        "get": .get,
        "set": .set,
        "async": .async,
        "await": .await,
        "yield": .yield,
        "import": .import,
        "export": .export,
        "from": .from,
        "as": .as,
        "with": .with,
        "debugger": .debugger,
        "true": .true,
        "false": .false,
        "null": .null,
        "undefined": .undefined
    ]

    /// Look up a keyword by name, returns nil if not a keyword
    public static func keyword(_ name: String) -> TokenType? {
        keywords[name]
    }
}
