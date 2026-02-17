// ============================================================================
// ECMA-262 -- Statement Evaluation (Chapters 14-15)
// Implements Runtime Semantics: Evaluation for declaration and statement nodes:
//   - Block statements (14.2)
//   - Variable/let/const declarations (14.3)
//   - Function/generator/async/class declarations (15.2, 15.5, 15.7, 15.8)
//   - Destructuring binding patterns (14.3.3)
// @spec https://tc39.es/ecma262/#sec-ecmascript-language-statements-and-declarations
//
// See also: statement_evaluator_control_flow.cpp (if, for, while, switch, etc.)
//           statement_evaluator_exceptions.cpp (throw, try-catch-finally)
//           expression_evaluator.cpp (expression statements)
// ============================================================================

#include "rift/core/engine/statement_evaluator.h"

#include <unordered_set>

#include "rift/builtins/array/array.h"
#include "rift/builtins/generator/generator_iterator.h"
#include "rift/builtins/promise/promise.h"
#include "rift/builtins/symbol/symbol.h"
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

// ExceptionGuard — RAII wrapper for engine exception-handling state.
// NON-STANDARD: Not part of ECMA-262. Rift uses this to defer GC collection
// during exception creation/propagation so thrown values are not collected.
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

// 14.1 Statement Semantics — Runtime Semantics: Evaluation
// @spec https://tc39.es/ecma262/#sec-statement-semantics-runtime-semantics-evaluation
// SIMPLIFIED: The spec defines separate evaluation semantics for each statement type.
// Rift uses a central dispatcher that routes based on ASTNodeType to the appropriate
// evaluator method, combining all statement and declaration evaluation into one switch.
Value StatementEvaluator::evaluate(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                                   Rift* engine) {
    if(!node) {
        return Value::undefined();
    }

    switch(node->type) {
        // 14.2 Block — Runtime Semantics: Evaluation
        case ASTNodeType::Program:
            return evaluateBlockStatement(node, env, engine);
        case ASTNodeType::BlockStatement:
            return evaluateBlockStatement(node, env, engine);
        // 14.5 Expression Statement
        case ASTNodeType::ExpressionStatement:
            return evaluateExpressionStatement(node, env, engine);
        // 14.3.2 Variable Statement
        case ASTNodeType::VariableDeclaration:
            return evaluateVariableDeclaration(node, env, engine);
        // 14.3.1 Let and Const Declarations
        case ASTNodeType::LetDeclaration:
            return evaluateLetDeclaration(node, env, engine);
        case ASTNodeType::ConstDeclaration:
            return evaluateConstDeclaration(node, env, engine);
        // 14.6 The if Statement
        case ASTNodeType::IfStatement:
            return evaluateIfStatement(node, env, engine);
        // 14.7.2 The while Statement
        case ASTNodeType::WhileStatement:
            return evaluateWhileStatement(node, env, engine);
        // 14.7.1 The do-while Statement
        case ASTNodeType::DoWhileStatement:
            return evaluateDoWhileStatement(node, env, engine);
        // 14.7.4 The for Statement
        case ASTNodeType::ForStatement:
            return evaluateForStatement(node, env, engine);
        // 14.7.5.6 ForIn/OfHeadEvaluation
        case ASTNodeType::ForInStatement:
            return evaluateForInStatement(node, env, engine);
        // 14.7.5.7 ForIn/OfBodyEvaluation
        case ASTNodeType::ForOfStatement:
            return evaluateForOfStatement(node, env, engine);
        case ASTNodeType::ForAwaitOfStatement:
            return evaluateForAwaitOfStatement(node, env, engine);
        // 14.12 The switch Statement
        case ASTNodeType::SwitchStatement:
            return evaluateSwitchStatement(node, env, engine);
        // 14.9 The break Statement
        case ASTNodeType::BreakStatement:
            return evaluateBreakStatement(node, env, engine);
        // 14.8 The continue Statement
        case ASTNodeType::ContinueStatement:
            // Signal a continue to loop evaluators
            throw ContinueException();
        // 14.10 The return Statement
        case ASTNodeType::ReturnStatement:
            return evaluateReturnStatement(node, env, engine);
        // 14.14 The throw Statement
        case ASTNodeType::ThrowStatement:
            return evaluateThrowStatement(node, env, engine);
        // 14.15 The try Statement
        case ASTNodeType::TryStatement:
            return evaluateTryStatement(node, env, engine);
        case ASTNodeType::CatchClause:
            // CatchClause is not evaluated directly, only through try-catch
            return Value::undefined();
        case ASTNodeType::FinallyClause:
            // FinallyClause is not evaluated directly, only through try-catch
            return Value::undefined();
        // 15.2 Function Definitions — Runtime Semantics: Evaluation
        case ASTNodeType::FunctionDeclaration:
            return evaluateFunctionDeclaration(node, env, engine);
        // 15.5 Generator Function Definitions — Runtime Semantics: Evaluation
        case ASTNodeType::GeneratorFunctionDeclaration:
            return evaluateGeneratorFunctionDeclaration(node, env, engine);
        // 15.8 Async Function Definitions — Runtime Semantics: Evaluation
        case ASTNodeType::AsyncFunctionDeclaration:
            return evaluateAsyncFunctionDeclaration(node, env, engine);
        // 15.7 Class Definitions — Runtime Semantics: Evaluation
        case ASTNodeType::ClassDeclaration:
            return evaluateClassDeclaration(node, env, engine);
        default:
            return Value::undefined();
    }
}

// 11.2.1 Directive Prologues and the Use Strict Directive
// @spec https://tc39.es/ecma262/#sec-directive-prologues-and-the-use-strict-directive
// A Use Strict Directive is an ExpressionStatement consisting entirely of a
// StringLiteral whose SV is "use strict". These must appear before any
// non-directive statements in the body's prologue.
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

// 11.2.1 Directive Prologues — generic string directive check
// Other string directives (besides "use strict") are syntactically valid
// but have no defined behavior in the spec. They are skipped during prologue
// scanning to allow "use strict" directives that appear after them.
static bool isStringDirective(const std::shared_ptr<ASTNode>& stmt) {
    if(stmt->type == ASTNodeType::ExpressionStatement && !stmt->children.empty()) {
        const auto& expr = stmt->children[0];
        if(expr->type == ASTNodeType::Literal && expr->metadata == "string") {
            return true;
        }
    }
    return false;
}

// 14.2 Block — Runtime Semantics: Evaluation
// @spec https://tc39.es/ecma262/#sec-block-runtime-semantics-evaluation
//
// Block : { StatementList }
//   1. Let oldEnv be the running execution context's LexicalEnvironment.
//   2. Let blockEnv be NewDeclarativeEnvironment(oldEnv).
//   3. Perform BlockDeclarationInstantiation(StatementList, blockEnv).
//   4. Set the running execution context's LexicalEnvironment to blockEnv.
//   5. Let blockValue be Completion(Evaluation of StatementList).
//   6. Set the running execution context's LexicalEnvironment to oldEnv.
//   7. Return blockValue.
//
// SIMPLIFIED: Rift only creates a new block scope when let/const declarations
// are present (optimization). The spec always creates one. Declaration-list
// blocks (synthetic wrappers for `var a, b = 1, c`) skip scope creation entirely.
Value StatementEvaluator::evaluateBlockStatement(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine) {
    // DEVIATION: "declaration-list" metadata marks synthetic blocks from comma-separated
    // declarations (e.g., `var a, b = 1`). These should not create a new scope.
    bool isDeclarationList = (node->metadata == "declaration-list");

    // Steps 2-3: Check if we need to create a block scope.
    // SIMPLIFIED: The spec unconditionally creates a new declarative environment.
    // Rift optimizes by only creating one when let/const bindings are present.
    bool needsBlockScope = false;
    if(!isDeclarationList) {
        for(auto& child : node->children) {
            if(child->type == ASTNodeType::LetDeclaration ||
               child->type == ASTNodeType::ConstDeclaration) {
                needsBlockScope = true;
                break;
            }
        }
    }

    std::shared_ptr<Environment> blockEnv = env;
    if(needsBlockScope) {
        // Step 2: Let blockEnv be NewDeclarativeEnvironment(oldEnv).
        blockEnv = env->createChild(true);  // Create block scope
    }

    // 11.2.1: Scan directive prologue for "use strict"
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

    // Step 5: Let blockValue be Completion(Evaluation of StatementList).
    // 14.2.2 StatementList : StatementList StatementListItem
    //   1. Let sl be ? Evaluation of StatementList.
    //   2. Return ? Evaluation of StatementListItem.
    // SIMPLIFIED: Rift evaluates each statement sequentially, returning the last value.
    // The spec uses Completion Records; Rift uses C++ exceptions for abrupt completions.
    Value result = Value::undefined();
    for(auto& child : node->children) {
        result = engine->evaluate(child, blockEnv);
    }
    return result;
}

// 14.5 Expression Statement — Runtime Semantics: Evaluation
// @spec https://tc39.es/ecma262/#sec-expression-statement-runtime-semantics-evaluation
//
// ExpressionStatement : [lookahead not in { {, function, async, class, let [ }] Expression ;
//   1. Let exprRef be ? Evaluation of Expression.
//   2. Return ? GetValue(exprRef).
// SIMPLIFIED: Rift evaluates the child expression directly. The spec's GetValue
// step converts References to values, but Rift's tree-walking model does this
// implicitly during expression evaluation.
Value StatementEvaluator::evaluateExpressionStatement(std::shared_ptr<ASTNode> node,
                                                      std::shared_ptr<Environment> env,
                                                      Rift* engine) {
    if(!node->children.empty()) {
        return engine->evaluate(node->children[0], env);
    }
    return Value::undefined();
}

// 7.4.1 GetIterator / 7.4.2 IteratorNext — extract array elements from a value
// @spec https://tc39.es/ecma262/#sec-getiterator
// SIMPLIFIED: Instead of using the full iterator protocol, Rift reads array-like
// objects via their numeric "length" property and string indexing. Strings are
// iterated character-by-character. This is used as a fallback in array destructuring
// when the full Symbol.iterator protocol is not available.
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

// 14.3.3 Destructuring Binding Patterns — Runtime Semantics: BindingInitialization
// @spec
// https://tc39.es/ecma262/#sec-destructuring-binding-patterns-runtime-semantics-bindinginitialization
//
// Implements:
//   8.6.2 Runtime Semantics: BindingInitialization
//   @spec https://tc39.es/ecma262/#sec-runtime-semantics-bindinginitialization
//   14.3.3.1 Runtime Semantics: PropertyBindingInitialization (ObjectPattern)
//   @spec
//   https://tc39.es/ecma262/#sec-destructuring-binding-patterns-runtime-semantics-propertybindinginitialization
//   14.3.3.3 Runtime Semantics: IteratorBindingInitialization (ArrayPattern)
//   @spec https://tc39.es/ecma262/#sec-runtime-semantics-iteratorbindinginitialization
//
// SIMPLIFIED: The spec uses separate abstract operations for each pattern type.
// Rift combines them into a single recursive function that dispatches on the
// ASTNode type. The iterator protocol steps are inlined for array patterns.
void StatementEvaluator::applyPatternBinding(std::shared_ptr<ASTNode> pattern, const Value& value,
                                             std::shared_ptr<Environment> env, Rift* engine,
                                             VariableType var_type) {
    if(!pattern) {
        return;
    }

    if(pattern->type == ASTNodeType::Identifier) {
        // 8.6.2 BindingInitialization for SingleNameBinding
        // 1. Let bindingId be StringValue of BindingIdentifier.
        // 2. Perform ? InitializeBoundName(bindingId, value, environment).
        env->define(pattern->value, value, var_type);

    } else if(pattern->type == ASTNodeType::ArrayPattern) {
        // 14.3.3.3 IteratorBindingInitialization
        // ArrayBindingPattern : [ Elision_opt BindingRestElement_opt ]
        // Per ECMAScript spec, array destructuring uses the iterator protocol

        // Step: If value is undefined or null, throw TypeError
        // (spec: GetIterator on null/undefined throws)
        if(value.isNull() || value.isUndefined()) {
            auto* factory = engine->getObjectFactory();
            auto* error_obj = factory->createJSObject(BuiltinManager::getTypeErrorPrototype());
            memory::GCProtector protect(error_obj, factory->getObjectManager());
            error_obj->setProperty("name", Value("TypeError"));
            error_obj->setProperty(
                "message",
                Value(value.toString() +
                      " is not iterable (cannot read property Symbol(Symbol.iterator))"));
            throw JavaScriptException(Value(error_obj));
        }

        // 7.4.1 GetIterator ( obj, kind ) — try to get iterator via Symbol.iterator
        // @spec https://tc39.es/ecma262/#sec-getiterator
        // 1. Let method be ? GetMethod(obj, %Symbol.iterator%).
        // 2. If method is undefined, throw a TypeError exception.
        // 3. Return ? Call(method, obj).
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
                    auto* iter_func =
                        dynamic_cast<rift::runtime::JSFunction*>(iterator_method.getObject());
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

        // 7.4.2 IteratorNext ( iteratorRecord [ , value ] )
        // @spec https://tc39.es/ecma262/#sec-iteratornext
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

            auto* next_func = dynamic_cast<rift::runtime::JSFunction*>(next_method.getObject());
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

        // DEVIATION: Fallback to index-based access for objects without Symbol.iterator.
        // The spec requires all array destructuring to go through the iterator protocol.
        // Rift falls back to array-like indexing for compatibility with non-iterable objects.
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
                // BindingRestElement : ... BindingPattern
                // 14.3.3.3 step: Let A be ! ArrayCreate(0).
                // Repeat while iteratorRecord.[[Done]] is false: append next value to A.
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
                // SingleNameBinding : BindingIdentifier Initializer
                // 1. Let v be ? IteratorValue(next).
                // 2. If Initializer is present and v is undefined, then
                //    a. Let defaultValue be ? Evaluation of Initializer.
                //    b. Set v to ? GetValue(defaultValue).
                // 3. Perform ? BindingInitialization of BindingIdentifier with v.
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
        // 14.3.3.1 Runtime Semantics: PropertyBindingInitialization
        // @spec
        // https://tc39.es/ecma262/#sec-destructuring-binding-patterns-runtime-semantics-propertybindinginitialization
        // ObjectBindingPattern : { BindingPropertyList , BindingRestProperty }
        // 1. Perform ? PropertyBindingInitialization of BindingPropertyList with value
        //    and environment.
        // 2. Return ? RestBindingInitialization of BindingRestProperty with value,
        //    excludedNames, and environment.

        // Step: Throw TypeError if value is null or undefined
        // (spec: RequireObjectCoercible would throw on these)
        if(value.isNull() || value.isUndefined()) {
            auto* factory = engine->getObjectFactory();
            auto* error_obj = factory->createJSObject(BuiltinManager::getTypeErrorPrototype());
            memory::GCProtector protect(error_obj, factory->getObjectManager());
            error_obj->setProperty("name", Value("TypeError"));
            error_obj->setProperty("message", Value("Cannot destructure '" + value.toString() +
                                                    "' as it is " + value.toString() + "."));
            throw JavaScriptException(Value(error_obj));
        }

        JSObject* obj = nullptr;
        if(value.isObject()) {
            obj = value.getObject();
        }

        std::unordered_set<std::string> consumed_keys;

        // DEVIATION: Rift stores object pattern children as interleaved key-value pairs
        // (key, value, key, value, ...) rather than the spec's BindingProperty list.
        for(size_t i = 0; i < pattern->children.size(); i += 2) {
            auto& key_node = pattern->children[i];

            if(key_node->type == ASTNodeType::RestElement) {
                // BindingRestProperty : ... BindingIdentifier
                // 1. Let restObj be OrdinaryObjectCreate(%Object.prototype%).
                // 2. For each key in object's own properties not in excludedNames:
                //    a. Perform CreateDataPropertyOrThrow(restObj, key, value).
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

            // BindingProperty : PropertyName : BindingElement
            // 1. Let P be ? Evaluation of PropertyName.
            // 2. Perform ? KeyedBindingInitialization of BindingElement with value,
            //    environment, and P.
            std::string key = key_node->value;
            consumed_keys.insert(key);

            Value prop_value = obj ? obj->getProperty(key) : Value::undefined();

            // Get the value pattern (might be identifier, nested pattern, or assignment pattern)
            auto& value_pattern = pattern->children[i + 1];
            applyPatternBinding(value_pattern, prop_value, env, engine, var_type);
        }

    } else if(pattern->type == ASTNodeType::AssignmentPattern) {
        // SingleNameBinding : BindingIdentifier Initializer
        // @spec https://tc39.es/ecma262/#sec-runtime-semantics-bindinginitialization
        // 1. If v is undefined, let v be ? Evaluation of Initializer.
        // 2. Perform ? BindingInitialization of BindingIdentifier with v and environment.
        if(value.isUndefined() && pattern->children.size() > 1) {
            Value default_val = engine->evaluate(pattern->children[1], env);
            applyPatternBinding(pattern->children[0], default_val, env, engine, var_type);
        } else {
            applyPatternBinding(pattern->children[0], value, env, engine, var_type);
        }
    }
}

// 14.3.2 Variable Statement — Runtime Semantics: Evaluation
// @spec https://tc39.es/ecma262/#sec-variable-statement-runtime-semantics-evaluation
//
// VariableDeclaration : BindingIdentifier Initializer
//   1. Let bindingId be StringValue of BindingIdentifier.
//   2. Let lhs be ? ResolveBinding(bindingId).
//   3. If IsAnonymousFunctionDefinition(Initializer) is true, then
//      a. Let value be ? NamedEvaluation of Initializer with argument bindingId.
//   4. Else,
//      a. Let rhs be ? Evaluation of Initializer.
//      b. Let value be ? GetValue(rhs).
//   5. Perform ? PutValue(lhs, value).
//   6. Return empty.
//
// SIMPLIFIED: Rift uses env->define() which combines ResolveBinding + PutValue.
// Named function evaluation (step 3) is handled by the expression evaluator.
Value StatementEvaluator::evaluateVariableDeclaration(std::shared_ptr<ASTNode> node,
                                                      std::shared_ptr<Environment> env,
                                                      Rift* engine) {
    // 14.3.3 Destructuring: VariableDeclaration : BindingPattern Initializer
    if(node->metadata == "destructuring" && node->children.size() >= 2) {
        auto& pattern = node->children[0];
        // 1. Let rhs be ? Evaluation of Initializer.
        Value value = engine->evaluate(node->children[1], env);
        // 2. Perform ? BindingInitialization of BindingPattern with rhs and environment.
        applyPatternBinding(pattern, value, env, engine, VariableType::Var);
        return value;
    }

    // Simple identifier declaration
    std::string varName = node->value;

    // Step 3-4: Evaluate initializer (or undefined if absent)
    Value value = Value::undefined();
    if(node->children.size() > 0) {
        value = engine->evaluate(node->children[0], env);
    }

    // Step 5: Perform ? PutValue(lhs, value).
    env->define(varName, value, VariableType::Var);
    return value;
}

// 14.3.1 Let and Const Declarations — Runtime Semantics: Evaluation
// @spec https://tc39.es/ecma262/#sec-let-and-const-declarations-runtime-semantics-evaluation
//
// LexicalBinding : BindingIdentifier Initializer
//   1. Let bindingId be StringValue of BindingIdentifier.
//   2. Let lhs be ? ResolveBinding(bindingId).
//   3. If IsAnonymousFunctionDefinition(Initializer) is true, then
//      a. Let value be ? NamedEvaluation of Initializer with argument bindingId.
//   4. Else,
//      a. Let rhs be ? Evaluation of Initializer.
//      b. Let value be ? GetValue(rhs).
//   5. Perform ? InitializeReferencedBinding(lhs, value).
//   6. Return empty.
//
// LexicalBinding : BindingIdentifier (no initializer)
//   1. Let lhs be ? ResolveBinding(StringValue of BindingIdentifier).
//   2. Perform ? InitializeReferencedBinding(lhs, undefined).
//   3. Return empty.
//
// SIMPLIFIED: Rift uses env->define() with VariableType::Let, which combines
// ResolveBinding + InitializeReferencedBinding. The TDZ (Temporal Dead Zone)
// enforcement happens at the Environment level.
Value StatementEvaluator::evaluateLetDeclaration(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine) {
    // 14.3.3 Destructuring: LexicalBinding : BindingPattern Initializer
    if(node->metadata == "destructuring" && node->children.size() >= 2) {
        auto& pattern = node->children[0];
        Value value = engine->evaluate(node->children[1], env);
        applyPatternBinding(pattern, value, env, engine, VariableType::Let);
        return value;
    }

    // Simple identifier declaration
    std::string varName = node->value;

    // Steps 3-4: Evaluate initializer (or undefined if absent)
    Value value = Value::undefined();
    if(node->children.size() > 0) {
        value = engine->evaluate(node->children[0], env);
    }

    // Step 5: Perform ? InitializeReferencedBinding(lhs, value).
    env->define(varName, value, VariableType::Let);
    return value;
}

// 14.3.1 Let and Const Declarations — Runtime Semantics: Evaluation (const)
// @spec https://tc39.es/ecma262/#sec-let-and-const-declarations-runtime-semantics-evaluation
//
// LexicalBinding (const) : BindingIdentifier Initializer
// Same algorithm as let, but the binding is created as immutable (non-writable).
// The spec enforces that const declarations MUST have an initializer at parse time
// (13.3.1 Static Semantics: Early Errors). Rift enforces this at evaluation time.
Value StatementEvaluator::evaluateConstDeclaration(std::shared_ptr<ASTNode> node,
                                                   std::shared_ptr<Environment> env, Rift* engine) {
    // 14.3.3 Destructuring: LexicalBinding : BindingPattern Initializer
    if(node->metadata == "destructuring" && node->children.size() >= 2) {
        auto& pattern = node->children[0];
        Value value = engine->evaluate(node->children[1], env);
        applyPatternBinding(pattern, value, env, engine, VariableType::Const);
        return value;
    }

    // Simple identifier declaration
    std::string varName = node->value;

    // DEVIATION: The spec enforces "const must have initializer" as an Early Error
    // (parse-time). Rift checks it at evaluation time.
    if(node->children.size() == 0) {
        throw std::runtime_error("Missing initializer in const declaration");
    }

    // Steps 3-5: Evaluate initializer and initialize the immutable binding.
    Value value = engine->evaluate(node->children[0], env);
    env->define(varName, value, VariableType::Const);
    return value;
}

// 15.2 Function Definitions — Runtime Semantics: Evaluation
// @spec https://tc39.es/ecma262/#sec-function-definitions-runtime-semantics-evaluation
//
// FunctionDeclaration : function BindingIdentifier ( FormalParameters ) { FunctionBody }
//   1. Return empty.
//   (Note: The spec says FunctionDeclaration evaluation returns empty because
//    the function is instantiated during declaration instantiation, not during
//    evaluation. Rift handles both instantiation and binding here.)
//
// 15.2.4 Runtime Semantics: InstantiateOrdinaryFunctionObject
// @spec https://tc39.es/ecma262/#sec-runtime-semantics-instantiateordinaryfunctionobject
//   1. Let name be StringValue of BindingIdentifier.
//   2. Let sourceText be the source text matched by FunctionDeclaration.
//   3. Let F be OrdinaryFunctionCreate(%Function.prototype%, sourceText,
//      FormalParameters, FunctionBody, NON-LEXICAL-THIS, env).
//   4. Perform SetFunctionName(F, name).
//   5. Perform MakeConstructor(F).
//   6. Return F.
//
// SIMPLIFIED: Rift creates the function and binds it in one step at evaluation
// time, rather than during the spec's declaration instantiation phase. This means
// function hoisting is handled by the parser/environment setup rather than a
// separate instantiation pass.
Value StatementEvaluator::evaluateFunctionDeclaration(std::shared_ptr<ASTNode> node,
                                                      std::shared_ptr<Environment> env,
                                                      Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Step 1 (InstantiateOrdinaryFunctionObject): Let name be StringValue of BindingIdentifier.
    std::string functionName = node->value;

    // 15.1 Parameter Lists — Runtime Semantics: Evaluation
    // @spec https://tc39.es/ecma262/#sec-function-definitions-runtime-semantics-evaluation
    // Each parameter can be: Identifier, AssignmentExpression (default), or Identifier with "rest"
    // metadata
    auto paramList = node->children[0];
    // Store tuples of (param_name, default_value_ast, is_rest, destructuring_pattern)
    std::vector<std::tuple<std::string, std::shared_ptr<ASTNode>, bool, std::shared_ptr<ASTNode>>>
        param_info;
    for(const auto& param : paramList->children) {
        if(param->type == ASTNodeType::ObjectPattern || param->type == ASTNodeType::ArrayPattern) {
            // Destructuring parameter (no default)
            param_info.emplace_back("", nullptr, false, param);
        } else if(param->type == ASTNodeType::AssignmentPattern && param->children.size() >= 2 &&
                  (param->children[0]->type == ASTNodeType::ObjectPattern ||
                   param->children[0]->type == ASTNodeType::ArrayPattern)) {
            // Destructuring parameter with default: ({x, y} = {})
            param_info.emplace_back("", param->children[1], false, param->children[0]);
        } else if(param->type == ASTNodeType::AssignmentExpression) {
            // Parameter with default value: children[0] = name, children[1] = default
            param_info.emplace_back(param->children[0]->value, param->children[1], false, nullptr);
        } else if(param->metadata == "rest") {
            // Rest parameter: ...name
            param_info.emplace_back(param->value, nullptr, true, nullptr);
        } else {
            // Simple identifier parameter (no default)
            param_info.emplace_back(param->value, nullptr, false, nullptr);
        }
    }

    // Step 3 (InstantiateOrdinaryFunctionObject): FunctionBody
    auto body = node->children[1];

    // 11.2.1: Check function body directive prologue for "use strict"
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

    // Step 3: Let F be OrdinaryFunctionCreate(%Function.prototype%, sourceText,
    //         FormalParameters, FunctionBody, NON-LEXICAL-THIS, env).
    // @spec https://tc39.es/ecma262/#sec-ordinaryfunctioncreate
    // SIMPLIFIED: Rift creates a JSFunction with a C++ lambda closure that
    // captures the parsed AST body, parameter info, and the enclosing environment.
    // The spec's [[Environment]], [[FormalParameters]], and [[ECMAScriptCode]]
    // internal slots are all captured in the lambda closure.
    auto func = engine->getObjectFactory()->createJSFunction(
        [engine, param_info, body, env, functionIsStrict](
            const rift::core::CallContext& callContext, const std::vector<Value>& args) -> Value {
            // 10.2.1 [[Call]] ( thisArgument, argumentsList )
            // @spec
            // https://tc39.es/ecma262/#sec-ecmascript-function-objects-call-thisargument-argumentslist
            // 1. Let callerContext be the running execution context.
            // 2. Let calleeContext be PrepareForOrdinaryCall(F, undefined).
            // 3. Perform OrdinaryCallBindThis(F, calleeContext, thisArgument).
            auto funcEnv = std::make_shared<Environment>(env);

            // 10.2.1.2 OrdinaryCallBindThis
            if(functionIsStrict) {
                funcEnv->setStrictMode(true);
            }

            // Step 3 (OrdinaryCallBindThis): Bind 'this' to the function environment
            funcEnv->define("this", callContext.thisValue);

            // 10.2.11 FunctionDeclarationInstantiation ( func, argumentsList )
            // @spec https://tc39.es/ecma262/#sec-functiondeclarationinstantiation
            // SIMPLIFIED: Rift iterates param_info to bind parameters directly.
            // The spec's FunctionDeclarationInstantiation is a 36-step algorithm that
            // handles parameter scoping, arguments object creation, and var/function
            // hoisting. Rift combines these into a simpler loop.
            for(size_t i = 0; i < param_info.size(); ++i) {
                const auto& [param_name, default_ast, is_rest, pattern] = param_info[i];

                if(is_rest) {
                    // Rest parameter: collect all remaining arguments into an array
                    std::vector<Value> rest_args;
                    for(size_t j = i; j < args.size(); ++j) {
                        rest_args.push_back(args[j]);
                    }
                    auto* rest_array =
                        builtins::Array::createArrayObject(engine->getObjectFactory(), rest_args);
                    funcEnv->define(param_name, Value(rest_array));
                } else if(pattern) {
                    // Destructuring parameter: apply pattern binding
                    Value arg_value;
                    bool use_default = (i >= args.size()) || args[i].isUndefined();
                    if(use_default && default_ast) {
                        arg_value = engine->evaluate(default_ast, funcEnv);
                    } else if(i < args.size()) {
                        arg_value = args[i];
                    } else {
                        arg_value = Value::undefined();
                    }
                    StatementEvaluator::applyPatternBinding(pattern, arg_value, funcEnv, engine,
                                                            VariableType::Var);
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

            // 10.2.11 step 27-29: Create the Arguments object
            // @spec https://tc39.es/ecma262/#sec-functiondeclarationinstantiation
            // SIMPLIFIED: The spec distinguishes between "mapped" arguments (sloppy mode,
            // aliased to parameter bindings) and "unmapped" arguments (strict mode).
            // Rift always creates an unmapped-style arguments object.
            auto* argsFactory = engine->getObjectFactory();
            auto* argumentsObj = argsFactory->createJSObject();
            for(size_t i = 0; i < args.size(); ++i) {
                argumentsObj->setProperty(std::to_string(i), args[i]);
            }
            argumentsObj->setProperty("length", Value(static_cast<double>(args.size())));
            funcEnv->define("arguments", Value(argumentsObj));

            // 10.2.1 step 4: Let result be Completion(OrdinaryCallEvaluateBody(F, argumentsList)).
            // 15.2.3 Runtime Semantics: EvaluateBody
            // @spec
            // https://tc39.es/ecma262/#sec-function-definitions-runtime-semantics-evaluatebody
            //   1. Return ? EvaluateBody of FunctionBody with arguments functionObject,
            //   argumentsList.
            // SIMPLIFIED: Rift evaluates the body AST directly, catching ReturnException
            // to handle return statements (the spec uses Completion Records).
            try {
                return engine->evaluate(body, funcEnv);
            } catch(const ReturnException& e) {
                // 10.2.1 step 6: If result.[[Type]] is return, return result.[[Value]].
                return e.getValue();
            } catch(const std::runtime_error& e) {
                // Handle other runtime errors
                throw;
            }
        });

    // Step 4 (InstantiateOrdinaryFunctionObject): Perform SetFunctionName(F, name).
    // 10.2.9 SetFunctionName ( F, name [ , prefix ] )
    // @spec https://tc39.es/ecma262/#sec-setfunctionname
    func->defineProperty("name",
                         runtime::PropertyDescriptor(Value(functionName), false, false, true));

    // 10.2.8 SetFunctionLength ( F, length )
    // @spec https://tc39.es/ecma262/#sec-setfunctionlength
    // The "length" property is the number of formal parameters before the first
    // rest parameter or parameter with a default value (ExpectedArgumentCount).
    size_t formal_params = 0;
    for(const auto& pi : param_info) {
        if(std::get<2>(pi))
            break;  // rest param
        if(std::get<1>(pi) != nullptr)
            break;  // default param
        formal_params++;
    }
    func->defineProperty(
        "length",
        runtime::PropertyDescriptor(Value(static_cast<double>(formal_params)), false, false, true));

    // Bind the function name in the enclosing environment.
    // SIMPLIFIED: The spec does this during declaration instantiation (hoisting),
    // not during FunctionDeclaration evaluation. In the spec, FunctionDeclaration
    // evaluation returns NormalCompletion(empty).
    env->define(functionName, Value(func));

    return Value(func);
}

// 15.5 Generator Function Definitions — Runtime Semantics: Evaluation
// @spec https://tc39.es/ecma262/#sec-generator-function-definitions-runtime-semantics-evaluation
//
// GeneratorDeclaration : function * BindingIdentifier ( FormalParameters ) { GeneratorBody }
//   1. Return empty.
//   (Like FunctionDeclaration, the spec instantiates generators during declaration
//    instantiation, not during evaluation.)
//
// 15.5.3 Runtime Semantics: InstantiateGeneratorFunctionObject
// @spec https://tc39.es/ecma262/#sec-runtime-semantics-instantiategeneratorfunctionobject
//   1. Let name be StringValue of BindingIdentifier.
//   2. Let sourceText be the source text matched by GeneratorDeclaration.
//   3. Let F be OrdinaryFunctionCreate(%GeneratorFunction.prototype%, sourceText,
//      FormalParameters, GeneratorBody, NON-LEXICAL-THIS, env).
//   4. Perform SetFunctionName(F, name).
//   5. Let prototype be OrdinaryObjectCreate(%GeneratorFunction.prototype.prototype%).
//   6. Perform ! DefinePropertyOrThrow(F, "prototype", PropertyDescriptor { ... }).
//   7. Return F.
//
// SIMPLIFIED: Rift creates a regular JSFunction whose call body creates and returns
// a GeneratorIterator. The spec creates a GeneratorFunction with special internal
// methods. Rift does not implement %GeneratorFunction.prototype%.
Value StatementEvaluator::evaluateGeneratorFunctionDeclaration(std::shared_ptr<ASTNode> node,
                                                               std::shared_ptr<Environment> env,
                                                               Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Step 1: Let name be StringValue of BindingIdentifier.
    std::string functionName = node->value;

    // Parse formal parameters
    auto paramList = node->children[0];
    std::vector<std::string> param_names;
    std::vector<std::tuple<std::string, std::shared_ptr<ASTNode>, bool, std::shared_ptr<ASTNode>>>
        param_info;

    for(const auto& param : paramList->children) {
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

    // GeneratorBody
    auto body = node->children[1];

    // Step 3: Let F be OrdinaryFunctionCreate(...)
    // SIMPLIFIED: When called, the generator function creates a GeneratorIterator
    // rather than using the spec's GeneratorStart / GeneratorResume abstract operations.
    auto* func = engine->getObjectFactory()->createJSFunction(
        [engine, param_info, param_names, body, env](const rift::core::CallContext& call_context,
                                                     const std::vector<Value>& args) -> Value {
            // 27.5.3.2 GeneratorFunction [[Call]]
            // Generator functions cannot be used as constructors
            if(call_context.type == rift::core::CallType::Constructor) {
                throw JavaScriptException(Value("TypeError: Generator cannot be called with new"));
            }

            // 10.2.11 FunctionDeclarationInstantiation — bind parameters
            std::vector<Value> processed_args;
            auto func_env = std::make_shared<Environment>(env);

            for(size_t i = 0; i < param_info.size(); ++i) {
                const auto& [param_name, default_ast, is_rest, pattern] = param_info[i];

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

            // 27.5.3.2 step 7: Let genContext be a new execution context.
            // 27.5.3.3 GeneratorStart ( generator, generatorBody )
            // @spec https://tc39.es/ecma262/#sec-generatorstart
            // SIMPLIFIED: Rift creates a GeneratorIterator object that holds the
            // AST body and environment, implementing lazy evaluation via coroutine-like
            // suspend/resume rather than the spec's GeneratorStart/GeneratorResume.
            auto* generator = builtins::GeneratorIterator::create(
                engine->getObjectFactory(), body, env, engine, param_names, processed_args);

            return Value(generator);
        });

    // Step 4: Perform SetFunctionName(F, name).
    func->setProperty("name", Value(functionName));

    // SetFunctionLength: number of parameters
    func->setProperty("length", Value(static_cast<double>(param_names.size())));

    // Bind generator function in enclosing environment
    env->define(functionName, Value(func));

    return Value(func);
}

// 15.8 Async Function Definitions — Runtime Semantics: Evaluation
// @spec https://tc39.es/ecma262/#sec-async-function-definitions-runtime-semantics-evaluation
//
// AsyncFunctionDeclaration : async function BindingIdentifier ( FormalParameters )
//                            { AsyncFunctionBody }
//   1. Return empty.
//
// 15.8.4 Runtime Semantics: InstantiateAsyncFunctionObject
// @spec https://tc39.es/ecma262/#sec-runtime-semantics-instantiateasyncfunctionobject
//   1. Let name be StringValue of BindingIdentifier.
//   2. Let sourceText be the source text matched by AsyncFunctionDeclaration.
//   3. Let F be OrdinaryFunctionCreate(%AsyncFunction.prototype%, sourceText,
//      FormalParameters, AsyncFunctionBody, NON-LEXICAL-THIS, env).
//   4. Perform SetFunctionName(F, name).
//   5. Return F.
//
// SIMPLIFIED: Rift creates a regular JSFunction whose call body creates a Promise
// and delegates to AsyncExecutor for await support. The spec uses
// %AsyncFunction.prototype% and the async-from-sync iterator protocol.
Value StatementEvaluator::evaluateAsyncFunctionDeclaration(std::shared_ptr<ASTNode> node,
                                                           std::shared_ptr<Environment> env,
                                                           Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Step 1: Let name be StringValue of BindingIdentifier.
    std::string functionName = node->value;

    // Parse formal parameters
    auto paramList = node->children[0];
    std::vector<std::tuple<std::string, std::shared_ptr<ASTNode>, bool, std::shared_ptr<ASTNode>>>
        param_info;
    for(const auto& param : paramList->children) {
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

    // AsyncFunctionBody
    auto body = node->children[1];

    // 11.2.1: Check function body directive prologue for "use strict"
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

    // Step 3: Let F be OrdinaryFunctionCreate(...)
    // 15.8.3 Runtime Semantics: EvaluateAsyncFunctionBody
    // @spec https://tc39.es/ecma262/#sec-runtime-semantics-evaluateasyncfunctionbody
    //   1. Let promiseCapability be ! NewPromiseCapability(%Promise%).
    //   2. Let declResult be Completion(FunctionDeclarationInstantiation(functionObject,
    //   argumentsList)).
    //   3. If declResult is an abrupt completion, then
    //      a. Perform ! Call(promiseCapability.[[Reject]], undefined, << declResult.[[Value]] >>).
    //   4. Else,
    //      a. Perform AsyncFunctionStart(promiseCapability, FunctionBody).
    //   5. Return Completion Record { [[Type]]: return, [[Value]]: promiseCapability.[[Promise]] }.
    //
    // SIMPLIFIED: Rift creates a Promise eagerly and delegates to AsyncExecutor,
    // which handles await expressions by suspending/resuming evaluation.
    auto* func = engine->getObjectFactory()->createJSFunction(
        [engine, param_info, body, env, functionIsStrict](
            const rift::core::CallContext& callContext, const std::vector<Value>& args) -> Value {
            // Step 1: Let promiseCapability be ! NewPromiseCapability(%Promise%).
            auto* factory = engine->getObjectFactory();
            auto* promise_obj = builtins::Promise::createPromiseObject(factory);
            memory::GCProtector protect(promise_obj, factory->getObjectManager());

            // Step 2: FunctionDeclarationInstantiation
            auto funcEnv = std::make_shared<Environment>(env);

            if(functionIsStrict) {
                funcEnv->setStrictMode(true);
            }

            // OrdinaryCallBindThis: bind 'this'
            funcEnv->define("this", callContext.thisValue);

            // 10.2.11 FunctionDeclarationInstantiation — bind parameters
            for(size_t i = 0; i < param_info.size(); ++i) {
                const auto& [param_name, default_ast, is_rest, pattern] = param_info[i];

                if(is_rest) {
                    std::vector<Value> rest_args;
                    for(size_t j = i; j < args.size(); ++j) {
                        rest_args.push_back(args[j]);
                    }
                    auto* rest_array =
                        builtins::Array::createArrayObject(engine->getObjectFactory(), rest_args);
                    funcEnv->define(param_name, Value(rest_array));
                } else if(pattern) {
                    Value arg_value;
                    bool use_default = (i >= args.size()) || args[i].isUndefined();
                    if(use_default && default_ast) {
                        arg_value = engine->evaluate(default_ast, funcEnv);
                    } else if(i < args.size()) {
                        arg_value = args[i];
                    } else {
                        arg_value = Value::undefined();
                    }
                    applyPatternBinding(pattern, arg_value, funcEnv, engine, VariableType::Var);
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

            // 10.2.11 step 27-29: Create arguments object
            auto* argsFactory = engine->getObjectFactory();
            auto* argumentsObj = argsFactory->createJSObject();
            for(size_t i = 0; i < args.size(); ++i) {
                argumentsObj->setProperty(std::to_string(i), args[i]);
            }
            argumentsObj->setProperty("length", Value(static_cast<double>(args.size())));
            funcEnv->define("arguments", Value(argumentsObj));

            // Step 4a: Perform AsyncFunctionStart(promiseCapability, FunctionBody).
            // @spec
            // https://tc39.es/ecma262/#sec-async-functions-abstract-operations-async-function-start
            // SIMPLIFIED: Rift delegates to AsyncExecutor which evaluates the body,
            // resolving/rejecting the promise based on completion, and supporting
            // await expressions by pausing/resuming evaluation.
            AsyncExecutor::executeAsync(body, funcEnv, engine, promise_obj);

            // Step 5: Return promiseCapability.[[Promise]].
            return Value(promise_obj);
        });

    // Step 4 (InstantiateAsyncFunctionObject): Perform SetFunctionName(F, name).
    func->setProperty("name", Value(functionName));
    // SetFunctionLength
    func->setProperty("length", Value(static_cast<double>(param_info.size())));

    // Bind async function in enclosing environment
    env->define(functionName, Value(func));

    return Value(func);
}

// 15.7 Class Definitions — Runtime Semantics: Evaluation
// @spec https://tc39.es/ecma262/#sec-class-definitions-runtime-semantics-evaluation
//
// ClassDeclaration : class BindingIdentifier ClassTail
//   1. Perform ? BindingClassDeclarationEvaluation of ClassDeclaration.
//   2. Return empty.
//
// 15.7.14 Runtime Semantics: ClassDefinitionEvaluation
// @spec https://tc39.es/ecma262/#sec-runtime-semantics-classdefinitionevaluation
//   1. Let env be the LexicalEnvironment of the running execution context.
//   2. Let classEnv be NewDeclarativeEnvironment(env).
//   3. If classBinding is not undefined, then
//      a. Perform ! classEnv.CreateImmutableBinding(classBinding, true).
//   4. ... (evaluate heritage, create prototype, define methods/fields)
//   5. Perform ? DefineMethod of MethodDefinition (for constructor).
//   6. For each ClassElement in order, perform ClassElementEvaluation.
//   7. Set the running execution context's LexicalEnvironment to env.
//   8. If classBinding is not undefined, then
//      a. Perform ! classEnv.InitializeBinding(classBinding, F).
//   9. Return F.
//
// SIMPLIFIED: Rift delegates class construction to ClassBuilder::buildClass(),
// which handles superclass evaluation, prototype chain setup, constructor
// creation, method definitions (including getters/setters and static methods),
// and computed property names. The spec's 20+ step algorithm is encapsulated
// in ClassBuilder rather than inline here.
Value StatementEvaluator::evaluateClassDeclaration(std::shared_ptr<ASTNode> node,
                                                   std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Step 1: Let className be StringValue of BindingIdentifier.
    std::string class_name = node->value;
    auto superclass_node = node->children[0];
    auto class_body = node->children[1];

    // Steps 4-8 of ClassDefinitionEvaluation (delegated to ClassBuilder)
    auto* constructor =
        ClassBuilder::buildClass(class_name, superclass_node, class_body, env, engine, true);

    // BindingClassDeclarationEvaluation step 3:
    // Perform ? InitializeBoundName(className, value, env).
    env->define(class_name, Value(constructor));

    return Value(constructor);
}

}  // namespace rift::core
