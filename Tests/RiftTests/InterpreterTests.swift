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

    // MARK: - Array.prototype Methods

    func testArrayPushPop() throws {
        XCTAssertEqual(try interpreter.execute("""
            var arr = [1, 2];
            arr.push(3);
            arr.push(4, 5);
            arr.length
        """), .number(5))
        XCTAssertEqual(try interpreter.execute("""
            var arr = [1, 2, 3];
            arr.pop()
        """), .number(3))
        XCTAssertEqual(try interpreter.execute("""
            var arr = [1, 2, 3];
            arr.pop();
            arr.length
        """), .number(2))
    }

    func testArrayShiftUnshift() throws {
        XCTAssertEqual(try interpreter.execute("""
            var arr = [1, 2, 3];
            arr.shift()
        """), .number(1))
        XCTAssertEqual(try interpreter.execute("""
            var arr = [1, 2, 3];
            arr.unshift(0);
            arr[0]
        """), .number(0))
    }

    func testArrayIndexOf() throws {
        XCTAssertEqual(try interpreter.execute("[1, 2, 3, 2].indexOf(2)"), .number(1))
        XCTAssertEqual(try interpreter.execute("[1, 2, 3].indexOf(4)"), .number(-1))
        XCTAssertEqual(try interpreter.execute("[1, 2, 3, 2].lastIndexOf(2)"), .number(3))
    }

    func testArrayIncludes() throws {
        XCTAssertEqual(try interpreter.execute("[1, 2, 3].includes(2)"), .boolean(true))
        XCTAssertEqual(try interpreter.execute("[1, 2, 3].includes(4)"), .boolean(false))
    }

    func testArrayJoin() throws {
        XCTAssertEqual(try interpreter.execute("[1, 2, 3].join('-')"), .string("1-2-3"))
        XCTAssertEqual(try interpreter.execute("[1, 2, 3].join()"), .string("1,2,3"))
    }

    func testArrayReverse() throws {
        XCTAssertEqual(try interpreter.execute("""
            var arr = [1, 2, 3];
            arr.reverse();
            arr[0]
        """), .number(3))
    }

    func testArraySlice() throws {
        XCTAssertEqual(try interpreter.execute("[1, 2, 3, 4, 5].slice(1, 3).length"), .number(2))
        XCTAssertEqual(try interpreter.execute("[1, 2, 3, 4, 5].slice(1, 3)[0]"), .number(2))
    }

    func testArrayConcat() throws {
        XCTAssertEqual(try interpreter.execute("[1, 2].concat([3, 4]).length"), .number(4))
        XCTAssertEqual(try interpreter.execute("[1, 2].concat([3, 4])[2]"), .number(3))
    }

    func testArrayForEach() throws {
        XCTAssertEqual(try interpreter.execute("""
            var sum = 0;
            [1, 2, 3].forEach(function(x) { sum = sum + x; });
            sum
        """), .number(6))
    }

    func testArrayMap() throws {
        XCTAssertEqual(try interpreter.execute("""
            var result = [1, 2, 3].map(function(x) { return x * 2; });
            result[1]
        """), .number(4))
    }

    func testArrayFilter() throws {
        XCTAssertEqual(try interpreter.execute("""
            var result = [1, 2, 3, 4, 5].filter(function(x) { return x > 2; });
            result.length
        """), .number(3))
    }

    func testArrayReduce() throws {
        XCTAssertEqual(try interpreter.execute("""
            [1, 2, 3, 4].reduce(function(acc, x) { return acc + x; }, 0)
        """), .number(10))
        XCTAssertEqual(try interpreter.execute("""
            [1, 2, 3, 4].reduce(function(acc, x) { return acc + x; })
        """), .number(10))
    }

    func testArrayFind() throws {
        XCTAssertEqual(try interpreter.execute("""
            [1, 2, 3, 4].find(function(x) { return x > 2; })
        """), .number(3))
        XCTAssertEqual(try interpreter.execute("""
            [1, 2, 3, 4].findIndex(function(x) { return x > 2; })
        """), .number(2))
    }

    func testArrayEvery() throws {
        XCTAssertEqual(try interpreter.execute("[2, 4, 6].every(function(x) { return x % 2 === 0; })"), .boolean(true))
        XCTAssertEqual(try interpreter.execute("[2, 3, 6].every(function(x) { return x % 2 === 0; })"), .boolean(false))
    }

    func testArraySome() throws {
        XCTAssertEqual(try interpreter.execute("[1, 3, 5].some(function(x) { return x % 2 === 0; })"), .boolean(false))
        XCTAssertEqual(try interpreter.execute("[1, 2, 3].some(function(x) { return x % 2 === 0; })"), .boolean(true))
    }

    func testArrayFill() throws {
        XCTAssertEqual(try interpreter.execute("""
            var arr = [1, 2, 3];
            arr.fill(0);
            arr[1]
        """), .number(0))
    }

    func testArrayAt() throws {
        XCTAssertEqual(try interpreter.execute("[1, 2, 3].at(0)"), .number(1))
        XCTAssertEqual(try interpreter.execute("[1, 2, 3].at(-1)"), .number(3))
    }

    func testArrayFlat() throws {
        XCTAssertEqual(try interpreter.execute("[[1, 2], [3, 4]].flat().length"), .number(4))
        XCTAssertEqual(try interpreter.execute("[[1, 2], [3, 4]].flat()[2]"), .number(3))
    }

    func testArrayIsArray() throws {
        XCTAssertEqual(try interpreter.execute("Array.isArray([1, 2, 3])"), .boolean(true))
        XCTAssertEqual(try interpreter.execute("Array.isArray('hello')"), .boolean(false))
    }

    func testArrayFrom() throws {
        // Use bracket notation since 'from' is a keyword
        XCTAssertEqual(try interpreter.execute("Array[\"from\"]('abc').length"), .number(3))
        XCTAssertEqual(try interpreter.execute("Array[\"from\"]('abc')[0]"), .string("a"))
    }

    func testArrayOf() throws {
        // Use bracket notation since 'of' is a keyword
        XCTAssertEqual(try interpreter.execute("Array[\"of\"](1, 2, 3).length"), .number(3))
        XCTAssertEqual(try interpreter.execute("Array[\"of\"](1, 2, 3)[1]"), .number(2))
    }

    // MARK: - String.prototype Methods

    func testStringLength() throws {
        XCTAssertEqual(try interpreter.execute("'hello'.length"), .number(5))
        XCTAssertEqual(try interpreter.execute("''.length"), .number(0))
    }

    func testStringCharAt() throws {
        XCTAssertEqual(try interpreter.execute("'hello'.charAt(0)"), .string("h"))
        XCTAssertEqual(try interpreter.execute("'hello'.charAt(4)"), .string("o"))
        XCTAssertEqual(try interpreter.execute("'hello'.charAt(10)"), .string(""))
    }

    func testStringCharCodeAt() throws {
        XCTAssertEqual(try interpreter.execute("'A'.charCodeAt(0)"), .number(65))
        XCTAssertEqual(try interpreter.execute("'abc'.charCodeAt(1)"), .number(98))
    }

    func testStringConcat() throws {
        XCTAssertEqual(try interpreter.execute("'hello'.concat(' ', 'world')"), .string("hello world"))
        XCTAssertEqual(try interpreter.execute("'a'.concat('b', 'c')"), .string("abc"))
    }

    func testStringIncludes() throws {
        XCTAssertEqual(try interpreter.execute("'hello world'.includes('world')"), .boolean(true))
        XCTAssertEqual(try interpreter.execute("'hello world'.includes('xyz')"), .boolean(false))
        XCTAssertEqual(try interpreter.execute("'hello world'.includes('hello', 1)"), .boolean(false))
    }

    func testStringIndexOf() throws {
        XCTAssertEqual(try interpreter.execute("'hello world'.indexOf('world')"), .number(6))
        XCTAssertEqual(try interpreter.execute("'hello world'.indexOf('xyz')"), .number(-1))
        XCTAssertEqual(try interpreter.execute("'hello world'.indexOf('o')"), .number(4))
        XCTAssertEqual(try interpreter.execute("'hello world'.indexOf('o', 5)"), .number(7))
    }

    func testStringLastIndexOf() throws {
        XCTAssertEqual(try interpreter.execute("'hello world'.lastIndexOf('o')"), .number(7))
        XCTAssertEqual(try interpreter.execute("'hello world'.lastIndexOf('o', 6)"), .number(4))
    }

    func testStringSlice() throws {
        XCTAssertEqual(try interpreter.execute("'hello'.slice(1, 4)"), .string("ell"))
        XCTAssertEqual(try interpreter.execute("'hello'.slice(-2)"), .string("lo"))
        XCTAssertEqual(try interpreter.execute("'hello'.slice(1)"), .string("ello"))
    }

    func testStringSubstring() throws {
        XCTAssertEqual(try interpreter.execute("'hello'.substring(1, 4)"), .string("ell"))
        XCTAssertEqual(try interpreter.execute("'hello'.substring(4, 1)"), .string("ell"))
        XCTAssertEqual(try interpreter.execute("'hello'.substring(1)"), .string("ello"))
    }

    func testStringSplit() throws {
        XCTAssertEqual(try interpreter.execute("'a,b,c'.split(',').length"), .number(3))
        XCTAssertEqual(try interpreter.execute("'a,b,c'.split(',')[1]"), .string("b"))
        XCTAssertEqual(try interpreter.execute("'hello'.split('').length"), .number(5))
        XCTAssertEqual(try interpreter.execute("'a,b,c'.split(',', 2).length"), .number(2))
    }

    func testStringToLowerCase() throws {
        XCTAssertEqual(try interpreter.execute("'HELLO'.toLowerCase()"), .string("hello"))
        XCTAssertEqual(try interpreter.execute("'HeLLo WoRLd'.toLowerCase()"), .string("hello world"))
    }

    func testStringToUpperCase() throws {
        XCTAssertEqual(try interpreter.execute("'hello'.toUpperCase()"), .string("HELLO"))
        XCTAssertEqual(try interpreter.execute("'HeLLo WoRLd'.toUpperCase()"), .string("HELLO WORLD"))
    }

    func testStringTrim() throws {
        XCTAssertEqual(try interpreter.execute("'  hello  '.trim()"), .string("hello"))
        XCTAssertEqual(try interpreter.execute("'\\n\\thello\\n\\t'.trim()"), .string("hello"))
    }

    func testStringTrimStart() throws {
        XCTAssertEqual(try interpreter.execute("'  hello  '.trimStart()"), .string("hello  "))
        XCTAssertEqual(try interpreter.execute("'  hello  '.trimLeft()"), .string("hello  "))
    }

    func testStringTrimEnd() throws {
        XCTAssertEqual(try interpreter.execute("'  hello  '.trimEnd()"), .string("  hello"))
        XCTAssertEqual(try interpreter.execute("'  hello  '.trimRight()"), .string("  hello"))
    }

    func testStringRepeat() throws {
        XCTAssertEqual(try interpreter.execute("'ab'.repeat(3)"), .string("ababab"))
        XCTAssertEqual(try interpreter.execute("'x'.repeat(0)"), .string(""))
    }

    func testStringReplace() throws {
        XCTAssertEqual(try interpreter.execute("'hello world'.replace('world', 'there')"), .string("hello there"))
        XCTAssertEqual(try interpreter.execute("'aaa'.replace('a', 'b')"), .string("baa"))
    }

    func testStringReplaceAll() throws {
        XCTAssertEqual(try interpreter.execute("'aaa'.replaceAll('a', 'b')"), .string("bbb"))
        XCTAssertEqual(try interpreter.execute("'hello world world'.replaceAll('world', 'there')"), .string("hello there there"))
    }

    func testStringStartsWith() throws {
        XCTAssertEqual(try interpreter.execute("'hello'.startsWith('hel')"), .boolean(true))
        XCTAssertEqual(try interpreter.execute("'hello'.startsWith('ell')"), .boolean(false))
        XCTAssertEqual(try interpreter.execute("'hello'.startsWith('ell', 1)"), .boolean(true))
    }

    func testStringEndsWith() throws {
        XCTAssertEqual(try interpreter.execute("'hello'.endsWith('llo')"), .boolean(true))
        XCTAssertEqual(try interpreter.execute("'hello'.endsWith('hel')"), .boolean(false))
        XCTAssertEqual(try interpreter.execute("'hello'.endsWith('hel', 3)"), .boolean(true))
    }

    func testStringPadStart() throws {
        XCTAssertEqual(try interpreter.execute("'5'.padStart(3, '0')"), .string("005"))
        XCTAssertEqual(try interpreter.execute("'abc'.padStart(6, '123')"), .string("123abc"))
    }

    func testStringPadEnd() throws {
        XCTAssertEqual(try interpreter.execute("'5'.padEnd(3, '0')"), .string("500"))
        XCTAssertEqual(try interpreter.execute("'abc'.padEnd(6, '123')"), .string("abc123"))
    }

    func testStringAt() throws {
        XCTAssertEqual(try interpreter.execute("'hello'.at(0)"), .string("h"))
        XCTAssertEqual(try interpreter.execute("'hello'.at(-1)"), .string("o"))
        XCTAssertEqual(try interpreter.execute("'hello'.at(10)"), .undefined)
    }

    func testStringFromCharCode() throws {
        XCTAssertEqual(try interpreter.execute("String.fromCharCode(65, 66, 67)"), .string("ABC"))
        XCTAssertEqual(try interpreter.execute("String.fromCharCode(72, 105)"), .string("Hi"))
    }

    func testStringConstructor() throws {
        XCTAssertEqual(try interpreter.execute("String(123)"), .string("123"))
        XCTAssertEqual(try interpreter.execute("String(true)"), .string("true"))
        XCTAssertEqual(try interpreter.execute("String(null)"), .string("null"))
    }

    // MARK: - Object Methods

    func testObjectKeys() throws {
        XCTAssertEqual(try interpreter.execute("Object.keys({a: 1, b: 2}).length"), .number(2))
        XCTAssertEqual(try interpreter.execute("Object.keys({}).length"), .number(0))
    }

    func testObjectValues() throws {
        XCTAssertEqual(try interpreter.execute("Object.values({a: 1, b: 2}).length"), .number(2))
        XCTAssertEqual(try interpreter.execute("""
            var vals = Object.values({a: 1, b: 2});
            vals.includes(1) && vals.includes(2)
        """), .boolean(true))
    }

    func testObjectEntries() throws {
        XCTAssertEqual(try interpreter.execute("Object.entries({a: 1, b: 2}).length"), .number(2))
        XCTAssertEqual(try interpreter.execute("Object.entries({a: 1})[0][0]"), .string("a"))
        XCTAssertEqual(try interpreter.execute("Object.entries({a: 1})[0][1]"), .number(1))
    }

    func testObjectAssign() throws {
        XCTAssertEqual(try interpreter.execute("""
            var target = {a: 1};
            Object.assign(target, {b: 2});
            target.b
        """), .number(2))
        XCTAssertEqual(try interpreter.execute("""
            var target = {a: 1};
            Object.assign(target, {a: 2});
            target.a
        """), .number(2))
    }

    func testObjectCreate() throws {
        XCTAssertEqual(try interpreter.execute("""
            var proto = {greet: function() { return 'hello'; }};
            var obj = Object.create(proto);
            obj.greet()
        """), .string("hello"))
    }

    func testObjectFreeze() throws {
        XCTAssertEqual(try interpreter.execute("""
            var obj = {a: 1};
            Object.freeze(obj);
            Object.isFrozen(obj)
        """), .boolean(true))
    }

    func testObjectSeal() throws {
        XCTAssertEqual(try interpreter.execute("""
            var obj = {a: 1};
            Object.seal(obj);
            Object.isSealed(obj)
        """), .boolean(true))
    }

    func testObjectIsExtensible() throws {
        XCTAssertEqual(try interpreter.execute("Object.isExtensible({})"), .boolean(true))
        XCTAssertEqual(try interpreter.execute("""
            var obj = {};
            Object.preventExtensions(obj);
            Object.isExtensible(obj)
        """), .boolean(false))
    }

    func testObjectGetPrototypeOf() throws {
        XCTAssertEqual(try interpreter.execute("""
            var proto = {x: 1};
            var obj = Object.create(proto);
            Object.getPrototypeOf(obj).x
        """), .number(1))
    }

    func testObjectHasOwnProperty() throws {
        XCTAssertEqual(try interpreter.execute("""
            var obj = {a: 1};
            obj.hasOwnProperty('a')
        """), .boolean(true))
        XCTAssertEqual(try interpreter.execute("""
            var obj = {a: 1};
            obj.hasOwnProperty('b')
        """), .boolean(false))
    }

    func testObjectFromEntries() throws {
        XCTAssertEqual(try interpreter.execute("""
            var entries = [['a', 1], ['b', 2]];
            var obj = Object.fromEntries(entries);
            obj.a
        """), .number(1))
        XCTAssertEqual(try interpreter.execute("""
            var entries = [['a', 1], ['b', 2]];
            var obj = Object.fromEntries(entries);
            obj.b
        """), .number(2))
    }

    func testObjectGetOwnPropertyNames() throws {
        XCTAssertEqual(try interpreter.execute("""
            var obj = {a: 1, b: 2};
            Object.getOwnPropertyNames(obj).length
        """), .number(2))
    }

    // MARK: - JSON Methods

    func testJSONParseObject() throws {
        XCTAssertEqual(try interpreter.execute("""
            var obj = JSON.parse('{"a": 1, "b": 2}');
            obj.a
        """), .number(1))
        XCTAssertEqual(try interpreter.execute("""
            var obj = JSON.parse('{"a": 1, "b": 2}');
            obj.b
        """), .number(2))
    }

    func testJSONParseArray() throws {
        XCTAssertEqual(try interpreter.execute("""
            var arr = JSON.parse('[1, 2, 3]');
            arr.length
        """), .number(3))
        XCTAssertEqual(try interpreter.execute("JSON.parse('[1, 2, 3]')[1]"), .number(2))
    }

    func testJSONParsePrimitives() throws {
        XCTAssertEqual(try interpreter.execute("JSON.parse('true')"), .boolean(true))
        XCTAssertEqual(try interpreter.execute("JSON.parse('false')"), .boolean(false))
        XCTAssertEqual(try interpreter.execute("JSON.parse('null')"), .null)
        XCTAssertEqual(try interpreter.execute("JSON.parse('42')"), .number(42))
        XCTAssertEqual(try interpreter.execute("JSON.parse('\"hello\"')"), .string("hello"))
    }

    func testJSONParseNested() throws {
        XCTAssertEqual(try interpreter.execute("""
            var obj = JSON.parse('{"nested": {"x": 10}}');
            obj.nested.x
        """), .number(10))
    }

    func testJSONStringifyObject() throws {
        XCTAssertEqual(try interpreter.execute("JSON.stringify({a: 1})"), .string("{\"a\":1}"))
    }

    func testJSONStringifyArray() throws {
        XCTAssertEqual(try interpreter.execute("JSON.stringify([1, 2, 3])"), .string("[1,2,3]"))
    }

    func testJSONStringifyPrimitives() throws {
        XCTAssertEqual(try interpreter.execute("JSON.stringify(true)"), .string("true"))
        XCTAssertEqual(try interpreter.execute("JSON.stringify(false)"), .string("false"))
        XCTAssertEqual(try interpreter.execute("JSON.stringify(null)"), .string("null"))
        XCTAssertEqual(try interpreter.execute("JSON.stringify(42)"), .string("42"))
        XCTAssertEqual(try interpreter.execute("JSON.stringify('hello')"), .string("\"hello\""))
    }

    func testJSONStringifyNested() throws {
        XCTAssertEqual(try interpreter.execute("""
            JSON.stringify({a: {b: 1}})
        """), .string("{\"a\":{\"b\":1}}"))
    }

    func testJSONRoundTrip() throws {
        XCTAssertEqual(try interpreter.execute("""
            var original = {name: 'test', value: 42, items: [1, 2, 3]};
            var parsed = JSON.parse(JSON.stringify(original));
            parsed.name
        """), .string("test"))
        XCTAssertEqual(try interpreter.execute("""
            var original = {name: 'test', value: 42, items: [1, 2, 3]};
            var parsed = JSON.parse(JSON.stringify(original));
            parsed.value
        """), .number(42))
    }

    // MARK: - Error Constructors

    func testErrorConstructor() throws {
        XCTAssertEqual(try interpreter.execute("""
            var e = Error('something went wrong');
            e.message
        """), .string("something went wrong"))
        XCTAssertEqual(try interpreter.execute("""
            var e = Error('something went wrong');
            e.name
        """), .string("Error"))
    }

    func testErrorToString() throws {
        XCTAssertEqual(try interpreter.execute("""
            var e = Error('oops');
            e.toString()
        """), .string("Error: oops"))
        XCTAssertEqual(try interpreter.execute("""
            var e = Error();
            e.toString()
        """), .string("Error"))
    }

    func testTypeError() throws {
        XCTAssertEqual(try interpreter.execute("""
            var e = TypeError('not a function');
            e.name
        """), .string("TypeError"))
        XCTAssertEqual(try interpreter.execute("""
            var e = TypeError('not a function');
            e.message
        """), .string("not a function"))
    }

    func testReferenceError() throws {
        XCTAssertEqual(try interpreter.execute("""
            var e = ReferenceError('x is not defined');
            e.name
        """), .string("ReferenceError"))
    }

    func testSyntaxError() throws {
        XCTAssertEqual(try interpreter.execute("""
            var e = SyntaxError('unexpected token');
            e.name
        """), .string("SyntaxError"))
    }

    func testRangeError() throws {
        XCTAssertEqual(try interpreter.execute("""
            var e = RangeError('invalid array length');
            e.name
        """), .string("RangeError"))
    }

    func testThrowCatchError() throws {
        XCTAssertEqual(try interpreter.execute("""
            var result = '';
            try {
                throw Error('test error');
            } catch (e) {
                result = e.message;
            }
            result
        """), .string("test error"))
    }
}
