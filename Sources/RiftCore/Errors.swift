import Foundation

// MARK: - Lexer Errors

/// Errors that occur during lexical analysis
public enum LexerError: Error, LocalizedError, Equatable {
    case unexpectedCharacter(Character, SourceLocation)
    case unterminatedString(SourceLocation)
    case unterminatedComment(SourceLocation)
    case unterminatedRegex(SourceLocation)
    case invalidEscapeSequence(String, SourceLocation)
    case invalidNumber(String, SourceLocation)
    case invalidUnicodeEscape(SourceLocation)

    public var errorDescription: String? {
        switch self {
        case .unexpectedCharacter(let char, let loc):
            return "SyntaxError: Unexpected character '\(char)' at \(loc)"
        case .unterminatedString(let loc):
            return "SyntaxError: Unterminated string literal at \(loc)"
        case .unterminatedComment(let loc):
            return "SyntaxError: Unterminated comment at \(loc)"
        case .unterminatedRegex(let loc):
            return "SyntaxError: Unterminated regular expression at \(loc)"
        case .invalidEscapeSequence(let seq, let loc):
            return "SyntaxError: Invalid escape sequence '\(seq)' at \(loc)"
        case .invalidNumber(let num, let loc):
            return "SyntaxError: Invalid number '\(num)' at \(loc)"
        case .invalidUnicodeEscape(let loc):
            return "SyntaxError: Invalid Unicode escape sequence at \(loc)"
        }
    }

    public var location: SourceLocation {
        switch self {
        case .unexpectedCharacter(_, let loc),
             .unterminatedString(let loc),
             .unterminatedComment(let loc),
             .unterminatedRegex(let loc),
             .invalidEscapeSequence(_, let loc),
             .invalidNumber(_, let loc),
             .invalidUnicodeEscape(let loc):
            return loc
        }
    }
}

// MARK: - Parse Errors

/// Errors that occur during parsing
public enum ParseError: Error, LocalizedError, Equatable {
    case unexpectedToken(TokenType, expected: String, SourceLocation)
    case unexpectedEndOfInput
    case invalidAssignmentTarget(SourceLocation)
    case invalidDestructuringTarget(SourceLocation)
    case duplicateParameter(String, SourceLocation)
    case invalidBreak(SourceLocation)
    case invalidContinue(SourceLocation)
    case invalidReturn(SourceLocation)
    case invalidAwait(SourceLocation)
    case invalidYield(SourceLocation)
    case strictModeViolation(String, SourceLocation)
    case invalidLabeledStatement(SourceLocation)

    public var errorDescription: String? {
        switch self {
        case .unexpectedToken(let type, let expected, let loc):
            return "SyntaxError: Unexpected token \(type) at \(loc), expected \(expected)"
        case .unexpectedEndOfInput:
            return "SyntaxError: Unexpected end of input"
        case .invalidAssignmentTarget(let loc):
            return "SyntaxError: Invalid left-hand side in assignment at \(loc)"
        case .invalidDestructuringTarget(let loc):
            return "SyntaxError: Invalid destructuring assignment target at \(loc)"
        case .duplicateParameter(let name, let loc):
            return "SyntaxError: Duplicate parameter name '\(name)' at \(loc)"
        case .invalidBreak(let loc):
            return "SyntaxError: Illegal break statement at \(loc)"
        case .invalidContinue(let loc):
            return "SyntaxError: Illegal continue statement at \(loc)"
        case .invalidReturn(let loc):
            return "SyntaxError: Illegal return statement at \(loc)"
        case .invalidAwait(let loc):
            return "SyntaxError: await is only valid in async functions at \(loc)"
        case .invalidYield(let loc):
            return "SyntaxError: yield is only valid in generator functions at \(loc)"
        case .strictModeViolation(let message, let loc):
            return "SyntaxError: \(message) at \(loc)"
        case .invalidLabeledStatement(let loc):
            return "SyntaxError: Invalid labeled statement at \(loc)"
        }
    }

    public var location: SourceLocation? {
        switch self {
        case .unexpectedToken(_, _, let loc),
             .invalidAssignmentTarget(let loc),
             .invalidDestructuringTarget(let loc),
             .duplicateParameter(_, let loc),
             .invalidBreak(let loc),
             .invalidContinue(let loc),
             .invalidReturn(let loc),
             .invalidAwait(let loc),
             .invalidYield(let loc),
             .strictModeViolation(_, let loc),
             .invalidLabeledStatement(let loc):
            return loc
        case .unexpectedEndOfInput:
            return nil
        }
    }
}

// MARK: - Runtime Errors

/// Errors that occur during script execution
public enum RuntimeError: Error, LocalizedError {
    // Reference errors
    case undefinedVariable(String)
    case undefinedProperty(String)

    // Type errors
    case notAFunction(String)
    case notAnObject(String)
    case notIterable(String)
    case notConstructable(String)
    case cannotAssignToConstant(String)
    case cannotDeleteProperty(String)
    case cannotDefineProperty(String)
    case invalidPropertyDescriptor
    case circularPrototypeChain
    case readOnlyProperty(String)

    // Range errors
    case invalidArrayLength
    case invalidStringLength
    case stackOverflow
    case invalidRadix(Int)
    case invalidDate

    // Syntax errors at runtime (eval)
    case syntaxError(String)

    // URI errors
    case uriMalformed

    // Internal/aggregate
    case internalError(String)
    case aggregateError([Error])

    // Generic type error with message
    case typeError(String)
    case rangeError(String)
    case referenceError(String)

    public var errorDescription: String? {
        switch self {
        case .undefinedVariable(let name):
            return "ReferenceError: \(name) is not defined"
        case .undefinedProperty(let name):
            return "ReferenceError: Cannot read property '\(name)' of undefined"
        case .notAFunction(let name):
            return "TypeError: \(name) is not a function"
        case .notAnObject(let desc):
            return "TypeError: \(desc) is not an object"
        case .notIterable(let desc):
            return "TypeError: \(desc) is not iterable"
        case .notConstructable(let name):
            return "TypeError: \(name) is not a constructor"
        case .cannotAssignToConstant(let name):
            return "TypeError: Assignment to constant variable '\(name)'"
        case .cannotDeleteProperty(let name):
            return "TypeError: Cannot delete property '\(name)'"
        case .cannotDefineProperty(let name):
            return "TypeError: Cannot define property '\(name)'"
        case .invalidPropertyDescriptor:
            return "TypeError: Invalid property descriptor"
        case .circularPrototypeChain:
            return "TypeError: Cyclic __proto__ value"
        case .readOnlyProperty(let name):
            return "TypeError: Cannot assign to read only property '\(name)'"
        case .invalidArrayLength:
            return "RangeError: Invalid array length"
        case .invalidStringLength:
            return "RangeError: Invalid string length"
        case .stackOverflow:
            return "RangeError: Maximum call stack size exceeded"
        case .invalidRadix(let radix):
            return "RangeError: toString() radix must be between 2 and 36, got \(radix)"
        case .invalidDate:
            return "RangeError: Invalid time value"
        case .syntaxError(let message):
            return "SyntaxError: \(message)"
        case .uriMalformed:
            return "URIError: URI malformed"
        case .internalError(let message):
            return "InternalError: \(message)"
        case .aggregateError(let errors):
            return "AggregateError: \(errors.count) error(s)"
        case .typeError(let message):
            return "TypeError: \(message)"
        case .rangeError(let message):
            return "RangeError: \(message)"
        case .referenceError(let message):
            return "ReferenceError: \(message)"
        }
    }

    /// The JavaScript error name (Error, TypeError, etc.)
    public var name: String {
        switch self {
        case .undefinedVariable, .undefinedProperty, .referenceError:
            return "ReferenceError"
        case .notAFunction, .notAnObject, .notIterable, .notConstructable,
             .cannotAssignToConstant, .cannotDeleteProperty, .cannotDefineProperty,
             .invalidPropertyDescriptor, .circularPrototypeChain, .readOnlyProperty,
             .typeError:
            return "TypeError"
        case .invalidArrayLength, .invalidStringLength, .stackOverflow,
             .invalidRadix, .invalidDate, .rangeError:
            return "RangeError"
        case .syntaxError:
            return "SyntaxError"
        case .uriMalformed:
            return "URIError"
        case .internalError:
            return "InternalError"
        case .aggregateError:
            return "AggregateError"
        }
    }
}

// MARK: - Control Flow (Not Real Errors)

/// Used internally to implement return statements
public struct ReturnValue: Error {
    public let value: Value

    public init(_ value: Value) {
        self.value = value
    }
}

/// Used internally to implement break statements
public struct BreakException: Error {
    public let label: String?

    public init(label: String? = nil) {
        self.label = label
    }
}

/// Used internally to implement continue statements
public struct ContinueException: Error {
    public let label: String?

    public init(label: String? = nil) {
        self.label = label
    }
}

/// A thrown JavaScript value (throw statement)
public struct ThrowValue: Error {
    public let value: Value
    public let location: SourceLocation?

    public init(_ value: Value, location: SourceLocation? = nil) {
        self.value = value
        self.location = location
    }
}
