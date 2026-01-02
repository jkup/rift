import Foundation

// MARK: - Call Context

/// Context passed to function calls
public struct CallContext {
    /// The 'this' value for the call
    public var thisValue: Value
    /// The 'new.target' value (nil if not a constructor call)
    public var newTarget: JSObject?
    /// Whether this is a strict mode call
    public var isStrict: Bool

    public init(thisValue: Value = .undefined, newTarget: JSObject? = nil, isStrict: Bool = false) {
        self.thisValue = thisValue
        self.newTarget = newTarget
        self.isStrict = isStrict
    }
}

// MARK: - Native Function Type

/// A native function implemented in Swift
public typealias NativeFunction = (CallContext, [Value]) throws -> Value

/// A native constructor implemented in Swift
public typealias NativeConstructor = (CallContext, [Value]) throws -> JSObject

// MARK: - JSFunction

/// JavaScript function object
public class JSFunction: JSObject {

    // MARK: - Function Body Types

    public enum FunctionBody {
        /// Native function implemented in Swift
        case native(NativeFunction)

        /// User-defined function from parsed JavaScript
        case userDefined(
            parameters: [String],
            defaults: [Expression?],
            body: FunctionBodyNode,
            closure: Environment
        )

        /// Bound function (result of .bind())
        case bound(target: JSFunction, boundThis: Value, boundArgs: [Value])
    }

    /// The type of function body (block or expression for arrow functions)
    public enum FunctionBodyNode {
        case block(BlockStatement)
        case expression(Expression)
    }

    // MARK: - Properties

    /// The function's body implementation
    public let body: FunctionBody

    /// The function's name (may be nil for anonymous functions)
    public let name: String?

    /// Number of expected parameters (for .length property)
    public let arity: Int

    /// Whether this function can be used as a constructor
    private let canConstruct: Bool

    /// Native constructor implementation (if any)
    private var nativeConstructor: NativeConstructor?

    /// Prototype object for instances created by this constructor
    public var constructorPrototype: JSObject?

    // MARK: - Initialization

    /// Create a native function
    public init(
        name: String? = nil,
        arity: Int = 0,
        prototype: JSObject? = nil,
        isConstructor: Bool = false,
        body: @escaping NativeFunction
    ) {
        self.name = name
        self.arity = arity
        self.body = .native(body)
        self.canConstruct = isConstructor
        super.init(prototype: prototype)
        setupFunctionProperties()
    }

    /// Create a native constructor
    public init(
        name: String? = nil,
        arity: Int = 0,
        prototype: JSObject? = nil,
        constructor: @escaping NativeConstructor,
        call: NativeFunction? = nil
    ) {
        self.name = name
        self.arity = arity
        self.nativeConstructor = constructor
        self.canConstruct = true

        if let call = call {
            self.body = .native(call)
        } else {
            // Default: calling as function throws
            self.body = .native { _, _ in
                throw RuntimeError.notConstructable(name ?? "anonymous")
            }
        }

        super.init(prototype: prototype)
        setupFunctionProperties()

        // Set up constructor prototype
        let proto = JSObject()
        proto["constructor"] = .object(self)
        self.constructorPrototype = proto
        self["prototype"] = .object(proto)
    }

    /// Create a user-defined function
    public init(
        name: String? = nil,
        parameters: [String],
        defaults: [Expression?],
        body: FunctionBodyNode,
        closure: Environment,
        isConstructor: Bool = true,
        prototype: JSObject? = nil
    ) {
        self.name = name
        self.arity = parameters.count
        self.body = .userDefined(parameters: parameters, defaults: defaults, body: body, closure: closure)
        self.canConstruct = isConstructor
        super.init(prototype: prototype)
        setupFunctionProperties()

        // Set up constructor prototype for user-defined functions
        if isConstructor {
            let proto = JSObject()
            proto["constructor"] = .object(self)
            self.constructorPrototype = proto
            self["prototype"] = .object(proto)
        }
    }

    /// Create a bound function
    public init(
        target: JSFunction,
        boundThis: Value,
        boundArgs: [Value],
        prototype: JSObject? = nil
    ) {
        self.name = target.name.map { "bound \($0)" }
        self.arity = max(0, target.arity - boundArgs.count)
        self.body = .bound(target: target, boundThis: boundThis, boundArgs: boundArgs)
        self.canConstruct = target.canConstruct
        super.init(prototype: prototype)
        setupFunctionProperties()
    }

    // MARK: - Setup

    private func setupFunctionProperties() {
        // Set up the standard function properties
        try? defineProperty("length", .data(.number(Double(arity)), writable: false, enumerable: false, configurable: true))
        if let name = name {
            try? defineProperty("name", .data(.string(name), writable: false, enumerable: false, configurable: true))
        }
    }

    // MARK: - JSObject Overrides

    public override var typeOf: String {
        "function"
    }

    public override var isCallable: Bool {
        true
    }

    public override var isConstructor: Bool {
        canConstruct
    }

    /// String representation of this function
    public var functionString: String {
        if let name = name {
            return "function \(name)() { [native code] }"
        }
        return "function() { [native code] }"
    }

    // MARK: - Function Invocation

    /// Call the function with given context and arguments
    /// Note: For user-defined functions, the actual evaluation happens in the Interpreter
    public func call(context: CallContext, arguments: [Value]) throws -> Value {
        switch body {
        case .native(let fn):
            return try fn(context, arguments)

        case .userDefined:
            // User-defined functions must be evaluated by the interpreter
            // This method is primarily for native functions
            throw RuntimeError.internalError("User-defined functions must be called through the interpreter")

        case .bound(let target, let boundThis, let boundArgs):
            // For bound functions, use the bound this value and prepend bound args
            let newContext = CallContext(
                thisValue: boundThis,
                newTarget: context.newTarget,
                isStrict: context.isStrict
            )
            return try target.call(context: newContext, arguments: boundArgs + arguments)
        }
    }

    /// Construct a new instance using this function
    public func construct(context: CallContext, arguments: [Value]) throws -> JSObject {
        guard canConstruct else {
            throw RuntimeError.notConstructable(name ?? "anonymous")
        }

        // If we have a native constructor, use it
        if let constructor = nativeConstructor {
            return try constructor(context, arguments)
        }

        // For user-defined functions, construction is handled by the interpreter
        // This creates the basic object that will be passed as 'this'
        let instance = JSObject(prototype: constructorPrototype)
        return instance
    }

    // MARK: - Binding

    /// Create a bound version of this function
    public func bind(thisArg: Value, args: [Value] = []) -> JSFunction {
        JSFunction(target: self, boundThis: thisArg, boundArgs: args, prototype: prototype)
    }

    // MARK: - Accessors for User-Defined Functions

    /// Get the parameters for a user-defined function
    public var parameters: [String]? {
        if case .userDefined(let params, _, _, _) = body {
            return params
        }
        return nil
    }

    /// Get the default values for parameters
    public var parameterDefaults: [Expression?]? {
        if case .userDefined(_, let defaults, _, _) = body {
            return defaults
        }
        return nil
    }

    /// Get the body for a user-defined function
    public var functionBody: FunctionBodyNode? {
        if case .userDefined(_, _, let bodyNode, _) = body {
            return bodyNode
        }
        return nil
    }

    /// Get the closure environment for a user-defined function
    public var closureEnvironment: Environment? {
        if case .userDefined(_, _, _, let closure) = body {
            return closure
        }
        return nil
    }

    /// Check if this is a native function
    public var isNative: Bool {
        if case .native = body { return true }
        return false
    }

    /// Check if this is a bound function
    public var isBound: Bool {
        if case .bound = body { return true }
        return false
    }
}

// MARK: - Factory Methods

extension JSFunction {
    /// Create a simple native function
    public static func native(
        name: String? = nil,
        arity: Int = 0,
        _ body: @escaping NativeFunction
    ) -> JSFunction {
        JSFunction(name: name, arity: arity, body: body)
    }

    /// Create a native function that ignores 'this'
    public static func staticNative(
        name: String? = nil,
        arity: Int = 0,
        _ body: @escaping ([Value]) throws -> Value
    ) -> JSFunction {
        JSFunction(name: name, arity: arity) { _, args in
            try body(args)
        }
    }
}
