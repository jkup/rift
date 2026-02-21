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
                                                             std::shared_ptr<ASTNode> right,
                                                             const std::string& operator_ = "=") {
        auto node = std::make_shared<ASTNode>(ASTNodeType::AssignmentExpression, operator_);
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
        node->children.push_back(std::move(body));       // body first
        node->children.push_back(std::move(condition));  // condition second
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

    // For-in statement: for (left in right) body
    // children[0] = left (variable declaration or identifier)
    // children[1] = right (object to iterate)
    // children[2] = body
    static std::shared_ptr<ASTNode> makeForInStatement(std::shared_ptr<ASTNode> left,
                                                       std::shared_ptr<ASTNode> right,
                                                       std::shared_ptr<ASTNode> body) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::ForInStatement);
        node->children.push_back(std::move(left));
        node->children.push_back(std::move(right));
        node->children.push_back(std::move(body));
        return node;
    }

    // For-of statement: for (left of right) body
    // children[0] = left (variable declaration or identifier)
    // children[1] = right (iterable to iterate)
    // children[2] = body
    static std::shared_ptr<ASTNode> makeForOfStatement(std::shared_ptr<ASTNode> left,
                                                       std::shared_ptr<ASTNode> right,
                                                       std::shared_ptr<ASTNode> body) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::ForOfStatement);
        node->children.push_back(std::move(left));
        node->children.push_back(std::move(right));
        node->children.push_back(std::move(body));
        return node;
    }

    // For-await-of statement: for await (left of right) body
    // children[0] = left (variable declaration or identifier)
    // children[1] = right (async iterable to iterate)
    // children[2] = body
    static std::shared_ptr<ASTNode> makeForAwaitOfStatement(std::shared_ptr<ASTNode> left,
                                                            std::shared_ptr<ASTNode> right,
                                                            std::shared_ptr<ASTNode> body) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::ForAwaitOfStatement);
        node->children.push_back(std::move(left));
        node->children.push_back(std::move(right));
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

    // Arrow function expression factory
    // children[0] = parameters (ParameterList)
    // children[1] = body (BlockStatement or expression)
    // metadata = "expression" if concise body (implicit return), empty if block body
    static std::shared_ptr<ASTNode> makeArrowFunctionExpression(std::shared_ptr<ASTNode> parameters,
                                                                std::shared_ptr<ASTNode> body,
                                                                bool isExpressionBody = false) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::ArrowFunctionExpression);
        node->children.push_back(std::move(parameters));  // Parameter list
        node->children.push_back(std::move(body));        // Body (block or expression)
        if(isExpressionBody) {
            node->metadata = "expression";  // Flag for implicit return
        }
        return node;
    }

    // Generator function declaration: function* name() {}
    // value = function name
    // children[0] = parameters (ParameterList)
    // children[1] = body (BlockStatement)
    static std::shared_ptr<ASTNode> makeGeneratorFunctionDeclaration(
        const std::string& name, std::shared_ptr<ASTNode> parameters,
        std::shared_ptr<ASTNode> body) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::GeneratorFunctionDeclaration, name);
        node->children.push_back(std::move(parameters));
        node->children.push_back(std::move(body));
        return node;
    }

    // Generator function expression: function*() {} or function* name() {}
    // value = optional function name (empty for anonymous)
    // children[0] = parameters (ParameterList)
    // children[1] = body (BlockStatement)
    static std::shared_ptr<ASTNode> makeGeneratorFunctionExpression(
        std::shared_ptr<ASTNode> parameters, std::shared_ptr<ASTNode> body,
        const std::string& name = "") {
        auto node = std::make_shared<ASTNode>(ASTNodeType::GeneratorFunctionExpression, name);
        node->children.push_back(std::move(parameters));
        node->children.push_back(std::move(body));
        return node;
    }

    // Yield expression: yield value or yield* iterable
    // children[0] = argument expression (may be nullptr for bare yield)
    // metadata = "" for yield, "delegate" for yield*
    static std::shared_ptr<ASTNode> makeYieldExpression(std::shared_ptr<ASTNode> argument,
                                                        bool delegate = false) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::YieldExpression);
        if(argument) {
            node->children.push_back(std::move(argument));
        }
        if(delegate) {
            node->metadata = "delegate";
        }
        return node;
    }

    // Generator method in class: *method() {}
    // Same structure as MethodDefinition but with GeneratorMethod type
    // value = method name
    // metadata = "static" for static methods, "computed" for computed names
    // children[0] = parameters (ParameterList)
    // children[1] = body (BlockStatement)
    // children[2] = computed key expression (optional)
    static std::shared_ptr<ASTNode> makeGeneratorMethod(
        const std::string& name, std::shared_ptr<ASTNode> parameters, std::shared_ptr<ASTNode> body,
        bool isStatic = false, bool isComputed = false,
        std::shared_ptr<ASTNode> computedKey = nullptr) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::GeneratorMethod, name);
        node->children.push_back(std::move(parameters));
        node->children.push_back(std::move(body));

        std::string metadata;
        if(isStatic) {
            metadata = "static";
        }
        if(isComputed) {
            metadata = metadata.empty() ? "computed" : metadata + ",computed";
            if(computedKey) {
                node->children.push_back(std::move(computedKey));
            }
        }
        node->metadata = metadata;
        return node;
    }

    // Async method in class: async method() {}
    // Same structure as MethodDefinition but with AsyncMethod type
    // value = method name
    // metadata = "static" for static methods, "computed" for computed names
    // children[0] = parameters (ParameterList)
    // children[1] = body (BlockStatement)
    // children[2] = computed key expression (optional)
    static std::shared_ptr<ASTNode> makeAsyncMethod(
        const std::string& name, std::shared_ptr<ASTNode> parameters, std::shared_ptr<ASTNode> body,
        bool isStatic = false, bool isComputed = false,
        std::shared_ptr<ASTNode> computedKey = nullptr) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::AsyncMethod, name);
        node->children.push_back(std::move(parameters));
        node->children.push_back(std::move(body));

        std::string metadata;
        if(isStatic) {
            metadata = "static";
        }
        if(isComputed) {
            metadata = metadata.empty() ? "computed" : metadata + ",computed";
            if(computedKey) {
                node->children.push_back(std::move(computedKey));
            }
        }
        node->metadata = metadata;
        return node;
    }

    // Async function declaration: async function name() {}
    // value = function name
    // children[0] = parameters (ParameterList)
    // children[1] = body (BlockStatement)
    static std::shared_ptr<ASTNode> makeAsyncFunctionDeclaration(
        const std::string& name, std::shared_ptr<ASTNode> parameters,
        std::shared_ptr<ASTNode> body) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::AsyncFunctionDeclaration, name);
        node->children.push_back(std::move(parameters));
        node->children.push_back(std::move(body));
        return node;
    }

    // Async function expression: async function() {} or async function name() {}
    // value = optional function name (empty for anonymous)
    // children[0] = parameters (ParameterList)
    // children[1] = body (BlockStatement)
    static std::shared_ptr<ASTNode> makeAsyncFunctionExpression(std::shared_ptr<ASTNode> parameters,
                                                                std::shared_ptr<ASTNode> body,
                                                                const std::string& name = "") {
        auto node = std::make_shared<ASTNode>(ASTNodeType::AsyncFunctionExpression, name);
        node->children.push_back(std::move(parameters));
        node->children.push_back(std::move(body));
        return node;
    }

    // Await expression: await value
    // children[0] = argument expression
    static std::shared_ptr<ASTNode> makeAwaitExpression(std::shared_ptr<ASTNode> argument) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::AwaitExpression);
        if(argument) {
            node->children.push_back(std::move(argument));
        }
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

    // Spread element factory for spread operator (...expr)
    static std::shared_ptr<ASTNode> makeSpreadElement(std::shared_ptr<ASTNode> argument) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::SpreadElement);
        node->children.push_back(std::move(argument));
        return node;
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

    static std::shared_ptr<ASTNode> makeBreakStatement(const std::string& label = "") {
        return std::make_shared<ASTNode>(ASTNodeType::BreakStatement, label);
    }

    static std::shared_ptr<ASTNode> makeContinueStatement(const std::string& label = "") {
        return std::make_shared<ASTNode>(ASTNodeType::ContinueStatement, label);
    }

    // Labeled statement: label: statement
    // value = label name
    // children[0] = body statement
    static std::shared_ptr<ASTNode> makeLabeledStatement(const std::string& label,
                                                         std::shared_ptr<ASTNode> body) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::LabeledStatement, label);
        node->children.push_back(std::move(body));
        return node;
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

    // Destructuring pattern factories
    static std::shared_ptr<ASTNode> makeArrayPattern() {
        return std::make_shared<ASTNode>(ASTNodeType::ArrayPattern);
    }

    static std::shared_ptr<ASTNode> makeObjectPattern() {
        return std::make_shared<ASTNode>(ASTNodeType::ObjectPattern);
    }

    // AssignmentPattern represents a pattern with default value: x = 10
    // children[0] = pattern (Identifier, ArrayPattern, or ObjectPattern)
    // children[1] = default value expression
    static std::shared_ptr<ASTNode> makeAssignmentPattern(std::shared_ptr<ASTNode> left,
                                                          std::shared_ptr<ASTNode> right) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::AssignmentPattern);
        node->children.push_back(std::move(left));
        node->children.push_back(std::move(right));
        return node;
    }

    // RestElement represents ...rest in destructuring patterns
    // children[0] = identifier that collects remaining values
    static std::shared_ptr<ASTNode> makeRestElement(std::shared_ptr<ASTNode> argument) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::RestElement);
        node->children.push_back(std::move(argument));
        return node;
    }

    static void addArrayPatternElement(std::shared_ptr<ASTNode> pattern,
                                       std::shared_ptr<ASTNode> element) {
        if(pattern->type == ASTNodeType::ArrayPattern) {
            pattern->children.push_back(std::move(element));
        }
    }

    // Object pattern stores key-value pairs like ObjectLiteral
    // For {a: b}, key=Identifier("a"), value=Identifier("b")
    // For {a}, key=Identifier("a"), value=Identifier("a") (shorthand)
    // For {...rest}, key=RestElement, value=nullptr
    static void addObjectPatternProperty(std::shared_ptr<ASTNode> pattern,
                                         std::shared_ptr<ASTNode> key,
                                         std::shared_ptr<ASTNode> value) {
        if(pattern->type == ASTNodeType::ObjectPattern) {
            pattern->children.push_back(std::move(key));
            if(value) {
                pattern->children.push_back(std::move(value));
            }
        }
    }

    // Class-related factories

    // ClassDeclaration: class Foo extends Bar { ... }
    // value = class name
    // children[0] = superclass expression (or nullptr if no extends)
    // children[1] = class body
    static std::shared_ptr<ASTNode> makeClassDeclaration(const std::string& name,
                                                         std::shared_ptr<ASTNode> superClass,
                                                         std::shared_ptr<ASTNode> body) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::ClassDeclaration, name);
        node->children.push_back(std::move(superClass));  // May be nullptr
        node->children.push_back(std::move(body));
        return node;
    }

    // ClassExpression: const Foo = class { ... } or class Bar { ... }
    // value = optional class name (empty for anonymous)
    // children[0] = superclass expression (or nullptr)
    // children[1] = class body
    static std::shared_ptr<ASTNode> makeClassExpression(const std::string& name,
                                                        std::shared_ptr<ASTNode> superClass,
                                                        std::shared_ptr<ASTNode> body) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::ClassExpression, name);
        node->children.push_back(std::move(superClass));  // May be nullptr
        node->children.push_back(std::move(body));
        return node;
    }

    // ClassBody: container for method definitions
    static std::shared_ptr<ASTNode> makeClassBody() {
        return std::make_shared<ASTNode>(ASTNodeType::ClassBody);
    }

    // MethodDefinition: method() { } or static method() { }
    // value = method name
    // metadata = "static" for static methods, "constructor" for constructor, "" otherwise
    //            may include "computed" flag for computed property names
    // children[0] = parameters (ParameterList)
    // children[1] = body (BlockStatement)
    // children[2] = computed key expression (optional, for computed property names)
    static std::shared_ptr<ASTNode> makeMethodDefinition(
        const std::string& name, std::shared_ptr<ASTNode> parameters, std::shared_ptr<ASTNode> body,
        bool isStatic = false, bool isComputed = false,
        std::shared_ptr<ASTNode> computedKey = nullptr) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::MethodDefinition, name);
        node->children.push_back(std::move(parameters));
        node->children.push_back(std::move(body));

        // Build metadata string
        std::string metadata;
        if(name == "constructor") {
            metadata = "constructor";
        }
        if(isStatic) {
            metadata = metadata.empty() ? "static" : metadata + ",static";
        }
        if(isComputed) {
            metadata = metadata.empty() ? "computed" : metadata + ",computed";
            if(computedKey) {
                node->children.push_back(std::move(computedKey));
            }
        }
        node->metadata = metadata;
        return node;
    }

    // SuperExpression: super (for super() calls)
    static std::shared_ptr<ASTNode> makeSuperExpression() {
        return std::make_shared<ASTNode>(ASTNodeType::SuperExpression, "call");
    }

    // SuperMemberExpression: super.property or super[expr]
    // value = "member"
    // children[0] = property identifier or computed expression
    // metadata = "computed" if bracket notation
    static std::shared_ptr<ASTNode> makeSuperMemberExpression(std::shared_ptr<ASTNode> property,
                                                              bool computed = false) {
        auto node = std::make_shared<ASTNode>(ASTNodeType::SuperExpression, "member");
        node->children.push_back(std::move(property));
        if(computed) {
            node->metadata = "computed";
        }
        return node;
    }

    // Helper to add method to class body
    static void addMethodToClassBody(std::shared_ptr<ASTNode> body,
                                     std::shared_ptr<ASTNode> method) {
        if(body->type == ASTNodeType::ClassBody) {
            body->children.push_back(std::move(method));
        }
    }
};

}  // namespace rift::ast