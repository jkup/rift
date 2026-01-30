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
#include "rift/builtins/promise/promise.h"
#include "rift/core/engine/async_executor.h"
#include "rift/core/engine/engine.h"
#include "rift/core/engine/javascript_exception.h"
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
static std::vector<Value> extractArrayElements(const Value& value) {
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
static void applyPatternBinding(std::shared_ptr<ASTNode> pattern, const Value& value,
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
        std::vector<Value> elements = extractArrayElements(value);

        size_t elem_idx = 0;
        for(size_t i = 0; i < pattern->children.size(); ++i) {
            auto& elem_pattern = pattern->children[i];

            if(!elem_pattern) {
                // Hole: [x, , z] - skip this element
                elem_idx++;
                continue;
            }

            if(elem_pattern->type == ASTNodeType::RestElement) {
                // Rest element: collect remaining elements into array
                std::vector<Value> rest_elements;
                while(elem_idx < elements.size()) {
                    rest_elements.push_back(elements[elem_idx++]);
                }
                auto* rest_array =
                    builtins::Array::createArrayObject(engine->getObjectFactory(), rest_elements);
                env->define(elem_pattern->children[0]->value, Value(rest_array), var_type);

            } else if(elem_pattern->type == ASTNodeType::AssignmentPattern) {
                // Element with default: [x = 10]
                Value elem_value =
                    elem_idx < elements.size() ? elements[elem_idx] : Value::undefined();

                if(elem_value.isUndefined() && elem_pattern->children.size() > 1) {
                    // Use default value
                    elem_value = engine->evaluate(elem_pattern->children[1], env);
                }

                applyPatternBinding(elem_pattern->children[0], elem_value, env, engine, var_type);
                elem_idx++;

            } else {
                // Nested pattern or identifier
                Value elem_value =
                    elem_idx < elements.size() ? elements[elem_idx] : Value::undefined();
                applyPatternBinding(elem_pattern, elem_value, env, engine, var_type);
                elem_idx++;
            }
        }

    } else if(pattern->type == ASTNodeType::ObjectPattern) {
        // Object destructuring: {a, b: renamed, ...rest}
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

    // Get class name
    std::string class_name = node->value;

    // Get superclass (may be nullptr)
    auto superclass_node = node->children[0];
    // Get class body
    auto class_body = node->children[1];

    // Evaluate superclass if present
    rift::runtime::JSFunction* parent_constructor = nullptr;
    rift::runtime::JSObject* parent_prototype = nullptr;

    if(superclass_node) {
        Value super_value = engine->evaluate(superclass_node, env);
        if(!super_value.isFunction()) {
            throw JavaScriptException(
                Value("TypeError: Class extends value is not a constructor or null"), node->line,
                node->column);
        }
        parent_constructor = dynamic_cast<rift::runtime::JSFunction*>(super_value.getObject());
        if(!parent_constructor) {
            throw JavaScriptException(Value("TypeError: Class extends value is not a constructor"),
                                      node->line, node->column);
        }
        // Get parent's prototype
        Value proto_value = parent_constructor->getProperty("prototype");
        if(proto_value.isObject()) {
            parent_prototype = proto_value.getObject();
        }
    }

    // Create prototype object for this class
    auto* factory = engine->getObjectFactory();
    auto* obj_manager = factory->getObjectManager();
    bool was_gc_enabled = obj_manager->isGCEnabled();
    obj_manager->setGCEnabled(false);

    try {
        // Create prototype with parent prototype as its prototype
        auto* class_prototype = factory->createJSObject(parent_prototype);

        // Process class body - find constructor and methods
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

        // Create class-scoped environment so class name is visible inside methods
        auto class_env = std::make_shared<Environment>(env);

        // Create constructor function
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
                // Classes must be called with 'new'
                if(call_context.type != rift::core::CallType::Constructor) {
                    throw JavaScriptException(
                        Value("TypeError: Class constructor cannot be invoked without 'new'"));
                }

                // Create function environment
                auto func_env = std::make_shared<Environment>(class_env);

                // Bind 'this' to the new object
                func_env->define("this", call_context.thisValue);

                // Store references for super support
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

                // Execute constructor body if present
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

        // Bind class name in class-scoped environment (visible to methods)
        class_env->define(class_name, Value(constructor));

        // Add instance methods to prototype
        for(const auto& method : instance_methods) {
            std::string method_name = method->value;
            bool is_computed = (method->metadata.find("computed") != std::string::npos);
            bool is_generator = (method->type == ASTNodeType::GeneratorMethod);
            bool is_async = (method->type == ASTNodeType::AsyncMethod);

            // Handle computed property names
            if(is_computed && method->children.size() > 2) {
                Value key_value = engine->evaluate(method->children[2], class_env);
                method_name = key_value.toString();
            }

            // Create method function
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

            rift::runtime::JSFunction* method_func = nullptr;
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

                        // Bind parameters
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

                        // Execute method body
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

            rift::runtime::JSFunction* method_func = nullptr;
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
                method_func =
                    factory->createJSFunction([engine, method_param_info, method_body, class_env](
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

                        // Bind parameters
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

        // Define class in outer environment (declarations are visible outside)
        env->define(class_name, Value(constructor));

        obj_manager->setGCEnabled(was_gc_enabled);
        return Value(constructor);

    } catch(...) {
        obj_manager->setGCEnabled(was_gc_enabled);
        throw;
    }
}

}  // namespace rift::core
