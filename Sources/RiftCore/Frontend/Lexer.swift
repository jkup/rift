import Foundation

/// Lexer for JavaScript source code
///
/// Converts a source string into a sequence of tokens for parsing.
public struct Lexer {
    private let source: String
    private var current: String.Index
    private var line: Int = 1
    private var column: Int = 1
    private var position: Int = 0

    /// Initialize a new lexer with the given source code
    public init(source: String) {
        self.source = source
        self.current = source.startIndex
    }

    // MARK: - Public API

    /// Tokenize the entire source and return all tokens
    public mutating func tokenize() throws -> [Token] {
        var tokens: [Token] = []
        while true {
            let token = try nextToken()
            tokens.append(token)
            if case .eof = token.type {
                break
            }
        }
        return tokens
    }

    /// Get the next token from the source
    public mutating func nextToken() throws -> Token {
        skipWhitespaceAndComments()

        guard !isAtEnd else {
            return makeToken(.eof)
        }

        let char = peek()

        // Numbers
        if char.isNumber {
            return try scanNumber()
        }

        // Dot can start a number (.5) or be an operator
        if char == "." {
            if let next = peekNext(), next.isNumber {
                return try scanNumber()
            }
        }

        // Strings
        if char == "\"" || char == "'" {
            return try scanString(quote: char)
        }

        // Template literals
        if char == "`" {
            return try scanTemplateLiteral()
        }

        // Identifiers and keywords
        if isIdentifierStart(char) {
            return scanIdentifier()
        }

        // Operators and punctuation
        return try scanOperator()
    }

    // MARK: - Character Helpers

    private var isAtEnd: Bool {
        current >= source.endIndex
    }

    private func peek() -> Character {
        guard !isAtEnd else { return "\0" }
        return source[current]
    }

    private func peekNext() -> Character? {
        let next = source.index(after: current)
        guard next < source.endIndex else { return nil }
        return source[next]
    }

    private func peekAhead(_ offset: Int) -> Character? {
        var index = current
        for _ in 0..<offset {
            guard index < source.endIndex else { return nil }
            index = source.index(after: index)
        }
        guard index < source.endIndex else { return nil }
        return source[index]
    }

    private mutating func advance() -> Character {
        let char = source[current]
        current = source.index(after: current)
        position += 1

        if char == "\n" {
            line += 1
            column = 1
        } else {
            column += 1
        }

        return char
    }

    private mutating func match(_ expected: Character) -> Bool {
        guard !isAtEnd, peek() == expected else { return false }
        _ = advance()
        return true
    }

    private func makeToken(_ type: TokenType) -> Token {
        Token(type: type, line: line, column: column, position: position)
    }

    private func currentLocation() -> SourceLocation {
        SourceLocation(line: line, column: column, position: position)
    }

    // MARK: - Whitespace and Comments

    private mutating func skipWhitespaceAndComments() {
        while !isAtEnd {
            let char = peek()

            switch char {
            case " ", "\t", "\r", "\n":
                _ = advance()

            case "/":
                if let next = peekNext() {
                    if next == "/" {
                        skipSingleLineComment()
                    } else if next == "*" {
                        skipMultiLineComment()
                    } else {
                        return
                    }
                } else {
                    return
                }

            default:
                return
            }
        }
    }

    private mutating func skipSingleLineComment() {
        // Skip the //
        _ = advance()
        _ = advance()

        while !isAtEnd && peek() != "\n" {
            _ = advance()
        }
    }

    private mutating func skipMultiLineComment() {
        // Skip the /*
        _ = advance()
        _ = advance()

        while !isAtEnd {
            if peek() == "*" && peekNext() == "/" {
                _ = advance()
                _ = advance()
                return
            }
            _ = advance()
        }
        // Unterminated comment - we'll let it slide for now
        // A strict lexer would throw LexerError.unterminatedComment
    }

    // MARK: - Number Scanning

    private mutating func scanNumber() throws -> Token {
        let startLine = line
        let startColumn = column
        let startPosition = position
        var numberStr = ""

        // Check for hex, octal, or binary
        if peek() == "0" {
            numberStr.append(advance())

            if let next = peek().lowercased().first {
                switch next {
                case "x":
                    // Hexadecimal
                    numberStr.append(advance())
                    while !isAtEnd && isHexDigit(peek()) {
                        numberStr.append(advance())
                    }
                    if let value = Int64(String(numberStr.dropFirst(2)), radix: 16) {
                        return Token(
                            type: .number(Double(value)),
                            line: startLine,
                            column: startColumn,
                            position: startPosition
                        )
                    }
                    throw LexerError.invalidNumber(numberStr, currentLocation())

                case "o":
                    // Octal
                    numberStr.append(advance())
                    while !isAtEnd && isOctalDigit(peek()) {
                        numberStr.append(advance())
                    }
                    if let value = Int64(String(numberStr.dropFirst(2)), radix: 8) {
                        return Token(
                            type: .number(Double(value)),
                            line: startLine,
                            column: startColumn,
                            position: startPosition
                        )
                    }
                    throw LexerError.invalidNumber(numberStr, currentLocation())

                case "b":
                    // Binary
                    numberStr.append(advance())
                    while !isAtEnd && isBinaryDigit(peek()) {
                        numberStr.append(advance())
                    }
                    if let value = Int64(String(numberStr.dropFirst(2)), radix: 2) {
                        return Token(
                            type: .number(Double(value)),
                            line: startLine,
                            column: startColumn,
                            position: startPosition
                        )
                    }
                    throw LexerError.invalidNumber(numberStr, currentLocation())

                default:
                    break
                }
            }
        }

        // Regular decimal number
        while !isAtEnd && (peek().isNumber || peek() == "_") {
            let char = advance()
            if char != "_" {
                numberStr.append(char)
            }
        }

        // Decimal part
        if peek() == "." {
            if let next = peekNext(), next.isNumber {
                numberStr.append(advance()) // consume .
                while !isAtEnd && (peek().isNumber || peek() == "_") {
                    let char = advance()
                    if char != "_" {
                        numberStr.append(char)
                    }
                }
            }
        }

        // Exponent part
        if peek() == "e" || peek() == "E" {
            numberStr.append(advance())
            if peek() == "+" || peek() == "-" {
                numberStr.append(advance())
            }
            while !isAtEnd && peek().isNumber {
                numberStr.append(advance())
            }
        }

        guard let value = Double(numberStr) else {
            throw LexerError.invalidNumber(numberStr, currentLocation())
        }

        return Token(
            type: .number(value),
            line: startLine,
            column: startColumn,
            position: startPosition
        )
    }

    private func isHexDigit(_ char: Character) -> Bool {
        char.isNumber || ("a"..."f").contains(char.lowercased().first ?? " ")
    }

    private func isOctalDigit(_ char: Character) -> Bool {
        ("0"..."7").contains(char)
    }

    private func isBinaryDigit(_ char: Character) -> Bool {
        char == "0" || char == "1"
    }

    // MARK: - String Scanning

    private mutating func scanString(quote: Character) throws -> Token {
        let startLine = line
        let startColumn = column
        let startPosition = position
        var value = ""

        _ = advance() // consume opening quote

        while !isAtEnd && peek() != quote {
            if peek() == "\n" {
                throw LexerError.unterminatedString(currentLocation())
            }

            if peek() == "\\" {
                _ = advance()
                if isAtEnd {
                    throw LexerError.unterminatedString(currentLocation())
                }
                let escaped = try scanEscapeSequence()
                value.append(escaped)
            } else {
                value.append(advance())
            }
        }

        if isAtEnd {
            throw LexerError.unterminatedString(currentLocation())
        }

        _ = advance() // consume closing quote

        return Token(
            type: .string(value),
            line: startLine,
            column: startColumn,
            position: startPosition
        )
    }

    private mutating func scanEscapeSequence() throws -> Character {
        let char = advance()

        switch char {
        case "n": return "\n"
        case "r": return "\r"
        case "t": return "\t"
        case "\\": return "\\"
        case "'": return "'"
        case "\"": return "\""
        case "0": return "\0"
        case "b": return "\u{0008}"  // backspace
        case "f": return "\u{000C}"  // form feed
        case "v": return "\u{000B}"  // vertical tab
        case "u":
            return try scanUnicodeEscape()
        case "x":
            return try scanHexEscape()
        default:
            // In non-strict mode, unknown escapes are just the character itself
            return char
        }
    }

    private mutating func scanUnicodeEscape() throws -> Character {
        // \uXXXX or \u{XXXXX}
        if peek() == "{" {
            _ = advance()
            var hexStr = ""
            while !isAtEnd && peek() != "}" {
                hexStr.append(advance())
            }
            if isAtEnd || peek() != "}" {
                throw LexerError.invalidUnicodeEscape(currentLocation())
            }
            _ = advance() // consume }

            guard let codePoint = UInt32(hexStr, radix: 16),
                  let scalar = Unicode.Scalar(codePoint) else {
                throw LexerError.invalidUnicodeEscape(currentLocation())
            }
            return Character(scalar)
        } else {
            // Fixed 4-digit format
            var hexStr = ""
            for _ in 0..<4 {
                guard !isAtEnd else {
                    throw LexerError.invalidUnicodeEscape(currentLocation())
                }
                hexStr.append(advance())
            }
            guard let codePoint = UInt32(hexStr, radix: 16),
                  let scalar = Unicode.Scalar(codePoint) else {
                throw LexerError.invalidUnicodeEscape(currentLocation())
            }
            return Character(scalar)
        }
    }

    private mutating func scanHexEscape() throws -> Character {
        // \xXX
        var hexStr = ""
        for _ in 0..<2 {
            guard !isAtEnd else {
                throw LexerError.invalidEscapeSequence("\\x" + hexStr, currentLocation())
            }
            hexStr.append(advance())
        }
        guard let codePoint = UInt32(hexStr, radix: 16),
              let scalar = Unicode.Scalar(codePoint) else {
            throw LexerError.invalidEscapeSequence("\\x" + hexStr, currentLocation())
        }
        return Character(scalar)
    }

    // MARK: - Template Literal Scanning

    private mutating func scanTemplateLiteral() throws -> Token {
        let startLine = line
        let startColumn = column
        let startPosition = position
        var value = ""

        _ = advance() // consume opening backtick

        while !isAtEnd && peek() != "`" {
            if peek() == "\\" {
                _ = advance()
                if isAtEnd {
                    throw LexerError.unterminatedString(currentLocation())
                }
                let escaped = try scanEscapeSequence()
                value.append(escaped)
            } else if peek() == "$" && peekNext() == "{" {
                // For now, we don't support template expressions
                // Just include the literal ${
                value.append(advance())
            } else {
                value.append(advance())
            }
        }

        if isAtEnd {
            throw LexerError.unterminatedString(currentLocation())
        }

        _ = advance() // consume closing backtick

        return Token(
            type: .templateLiteral(value),
            line: startLine,
            column: startColumn,
            position: startPosition
        )
    }

    // MARK: - Identifier Scanning

    private func isIdentifierStart(_ char: Character) -> Bool {
        char.isLetter || char == "_" || char == "$"
    }

    private func isIdentifierPart(_ char: Character) -> Bool {
        char.isLetter || char.isNumber || char == "_" || char == "$"
    }

    private mutating func scanIdentifier() -> Token {
        let startLine = line
        let startColumn = column
        let startPosition = position
        var name = ""

        while !isAtEnd && isIdentifierPart(peek()) {
            name.append(advance())
        }

        // Check if it's a keyword
        let type: TokenType
        if let keyword = TokenType.keyword(name) {
            type = keyword
        } else {
            type = .identifier(name)
        }

        return Token(
            type: type,
            line: startLine,
            column: startColumn,
            position: startPosition
        )
    }

    // MARK: - Operator Scanning

    private mutating func scanOperator() throws -> Token {
        let startLine = line
        let startColumn = column
        let startPosition = position

        let char = advance()

        func token(_ type: TokenType) -> Token {
            Token(type: type, line: startLine, column: startColumn, position: startPosition)
        }

        switch char {
        // Single character tokens
        case "(": return token(.leftParen)
        case ")": return token(.rightParen)
        case "{": return token(.leftBrace)
        case "}": return token(.rightBrace)
        case "[": return token(.leftBracket)
        case "]": return token(.rightBracket)
        case ",": return token(.comma)
        case ";": return token(.semicolon)
        case ":": return token(.colon)
        case "~": return token(.tilde)
        case "@": return token(.at)
        case "#": return token(.hash)

        // Potentially multi-character tokens
        case ".":
            if match(".") {
                if match(".") {
                    return token(.ellipsis)
                }
                // Just two dots is not valid, but we'll return dot and let parser handle it
                // Actually, rewind - this is tricky. For now, let's just handle ...
                throw LexerError.unexpectedCharacter(".", currentLocation())
            }
            return token(.dot)

        case "+":
            if match("+") { return token(.plusPlus) }
            if match("=") { return token(.plusEqual) }
            return token(.plus)

        case "-":
            if match("-") { return token(.minusMinus) }
            if match("=") { return token(.minusEqual) }
            return token(.minus)

        case "*":
            if match("*") {
                if match("=") { return token(.starStarEqual) }
                return token(.starStar)
            }
            if match("=") { return token(.starEqual) }
            return token(.star)

        case "/":
            if match("=") { return token(.slashEqual) }
            return token(.slash)

        case "%":
            if match("=") { return token(.percentEqual) }
            return token(.percent)

        case "=":
            if match("=") {
                if match("=") { return token(.equalEqualEqual) }
                return token(.equalEqual)
            }
            if match(">") { return token(.arrow) }
            return token(.equal)

        case "!":
            if match("=") {
                if match("=") { return token(.bangEqualEqual) }
                return token(.bangEqual)
            }
            return token(.bang)

        case "<":
            if match("<") {
                if match("=") { return token(.lessLessEqual) }
                return token(.lessLess)
            }
            if match("=") { return token(.lessEqual) }
            return token(.less)

        case ">":
            if match(">") {
                if match(">") {
                    if match("=") { return token(.greaterGreaterGreaterEqual) }
                    return token(.greaterGreaterGreater)
                }
                if match("=") { return token(.greaterGreaterEqual) }
                return token(.greaterGreater)
            }
            if match("=") { return token(.greaterEqual) }
            return token(.greater)

        case "&":
            if match("&") {
                if match("=") { return token(.ampAmpEqual) }
                return token(.ampAmp)
            }
            if match("=") { return token(.ampEqual) }
            return token(.ampersand)

        case "|":
            if match("|") {
                if match("=") { return token(.pipePipeEqual) }
                return token(.pipePipe)
            }
            if match("=") { return token(.pipeEqual) }
            return token(.pipe)

        case "^":
            if match("=") { return token(.caretEqual) }
            return token(.caret)

        case "?":
            if match("?") {
                if match("=") { return token(.questionQuestionEqual) }
                return token(.questionQuestion)
            }
            if match(".") { return token(.questionDot) }
            return token(.question)

        default:
            throw LexerError.unexpectedCharacter(char, currentLocation())
        }
    }
}
