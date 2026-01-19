#pragma once

#include <memory>
#include <string>

#include "ast_node.h"

namespace rift::ast {

// AST Node Factory - Helper functions for creating AST nodes
class ASTFactory {
  public:
    // Expression factories
    static std::shared_ptr<ASTNode> makeLiteral(const std::string& value,
                                                const std::string& literalType = "") {
        auto node = std::make_shared<ASTNode>(ASTNodeType::Literal, value);
        if(!literalType.empty()) {
            node->metadata = literalType;  // Store the literal type
        }
        return node;
    }

    static std::shared_ptr<ASTNode> makeIdentifier(const std::string& name) {
        return std::make_shared<ASTNode>(ASTNodeType::Identifier, name);
    }

    static std::shared_ptr<ASTNode> makeBinaryExpression(const std::string& operator_,
                                                         std::shared_ptr<ASTNode> left,
                                                         std::shared_ptr<ASTNode> right) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::BinaryExpression, operator_);
        node->children.push_back(std::move(left));
        node->children.push_back(std::move(right));
        return node;
    }

    static std::shared_ptr<ASTNode> makeUnaryExpression(const std::string& operator_,
                                                        std::shared_ptr<ASTNode> operand) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::UnaryExpression, operator_);
        node->children.push_back(std::move(operand));
        return node;
    }

    static std::shared_ptr<ASTNode> makeUpdateExpression(const std::string& operator_,
                                                         std::shared_ptr<ASTNode> operand,
                                                         bool prefix = true) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::UpdateExpression, operator_);
        node->children.push_back(std::move(operand));
        node->metadata = prefix ? "prefix" : "postfix";  // Store prefix/postfix info
        return node;
    }

    static std::shared_ptr<ASTNode> makeAssignmentExpression(std::shared_ptr<ASTNode> left,
                                                             std::shared_ptr<ASTNode> right) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::AssignmentExpression);
        node->children.push_back(std::move(left));
        node->children.push_back(std::move(right));
        return node;
    }

    static std::shared_ptr<ASTNode> makeCallExpression(std::shared_ptr<ASTNode> callee) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::CallExpression);
        node->children.push_back(std::move(callee));
        return node;
    }

    static std::shared_ptr<ASTNode> makeMemberExpression(std::shared_ptr<ASTNode> object,
                                                         std::shared_ptr<ASTNode> property,
                                                         bool computed = false) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::MemberExpression);
        node->children.push_back(std::move(object));
        node->children.push_back(std::move(property));
        if(computed) {
            node->metadata = "computed";
        }
        return node;
    }

    static std::shared_ptr<ASTNode> makeArrayLiteral() {
        return std::make_shared<ASTNode>(ASTNodeType::ArrayLiteral);
    }

    static std::shared_ptr<ASTNode> makeObjectLiteral() {
        return std::make_shared<ASTNode>(ASTNodeType::ObjectLiteral);
    }

    static std::shared_ptr<ASTNode> makeNewExpression(std::shared_ptr<ASTNode> constructor) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::NewExpression);
        node->children.push_back(std::move(constructor));
        return node;
    }

    // Statement factories
    static std::shared_ptr<ASTNode> makeProgram() {
        return std::make_shared<ASTNode>(ASTNodeType::Program);
    }

    static std::shared_ptr<ASTNode> makeExpressionStatement(std::shared_ptr<ASTNode> expression) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::ExpressionStatement);
        node->children.push_back(std::move(expression));
        return node;
    }

    static std::shared_ptr<ASTNode> makeBlockStatement() {
        return std::make_shared<ASTNode>(ASTNodeType::BlockStatement);
    }

    static std::shared_ptr<ASTNode> makeIfStatement(
        std::shared_ptr<ASTNode> condition, std::shared_ptr<ASTNode> thenStatement,
        std::shared_ptr<ASTNode> elseStatement = nullptr) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::IfStatement);
        node->children.push_back(std::move(condition));
        node->children.push_back(std::move(thenStatement));
        if(elseStatement) {
            node->children.push_back(std::move(elseStatement));
        }
        return node;
    }

    static std::shared_ptr<ASTNode> makeWhileStatement(std::shared_ptr<ASTNode> condition,
                                                       std::shared_ptr<ASTNode> body) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::WhileStatement);
        node->children.push_back(std::move(condition));
        node->children.push_back(std::move(body));
        return node;
    }

    static std::shared_ptr<ASTNode> makeDoWhileStatement(std::shared_ptr<ASTNode> body,
                                                         std::shared_ptr<ASTNode> condition) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::DoWhileStatement);
        node->children.push_back(std::move(body));        // body first
        node->children.push_back(std::move(condition));   // condition second
        return node;
    }

    static std::shared_ptr<ASTNode> makeForStatement(std::shared_ptr<ASTNode> initialization,
                                                     std::shared_ptr<ASTNode> condition,
                                                     std::shared_ptr<ASTNode> update,
                                                     std::shared_ptr<ASTNode> body) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::ForStatement);
        if(initialization) {
            node->children.push_back(std::move(initialization));
        } else {
            node->children.push_back(nullptr);  // Placeholder for empty initialization
        }
        if(condition) {
            node->children.push_back(std::move(condition));
        } else {
            node->children.push_back(nullptr);  // Placeholder for empty condition (infinite loop)
        }
        if(update) {
            node->children.push_back(std::move(update));
        } else {
            node->children.push_back(nullptr);  // Placeholder for empty update
        }
        node->children.push_back(std::move(body));
        return node;
    }

    // Declaration factories
    static std::shared_ptr<ASTNode> makeVariableDeclaration(
        const std::string& name, std::shared_ptr<ASTNode> initializer = nullptr) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::VariableDeclaration, name);
        if(initializer) {
            node->children.push_back(std::move(initializer));
        }
        return node;
    }

    static std::shared_ptr<ASTNode> makeLetDeclaration(
        const std::string& name, std::shared_ptr<ASTNode> initializer = nullptr) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::LetDeclaration, name);
        if(initializer) {
            node->children.push_back(std::move(initializer));
        }
        return node;
    }

    static std::shared_ptr<ASTNode> makeConstDeclaration(
        const std::string& name, std::shared_ptr<ASTNode> initializer = nullptr) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::ConstDeclaration, name);
        if(initializer) {
            node->children.push_back(std::move(initializer));
        }
        return node;
    }

    // Function-related factories
    static std::shared_ptr<ASTNode> makeFunctionDeclaration(const std::string& name,
                                                            std::shared_ptr<ASTNode> parameters,
                                                            std::shared_ptr<ASTNode> body) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::FunctionDeclaration, name);
        node->children.push_back(std::move(parameters));  // Parameter list
        node->children.push_back(std::move(body));        // Function body
        return node;
    }

    static std::shared_ptr<ASTNode> makeFunctionExpression(std::shared_ptr<ASTNode> parameters,
                                                           std::shared_ptr<ASTNode> body) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::FunctionExpression);
        node->children.push_back(std::move(parameters));  // Parameter list
        node->children.push_back(std::move(body));        // Function body
        return node;
    }

    static std::shared_ptr<ASTNode> makeReturnStatement(std::shared_ptr<ASTNode> argument) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::ReturnStatement);
        if(argument) {
            node->children.push_back(std::move(argument));
        }
        return node;
    }

    static std::shared_ptr<ASTNode> makeThrowStatement(std::shared_ptr<ASTNode> argument) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::ThrowStatement);
        if(argument) {
            node->children.push_back(std::move(argument));
        }
        return node;
    }

    static std::shared_ptr<ASTNode> makeTryStatement(
        std::shared_ptr<ASTNode> tryBlock, std::shared_ptr<ASTNode> catchClause = nullptr,
        std::shared_ptr<ASTNode> finallyClause = nullptr) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::TryStatement);
        node->children.push_back(std::move(tryBlock));
        if(catchClause) {
            node->children.push_back(std::move(catchClause));
        }
        if(finallyClause) {
            node->children.push_back(std::move(finallyClause));
        }
        return node;
    }

    static std::shared_ptr<ASTNode> makeCatchClause(const std::string& parameter,
                                                    std::shared_ptr<ASTNode> body) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::CatchClause, parameter);
        node->children.push_back(std::move(body));
        return node;
    }

    static std::shared_ptr<ASTNode> makeFinallyClause(std::shared_ptr<ASTNode> body) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::FinallyClause);
        node->children.push_back(std::move(body));
        return node;
    }

    static std::shared_ptr<ASTNode> makeParameterList() {
        return std::make_shared<ASTNode>(ASTNodeType::ParameterList);
    }

    // Helper to add argument to call expression
    static void addArgument(std::shared_ptr<ASTNode> callExpression,
                            std::shared_ptr<ASTNode> argument) {
        if(callExpression->type == ASTNodeType::CallExpression) {
            callExpression->children.push_back(std::move(argument));
        }
    }

    // Helper to add argument to new expression
    static void addNewArgument(std::shared_ptr<ASTNode> newExpression,
                               std::shared_ptr<ASTNode> argument) {
        if(newExpression->type == ASTNodeType::NewExpression) {
            newExpression->children.push_back(std::move(argument));
        }
    }

    // Helper to add element to array literal
    static void addArrayElement(std::shared_ptr<ASTNode> arrayLiteral,
                                std::shared_ptr<ASTNode> element) {
        if(arrayLiteral->type == ASTNodeType::ArrayLiteral) {
            arrayLiteral->children.push_back(std::move(element));
        }
    }

    // Helper to add property to object literal
    // For object literals, we store key-value pairs as pairs of child nodes
    static void addObjectProperty(std::shared_ptr<ASTNode> objectLiteral,
                                  std::shared_ptr<ASTNode> key, std::shared_ptr<ASTNode> value) {
        if(objectLiteral->type == ASTNodeType::ObjectLiteral) {
            objectLiteral->children.push_back(key);
            objectLiteral->children.push_back(value);
        }
    }

    // Helper to add statement to program or block
    static void addStatement(std::shared_ptr<ASTNode> container,
                             std::shared_ptr<ASTNode> statement) {
        if(container->type == ASTNodeType::Program ||
           container->type == ASTNodeType::BlockStatement) {
            container->children.push_back(statement);
        }
    }

    // Helper to add parameter to parameter list
    static void addParameter(std::shared_ptr<ASTNode> parameterList,
                             std::shared_ptr<ASTNode> parameter) {
        if(parameterList->type == ASTNodeType::ParameterList) {
            parameterList->children.push_back(parameter);
        }
    }

    // Template literal factories
    static std::shared_ptr<ASTNode> makeTemplateLiteral() {
        return std::make_shared<ASTNode>(ASTNodeType::TemplateLiteral);
    }

    static std::shared_ptr<ASTNode> makeTemplateElement(const std::string& value) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::TemplateElement, value);
        return node;
    }

    static std::shared_ptr<ASTNode> makeTemplateExpression(std::shared_ptr<ASTNode> expression) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::TemplateExpression);
        node->children.push_back(expression);
        return node;
    }

    // Helper to add element to template literal
    static void addTemplateElement(std::shared_ptr<ASTNode> templateLiteral,
                                   std::shared_ptr<ASTNode> element) {
        if(templateLiteral->type == ASTNodeType::TemplateLiteral) {
            templateLiteral->children.push_back(element);
        }
    }

    // Switch statement factory methods
    static std::shared_ptr<ASTNode> makeSwitchStatement(std::shared_ptr<ASTNode> discriminant) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::SwitchStatement);
        node->children.push_back(discriminant);
        return node;
    }

    static std::shared_ptr<ASTNode> makeCaseClause(std::shared_ptr<ASTNode> test) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::CaseClause);
        if(test) {
            node->children.push_back(test);
        }
        return node;
    }

    static std::shared_ptr<ASTNode> makeDefaultClause() {
        return std::make_shared<ASTNode>(ASTNodeType::DefaultClause);
    }

    static std::shared_ptr<ASTNode> makeBreakStatement() {
        return std::make_shared<ASTNode>(ASTNodeType::BreakStatement);
    }

    static std::shared_ptr<ASTNode> makeContinueStatement() {
        return std::make_shared<ASTNode>(ASTNodeType::ContinueStatement);
    }

    static void addSwitchCase(std::shared_ptr<ASTNode> switchNode,
                              std::shared_ptr<ASTNode> caseClause) {
        if(switchNode->type == ASTNodeType::SwitchStatement) {
            switchNode->children.push_back(caseClause);
        }
    }

    static void addCaseStatement(std::shared_ptr<ASTNode> caseClause,
                                 std::shared_ptr<ASTNode> statement) {
        if(caseClause->type == ASTNodeType::CaseClause ||
           caseClause->type == ASTNodeType::DefaultClause) {
            caseClause->children.push_back(statement);
        }
    }
};

}  // namespace rift::ast