import XCTest
@testable import RiftCore

final class InterpreterTests: XCTestCase {

    var interpreter: Interpreter!

    override func setUp() {
        super.setUp()
        interpreter = Interpreter()
    }

    override func tearDown() {
        interpreter = nil
        super.tearDown()
    }

    // MARK: - Literals

    func testNumberLiteral() throws {
        XCTAssertEqual(try interpreter.execute("42"), .number(42))
        XCTAssertEqual(try interpreter.execute("3.14"), .number(3.14))
        XCTAssertEqual(try interpreter.execute("-5"), .number(-5))
    }

    func testStringLiteral() throws {
        XCTAssertEqual(try interpreter.execute("\"hello\""), .string("hello"))
        XCTAssertEqual(try interpreter.execute("'world'"), .string("world"))
    }

    func testBooleanLiteral() throws {
        XCTAssertEqual(try interpreter.execute("true"), .boolean(true))
        XCTAssertEqual(try interpreter.execute("false"), .boolean(false))
    }

    func testNullUndefined() throws {
        XCTAssertEqual(try interpreter.execute("null"), .null)
        XCTAssertEqual(try interpreter.execute("undefined"), .undefined)
    }

    // MARK: - Arithmetic

    func testAddition() throws {
        XCTAssertEqual(try interpreter.execute("1 + 2"), .number(3))
        XCTAssertEqual(try interpreter.execute("10 + 20 + 30"), .number(60))
    }

    func testSubtraction() throws {
        XCTAssertEqual(try interpreter.execute("5 - 3"), .number(2))
        XCTAssertEqual(try interpreter.execute("10 - 20"), .number(-10))
    }

    func testMultiplication() throws {
        XCTAssertEqual(try interpreter.execute("3 * 4"), .number(12))
        XCTAssertEqual(try interpreter.execute("2 * 3 * 4"), .number(24))
    }

    func testDivision() throws {
        XCTAssertEqual(try interpreter.execute("10 / 2"), .number(5))
        XCTAssertEqual(try interpreter.execute("7 / 2"), .number(3.5))
    }

    func testModulo() throws {
        XCTAssertEqual(try interpreter.execute("10 % 3"), .number(1))
        XCTAssertEqual(try interpreter.execute("7 % 2"), .number(1))
    }

    func testExponentiation() throws {
        XCTAssertEqual(try interpreter.execute("2 ** 3"), .number(8))
        XCTAssertEqual(try interpreter.execute("3 ** 2"), .number(9))
    }

    func testStringConcatenation() throws {
        XCTAssertEqual(try interpreter.execute("\"hello\" + \" \" + \"world\""), .string("hello world"))
        XCTAssertEqual(try interpreter.execute("\"x\" + 1"), .string("x1"))
        XCTAssertEqual(try interpreter.execute("1 + \"x\""), .string("1x"))
    }

    // MARK: - Comparison

    func testEquality() throws {
        XCTAssertEqual(try interpreter.execute("1 == 1"), .boolean(true))
        XCTAssertEqual(try interpreter.execute("1 == 2"), .boolean(false))
        XCTAssertEqual(try interpreter.execute("1 == \"1\""), .boolean(true))  // Loose equality
        XCTAssertEqual(try interpreter.execute("1 === \"1\""), .boolean(false))  // Strict equality
    }

    func testInequality() throws {
        XCTAssertEqual(try interpreter.execute("1 != 2"), .boolean(true))
        XCTAssertEqual(try interpreter.execute("1 !== \"1\""), .boolean(true))
    }

    func testComparison() throws {
        XCTAssertEqual(try interpreter.execute("1 < 2"), .boolean(true))
        XCTAssertEqual(try interpreter.execute("2 < 1"), .boolean(false))
        XCTAssertEqual(try interpreter.execute("1 <= 1"), .boolean(true))
        XCTAssertEqual(try interpreter.execute("2 > 1"), .boolean(true))
        XCTAssertEqual(try interpreter.execute("1 >= 1"), .boolean(true))
    }

    // MARK: - Logical Operators

    func testLogicalAnd() throws {
        XCTAssertEqual(try interpreter.execute("true && true"), .boolean(true))
        XCTAssertEqual(try interpreter.execute("true && false"), .boolean(false))
        XCTAssertEqual(try interpreter.execute("1 && 2"), .number(2))  // Returns right operand
        XCTAssertEqual(try interpreter.execute("0 && 2"), .number(0))  // Short-circuit
    }

    func testLogicalOr() throws {
        XCTAssertEqual(try interpreter.execute("true || false"), .boolean(true))
        XCTAssertEqual(try interpreter.execute("false || false"), .boolean(false))
        XCTAssertEqual(try interpreter.execute("1 || 2"), .number(1))  // Returns left operand
        XCTAssertEqual(try interpreter.execute("0 || 2"), .number(2))  // Returns right operand
    }

    func testLogicalNot() throws {
        XCTAssertEqual(try interpreter.execute("!true"), .boolean(false))
        XCTAssertEqual(try interpreter.execute("!false"), .boolean(true))
        XCTAssertEqual(try interpreter.execute("!0"), .boolean(true))
        XCTAssertEqual(try interpreter.execute("!1"), .boolean(false))
    }

    func testNullishCoalescing() throws {
        XCTAssertEqual(try interpreter.execute("null ?? 42"), .number(42))
        XCTAssertEqual(try interpreter.execute("undefined ?? 42"), .number(42))
        XCTAssertEqual(try interpreter.execute("0 ?? 42"), .number(0))  // 0 is not nullish
    }

    // MARK: - Variables

    func testVarDeclaration() throws {
        XCTAssertEqual(try interpreter.execute("var x = 10; x"), .number(10))
        XCTAssertEqual(try interpreter.execute("var x = 1; var y = 2; x + y"), .number(3))
    }

    func testLetDeclaration() throws {
        XCTAssertEqual(try interpreter.execute("let x = 10; x"), .number(10))
    }

    func testConstDeclaration() throws {
        XCTAssertEqual(try interpreter.execute("const x = 10; x"), .number(10))
    }

    func testAssignment() throws {
        XCTAssertEqual(try interpreter.execute("var x = 1; x = 5; x"), .number(5))
        XCTAssertEqual(try interpreter.execute("var x = 10; x += 5; x"), .number(15))
        XCTAssertEqual(try interpreter.execute("var x = 10; x -= 3; x"), .number(7))
        XCTAssertEqual(try interpreter.execute("var x = 4; x *= 2; x"), .number(8))
    }

    func testUpdateOperators() throws {
        XCTAssertEqual(try interpreter.execute("var x = 5; ++x"), .number(6))
        XCTAssertEqual(try interpreter.execute("var x = 5; x++"), .number(5))  // Returns old value
        XCTAssertEqual(try interpreter.execute("var x = 5; x++; x"), .number(6))  // Then increments
        XCTAssertEqual(try interpreter.execute("var x = 5; --x"), .number(4))
    }

    // MARK: - Control Flow

    func testIfStatement() throws {
        XCTAssertEqual(try interpreter.execute("var x = 0; if (true) { x = 1; } x"), .number(1))
        XCTAssertEqual(try interpreter.execute("var x = 0; if (false) { x = 1; } x"), .number(0))
        XCTAssertEqual(try interpreter.execute("var x = 0; if (false) { x = 1; } else { x = 2; } x"), .number(2))
    }

    func testTernary() throws {
        XCTAssertEqual(try interpreter.execute("true ? 1 : 2"), .number(1))
        XCTAssertEqual(try interpreter.execute("false ? 1 : 2"), .number(2))
    }

    func testWhileLoop() throws {
        XCTAssertEqual(try interpreter.execute("var x = 0; while (x < 5) { x = x + 1; } x"), .number(5))
    }

    func testForLoop() throws {
        XCTAssertEqual(try interpreter.execute("var sum = 0; for (var i = 1; i <= 5; i++) { sum = sum + i; } sum"), .number(15))
    }

    func testBreak() throws {
        XCTAssertEqual(try interpreter.execute("var x = 0; while (true) { x = x + 1; if (x >= 3) break; } x"), .number(3))
    }

    func testContinue() throws {
        XCTAssertEqual(try interpreter.execute("""
            var sum = 0;
            for (var i = 1; i <= 5; i++) {
                if (i === 3) continue;
                sum = sum + i;
            }
            sum
        """), .number(12))  // 1+2+4+5 = 12 (skipping 3)
    }

    // MARK: - Functions

    func testFunctionDeclaration() throws {
        XCTAssertEqual(try interpreter.execute("""
            function add(a, b) {
                return a + b;
            }
            add(2, 3)
        """), .number(5))
    }

    func testFunctionExpression() throws {
        XCTAssertEqual(try interpreter.execute("""
            var multiply = function(a, b) {
                return a * b;
            };
            multiply(3, 4)
        """), .number(12))
    }

    func testArrowFunction() throws {
        XCTAssertEqual(try interpreter.execute("""
            var double = (x) => x * 2;
            double(5)
        """), .number(10))
    }

    func testClosures() throws {
        XCTAssertEqual(try interpreter.execute("""
            function makeCounter() {
                var count = 0;
                return function() {
                    count = count + 1;
                    return count;
                };
            }
            var counter = makeCounter();
            counter();
            counter();
            counter()
        """), .number(3))
    }

    func testRecursion() throws {
        XCTAssertEqual(try interpreter.execute("""
            function factorial(n) {
                if (n <= 1) return 1;
                return n * factorial(n - 1);
            }
            factorial(5)
        """), .number(120))
    }

    func testDefaultParameters() throws {
        XCTAssertEqual(try interpreter.execute("""
            function greet(name, greeting = "Hello") {
                return greeting + " " + name;
            }
            greet("World")
        """), .string("Hello World"))
    }

    // MARK: - Arrays

    func testArrayLiteral() throws {
        let result = try interpreter.execute("[1, 2, 3]")
        guard case .object(let obj) = result, let array = obj as? JSArray else {
            XCTFail("Expected array")
            return
        }
        XCTAssertEqual(array.length, 3)
        XCTAssertEqual(array[0], .number(1))
        XCTAssertEqual(array[1], .number(2))
        XCTAssertEqual(array[2], .number(3))
    }

    func testArrayAccess() throws {
        XCTAssertEqual(try interpreter.execute("var arr = [10, 20, 30]; arr[1]"), .number(20))
        XCTAssertEqual(try interpreter.execute("var arr = [10, 20, 30]; arr.length"), .number(3))
    }

    func testArrayAssignment() throws {
        XCTAssertEqual(try interpreter.execute("var arr = [1, 2, 3]; arr[1] = 99; arr[1]"), .number(99))
    }

    // MARK: - Objects

    func testObjectLiteral() throws {
        XCTAssertEqual(try interpreter.execute("var obj = { x: 10 }; obj.x"), .number(10))
        XCTAssertEqual(try interpreter.execute("var obj = { x: 1, y: 2 }; obj.x + obj.y"), .number(3))
    }

    func testObjectPropertyAccess() throws {
        XCTAssertEqual(try interpreter.execute("var obj = { name: \"test\" }; obj.name"), .string("test"))
        XCTAssertEqual(try interpreter.execute("var obj = { name: \"test\" }; obj[\"name\"]"), .string("test"))
    }

    func testObjectPropertyAssignment() throws {
        XCTAssertEqual(try interpreter.execute("var obj = {}; obj.x = 42; obj.x"), .number(42))
    }

    // MARK: - typeof

    func testTypeof() throws {
        XCTAssertEqual(try interpreter.execute("typeof 42"), .string("number"))
        XCTAssertEqual(try interpreter.execute("typeof \"hello\""), .string("string"))
        XCTAssertEqual(try interpreter.execute("typeof true"), .string("boolean"))
        XCTAssertEqual(try interpreter.execute("typeof undefined"), .string("undefined"))
        XCTAssertEqual(try interpreter.execute("typeof null"), .string("object"))
        XCTAssertEqual(try interpreter.execute("typeof {}"), .string("object"))
        XCTAssertEqual(try interpreter.execute("typeof function(){}"), .string("function"))
    }

    // MARK: - Switch

    func testSwitch() throws {
        XCTAssertEqual(try interpreter.execute("""
            var x = 2;
            var result;
            switch (x) {
                case 1:
                    result = "one";
                    break;
                case 2:
                    result = "two";
                    break;
                default:
                    result = "other";
            }
            result
        """), .string("two"))
    }

    // MARK: - Try/Catch

    func testTryCatch() throws {
        XCTAssertEqual(try interpreter.execute("""
            var result;
            try {
                throw "error";
            } catch (e) {
                result = e;
            }
            result
        """), .string("error"))
    }

    func testTryFinally() throws {
        XCTAssertEqual(try interpreter.execute("""
            var x = 0;
            try {
                x = 1;
            } finally {
                x = x + 10;
            }
            x
        """), .number(11))
    }

    // MARK: - Global Functions

    func testIsNaN() throws {
        XCTAssertEqual(try interpreter.execute("isNaN(NaN)"), .boolean(true))
        XCTAssertEqual(try interpreter.execute("isNaN(42)"), .boolean(false))
        XCTAssertEqual(try interpreter.execute("isNaN(\"hello\")"), .boolean(true))
    }

    func testIsFinite() throws {
        XCTAssertEqual(try interpreter.execute("isFinite(42)"), .boolean(true))
        XCTAssertEqual(try interpreter.execute("isFinite(Infinity)"), .boolean(false))
    }

    func testParseInt() throws {
        XCTAssertEqual(try interpreter.execute("parseInt(\"42\")"), .number(42))
        XCTAssertEqual(try interpreter.execute("parseInt(\"   42  \")"), .number(42))
        XCTAssertEqual(try interpreter.execute("parseInt(\"ff\", 16)"), .number(255))
    }

    func testParseFloat() throws {
        XCTAssertEqual(try interpreter.execute("parseFloat(\"3.14\")"), .number(3.14))
        XCTAssertEqual(try interpreter.execute("parseFloat(\"  3.14  \")"), .number(3.14))
    }

    // MARK: - Math Object

    func testMathConstants() throws {
        XCTAssertEqual(try interpreter.execute("Math.PI"), .number(Double.pi))
        XCTAssertEqual(try interpreter.execute("Math.E"), .number(2.718281828459045))
        XCTAssertEqual(try interpreter.execute("Math.LN2"), .number(0.6931471805599453))
        XCTAssertEqual(try interpreter.execute("Math.LN10"), .number(2.302585092994046))
        XCTAssertEqual(try interpreter.execute("Math.SQRT2"), .number(1.4142135623730951))
    }

    func testMathAbs() throws {
        XCTAssertEqual(try interpreter.execute("Math.abs(-5)"), .number(5))
        XCTAssertEqual(try interpreter.execute("Math.abs(5)"), .number(5))
        XCTAssertEqual(try interpreter.execute("Math.abs(0)"), .number(0))
    }

    func testMathFloorCeil() throws {
        XCTAssertEqual(try interpreter.execute("Math.floor(3.7)"), .number(3))
        XCTAssertEqual(try interpreter.execute("Math.floor(-3.7)"), .number(-4))
        XCTAssertEqual(try interpreter.execute("Math.ceil(3.2)"), .number(4))
        XCTAssertEqual(try interpreter.execute("Math.ceil(-3.2)"), .number(-3))
    }

    func testMathRound() throws {
        XCTAssertEqual(try interpreter.execute("Math.round(3.5)"), .number(4))
        XCTAssertEqual(try interpreter.execute("Math.round(3.4)"), .number(3))
        XCTAssertEqual(try interpreter.execute("Math.round(-3.5)"), .number(-3))
    }

    func testMathTrunc() throws {
        XCTAssertEqual(try interpreter.execute("Math.trunc(3.7)"), .number(3))
        XCTAssertEqual(try interpreter.execute("Math.trunc(-3.7)"), .number(-3))
    }

    func testMathSqrt() throws {
        XCTAssertEqual(try interpreter.execute("Math.sqrt(4)"), .number(2))
        XCTAssertEqual(try interpreter.execute("Math.sqrt(9)"), .number(3))
        XCTAssertEqual(try interpreter.execute("Math.sqrt(2)"), .number(1.4142135623730951))
    }

    func testMathPow() throws {
        XCTAssertEqual(try interpreter.execute("Math.pow(2, 3)"), .number(8))
        XCTAssertEqual(try interpreter.execute("Math.pow(3, 2)"), .number(9))
        XCTAssertEqual(try interpreter.execute("Math.pow(2, 0)"), .number(1))
    }

    func testMathMinMax() throws {
        XCTAssertEqual(try interpreter.execute("Math.min(1, 2, 3)"), .number(1))
        XCTAssertEqual(try interpreter.execute("Math.max(1, 2, 3)"), .number(3))
        XCTAssertEqual(try interpreter.execute("Math.min(-1, -5, 0)"), .number(-5))
        XCTAssertEqual(try interpreter.execute("Math.max(-1, -5, 0)"), .number(0))
    }

    func testMathSign() throws {
        XCTAssertEqual(try interpreter.execute("Math.sign(5)"), .number(1))
        XCTAssertEqual(try interpreter.execute("Math.sign(-5)"), .number(-1))
        XCTAssertEqual(try interpreter.execute("Math.sign(0)"), .number(0))
    }

    func testMathTrigonometry() throws {
        XCTAssertEqual(try interpreter.execute("Math.sin(0)"), .number(0))
        XCTAssertEqual(try interpreter.execute("Math.cos(0)"), .number(1))
        XCTAssertEqual(try interpreter.execute("Math.tan(0)"), .number(0))
    }

    func testMathLog() throws {
        XCTAssertEqual(try interpreter.execute("Math.log(1)"), .number(0))
        XCTAssertEqual(try interpreter.execute("Math.log10(100)"), .number(2))
        XCTAssertEqual(try interpreter.execute("Math.log2(8)"), .number(3))
    }

    func testMathRandom() throws {
        // Random should return a value between 0 and 1
        let result = try interpreter.execute("Math.random()")
        guard case .number(let n) = result else {
            XCTFail("Expected number")
            return
        }
        XCTAssertTrue(n >= 0 && n < 1, "Math.random() should return value in [0, 1)")
    }

    func testMathHypot() throws {
        XCTAssertEqual(try interpreter.execute("Math.hypot(3, 4)"), .number(5))
        XCTAssertEqual(try interpreter.execute("Math.hypot(5, 12)"), .number(13))
    }
}
