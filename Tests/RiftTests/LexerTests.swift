import XCTest
@testable import RiftCore

final class LexerTests: XCTestCase {

    // MARK: - Helper

    func tokenize(_ source: String) throws -> [Token] {
        var lexer = Lexer(source: source)
        return try lexer.tokenize()
    }

    func tokenTypes(_ source: String) throws -> [TokenType] {
        try tokenize(source).map { $0.type }
    }

    // MARK: - Empty Input

    func testEmptySource() throws {
        let tokens = try tokenize("")
        XCTAssertEqual(tokens.count, 1)
        XCTAssertEqual(tokens[0].type, .eof)
    }

    func testWhitespaceOnly() throws {
        let tokens = try tokenize("   \t\n\r  ")
        XCTAssertEqual(tokens.count, 1)
        XCTAssertEqual(tokens[0].type, .eof)
    }

    // MARK: - Comments

    func testSingleLineComment() throws {
        let tokens = try tokenize("// this is a comment\n42")
        XCTAssertEqual(tokens.count, 2)
        XCTAssertEqual(tokens[0].type, .number(42))
    }

    func testMultiLineComment() throws {
        let tokens = try tokenize("/* comment */ 42 /* another */")
        XCTAssertEqual(tokens.count, 2)
        XCTAssertEqual(tokens[0].type, .number(42))
    }

    func testNestedStyleComment() throws {
        let tokens = try tokenize("/* outer /* not nested */ 42")
        XCTAssertEqual(tokens.count, 2)
        XCTAssertEqual(tokens[0].type, .number(42))
    }

    // MARK: - Numbers

    func testIntegerLiterals() throws {
        let types = try tokenTypes("0 42 123456")
        XCTAssertEqual(types, [.number(0), .number(42), .number(123456), .eof])
    }

    func testFloatLiterals() throws {
        let types = try tokenTypes("3.14 0.5 .25 10.0")
        XCTAssertEqual(types, [.number(3.14), .number(0.5), .number(0.25), .number(10.0), .eof])
    }

    func testExponentLiterals() throws {
        let types = try tokenTypes("1e10 1E10 1e+10 1e-10 3.14e2")
        XCTAssertEqual(types, [
            .number(1e10), .number(1e10), .number(1e10),
            .number(1e-10), .number(314), .eof
        ])
    }

    func testHexLiterals() throws {
        let types = try tokenTypes("0x0 0xFF 0xDEADBEEF")
        XCTAssertEqual(types, [.number(0), .number(255), .number(3735928559), .eof])
    }

    func testOctalLiterals() throws {
        let types = try tokenTypes("0o0 0o7 0o77 0O10")
        XCTAssertEqual(types, [.number(0), .number(7), .number(63), .number(8), .eof])
    }

    func testBinaryLiterals() throws {
        let types = try tokenTypes("0b0 0b1 0b1010 0B11111111")
        XCTAssertEqual(types, [.number(0), .number(1), .number(10), .number(255), .eof])
    }

    func testNumericSeparators() throws {
        let types = try tokenTypes("1_000_000 3.14_15")
        XCTAssertEqual(types, [.number(1000000), .number(3.1415), .eof])
    }

    // MARK: - Strings

    func testDoubleQuotedString() throws {
        let types = try tokenTypes("\"hello world\"")
        XCTAssertEqual(types, [.string("hello world"), .eof])
    }

    func testSingleQuotedString() throws {
        let types = try tokenTypes("'hello world'")
        XCTAssertEqual(types, [.string("hello world"), .eof])
    }

    func testEmptyString() throws {
        let types = try tokenTypes("\"\" ''")
        XCTAssertEqual(types, [.string(""), .string(""), .eof])
    }

    func testStringEscapes() throws {
        let types = try tokenTypes("\"\\n\\r\\t\\\\\"")
        XCTAssertEqual(types, [.string("\n\r\t\\"), .eof])
    }

    func testStringQuoteEscapes() throws {
        let types = try tokenTypes("\"he said \\\"hello\\\"\" 'it\\'s'")
        XCTAssertEqual(types, [.string("he said \"hello\""), .string("it's"), .eof])
    }

    func testUnicodeEscapes() throws {
        let types = try tokenTypes("\"\\u0041\" \"\\u{1F600}\"")
        XCTAssertEqual(types, [.string("A"), .string("😀"), .eof])
    }

    func testHexEscapes() throws {
        let types = try tokenTypes("\"\\x41\\x42\\x43\"")
        XCTAssertEqual(types, [.string("ABC"), .eof])
    }

    func testUnterminatedString() {
        XCTAssertThrowsError(try tokenize("\"unterminated")) { error in
            XCTAssertTrue(error is LexerError)
        }
    }

    // MARK: - Template Literals

    func testTemplateLiteral() throws {
        let types = try tokenTypes("`hello world`")
        XCTAssertEqual(types, [.templateLiteral("hello world"), .eof])
    }

    func testMultilineTemplateLiteral() throws {
        let types = try tokenTypes("`line1\nline2`")
        XCTAssertEqual(types, [.templateLiteral("line1\nline2"), .eof])
    }

    // MARK: - Identifiers

    func testIdentifiers() throws {
        let types = try tokenTypes("foo bar _private $jquery camelCase")
        XCTAssertEqual(types, [
            .identifier("foo"),
            .identifier("bar"),
            .identifier("_private"),
            .identifier("$jquery"),
            .identifier("camelCase"),
            .eof
        ])
    }

    func testIdentifiersWithNumbers() throws {
        let types = try tokenTypes("foo123 _123 $1")
        XCTAssertEqual(types, [
            .identifier("foo123"),
            .identifier("_123"),
            .identifier("$1"),
            .eof
        ])
    }

    // MARK: - Keywords

    func testKeywords() throws {
        let types = try tokenTypes("var let const function return if else")
        XCTAssertEqual(types, [
            .var, .let, .const, .function, .return, .if, .else, .eof
        ])
    }

    func testBooleanKeywords() throws {
        let types = try tokenTypes("true false")
        XCTAssertEqual(types, [.true, .false, .eof])
    }

    func testNullUndefined() throws {
        let types = try tokenTypes("null undefined")
        XCTAssertEqual(types, [.null, .undefined, .eof])
    }

    func testControlFlowKeywords() throws {
        let types = try tokenTypes("for while do switch case default break continue")
        XCTAssertEqual(types, [
            .for, .while, .do, .switch, .case, .default, .break, .continue, .eof
        ])
    }

    func testExceptionKeywords() throws {
        let types = try tokenTypes("try catch finally throw")
        XCTAssertEqual(types, [.try, .catch, .finally, .throw, .eof])
    }

    func testOperatorKeywords() throws {
        let types = try tokenTypes("new this typeof instanceof in of delete void")
        XCTAssertEqual(types, [
            .new, .this, .typeof, .instanceof, .in, .of, .delete, .void, .eof
        ])
    }

    func testClassKeywords() throws {
        let types = try tokenTypes("class extends super static get set")
        XCTAssertEqual(types, [
            .class, .extends, .super, .static, .get, .set, .eof
        ])
    }

    func testAsyncKeywords() throws {
        let types = try tokenTypes("async await yield")
        XCTAssertEqual(types, [.async, .await, .yield, .eof])
    }

    // MARK: - Operators

    func testArithmeticOperators() throws {
        let types = try tokenTypes("+ - * / % **")
        XCTAssertEqual(types, [.plus, .minus, .star, .slash, .percent, .starStar, .eof])
    }

    func testIncrementDecrement() throws {
        let types = try tokenTypes("++ --")
        XCTAssertEqual(types, [.plusPlus, .minusMinus, .eof])
    }

    func testAssignmentOperators() throws {
        let types = try tokenTypes("= += -= *= /= %= **=")
        XCTAssertEqual(types, [
            .equal, .plusEqual, .minusEqual, .starEqual,
            .slashEqual, .percentEqual, .starStarEqual, .eof
        ])
    }

    func testComparisonOperators() throws {
        let types = try tokenTypes("== === != !== < <= > >=")
        XCTAssertEqual(types, [
            .equalEqual, .equalEqualEqual, .bangEqual, .bangEqualEqual,
            .less, .lessEqual, .greater, .greaterEqual, .eof
        ])
    }

    func testLogicalOperators() throws {
        let types = try tokenTypes("&& || ! ??")
        XCTAssertEqual(types, [.ampAmp, .pipePipe, .bang, .questionQuestion, .eof])
    }

    func testBitwiseOperators() throws {
        let types = try tokenTypes("& | ^ ~ << >> >>>")
        XCTAssertEqual(types, [
            .ampersand, .pipe, .caret, .tilde,
            .lessLess, .greaterGreater, .greaterGreaterGreater, .eof
        ])
    }

    func testBitwiseAssignmentOperators() throws {
        let types = try tokenTypes("&= |= ^= <<= >>= >>>=")
        XCTAssertEqual(types, [
            .ampEqual, .pipeEqual, .caretEqual,
            .lessLessEqual, .greaterGreaterEqual, .greaterGreaterGreaterEqual, .eof
        ])
    }

    func testLogicalAssignmentOperators() throws {
        let types = try tokenTypes("&&= ||= ??=")
        XCTAssertEqual(types, [.ampAmpEqual, .pipePipeEqual, .questionQuestionEqual, .eof])
    }

    // MARK: - Punctuation

    func testParensAndBraces() throws {
        let types = try tokenTypes("( ) { } [ ]")
        XCTAssertEqual(types, [
            .leftParen, .rightParen, .leftBrace, .rightBrace,
            .leftBracket, .rightBracket, .eof
        ])
    }

    func testDelimiters() throws {
        let types = try tokenTypes(", . ; :")
        XCTAssertEqual(types, [.comma, .dot, .semicolon, .colon, .eof])
    }

    func testSpecialPunctuation() throws {
        let types = try tokenTypes("=> ... ? ?.")
        XCTAssertEqual(types, [.arrow, .ellipsis, .question, .questionDot, .eof])
    }

    // MARK: - Location Tracking

    func testLineTracking() throws {
        let tokens = try tokenize("a\nb\nc")
        XCTAssertEqual(tokens[0].location.line, 1)
        XCTAssertEqual(tokens[1].location.line, 2)
        XCTAssertEqual(tokens[2].location.line, 3)
    }

    func testColumnTracking() throws {
        let tokens = try tokenize("abc def")
        XCTAssertEqual(tokens[0].location.column, 1)
        XCTAssertEqual(tokens[1].location.column, 5)
    }

    // MARK: - Real Code Examples

    func testVariableDeclaration() throws {
        let types = try tokenTypes("var x = 42;")
        XCTAssertEqual(types, [
            .var, .identifier("x"), .equal, .number(42), .semicolon, .eof
        ])
    }

    func testFunctionDeclaration() throws {
        let types = try tokenTypes("function add(a, b) { return a + b; }")
        XCTAssertEqual(types, [
            .function, .identifier("add"), .leftParen,
            .identifier("a"), .comma, .identifier("b"), .rightParen,
            .leftBrace, .return, .identifier("a"), .plus, .identifier("b"),
            .semicolon, .rightBrace, .eof
        ])
    }

    func testArrowFunction() throws {
        let types = try tokenTypes("const add = (a, b) => a + b;")
        XCTAssertEqual(types, [
            .const, .identifier("add"), .equal, .leftParen,
            .identifier("a"), .comma, .identifier("b"), .rightParen,
            .arrow, .identifier("a"), .plus, .identifier("b"), .semicolon, .eof
        ])
    }

    func testIfStatement() throws {
        let types = try tokenTypes("if (x > 0) { y = 1; } else { y = 0; }")
        XCTAssertEqual(types, [
            .if, .leftParen, .identifier("x"), .greater, .number(0), .rightParen,
            .leftBrace, .identifier("y"), .equal, .number(1), .semicolon, .rightBrace,
            .else, .leftBrace, .identifier("y"), .equal, .number(0), .semicolon,
            .rightBrace, .eof
        ])
    }

    func testArrayLiteral() throws {
        let types = try tokenTypes("[1, 2, 3]")
        XCTAssertEqual(types, [
            .leftBracket, .number(1), .comma, .number(2), .comma, .number(3),
            .rightBracket, .eof
        ])
    }

    func testObjectLiteral() throws {
        let types = try tokenTypes("{ a: 1, b: 2 }")
        XCTAssertEqual(types, [
            .leftBrace, .identifier("a"), .colon, .number(1), .comma,
            .identifier("b"), .colon, .number(2), .rightBrace, .eof
        ])
    }

    func testMemberAccess() throws {
        let types = try tokenTypes("obj.prop obj?.prop obj[0]")
        XCTAssertEqual(types, [
            .identifier("obj"), .dot, .identifier("prop"),
            .identifier("obj"), .questionDot, .identifier("prop"),
            .identifier("obj"), .leftBracket, .number(0), .rightBracket, .eof
        ])
    }

    func testSpreadOperator() throws {
        let types = try tokenTypes("[...arr]")
        XCTAssertEqual(types, [
            .leftBracket, .ellipsis, .identifier("arr"), .rightBracket, .eof
        ])
    }

    func testTernaryOperator() throws {
        let types = try tokenTypes("x ? y : z")
        XCTAssertEqual(types, [
            .identifier("x"), .question, .identifier("y"), .colon,
            .identifier("z"), .eof
        ])
    }

    func testNullishCoalescing() throws {
        let types = try tokenTypes("x ?? y")
        XCTAssertEqual(types, [
            .identifier("x"), .questionQuestion, .identifier("y"), .eof
        ])
    }
}
