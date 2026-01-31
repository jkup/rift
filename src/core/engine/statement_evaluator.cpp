/**
 * Statement Evaluator - Core Implementation
 *
 * This file contains the core statement evaluator functionality including:
 * - ExceptionGuard RAII class
 * - Main dispatcher (evaluate)
 * - Block and expression statements
 * - Variable declarations (var, let, const)
 * - Function declarations
 *
 * Control flow statements are in statement_evaluator_control_flow.cpp
 * Exception handling statements are in statement_evaluator_exceptions.cpp
 */

#include "rift/core/engine/statement_evaluator.h"

#include <unordered_set>

#include "rift/builtins/array/array.h"
#include "rift/builtins/generator/generator_iterator.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/builtins/promise/promise.h"
#include "rift/core/engine/async_executor.h"
#include "rift/core/engine/builtin_manager.h"
#include "rift/core/engine/class_builder.h"
#include "rift/core/engine/engine.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/memory/gc_disabler.h"
#include "rift/memory/gc_protector.h"
#include "rift/runtime/values/object.h"

namespace rift::core {

// ExceptionGuard implementation
ExceptionGuard::ExceptionGuard(Rift* engine) : engine_(engine) {
    if(engine_) {
        engine_->enterExceptionHandling();
    }
}

ExceptionGuard::~ExceptionGuard() {
    if(engine_) {
        engine_->exitExceptionHandling();
    }
}

// Main dispatcher
Value StatementEvaluator::evaluate(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                                   Rift* engine) {
    if(!node) {
        return Value::undefined();
    }

    switch(node->type) {
        case ASTNodeType::Program:
            return evaluateBlockStatement(node, env, engine);
        case ASTNodeType::BlockStatement:
            return evaluateBlockStatement(node, env, engine);
        case ASTNodeType::ExpressionStatement:
            return evaluateExpressionStatement(node, env, engine);
        case ASTNodeType::VariableDeclaration:
            return evaluateVariableDeclaration(node, env, engine);
        case ASTNodeType::LetDeclaration:
            return evaluateLetDeclaration(node, env, engine);
        case ASTNodeType::ConstDeclaration:
            return evaluateConstDeclaration(node, env, engine);
        case ASTNodeType::IfStatement:
            return evaluateIfStatement(node, env, engine);
        case ASTNodeType::WhileStatement:
            return evaluateWhileStatement(node, env, engine);
        case ASTNodeType::DoWhileStatement:
            return evaluateDoWhileStatement(node, env, engine);
        case ASTNodeType::ForStatement:
            return evaluateForStatement(node, env, engine);
        case ASTNodeType::ForInStatement:
            return evaluateForInStatement(node, env, engine);
        case ASTNodeType::ForOfStatement:
            return evaluateForOfStatement(node, env, engine);
        case ASTNodeType::ForAwaitOfStatement:
            return evaluateForAwaitOfStatement(node, env, engine);
        case ASTNodeType::SwitchStatement:
            return evaluateSwitchStatement(node, env, engine);
        case ASTNodeType::BreakStatement:
            return evaluateBreakStatement(node, env, engine);
        case ASTNodeType::ContinueStatement:
            // Signal a continue to loop evaluators
            throw ContinueException();
        case ASTNodeType::ReturnStatement:
            return evaluateReturnStatement(node, env, engine);
        case ASTNodeType::ThrowStatement:
            return evaluateThrowStatement(node, env, engine);
        case ASTNodeType::TryStatement:
            return evaluateTryStatement(node, env, engine);
        case ASTNodeType::CatchClause:
            // CatchClause is not evaluated directly, only through try-catch
            return Value::undefined();
        case ASTNodeType::FinallyClause:
            // FinallyClause is not evaluated directly, only through try-catch
            return Value::undefined();
        case ASTNodeType::FunctionDeclaration:
            return evaluateFunctionDeclaration(node, env, engine);
        case ASTNodeType::GeneratorFunctionDeclaration:
            return evaluateGeneratorFunctionDeclaration(node, env, engine);
        case ASTNodeType::AsyncFunctionDeclaration:
            return evaluateAsyncFunctionDeclaration(node, env, engine);
        case ASTNodeType::ClassDeclaration:
            return evaluateClassDeclaration(node, env, engine);
        default:
            return Value::undefined();
    }
}

// Helper to check if a statement is a "use strict" directive
static bool isUseStrictDirective(const std::shared_ptr<ASTNode>& stmt) {
    if(stmt->type == ASTNodeType::ExpressionStatement && !stmt->children.empty()) {
        const auto& expr = stmt->children[0];
        if(expr->type == ASTNodeType::Literal && expr->metadata == "string" &&
           expr->value == "use strict") {
            return true;
        }
    }
    return false;
}

// Helper to check if a statement is any string directive
static bool isStringDirective(const std::shared_ptr<ASTNode>& stmt) {
    if(stmt->type == ASTNodeType::ExpressionStatement && !stmt->children.empty()) {
        const auto& expr = stmt->children[0];
        if(expr->type == ASTNodeType::Literal && expr->metadata == "string") {
            return true;
        }
    }
    return false;
}

// Block and expression statements
Value StatementEvaluator::evaluateBlockStatement(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine) {
    // Check if we need to create a block scope
    bool needsBlockScope = false;
    for(auto& child : node->children) {
        if(child->type == ASTNodeType::LetDeclaration ||
           child->type == ASTNodeType::ConstDeclaration) {
            needsBlockScope = true;
            break;
        }
    }

    std::shared_ptr<Environment> blockEnv = env;
    if(needsBlockScope) {
        blockEnv = env->createChild(true);  // Create block scope
    }

    // Check for "use strict" directive at the beginning of the block
    // Directives must appear before any non-directive statements
    for(const auto& child : node->children) {
        if(isUseStrictDirective(child)) {
            blockEnv->setStrictMode(true);
        } else if(isStringDirective(child)) {
            // Other string directive - skip but continue checking
            continue;
        } else {
            // Non-directive statement found - stop checking for directives
            break;
        }
    }

    Value result = Value::undefined();
    for(auto& child : node->children) {
        result = engine->evaluate(child, blockEnv);
    }
    return result;
}

Value StatementEvaluator::evaluateExpressionStatement(std::shared_ptr<ASTNode> node,
                                                      std::shared_ptr<Environment> env,
                                                      Rift* engine) {
    if(!node->children.empty()) {
        return engine->evaluate(node->children[0], env);
    }
    return Value::undefined();
}

// Helper to extract array elements from a value
std::vector<Value> StatementEvaluator::extractArrayElements(const Value& value) {
    std::vector<Value> elements;

    if(value.isObject()) {
        auto* obj = value.getObject();
        Value length_val = obj->getProperty("length");
        if(length_val.isNumber()) {
            size_t length = static_cast<size_t>(length_val.getNumber());
            for(size_t i = 0; i < length; ++i) {
                elements.push_back(obj->getProperty(std::to_string(i)));
            }
        }
    } else if(value.isString()) {
        // Strings are iterable - each character becomes an element
        std::string str = value.getString();
        for(char c : str) {
            elements.push_back(Value(std::string(1, c)));
        }
    }

    return elements;
}

// Helper to apply destructuring pattern binding
void StatementEvaluator::applyPatternBinding(std::shared_ptr<ASTNode> pattern, const Value& value,
                                             std::shared_ptr<Environment> env, Rift* engine,
                                             VariableType var_type) {
    if(!pattern) {
        return;
    }

    if(pattern->type == ASTNodeType::Identifier) {
        // Simple identifier binding
        env->define(pattern->value, value, var_type);

    } else if(pattern->type == ASTNodeType::ArrayPattern) {
        // Array destructuring: [x, y, ...rest]
        // Per ECMAScript spec, array destructuring uses the iterator protocol

        // TypeError for null/undefined
        if(value.isNull() || value.isUndefined()) {
            auto* factory = engine->getObjectFactory();
            auto* error_obj = factory->createJSObject(BuiltinManager::getTypeErrorPrototype());
            memory::GCProtector protect(error_obj, factory->getObjectManager());
            error_obj->setProperty("name", Value("TypeError"));
            error_obj->setProperty("message",
                Value(value.toString() +
                      " is not iterable (cannot read property Symbol(Symbol.iterator))"));
            throw JavaScriptException(Value(error_obj));
        }

        // Try to get iterator via Symbol.iterator protocol
        bool use_iterator = false;
        JSObject* iterator_obj = nullptr;
        bool iterator_done = false;

        if(value.isObject() || value.isFunction()) {
            auto* obj = value.getObject();
            if(obj) {
                std::string iterator_key =
                    EvaluationUtils::symbolToPropertyKey(builtins::Symbol::getIteratorId());
                Value iterator_method = obj->getProperty(iterator_key);
                if(iterator_method.isFunction()) {
                    auto* iter_func = dynamic_cast<rift::runtime::JSFunction*>(
                        iterator_method.getObject());
                    if(iter_func) {
                        CallContext ctx(CallType::Function, value);
                        Value iterator_val = iter_func->call(ctx, {});
                        if(iterator_val.isObject()) {
                            iterator_obj = iterator_val.getObject();
                            use_iterator = true;
                        }
                    }
                }
            }
        }

        // Lambda to step the iterator lazily (one element at a time)
        auto iteratorNext = [&]() -> Value {
            if(iterator_done) {
                return Value::undefined();
            }
            Value next_method = iterator_obj->getProperty("next");
            if(!next_method.isFunction()) {
                iterator_done = true;
                return Value::undefined();
            }

            auto* next_func =
                dynamic_cast<rift::runtime::JSFunction*>(next_method.getObject());
            if(!next_func) {
                iterator_done = true;
                return Value::undefined();
            }

            CallContext next_ctx(CallType::Function, Value(iterator_obj));
            Value result = next_func->call(next_ctx, {});

            if(!result.isObject()) {
                iterator_done = true;
                return Value::undefined();
            }

            auto* result_obj = result.getObject();
            Value done = result_obj->getProperty("done");
            if(done.toBool()) {
                iterator_done = true;
                return Value::undefined();
            }

            return result_obj->getProperty("value");
        };

        // For index-based fallback (strings, objects without Symbol.iterator)
        std::vector<Value> elements;
        size_t elem_idx = 0;
        if(!use_iterator) {
            elements = extractArrayElements(value);
        }

        for(size_t i = 0; i < pattern->children.size(); ++i) {
            auto& elem_pattern = pattern->children[i];

            if(!elem_pattern) {
                // Hole: [x, , z] - advance iterator/index, discard value
                if(use_iterator) {
                    iteratorNext();
                } else {
                    elem_idx++;
                }
                continue;
            }

            if(elem_pattern->type == ASTNodeType::RestElement) {
                // Rest element: collect remaining elements into array
                std::vector<Value> rest_elements;
                if(use_iterator) {
                    while(!iterator_done) {
                        Value val = iteratorNext();
                        if(!iterator_done) {
                            rest_elements.push_back(val);
                        }
                    }
                } else {
                    while(elem_idx < elements.size()) {
                        rest_elements.push_back(elements[elem_idx++]);
                    }
                }
                auto* rest_array =
                    builtins::Array::createArrayObject(engine->getObjectFactory(), rest_elements);
                applyPatternBinding(elem_pattern->children[0], Value(rest_array), env, engine,
                                    var_type);

            } else if(elem_pattern->type == ASTNodeType::AssignmentPattern) {
                // Element with default: [x = 10]
                Value elem_value;
                if(use_iterator) {
                    elem_value = iteratorNext();
                } else {
                    elem_value =
                        elem_idx < elements.size() ? elements[elem_idx] : Value::undefined();
                    elem_idx++;
                }

                if(elem_value.isUndefined() && elem_pattern->children.size() > 1) {
                    elem_value = engine->evaluate(elem_pattern->children[1], env);
                }

                applyPatternBinding(elem_pattern->children[0], elem_value, env, engine, var_type);

            } else {
                // Nested pattern or identifier
                Value elem_value;
                if(use_iterator) {
                    elem_value = iteratorNext();
                } else {
                    elem_value =
                        elem_idx < elements.size() ? elements[elem_idx] : Value::undefined();
                    elem_idx++;
                }
                applyPatternBinding(elem_pattern, elem_value, env, engine, var_type);
            }
        }

    } else if(pattern->type == ASTNodeType::ObjectPattern) {
        // Object destructuring: {a, b: renamed, ...rest}

        // TypeError for null/undefined
        if(value.isNull() || value.isUndefined()) {
            auto* factory = engine->getObjectFactory();
            auto* error_obj = factory->createJSObject(BuiltinManager::getTypeErrorPrototype());
            memory::GCProtector protect(error_obj, factory->getObjectManager());
            error_obj->setProperty("name", Value("TypeError"));
            error_obj->setProperty("message",
                Value("Cannot destructure '" + value.toString() + "' as it is " +
                      value.toString() + "."));
            throw JavaScriptException(Value(error_obj));
        }

        JSObject* obj = nullptr;
        if(value.isObject()) {
            obj = value.getObject();
        }

        std::unordered_set<std::string> consumed_keys;

        // Object pattern stores key-value pairs: key, value, key, value, ...
        for(size_t i = 0; i < pattern->children.size(); i += 2) {
            auto& key_node = pattern->children[i];

            if(key_node->type == ASTNodeType::RestElement) {
                // Rest property: {...rest} - collect non-consumed properties
                auto* rest_obj = engine->getObjectFactory()->createJSObject();
                if(obj) {
                    auto all_keys = obj->getOwnPropertyNames();
                    for(const auto& key : all_keys) {
                        if(consumed_keys.find(key) == consumed_keys.end()) {
                            rest_obj->setProperty(key, obj->getProperty(key));
                        }
                    }
                }
                env->define(key_node->children[0]->value, Value(rest_obj), var_type);
                break;  // Rest must be last
            }

            // Regular property
            std::string key = key_node->value;
            consumed_keys.insert(key);

            Value prop_value = obj ? obj->getProperty(key) : Value::undefined();

            // Get the value pattern (might be identifier, nested pattern, or assignment pattern)
            auto& value_pattern = pattern->children[i + 1];
            applyPatternBinding(value_pattern, prop_value, env, engine, var_type);
        }

    } else if(pattern->type == ASTNodeType::AssignmentPattern) {
        // Pattern with default value
        if(value.isUndefined() && pattern->children.size() > 1) {
            Value default_val = engine->evaluate(pattern->children[1], env);
            applyPatternBinding(pattern->children[0], default_val, env, engine, var_type);
        } else {
            applyPatternBinding(pattern->children[0], value, env, engine, var_type);
        }
    }
}

// Variable declarations
Value StatementEvaluator::evaluateVariableDeclaration(std::shared_ptr<ASTNode> node,
                                                      std::shared_ptr<Environment> env,
                                                      Rift* engine) {
    // Check for destructuring declaration (marked with metadata)
    if(node->metadata == "destructuring" && node->children.size() >= 2) {
        auto& pattern = node->children[0];
        Value value = engine->evaluate(node->children[1], env);
        applyPatternBinding(pattern, value, env, engine, VariableType::Var);
        return value;
    }

    // Simple identifier declaration (existing behavior)
    std::string varName = node->value;

    Value value = Value::undefined();
    if(node->children.size() > 0) {
        value = engine->evaluate(node->children[0], env);
    }

    env->define(varName, value, VariableType::Var);
    return value;
}

Value StatementEvaluator::evaluateLetDeclaration(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine) {
    // Check for destructuring declaration
    if(node->metadata == "destructuring" && node->children.size() >= 2) {
        auto& pattern = node->children[0];
        Value value = engine->evaluate(node->children[1], env);
        applyPatternBinding(pattern, value, env, engine, VariableType::Let);
        return value;
    }

    // Simple identifier declaration
    std::string varName = node->value;

    Value value = Value::undefined();
    if(node->children.size() > 0) {
        value = engine->evaluate(node->children[0], env);
    }

    env->define(varName, value, VariableType::Let);
    return value;
}

Value StatementEvaluator::evaluateConstDeclaration(std::shared_ptr<ASTNode> node,
                                                   std::shared_ptr<Environment> env, Rift* engine) {
    // Check for destructuring declaration
    if(node->metadata == "destructuring" && node->children.size() >= 2) {
        auto& pattern = node->children[0];
        Value value = engine->evaluate(node->children[1], env);
        applyPatternBinding(pattern, value, env, engine, VariableType::Const);
        return value;
    }

    // Simple identifier declaration
    std::string varName = node->value;

    if(node->children.size() == 0) {
        throw std::runtime_error("Missing initializer in const declaration");
    }

    Value value = engine->evaluate(node->children[0], env);
    env->define(varName, value, VariableType::Const);
    return value;
}

// Function declaration
Value StatementEvaluator::evaluateFunctionDeclaration(std::shared_ptr<ASTNode> node,
                                                      std::shared_ptr<Environment> env,
                                                      Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Get function name
    std::string functionName = node->value;

    // Get parameters (first child should be parameter list)
    // Each parameter can be: Identifier, AssignmentExpression (default), or Identifier with "rest"
    // metadata
    auto paramList = node->children[0];
    // Store tuples of (param_name, default_value_ast, is_rest)
    std::vector<std::tuple<std::string, std::shared_ptr<ASTNode>, bool>> param_info;
    for(const auto& param : paramList->children) {
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
    bool functionIsStrict = false;
    if(body->type == ASTNodeType::BlockStatement) {
        for(const auto& stmt : body->children) {
            if(isUseStrictDirective(stmt)) {
                functionIsStrict = true;
            } else if(isStringDirective(stmt)) {
                continue;
            } else {
                break;
            }
        }
    }

    // Create function object using GC-managed creation
    auto func = engine->getObjectFactory()->createJSFunction(
        [engine, param_info, body, env, functionIsStrict](
            const rift::core::CallContext& callContext, const std::vector<Value>& args) -> Value {
            // Create new environment for function execution
            auto funcEnv = std::make_shared<Environment>(env);

            // Set strict mode if the function has "use strict" directive
            if(functionIsStrict) {
                funcEnv->setStrictMode(true);
            }

            // Bind 'this' to the function environment
            funcEnv->define("this", callContext.thisValue);

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
                    funcEnv->define(param_name, Value(rest_array));
                } else {
                    Value arg_value;

                    // Use default if: argument not provided OR argument is undefined
                    bool use_default = (i >= args.size()) || args[i].isUndefined();

                    if(use_default && default_ast) {
                        // Evaluate default value in the function's environment
                        // (so earlier params can be referenced in later defaults)
                        arg_value = engine->evaluate(default_ast, funcEnv);
                    } else if(i < args.size()) {
                        arg_value = args[i];
                    } else {
                        arg_value = Value::undefined();
                    }
                    funcEnv->define(param_name, arg_value);
                }
            }

            // Create 'arguments' object (array-like object with all passed arguments)
            auto* argsFactory = engine->getObjectFactory();
            auto* argumentsObj = argsFactory->createJSObject();
            for(size_t i = 0; i < args.size(); ++i) {
                argumentsObj->setProperty(std::to_string(i), args[i]);
            }
            argumentsObj->setProperty("length", Value(static_cast<double>(args.size())));
            funcEnv->define("arguments", Value(argumentsObj));

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

    // Define function in current environment
    env->define(functionName, Value(func));

    return Value(func);
}

// Generator function declaration
Value StatementEvaluator::evaluateGeneratorFunctionDeclaration(std::shared_ptr<ASTNode> node,
                                                               std::shared_ptr<Environment> env,
                                                               Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Get generator function name
    std::string functionName = node->value;

    // Get parameters (first child should be parameter list)
    auto paramList = node->children[0];
    std::vector<std::string> param_names;
    std::vector<std::tuple<std::string, std::shared_ptr<ASTNode>, bool>> param_info;

    for(const auto& param : paramList->children) {
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

    // Create generator function - when called, it returns a GeneratorIterator
    auto* func = engine->getObjectFactory()->createJSFunction(
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

    // Set function name
    func->setProperty("name", Value(functionName));

    // Set length property (number of parameters)
    func->setProperty("length", Value(static_cast<double>(param_names.size())));

    // Define function in current environment
    env->define(functionName, Value(func));

    return Value(func);
}

// Async function declaration
Value StatementEvaluator::evaluateAsyncFunctionDeclaration(std::shared_ptr<ASTNode> node,
                                                           std::shared_ptr<Environment> env,
                                                           Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Get function name
    std::string functionName = node->value;

    // Get parameters (first child should be parameter list)
    auto paramList = node->children[0];
    std::vector<std::tuple<std::string, std::shared_ptr<ASTNode>, bool>> param_info;
    for(const auto& param : paramList->children) {
        if(param->type == ASTNodeType::AssignmentExpression) {
            param_info.emplace_back(param->children[0]->value, param->children[1], false);
        } else if(param->metadata == "rest") {
            param_info.emplace_back(param->value, nullptr, true);
        } else {
            param_info.emplace_back(param->value, nullptr, false);
        }
    }

    // Get function body (second child)
    auto body = node->children[1];

    // Check if function body contains "use strict" directive
    bool functionIsStrict = false;
    if(body->type == ASTNodeType::BlockStatement) {
        for(const auto& stmt : body->children) {
            if(isUseStrictDirective(stmt)) {
                functionIsStrict = true;
            } else if(isStringDirective(stmt)) {
                continue;
            } else {
                break;
            }
        }
    }

    // Create async function - when called, it returns a Promise
    auto* func = engine->getObjectFactory()->createJSFunction(
        [engine, param_info, body, env, functionIsStrict](
            const rift::core::CallContext& callContext, const std::vector<Value>& args) -> Value {
            // Create a Promise object
            auto* factory = engine->getObjectFactory();
            auto* promise_obj = builtins::Promise::createPromiseObject(factory);
            memory::GCProtector protect(promise_obj, factory->getObjectManager());

            // Create new environment for function execution
            auto funcEnv = std::make_shared<Environment>(env);

            if(functionIsStrict) {
                funcEnv->setStrictMode(true);
            }

            // Bind 'this' to the function environment
            funcEnv->define("this", callContext.thisValue);

            // Bind parameters to arguments (with default value and rest support)
            for(size_t i = 0; i < param_info.size(); ++i) {
                const auto& [param_name, default_ast, is_rest] = param_info[i];

                if(is_rest) {
                    std::vector<Value> rest_args;
                    for(size_t j = i; j < args.size(); ++j) {
                        rest_args.push_back(args[j]);
                    }
                    auto* rest_array =
                        builtins::Array::createArrayObject(engine->getObjectFactory(), rest_args);
                    funcEnv->define(param_name, Value(rest_array));
                } else {
                    Value arg_value;
                    bool use_default = (i >= args.size()) || args[i].isUndefined();

                    if(use_default && default_ast) {
                        arg_value = engine->evaluate(default_ast, funcEnv);
                    } else if(i < args.size()) {
                        arg_value = args[i];
                    } else {
                        arg_value = Value::undefined();
                    }
                    funcEnv->define(param_name, arg_value);
                }
            }

            // Create 'arguments' object
            auto* argsFactory = engine->getObjectFactory();
            auto* argumentsObj = argsFactory->createJSObject();
            for(size_t i = 0; i < args.size(); ++i) {
                argumentsObj->setProperty(std::to_string(i), args[i]);
            }
            argumentsObj->setProperty("length", Value(static_cast<double>(args.size())));
            funcEnv->define("arguments", Value(argumentsObj));

            // Execute via AsyncExecutor for await support
            AsyncExecutor::executeAsync(body, funcEnv, engine, promise_obj);

            return Value(promise_obj);
        });

    // Set function name and length
    func->setProperty("name", Value(functionName));
    func->setProperty("length", Value(static_cast<double>(param_info.size())));

    // Define function in current environment
    env->define(functionName, Value(func));

    return Value(func);
}

// Class declaration evaluation
Value StatementEvaluator::evaluateClassDeclaration(std::shared_ptr<ASTNode> node,
                                                   std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    std::string class_name = node->value;
    auto superclass_node = node->children[0];
    auto class_body = node->children[1];

    auto* constructor =
        ClassBuilder::buildClass(class_name, superclass_node, class_body, env, engine, true);

    // Define class in outer environment (declarations are visible outside)
    env->define(class_name, Value(constructor));

    return Value(constructor);
}

}  // namespace rift::core
