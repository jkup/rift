/**
 * Expression Evaluator - Core Implementation
 *
 * This file contains the core expression evaluator functionality including:
 * - Main dispatcher (evaluate)
 * - Identifier evaluation
 * - Literal evaluation
 * - Binary expressions
 * - Unary expressions
 * - Template literals
 *
 * Assignment and update expressions are in expression_evaluator_assignment.cpp
 * Object/function expressions are in expression_evaluator_objects.cpp
 */

#include "rift/core/engine/expression_evaluator.h"

#include <iostream>
#include <limits>

#include "rift/core/engine/engine.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/core/engine/operation_handler.h"
#include "rift/runtime/values/object.h"

namespace rift::core {

Value ExpressionEvaluator::evaluate(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                                    Rift* engine) {
    if(!node) {
        return Value::undefined();
    }

    switch(node->type) {
        case ASTNodeType::Identifier:
            return evaluateIdentifier(node, env, engine);
        case ASTNodeType::Literal:
            return evaluateLiteral(node, env, engine);
        case ASTNodeType::BinaryExpression:
            return evaluateBinaryExpression(node, env, engine);
        case ASTNodeType::UnaryExpression:
            return evaluateUnaryExpression(node, env, engine);
        case ASTNodeType::UpdateExpression:
            return evaluateUpdateExpression(node, env, engine);
        case ASTNodeType::AssignmentExpression:
            return evaluateAssignmentExpression(node, env, engine);
        case ASTNodeType::CallExpression:
            return evaluateCallExpression(node, env, engine);
        case ASTNodeType::MemberExpression:
            return evaluateMemberExpression(node, env, engine);
        case ASTNodeType::ArrayLiteral:
            return evaluateArrayLiteral(node, env, engine);
        case ASTNodeType::ObjectLiteral:
            return evaluateObjectLiteral(node, env, engine);
        case ASTNodeType::FunctionExpression:
            return evaluateFunctionExpression(node, env, engine);
        case ASTNodeType::ArrowFunctionExpression:
            return evaluateArrowFunctionExpression(node, env, engine);
        case ASTNodeType::NewExpression:
            return evaluateNewExpression(node, env, engine);
        case ASTNodeType::TemplateLiteral:
            return evaluateTemplateLiteral(node, env, engine);
        case ASTNodeType::ClassExpression:
            return evaluateClassExpression(node, env, engine);
        case ASTNodeType::SuperExpression:
            return evaluateSuperExpression(node, env, engine);
        case ASTNodeType::GeneratorFunctionExpression:
            return evaluateGeneratorFunctionExpression(node, env, engine);
        case ASTNodeType::YieldExpression:
            return evaluateYieldExpression(node, env, engine);
        default:
            return Value::undefined();
    }
}

Value ExpressionEvaluator::evaluateIdentifier(std::shared_ptr<ASTNode> node,
                                              std::shared_ptr<Environment> env, Rift* engine) {
    // Special handling for 'this' keyword
    if(node->value == "this") {
        // Try to get 'this' from environment, return undefined if not found
        try {
            return env->get("this");
        } catch(const JavaScriptException&) {
            return Value::undefined();
        }
    }

    return env->get(node->value);
}

Value ExpressionEvaluator::evaluateLiteral(std::shared_ptr<ASTNode> node,
                                           std::shared_ptr<Environment> env, Rift* engine) {
    // Use metadata to determine literal type if available
    if(!node->metadata.empty()) {
        if(node->metadata == "string") {
            return Value(node->value);
        } else if(node->metadata == "number") {
            try {
                double num = std::stod(node->value);
                return Value(num);
            } catch(const std::invalid_argument& e) {
                std::cerr << "Warning: Invalid number literal '" << node->value << "': " << e.what()
                          << std::endl;
                return Value(0.0);  // fallback
            } catch(const std::out_of_range& e) {
                std::cerr << "Warning: Number literal out of range '" << node->value
                          << "': " << e.what() << std::endl;
                return Value(std::numeric_limits<double>::infinity());  // fallback to infinity
            }
        } else if(node->metadata == "boolean") {
            return Value(node->value == "true");
        } else if(node->metadata == "null") {
            return Value::null();
        } else if(node->metadata == "undefined") {
            return Value::undefined();
        }
    }

    // Fallback to old behavior for backward compatibility
    if(node->value == "true")
        return Value(true);
    if(node->value == "false")
        return Value(false);
    if(node->value == "null")
        return Value::null();
    if(node->value == "undefined")
        return Value::undefined();

    // Try to parse as number
    try {
        double num = std::stod(node->value);
        return Value(num);
    } catch(const std::invalid_argument&) {
        // Not a number - must be a string - remove quotes if present
        std::string str = node->value;
        if(str.length() >= 2 && str[0] == '"' && str.back() == '"') {
            str = str.substr(1, str.length() - 2);
        }
        return Value(str);
    } catch(const std::out_of_range&) {
        // Number out of range - treat as infinity
        return Value(std::numeric_limits<double>::infinity());
    }
}

Value ExpressionEvaluator::evaluateBinaryExpression(std::shared_ptr<ASTNode> node,
                                                    std::shared_ptr<Environment> env,
                                                    Rift* engine) {
    if(node->children.size() != 2) {
        return Value::undefined();
    }

    // Handle logical operators with short-circuit evaluation
    if(node->value == "||") {
        Value left = engine->evaluate(node->children[0], env);
        if(left.toBool()) {
            return left;  // Short-circuit: return left if truthy
        }
        return engine->evaluate(node->children[1], env);  // Evaluate right only if left is falsy
    }

    if(node->value == "&&") {
        Value left = engine->evaluate(node->children[0], env);
        if(!left.toBool()) {
            return left;  // Short-circuit: return left if falsy
        }
        return engine->evaluate(node->children[1], env);  // Evaluate right only if left is truthy
    }

    // Handle 'in' operator: check if property exists in object
    if(node->value == "in") {
        Value left = engine->evaluate(node->children[0], env);
        Value right = engine->evaluate(node->children[1], env);

        if(!right.isObject()) {
            throw JavaScriptException(Value("TypeError: Cannot use 'in' operator to search for '" +
                                            left.toString() + "' in " + right.toString()));
        }

        std::string propertyKey = left.toString();
        JSObject* obj = right.getObject();

        // Check if property exists (own or inherited)
        while(obj != nullptr) {
            if(obj->hasOwnProperty(propertyKey)) {
                return Value(true);
            }
            obj = obj->getPrototype();
        }
        return Value(false);
    }

    // For all other operators, evaluate both operands
    Value left = engine->evaluate(node->children[0], env);
    Value right = engine->evaluate(node->children[1], env);

    return OperationHandler::performBinaryOperation(node->value, left, right);
}

Value ExpressionEvaluator::evaluateUnaryExpression(std::shared_ptr<ASTNode> node,
                                                   std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() != 1) {
        return Value::undefined();
    }

    // Special handling for typeof operator
    if(node->value == "typeof") {
        auto operand_node = node->children[0];

        // If the operand is an identifier, we need to handle the case where it might not exist
        if(operand_node->type == ASTNodeType::Identifier) {
            try {
                Value operand = engine->evaluate(operand_node, env);
                return OperationHandler::performUnaryOperation(node->value, operand);
            } catch(const JavaScriptException&) {
                // If the identifier doesn't exist, typeof should return "undefined" per ECMAScript
                // spec
                return Value("undefined");
            } catch(const std::exception& e) {
                // Log unexpected exceptions but still return "undefined" for typeof robustness
                std::cerr << "Warning: Unexpected exception in typeof evaluation: " << e.what()
                          << std::endl;
                return Value("undefined");
            }
        } else {
            // For non-identifier operands, evaluate normally
            Value operand = engine->evaluate(operand_node, env);
            return OperationHandler::performUnaryOperation(node->value, operand);
        }
    }

    // For other unary operators, evaluate the operand normally
    Value operand = engine->evaluate(node->children[0], env);
    return OperationHandler::performUnaryOperation(node->value, operand);
}

Value ExpressionEvaluator::evaluateTemplateLiteral(std::shared_ptr<ASTNode> node,
                                                   std::shared_ptr<Environment> env, Rift* engine) {
    std::string result;

    // Iterate through all child nodes (template elements and expressions)
    for(const auto& child : node->children) {
        if(child->type == ASTNodeType::TemplateElement) {
            // String literal part - add directly to result
            result += child->value;
        } else if(child->type == ASTNodeType::TemplateExpression) {
            // Expression part - evaluate and convert to string
            if(!child->children.empty()) {
                Value expression_value = engine->evaluate(child->children[0], env);
                result += expression_value.toString();
            }
        }
    }

    return Value(std::move(result));
}

}  // namespace rift::core
