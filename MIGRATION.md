# Rift JavaScript Engine: C++ to Swift Migration Guide

This document provides a comprehensive guide for migrating the Rift JavaScript engine from C++ to Swift. It covers build tooling, linting, testing, code migration strategies, and architectural considerations.

## Table of Contents

1. [Overview](#overview)
2. [Language Comparison](#language-comparison)
3. [Build System Migration](#build-system-migration)
4. [Code Quality & Linting](#code-quality--linting)
5. [Testing Migration](#testing-migration)
6. [Component Migration Guide](#component-migration-guide)
7. [Architectural Considerations](#architectural-considerations)
8. [Memory Management & GC](#memory-management--gc)
9. [Migration Order & Dependencies](#migration-order--dependencies)
10. [Interoperability Options](#interoperability-options)
11. [Platform Considerations](#platform-considerations)
12. [Performance Notes](#performance-notes)

---

## Overview

### Current State (C++)
- **Language**: C++23
- **Build System**: CMake 3.16+
- **Lines of Code**: ~8,500
- **Source Files**: 32 (20 headers, 12 implementations)
- **External Dependencies**: RE2 (regex), Abseil (utilities)
- **Test Infrastructure**: Custom Node.js runners + Test262

### Target State (Swift)
- **Language**: Swift 5.9+ (recommended for modern features)
- **Build System**: Swift Package Manager (SPM)
- **Architecture**: Single package with multiple targets/modules

---

## Language Comparison

### Type Mapping

| C++ Type | Swift Equivalent | Notes |
|----------|------------------|-------|
| `std::string` | `String` | Swift strings are value types with COW |
| `std::vector<T>` | `[T]` or `Array<T>` | Value type with COW semantics |
| `std::unordered_map<K,V>` | `[K: V]` or `Dictionary<K,V>` | Value type |
| `std::shared_ptr<T>` | `class T` (reference type) | ARC handles reference counting |
| `std::unique_ptr<T>` | `class T` with single owner | Or use value types |
| `std::optional<T>` | `T?` | Native optional support |
| `std::variant<Ts...>` | `enum` with associated values | More powerful pattern matching |
| `double` | `Double` | IEEE 754 (same semantics) |
| `bool` | `Bool` | Direct mapping |
| `std::function<R(Args...)>` | `(Args...) -> R` | First-class function types |
| `nullptr` | `nil` | For optionals |
| `void*` | `UnsafeRawPointer` | Avoid if possible |

### Key Syntax Differences

```cpp
// C++ class
class MyClass {
public:
    MyClass(int value) : value_(value) {}
    int getValue() const { return value_; }
private:
    int value_;
};
```

```swift
// Swift class
class MyClass {
    private let value: Int

    init(value: Int) {
        self.value = value
    }

    func getValue() -> Int {
        return value
    }
}
```

### Enum Comparison (Critical for AST/Values)

```cpp
// C++ enum + variant for Value
enum class ValueType { Undefined, Null, Boolean, Number, String, Object };

std::variant<
    std::monostate,
    bool,
    double,
    std::string,
    JSObject*
> data_;
```

```swift
// Swift enum with associated values (much cleaner)
enum Value {
    case undefined
    case null
    case boolean(Bool)
    case number(Double)
    case string(String)
    case object(JSObject)

    var type: ValueType {
        switch self {
        case .undefined: return .undefined
        case .null: return .null
        case .boolean: return .boolean
        case .number: return .number
        case .string: return .string
        case .object: return .object
        }
    }
}
```

---

## Build System Migration

### From CMake to Swift Package Manager

#### Current CMake Structure
```
CMakeLists.txt
cmake/
  CodeQuality.cmake
build.sh
```

#### New SPM Structure
```
Package.swift
Sources/
  Rift/
    main.swift
  RiftCore/
    (all library code)
Tests/
  RiftTests/
    (unit tests)
```

### Package.swift Template

```swift
// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "Rift",
    platforms: [
        .macOS(.v13),
        .iOS(.v16),
        .linux
    ],
    products: [
        .executable(name: "rift", targets: ["Rift"]),
        .library(name: "RiftCore", targets: ["RiftCore"])
    ],
    dependencies: [
        // For argument parsing (replaces manual CLI handling)
        .package(url: "https://github.com/apple/swift-argument-parser", from: "1.2.0"),
        // Optional: For RE2 interop if needed
        // .package(url: "https://github.com/nicklockwood/Regex", from: "0.2.0")
    ],
    targets: [
        .executableTarget(
            name: "Rift",
            dependencies: [
                "RiftCore",
                .product(name: "ArgumentParser", package: "swift-argument-parser")
            ]
        ),
        .target(
            name: "RiftCore",
            dependencies: []
        ),
        .testTarget(
            name: "RiftTests",
            dependencies: ["RiftCore"],
            resources: [
                .copy("Fixtures")  // Test files
            ]
        )
    ]
)
```

### Build Commands Mapping

| C++ (CMake) | Swift (SPM) |
|-------------|-------------|
| `mkdir build && cd build && cmake ..` | (automatic) |
| `make` | `swift build` |
| `make -j$(nproc)` | `swift build -j 8` |
| `./build/rift` | `swift run rift` |
| `cmake .. -DCMAKE_BUILD_TYPE=Release` | `swift build -c release` |
| `cmake .. -DENABLE_SANITIZERS=ON` | `swift build --sanitize=address` |

### build.sh Replacement

```bash
#!/bin/bash
# build.swift.sh

set -e

case "${1:-build}" in
    build)
        swift build
        ;;
    release)
        swift build -c release
        ;;
    test)
        swift test
        ;;
    run)
        shift
        swift run rift "$@"
        ;;
    clean)
        swift package clean
        ;;
    *)
        echo "Usage: $0 {build|release|test|run|clean}"
        exit 1
        ;;
esac
```

---

## Code Quality & Linting

### From clang-format to swift-format / SwiftLint

#### Install Tools

```bash
# swift-format (Apple's official formatter)
brew install swift-format

# SwiftLint (community linter with more rules)
brew install swiftlint
```

#### SwiftLint Configuration (.swiftlint.yml)

```yaml
# .swiftlint.yml
disabled_rules:
  - trailing_whitespace
  - line_length  # Configure instead of disable

opt_in_rules:
  - array_init
  - closure_end_indentation
  - closure_spacing
  - collection_alignment
  - contains_over_filter_count
  - contains_over_first_not_nil
  - discouraged_object_literal
  - empty_collection_literal
  - empty_count
  - empty_string
  - enum_case_associated_values_count
  - explicit_init
  - extension_access_modifier
  - fatal_error_message
  - file_name
  - first_where
  - flatmap_over_map_reduce
  - identical_operands
  - joined_default_parameter
  - last_where
  - legacy_multiple
  - literal_expression_end_indentation
  - lower_acl_than_parent
  - modifier_order
  - operator_usage_whitespace
  - overridden_super_call
  - prefer_self_type_over_type_of_self
  - prefer_zero_over_explicit_init
  - redundant_nil_coalescing
  - redundant_type_annotation
  - sorted_first_last
  - static_operator
  - toggle_bool
  - unavailable_function
  - unneeded_parentheses_in_closure_argument
  - vertical_parameter_alignment_on_call
  - yoda_condition

line_length:
  warning: 120
  error: 150

type_body_length:
  warning: 300
  error: 500

file_length:
  warning: 500
  error: 1000

function_body_length:
  warning: 50
  error: 100

cyclomatic_complexity:
  warning: 15
  error: 25

identifier_name:
  min_length:
    warning: 2
    error: 1
  max_length:
    warning: 50
    error: 60
  excluded:
    - i
    - j
    - k
    - x
    - y
    - id
    - gc

excluded:
  - .build
  - Tests/Fixtures
  - Package.swift
```

#### swift-format Configuration (.swift-format)

```json
{
  "version": 1,
  "lineLength": 120,
  "indentation": {
    "spaces": 4
  },
  "tabWidth": 4,
  "maximumBlankLines": 1,
  "respectsExistingLineBreaks": true,
  "lineBreakBeforeControlFlowKeywords": false,
  "lineBreakBeforeEachArgument": true,
  "lineBreakBeforeEachGenericRequirement": true,
  "prioritizeKeepingFunctionOutputTogether": true,
  "indentConditionalCompilationBlocks": true,
  "indentSwitchCaseLabels": false,
  "fileScopedDeclarationPrivacy": {
    "accessLevel": "private"
  },
  "spacesAroundRangeFormationOperators": false
}
```

#### Makefile / Scripts for Quality Checks

```makefile
# Makefile for Swift project

.PHONY: format lint test build clean

format:
	swift-format --in-place --recursive Sources Tests

format-check:
	swift-format --lint --recursive Sources Tests

lint:
	swiftlint lint --strict

lint-fix:
	swiftlint lint --fix

test:
	swift test

build:
	swift build

release:
	swift build -c release

clean:
	swift package clean

quality: format-check lint
	@echo "All quality checks passed!"
```

### CI Integration (.github/workflows/ci.yml)

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - name: Install SwiftLint
        run: brew install swiftlint
      - name: Lint
        run: swiftlint lint --strict
      - name: Format Check
        run: swift-format lint --recursive Sources Tests

  build-macos:
    runs-on: macos-14
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: swift build
      - name: Test
        run: swift test

  build-linux:
    runs-on: ubuntu-latest
    container: swift:5.9
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: swift build
      - name: Test
        run: swift test
```

---

## Testing Migration

### From Custom Node.js Runner to XCTest

#### Test Structure Mapping

| C++ (Current) | Swift (XCTest) |
|---------------|----------------|
| `test/*.js` | `Tests/RiftTests/*.swift` |
| `test-runner.js` | `swift test` |
| Individual JS files | XCTestCase classes |

#### XCTest Example

```swift
// Tests/RiftTests/ArrayTests.swift
import XCTest
@testable import RiftCore

final class ArrayTests: XCTestCase {
    var engine: Rift!

    override func setUp() {
        super.setUp()
        engine = Rift()
    }

    override func tearDown() {
        engine = nil
        super.tearDown()
    }

    func testArrayPush() throws {
        let result = try engine.execute("""
            var arr = [1, 2, 3];
            arr.push(4);
            arr.length;
        """)
        XCTAssertEqual(result, .number(4))
    }

    func testArrayMap() throws {
        let result = try engine.execute("""
            [1, 2, 3].map(function(x) { return x * 2; });
        """)
        XCTAssertEqual(result, .array([.number(2), .number(4), .number(6)]))
    }

    func testArrayFilter() throws {
        let result = try engine.execute("""
            [1, 2, 3, 4, 5].filter(function(x) { return x > 3; });
        """)
        XCTAssertEqual(result, .array([.number(4), .number(5)]))
    }
}
```

#### Test262 Integration

Create a dedicated test target for Test262:

```swift
// Tests/Test262Tests/Test262Runner.swift
import XCTest
@testable import RiftCore

final class Test262Tests: XCTestCase {
    static var testCases: [(name: String, source: String, expected: Test262Expected)] = []

    override class func setUp() {
        super.setUp()
        // Load test262 tests from resources
        testCases = loadTest262Tests()
    }

    func testAllTest262() throws {
        var passed = 0
        var failed = 0
        var skipped = 0

        for testCase in Self.testCases {
            do {
                let engine = Rift()
                // Load harness
                try engine.execute(harnessCode)
                // Run test
                try engine.execute(testCase.source)
                passed += 1
            } catch let error as JSError {
                if testCase.expected == .error {
                    passed += 1
                } else {
                    failed += 1
                    print("FAIL: \(testCase.name) - \(error)")
                }
            } catch {
                failed += 1
            }
        }

        print("Test262 Results: \(passed) passed, \(failed) failed, \(skipped) skipped")
    }
}
```

#### Parameterized Tests (via swift-testing in Swift 6)

```swift
// With Swift 6's swift-testing framework
import Testing
@testable import RiftCore

@Suite("Array Methods")
struct ArrayMethodsTests {
    @Test("push adds elements", arguments: [
        (input: "[1, 2]", push: "3", expected: 3),
        (input: "[]", push: "1", expected: 1),
        (input: "[1]", push: "2, 3", expected: 3)
    ])
    func testPush(input: String, push: String, expected: Int) throws {
        let engine = Rift()
        let result = try engine.execute("""
            var arr = \(input);
            arr.push(\(push));
            arr.length;
        """)
        #expect(result == .number(Double(expected)))
    }
}
```

---

## Component Migration Guide

### 1. Token & Lexer

#### C++ Current (`src/frontend/lexer/`)
- `token.h`: Token enum and Token struct
- `lexer.h/cpp`: Lexer class (597 lines)

#### Swift Migration

```swift
// Sources/RiftCore/Frontend/Token.swift
enum TokenType: Equatable {
    case eof
    case identifier(String)
    case number(Double)
    case string(String)
    case templateLiteral(String)

    // Keywords
    case `var`, `let`, `const`
    case `func`  // "function" in JS
    case `if`, `else`
    case `for`, `while`, `do`
    case `switch`, `case`, `default`
    case `break`, `continue`
    case `return`, `throw`
    case `try`, `catch`, `finally`
    case `new`, `this`
    case `true`, `false`
    case `null`, `undefined`
    case `typeof`, `instanceof`

    // Operators
    case plus, minus, star, slash, percent
    case plusPlus, minusMinus
    case equal, plusEqual, minusEqual
    case equalEqual, equalEqualEqual
    case bangEqual, bangEqualEqual
    case less, lessEqual, greater, greaterEqual
    case ampAmp, pipePipe, bang
    case ampersand, pipe, caret, tilde
    case lessLess, greaterGreater, greaterGreaterGreater
    case question, colon

    // Punctuation
    case leftParen, rightParen
    case leftBrace, rightBrace
    case leftBracket, rightBracket
    case comma, dot, semicolon
    case arrow  // =>
    case ellipsis  // ...
}

struct Token: Equatable {
    let type: TokenType
    let line: Int
    let column: Int
    let position: Int
}

// Sources/RiftCore/Frontend/Lexer.swift
struct Lexer {
    private let source: String
    private var current: String.Index
    private var line: Int = 1
    private var column: Int = 1
    private var position: Int = 0

    init(source: String) {
        self.source = source
        self.current = source.startIndex
    }

    mutating func nextToken() -> Token {
        skipWhitespaceAndComments()

        guard current < source.endIndex else {
            return Token(type: .eof, line: line, column: column, position: position)
        }

        let char = source[current]
        let startLine = line
        let startColumn = column
        let startPosition = position

        // Number
        if char.isNumber || (char == "." && peek()?.isNumber == true) {
            return readNumber(startLine: startLine, startColumn: startColumn, startPosition: startPosition)
        }

        // String
        if char == "\"" || char == "'" {
            return readString(quote: char, startLine: startLine, startColumn: startColumn, startPosition: startPosition)
        }

        // Identifier or keyword
        if char.isLetter || char == "_" || char == "$" {
            return readIdentifier(startLine: startLine, startColumn: startColumn, startPosition: startPosition)
        }

        // Operators and punctuation
        return readOperator(startLine: startLine, startColumn: startColumn, startPosition: startPosition)
    }

    mutating func tokenize() -> [Token] {
        var tokens: [Token] = []
        while true {
            let token = nextToken()
            tokens.append(token)
            if case .eof = token.type { break }
        }
        return tokens
    }

    // ... helper methods
}
```

### 2. AST Nodes

#### C++ Current (`src/frontend/ast/`)
- Single `ASTNode` struct with `type`, `children`, `value`, `metadata`

#### Swift Migration (Strongly Typed)

```swift
// Sources/RiftCore/Frontend/AST.swift

/// Base protocol for all AST nodes
protocol ASTNode {
    var location: SourceLocation { get }
}

struct SourceLocation {
    let line: Int
    let column: Int
    let position: Int
}

// MARK: - Expressions

protocol Expression: ASTNode {}

struct LiteralExpression: Expression {
    let location: SourceLocation
    let value: LiteralValue

    enum LiteralValue {
        case number(Double)
        case string(String)
        case boolean(Bool)
        case null
        case undefined
    }
}

struct IdentifierExpression: Expression {
    let location: SourceLocation
    let name: String
}

struct BinaryExpression: Expression {
    let location: SourceLocation
    let `operator`: BinaryOperator
    let left: any Expression
    let right: any Expression

    enum BinaryOperator: String {
        case add = "+"
        case subtract = "-"
        case multiply = "*"
        case divide = "/"
        case modulo = "%"
        case equal = "=="
        case strictEqual = "==="
        case notEqual = "!="
        case strictNotEqual = "!=="
        case less = "<"
        case lessEqual = "<="
        case greater = ">"
        case greaterEqual = ">="
        case and = "&&"
        case or = "||"
        // ... etc
    }
}

struct UnaryExpression: Expression {
    let location: SourceLocation
    let `operator`: UnaryOperator
    let operand: any Expression
    let prefix: Bool

    enum UnaryOperator: String {
        case not = "!"
        case negative = "-"
        case positive = "+"
        case typeof = "typeof"
        case bitwiseNot = "~"
        case increment = "++"
        case decrement = "--"
    }
}

struct CallExpression: Expression {
    let location: SourceLocation
    let callee: any Expression
    let arguments: [any Expression]
}

struct MemberExpression: Expression {
    let location: SourceLocation
    let object: any Expression
    let property: any Expression
    let computed: Bool  // true for obj[prop], false for obj.prop
}

struct AssignmentExpression: Expression {
    let location: SourceLocation
    let `operator`: AssignmentOperator
    let left: any Expression
    let right: any Expression

    enum AssignmentOperator: String {
        case assign = "="
        case addAssign = "+="
        case subtractAssign = "-="
        case multiplyAssign = "*="
        case divideAssign = "/="
        case moduloAssign = "%="
    }
}

struct ArrayLiteralExpression: Expression {
    let location: SourceLocation
    let elements: [any Expression]
}

struct ObjectLiteralExpression: Expression {
    let location: SourceLocation
    let properties: [Property]

    struct Property {
        let key: any Expression
        let value: any Expression
        let computed: Bool
    }
}

struct FunctionExpression: Expression {
    let location: SourceLocation
    let name: String?
    let parameters: [String]
    let body: BlockStatement
}

struct NewExpression: Expression {
    let location: SourceLocation
    let callee: any Expression
    let arguments: [any Expression]
}

struct ConditionalExpression: Expression {
    let location: SourceLocation
    let test: any Expression
    let consequent: any Expression
    let alternate: any Expression
}

struct TemplateLiteralExpression: Expression {
    let location: SourceLocation
    let quasis: [String]
    let expressions: [any Expression]
}

// MARK: - Statements

protocol Statement: ASTNode {}

struct Program: ASTNode {
    let location: SourceLocation
    let body: [any Statement]
}

struct ExpressionStatement: Statement {
    let location: SourceLocation
    let expression: any Expression
}

struct BlockStatement: Statement {
    let location: SourceLocation
    let body: [any Statement]
}

struct VariableDeclaration: Statement {
    let location: SourceLocation
    let kind: Kind
    let declarations: [Declarator]

    enum Kind {
        case `var`, `let`, `const`
    }

    struct Declarator {
        let name: String
        let initializer: (any Expression)?
    }
}

struct IfStatement: Statement {
    let location: SourceLocation
    let test: any Expression
    let consequent: any Statement
    let alternate: (any Statement)?
}

struct WhileStatement: Statement {
    let location: SourceLocation
    let test: any Expression
    let body: any Statement
}

struct DoWhileStatement: Statement {
    let location: SourceLocation
    let body: any Statement
    let test: any Expression
}

struct ForStatement: Statement {
    let location: SourceLocation
    let initializer: (any ASTNode)?  // Statement or Expression
    let test: (any Expression)?
    let update: (any Expression)?
    let body: any Statement
}

struct SwitchStatement: Statement {
    let location: SourceLocation
    let discriminant: any Expression
    let cases: [SwitchCase]

    struct SwitchCase {
        let test: (any Expression)?  // nil for default
        let consequent: [any Statement]
    }
}

struct BreakStatement: Statement {
    let location: SourceLocation
}

struct ContinueStatement: Statement {
    let location: SourceLocation
}

struct ReturnStatement: Statement {
    let location: SourceLocation
    let argument: (any Expression)?
}

struct ThrowStatement: Statement {
    let location: SourceLocation
    let argument: any Expression
}

struct TryStatement: Statement {
    let location: SourceLocation
    let block: BlockStatement
    let handler: CatchClause?
    let finalizer: BlockStatement?

    struct CatchClause {
        let param: String?
        let body: BlockStatement
    }
}

struct FunctionDeclaration: Statement {
    let location: SourceLocation
    let name: String
    let parameters: [String]
    let body: BlockStatement
}
```

### 3. Parser

#### Swift Parser with Recursive Descent

```swift
// Sources/RiftCore/Frontend/Parser.swift

struct Parser {
    private var tokens: [Token]
    private var current: Int = 0

    init(tokens: [Token]) {
        self.tokens = tokens
    }

    mutating func parse() throws -> Program {
        var statements: [any Statement] = []

        while !isAtEnd {
            statements.append(try parseStatement())
        }

        return Program(
            location: SourceLocation(line: 1, column: 1, position: 0),
            body: statements
        )
    }

    // MARK: - Statements

    private mutating func parseStatement() throws -> any Statement {
        switch peek().type {
        case .var, .let, .const:
            return try parseVariableDeclaration()
        case .func:
            return try parseFunctionDeclaration()
        case .if:
            return try parseIfStatement()
        case .while:
            return try parseWhileStatement()
        case .do:
            return try parseDoWhileStatement()
        case .for:
            return try parseForStatement()
        case .switch:
            return try parseSwitchStatement()
        case .return:
            return try parseReturnStatement()
        case .throw:
            return try parseThrowStatement()
        case .try:
            return try parseTryStatement()
        case .break:
            advance()
            consumeSemicolon()
            return BreakStatement(location: previous().location)
        case .continue:
            advance()
            consumeSemicolon()
            return ContinueStatement(location: previous().location)
        case .leftBrace:
            return try parseBlockStatement()
        default:
            return try parseExpressionStatement()
        }
    }

    // MARK: - Expressions with Precedence Climbing

    private mutating func parseExpression() throws -> any Expression {
        return try parseAssignmentExpression()
    }

    private mutating func parseAssignmentExpression() throws -> any Expression {
        let expr = try parseConditionalExpression()

        if let op = matchAssignmentOperator() {
            let right = try parseAssignmentExpression()
            return AssignmentExpression(
                location: expr.location,
                operator: op,
                left: expr,
                right: right
            )
        }

        return expr
    }

    private mutating func parseBinaryExpression(precedence: Int = 0) throws -> any Expression {
        var left = try parseUnaryExpression()

        while let op = peekBinaryOperator(), op.precedence >= precedence {
            advance()
            let right = try parseBinaryExpression(precedence: op.precedence + 1)
            left = BinaryExpression(
                location: left.location,
                operator: op.op,
                left: left,
                right: right
            )
        }

        return left
    }

    // ... additional parsing methods

    // MARK: - Helpers

    private var isAtEnd: Bool {
        if case .eof = peek().type { return true }
        return false
    }

    private func peek() -> Token {
        tokens[current]
    }

    private mutating func advance() -> Token {
        if !isAtEnd { current += 1 }
        return previous()
    }

    private func previous() -> Token {
        tokens[current - 1]
    }
}

// Error types
enum ParseError: Error, LocalizedError {
    case unexpectedToken(Token, expected: String)
    case unexpectedEndOfInput
    case invalidAssignmentTarget(SourceLocation)

    var errorDescription: String? {
        switch self {
        case .unexpectedToken(let token, let expected):
            return "Unexpected token \(token.type) at line \(token.line), expected \(expected)"
        case .unexpectedEndOfInput:
            return "Unexpected end of input"
        case .invalidAssignmentTarget(let loc):
            return "Invalid assignment target at line \(loc.line)"
        }
    }
}
```

### 4. Value System

```swift
// Sources/RiftCore/Runtime/Value.swift

/// JavaScript value representation
enum Value: Equatable, CustomStringConvertible {
    case undefined
    case null
    case boolean(Bool)
    case number(Double)
    case string(String)
    case object(JSObject)

    // MARK: - Type Checks

    var isUndefined: Bool {
        if case .undefined = self { return true }
        return false
    }

    var isNull: Bool {
        if case .null = self { return true }
        return false
    }

    var isNullish: Bool {
        isUndefined || isNull
    }

    var isTruthy: Bool {
        switch self {
        case .undefined, .null:
            return false
        case .boolean(let b):
            return b
        case .number(let n):
            return n != 0 && !n.isNaN
        case .string(let s):
            return !s.isEmpty
        case .object:
            return true
        }
    }

    // MARK: - Type Coercion

    func toBoolean() -> Bool {
        isTruthy
    }

    func toNumber() -> Double {
        switch self {
        case .undefined:
            return .nan
        case .null:
            return 0
        case .boolean(let b):
            return b ? 1 : 0
        case .number(let n):
            return n
        case .string(let s):
            return Double(s) ?? .nan
        case .object(let obj):
            return obj.toPrimitive().toNumber()
        }
    }

    func toString() -> String {
        switch self {
        case .undefined:
            return "undefined"
        case .null:
            return "null"
        case .boolean(let b):
            return b ? "true" : "false"
        case .number(let n):
            if n.isNaN { return "NaN" }
            if n.isInfinite { return n > 0 ? "Infinity" : "-Infinity" }
            if n == n.rounded() && abs(n) < Double(Int64.max) {
                return String(Int64(n))
            }
            return String(n)
        case .string(let s):
            return s
        case .object(let obj):
            return obj.toString()
        }
    }

    // MARK: - Equality

    func strictEquals(_ other: Value) -> Bool {
        self == other
    }

    func looseEquals(_ other: Value) -> Bool {
        // Implement JS == semantics with type coercion
        switch (self, other) {
        case (.null, .undefined), (.undefined, .null):
            return true
        case (.number(let a), .string(let b)):
            return a == (Double(b) ?? .nan)
        case (.string(let a), .number(let b)):
            return (Double(a) ?? .nan) == b
        case (.boolean(let a), _):
            return Value.number(a ? 1 : 0).looseEquals(other)
        case (_, .boolean(let b)):
            return self.looseEquals(.number(b ? 1 : 0))
        default:
            return self == other
        }
    }

    // MARK: - CustomStringConvertible

    var description: String {
        toString()
    }
}
```

### 5. JSObject System

```swift
// Sources/RiftCore/Runtime/JSObject.swift

/// Property descriptor for object properties
struct PropertyDescriptor {
    var value: Value
    var writable: Bool
    var enumerable: Bool
    var configurable: Bool

    static func data(_ value: Value, writable: Bool = true, enumerable: Bool = true, configurable: Bool = true) -> PropertyDescriptor {
        PropertyDescriptor(value: value, writable: writable, enumerable: enumerable, configurable: configurable)
    }
}

/// Base class for all JavaScript objects
class JSObject: Equatable, CustomStringConvertible {
    var prototype: JSObject?
    private var properties: [String: PropertyDescriptor] = [:]

    init(prototype: JSObject? = nil) {
        self.prototype = prototype
        self.properties.reserveCapacity(64)
    }

    // MARK: - Property Access

    func hasOwnProperty(_ key: String) -> Bool {
        properties[key] != nil
    }

    func hasProperty(_ key: String) -> Bool {
        if hasOwnProperty(key) { return true }
        return prototype?.hasProperty(key) ?? false
    }

    func getProperty(_ key: String) -> Value {
        if let descriptor = properties[key] {
            return descriptor.value
        }
        return prototype?.getProperty(key) ?? .undefined
    }

    func setProperty(_ key: String, _ value: Value) {
        if let existing = properties[key], !existing.writable {
            return  // Silently fail for non-writable (or throw in strict mode)
        }
        properties[key] = .data(value)
    }

    func defineProperty(_ key: String, _ descriptor: PropertyDescriptor) {
        properties[key] = descriptor
    }

    func deleteProperty(_ key: String) -> Bool {
        guard let descriptor = properties[key] else { return true }
        guard descriptor.configurable else { return false }
        properties.removeValue(forKey: key)
        return true
    }

    func getOwnPropertyDescriptor(_ key: String) -> PropertyDescriptor? {
        properties[key]
    }

    func ownKeys() -> [String] {
        Array(properties.keys)
    }

    func enumerableKeys() -> [String] {
        properties.filter { $0.value.enumerable }.map { $0.key }
    }

    // MARK: - Type Conversion

    func toPrimitive(preferredType: PreferredType = .default) -> Value {
        // Try valueOf, then toString (or reverse for string hint)
        if preferredType == .string {
            if let str = tryToString() { return str }
            if let num = tryValueOf() { return num }
        } else {
            if let num = tryValueOf() { return num }
            if let str = tryToString() { return str }
        }
        return .string("[object Object]")
    }

    func toString() -> String {
        if let toStringMethod = properties["toString"],
           case .object(let fn as JSFunction) = toStringMethod.value {
            // Call toString method
            // ... implementation
        }
        return "[object Object]"
    }

    enum PreferredType {
        case `default`, number, string
    }

    private func tryValueOf() -> Value? {
        // Implementation
        nil
    }

    private func tryToString() -> Value? {
        // Implementation
        nil
    }

    // MARK: - Equatable

    static func == (lhs: JSObject, rhs: JSObject) -> Bool {
        lhs === rhs  // Reference equality
    }

    // MARK: - CustomStringConvertible

    var description: String {
        toString()
    }
}

/// JavaScript function object
class JSFunction: JSObject {
    enum Body {
        case native((CallContext, [Value]) throws -> Value)
        case userDefined(parameters: [String], body: BlockStatement, closure: Environment)
    }

    let body: Body
    let name: String?

    init(name: String? = nil, body: Body, prototype: JSObject? = nil) {
        self.name = name
        self.body = body
        super.init(prototype: prototype)
    }

    func call(context: CallContext, arguments: [Value]) throws -> Value {
        switch body {
        case .native(let fn):
            return try fn(context, arguments)
        case .userDefined(let params, let bodyStmt, let closure):
            // Create new environment, bind parameters, execute body
            // ... implementation
            fatalError("Implement user-defined function calls")
        }
    }
}

/// Array object with special length handling
class JSArray: JSObject {
    var elements: [Value] = []

    override init(prototype: JSObject? = nil) {
        super.init(prototype: prototype)
    }

    init(elements: [Value], prototype: JSObject? = nil) {
        self.elements = elements
        super.init(prototype: prototype)
    }

    override func getProperty(_ key: String) -> Value {
        if key == "length" {
            return .number(Double(elements.count))
        }
        if let index = Int(key), index >= 0 && index < elements.count {
            return elements[index]
        }
        return super.getProperty(key)
    }

    override func setProperty(_ key: String, _ value: Value) {
        if key == "length" {
            if case .number(let n) = value, n >= 0 {
                let newLength = Int(n)
                if newLength < elements.count {
                    elements.removeLast(elements.count - newLength)
                } else {
                    elements.append(contentsOf: repeatElement(.undefined, count: newLength - elements.count))
                }
            }
            return
        }
        if let index = Int(key), index >= 0 {
            while elements.count <= index {
                elements.append(.undefined)
            }
            elements[index] = value
            return
        }
        super.setProperty(key, value)
    }
}
```

### 6. Environment (Scope Chain)

```swift
// Sources/RiftCore/Runtime/Environment.swift

enum VariableKind {
    case `var`
    case `let`
    case `const`
}

struct VariableEntry {
    var value: Value
    let kind: VariableKind
    var initialized: Bool
}

class Environment {
    private var variables: [String: VariableEntry] = [:]
    let parent: Environment?
    let isBlockScope: Bool

    init(parent: Environment? = nil, isBlockScope: Bool = false) {
        self.parent = parent
        self.isBlockScope = isBlockScope
    }

    // MARK: - Variable Operations

    func declare(_ name: String, kind: VariableKind) throws {
        if variables[name] != nil {
            throw RuntimeError.variableAlreadyDeclared(name)
        }
        variables[name] = VariableEntry(value: .undefined, kind: kind, initialized: false)
    }

    func define(_ name: String, value: Value, kind: VariableKind) throws {
        if let existing = variables[name], existing.kind == .const && existing.initialized {
            throw RuntimeError.assignmentToConstant(name)
        }
        variables[name] = VariableEntry(value: value, kind: kind, initialized: true)
    }

    func get(_ name: String) throws -> Value {
        if let entry = variables[name] {
            guard entry.initialized else {
                throw RuntimeError.temporalDeadZone(name)
            }
            return entry.value
        }

        if let parent = parent {
            return try parent.get(name)
        }

        throw RuntimeError.undefinedVariable(name)
    }

    func set(_ name: String, value: Value) throws {
        if var entry = variables[name] {
            guard entry.kind != .const else {
                throw RuntimeError.assignmentToConstant(name)
            }
            entry.value = value
            entry.initialized = true
            variables[name] = entry
            return
        }

        if let parent = parent {
            try parent.set(name, value: value)
            return
        }

        throw RuntimeError.undefinedVariable(name)
    }

    func has(_ name: String) -> Bool {
        if variables[name] != nil { return true }
        return parent?.has(name) ?? false
    }

    func hasLocal(_ name: String) -> Bool {
        variables[name] != nil
    }

    // MARK: - Scope Creation

    func createChild(isBlockScope: Bool = false) -> Environment {
        Environment(parent: self, isBlockScope: isBlockScope)
    }
}
```

### 7. Interpreter/Evaluator

```swift
// Sources/RiftCore/Core/Interpreter.swift

class Interpreter {
    private var globalEnvironment: Environment
    private var currentEnvironment: Environment
    private let objectFactory: ObjectFactory

    init() {
        self.globalEnvironment = Environment()
        self.currentEnvironment = globalEnvironment
        self.objectFactory = ObjectFactory()
        setupBuiltins()
    }

    func execute(_ source: String) throws -> Value {
        var lexer = Lexer(source: source)
        let tokens = lexer.tokenize()
        var parser = Parser(tokens: tokens)
        let program = try parser.parse()
        return try evaluate(program)
    }

    // MARK: - Statement Evaluation

    private func evaluate(_ node: any ASTNode) throws -> Value {
        switch node {
        case let program as Program:
            return try evaluateProgram(program)
        case let stmt as ExpressionStatement:
            return try evaluateExpression(stmt.expression)
        case let stmt as BlockStatement:
            return try evaluateBlock(stmt)
        case let stmt as VariableDeclaration:
            return try evaluateVariableDeclaration(stmt)
        case let stmt as IfStatement:
            return try evaluateIf(stmt)
        case let stmt as WhileStatement:
            return try evaluateWhile(stmt)
        case let stmt as ForStatement:
            return try evaluateFor(stmt)
        case let stmt as ReturnStatement:
            throw ReturnValue(value: try stmt.argument.map { try evaluateExpression($0) } ?? .undefined)
        case let stmt as ThrowStatement:
            throw JSException(value: try evaluateExpression(stmt.argument))
        case let stmt as TryStatement:
            return try evaluateTry(stmt)
        case let stmt as FunctionDeclaration:
            return try evaluateFunctionDeclaration(stmt)
        case let expr as any Expression:
            return try evaluateExpression(expr)
        default:
            throw RuntimeError.unknownNodeType(String(describing: type(of: node)))
        }
    }

    private func evaluateProgram(_ program: Program) throws -> Value {
        var result: Value = .undefined
        for statement in program.body {
            result = try evaluate(statement)
        }
        return result
    }

    private func evaluateBlock(_ block: BlockStatement) throws -> Value {
        let previousEnv = currentEnvironment
        currentEnvironment = currentEnvironment.createChild(isBlockScope: true)
        defer { currentEnvironment = previousEnv }

        var result: Value = .undefined
        for statement in block.body {
            result = try evaluate(statement)
        }
        return result
    }

    // MARK: - Expression Evaluation

    private func evaluateExpression(_ expr: any Expression) throws -> Value {
        switch expr {
        case let lit as LiteralExpression:
            return evaluateLiteral(lit)
        case let id as IdentifierExpression:
            return try currentEnvironment.get(id.name)
        case let binary as BinaryExpression:
            return try evaluateBinary(binary)
        case let unary as UnaryExpression:
            return try evaluateUnary(unary)
        case let call as CallExpression:
            return try evaluateCall(call)
        case let member as MemberExpression:
            return try evaluateMember(member)
        case let assign as AssignmentExpression:
            return try evaluateAssignment(assign)
        case let array as ArrayLiteralExpression:
            return try evaluateArrayLiteral(array)
        case let obj as ObjectLiteralExpression:
            return try evaluateObjectLiteral(obj)
        case let fn as FunctionExpression:
            return try evaluateFunctionExpression(fn)
        case let newExpr as NewExpression:
            return try evaluateNew(newExpr)
        default:
            throw RuntimeError.unknownNodeType(String(describing: type(of: expr)))
        }
    }

    private func evaluateBinary(_ expr: BinaryExpression) throws -> Value {
        // Short-circuit for && and ||
        if expr.operator == .and {
            let left = try evaluateExpression(expr.left)
            if !left.isTruthy { return left }
            return try evaluateExpression(expr.right)
        }

        if expr.operator == .or {
            let left = try evaluateExpression(expr.left)
            if left.isTruthy { return left }
            return try evaluateExpression(expr.right)
        }

        let left = try evaluateExpression(expr.left)
        let right = try evaluateExpression(expr.right)

        switch expr.operator {
        case .add:
            return performAddition(left, right)
        case .subtract:
            return .number(left.toNumber() - right.toNumber())
        case .multiply:
            return .number(left.toNumber() * right.toNumber())
        case .divide:
            return .number(left.toNumber() / right.toNumber())
        case .modulo:
            return .number(left.toNumber().truncatingRemainder(dividingBy: right.toNumber()))
        case .equal:
            return .boolean(left.looseEquals(right))
        case .strictEqual:
            return .boolean(left.strictEquals(right))
        case .notEqual:
            return .boolean(!left.looseEquals(right))
        case .strictNotEqual:
            return .boolean(!left.strictEquals(right))
        case .less:
            return .boolean(left.toNumber() < right.toNumber())
        case .lessEqual:
            return .boolean(left.toNumber() <= right.toNumber())
        case .greater:
            return .boolean(left.toNumber() > right.toNumber())
        case .greaterEqual:
            return .boolean(left.toNumber() >= right.toNumber())
        default:
            throw RuntimeError.unknownOperator(expr.operator.rawValue)
        }
    }

    private func performAddition(_ left: Value, _ right: Value) -> Value {
        // String concatenation takes precedence
        if case .string = left {
            return .string(left.toString() + right.toString())
        }
        if case .string = right {
            return .string(left.toString() + right.toString())
        }
        return .number(left.toNumber() + right.toNumber())
    }

    // ... additional evaluation methods

    // MARK: - Built-ins Setup

    private func setupBuiltins() {
        // Console
        let console = objectFactory.createObject()
        console.setProperty("log", .object(objectFactory.createNativeFunction("log") { _, args in
            print(args.map { $0.toString() }.joined(separator: " "))
            return .undefined
        }))
        try? globalEnvironment.define("console", value: .object(console), kind: .var)

        // Math, Array, Object, etc.
        setupMath()
        setupArray()
        setupObject()
        setupString()
        setupNumber()
        setupJSON()
        // ...
    }
}

// MARK: - Control Flow Exceptions

struct ReturnValue: Error {
    let value: Value
}

struct BreakException: Error {}

struct ContinueException: Error {}

struct JSException: Error {
    let value: Value
}

// MARK: - Runtime Errors

enum RuntimeError: Error, LocalizedError {
    case undefinedVariable(String)
    case variableAlreadyDeclared(String)
    case assignmentToConstant(String)
    case temporalDeadZone(String)
    case notAFunction(String)
    case unknownOperator(String)
    case unknownNodeType(String)
    case invalidPropertyAccess
    case typeError(String)

    var errorDescription: String? {
        switch self {
        case .undefinedVariable(let name):
            return "ReferenceError: \(name) is not defined"
        case .variableAlreadyDeclared(let name):
            return "SyntaxError: Identifier '\(name)' has already been declared"
        case .assignmentToConstant(let name):
            return "TypeError: Assignment to constant variable '\(name)'"
        case .temporalDeadZone(let name):
            return "ReferenceError: Cannot access '\(name)' before initialization"
        case .notAFunction(let name):
            return "TypeError: \(name) is not a function"
        case .unknownOperator(let op):
            return "Unknown operator: \(op)"
        case .unknownNodeType(let type):
            return "Unknown AST node type: \(type)"
        case .invalidPropertyAccess:
            return "TypeError: Cannot read property of undefined"
        case .typeError(let msg):
            return "TypeError: \(msg)"
        }
    }
}
```

---

## Architectural Considerations

### 1. Memory Management: ARC vs Custom GC

**Problem**: JavaScript has circular references that ARC cannot handle automatically.

**Option A: Weak References (Simplest)**
```swift
class JSObject {
    weak var prototype: JSObject?  // Breaks prototype cycles
    var properties: [String: PropertyDescriptor] = [:]
}
```
- Pros: Uses native ARC, simple
- Cons: Can lead to premature deallocation if not careful

**Option B: Custom Mark-Sweep (Current C++ Approach)**
```swift
protocol GCManaged: AnyObject {
    var gcMarked: Bool { get set }
    func getReferences() -> [GCManaged]
}

class GarbageCollector {
    private var allObjects: Set<ObjectIdentifier> = []
    private var objectMap: [ObjectIdentifier: GCManaged] = [:]
    private var roots: Set<ObjectIdentifier> = []

    func register(_ object: GCManaged) {
        let id = ObjectIdentifier(object)
        allObjects.insert(id)
        objectMap[id] = object
    }

    func addRoot(_ object: GCManaged) {
        roots.insert(ObjectIdentifier(object))
    }

    func collect() {
        // Mark phase
        for object in objectMap.values {
            object.gcMarked = false
        }

        for rootId in roots {
            if let root = objectMap[rootId] {
                mark(root)
            }
        }

        // Sweep phase
        let unreachable = allObjects.filter { !objectMap[$0]!.gcMarked }
        for id in unreachable {
            objectMap.removeValue(forKey: id)
            allObjects.remove(id)
        }
    }

    private func mark(_ object: GCManaged) {
        guard !object.gcMarked else { return }
        object.gcMarked = true
        for ref in object.getReferences() {
            mark(ref)
        }
    }
}
```
- Pros: Full control, handles cycles
- Cons: More complex, must be careful about timing

**Option C: Hybrid (Recommended)**
- Use ARC for most objects
- Track potentially-cyclic objects (closures with captured variables)
- Run cycle detection periodically
- Use `weak` for prototype chains

### 2. Value Types vs Reference Types

**Recommendation**: Use enums for Value (value type) but classes for JSObject (reference type)

```swift
// Value is a value type (copied on assignment)
enum Value {
    case object(JSObject)  // But contains reference to object
}

// JSObject is a reference type (shared)
class JSObject { }
```

This matches JavaScript semantics:
- Primitives are passed by value
- Objects are passed by reference

### 3. Error Handling Strategy

**Swift Approach**: Use throwing functions and typed errors

```swift
// Instead of C++ exceptions, use Swift's error handling
func evaluate(_ node: ASTNode) throws -> Value

// For control flow (return/break/continue), use special error types
struct ReturnValue: Error { let value: Value }
struct BreakException: Error {}
struct ContinueException: Error {}

// In loops:
do {
    try evaluateStatement(stmt)
} catch is BreakException {
    break
} catch is ContinueException {
    continue
}
```

### 4. Concurrency Considerations

If you plan to add async/await support later:

```swift
// Use Swift's actor model for thread safety
actor Interpreter {
    private var globalEnvironment: Environment

    func execute(_ source: String) async throws -> Value {
        // ...
    }
}
```

### 5. Protocol-Oriented Design

Leverage Swift's protocols for extensibility:

```swift
protocol Callable {
    func call(context: CallContext, arguments: [Value]) throws -> Value
}

protocol Indexable {
    subscript(index: Int) -> Value { get set }
    var length: Int { get }
}

protocol Iterable {
    func makeIterator() -> JSIterator
}

// Then JSFunction, JSArray, etc. conform to these
class JSFunction: JSObject, Callable { }
class JSArray: JSObject, Indexable, Iterable { }
```

---

## Memory Management & GC

### Detailed GC Implementation for Swift

```swift
// Sources/RiftCore/Memory/GarbageCollector.swift

/// Protocol for GC-managed objects
protocol GCManaged: AnyObject {
    var gcMarked: Bool { get set }
    var gcTypeName: String { get }
    func getReferences() -> [GCManaged]
}

/// Mark-sweep garbage collector
final class MarkSweepGC {
    private var allObjects: [ObjectIdentifier: Weak<AnyObject>] = [:]
    private var roots: Set<ObjectIdentifier> = []
    private var collectionThreshold: Int = 1000
    private var enabled: Bool = true
    private var collectingInProgress: Bool = false

    struct Weak<T: AnyObject> {
        weak var value: T?
    }

    var objectCount: Int { allObjects.count }

    func register<T: GCManaged>(_ object: T) {
        let id = ObjectIdentifier(object)
        allObjects[id] = Weak(value: object)

        if enabled && allObjects.count >= collectionThreshold {
            collect()
        }
    }

    func addRoot<T: GCManaged>(_ object: T) {
        roots.insert(ObjectIdentifier(object))
    }

    func removeRoot<T: GCManaged>(_ object: T) {
        roots.remove(ObjectIdentifier(object))
    }

    func collect() {
        guard enabled && !collectingInProgress else { return }
        collectingInProgress = true
        defer { collectingInProgress = false }

        // Clean up already-deallocated objects (ARC handles most)
        allObjects = allObjects.filter { $0.value.value != nil }

        // Mark phase
        for (_, weak) in allObjects {
            (weak.value as? GCManaged)?.gcMarked = false
        }

        // Mark from roots
        for rootId in roots {
            if let weak = allObjects[rootId], let root = weak.value as? GCManaged {
                mark(root)
            }
        }

        // Sweep: Remove unmarked objects from tracking
        // (ARC will deallocate them when refs drop to zero)
        let before = allObjects.count
        allObjects = allObjects.filter { (_, weak) in
            guard let obj = weak.value as? GCManaged else { return false }
            return obj.gcMarked
        }

        let collected = before - allObjects.count
        if collected > 0 {
            print("[GC] Collected \(collected) objects, \(allObjects.count) remaining")
        }
    }

    private func mark(_ object: GCManaged) {
        guard !object.gcMarked else { return }
        object.gcMarked = true

        for ref in object.getReferences() {
            mark(ref)
        }
    }

    func setEnabled(_ enabled: Bool) {
        self.enabled = enabled
    }
}

// Make JSObject conform to GCManaged
extension JSObject: GCManaged {
    var gcTypeName: String { "Object" }

    func getReferences() -> [GCManaged] {
        var refs: [GCManaged] = []
        if let proto = prototype {
            refs.append(proto)
        }
        for (_, descriptor) in properties {
            if case .object(let obj) = descriptor.value {
                refs.append(obj)
            }
        }
        return refs
    }
}
```

### GC Integration Points

```swift
class Interpreter {
    private let gc = MarkSweepGC()

    // Register objects when created
    func createObject() -> JSObject {
        let obj = JSObject()
        gc.register(obj)
        return obj
    }

    // Add roots for global environment
    func setupGlobalEnvironment() {
        gc.addRoot(globalObject)
    }

    // Disable GC during exception handling
    func evaluateTry(_ stmt: TryStatement) throws -> Value {
        gc.setEnabled(false)
        defer { gc.setEnabled(true) }
        // ... evaluation
    }
}
```

---

## Migration Order & Dependencies

### Phase 1: Foundation (No Dependencies)
1. **Token/TokenType** - Simple enums, no dependencies
2. **SourceLocation** - Simple struct
3. **Value enum** - Core type system
4. **Error types** - RuntimeError, ParseError, etc.

### Phase 2: Lexer (Depends on Phase 1)
5. **Lexer** - Tokenization logic
6. **Lexer tests** - Verify token output

### Phase 3: AST (Depends on Phase 1)
7. **AST node protocols and structs**
8. **AST factory helpers** (optional)

### Phase 4: Parser (Depends on Phase 2, 3)
9. **Parser** - Recursive descent implementation
10. **Parser tests** - Verify AST structure

### Phase 5: Runtime Core (Depends on Phase 1)
11. **JSObject base class**
12. **PropertyDescriptor**
13. **JSFunction**
14. **JSArray**
15. **Environment** - Scope chain
16. **GarbageCollector**

### Phase 6: Interpreter (Depends on All Above)
17. **Expression evaluator**
18. **Statement evaluator**
19. **Main interpreter orchestration
20. **Interpreter tests**

### Phase 7: Built-ins (Depends on Phase 5, 6)
21. **Math object**
22. **Console object**
23. **Array methods** (push, pop, map, filter, etc.)
24. **String methods**
25. **Number methods**
26. **Object methods**
27. **JSON parse/stringify**
28. **Error constructors**
29. **Global functions** (parseInt, parseFloat, etc.)

### Phase 8: Integration
30. **CLI entry point**
31. **REPL** (optional)
32. **Test262 runner adaptation**
33. **Performance benchmarks**

### Dependency Graph

```
Phase 1 (Foundation)
    │
    ├──> Phase 2 (Lexer)
    │         │
    │         └──────────┐
    │                    │
    └──> Phase 3 (AST)   │
              │          │
              └────┬─────┘
                   │
                   v
            Phase 4 (Parser)
                   │
    Phase 5 ───────┤
    (Runtime)      │
         │         │
         └────┬────┘
              │
              v
        Phase 6 (Interpreter)
              │
              v
        Phase 7 (Built-ins)
              │
              v
        Phase 8 (Integration)
```

---

## Interoperability Options

### Option 1: Pure Swift (Recommended)

Rewrite everything in Swift. Best for:
- Long-term maintainability
- Learning/educational purposes
- Apple platform optimization

### Option 2: C Bridging for RE2

If you need RE2's regex safety guarantees:

```swift
// Create a C wrapper for RE2
// re2_wrapper.h
#ifndef RE2_WRAPPER_H
#define RE2_WRAPPER_H

#ifdef __cplusplus
extern "C" {
#endif

typedef struct RE2Pattern RE2Pattern;

RE2Pattern* re2_compile(const char* pattern, int case_insensitive);
int re2_match(RE2Pattern* re, const char* text);
void re2_free(RE2Pattern* re);

#ifdef __cplusplus
}
#endif

#endif
```

```swift
// In Package.swift, add:
.systemLibrary(name: "CRE2", pkgConfig: "re2")

// Then in Swift:
import CRE2

class RegExp {
    private var pattern: OpaquePointer?

    init(pattern: String, flags: String) {
        let caseInsensitive = flags.contains("i") ? 1 : 0
        self.pattern = re2_compile(pattern, Int32(caseInsensitive))
    }

    func test(_ string: String) -> Bool {
        guard let pattern = pattern else { return false }
        return re2_match(pattern, string) != 0
    }

    deinit {
        if let pattern = pattern {
            re2_free(pattern)
        }
    }
}
```

### Option 3: Swift Regex (Swift 5.7+)

Use Swift's native Regex for simpler cases:

```swift
import RegexBuilder

class RegExp {
    private let regex: Regex<Substring>

    init(pattern: String, flags: String) throws {
        var options: Regex<Substring>.RegexOptions = []
        if flags.contains("i") {
            options.insert(.caseInsensitive)
        }
        self.regex = try Regex(pattern).options(options)
    }

    func test(_ string: String) -> Bool {
        string.contains(regex)
    }
}
```

**Note**: Swift Regex doesn't have RE2's ReDoS protection. Consider limiting pattern complexity or adding timeout.

---

## Platform Considerations

### macOS / iOS (Primary)
- Full Swift support
- Best tooling (Xcode, Instruments)
- All features available

### Linux
- Swift 5.9+ required for latest features
- No Xcode; use VS Code + Swift extension
- Foundation differences (check `#if os(Linux)`)
- Install: `apt install swift` or use official tarball

```swift
// Platform-specific code example
#if os(Linux)
import Glibc
#else
import Darwin
#endif

func currentTimeMillis() -> UInt64 {
    #if os(Linux)
    var ts = timespec()
    clock_gettime(CLOCK_MONOTONIC, &ts)
    return UInt64(ts.tv_sec) * 1000 + UInt64(ts.tv_nsec) / 1_000_000
    #else
    return UInt64(mach_absolute_time() / 1_000_000)
    #endif
}
```

### Windows
- Swift 5.9+ has Windows support
- Toolchain available from swift.org
- Some Foundation limitations

### Cross-Platform CI

```yaml
# .github/workflows/ci.yml
jobs:
  build:
    strategy:
      matrix:
        os: [macos-14, ubuntu-latest, windows-latest]
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: swift-actions/setup-swift@v1
        with:
          swift-version: "5.9"
      - run: swift build
      - run: swift test
```

---

## Performance Notes

### Swift vs C++ Performance

Swift can achieve near-C++ performance with careful design:

1. **Use value types where appropriate** - Structs are stack-allocated
2. **Avoid unnecessary allocations** - Reuse buffers
3. **Use `@inlinable`** - For hot paths in libraries
4. **Profile with Instruments** - Identify bottlenecks

### Hot Path Optimizations

```swift
// Use @inlinable for critical paths
@inlinable
func evaluateExpression(_ expr: any Expression) throws -> Value {
    // ...
}

// Avoid ARC overhead in tight loops
func evaluateStatements(_ statements: [any Statement]) throws -> Value {
    var result: Value = .undefined
    for statement in statements {
        result = try evaluate(statement)
    }
    return result
}

// Use ContiguousArray for better cache locality
var elements: ContiguousArray<Value> = []
```

### Benchmarking

```swift
// Tests/RiftBenchmarks/Benchmarks.swift
import XCTest
@testable import RiftCore

final class BenchmarkTests: XCTestCase {
    func testFibonacciBenchmark() {
        let engine = Rift()
        let code = """
            function fib(n) {
                if (n <= 1) return n;
                return fib(n - 1) + fib(n - 2);
            }
            fib(30);
        """

        measure {
            _ = try? engine.execute(code)
        }
    }

    func testArrayOperationsBenchmark() {
        let engine = Rift()
        let code = """
            var arr = [];
            for (var i = 0; i < 10000; i++) {
                arr.push(i);
            }
            arr.map(function(x) { return x * 2; });
        """

        measure {
            _ = try? engine.execute(code)
        }
    }
}
```

---

## Summary Checklist

### Pre-Migration
- [ ] Set up Swift development environment
- [ ] Create new Swift package structure
- [ ] Configure SwiftLint and swift-format
- [ ] Set up CI/CD for Swift

### Phase 1-4: Frontend
- [ ] Implement Token types
- [ ] Implement Lexer
- [ ] Implement AST nodes
- [ ] Implement Parser
- [ ] Port lexer tests
- [ ] Port parser tests

### Phase 5-6: Runtime
- [ ] Implement Value enum
- [ ] Implement JSObject class
- [ ] Implement JSFunction class
- [ ] Implement JSArray class
- [ ] Implement Environment (scope chain)
- [ ] Implement GarbageCollector
- [ ] Implement Interpreter core
- [ ] Port runtime tests

### Phase 7: Built-ins
- [ ] Implement console
- [ ] Implement Math
- [ ] Implement Array methods
- [ ] Implement String methods
- [ ] Implement Number methods
- [ ] Implement Object methods
- [ ] Implement JSON
- [ ] Implement Error types
- [ ] Implement global functions
- [ ] Port built-in tests

### Phase 8: Integration
- [ ] Implement CLI with ArgumentParser
- [ ] Implement REPL (optional)
- [ ] Adapt Test262 runner for Swift
- [ ] Run Test262 suite
- [ ] Performance benchmarking
- [ ] Documentation

### Post-Migration
- [ ] Remove C++ code
- [ ] Update README
- [ ] Update CI/CD
- [ ] Release new version

---

## Additional Resources

- [Swift Language Guide](https://docs.swift.org/swift-book/)
- [Swift Package Manager](https://swift.org/package-manager/)
- [SwiftLint Rules](https://realm.github.io/SwiftLint/rule-directory.html)
- [Swift Argument Parser](https://github.com/apple/swift-argument-parser)
- [Test262 Test Suite](https://github.com/tc39/test262)
- [ECMAScript Specification](https://tc39.es/ecma262/)

---

*Generated for Rift JavaScript Engine migration from C++ to Swift*
