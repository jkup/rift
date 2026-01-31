/**
 * Statement Evaluator - Control Flow Methods
 *
 * This file contains control flow statement evaluation methods:
 * - if/else statements
 * - while, do-while, for loops (including for-in and for-of)
 * - switch statements
 * - break and return statements
 *
 * Split from statement_evaluator.cpp for better maintainability.
 */

#include <cmath>

#include "rift/builtins/array/array.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/core/engine/engine.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/core/engine/statement_evaluator.h"
#include "rift/runtime/values/object.h"

namespace rift::core {

Value StatementEvaluator::evaluateIfStatement(std::shared_ptr<ASTNode> node,
                                              std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Evaluate the condition
    Value condition = engine->evaluate(node->children[0], env);

    // If condition is truthy, evaluate the then branch
    if(condition.toBool()) {
        return engine->evaluate(node->children[1], env);
    }

    // If there's an else clause and condition is falsy, evaluate the else branch
    if(node->children.size() > 2) {
        return engine->evaluate(node->children[2], env);
    }

    return Value::undefined();
}

Value StatementEvaluator::evaluateWhileStatement(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    Value result = Value::undefined();

    // Keep looping while condition is truthy
    while(true) {
        Value condition = engine->evaluate(node->children[0], env);
        if(!condition.toBool()) {
            break;
        }
        try {
            result = engine->evaluate(node->children[1], env);
        } catch(const BreakException&) {
            break;
        } catch(const ContinueException&) {
            // Skip to next iteration
            continue;
        }
    }

    return result;
}

Value StatementEvaluator::evaluateDoWhileStatement(std::shared_ptr<ASTNode> node,
                                                   std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    Value result = Value::undefined();

    // Execute body at least once, then check condition
    do {
        try {
            result = engine->evaluate(node->children[0], env);  // body is first child
        } catch(const BreakException&) {
            break;
        } catch(const ContinueException&) {
            // Skip to condition check
        }

        // Check condition after body execution
        Value condition = engine->evaluate(node->children[1], env);  // condition is second child
        if(!condition.toBool()) {
            break;
        }
    } while(true);

    return result;
}

Value StatementEvaluator::evaluateForStatement(std::shared_ptr<ASTNode> node,
                                               std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() < 4) {
        return Value::undefined();
    }

    Value result = Value::undefined();

    // Execute initialization (can be null for empty initialization)
    if(node->children[0] != nullptr) {
        engine->evaluate(node->children[0], env);
    }

    // Keep looping while condition is truthy (or infinitely if no condition)
    while(true) {
        // Check condition (if present)
        if(node->children[1] != nullptr) {
            Value condition = engine->evaluate(node->children[1], env);
            if(!condition.toBool()) {
                break;
            }
        }
        // If no condition, loop infinitely (unless break/return is encountered)

        // Execute body
        try {
            result = engine->evaluate(node->children[3], env);
        } catch(const BreakException&) {
            break;
        } catch(const ContinueException&) {
            // On continue in a for-loop, run the update expression (if any), then go to next
            // iteration
            if(node->children[2] != nullptr) {
                engine->evaluate(node->children[2], env);
            }
            continue;
        }

        // Execute update expression (if present)
        if(node->children[2] != nullptr) {
            engine->evaluate(node->children[2], env);
        }
    }

    return result;
}

Value StatementEvaluator::evaluateForInStatement(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() < 3) {
        return Value::undefined();
    }

    auto left_node = node->children[0];   // Variable declaration or identifier
    auto right_node = node->children[1];  // Object to iterate
    auto body_node = node->children[2];   // Loop body

    Value result = Value::undefined();

    // Evaluate the object to iterate over
    Value obj_value = engine->evaluate(right_node, env);

    // Detect destructuring pattern
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
              left_node->type == ASTNodeType::ObjectPattern) {
        is_destructuring = true;
        pattern = left_node;
    }

    if(!is_destructuring) {
        // Simple variable path (existing behavior)
        std::string var_name;
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
        } else {
            return Value::undefined();
        }

        if(obj_value.isObject() || obj_value.isFunction()) {
            auto* obj = obj_value.getObject();
            if(obj) {
                auto keys = obj->getOwnPropertyNames();
                for(const auto& key : keys) {
                    env->set(var_name, Value(key));
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
            std::string str = obj_value.toString();
            for(size_t i = 0; i < str.length(); i++) {
                env->set(var_name, Value(std::to_string(i)));
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
        // Destructuring path
        // For var: bind into outer env; for let/const: per-iteration child env
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

// Helper to get all values from an iterable using Symbol.iterator protocol
static std::vector<Value> getIterableValues(const Value& iterable) {
    std::vector<Value> values;

    // Handle string iteration (each character)
    if(iterable.isString()) {
        std::string str = iterable.getString();
        for(char c : str) {
            values.push_back(Value(std::string(1, c)));
        }
        return values;
    }

    // Handle object/array iteration via Symbol.iterator
    if(!iterable.isObject() && !iterable.isFunction()) {
        return values;  // Not iterable
    }

    auto* obj = iterable.getObject();
    if(!obj) {
        return values;
    }

    // First, try array-like iteration (objects with numeric length property)
    // This is more reliable than the iterator protocol for basic arrays
    Value length_val = obj->getProperty("length");
    if(length_val.isNumber()) {
        double len = length_val.getNumber();
        if(len >= 0 && !std::isnan(len) && !std::isinf(len)) {
            size_t length = static_cast<size_t>(len);
            for(size_t i = 0; i < length; ++i) {
                values.push_back(obj->getProperty(std::to_string(i)));
            }
            return values;
        }
    }

    // Fall back to Symbol.iterator protocol for custom iterables
    std::string iterator_key =
        EvaluationUtils::symbolToPropertyKey(builtins::Symbol::getIteratorId());
    Value iterator_method = obj->getProperty(iterator_key);

    if(iterator_method.isUndefined() || !iterator_method.isFunction()) {
        return values;  // Not iterable
    }

    // Call [Symbol.iterator]() to get iterator object
    auto* iterator_func = dynamic_cast<rift::runtime::JSFunction*>(iterator_method.getObject());
    if(!iterator_func) {
        return values;
    }

    CallContext ctx(CallType::Function, iterable);
    Value iterator = iterator_func->call(ctx, {});

    if(!iterator.isObject()) {
        return values;
    }

    auto* iterator_obj = iterator.getObject();

    // Repeatedly call next() until done
    while(true) {
        Value next_method = iterator_obj->getProperty("next");
        if(!next_method.isFunction()) {
            break;
        }

        auto* next_func = dynamic_cast<rift::runtime::JSFunction*>(next_method.getObject());
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
        values.push_back(value);
    }

    return values;
}

Value StatementEvaluator::evaluateForOfStatement(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() < 3) {
        return Value::undefined();
    }

    auto left_node = node->children[0];   // Variable declaration or identifier
    auto right_node = node->children[1];  // Iterable
    auto body_node = node->children[2];   // Loop body

    Value result = Value::undefined();

    // Evaluate the iterable
    Value iterable = engine->evaluate(right_node, env);

    // Detect destructuring pattern
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
              left_node->type == ASTNodeType::ObjectPattern) {
        // Bare pattern: for ([a,b] of arr) without declaration keyword
        is_destructuring = true;
        pattern = left_node;
    }

    if(!is_destructuring) {
        // Simple variable path (existing behavior)
        std::string var_name;
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
        } else {
            return Value::undefined();
        }

        auto values = getIterableValues(iterable);
        for(const auto& value : values) {
            env->set(var_name, value);
            try {
                result = engine->evaluate(body_node, env);
            } catch(const BreakException&) {
                break;
            } catch(const ContinueException&) {
                continue;
            }
        }
    } else {
        // Destructuring path
        auto values = getIterableValues(iterable);
        if(var_type == VariableType::Var) {
            // var: bind into outer env (no per-iteration scope needed, var allows redeclaration)
            for(const auto& value : values) {
                applyPatternBinding(pattern, value, env, engine, var_type);
                try {
                    result = engine->evaluate(body_node, env);
                } catch(const BreakException&) {
                    break;
                } catch(const ContinueException&) {
                    continue;
                }
            }
        } else {
            // let/const: create a child environment per iteration to avoid redeclaration errors
            for(const auto& value : values) {
                auto iter_env = std::make_shared<Environment>(env);
                applyPatternBinding(pattern, value, iter_env, engine, var_type);
                try {
                    result = engine->evaluate(body_node, iter_env);
                } catch(const BreakException&) {
                    break;
                } catch(const ContinueException&) {
                    continue;
                }
            }
        }
    }

    return result;
}

Value StatementEvaluator::evaluateSwitchStatement(std::shared_ptr<ASTNode> node,
                                                  std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.empty()) {
        return Value::undefined();
    }

    // First child is the discriminant expression
    Value discriminant = engine->evaluate(node->children[0], env);

    bool foundMatch = false;
    bool executeRemaining = false;
    Value result = Value::undefined();

    // Iterate through all case/default clauses
    for(size_t i = 1; i < node->children.size(); ++i) {
        auto clause = node->children[i];

        if(clause->type == ASTNodeType::CaseClause) {
            if(!foundMatch && !executeRemaining) {
                // Check if this case matches
                if(!clause->children.empty()) {
                    Value testValue = engine->evaluate(clause->children[0], env);

                    // JavaScript switch uses strict equality (===)
                    if(discriminant.strictEquals(testValue)) {
                        foundMatch = true;
                        executeRemaining = true;
                    }
                }
            }

            if(executeRemaining) {
                // Execute all statements in this case (starting from index 1, since 0 is the test)
                for(size_t j = 1; j < clause->children.size(); ++j) {
                    try {
                        result = engine->evaluate(clause->children[j], env);
                    } catch(const BreakException&) {
                        return result;
                    }
                }
            }

        } else if(clause->type == ASTNodeType::DefaultClause) {
            if(!foundMatch) {
                foundMatch = true;
                executeRemaining = true;
            }

            if(executeRemaining) {
                // Execute all statements in default clause
                for(size_t j = 0; j < clause->children.size(); ++j) {
                    try {
                        result = engine->evaluate(clause->children[j], env);
                    } catch(const BreakException&) {
                        return result;
                    }
                }
            }
        }
    }

    return result;
}

Value StatementEvaluator::evaluateBreakStatement(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine) {
    // Throw a special exception to break out of loops/switch statements
    throw BreakException();
}

Value StatementEvaluator::evaluateReturnStatement(std::shared_ptr<ASTNode> node,
                                                  std::shared_ptr<Environment> env, Rift* engine) {
    Value returnValue = Value::undefined();

    // If there's a return expression, evaluate it
    if(!node->children.empty()) {
        returnValue = engine->evaluate(node->children[0], env);
    }

    // Throw a special exception to unwind the call stack
    // This is a simple way to implement return without proper exception handling
    throw ReturnException(returnValue);
}

Value StatementEvaluator::evaluateForAwaitOfStatement(std::shared_ptr<ASTNode> node,
                                                      std::shared_ptr<Environment> env,
                                                      Rift* engine) {
    // This is a fallback when for-await-of appears outside an AsyncExecutor context.
    // In practice, AsyncExecutor intercepts this node type first.
    throw JavaScriptException(Value("TypeError: for-await-of is only valid in async functions"));
}

}  // namespace rift::core
