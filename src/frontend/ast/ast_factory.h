#pragma once

#include <memory>
#include <string>

#include "ast_node.h"

namespace jsruntime::ast {

// AST Node Factory - Helper functions for creating AST nodes
class ASTFactory {
   public:
    // Expression factories
    static std::shared_ptr<ASTNode> makeLiteral(const std::string& value) {
        return std::make_shared<ASTNode>(ASTNodeType::Literal, value);
    }

    static std::shared_ptr<ASTNode> makeIdentifier(const std::string& name) {
        return std::make_shared<ASTNode>(ASTNodeType::Identifier, name);
    }

    static std::shared_ptr<ASTNode> makeBinaryExpression(const std::string& operator_,
                                                         std::shared_ptr<ASTNode> left,
                                                         std::shared_ptr<ASTNode> right) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::BinaryExpression, operator_);
        node->children.push_back(left);
        node->children.push_back(right);
        return node;
    }

    static std::shared_ptr<ASTNode> makeUnaryExpression(const std::string& operator_,
                                                        std::shared_ptr<ASTNode> operand) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::UnaryExpression, operator_);
        node->children.push_back(operand);
        return node;
    }

    static std::shared_ptr<ASTNode> makeAssignmentExpression(std::shared_ptr<ASTNode> left,
                                                             std::shared_ptr<ASTNode> right) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::AssignmentExpression);
        node->children.push_back(left);
        node->children.push_back(right);
        return node;
    }

    static std::shared_ptr<ASTNode> makeCallExpression(std::shared_ptr<ASTNode> callee) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::CallExpression);
        node->children.push_back(callee);
        return node;
    }

    static std::shared_ptr<ASTNode> makeMemberExpression(std::shared_ptr<ASTNode> object,
                                                         std::shared_ptr<ASTNode> property) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::MemberExpression);
        node->children.push_back(object);
        node->children.push_back(property);
        return node;
    }

    // Statement factories
    static std::shared_ptr<ASTNode> makeProgram() {
        return std::make_shared<ASTNode>(ASTNodeType::Program);
    }

    static std::shared_ptr<ASTNode> makeExpressionStatement(std::shared_ptr<ASTNode> expression) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::ExpressionStatement);
        node->children.push_back(expression);
        return node;
    }

    static std::shared_ptr<ASTNode> makeIfStatement(
        std::shared_ptr<ASTNode> condition, std::shared_ptr<ASTNode> thenStatement,
        std::shared_ptr<ASTNode> elseStatement = nullptr) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::IfStatement);
        node->children.push_back(condition);
        node->children.push_back(thenStatement);
        if (elseStatement) {
            node->children.push_back(elseStatement);
        }
        return node;
    }

    // Declaration factories
    static std::shared_ptr<ASTNode> makeVariableDeclaration(
        const std::string& name, std::shared_ptr<ASTNode> initializer = nullptr) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::VariableDeclaration, name);
        if (initializer) {
            node->children.push_back(initializer);
        }
        return node;
    }

    // Helper to add argument to call expression
    static void addArgument(std::shared_ptr<ASTNode> callExpression,
                            std::shared_ptr<ASTNode> argument) {
        if (callExpression->type == ASTNodeType::CallExpression) {
            callExpression->children.push_back(argument);
        }
    }

    // Helper to add statement to program
    static void addStatement(std::shared_ptr<ASTNode> program, std::shared_ptr<ASTNode> statement) {
        if (program->type == ASTNodeType::Program) {
            program->children.push_back(statement);
        }
    }
};

}  // namespace jsruntime::ast