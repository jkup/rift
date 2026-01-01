import XCTest
@testable import RiftCore

final class TokenTests: XCTestCase {

    // MARK: - Keyword Lookup

    func testKeywordLookup() {
        XCTAssertEqual(TokenType.keyword("var"), .var)
        XCTAssertEqual(TokenType.keyword("let"), .let)
        XCTAssertEqual(TokenType.keyword("const"), .const)
        XCTAssertEqual(TokenType.keyword("function"), .function)
        XCTAssertEqual(TokenType.keyword("return"), .return)
        XCTAssertEqual(TokenType.keyword("if"), .if)
        XCTAssertEqual(TokenType.keyword("else"), .else)
        XCTAssertEqual(TokenType.keyword("for"), .for)
        XCTAssertEqual(TokenType.keyword("while"), .while)
        XCTAssertEqual(TokenType.keyword("true"), .true)
        XCTAssertEqual(TokenType.keyword("false"), .false)
        XCTAssertEqual(TokenType.keyword("null"), .null)
        XCTAssertEqual(TokenType.keyword("undefined"), .undefined)
    }

    func testNonKeywordReturnsNil() {
        XCTAssertNil(TokenType.keyword("foo"))
        XCTAssertNil(TokenType.keyword("myVariable"))
        XCTAssertNil(TokenType.keyword(""))
        XCTAssertNil(TokenType.keyword("VAR"))  // Keywords are case-sensitive
    }

    // MARK: - Token Construction

    func testTokenConstruction() {
        let token = Token(
            type: .identifier("myVar"),
            line: 1,
            column: 5,
            position: 4
        )

        XCTAssertEqual(token.type, .identifier("myVar"))
        XCTAssertEqual(token.location.line, 1)
        XCTAssertEqual(token.location.column, 5)
        XCTAssertEqual(token.location.position, 4)
    }

    func testTokenWithLocation() {
        let loc = SourceLocation(line: 10, column: 20, position: 100)
        let token = Token(type: .number(42), location: loc)

        XCTAssertEqual(token.type, .number(42))
        XCTAssertEqual(token.location, loc)
    }

    // MARK: - TokenType Equality

    func testTokenTypeEquality() {
        XCTAssertEqual(TokenType.identifier("foo"), TokenType.identifier("foo"))
        XCTAssertNotEqual(TokenType.identifier("foo"), TokenType.identifier("bar"))

        XCTAssertEqual(TokenType.number(42), TokenType.number(42))
        XCTAssertNotEqual(TokenType.number(42), TokenType.number(43))

        XCTAssertEqual(TokenType.string("hello"), TokenType.string("hello"))
        XCTAssertNotEqual(TokenType.string("hello"), TokenType.string("world"))

        XCTAssertEqual(TokenType.plus, TokenType.plus)
        XCTAssertNotEqual(TokenType.plus, TokenType.minus)
    }

    // MARK: - Token Description

    func testTokenDescription() {
        let token = Token(type: .var, line: 1, column: 1, position: 0)
        XCTAssertTrue(token.description.contains("var"))
        XCTAssertTrue(token.description.contains("line 1"))
    }
}
