import Foundation

// MARK: - Property Descriptor

/// Property attributes following ECMAScript specification
public struct PropertyDescriptor {
    public var value: Value
    public var writable: Bool
    public var enumerable: Bool
    public var configurable: Bool

    /// Getter function (for accessor properties)
    public var getter: JSObject?
    /// Setter function (for accessor properties)
    public var setter: JSObject?

    /// Whether this is a data descriptor (has value/writable)
    public var isDataDescriptor: Bool {
        getter == nil && setter == nil
    }

    /// Whether this is an accessor descriptor (has get/set)
    public var isAccessorDescriptor: Bool {
        getter != nil || setter != nil
    }

    // MARK: - Factory Methods

    /// Create a data property descriptor
    public static func data(
        _ value: Value,
        writable: Bool = true,
        enumerable: Bool = true,
        configurable: Bool = true
    ) -> PropertyDescriptor {
        PropertyDescriptor(
            value: value,
            writable: writable,
            enumerable: enumerable,
            configurable: configurable,
            getter: nil,
            setter: nil
        )
    }

    /// Create an accessor property descriptor
    public static func accessor(
        getter: JSObject? = nil,
        setter: JSObject? = nil,
        enumerable: Bool = true,
        configurable: Bool = true
    ) -> PropertyDescriptor {
        PropertyDescriptor(
            value: .undefined,
            writable: false,
            enumerable: enumerable,
            configurable: configurable,
            getter: getter,
            setter: setter
        )
    }

    /// Create a non-writable, non-enumerable, non-configurable property
    public static func frozen(_ value: Value) -> PropertyDescriptor {
        PropertyDescriptor(
            value: value,
            writable: false,
            enumerable: false,
            configurable: false,
            getter: nil,
            setter: nil
        )
    }

    /// Create a non-enumerable property (typical for built-in methods)
    public static func builtin(_ value: Value) -> PropertyDescriptor {
        PropertyDescriptor(
            value: value,
            writable: true,
            enumerable: false,
            configurable: true,
            getter: nil,
            setter: nil
        )
    }
}

// MARK: - JSObject

/// Base class for all JavaScript objects
public class JSObject: JSObjectRef, CustomStringConvertible {
    /// The object's prototype (null for Object.prototype itself)
    public var prototype: JSObject?

    /// Own properties of this object
    private var properties: [String: PropertyDescriptor] = [:]

    /// Internal slots (used for special objects like Date, RegExp, etc.)
    internal var internalSlots: [String: Any] = [:]

    /// Whether the object is extensible (can have new properties added)
    public private(set) var isExtensible: Bool = true

    // MARK: - Initialization

    public init(prototype: JSObject? = nil) {
        self.prototype = prototype
    }

    // MARK: - JSObjectRef Conformance

    public var typeOf: String {
        "object"
    }

    public func toPrimitive(preferredType: ToPrimitiveHint) -> Value {
        // OrdinaryToPrimitive algorithm
        let methodNames: [String]
        switch preferredType {
        case .string:
            methodNames = ["toString", "valueOf"]
        case .number, .default:
            methodNames = ["valueOf", "toString"]
        }

        for methodName in methodNames {
            let method = getProperty(methodName)
            if case .object(let fn) = method, let jsObj = fn as? JSObject, jsObj.isCallable {
                // Would call the method here - for now return default
                // This will be implemented properly when we have function calling
            }
        }

        // Default: return "[object Object]"
        return .string("[object Object]")
    }

    // MARK: - Callable Check

    /// Whether this object can be called as a function
    public var isCallable: Bool {
        false  // Overridden in JSFunction
    }

    /// Whether this object can be used with 'new'
    public var isConstructor: Bool {
        false  // Overridden in JSFunction
    }

    // MARK: - Property Access

    /// Check if this object has an own property
    public func hasOwnProperty(_ key: String) -> Bool {
        properties[key] != nil
    }

    /// Check if this object or its prototype chain has a property
    public func hasProperty(_ key: String) -> Bool {
        if hasOwnProperty(key) {
            return true
        }
        return prototype?.hasProperty(key) ?? false
    }

    /// Get an own property descriptor
    public func getOwnPropertyDescriptor(_ key: String) -> PropertyDescriptor? {
        properties[key]
    }

    /// Get a property value (follows prototype chain)
    public func getProperty(_ key: String) -> Value {
        if let descriptor = properties[key] {
            if descriptor.isAccessorDescriptor, let getter = descriptor.getter {
                // Would call getter here
                _ = getter
                return .undefined
            }
            return descriptor.value
        }

        // Check prototype chain
        return prototype?.getProperty(key) ?? .undefined
    }

    /// Set a property value
    public func setProperty(_ key: String, _ value: Value) throws {
        // Check if property exists in prototype chain
        if let existing = findPropertyDescriptor(key) {
            // If it's a setter, call it
            if existing.isAccessorDescriptor {
                if existing.setter != nil {
                    // Would call setter here
                    return
                }
                // No setter - silently fail in non-strict mode
                return
            }

            // If not writable, fail
            if !existing.writable {
                // In strict mode, throw. For now, silently fail.
                return
            }
        }

        // Check extensibility for new properties
        if !hasOwnProperty(key) && !isExtensible {
            return
        }

        // Set or update own property
        if var existing = properties[key] {
            existing.value = value
            properties[key] = existing
        } else {
            properties[key] = .data(value)
        }
    }

    /// Define a property with a descriptor
    public func defineProperty(_ key: String, _ descriptor: PropertyDescriptor) throws {
        // Check if we can define/redefine
        if let existing = properties[key] {
            if !existing.configurable {
                // Can't change non-configurable to configurable
                if descriptor.configurable {
                    throw RuntimeError.cannotDefineProperty(key)
                }
                // Can't change enumerable of non-configurable
                if descriptor.enumerable != existing.enumerable {
                    throw RuntimeError.cannotDefineProperty(key)
                }
                // For data descriptors, check writable
                if existing.isDataDescriptor && !existing.writable {
                    if descriptor.writable {
                        throw RuntimeError.cannotDefineProperty(key)
                    }
                }
            }
        } else if !isExtensible {
            throw RuntimeError.cannotDefineProperty(key)
        }

        properties[key] = descriptor
    }

    /// Delete a property
    public func deleteProperty(_ key: String) throws -> Bool {
        guard let descriptor = properties[key] else {
            return true  // Property doesn't exist, deletion "succeeds"
        }

        if !descriptor.configurable {
            return false
        }

        properties.removeValue(forKey: key)
        return true
    }

    /// Get all own property keys
    public func ownKeys() -> [String] {
        Array(properties.keys)
    }

    /// Get own enumerable property keys
    public func enumerableKeys() -> [String] {
        properties.filter { $0.value.enumerable }.map { $0.key }
    }

    /// Get all enumerable keys including prototype chain
    public func allEnumerableKeys() -> [String] {
        var keys = Set(enumerableKeys())
        var proto = prototype
        while let p = proto {
            for key in p.enumerableKeys() where !keys.contains(key) {
                keys.insert(key)
            }
            proto = p.prototype
        }
        return Array(keys)
    }

    // MARK: - Extensibility

    /// Prevent new properties from being added
    public func preventExtensions() {
        isExtensible = false
    }

    /// Seal the object (non-extensible, all properties non-configurable)
    public func seal() {
        isExtensible = false
        for key in properties.keys {
            properties[key]?.configurable = false
        }
    }

    /// Freeze the object (sealed + all data properties non-writable)
    public func freeze() {
        seal()
        for key in properties.keys {
            if properties[key]?.isDataDescriptor == true {
                properties[key]?.writable = false
            }
        }
    }

    /// Check if object is sealed
    public var isSealed: Bool {
        if isExtensible { return false }
        return properties.values.allSatisfy { !$0.configurable }
    }

    /// Check if object is frozen
    public var isFrozen: Bool {
        if isExtensible { return false }
        return properties.values.allSatisfy { descriptor in
            !descriptor.configurable &&
            (descriptor.isAccessorDescriptor || !descriptor.writable)
        }
    }

    // MARK: - Prototype Chain

    /// Set the prototype (with cycle detection)
    public func setPrototype(_ newPrototype: JSObject?) throws {
        // Check for circular prototype chain
        var current = newPrototype
        while let proto = current {
            if proto === self {
                throw RuntimeError.circularPrototypeChain
            }
            current = proto.prototype
        }
        prototype = newPrototype
    }

    // MARK: - Internal Helpers

    /// Find a property descriptor in this object or prototype chain
    private func findPropertyDescriptor(_ key: String) -> PropertyDescriptor? {
        if let descriptor = properties[key] {
            return descriptor
        }
        return prototype?.findPropertyDescriptor(key)
    }

    // MARK: - CustomStringConvertible

    public var description: String {
        "[object Object]"
    }

    // MARK: - Subscript Access

    public subscript(key: String) -> Value {
        get { getProperty(key) }
        set { try? setProperty(key, newValue) }
    }

    public subscript(index: Int) -> Value {
        get { getProperty(String(index)) }
        set { try? setProperty(String(index), newValue) }
    }
}

// MARK: - Equatable (Reference Equality)

extension JSObject: Equatable {
    public static func == (lhs: JSObject, rhs: JSObject) -> Bool {
        lhs === rhs
    }
}

