#include "rift/core/engine/expression_evaluator.h"

#include <iostream>
#include <limits>

#include "rift/builtins/array/array.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/engine.h"
#include "rift/core/engine/evaluation_utils.h"
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
        case ASTNodeType::NewExpression:
            return evaluateNewExpression(node, env, engine);
        case ASTNodeType::TemplateLiteral:
            return evaluateTemplateLiteral(node, env, engine);
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
        } catch(const std::runtime_error&) {
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
                std::cerr << "Warning: Invalid number literal '" << node->value << "': " << e.what() << std::endl;
                return Value(0.0);  // fallback
            } catch(const std::out_of_range& e) {
                std::cerr << "Warning: Number literal out of range '" << node->value << "': " << e.what() << std::endl;
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
        auto operandNode = node->children[0];

        // If the operand is an identifier, we need to handle the case where it might not exist
        if(operandNode->type == ASTNodeType::Identifier) {
            try {
                Value operand = engine->evaluate(operandNode, env);
                return OperationHandler::performUnaryOperation(node->value, operand);
            } catch(const std::runtime_error&) {
                // If the identifier doesn't exist, typeof should return "undefined" per ECMAScript spec
                return Value("undefined");
            } catch(const std::exception& e) {
                // Log unexpected exceptions but still return "undefined" for typeof robustness
                std::cerr << "Warning: Unexpected exception in typeof evaluation: " << e.what() << std::endl;
                return Value("undefined");
            }
        } else {
            // For non-identifier operands, evaluate normally
            Value operand = engine->evaluate(operandNode, env);
            return OperationHandler::performUnaryOperation(node->value, operand);
        }
    }

    // For other unary operators, evaluate the operand normally
    Value operand = engine->evaluate(node->children[0], env);
    return OperationHandler::performUnaryOperation(node->value, operand);
}

Value ExpressionEvaluator::evaluateAssignmentExpression(std::shared_ptr<ASTNode> node,
                                                        std::shared_ptr<Environment> env,
                                                        Rift* engine) {
    if(node->children.size() != 2) {
        return Value::undefined();
    }

    auto leftSide = node->children[0];
    Value rightValue = engine->evaluate(node->children[1], env);

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
                obj->setProperty(property, rightValue);

                // Special handling for arrays: update length if necessary
                if(property != "length") {
                    // Check if this is a numeric index using safe validation
                    size_t index;
                    if(EvaluationUtils::isValidArrayIndex(property, index)) {
                        Value lengthVal = obj->getProperty("length");
                        if(lengthVal.isNumber()) {
                            size_t currentLength = static_cast<size_t>(lengthVal.toNumber());
                            if(index >= currentLength) {
                                obj->setProperty("length", Value(static_cast<double>(index + 1)));
                            }
                        }
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

Value ExpressionEvaluator::evaluateCallExpression(std::shared_ptr<ASTNode> node,
                                                  std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() < 1) {
        return Value::undefined();
    }

    auto calleeNode = node->children[0];

    // Check if this is a method call (member expression)
    Value thisValue = Value::undefined();
    Value callee;

    if(calleeNode->type == ASTNodeType::MemberExpression) {
        // This is a method call: obj.method(args)
        if(calleeNode->children.size() == 2) {
            // Get the object (this value)
            thisValue = engine->evaluate(calleeNode->children[0], env);

            // Get the method from the object
            callee = engine->evaluate(calleeNode, env);
        }
    } else {
        // Regular function call
        callee = engine->evaluate(calleeNode, env);
    }

    // Evaluate real arguments
    std::vector<Value> args;
    for(size_t i = 1; i < node->children.size(); ++i) {
        args.push_back(engine->evaluate(node->children[i], env));
    }

    // If it's a function object, call it
    if(callee.isFunction()) {
        auto* func =
            dynamic_cast<JSFunction*>(callee.getObject());  // Use dynamic_cast for raw pointers
        if(func) {
            rift::core::CallContext callContext(
                rift::core::CallType::Function,
                thisValue.isUndefined() ? Value::undefined() : thisValue);
            return func->call(callContext, args);
        }
    }

    return Value::undefined();
}

Value ExpressionEvaluator::evaluateMemberExpression(std::shared_ptr<ASTNode> node,
                                                    std::shared_ptr<Environment> env,
                                                    Rift* engine) {
    if(node->children.size() != 2) {
        return Value::undefined();
    }

    // Evaluate the object
    Value object = engine->evaluate(node->children[0], env);

    // Get the property name - could be static (dot notation) or computed (bracket notation)
    std::string property;

    // Check if this is computed member access (bracket notation)
    // Use metadata to determine if this should be computed
        if(node->metadata == "computed") {
        // This is bracket notation - evaluate the property expression and convert carefully
        Value propertyValue = engine->evaluate(node->children[1], env);
        property = EvaluationUtils::toPropertyKeyString(propertyValue);
    } else {
        // This is dot notation - use the identifier value directly
        property = node->children[1]->value;
    }

    // If it's an object, get the property
    if(object.isObject() || object.isFunction()) {
        auto* obj = object.getObject();
        if(obj) {
            return obj->getProperty(property);
        }
    }

    // Handle primitive boxing - look up prototype methods
    if(object.isString()) {
        // Get the String prototype and look up the property
        auto* stringPrototype = BuiltinManager::getStringPrototype();
        if(stringPrototype) {
            return stringPrototype->getProperty(property);
        }
    }

    return Value::undefined();
}

Value ExpressionEvaluator::evaluateArrayLiteral(std::shared_ptr<ASTNode> node,
                                                std::shared_ptr<Environment> env, Rift* engine) {
    // Evaluate each element in the array literal
    std::vector<Value> elements;
    elements.reserve(node->children.size());

    for(const auto& child : node->children) {
        elements.push_back(engine->evaluate(child, env));
    }

    // Use the Array::createArrayObject helper to create the array with GC-managed creation
    auto* arrayObj = builtins::Array::createArrayObject(engine->getObjectFactory(), elements);
    return Value(arrayObj);
}

Value ExpressionEvaluator::evaluateObjectLiteral(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine) {
    // Create a new empty object using GC-managed creation with Object.prototype
    auto* objectPrototype = BuiltinManager::getObjectPrototype();
    auto* obj = engine->getObjectFactory()->createJSObject(objectPrototype);

    // Process key-value pairs from the AST
    // Children are stored in pairs: key, value, key, value, ...
    for(size_t i = 0; i < node->children.size(); i += 2) {
        if(i + 1 >= node->children.size()) {
            // Odd number of children - this should not happen with proper parsing
            break;
        }

        auto keyNode = node->children[i];
        auto valueNode = node->children[i + 1];

        // Get the property key
        std::string key;
        if(keyNode->type == ASTNodeType::Identifier) {
            // Identifier keys are used as-is: { name: value }
            key = keyNode->value;
        } else if(keyNode->type == ASTNodeType::Literal) {
            // String literal keys need to be processed: { "name": value }
            std::string str = keyNode->value;
            if(str.length() >= 2 && str[0] == '"' && str.back() == '"') {
                key = str.substr(1, str.length() - 2);  // Remove quotes
            } else {
                key = str;
            }
        } else {
            // Other key types (computed keys) - evaluate as expression
            Value keyValue = engine->evaluate(keyNode, env);
            key = keyValue.toString();
        }

        // Evaluate the property value
        Value value = engine->evaluate(valueNode, env);

        // Set the property on the object
        obj->setProperty(key, value);
    }

    return Value(obj);
}

Value ExpressionEvaluator::evaluateFunctionExpression(std::shared_ptr<ASTNode> node,
                                                      std::shared_ptr<Environment> env,
                                                      Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Get parameters (first child should be parameter list)
    auto paramList = node->children[0];
    std::vector<std::string> parameters;
    for(const auto& param : paramList->children) {
        parameters.push_back(param->value);
    }

    // Get function body (second child)
    auto body = node->children[1];

    // Create function object (anonymous) using GC-managed creation
    auto* func = engine->getObjectFactory()->createJSFunction(
        [engine, parameters, body, env](const rift::core::CallContext& callContext, const std::vector<Value>& args) -> Value {
            // Create new environment for function execution
            auto funcEnv = std::make_shared<Environment>(env);

            // Bind 'this' to the function environment
            funcEnv->define("this", callContext.thisValue);

            // Bind parameters to real arguments
            for(size_t i = 0; i < parameters.size(); ++i) {
                Value argValue = (i < args.size()) ? args[i] : Value::undefined();
                funcEnv->define(parameters[i], argValue);
            }

            // Execute function body
            try {
                return engine->evaluate(body, funcEnv);
            } catch(const ReturnException& e) {
                // Handle return statements - extract the actual return value
                return e.getValue();
            } catch(const std::runtime_error& e) {
                // Handle other runtime errors
                throw;
            }
        });

    return Value(func);
}

Value ExpressionEvaluator::evaluateNewExpression(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.empty()) {
        return Value::undefined();
    }

    // Get the constructor
    auto constructorNode = node->children[0];
    Value constructor = engine->evaluate(constructorNode, env);

    // Check if constructor is a function
    if(!constructor.isFunction()) {
        // In a real JS engine, this would throw a TypeError
        return Value::undefined();
    }

    auto* constructorFunc =
        dynamic_cast<JSFunction*>(constructor.getObject());  // Use dynamic_cast for raw pointers
    if(!constructorFunc) {
        return Value::undefined();
    }

    // Create a new object that will be the 'this' context for the constructor
    auto* newObj = engine->getObjectFactory()->createJSObject();

    // Collect real arguments (skip first child which is the constructor)
    std::vector<Value> args;
    for(size_t i = 1; i < node->children.size(); ++i) {
        args.push_back(engine->evaluate(node->children[i], env));
    }

    // Call constructor function - built-in constructors like Array and Object
    // handle their own object creation and return the created object
    rift::core::CallContext ctorContext(rift::core::CallType::Constructor, Value(newObj));
    Value result = constructorFunc->call(ctorContext, args);

    // If the constructor returned an object, use it (this is the normal case for built-ins)
    if(result.isObject() || result.isFunction()) {
        return result;
    }

    // If constructor returned a primitive (or undefined), return the object we created
    // This handles user-defined constructor functions
    return Value(newObj);
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
                Value expressionValue = engine->evaluate(child->children[0], env);
                result += expressionValue.toString();
            }
        }
    }

    return Value(result);
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
                            size_t currentLength = static_cast<size_t>(lengthVal.toNumber());
                            if(index >= currentLength) {
                                obj->setProperty("length", Value(static_cast<double>(index + 1)));
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