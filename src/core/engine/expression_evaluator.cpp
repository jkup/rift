#include "rift/core/engine/expression_evaluator.h"
#include "rift/core/engine/operation_handler.h"
#include "rift/core/engine/engine.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/builtins/array/array.h"
#include "rift/runtime/values/object.h"
#include <iostream>

namespace rift::core {

Value ExpressionEvaluator::evaluate(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    if (!node) {
        return Value::undefined();
    }

    switch (node->type) {
        case ASTNodeType::Identifier:
            return evaluateIdentifier(node, env, engine);
        case ASTNodeType::Literal:
            return evaluateLiteral(node, env, engine);
        case ASTNodeType::BinaryExpression:
            return evaluateBinaryExpression(node, env, engine);
        case ASTNodeType::UnaryExpression:
            return evaluateUnaryExpression(node, env, engine);
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

Value ExpressionEvaluator::evaluateIdentifier(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    // Special handling for 'this' keyword
    if (node->value == "this") {
        // Try to get 'this' from environment, return undefined if not found
        try {
            return env->get("this");
        } catch (const std::runtime_error&) {
            return Value::undefined();
        }
    }
    
    return env->get(node->value);
}

Value ExpressionEvaluator::evaluateLiteral(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    // Use metadata to determine literal type if available
    if (!node->metadata.empty()) {
        if (node->metadata == "string") {
            return Value(node->value);
        } else if (node->metadata == "number") {
            try {
                double num = std::stod(node->value);
                return Value(num);
            } catch (...) {
                return Value(0.0);  // fallback
            }
        } else if (node->metadata == "boolean") {
            return Value(node->value == "true");
        } else if (node->metadata == "null") {
            return Value::null();
        } else if (node->metadata == "undefined") {
            return Value::undefined();
        }
    }

    // Fallback to old behavior for backward compatibility
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

Value ExpressionEvaluator::evaluateBinaryExpression(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    if (node->children.size() != 2) {
        return Value::undefined();
    }

    // Handle logical operators with short-circuit evaluation
    if (node->value == "||") {
        Value left = engine->evaluate(node->children[0], env);
        if (left.toBool()) {
            return left;  // Short-circuit: return left if truthy
        }
        return engine->evaluate(node->children[1], env);  // Evaluate right only if left is falsy
    }
    
    if (node->value == "&&") {
        Value left = engine->evaluate(node->children[0], env);
        if (!left.toBool()) {
            return left;  // Short-circuit: return left if falsy
        }
        return engine->evaluate(node->children[1], env);  // Evaluate right only if left is truthy
    }

    // For all other operators, evaluate both operands
    Value left = engine->evaluate(node->children[0], env);
    Value right = engine->evaluate(node->children[1], env);

    return OperationHandler::performBinaryOperation(node->value, left, right);
}

Value ExpressionEvaluator::evaluateUnaryExpression(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    if (node->children.size() != 1) {
        return Value::undefined();
    }

    // Special handling for typeof operator
    if (node->value == "typeof") {
        auto operandNode = node->children[0];

        // If the operand is an identifier, we need to handle the case where it might not exist
        if (operandNode->type == ASTNodeType::Identifier) {
            try {
                Value operand = engine->evaluate(operandNode, env);
                return OperationHandler::performUnaryOperation(node->value, operand);
            } catch (...) {
                // If the identifier doesn't exist, typeof should return "undefined"
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

Value ExpressionEvaluator::evaluateAssignmentExpression(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    if (node->children.size() != 2) {
        return Value::undefined();
    }

    auto leftSide = node->children[0];
    Value rightValue = engine->evaluate(node->children[1], env);

    // Check if left side is a member expression (property assignment)
    if (leftSide->type == ASTNodeType::MemberExpression) {
        if (leftSide->children.size() != 2) {
            return Value::undefined();
        }

        // Evaluate the object
        Value object = engine->evaluate(leftSide->children[0], env);

        // Get the property name - handle both dot and bracket notation
        std::string property;
        if (leftSide->children[1]->type == ASTNodeType::Literal ||
            leftSide->children[1]->type == ASTNodeType::BinaryExpression ||
            leftSide->children[1]->type == ASTNodeType::CallExpression) {
            // Bracket notation - evaluate the property expression
            Value propertyValue = engine->evaluate(leftSide->children[1], env);
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

Value ExpressionEvaluator::evaluateCallExpression(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    if (node->children.size() < 1) {
        return Value::undefined();
    }

    auto calleeNode = node->children[0];
    
    // Check if this is a method call (member expression)
    Value thisValue = Value::undefined();
    Value callee;
    
    if (calleeNode->type == ASTNodeType::MemberExpression) {
        // This is a method call: obj.method(args)
        if (calleeNode->children.size() == 2) {
            // Get the object (this value)
            thisValue = engine->evaluate(calleeNode->children[0], env);
            
            // Get the method from the object
            callee = engine->evaluate(calleeNode, env);
        }
    } else {
        // Regular function call
        callee = engine->evaluate(calleeNode, env);
    }

    // Evaluate arguments
    std::vector<Value> args;
    
    // For method calls, prepend the 'this' value as first argument
    if (!thisValue.isUndefined()) {
        args.push_back(thisValue);
    }
    
    for (size_t i = 1; i < node->children.size(); ++i) {
        args.push_back(engine->evaluate(node->children[i], env));
    }

    // If it's a function object, call it
    if (callee.isFunction()) {
        auto func = dynamic_cast<JSFunction*>(callee.getObject());  // Use dynamic_cast for raw pointers
        if (func) {
            return func->call(args);
        }
    }

    return Value::undefined();
}

Value ExpressionEvaluator::evaluateMemberExpression(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    if (node->children.size() != 2) {
        return Value::undefined();
    }

    // Evaluate the object
    Value object = engine->evaluate(node->children[0], env);

    // Get the property name - could be static (dot notation) or computed (bracket notation)
    std::string property;

    // Check if this is computed member access (bracket notation)
    // In bracket notation, the property is an expression that needs to be evaluated
    if (node->children[1]->type == ASTNodeType::Literal ||
        node->children[1]->type == ASTNodeType::BinaryExpression ||
        node->children[1]->type == ASTNodeType::CallExpression) {
        // This is bracket notation - evaluate the property expression
        Value propertyValue = engine->evaluate(node->children[1], env);
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

    // Handle primitive boxing - look up prototype methods
    if (object.isString()) {
        // Get the String prototype and look up the property
        auto stringPrototype = BuiltinManager::getStringPrototype();
        if (stringPrototype) {
            return stringPrototype->getProperty(property);
        }
    }

    return Value::undefined();
}

Value ExpressionEvaluator::evaluateArrayLiteral(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    // Evaluate each element in the array literal
    std::vector<Value> elements;
    elements.reserve(node->children.size());

    for (const auto& child : node->children) {
        elements.push_back(engine->evaluate(child, env));
    }

    // Use the Array::createArrayObject helper to create the array with GC-managed creation
    auto arrayObj = builtins::Array::createArrayObject(engine->getObjectFactory(), elements);
    return Value(arrayObj);
}

Value ExpressionEvaluator::evaluateObjectLiteral(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    // Create a new empty object using GC-managed creation with Object.prototype
    auto objectPrototype = BuiltinManager::getObjectPrototype();
    auto obj = engine->getObjectFactory()->createJSObject(objectPrototype);

    // Process key-value pairs from the AST
    // Children are stored in pairs: key, value, key, value, ...
    for (size_t i = 0; i < node->children.size(); i += 2) {
        if (i + 1 >= node->children.size()) {
            // Odd number of children - this should not happen with proper parsing
            break;
        }

        auto keyNode = node->children[i];
        auto valueNode = node->children[i + 1];

        // Get the property key
        std::string key;
        if (keyNode->type == ASTNodeType::Identifier) {
            // Identifier keys are used as-is: { name: value }
            key = keyNode->value;
        } else if (keyNode->type == ASTNodeType::Literal) {
            // String literal keys need to be processed: { "name": value }
            std::string str = keyNode->value;
            if (str.length() >= 2 && str[0] == '"' && str.back() == '"') {
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

Value ExpressionEvaluator::evaluateFunctionExpression(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    if (node->children.size() < 2) {
        return Value::undefined();
    }
    
    // Get parameters (first child should be parameter list)
    auto paramList = node->children[0];
    std::vector<std::string> parameters;
    for (const auto& param : paramList->children) {
        parameters.push_back(param->value);
    }
    
    // Get function body (second child)
    auto body = node->children[1];
    
    // Create function object (anonymous) using GC-managed creation
    auto func = engine->getObjectFactory()->createJSFunction([engine, parameters, body, env](const std::vector<Value>& args) -> Value {
        // Create new environment for function execution
        auto funcEnv = std::make_shared<Environment>(env);
        
        // Handle constructor call context and 'this' binding
        auto constructorInfo = EvaluationUtils::parseConstructorCall(args);
        
        // Bind 'this' to the function environment
        funcEnv->define("this", constructorInfo.thisValue);
        
        // Bind parameters to arguments (skip constructor marker and this object)
        for (size_t i = 0; i < parameters.size(); ++i) {
            Value argValue = (i + constructorInfo.argOffset < args.size()) ? args[i + constructorInfo.argOffset] : Value::undefined();
            funcEnv->define(parameters[i], argValue);
        }
        
        // Execute function body
        try {
            return engine->evaluate(body, funcEnv);
        } catch (const ReturnException& e) {
            // Handle return statements - extract the actual return value
            return e.getValue();
        } catch (const std::runtime_error& e) {
            // Handle other runtime errors
            throw;
        }
    });
    
    return Value(func);
}

Value ExpressionEvaluator::evaluateNewExpression(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    if (node->children.empty()) {
        return Value::undefined();
    }

    // Get the constructor
    auto constructorNode = node->children[0];
    Value constructor = engine->evaluate(constructorNode, env);

    // Check if constructor is a function
    if (!constructor.isFunction()) {
        // In a real JS engine, this would throw a TypeError
        return Value::undefined();
    }

    auto constructorFunc = dynamic_cast<JSFunction*>(constructor.getObject());  // Use dynamic_cast for raw pointers
    if (!constructorFunc) {
        return Value::undefined();
    }

    // Create a new object that will be the 'this' context for the constructor
    auto newObj = engine->getObjectFactory()->createJSObject();
    
    // Collect arguments (skip first child which is the constructor)
    std::vector<Value> args;
    
    // Add special marker to indicate this is a constructor call
    args.push_back(Value(EvaluationConstants::CONSTRUCTOR_CALL_MARKER));
    
    // Add the 'this' object as the first real argument
    args.push_back(Value(newObj));
    
    for (size_t i = 1; i < node->children.size(); ++i) {
        args.push_back(engine->evaluate(node->children[i], env));
    }

    // Call constructor function - built-in constructors like Array and Object
    // handle their own object creation and return the created object
    Value result = constructorFunc->call(args);

    // If the constructor returned an object, use it (this is the normal case for built-ins)
    if (result.isObject() || result.isFunction()) {
        return result;
    }

    // If constructor returned a primitive (or undefined), return the object we created
    // This handles user-defined constructor functions
    return Value(newObj);
}

Value ExpressionEvaluator::evaluateTemplateLiteral(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    std::string result;
    
    // Iterate through all child nodes (template elements and expressions)
    for (const auto& child : node->children) {
        if (child->type == ASTNodeType::TemplateElement) {
            // String literal part - add directly to result
            result += child->value;
        }
        else if (child->type == ASTNodeType::TemplateExpression) {
            // Expression part - evaluate and convert to string
            if (!child->children.empty()) {
                Value expressionValue = engine->evaluate(child->children[0], env);
                result += expressionValue.toString();
            }
        }
    }
    
    return Value(result);
}

}  // namespace rift::core 