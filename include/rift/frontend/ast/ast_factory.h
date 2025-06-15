#pragma once

#include <memory>
#include <string>

#include "ast_node.h"

namespace rift::ast {

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

    static std::shared_ptr<ASTNode> makeArrayLiteral() {
        return std::make_shared<ASTNode>(ASTNodeType::ArrayLiteral);
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

    static std::shared_ptr<ASTNode> makeBlockStatement() {
        return std::make_shared<ASTNode>(ASTNodeType::BlockStatement);
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

    static std::shared_ptr<ASTNode> makeWhileStatement(
        std::shared_ptr<ASTNode> condition, std::shared_ptr<ASTNode> body) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::WhileStatement);
        node->children.push_back(condition);
        node->children.push_back(body);
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

    // Function-related factories
    static std::shared_ptr<ASTNode> makeFunctionDeclaration(
        const std::string& name,
        std::shared_ptr<ASTNode> parameters,
        std::shared_ptr<ASTNode> body) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::FunctionDeclaration, name);
        node->children.push_back(parameters);  // Parameter list
        node->children.push_back(body);        // Function body
        return node;
    }

    static std::shared_ptr<ASTNode> makeFunctionExpression(
        std::shared_ptr<ASTNode> parameters,
        std::shared_ptr<ASTNode> body) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::FunctionExpression);
        node->children.push_back(parameters);  // Parameter list
        node->children.push_back(body);        // Function body
        return node;
    }

    static std::shared_ptr<ASTNode> makeReturnStatement(std::shared_ptr<ASTNode> argument) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::ReturnStatement);
        if (argument) {
            node->children.push_back(argument);
        }
        return node;
    }

    static std::shared_ptr<ASTNode> makeParameterList() {
        return std::make_shared<ASTNode>(ASTNodeType::ParameterList);
    }

    // Helper to add argument to call expression
    static void addArgument(std::shared_ptr<ASTNode> callExpression,
                            std::shared_ptr<ASTNode> argument) {
        if (callExpression->type == ASTNodeType::CallExpression) {
            callExpression->children.push_back(argument);
        }
    }

    // Helper to add element to array literal
    static void addArrayElement(std::shared_ptr<ASTNode> arrayLiteral,
                                std::shared_ptr<ASTNode> element) {
        if (arrayLiteral->type == ASTNodeType::ArrayLiteral) {
            arrayLiteral->children.push_back(element);
        }
    }

    // Helper to add statement to program or block
    static void addStatement(std::shared_ptr<ASTNode> container, std::shared_ptr<ASTNode> statement) {
        if (container->type == ASTNodeType::Program || container->type == ASTNodeType::BlockStatement) {
            container->children.push_back(statement);
        }
    }

    // Helper to add parameter to parameter list
    static void addParameter(std::shared_ptr<ASTNode> parameterList,
                           std::shared_ptr<ASTNode> parameter) {
        if (parameterList->type == ASTNodeType::ParameterList) {
            parameterList->children.push_back(parameter);
        }
    }
};

}  // namespace rift::ast