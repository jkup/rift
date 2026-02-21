#pragma once

#include <memory>
#include <string>
#include <vector>

namespace rift::ast {

// Simple AST node types (maintaining compatibility)
enum class ASTNodeType {
    Program,
    Literal,
    Identifier,
    BinaryExpression,
    UnaryExpression,
    UpdateExpression,
    AssignmentExpression,
    VariableDeclaration,
    LetDeclaration,
    ConstDeclaration,
    ExpressionStatement,
    BlockStatement,
    CallExpression,
    MemberExpression,
    IfStatement,
    ElseStatement,
    WhileStatement,
    DoWhileStatement,
    ForStatement,
    ForInStatement,
    ForOfStatement,
    SwitchStatement,
    CaseClause,
    DefaultClause,
    BreakStatement,
    ContinueStatement,
    ArrayLiteral,
    ObjectLiteral,
    FunctionDeclaration,
    FunctionExpression,
    ArrowFunctionExpression,
    ReturnStatement,
    ThrowStatement,
    TryStatement,
    CatchClause,
    FinallyClause,
    ParameterList,
    NewExpression,
    TemplateLiteral,
    TemplateElement,
    RegExpLiteral,
    ConditionalExpression,
    TemplateExpression,
    SpreadElement,
    // Destructuring patterns
    ArrayPattern,       // [x, y, ...rest]
    ObjectPattern,      // {a, b: renamed, ...rest}
    AssignmentPattern,  // x = defaultValue (pattern with default)
    RestElement,        // ...rest in patterns
    // Class-related nodes
    ClassDeclaration,  // class Foo extends Bar { ... }
    ClassExpression,   // const Foo = class { ... }
    ClassBody,         // { constructor() {} method() {} }
    MethodDefinition,  // method() { } or static method() { }
    SuperExpression,   // super or super.method
    // Generator-related nodes
    GeneratorFunctionDeclaration,  // function* name() {}
    GeneratorFunctionExpression,   // const g = function*() {}
    GeneratorMethod,               // { *method() {} }
    AsyncMethod,                   // async method() {} in classes
    YieldExpression,               // yield value (metadata: "" or "delegate" for yield*)
    // Async-related nodes
    AsyncFunctionDeclaration,  // async function name() {}
    AsyncFunctionExpression,   // const f = async function() {}
    AwaitExpression,           // await value
    ForAwaitOfStatement,       // for await (x of iterable) {}
    LabeledStatement,          // label: statement
};

struct ASTNode {
    ASTNodeType type;
    std::vector<std::shared_ptr<ASTNode>> children;
    std::string value;
    std::string metadata;  // For storing additional type information

    // Source location tracking
    size_t line = 0;    // 1-indexed line number (0 = unknown)
    size_t column = 0;  // 1-indexed column number (0 = unknown)

    ASTNode(ASTNodeType t) : type(t) {
    }
    ASTNode(ASTNodeType t, const std::string& v) : type(t), value(v) {
    }
    ASTNode(ASTNodeType t, const std::string& v, size_t l, size_t c)
        : type(t), value(v), line(l), column(c) {
    }

    /// Set source location from another node (useful for derived nodes)
    void setLocation(size_t l, size_t c) {
        line = l;
        column = c;
    }

    /// Copy source location from another node
    void copyLocationFrom(const std::shared_ptr<ASTNode>& other) {
        if(other) {
            line = other->line;
            column = other->column;
        }
    }

    /// Check if this node has valid source location
    bool hasLocation() const {
        return line > 0 && column > 0;
    }
};

}  // namespace rift::ast