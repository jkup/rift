import Foundation

/// Represents a JavaScript value
public enum Value: CustomStringConvertible {
    case undefined
    case null
    case boolean(Bool)
    case number(Double)
    case string(String)
    case object(JSObjectRef)

    // MARK: - Type Checks

    /// Returns the JavaScript typeof string for this value
    public var typeOf: String {
        switch self {
        case .undefined: return "undefined"
        case .null: return "object"  // JavaScript quirk
        case .boolean: return "boolean"
        case .number: return "number"
        case .string: return "string"
        case .object(let obj): return obj.typeOf
        }
    }

    public var isUndefined: Bool {
        if case .undefined = self { return true }
        return false
    }

    public var isNull: Bool {
        if case .null = self { return true }
        return false
    }

    public var isNullish: Bool {
        isUndefined || isNull
    }

    public var isBoolean: Bool {
        if case .boolean = self { return true }
        return false
    }

    public var isNumber: Bool {
        if case .number = self { return true }
        return false
    }

    public var isString: Bool {
        if case .string = self { return true }
        return false
    }

    public var isObject: Bool {
        if case .object = self { return true }
        return false
    }

    public var isPrimitive: Bool {
        !isObject
    }

    // MARK: - Truthiness

    /// JavaScript truthy/falsy evaluation
    public var isTruthy: Bool {
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
            return true  // All objects are truthy
        }
    }

    public var isFalsy: Bool {
        !isTruthy
    }

    // MARK: - Type Coercion

    /// Convert to boolean (ToBoolean)
    public func toBoolean() -> Bool {
        isTruthy
    }

    /// Convert to number (ToNumber)
    public func toNumber() -> Double {
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
            return Value.parseNumber(s)
        case .object(let obj):
            return obj.toPrimitive(preferredType: .number).toNumber()
        }
    }

    /// Convert to string (ToString)
    public func toString() -> String {
        switch self {
        case .undefined:
            return "undefined"
        case .null:
            return "null"
        case .boolean(let b):
            return b ? "true" : "false"
        case .number(let n):
            return Value.numberToString(n)
        case .string(let s):
            return s
        case .object(let obj):
            return obj.toPrimitive(preferredType: .string).toString()
        }
    }

    /// Convert to integer (ToInteger / ToIntegerOrInfinity in ES2020+)
    public func toInteger() -> Double {
        let num = toNumber()
        if num.isNaN { return 0 }
        if num.isInfinite || num == 0 { return num }
        return num < 0 ? -floor(abs(num)) : floor(num)
    }

    /// Convert to Int32
    public func toInt32() -> Int32 {
        let num = toNumber()
        if num.isNaN || num.isInfinite || num == 0 {
            return 0
        }
        let int32Bit = Int64(num.truncatingRemainder(dividingBy: 4294967296))
        if int32Bit >= 2147483648 {
            return Int32(int32Bit - 4294967296)
        }
        return Int32(int32Bit)
    }

    /// Convert to UInt32
    public func toUInt32() -> UInt32 {
        let num = toNumber()
        if num.isNaN || num.isInfinite || num == 0 {
            return 0
        }
        let posInt = num < 0 ? -floor(abs(num)) : floor(num)
        return UInt32(truncatingIfNeeded: Int64(posInt) & 0xFFFFFFFF)
    }

    // MARK: - Equality

    /// Strict equality (===)
    public func strictEquals(_ other: Value) -> Bool {
        switch (self, other) {
        case (.undefined, .undefined):
            return true
        case (.null, .null):
            return true
        case (.boolean(let a), .boolean(let b)):
            return a == b
        case (.number(let a), .number(let b)):
            // NaN !== NaN
            if a.isNaN || b.isNaN { return false }
            return a == b
        case (.string(let a), .string(let b)):
            return a == b
        case (.object(let a), .object(let b)):
            return a === b  // Reference equality
        default:
            return false
        }
    }

    /// Abstract equality (==) with type coercion
    public func looseEquals(_ other: Value) -> Bool {
        // Same type: use strict equality
        switch (self, other) {
        case (.undefined, .undefined), (.null, .null):
            return true
        case (.undefined, .null), (.null, .undefined):
            return true
        case (.number(let a), .number(let b)):
            if a.isNaN || b.isNaN { return false }
            return a == b
        case (.string(let a), .string(let b)):
            return a == b
        case (.boolean(let a), .boolean(let b)):
            return a == b
        case (.object(let a), .object(let b)):
            return a === b

        // Number vs String: convert string to number
        case (.number(let n), .string(let s)):
            return n == Value.parseNumber(s) && !n.isNaN
        case (.string(let s), .number(let n)):
            return Value.parseNumber(s) == n && !n.isNaN

        // Boolean vs anything: convert boolean to number first
        case (.boolean(let b), _):
            return Value.number(b ? 1 : 0).looseEquals(other)
        case (_, .boolean(let b)):
            return self.looseEquals(.number(b ? 1 : 0))

        // Object vs primitive: convert object to primitive
        case (.object(let obj), _) where other.isPrimitive:
            return obj.toPrimitive(preferredType: .default).looseEquals(other)
        case (_, .object(let obj)) where self.isPrimitive:
            return self.looseEquals(obj.toPrimitive(preferredType: .default))

        default:
            return false
        }
    }

    // MARK: - CustomStringConvertible

    public var description: String {
        toString()
    }

    // MARK: - Private Helpers

    /// Parse a string to a number following JavaScript rules
    private static func parseNumber(_ s: String) -> Double {
        let trimmed = s.trimmingCharacters(in: .whitespaces)
        if trimmed.isEmpty { return 0 }

        // Handle special cases
        if trimmed == "Infinity" || trimmed == "+Infinity" { return .infinity }
        if trimmed == "-Infinity" { return -.infinity }

        // Handle hex
        if trimmed.hasPrefix("0x") || trimmed.hasPrefix("0X") {
            if let value = Int64(trimmed.dropFirst(2), radix: 16) {
                return Double(value)
            }
            return .nan
        }

        // Handle octal (0o) and binary (0b)
        if trimmed.hasPrefix("0o") || trimmed.hasPrefix("0O") {
            if let value = Int64(trimmed.dropFirst(2), radix: 8) {
                return Double(value)
            }
            return .nan
        }
        if trimmed.hasPrefix("0b") || trimmed.hasPrefix("0B") {
            if let value = Int64(trimmed.dropFirst(2), radix: 2) {
                return Double(value)
            }
            return .nan
        }

        // Standard number parsing
        if let value = Double(trimmed) {
            return value
        }

        return .nan
    }

    /// Convert a number to string following JavaScript rules
    private static func numberToString(_ n: Double) -> String {
        if n.isNaN { return "NaN" }
        if n.isInfinite { return n > 0 ? "Infinity" : "-Infinity" }
        if n == 0 { return "0" }  // Handles both +0 and -0

        // If it's a whole number that fits in Int64, format as integer
        if n == n.rounded() && abs(n) < Double(Int64.max) {
            return String(Int64(n))
        }

        // Use default Double formatting
        return String(n)
    }
}

// MARK: - Equatable (for testing convenience)

extension Value: Equatable {
    public static func == (lhs: Value, rhs: Value) -> Bool {
        lhs.strictEquals(rhs)
    }
}

// MARK: - JSObjectRef Protocol

/// Protocol for JavaScript object references (to break circular dependency)
public protocol JSObjectRef: AnyObject {
    var typeOf: String { get }
    func toPrimitive(preferredType: ToPrimitiveHint) -> Value
}

/// Hint for ToPrimitive conversion
public enum ToPrimitiveHint {
    case `default`
    case number
    case string
}
