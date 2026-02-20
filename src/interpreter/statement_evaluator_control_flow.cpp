// ============================================================================
// ECMA-262 -- Control Flow Statement Evaluation (Chapter 14)
// Implements Runtime Semantics: Evaluation for control flow statements:
//   - Conditional: if (14.6)
//   - Iteration: while, do-while, for, for-in, for-of (14.7)
//   - Selection: switch (14.12)
//   - Jump: break, continue, return (14.8-14.10)
//   - for-await-of (14.7.5, async iteration)
// @spec https://tc39.es/ecma262/#sec-ecmascript-language-statements-and-declarations
//
// SIMPLIFIED: The spec uses Completion Records (with [[Type]], [[Value]], [[Target]])
// to represent normal vs abrupt completions (break, continue, return, throw).
// Rift uses C++ exceptions (BreakException, ContinueException, ReturnException,
// JavaScriptException) to model abrupt completions. This is functionally equivalent
// but means the "catch" sites differ from where the spec checks completion types.
//
// See also: statement_evaluator.cpp (declarations, blocks, destructuring)
//           statement_evaluator_exceptions.cpp (throw, try-catch-finally)
// ============================================================================

#include <cmath>

#include "rift/builtins/array/array.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/interpreter/engine.h"
#include "rift/interpreter/evaluation_utils.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/interpreter/statement_evaluator.h"
#include "rift/types/object.h"

namespace rift::core {

// 14.6 The if Statement — Runtime Semantics: Evaluation
// @spec https://tc39.es/ecma262/#sec-if-statement-runtime-semantics-evaluation
//
// IfStatement : if ( Expression ) Statement else Statement
//   1. Let exprRef be ? Evaluation of Expression.
//   2. Let exprValue be ToBoolean(? GetValue(exprRef)).
//   3. If exprValue is true, then
//      a. Let stmtCompletion be Completion(Evaluation of the first Statement).
//   4. Else,
//      a. Let stmtCompletion be Completion(Evaluation of the second Statement).
//   5. Return ? UpdateEmpty(stmtCompletion, undefined).
//
// IfStatement : if ( Expression ) Statement
//   1. Let exprRef be ? Evaluation of Expression.
//   2. Let exprValue be ToBoolean(? GetValue(exprRef)).
//   3. If exprValue is false, then
//      a. Return undefined.
//   4. Else,
//      a. Let stmtCompletion be Completion(Evaluation of Statement).
//      b. Return ? UpdateEmpty(stmtCompletion, undefined).
Value StatementEvaluator::evaluateIfStatement(std::shared_ptr<ASTNode> node,
                                              std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Step 1-2: Let exprValue be ToBoolean(? GetValue(? Evaluation of Expression)).
    Value condition = engine->evaluate(node->children[0], env);

    // Step 3: If exprValue is true, evaluate the then branch
    if(condition.toBool()) {
        return engine->evaluate(node->children[1], env);
    }

    // Step 4: Else, evaluate the else branch (if present)
    if(node->children.size() > 2) {
        return engine->evaluate(node->children[2], env);
    }

    // Step 3a (no-else form): Return undefined.
    return Value::undefined();
}

// 14.7.2 The while Statement — Runtime Semantics: WhileLoopEvaluation
// @spec https://tc39.es/ecma262/#sec-while-statement-runtime-semantics-labelledevaluation
//
// WhileStatement : while ( Expression ) Statement
//   1. Let V be undefined.
//   2. Repeat,
//      a. Let exprRef be ? Evaluation of Expression.
//      b. Let exprValue be ToBoolean(? GetValue(exprRef)).
//      c. If exprValue is false, return V.
//      d. Let stmtResult be Completion(Evaluation of Statement).
//      e. If LoopContinues(stmtResult, labelSet) is false, return ? UpdateEmpty(stmtResult, V).
//      f. If stmtResult.[[Value]] is not empty, set V to stmtResult.[[Value]].
//
// SIMPLIFIED: Rift uses BreakException/ContinueException instead of Completion Records
// to handle break/continue. The spec's LoopContinues check is implicit in the catch blocks.
Value StatementEvaluator::evaluateWhileStatement(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Step 1: Let V be undefined.
    Value result = Value::undefined();

    // Step 2: Repeat,
    while(true) {
        // Step 2a-b: Let exprValue be ToBoolean(? GetValue(? Evaluation of Expression)).
        Value condition = engine->evaluate(node->children[0], env);
        // Step 2c: If exprValue is false, return V.
        if(!condition.toBool()) {
            break;
        }
        // Step 2d: Let stmtResult be Completion(Evaluation of Statement).
        try {
            result = engine->evaluate(node->children[1], env);
        } catch(const BreakException&) {
            // Step 2e: If stmtResult is break, return V.
            break;
        } catch(const ContinueException&) {
            // Step 2e: If stmtResult is continue, skip to next iteration.
            continue;
        }
    }

    return result;
}

// 14.7.1 The do-while Statement — Runtime Semantics: DoWhileLoopEvaluation
// @spec https://tc39.es/ecma262/#sec-do-while-statement-runtime-semantics-labelledevaluation
//
// DoWhileStatement : do Statement while ( Expression ) ;
//   1. Let V be undefined.
//   2. Repeat,
//      a. Let stmtResult be Completion(Evaluation of Statement).
//      b. If LoopContinues(stmtResult, labelSet) is false,
//         return ? UpdateEmpty(stmtResult, V).
//      c. If stmtResult.[[Value]] is not empty, set V to stmtResult.[[Value]].
//      d. Let exprRef be ? Evaluation of Expression.
//      e. Let exprValue be ToBoolean(? GetValue(exprRef)).
//      f. If exprValue is false, return V.
//
// SIMPLIFIED: Rift uses BreakException/ContinueException instead of Completion Records.
Value StatementEvaluator::evaluateDoWhileStatement(std::shared_ptr<ASTNode> node,
                                                   std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Step 1: Let V be undefined.
    Value result = Value::undefined();

    // Step 2: Repeat,
    do {
        // Step 2a: Let stmtResult be Completion(Evaluation of Statement).
        try {
            result = engine->evaluate(node->children[0], env);  // body is first child
        } catch(const BreakException&) {
            // Step 2b: If stmtResult is break, return V.
            break;
        } catch(const ContinueException&) {
            // Step 2b: If stmtResult is continue, skip to condition check.
        }

        // Step 2d-e: Let exprValue be ToBoolean(? GetValue(? Evaluation of Expression)).
        Value condition = engine->evaluate(node->children[1], env);  // condition is second child
        // Step 2f: If exprValue is false, return V.
        if(!condition.toBool()) {
            break;
        }
    } while(true);

    return result;
}

// 14.7.4.2 Runtime Semantics: ForLoopEvaluation
// @spec https://tc39.es/ecma262/#sec-for-statement-runtime-semantics-labelledevaluation
//
// ForStatement : for ( Expression_opt ; Expression_opt ; Expression_opt ) Statement
//   1. If the first Expression is present, then
//      a. Let exprRef be ? Evaluation of the first Expression.
//      b. Perform ? GetValue(exprRef).
//   2. Let V be undefined.
//   3. Repeat,
//      a. If the second Expression is present, then
//         i. Let exprRef be ? Evaluation of the second Expression.
//         ii. Let exprValue be ToBoolean(? GetValue(exprRef)).
//         iii. If exprValue is false, return V.
//      b. Let stmtResult be Completion(Evaluation of Statement).
//      c. If LoopContinues(stmtResult, labelSet) is false,
//         return ? UpdateEmpty(stmtResult, V).
//      d. If stmtResult.[[Value]] is not empty, set V to stmtResult.[[Value]].
//      e. If the third Expression is present, then
//         i. Let incRef be ? Evaluation of the third Expression.
//         ii. Perform ? GetValue(incRef).
//
// SIMPLIFIED: Rift evaluates init directly rather than through ForDeclaration.
// The spec has a separate path for `for (var/let/const ...)` with per-iteration
// environment creation for let/const. Rift does not create per-iteration scopes
// for for-loops (only for for-of/for-in).
Value StatementEvaluator::evaluateForStatement(std::shared_ptr<ASTNode> node,
                                               std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() < 4) {
        return Value::undefined();
    }

    // Step 2: Let V be undefined.
    Value result = Value::undefined();

    // Step 1: Evaluate initialization (can be null for empty initialization)
    if(node->children[0] != nullptr) {
        engine->evaluate(node->children[0], env);
    }

    // Step 3: Repeat,
    while(true) {
        // Step 3a: Check condition (if present)
        if(node->children[1] != nullptr) {
            Value condition = engine->evaluate(node->children[1], env);
            // Step 3a.iii: If exprValue is false, return V.
            if(!condition.toBool()) {
                break;
            }
        }
        // If no condition, loop infinitely (unless break/return is encountered)

        // Step 3b: Let stmtResult be Completion(Evaluation of Statement).
        try {
            result = engine->evaluate(node->children[3], env);
        } catch(const BreakException&) {
            // Step 3c: If stmtResult is break, return V.
            break;
        } catch(const ContinueException&) {
            // Step 3c: If stmtResult is continue, run update then next iteration.
            // Step 3e: Execute update expression
            if(node->children[2] != nullptr) {
                engine->evaluate(node->children[2], env);
            }
            continue;
        }

        // Step 3e: Execute update expression (if present)
        if(node->children[2] != nullptr) {
            engine->evaluate(node->children[2], env);
        }
    }

    return result;
}

// 14.7.5 The for-in Statement — Runtime Semantics: ForIn/OfBodyEvaluation
// @spec https://tc39.es/ecma262/#sec-runtime-semantics-forin-div-ofbodyevaluation
//
// ForInOfStatement : for ( LeftHandSideExpression in AssignmentExpression ) Statement
//   ForIn/OfHeadEvaluation:
//     1. Let exprRef be ? Evaluation of AssignmentExpression.
//     2. Let exprValue be ? GetValue(exprRef).
//     3. If exprValue is undefined or null, return Completion Record { break }.
//     4. Let obj be ! ToObject(exprValue).
//     5. Let iterator be EnumerateObjectProperties(obj).
//   ForIn/OfBodyEvaluation:
//     1. Let V be undefined.
//     2. Repeat,
//        a. Let nextResult be ? Call(iterator.next).
//        b. If nextResult.done is true, return V.
//        c. Let nextValue be nextResult.value.
//        d. Perform lhsRef assignment with nextValue.
//        e. Let stmtResult be Completion(Evaluation of Statement).
//        f. If LoopContinues(stmtResult, labelSet) is false, return.
//        g. If stmtResult.[[Value]] is not empty, set V to stmtResult.[[Value]].
//
// SIMPLIFIED: Rift uses getOwnPropertyNames() instead of the spec's
// EnumerateObjectProperties which includes inherited enumerable string properties.
// The spec also filters out non-enumerable properties; Rift iterates all own properties.
// INCOMPLETE: Prototype chain enumeration not implemented (only own properties).
Value StatementEvaluator::evaluateForInStatement(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() < 3) {
        return Value::undefined();
    }

    auto left_node = node->children[0];   // Variable declaration or identifier (LHS)
    auto right_node = node->children[1];  // Object to iterate (RHS)
    auto body_node = node->children[2];   // Loop body

    // Step 1 (ForIn/OfBodyEvaluation): Let V be undefined.
    Value result = Value::undefined();

    // ForIn/OfHeadEvaluation step 1-2: Evaluate the expression
    Value obj_value = engine->evaluate(right_node, env);

    // Detect destructuring pattern for LHS
    bool is_destructuring = false;
    std::shared_ptr<ASTNode> pattern;
    VariableType var_type = VariableType::Var;

    if((left_node->type == ASTNodeType::VariableDeclaration ||
        left_node->type == ASTNodeType::LetDeclaration ||
        left_node->type == ASTNodeType::ConstDeclaration) &&
       left_node->metadata == "destructuring" && !left_node->children.empty()) {
        is_destructuring = true;
        pattern = left_node->children[0];
        if(left_node->type == ASTNodeType::LetDeclaration) {
            var_type = VariableType::Let;
        } else if(left_node->type == ASTNodeType::ConstDeclaration) {
            var_type = VariableType::Const;
        }
    } else if(left_node->type == ASTNodeType::ArrayPattern ||
              left_node->type == ASTNodeType::ObjectPattern ||
              left_node->type == ASTNodeType::ArrayLiteral ||
              left_node->type == ASTNodeType::ObjectLiteral) {
        // ArrayLiteral/ObjectLiteral in LHS position are cover grammar for
        // destructuring assignment patterns (13.15.1 Static Semantics: Early Errors).
        is_destructuring = true;
        pattern = left_node;
    }

    if(!is_destructuring) {
        // Simple variable/reference binding path
        // ForIn/OfBodyEvaluation step 2d: Perform lhsRef assignment with key
        std::string var_name;
        bool is_member_lhs = false;

        if(left_node->type == ASTNodeType::VariableDeclaration ||
           left_node->type == ASTNodeType::LetDeclaration ||
           left_node->type == ASTNodeType::ConstDeclaration) {
            var_name = left_node->value;
            // DEVIATION: const in for-in should create a new binding per iteration.
            // Rift defines it once as Let to allow reassignment across iterations.
            if(left_node->type == ASTNodeType::LetDeclaration) {
                env->define(var_name, Value::undefined(), VariableType::Let);
            } else if(left_node->type == ASTNodeType::ConstDeclaration) {
                env->define(var_name, Value::undefined(), VariableType::Let);
            } else {
                env->define(var_name, Value::undefined());
            }
        } else if(left_node->type == ASTNodeType::Identifier) {
            var_name = left_node->value;
        } else if(left_node->type == ASTNodeType::MemberExpression) {
            is_member_lhs = true;
        } else {
            return Value::undefined();
        }

        // Helper to assign the iteration key to the LHS reference
        auto assignKey = [&](const Value& key_value) {
            if(is_member_lhs) {
                // MemberExpression LHS: evaluate object and set property
                Value object = engine->evaluate(left_node->children[0], env);
                if(object.isObject() || object.isFunction()) {
                    auto* target = object.getObject();
                    if(target) {
                        std::string prop;
                        if(left_node->metadata == "computed" ||
                           left_node->metadata == "computed-optional") {
                            Value prop_val = engine->evaluate(left_node->children[1], env);
                            prop = prop_val.toString();
                        } else {
                            prop = left_node->children[1]->value;
                        }
                        target->setProperty(prop, key_value);
                    }
                }
            } else {
                env->set(var_name, key_value);
            }
        };

        // ForIn/OfHeadEvaluation step 5: Let iterator be EnumerateObjectProperties(obj).
        // Step 2: Repeat (iterate over enumerable property keys)
        if(obj_value.isObject() || obj_value.isFunction()) {
            auto* obj = obj_value.getObject();
            if(obj) {
                auto keys = obj->getOwnPropertyNames();
                for(const auto& key : keys) {
                    // Step 2d: Assign key to loop variable
                    assignKey(Value(key));
                    // Step 2e: Let stmtResult be Completion(Evaluation of Statement).
                    try {
                        result = engine->evaluate(body_node, env);
                    } catch(const BreakException&) {
                        break;
                    } catch(const ContinueException&) {
                        continue;
                    }
                }
            }
        } else if(obj_value.isString()) {
            // String enumeration: iterate over character indices
            std::string str = obj_value.toString();
            for(size_t i = 0; i < str.length(); i++) {
                assignKey(Value(std::to_string(i)));
                try {
                    result = engine->evaluate(body_node, env);
                } catch(const BreakException&) {
                    break;
                } catch(const ContinueException&) {
                    continue;
                }
            }
        }
    } else {
        // Destructuring path — ForIn/OfBodyEvaluation with DestructuringAssignmentTarget
        // For var: bind into outer env; for let/const: per-iteration child env
        // (spec step 2d uses BindingInitialization for destructuring patterns)
        auto bindAndExecute = [&](const Value& key_value) -> bool {
            if(var_type == VariableType::Var) {
                applyPatternBinding(pattern, key_value, env, engine, var_type);
                try {
                    result = engine->evaluate(body_node, env);
                } catch(const BreakException&) {
                    return true;  // signal break
                } catch(const ContinueException&) {
                    // continue
                }
            } else {
                auto iter_env = std::make_shared<Environment>(env);
                applyPatternBinding(pattern, key_value, iter_env, engine, var_type);
                try {
                    result = engine->evaluate(body_node, iter_env);
                } catch(const BreakException&) {
                    return true;
                } catch(const ContinueException&) {
                    // continue
                }
            }
            return false;
        };

        if(obj_value.isObject() || obj_value.isFunction()) {
            auto* obj = obj_value.getObject();
            if(obj) {
                auto keys = obj->getOwnPropertyNames();
                for(const auto& key : keys) {
                    if(bindAndExecute(Value(key))) {
                        break;
                    }
                }
            }
        } else if(obj_value.isString()) {
            std::string str = obj_value.toString();
            for(size_t i = 0; i < str.length(); i++) {
                if(bindAndExecute(Value(std::to_string(i)))) {
                    break;
                }
            }
        }
    }

    return result;
}

// 7.4.1 GetIterator ( obj, kind ) / 7.4.2 IteratorNext ( iteratorRecord )
// @spec https://tc39.es/ecma262/#sec-getiterator
// @spec https://tc39.es/ecma262/#sec-iteratornext
//
// Collects all values from an iterable into a vector.
// 7.4.1 GetIterator ( obj, kind )
// @spec https://tc39.es/ecma262/#sec-getiterator
//
// Holds the iterator object and its next method for lazy iteration.
// Used by for-of to consume one value at a time per loop iteration.
struct IteratorRecord {
    Value iterator;          // The iterator object
    JSObject* iterator_obj;  // Raw pointer for property access
    Value next_method;       // Cached next() method

    bool valid() const {
        return iterator_obj != nullptr;
    }
};

// 7.4.8 IteratorClose ( iteratorRecord, completion )
// @spec https://tc39.es/ecma262/#sec-iteratorclose
//
// Calls the iterator's return() method if it exists, to signal early termination.
static void iteratorClose(const IteratorRecord& record) {
    if(!record.valid())
        return;

    Value return_method = record.iterator_obj->getProperty("return");
    if(return_method.isUndefined() || return_method.isNull() || !return_method.isFunction()) {
        return;
    }

    auto* return_func = dynamic_cast<JSFunction*>(return_method.getObject());
    if(!return_func)
        return;

    CallContext ctx(CallType::Function, record.iterator);
    return_func->call(ctx, {});
}

// 7.4.2 IteratorNext ( iteratorRecord [ , value ] )
// @spec https://tc39.es/ecma262/#sec-iteratornext
//
// Calls next() on the iterator. Returns {done, value} as a pair.
// Returns {true, undefined} when iteration is complete.
static std::pair<bool, Value> iteratorNext(const IteratorRecord& record) {
    if(!record.next_method.isFunction()) {
        return {true, Value::undefined()};
    }

    auto* next_func = dynamic_cast<JSFunction*>(record.next_method.getObject());
    if(!next_func) {
        return {true, Value::undefined()};
    }

    CallContext next_ctx(CallType::Function, record.iterator);
    Value result = next_func->call(next_ctx, {});

    if(!result.isObject()) {
        return {true, Value::undefined()};
    }

    auto* result_obj = result.getObject();
    Value done = result_obj->getProperty("done");
    if(done.toBool()) {
        return {true, Value::undefined()};
    }

    Value value = result_obj->getProperty("value");
    return {false, value};
}

// Gets an IteratorRecord from an iterable value via Symbol.iterator protocol.
// Returns an invalid record if the value is not iterable via Symbol.iterator.
static IteratorRecord getIterator(const Value& iterable) {
    IteratorRecord record{Value::undefined(), nullptr, Value::undefined()};

    if(!iterable.isObject() && !iterable.isFunction()) {
        return record;
    }

    auto* obj = iterable.getObject();
    if(!obj)
        return record;

    std::string iterator_key =
        EvaluationUtils::symbolToPropertyKey(builtins::Symbol::getIteratorId());
    Value iterator_method = obj->getProperty(iterator_key);

    if(iterator_method.isUndefined() || !iterator_method.isFunction()) {
        return record;
    }

    auto* iterator_func = dynamic_cast<JSFunction*>(iterator_method.getObject());
    if(!iterator_func)
        return record;

    CallContext ctx(CallType::Function, iterable);
    Value iterator = iterator_func->call(ctx, {});

    if(!iterator.isObject())
        return record;

    record.iterator = iterator;
    record.iterator_obj = iterator.getObject();
    record.next_method = record.iterator_obj->getProperty("next");
    return record;
}

// Eagerly collects string characters for for-of iteration.
// Strings don't use the iterator protocol in Rift (DEVIATION from spec).
static std::vector<Value> getStringValues(const Value& iterable) {
    std::vector<Value> values;
    std::string str = iterable.getString();
    for(char c : str) {
        values.push_back(Value(std::string(1, c)));
    }
    return values;
}

// 14.7.5 The for-of Statement — Runtime Semantics: ForIn/OfBodyEvaluation
// @spec https://tc39.es/ecma262/#sec-runtime-semantics-forin-div-ofbodyevaluation
//
// ForInOfStatement : for ( ForDeclaration of AssignmentExpression ) Statement
//   ForIn/OfHeadEvaluation:
//     1. Let exprRef be ? Evaluation of AssignmentExpression.
//     2. Let exprValue be ? GetValue(exprRef).
//     3. Let iteratorRecord be ? GetIterator(exprValue, SYNC).
//   ForIn/OfBodyEvaluation:
//     1. Let V be undefined.
//     2. Repeat,
//        a. Let nextResult be ? Call(iteratorRecord.[[NextMethod]], ...).
//        b. If nextResult.done is true, return V.
//        c. Let nextValue be ? IteratorValue(nextResult).
//        d. If iterationKind is ENUMERATE or ITERATE, then
//           i. Perform lhsRef assignment / BindingInitialization with nextValue.
//        e. Let stmtResult be Completion(Evaluation of Statement).
//        f. If LoopContinues(stmtResult, labelSet) is false, then
//           i. Set status to ? UpdateEmpty(stmtResult, V).
//           ii. If iteratorKind is ASYNC, return ? AsyncIteratorClose(iteratorRecord, status).
//           iii. Return ? IteratorClose(iteratorRecord, status).
//        g. If stmtResult.[[Value]] is not empty, set V to stmtResult.[[Value]].
//
// DEVIATION: For strings, Rift eagerly collects characters into a vector rather
// than using a StringIterator object. For objects, Rift uses lazy iteration via
// the Symbol.iterator protocol, with IteratorClose on early exit (break/throw/return).
Value StatementEvaluator::evaluateForOfStatement(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() < 3) {
        return Value::undefined();
    }

    auto left_node = node->children[0];   // ForDeclaration or LeftHandSideExpression
    auto right_node = node->children[1];  // AssignmentExpression (iterable)
    auto body_node = node->children[2];   // Loop body (Statement)

    // Step 1 (ForIn/OfBodyEvaluation): Let V be undefined.
    Value result = Value::undefined();

    // ForIn/OfHeadEvaluation step 1-2: Evaluate the iterable expression.
    Value iterable = engine->evaluate(right_node, env);

    // Detect destructuring pattern for LHS
    bool is_destructuring = false;
    std::shared_ptr<ASTNode> pattern;
    VariableType var_type = VariableType::Var;

    if((left_node->type == ASTNodeType::VariableDeclaration ||
        left_node->type == ASTNodeType::LetDeclaration ||
        left_node->type == ASTNodeType::ConstDeclaration) &&
       left_node->metadata == "destructuring" && !left_node->children.empty()) {
        is_destructuring = true;
        pattern = left_node->children[0];
        if(left_node->type == ASTNodeType::LetDeclaration) {
            var_type = VariableType::Let;
        } else if(left_node->type == ASTNodeType::ConstDeclaration) {
            var_type = VariableType::Const;
        }
    } else if(left_node->type == ASTNodeType::ArrayPattern ||
              left_node->type == ASTNodeType::ObjectPattern ||
              left_node->type == ASTNodeType::ArrayLiteral ||
              left_node->type == ASTNodeType::ObjectLiteral) {
        // ArrayLiteral/ObjectLiteral in LHS position are cover grammar for
        // destructuring assignment patterns (13.15.1 Static Semantics: Early Errors).
        is_destructuring = true;
        pattern = left_node;
    }

    // Determine variable name for simple (non-destructuring) binding
    std::string var_name;
    bool is_member_lhs = false;
    if(!is_destructuring) {
        if(left_node->type == ASTNodeType::VariableDeclaration ||
           left_node->type == ASTNodeType::LetDeclaration ||
           left_node->type == ASTNodeType::ConstDeclaration) {
            var_name = left_node->value;
            if(left_node->type == ASTNodeType::LetDeclaration) {
                env->define(var_name, Value::undefined(), VariableType::Let);
            } else if(left_node->type == ASTNodeType::ConstDeclaration) {
                env->define(var_name, Value::undefined(), VariableType::Let);
            } else {
                env->define(var_name, Value::undefined());
            }
        } else if(left_node->type == ASTNodeType::Identifier) {
            var_name = left_node->value;
        } else if(left_node->type == ASTNodeType::MemberExpression) {
            is_member_lhs = true;
        } else {
            return Value::undefined();
        }
    }

    // Helper to assign the iteration value to a MemberExpression or variable LHS
    auto assignValue = [&](const Value& val) {
        if(is_member_lhs) {
            Value object = engine->evaluate(left_node->children[0], env);
            if(object.isObject() || object.isFunction()) {
                auto* target = object.getObject();
                if(target) {
                    std::string prop;
                    if(left_node->metadata == "computed" ||
                       left_node->metadata == "computed-optional") {
                        Value prop_val = engine->evaluate(left_node->children[1], env);
                        prop = prop_val.toString();
                    } else {
                        prop = left_node->children[1]->value;
                    }
                    target->setProperty(prop, val);
                }
            }
        } else {
            env->set(var_name, val);
        }
    };

    // String fast path: eagerly collect characters (no iterator close needed)
    if(iterable.isString()) {
        auto values = getStringValues(iterable);
        for(const auto& value : values) {
            std::shared_ptr<Environment> body_env = env;
            if(!is_destructuring) {
                assignValue(value);
            } else if(var_type == VariableType::Var) {
                applyPatternBinding(pattern, value, env, engine, var_type);
            } else {
                body_env = std::make_shared<Environment>(env);
                applyPatternBinding(pattern, value, body_env, engine, var_type);
            }
            try {
                result = engine->evaluate(body_node, body_env);
            } catch(const BreakException&) {
                break;
            } catch(const ContinueException&) {
                continue;
            }
        }
        return result;
    }

    // ForIn/OfHeadEvaluation step 3: GetIterator(exprValue, SYNC)
    IteratorRecord record = getIterator(iterable);

    if(!record.valid()) {
        // Not iterable via Symbol.iterator — try array-like fallback
        // DEVIATION: The spec always uses Symbol.iterator. This fallback handles
        // plain objects with a numeric length property that lack Symbol.iterator.
        if(iterable.isObject()) {
            auto* obj = iterable.getObject();
            Value length_val = obj ? obj->getProperty("length") : Value::undefined();
            if(length_val.isNumber()) {
                double len = length_val.getNumber();
                if(len >= 0 && !std::isnan(len) && !std::isinf(len)) {
                    size_t length = static_cast<size_t>(len);
                    for(size_t i = 0; i < length; ++i) {
                        Value value = obj->getProperty(std::to_string(i));
                        std::shared_ptr<Environment> body_env = env;
                        if(!is_destructuring) {
                            assignValue(value);
                        } else if(var_type == VariableType::Var) {
                            applyPatternBinding(pattern, value, env, engine, var_type);
                        } else {
                            body_env = std::make_shared<Environment>(env);
                            applyPatternBinding(pattern, value, body_env, engine, var_type);
                        }
                        try {
                            result = engine->evaluate(body_node, body_env);
                        } catch(const BreakException&) {
                            break;
                        } catch(const ContinueException&) {
                            continue;
                        }
                    }
                }
            }
        }
        return result;
    }

    // Lazy iteration with IteratorClose support
    // Step 2: Repeat
    while(true) {
        // Step 2a-2b: IteratorNext, check done
        auto [done, value] = iteratorNext(record);
        if(done)
            break;

        // Step 2d: Assign nextValue to loop variable
        std::shared_ptr<Environment> body_env = env;
        if(!is_destructuring) {
            assignValue(value);
        } else if(var_type == VariableType::Var) {
            applyPatternBinding(pattern, value, env, engine, var_type);
        } else {
            body_env = std::make_shared<Environment>(env);
            applyPatternBinding(pattern, value, body_env, engine, var_type);
        }

        // Step 2e: Let stmtResult be Completion(Evaluation of Statement).
        try {
            result = engine->evaluate(body_node, body_env);
        } catch(const BreakException&) {
            // Step 2f: IteratorClose on break
            iteratorClose(record);
            break;
        } catch(const ContinueException&) {
            // Continue does not close the iterator — iteration continues normally
            continue;
        } catch(...) {
            // Step 2f: IteratorClose on throw/return (any abrupt completion)
            iteratorClose(record);
            throw;
        }
    }

    return result;
}

// 14.12 The switch Statement — Runtime Semantics: Evaluation
// @spec https://tc39.es/ecma262/#sec-switch-statement-runtime-semantics-evaluation
//
// SwitchStatement : switch ( Expression ) CaseBlock
//   1. Let exprRef be ? Evaluation of Expression.
//   2. Let switchValue be ? GetValue(exprRef).
//   3. Let oldEnv be the running execution context's LexicalEnvironment.
//   4. Let blockEnv be NewDeclarativeEnvironment(oldEnv).
//   5. Perform BlockDeclarationInstantiation(CaseBlock, blockEnv).
//   6. Set the running execution context's LexicalEnvironment to blockEnv.
//   7. Let R be Completion(CaseBlockEvaluation of CaseBlock with argument switchValue).
//   8. Set the running execution context's LexicalEnvironment to oldEnv.
//   9. Return R.
//
// 14.12.4 CaseBlockEvaluation:
//   Uses strict equality (===) to compare discriminant against each case value.
//   Once a match is found, all subsequent case/default statements execute (fall-through)
//   until a break is encountered.
//
Value StatementEvaluator::evaluateSwitchStatement(std::shared_ptr<ASTNode> node,
                                                  std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.empty()) {
        return Value::undefined();
    }

    // Step 1-2: Let switchValue be ? GetValue(? Evaluation of Expression).
    Value discriminant = engine->evaluate(node->children[0], env);

    // Steps 3-6: Create a block scope for the CaseBlock.
    // Let oldEnv be the running execution context's LexicalEnvironment.
    // Let blockEnv be NewDeclarativeEnvironment(oldEnv).
    // Set the running execution context's LexicalEnvironment to blockEnv.
    // @spec https://tc39.es/ecma262/#sec-switch-statement-runtime-semantics-evaluation
    auto blockEnv = std::make_shared<Environment>(env);

    bool foundMatch = false;
    bool executeRemaining = false;
    Value result = Value::undefined();

    // Step 7: CaseBlockEvaluation
    // 14.12.4 Runtime Semantics: CaseBlockEvaluation
    // @spec https://tc39.es/ecma262/#sec-runtime-semantics-caseblockevaluation
    // Iterate through all case/default clauses
    for(size_t i = 1; i < node->children.size(); ++i) {
        auto clause = node->children[i];

        if(clause->type == ASTNodeType::CaseClause) {
            if(!foundMatch && !executeRemaining) {
                // CaseBlockEvaluation step: If input is clauseSelector, then set found to true.
                if(!clause->children.empty()) {
                    Value testValue = engine->evaluate(clause->children[0], blockEnv);

                    // 14.12.3 CaseClauseIsSelected: uses IsStrictlyEqual (===)
                    // @spec https://tc39.es/ecma262/#sec-runtime-semantics-caseclauseisselected
                    if(discriminant.strictEquals(testValue)) {
                        foundMatch = true;
                        executeRemaining = true;
                    }
                }
            }

            if(executeRemaining) {
                // Execute all statements in this case (fall-through behavior)
                // CaseBlockEvaluation: evaluate StatementList of matching/subsequent clauses
                for(size_t j = 1; j < clause->children.size(); ++j) {
                    try {
                        result = engine->evaluate(clause->children[j], blockEnv);
                    } catch(const BreakException&) {
                        // Break terminates the switch
                        return result;
                    }
                }
            }

        } else if(clause->type == ASTNodeType::DefaultClause) {
            // CaseBlockEvaluation: If no case matched, execute default
            if(!foundMatch) {
                foundMatch = true;
                executeRemaining = true;
            }

            if(executeRemaining) {
                // Execute all statements in default clause
                for(size_t j = 0; j < clause->children.size(); ++j) {
                    try {
                        result = engine->evaluate(clause->children[j], blockEnv);
                    } catch(const BreakException&) {
                        return result;
                    }
                }
            }
        }
    }

    // Step 8: Set the running execution context's LexicalEnvironment to oldEnv.
    // (blockEnv goes out of scope automatically)
    return result;
}

// 14.9 The break Statement — Runtime Semantics: Evaluation
// @spec https://tc39.es/ecma262/#sec-break-statement-runtime-semantics-evaluation
//
// BreakStatement : break ;
//   1. Return Completion Record { [[Type]]: break, [[Value]]: empty, [[Target]]: empty }.
//
// BreakStatement : break LabelIdentifier ;
//   1. Let label be the StringValue of LabelIdentifier.
//   2. Return Completion Record { [[Type]]: break, [[Value]]: empty, [[Target]]: label }.
//
// SIMPLIFIED: Rift uses a C++ BreakException to signal break completions.
// INCOMPLETE: Labelled break (break <label>) is not supported.
Value StatementEvaluator::evaluateBreakStatement(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine) {
    // Step 1: Return Completion Record { [[Type]]: break }.
    throw BreakException();
}

// 14.10 The return Statement — Runtime Semantics: Evaluation
// @spec https://tc39.es/ecma262/#sec-return-statement-runtime-semantics-evaluation
//
// ReturnStatement : return ;
//   1. Return Completion Record { [[Type]]: return, [[Value]]: undefined }.
//
// ReturnStatement : return Expression ;
//   1. Let exprRef be ? Evaluation of Expression.
//   2. Let exprValue be ? GetValue(exprRef).
//   3. If GetGeneratorKind() is ASYNC, set exprValue to ? Await(exprValue).
//   4. Return Completion Record { [[Type]]: return, [[Value]]: exprValue }.
//
// SIMPLIFIED: Rift uses a C++ ReturnException to signal return completions.
// The spec uses Completion Records. Step 3 (async Await) is handled separately
// by the AsyncExecutor, not here.
Value StatementEvaluator::evaluateReturnStatement(std::shared_ptr<ASTNode> node,
                                                  std::shared_ptr<Environment> env, Rift* engine) {
    // Step 1 (no expression): Return undefined.
    Value returnValue = Value::undefined();

    // Step 1-2 (with expression): Let exprValue be ? GetValue(? Evaluation of Expression).
    if(!node->children.empty()) {
        returnValue = engine->evaluate(node->children[0], env);
    }

    // Step 4: Return Completion Record { [[Type]]: return, [[Value]]: exprValue }.
    throw ReturnException(returnValue);
}

// 14.7.5 The for-await-of Statement — Runtime Semantics: ForIn/OfBodyEvaluation (ASYNC)
// @spec https://tc39.es/ecma262/#sec-runtime-semantics-forin-div-ofbodyevaluation
//
// ForInOfStatement : for await ( ForDeclaration of AssignmentExpression ) Statement
//   ForIn/OfHeadEvaluation with iteratorKind = ASYNC:
//     1. Let exprRef be ? Evaluation of AssignmentExpression.
//     2. Let exprValue be ? GetValue(exprRef).
//     3. Let iteratorRecord be ? GetIterator(exprValue, ASYNC).
//   ForIn/OfBodyEvaluation with iteratorKind = ASYNC:
//     Each iteration awaits the result of next().
//
// SIMPLIFIED: This method is a fallback that throws when for-await-of is used outside
// an async context. The actual async iteration is handled by AsyncExecutor, which
// intercepts ForAwaitOfStatement nodes before they reach this evaluator.
Value StatementEvaluator::evaluateForAwaitOfStatement(std::shared_ptr<ASTNode> node,
                                                      std::shared_ptr<Environment> env,
                                                      Rift* engine) {
    // for-await-of requires an async execution context (AsyncExecutor).
    // If we reach here, the code is not running inside an async function.
    throw JavaScriptException(Value("TypeError: for-await-of is only valid in async functions"));
}

}  // namespace rift::core
