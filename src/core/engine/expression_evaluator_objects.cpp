/**
 * Expression Evaluator - Object and Function Methods
 *
 * This file contains object and function expression evaluation methods:
 * - Call expressions (function calls)
 * - Member expressions (property access)
 * - Array literals
 * - Object literals
 * - Function expressions
 * - New expressions (constructor calls)
 *
 * Split from expression_evaluator.cpp for better maintainability.
 */

#include "rift/core/engine/expression_evaluator.h"

#include "rift/builtins/array/array.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/engine.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/runtime/values/object.h"

namespace rift::core {

Value ExpressionEvaluator::evaluateCallExpression(std::shared_ptr<ASTNode> node,
                                                  std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() < 1) {
        return Value::undefined();
    }

    auto callee_node = node->children[0];

    // Check if this is a method call (member expression)
    Value this_value = Value::undefined();
    Value callee;

    if(callee_node->type == ASTNodeType::MemberExpression) {
        // This is a method call: obj.method(args)
        if(callee_node->children.size() == 2) {
            // Get the object (this value)
            this_value = engine->evaluate(callee_node->children[0], env);

            // Get the method from the object
            callee = engine->evaluate(callee_node, env);
        }
    } else {
        // Regular function call
        callee = engine->evaluate(callee_node, env);
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
        if(!func) {
            throw JavaScriptException(Value("TypeError: callee is not a function"),
                                      node->line, node->column);
        }
        rift::core::CallContext call_context(
            rift::core::CallType::Function,
            this_value.isUndefined() ? Value::undefined() : this_value);
        return func->call(call_context, args);
    }

    // Not a function type - throw TypeError per ECMAScript spec
    throw JavaScriptException(Value("TypeError: " + callee.toString() + " is not a function"),
                              node->line, node->column);
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
        Value property_value = engine->evaluate(node->children[1], env);
        property = EvaluationUtils::toPropertyKeyString(property_value);
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
        auto* string_prototype = BuiltinManager::getStringPrototype();
        if(string_prototype) {
            return string_prototype->getProperty(property);
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
    auto* array_obj = builtins::Array::createArrayObject(engine->getObjectFactory(), elements);
    return Value(array_obj);
}

Value ExpressionEvaluator::evaluateObjectLiteral(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine) {
    // Create a new empty object using GC-managed creation with Object.prototype
    auto* object_prototype = BuiltinManager::getObjectPrototype();
    auto* factory = engine->getObjectFactory();

    // Temporarily disable GC to prevent collection of the object being constructed
    // The object is not yet reachable from GC roots until it's returned and assigned
    auto* obj_manager = factory->getObjectManager();
    bool was_gc_enabled = obj_manager->isGCEnabled();
    obj_manager->setGCEnabled(false);

    auto* obj = factory->createJSObject(object_prototype);

    // Process key-value pairs from the AST
    // Children are stored in pairs: key, value, key, value, ...
    try {
        for(size_t i = 0; i < node->children.size(); i += 2) {
            if(i + 1 >= node->children.size()) {
                // Odd number of children - this should not happen with proper parsing
                break;
            }

            auto key_node = node->children[i];
            auto value_node = node->children[i + 1];

            // Get the property key
            std::string key;
            if(key_node->type == ASTNodeType::Identifier) {
                // Identifier keys are used as-is: { name: value }
                key = key_node->value;
            } else if(key_node->type == ASTNodeType::Literal) {
                // String literal keys need to be processed: { "name": value }
                std::string str = key_node->value;
                if(str.length() >= 2 && str[0] == '"' && str.back() == '"') {
                    key = str.substr(1, str.length() - 2);  // Remove quotes
                } else {
                    key = str;
                }
            } else {
                // Other key types (computed keys) - evaluate as expression
                Value key_value = engine->evaluate(key_node, env);
                key = key_value.toString();
            }

            // Evaluate the property value
            Value value = engine->evaluate(value_node, env);

            // Set the property on the object
            obj->setProperty(key, value);
        }

        // Re-enable GC before returning
        obj_manager->setGCEnabled(was_gc_enabled);
        return Value(obj);
    } catch(...) {
        // Re-enable GC in case of exception
        obj_manager->setGCEnabled(was_gc_enabled);
        throw;
    }
}

Value ExpressionEvaluator::evaluateFunctionExpression(std::shared_ptr<ASTNode> node,
                                                      std::shared_ptr<Environment> env,
                                                      Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Get parameters (first child should be parameter list)
    auto param_list = node->children[0];
    std::vector<std::string> parameters;
    for(const auto& param : param_list->children) {
        parameters.push_back(param->value);
    }

    // Get function body (second child)
    auto body = node->children[1];

    // Temporarily disable GC to prevent collection during function creation
    auto* factory = engine->getObjectFactory();
    auto* obj_manager = factory->getObjectManager();
    bool was_gc_enabled = obj_manager->isGCEnabled();
    obj_manager->setGCEnabled(false);

    // Create function object (anonymous) using GC-managed creation
    auto* func = factory->createJSFunction(
        [engine, parameters, body, env](const rift::core::CallContext& call_context, const std::vector<Value>& args) -> Value {
            // Create new environment for function execution
            auto func_env = std::make_shared<Environment>(env);

            // Bind 'this' to the function environment
            func_env->define("this", call_context.thisValue);

            // Bind parameters to real arguments
            for(size_t i = 0; i < parameters.size(); ++i) {
                Value arg_value = (i < args.size()) ? args[i] : Value::undefined();
                func_env->define(parameters[i], arg_value);
            }

            // Create 'arguments' object (array-like object with all passed arguments)
            auto* args_factory = engine->getObjectFactory();
            auto* arguments_obj = args_factory->createJSObject();
            for(size_t i = 0; i < args.size(); ++i) {
                arguments_obj->setProperty(std::to_string(i), args[i]);
            }
            arguments_obj->setProperty("length", Value(static_cast<double>(args.size())));
            func_env->define("arguments", Value(arguments_obj));

            // Execute function body
            try {
                return engine->evaluate(body, func_env);
            } catch(const ReturnException& e) {
                // Handle return statements - extract the actual return value
                return e.getValue();
            } catch(const std::runtime_error& e) {
                // Handle other runtime errors
                throw;
            }
        });

    // Re-enable GC before returning
    obj_manager->setGCEnabled(was_gc_enabled);
    return Value(func);
}

Value ExpressionEvaluator::evaluateArrowFunctionExpression(std::shared_ptr<ASTNode> node,
                                                            std::shared_ptr<Environment> env,
                                                            Rift* engine) {
    if (node->children.size() < 2) {
        return Value::undefined();
    }

    // Get parameters (first child should be parameter list)
    auto param_list = node->children[0];
    std::vector<std::string> parameters;
    for (const auto& param : param_list->children) {
        parameters.push_back(param->value);
    }

    // Get function body (second child)
    auto body = node->children[1];

    // Check if this is an expression body (implicit return)
    bool is_expression_body = (node->metadata == "expression");

    // CRITICAL: Capture current 'this' value from enclosing environment
    Value captured_this = Value::undefined();
    try {
        captured_this = env->get("this");
    } catch (const std::runtime_error&) {
        // No 'this' in scope - use undefined
    }

    // Temporarily disable GC to prevent collection during function creation
    auto* factory = engine->getObjectFactory();
    auto* obj_manager = factory->getObjectManager();
    bool was_gc_enabled = obj_manager->isGCEnabled();
    obj_manager->setGCEnabled(false);

    // Create arrow function object with captured this
    auto* arrow_func = factory->createJSArrowFunction(
        [engine, parameters, body, env, is_expression_body](
            const rift::core::CallContext& call_context,
            const std::vector<Value>& args) -> Value {

            // Create new environment for function execution
            // Note: Arrow functions get 'this' from captured_this via JSArrowFunction,
            // which modifies the call_context before calling
            auto func_env = std::make_shared<Environment>(env);

            // Bind 'this' from call context (already set to captured_this by JSArrowFunction)
            func_env->define("this", call_context.thisValue);

            // Bind parameters to arguments
            for (size_t i = 0; i < parameters.size(); ++i) {
                Value arg_value = (i < args.size()) ? args[i] : Value::undefined();
                func_env->define(parameters[i], arg_value);
            }

            // Arrow functions do NOT have their own 'arguments' object per spec
            // (They inherit 'arguments' from enclosing scope if available)

            // Execute function body
            try {
                Value result = engine->evaluate(body, func_env);
                // If expression body, the result IS the return value (implicit return)
                if (is_expression_body) {
                    return result;
                }
                // Block body without return statement returns undefined
                return Value::undefined();
            } catch (const ReturnException& e) {
                return e.getValue();
            }
        },
        captured_this);

    // Re-enable GC before returning
    obj_manager->setGCEnabled(was_gc_enabled);
    return Value(arrow_func);
}

Value ExpressionEvaluator::evaluateNewExpression(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.empty()) {
        return Value::undefined();
    }

    // Get the constructor
    auto constructor_node = node->children[0];
    Value constructor = engine->evaluate(constructor_node, env);

    // Check if constructor is a function
    if(!constructor.isFunction()) {
        throw JavaScriptException(
            Value("TypeError: " + constructor.toString() + " is not a constructor"),
            node->line, node->column);
    }

    auto* constructor_func =
        dynamic_cast<JSFunction*>(constructor.getObject());  // Use dynamic_cast for raw pointers
    if(!constructor_func) {
        throw JavaScriptException(Value("TypeError: constructor is not a function"),
                                  node->line, node->column);
    }

    // Check if this is an arrow function - they cannot be constructors
    if (!constructor_func->isConstructor()) {
        throw JavaScriptException(
            Value("TypeError: arrow function is not a constructor"),
            node->line, node->column);
    }

    // Create a new object that will be the 'this' context for the constructor
    auto* new_obj = engine->getObjectFactory()->createJSObject();

    // Collect real arguments (skip first child which is the constructor)
    std::vector<Value> args;
    for(size_t i = 1; i < node->children.size(); ++i) {
        args.push_back(engine->evaluate(node->children[i], env));
    }

    // Call constructor function - built-in constructors like Array and Object
    // handle their own object creation and return the created object
    rift::core::CallContext ctor_context(rift::core::CallType::Constructor, Value(new_obj));
    Value result = constructor_func->call(ctor_context, args);

    // If the constructor returned an object, use it (this is the normal case for built-ins)
    if(result.isObject() || result.isFunction()) {
        return result;
    }

    // If constructor returned a primitive (or undefined), return the object we created
    // This handles user-defined constructor functions
    return Value(new_obj);
}

}  // namespace rift::core
