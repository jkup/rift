#pragma once

#include <memory>
#include <string>
#include <vector>

namespace jsruntime::ast {

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
};

struct ASTNode {
    ASTNodeType type;
    std::vector<std::shared_ptr<ASTNode>> children;
    std::string value;

    ASTNode(ASTNodeType t) : type(t) {}
    ASTNode(ASTNodeType t, const std::string& v) : type(t), value(v) {}
};

}  // namespace jsruntime::ast