import XCTest
@testable import RiftCore

final class ValueTests: XCTestCase {

    // MARK: - Type Checks

    func testTypeOf() {
        XCTAssertEqual(Value.undefined.typeOf, "undefined")
        XCTAssertEqual(Value.null.typeOf, "object")  // JavaScript quirk
        XCTAssertEqual(Value.boolean(true).typeOf, "boolean")
        XCTAssertEqual(Value.number(42).typeOf, "number")
        XCTAssertEqual(Value.string("hello").typeOf, "string")
    }

    func testIsNullish() {
        XCTAssertTrue(Value.undefined.isNullish)
        XCTAssertTrue(Value.null.isNullish)
        XCTAssertFalse(Value.boolean(false).isNullish)
        XCTAssertFalse(Value.number(0).isNullish)
        XCTAssertFalse(Value.string("").isNullish)
    }

    // MARK: - Truthiness

    func testTruthiness() {
        // Falsy values
        XCTAssertFalse(Value.undefined.isTruthy)
        XCTAssertFalse(Value.null.isTruthy)
        XCTAssertFalse(Value.boolean(false).isTruthy)
        XCTAssertFalse(Value.number(0).isTruthy)
        XCTAssertFalse(Value.number(-0).isTruthy)
        XCTAssertFalse(Value.number(.nan).isTruthy)
        XCTAssertFalse(Value.string("").isTruthy)

        // Truthy values
        XCTAssertTrue(Value.boolean(true).isTruthy)
        XCTAssertTrue(Value.number(1).isTruthy)
        XCTAssertTrue(Value.number(-1).isTruthy)
        XCTAssertTrue(Value.number(.infinity).isTruthy)
        XCTAssertTrue(Value.string("hello").isTruthy)
        XCTAssertTrue(Value.string("0").isTruthy)
        XCTAssertTrue(Value.string("false").isTruthy)
    }

    // MARK: - ToBoolean

    func testToBoolean() {
        XCTAssertFalse(Value.undefined.toBoolean())
        XCTAssertFalse(Value.null.toBoolean())
        XCTAssertFalse(Value.number(0).toBoolean())
        XCTAssertFalse(Value.string("").toBoolean())
        XCTAssertTrue(Value.number(42).toBoolean())
        XCTAssertTrue(Value.string("x").toBoolean())
    }

    // MARK: - ToNumber

    func testToNumber() {
        XCTAssertTrue(Value.undefined.toNumber().isNaN)
        XCTAssertEqual(Value.null.toNumber(), 0)
        XCTAssertEqual(Value.boolean(true).toNumber(), 1)
        XCTAssertEqual(Value.boolean(false).toNumber(), 0)
        XCTAssertEqual(Value.number(42).toNumber(), 42)
        XCTAssertEqual(Value.string("42").toNumber(), 42)
        XCTAssertEqual(Value.string("3.14").toNumber(), 3.14)
        XCTAssertEqual(Value.string("  42  ").toNumber(), 42)
        XCTAssertEqual(Value.string("").toNumber(), 0)
        XCTAssertTrue(Value.string("hello").toNumber().isNaN)
        XCTAssertEqual(Value.string("Infinity").toNumber(), .infinity)
        XCTAssertEqual(Value.string("-Infinity").toNumber(), -.infinity)
    }

    func testToNumberHex() {
        XCTAssertEqual(Value.string("0xff").toNumber(), 255)
        XCTAssertEqual(Value.string("0xFF").toNumber(), 255)
        XCTAssertEqual(Value.string("0x10").toNumber(), 16)
    }

    func testToNumberOctalBinary() {
        XCTAssertEqual(Value.string("0o10").toNumber(), 8)
        XCTAssertEqual(Value.string("0O10").toNumber(), 8)
        XCTAssertEqual(Value.string("0b1010").toNumber(), 10)
        XCTAssertEqual(Value.string("0B1010").toNumber(), 10)
    }

    // MARK: - ToString

    func testToString() {
        XCTAssertEqual(Value.undefined.toString(), "undefined")
        XCTAssertEqual(Value.null.toString(), "null")
        XCTAssertEqual(Value.boolean(true).toString(), "true")
        XCTAssertEqual(Value.boolean(false).toString(), "false")
        XCTAssertEqual(Value.number(42).toString(), "42")
        XCTAssertEqual(Value.number(3.14).toString(), "3.14")
        XCTAssertEqual(Value.number(.nan).toString(), "NaN")
        XCTAssertEqual(Value.number(.infinity).toString(), "Infinity")
        XCTAssertEqual(Value.number(-.infinity).toString(), "-Infinity")
        XCTAssertEqual(Value.string("hello").toString(), "hello")
    }

    func testToStringNumbers() {
        XCTAssertEqual(Value.number(0).toString(), "0")
        XCTAssertEqual(Value.number(-0).toString(), "0")
        XCTAssertEqual(Value.number(1000000).toString(), "1000000")
        XCTAssertEqual(Value.number(-42).toString(), "-42")
    }

    // MARK: - ToInteger

    func testToInteger() {
        XCTAssertEqual(Value.number(3.7).toInteger(), 3)
        XCTAssertEqual(Value.number(-3.7).toInteger(), -3)
        XCTAssertEqual(Value.number(0).toInteger(), 0)
        XCTAssertEqual(Value.number(.nan).toInteger(), 0)
        XCTAssertEqual(Value.number(.infinity).toInteger(), .infinity)
        XCTAssertEqual(Value.string("42.9").toInteger(), 42)
    }

    // MARK: - ToInt32

    func testToInt32() {
        XCTAssertEqual(Value.number(42).toInt32(), 42)
        XCTAssertEqual(Value.number(-42).toInt32(), -42)
        XCTAssertEqual(Value.number(.nan).toInt32(), 0)
        XCTAssertEqual(Value.number(.infinity).toInt32(), 0)
    }

    // MARK: - Strict Equality

    func testStrictEquality() {
        // Same types
        XCTAssertTrue(Value.undefined.strictEquals(.undefined))
        XCTAssertTrue(Value.null.strictEquals(.null))
        XCTAssertTrue(Value.boolean(true).strictEquals(.boolean(true)))
        XCTAssertFalse(Value.boolean(true).strictEquals(.boolean(false)))
        XCTAssertTrue(Value.number(42).strictEquals(.number(42)))
        XCTAssertTrue(Value.string("hello").strictEquals(.string("hello")))

        // Different types
        XCTAssertFalse(Value.undefined.strictEquals(.null))
        XCTAssertFalse(Value.number(0).strictEquals(.string("0")))
        XCTAssertFalse(Value.boolean(false).strictEquals(.number(0)))

        // NaN !== NaN
        XCTAssertFalse(Value.number(.nan).strictEquals(.number(.nan)))
    }

    // MARK: - Loose Equality

    func testLooseEquality() {
        // null == undefined
        XCTAssertTrue(Value.null.looseEquals(.undefined))
        XCTAssertTrue(Value.undefined.looseEquals(.null))

        // Number == String (convert string to number)
        XCTAssertTrue(Value.number(42).looseEquals(.string("42")))
        XCTAssertTrue(Value.string("42").looseEquals(.number(42)))

        // Boolean gets converted to number first
        XCTAssertTrue(Value.boolean(true).looseEquals(.number(1)))
        XCTAssertTrue(Value.boolean(false).looseEquals(.number(0)))
        XCTAssertTrue(Value.boolean(true).looseEquals(.string("1")))

        // Same types use strict equality
        XCTAssertTrue(Value.string("hello").looseEquals(.string("hello")))
        XCTAssertFalse(Value.string("hello").looseEquals(.string("world")))

        // NaN != NaN
        XCTAssertFalse(Value.number(.nan).looseEquals(.number(.nan)))
    }

    // MARK: - Equatable Conformance

    func testEquatable() {
        XCTAssertEqual(Value.number(42), Value.number(42))
        XCTAssertNotEqual(Value.number(42), Value.number(43))
        XCTAssertEqual(Value.string("test"), Value.string("test"))
        XCTAssertNotEqual(Value.string("test"), Value.string("other"))
    }
}
