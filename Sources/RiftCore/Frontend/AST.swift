import Foundation

// MARK: - Base Protocols

/// Base protocol for all AST nodes
public protocol ASTNode {
    var location: SourceLocation { get }
}

/// Protocol for expression nodes (produce values)
public protocol Expression: ASTNode {}

/// Protocol for statement nodes (perform actions)
public protocol Statement: ASTNode {}

// MARK: - Program

/// The root AST node representing a complete program
public struct Program: ASTNode {
    public let location: SourceLocation
    public let body: [Statement]

    public init(location: SourceLocation, body: [Statement]) {
        self.location = location
        self.body = body
    }
}

// MARK: - Expressions

/// Literal value expression (number, string, boolean, null, undefined)
public struct LiteralExpression: Expression {
    public let location: SourceLocation
    public let value: LiteralValue

    public enum LiteralValue: Equatable {
        case number(Double)
        case string(String)
        case boolean(Bool)
        case null
        case undefined
    }

    public init(location: SourceLocation, value: LiteralValue) {
        self.location = location
        self.value = value
    }
}

/// Identifier expression (variable reference)
public struct IdentifierExpression: Expression {
    public let location: SourceLocation
    public let name: String

    public init(location: SourceLocation, name: String) {
        self.location = location
        self.name = name
    }
}

/// This expression
public struct ThisExpression: Expression {
    public let location: SourceLocation

    public init(location: SourceLocation) {
        self.location = location
    }
}

/// Binary operation expression (a + b, a && b, etc.)
public struct BinaryExpression: Expression {
    public let location: SourceLocation
    public let `operator`: BinaryOperator
    public let left: Expression
    public let right: Expression

    public enum BinaryOperator: String {
        // Arithmetic
        case add = "+"
        case subtract = "-"
        case multiply = "*"
        case divide = "/"
        case modulo = "%"
        case exponent = "**"

        // Comparison
        case equal = "=="
        case notEqual = "!="
        case strictEqual = "==="
        case strictNotEqual = "!=="
        case lessThan = "<"
        case lessThanOrEqual = "<="
        case greaterThan = ">"
        case greaterThanOrEqual = ">="

        // Logical
        case and = "&&"
        case or = "||"
        case nullishCoalescing = "??"

        // Bitwise
        case bitwiseAnd = "&"
        case bitwiseOr = "|"
        case bitwiseXor = "^"
        case leftShift = "<<"
        case rightShift = ">>"
        case unsignedRightShift = ">>>"

        // Other
        case `in` = "in"
        case instanceof = "instanceof"
    }

    public init(location: SourceLocation, operator: BinaryOperator, left: Expression, right: Expression) {
        self.location = location
        self.operator = `operator`
        self.left = left
        self.right = right
    }
}

/// Unary operation expression (!a, -a, typeof a, etc.)
public struct UnaryExpression: Expression {
    public let location: SourceLocation
    public let `operator`: UnaryOperator
    public let operand: Expression
    public let prefix: Bool

    public enum UnaryOperator: String {
        case not = "!"
        case negative = "-"
        case positive = "+"
        case typeof = "typeof"
        case void = "void"
        case delete = "delete"
        case bitwiseNot = "~"
    }

    public init(location: SourceLocation, operator: UnaryOperator, operand: Expression, prefix: Bool = true) {
        self.location = location
        self.operator = `operator`
        self.operand = operand
        self.prefix = prefix
    }
}

/// Update expression (++a, a++, --a, a--)
public struct UpdateExpression: Expression {
    public let location: SourceLocation
    public let `operator`: UpdateOperator
    public let operand: Expression
    public let prefix: Bool

    public enum UpdateOperator: String {
        case increment = "++"
        case decrement = "--"
    }

    public init(location: SourceLocation, operator: UpdateOperator, operand: Expression, prefix: Bool) {
        self.location = location
        self.operator = `operator`
        self.operand = operand
        self.prefix = prefix
    }
}

/// Assignment expression (a = b, a += b, etc.)
public struct AssignmentExpression: Expression {
    public let location: SourceLocation
    public let `operator`: AssignmentOperator
    public let left: Expression
    public let right: Expression

    public enum AssignmentOperator: String {
        case assign = "="
        case addAssign = "+="
        case subtractAssign = "-="
        case multiplyAssign = "*="
        case divideAssign = "/="
        case moduloAssign = "%="
        case exponentAssign = "**="
        case leftShiftAssign = "<<="
        case rightShiftAssign = ">>="
        case unsignedRightShiftAssign = ">>>="
        case bitwiseAndAssign = "&="
        case bitwiseOrAssign = "|="
        case bitwiseXorAssign = "^="
        case andAssign = "&&="
        case orAssign = "||="
        case nullishAssign = "??="
    }

    public init(location: SourceLocation, operator: AssignmentOperator, left: Expression, right: Expression) {
        self.location = location
        self.operator = `operator`
        self.left = left
        self.right = right
    }
}

/// Conditional (ternary) expression (a ? b : c)
public struct ConditionalExpression: Expression {
    public let location: SourceLocation
    public let test: Expression
    public let consequent: Expression
    public let alternate: Expression

    public init(location: SourceLocation, test: Expression, consequent: Expression, alternate: Expression) {
        self.location = location
        self.test = test
        self.consequent = consequent
        self.alternate = alternate
    }
}

/// Call expression (func(arg1, arg2))
public struct CallExpression: Expression {
    public let location: SourceLocation
    public let callee: Expression
    public let arguments: [Expression]

    public init(location: SourceLocation, callee: Expression, arguments: [Expression]) {
        self.location = location
        self.callee = callee
        self.arguments = arguments
    }
}

/// New expression (new Foo(arg1, arg2))
public struct NewExpression: Expression {
    public let location: SourceLocation
    public let callee: Expression
    public let arguments: [Expression]

    public init(location: SourceLocation, callee: Expression, arguments: [Expression]) {
        self.location = location
        self.callee = callee
        self.arguments = arguments
    }
}

/// Member expression (obj.prop, obj[expr])
public struct MemberExpression: Expression {
    public let location: SourceLocation
    public let object: Expression
    public let property: Expression
    public let computed: Bool  // true for obj[prop], false for obj.prop
    public let optional: Bool  // true for obj?.prop

    public init(location: SourceLocation, object: Expression, property: Expression, computed: Bool, optional: Bool = false) {
        self.location = location
        self.object = object
        self.property = property
        self.computed = computed
        self.optional = optional
    }
}

/// Array literal expression ([1, 2, 3])
public struct ArrayExpression: Expression {
    public let location: SourceLocation
    public let elements: [ArrayElement]

    public enum ArrayElement {
        case expression(Expression)
        case spread(Expression)
        case hole  // for sparse arrays like [1,,3]
    }

    public init(location: SourceLocation, elements: [ArrayElement]) {
        self.location = location
        self.elements = elements
    }
}

/// Object literal expression ({ a: 1, b: 2 })
public struct ObjectExpression: Expression {
    public let location: SourceLocation
    public let properties: [ObjectProperty]

    public struct ObjectProperty {
        public let key: Expression
        public let value: Expression
        public let computed: Bool
        public let shorthand: Bool  // { a } is shorthand for { a: a }
        public let kind: Kind

        public enum Kind {
            case initializer
            case get
            case set
        }

        public init(key: Expression, value: Expression, computed: Bool = false, shorthand: Bool = false, kind: Kind = .initializer) {
            self.key = key
            self.value = value
            self.computed = computed
            self.shorthand = shorthand
            self.kind = kind
        }
    }

    public init(location: SourceLocation, properties: [ObjectProperty]) {
        self.location = location
        self.properties = properties
    }
}

/// Function expression (function(a, b) { ... } or (a, b) => { ... })
public struct FunctionExpression: Expression {
    public let location: SourceLocation
    public let name: String?
    public let parameters: [Parameter]
    public let body: FunctionBody
    public let isArrow: Bool
    public let isAsync: Bool
    public let isGenerator: Bool

    public struct Parameter {
        public let name: String
        public let defaultValue: Expression?

        public init(name: String, defaultValue: Expression? = nil) {
            self.name = name
            self.defaultValue = defaultValue
        }
    }

    public enum FunctionBody {
        case block(BlockStatement)
        case expression(Expression)  // For arrow functions: (a) => a + 1
    }

    public init(location: SourceLocation, name: String? = nil, parameters: [Parameter], body: FunctionBody, isArrow: Bool = false, isAsync: Bool = false, isGenerator: Bool = false) {
        self.location = location
        self.name = name
        self.parameters = parameters
        self.body = body
        self.isArrow = isArrow
        self.isAsync = isAsync
        self.isGenerator = isGenerator
    }
}

/// Sequence expression (a, b, c) - evaluates all, returns last
public struct SequenceExpression: Expression {
    public let location: SourceLocation
    public let expressions: [Expression]

    public init(location: SourceLocation, expressions: [Expression]) {
        self.location = location
        self.expressions = expressions
    }
}

/// Spread element (...arr)
public struct SpreadElement: Expression {
    public let location: SourceLocation
    public let argument: Expression

    public init(location: SourceLocation, argument: Expression) {
        self.location = location
        self.argument = argument
    }
}

// MARK: - Statements

/// Expression statement (an expression used as a statement)
public struct ExpressionStatement: Statement {
    public let location: SourceLocation
    public let expression: Expression

    public init(location: SourceLocation, expression: Expression) {
        self.location = location
        self.expression = expression
    }
}

/// Block statement ({ ... })
public struct BlockStatement: Statement {
    public let location: SourceLocation
    public let body: [Statement]

    public init(location: SourceLocation, body: [Statement]) {
        self.location = location
        self.body = body
    }
}

/// Empty statement (;)
public struct EmptyStatement: Statement {
    public let location: SourceLocation

    public init(location: SourceLocation) {
        self.location = location
    }
}

/// Variable declaration (var/let/const x = y)
public struct VariableDeclaration: Statement {
    public let location: SourceLocation
    public let kind: Kind
    public let declarations: [Declarator]

    public enum Kind: String {
        case `var`
        case `let`
        case `const`
    }

    public struct Declarator {
        public let name: String
        public let initializer: Expression?

        public init(name: String, initializer: Expression? = nil) {
            self.name = name
            self.initializer = initializer
        }
    }

    public init(location: SourceLocation, kind: Kind, declarations: [Declarator]) {
        self.location = location
        self.kind = kind
        self.declarations = declarations
    }
}

/// Function declaration (function foo() { ... })
public struct FunctionDeclaration: Statement {
    public let location: SourceLocation
    public let name: String
    public let parameters: [FunctionExpression.Parameter]
    public let body: BlockStatement
    public let isAsync: Bool
    public let isGenerator: Bool

    public init(location: SourceLocation, name: String, parameters: [FunctionExpression.Parameter], body: BlockStatement, isAsync: Bool = false, isGenerator: Bool = false) {
        self.location = location
        self.name = name
        self.parameters = parameters
        self.body = body
        self.isAsync = isAsync
        self.isGenerator = isGenerator
    }
}

/// If statement (if (test) { ... } else { ... })
public struct IfStatement: Statement {
    public let location: SourceLocation
    public let test: Expression
    public let consequent: Statement
    public let alternate: Statement?

    public init(location: SourceLocation, test: Expression, consequent: Statement, alternate: Statement? = nil) {
        self.location = location
        self.test = test
        self.consequent = consequent
        self.alternate = alternate
    }
}

/// While statement (while (test) { ... })
public struct WhileStatement: Statement {
    public let location: SourceLocation
    public let test: Expression
    public let body: Statement

    public init(location: SourceLocation, test: Expression, body: Statement) {
        self.location = location
        self.test = test
        self.body = body
    }
}

/// Do-while statement (do { ... } while (test))
public struct DoWhileStatement: Statement {
    public let location: SourceLocation
    public let body: Statement
    public let test: Expression

    public init(location: SourceLocation, body: Statement, test: Expression) {
        self.location = location
        self.body = body
        self.test = test
    }
}

/// For statement (for (init; test; update) { ... })
public struct ForStatement: Statement {
    public let location: SourceLocation
    public let initializer: ForInitializer?
    public let test: Expression?
    public let update: Expression?
    public let body: Statement

    public enum ForInitializer {
        case variable(VariableDeclaration)
        case expression(Expression)
    }

    public init(location: SourceLocation, initializer: ForInitializer?, test: Expression?, update: Expression?, body: Statement) {
        self.location = location
        self.initializer = initializer
        self.test = test
        self.update = update
        self.body = body
    }
}

/// Left-hand side of for-in/for-of loops
public enum ForLoopLeft {
    case variable(VariableDeclaration)
    case expression(Expression)
}

/// For-in statement (for (x in obj) { ... })
public struct ForInStatement: Statement {
    public let location: SourceLocation
    public let left: ForLoopLeft
    public let right: Expression
    public let body: Statement

    public init(location: SourceLocation, left: ForLoopLeft, right: Expression, body: Statement) {
        self.location = location
        self.left = left
        self.right = right
        self.body = body
    }
}

/// For-of statement (for (x of iterable) { ... })
public struct ForOfStatement: Statement {
    public let location: SourceLocation
    public let left: ForLoopLeft
    public let right: Expression
    public let body: Statement
    public let isAwait: Bool

    public init(location: SourceLocation, left: ForLoopLeft, right: Expression, body: Statement, isAwait: Bool = false) {
        self.location = location
        self.left = left
        self.right = right
        self.body = body
        self.isAwait = isAwait
    }
}

/// Switch statement
public struct SwitchStatement: Statement {
    public let location: SourceLocation
    public let discriminant: Expression
    public let cases: [SwitchCase]

    public struct SwitchCase {
        public let test: Expression?  // nil for default
        public let consequent: [Statement]

        public init(test: Expression?, consequent: [Statement]) {
            self.test = test
            self.consequent = consequent
        }
    }

    public init(location: SourceLocation, discriminant: Expression, cases: [SwitchCase]) {
        self.location = location
        self.discriminant = discriminant
        self.cases = cases
    }
}

/// Return statement (return expr)
public struct ReturnStatement: Statement {
    public let location: SourceLocation
    public let argument: Expression?

    public init(location: SourceLocation, argument: Expression? = nil) {
        self.location = location
        self.argument = argument
    }
}

/// Throw statement (throw expr)
public struct ThrowStatement: Statement {
    public let location: SourceLocation
    public let argument: Expression

    public init(location: SourceLocation, argument: Expression) {
        self.location = location
        self.argument = argument
    }
}

/// Try statement (try { ... } catch (e) { ... } finally { ... })
public struct TryStatement: Statement {
    public let location: SourceLocation
    public let block: BlockStatement
    public let handler: CatchClause?
    public let finalizer: BlockStatement?

    public struct CatchClause {
        public let parameter: String?
        public let body: BlockStatement

        public init(parameter: String?, body: BlockStatement) {
            self.parameter = parameter
            self.body = body
        }
    }

    public init(location: SourceLocation, block: BlockStatement, handler: CatchClause?, finalizer: BlockStatement?) {
        self.location = location
        self.block = block
        self.handler = handler
        self.finalizer = finalizer
    }
}

/// Break statement
public struct BreakStatement: Statement {
    public let location: SourceLocation
    public let label: String?

    public init(location: SourceLocation, label: String? = nil) {
        self.location = location
        self.label = label
    }
}

/// Continue statement
public struct ContinueStatement: Statement {
    public let location: SourceLocation
    public let label: String?

    public init(location: SourceLocation, label: String? = nil) {
        self.location = location
        self.label = label
    }
}

/// Labeled statement (label: statement)
public struct LabeledStatement: Statement {
    public let location: SourceLocation
    public let label: String
    public let body: Statement

    public init(location: SourceLocation, label: String, body: Statement) {
        self.location = location
        self.label = label
        self.body = body
    }
}

/// Debugger statement
public struct DebuggerStatement: Statement {
    public let location: SourceLocation

    public init(location: SourceLocation) {
        self.location = location
    }
}
