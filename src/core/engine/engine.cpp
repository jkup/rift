#include "rift/core/engine/engine.h"

#include "rift/builtins/array/array.h"
#include "rift/builtins/console/console.h"
#include "rift/builtins/global/global.h"
#include "rift/builtins/math/math.h"
#include "rift/builtins/string/string.h"

namespace rift::core {

Rift::Rift() {
    global_env_ = std::make_shared<Environment>();
    setupBuiltins();
}

Value Rift::execute(std::shared_ptr<ASTNode> ast) { return evaluate(ast, global_env_); }

Value Rift::evaluate(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env) {
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
        case ASTNodeType::ArrayLiteral:
            return evaluateArrayLiteral(node, env);
        default:
            return Value::undefined();
    }
}

void Rift::setupBuiltins() {
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

    // Setup Array object
    auto array = builtins::Array::create();
    global_env_->define("Array", Value(array));
}

// Basic implementations - will be enhanced
Value Rift::evaluateIdentifier(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env) {
    return env->get(node->value);
}

Value Rift::evaluateLiteral(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env) {
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

Value Rift::evaluateBinaryExpression(std::shared_ptr<ASTNode> node,
                                     std::shared_ptr<Environment> env) {
    if (node->children.size() != 2) {
        return Value::undefined();
    }

    Value left = evaluate(node->children[0], env);
    Value right = evaluate(node->children[1], env);

    return performBinaryOperation(node->value, left, right);
}

Value Rift::evaluateExpressionStatement(std::shared_ptr<ASTNode> node,
                                        std::shared_ptr<Environment> env) {
    if (!node->children.empty()) {
        return evaluate(node->children[0], env);
    }
    return Value::undefined();
}

Value Rift::evaluateBlockStatement(std::shared_ptr<ASTNode> node,
                                   std::shared_ptr<Environment> env) {
    Value result = Value::undefined();
    for (auto& child : node->children) {
        result = evaluate(child, env);
    }
    return result;
}

Value Rift::performBinaryOperation(const std::string& op, const Value& left, const Value& right) {
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
    if (op == "===") {
        // Strict equality - check both type and value
        if (left.getType() != right.getType()) {
            return Value(false);
        }
        // Same type, compare values
        if (left.isNumber()) {
            return Value(left.toNumber() == right.toNumber());
        } else if (left.isString()) {
            return Value(left.toString() == right.toString());
        } else if (left.isBoolean()) {
            return Value(left.toBool() == right.toBool());
        } else if (left.isNull() && right.isNull()) {
            return Value(true);
        } else if (left.isUndefined() && right.isUndefined()) {
            return Value(true);
        } else {
            // For objects, compare reference (simplified)
            return Value(left.toString() == right.toString());
        }
    }
    if (op == "!==") {
        // Strict inequality - opposite of strict equality
        if (left.getType() != right.getType()) {
            return Value(true);
        }
        // Same type, compare values and negate
        if (left.isNumber()) {
            return Value(left.toNumber() != right.toNumber());
        } else if (left.isString()) {
            return Value(left.toString() != right.toString());
        } else if (left.isBoolean()) {
            return Value(left.toBool() != right.toBool());
        } else if (left.isNull() && right.isNull()) {
            return Value(false);
        } else if (left.isUndefined() && right.isUndefined()) {
            return Value(false);
        } else {
            // For objects, compare reference (simplified)
            return Value(left.toString() != right.toString());
        }
    }
    if (op == "<") return Value(left.toNumber() < right.toNumber());
    if (op == ">") return Value(left.toNumber() > right.toNumber());
    if (op == "<=") return Value(left.toNumber() <= right.toNumber());
    if (op == ">=") return Value(left.toNumber() >= right.toNumber());

    return Value::undefined();
}

// Stub implementations for other methods
Value Rift::evaluateUnaryExpression(std::shared_ptr<ASTNode> node,
                                    std::shared_ptr<Environment> env) {
    if (node->children.size() != 1) {
        return Value::undefined();
    }

    // Special handling for typeof operator
    if (node->value == "typeof") {
        auto operandNode = node->children[0];

        // If the operand is an identifier, we need to handle the case where it might not exist
        if (operandNode->type == ASTNodeType::Identifier) {
            try {
                Value operand = evaluate(operandNode, env);
                return performUnaryOperation(node->value, operand);
            } catch (...) {
                // If the identifier doesn't exist, typeof should return "undefined"
                return Value("undefined");
            }
        } else {
            // For non-identifier operands, evaluate normally
            Value operand = evaluate(operandNode, env);
            return performUnaryOperation(node->value, operand);
        }
    }

    // For other unary operators, evaluate the operand normally
    Value operand = evaluate(node->children[0], env);
    return performUnaryOperation(node->value, operand);
}

Value Rift::evaluateAssignmentExpression(std::shared_ptr<ASTNode> node,
                                         std::shared_ptr<Environment> env) {
    if (node->children.size() != 2) {
        return Value::undefined();
    }

    auto leftSide = node->children[0];
    Value rightValue = evaluate(node->children[1], env);

    // Check if left side is a member expression (property assignment)
    if (leftSide->type == ASTNodeType::MemberExpression) {
        if (leftSide->children.size() != 2) {
            return Value::undefined();
        }

        // Evaluate the object
        Value object = evaluate(leftSide->children[0], env);

        // Get the property name - handle both dot and bracket notation
        std::string property;
        if (leftSide->children[1]->type == ASTNodeType::Literal ||
            leftSide->children[1]->type == ASTNodeType::BinaryExpression ||
            leftSide->children[1]->type == ASTNodeType::CallExpression) {
            // Bracket notation - evaluate the property expression
            Value propertyValue = evaluate(leftSide->children[1], env);
            property = propertyValue.toString();
        } else {
            // Dot notation - use the identifier value directly
            property = leftSide->children[1]->value;
        }

        // Set the property on the object
        if (object.isObject() || object.isFunction()) {
            auto obj = object.getObject();
            if (obj) {
                obj->setProperty(property, rightValue);

                // Special handling for arrays: update length if necessary
                if (property != "length") {
                    // Check if this is a numeric index
                    try {
                        size_t index = std::stoull(property);
                        Value lengthVal = obj->getProperty("length");
                        if (lengthVal.isNumber()) {
                            size_t currentLength = static_cast<size_t>(lengthVal.toNumber());
                            if (index >= currentLength) {
                                obj->setProperty("length", Value(static_cast<double>(index + 1)));
                            }
                        }
                    } catch (...) {
                        // Not a numeric index, ignore
                    }
                }
            }
        }

        return rightValue;
    } else {
        // Simple variable assignment
        std::string varName = leftSide->value;
        env->set(varName, rightValue);
        return rightValue;
    }
}

Value Rift::evaluateCallExpression(std::shared_ptr<ASTNode> node,
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

Value Rift::evaluateMemberExpression(std::shared_ptr<ASTNode> node,
                                     std::shared_ptr<Environment> env) {
    if (node->children.size() != 2) {
        return Value::undefined();
    }

    // Evaluate the object
    Value object = evaluate(node->children[0], env);

    // Get the property name - could be static (dot notation) or computed (bracket notation)
    std::string property;

    // Check if this is computed member access (bracket notation)
    // In bracket notation, the property is an expression that needs to be evaluated
    if (node->children[1]->type == ASTNodeType::Literal ||
        node->children[1]->type == ASTNodeType::BinaryExpression ||
        node->children[1]->type == ASTNodeType::CallExpression) {
        // This is bracket notation - evaluate the property expression
        Value propertyValue = evaluate(node->children[1], env);
        property = propertyValue.toString();
    } else {
        // This is dot notation - use the identifier value directly
        property = node->children[1]->value;
    }

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

Value Rift::evaluateVariableDeclaration(std::shared_ptr<ASTNode> node,
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

Value Rift::evaluateIfStatement(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env) {
    if (node->children.size() < 2) {
        return Value::undefined();
    }

    // Evaluate the condition
    Value condition = evaluate(node->children[0], env);

    // If condition is truthy, evaluate the then branch
    if (condition.toBool()) {
        return evaluate(node->children[1], env);
    }

    // If there's an else clause and condition is falsy, evaluate the else branch
    if (node->children.size() > 2) {
        return evaluate(node->children[2], env);
    }

    return Value::undefined();
}

Value Rift::evaluateWhileStatement(std::shared_ptr<ASTNode> node,
                                   std::shared_ptr<Environment> env) {
    return Value::undefined();
}

Value Rift::evaluateReturnStatement(std::shared_ptr<ASTNode> node,
                                    std::shared_ptr<Environment> env) {
    return Value::undefined();
}

Value Rift::performUnaryOperation(const std::string& op, const Value& operand) {
    if (op == "-") {
        return Value(-operand.toNumber());
    }
    if (op == "+") {
        return Value(operand.toNumber());
    }
    if (op == "!") {
        // Logical NOT operator - convert to boolean and negate
        return Value(!operand.toBool());
    }
    if (op == "typeof") {
        // Return the type of the operand as a string
        if (operand.isUndefined()) {
            return Value("undefined");
        } else if (operand.isNull()) {
            return Value("object");  // In JavaScript, typeof null === "object"
        } else if (operand.isBoolean()) {
            return Value("boolean");
        } else if (operand.isNumber()) {
            return Value("number");
        } else if (operand.isString()) {
            return Value("string");
        } else if (operand.isFunction()) {
            return Value("function");
        } else if (operand.isObject()) {
            return Value("object");
        } else {
            return Value("undefined");
        }
    }
    if (op == "~") {
        // Bitwise NOT operator - convert to 32-bit integer and invert
        int32_t intValue = static_cast<int32_t>(operand.toNumber());
        return Value(static_cast<double>(~intValue));
    }

    return Value::undefined();
}

Value Rift::evaluateArrayLiteral(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env) {
    // Evaluate each element in the array literal
    std::vector<Value> elements;
    elements.reserve(node->children.size());

    for (const auto& child : node->children) {
        elements.push_back(evaluate(child, env));
    }

    // Use the Array::createArrayObject helper to create the array
    auto arrayObj = builtins::Array::createArrayObject(elements);
    return Value(arrayObj);
}

}  // namespace rift::core