import XCTest
@testable import RiftCore

final class ParserTests: XCTestCase {

    // MARK: - Helpers

    func parse(_ source: String) throws -> Program {
        var lexer = Lexer(source: source)
        let tokens = try lexer.tokenize()
        var parser = Parser(tokens: tokens)
        return try parser.parse()
    }

    // MARK: - Literals

    func testNumberLiteral() throws {
        let program = try parse("42;")
        XCTAssertEqual(program.body.count, 1)

        let stmt = program.body[0] as! ExpressionStatement
        let literal = stmt.expression as! LiteralExpression
        XCTAssertEqual(literal.value, .number(42))
    }

    func testStringLiteral() throws {
        let program = try parse("\"hello\";")
        let stmt = program.body[0] as! ExpressionStatement
        let literal = stmt.expression as! LiteralExpression
        XCTAssertEqual(literal.value, .string("hello"))
    }

    func testBooleanLiterals() throws {
        let program = try parse("true; false;")
        XCTAssertEqual(program.body.count, 2)

        let stmt1 = program.body[0] as! ExpressionStatement
        let literal1 = stmt1.expression as! LiteralExpression
        XCTAssertEqual(literal1.value, .boolean(true))

        let stmt2 = program.body[1] as! ExpressionStatement
        let literal2 = stmt2.expression as! LiteralExpression
        XCTAssertEqual(literal2.value, .boolean(false))
    }

    func testNullUndefined() throws {
        let program = try parse("null; undefined;")
        XCTAssertEqual(program.body.count, 2)

        let stmt1 = program.body[0] as! ExpressionStatement
        let literal1 = stmt1.expression as! LiteralExpression
        XCTAssertEqual(literal1.value, .null)

        let stmt2 = program.body[1] as! ExpressionStatement
        let literal2 = stmt2.expression as! LiteralExpression
        XCTAssertEqual(literal2.value, .undefined)
    }

    // MARK: - Identifiers

    func testIdentifier() throws {
        let program = try parse("foo;")
        let stmt = program.body[0] as! ExpressionStatement
        let id = stmt.expression as! IdentifierExpression
        XCTAssertEqual(id.name, "foo")
    }

    func testThis() throws {
        let program = try parse("this;")
        let stmt = program.body[0] as! ExpressionStatement
        XCTAssertTrue(stmt.expression is ThisExpression)
    }

    // MARK: - Binary Expressions

    func testAddition() throws {
        let program = try parse("1 + 2;")
        let stmt = program.body[0] as! ExpressionStatement
        let binary = stmt.expression as! BinaryExpression

        XCTAssertEqual(binary.operator, .add)
        XCTAssertEqual((binary.left as! LiteralExpression).value, .number(1))
        XCTAssertEqual((binary.right as! LiteralExpression).value, .number(2))
    }

    func testOperatorPrecedence() throws {
        // 1 + 2 * 3 should parse as 1 + (2 * 3)
        let program = try parse("1 + 2 * 3;")
        let stmt = program.body[0] as! ExpressionStatement
        let binary = stmt.expression as! BinaryExpression

        XCTAssertEqual(binary.operator, .add)
        XCTAssertEqual((binary.left as! LiteralExpression).value, .number(1))

        let right = binary.right as! BinaryExpression
        XCTAssertEqual(right.operator, .multiply)
    }

    func testParenthesesOverridePrecedence() throws {
        // (1 + 2) * 3
        let program = try parse("(1 + 2) * 3;")
        let stmt = program.body[0] as! ExpressionStatement
        let binary = stmt.expression as! BinaryExpression

        XCTAssertEqual(binary.operator, .multiply)
        let left = binary.left as! BinaryExpression
        XCTAssertEqual(left.operator, .add)
    }

    func testComparisonOperators() throws {
        let program = try parse("a < b; a <= b; a > b; a >= b;")
        XCTAssertEqual(program.body.count, 4)

        let ops: [BinaryExpression.BinaryOperator] = [.lessThan, .lessThanOrEqual, .greaterThan, .greaterThanOrEqual]
        for (i, expectedOp) in ops.enumerated() {
            let stmt = program.body[i] as! ExpressionStatement
            let binary = stmt.expression as! BinaryExpression
            XCTAssertEqual(binary.operator, expectedOp)
        }
    }

    func testEqualityOperators() throws {
        let program = try parse("a == b; a === b; a != b; a !== b;")
        XCTAssertEqual(program.body.count, 4)

        let ops: [BinaryExpression.BinaryOperator] = [.equal, .strictEqual, .notEqual, .strictNotEqual]
        for (i, expectedOp) in ops.enumerated() {
            let stmt = program.body[i] as! ExpressionStatement
            let binary = stmt.expression as! BinaryExpression
            XCTAssertEqual(binary.operator, expectedOp)
        }
    }

    func testLogicalOperators() throws {
        let program = try parse("a && b; a || b; a ?? b;")
        XCTAssertEqual(program.body.count, 3)

        let ops: [BinaryExpression.BinaryOperator] = [.and, .or, .nullishCoalescing]
        for (i, expectedOp) in ops.enumerated() {
            let stmt = program.body[i] as! ExpressionStatement
            let binary = stmt.expression as! BinaryExpression
            XCTAssertEqual(binary.operator, expectedOp)
        }
    }

    // MARK: - Unary Expressions

    func testUnaryOperators() throws {
        let program = try parse("!a; -b; +c; ~d; typeof e;")
        XCTAssertEqual(program.body.count, 5)

        let ops: [UnaryExpression.UnaryOperator] = [.not, .negative, .positive, .bitwiseNot, .typeof]
        for (i, expectedOp) in ops.enumerated() {
            let stmt = program.body[i] as! ExpressionStatement
            let unary = stmt.expression as! UnaryExpression
            XCTAssertEqual(unary.operator, expectedOp)
            XCTAssertTrue(unary.prefix)
        }
    }

    func testPrefixIncrement() throws {
        let program = try parse("++x;")
        let stmt = program.body[0] as! ExpressionStatement
        let update = stmt.expression as! UpdateExpression
        XCTAssertEqual(update.operator, .increment)
        XCTAssertTrue(update.prefix)
    }

    func testPostfixIncrement() throws {
        let program = try parse("x++;")
        let stmt = program.body[0] as! ExpressionStatement
        let update = stmt.expression as! UpdateExpression
        XCTAssertEqual(update.operator, .increment)
        XCTAssertFalse(update.prefix)
    }

    // MARK: - Assignment

    func testSimpleAssignment() throws {
        let program = try parse("x = 42;")
        let stmt = program.body[0] as! ExpressionStatement
        let assign = stmt.expression as! AssignmentExpression

        XCTAssertEqual(assign.operator, .assign)
        XCTAssertEqual((assign.left as! IdentifierExpression).name, "x")
        XCTAssertEqual((assign.right as! LiteralExpression).value, .number(42))
    }

    func testCompoundAssignment() throws {
        let program = try parse("x += 1; x -= 1; x *= 2; x /= 2;")
        XCTAssertEqual(program.body.count, 4)

        let ops: [AssignmentExpression.AssignmentOperator] = [.addAssign, .subtractAssign, .multiplyAssign, .divideAssign]
        for (i, expectedOp) in ops.enumerated() {
            let stmt = program.body[i] as! ExpressionStatement
            let assign = stmt.expression as! AssignmentExpression
            XCTAssertEqual(assign.operator, expectedOp)
        }
    }

    // MARK: - Conditional Expression

    func testTernaryOperator() throws {
        let program = try parse("a ? b : c;")
        let stmt = program.body[0] as! ExpressionStatement
        let cond = stmt.expression as! ConditionalExpression

        XCTAssertEqual((cond.test as! IdentifierExpression).name, "a")
        XCTAssertEqual((cond.consequent as! IdentifierExpression).name, "b")
        XCTAssertEqual((cond.alternate as! IdentifierExpression).name, "c")
    }

    // MARK: - Member Expressions

    func testDotAccess() throws {
        let program = try parse("obj.prop;")
        let stmt = program.body[0] as! ExpressionStatement
        let member = stmt.expression as! MemberExpression

        XCTAssertFalse(member.computed)
        XCTAssertEqual((member.object as! IdentifierExpression).name, "obj")
        XCTAssertEqual((member.property as! IdentifierExpression).name, "prop")
    }

    func testBracketAccess() throws {
        let program = try parse("obj[0];")
        let stmt = program.body[0] as! ExpressionStatement
        let member = stmt.expression as! MemberExpression

        XCTAssertTrue(member.computed)
        XCTAssertEqual((member.object as! IdentifierExpression).name, "obj")
        XCTAssertEqual((member.property as! LiteralExpression).value, .number(0))
    }

    func testChainedAccess() throws {
        let program = try parse("a.b.c;")
        let stmt = program.body[0] as! ExpressionStatement
        let member = stmt.expression as! MemberExpression

        XCTAssertEqual((member.property as! IdentifierExpression).name, "c")
        let inner = member.object as! MemberExpression
        XCTAssertEqual((inner.property as! IdentifierExpression).name, "b")
        XCTAssertEqual((inner.object as! IdentifierExpression).name, "a")
    }

    func testOptionalChaining() throws {
        let program = try parse("obj?.prop;")
        let stmt = program.body[0] as! ExpressionStatement
        let member = stmt.expression as! MemberExpression

        XCTAssertTrue(member.optional)
        XCTAssertFalse(member.computed)
    }

    // MARK: - Call Expressions

    func testFunctionCall() throws {
        let program = try parse("foo();")
        let stmt = program.body[0] as! ExpressionStatement
        let call = stmt.expression as! CallExpression

        XCTAssertEqual((call.callee as! IdentifierExpression).name, "foo")
        XCTAssertEqual(call.arguments.count, 0)
    }

    func testFunctionCallWithArgs() throws {
        let program = try parse("foo(1, 2, 3);")
        let stmt = program.body[0] as! ExpressionStatement
        let call = stmt.expression as! CallExpression

        XCTAssertEqual(call.arguments.count, 3)
    }

    func testMethodCall() throws {
        let program = try parse("obj.method(arg);")
        let stmt = program.body[0] as! ExpressionStatement
        let call = stmt.expression as! CallExpression

        let callee = call.callee as! MemberExpression
        XCTAssertEqual((callee.object as! IdentifierExpression).name, "obj")
        XCTAssertEqual((callee.property as! IdentifierExpression).name, "method")
    }

    // MARK: - New Expression

    func testNewExpression() throws {
        let program = try parse("new Foo();")
        let stmt = program.body[0] as! ExpressionStatement
        let newExpr = stmt.expression as! NewExpression

        XCTAssertEqual((newExpr.callee as! IdentifierExpression).name, "Foo")
        XCTAssertEqual(newExpr.arguments.count, 0)
    }

    func testNewWithArgs() throws {
        let program = try parse("new Foo(1, 2);")
        let stmt = program.body[0] as! ExpressionStatement
        let newExpr = stmt.expression as! NewExpression

        XCTAssertEqual(newExpr.arguments.count, 2)
    }

    // MARK: - Array Literals

    func testEmptyArray() throws {
        let program = try parse("[];")
        let stmt = program.body[0] as! ExpressionStatement
        let array = stmt.expression as! ArrayExpression

        XCTAssertEqual(array.elements.count, 0)
    }

    func testArrayWithElements() throws {
        let program = try parse("[1, 2, 3];")
        let stmt = program.body[0] as! ExpressionStatement
        let array = stmt.expression as! ArrayExpression

        XCTAssertEqual(array.elements.count, 3)
    }

    func testSpreadInArray() throws {
        let program = try parse("[...arr];")
        let stmt = program.body[0] as! ExpressionStatement
        let array = stmt.expression as! ArrayExpression

        XCTAssertEqual(array.elements.count, 1)
        if case .spread(let expr) = array.elements[0] {
            XCTAssertEqual((expr as! IdentifierExpression).name, "arr")
        } else {
            XCTFail("Expected spread element")
        }
    }

    // MARK: - Object Literals

    func testEmptyObject() throws {
        let program = try parse("{};")
        let stmt = program.body[0] as! ExpressionStatement
        let obj = stmt.expression as! ObjectExpression

        XCTAssertEqual(obj.properties.count, 0)
    }

    func testObjectWithProperties() throws {
        let program = try parse("({ a: 1, b: 2 });")
        let stmt = program.body[0] as! ExpressionStatement
        let obj = stmt.expression as! ObjectExpression

        XCTAssertEqual(obj.properties.count, 2)
    }

    func testShorthandProperty() throws {
        let program = try parse("({ x });")
        let stmt = program.body[0] as! ExpressionStatement
        let obj = stmt.expression as! ObjectExpression

        XCTAssertEqual(obj.properties.count, 1)
        XCTAssertTrue(obj.properties[0].shorthand)
    }

    // MARK: - Variable Declarations

    func testVarDeclaration() throws {
        let program = try parse("var x = 42;")
        let decl = program.body[0] as! VariableDeclaration

        XCTAssertEqual(decl.kind, .var)
        XCTAssertEqual(decl.declarations.count, 1)
        XCTAssertEqual(decl.declarations[0].name, "x")
    }

    func testLetDeclaration() throws {
        let program = try parse("let y = 10;")
        let decl = program.body[0] as! VariableDeclaration

        XCTAssertEqual(decl.kind, .let)
    }

    func testConstDeclaration() throws {
        let program = try parse("const PI = 3.14;")
        let decl = program.body[0] as! VariableDeclaration

        XCTAssertEqual(decl.kind, .const)
    }

    func testMultipleDeclarators() throws {
        let program = try parse("var a = 1, b = 2, c;")
        let decl = program.body[0] as! VariableDeclaration

        XCTAssertEqual(decl.declarations.count, 3)
        XCTAssertNotNil(decl.declarations[0].initializer)
        XCTAssertNotNil(decl.declarations[1].initializer)
        XCTAssertNil(decl.declarations[2].initializer)
    }

    // MARK: - Function Declarations

    func testFunctionDeclaration() throws {
        let program = try parse("function foo(a, b) { return a + b; }")
        let func_ = program.body[0] as! FunctionDeclaration

        XCTAssertEqual(func_.name, "foo")
        XCTAssertEqual(func_.parameters.count, 2)
        XCTAssertEqual(func_.parameters[0].name, "a")
        XCTAssertEqual(func_.parameters[1].name, "b")
    }

    func testFunctionWithDefaultParams() throws {
        let program = try parse("function foo(x = 10) { }")
        let func_ = program.body[0] as! FunctionDeclaration

        XCTAssertNotNil(func_.parameters[0].defaultValue)
    }

    // MARK: - Arrow Functions

    func testArrowFunctionExpression() throws {
        let program = try parse("(a, b) => a + b;")
        let stmt = program.body[0] as! ExpressionStatement
        let arrow = stmt.expression as! FunctionExpression

        XCTAssertTrue(arrow.isArrow)
        XCTAssertEqual(arrow.parameters.count, 2)
        if case .expression = arrow.body {
            // Good - concise body
        } else {
            XCTFail("Expected expression body")
        }
    }

    func testArrowFunctionWithBlock() throws {
        let program = try parse("(x) => { return x * 2; };")
        let stmt = program.body[0] as! ExpressionStatement
        let arrow = stmt.expression as! FunctionExpression

        XCTAssertTrue(arrow.isArrow)
        if case .block = arrow.body {
            // Good - block body
        } else {
            XCTFail("Expected block body")
        }
    }

    // MARK: - If Statement

    func testIfStatement() throws {
        let program = try parse("if (x) { y; }")
        let if_ = program.body[0] as! IfStatement

        XCTAssertEqual((if_.test as! IdentifierExpression).name, "x")
        XCTAssertNil(if_.alternate)
    }

    func testIfElseStatement() throws {
        let program = try parse("if (x) { y; } else { z; }")
        let if_ = program.body[0] as! IfStatement

        XCTAssertNotNil(if_.alternate)
    }

    func testIfElseIfElse() throws {
        let program = try parse("if (a) { } else if (b) { } else { }")
        let if_ = program.body[0] as! IfStatement

        let elseIf = if_.alternate as! IfStatement
        XCTAssertNotNil(elseIf.alternate)
    }

    // MARK: - Loops

    func testWhileLoop() throws {
        let program = try parse("while (x) { y; }")
        let while_ = program.body[0] as! WhileStatement

        XCTAssertEqual((while_.test as! IdentifierExpression).name, "x")
    }

    func testDoWhileLoop() throws {
        let program = try parse("do { x; } while (y);")
        let doWhile = program.body[0] as! DoWhileStatement

        XCTAssertEqual((doWhile.test as! IdentifierExpression).name, "y")
    }

    func testForLoop() throws {
        let program = try parse("for (var i = 0; i < 10; i++) { }")
        let for_ = program.body[0] as! ForStatement

        XCTAssertNotNil(for_.initializer)
        XCTAssertNotNil(for_.test)
        XCTAssertNotNil(for_.update)
    }

    func testForInLoop() throws {
        let program = try parse("for (var x in obj) { }")
        let forIn = program.body[0] as! ForInStatement

        if case .variable(let decl) = forIn.left {
            XCTAssertEqual(decl.declarations[0].name, "x")
        } else {
            XCTFail("Expected variable declaration")
        }
    }

    func testForOfLoop() throws {
        let program = try parse("for (var x of arr) { }")
        let forOf = program.body[0] as! ForOfStatement

        if case .variable(let decl) = forOf.left {
            XCTAssertEqual(decl.declarations[0].name, "x")
        } else {
            XCTFail("Expected variable declaration")
        }
    }

    // MARK: - Switch Statement

    func testSwitchStatement() throws {
        let program = try parse("""
            switch (x) {
                case 1:
                    a;
                    break;
                case 2:
                    b;
                    break;
                default:
                    c;
            }
        """)
        let switch_ = program.body[0] as! SwitchStatement

        XCTAssertEqual(switch_.cases.count, 3)
        XCTAssertNotNil(switch_.cases[0].test)  // case 1
        XCTAssertNotNil(switch_.cases[1].test)  // case 2
        XCTAssertNil(switch_.cases[2].test)     // default
    }

    // MARK: - Control Flow

    func testReturnStatement() throws {
        let program = try parse("return 42;")
        let return_ = program.body[0] as! ReturnStatement

        XCTAssertNotNil(return_.argument)
        XCTAssertEqual((return_.argument as! LiteralExpression).value, .number(42))
    }

    func testReturnVoid() throws {
        let program = try parse("return;")
        let return_ = program.body[0] as! ReturnStatement

        XCTAssertNil(return_.argument)
    }

    func testBreakStatement() throws {
        let program = try parse("break;")
        let break_ = program.body[0] as! BreakStatement

        XCTAssertNil(break_.label)
    }

    func testContinueStatement() throws {
        let program = try parse("continue;")
        let continue_ = program.body[0] as! ContinueStatement

        XCTAssertNil(continue_.label)
    }

    // MARK: - Try-Catch

    func testTryCatch() throws {
        let program = try parse("try { x; } catch (e) { y; }")
        let try_ = program.body[0] as! TryStatement

        XCTAssertNotNil(try_.handler)
        XCTAssertEqual(try_.handler?.parameter, "e")
        XCTAssertNil(try_.finalizer)
    }

    func testTryFinally() throws {
        let program = try parse("try { x; } finally { y; }")
        let try_ = program.body[0] as! TryStatement

        XCTAssertNil(try_.handler)
        XCTAssertNotNil(try_.finalizer)
    }

    func testTryCatchFinally() throws {
        let program = try parse("try { x; } catch (e) { y; } finally { z; }")
        let try_ = program.body[0] as! TryStatement

        XCTAssertNotNil(try_.handler)
        XCTAssertNotNil(try_.finalizer)
    }

    // MARK: - Throw Statement

    func testThrowStatement() throws {
        let program = try parse("throw new Error();")
        let throw_ = program.body[0] as! ThrowStatement

        XCTAssertTrue(throw_.argument is NewExpression)
    }

    // MARK: - Block Statement

    func testBlockStatement() throws {
        let program = try parse("{ x; y; z; }")
        let block = program.body[0] as! BlockStatement

        XCTAssertEqual(block.body.count, 3)
    }

    // MARK: - Empty Statement

    func testEmptyStatement() throws {
        let program = try parse(";;;")
        XCTAssertEqual(program.body.count, 3)
        XCTAssertTrue(program.body[0] is EmptyStatement)
    }

    // MARK: - Complex Expressions

    func testComplexExpression() throws {
        let program = try parse("a.b().c[d].e();")
        let stmt = program.body[0] as! ExpressionStatement
        let call = stmt.expression as! CallExpression

        // The callee is a.b().c[d].e
        let callee = call.callee as! MemberExpression
        XCTAssertEqual((callee.property as! IdentifierExpression).name, "e")
    }
}
