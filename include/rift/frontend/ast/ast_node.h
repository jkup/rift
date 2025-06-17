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
    AssignmentExpression,
    VariableDeclaration,
    ExpressionStatement,
    BlockStatement,
    CallExpression,
    MemberExpression,
    IfStatement,
    ElseStatement,
    WhileStatement,
    ArrayLiteral,
    ObjectLiteral,
    FunctionDeclaration,
    FunctionExpression,
    ReturnStatement,
    ParameterList,
};

struct ASTNode {
    ASTNodeType type;
    std::vector<std::shared_ptr<ASTNode>> children;
    std::string value;

    ASTNode(ASTNodeType t) : type(t) {}
    ASTNode(ASTNodeType t, const std::string& v) : type(t), value(v) {}
};

}  // namespace rift::ast