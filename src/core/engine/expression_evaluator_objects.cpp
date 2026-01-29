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

#include "rift/builtins/array/array.h"
#include "rift/builtins/generator/generator_iterator.h"
#include "rift/builtins/promise/promise.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/core/engine/async_executor.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/engine.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/expression_evaluator.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/memory/gc_protector.h"
#include "rift/runtime/values/object.h"

namespace rift::core {

Value ExpressionEvaluator::evaluateCallExpression(std::shared_ptr<ASTNode> node,
                                                  std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() < 1) {
        return Value::undefined();
    }

    auto callee_node = node->children[0];

    // Handle super() call
    if(callee_node->type == ASTNodeType::SuperExpression && callee_node->value == "call") {
        // Get the super constructor from environment
        Value super_ctor;
        try {
            super_ctor = env->get("[[SuperConstructor]]");
        } catch(const JavaScriptException&) {
            throw JavaScriptException(Value("SyntaxError: 'super' keyword is unexpected here"),
                                      node->line, node->column);
        }

        if(!super_ctor.isFunction()) {
            throw JavaScriptException(Value("TypeError: Super constructor is not a function"),
                                      node->line, node->column);
        }

        // Get current 'this' value
        Value this_value = env->get("this");

        // Evaluate arguments
        std::vector<Value> args;
        for(size_t i = 1; i < node->children.size(); ++i) {
            auto& arg_node = node->children[i];
            if(arg_node->type == ASTNodeType::SpreadElement) {
                Value spread_value = engine->evaluate(arg_node->children[0], env);
                if(spread_value.isObject()) {
                    auto* obj = spread_value.getObject();
                    Value length_val = obj->getProperty("length");
                    if(length_val.isNumber()) {
                        size_t length = static_cast<size_t>(length_val.getNumber());
                        for(size_t j = 0; j < length; ++j) {
                            args.push_back(obj->getProperty(std::to_string(j)));
                        }
                    }
                }
            } else {
                args.push_back(engine->evaluate(arg_node, env));
            }
        }

        // Call parent constructor with current 'this'
        auto* ctor = dynamic_cast<JSFunction*>(super_ctor.getObject());
        rift::core::CallContext ctx(rift::core::CallType::Constructor, this_value);
        return ctor->call(ctx, args);
    }

    // Handle super.method() call
    if(callee_node->type == ASTNodeType::SuperExpression && callee_node->value == "member") {
        // Get the parent prototype from environment
        Value super_proto;
        try {
            super_proto = env->get("[[SuperPrototype]]");
        } catch(const JavaScriptException&) {
            // Try getting from [[SuperConstructor]] as fallback
            try {
                Value super_ctor = env->get("[[SuperConstructor]]");
                if(super_ctor.isFunction()) {
                    super_proto = super_ctor.getObject()->getProperty("prototype");
                }
            } catch(const JavaScriptException&) {
                throw JavaScriptException(Value("SyntaxError: 'super' keyword is unexpected here"),
                                          node->line, node->column);
            }
        }

        if(!super_proto.isObject()) {
            throw JavaScriptException(Value("TypeError: Cannot read properties of undefined"),
                                      node->line, node->column);
        }

        // Get the method name
        std::string method_name;
        if(callee_node->metadata == "computed") {
            Value key_value = engine->evaluate(callee_node->children[0], env);
            method_name = key_value.toString();
        } else {
            method_name = callee_node->children[0]->value;
        }

        Value method = super_proto.getObject()->getProperty(method_name);
        if(!method.isFunction()) {
            throw JavaScriptException(
                Value("TypeError: super." + method_name + " is not a function"), node->line,
                node->column);
        }

        // Get current 'this' value
        Value this_value = env->get("this");

        // Evaluate arguments
        std::vector<Value> args;
        for(size_t i = 1; i < node->children.size(); ++i) {
            auto& arg_node = node->children[i];
            if(arg_node->type == ASTNodeType::SpreadElement) {
                Value spread_value = engine->evaluate(arg_node->children[0], env);
                if(spread_value.isObject()) {
                    auto* obj = spread_value.getObject();
                    Value length_val = obj->getProperty("length");
                    if(length_val.isNumber()) {
                        size_t length = static_cast<size_t>(length_val.getNumber());
                        for(size_t j = 0; j < length; ++j) {
                            args.push_back(obj->getProperty(std::to_string(j)));
                        }
                    }
                }
            } else {
                args.push_back(engine->evaluate(arg_node, env));
            }
        }

        // Call method with current 'this'
        auto* func = dynamic_cast<JSFunction*>(method.getObject());
        rift::core::CallContext ctx(rift::core::CallType::Function, this_value);
        return func->call(ctx, args);
    }

    // Check if this is a method call (member expression)
    Value this_value = Value::undefined();
    Value callee;

    if(callee_node->type == ASTNodeType::MemberExpression) {
        // This is a method call: obj.method(args)
        if(callee_node->children.size() == 2) {
            // Get the object (this value) - evaluate ONCE
            this_value = engine->evaluate(callee_node->children[0], env);

            // Get property name from the member expression
            std::string property;
            if(callee_node->metadata == "computed") {
                Value property_value = engine->evaluate(callee_node->children[1], env);
                if(property_value.isSymbol()) {
                    property =
                        EvaluationUtils::symbolToPropertyKey(property_value.getSymbol().id);
                } else {
                    property = EvaluationUtils::toPropertyKeyString(property_value);
                }
            } else {
                property = callee_node->children[1]->value;
            }

            // Look up the method on the already-evaluated object
            if(this_value.isObject() || this_value.isFunction()) {
                auto* obj = this_value.getObject();
                if(obj) {
                    callee = obj->getProperty(property);
                }
            } else if(this_value.isString()) {
                auto* string_prototype = BuiltinManager::getStringPrototype();
                if(string_prototype) {
                    callee = string_prototype->getProperty(property);
                }
            } else if(this_value.isSymbol()) {
                auto* symbol_prototype = BuiltinManager::getSymbolPrototype();
                if(symbol_prototype) {
                    callee = symbol_prototype->getProperty(property);
                }
            }
        }
    } else {
        // Regular function call
        callee = engine->evaluate(callee_node, env);
    }

    // Evaluate arguments, expanding spread elements
    std::vector<Value> args;
    for(size_t i = 1; i < node->children.size(); ++i) {
        auto& arg_node = node->children[i];

        if(arg_node->type == ASTNodeType::SpreadElement) {
            // Spread argument: expand the iterable into individual arguments
            Value spread_value = engine->evaluate(arg_node->children[0], env);

            if(spread_value.isObject()) {
                auto* obj = spread_value.getObject();
                // Check if it's an array-like object with length property
                Value length_val = obj->getProperty("length");
                if(length_val.isNumber()) {
                    size_t length = static_cast<size_t>(length_val.getNumber());
                    for(size_t j = 0; j < length; ++j) {
                        Value elem = obj->getProperty(std::to_string(j));
                        args.push_back(elem);
                    }
                }
            } else if(spread_value.isString()) {
                // Spread a string into individual characters
                std::string str = spread_value.getString();
                for(char c : str) {
                    args.push_back(Value(std::string(1, c)));
                }
            }
            // For non-iterable values, spread does nothing
        } else {
            args.push_back(engine->evaluate(arg_node, env));
        }
    }

    // If it's a function object, call it
    if(callee.isFunction()) {
        auto* func =
            dynamic_cast<JSFunction*>(callee.getObject());  // Use dynamic_cast for raw pointers
        if(!func) {
            throw JavaScriptException(Value("TypeError: callee is not a function"), node->line,
                                      node->column);
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

        // Handle symbol property keys
        if(property_value.isSymbol()) {
            property = EvaluationUtils::symbolToPropertyKey(property_value.getSymbol().id);
        } else {
            property = EvaluationUtils::toPropertyKeyString(property_value);
        }
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

    if(object.isSymbol()) {
        // Get the Symbol prototype and look up the property
        auto* symbol_prototype = BuiltinManager::getSymbolPrototype();
        if(symbol_prototype) {
            return symbol_prototype->getProperty(property);
        }
    }

    return Value::undefined();
}

Value ExpressionEvaluator::evaluateArrayLiteral(std::shared_ptr<ASTNode> node,
                                                std::shared_ptr<Environment> env, Rift* engine) {
    // Evaluate each element in the array literal, expanding spread elements
    std::vector<Value> elements;
    elements.reserve(node->children.size());

    for(const auto& child : node->children) {
        if(child->type == ASTNodeType::SpreadElement) {
            // Spread element: expand the iterable into individual elements
            Value spread_value = engine->evaluate(child->children[0], env);

            if(spread_value.isString()) {
                // Spread a string into individual characters
                std::string str = spread_value.getString();
                for(char c : str) {
                    elements.push_back(Value(std::string(1, c)));
                }
            } else if(spread_value.isObject()) {
                auto* obj = spread_value.getObject();

                // First, check for Symbol.iterator (iterator protocol)
                std::string iterator_key =
                    EvaluationUtils::symbolToPropertyKey(builtins::Symbol::getIteratorId());
                Value iterator_method = obj->getProperty(iterator_key);

                if(iterator_method.isFunction()) {
                    // Use iterator protocol
                    auto* iterator_func =
                        dynamic_cast<rift::runtime::JSFunction*>(iterator_method.getObject());
                    if(iterator_func) {
                        CallContext ctx(CallType::Function, spread_value);
                        Value iterator = iterator_func->call(ctx, {});

                        if(iterator.isObject()) {
                            auto* iterator_obj = iterator.getObject();

                            // Repeatedly call next() until done
                            while(true) {
                                Value next_method = iterator_obj->getProperty("next");
                                if(!next_method.isFunction()) {
                                    break;
                                }

                                auto* next_func = dynamic_cast<rift::runtime::JSFunction*>(
                                    next_method.getObject());
                                if(!next_func) {
                                    break;
                                }

                                CallContext next_ctx(CallType::Function, iterator);
                                Value result = next_func->call(next_ctx, {});

                                if(!result.isObject()) {
                                    break;
                                }

                                auto* result_obj = result.getObject();
                                Value done = result_obj->getProperty("done");
                                if(done.toBool()) {
                                    break;
                                }

                                Value value = result_obj->getProperty("value");
                                elements.push_back(value);
                            }
                        }
                    }
                } else {
                    // Fall back to array-like iteration (length property)
                    Value length_val = obj->getProperty("length");
                    if(length_val.isNumber()) {
                        size_t length = static_cast<size_t>(length_val.getNumber());
                        for(size_t idx = 0; idx < length; ++idx) {
                            Value elem = obj->getProperty(std::to_string(idx));
                            elements.push_back(elem);
                        }
                    }
                }
            }
            // For non-iterable values, spread does nothing (per ECMAScript spec would throw)
        } else {
            elements.push_back(engine->evaluate(child, env));
        }
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
    // Each parameter can be: Identifier, AssignmentExpression (default), or Identifier with "rest"
    auto param_list = node->children[0];
    std::vector<std::tuple<std::string, std::shared_ptr<ASTNode>, bool>> param_info;
    for(const auto& param : param_list->children) {
        if(param->type == ASTNodeType::AssignmentExpression) {
            // Parameter with default value: children[0] = name, children[1] = default
            param_info.emplace_back(param->children[0]->value, param->children[1], false);
        } else if(param->metadata == "rest") {
            // Rest parameter: ...name
            param_info.emplace_back(param->value, nullptr, true);
        } else {
            // Simple identifier parameter (no default)
            param_info.emplace_back(param->value, nullptr, false);
        }
    }

    // Get function body (second child)
    auto body = node->children[1];

    // Check if function body contains "use strict" directive
    bool function_is_strict = false;
    if(body->type == ASTNodeType::BlockStatement) {
        for(const auto& stmt : body->children) {
            // Check for "use strict" directive
            if(stmt->type == ASTNodeType::ExpressionStatement && !stmt->children.empty()) {
                const auto& expr = stmt->children[0];
                if(expr->type == ASTNodeType::Literal && expr->metadata == "string") {
                    if(expr->value == "use strict") {
                        function_is_strict = true;
                    }
                    continue;  // Other string directive - keep checking
                }
            }
            // Non-directive statement found - stop checking
            break;
        }
    }

    // Temporarily disable GC to prevent collection during function creation
    auto* factory = engine->getObjectFactory();
    auto* obj_manager = factory->getObjectManager();
    bool was_gc_enabled = obj_manager->isGCEnabled();
    obj_manager->setGCEnabled(false);

    // Create function object (anonymous) using GC-managed creation
    auto* func = factory->createJSFunction(
        [engine, param_info, body, env, function_is_strict](
            const rift::core::CallContext& call_context, const std::vector<Value>& args) -> Value {
            // Create new environment for function execution
            auto func_env = std::make_shared<Environment>(env);

            // Set strict mode if function has "use strict" directive
            if(function_is_strict) {
                func_env->setStrictMode(true);
            }

            // Bind 'this' to the function environment
            func_env->define("this", call_context.thisValue);

            // Bind parameters to real arguments (with default value and rest support)
            for(size_t i = 0; i < param_info.size(); ++i) {
                const auto& [param_name, default_ast, is_rest] = param_info[i];

                if(is_rest) {
                    // Rest parameter: collect all remaining arguments into an array
                    std::vector<Value> rest_args;
                    for(size_t j = i; j < args.size(); ++j) {
                        rest_args.push_back(args[j]);
                    }
                    auto* rest_array =
                        builtins::Array::createArrayObject(engine->getObjectFactory(), rest_args);
                    func_env->define(param_name, Value(rest_array));
                } else {
                    Value arg_value;

                    // Use default if: argument not provided OR argument is undefined
                    bool use_default = (i >= args.size()) || args[i].isUndefined();

                    if(use_default && default_ast) {
                        // Evaluate default value in the function's environment
                        arg_value = engine->evaluate(default_ast, func_env);
                    } else if(i < args.size()) {
                        arg_value = args[i];
                    } else {
                        arg_value = Value::undefined();
                    }
                    func_env->define(param_name, arg_value);
                }
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
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Get parameters (first child should be parameter list)
    // Each parameter can be: Identifier, AssignmentExpression (default), or Identifier with "rest"
    auto param_list = node->children[0];
    std::vector<std::tuple<std::string, std::shared_ptr<ASTNode>, bool>> param_info;
    for(const auto& param : param_list->children) {
        if(param->type == ASTNodeType::AssignmentExpression) {
            // Parameter with default value: children[0] = name, children[1] = default
            param_info.emplace_back(param->children[0]->value, param->children[1], false);
        } else if(param->metadata == "rest") {
            // Rest parameter: ...name
            param_info.emplace_back(param->value, nullptr, true);
        } else {
            // Simple identifier parameter (no default)
            param_info.emplace_back(param->value, nullptr, false);
        }
    }

    // Get function body (second child)
    auto body = node->children[1];

    // Check if this is an expression body (implicit return) or async
    bool is_expression_body = (node->metadata == "expression");
    bool is_async = (node->metadata == "async");

    // CRITICAL: Capture current 'this' value from enclosing environment
    Value captured_this = Value::undefined();
    try {
        captured_this = env->get("this");
    } catch(const JavaScriptException&) {
        // No 'this' in scope - use undefined
    }

    // Temporarily disable GC to prevent collection during function creation
    auto* factory = engine->getObjectFactory();
    auto* obj_manager = factory->getObjectManager();
    bool was_gc_enabled = obj_manager->isGCEnabled();
    obj_manager->setGCEnabled(false);

    // Create arrow function object with captured this
    auto* arrow_func = factory->createJSArrowFunction(
        [engine, param_info, body, env, is_expression_body, is_async](
            const rift::core::CallContext& call_context, const std::vector<Value>& args) -> Value {
            // Create new environment for function execution
            // Note: Arrow functions get 'this' from captured_this via JSArrowFunction,
            // which modifies the call_context before calling
            auto func_env = std::make_shared<Environment>(env);

            // Bind 'this' from call context (already set to captured_this by JSArrowFunction)
            func_env->define("this", call_context.thisValue);

            // Bind parameters to arguments (with default value and rest support)
            for(size_t i = 0; i < param_info.size(); ++i) {
                const auto& [param_name, default_ast, is_rest] = param_info[i];

                if(is_rest) {
                    // Rest parameter: collect all remaining arguments into an array
                    std::vector<Value> rest_args;
                    for(size_t j = i; j < args.size(); ++j) {
                        rest_args.push_back(args[j]);
                    }
                    auto* rest_array =
                        builtins::Array::createArrayObject(engine->getObjectFactory(), rest_args);
                    func_env->define(param_name, Value(rest_array));
                } else {
                    Value arg_value;

                    // Use default if: argument not provided OR argument is undefined
                    bool use_default = (i >= args.size()) || args[i].isUndefined();

                    if(use_default && default_ast) {
                        // Evaluate default value in the function's environment
                        arg_value = engine->evaluate(default_ast, func_env);
                    } else if(i < args.size()) {
                        arg_value = args[i];
                    } else {
                        arg_value = Value::undefined();
                    }
                    func_env->define(param_name, arg_value);
                }
            }

            // Arrow functions do NOT have their own 'arguments' object per spec
            // (They inherit 'arguments' from enclosing scope if available)

            if(is_async) {
                // Async arrow: return a Promise, execute body via AsyncExecutor
                auto* promise_obj =
                    builtins::Promise::createPromiseObject(engine->getObjectFactory());
                memory::GCProtector protect(promise_obj,
                                            engine->getObjectFactory()->getObjectManager());
                AsyncExecutor::executeAsync(body, func_env, engine, promise_obj);
                return Value(promise_obj);
            }

            // Execute function body (sync path)
            try {
                Value result = engine->evaluate(body, func_env);
                // If expression body, the result IS the return value (implicit return)
                if(is_expression_body) {
                    return result;
                }
                // Block body without return statement returns undefined
                return Value::undefined();
            } catch(const ReturnException& e) {
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
            Value("TypeError: " + constructor.toString() + " is not a constructor"), node->line,
            node->column);
    }

    auto* constructor_func =
        dynamic_cast<JSFunction*>(constructor.getObject());  // Use dynamic_cast for raw pointers
    if(!constructor_func) {
        throw JavaScriptException(Value("TypeError: constructor is not a function"), node->line,
                                  node->column);
    }

    // Check if this is an arrow function - they cannot be constructors
    if(!constructor_func->isConstructor()) {
        throw JavaScriptException(Value("TypeError: arrow function is not a constructor"),
                                  node->line, node->column);
    }

    // Get the constructor's prototype and set it on the new object
    Value proto_value = constructor_func->getProperty("prototype");
    JSObject* prototype = nullptr;
    if(proto_value.isObject()) {
        prototype = proto_value.getObject();
    }

    // Create a new object with the constructor's prototype
    auto* new_obj = engine->getObjectFactory()->createJSObject(prototype);

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

Value ExpressionEvaluator::evaluateClassExpression(std::shared_ptr<ASTNode> node,
                                                   std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Get optional class name (for named class expressions)
    std::string class_name = node->value;

    // Get superclass (may be nullptr)
    auto superclass_node = node->children[0];
    // Get class body
    auto class_body = node->children[1];

    // Evaluate superclass if present
    JSFunction* parent_constructor = nullptr;
    JSObject* parent_prototype = nullptr;

    if(superclass_node) {
        Value super_value = engine->evaluate(superclass_node, env);
        if(!super_value.isFunction()) {
            throw JavaScriptException(
                Value("TypeError: Class extends value is not a constructor or null"), node->line,
                node->column);
        }
        parent_constructor = dynamic_cast<JSFunction*>(super_value.getObject());
        if(!parent_constructor) {
            throw JavaScriptException(Value("TypeError: Class extends value is not a constructor"),
                                      node->line, node->column);
        }
        Value proto_value = parent_constructor->getProperty("prototype");
        if(proto_value.isObject()) {
            parent_prototype = proto_value.getObject();
        }
    }

    // Create prototype object
    auto* factory = engine->getObjectFactory();
    auto* obj_manager = factory->getObjectManager();
    bool was_gc_enabled = obj_manager->isGCEnabled();
    obj_manager->setGCEnabled(false);

    try {
        auto* class_prototype = factory->createJSObject(parent_prototype);

        // Process class body
        std::shared_ptr<ASTNode> constructor_method = nullptr;
        std::vector<std::shared_ptr<ASTNode>> instance_methods;
        std::vector<std::shared_ptr<ASTNode>> static_methods;

        for(const auto& method : class_body->children) {
            if(method->type != ASTNodeType::MethodDefinition &&
               method->type != ASTNodeType::GeneratorMethod &&
               method->type != ASTNodeType::AsyncMethod) {
                continue;
            }

            bool is_static = (method->metadata.find("static") != std::string::npos);
            bool is_constructor = (method->value == "constructor");

            if(is_constructor && !is_static) {
                constructor_method = method;
            } else if(is_static) {
                static_methods.push_back(method);
            } else {
                instance_methods.push_back(method);
            }
        }

        // Create class-scoped environment for named class expressions
        // The class name is visible inside the class body but NOT in the outer scope
        auto class_env = std::make_shared<Environment>(env);

        // Extract constructor parameters and body
        std::vector<std::tuple<std::string, std::shared_ptr<ASTNode>, bool>> ctor_param_info;
        std::shared_ptr<ASTNode> ctor_body = nullptr;

        if(constructor_method) {
            auto ctor_params = constructor_method->children[0];
            ctor_body = constructor_method->children[1];

            for(const auto& param : ctor_params->children) {
                if(param->type == ASTNodeType::AssignmentExpression) {
                    ctor_param_info.emplace_back(param->children[0]->value, param->children[1],
                                                 false);
                } else if(param->metadata == "rest") {
                    ctor_param_info.emplace_back(param->value, nullptr, true);
                } else {
                    ctor_param_info.emplace_back(param->value, nullptr, false);
                }
            }
        }

        auto* constructor = factory->createJSFunction(
            [engine, ctor_param_info, ctor_body, class_env, parent_constructor, class_prototype](
                const rift::core::CallContext& call_context,
                const std::vector<Value>& args) -> Value {
                if(call_context.type != rift::core::CallType::Constructor) {
                    throw JavaScriptException(
                        Value("TypeError: Class constructor cannot be invoked without 'new'"));
                }

                auto func_env = std::make_shared<Environment>(class_env);
                func_env->define("this", call_context.thisValue);
                func_env->define("[[HomeObject]]", Value(class_prototype));
                if(parent_constructor) {
                    func_env->define("[[SuperConstructor]]", Value(parent_constructor));
                }

                // Bind parameters
                for(size_t i = 0; i < ctor_param_info.size(); ++i) {
                    const auto& [param_name, default_ast, is_rest] = ctor_param_info[i];

                    if(is_rest) {
                        std::vector<Value> rest_args;
                        for(size_t j = i; j < args.size(); ++j) {
                            rest_args.push_back(args[j]);
                        }
                        auto* rest_array = builtins::Array::createArrayObject(
                            engine->getObjectFactory(), rest_args);
                        func_env->define(param_name, Value(rest_array));
                    } else {
                        Value arg_value;
                        bool use_default = (i >= args.size()) || args[i].isUndefined();

                        if(use_default && default_ast) {
                            arg_value = engine->evaluate(default_ast, func_env);
                        } else if(i < args.size()) {
                            arg_value = args[i];
                        } else {
                            arg_value = Value::undefined();
                        }
                        func_env->define(param_name, arg_value);
                    }
                }

                if(ctor_body) {
                    try {
                        engine->evaluate(ctor_body, func_env);
                    } catch(const ReturnException& e) {
                        Value returned = e.getValue();
                        if(returned.isObject()) {
                            return returned;
                        }
                    }
                }

                return call_context.thisValue;
            });

        // Set up prototype chain
        constructor->setProperty("prototype", Value(class_prototype));
        class_prototype->setProperty("constructor", Value(constructor));
        constructor->setHomeObject(class_prototype);

        // Bind class name in the class-scoped environment (visible to methods, not outer scope)
        if(!class_name.empty()) {
            class_env->define(class_name, Value(constructor));
        }

        // Add instance methods to prototype
        for(const auto& method : instance_methods) {
            std::string method_name = method->value;
            bool is_computed = (method->metadata.find("computed") != std::string::npos);
            bool is_generator = (method->type == ASTNodeType::GeneratorMethod);
            bool is_async = (method->type == ASTNodeType::AsyncMethod);

            if(is_computed && method->children.size() > 2) {
                Value key_value = engine->evaluate(method->children[2], class_env);
                method_name = key_value.toString();
            }

            auto method_params = method->children[0];
            auto method_body = method->children[1];

            std::vector<std::string> param_names;
            std::vector<std::tuple<std::string, std::shared_ptr<ASTNode>, bool>> method_param_info;
            for(const auto& param : method_params->children) {
                if(param->type == ASTNodeType::AssignmentExpression) {
                    method_param_info.emplace_back(param->children[0]->value, param->children[1],
                                                   false);
                    param_names.push_back(param->children[0]->value);
                } else if(param->metadata == "rest") {
                    method_param_info.emplace_back(param->value, nullptr, true);
                    param_names.push_back(param->value);
                } else {
                    method_param_info.emplace_back(param->value, nullptr, false);
                    param_names.push_back(param->value);
                }
            }

            JSFunction* method_func = nullptr;
            if(is_generator) {
                method_func = factory->createJSFunction(
                    [engine, method_param_info, param_names, method_body, class_env](
                        const rift::core::CallContext& /*call_context*/,
                        const std::vector<Value>& args) -> Value {
                        std::vector<Value> processed_args;
                        auto func_env = std::make_shared<Environment>(class_env);
                        for(size_t i = 0; i < method_param_info.size(); ++i) {
                            const auto& [param_name, default_ast, is_rest] = method_param_info[i];
                            if(is_rest) {
                                std::vector<Value> rest_args;
                                for(size_t j = i; j < args.size(); ++j) {
                                    rest_args.push_back(args[j]);
                                }
                                auto* rest_array = builtins::Array::createArrayObject(
                                    engine->getObjectFactory(), rest_args);
                                processed_args.push_back(Value(rest_array));
                            } else {
                                Value arg_value;
                                bool use_default = (i >= args.size()) || args[i].isUndefined();
                                if(use_default && default_ast) {
                                    arg_value = engine->evaluate(default_ast, func_env);
                                } else if(i < args.size()) {
                                    arg_value = args[i];
                                } else {
                                    arg_value = Value::undefined();
                                }
                                processed_args.push_back(arg_value);
                            }
                        }
                        auto* generator = builtins::GeneratorIterator::create(
                            engine->getObjectFactory(), method_body, class_env, engine, param_names,
                            processed_args);
                        return Value(generator);
                    });
            } else if(is_async) {
                method_func = factory->createJSFunction(
                    [engine, method_param_info, method_body, class_env, class_prototype,
                     parent_prototype](const rift::core::CallContext& call_context,
                                       const std::vector<Value>& args) -> Value {
                        auto* factory = engine->getObjectFactory();
                        auto* promise_obj = builtins::Promise::createPromiseObject(factory);
                        memory::GCProtector protect(promise_obj, factory->getObjectManager());

                        auto func_env = std::make_shared<Environment>(class_env);
                        func_env->define("this", call_context.thisValue);
                        func_env->define("[[HomeObject]]", Value(class_prototype));
                        if(parent_prototype) {
                            func_env->define("[[SuperPrototype]]", Value(parent_prototype));
                        }

                        for(size_t i = 0; i < method_param_info.size(); ++i) {
                            const auto& [param_name, default_ast, is_rest] = method_param_info[i];
                            if(is_rest) {
                                std::vector<Value> rest_args;
                                for(size_t j = i; j < args.size(); ++j) {
                                    rest_args.push_back(args[j]);
                                }
                                auto* rest_array = builtins::Array::createArrayObject(
                                    engine->getObjectFactory(), rest_args);
                                func_env->define(param_name, Value(rest_array));
                            } else {
                                Value arg_value;
                                bool use_default = (i >= args.size()) || args[i].isUndefined();
                                if(use_default && default_ast) {
                                    arg_value = engine->evaluate(default_ast, func_env);
                                } else if(i < args.size()) {
                                    arg_value = args[i];
                                } else {
                                    arg_value = Value::undefined();
                                }
                                func_env->define(param_name, arg_value);
                            }
                        }

                        auto* args_factory = engine->getObjectFactory();
                        auto* arguments_obj = args_factory->createJSObject();
                        for(size_t i = 0; i < args.size(); ++i) {
                            arguments_obj->setProperty(std::to_string(i), args[i]);
                        }
                        arguments_obj->setProperty("length",
                                                   Value(static_cast<double>(args.size())));
                        func_env->define("arguments", Value(arguments_obj));

                        AsyncExecutor::executeAsync(method_body, func_env, engine, promise_obj);
                        return Value(promise_obj);
                    });
            } else {
                method_func = factory->createJSFunction(
                    [engine, method_param_info, method_body, class_env, class_prototype,
                     parent_prototype](const rift::core::CallContext& call_context,
                                       const std::vector<Value>& args) -> Value {
                        auto func_env = std::make_shared<Environment>(class_env);
                        func_env->define("this", call_context.thisValue);
                        func_env->define("[[HomeObject]]", Value(class_prototype));
                        if(parent_prototype) {
                            func_env->define("[[SuperPrototype]]", Value(parent_prototype));
                        }

                        for(size_t i = 0; i < method_param_info.size(); ++i) {
                            const auto& [param_name, default_ast, is_rest] = method_param_info[i];

                            if(is_rest) {
                                std::vector<Value> rest_args;
                                for(size_t j = i; j < args.size(); ++j) {
                                    rest_args.push_back(args[j]);
                                }
                                auto* rest_array = builtins::Array::createArrayObject(
                                    engine->getObjectFactory(), rest_args);
                                func_env->define(param_name, Value(rest_array));
                            } else {
                                Value arg_value;
                                bool use_default = (i >= args.size()) || args[i].isUndefined();

                                if(use_default && default_ast) {
                                    arg_value = engine->evaluate(default_ast, func_env);
                                } else if(i < args.size()) {
                                    arg_value = args[i];
                                } else {
                                    arg_value = Value::undefined();
                                }
                                func_env->define(param_name, arg_value);
                            }
                        }

                        try {
                            return engine->evaluate(method_body, func_env);
                        } catch(const ReturnException& e) {
                            return e.getValue();
                        }
                    });
            }

            method_func->setHomeObject(class_prototype);
            class_prototype->setProperty(method_name, Value(method_func));
        }

        // Add static methods to constructor
        for(const auto& method : static_methods) {
            std::string method_name = method->value;
            bool is_computed = (method->metadata.find("computed") != std::string::npos);
            bool is_generator = (method->type == ASTNodeType::GeneratorMethod);
            bool is_async = (method->type == ASTNodeType::AsyncMethod);

            if(is_computed && method->children.size() > 2) {
                Value key_value = engine->evaluate(method->children[2], class_env);
                method_name = key_value.toString();
            }

            auto method_params = method->children[0];
            auto method_body = method->children[1];

            std::vector<std::string> param_names;
            std::vector<std::tuple<std::string, std::shared_ptr<ASTNode>, bool>> method_param_info;
            for(const auto& param : method_params->children) {
                if(param->type == ASTNodeType::AssignmentExpression) {
                    method_param_info.emplace_back(param->children[0]->value, param->children[1],
                                                   false);
                    param_names.push_back(param->children[0]->value);
                } else if(param->metadata == "rest") {
                    method_param_info.emplace_back(param->value, nullptr, true);
                    param_names.push_back(param->value);
                } else {
                    method_param_info.emplace_back(param->value, nullptr, false);
                    param_names.push_back(param->value);
                }
            }

            JSFunction* method_func = nullptr;
            if(is_generator) {
                method_func = factory->createJSFunction(
                    [engine, method_param_info, param_names, method_body, class_env](
                        const rift::core::CallContext& /*call_context*/,
                        const std::vector<Value>& args) -> Value {
                        std::vector<Value> processed_args;
                        auto func_env = std::make_shared<Environment>(class_env);
                        for(size_t i = 0; i < method_param_info.size(); ++i) {
                            const auto& [param_name, default_ast, is_rest] = method_param_info[i];
                            if(is_rest) {
                                std::vector<Value> rest_args;
                                for(size_t j = i; j < args.size(); ++j) {
                                    rest_args.push_back(args[j]);
                                }
                                auto* rest_array = builtins::Array::createArrayObject(
                                    engine->getObjectFactory(), rest_args);
                                processed_args.push_back(Value(rest_array));
                            } else {
                                Value arg_value;
                                bool use_default = (i >= args.size()) || args[i].isUndefined();
                                if(use_default && default_ast) {
                                    arg_value = engine->evaluate(default_ast, func_env);
                                } else if(i < args.size()) {
                                    arg_value = args[i];
                                } else {
                                    arg_value = Value::undefined();
                                }
                                processed_args.push_back(arg_value);
                            }
                        }
                        auto* generator = builtins::GeneratorIterator::create(
                            engine->getObjectFactory(), method_body, class_env, engine, param_names,
                            processed_args);
                        return Value(generator);
                    });
            } else if(is_async) {
                method_func = factory->createJSFunction(
                    [engine, method_param_info, method_body, class_env](
                        const rift::core::CallContext& call_context,
                        const std::vector<Value>& args) -> Value {
                        auto* factory = engine->getObjectFactory();
                        auto* promise_obj = builtins::Promise::createPromiseObject(factory);
                        memory::GCProtector protect(promise_obj, factory->getObjectManager());

                        auto func_env = std::make_shared<Environment>(class_env);
                        func_env->define("this", call_context.thisValue);

                        for(size_t i = 0; i < method_param_info.size(); ++i) {
                            const auto& [param_name, default_ast, is_rest] = method_param_info[i];
                            if(is_rest) {
                                std::vector<Value> rest_args;
                                for(size_t j = i; j < args.size(); ++j) {
                                    rest_args.push_back(args[j]);
                                }
                                auto* rest_array = builtins::Array::createArrayObject(
                                    engine->getObjectFactory(), rest_args);
                                func_env->define(param_name, Value(rest_array));
                            } else {
                                Value arg_value;
                                bool use_default = (i >= args.size()) || args[i].isUndefined();
                                if(use_default && default_ast) {
                                    arg_value = engine->evaluate(default_ast, func_env);
                                } else if(i < args.size()) {
                                    arg_value = args[i];
                                } else {
                                    arg_value = Value::undefined();
                                }
                                func_env->define(param_name, arg_value);
                            }
                        }

                        auto* args_factory = engine->getObjectFactory();
                        auto* arguments_obj = args_factory->createJSObject();
                        for(size_t i = 0; i < args.size(); ++i) {
                            arguments_obj->setProperty(std::to_string(i), args[i]);
                        }
                        arguments_obj->setProperty("length",
                                                   Value(static_cast<double>(args.size())));
                        func_env->define("arguments", Value(arguments_obj));

                        AsyncExecutor::executeAsync(method_body, func_env, engine, promise_obj);
                        return Value(promise_obj);
                    });
            } else {
                method_func =
                    factory->createJSFunction([engine, method_param_info, method_body, class_env](
                                                  const rift::core::CallContext& call_context,
                                                  const std::vector<Value>& args) -> Value {
                        auto func_env = std::make_shared<Environment>(class_env);
                        func_env->define("this", call_context.thisValue);

                        for(size_t i = 0; i < method_param_info.size(); ++i) {
                            const auto& [param_name, default_ast, is_rest] = method_param_info[i];

                            if(is_rest) {
                                std::vector<Value> rest_args;
                                for(size_t j = i; j < args.size(); ++j) {
                                    rest_args.push_back(args[j]);
                                }
                                auto* rest_array = builtins::Array::createArrayObject(
                                    engine->getObjectFactory(), rest_args);
                                func_env->define(param_name, Value(rest_array));
                            } else {
                                Value arg_value;
                                bool use_default = (i >= args.size()) || args[i].isUndefined();

                                if(use_default && default_ast) {
                                    arg_value = engine->evaluate(default_ast, func_env);
                                } else if(i < args.size()) {
                                    arg_value = args[i];
                                } else {
                                    arg_value = Value::undefined();
                                }
                                func_env->define(param_name, arg_value);
                            }
                        }

                        try {
                            return engine->evaluate(method_body, func_env);
                        } catch(const ReturnException& e) {
                            return e.getValue();
                        }
                    });
            }

            constructor->setProperty(method_name, Value(method_func));
        }

        obj_manager->setGCEnabled(was_gc_enabled);
        return Value(constructor);

    } catch(...) {
        obj_manager->setGCEnabled(was_gc_enabled);
        throw;
    }
}

Value ExpressionEvaluator::evaluateSuperExpression(std::shared_ptr<ASTNode> node,
                                                   std::shared_ptr<Environment> env,
                                                   Rift* /*engine*/) {
    // SuperExpression when not in a call context
    // This handles super.property access (not super.method())

    if(node->value == "member") {
        // super.property or super[expr]
        Value super_proto;
        try {
            super_proto = env->get("[[SuperPrototype]]");
        } catch(const JavaScriptException&) {
            // Try getting from [[SuperConstructor]] as fallback
            try {
                Value super_ctor = env->get("[[SuperConstructor]]");
                if(super_ctor.isFunction()) {
                    super_proto = super_ctor.getObject()->getProperty("prototype");
                }
            } catch(const JavaScriptException&) {
                throw JavaScriptException(Value("SyntaxError: 'super' keyword is unexpected here"),
                                          node->line, node->column);
            }
        }

        if(!super_proto.isObject()) {
            return Value::undefined();
        }

        // Get property name
        std::string prop_name;
        if(node->metadata == "computed") {
            // Need engine to evaluate computed key
            // For now, just get the value directly if it's a literal
            if(node->children[0]->type == ASTNodeType::Literal) {
                prop_name = node->children[0]->value;
            }
        } else {
            prop_name = node->children[0]->value;
        }

        return super_proto.getObject()->getProperty(prop_name);
    }

    // super() call is handled in evaluateCallExpression
    throw JavaScriptException(Value("SyntaxError: 'super' keyword is unexpected here"), node->line,
                              node->column);
}

Value ExpressionEvaluator::evaluateGeneratorFunctionExpression(std::shared_ptr<ASTNode> node,
                                                               std::shared_ptr<Environment> env,
                                                               Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Get parameters (first child should be parameter list)
    auto param_list = node->children[0];
    std::vector<std::string> param_names;
    std::vector<std::tuple<std::string, std::shared_ptr<ASTNode>, bool>> param_info;

    for(const auto& param : param_list->children) {
        if(param->type == ASTNodeType::AssignmentExpression) {
            param_info.emplace_back(param->children[0]->value, param->children[1], false);
            param_names.push_back(param->children[0]->value);
        } else if(param->metadata == "rest") {
            param_info.emplace_back(param->value, nullptr, true);
            param_names.push_back(param->value);
        } else {
            param_info.emplace_back(param->value, nullptr, false);
            param_names.push_back(param->value);
        }
    }

    // Get function body (second child)
    auto body = node->children[1];

    // Get optional function name
    std::string func_name = node->value;

    // Temporarily disable GC to prevent collection during function creation
    auto* factory = engine->getObjectFactory();
    auto* obj_manager = factory->getObjectManager();
    bool was_gc_enabled = obj_manager->isGCEnabled();
    obj_manager->setGCEnabled(false);

    // Create generator function - when called, it returns a GeneratorIterator
    // instead of executing the body directly
    auto* func = factory->createJSFunction(
        [engine, param_info, param_names, body, env](const rift::core::CallContext& call_context,
                                                     const std::vector<Value>& args) -> Value {
            // Generator functions cannot be used as constructors
            if(call_context.type == rift::core::CallType::Constructor) {
                throw JavaScriptException(Value("TypeError: Generator cannot be called with new"));
            }

            // Process arguments with default values
            std::vector<Value> processed_args;
            auto func_env = std::make_shared<Environment>(env);

            for(size_t i = 0; i < param_info.size(); ++i) {
                const auto& [param_name, default_ast, is_rest] = param_info[i];

                if(is_rest) {
                    // Rest parameter: collect remaining args
                    std::vector<Value> rest_args;
                    for(size_t j = i; j < args.size(); ++j) {
                        rest_args.push_back(args[j]);
                    }
                    auto* rest_array =
                        builtins::Array::createArrayObject(engine->getObjectFactory(), rest_args);
                    processed_args.push_back(Value(rest_array));
                } else {
                    Value arg_value;
                    bool use_default = (i >= args.size()) || args[i].isUndefined();

                    if(use_default && default_ast) {
                        arg_value = engine->evaluate(default_ast, func_env);
                    } else if(i < args.size()) {
                        arg_value = args[i];
                    } else {
                        arg_value = Value::undefined();
                    }
                    processed_args.push_back(arg_value);
                }
            }

            // Create and return a GeneratorIterator object
            auto* generator = builtins::GeneratorIterator::create(
                engine->getObjectFactory(), body, env, engine, param_names, processed_args);

            return Value(generator);
        });

    // Set function name if provided
    if(!func_name.empty()) {
        func->setProperty("name", Value(func_name));
    }

    // Set length property (number of parameters)
    func->setProperty("length", Value(static_cast<double>(param_names.size())));

    // Re-enable GC before returning
    obj_manager->setGCEnabled(was_gc_enabled);
    return Value(func);
}

Value ExpressionEvaluator::evaluateYieldExpression(std::shared_ptr<ASTNode> /*node*/,
                                                   std::shared_ptr<Environment> /*env*/,
                                                   Rift* /*engine*/) {
    // PHASE 3: This will be implemented when we add the actual generator execution.
    // For now, yield expressions are parsed but not executed in this code path.
    // The actual yield handling will happen in the generator evaluator.
    throw JavaScriptException(Value("Error: yield expression not yet implemented (Phase 3)"));
}

Value ExpressionEvaluator::evaluateAsyncFunctionExpression(std::shared_ptr<ASTNode> node,
                                                           std::shared_ptr<Environment> env,
                                                           Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Get parameters (first child should be parameter list)
    auto param_list = node->children[0];
    std::vector<std::tuple<std::string, std::shared_ptr<ASTNode>, bool>> param_info;
    size_t param_count = 0;

    for(const auto& param : param_list->children) {
        if(param->type == ASTNodeType::AssignmentExpression) {
            param_info.emplace_back(param->children[0]->value, param->children[1], false);
        } else if(param->metadata == "rest") {
            param_info.emplace_back(param->value, nullptr, true);
        } else {
            param_info.emplace_back(param->value, nullptr, false);
        }
        param_count++;
    }

    // Get function body (second child)
    auto body = node->children[1];

    // Get optional function name
    std::string func_name = node->value;

    // Temporarily disable GC during function creation
    auto* factory = engine->getObjectFactory();
    auto* obj_manager = factory->getObjectManager();
    bool was_gc_enabled = obj_manager->isGCEnabled();
    obj_manager->setGCEnabled(false);

    // Create async function - when called, returns a Promise
    auto* func = factory->createJSFunction(
        [engine, param_info, body, env](const rift::core::CallContext& call_context,
                                        const std::vector<Value>& args) -> Value {
            // Create a Promise object
            auto* factory = engine->getObjectFactory();
            auto* promise_obj = builtins::Promise::createPromiseObject(factory);
            memory::GCProtector protect(promise_obj, factory->getObjectManager());

            // Create new environment for function execution
            auto func_env = std::make_shared<Environment>(env);

            // Bind 'this' to the function environment
            func_env->define("this", call_context.thisValue);

            // Bind parameters to arguments
            for(size_t i = 0; i < param_info.size(); ++i) {
                const auto& [param_name, default_ast, is_rest] = param_info[i];

                if(is_rest) {
                    std::vector<Value> rest_args;
                    for(size_t j = i; j < args.size(); ++j) {
                        rest_args.push_back(args[j]);
                    }
                    auto* rest_array =
                        builtins::Array::createArrayObject(engine->getObjectFactory(), rest_args);
                    func_env->define(param_name, Value(rest_array));
                } else {
                    Value arg_value;
                    bool use_default = (i >= args.size()) || args[i].isUndefined();

                    if(use_default && default_ast) {
                        arg_value = engine->evaluate(default_ast, func_env);
                    } else if(i < args.size()) {
                        arg_value = args[i];
                    } else {
                        arg_value = Value::undefined();
                    }
                    func_env->define(param_name, arg_value);
                }
            }

            // Create 'arguments' object
            auto* args_factory = engine->getObjectFactory();
            auto* arguments_obj = args_factory->createJSObject();
            for(size_t i = 0; i < args.size(); ++i) {
                arguments_obj->setProperty(std::to_string(i), args[i]);
            }
            arguments_obj->setProperty("length", Value(static_cast<double>(args.size())));
            func_env->define("arguments", Value(arguments_obj));

            // Execute via AsyncExecutor for await support
            AsyncExecutor::executeAsync(body, func_env, engine, promise_obj);

            return Value(promise_obj);
        });

    // Set function name if provided
    if(!func_name.empty()) {
        func->setProperty("name", Value(func_name));
    }

    // Set length property
    func->setProperty("length", Value(static_cast<double>(param_count)));

    // Re-enable GC before returning
    obj_manager->setGCEnabled(was_gc_enabled);
    return Value(func);
}

Value ExpressionEvaluator::evaluateAwaitExpression(std::shared_ptr<ASTNode> node,
                                                   std::shared_ptr<Environment> env, Rift* engine) {
    // Extract await ID from metadata if assigned by AsyncExecutor::assignAwaitIds()
    int await_id = -1;
    size_t pos = node->metadata.find("awaitId:");
    if(pos != std::string::npos) {
        size_t start = pos + 8;
        size_t end = node->metadata.find(',', start);
        if(end == std::string::npos) {
            end = node->metadata.length();
        }
        try {
            await_id = std::stoi(node->metadata.substr(start, end - start));
        } catch(const std::invalid_argument&) {
            // Keep -1
        } catch(const std::out_of_range&) {
            // Keep -1
        }
    }

    // Check if we're inside an AsyncExecutor and should return the sent value
    // (resumption path for await nested in complex expressions)
    auto* ctx = AsyncExecutor::getActiveContext();
    if(ctx != nullptr && ctx->isResuming && ctx->currentAwaitId == await_id) {
        ctx->isResuming = false;
        if(ctx->throwOnResume) {
            ctx->throwOnResume = false;
            throw JavaScriptException(ctx->sentValue);
        }
        return ctx->sentValue;
    }

    // Not resuming - evaluate the operand and throw AwaitException to suspend
    Value awaited_value = Value::undefined();
    if(!node->children.empty()) {
        awaited_value = engine->evaluate(node->children[0], env);
    }

    throw AwaitException(awaited_value, await_id, -1);
}

}  // namespace rift::core
