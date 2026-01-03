import Foundation

// MARK: - Interpreter

/// The main JavaScript interpreter that evaluates AST nodes
public class Interpreter {

    // MARK: - Properties

    /// The global environment
    public let globalEnvironment: Environment

    /// The current execution environment
    private var currentEnvironment: Environment

    /// The global object
    public let globalObject: JSObject

    /// Prototype objects for built-in types
    public private(set) var objectPrototype: JSObject!
    public private(set) var functionPrototype: JSObject!
    public private(set) var arrayPrototype: JSObject!
    public private(set) var stringPrototype: JSObject!
    public private(set) var numberPrototype: JSObject!
    public private(set) var booleanPrototype: JSObject!
    public private(set) var errorPrototype: JSObject!

    /// Stack depth for recursion limit
    private var callStackDepth: Int = 0
    private let maxCallStackDepth: Int = 10000

    // MARK: - Initialization

    public init() {
        // Create global object
        self.globalObject = JSObject()

        // Create global environment
        self.globalEnvironment = Environment.createGlobal(globalObject: globalObject)
        self.currentEnvironment = globalEnvironment

        // Set up prototypes and built-ins
        setupPrototypes()
        setupBuiltins()
    }

    // MARK: - Setup

    private func setupPrototypes() {
        // Object.prototype is the root of the prototype chain
        objectPrototype = JSObject(prototype: nil)

        // Function.prototype
        functionPrototype = JSObject(prototype: objectPrototype)

        // Array.prototype
        arrayPrototype = JSObject(prototype: objectPrototype)

        // String.prototype
        stringPrototype = JSObject(prototype: objectPrototype)

        // Number.prototype
        numberPrototype = JSObject(prototype: objectPrototype)

        // Boolean.prototype
        booleanPrototype = JSObject(prototype: objectPrototype)

        // Error.prototype
        errorPrototype = JSObject(prototype: objectPrototype)
    }

    private func setupBuiltins() {
        // console object
        let console = JSObject(prototype: objectPrototype)
        console["log"] = .object(JSFunction.native(name: "log", arity: 0) { [weak self] _, args in
            self?.consoleLog(args)
            return .undefined
        })
        console["warn"] = .object(JSFunction.native(name: "warn", arity: 0) { [weak self] _, args in
            self?.consoleLog(args, prefix: "Warning: ")
            return .undefined
        })
        console["error"] = .object(JSFunction.native(name: "error", arity: 0) { [weak self] _, args in
            self?.consoleLog(args, prefix: "Error: ")
            return .undefined
        })
        globalObject["console"] = .object(console)
        try? globalEnvironment.define("console", value: .object(console), kind: .var)

        // undefined
        try? globalEnvironment.define("undefined", value: .undefined, kind: .var)

        // NaN
        try? globalEnvironment.define("NaN", value: .number(.nan), kind: .var)

        // Infinity
        try? globalEnvironment.define("Infinity", value: .number(.infinity), kind: .var)

        // Math object
        setupMath()

        // Array.prototype methods
        setupArrayPrototype()

        // String.prototype methods
        setupStringPrototype()

        // Object methods
        setupObjectMethods()

        // JSON object
        setupJSON()

        // Global functions
        setupGlobalFunctions()
    }

    private func setupMath() {
        let math = JSObject(prototype: objectPrototype)

        // Constants
        math["E"] = .number(Double.pi.advanced(by: 0) == Double.pi ? 2.718281828459045 : Darwin.M_E)
        math["LN10"] = .number(2.302585092994046)
        math["LN2"] = .number(0.6931471805599453)
        math["LOG10E"] = .number(0.4342944819032518)
        math["LOG2E"] = .number(1.4426950408889634)
        math["PI"] = .number(Double.pi)
        math["SQRT1_2"] = .number(0.7071067811865476)
        math["SQRT2"] = .number(1.4142135623730951)

        // abs(x)
        math["abs"] = .object(JSFunction.native(name: "abs", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(abs(x))
        })

        // acos(x)
        math["acos"] = .object(JSFunction.native(name: "acos", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(acos(x))
        })

        // acosh(x)
        math["acosh"] = .object(JSFunction.native(name: "acosh", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(acosh(x))
        })

        // asin(x)
        math["asin"] = .object(JSFunction.native(name: "asin", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(asin(x))
        })

        // asinh(x)
        math["asinh"] = .object(JSFunction.native(name: "asinh", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(asinh(x))
        })

        // atan(x)
        math["atan"] = .object(JSFunction.native(name: "atan", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(atan(x))
        })

        // atanh(x)
        math["atanh"] = .object(JSFunction.native(name: "atanh", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(atanh(x))
        })

        // atan2(y, x)
        math["atan2"] = .object(JSFunction.native(name: "atan2", arity: 2) { _, args in
            let y = args.first?.toNumber() ?? .nan
            let x = args.count > 1 ? args[1].toNumber() : Double.nan
            return .number(atan2(y, x))
        })

        // cbrt(x)
        math["cbrt"] = .object(JSFunction.native(name: "cbrt", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(cbrt(x))
        })

        // ceil(x)
        math["ceil"] = .object(JSFunction.native(name: "ceil", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(ceil(x))
        })

        // clz32(x)
        math["clz32"] = .object(JSFunction.native(name: "clz32", arity: 1) { _, args in
            let x = args.first?.toUInt32() ?? 0
            return .number(Double(x.leadingZeroBitCount))
        })

        // cos(x)
        math["cos"] = .object(JSFunction.native(name: "cos", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(cos(x))
        })

        // cosh(x)
        math["cosh"] = .object(JSFunction.native(name: "cosh", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(cosh(x))
        })

        // exp(x)
        math["exp"] = .object(JSFunction.native(name: "exp", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(exp(x))
        })

        // expm1(x)
        math["expm1"] = .object(JSFunction.native(name: "expm1", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(expm1(x))
        })

        // floor(x)
        math["floor"] = .object(JSFunction.native(name: "floor", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(floor(x))
        })

        // fround(x) - round to nearest float32
        math["fround"] = .object(JSFunction.native(name: "fround", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(Double(Float(x)))
        })

        // hypot(...values)
        math["hypot"] = .object(JSFunction.native(name: "hypot", arity: 2) { _, args in
            if args.isEmpty { return .number(0) }
            let values = args.map { $0.toNumber() }
            if values.contains(where: { $0.isInfinite }) { return .number(.infinity) }
            if values.contains(where: { $0.isNaN }) { return .number(.nan) }
            let sumOfSquares = values.reduce(0.0) { $0 + $1 * $1 }
            return .number(sqrt(sumOfSquares))
        })

        // imul(a, b) - 32-bit integer multiplication
        math["imul"] = .object(JSFunction.native(name: "imul", arity: 2) { _, args in
            let a = args.first?.toInt32() ?? 0
            let b = args.count > 1 ? args[1].toInt32() : 0
            return .number(Double(a &* b))
        })

        // log(x)
        math["log"] = .object(JSFunction.native(name: "log", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(log(x))
        })

        // log1p(x)
        math["log1p"] = .object(JSFunction.native(name: "log1p", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(log1p(x))
        })

        // log10(x)
        math["log10"] = .object(JSFunction.native(name: "log10", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(log10(x))
        })

        // log2(x)
        math["log2"] = .object(JSFunction.native(name: "log2", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(log2(x))
        })

        // max(...values)
        math["max"] = .object(JSFunction.native(name: "max", arity: 2) { _, args in
            if args.isEmpty { return .number(-.infinity) }
            var result = -Double.infinity
            for arg in args {
                let n = arg.toNumber()
                if n.isNaN { return .number(.nan) }
                if n > result { result = n }
            }
            return .number(result)
        })

        // min(...values)
        math["min"] = .object(JSFunction.native(name: "min", arity: 2) { _, args in
            if args.isEmpty { return .number(.infinity) }
            var result = Double.infinity
            for arg in args {
                let n = arg.toNumber()
                if n.isNaN { return .number(.nan) }
                if n < result { result = n }
            }
            return .number(result)
        })

        // pow(base, exponent)
        math["pow"] = .object(JSFunction.native(name: "pow", arity: 2) { _, args in
            let base = args.first?.toNumber() ?? .nan
            let exponent = args.count > 1 ? args[1].toNumber() : Double.nan
            return .number(pow(base, exponent))
        })

        // random()
        math["random"] = .object(JSFunction.native(name: "random", arity: 0) { _, _ in
            return .number(Double.random(in: 0..<1))
        })

        // round(x) - JavaScript uses "round half up" (toward +∞ for .5)
        math["round"] = .object(JSFunction.native(name: "round", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            // floor(x + 0.5) gives JavaScript's round-half-up behavior
            return .number(floor(x + 0.5))
        })

        // sign(x)
        math["sign"] = .object(JSFunction.native(name: "sign", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            if x.isNaN { return .number(.nan) }
            if x == 0 { return .number(x) } // Preserve -0
            return .number(x > 0 ? 1 : -1)
        })

        // sin(x)
        math["sin"] = .object(JSFunction.native(name: "sin", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(sin(x))
        })

        // sinh(x)
        math["sinh"] = .object(JSFunction.native(name: "sinh", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(sinh(x))
        })

        // sqrt(x)
        math["sqrt"] = .object(JSFunction.native(name: "sqrt", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(sqrt(x))
        })

        // tan(x)
        math["tan"] = .object(JSFunction.native(name: "tan", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(tan(x))
        })

        // tanh(x)
        math["tanh"] = .object(JSFunction.native(name: "tanh", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(tanh(x))
        })

        // trunc(x)
        math["trunc"] = .object(JSFunction.native(name: "trunc", arity: 1) { _, args in
            let x = args.first?.toNumber() ?? .nan
            return .number(trunc(x))
        })

        globalObject["Math"] = .object(math)
        try? globalEnvironment.define("Math", value: .object(math), kind: .var)
    }

    private func setupArrayPrototype() {
        // push(...items) - adds elements to end, returns new length
        arrayPrototype["push"] = .object(JSFunction.native(name: "push", arity: 1) { [weak self] ctx, args in
            guard let self = self,
                  case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray else {
                return .undefined
            }
            return .number(Double(array.push(args)))
        })

        // pop() - removes and returns last element
        arrayPrototype["pop"] = .object(JSFunction.native(name: "pop", arity: 0) { ctx, _ in
            guard case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray else {
                return .undefined
            }
            return array.pop()
        })

        // shift() - removes and returns first element
        arrayPrototype["shift"] = .object(JSFunction.native(name: "shift", arity: 0) { ctx, _ in
            guard case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray else {
                return .undefined
            }
            return array.shift()
        })

        // unshift(...items) - adds elements to beginning, returns new length
        arrayPrototype["unshift"] = .object(JSFunction.native(name: "unshift", arity: 1) { ctx, args in
            guard case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray else {
                return .undefined
            }
            return .number(Double(array.unshift(args)))
        })

        // indexOf(searchElement, fromIndex?)
        arrayPrototype["indexOf"] = .object(JSFunction.native(name: "indexOf", arity: 1) { ctx, args in
            guard case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray else {
                return .number(-1)
            }
            let searchElement = args.first ?? .undefined
            let fromIndex = args.count > 1 ? Int(args[1].toNumber()) : 0
            return .number(Double(array.indexOf(searchElement, fromIndex: fromIndex)))
        })

        // lastIndexOf(searchElement, fromIndex?)
        arrayPrototype["lastIndexOf"] = .object(JSFunction.native(name: "lastIndexOf", arity: 1) { ctx, args in
            guard case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray else {
                return .number(-1)
            }
            let searchElement = args.first ?? .undefined
            let fromIndex = args.count > 1 ? Int(args[1].toNumber()) : nil
            return .number(Double(array.lastIndexOf(searchElement, fromIndex: fromIndex)))
        })

        // includes(searchElement, fromIndex?)
        arrayPrototype["includes"] = .object(JSFunction.native(name: "includes", arity: 1) { ctx, args in
            guard case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray else {
                return .boolean(false)
            }
            let searchElement = args.first ?? .undefined
            let fromIndex = args.count > 1 ? Int(args[1].toNumber()) : 0
            return .boolean(array.includes(searchElement, fromIndex: fromIndex))
        })

        // join(separator?)
        arrayPrototype["join"] = .object(JSFunction.native(name: "join", arity: 1) { ctx, args in
            guard case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray else {
                return .string("")
            }
            let separator = args.first.map { $0.isUndefined ? "," : $0.toString() } ?? ","
            return .string(array.join(separator: separator))
        })

        // reverse()
        arrayPrototype["reverse"] = .object(JSFunction.native(name: "reverse", arity: 0) { ctx, _ in
            guard case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray else {
                return .undefined
            }
            array.reverse()
            return .object(array)
        })

        // slice(start?, end?)
        arrayPrototype["slice"] = .object(JSFunction.native(name: "slice", arity: 2) { [weak self] ctx, args in
            guard let self = self,
                  case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray else {
                return .undefined
            }
            let start = args.count > 0 ? Int(args[0].toNumber()) : 0
            let end = args.count > 1 ? Int(args[1].toNumber()) : array.length
            let result = array.slice(start: start, end: end)
            result.prototype = self.arrayPrototype
            return .object(result)
        })

        // concat(...arrays)
        arrayPrototype["concat"] = .object(JSFunction.native(name: "concat", arity: 1) { [weak self] ctx, args in
            guard let self = self,
                  case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray else {
                return .undefined
            }
            var arrays: [JSArray] = []
            for arg in args {
                if case .object(let o) = arg, let arr = o as? JSArray {
                    arrays.append(arr)
                } else {
                    // Non-array values become single-element arrays
                    let singleArray = JSArray(elements: [arg])
                    arrays.append(singleArray)
                }
            }
            let result = array.concat(arrays)
            result.prototype = self.arrayPrototype
            return .object(result)
        })

        // forEach(callback, thisArg?)
        arrayPrototype["forEach"] = .object(JSFunction.native(name: "forEach", arity: 1) { [weak self] ctx, args in
            guard let self = self,
                  case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray,
                  let callbackArg = args.first,
                  case .object(let callbackObj) = callbackArg,
                  let callback = callbackObj as? JSFunction else {
                return .undefined
            }
            let thisArg = args.count > 1 ? args[1] : .undefined
            for i in 0..<array.length {
                if array.hasElement(at: i) {
                    let element = array.getElement(at: i) ?? .undefined
                    _ = try? self.callFunction(callback, thisValue: thisArg, arguments: [element, .number(Double(i)), .object(array)])
                }
            }
            return .undefined
        })

        // map(callback, thisArg?)
        arrayPrototype["map"] = .object(JSFunction.native(name: "map", arity: 1) { [weak self] ctx, args in
            guard let self = self,
                  case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray,
                  let callbackArg = args.first,
                  case .object(let callbackObj) = callbackArg,
                  let callback = callbackObj as? JSFunction else {
                return .undefined
            }
            let thisArg = args.count > 1 ? args[1] : .undefined
            let result = JSArray(prototype: self.arrayPrototype)
            for i in 0..<array.length {
                if array.hasElement(at: i) {
                    let element = array.getElement(at: i) ?? .undefined
                    if let value = try? self.callFunction(callback, thisValue: thisArg, arguments: [element, .number(Double(i)), .object(array)]) {
                        result.setElement(at: i, value: value)
                    }
                }
            }
            return .object(result)
        })

        // filter(callback, thisArg?)
        arrayPrototype["filter"] = .object(JSFunction.native(name: "filter", arity: 1) { [weak self] ctx, args in
            guard let self = self,
                  case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray,
                  let callbackArg = args.first,
                  case .object(let callbackObj) = callbackArg,
                  let callback = callbackObj as? JSFunction else {
                return .undefined
            }
            let thisArg = args.count > 1 ? args[1] : .undefined
            let result = JSArray(prototype: self.arrayPrototype)
            for i in 0..<array.length {
                if array.hasElement(at: i) {
                    let element = array.getElement(at: i) ?? .undefined
                    if let value = try? self.callFunction(callback, thisValue: thisArg, arguments: [element, .number(Double(i)), .object(array)]),
                       value.toBoolean() {
                        _ = result.push([element])
                    }
                }
            }
            return .object(result)
        })

        // reduce(callback, initialValue?)
        arrayPrototype["reduce"] = .object(JSFunction.native(name: "reduce", arity: 1) { [weak self] ctx, args in
            guard let self = self,
                  case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray,
                  let callbackArg = args.first,
                  case .object(let callbackObj) = callbackArg,
                  let callback = callbackObj as? JSFunction else {
                return .undefined
            }

            var accumulator: Value
            var startIndex = 0

            if args.count > 1 {
                accumulator = args[1]
            } else {
                // Find first non-hole element
                while startIndex < array.length && !array.hasElement(at: startIndex) {
                    startIndex += 1
                }
                guard startIndex < array.length else {
                    throw RuntimeError.typeError("Reduce of empty array with no initial value")
                }
                accumulator = array.getElement(at: startIndex) ?? .undefined
                startIndex += 1
            }

            for i in startIndex..<array.length {
                if array.hasElement(at: i) {
                    let element = array.getElement(at: i) ?? .undefined
                    accumulator = try self.callFunction(callback, thisValue: .undefined, arguments: [accumulator, element, .number(Double(i)), .object(array)])
                }
            }
            return accumulator
        })

        // reduceRight(callback, initialValue?)
        arrayPrototype["reduceRight"] = .object(JSFunction.native(name: "reduceRight", arity: 1) { [weak self] ctx, args in
            guard let self = self,
                  case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray,
                  let callbackArg = args.first,
                  case .object(let callbackObj) = callbackArg,
                  let callback = callbackObj as? JSFunction else {
                return .undefined
            }

            var accumulator: Value
            var startIndex = array.length - 1

            if args.count > 1 {
                accumulator = args[1]
            } else {
                while startIndex >= 0 && !array.hasElement(at: startIndex) {
                    startIndex -= 1
                }
                guard startIndex >= 0 else {
                    throw RuntimeError.typeError("Reduce of empty array with no initial value")
                }
                accumulator = array.getElement(at: startIndex) ?? .undefined
                startIndex -= 1
            }

            for i in stride(from: startIndex, through: 0, by: -1) {
                if array.hasElement(at: i) {
                    let element = array.getElement(at: i) ?? .undefined
                    accumulator = try self.callFunction(callback, thisValue: .undefined, arguments: [accumulator, element, .number(Double(i)), .object(array)])
                }
            }
            return accumulator
        })

        // find(callback, thisArg?)
        arrayPrototype["find"] = .object(JSFunction.native(name: "find", arity: 1) { [weak self] ctx, args in
            guard let self = self,
                  case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray,
                  let callbackArg = args.first,
                  case .object(let callbackObj) = callbackArg,
                  let callback = callbackObj as? JSFunction else {
                return .undefined
            }
            let thisArg = args.count > 1 ? args[1] : .undefined
            for i in 0..<array.length {
                let element = array.getElement(at: i) ?? .undefined
                if let result = try? self.callFunction(callback, thisValue: thisArg, arguments: [element, .number(Double(i)), .object(array)]),
                   result.toBoolean() {
                    return element
                }
            }
            return .undefined
        })

        // findIndex(callback, thisArg?)
        arrayPrototype["findIndex"] = .object(JSFunction.native(name: "findIndex", arity: 1) { [weak self] ctx, args in
            guard let self = self,
                  case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray,
                  let callbackArg = args.first,
                  case .object(let callbackObj) = callbackArg,
                  let callback = callbackObj as? JSFunction else {
                return .number(-1)
            }
            let thisArg = args.count > 1 ? args[1] : .undefined
            for i in 0..<array.length {
                let element = array.getElement(at: i) ?? .undefined
                if let result = try? self.callFunction(callback, thisValue: thisArg, arguments: [element, .number(Double(i)), .object(array)]),
                   result.toBoolean() {
                    return .number(Double(i))
                }
            }
            return .number(-1)
        })

        // every(callback, thisArg?)
        arrayPrototype["every"] = .object(JSFunction.native(name: "every", arity: 1) { [weak self] ctx, args in
            guard let self = self,
                  case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray,
                  let callbackArg = args.first,
                  case .object(let callbackObj) = callbackArg,
                  let callback = callbackObj as? JSFunction else {
                return .boolean(true)
            }
            let thisArg = args.count > 1 ? args[1] : .undefined
            for i in 0..<array.length {
                if array.hasElement(at: i) {
                    let element = array.getElement(at: i) ?? .undefined
                    if let result = try? self.callFunction(callback, thisValue: thisArg, arguments: [element, .number(Double(i)), .object(array)]),
                       !result.toBoolean() {
                        return .boolean(false)
                    }
                }
            }
            return .boolean(true)
        })

        // some(callback, thisArg?)
        arrayPrototype["some"] = .object(JSFunction.native(name: "some", arity: 1) { [weak self] ctx, args in
            guard let self = self,
                  case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray,
                  let callbackArg = args.first,
                  case .object(let callbackObj) = callbackArg,
                  let callback = callbackObj as? JSFunction else {
                return .boolean(false)
            }
            let thisArg = args.count > 1 ? args[1] : .undefined
            for i in 0..<array.length {
                if array.hasElement(at: i) {
                    let element = array.getElement(at: i) ?? .undefined
                    if let result = try? self.callFunction(callback, thisValue: thisArg, arguments: [element, .number(Double(i)), .object(array)]),
                       result.toBoolean() {
                        return .boolean(true)
                    }
                }
            }
            return .boolean(false)
        })

        // fill(value, start?, end?)
        arrayPrototype["fill"] = .object(JSFunction.native(name: "fill", arity: 1) { ctx, args in
            guard case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray else {
                return .undefined
            }
            let value = args.first ?? .undefined
            let len = array.length
            var start = args.count > 1 ? Int(args[1].toNumber()) : 0
            var end = args.count > 2 ? Int(args[2].toNumber()) : len

            // Normalize indices
            start = start < 0 ? max(len + start, 0) : min(start, len)
            end = end < 0 ? max(len + end, 0) : min(end, len)

            for i in start..<end {
                array.setElement(at: i, value: value)
            }
            return .object(array)
        })

        // at(index)
        arrayPrototype["at"] = .object(JSFunction.native(name: "at", arity: 1) { ctx, args in
            guard case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray else {
                return .undefined
            }
            var index = args.first.map { Int($0.toNumber()) } ?? 0
            if index < 0 {
                index = array.length + index
            }
            guard index >= 0 && index < array.length else {
                return .undefined
            }
            return array.getElement(at: index) ?? .undefined
        })

        // flat(depth?)
        arrayPrototype["flat"] = .object(JSFunction.native(name: "flat", arity: 1) { [weak self] ctx, args in
            guard let self = self,
                  case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray else {
                return .undefined
            }
            let depth = args.first.map { Int($0.toNumber()) } ?? 1

            func flatten(_ arr: JSArray, _ d: Int) -> [Value] {
                var result: [Value] = []
                for i in 0..<arr.length {
                    if let element = arr.getElement(at: i) {
                        if d > 0, case .object(let obj) = element, let nested = obj as? JSArray {
                            result.append(contentsOf: flatten(nested, d - 1))
                        } else {
                            result.append(element)
                        }
                    }
                }
                return result
            }

            let flattened = flatten(array, depth)
            return .object(JSArray(elements: flattened, prototype: self.arrayPrototype))
        })

        // toString()
        arrayPrototype["toString"] = .object(JSFunction.native(name: "toString", arity: 0) { ctx, _ in
            guard case .object(let obj) = ctx.thisValue,
                  let array = obj as? JSArray else {
                return .string("")
            }
            return .string(array.join(separator: ","))
        })

        // Array.isArray
        let arrayConstructor = JSObject(prototype: functionPrototype)
        arrayConstructor["isArray"] = .object(JSFunction.native(name: "isArray", arity: 1) { _, args in
            guard let first = args.first else { return .boolean(false) }
            return .boolean(JSArray.isArray(first))
        })

        // Array.from
        arrayConstructor["from"] = .object(JSFunction.native(name: "from", arity: 1) { [weak self] _, args in
            guard let self = self, let first = args.first else {
                return .object(JSArray(prototype: self?.arrayPrototype))
            }

            if case .object(let obj) = first, let sourceArray = obj as? JSArray {
                let result = JSArray(elements: sourceArray.toArray(), prototype: self.arrayPrototype)
                return .object(result)
            } else if case .string(let str) = first {
                let chars = str.map { Value.string(String($0)) }
                return .object(JSArray(elements: chars, prototype: self.arrayPrototype))
            }
            return .object(JSArray(prototype: self.arrayPrototype))
        })

        // Array.of
        arrayConstructor["of"] = .object(JSFunction.native(name: "of", arity: 0) { [weak self] _, args in
            guard let self = self else { return .undefined }
            return .object(JSArray(elements: args, prototype: self.arrayPrototype))
        })

        globalObject["Array"] = .object(arrayConstructor)
        try? globalEnvironment.define("Array", value: .object(arrayConstructor), kind: .var)
    }

    private func setupStringPrototype() {
        // charAt(index)
        stringPrototype["charAt"] = .object(JSFunction.native(name: "charAt", arity: 1) { ctx, args in
            guard case .string(let s) = ctx.thisValue else {
                return .string("")
            }
            let index = args.first.map { Int($0.toNumber()) } ?? 0
            guard index >= 0 && index < s.count else {
                return .string("")
            }
            let idx = s.index(s.startIndex, offsetBy: index)
            return .string(String(s[idx]))
        })

        // charCodeAt(index)
        stringPrototype["charCodeAt"] = .object(JSFunction.native(name: "charCodeAt", arity: 1) { ctx, args in
            guard case .string(let s) = ctx.thisValue else {
                return .number(.nan)
            }
            let index = args.first.map { Int($0.toNumber()) } ?? 0
            guard index >= 0 && index < s.count else {
                return .number(.nan)
            }
            let idx = s.index(s.startIndex, offsetBy: index)
            let scalar = s[idx].unicodeScalars.first?.value ?? 0
            return .number(Double(scalar))
        })

        // codePointAt(index)
        stringPrototype["codePointAt"] = .object(JSFunction.native(name: "codePointAt", arity: 1) { ctx, args in
            guard case .string(let s) = ctx.thisValue else {
                return .undefined
            }
            let index = args.first.map { Int($0.toNumber()) } ?? 0
            guard index >= 0 && index < s.count else {
                return .undefined
            }
            let idx = s.index(s.startIndex, offsetBy: index)
            let scalar = s[idx].unicodeScalars.first?.value ?? 0
            return .number(Double(scalar))
        })

        // concat(...strings)
        stringPrototype["concat"] = .object(JSFunction.native(name: "concat", arity: 1) { ctx, args in
            guard case .string(let s) = ctx.thisValue else {
                return .string("")
            }
            var result = s
            for arg in args {
                result += arg.toString()
            }
            return .string(result)
        })

        // includes(searchString, position?)
        stringPrototype["includes"] = .object(JSFunction.native(name: "includes", arity: 1) { ctx, args in
            guard case .string(let s) = ctx.thisValue else {
                return .boolean(false)
            }
            let searchString = args.first?.toString() ?? ""
            let position = args.count > 1 ? max(0, Int(args[1].toNumber())) : 0

            if position >= s.count {
                return .boolean(searchString.isEmpty)
            }

            let startIdx = s.index(s.startIndex, offsetBy: position)
            return .boolean(s[startIdx...].contains(searchString))
        })

        // indexOf(searchValue, fromIndex?)
        stringPrototype["indexOf"] = .object(JSFunction.native(name: "indexOf", arity: 1) { ctx, args in
            guard case .string(let s) = ctx.thisValue else {
                return .number(-1)
            }
            let searchString = args.first?.toString() ?? ""
            var fromIndex = args.count > 1 ? Int(args[1].toNumber()) : 0

            if fromIndex < 0 { fromIndex = 0 }
            if fromIndex >= s.count {
                return .number(searchString.isEmpty ? Double(s.count) : -1)
            }

            let startIdx = s.index(s.startIndex, offsetBy: fromIndex)
            if let range = s[startIdx...].range(of: searchString) {
                return .number(Double(s.distance(from: s.startIndex, to: range.lowerBound)))
            }
            return .number(-1)
        })

        // lastIndexOf(searchValue, fromIndex?)
        stringPrototype["lastIndexOf"] = .object(JSFunction.native(name: "lastIndexOf", arity: 1) { ctx, args in
            guard case .string(let s) = ctx.thisValue else {
                return .number(-1)
            }
            let searchString = args.first?.toString() ?? ""
            var fromIndex = args.count > 1 ? Int(args[1].toNumber()) : s.count

            if fromIndex < 0 { fromIndex = 0 }
            if fromIndex > s.count { fromIndex = s.count }

            let endIdx = s.index(s.startIndex, offsetBy: min(fromIndex + searchString.count, s.count))
            if let range = s[..<endIdx].range(of: searchString, options: .backwards) {
                return .number(Double(s.distance(from: s.startIndex, to: range.lowerBound)))
            }
            return .number(-1)
        })

        // slice(start, end?)
        stringPrototype["slice"] = .object(JSFunction.native(name: "slice", arity: 2) { ctx, args in
            guard case .string(let s) = ctx.thisValue else {
                return .string("")
            }
            let len = s.count
            var start = args.first.map { Int($0.toNumber()) } ?? 0
            var end = args.count > 1 && !args[1].isUndefined ? Int(args[1].toNumber()) : len

            // Normalize negative indices
            if start < 0 { start = max(len + start, 0) }
            if end < 0 { end = max(len + end, 0) }
            start = min(start, len)
            end = min(end, len)

            if start >= end { return .string("") }

            let startIdx = s.index(s.startIndex, offsetBy: start)
            let endIdx = s.index(s.startIndex, offsetBy: end)
            return .string(String(s[startIdx..<endIdx]))
        })

        // substring(start, end?)
        stringPrototype["substring"] = .object(JSFunction.native(name: "substring", arity: 2) { ctx, args in
            guard case .string(let s) = ctx.thisValue else {
                return .string("")
            }
            let len = s.count
            var start = args.first.map { Int($0.toNumber()) } ?? 0
            var end = args.count > 1 && !args[1].isUndefined ? Int(args[1].toNumber()) : len

            // Clamp to valid range
            start = max(0, min(start, len))
            end = max(0, min(end, len))

            // Swap if start > end
            if start > end { swap(&start, &end) }

            let startIdx = s.index(s.startIndex, offsetBy: start)
            let endIdx = s.index(s.startIndex, offsetBy: end)
            return .string(String(s[startIdx..<endIdx]))
        })

        // substr(start, length?) - deprecated but still widely used
        stringPrototype["substr"] = .object(JSFunction.native(name: "substr", arity: 2) { ctx, args in
            guard case .string(let s) = ctx.thisValue else {
                return .string("")
            }
            let len = s.count
            var start = args.first.map { Int($0.toNumber()) } ?? 0
            let length = args.count > 1 && !args[1].isUndefined ? max(0, Int(args[1].toNumber())) : len - start

            // Normalize negative start
            if start < 0 { start = max(len + start, 0) }
            start = min(start, len)

            let actualLength = min(length, len - start)
            if actualLength <= 0 { return .string("") }

            let startIdx = s.index(s.startIndex, offsetBy: start)
            let endIdx = s.index(startIdx, offsetBy: actualLength)
            return .string(String(s[startIdx..<endIdx]))
        })

        // split(separator, limit?)
        stringPrototype["split"] = .object(JSFunction.native(name: "split", arity: 2) { [weak self] ctx, args in
            guard let self = self,
                  case .string(let s) = ctx.thisValue else {
                return .object(JSArray(prototype: self?.arrayPrototype))
            }

            // If separator is undefined, return array with the whole string
            guard let separatorArg = args.first, !separatorArg.isUndefined else {
                return .object(JSArray(elements: [.string(s)], prototype: self.arrayPrototype))
            }

            let separator = separatorArg.toString()
            let limit = args.count > 1 && !args[1].isUndefined ? Int(args[1].toNumber()) : Int.max

            if limit == 0 {
                return .object(JSArray(prototype: self.arrayPrototype))
            }

            // Empty separator: split into characters
            if separator.isEmpty {
                let chars = s.prefix(limit).map { Value.string(String($0)) }
                return .object(JSArray(elements: Array(chars), prototype: self.arrayPrototype))
            }

            var result: [Value] = []
            var remaining = s
            while result.count < limit - 1 {
                if let range = remaining.range(of: separator) {
                    result.append(.string(String(remaining[..<range.lowerBound])))
                    remaining = String(remaining[range.upperBound...])
                } else {
                    break
                }
            }
            if result.count < limit {
                result.append(.string(remaining))
            }
            return .object(JSArray(elements: result, prototype: self.arrayPrototype))
        })

        // toLowerCase()
        stringPrototype["toLowerCase"] = .object(JSFunction.native(name: "toLowerCase", arity: 0) { ctx, _ in
            guard case .string(let s) = ctx.thisValue else {
                return .string("")
            }
            return .string(s.lowercased())
        })

        // toUpperCase()
        stringPrototype["toUpperCase"] = .object(JSFunction.native(name: "toUpperCase", arity: 0) { ctx, _ in
            guard case .string(let s) = ctx.thisValue else {
                return .string("")
            }
            return .string(s.uppercased())
        })

        // toLocaleLowerCase()
        stringPrototype["toLocaleLowerCase"] = .object(JSFunction.native(name: "toLocaleLowerCase", arity: 0) { ctx, _ in
            guard case .string(let s) = ctx.thisValue else {
                return .string("")
            }
            return .string(s.lowercased())
        })

        // toLocaleUpperCase()
        stringPrototype["toLocaleUpperCase"] = .object(JSFunction.native(name: "toLocaleUpperCase", arity: 0) { ctx, _ in
            guard case .string(let s) = ctx.thisValue else {
                return .string("")
            }
            return .string(s.uppercased())
        })

        // trim()
        stringPrototype["trim"] = .object(JSFunction.native(name: "trim", arity: 0) { ctx, _ in
            guard case .string(let s) = ctx.thisValue else {
                return .string("")
            }
            return .string(s.trimmingCharacters(in: .whitespacesAndNewlines))
        })

        // trimStart() / trimLeft()
        stringPrototype["trimStart"] = .object(JSFunction.native(name: "trimStart", arity: 0) { ctx, _ in
            guard case .string(let s) = ctx.thisValue else {
                return .string("")
            }
            var result = s
            while let first = result.first, first.isWhitespace || first.isNewline {
                result.removeFirst()
            }
            return .string(result)
        })
        stringPrototype["trimLeft"] = stringPrototype["trimStart"]

        // trimEnd() / trimRight()
        stringPrototype["trimEnd"] = .object(JSFunction.native(name: "trimEnd", arity: 0) { ctx, _ in
            guard case .string(let s) = ctx.thisValue else {
                return .string("")
            }
            var result = s
            while let last = result.last, last.isWhitespace || last.isNewline {
                result.removeLast()
            }
            return .string(result)
        })
        stringPrototype["trimRight"] = stringPrototype["trimEnd"]

        // repeat(count)
        stringPrototype["repeat"] = .object(JSFunction.native(name: "repeat", arity: 1) { ctx, args in
            guard case .string(let s) = ctx.thisValue else {
                return .string("")
            }
            let count = args.first.map { Int($0.toNumber()) } ?? 0
            guard count >= 0 else {
                return .string("")  // Should throw RangeError, but returning empty for now
            }
            return .string(String(repeating: s, count: count))
        })

        // replace(searchValue, replaceValue)
        stringPrototype["replace"] = .object(JSFunction.native(name: "replace", arity: 2) { ctx, args in
            guard case .string(let s) = ctx.thisValue else {
                return .string("")
            }
            let searchValue = args.first?.toString() ?? ""
            let replaceValue = args.count > 1 ? args[1].toString() : "undefined"

            if let range = s.range(of: searchValue) {
                return .string(s.replacingCharacters(in: range, with: replaceValue))
            }
            return .string(s)
        })

        // replaceAll(searchValue, replaceValue)
        stringPrototype["replaceAll"] = .object(JSFunction.native(name: "replaceAll", arity: 2) { ctx, args in
            guard case .string(let s) = ctx.thisValue else {
                return .string("")
            }
            let searchValue = args.first?.toString() ?? ""
            let replaceValue = args.count > 1 ? args[1].toString() : "undefined"

            if searchValue.isEmpty {
                // Insert replaceValue between each character
                var result = replaceValue
                for char in s {
                    result += String(char) + replaceValue
                }
                return .string(result)
            }

            return .string(s.replacingOccurrences(of: searchValue, with: replaceValue))
        })

        // startsWith(searchString, position?)
        stringPrototype["startsWith"] = .object(JSFunction.native(name: "startsWith", arity: 1) { ctx, args in
            guard case .string(let s) = ctx.thisValue else {
                return .boolean(false)
            }
            let searchString = args.first?.toString() ?? ""
            let position = args.count > 1 ? max(0, Int(args[1].toNumber())) : 0

            if position >= s.count {
                return .boolean(searchString.isEmpty)
            }

            let startIdx = s.index(s.startIndex, offsetBy: position)
            return .boolean(s[startIdx...].hasPrefix(searchString))
        })

        // endsWith(searchString, length?)
        stringPrototype["endsWith"] = .object(JSFunction.native(name: "endsWith", arity: 1) { ctx, args in
            guard case .string(let s) = ctx.thisValue else {
                return .boolean(false)
            }
            let searchString = args.first?.toString() ?? ""
            let endPosition = args.count > 1 && !args[1].isUndefined
                ? min(max(0, Int(args[1].toNumber())), s.count)
                : s.count

            let endIdx = s.index(s.startIndex, offsetBy: endPosition)
            return .boolean(s[..<endIdx].hasSuffix(searchString))
        })

        // padStart(targetLength, padString?)
        stringPrototype["padStart"] = .object(JSFunction.native(name: "padStart", arity: 1) { ctx, args in
            guard case .string(let s) = ctx.thisValue else {
                return .string("")
            }
            let targetLength = args.first.map { Int($0.toNumber()) } ?? 0
            let padString = args.count > 1 && !args[1].isUndefined ? args[1].toString() : " "

            if targetLength <= s.count || padString.isEmpty {
                return .string(s)
            }

            let padLength = targetLength - s.count
            var padding = ""
            while padding.count < padLength {
                padding += padString
            }
            return .string(String(padding.prefix(padLength)) + s)
        })

        // padEnd(targetLength, padString?)
        stringPrototype["padEnd"] = .object(JSFunction.native(name: "padEnd", arity: 1) { ctx, args in
            guard case .string(let s) = ctx.thisValue else {
                return .string("")
            }
            let targetLength = args.first.map { Int($0.toNumber()) } ?? 0
            let padString = args.count > 1 && !args[1].isUndefined ? args[1].toString() : " "

            if targetLength <= s.count || padString.isEmpty {
                return .string(s)
            }

            let padLength = targetLength - s.count
            var padding = ""
            while padding.count < padLength {
                padding += padString
            }
            return .string(s + String(padding.prefix(padLength)))
        })

        // at(index)
        stringPrototype["at"] = .object(JSFunction.native(name: "at", arity: 1) { ctx, args in
            guard case .string(let s) = ctx.thisValue else {
                return .undefined
            }
            var index = args.first.map { Int($0.toNumber()) } ?? 0
            if index < 0 {
                index = s.count + index
            }
            guard index >= 0 && index < s.count else {
                return .undefined
            }
            let idx = s.index(s.startIndex, offsetBy: index)
            return .string(String(s[idx]))
        })

        // toString()
        stringPrototype["toString"] = .object(JSFunction.native(name: "toString", arity: 0) { ctx, _ in
            guard case .string(let s) = ctx.thisValue else {
                return .string("")
            }
            return .string(s)
        })

        // valueOf()
        stringPrototype["valueOf"] = .object(JSFunction.native(name: "valueOf", arity: 0) { ctx, _ in
            guard case .string(let s) = ctx.thisValue else {
                return .string("")
            }
            return .string(s)
        })

        // localeCompare(compareString) - simplified implementation
        stringPrototype["localeCompare"] = .object(JSFunction.native(name: "localeCompare", arity: 1) { ctx, args in
            guard case .string(let s) = ctx.thisValue else {
                return .number(0)
            }
            let compareString = args.first?.toString() ?? ""
            let result = s.localizedCompare(compareString)
            return .number(Double(result.rawValue))
        })

        // normalize(form?) - simplified, returns string as-is
        stringPrototype["normalize"] = .object(JSFunction.native(name: "normalize", arity: 0) { ctx, _ in
            guard case .string(let s) = ctx.thisValue else {
                return .string("")
            }
            return .string(s)
        })

        // String constructor (as a function, converts to string)
        let stringConstructor = JSFunction.native(name: "String", arity: 1) { _, args in
            let value = args.first?.toString() ?? ""
            return .string(value)
        }

        // String.fromCharCode(...codes)
        stringConstructor["fromCharCode"] = .object(JSFunction.native(name: "fromCharCode", arity: 1) { _, args in
            let chars = args.compactMap { arg -> Character? in
                let code = Int(arg.toNumber())
                guard code >= 0 && code <= 0xFFFF else { return nil }
                return Character(UnicodeScalar(code)!)
            }
            return .string(String(chars))
        })

        // String.fromCodePoint(...codePoints)
        stringConstructor["fromCodePoint"] = .object(JSFunction.native(name: "fromCodePoint", arity: 1) { _, args in
            let chars = args.compactMap { arg -> Character? in
                let code = Int(arg.toNumber())
                guard code >= 0 && code <= 0x10FFFF,
                      let scalar = UnicodeScalar(code) else { return nil }
                return Character(scalar)
            }
            return .string(String(chars))
        })

        globalObject["String"] = .object(stringConstructor)
        try? globalEnvironment.define("String", value: .object(stringConstructor), kind: .var)
    }

    private func setupObjectMethods() {
        // Object.prototype methods

        // hasOwnProperty(prop)
        objectPrototype["hasOwnProperty"] = .object(JSFunction.native(name: "hasOwnProperty", arity: 1) { ctx, args in
            guard case .object(let obj) = ctx.thisValue,
                  let jsObj = obj as? JSObject else {
                return .boolean(false)
            }
            let prop = args.first?.toString() ?? ""
            return .boolean(jsObj.hasOwnProperty(prop))
        })

        // isPrototypeOf(obj)
        objectPrototype["isPrototypeOf"] = .object(JSFunction.native(name: "isPrototypeOf", arity: 1) { ctx, args in
            guard case .object(let thisObj) = ctx.thisValue,
                  let thisJsObj = thisObj as? JSObject,
                  let first = args.first,
                  case .object(let argObj) = first,
                  let argJsObj = argObj as? JSObject else {
                return .boolean(false)
            }
            var proto = argJsObj.prototype
            while let p = proto {
                if p === thisJsObj {
                    return .boolean(true)
                }
                proto = p.prototype
            }
            return .boolean(false)
        })

        // propertyIsEnumerable(prop)
        objectPrototype["propertyIsEnumerable"] = .object(JSFunction.native(name: "propertyIsEnumerable", arity: 1) { ctx, args in
            guard case .object(let obj) = ctx.thisValue,
                  let jsObj = obj as? JSObject else {
                return .boolean(false)
            }
            let prop = args.first?.toString() ?? ""
            if let descriptor = jsObj.getOwnPropertyDescriptor(prop) {
                return .boolean(descriptor.enumerable)
            }
            return .boolean(false)
        })

        // toString()
        objectPrototype["toString"] = .object(JSFunction.native(name: "toString", arity: 0) { ctx, _ in
            switch ctx.thisValue {
            case .undefined:
                return .string("[object Undefined]")
            case .null:
                return .string("[object Null]")
            case .boolean:
                return .string("[object Boolean]")
            case .number:
                return .string("[object Number]")
            case .string:
                return .string("[object String]")
            case .object(let obj):
                if obj is JSArray {
                    return .string("[object Array]")
                } else if obj is JSFunction {
                    return .string("[object Function]")
                }
                return .string("[object Object]")
            }
        })

        // valueOf()
        objectPrototype["valueOf"] = .object(JSFunction.native(name: "valueOf", arity: 0) { ctx, _ in
            return ctx.thisValue
        })

        // Object constructor
        let objectConstructor = JSFunction.native(name: "Object", arity: 1) { [weak self] _, args in
            guard let self = self else { return .undefined }
            if let first = args.first, !first.isNullish {
                // If given a value, convert to object (simplified - just return as-is for objects)
                if case .object = first {
                    return first
                }
                // For primitives, wrap in object (simplified)
                let obj = JSObject(prototype: self.objectPrototype)
                return .object(obj)
            }
            // No argument or null/undefined: create empty object
            return .object(JSObject(prototype: self.objectPrototype))
        }

        // Object.keys(obj)
        objectConstructor["keys"] = .object(JSFunction.native(name: "keys", arity: 1) { [weak self] _, args in
            guard let self = self,
                  let first = args.first,
                  case .object(let obj) = first,
                  let jsObj = obj as? JSObject else {
                return .object(JSArray(prototype: self?.arrayPrototype))
            }
            let keys = jsObj.enumerableKeys().map { Value.string($0) }
            return .object(JSArray(elements: keys, prototype: self.arrayPrototype))
        })

        // Object.values(obj)
        objectConstructor["values"] = .object(JSFunction.native(name: "values", arity: 1) { [weak self] _, args in
            guard let self = self,
                  let first = args.first,
                  case .object(let obj) = first,
                  let jsObj = obj as? JSObject else {
                return .object(JSArray(prototype: self?.arrayPrototype))
            }
            let values = jsObj.enumerableKeys().map { jsObj.getProperty($0) }
            return .object(JSArray(elements: values, prototype: self.arrayPrototype))
        })

        // Object.entries(obj)
        objectConstructor["entries"] = .object(JSFunction.native(name: "entries", arity: 1) { [weak self] _, args in
            guard let self = self,
                  let first = args.first,
                  case .object(let obj) = first,
                  let jsObj = obj as? JSObject else {
                return .object(JSArray(prototype: self?.arrayPrototype))
            }
            let entries = jsObj.enumerableKeys().map { key -> Value in
                let value = jsObj.getProperty(key)
                return .object(JSArray(elements: [.string(key), value], prototype: self.arrayPrototype))
            }
            return .object(JSArray(elements: entries, prototype: self.arrayPrototype))
        })

        // Object.assign(target, ...sources)
        objectConstructor["assign"] = .object(JSFunction.native(name: "assign", arity: 2) { _, args in
            guard let first = args.first,
                  case .object(let targetObj) = first,
                  let target = targetObj as? JSObject else {
                return args.first ?? .undefined
            }

            for i in 1..<args.count {
                if case .object(let sourceObj) = args[i],
                   let source = sourceObj as? JSObject {
                    for key in source.enumerableKeys() {
                        let value = source.getProperty(key)
                        try? target.setProperty(key, value)
                    }
                }
            }
            return .object(target)
        })

        // Object.create(proto, propertiesObject?)
        objectConstructor["create"] = .object(JSFunction.native(name: "create", arity: 2) { _, args in
            let proto: JSObject?
            if let first = args.first {
                if case .null = first {
                    proto = nil
                } else if case .object(let obj) = first, let jsObj = obj as? JSObject {
                    proto = jsObj
                } else {
                    proto = nil
                }
            } else {
                proto = nil
            }

            let newObj = JSObject(prototype: proto)

            // Handle properties object (simplified)
            if args.count > 1, case .object(let propsObj) = args[1], let props = propsObj as? JSObject {
                for key in props.enumerableKeys() {
                    let descriptor = props.getProperty(key)
                    if case .object(let descObj) = descriptor, let desc = descObj as? JSObject {
                        let value = desc.getProperty("value")
                        try? newObj.setProperty(key, value)
                    }
                }
            }

            return .object(newObj)
        })

        // Object.freeze(obj)
        objectConstructor["freeze"] = .object(JSFunction.native(name: "freeze", arity: 1) { _, args in
            guard let first = args.first,
                  case .object(let obj) = first,
                  let jsObj = obj as? JSObject else {
                return args.first ?? .undefined
            }
            jsObj.freeze()
            return .object(jsObj)
        })

        // Object.seal(obj)
        objectConstructor["seal"] = .object(JSFunction.native(name: "seal", arity: 1) { _, args in
            guard let first = args.first,
                  case .object(let obj) = first,
                  let jsObj = obj as? JSObject else {
                return args.first ?? .undefined
            }
            jsObj.seal()
            return .object(jsObj)
        })

        // Object.isFrozen(obj)
        objectConstructor["isFrozen"] = .object(JSFunction.native(name: "isFrozen", arity: 1) { _, args in
            guard let first = args.first,
                  case .object(let obj) = first,
                  let jsObj = obj as? JSObject else {
                return .boolean(true)  // Non-objects are considered frozen
            }
            return .boolean(jsObj.isFrozen)
        })

        // Object.isSealed(obj)
        objectConstructor["isSealed"] = .object(JSFunction.native(name: "isSealed", arity: 1) { _, args in
            guard let first = args.first,
                  case .object(let obj) = first,
                  let jsObj = obj as? JSObject else {
                return .boolean(true)  // Non-objects are considered sealed
            }
            return .boolean(jsObj.isSealed)
        })

        // Object.isExtensible(obj)
        objectConstructor["isExtensible"] = .object(JSFunction.native(name: "isExtensible", arity: 1) { _, args in
            guard let first = args.first,
                  case .object(let obj) = first,
                  let jsObj = obj as? JSObject else {
                return .boolean(false)  // Non-objects are not extensible
            }
            return .boolean(jsObj.isExtensible)
        })

        // Object.preventExtensions(obj)
        objectConstructor["preventExtensions"] = .object(JSFunction.native(name: "preventExtensions", arity: 1) { _, args in
            guard let first = args.first,
                  case .object(let obj) = first,
                  let jsObj = obj as? JSObject else {
                return args.first ?? .undefined
            }
            jsObj.preventExtensions()
            return .object(jsObj)
        })

        // Object.getOwnPropertyNames(obj)
        objectConstructor["getOwnPropertyNames"] = .object(JSFunction.native(name: "getOwnPropertyNames", arity: 1) { [weak self] _, args in
            guard let self = self,
                  let first = args.first,
                  case .object(let obj) = first,
                  let jsObj = obj as? JSObject else {
                return .object(JSArray(prototype: self?.arrayPrototype))
            }
            let names = jsObj.ownKeys().map { Value.string($0) }
            return .object(JSArray(elements: names, prototype: self.arrayPrototype))
        })

        // Object.getPrototypeOf(obj)
        objectConstructor["getPrototypeOf"] = .object(JSFunction.native(name: "getPrototypeOf", arity: 1) { _, args in
            guard let first = args.first,
                  case .object(let obj) = first,
                  let jsObj = obj as? JSObject else {
                return .null
            }
            if let proto = jsObj.prototype {
                return .object(proto)
            }
            return .null
        })

        // Object.setPrototypeOf(obj, proto)
        objectConstructor["setPrototypeOf"] = .object(JSFunction.native(name: "setPrototypeOf", arity: 2) { _, args in
            guard args.count >= 2,
                  case .object(let obj) = args[0],
                  let jsObj = obj as? JSObject else {
                return args.first ?? .undefined
            }

            if case .null = args[1] {
                jsObj.prototype = nil
            } else if case .object(let protoObj) = args[1], let proto = protoObj as? JSObject {
                jsObj.prototype = proto
            }
            return .object(jsObj)
        })

        // Object.fromEntries(iterable)
        objectConstructor["fromEntries"] = .object(JSFunction.native(name: "fromEntries", arity: 1) { [weak self] _, args in
            guard let self = self,
                  let first = args.first,
                  case .object(let obj) = first,
                  let array = obj as? JSArray else {
                return .object(JSObject(prototype: self?.objectPrototype))
            }

            let result = JSObject(prototype: self.objectPrototype)
            for i in 0..<array.length {
                if let entry = array.getElement(at: i),
                   case .object(let entryObj) = entry,
                   let entryArray = entryObj as? JSArray,
                   entryArray.length >= 2 {
                    let key = entryArray.getElement(at: 0)?.toString() ?? ""
                    let value = entryArray.getElement(at: 1) ?? .undefined
                    try? result.setProperty(key, value)
                }
            }
            return .object(result)
        })

        globalObject["Object"] = .object(objectConstructor)
        try? globalEnvironment.define("Object", value: .object(objectConstructor), kind: .var)
    }

    private func setupJSON() {
        let json = JSObject(prototype: objectPrototype)

        // JSON.parse(text, reviver?)
        json["parse"] = .object(JSFunction.native(name: "parse", arity: 1) { [weak self] _, args in
            guard let self = self else { return .undefined }
            let text = args.first?.toString() ?? ""

            // Use Swift's JSONSerialization to parse
            guard let data = text.data(using: .utf8) else {
                return .undefined
            }

            do {
                let jsonObject = try JSONSerialization.jsonObject(with: data, options: [.fragmentsAllowed])
                return self.jsonToValue(jsonObject)
            } catch {
                return .undefined  // Should throw SyntaxError
            }
        })

        // JSON.stringify(value, replacer?, space?)
        json["stringify"] = .object(JSFunction.native(name: "stringify", arity: 1) { [weak self] _, args in
            guard let self = self else { return .undefined }
            guard let value = args.first else { return .undefined }

            // Get space argument for indentation
            var indent = ""
            if args.count > 2 {
                let spaceArg = args[2]
                if case .number(let n) = spaceArg {
                    let spaces = min(max(Int(n), 0), 10)
                    indent = String(repeating: " ", count: spaces)
                } else if case .string(let s) = spaceArg {
                    indent = String(s.prefix(10))
                }
            }

            if let result = self.valueToJsonString(value, indent: indent, currentIndent: "") {
                return .string(result)
            }
            return .undefined
        })

        globalObject["JSON"] = .object(json)
        try? globalEnvironment.define("JSON", value: .object(json), kind: .var)
    }

    /// Convert a Swift JSON object to a JS Value
    private func jsonToValue(_ json: Any) -> Value {
        switch json {
        case is NSNull:
            return .null
        case let num as NSNumber:
            // Check if it's actually a boolean (CFBoolean)
            if CFGetTypeID(num) == CFBooleanGetTypeID() {
                return .boolean(num.boolValue)
            }
            return .number(num.doubleValue)
        case let str as String:
            return .string(str)
        case let arr as [Any]:
            let elements = arr.map { jsonToValue($0) }
            return .object(JSArray(elements: elements, prototype: arrayPrototype))
        case let dict as [String: Any]:
            let obj = JSObject(prototype: objectPrototype)
            for (key, value) in dict {
                try? obj.setProperty(key, jsonToValue(value))
            }
            return .object(obj)
        default:
            return .undefined
        }
    }

    /// Convert a JS Value to a JSON string
    private func valueToJsonString(_ value: Value, indent: String, currentIndent: String) -> String? {
        switch value {
        case .undefined:
            return nil  // undefined values are omitted
        case .null:
            return "null"
        case .boolean(let b):
            return b ? "true" : "false"
        case .number(let n):
            if n.isNaN || n.isInfinite {
                return "null"
            }
            if n == n.rounded() && abs(n) < Double(Int.max) {
                return String(Int(n))
            }
            return String(n)
        case .string(let s):
            return escapeJsonString(s)
        case .object(let obj):
            if let array = obj as? JSArray {
                return arrayToJsonString(array, indent: indent, currentIndent: currentIndent)
            } else if obj is JSFunction {
                return nil  // Functions are omitted
            } else if let jsObj = obj as? JSObject {
                return objectToJsonString(jsObj, indent: indent, currentIndent: currentIndent)
            }
            return nil
        }
    }

    /// Escape a string for JSON
    private func escapeJsonString(_ s: String) -> String {
        var result = "\""
        for char in s {
            switch char {
            case "\"": result += "\\\""
            case "\\": result += "\\\\"
            case "\n": result += "\\n"
            case "\r": result += "\\r"
            case "\t": result += "\\t"
            default:
                if char.asciiValue ?? 0 < 32 {
                    let hex = String(format: "\\u%04x", char.asciiValue ?? 0)
                    result += hex
                } else {
                    result.append(char)
                }
            }
        }
        result += "\""
        return result
    }

    /// Convert a JS array to JSON string
    private func arrayToJsonString(_ array: JSArray, indent: String, currentIndent: String) -> String {
        if array.length == 0 {
            return "[]"
        }

        var elements: [String] = []
        for i in 0..<array.length {
            if let element = array.getElement(at: i),
               let str = valueToJsonString(element, indent: indent, currentIndent: currentIndent + indent) {
                elements.append(str)
            } else {
                elements.append("null")
            }
        }

        if indent.isEmpty {
            return "[" + elements.joined(separator: ",") + "]"
        } else {
            let newIndent = currentIndent + indent
            return "[\n" + elements.map { newIndent + $0 }.joined(separator: ",\n") + "\n" + currentIndent + "]"
        }
    }

    /// Convert a JS object to JSON string
    private func objectToJsonString(_ obj: JSObject, indent: String, currentIndent: String) -> String {
        let keys = obj.enumerableKeys()
        if keys.isEmpty {
            return "{}"
        }

        var pairs: [String] = []
        for key in keys {
            let value = obj.getProperty(key)
            if let valueStr = valueToJsonString(value, indent: indent, currentIndent: currentIndent + indent) {
                let keyStr = escapeJsonString(key)
                if indent.isEmpty {
                    pairs.append("\(keyStr):\(valueStr)")
                } else {
                    pairs.append("\(keyStr): \(valueStr)")
                }
            }
        }

        if pairs.isEmpty {
            return "{}"
        }

        if indent.isEmpty {
            return "{" + pairs.joined(separator: ",") + "}"
        } else {
            let newIndent = currentIndent + indent
            return "{\n" + pairs.map { newIndent + $0 }.joined(separator: ",\n") + "\n" + currentIndent + "}"
        }
    }

    private func setupGlobalFunctions() {
        // isNaN
        let isNaN = JSFunction.native(name: "isNaN", arity: 1) { _, args in
            let num = args.first?.toNumber() ?? .nan
            return .boolean(num.isNaN)
        }
        globalObject["isNaN"] = .object(isNaN)
        try? globalEnvironment.define("isNaN", value: .object(isNaN), kind: .var)

        // isFinite
        let isFinite = JSFunction.native(name: "isFinite", arity: 1) { _, args in
            let num = args.first?.toNumber() ?? .nan
            return .boolean(num.isFinite)
        }
        globalObject["isFinite"] = .object(isFinite)
        try? globalEnvironment.define("isFinite", value: .object(isFinite), kind: .var)

        // parseInt
        let parseInt = JSFunction.native(name: "parseInt", arity: 2) { _, args in
            let string = args.first?.toString() ?? ""
            let radix = args.count > 1 ? Int(args[1].toNumber()) : 10
            guard radix == 0 || (radix >= 2 && radix <= 36) else {
                return .number(.nan)
            }
            let actualRadix = radix == 0 ? 10 : radix
            let trimmed = string.trimmingCharacters(in: .whitespaces)
            if let value = Int(trimmed, radix: actualRadix) {
                return .number(Double(value))
            }
            return .number(.nan)
        }
        globalObject["parseInt"] = .object(parseInt)
        try? globalEnvironment.define("parseInt", value: .object(parseInt), kind: .var)

        // parseFloat
        let parseFloat = JSFunction.native(name: "parseFloat", arity: 1) { _, args in
            let string = args.first?.toString() ?? ""
            let trimmed = string.trimmingCharacters(in: .whitespaces)
            if let value = Double(trimmed) {
                return .number(value)
            }
            return .number(.nan)
        }
        globalObject["parseFloat"] = .object(parseFloat)
        try? globalEnvironment.define("parseFloat", value: .object(parseFloat), kind: .var)
    }

    private func consoleLog(_ args: [Value], prefix: String = "") {
        let output = args.map { $0.toString() }.joined(separator: " ")
        print("\(prefix)\(output)")
    }

    // MARK: - Public API

    /// Execute JavaScript source code
    public func execute(_ source: String) throws -> Value {
        var lexer = Lexer(source: source)
        let tokens = try lexer.tokenize()
        var parser = Parser(tokens: tokens)
        let program = try parser.parse()
        return try evaluate(program)
    }

    /// Evaluate an AST program
    public func evaluate(_ program: Program) throws -> Value {
        var result: Value = .undefined
        for statement in program.body {
            result = try evaluateStatement(statement)
        }
        return result
    }

    // MARK: - Statement Evaluation

    private func evaluateStatement(_ stmt: Statement) throws -> Value {
        switch stmt {
        case let s as ExpressionStatement:
            return try evaluateExpression(s.expression)

        case let s as BlockStatement:
            return try evaluateBlock(s)

        case let s as VariableDeclaration:
            return try evaluateVariableDeclaration(s)

        case let s as FunctionDeclaration:
            return try evaluateFunctionDeclaration(s)

        case let s as IfStatement:
            return try evaluateIf(s)

        case let s as WhileStatement:
            return try evaluateWhile(s)

        case let s as DoWhileStatement:
            return try evaluateDoWhile(s)

        case let s as ForStatement:
            return try evaluateFor(s)

        case let s as ForInStatement:
            return try evaluateForIn(s)

        case let s as ForOfStatement:
            return try evaluateForOf(s)

        case let s as SwitchStatement:
            return try evaluateSwitch(s)

        case let s as ReturnStatement:
            let value = try s.argument.map { try evaluateExpression($0) } ?? .undefined
            throw ReturnValue(value)

        case let s as ThrowStatement:
            let value = try evaluateExpression(s.argument)
            throw ThrowValue(value, location: s.location)

        case let s as TryStatement:
            return try evaluateTry(s)

        case let s as BreakStatement:
            throw BreakException(label: s.label)

        case let s as ContinueStatement:
            throw ContinueException(label: s.label)

        case let s as LabeledStatement:
            return try evaluateLabeledStatement(s)

        case is EmptyStatement:
            return .undefined

        case is DebuggerStatement:
            // No-op for debugger statement
            return .undefined

        default:
            throw RuntimeError.internalError("Unknown statement type: \(type(of: stmt))")
        }
    }

    private func evaluateBlock(_ block: BlockStatement) throws -> Value {
        let previousEnv = currentEnvironment
        currentEnvironment = currentEnvironment.createBlockScope()
        defer { currentEnvironment = previousEnv }

        var result: Value = .undefined
        for statement in block.body {
            result = try evaluateStatement(statement)
        }
        return result
    }

    private func evaluateVariableDeclaration(_ decl: VariableDeclaration) throws -> Value {
        let kind: VariableKind
        switch decl.kind {
        case .var: kind = .var
        case .let: kind = .let
        case .const: kind = .const
        }

        for declarator in decl.declarations {
            let value: Value
            if let initializer = declarator.initializer {
                value = try evaluateExpression(initializer)
            } else {
                value = .undefined
            }
            try currentEnvironment.define(declarator.name, value: value, kind: kind)
        }

        return .undefined
    }

    private func evaluateFunctionDeclaration(_ decl: FunctionDeclaration) throws -> Value {
        let function = createFunction(
            name: decl.name,
            parameters: decl.parameters.map { $0.name },
            defaults: decl.parameters.map { $0.defaultValue },
            body: .block(decl.body),
            isConstructor: true
        )

        try currentEnvironment.define(decl.name, value: .object(function), kind: .functionDeclaration)
        return .undefined
    }

    private func evaluateIf(_ stmt: IfStatement) throws -> Value {
        let test = try evaluateExpression(stmt.test)
        if test.isTruthy {
            return try evaluateStatement(stmt.consequent)
        } else if let alternate = stmt.alternate {
            return try evaluateStatement(alternate)
        }
        return .undefined
    }

    private func evaluateWhile(_ stmt: WhileStatement) throws -> Value {
        var result: Value = .undefined

        while true {
            let test = try evaluateExpression(stmt.test)
            guard test.isTruthy else { break }

            do {
                result = try evaluateStatement(stmt.body)
            } catch is BreakException {
                break
            } catch is ContinueException {
                continue
            }
        }

        return result
    }

    private func evaluateDoWhile(_ stmt: DoWhileStatement) throws -> Value {
        var result: Value = .undefined

        repeat {
            do {
                result = try evaluateStatement(stmt.body)
            } catch is BreakException {
                break
            } catch is ContinueException {
                // Continue to test
            }

            let test = try evaluateExpression(stmt.test)
            guard test.isTruthy else { break }
        } while true

        return result
    }

    private func evaluateFor(_ stmt: ForStatement) throws -> Value {
        let previousEnv = currentEnvironment
        currentEnvironment = currentEnvironment.createBlockScope()
        defer { currentEnvironment = previousEnv }

        // Initialize
        if let initializer = stmt.initializer {
            switch initializer {
            case .variable(let decl):
                _ = try evaluateVariableDeclaration(decl)
            case .expression(let expr):
                _ = try evaluateExpression(expr)
            }
        }

        var result: Value = .undefined

        while true {
            // Test
            if let test = stmt.test {
                let testResult = try evaluateExpression(test)
                guard testResult.isTruthy else { break }
            }

            // Body
            do {
                result = try evaluateStatement(stmt.body)
            } catch is BreakException {
                break
            } catch is ContinueException {
                // Fall through to update
            }

            // Update
            if let update = stmt.update {
                _ = try evaluateExpression(update)
            }
        }

        return result
    }

    private func evaluateForIn(_ stmt: ForInStatement) throws -> Value {
        let object = try evaluateExpression(stmt.right)

        guard case .object(let obj) = object else {
            return .undefined
        }

        let jsObj = obj as? JSObject ?? JSObject()
        let keys = jsObj.allEnumerableKeys()

        var result: Value = .undefined

        for key in keys {
            let previousEnv = currentEnvironment
            currentEnvironment = currentEnvironment.createBlockScope()

            // Bind the key to the loop variable
            switch stmt.left {
            case .variable(let decl):
                let kind: VariableKind
                switch decl.kind {
                case .var: kind = .var
                case .let: kind = .let
                case .const: kind = .const
                }
                try currentEnvironment.define(decl.declarations[0].name, value: .string(key), kind: kind)
            case .expression(let expr):
                try assignToExpression(expr, value: .string(key))
            }

            do {
                result = try evaluateStatement(stmt.body)
            } catch is BreakException {
                currentEnvironment = previousEnv
                break
            } catch is ContinueException {
                currentEnvironment = previousEnv
                continue
            }

            currentEnvironment = previousEnv
        }

        return result
    }

    private func evaluateForOf(_ stmt: ForOfStatement) throws -> Value {
        let iterable = try evaluateExpression(stmt.right)

        // For now, only support arrays
        guard case .object(let obj) = iterable, let array = obj as? JSArray else {
            throw RuntimeError.notIterable(iterable.typeOf)
        }

        var result: Value = .undefined

        for i in 0..<array.length {
            let value = array[i]

            let previousEnv = currentEnvironment
            currentEnvironment = currentEnvironment.createBlockScope()

            // Bind the value to the loop variable
            switch stmt.left {
            case .variable(let decl):
                let kind: VariableKind
                switch decl.kind {
                case .var: kind = .var
                case .let: kind = .let
                case .const: kind = .const
                }
                try currentEnvironment.define(decl.declarations[0].name, value: value, kind: kind)
            case .expression(let expr):
                try assignToExpression(expr, value: value)
            }

            do {
                result = try evaluateStatement(stmt.body)
            } catch is BreakException {
                currentEnvironment = previousEnv
                break
            } catch is ContinueException {
                currentEnvironment = previousEnv
                continue
            }

            currentEnvironment = previousEnv
        }

        return result
    }

    private func evaluateSwitch(_ stmt: SwitchStatement) throws -> Value {
        let discriminant = try evaluateExpression(stmt.discriminant)
        var result: Value = .undefined
        var matched = false

        caseLoop: for switchCase in stmt.cases {
            if !matched {
                if let test = switchCase.test {
                    let testValue = try evaluateExpression(test)
                    matched = discriminant.strictEquals(testValue)
                } else {
                    // default case
                    matched = true
                }
            }

            if matched {
                for consequent in switchCase.consequent {
                    do {
                        result = try evaluateStatement(consequent)
                    } catch is BreakException {
                        break caseLoop
                    }
                }
            }
        }

        return result
    }

    private func evaluateTry(_ stmt: TryStatement) throws -> Value {
        var result: Value = .undefined
        var caughtError: Error? = nil

        do {
            result = try evaluateBlock(stmt.block)
        } catch let thrown as ThrowValue {
            if let handler = stmt.handler {
                let previousEnv = currentEnvironment
                currentEnvironment = currentEnvironment.createBlockScope()

                if let param = handler.parameter {
                    try currentEnvironment.define(param, value: thrown.value, kind: .let)
                }

                result = try evaluateBlock(handler.body)
                currentEnvironment = previousEnv
            } else {
                caughtError = thrown
            }
        } catch {
            caughtError = error
        }

        // Always run finally block
        if let finalizer = stmt.finalizer {
            _ = try evaluateBlock(finalizer)
        }

        // Re-throw if we caught an error without a handler
        if let error = caughtError {
            throw error
        }

        return result
    }

    private func evaluateLabeledStatement(_ stmt: LabeledStatement) throws -> Value {
        do {
            return try evaluateStatement(stmt.body)
        } catch let e as BreakException where e.label == stmt.label {
            return .undefined
        } catch let e as ContinueException where e.label == stmt.label {
            return .undefined
        }
    }

    // MARK: - Expression Evaluation

    private func evaluateExpression(_ expr: Expression) throws -> Value {
        switch expr {
        case let e as LiteralExpression:
            return evaluateLiteral(e)

        case let e as IdentifierExpression:
            return try currentEnvironment.get(e.name)

        case is ThisExpression:
            return try currentEnvironment.get("this")

        case let e as BinaryExpression:
            return try evaluateBinary(e)

        case let e as UnaryExpression:
            return try evaluateUnary(e)

        case let e as UpdateExpression:
            return try evaluateUpdate(e)

        case let e as AssignmentExpression:
            return try evaluateAssignment(e)

        case let e as ConditionalExpression:
            return try evaluateConditional(e)

        case let e as CallExpression:
            return try evaluateCall(e)

        case let e as NewExpression:
            return try evaluateNew(e)

        case let e as MemberExpression:
            return try evaluateMember(e)

        case let e as ArrayExpression:
            return try evaluateArray(e)

        case let e as ObjectExpression:
            return try evaluateObject(e)

        case let e as FunctionExpression:
            return try evaluateFunctionExpression(e)

        case let e as SequenceExpression:
            return try evaluateSequence(e)

        default:
            throw RuntimeError.internalError("Unknown expression type: \(type(of: expr))")
        }
    }

    private func evaluateLiteral(_ expr: LiteralExpression) -> Value {
        switch expr.value {
        case .null: return .null
        case .undefined: return .undefined
        case .boolean(let b): return .boolean(b)
        case .number(let n): return .number(n)
        case .string(let s): return .string(s)
        }
    }

    private func evaluateBinary(_ expr: BinaryExpression) throws -> Value {
        // Short-circuit evaluation for && and ||
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

        if expr.operator == .nullishCoalescing {
            let left = try evaluateExpression(expr.left)
            if !left.isNullish { return left }
            return try evaluateExpression(expr.right)
        }

        let left = try evaluateExpression(expr.left)
        let right = try evaluateExpression(expr.right)

        switch expr.operator {
        // Arithmetic
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
        case .exponent:
            return .number(pow(left.toNumber(), right.toNumber()))

        // Comparison
        case .equal:
            return .boolean(left.looseEquals(right))
        case .notEqual:
            return .boolean(!left.looseEquals(right))
        case .strictEqual:
            return .boolean(left.strictEquals(right))
        case .strictNotEqual:
            return .boolean(!left.strictEquals(right))
        case .lessThan:
            return .boolean(left.toNumber() < right.toNumber())
        case .lessThanOrEqual:
            return .boolean(left.toNumber() <= right.toNumber())
        case .greaterThan:
            return .boolean(left.toNumber() > right.toNumber())
        case .greaterThanOrEqual:
            return .boolean(left.toNumber() >= right.toNumber())

        // Bitwise
        case .bitwiseAnd:
            return .number(Double(left.toInt32() & right.toInt32()))
        case .bitwiseOr:
            return .number(Double(left.toInt32() | right.toInt32()))
        case .bitwiseXor:
            return .number(Double(left.toInt32() ^ right.toInt32()))
        case .leftShift:
            return .number(Double(left.toInt32() << (right.toUInt32() & 0x1F)))
        case .rightShift:
            return .number(Double(left.toInt32() >> (right.toUInt32() & 0x1F)))
        case .unsignedRightShift:
            return .number(Double(left.toUInt32() >> (right.toUInt32() & 0x1F)))

        // instanceof
        case .instanceof:
            return try evaluateInstanceof(left, right)

        // in
        case .in:
            return try evaluateIn(left, right)

        // Short-circuit operators already handled above
        case .and, .or, .nullishCoalescing:
            fatalError("Should be handled above")
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

    private func evaluateInstanceof(_ left: Value, _ right: Value) throws -> Value {
        guard case .object(let constructor) = right else {
            throw RuntimeError.typeError("Right-hand side of 'instanceof' is not an object")
        }

        guard case .object(let obj) = left else {
            return .boolean(false)
        }

        guard let jsObj = obj as? JSObject,
              let jsCtor = constructor as? JSFunction,
              let ctorProto = jsCtor.constructorPrototype else {
            return .boolean(false)
        }

        var proto = jsObj.prototype
        while let p = proto {
            if p === ctorProto {
                return .boolean(true)
            }
            proto = p.prototype
        }

        return .boolean(false)
    }

    private func evaluateIn(_ left: Value, _ right: Value) throws -> Value {
        guard case .object(let obj) = right, let jsObj = obj as? JSObject else {
            throw RuntimeError.typeError("Cannot use 'in' operator to search for '\(left.toString())' in \(right.typeOf)")
        }

        let key = left.toString()
        return .boolean(jsObj.hasProperty(key))
    }

    private func evaluateUnary(_ expr: UnaryExpression) throws -> Value {
        switch expr.operator {
        case .not:
            let operand = try evaluateExpression(expr.operand)
            return .boolean(!operand.isTruthy)

        case .negative:
            let operand = try evaluateExpression(expr.operand)
            return .number(-operand.toNumber())

        case .positive:
            let operand = try evaluateExpression(expr.operand)
            return .number(operand.toNumber())

        case .bitwiseNot:
            let operand = try evaluateExpression(expr.operand)
            return .number(Double(~operand.toInt32()))

        case .typeof:
            let operand = try evaluateExpression(expr.operand)
            return .string(operand.typeOf)

        case .void:
            _ = try evaluateExpression(expr.operand)
            return .undefined

        case .delete:
            return try evaluateDelete(expr.operand)
        }
    }

    private func evaluateDelete(_ operand: Expression) throws -> Value {
        if let member = operand as? MemberExpression {
            let object = try evaluateExpression(member.object)
            guard case .object(let obj) = object, let jsObj = obj as? JSObject else {
                return .boolean(true)
            }

            let key: String
            if member.computed {
                key = try evaluateExpression(member.property).toString()
            } else if let id = member.property as? IdentifierExpression {
                key = id.name
            } else {
                return .boolean(false)
            }

            return .boolean((try? jsObj.deleteProperty(key)) ?? false)
        }

        return .boolean(true)
    }

    private func evaluateUpdate(_ expr: UpdateExpression) throws -> Value {
        let currentValue = try evaluateExpression(expr.operand)
        let currentNumber = currentValue.toNumber()

        let newValue: Value
        switch expr.operator {
        case .increment:
            newValue = .number(currentNumber + 1)
        case .decrement:
            newValue = .number(currentNumber - 1)
        }

        try assignToExpression(expr.operand, value: newValue)

        return expr.prefix ? newValue : .number(currentNumber)
    }

    private func evaluateAssignment(_ expr: AssignmentExpression) throws -> Value {
        let right = try evaluateExpression(expr.right)

        let value: Value
        if expr.operator == .assign {
            value = right
        } else {
            let left = try evaluateExpression(expr.left)
            switch expr.operator {
            case .assign:
                value = right  // Already handled above
            case .addAssign:
                value = performAddition(left, right)
            case .subtractAssign:
                value = .number(left.toNumber() - right.toNumber())
            case .multiplyAssign:
                value = .number(left.toNumber() * right.toNumber())
            case .divideAssign:
                value = .number(left.toNumber() / right.toNumber())
            case .moduloAssign:
                value = .number(left.toNumber().truncatingRemainder(dividingBy: right.toNumber()))
            case .exponentAssign:
                value = .number(pow(left.toNumber(), right.toNumber()))
            case .bitwiseAndAssign:
                value = .number(Double(left.toInt32() & right.toInt32()))
            case .bitwiseOrAssign:
                value = .number(Double(left.toInt32() | right.toInt32()))
            case .bitwiseXorAssign:
                value = .number(Double(left.toInt32() ^ right.toInt32()))
            case .leftShiftAssign:
                value = .number(Double(left.toInt32() << (right.toUInt32() & 0x1F)))
            case .rightShiftAssign:
                value = .number(Double(left.toInt32() >> (right.toUInt32() & 0x1F)))
            case .unsignedRightShiftAssign:
                value = .number(Double(left.toUInt32() >> (right.toUInt32() & 0x1F)))
            case .andAssign:
                if !left.isTruthy { return left }
                value = right
            case .orAssign:
                if left.isTruthy { return left }
                value = right
            case .nullishAssign:
                if !left.isNullish { return left }
                value = right
            }
        }

        try assignToExpression(expr.left, value: value)
        return value
    }

    private func assignToExpression(_ expr: Expression, value: Value) throws {
        if let id = expr as? IdentifierExpression {
            try currentEnvironment.set(id.name, value: value)
        } else if let member = expr as? MemberExpression {
            let object = try evaluateExpression(member.object)
            guard case .object(let obj) = object, let jsObj = obj as? JSObject else {
                throw RuntimeError.typeError("Cannot set property of \(object.typeOf)")
            }

            let key: String
            if member.computed {
                key = try evaluateExpression(member.property).toString()
            } else if let id = member.property as? IdentifierExpression {
                key = id.name
            } else {
                throw RuntimeError.typeError("Invalid property access")
            }

            try jsObj.setProperty(key, value)
        } else {
            throw RuntimeError.typeError("Invalid assignment target")
        }
    }

    private func evaluateConditional(_ expr: ConditionalExpression) throws -> Value {
        let test = try evaluateExpression(expr.test)
        if test.isTruthy {
            return try evaluateExpression(expr.consequent)
        } else {
            return try evaluateExpression(expr.alternate)
        }
    }

    private func evaluateCall(_ expr: CallExpression) throws -> Value {
        let callee = try evaluateExpression(expr.callee)

        guard case .object(let obj) = callee, let function = obj as? JSFunction else {
            throw RuntimeError.notAFunction(callee.typeOf)
        }

        // Determine 'this' value
        var thisValue: Value = .undefined
        if let memberExpr = expr.callee as? MemberExpression {
            thisValue = try evaluateExpression(memberExpr.object)
        }

        // Evaluate arguments
        var args: [Value] = []
        for arg in expr.arguments {
            if let spread = arg as? SpreadElement {
                let spreadValue = try evaluateExpression(spread.argument)
                if case .object(let obj) = spreadValue, let array = obj as? JSArray {
                    args.append(contentsOf: array.toArray())
                } else {
                    throw RuntimeError.notIterable(spreadValue.typeOf)
                }
            } else {
                args.append(try evaluateExpression(arg))
            }
        }

        return try callFunction(function, thisValue: thisValue, arguments: args)
    }

    private func evaluateNew(_ expr: NewExpression) throws -> Value {
        let callee = try evaluateExpression(expr.callee)

        guard case .object(let obj) = callee, let function = obj as? JSFunction else {
            throw RuntimeError.notConstructable(callee.typeOf)
        }

        guard function.isConstructor else {
            throw RuntimeError.notConstructable(function.name ?? "anonymous")
        }

        // Evaluate arguments
        var args: [Value] = []
        for arg in expr.arguments {
            args.append(try evaluateExpression(arg))
        }

        // Create the new instance
        let instance = try function.construct(
            context: CallContext(newTarget: function),
            arguments: args
        )

        // For user-defined functions, call the function with the new instance as 'this'
        if !function.isNative {
            let result = try callFunction(function, thisValue: .object(instance), arguments: args, isConstruct: true)
            // If the function returns an object, use that instead
            if case .object = result {
                return result
            }
        }

        return .object(instance)
    }

    private func evaluateMember(_ expr: MemberExpression) throws -> Value {
        let object = try evaluateExpression(expr.object)

        // Handle optional chaining
        if expr.optional && object.isNullish {
            return .undefined
        }

        let key: String
        if expr.computed {
            key = try evaluateExpression(expr.property).toString()
        } else if let id = expr.property as? IdentifierExpression {
            key = id.name
        } else {
            throw RuntimeError.typeError("Invalid property access")
        }

        // Get property from object
        switch object {
        case .object(let obj):
            if let jsObj = obj as? JSObject {
                return jsObj.getProperty(key)
            }
            return .undefined

        case .string(let s):
            // String indexing and properties
            if key == "length" {
                return .number(Double(s.count))
            }
            if let index = Int(key), index >= 0 && index < s.count {
                let idx = s.index(s.startIndex, offsetBy: index)
                return .string(String(s[idx]))
            }
            // String prototype methods
            return stringPrototype.getProperty(key)

        case .null, .undefined:
            throw RuntimeError.typeError("Cannot read property '\(key)' of \(object.typeOf)")

        default:
            return .undefined
        }
    }

    private func evaluateArray(_ expr: ArrayExpression) throws -> Value {
        let array = JSArray(prototype: arrayPrototype)

        for (index, element) in expr.elements.enumerated() {
            switch element {
            case .expression(let e):
                let value = try evaluateExpression(e)
                array.setElement(at: index, value: value)
            case .hole:
                // Leave as hole (sparse array)
                array.length = index + 1
            case .spread(let e):
                let spreadValue = try evaluateExpression(e)
                if case .object(let obj) = spreadValue, let spreadArray = obj as? JSArray {
                    for i in 0..<spreadArray.length {
                        array.setElement(at: array.length, value: spreadArray[i])
                    }
                } else {
                    throw RuntimeError.notIterable(spreadValue.typeOf)
                }
            }
        }

        return .object(array)
    }

    private func evaluateObject(_ expr: ObjectExpression) throws -> Value {
        let object = JSObject(prototype: objectPrototype)

        for property in expr.properties {
            let key: String
            if property.computed {
                key = try evaluateExpression(property.key).toString()
            } else if let id = property.key as? IdentifierExpression {
                key = id.name
            } else if let lit = property.key as? LiteralExpression {
                switch lit.value {
                case .string(let s): key = s
                case .number(let n): key = Value.number(n).toString()
                case .boolean(let b): key = b ? "true" : "false"
                case .null: key = "null"
                case .undefined: key = "undefined"
                }
            } else {
                throw RuntimeError.typeError("Invalid property key")
            }

            let value = try evaluateExpression(property.value)
            try object.setProperty(key, value)
        }

        return .object(object)
    }

    private func evaluateFunctionExpression(_ expr: FunctionExpression) throws -> Value {
        let function = createFunction(
            name: expr.name,
            parameters: expr.parameters.map { $0.name },
            defaults: expr.parameters.map { $0.defaultValue },
            body: expr.body,
            isArrow: expr.isArrow,
            isConstructor: !expr.isArrow
        )
        return .object(function)
    }

    private func evaluateSequence(_ expr: SequenceExpression) throws -> Value {
        var result: Value = .undefined
        for expression in expr.expressions {
            result = try evaluateExpression(expression)
        }
        return result
    }

    // MARK: - Function Helpers

    private func createFunction(
        name: String?,
        parameters: [String],
        defaults: [Expression?],
        body: FunctionExpression.FunctionBody,
        isArrow: Bool = false,
        isConstructor: Bool = true
    ) -> JSFunction {
        let bodyNode: JSFunction.FunctionBodyNode
        switch body {
        case .block(let block):
            bodyNode = .block(block)
        case .expression(let expr):
            bodyNode = .expression(expr)
        }

        return JSFunction(
            name: name,
            parameters: parameters,
            defaults: defaults,
            body: bodyNode,
            closure: currentEnvironment,
            isConstructor: isConstructor && !isArrow,
            prototype: functionPrototype
        )
    }

    private func callFunction(
        _ function: JSFunction,
        thisValue: Value,
        arguments: [Value],
        isConstruct: Bool = false
    ) throws -> Value {
        // Check stack depth
        callStackDepth += 1
        guard callStackDepth <= maxCallStackDepth else {
            callStackDepth -= 1
            throw RuntimeError.stackOverflow
        }
        defer { callStackDepth -= 1 }

        // For native functions, use the native call
        if function.isNative {
            let context = CallContext(thisValue: thisValue)
            return try function.call(context: context, arguments: arguments)
        }

        // For user-defined functions
        guard let params = function.parameters,
              let defaults = function.parameterDefaults,
              let bodyNode = function.functionBody,
              let closure = function.closureEnvironment else {
            throw RuntimeError.internalError("Invalid user-defined function")
        }

        // Create new environment for the function
        let previousEnv = currentEnvironment
        currentEnvironment = closure.createFunctionScope()

        // Bind 'this'
        try currentEnvironment.define("this", value: thisValue, kind: .var)

        // Bind 'arguments' object
        let argsArray = JSArray(elements: arguments, prototype: arrayPrototype)
        try currentEnvironment.define("arguments", value: .object(argsArray), kind: .var)

        // Bind parameters
        for (index, param) in params.enumerated() {
            let value: Value
            if index < arguments.count {
                value = arguments[index]
            } else if let defaultExpr = defaults[index] {
                value = try evaluateExpression(defaultExpr)
            } else {
                value = .undefined
            }
            try currentEnvironment.define(param, value: value, kind: .var)
        }

        defer { currentEnvironment = previousEnv }

        // Execute the function body
        do {
            switch bodyNode {
            case .block(let block):
                _ = try evaluateBlock(block)
            case .expression(let expr):
                return try evaluateExpression(expr)
            }
            return .undefined
        } catch let returnValue as ReturnValue {
            return returnValue.value
        }
    }
}
