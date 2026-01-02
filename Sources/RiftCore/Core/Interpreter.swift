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

        // Global functions
        setupGlobalFunctions()
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
            // String prototype methods would go here
            return .undefined

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
