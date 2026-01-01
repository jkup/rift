import Foundation

/// Recursive descent parser for JavaScript
///
/// Converts a sequence of tokens into an AST.
public struct Parser {
    private var tokens: [Token]
    private var current: Int = 0

    /// Initialize a parser with tokens from the lexer
    public init(tokens: [Token]) {
        self.tokens = tokens
    }

    // MARK: - Public API

    /// Parse tokens into a complete program AST
    public mutating func parse() throws -> Program {
        let startLocation = currentLocation()
        var statements: [Statement] = []

        while !isAtEnd {
            statements.append(try parseStatement())
        }

        return Program(location: startLocation, body: statements)
    }

    /// Parse a single expression (useful for REPL)
    public mutating func parseSingleExpression() throws -> Expression {
        return try parseAssignmentExpression()
    }

    // MARK: - Token Helpers

    private var isAtEnd: Bool {
        if case .eof = peek().type { return true }
        return false
    }

    private func peek() -> Token {
        tokens[current]
    }

    private func peekNext() -> Token? {
        guard current + 1 < tokens.count else { return nil }
        return tokens[current + 1]
    }

    private func currentLocation() -> SourceLocation {
        peek().location
    }

    @discardableResult
    private mutating func advance() -> Token {
        if !isAtEnd { current += 1 }
        return previous()
    }

    private func previous() -> Token {
        tokens[current - 1]
    }

    private mutating func check(_ type: TokenType) -> Bool {
        if isAtEnd { return false }
        return peek().type == type
    }

    private mutating func match(_ types: TokenType...) -> Bool {
        for type in types {
            if check(type) {
                advance()
                return true
            }
        }
        return false
    }

    private mutating func consume(_ type: TokenType, message: String) throws -> Token {
        if check(type) { return advance() }
        throw ParseError.unexpectedToken(peek().type, expected: message, currentLocation())
    }

    // Check if current token is an identifier with specific value
    private func checkIdentifier(_ name: String) -> Bool {
        if case .identifier(let id) = peek().type {
            return id == name
        }
        return false
    }

    // MARK: - Statement Parsing

    private mutating func parseStatement() throws -> Statement {
        // Check for labeled statement
        if case .identifier = peek().type, peekNext()?.type == .colon {
            return try parseLabeledStatement()
        }

        switch peek().type {
        case .var:
            return try parseVariableDeclaration(kind: .var)
        case .let:
            return try parseVariableDeclaration(kind: .let)
        case .const:
            return try parseVariableDeclaration(kind: .const)
        case .function:
            return try parseFunctionDeclaration()
        case .if:
            return try parseIfStatement()
        case .while:
            return try parseWhileStatement()
        case .do:
            return try parseDoWhileStatement()
        case .for:
            return try parseForStatement()
        case .switch:
            return try parseSwitchStatement()
        case .return:
            return try parseReturnStatement()
        case .throw:
            return try parseThrowStatement()
        case .try:
            return try parseTryStatement()
        case .break:
            return try parseBreakStatement()
        case .continue:
            return try parseContinueStatement()
        case .leftBrace:
            return try parseBlockStatement()
        case .semicolon:
            let loc = currentLocation()
            advance()
            return EmptyStatement(location: loc)
        case .debugger:
            let loc = currentLocation()
            advance()
            try consumeSemicolon()
            return DebuggerStatement(location: loc)
        default:
            return try parseExpressionStatement()
        }
    }

    private mutating func parseBlockStatement() throws -> BlockStatement {
        let loc = currentLocation()
        try consume(.leftBrace, message: "{")

        var statements: [Statement] = []
        while !check(.rightBrace) && !isAtEnd {
            statements.append(try parseStatement())
        }

        try consume(.rightBrace, message: "}")
        return BlockStatement(location: loc, body: statements)
    }

    private mutating func parseVariableDeclaration(kind: VariableDeclaration.Kind) throws -> VariableDeclaration {
        let loc = currentLocation()
        advance()  // consume var/let/const

        var declarations: [VariableDeclaration.Declarator] = []

        repeat {
            guard case .identifier(let name) = peek().type else {
                throw ParseError.unexpectedToken(peek().type, expected: "identifier", currentLocation())
            }
            advance()

            var initializer: Expression? = nil
            if match(.equal) {
                initializer = try parseAssignmentExpression()
            } else if kind == .const {
                throw ParseError.unexpectedToken(peek().type, expected: "= (const requires initializer)", currentLocation())
            }

            declarations.append(VariableDeclaration.Declarator(name: name, initializer: initializer))
        } while match(.comma)

        try consumeSemicolon()
        return VariableDeclaration(location: loc, kind: kind, declarations: declarations)
    }

    private mutating func parseFunctionDeclaration() throws -> FunctionDeclaration {
        let loc = currentLocation()
        advance()  // consume 'function'

        let isGenerator = match(.star)

        guard case .identifier(let name) = peek().type else {
            throw ParseError.unexpectedToken(peek().type, expected: "function name", currentLocation())
        }
        advance()

        let parameters = try parseParameterList()
        let body = try parseBlockStatement()

        return FunctionDeclaration(
            location: loc,
            name: name,
            parameters: parameters,
            body: body,
            isAsync: false,
            isGenerator: isGenerator
        )
    }

    private mutating func parseParameterList() throws -> [FunctionExpression.Parameter] {
        try consume(.leftParen, message: "(")

        var parameters: [FunctionExpression.Parameter] = []

        if !check(.rightParen) {
            repeat {
                // Handle rest parameter
                if match(.ellipsis) {
                    guard case .identifier(let name) = peek().type else {
                        throw ParseError.unexpectedToken(peek().type, expected: "parameter name", currentLocation())
                    }
                    advance()
                    parameters.append(FunctionExpression.Parameter(name: "..." + name))
                    break  // Rest must be last
                }

                guard case .identifier(let name) = peek().type else {
                    throw ParseError.unexpectedToken(peek().type, expected: "parameter name", currentLocation())
                }
                advance()

                var defaultValue: Expression? = nil
                if match(.equal) {
                    defaultValue = try parseAssignmentExpression()
                }

                parameters.append(FunctionExpression.Parameter(name: name, defaultValue: defaultValue))
            } while match(.comma)
        }

        try consume(.rightParen, message: ")")
        return parameters
    }

    private mutating func parseIfStatement() throws -> IfStatement {
        let loc = currentLocation()
        advance()  // consume 'if'

        try consume(.leftParen, message: "(")
        let test = try parseExpression()
        try consume(.rightParen, message: ")")

        let consequent = try parseStatement()

        var alternate: Statement? = nil
        if match(.else) {
            alternate = try parseStatement()
        }

        return IfStatement(location: loc, test: test, consequent: consequent, alternate: alternate)
    }

    private mutating func parseWhileStatement() throws -> WhileStatement {
        let loc = currentLocation()
        advance()  // consume 'while'

        try consume(.leftParen, message: "(")
        let test = try parseExpression()
        try consume(.rightParen, message: ")")

        let body = try parseStatement()

        return WhileStatement(location: loc, test: test, body: body)
    }

    private mutating func parseDoWhileStatement() throws -> DoWhileStatement {
        let loc = currentLocation()
        advance()  // consume 'do'

        let body = try parseStatement()

        try consume(.while, message: "while")
        try consume(.leftParen, message: "(")
        let test = try parseExpression()
        try consume(.rightParen, message: ")")
        try consumeSemicolon()

        return DoWhileStatement(location: loc, body: body, test: test)
    }

    private mutating func parseForStatement() throws -> Statement {
        let loc = currentLocation()
        advance()  // consume 'for'

        try consume(.leftParen, message: "(")

        // Parse initializer
        var initializer: ForStatement.ForInitializer? = nil
        var isForIn = false
        var isForOf = false

        if match(.semicolon) {
            // No initializer
        } else if check(.var) || check(.let) || check(.const) {
            let kind: VariableDeclaration.Kind
            switch peek().type {
            case .var: kind = .var
            case .let: kind = .let
            case .const: kind = .const
            default: fatalError()
            }
            advance()

            guard case .identifier(let name) = peek().type else {
                throw ParseError.unexpectedToken(peek().type, expected: "identifier", currentLocation())
            }
            let varLoc = currentLocation()
            advance()

            // Check for for-in or for-of
            if check(.in) {
                isForIn = true
                advance()
                let right = try parseExpression()
                try consume(.rightParen, message: ")")
                let body = try parseStatement()

                let varDecl = VariableDeclaration(
                    location: varLoc,
                    kind: kind,
                    declarations: [VariableDeclaration.Declarator(name: name)]
                )
                return ForInStatement(location: loc, left: .variable(varDecl), right: right, body: body)
            } else if check(.of) {
                isForOf = true
                advance()
                let right = try parseExpression()
                try consume(.rightParen, message: ")")
                let body = try parseStatement()

                let varDecl = VariableDeclaration(
                    location: varLoc,
                    kind: kind,
                    declarations: [VariableDeclaration.Declarator(name: name)]
                )
                return ForOfStatement(location: loc, left: .variable(varDecl), right: right, body: body)
            }

            // Regular for loop with variable declaration
            var initExpr: Expression? = nil
            if match(.equal) {
                initExpr = try parseAssignmentExpression()
            }

            var declarations = [VariableDeclaration.Declarator(name: name, initializer: initExpr)]

            while match(.comma) {
                guard case .identifier(let nextName) = peek().type else {
                    throw ParseError.unexpectedToken(peek().type, expected: "identifier", currentLocation())
                }
                advance()

                var nextInit: Expression? = nil
                if match(.equal) {
                    nextInit = try parseAssignmentExpression()
                }
                declarations.append(VariableDeclaration.Declarator(name: nextName, initializer: nextInit))
            }

            initializer = .variable(VariableDeclaration(location: varLoc, kind: kind, declarations: declarations))
            try consume(.semicolon, message: ";")
        } else {
            let expr = try parseExpression()

            // Check for for-in or for-of
            if check(.in) {
                advance()
                let right = try parseExpression()
                try consume(.rightParen, message: ")")
                let body = try parseStatement()
                return ForInStatement(location: loc, left: .expression(expr), right: right, body: body)
            } else if check(.of) {
                advance()
                let right = try parseExpression()
                try consume(.rightParen, message: ")")
                let body = try parseStatement()
                return ForOfStatement(location: loc, left: .expression(expr), right: right, body: body)
            }

            initializer = .expression(expr)
            try consume(.semicolon, message: ";")
        }

        // Regular for loop
        var test: Expression? = nil
        if !check(.semicolon) {
            test = try parseExpression()
        }
        try consume(.semicolon, message: ";")

        var update: Expression? = nil
        if !check(.rightParen) {
            update = try parseExpression()
        }
        try consume(.rightParen, message: ")")

        let body = try parseStatement()

        return ForStatement(location: loc, initializer: initializer, test: test, update: update, body: body)
    }

    private mutating func parseSwitchStatement() throws -> SwitchStatement {
        let loc = currentLocation()
        advance()  // consume 'switch'

        try consume(.leftParen, message: "(")
        let discriminant = try parseExpression()
        try consume(.rightParen, message: ")")

        try consume(.leftBrace, message: "{")

        var cases: [SwitchStatement.SwitchCase] = []

        while !check(.rightBrace) && !isAtEnd {
            var test: Expression? = nil

            if match(.case) {
                test = try parseExpression()
            } else if match(.default) {
                // test remains nil for default
            } else {
                throw ParseError.unexpectedToken(peek().type, expected: "case or default", currentLocation())
            }

            try consume(.colon, message: ":")

            var consequent: [Statement] = []
            while !check(.case) && !check(.default) && !check(.rightBrace) && !isAtEnd {
                consequent.append(try parseStatement())
            }

            cases.append(SwitchStatement.SwitchCase(test: test, consequent: consequent))
        }

        try consume(.rightBrace, message: "}")

        return SwitchStatement(location: loc, discriminant: discriminant, cases: cases)
    }

    private mutating func parseReturnStatement() throws -> ReturnStatement {
        let loc = currentLocation()
        advance()  // consume 'return'

        var argument: Expression? = nil

        // Return with no argument (semicolon or newline)
        if !check(.semicolon) && !isAtEnd && !check(.rightBrace) {
            // Check if next token is on same line (ASI)
            argument = try parseExpression()
        }

        try consumeSemicolon()
        return ReturnStatement(location: loc, argument: argument)
    }

    private mutating func parseThrowStatement() throws -> ThrowStatement {
        let loc = currentLocation()
        advance()  // consume 'throw'

        let argument = try parseExpression()
        try consumeSemicolon()

        return ThrowStatement(location: loc, argument: argument)
    }

    private mutating func parseTryStatement() throws -> TryStatement {
        let loc = currentLocation()
        advance()  // consume 'try'

        let block = try parseBlockStatement()

        var handler: TryStatement.CatchClause? = nil
        var finalizer: BlockStatement? = nil

        if match(.catch) {
            var parameter: String? = nil

            if match(.leftParen) {
                if case .identifier(let name) = peek().type {
                    parameter = name
                    advance()
                }
                try consume(.rightParen, message: ")")
            }

            let catchBody = try parseBlockStatement()
            handler = TryStatement.CatchClause(parameter: parameter, body: catchBody)
        }

        if match(.finally) {
            finalizer = try parseBlockStatement()
        }

        if handler == nil && finalizer == nil {
            throw ParseError.unexpectedToken(peek().type, expected: "catch or finally", currentLocation())
        }

        return TryStatement(location: loc, block: block, handler: handler, finalizer: finalizer)
    }

    private mutating func parseBreakStatement() throws -> BreakStatement {
        let loc = currentLocation()
        advance()  // consume 'break'

        var label: String? = nil
        if case .identifier(let name) = peek().type {
            label = name
            advance()
        }

        try consumeSemicolon()
        return BreakStatement(location: loc, label: label)
    }

    private mutating func parseContinueStatement() throws -> ContinueStatement {
        let loc = currentLocation()
        advance()  // consume 'continue'

        var label: String? = nil
        if case .identifier(let name) = peek().type {
            label = name
            advance()
        }

        try consumeSemicolon()
        return ContinueStatement(location: loc, label: label)
    }

    private mutating func parseLabeledStatement() throws -> LabeledStatement {
        let loc = currentLocation()
        guard case .identifier(let label) = peek().type else {
            throw ParseError.unexpectedToken(peek().type, expected: "label", currentLocation())
        }
        advance()
        try consume(.colon, message: ":")

        let body = try parseStatement()
        return LabeledStatement(location: loc, label: label, body: body)
    }

    private mutating func parseExpressionStatement() throws -> ExpressionStatement {
        let loc = currentLocation()
        let expression = try parseExpression()
        try consumeSemicolon()
        return ExpressionStatement(location: loc, expression: expression)
    }

    private mutating func consumeSemicolon() throws {
        // Automatic semicolon insertion - be lenient
        if match(.semicolon) {
            return
        }
        // ASI: allow missing semicolon at end of file, before }, or after line terminator
        if isAtEnd || check(.rightBrace) {
            return
        }
        // For now, be lenient and don't require semicolons
        // A strict parser would throw here
    }

    // MARK: - Expression Parsing

    private mutating func parseExpression() throws -> Expression {
        return try parseSequenceExpression()
    }

    private mutating func parseSequenceExpression() throws -> Expression {
        let loc = currentLocation()
        var expr = try parseAssignmentExpression()

        if check(.comma) && !isInArgumentList() {
            var expressions = [expr]
            while match(.comma) {
                expressions.append(try parseAssignmentExpression())
            }
            return SequenceExpression(location: loc, expressions: expressions)
        }

        return expr
    }

    // Helper to avoid treating commas in argument lists as sequence operators
    private func isInArgumentList() -> Bool {
        // This is a simplified check - a full implementation would track context
        return false
    }

    private mutating func parseAssignmentExpression() throws -> Expression {
        let loc = currentLocation()
        let expr = try parseConditionalExpression()

        if let op = matchAssignmentOperator() {
            let right = try parseAssignmentExpression()
            return AssignmentExpression(location: loc, operator: op, left: expr, right: right)
        }

        return expr
    }

    private mutating func matchAssignmentOperator() -> AssignmentExpression.AssignmentOperator? {
        let ops: [(TokenType, AssignmentExpression.AssignmentOperator)] = [
            (.equal, .assign),
            (.plusEqual, .addAssign),
            (.minusEqual, .subtractAssign),
            (.starEqual, .multiplyAssign),
            (.slashEqual, .divideAssign),
            (.percentEqual, .moduloAssign),
            (.starStarEqual, .exponentAssign),
            (.lessLessEqual, .leftShiftAssign),
            (.greaterGreaterEqual, .rightShiftAssign),
            (.greaterGreaterGreaterEqual, .unsignedRightShiftAssign),
            (.ampEqual, .bitwiseAndAssign),
            (.pipeEqual, .bitwiseOrAssign),
            (.caretEqual, .bitwiseXorAssign),
            (.ampAmpEqual, .andAssign),
            (.pipePipeEqual, .orAssign),
            (.questionQuestionEqual, .nullishAssign),
        ]

        for (tokenType, op) in ops {
            if match(tokenType) {
                return op
            }
        }
        return nil
    }

    private mutating func parseConditionalExpression() throws -> Expression {
        let loc = currentLocation()
        let test = try parseBinaryExpression()

        if match(.question) {
            let consequent = try parseAssignmentExpression()
            try consume(.colon, message: ":")
            let alternate = try parseAssignmentExpression()
            return ConditionalExpression(location: loc, test: test, consequent: consequent, alternate: alternate)
        }

        return test
    }

    // MARK: - Binary Expression Parsing (Precedence Climbing)

    private mutating func parseBinaryExpression(minPrecedence: Int = 0) throws -> Expression {
        var left = try parseUnaryExpression()

        while let (op, precedence, rightAssoc) = currentBinaryOperator(), precedence >= minPrecedence {
            advance()
            let nextMinPrec = rightAssoc ? precedence : precedence + 1
            let right = try parseBinaryExpression(minPrecedence: nextMinPrec)
            left = BinaryExpression(location: left.location, operator: op, left: left, right: right)
        }

        return left
    }

    private func currentBinaryOperator() -> (BinaryExpression.BinaryOperator, Int, Bool)? {
        // Returns (operator, precedence, isRightAssociative)
        // Higher precedence = binds tighter
        switch peek().type {
        case .pipePipe: return (.or, 4, false)
        case .ampAmp: return (.and, 5, false)
        case .questionQuestion: return (.nullishCoalescing, 4, false)
        case .pipe: return (.bitwiseOr, 6, false)
        case .caret: return (.bitwiseXor, 7, false)
        case .ampersand: return (.bitwiseAnd, 8, false)
        case .equalEqual: return (.equal, 9, false)
        case .bangEqual: return (.notEqual, 9, false)
        case .equalEqualEqual: return (.strictEqual, 9, false)
        case .bangEqualEqual: return (.strictNotEqual, 9, false)
        case .less: return (.lessThan, 10, false)
        case .lessEqual: return (.lessThanOrEqual, 10, false)
        case .greater: return (.greaterThan, 10, false)
        case .greaterEqual: return (.greaterThanOrEqual, 10, false)
        case .in: return (.in, 10, false)
        case .instanceof: return (.instanceof, 10, false)
        case .lessLess: return (.leftShift, 11, false)
        case .greaterGreater: return (.rightShift, 11, false)
        case .greaterGreaterGreater: return (.unsignedRightShift, 11, false)
        case .plus: return (.add, 12, false)
        case .minus: return (.subtract, 12, false)
        case .star: return (.multiply, 13, false)
        case .slash: return (.divide, 13, false)
        case .percent: return (.modulo, 13, false)
        case .starStar: return (.exponent, 14, true)  // Right associative!
        default: return nil
        }
    }

    // MARK: - Unary Expression Parsing

    private mutating func parseUnaryExpression() throws -> Expression {
        let loc = currentLocation()

        // Prefix operators
        if match(.bang) {
            let operand = try parseUnaryExpression()
            return UnaryExpression(location: loc, operator: .not, operand: operand)
        }
        if match(.minus) {
            let operand = try parseUnaryExpression()
            return UnaryExpression(location: loc, operator: .negative, operand: operand)
        }
        if match(.plus) {
            let operand = try parseUnaryExpression()
            return UnaryExpression(location: loc, operator: .positive, operand: operand)
        }
        if match(.tilde) {
            let operand = try parseUnaryExpression()
            return UnaryExpression(location: loc, operator: .bitwiseNot, operand: operand)
        }
        if match(.typeof) {
            let operand = try parseUnaryExpression()
            return UnaryExpression(location: loc, operator: .typeof, operand: operand)
        }
        if match(.void) {
            let operand = try parseUnaryExpression()
            return UnaryExpression(location: loc, operator: .void, operand: operand)
        }
        if match(.delete) {
            let operand = try parseUnaryExpression()
            return UnaryExpression(location: loc, operator: .delete, operand: operand)
        }

        // Prefix increment/decrement
        if match(.plusPlus) {
            let operand = try parseUnaryExpression()
            return UpdateExpression(location: loc, operator: .increment, operand: operand, prefix: true)
        }
        if match(.minusMinus) {
            let operand = try parseUnaryExpression()
            return UpdateExpression(location: loc, operator: .decrement, operand: operand, prefix: true)
        }

        return try parsePostfixExpression()
    }

    private mutating func parsePostfixExpression() throws -> Expression {
        var expr = try parseCallMemberExpression()

        // Postfix increment/decrement
        if check(.plusPlus) {
            let loc = currentLocation()
            advance()
            expr = UpdateExpression(location: loc, operator: .increment, operand: expr, prefix: false)
        } else if check(.minusMinus) {
            let loc = currentLocation()
            advance()
            expr = UpdateExpression(location: loc, operator: .decrement, operand: expr, prefix: false)
        }

        return expr
    }

    // MARK: - Call and Member Expression Parsing

    private mutating func parseCallMemberExpression() throws -> Expression {
        var expr: Expression

        if match(.new) {
            expr = try parseNewExpression()
        } else {
            expr = try parsePrimaryExpression()
        }

        while true {
            if match(.leftParen) {
                let arguments = try parseArgumentList()
                expr = CallExpression(location: expr.location, callee: expr, arguments: arguments)
            } else if match(.dot) {
                guard case .identifier(let name) = peek().type else {
                    throw ParseError.unexpectedToken(peek().type, expected: "property name", currentLocation())
                }
                let propLoc = currentLocation()
                advance()
                let property = IdentifierExpression(location: propLoc, name: name)
                expr = MemberExpression(location: expr.location, object: expr, property: property, computed: false)
            } else if match(.questionDot) {
                if match(.leftParen) {
                    // Optional call: obj?.()
                    let arguments = try parseArgumentList()
                    expr = CallExpression(location: expr.location, callee: expr, arguments: arguments)
                } else if match(.leftBracket) {
                    // Optional computed access: obj?.[expr]
                    let property = try parseExpression()
                    try consume(.rightBracket, message: "]")
                    expr = MemberExpression(location: expr.location, object: expr, property: property, computed: true, optional: true)
                } else {
                    // Optional property access: obj?.prop
                    guard case .identifier(let name) = peek().type else {
                        throw ParseError.unexpectedToken(peek().type, expected: "property name", currentLocation())
                    }
                    let propLoc = currentLocation()
                    advance()
                    let property = IdentifierExpression(location: propLoc, name: name)
                    expr = MemberExpression(location: expr.location, object: expr, property: property, computed: false, optional: true)
                }
            } else if match(.leftBracket) {
                let property = try parseExpression()
                try consume(.rightBracket, message: "]")
                expr = MemberExpression(location: expr.location, object: expr, property: property, computed: true)
            } else {
                break
            }
        }

        return expr
    }

    private mutating func parseNewExpression() throws -> Expression {
        let loc = currentLocation()
        var callee = try parsePrimaryExpression()

        // Handle member access on new target
        while match(.dot) {
            guard case .identifier(let name) = peek().type else {
                throw ParseError.unexpectedToken(peek().type, expected: "property name", currentLocation())
            }
            let propLoc = currentLocation()
            advance()
            let property = IdentifierExpression(location: propLoc, name: name)
            callee = MemberExpression(location: callee.location, object: callee, property: property, computed: false)
        }

        var arguments: [Expression] = []
        if match(.leftParen) {
            arguments = try parseArgumentList()
        }

        return NewExpression(location: loc, callee: callee, arguments: arguments)
    }

    private mutating func parseArgumentList() throws -> [Expression] {
        var arguments: [Expression] = []

        if !check(.rightParen) {
            repeat {
                if match(.ellipsis) {
                    let arg = try parseAssignmentExpression()
                    arguments.append(SpreadElement(location: arg.location, argument: arg))
                } else {
                    arguments.append(try parseAssignmentExpression())
                }
            } while match(.comma)
        }

        try consume(.rightParen, message: ")")
        return arguments
    }

    // MARK: - Primary Expression Parsing

    private mutating func parsePrimaryExpression() throws -> Expression {
        let loc = currentLocation()

        switch peek().type {
        case .number(let value):
            advance()
            return LiteralExpression(location: loc, value: .number(value))

        case .string(let value):
            advance()
            return LiteralExpression(location: loc, value: .string(value))

        case .true:
            advance()
            return LiteralExpression(location: loc, value: .boolean(true))

        case .false:
            advance()
            return LiteralExpression(location: loc, value: .boolean(false))

        case .null:
            advance()
            return LiteralExpression(location: loc, value: .null)

        case .undefined:
            advance()
            return LiteralExpression(location: loc, value: .undefined)

        case .this:
            advance()
            return ThisExpression(location: loc)

        case .identifier(let name):
            advance()
            return IdentifierExpression(location: loc, name: name)

        case .leftParen:
            return try parseParenthesizedOrArrowFunction()

        case .leftBracket:
            return try parseArrayLiteral()

        case .leftBrace:
            return try parseObjectLiteral()

        case .function:
            return try parseFunctionExpression()

        default:
            throw ParseError.unexpectedToken(peek().type, expected: "expression", currentLocation())
        }
    }

    private mutating func parseParenthesizedOrArrowFunction() throws -> Expression {
        let loc = currentLocation()
        advance()  // consume (

        // Check for arrow function
        // This is a simplified check - full implementation needs more lookahead

        // Empty parens -> arrow function
        if check(.rightParen) {
            advance()
            if check(.arrow) {
                advance()
                return try parseArrowFunctionBody(location: loc, parameters: [])
            }
            // Empty parens without arrow is an error
            throw ParseError.unexpectedToken(peek().type, expected: "=>", currentLocation())
        }

        // Try to parse as arrow function parameters
        let startPos = current
        var couldBeArrow = true
        var parameters: [FunctionExpression.Parameter] = []

        // Attempt to parse parameter list
        outerLoop: while couldBeArrow && !check(.rightParen) && !isAtEnd {
            if case .identifier(let name) = peek().type {
                advance()
                var defaultValue: Expression? = nil
                if match(.equal) {
                    // Has default value - parse it
                    defaultValue = try parseAssignmentExpression()
                }
                parameters.append(FunctionExpression.Parameter(name: name, defaultValue: defaultValue))

                if match(.comma) {
                    continue
                } else if check(.rightParen) {
                    break
                } else {
                    couldBeArrow = false
                }
            } else if match(.ellipsis) {
                // Rest parameter
                if case .identifier(let name) = peek().type {
                    advance()
                    parameters.append(FunctionExpression.Parameter(name: "..." + name))
                    break  // Rest must be last
                } else {
                    couldBeArrow = false
                }
            } else {
                couldBeArrow = false
            }
        }

        if couldBeArrow && check(.rightParen) {
            advance()  // consume )
            if check(.arrow) {
                advance()  // consume =>
                return try parseArrowFunctionBody(location: loc, parameters: parameters)
            }
        }

        // Not an arrow function - backtrack and parse as parenthesized expression
        current = startPos
        let expr = try parseExpression()
        try consume(.rightParen, message: ")")
        return expr
    }

    private mutating func parseArrowFunctionBody(location: SourceLocation, parameters: [FunctionExpression.Parameter]) throws -> FunctionExpression {
        let body: FunctionExpression.FunctionBody

        if check(.leftBrace) {
            body = .block(try parseBlockStatement())
        } else {
            body = .expression(try parseAssignmentExpression())
        }

        return FunctionExpression(
            location: location,
            parameters: parameters,
            body: body,
            isArrow: true
        )
    }

    private mutating func parseArrayLiteral() throws -> ArrayExpression {
        let loc = currentLocation()
        advance()  // consume [

        var elements: [ArrayExpression.ArrayElement] = []

        while !check(.rightBracket) && !isAtEnd {
            if match(.comma) {
                // Hole in array
                elements.append(.hole)
            } else if match(.ellipsis) {
                let expr = try parseAssignmentExpression()
                elements.append(.spread(expr))
                if !check(.rightBracket) {
                    try consume(.comma, message: ", or ]")
                }
            } else {
                let expr = try parseAssignmentExpression()
                elements.append(.expression(expr))
                if !check(.rightBracket) {
                    try consume(.comma, message: ", or ]")
                }
            }
        }

        try consume(.rightBracket, message: "]")
        return ArrayExpression(location: loc, elements: elements)
    }

    private mutating func parseObjectLiteral() throws -> ObjectExpression {
        let loc = currentLocation()
        advance()  // consume {

        var properties: [ObjectExpression.ObjectProperty] = []

        while !check(.rightBrace) && !isAtEnd {
            let prop = try parseObjectProperty()
            properties.append(prop)

            if !check(.rightBrace) {
                try consume(.comma, message: ", or }")
            }
        }

        try consume(.rightBrace, message: "}")
        return ObjectExpression(location: loc, properties: properties)
    }

    private mutating func parseObjectProperty() throws -> ObjectExpression.ObjectProperty {
        var computed = false
        var key: Expression
        let keyLoc = currentLocation()

        // Computed property [expr]
        if match(.leftBracket) {
            computed = true
            key = try parseAssignmentExpression()
            try consume(.rightBracket, message: "]")
        } else if case .identifier(let name) = peek().type {
            advance()
            key = IdentifierExpression(location: keyLoc, name: name)

            // Shorthand property { a } is same as { a: a }
            if !check(.colon) && !check(.leftParen) {
                return ObjectExpression.ObjectProperty(
                    key: key,
                    value: IdentifierExpression(location: keyLoc, name: name),
                    shorthand: true
                )
            }
        } else if case .string(let str) = peek().type {
            advance()
            key = LiteralExpression(location: keyLoc, value: .string(str))
        } else if case .number(let num) = peek().type {
            advance()
            key = LiteralExpression(location: keyLoc, value: .number(num))
        } else {
            throw ParseError.unexpectedToken(peek().type, expected: "property name", currentLocation())
        }

        // Method shorthand { foo() { } }
        if match(.leftParen) {
            let parameters = try parseParameterListFromCurrent()
            let body = try parseBlockStatement()
            let value = FunctionExpression(
                location: keyLoc,
                parameters: parameters,
                body: .block(body)
            )
            return ObjectExpression.ObjectProperty(key: key, value: value, computed: computed)
        }

        try consume(.colon, message: ":")
        let value = try parseAssignmentExpression()
        return ObjectExpression.ObjectProperty(key: key, value: value, computed: computed)
    }

    private mutating func parseParameterListFromCurrent() throws -> [FunctionExpression.Parameter] {
        // We already consumed the (
        var parameters: [FunctionExpression.Parameter] = []

        if !check(.rightParen) {
            repeat {
                if match(.ellipsis) {
                    guard case .identifier(let name) = peek().type else {
                        throw ParseError.unexpectedToken(peek().type, expected: "parameter name", currentLocation())
                    }
                    advance()
                    parameters.append(FunctionExpression.Parameter(name: "..." + name))
                    break
                }

                guard case .identifier(let name) = peek().type else {
                    throw ParseError.unexpectedToken(peek().type, expected: "parameter name", currentLocation())
                }
                advance()

                var defaultValue: Expression? = nil
                if match(.equal) {
                    defaultValue = try parseAssignmentExpression()
                }

                parameters.append(FunctionExpression.Parameter(name: name, defaultValue: defaultValue))
            } while match(.comma)
        }

        try consume(.rightParen, message: ")")
        return parameters
    }

    private mutating func parseFunctionExpression() throws -> FunctionExpression {
        let loc = currentLocation()
        advance()  // consume 'function'

        let isGenerator = match(.star)

        var name: String? = nil
        if case .identifier(let n) = peek().type {
            name = n
            advance()
        }

        let parameters = try parseParameterList()
        let body = try parseBlockStatement()

        return FunctionExpression(
            location: loc,
            name: name,
            parameters: parameters,
            body: .block(body),
            isGenerator: isGenerator
        )
    }
}
