// ============================================================================
// ECMA-262 -- Object-Related Expression Evaluation
// Implements Runtime Semantics: Evaluation for:
//   - Call expressions and new expressions (13.3.2, 13.3.5, 13.3.6)
//   - Property access / member expressions (13.3.1)
//   - Array and object literals (13.2.4, 13.2.5)
//   - Function, arrow, generator, async, class expressions (15.2-15.9)
//   - Super keyword (13.3.7)
//   - Await expression (15.8.1)
//   - Yield expression (15.5.3)
// @spec https://tc39.es/ecma262/#sec-left-hand-side-expressions
// @spec https://tc39.es/ecma262/#sec-ecmascript-language-functions-and-classes
//
// See also: expression_evaluator.cpp (main dispatch, logical/unary/conditional)
//           expression_evaluator_assignment.cpp (assignment/update expressions)
//           operation_handler.cpp (binary/unary operator implementations)
//           class_builder.cpp (ClassDefinitionEvaluation shared by class
//                              expressions and declarations)
// ============================================================================

#include "rift/builtins/array/array.h"
#include "rift/builtins/builtin_manager.h"
#include "rift/builtins/generator/generator_iterator.h"
#include "rift/builtins/promise/promise.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/frontend/lexer/lexer.h"
#include "rift/frontend/parser/parser.h"
#include "rift/interpreter/async_executor.h"
#include "rift/interpreter/class_builder.h"
#include "rift/interpreter/engine.h"
#include "rift/interpreter/evaluation_utils.h"
#include "rift/interpreter/expression_evaluator.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/interpreter/statement_evaluator.h"
#include "rift/memory/gc_disabler.h"
#include "rift/memory/gc_protector.h"
#include "rift/types/object.h"

namespace rift::core {

// 13.3.6 Function Calls — Runtime Semantics: Evaluation
// Also covers: 13.3.2 EvaluateCall ( func, ref, arguments, tailPosition )
//              12.3.5.1 super call (within Construct)
// @spec https://tc39.es/ecma262/#sec-function-calls-runtime-semantics-evaluation
// @spec https://tc39.es/ecma262/#sec-evaluatecall
//
// SIMPLIFIED: The spec separates CallExpression into multiple productions
// (CallExpression, SuperCall, CallMemberExpression) each with their own
// evaluation semantics. Rift handles them all in a single function using
// AST metadata to distinguish the cases. The spec's Reference type and
// GetValue/GetThisValue are implicit in how Rift evaluates member
// expressions inline to extract both the thisValue and the callee.
Value ExpressionEvaluator::evaluateCallExpression(std::shared_ptr<ASTNode> node,
                                                  std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() < 1) {
        return Value::undefined();
    }

    auto callee_node = node->children[0];

    // --- SuperCall: super ( Arguments ) ---
    // 13.3.5.1 Runtime Semantics: Evaluation — SuperCall
    // @spec https://tc39.es/ecma262/#sec-super-keyword-runtime-semantics-evaluation
    // 1. Let newTarget be GetNewTarget().
    // 2. Assert: newTarget is an Object.
    // 3. Let func be GetSuperConstructor().
    // 4. Let argList be ? ArgumentListEvaluation of Arguments.
    // 5. If IsConstructor(func) is false, throw a TypeError exception.
    // 6. Let result be ? Construct(func, argList, newTarget).
    // 7. Let thisER be GetThisEnvironment().
    // 8. Perform ? thisER.BindThisValue(result).
    // 9. ... (initialize fields)
    // 10. Return result.
    // SIMPLIFIED: Rift looks up [[SuperConstructor]] from the environment
    // and calls it with Constructor call type, rather than using the spec's
    // GetSuperConstructor / Construct / BindThisValue abstract operations.
    if(callee_node->type == ASTNodeType::SuperExpression && callee_node->value == "call") {
        // Step 3. Let func be GetSuperConstructor().
        Value super_ctor;
        try {
            super_ctor = env->get("[[SuperConstructor]]");
        } catch(const JavaScriptException&) {
            throw JavaScriptException(Value("SyntaxError: 'super' keyword is unexpected here"),
                                      node->line, node->column);
        }

        // Step 5. If IsConstructor(func) is false, throw a TypeError.
        if(!super_ctor.isFunction()) {
            throw JavaScriptException(Value("TypeError: Super constructor is not a function"),
                                      node->line, node->column);
        }

        // Get current 'this' value (the instance being constructed)
        Value this_value = env->get("this");

        // Step 4. Let argList be ? ArgumentListEvaluation of Arguments.
        // @spec
        // https://tc39.es/ecma262/#sec-argument-lists-runtime-semantics-argumentlistevaluation
        std::vector<Value> args;
        for(size_t i = 1; i < node->children.size(); ++i) {
            auto& arg_node = node->children[i];
            if(arg_node->type == ASTNodeType::SpreadElement) {
                // 13.2.4.1 SpreadElement : ... AssignmentExpression
                // SIMPLIFIED: Uses array-like length iteration instead of
                // full GetIterator / IteratorStep protocol for spread.
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

        // Step 6. Let result be ? Construct(func, argList, newTarget).
        auto* ctor = dynamic_cast<JSFunction*>(super_ctor.getObject());
        if(!ctor) {
            throw JavaScriptException(Value("TypeError: Super constructor is not a function"),
                                      node->line, node->column);
        }
        rift::core::CallContext ctx(rift::core::CallType::Constructor, this_value);
        return ctor->call(ctx, args);
    }

    // --- super.method() call ---
    // 13.3.7 MemberExpression : MemberExpression . IdentifierName (via super)
    // @spec https://tc39.es/ecma262/#sec-super-keyword-runtime-semantics-evaluation
    // SIMPLIFIED: The spec uses MakeSuperPropertyReference which returns a
    // Reference with a thisValue and the super prototype as the base. Rift
    // instead looks up [[SuperPrototype]] directly from the environment.
    if(callee_node->type == ASTNodeType::SuperExpression && callee_node->value == "member") {
        // Get the parent prototype from environment
        // (Spec: Let env be GetThisEnvironment(), let baseValue be env.GetSuperBase())
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

        // Get the method name (static or computed property key)
        std::string method_name;
        if(callee_node->metadata == "computed") {
            Value key_value = engine->evaluate(callee_node->children[0], env);
            method_name = key_value.toString();
        } else {
            method_name = callee_node->children[0]->value;
        }

        // Look up method on super prototype
        Value method = super_proto.getObject()->getProperty(method_name);
        if(!method.isFunction()) {
            throw JavaScriptException(
                Value("TypeError: super." + method_name + " is not a function"), node->line,
                node->column);
        }

        // The spec says the thisValue for super.method() is the current 'this'
        Value this_value = env->get("this");

        // ArgumentListEvaluation of Arguments
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

        // Call method with current 'this' (not the super prototype)
        auto* func = dynamic_cast<JSFunction*>(method.getObject());
        if(!func) {
            throw JavaScriptException(Value("TypeError: Super method is not a function"),
                                      node->line, node->column);
        }
        rift::core::CallContext ctx(rift::core::CallType::Function, this_value);
        return func->call(ctx, args);
    }

    // --- Optional call: func?.(args) ---
    // 13.3.8.1 Runtime Semantics: Evaluation — OptionalExpression
    // @spec https://tc39.es/ecma262/#sec-optional-chaining-evaluation
    // 1. ... evaluate the inner expression
    // 2. If the value is undefined or null, return undefined (short-circuit).
    if(node->metadata == "optional") {
        Value callee_val = engine->evaluate(callee_node, env);
        if(callee_val.isUndefined() || callee_val.isNull()) {
            return Value::undefined();
        }
    }

    // --- Standard CallExpression ---
    // 13.3.6.1 Runtime Semantics: Evaluation
    // CallExpression : CoverCallExpressionAndArrowParameterList
    // 1. Let ref be ? Evaluation of CoverCallExpressionAndArrowParameterList.
    // 2. Let func be ? GetValue(ref).
    // 3. ... (tailPosition check)
    // 4. Return ? EvaluateCall(func, ref, Arguments, tailPosition).
    //
    // 13.3.2 EvaluateCall ( func, ref, arguments, tailPosition )
    // 1. If ref is a Reference Record, then
    //    a. If IsPropertyReference(ref), let thisValue be GetThisValue(ref).
    //    b. Else (environment reference), let thisValue be
    //       ref.[[Base]].WithBaseObject().
    // 2. Else, let thisValue be undefined.
    // 3. Let argList be ? ArgumentListEvaluation of arguments.
    // 4. If func is not an Object, throw a TypeError.
    // 5. If IsCallable(func) is false, throw a TypeError.
    // 6. ... (tail call check)
    // 7. Return ? Call(func, thisValue, argList).
    //
    // SIMPLIFIED: Rift does not use Reference Records. Instead, when the
    // callee is a MemberExpression, we evaluate the object (thisValue) and
    // property separately to extract both the function and the receiver.
    Value this_value = Value::undefined();
    Value callee;

    if(callee_node->type == ASTNodeType::MemberExpression) {
        // EvaluateCall step 1a: IsPropertyReference — this is a method call obj.method(args)
        // Evaluate the object to get thisValue, then look up the method
        if(callee_node->children.size() == 2) {
            // Step 1a: Let thisValue be GetThisValue(ref) — evaluate the base object
            this_value = engine->evaluate(callee_node->children[0], env);

            // Handle optional chaining on method call: obj?.method()
            bool callee_optional = (callee_node->metadata == "optional" ||
                                    callee_node->metadata == "computed-optional");
            if(callee_optional && (this_value.isUndefined() || this_value.isNull())) {
                return Value::undefined();
            }

            // Get property name from the member expression (static or computed)
            // SIMPLIFIED: The spec uses GetValue on a Reference whose [[ReferencedName]]
            // is the property key. Rift evaluates the property key inline.
            std::string property;
            if(callee_node->metadata == "computed" ||
               callee_node->metadata == "computed-optional") {
                Value property_value = engine->evaluate(callee_node->children[1], env);
                if(property_value.isSymbol()) {
                    property = EvaluationUtils::symbolToPropertyKey(property_value.getSymbol().id);
                } else {
                    property = EvaluationUtils::toPropertyKeyString(property_value);
                }
            } else {
                property = callee_node->children[1]->value;
            }

            // Look up the method on the already-evaluated object (getter-aware)
            // SIMPLIFIED: The spec's [[Get]] internal method handles accessor
            // properties automatically. Rift checks for accessor descriptors
            // explicitly via findPropertyDescriptor.
            if(this_value.isObject() || this_value.isFunction()) {
                auto* obj = this_value.getObject();
                if(obj) {
                    auto [found, desc] = obj->findPropertyDescriptor(property);
                    if(found && desc.is_accessor && desc.getter.isFunction()) {
                        auto* getter_func = dynamic_cast<JSFunction*>(desc.getter.getObject());
                        if(getter_func) {
                            rift::core::CallContext getter_ctx(rift::core::CallType::Function,
                                                               this_value);
                            callee = getter_func->call(getter_ctx, {});
                        }
                    } else {
                        callee = obj->getProperty(property);
                    }
                }
            } else if(this_value.isString()) {
                // Primitive boxing: the spec's GetValue would call ToObject
                // to wrap the string, then look up on String.prototype
                auto* string_prototype = BuiltinManager::getStringPrototype();
                if(string_prototype) {
                    callee = string_prototype->getProperty(property);
                }
            } else if(this_value.isSymbol()) {
                // Primitive boxing for symbols
                auto* symbol_prototype = BuiltinManager::getSymbolPrototype();
                if(symbol_prototype) {
                    callee = symbol_prototype->getProperty(property);
                }
            }
        }
    } else {
        // EvaluateCall step 2: Not a property reference — regular function call
        // Let thisValue be undefined
        callee = engine->evaluate(callee_node, env);
    }

    // --- Direct eval ---
    // 19.2.1.1 PerformEval ( x, strictCaller, direct )
    // @spec https://tc39.es/ecma262/#sec-performeval
    // A direct eval is a call expression where the callee is the identifier
    // "eval" and it resolves to the built-in eval function. Direct eval
    // executes in the caller's lexical scope (unlike indirect eval).
    //
    // SIMPLIFIED: The spec's PerformEval is complex (creates new execution
    // contexts, handles strict mode inheritance, etc.). Rift parses and
    // evaluates the code string in the caller's environment with a simpler
    // strict-mode detection.
    if(callee_node->type == ASTNodeType::Identifier && callee_node->value == "eval" &&
       callee.isFunction()) {
        auto* callee_func = dynamic_cast<JSFunction*>(callee.getObject());
        if(callee_func != nullptr && callee_func == BuiltinManager::getEvalFunction()) {
            // Direct eval: execute in caller's scope
            // Step 2. If x is not a String, return x.
            std::vector<Value> eval_args;
            for(size_t i = 1; i < node->children.size(); ++i) {
                eval_args.push_back(engine->evaluate(node->children[i], env));
            }

            if(eval_args.empty()) {
                return Value::undefined();
            }
            if(!eval_args[0].isString()) {
                return eval_args[0];
            }

            // Step 3-5. Parse x as a Script or (in strict mode) as strict code.
            std::string code = eval_args[0].toString();

            try {
                rift::frontend::Lexer lexer(code);
                auto tokens = lexer.tokenize();
                rift::frontend::Parser parser(tokens);
                auto ast = parser.parse();

                // Step 4. Determine strictness: inherit from caller or detect
                // "use strict" directive in eval code.
                bool caller_strict = env->inheritsStrictMode();
                bool eval_code_strict = false;
                if(ast && ast->type == ASTNodeType::Program) {
                    for(const auto& stmt : ast->children) {
                        if(stmt->type == ASTNodeType::ExpressionStatement &&
                           !stmt->children.empty()) {
                            const auto& expr = stmt->children[0];
                            if(expr->type == ASTNodeType::Literal && expr->metadata == "string" &&
                               expr->value == "use strict") {
                                eval_code_strict = true;
                            }
                            continue;
                        }
                        break;
                    }
                }

                // Step 7-9. Create eval execution context.
                // SIMPLIFIED: Rift creates a child environment for strict mode
                // (so var declarations don't leak) or uses the caller's
                // environment directly for sloppy mode.
                bool is_strict = caller_strict || eval_code_strict;
                std::shared_ptr<Environment> eval_env;
                if(is_strict) {
                    // Strict mode: create child environment so var declarations don't leak
                    eval_env = std::make_shared<Environment>(env);
                    eval_env->setStrictMode(true);
                } else {
                    // Sloppy mode: use caller's environment directly (vars leak)
                    eval_env = env;
                }

                // Step 10. In sloppy mode, hoist function declarations
                // INCOMPLETE: The spec's EvalDeclarationInstantiation (19.2.1.3)
                // is more thorough — it handles var hoisting to the global scope,
                // conflicting declarations, etc.
                if(!is_strict && ast->type == ASTNodeType::Program) {
                    for(auto& child : ast->children) {
                        if(child->type == ASTNodeType::FunctionDeclaration) {
                            engine->evaluate(child, eval_env);
                        }
                    }
                }
                // Step 11. Evaluate the parsed code and return the result.
                return engine->evaluate(ast, eval_env);
            } catch(const JavaScriptException&) {
                throw;
            } catch(const ReturnException& e) {
                return e.getValue();
            } catch(const std::exception& e) {
                throw JavaScriptException(Value(std::string(e.what())));
            }
        }
    }

    // --- ArgumentListEvaluation ---
    // 13.3.8 Argument Lists — Runtime Semantics: ArgumentListEvaluation
    // @spec https://tc39.es/ecma262/#sec-argument-lists-runtime-semantics-argumentlistevaluation
    // For each argument:
    //   - If it's a SpreadElement, call GetIterator and iterate
    //   - Otherwise, evaluate the AssignmentExpression
    // SIMPLIFIED: For spread, Rift uses array-like length-based iteration
    // for objects and character-based iteration for strings, instead of the
    // full GetIterator / IteratorStep protocol.
    std::vector<Value> args;
    for(size_t i = 1; i < node->children.size(); ++i) {
        auto& arg_node = node->children[i];

        if(arg_node->type == ASTNodeType::SpreadElement) {
            // SpreadElement : ... AssignmentExpression
            Value spread_value = engine->evaluate(arg_node->children[0], env);

            if(spread_value.isObject()) {
                auto* obj = spread_value.getObject();
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
            // DEVIATION: For non-iterable values, spread silently does nothing.
            // The spec would throw a TypeError: "X is not iterable".
        } else {
            args.push_back(engine->evaluate(arg_node, env));
        }
    }

    // EvaluateCall step 4-5. If func is not callable, throw TypeError.
    // Step 7. Return ? Call(func, thisValue, argList).
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

    // EvaluateCall step 4-5. Not a function — throw TypeError
    throw JavaScriptException(Value("TypeError: " + callee.toString() + " is not a function"),
                              node->line, node->column);
}

// 13.3.1 Property Accessors — Runtime Semantics: Evaluation
// MemberExpression : MemberExpression . IdentifierName
// MemberExpression : MemberExpression [ Expression ]
// @spec https://tc39.es/ecma262/#sec-property-accessors-runtime-semantics-evaluation
//
// Also covers optional chaining:
// 13.3.8.1 OptionalExpression — Runtime Semantics: Evaluation
// @spec https://tc39.es/ecma262/#sec-optional-chaining-evaluation
//
// Spec algorithm for MemberExpression . IdentifierName:
// 1. Let baseReference be ? Evaluation of MemberExpression.
// 2. Let baseValue be ? GetValue(baseReference).
// 3. If the source text matched by this MemberExpression is strict mode code,
//    let strict be true; else let strict be false.
// 4. Return EvaluatePropertyAccessWithIdentifierKey(baseValue, IdentifierName, strict).
//
// Spec algorithm for MemberExpression [ Expression ]:
// 1. Let baseReference be ? Evaluation of MemberExpression.
// 2. Let baseValue be ? GetValue(baseReference).
// 3. ... (strict check)
// 4. Return ? EvaluatePropertyAccessWithExpressionKey(baseValue, Expression, strict).
//
// SIMPLIFIED: Rift does not use Reference Records. The baseValue is obtained
// by directly evaluating the child node. Property access uses getProperty()
// with explicit accessor/getter detection rather than the spec's [[Get]]
// internal method which handles accessors transparently.
Value ExpressionEvaluator::evaluateMemberExpression(std::shared_ptr<ASTNode> node,
                                                    std::shared_ptr<Environment> env,
                                                    Rift* engine) {
    if(node->children.size() != 2) {
        return Value::undefined();
    }

    // Step 1-2. Let baseValue be ? GetValue(? Evaluation of MemberExpression).
    Value object = engine->evaluate(node->children[0], env);

    // Optional chaining (?.) — 13.3.8.1 step 5:
    // If baseValue is undefined or null, return undefined (short-circuit).
    bool is_optional = (node->metadata == "optional" || node->metadata == "computed-optional");
    if(is_optional && (object.isUndefined() || object.isNull())) {
        return Value::undefined();
    }

    // Step 4. Determine the property key.
    // For dot notation: use the identifier name directly.
    // For bracket notation: evaluate the expression and call ToPropertyKey.
    std::string property;

    if(node->metadata == "computed" || node->metadata == "computed-optional") {
        // Bracket notation: EvaluatePropertyAccessWithExpressionKey
        // 1. Let propertyNameReference be ? Evaluation of Expression.
        // 2. Let propertyNameValue be ? GetValue(propertyNameReference).
        // 3. Let propertyKey be ? ToPropertyKey(propertyNameValue).
        Value property_value = engine->evaluate(node->children[1], env);

        if(property_value.isSymbol()) {
            property = EvaluationUtils::symbolToPropertyKey(property_value.getSymbol().id);
        } else {
            property = EvaluationUtils::toPropertyKeyString(property_value);
        }
    } else {
        // Dot notation: EvaluatePropertyAccessWithIdentifierKey
        // The property key is the StringValue of IdentifierName.
        property = node->children[1]->value;
    }

    // Perform the property access via the object's [[Get]] internal method.
    // SIMPLIFIED: The spec calls baseValue.[[Get]](propertyKey, receiver) which
    // automatically invokes accessor getters. Rift explicitly checks for accessor
    // descriptors and invokes the getter function.
    if(object.isObject() || object.isFunction()) {
        auto* obj = object.getObject();
        if(obj) {
            auto [found, desc] = obj->findPropertyDescriptor(property);
            if(found && desc.is_accessor) {
                if(desc.getter.isFunction()) {
                    auto* getter_func = dynamic_cast<JSFunction*>(desc.getter.getObject());
                    if(getter_func) {
                        rift::core::CallContext ctx(rift::core::CallType::Function, object);
                        return getter_func->call(ctx, {});
                    }
                }
                return Value::undefined();
            }
            return obj->getProperty(property);
        }
    }

    // Primitive boxing: the spec would call ToObject (7.1.18) to wrap the
    // primitive, creating a temporary wrapper object, then access the property
    // on its prototype chain.
    // SIMPLIFIED: Rift skips the wrapper object and looks up properties directly
    // on the appropriate prototype (String.prototype, Symbol.prototype, etc.).
    if(object.isString()) {
        auto* string_prototype = BuiltinManager::getStringPrototype();
        if(string_prototype) {
            return string_prototype->getProperty(property);
        }
    }

    if(object.isSymbol()) {
        auto* symbol_prototype = BuiltinManager::getSymbolPrototype();
        if(symbol_prototype) {
            return symbol_prototype->getProperty(property);
        }
    }

    // INCOMPLETE: Number and Boolean primitive boxing not yet implemented.
    // Accessing e.g. (42).toFixed(2) or true.toString() would return undefined.
    return Value::undefined();
}

// 13.2.4 Array Initializer — Runtime Semantics: Evaluation
// ArrayLiteral : [ ElementList ]
// @spec https://tc39.es/ecma262/#sec-array-initializer-runtime-semantics-evaluation
//
// Spec algorithm:
// 1. Let array be ! ArrayCreate(0).
// 2. Let len be ? ArrayAccumulation of ElementList with arguments array and 0.
// 3. Perform Set(array, "length", len, true).
// 4. Return array.
//
// ArrayAccumulation for SpreadElement:
// 1. Let spreadRef be ? Evaluation of AssignmentExpression.
// 2. Let spreadObj be ? GetValue(spreadRef).
// 3. Let iteratorRecord be ? GetIterator(spreadObj, sync).
// 4. Repeat:
//    a. Let next be ? IteratorStepValue(iteratorRecord).
//    b. If next is done, return nextIndex.
//    c. Perform ! CreateDataPropertyOrThrow(array, ! ToString(nextIndex), next).
//    d. Set nextIndex to nextIndex + 1.
//
// SIMPLIFIED: Rift collects elements into a vector then creates the array
// via Array::createArrayObject, rather than creating the array first and
// accumulating into it. For spread, Rift uses the iterator protocol when
// Symbol.iterator is present, but falls back to array-like length-based
// iteration (which the spec does not — it always requires an iterator).
Value ExpressionEvaluator::evaluateArrayLiteral(std::shared_ptr<ASTNode> node,
                                                std::shared_ptr<Environment> env, Rift* engine) {
    // Collect elements, expanding spread elements (ArrayAccumulation)
    std::vector<Value> elements;
    elements.reserve(node->children.size());

    for(const auto& child : node->children) {
        if(child->type == ASTNodeType::SpreadElement) {
            // SpreadElement : ... AssignmentExpression
            // Step 1-2. Let spreadObj be ? GetValue(? Evaluation of AssignmentExpression).
            Value spread_value = engine->evaluate(child->children[0], env);

            if(spread_value.isString()) {
                // Strings are iterable — each character is an element
                std::string str = spread_value.getString();
                for(char c : str) {
                    elements.push_back(Value(std::string(1, c)));
                }
            } else if(spread_value.isObject()) {
                auto* obj = spread_value.getObject();

                // Step 3. Let iteratorRecord be ? GetIterator(spreadObj, sync).
                // Check for Symbol.iterator to use the iterator protocol
                std::string iterator_key =
                    EvaluationUtils::symbolToPropertyKey(builtins::Symbol::getIteratorId());
                Value iterator_method = obj->getProperty(iterator_key);

                if(iterator_method.isFunction()) {
                    // Use iterator protocol (spec-compliant path)
                    auto* iterator_func =
                        dynamic_cast<rift::runtime::JSFunction*>(iterator_method.getObject());
                    if(iterator_func) {
                        // Call [Symbol.iterator]() to get the iterator object
                        CallContext ctx(CallType::Function, spread_value);
                        Value iterator = iterator_func->call(ctx, {});

                        if(iterator.isObject()) {
                            auto* iterator_obj = iterator.getObject();

                            // Step 4. Repeat: call next() until done
                            while(true) {
                                // Step 4a. Let next be ? IteratorStepValue(iteratorRecord).
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
                                // Step 4b. If next is done, return nextIndex.
                                Value done = result_obj->getProperty("done");
                                if(done.toBool()) {
                                    break;
                                }

                                // Step 4c. Perform CreateDataPropertyOrThrow(array, nextIndex,
                                // next).
                                Value value = result_obj->getProperty("value");
                                elements.push_back(value);
                            }
                        }
                    }
                } else {
                    // DEVIATION: Fall back to array-like iteration (length property).
                    // The spec requires an iterator; non-iterable values should throw
                    // "TypeError: X is not iterable".
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
            // DEVIATION: For non-iterable primitive values (number, boolean, etc.),
            // spread silently does nothing. The spec would throw TypeError.
        } else {
            // Non-spread element: evaluate and append
            // ElementList step: Let initValue be ? GetValue(? Evaluation of element).
            elements.push_back(engine->evaluate(child, env));
        }
    }

    // Steps 1, 3. Create the array object with the collected elements.
    // SIMPLIFIED: Rift uses Array::createArrayObject which creates the array
    // and sets all elements + length in one step, rather than creating an
    // empty array and accumulating via CreateDataPropertyOrThrow.
    auto* array_obj = builtins::Array::createArrayObject(engine->getObjectFactory(), elements);
    return Value(array_obj);
}

// 13.2.5 Object Initializer — Runtime Semantics: Evaluation
// ObjectLiteral : { PropertyDefinitionList }
// @spec https://tc39.es/ecma262/#sec-object-initializer-runtime-semantics-evaluation
//
// Spec algorithm:
// 1. Let obj be OrdinaryObjectCreate(%Object.prototype%).
// 2. Perform ? PropertyDefinitionEvaluation of PropertyDefinitionList with argument obj.
// 3. Return obj.
//
// PropertyDefinitionEvaluation for PropertyDefinition : PropertyName : AssignmentExpression
// 1. Let propKey be ? Evaluation of PropertyName.
// 2. ... (named evaluation check)
// 3. Let exprValueRef be ? Evaluation of AssignmentExpression.
// 4. Let propValue be ? GetValue(exprValueRef).
// 5. ... (anonymous function name check)
// 6. Assert: enumerable is true.
// 7. Perform ! CreateDataPropertyOrThrow(obj, propKey, propValue).
//
// PropertyDefinitionEvaluation for MethodDefinition (get/set):
// @spec
// https://tc39.es/ecma262/#sec-method-definitions-runtime-semantics-propertydefinitionevaluation
// 1. Let propKey be ? Evaluation of PropertyName.
// 2. ... (create closure)
// 3. Perform SetFunctionName / MakeMethod
// 4. Let desc be PropertyDescriptor { [[Get]]/[[Set]], [[Enumerable]]: true, [[Configurable]]: true
// }.
// 5. Perform ? DefinePropertyOrThrow(obj, propKey, desc).
//
// SIMPLIFIED: Rift stores children as key-value pairs (key, value, key, value, ...)
// rather than a list of PropertyDefinition nodes. Computed keys are identified
// by metadata flags rather than distinct AST node types.
Value ExpressionEvaluator::evaluateObjectLiteral(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine) {
    // Step 1. Let obj be OrdinaryObjectCreate(%Object.prototype%).
    auto* object_prototype = BuiltinManager::getObjectPrototype();
    auto* factory = engine->getObjectFactory();

    // Temporarily disable GC to prevent collection of the object being constructed.
    // The object is not yet reachable from GC roots until it's returned and assigned.
    memory::GCDisabler disabler(factory->getObjectManager()->getGC());

    auto* obj = factory->createJSObject(object_prototype);

    // Step 2. Perform ? PropertyDefinitionEvaluation of PropertyDefinitionList.
    // Children are stored in pairs: key, value, key, value, ...
    for(size_t i = 0; i < node->children.size(); i += 2) {
        if(i + 1 >= node->children.size()) {
            // Odd number of children - this should not happen with proper parsing
            break;
        }

        auto key_node = node->children[i];
        auto value_node = node->children[i + 1];

        // PropertyDefinitionEvaluation step 1: Let propKey be ? Evaluation of PropertyName.
        // @spec
        // https://tc39.es/ecma262/#sec-object-initializer-runtime-semantics-propertydefinitionevaluation
        std::string key;
        if(key_node->metadata == "computed_key" && !key_node->children.empty()) {
            // ComputedPropertyName : [ AssignmentExpression ]
            // 1. Let exprValue be ? Evaluation of AssignmentExpression.
            // 2. Let propName be ? GetValue(exprValue).
            // 3. Return ? ToPropertyKey(propName).
            Value key_value = engine->evaluate(key_node->children[0], env);
            key = key_value.toString();
        } else if(key_node->type == ASTNodeType::Identifier) {
            // LiteralPropertyName : IdentifierName — use StringValue
            key = key_node->value;
        } else if(key_node->type == ASTNodeType::Literal) {
            // LiteralPropertyName : StringLiteral — remove enclosing quotes
            std::string str = key_node->value;
            if(str.length() >= 2 && str[0] == '"' && str.back() == '"') {
                key = str.substr(1, str.length() - 2);  // Remove quotes
            } else {
                // LiteralPropertyName : NumericLiteral — use ToString
                key = str;
            }
        } else {
            // Other key types — evaluate as expression and convert to string
            Value key_value = engine->evaluate(key_node, env);
            key = key_value.toString();
        }

        // Check for getter/setter accessor properties (MethodDefinition : get/set)
        if(value_node->metadata == "getter" || value_node->metadata == "setter") {
            // MethodDefinition : get PropertyName ( ) { FunctionBody }
            // MethodDefinition : set PropertyName ( PropertySetParameterList ) { FunctionBody }
            // @spec
            // https://tc39.es/ecma262/#sec-method-definitions-runtime-semantics-propertydefinitionevaluation
            Value func_value = engine->evaluate(value_node, env);

            // Step 4-5. Build/merge the accessor PropertyDescriptor.
            // If this key already has an accessor, merge get + set together.
            auto [found, existing_desc] = obj->findPropertyDescriptor(key);
            rift::runtime::PropertyDescriptor desc;
            if(found && existing_desc.is_accessor) {
                desc = existing_desc;
            } else {
                desc.is_accessor = true;
            }

            if(value_node->metadata == "getter") {
                // Step 4. desc = { [[Get]]: closure, [[Enumerable]]: true, [[Configurable]]: true }
                desc.getter = func_value;
            } else {
                // Step 4. desc = { [[Set]]: closure, [[Enumerable]]: true, [[Configurable]]: true }
                desc.setter = func_value;
            }
            desc.enumerable = true;
            desc.configurable = true;
            // Step 5. Perform ? DefinePropertyOrThrow(obj, propKey, desc).
            obj->defineProperty(key, desc);
        } else {
            // PropertyDefinition : PropertyName : AssignmentExpression
            // Step 3-4. Let propValue be ? GetValue(? Evaluation of AssignmentExpression).
            Value value = engine->evaluate(value_node, env);

            // Step 7. Perform ! CreateDataPropertyOrThrow(obj, propKey, propValue).
            // SIMPLIFIED: Rift uses setProperty which creates a writable, enumerable,
            // configurable data property, matching CreateDataPropertyOrThrow semantics.
            obj->setProperty(key, value);
        }
    }

    // Step 3. Return obj.
    return Value(obj);
}

// 15.2.5 Runtime Semantics: Evaluation — FunctionExpression
// FunctionExpression : function BindingIdentifier? ( FormalParameters ) { FunctionBody }
// @spec https://tc39.es/ecma262/#sec-function-definitions-runtime-semantics-evaluation
//
// Spec algorithm (named FunctionExpression):
// 1. Return InstantiateOrdinaryFunctionExpression of FunctionExpression.
//
// 15.2.4 InstantiateOrdinaryFunctionExpression ( name )
// @spec https://tc39.es/ecma262/#sec-runtime-semantics-instantiateordinaryfunctionexpression
// 1. If name is not present, set name to "".
// 2. Let env be the running execution context's LexicalEnvironment.
// 3. Let privateEnv be the running execution context's PrivateEnvironment.
// 4. Let sourceText be the source text matched by FunctionExpression.
// 5. Let closure be OrdinaryFunctionCreate(%Function.prototype%, sourceText,
//    FormalParameters, FunctionBody, non-lexical-this, env, privateEnv).
// 6. Perform SetFunctionName(closure, name).
// 7. Perform MakeConstructor(closure).
// 8. Return closure.
//
// SIMPLIFIED: Rift creates a JSFunction with a lambda closure that captures
// the AST body and parameter list. The spec's OrdinaryFunctionCreate creates
// an exotic function object with [[Call]], [[Construct]], [[Environment]], etc.
// internal slots. Rift's tree-walking model captures the lexical environment
// directly in the lambda closure. FormalParameterList processing (default
// values, rest, destructuring) is handled at call time rather than parse time.
Value ExpressionEvaluator::evaluateFunctionExpression(std::shared_ptr<ASTNode> node,
                                                      std::shared_ptr<Environment> env,
                                                      Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Extract FormalParameters — the spec processes these during
    // FunctionDeclarationInstantiation (10.2.11) at call time.
    // Each parameter can be: Identifier, AssignmentExpression (default), or rest (...name)
    auto param_list = node->children[0];
    std::vector<std::tuple<std::string, std::shared_ptr<ASTNode>, bool, std::shared_ptr<ASTNode>>>
        param_info;
    for(const auto& param : param_list->children) {
        if(param->type == ASTNodeType::ObjectPattern || param->type == ASTNodeType::ArrayPattern) {
            param_info.emplace_back("", nullptr, false, param);
        } else if(param->type == ASTNodeType::AssignmentPattern && param->children.size() >= 2 &&
                  (param->children[0]->type == ASTNodeType::ObjectPattern ||
                   param->children[0]->type == ASTNodeType::ArrayPattern)) {
            param_info.emplace_back("", param->children[1], false, param->children[0]);
        } else if(param->type == ASTNodeType::AssignmentExpression) {
            // SingleNameBinding : BindingIdentifier Initializer
            param_info.emplace_back(param->children[0]->value, param->children[1], false, nullptr);
        } else if(param->metadata == "rest") {
            // BindingRestElement : ... BindingIdentifier
            param_info.emplace_back(param->value, nullptr, true, nullptr);
        } else {
            // SingleNameBinding : BindingIdentifier (no default)
            param_info.emplace_back(param->value, nullptr, false, nullptr);
        }
    }

    // Get FunctionBody
    auto body = node->children[1];

    // Detect "use strict" directive prologue
    // @spec https://tc39.es/ecma262/#sec-directive-prologues-and-the-use-strict-directive
    bool function_is_strict = false;
    if(body->type == ASTNodeType::BlockStatement) {
        for(const auto& stmt : body->children) {
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

    // Step 5. Let closure be OrdinaryFunctionCreate(...)
    // SIMPLIFIED: Rift creates a JSFunction with a lambda that captures the
    // AST body, parameters, and enclosing environment. The spec's
    // OrdinaryFunctionCreate sets [[Environment]], [[FormalParameters]],
    // [[ECMAScriptCode]], etc. as internal slots on the function object.
    auto* func = factory->createJSFunction(
        [engine, param_info, body, env, function_is_strict](
            const rift::core::CallContext& call_context, const std::vector<Value>& args) -> Value {
            // 10.2.11 FunctionDeclarationInstantiation
            // @spec https://tc39.es/ecma262/#sec-functiondeclarationinstantiation
            // 1. Let calleeContext be the running execution context.
            // 2. Let env be the LexicalEnvironment of calleeContext.
            // SIMPLIFIED: Rift creates a child of the captured closure env.
            auto func_env = std::make_shared<Environment>(env);

            // Apply strict mode if function has "use strict" directive
            if(function_is_strict) {
                func_env->setStrictMode(true);
            }

            // Bind 'this' — 10.2.1.1 OrdinaryCallBindThis
            // @spec https://tc39.es/ecma262/#sec-ordinarycallbindthis
            func_env->define("this", call_context.thisValue);

            // Bind parameters to arguments — 10.2.11 steps 21-28
            // (IteratorBindingInitialization of FormalParameters)
            for(size_t i = 0; i < param_info.size(); ++i) {
                const auto& [param_name, default_ast, is_rest, pattern] = param_info[i];

                if(is_rest) {
                    // BindingRestElement : ... BindingIdentifier
                    // Create an Array from remaining arguments
                    std::vector<Value> rest_args;
                    for(size_t j = i; j < args.size(); ++j) {
                        rest_args.push_back(args[j]);
                    }
                    auto* rest_array =
                        builtins::Array::createArrayObject(engine->getObjectFactory(), rest_args);
                    func_env->define(param_name, Value(rest_array));
                } else if(pattern) {
                    // Destructuring parameter: apply pattern binding
                    Value arg_value;
                    bool use_default = (i >= args.size()) || args[i].isUndefined();
                    if(use_default && default_ast) {
                        arg_value = engine->evaluate(default_ast, func_env);
                    } else if(i < args.size()) {
                        arg_value = args[i];
                    } else {
                        arg_value = Value::undefined();
                    }
                    StatementEvaluator::applyPatternBinding(pattern, arg_value, func_env, engine,
                                                            VariableType::Var);
                } else {
                    Value arg_value;

                    // SingleNameBinding with Initializer: use default if argument
                    // is not provided or is undefined
                    bool use_default = (i >= args.size()) || args[i].isUndefined();

                    if(use_default && default_ast) {
                        // Evaluate default value in the function's environment
                        // (so earlier params are visible to later defaults)
                        arg_value = engine->evaluate(default_ast, func_env);
                    } else if(i < args.size()) {
                        arg_value = args[i];
                    } else {
                        arg_value = Value::undefined();
                    }
                    func_env->define(param_name, arg_value);
                }
            }

            // 10.2.11 step 29. Create the arguments object.
            // @spec https://tc39.es/ecma262/#sec-createmappedargumentsobject
            // SIMPLIFIED: Rift creates an unmapped arguments object (plain
            // object with indexed properties + length). The spec creates a
            // mapped arguments object in sloppy mode that aliases the
            // formal parameters.
            auto* args_factory = engine->getObjectFactory();
            auto* arguments_obj = args_factory->createJSObject();
            for(size_t i = 0; i < args.size(); ++i) {
                arguments_obj->setProperty(std::to_string(i), args[i]);
            }
            arguments_obj->setProperty("length", Value(static_cast<double>(args.size())));
            func_env->define("arguments", Value(arguments_obj));

            // Execute function body
            // 10.2.1.4 OrdinaryCallEvaluateBody
            // @spec https://tc39.es/ecma262/#sec-ordinarycallevaluatebody
            try {
                return engine->evaluate(body, func_env);
            } catch(const ReturnException& e) {
                // ReturnStatement: extract the return value
                return e.getValue();
            } catch(const std::runtime_error& e) {
                throw;
            }
        });

    // Step 6. Perform SetFunctionName(closure, name).
    // @spec https://tc39.es/ecma262/#sec-setfunctionname
    // "name" property: configurable, not writable, not enumerable
    std::string func_name = node->value;  // May be empty for anonymous functions
    func->defineProperty("name", runtime::PropertyDescriptor(Value(func_name), false, false, true));

    // SetFunctionLength: number of formal params before first with default or rest
    // @spec https://tc39.es/ecma262/#sec-setfunctionlength
    // "length" property: configurable, not writable, not enumerable
    // ExpectedArgumentCount is the number of FormalParameters before the first
    // with an Initializer or rest element.
    size_t formal_params = 0;
    for(const auto& pi : param_info) {
        if(std::get<2>(pi))
            break;
        if(std::get<1>(pi) != nullptr)
            break;
        formal_params++;
    }
    func->defineProperty(
        "length",
        runtime::PropertyDescriptor(Value(static_cast<double>(formal_params)), false, false, true));

    // Step 7. Perform MakeConstructor(closure).
    // 10.2.5 MakeConstructor ( F [ , writablePrototype [ , prototype ] ] )
    // @spec https://tc39.es/ecma262/#sec-makeconstructor
    //   3. Let prototype be OrdinaryObjectCreate(%Object.prototype%).
    //   4. Perform ! DefinePropertyOrThrow(prototype, "constructor",
    //      PropertyDescriptor { [[Value]]: F, [[Writable]]: true,
    //      [[Enumerable]]: false, [[Configurable]]: true }).
    //   5. Perform ! DefinePropertyOrThrow(F, "prototype",
    //      PropertyDescriptor { [[Value]]: prototype, [[Writable]]: true,
    //      [[Enumerable]]: false, [[Configurable]]: false }).
    auto* prototypeObj =
        engine->getObjectFactory()->createJSObject(BuiltinManager::getObjectPrototype());
    prototypeObj->defineProperty("constructor",
                                 runtime::PropertyDescriptor(Value(func), true, false, true));
    func->defineProperty("prototype",
                         runtime::PropertyDescriptor(Value(prototypeObj), true, false, false));

    // Re-enable GC before returning
    obj_manager->setGCEnabled(was_gc_enabled);
    return Value(func);
}

// 15.3.4 Runtime Semantics: Evaluation — ArrowFunction
// ArrowFunction : ArrowParameters => ConciseBody
// @spec https://tc39.es/ecma262/#sec-arrow-function-definitions-runtime-semantics-evaluation
//
// Also covers async arrows:
// 15.9.4 Runtime Semantics: Evaluation — AsyncArrowFunction
// @spec https://tc39.es/ecma262/#sec-async-arrow-function-definitions-runtime-semantics-evaluation
//
// Spec algorithm (ArrowFunction):
// 1. Let env be the running execution context's LexicalEnvironment.
// 2. Let privateEnv be the running execution context's PrivateEnvironment.
// 3. Let sourceText be the source text matched by ArrowFunction.
// 4. Let closure be OrdinaryFunctionCreate(%Function.prototype%, sourceText,
//    ArrowParameters, ConciseBody, lexical-this, env, privateEnv).
// 5. Perform SetFunctionName(closure, "").
// 6. Return closure.
//
// Key differences from regular FunctionExpression per spec:
// - Arrow functions use "lexical-this" mode (step 4) — they do not have
//   their own [[ThisValue]], inheriting 'this' from the enclosing scope.
// - Arrow functions do NOT have a [[Construct]] internal method — they
//   cannot be used with 'new'.
// - Arrow functions do NOT create an 'arguments' binding — they inherit
//   'arguments' from the enclosing scope.
// - ConciseBody can be an ExpressionBody (implicit return) or a FunctionBody.
//
// SIMPLIFIED: Rift captures the enclosing 'this' value at creation time and
// stores it in JSArrowFunction. The spec achieves this via the "lexical-this"
// flag on OrdinaryFunctionCreate which affects OrdinaryCallBindThis behavior.
Value ExpressionEvaluator::evaluateArrowFunctionExpression(std::shared_ptr<ASTNode> node,
                                                           std::shared_ptr<Environment> env,
                                                           Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Extract ArrowParameters — same format as FormalParameters
    auto param_list = node->children[0];
    std::vector<std::tuple<std::string, std::shared_ptr<ASTNode>, bool, std::shared_ptr<ASTNode>>>
        param_info;
    for(const auto& param : param_list->children) {
        if(param->type == ASTNodeType::ObjectPattern || param->type == ASTNodeType::ArrayPattern) {
            param_info.emplace_back("", nullptr, false, param);
        } else if(param->type == ASTNodeType::AssignmentPattern && param->children.size() >= 2 &&
                  (param->children[0]->type == ASTNodeType::ObjectPattern ||
                   param->children[0]->type == ASTNodeType::ArrayPattern)) {
            param_info.emplace_back("", param->children[1], false, param->children[0]);
        } else if(param->type == ASTNodeType::AssignmentExpression) {
            param_info.emplace_back(param->children[0]->value, param->children[1], false, nullptr);
        } else if(param->metadata == "rest") {
            param_info.emplace_back(param->value, nullptr, true, nullptr);
        } else {
            param_info.emplace_back(param->value, nullptr, false, nullptr);
        }
    }

    // Get ConciseBody (expression body or block body)
    auto body = node->children[1];

    // Determine body type from metadata
    bool is_expression_body = (node->metadata == "expression");
    bool is_async = (node->metadata == "async");

    // Step 4 (lexical-this): Capture current 'this' from enclosing environment.
    // This is the key semantic difference from regular functions.
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

    // Step 4. Let closure be OrdinaryFunctionCreate(..., lexical-this, env, ...).
    // Rift uses createJSArrowFunction which stores captured_this and is not
    // constructable (no [[Construct]]).
    auto* arrow_func = factory->createJSArrowFunction(
        [engine, param_info, body, env, is_expression_body, is_async](
            const rift::core::CallContext& call_context, const std::vector<Value>& args) -> Value {
            // FunctionDeclarationInstantiation — same as regular functions
            // except 'this' comes from the captured lexical this.
            auto func_env = std::make_shared<Environment>(env);

            // Bind 'this' from call context (JSArrowFunction overrides
            // call_context.thisValue with the captured_this before calling)
            func_env->define("this", call_context.thisValue);

            // Bind parameters — same as FunctionExpression
            for(size_t i = 0; i < param_info.size(); ++i) {
                const auto& [param_name, default_ast, is_rest, pattern] = param_info[i];

                if(is_rest) {
                    std::vector<Value> rest_args;
                    for(size_t j = i; j < args.size(); ++j) {
                        rest_args.push_back(args[j]);
                    }
                    auto* rest_array =
                        builtins::Array::createArrayObject(engine->getObjectFactory(), rest_args);
                    func_env->define(param_name, Value(rest_array));
                } else if(pattern) {
                    Value arg_value;
                    bool use_default = (i >= args.size()) || args[i].isUndefined();
                    if(use_default && default_ast) {
                        arg_value = engine->evaluate(default_ast, func_env);
                    } else if(i < args.size()) {
                        arg_value = args[i];
                    } else {
                        arg_value = Value::undefined();
                    }
                    StatementEvaluator::applyPatternBinding(pattern, arg_value, func_env, engine,
                                                            VariableType::Var);
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

            // Arrow functions do NOT have their own 'arguments' object per spec
            // (They inherit 'arguments' from enclosing scope if available)

            if(is_async) {
                // 15.9 Async Arrow Function — when called, returns a Promise
                // and executes the body asynchronously with await support.
                // @spec https://tc39.es/ecma262/#sec-async-arrow-function-definitions
                auto* promise_obj =
                    builtins::Promise::createPromiseObject(engine->getObjectFactory());
                memory::GCProtector protect(promise_obj,
                                            engine->getObjectFactory()->getObjectManager());
                AsyncExecutor::executeAsync(body, func_env, engine, promise_obj);
                return Value(promise_obj);
            }

            // Execute ConciseBody (sync path)
            try {
                Value result = engine->evaluate(body, func_env);
                // ConciseBody : ExpressionBody — implicit return
                // The result of evaluating the expression IS the return value
                if(is_expression_body) {
                    return result;
                }
                // ConciseBody : { FunctionBody } — block body returns undefined
                // unless an explicit return statement is executed
                return Value::undefined();
            } catch(const ReturnException& e) {
                return e.getValue();
            }
        },
        captured_this);

    // Step 5. Perform SetFunctionName(closure, "").
    // @spec https://tc39.es/ecma262/#sec-setfunctionname
    std::string arrow_name = node->value;  // Usually empty for arrows
    arrow_func->defineProperty("name",
                               runtime::PropertyDescriptor(Value(arrow_name), false, false, true));

    // SetFunctionLength — ExpectedArgumentCount of ArrowParameters
    // @spec https://tc39.es/ecma262/#sec-setfunctionlength
    size_t arrow_formal = 0;
    for(const auto& pi : param_info) {
        if(std::get<2>(pi))
            break;
        if(std::get<1>(pi) != nullptr)
            break;
        arrow_formal++;
    }
    arrow_func->defineProperty(
        "length",
        runtime::PropertyDescriptor(Value(static_cast<double>(arrow_formal)), false, false, true));

    // Re-enable GC before returning
    obj_manager->setGCEnabled(was_gc_enabled);
    return Value(arrow_func);
}

// 13.3.5 The new Operator — Runtime Semantics: Evaluation
// NewExpression : new NewExpression
// MemberExpression : new MemberExpression Arguments
// @spec https://tc39.es/ecma262/#sec-new-operator-runtime-semantics-evaluation
//
// Delegates to EvaluateNew:
// 13.3.5.1 EvaluateNew ( constructExpr, arguments )
// @spec https://tc39.es/ecma262/#sec-evaluatenew
// 1. Let ref be ? Evaluation of constructExpr.
// 2. Let constructor be ? GetValue(ref).
// 3. If arguments is empty, let argList be a new empty List.
// 4. Else, let argList be ? ArgumentListEvaluation of arguments.
// 5. If IsConstructor(constructor) is false, throw a TypeError exception.
// 6. Return ? Construct(constructor, argList).
//
// 7.3.14 Construct ( F, argumentsList [ , newTarget ] )
// @spec https://tc39.es/ecma262/#sec-construct
// 1. If newTarget is not present, set newTarget to F.
// 2. Return ? F.[[Construct]](argumentsList, newTarget).
//
// 10.2.2 [[Construct]] ( argumentsList, newTarget )
// @spec https://tc39.es/ecma262/#sec-ecmascript-function-objects-construct-argumentslist-newtarget
// 1. Let callerContext be the running execution context.
// 2. Let kind be F.[[ConstructorKind]].
// 3. If kind is base, then
//    a. Let thisArgument be ? OrdinaryCreateFromConstructor(newTarget, "%Object.prototype%").
// 4. ... (push execution context)
// 5. If kind is base, perform OrdinaryCallBindThis(F, calleeContext, thisArgument).
// 6. Let result be Completion(OrdinaryCallEvaluateBody(F, argumentsList)).
// 7. ... (pop execution context)
// 8. If result.[[Value]] is an Object, return result.[[Value]].
// 9. If kind is base, return thisArgument.
// 10. If result.[[Value]] is not undefined, throw a TypeError.
// 11. Return ? env.GetThisBinding().
//
// SIMPLIFIED: Rift inlines the Construct / [[Construct]] logic. It creates
// the new object, calls the constructor, and returns the object or the
// constructor's return value (if it's an object). Steps 2-5 (ConstructorKind
// handling for derived classes) are handled separately in class_builder.cpp.
Value ExpressionEvaluator::evaluateNewExpression(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.empty()) {
        return Value::undefined();
    }

    // Steps 1-2. Let constructor be ? GetValue(? Evaluation of constructExpr).
    auto constructor_node = node->children[0];
    Value constructor = engine->evaluate(constructor_node, env);

    // Step 5. If IsConstructor(constructor) is false, throw a TypeError.
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

    // Arrow functions do not have [[Construct]] — they cannot be used with new
    if(!constructor_func->isConstructor()) {
        throw JavaScriptException(Value("TypeError: arrow function is not a constructor"),
                                  node->line, node->column);
    }

    // [[Construct]] step 3a. Let thisArgument be OrdinaryCreateFromConstructor(newTarget).
    // Get the constructor's "prototype" property to use as [[Prototype]] of new object.
    // @spec https://tc39.es/ecma262/#sec-ordinarycreatefromconstructor
    Value proto_value = constructor_func->getProperty("prototype");
    JSObject* prototype = nullptr;
    if(proto_value.isObject()) {
        prototype = proto_value.getObject();
    }

    // Create the new object with the constructor's prototype
    auto* new_obj = engine->getObjectFactory()->createJSObject(prototype);

    // Steps 3-4. Let argList be ? ArgumentListEvaluation of arguments.
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

    // [[Construct]] step 5-6. Bind this and evaluate the body.
    // Built-in constructors (Array, Object, etc.) handle their own object
    // creation internally and return the created object.
    rift::core::CallContext ctor_context(rift::core::CallType::Constructor, Value(new_obj));
    Value result = constructor_func->call(ctor_context, args);

    // [[Construct]] step 8. If result is an Object, return it.
    if(result.isObject() || result.isFunction()) {
        return result;
    }

    // [[Construct]] step 9. If kind is base, return thisArgument.
    // If constructor returned a primitive (or undefined), return the object we created.
    return Value(new_obj);
}

// 15.7.15 Runtime Semantics: Evaluation — ClassExpression
// ClassExpression : class BindingIdentifier? ClassTail
// @spec https://tc39.es/ecma262/#sec-class-definitions-runtime-semantics-evaluation
//
// Spec algorithm:
// 1. If BindingIdentifier is present:
//    a. Let className be StringValue of BindingIdentifier.
//    b. Let value be ? ClassDefinitionEvaluation of ClassTail with arguments className and
//    className. c. ... (set function name) d. Return value.
// 2. Else (no BindingIdentifier):
//    a. Let value be ? ClassDefinitionEvaluation of ClassTail with arguments undefined and "".
//    b. Return value.
//
// The heavy lifting is in ClassDefinitionEvaluation (15.7.14):
// @spec https://tc39.es/ecma262/#sec-runtime-semantics-classdefinitionevaluation
// This is a ~30-step algorithm that:
//   - Evaluates the superclass expression (if extends clause present)
//   - Creates the prototype object
//   - Creates the constructor function
//   - Processes method definitions (including static, get/set, computed keys)
//   - Returns the constructor
//
// SIMPLIFIED: Rift delegates to ClassBuilder::buildClass which implements
// ClassDefinitionEvaluation. See class_builder.cpp for the detailed steps.
Value ExpressionEvaluator::evaluateClassExpression(std::shared_ptr<ASTNode> node,
                                                   std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Step 1a/2a. Extract class name, superclass, and body from AST.
    std::string class_name = node->value;
    auto superclass_node = node->children[0];
    auto class_body = node->children[1];

    // Steps 1b/2a. Perform ClassDefinitionEvaluation.
    // The false flag indicates this is a class expression (not a declaration),
    // which affects whether the class name is bound in the enclosing scope.
    auto* constructor =
        ClassBuilder::buildClass(class_name, superclass_node, class_body, env, engine, false);

    return Value(constructor);
}

// 13.3.7 The super Keyword — Runtime Semantics: Evaluation
// SuperProperty : super . IdentifierName
// SuperProperty : super [ Expression ]
// @spec https://tc39.es/ecma262/#sec-super-keyword-runtime-semantics-evaluation
//
// Spec algorithm for super . IdentifierName:
// 1. Let env be GetThisEnvironment().
// 2. Let actualThis be ? env.GetThisBinding().
// 3. Let propertyKey be StringValue of IdentifierName.
// 4. If the source text is strict mode code, let strict be true; else false.
// 5. Return ? MakeSuperPropertyReference(actualThis, propertyKey, strict).
//
// MakeSuperPropertyReference resolves to:
// Let baseValue be ? env.GetSuperBase().  (i.e., the super prototype)
// Return a Reference with base=baseValue, referencedName=propertyKey, thisValue=actualThis.
//
// SIMPLIFIED: Rift does not use Reference Records or MakeSuperPropertyReference.
// Instead it looks up [[SuperPrototype]] from the environment (set during class
// construction) and reads the property directly. The thisValue binding for
// super property access is not preserved as a Reference — this matters for
// super.method() calls (handled in evaluateCallExpression, not here).
//
// Note: super() calls are handled in evaluateCallExpression, not here.
Value ExpressionEvaluator::evaluateSuperExpression(std::shared_ptr<ASTNode> node,
                                                   std::shared_ptr<Environment> env,
                                                   Rift* /*engine*/) {
    if(node->value == "member") {
        // SuperProperty : super.property or super[expr]
        // Step 1. Let env be GetThisEnvironment().
        // Step 5. Let baseValue be env.GetSuperBase().
        // SIMPLIFIED: Rift stores the super base as [[SuperPrototype]] in the env.
        Value super_proto;
        try {
            super_proto = env->get("[[SuperPrototype]]");
        } catch(const JavaScriptException&) {
            // Fallback: derive from [[SuperConstructor]].prototype
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

        // Step 3. Let propertyKey be the property name.
        std::string prop_name;
        if(node->metadata == "computed") {
            // SuperProperty : super [ Expression ]
            // INCOMPLETE: Should evaluate the expression with engine->evaluate().
            // Currently only handles literal keys for computed super access.
            if(node->children[0]->type == ASTNodeType::Literal) {
                prop_name = node->children[0]->value;
            }
        } else {
            // SuperProperty : super . IdentifierName
            prop_name = node->children[0]->value;
        }

        // Return the property value from the super prototype.
        // DEVIATION: The spec returns a Reference (not a value) so that
        // assignment to super.prop works correctly. Rift returns the value
        // directly, which means super.prop = x may not work as expected.
        return super_proto.getObject()->getProperty(prop_name);
    }

    // super() call is handled in evaluateCallExpression
    throw JavaScriptException(Value("SyntaxError: 'super' keyword is unexpected here"), node->line,
                              node->column);
}

// 15.5.5 Runtime Semantics: Evaluation — GeneratorExpression
// GeneratorExpression : function * BindingIdentifier? ( FormalParameters ) { GeneratorBody }
// @spec https://tc39.es/ecma262/#sec-generator-function-definitions-runtime-semantics-evaluation
//
// Spec algorithm:
// 1. Return InstantiateGeneratorFunctionExpression of GeneratorExpression.
//
// 15.5.4 InstantiateGeneratorFunctionExpression ( name )
// @spec https://tc39.es/ecma262/#sec-runtime-semantics-instantiategeneratorfunctionexpression
// 1. If name is not present, set name to "".
// 2. Let env be the running execution context's LexicalEnvironment.
// 3. Let privateEnv be the running execution context's PrivateEnvironment.
// 4. Let sourceText be the source text matched by GeneratorExpression.
// 5. Let closure be OrdinaryFunctionCreate(%GeneratorFunction.prototype%, sourceText,
//    FormalParameters, GeneratorBody, non-lexical-this, env, privateEnv).
// 6. Perform SetFunctionName(closure, name).
// 7. Let prototype be OrdinaryObjectCreate(%GeneratorFunction.prototype.prototype%).
// 8. Perform ! DefinePropertyOrThrow(closure, "prototype", { [[Value]]: prototype,
//    [[Writable]]: true, [[Enumerable]]: false, [[Configurable]]: false }).
// 9. Return closure.
//
// When called (27.5.3.1 GeneratorStart):
// @spec https://tc39.es/ecma262/#sec-generatorstart
// The generator body is not executed immediately. Instead, a Generator object
// is returned that implements the iterator protocol (next/return/throw).
//
// SIMPLIFIED: Rift creates a regular JSFunction whose [[Call]] creates a
// GeneratorIterator object (which manages suspended execution). The spec
// creates a generator function exotic object with [[GeneratorState]], etc.
// Rift uses GeneratorIterator::create to handle the suspend/resume protocol.
Value ExpressionEvaluator::evaluateGeneratorFunctionExpression(std::shared_ptr<ASTNode> node,
                                                               std::shared_ptr<Environment> env,
                                                               Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Extract FormalParameters
    auto param_list = node->children[0];
    std::vector<std::string> param_names;
    std::vector<std::tuple<std::string, std::shared_ptr<ASTNode>, bool, std::shared_ptr<ASTNode>>>
        param_info;

    for(const auto& param : param_list->children) {
        if(param->type == ASTNodeType::ObjectPattern || param->type == ASTNodeType::ArrayPattern) {
            param_info.emplace_back("", nullptr, false, param);
            param_names.push_back("");
        } else if(param->type == ASTNodeType::AssignmentPattern && param->children.size() >= 2 &&
                  (param->children[0]->type == ASTNodeType::ObjectPattern ||
                   param->children[0]->type == ASTNodeType::ArrayPattern)) {
            param_info.emplace_back("", param->children[1], false, param->children[0]);
            param_names.push_back("");
        } else if(param->type == ASTNodeType::AssignmentExpression) {
            param_info.emplace_back(param->children[0]->value, param->children[1], false, nullptr);
            param_names.push_back(param->children[0]->value);
        } else if(param->metadata == "rest") {
            param_info.emplace_back(param->value, nullptr, true, nullptr);
            param_names.push_back(param->value);
        } else {
            param_info.emplace_back(param->value, nullptr, false, nullptr);
            param_names.push_back(param->value);
        }
    }

    // Get GeneratorBody
    auto body = node->children[1];

    // Get optional function name
    std::string func_name = node->value;

    // Temporarily disable GC to prevent collection during function creation
    auto* factory = engine->getObjectFactory();
    auto* obj_manager = factory->getObjectManager();
    bool was_gc_enabled = obj_manager->isGCEnabled();
    obj_manager->setGCEnabled(false);

    // Step 5. Let closure be OrdinaryFunctionCreate(...).
    // When called, this function creates a GeneratorIterator instead of
    // executing the body directly — matching the spec's GeneratorStart behavior.
    auto* func = factory->createJSFunction(
        [engine, param_info, param_names, body, env](const rift::core::CallContext& call_context,
                                                     const std::vector<Value>& args) -> Value {
            // Generator functions cannot be used as constructors per spec
            // (they do not have [[Construct]])
            if(call_context.type == rift::core::CallType::Constructor) {
                throw JavaScriptException(Value("TypeError: Generator cannot be called with new"));
            }

            // Process arguments with default values and rest parameters
            // (FunctionDeclarationInstantiation for the generator)
            std::vector<Value> processed_args;
            auto func_env = std::make_shared<Environment>(env);

            for(size_t i = 0; i < param_info.size(); ++i) {
                const auto& [param_name, default_ast, is_rest, pattern] = param_info[i];

                if(is_rest) {
                    std::vector<Value> rest_args;
                    for(size_t j = i; j < args.size(); ++j) {
                        rest_args.push_back(args[j]);
                    }
                    auto* rest_array =
                        builtins::Array::createArrayObject(engine->getObjectFactory(), rest_args);
                    processed_args.push_back(Value(rest_array));
                } else if(pattern) {
                    // Destructuring parameter — resolve the arg value, then
                    // the actual binding happens in GeneratorIterator when it
                    // sets up its environment. Pass the raw arg through.
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

            // 27.5.3.1 GeneratorStart ( generator, generatorBody )
            // Create a Generator object in "suspendedStart" state.
            // The body will be executed lazily when .next() is called.
            auto* generator = builtins::GeneratorIterator::create(
                engine->getObjectFactory(), body, env, engine, param_names, processed_args);

            return Value(generator);
        });

    // Step 6. Perform SetFunctionName(closure, name).
    if(!func_name.empty()) {
        func->setProperty("name", Value(func_name));
    }

    // SetFunctionLength
    // DEVIATION: Uses param_names.size() which includes rest params.
    // The spec's ExpectedArgumentCount excludes rest and params with defaults.
    func->setProperty("length", Value(static_cast<double>(param_names.size())));

    // INCOMPLETE: Step 7-8. The spec creates a .prototype property on the
    // generator function pointing to a Generator prototype object. Rift does
    // not set this property, so `genFunc.prototype` is undefined.

    // Re-enable GC before returning
    obj_manager->setGCEnabled(was_gc_enabled);
    return Value(func);
}

// 15.5.3 Runtime Semantics: Evaluation — YieldExpression
// YieldExpression : yield
// YieldExpression : yield AssignmentExpression
// YieldExpression : yield * AssignmentExpression
// @spec https://tc39.es/ecma262/#sec-generator-function-definitions-runtime-semantics-evaluation
//
// Spec algorithm for yield AssignmentExpression:
// 1. Let genContext be the running execution context.
// 2. Let generator be the value of genContext's Generator component.
// 3. Let exprRef be ? Evaluation of AssignmentExpression.
// 4. Let value be ? GetValue(exprRef).
// 5. Return ? GeneratorYield(CreateIterResultObject(value, false)).
//
// INCOMPLETE: Yield expressions are parsed but not executed in this code
// path. The actual yield handling happens in GeneratorIterator which uses
// a coroutine-style suspend/resume mechanism. This stub exists only for
// the case where a yield appears outside a generator context.
Value ExpressionEvaluator::evaluateYieldExpression(std::shared_ptr<ASTNode> /*node*/,
                                                   std::shared_ptr<Environment> /*env*/,
                                                   Rift* /*engine*/) {
    // PHASE 3: This will be implemented when we add the actual generator execution.
    // For now, yield expressions are parsed but not executed in this code path.
    // The actual yield handling will happen in the generator evaluator.
    throw JavaScriptException(Value("Error: yield expression not yet implemented (Phase 3)"));
}

// 15.8.5 Runtime Semantics: Evaluation — AsyncFunctionExpression
// AsyncFunctionExpression : async function BindingIdentifier? ( FormalParameters ) {
// AsyncFunctionBody }
// @spec https://tc39.es/ecma262/#sec-async-function-definitions-runtime-semantics-evaluation
//
// Spec algorithm:
// 1. Return InstantiateAsyncFunctionExpression of AsyncFunctionExpression.
//
// 15.8.4 InstantiateAsyncFunctionExpression ( name )
// @spec https://tc39.es/ecma262/#sec-runtime-semantics-instantiateasyncfunctionexpression
// 1. If name is not present, set name to "".
// 2. Let env be the running execution context's LexicalEnvironment.
// 3. Let privateEnv be the running execution context's PrivateEnvironment.
// 4. Let sourceText be the source text matched by AsyncFunctionExpression.
// 5. Let closure be OrdinaryFunctionCreate(%AsyncFunction.prototype%, sourceText,
//    FormalParameters, AsyncFunctionBody, non-lexical-this, env, privateEnv).
// 6. Perform SetFunctionName(closure, name).
// 7. Return closure.
//
// When called (27.7.5.1 AsyncFunctionStart):
// @spec https://tc39.es/ecma262/#sec-async-functions-abstract-operations-async-function-start
// 1. Let promiseCapability be ! NewPromiseCapability(%Promise%).
// 2. Let asyncContext be a copy of the running execution context.
// 3. ... (set up completion handling)
// 4. ... (resume asyncContext, evaluate body)
// 5. Return promiseCapability.[[Promise]].
//
// SIMPLIFIED: Rift creates a regular JSFunction whose [[Call]] creates a
// Promise and uses AsyncExecutor to manage the suspend/resume protocol
// for await expressions. The spec uses the AsyncFunctionStart abstract
// operation with execution context manipulation.
Value ExpressionEvaluator::evaluateAsyncFunctionExpression(std::shared_ptr<ASTNode> node,
                                                           std::shared_ptr<Environment> env,
                                                           Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Extract FormalParameters
    auto param_list = node->children[0];
    std::vector<std::tuple<std::string, std::shared_ptr<ASTNode>, bool, std::shared_ptr<ASTNode>>>
        param_info;
    size_t param_count = 0;

    for(const auto& param : param_list->children) {
        if(param->type == ASTNodeType::ObjectPattern || param->type == ASTNodeType::ArrayPattern) {
            param_info.emplace_back("", nullptr, false, param);
        } else if(param->type == ASTNodeType::AssignmentPattern && param->children.size() >= 2 &&
                  (param->children[0]->type == ASTNodeType::ObjectPattern ||
                   param->children[0]->type == ASTNodeType::ArrayPattern)) {
            param_info.emplace_back("", param->children[1], false, param->children[0]);
        } else if(param->type == ASTNodeType::AssignmentExpression) {
            param_info.emplace_back(param->children[0]->value, param->children[1], false, nullptr);
        } else if(param->metadata == "rest") {
            param_info.emplace_back(param->value, nullptr, true, nullptr);
        } else {
            param_info.emplace_back(param->value, nullptr, false, nullptr);
        }
        param_count++;
    }

    // Get AsyncFunctionBody
    auto body = node->children[1];

    // Get optional function name
    std::string func_name = node->value;

    // Temporarily disable GC during function creation
    auto* factory = engine->getObjectFactory();
    auto* obj_manager = factory->getObjectManager();
    bool was_gc_enabled = obj_manager->isGCEnabled();
    obj_manager->setGCEnabled(false);

    // Step 5. Let closure be OrdinaryFunctionCreate(...).
    // When called, the async function:
    //   1. Creates a new Promise (AsyncFunctionStart step 1)
    //   2. Sets up parameter bindings (FunctionDeclarationInstantiation)
    //   3. Starts async execution of the body (AsyncFunctionStart step 4)
    //   4. Returns the Promise (AsyncFunctionStart step 5)
    auto* func = factory->createJSFunction(
        [engine, param_info, body, env](const rift::core::CallContext& call_context,
                                        const std::vector<Value>& args) -> Value {
            // AsyncFunctionStart step 1. Let promiseCapability be NewPromiseCapability(%Promise%).
            auto* factory = engine->getObjectFactory();
            auto* promise_obj = builtins::Promise::createPromiseObject(factory);
            memory::GCProtector protect(promise_obj, factory->getObjectManager());

            // FunctionDeclarationInstantiation — create function scope
            auto func_env = std::make_shared<Environment>(env);

            // OrdinaryCallBindThis
            func_env->define("this", call_context.thisValue);

            // Bind parameters (IteratorBindingInitialization)
            for(size_t i = 0; i < param_info.size(); ++i) {
                const auto& [param_name, default_ast, is_rest, pattern] = param_info[i];

                if(is_rest) {
                    std::vector<Value> rest_args;
                    for(size_t j = i; j < args.size(); ++j) {
                        rest_args.push_back(args[j]);
                    }
                    auto* rest_array =
                        builtins::Array::createArrayObject(engine->getObjectFactory(), rest_args);
                    func_env->define(param_name, Value(rest_array));
                } else if(pattern) {
                    Value arg_value;
                    bool use_default = (i >= args.size()) || args[i].isUndefined();
                    if(use_default && default_ast) {
                        arg_value = engine->evaluate(default_ast, func_env);
                    } else if(i < args.size()) {
                        arg_value = args[i];
                    } else {
                        arg_value = Value::undefined();
                    }
                    StatementEvaluator::applyPatternBinding(pattern, arg_value, func_env, engine,
                                                            VariableType::Var);
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

            // AsyncFunctionStart step 4. Resume asyncContext and evaluate body.
            // Rift delegates to AsyncExecutor which manages the suspend/resume
            // loop for await expressions, resolving/rejecting the promise on
            // completion or exception.
            AsyncExecutor::executeAsync(body, func_env, engine, promise_obj);

            // AsyncFunctionStart step 5. Return promiseCapability.[[Promise]].
            return Value(promise_obj);
        });

    // Step 6. Perform SetFunctionName(closure, name).
    if(!func_name.empty()) {
        func->setProperty("name", Value(func_name));
    }

    // SetFunctionLength
    func->setProperty("length", Value(static_cast<double>(param_count)));

    // Re-enable GC before returning
    obj_manager->setGCEnabled(was_gc_enabled);
    return Value(func);
}

// 15.8.1 Await — Runtime Semantics: Evaluation
// AwaitExpression : await UnaryExpression
// @spec https://tc39.es/ecma262/#sec-await
//
// 27.7.5.3 Await ( value )
// @spec https://tc39.es/ecma262/#await
// 1. Let asyncContext be the running execution context.
// 2. Let promise be ? PromiseResolve(%Promise%, value).
// 3. Let fulfilledClosure be a new Abstract Closure with parameters (v) that
//    captures asyncContext and performs:
//    a. Resume asyncContext passing NormalCompletion(v).
//    b. Return undefined.
// 4. Let onFulfilled be CreateBuiltinFunction(fulfilledClosure, 1, "", <<>>).
// 5. Let rejectedClosure be a new Abstract Closure with parameters (reason) that
//    captures asyncContext and performs:
//    a. Resume asyncContext passing ThrowCompletion(reason).
//    b. Return undefined.
// 6. Let onRejected be CreateBuiltinFunction(rejectedClosure, 1, "", <<>>).
// 7. Perform PerformPromiseThen(promise, onFulfilled, onRejected).
// 8. Remove asyncContext from the execution context stack.
// 9. Let callerContext be the running execution context (the one that called the async fn).
// 10. Resume callerContext.
// ... (asyncContext is later resumed when the promise settles)
//
// SIMPLIFIED: Rift uses a cooperative suspend/resume mechanism via AwaitException.
// When an await is encountered:
//   - If resuming (the awaited promise has settled), return the resolved value
//     or re-throw the rejection reason.
//   - If not resuming, throw an AwaitException to suspend execution. The
//     AsyncExecutor catches this, attaches promise handlers, and re-executes
//     the function body when the promise settles (skipping past already-
//     completed awaits via await IDs).
// This differs significantly from the spec's execution context suspend/resume
// model, but achieves equivalent observable behavior for most cases.
Value ExpressionEvaluator::evaluateAwaitExpression(std::shared_ptr<ASTNode> node,
                                                   std::shared_ptr<Environment> env, Rift* engine) {
    // Extract await ID from metadata — used by AsyncExecutor to track which
    // awaits have already been resolved during re-execution.
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

    // Resumption path: AsyncExecutor is re-executing the function body after
    // the awaited promise settled. Return the resolved value (or throw the
    // rejection reason) for this specific await point.
    // This corresponds to spec step 3a (fulfilled) or 5a (rejected).
    auto* ctx = AsyncExecutor::getActiveContext();
    if(ctx != nullptr && ctx->isResuming && ctx->currentAwaitId == await_id) {
        ctx->isResuming = false;
        if(ctx->throwOnResume) {
            // Spec step 5a: Resume asyncContext passing ThrowCompletion(reason).
            ctx->throwOnResume = false;
            throw JavaScriptException(ctx->sentValue);
        }
        // Spec step 3a: Resume asyncContext passing NormalCompletion(v).
        return ctx->sentValue;
    }

    // Suspension path: evaluate the operand and suspend execution.
    // Spec steps 2-10: Resolve the value to a promise, attach handlers, suspend.
    // SIMPLIFIED: Rift throws AwaitException to unwind the call stack. The
    // AsyncExecutor catches it, resolves the value to a promise if needed,
    // and sets up re-execution when the promise settles.
    Value awaited_value = Value::undefined();
    if(!node->children.empty()) {
        awaited_value = engine->evaluate(node->children[0], env);
    }

    throw AwaitException(awaited_value, await_id, -1);
}

}  // namespace rift::core
