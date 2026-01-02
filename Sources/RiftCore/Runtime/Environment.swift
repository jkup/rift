import Foundation

// MARK: - Variable Kind

/// The declaration kind of a variable
public enum VariableKind {
    case `var`
    case `let`
    case `const`
    case parameter
    case functionDeclaration
}

// MARK: - Variable Entry

/// An entry in the environment representing a variable binding
public struct VariableEntry {
    public var value: Value
    public let kind: VariableKind
    public var initialized: Bool

    public init(value: Value = .undefined, kind: VariableKind, initialized: Bool = false) {
        self.value = value
        self.kind = kind
        self.initialized = initialized
    }

    /// Whether this variable can be reassigned
    public var isMutable: Bool {
        kind != .const
    }
}

// MARK: - Environment

/// Represents a lexical environment (scope) for variable bindings
public class Environment {
    /// Variables declared in this scope
    private var variables: [String: VariableEntry] = [:]

    /// Parent scope (nil for global scope)
    public let parent: Environment?

    /// Whether this is a block scope (for let/const) or function scope (for var)
    public let isBlockScope: Bool

    /// The global object (for global scope)
    public weak var globalObject: JSObject?

    // MARK: - Initialization

    public init(parent: Environment? = nil, isBlockScope: Bool = false) {
        self.parent = parent
        self.isBlockScope = isBlockScope
    }

    /// Create the global environment
    public static func createGlobal(globalObject: JSObject? = nil) -> Environment {
        let env = Environment(parent: nil, isBlockScope: false)
        env.globalObject = globalObject
        return env
    }

    // MARK: - Scope Creation

    /// Create a child scope
    public func createChild(isBlockScope: Bool = false) -> Environment {
        let child = Environment(parent: self, isBlockScope: isBlockScope)
        child.globalObject = globalObject
        return child
    }

    /// Create a function scope (captures the closure chain)
    public func createFunctionScope() -> Environment {
        createChild(isBlockScope: false)
    }

    /// Create a block scope (for let/const in blocks)
    public func createBlockScope() -> Environment {
        createChild(isBlockScope: true)
    }

    // MARK: - Variable Declaration

    /// Declare a variable (hoisting for var, TDZ for let/const)
    public func declare(_ name: String, kind: VariableKind) throws {
        // Check for redeclaration
        if let existing = variables[name] {
            // var can be redeclared, let/const cannot
            if existing.kind != .var && existing.kind != .functionDeclaration {
                throw RuntimeError.typeError("Identifier '\(name)' has already been declared")
            }
            if kind != .var && kind != .functionDeclaration {
                throw RuntimeError.typeError("Identifier '\(name)' has already been declared")
            }
        }

        // For var, find the function scope to declare in
        if kind == .var || kind == .functionDeclaration {
            let targetScope = findVarScope()
            if targetScope !== self {
                try targetScope.declare(name, kind: kind)
                return
            }
        }

        variables[name] = VariableEntry(kind: kind, initialized: kind == .var || kind == .functionDeclaration)
    }

    /// Define a variable with an initial value
    public func define(_ name: String, value: Value, kind: VariableKind) throws {
        try declare(name, kind: kind)
        try initialize(name, value: value)
    }

    /// Initialize a declared variable (for let/const)
    public func initialize(_ name: String, value: Value) throws {
        if var entry = variables[name] {
            entry.value = value
            entry.initialized = true
            variables[name] = entry
            return
        }

        // For var hoisting, check parent scopes
        if let parent = parent {
            try parent.initialize(name, value: value)
            return
        }

        throw RuntimeError.undefinedVariable(name)
    }

    // MARK: - Variable Access

    /// Get a variable's value
    public func get(_ name: String) throws -> Value {
        if let entry = variables[name] {
            guard entry.initialized else {
                throw RuntimeError.referenceError("Cannot access '\(name)' before initialization")
            }
            return entry.value
        }

        // Check parent scope
        if let parent = parent {
            return try parent.get(name)
        }

        // Check global object
        if let global = globalObject, global.hasProperty(name) {
            return global.getProperty(name)
        }

        throw RuntimeError.undefinedVariable(name)
    }

    /// Set a variable's value
    public func set(_ name: String, value: Value) throws {
        if var entry = variables[name] {
            guard entry.initialized else {
                throw RuntimeError.referenceError("Cannot access '\(name)' before initialization")
            }
            guard entry.isMutable else {
                throw RuntimeError.cannotAssignToConstant(name)
            }
            entry.value = value
            variables[name] = entry
            return
        }

        // Check parent scope
        if let parent = parent {
            try parent.set(name, value: value)
            return
        }

        // Check global object
        if let global = globalObject, global.hasProperty(name) {
            try global.setProperty(name, value)
            return
        }

        throw RuntimeError.undefinedVariable(name)
    }

    /// Check if a variable exists in this scope or any parent
    public func has(_ name: String) -> Bool {
        if variables[name] != nil {
            return true
        }
        if let parent = parent {
            return parent.has(name)
        }
        if let global = globalObject {
            return global.hasProperty(name)
        }
        return false
    }

    /// Check if a variable exists in this scope only (not parents)
    public func hasLocal(_ name: String) -> Bool {
        variables[name] != nil
    }

    /// Delete a variable (only for global properties)
    public func delete(_ name: String) -> Bool {
        // Can only delete global object properties
        if let global = globalObject, parent == nil {
            return (try? global.deleteProperty(name)) ?? false
        }
        return false
    }

    // MARK: - Helpers

    /// Find the scope where var declarations should go
    private func findVarScope() -> Environment {
        if !isBlockScope {
            return self
        }
        return parent?.findVarScope() ?? self
    }

    /// Get all variable names in this scope
    public func localNames() -> [String] {
        Array(variables.keys)
    }

    /// Get the global scope
    public var global: Environment {
        parent?.global ?? self
    }

    // MARK: - Debug

    /// Debug description of this environment
    public var debugDescription: String {
        var lines: [String] = []
        lines.append("Environment(isBlock: \(isBlockScope)):")
        for (name, entry) in variables {
            let status = entry.initialized ? "✓" : "○"
            lines.append("  \(status) \(entry.kind) \(name) = \(entry.value)")
        }
        if let parent = parent {
            lines.append("  parent: \(parent.debugDescription)")
        }
        return lines.joined(separator: "\n")
    }
}

// MARK: - Environment + With Statement Support

extension Environment {
    /// Create an environment with a with-statement object binding
    /// Note: 'with' is deprecated and disabled in strict mode
    public func createWithScope(object: JSObject) -> WithEnvironment {
        WithEnvironment(object: object, parent: self)
    }
}

/// Special environment for 'with' statement
public class WithEnvironment: Environment {
    private let bindingObject: JSObject

    public init(object: JSObject, parent: Environment) {
        self.bindingObject = object
        super.init(parent: parent, isBlockScope: false)
    }

    public override func get(_ name: String) throws -> Value {
        if bindingObject.hasProperty(name) {
            return bindingObject.getProperty(name)
        }
        return try super.get(name)
    }

    public override func set(_ name: String, value: Value) throws {
        if bindingObject.hasProperty(name) {
            try bindingObject.setProperty(name, value)
            return
        }
        try super.set(name, value: value)
    }

    public override func has(_ name: String) -> Bool {
        if bindingObject.hasProperty(name) {
            return true
        }
        return super.has(name)
    }
}
