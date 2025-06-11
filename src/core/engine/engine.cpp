#include "engine.h"

#include "../../builtins/console/console.h"
#include "../../builtins/global/global.h"
#include "../../builtins/math/math.h"
#include "../../builtins/string/string.h"

namespace jsruntime::core {

JSEngine::JSEngine() {
    global_env_ = std::make_shared<Environment>();
    setupBuiltins();
}

Value JSEngine::execute(std::shared_ptr<ASTNode> ast) { return evaluate(ast, global_env_); }

Value JSEngine::evaluate(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env) {
    if (!node) {
        return Value::undefined();
    }

    switch (node->type) {
        case ASTNodeType::Program:
            return evaluateBlockStatement(node, env);
        case ASTNodeType::Identifier:
            return evaluateIdentifier(node, env);
        case ASTNodeType::Literal:
            return evaluateLiteral(node, env);
        case ASTNodeType::BinaryExpression:
            return evaluateBinaryExpression(node, env);
        case ASTNodeType::UnaryExpression:
            return evaluateUnaryExpression(node, env);
        case ASTNodeType::AssignmentExpression:
            return evaluateAssignmentExpression(node, env);
        case ASTNodeType::CallExpression:
            return evaluateCallExpression(node, env);
        case ASTNodeType::MemberExpression:
            return evaluateMemberExpression(node, env);
        case ASTNodeType::BlockStatement:
            return evaluateBlockStatement(node, env);
        case ASTNodeType::ExpressionStatement:
            return evaluateExpressionStatement(node, env);
        case ASTNodeType::VariableDeclaration:
            return evaluateVariableDeclaration(node, env);
        case ASTNodeType::IfStatement:
            return evaluateIfStatement(node, env);
        default:
            return Value::undefined();
    }
}

void JSEngine::setupBuiltins() {
    // Setup global functions (parseInt, parseFloat, isNaN, isFinite, etc.)
    builtins::Global::setupGlobalFunctions(global_env_);

    // Setup console object
    auto console = builtins::Console::create();
    global_env_->define("console", Value(console));

    // Setup Math object
    auto math = builtins::Math::create();
    global_env_->define("Math", Value(math));

    // Setup String object
    auto string = builtins::String::create();
    global_env_->define("String", Value(string));
}

// Basic implementations - will be enhanced
Value JSEngine::evaluateIdentifier(std::shared_ptr<ASTNode> node,
                                   std::shared_ptr<Environment> env) {
    return env->get(node->value);
}

Value JSEngine::evaluateLiteral(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env) {
    // Parse literal values
    if (node->value == "true") return Value(true);
    if (node->value == "false") return Value(false);
    if (node->value == "null") return Value::null();
    if (node->value == "undefined") return Value::undefined();

    // Try to parse as number
    try {
        double num = std::stod(node->value);
        return Value(num);
    } catch (...) {
        // Must be a string - remove quotes if present
        std::string str = node->value;
        if (str.length() >= 2 && str[0] == '"' && str.back() == '"') {
            str = str.substr(1, str.length() - 2);
        }
        return Value(str);
    }
}

Value JSEngine::evaluateBinaryExpression(std::shared_ptr<ASTNode> node,
                                         std::shared_ptr<Environment> env) {
    if (node->children.size() != 2) {
        return Value::undefined();
    }

    Value left = evaluate(node->children[0], env);
    Value right = evaluate(node->children[1], env);

    return performBinaryOperation(node->value, left, right);
}

Value JSEngine::evaluateExpressionStatement(std::shared_ptr<ASTNode> node,
                                            std::shared_ptr<Environment> env) {
    if (!node->children.empty()) {
        return evaluate(node->children[0], env);
    }
    return Value::undefined();
}

Value JSEngine::evaluateBlockStatement(std::shared_ptr<ASTNode> node,
                                       std::shared_ptr<Environment> env) {
    Value result = Value::undefined();
    for (auto& child : node->children) {
        result = evaluate(child, env);
    }
    return result;
}

Value JSEngine::performBinaryOperation(const std::string& op, const Value& left,
                                       const Value& right) {
    if (op == "+") {
        if (left.isString() || right.isString()) {
            return Value(left.toString() + right.toString());
        }
        return Value(left.toNumber() + right.toNumber());
    }
    if (op == "-") return Value(left.toNumber() - right.toNumber());
    if (op == "*") return Value(left.toNumber() * right.toNumber());
    if (op == "/") return Value(left.toNumber() / right.toNumber());
    if (op == "==") return Value(left.toString() == right.toString());
    if (op == "!=") return Value(left.toString() != right.toString());
    if (op == "<") return Value(left.toNumber() < right.toNumber());
    if (op == ">") return Value(left.toNumber() > right.toNumber());
    if (op == "<=") return Value(left.toNumber() <= right.toNumber());
    if (op == ">=") return Value(left.toNumber() >= right.toNumber());

    return Value::undefined();
}

// Stub implementations for other methods
Value JSEngine::evaluateUnaryExpression(std::shared_ptr<ASTNode> node,
                                        std::shared_ptr<Environment> env) {
    if (node->children.size() != 1) {
        return Value::undefined();
    }

    Value operand = evaluate(node->children[0], env);
    return performUnaryOperation(node->value, operand);
}

Value JSEngine::evaluateAssignmentExpression(std::shared_ptr<ASTNode> node,
                                             std::shared_ptr<Environment> env) {
    if (node->children.size() != 2) {
        return Value::undefined();
    }

    // Get the variable name (left side)
    std::string varName = node->children[0]->value;

    // Evaluate the right side
    Value value = evaluate(node->children[1], env);

    // Set the variable in the environment
    env->set(varName, value);

    return value;
}

Value JSEngine::evaluateCallExpression(std::shared_ptr<ASTNode> node,
                                       std::shared_ptr<Environment> env) {
    if (node->children.size() < 1) {
        return Value::undefined();
    }

    // Evaluate the function/callee
    Value callee = evaluate(node->children[0], env);

    // Evaluate arguments
    std::vector<Value> args;
    for (size_t i = 1; i < node->children.size(); ++i) {
        args.push_back(evaluate(node->children[i], env));
    }

    // If it's a function object, call it
    if (callee.isFunction()) {
        auto func = std::dynamic_pointer_cast<JSFunction>(callee.getObject());
        if (func) {
            return func->call(args);
        }
    }

    return Value::undefined();
}

Value JSEngine::evaluateMemberExpression(std::shared_ptr<ASTNode> node,
                                         std::shared_ptr<Environment> env) {
    if (node->children.size() != 2) {
        return Value::undefined();
    }

    // Evaluate the object
    Value object = evaluate(node->children[0], env);

    // Get the property name
    std::string property = node->children[1]->value;

    // If it's an object, get the property
    if (object.isObject() || object.isFunction()) {
        auto obj = object.getObject();
        if (obj) {
            return obj->getProperty(property);
        }
    }

    // Handle string primitive boxing - look up methods in String.prototype
    if (object.isString()) {
        // Get the String constructor from global environment
        Value stringConstructor = global_env_->get("String");
        if (stringConstructor.isObject()) {
            auto stringObj = stringConstructor.getObject();
            // Get the prototype
            Value prototype = stringObj->getProperty("prototype");
            if (prototype.isObject()) {
                auto prototypeObj = prototype.getObject();
                // Look up the method in the prototype
                Value method = prototypeObj->getProperty(property);
                if (method.isFunction()) {
                    // Create a bound method that includes the string value as the first argument
                    auto func = std::dynamic_pointer_cast<JSFunction>(method.getObject());
                    if (func) {
                        // Create a wrapper function that prepends the string value to the arguments
                        auto boundFunc = std::make_shared<JSFunction>(
                            [object, func](const std::vector<Value>& args) -> Value {
                                std::vector<Value> newArgs;
                                newArgs.push_back(object);  // Add the string as 'this' value
                                newArgs.insert(newArgs.end(), args.begin(), args.end());
                                return func->call(newArgs);
                            });
                        return Value(boundFunc);
                    }
                }
            }
        }
    }

    return Value::undefined();
}

Value JSEngine::evaluateVariableDeclaration(std::shared_ptr<ASTNode> node,
                                            std::shared_ptr<Environment> env) {
    if (node->children.size() < 1) {
        return Value::undefined();
    }

    // Get the variable name
    std::string varName = node->value;

    // Get the initial value if provided
    Value value = Value::undefined();
    if (node->children.size() > 0) {
        value = evaluate(node->children[0], env);
    }

    // Define the variable in the environment
    env->define(varName, value);

    return value;
}

Value JSEngine::evaluateIfStatement(std::shared_ptr<ASTNode> node,
                                    std::shared_ptr<Environment> env) {
    return Value::undefined();
}

Value JSEngine::evaluateWhileStatement(std::shared_ptr<ASTNode> node,
                                       std::shared_ptr<Environment> env) {
    return Value::undefined();
}

Value JSEngine::evaluateReturnStatement(std::shared_ptr<ASTNode> node,
                                        std::shared_ptr<Environment> env) {
    return Value::undefined();
}

Value JSEngine::performUnaryOperation(const std::string& op, const Value& operand) {
    if (op == "-") {
        return Value(-operand.toNumber());
    }
    if (op == "+") {
        return Value(operand.toNumber());
    }

    return Value::undefined();
}

}  // namespace jsruntime::core