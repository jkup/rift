/**
 * Expression Evaluator - Assignment and Update Methods
 *
 * This file contains assignment and update expression evaluation methods:
 * - Assignment expressions (=)
 * - Update expressions (++, --)
 *
 * Split from expression_evaluator.cpp for better maintainability.
 */

#include "rift/core/engine/expression_evaluator.h"

#include <cmath>

#include "rift/core/engine/engine.h"
#include "rift/core/engine/evaluation_utils.h"

namespace rift::core {

// Helper function to apply compound assignment operation
static Value applyCompoundOperation(const std::string& operator_, Value currentValue, Value rightValue) {
    if(operator_ == "=") {
        return rightValue;
    }

    // For compound assignments, convert to numbers and apply operation
    double left = currentValue.toNumber();
    double right = rightValue.toNumber();

    if(operator_ == "+=") {
        // Special case: string concatenation for +=
        if(currentValue.isString() || rightValue.isString()) {
            return Value(currentValue.toString() + rightValue.toString());
        }
        return Value(left + right);
    } else if(operator_ == "-=") {
        return Value(left - right);
    } else if(operator_ == "*=") {
        return Value(left * right);
    } else if(operator_ == "/=") {
        return Value(left / right);
    } else if(operator_ == "%=") {
        return Value(std::fmod(left, right));
    } else if(operator_ == "**=") {
        return Value(std::pow(left, right));
    }

    // Bitwise compound assignments - convert to 32-bit integers
    int32_t leftInt = static_cast<int32_t>(left);
    int32_t rightInt = static_cast<int32_t>(right);

    if(operator_ == "&=") {
        return Value(static_cast<double>(leftInt & rightInt));
    } else if(operator_ == "|=") {
        return Value(static_cast<double>(leftInt | rightInt));
    } else if(operator_ == "^=") {
        return Value(static_cast<double>(leftInt ^ rightInt));
    } else if(operator_ == "<<=") {
        uint32_t shiftAmount = static_cast<uint32_t>(rightInt) & 0x1F;
        return Value(static_cast<double>(leftInt << shiftAmount));
    } else if(operator_ == ">>=") {
        uint32_t shiftAmount = static_cast<uint32_t>(rightInt) & 0x1F;
        return Value(static_cast<double>(leftInt >> shiftAmount));
    } else if(operator_ == ">>>=") {
        uint32_t leftUint = static_cast<uint32_t>(leftInt);
        uint32_t shiftAmount = static_cast<uint32_t>(rightInt) & 0x1F;
        return Value(static_cast<double>(leftUint >> shiftAmount));
    }

    // Fallback for unknown operator
    return rightValue;
}

Value ExpressionEvaluator::evaluateAssignmentExpression(std::shared_ptr<ASTNode> node,
                                                        std::shared_ptr<Environment> env,
                                                        Rift* engine) {
    if(node->children.size() != 2) {
        return Value::undefined();
    }

    auto leftSide = node->children[0];
    Value rightValue = engine->evaluate(node->children[1], env);
    std::string operator_ = node->value.empty() ? "=" : node->value;

    // Check if left side is a member expression (property assignment)
    if(leftSide->type == ASTNodeType::MemberExpression) {
        if(leftSide->children.size() != 2) {
            return Value::undefined();
        }

        // Evaluate the object
        Value object = engine->evaluate(leftSide->children[0], env);

        // Get the property name - handle both dot and bracket notation
        std::string property;
        if(leftSide->metadata == "computed") {
            // Bracket notation - evaluate the property expression and convert to a key string
            Value propertyValue = engine->evaluate(leftSide->children[1], env);
            property = EvaluationUtils::toPropertyKeyString(propertyValue);
        } else {
            // Dot notation - use the identifier value directly
            property = leftSide->children[1]->value;
        }

        // Set the property on the object
        if(object.isObject() || object.isFunction()) {
            auto* obj = object.getObject();
            if(obj) {
                // For compound assignment, get current value and apply operation
                Value newValue;
                if(operator_ == "=") {
                    // Simple assignment
                    newValue = rightValue;
                } else {
                    // Compound assignment - need current value
                    Value currentValue = obj->getProperty(property);
                    newValue = applyCompoundOperation(operator_, currentValue, rightValue);
                }

                obj->setProperty(property, newValue);

                // Special handling for arrays: update length if necessary
                if(property != "length") {
                    // Check if this is a numeric index using safe validation
                    size_t index;
                    if(EvaluationUtils::isValidArrayIndex(property, index)) {
                        Value lengthVal = obj->getProperty("length");
                        if(lengthVal.isNumber()) {
                            size_t currentLength;
                            if(EvaluationUtils::toSafeArrayLength(lengthVal.toNumber(), currentLength)) {
                                if(index >= currentLength) {
                                    size_t newLength;
                                    if(EvaluationUtils::safeIncrementIndex(index, newLength)) {
                                        obj->setProperty("length", Value(static_cast<double>(newLength)));
                                    }
                                    // If overflow would occur, don't update length (silent failure per spec)
                                }
                            }
                        }
                    }
                }

                return newValue;
            }
        }

        return rightValue;
    } else {
        // Simple variable assignment
        std::string varName = leftSide->value;

        // For compound assignment, get current value and apply operation
        Value newValue;
        if(operator_ == "=") {
            // Simple assignment - no need to get current value
            newValue = rightValue;
        } else {
            // Compound assignment - need current value
            Value currentValue = env->get(varName);
            newValue = applyCompoundOperation(operator_, currentValue, rightValue);
        }

        env->set(varName, newValue);
        return newValue;
    }
}

Value ExpressionEvaluator::evaluateUpdateExpression(std::shared_ptr<ASTNode> node,
                                                    std::shared_ptr<Environment> env,
                                                    Rift* engine) {
    if(node->children.size() != 1) {
        return Value::undefined();
    }

    auto operandNode = node->children[0];
    std::string operator_ = node->value;  // "++" or "--"
    bool isPrefix = (node->metadata == "prefix");

    // Handle variable increment/decrement
    if(operandNode->type == ASTNodeType::Identifier) {
        std::string varName = operandNode->value;

        // Get current value
        Value currentValue = env->get(varName);
        if(!currentValue.isNumber()) {
            // Convert to number for increment/decrement
            currentValue = Value(currentValue.toNumber());
        }

        // Calculate new value
        Value newValue;
        if(operator_ == "++") {
            newValue = Value(currentValue.toNumber() + 1.0);
        } else if(operator_ == "--") {
            newValue = Value(currentValue.toNumber() - 1.0);
        } else {
            return Value::undefined();
        }

        // Update the variable
        env->set(varName, newValue);

        // Return value depends on prefix vs postfix
        if(isPrefix) {
            return newValue;  // ++x returns new value
        } else {
            return currentValue;  // x++ returns old value
        }
    }

    // Handle member expression increment/decrement (e.g., obj.prop++, arr[i]--)
    else if(operandNode->type == ASTNodeType::MemberExpression) {
        if(operandNode->children.size() != 2) {
            return Value::undefined();
        }

        // Evaluate the object
        Value object = engine->evaluate(operandNode->children[0], env);

        // Get the property name - handle both dot and bracket notation
        std::string property;
        if(operandNode->metadata == "computed") {
            // Bracket notation - evaluate the property expression and convert carefully
            Value propertyValue = engine->evaluate(operandNode->children[1], env);
            property = EvaluationUtils::toPropertyKeyString(propertyValue);
        } else {
            // Dot notation - use the identifier value directly
            property = operandNode->children[1]->value;
        }

        // Get current property value
        Value currentValue = Value::undefined();
        if(object.isObject() || object.isFunction()) {
            auto* obj = object.getObject();
            if(obj) {
                currentValue = obj->getProperty(property);
            }
        }

        if(!currentValue.isNumber()) {
            // Convert to number for increment/decrement
            currentValue = Value(currentValue.toNumber());
        }

        // Calculate new value
        Value newValue;
        if(operator_ == "++") {
            newValue = Value(currentValue.toNumber() + 1.0);
        } else if(operator_ == "--") {
            newValue = Value(currentValue.toNumber() - 1.0);
        } else {
            return Value::undefined();
        }

        // Update the property
        if(object.isObject() || object.isFunction()) {
            auto* obj = object.getObject();
            if(obj) {
                obj->setProperty(property, newValue);

                // Special handling for arrays: update length if necessary
                if(property != "length") {
                    // Check if this is a numeric index using safe validation
                    size_t index;
                    if(EvaluationUtils::isValidArrayIndex(property, index)) {
                        Value lengthVal = obj->getProperty("length");
                        if(lengthVal.isNumber()) {
                            size_t currentLength;
                            if(EvaluationUtils::toSafeArrayLength(lengthVal.toNumber(), currentLength)) {
                                if(index >= currentLength) {
                                    size_t newLength;
                                    if(EvaluationUtils::safeIncrementIndex(index, newLength)) {
                                        obj->setProperty("length", Value(static_cast<double>(newLength)));
                                    }
                                    // If overflow would occur, don't update length (silent failure per spec)
                                }
                            }
                        }
                    }
                }
            }
        }

        // Return value depends on prefix vs postfix
        if(isPrefix) {
            return newValue;  // ++obj.prop returns new value
        } else {
            return currentValue;  // obj.prop++ returns old value
        }
    }

    // Invalid operand for increment/decrement
    return Value::undefined();
}

}  // namespace rift::core
