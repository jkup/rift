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
    ExpressionStatement,
    BlockStatement,
    CallExpression,
    MemberExpression,
    IfStatement,
    ElseStatement,
    WhileStatement,
    ForStatement,
    SwitchStatement,
    CaseClause,
    DefaultClause,
    BreakStatement,
    ArrayLiteral,
    ObjectLiteral,
    FunctionDeclaration,
    FunctionExpression,
    ReturnStatement,
    ThrowStatement,
    TryStatement,
    CatchClause,
    ParameterList,
    NewExpression,
    TemplateLiteral,
    TemplateElement,
    TemplateExpression,
};

struct ASTNode {
    ASTNodeType type;
    std::vector<std::shared_ptr<ASTNode>> children;
    std::string value;
    std::string metadata;  // For storing additional type information

    ASTNode(ASTNodeType t) : type(t) {
    }
    ASTNode(ASTNodeType t, const std::string& v) : type(t), value(v) {
    }
};

}  // namespace rift::ast