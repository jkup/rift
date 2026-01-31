/**
 * ClassBuilder - Shared class construction logic
 *
 * Extracts the common ~500-line class-building implementation used by both
 * evaluateClassDeclaration (StatementEvaluator) and evaluateClassExpression
 * (ExpressionEvaluator) into a single reusable utility.
 */

#include "rift/core/engine/class_builder.h"

#include "rift/builtins/array/array.h"
#include "rift/builtins/generator/generator_iterator.h"
#include "rift/builtins/promise/promise.h"
#include "rift/core/engine/async_executor.h"
#include "rift/core/engine/engine.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/memory/gc_disabler.h"
#include "rift/memory/gc_protector.h"
#include "rift/runtime/values/object.h"

namespace rift::core {

ClassBuilder::ClassifiedMethods ClassBuilder::classifyMethods(
    const std::shared_ptr<ASTNode>& class_body) {
    ClassifiedMethods result;
    result.constructor_method = nullptr;

    for(const auto& method : class_body->children) {
        if(method->type != ASTNodeType::MethodDefinition &&
           method->type != ASTNodeType::GeneratorMethod &&
           method->type != ASTNodeType::AsyncMethod) {
            continue;
        }

        bool is_static = (method->metadata.find("static") != std::string::npos);
        bool is_constructor = (method->value == "constructor");

        if(is_constructor && !is_static) {
            result.constructor_method = method;
        } else if(is_static) {
            result.static_methods.push_back(method);
        } else {
            result.instance_methods.push_back(method);
        }
    }

    return result;
}

ClassBuilder::ParamInfo ClassBuilder::extractParamInfo(
    const std::shared_ptr<ASTNode>& params_node) {
    ParamInfo info;
    for(const auto& param : params_node->children) {
        if(param->type == ASTNodeType::AssignmentExpression) {
            info.emplace_back(param->children[0]->value, param->children[1], false);
        } else if(param->metadata == "rest") {
            info.emplace_back(param->value, nullptr, true);
        } else {
            info.emplace_back(param->value, nullptr, false);
        }
    }
    return info;
}

void ClassBuilder::addMethods(const std::vector<std::shared_ptr<ASTNode>>& methods,
                              JSObject* target, std::shared_ptr<Environment> class_env,
                              JSObject* class_prototype, JSObject* parent_prototype, Rift* engine,
                              bool is_instance) {
    auto* factory = engine->getObjectFactory();

    for(const auto& method : methods) {
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

        ParamInfo method_param_info = extractParamInfo(method_params);

        // param_names is only needed for generator methods
        std::vector<std::string> param_names;
        if(is_generator) {
            for(const auto& [name, default_ast, is_rest] : method_param_info) {
                param_names.push_back(name);
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
        } else if(is_async && is_instance) {
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
                    arguments_obj->setProperty("length", Value(static_cast<double>(args.size())));
                    func_env->define("arguments", Value(arguments_obj));

                    AsyncExecutor::executeAsync(method_body, func_env, engine, promise_obj);
                    return Value(promise_obj);
                });
        } else if(is_async && !is_instance) {
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
                    arguments_obj->setProperty("length", Value(static_cast<double>(args.size())));
                    func_env->define("arguments", Value(arguments_obj));

                    AsyncExecutor::executeAsync(method_body, func_env, engine, promise_obj);
                    return Value(promise_obj);
                });
        } else if(is_instance) {
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
        } else {
            // Static regular method
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

        if(is_instance) {
            method_func->setHomeObject(class_prototype);
        }
        target->setProperty(method_name, Value(method_func));
    }
}

JSFunction* ClassBuilder::buildClass(const std::string& class_name,
                                     std::shared_ptr<ASTNode> superclass_node,
                                     std::shared_ptr<ASTNode> class_body,
                                     std::shared_ptr<Environment> env, Rift* engine,
                                     bool is_declaration) {
    // Evaluate superclass if present
    rift::runtime::JSFunction* parent_constructor = nullptr;
    rift::runtime::JSObject* parent_prototype = nullptr;

    if(superclass_node) {
        Value super_value = engine->evaluate(superclass_node, env);
        if(!super_value.isFunction()) {
            throw JavaScriptException(
                Value("TypeError: Class extends value is not a constructor or null"));
        }
        parent_constructor = dynamic_cast<rift::runtime::JSFunction*>(super_value.getObject());
        if(!parent_constructor) {
            throw JavaScriptException(Value("TypeError: Class extends value is not a constructor"));
        }
        Value proto_value = parent_constructor->getProperty("prototype");
        if(proto_value.isObject()) {
            parent_prototype = proto_value.getObject();
        }
    }

    // Create prototype object for this class
    auto* factory = engine->getObjectFactory();
    memory::GCDisabler disabler(factory->getObjectManager()->getGC());

    // Create prototype with parent prototype as its prototype
    auto* class_prototype = factory->createJSObject(parent_prototype);

    // Classify methods
    auto classified = classifyMethods(class_body);

    // Create class-scoped environment so class name is visible inside methods
    auto class_env = std::make_shared<Environment>(env);

    // Extract constructor parameters and body
    ParamInfo ctor_param_info;
    std::shared_ptr<ASTNode> ctor_body = nullptr;

    if(classified.constructor_method) {
        auto ctor_params = classified.constructor_method->children[0];
        ctor_body = classified.constructor_method->children[1];
        ctor_param_info = extractParamInfo(ctor_params);
    }

    // Create constructor function
    auto* constructor = factory->createJSFunction(
        [engine, ctor_param_info, ctor_body, class_env, parent_constructor, class_prototype](
            const rift::core::CallContext& call_context, const std::vector<Value>& args) -> Value {
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

            for(size_t i = 0; i < ctor_param_info.size(); ++i) {
                const auto& [param_name, default_ast, is_rest] = ctor_param_info[i];

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

    // Bind class name in class-scoped environment
    // Declarations: always bind. Expressions: only if name is non-empty.
    if(is_declaration || !class_name.empty()) {
        class_env->define(class_name, Value(constructor));
    }

    // Add instance methods to prototype
    addMethods(classified.instance_methods, class_prototype, class_env, class_prototype,
               parent_prototype, engine, true);

    // Add static methods to constructor
    addMethods(classified.static_methods, constructor, class_env, class_prototype, parent_prototype,
               engine, false);

    return constructor;
}

}  // namespace rift::core
