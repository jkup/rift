/**
 * Async Generator Evaluator Implementation
 *
 * This file implements the async generator execution logic, handling:
 * - Yield expression evaluation and suspension (YieldException)
 * - Await expression evaluation and suspension (AwaitException)
 * - Resumption from both yield and await points
 * - Statement-by-statement execution with unified suspension point tracking
 *
 * Combines the approaches of GeneratorEvaluator and AsyncExecutor.
 */

#include "rift/interpreter/async_generator_evaluator.h"

#include "rift/builtins/promise/promise.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/frontend/ast/ast_node.h"
#include "rift/interpreter/engine.h"
#include "rift/interpreter/evaluation_utils.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/types/object.h"

namespace rift::core {

// Helper: extract the loop label from a node's metadata.
static std::string extractLoopLabel(const std::shared_ptr<ASTNode>& node) {
    if(!node || node->metadata.empty())
        return "";
    auto pos = node->metadata.find("label:");
    if(pos == std::string::npos)
        return "";
    auto start = pos + 6;
    auto end = node->metadata.find(',', start);
    return node->metadata.substr(start, end == std::string::npos ? std::string::npos : end - start);
}

Value AsyncGeneratorEvaluator::execute(std::shared_ptr<ASTNode> body,
                                       std::shared_ptr<Environment> env, Rift* engine,
                                       AsyncGeneratorExecutionContext& context) {
    // Assign suspension point IDs (shared counter for yield and await)
    if(context.currentSuspensionId == -1) {
        assignSuspensionPointIds(body);
    }

    // Evaluate the body block
    try {
        return evaluateBlock(body, env, engine, context);
    } catch(const ReturnException& e) {
        return e.getValue();
    }
    // YieldException and AwaitException propagate up to AsyncGeneratorIterator
}

Value AsyncGeneratorEvaluator::evaluateBlock(std::shared_ptr<ASTNode> block,
                                             std::shared_ptr<Environment> env, Rift* engine,
                                             AsyncGeneratorExecutionContext& context) {
    if(!block || block->children.empty()) {
        return Value::undefined();
    }

    Value result = Value::undefined();

    for(size_t i = 0; i < block->children.size(); ++i) {
        auto& stmt = block->children[i];
        result = evaluateStatement(stmt, env, engine, context, static_cast<int>(i));
    }

    return result;
}

Value AsyncGeneratorEvaluator::evaluateStatement(std::shared_ptr<ASTNode> stmt,
                                                 std::shared_ptr<Environment> env, Rift* engine,
                                                 AsyncGeneratorExecutionContext& context,
                                                 int statementIndex) {
    if(!stmt) {
        return Value::undefined();
    }

    // Check if we're resuming and this statement contains our target suspension point
    if(context.isResuming) {
        int target_id = context.currentSuspensionId;

        if(containsSuspensionPoint(stmt, target_id)) {
            // This statement contains our suspension point

            // If this is an ExpressionStatement containing just a yield
            if(stmt->type == ASTNodeType::ExpressionStatement && !stmt->children.empty()) {
                auto& expr = stmt->children[0];
                if(expr->type == ASTNodeType::YieldExpression) {
                    bool is_delegate = expr->metadata.find("delegate") != std::string::npos;
                    if(!is_delegate && !context.inDelegation) {
                        context.isResuming = false;
                        context.currentSuspensionId = getSuspensionPointId(expr);
                        if(context.throwOnResume) {
                            context.throwOnResume = false;
                            throw JavaScriptException(context.sentValue);
                        }
                        if(context.returnOnResume) {
                            context.returnOnResume = false;
                            throw ReturnException(context.sentValue);
                        }
                        return context.sentValue;
                    }
                }
                // If this is an ExpressionStatement containing just an await
                if(expr->type == ASTNodeType::AwaitExpression) {
                    context.isResuming = false;
                    context.currentSuspensionId = getSuspensionPointId(expr);
                    if(context.throwOnResume) {
                        context.throwOnResume = false;
                        throw JavaScriptException(context.sentValue);
                    }
                    return context.sentValue;
                }
            }

            // For statements that have special handling, don't clear isResuming
            if(context.inDelegation) {
                // In delegation - let evaluateYield handle it
            } else if(stmt->type != ASTNodeType::VariableDeclaration &&
                      stmt->type != ASTNodeType::LetDeclaration &&
                      stmt->type != ASTNodeType::ConstDeclaration &&
                      stmt->type != ASTNodeType::WhileStatement &&
                      stmt->type != ASTNodeType::ForStatement &&
                      stmt->type != ASTNodeType::ForAwaitOfStatement &&
                      stmt->type != ASTNodeType::TryStatement) {
                context.isResuming = false;
            }
        } else {
            // This statement doesn't contain our suspension point - skip it
            return Value::undefined();
        }
    }

    // Normal evaluation - handle yield and await expressions specially
    if(stmt->type == ASTNodeType::ExpressionStatement && !stmt->children.empty()) {
        auto& expr = stmt->children[0];
        if(expr->type == ASTNodeType::YieldExpression) {
            return evaluateYield(expr, env, engine, context, statementIndex);
        }
        if(expr->type == ASTNodeType::AwaitExpression) {
            return evaluateAwait(expr, env, engine, context, statementIndex);
        }
    }

    // Variable declarations with yield or await initializer
    if(stmt->type == ASTNodeType::VariableDeclaration ||
       stmt->type == ASTNodeType::LetDeclaration || stmt->type == ASTNodeType::ConstDeclaration) {
        if(!stmt->children.empty()) {
            if(stmt->children[0]->type == ASTNodeType::YieldExpression) {
                Value yield_result =
                    evaluateYield(stmt->children[0], env, engine, context, statementIndex);
                std::string var_name = stmt->value;
                if(stmt->type == ASTNodeType::ConstDeclaration) {
                    env->define(var_name, yield_result, VariableType::Const);
                } else if(stmt->type == ASTNodeType::LetDeclaration) {
                    env->define(var_name, yield_result, VariableType::Let);
                } else {
                    env->define(var_name, yield_result, VariableType::Var);
                }
                return yield_result;
            }
            if(stmt->children[0]->type == ASTNodeType::AwaitExpression) {
                Value await_result =
                    evaluateAwait(stmt->children[0], env, engine, context, statementIndex);
                std::string var_name = stmt->value;
                if(stmt->type == ASTNodeType::ConstDeclaration) {
                    env->define(var_name, await_result, VariableType::Const);
                } else if(stmt->type == ASTNodeType::LetDeclaration) {
                    env->define(var_name, await_result, VariableType::Let);
                } else {
                    env->define(var_name, await_result, VariableType::Var);
                }
                return await_result;
            }
        }
    }

    // Return statements with await
    if(stmt->type == ASTNodeType::ReturnStatement && !stmt->children.empty()) {
        auto& expr = stmt->children[0];
        if(expr->type == ASTNodeType::AwaitExpression) {
            Value await_result = evaluateAwait(expr, env, engine, context, statementIndex);
            throw ReturnException(await_result);
        }
    }

    // Loop statements
    if(stmt->type == ASTNodeType::WhileStatement) {
        return evaluateWhile(stmt, env, engine, context, statementIndex);
    }

    if(stmt->type == ASTNodeType::ForStatement) {
        return evaluateFor(stmt, env, engine, context, statementIndex);
    }

    if(stmt->type == ASTNodeType::ForAwaitOfStatement) {
        return evaluateForAwaitOf(stmt, env, engine, context, statementIndex);
    }

    // Try/catch/finally
    if(stmt->type == ASTNodeType::TryStatement) {
        return evaluateTryStatement(stmt, env, engine, context, statementIndex);
    }

    // Default: use the engine's normal evaluation
    return engine->evaluate(stmt, env);
}

Value AsyncGeneratorEvaluator::evaluateYield(std::shared_ptr<ASTNode> node,
                                             std::shared_ptr<Environment> env, Rift* engine,
                                             AsyncGeneratorExecutionContext& context,
                                             int statementIndex) {
    int suspension_id = getSuspensionPointId(node);

    // Check for yield* (delegate) - handle resumption into delegation
    bool is_delegate = node->metadata.find("delegate") != std::string::npos;

    if(context.isResuming && context.inDelegation && context.delegationYieldId == suspension_id) {
        return evaluateYieldStar(context.delegatedIterator, engine, context, suspension_id,
                                 statementIndex);
    }

    // Check if we're resuming at this exact yield point (non-delegation)
    if(context.isResuming && context.currentSuspensionId == suspension_id &&
       !context.inDelegation) {
        context.isResuming = false;
        if(context.throwOnResume) {
            context.throwOnResume = false;
            throw JavaScriptException(context.sentValue);
        }
        if(context.returnOnResume) {
            context.returnOnResume = false;
            throw ReturnException(context.sentValue);
        }
        return context.sentValue;
    }

    // We're yielding here - evaluate the argument
    Value yielded_value = Value::undefined();
    if(!node->children.empty()) {
        yielded_value = engine->evaluate(node->children[0], env);
    }

    // Check for yield* (delegate)
    if(is_delegate) {
        return evaluateYieldStar(yielded_value, engine, context, suspension_id, statementIndex);
    }

    // Update context for resumption
    context.resumeStatementIndex = statementIndex;
    context.suspendedAtYield = true;
    context.suspendedAtAwait = false;

    // Throw to suspend the generator
    throw YieldException(yielded_value, suspension_id, statementIndex);
}

Value AsyncGeneratorEvaluator::evaluateAwait(std::shared_ptr<ASTNode> node,
                                             std::shared_ptr<Environment> env, Rift* engine,
                                             AsyncGeneratorExecutionContext& context,
                                             int statementIndex) {
    int suspension_id = getSuspensionPointId(node);

    // Check if we're resuming at this exact await point
    if(context.isResuming && context.currentSuspensionId == suspension_id) {
        context.isResuming = false;
        if(context.throwOnResume) {
            context.throwOnResume = false;
            throw JavaScriptException(context.sentValue);
        }
        return context.sentValue;
    }

    // Not resuming - evaluate the operand and suspend
    Value awaited_value = Value::undefined();
    if(!node->children.empty()) {
        awaited_value = engine->evaluate(node->children[0], env);
    }

    // Update context for resumption
    context.resumeStatementIndex = statementIndex;
    context.suspendedAtYield = false;
    context.suspendedAtAwait = true;

    // Throw to suspend the async generator
    throw AwaitException(awaited_value, suspension_id, statementIndex);
}

Value AsyncGeneratorEvaluator::evaluateWhile(std::shared_ptr<ASTNode> node,
                                             std::shared_ptr<Environment> env, Rift* engine,
                                             AsyncGeneratorExecutionContext& context,
                                             int statementIndex) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    auto& condition = node->children[0];
    auto& body = node->children[1];

    Value result = Value::undefined();

    bool first_iteration = true;
    bool skip_condition = context.isResuming;

    while(true) {
        if(!skip_condition || !first_iteration) {
            Value cond_val = engine->evaluate(condition, env);
            if(!cond_val.toBool()) {
                break;
            }
        }
        skip_condition = false;
        first_iteration = false;

        try {
            result = evaluateLoopBody(body, env, engine, context, statementIndex);
        } catch(const BreakException& e) {
            if(e.hasLabel() && e.getLabel() != extractLoopLabel(node)) {
                throw;
            }
            break;
        } catch(const ContinueException& e) {
            if(e.hasLabel() && e.getLabel() != extractLoopLabel(node)) {
                throw;
            }
            continue;
        }
        // YieldException and AwaitException propagate up
    }

    return result;
}

Value AsyncGeneratorEvaluator::evaluateFor(std::shared_ptr<ASTNode> node,
                                           std::shared_ptr<Environment> env, Rift* engine,
                                           AsyncGeneratorExecutionContext& context,
                                           int statementIndex) {
    if(node->children.size() < 4) {
        return Value::undefined();
    }

    auto& init = node->children[0];
    auto& condition = node->children[1];
    auto& update = node->children[2];
    auto& body = node->children[3];

    Value result = Value::undefined();
    auto& loop_env = env;

    if(!context.isResuming && init) {
        engine->evaluate(init, loop_env);
    }

    bool first_iteration = true;
    bool skip_condition = context.isResuming;

    while(true) {
        if(!skip_condition || !first_iteration) {
            if(condition) {
                Value cond_val = engine->evaluate(condition, loop_env);
                if(!cond_val.toBool()) {
                    break;
                }
            }
        }
        skip_condition = false;
        first_iteration = false;

        try {
            result = evaluateLoopBody(body, loop_env, engine, context, statementIndex);
        } catch(const BreakException& e) {
            if(e.hasLabel() && e.getLabel() != extractLoopLabel(node)) {
                throw;
            }
            break;
        } catch(const ContinueException& e) {
            if(e.hasLabel() && e.getLabel() != extractLoopLabel(node)) {
                throw;
            }
            // Fall through to update
        }

        if(update) {
            engine->evaluate(update, loop_env);
        }
    }

    return result;
}

Value AsyncGeneratorEvaluator::evaluateForAwaitOf(std::shared_ptr<ASTNode> node,
                                                  std::shared_ptr<Environment> env, Rift* engine,
                                                  AsyncGeneratorExecutionContext& context,
                                                  int statementIndex) {
    if(node->children.size() < 3) {
        return Value::undefined();
    }

    auto left_node = node->children[0];
    auto right_node = node->children[1];
    auto body_node = node->children[2];

    int for_await_id = getSuspensionPointId(node);

    std::string var_name;
    ASTNodeType decl_type = left_node->type;
    if(decl_type == ASTNodeType::VariableDeclaration || decl_type == ASTNodeType::LetDeclaration ||
       decl_type == ASTNodeType::ConstDeclaration) {
        var_name = left_node->value;
    } else if(decl_type == ASTNodeType::Identifier) {
        var_name = left_node->value;
    } else {
        return Value::undefined();
    }

    std::string iter_var = "__forAwaitIter_" + std::to_string(for_await_id) + "__";
    std::string async_flag_var = "__forAwaitIsAsync_" + std::to_string(for_await_id) + "__";

    // Helper lambda: call .next() on iterator and await accordingly
    // For async iterators (.next() returns Promise), await the whole result.
    // For sync iterators (.next() returns {value, done}), await just the value.
    auto callNextAndAwait = [&](Value iterator, bool is_async_iter) {
        auto* iterator_obj = iterator.getObject();
        Value next_method = iterator_obj->getProperty("next");
        if(!next_method.isFunction()) {
            throw JavaScriptException(Value("TypeError: iterator.next is not a function"));
        }
        auto* next_func = dynamic_cast<JSFunction*>(next_method.getObject());
        if(!next_func) {
            throw JavaScriptException(Value("TypeError: iterator.next is not a function"));
        }
        CallContext next_ctx(CallType::Function, iterator);
        Value next_result = next_func->call(next_ctx, {});

        if(is_async_iter) {
            // Async iterator: .next() returns a Promise<{value, done}>
            // Await the entire result
            throw AwaitException(next_result, for_await_id, statementIndex);
        }

        // Sync iterator: .next() returns {value, done} directly
        if(next_result.isObject()) {
            auto* result_obj = next_result.getObject();
            Value done_val = result_obj->getProperty("done");
            if(done_val.toBool()) {
                return;  // Done - caller checks result
            }
            Value next_value = result_obj->getProperty("value");
            throw AwaitException(next_value, for_await_id, statementIndex);
        }
    };

    // Helper lambda: extract value from sentValue depending on iterator type
    auto extractValue = [&](Value sent_value, bool is_async_iter) -> std::pair<Value, bool> {
        if(is_async_iter) {
            // sentValue is the resolved {value, done} object
            if(sent_value.isObject()) {
                auto* obj = sent_value.getObject();
                Value done_val = obj->getProperty("done");
                if(done_val.toBool()) {
                    return {Value::undefined(), true};  // done
                }
                return {obj->getProperty("value"), false};  // not done
            }
            return {Value::undefined(), true};
        }
        // For sync iterators, sentValue is just the value
        return {sent_value, false};
    };

    Value result = Value::undefined();

    // Case 1: Resuming at this node's own await ID
    if(context.isResuming && context.currentSuspensionId == for_await_id) {
        context.isResuming = false;

        if(context.throwOnResume) {
            context.throwOnResume = false;
            throw JavaScriptException(context.sentValue);
        }

        // Determine if this is an async iterator
        Value async_flag = env->get(async_flag_var);
        bool is_async_iter = async_flag.toBool();

        auto [value, done] = extractValue(context.sentValue, is_async_iter);
        if(done) {
            return result;
        }

        env->set(var_name, value);

        try {
            result = evaluateLoopBody(body_node, env, engine, context, statementIndex);
        } catch(const BreakException& e) {
            if(e.hasLabel() && e.getLabel() != extractLoopLabel(node)) {
                throw;
            }
            return result;
        } catch(const ContinueException& e) {
            if(e.hasLabel() && e.getLabel() != extractLoopLabel(node)) {
                throw;
            }
        }

        // Continue loop
        Value iterator = env->get(iter_var);
        if(!iterator.isObject()) {
            return result;
        }

        callNextAndAwait(iterator, is_async_iter);

        return result;
    }

    // Case 2: Resuming with target inside the loop body
    if(context.isResuming) {
        if(containsSuspensionPoint(body_node, context.currentSuspensionId)) {
            try {
                result = evaluateLoopBody(body_node, env, engine, context, statementIndex);
            } catch(const BreakException& e) {
                if(e.hasLabel() && e.getLabel() != extractLoopLabel(node)) {
                    throw;
                }
                return result;
            } catch(const ContinueException& e) {
                if(e.hasLabel() && e.getLabel() != extractLoopLabel(node)) {
                    throw;
                }
            }

            // After body completes, call .next() for next iteration
            Value iterator = env->get(iter_var);
            if(!iterator.isObject()) {
                return result;
            }
            Value async_flag = env->get(async_flag_var);
            bool is_async_iter = async_flag.toBool();

            try {
                callNextAndAwait(iterator, is_async_iter);
            } catch(const AwaitException&) {
                throw;
            }

            return result;
        }
        return Value::undefined();
    }

    // Case 3: First entry
    Value iterable = engine->evaluate(right_node, env);

    if(decl_type == ASTNodeType::LetDeclaration) {
        env->define(var_name, Value::undefined(), VariableType::Let);
    } else if(decl_type == ASTNodeType::ConstDeclaration) {
        env->define(var_name, Value::undefined(), VariableType::Let);
    } else if(decl_type == ASTNodeType::VariableDeclaration) {
        env->define(var_name, Value::undefined());
    }

    JSObject* iterable_obj = nullptr;
    if(iterable.isObject() || iterable.isFunction()) {
        iterable_obj = iterable.getObject();
    }

    Value iterator = Value::undefined();
    bool is_async_iter = false;
    if(iterable_obj) {
        // Try Symbol.asyncIterator first
        std::string async_iter_key =
            EvaluationUtils::symbolToPropertyKey(builtins::Symbol::getAsyncIteratorId());
        Value async_iter_method = iterable_obj->getProperty(async_iter_key);

        if(!async_iter_method.isUndefined() && async_iter_method.isFunction()) {
            auto* async_iter_func = dynamic_cast<JSFunction*>(async_iter_method.getObject());
            if(async_iter_func) {
                CallContext iter_ctx(CallType::Function, iterable);
                iterator = async_iter_func->call(iter_ctx, {});
                is_async_iter = true;
            }
        }

        // Fallback to Symbol.iterator
        if(iterator.isUndefined() || !iterator.isObject()) {
            std::string iter_key =
                EvaluationUtils::symbolToPropertyKey(builtins::Symbol::getIteratorId());
            Value iter_method = iterable_obj->getProperty(iter_key);

            if(!iter_method.isUndefined() && iter_method.isFunction()) {
                auto* iter_func = dynamic_cast<JSFunction*>(iter_method.getObject());
                if(iter_func) {
                    CallContext iter_ctx(CallType::Function, iterable);
                    iterator = iter_func->call(iter_ctx, {});
                    is_async_iter = false;
                }
            }
        }
    }

    if(!iterator.isObject()) {
        throw JavaScriptException(Value("TypeError: object is not iterable"));
    }

    // Store the iterator and async flag for resumption
    env->define(iter_var, iterator);
    env->define(async_flag_var, Value(is_async_iter));

    // Call .next() to get first element
    callNextAndAwait(iterator, is_async_iter);

    return Value::undefined();
}

Value AsyncGeneratorEvaluator::evaluateLoopBody(std::shared_ptr<ASTNode> body,
                                                std::shared_ptr<Environment> env, Rift* engine,
                                                AsyncGeneratorExecutionContext& context,
                                                int statementIndex) {
    if(!body) {
        return Value::undefined();
    }

    if(body->type == ASTNodeType::BlockStatement) {
        Value result = Value::undefined();
        for(size_t i = 0; i < body->children.size(); ++i) {
            auto& stmt = body->children[i];

            if(context.isResuming) {
                if(!containsSuspensionPoint(stmt, context.currentSuspensionId)) {
                    continue;
                }
            }

            result = evaluateLoopBodyStatement(stmt, env, engine, context, statementIndex);
        }
        return result;
    }

    return evaluateLoopBodyStatement(body, env, engine, context, statementIndex);
}

Value AsyncGeneratorEvaluator::evaluateLoopBodyStatement(std::shared_ptr<ASTNode> stmt,
                                                         std::shared_ptr<Environment> env,
                                                         Rift* engine,
                                                         AsyncGeneratorExecutionContext& context,
                                                         int statementIndex) {
    // Handle yield expressions directly
    if(stmt->type == ASTNodeType::ExpressionStatement && !stmt->children.empty()) {
        auto& expr = stmt->children[0];
        if(expr->type == ASTNodeType::YieldExpression) {
            return evaluateYield(expr, env, engine, context, statementIndex);
        }
        if(expr->type == ASTNodeType::AwaitExpression) {
            return evaluateAwait(expr, env, engine, context, statementIndex);
        }
    }

    // Handle variable declarations with yield/await
    if(stmt->type == ASTNodeType::VariableDeclaration ||
       stmt->type == ASTNodeType::LetDeclaration || stmt->type == ASTNodeType::ConstDeclaration) {
        if(!stmt->children.empty()) {
            if(stmt->children[0]->type == ASTNodeType::YieldExpression) {
                Value yield_result =
                    evaluateYield(stmt->children[0], env, engine, context, statementIndex);
                std::string var_name = stmt->value;
                if(stmt->type == ASTNodeType::ConstDeclaration) {
                    env->define(var_name, yield_result, VariableType::Const);
                } else if(stmt->type == ASTNodeType::LetDeclaration) {
                    env->define(var_name, yield_result, VariableType::Let);
                } else {
                    env->define(var_name, yield_result, VariableType::Var);
                }
                return yield_result;
            }
            if(stmt->children[0]->type == ASTNodeType::AwaitExpression) {
                Value await_result =
                    evaluateAwait(stmt->children[0], env, engine, context, statementIndex);
                std::string var_name = stmt->value;
                if(stmt->type == ASTNodeType::ConstDeclaration) {
                    env->define(var_name, await_result, VariableType::Const);
                } else if(stmt->type == ASTNodeType::LetDeclaration) {
                    env->define(var_name, await_result, VariableType::Let);
                } else {
                    env->define(var_name, await_result, VariableType::Var);
                }
                return await_result;
            }
        }
    }

    // Handle nested loops
    if(stmt->type == ASTNodeType::WhileStatement) {
        return evaluateWhile(stmt, env, engine, context, statementIndex);
    }

    if(stmt->type == ASTNodeType::ForStatement) {
        return evaluateFor(stmt, env, engine, context, statementIndex);
    }

    if(stmt->type == ASTNodeType::ForAwaitOfStatement) {
        return evaluateForAwaitOf(stmt, env, engine, context, statementIndex);
    }

    // Default: use engine evaluation
    return engine->evaluate(stmt, env);
}

bool AsyncGeneratorEvaluator::containsSuspensionPoint(std::shared_ptr<ASTNode> node, int targetId) {
    if(!node) {
        return false;
    }

    // Check if this is the target suspension point (yield or await)
    if(node->type == ASTNodeType::YieldExpression || node->type == ASTNodeType::AwaitExpression ||
       node->type == ASTNodeType::ForAwaitOfStatement) {
        int id = getSuspensionPointId(node);
        if(id == targetId) {
            return true;
        }
    }

    // Recursively check children
    for(const auto& child : node->children) {
        if(containsSuspensionPoint(child, targetId)) {
            return true;
        }
    }

    return false;
}

int AsyncGeneratorEvaluator::assignSuspensionPointIds(std::shared_ptr<ASTNode> node, int startId) {
    if(!node) {
        return startId;
    }

    int next_id = startId;

    // Yield expressions get a suspensionId
    if(node->type == ASTNodeType::YieldExpression) {
        std::string id_str = "suspensionId:" + std::to_string(next_id);
        if(node->metadata.empty()) {
            node->metadata = id_str;
        } else if(node->metadata.find("suspensionId:") == std::string::npos) {
            node->metadata += "," + id_str;
        }
        next_id++;
    }

    // Await expressions get a suspensionId
    if(node->type == ASTNodeType::AwaitExpression) {
        std::string id_str = "suspensionId:" + std::to_string(next_id);
        if(node->metadata.empty()) {
            node->metadata = id_str;
        } else if(node->metadata.find("suspensionId:") == std::string::npos) {
            node->metadata += "," + id_str;
        }
        next_id++;
    }

    // ForAwaitOfStatement gets its own ID
    if(node->type == ASTNodeType::ForAwaitOfStatement) {
        std::string id_str = "suspensionId:" + std::to_string(next_id);
        if(node->metadata.empty()) {
            node->metadata = id_str;
        } else if(node->metadata.find("suspensionId:") == std::string::npos) {
            node->metadata += "," + id_str;
        }
        next_id++;
    }

    // Recursively process children
    for(auto& child : node->children) {
        next_id = assignSuspensionPointIds(child, next_id);
    }

    return next_id;
}

int AsyncGeneratorEvaluator::getSuspensionPointId(std::shared_ptr<ASTNode> node) {
    if(!node) {
        return -1;
    }

    // Look for suspensionId in metadata
    size_t pos = node->metadata.find("suspensionId:");
    if(pos == std::string::npos) {
        return -1;
    }

    size_t start = pos + 13;  // length of "suspensionId:"
    size_t end = node->metadata.find(',', start);
    if(end == std::string::npos) {
        end = node->metadata.length();
    }

    std::string id_str = node->metadata.substr(start, end - start);
    try {
        return std::stoi(id_str);
    } catch(const std::exception&) {
        return -1;
    }
}

Value AsyncGeneratorEvaluator::evaluateYieldStar(Value iterable, Rift* engine,
                                                 AsyncGeneratorExecutionContext& context,
                                                 int yieldId, int statementIndex) {
    Value iterator;

    if(context.inDelegation && context.delegationYieldId == yieldId) {
        iterator = context.delegatedIterator;
    } else {
        if(!iterable.isObject()) {
            throw JavaScriptException(Value("TypeError: yield* operand is not iterable"));
        }

        auto* obj = iterable.getObject();

        Value next_check = obj->getProperty("next");
        if(next_check.isFunction()) {
            iterator = iterable;
        } else {
            std::string iterator_key =
                EvaluationUtils::symbolToPropertyKey(builtins::Symbol::getIteratorId());
            Value iterator_method = obj->getProperty(iterator_key);

            if(iterator_method.isUndefined() || !iterator_method.isFunction()) {
                throw JavaScriptException(Value("TypeError: yield* operand is not iterable"));
            }

            auto* iterator_func =
                dynamic_cast<rift::runtime::JSFunction*>(iterator_method.getObject());
            if(!iterator_func) {
                throw JavaScriptException(Value("TypeError: Symbol.iterator is not a function"));
            }

            CallContext ctx(CallType::Function, iterable);
            iterator = iterator_func->call(ctx, {});

            if(!iterator.isObject()) {
                throw JavaScriptException(
                    Value("TypeError: Symbol.iterator did not return an object"));
            }
        }
    }

    auto* iterator_obj = iterator.getObject();

    Value next_method = iterator_obj->getProperty("next");
    if(!next_method.isFunction()) {
        throw JavaScriptException(Value("TypeError: iterator.next is not a function"));
    }

    auto* next_func = dynamic_cast<rift::runtime::JSFunction*>(next_method.getObject());
    if(!next_func) {
        throw JavaScriptException(Value("TypeError: iterator.next is not a function"));
    }

    std::vector<Value> args;
    if(context.isResuming && context.inDelegation) {
        args.push_back(context.sentValue);
    }

    CallContext next_ctx(CallType::Function, iterator);
    Value result = next_func->call(next_ctx, args);

    if(!result.isObject()) {
        throw JavaScriptException(Value("TypeError: iterator.next() did not return an object"));
    }

    auto* result_obj = result.getObject();
    Value done = result_obj->getProperty("done");
    Value value = result_obj->getProperty("value");

    if(done.toBool()) {
        context.inDelegation = false;
        context.delegatedIterator = Value::undefined();
        context.delegationYieldId = -1;
        context.isResuming = false;
        return value;
    }

    context.inDelegation = true;
    context.delegatedIterator = iterator;
    context.delegationYieldId = yieldId;
    context.resumeStatementIndex = statementIndex;
    context.isResuming = false;
    context.suspendedAtYield = true;
    context.suspendedAtAwait = false;

    throw YieldException(value, yieldId, statementIndex);
}

Value AsyncGeneratorEvaluator::evaluateTryStatement(std::shared_ptr<ASTNode> node,
                                                    std::shared_ptr<Environment> env, Rift* engine,
                                                    AsyncGeneratorExecutionContext& context,
                                                    int /*statementIndex*/) {
    if(node->children.size() < 1) {
        return Value::undefined();
    }

    auto try_block = node->children[0];

    std::shared_ptr<ASTNode> catch_clause = nullptr;
    std::shared_ptr<ASTNode> finally_clause = nullptr;
    if(node->children.size() > 1) {
        if(node->children[1] && node->children[1]->type == ASTNodeType::CatchClause) {
            catch_clause = node->children[1];
            if(node->children.size() > 2 && node->children[2] &&
               node->children[2]->type == ASTNodeType::FinallyClause) {
                finally_clause = node->children[2];
            }
        } else if(node->children[1] && node->children[1]->type == ASTNodeType::FinallyClause) {
            finally_clause = node->children[1];
        }
    }

    Value result = Value::undefined();
    bool normal_completion = false;
    Value pending_exception_value = Value::undefined();

    // --- Resumption: inside the finally block ---
    if(context.isResuming && context.inFinallyBlock && finally_clause &&
       !finally_clause->children.empty() &&
       containsSuspensionPoint(finally_clause->children[0], context.currentSuspensionId)) {
        evaluateBlock(finally_clause->children[0], env, engine, context);
        Value completion_value = context.pendingCompletionValue;
        bool had_return = context.hasPendingReturn;
        bool had_exception = context.hasPendingException;
        context.inFinallyBlock = false;
        context.hasPendingReturn = false;
        context.hasPendingException = false;
        if(had_return) {
            throw ReturnException(completion_value);
        }
        if(had_exception) {
            throw JavaScriptException(completion_value);
        }
        return completion_value;
    }

    // --- Resumption: inside the catch block ---
    if(context.isResuming && context.inCatchBlock && catch_clause) {
        auto catch_body = catch_clause->children[0];
        if(containsSuspensionPoint(catch_body, context.currentSuspensionId)) {
            std::string parameter_name = catch_clause->value;
            auto catch_env = env->createChild();
            catch_env->define(parameter_name, context.caughtValue);

            try {
                result = evaluateBlock(catch_body, catch_env, engine, context);
                context.inCatchBlock = false;
                normal_completion = true;
            } catch(const YieldException&) {
                throw;
            } catch(const AwaitException&) {
                throw;
            } catch(const ReturnException& e) {
                context.inCatchBlock = false;
                if(finally_clause && !finally_clause->children.empty()) {
                    context.inFinallyBlock = true;
                    context.hasPendingReturn = true;
                    context.pendingCompletionValue = e.getValue();
                    evaluateBlock(finally_clause->children[0], env, engine, context);
                    context.inFinallyBlock = false;
                    context.hasPendingReturn = false;
                }
                throw;
            }

            if(finally_clause && !finally_clause->children.empty()) {
                context.inFinallyBlock = true;
                context.pendingCompletionValue = result;
                evaluateBlock(finally_clause->children[0], env, engine, context);
                context.inFinallyBlock = false;
            }

            return result;
        }
    }

    // --- Normal execution ---

    try {
        result = evaluateBlock(try_block, env, engine, context);
        normal_completion = true;
    } catch(const YieldException&) {
        // Yield suspensions propagate through try - don't run finally yet
        throw;
    } catch(const AwaitException&) {
        // Await suspensions propagate through try - don't run finally yet
        throw;
    } catch(const JavaScriptException& e) {
        if(catch_clause) {
            std::string parameter_name = catch_clause->value;
            auto catch_body = catch_clause->children[0];
            auto catch_env = env->createChild();
            catch_env->define(parameter_name, e.getValue());

            context.inCatchBlock = true;
            context.caughtValue = e.getValue();

            try {
                result = evaluateBlock(catch_body, catch_env, engine, context);
                context.inCatchBlock = false;
                normal_completion = true;
            } catch(const YieldException&) {
                throw;
            } catch(const AwaitException&) {
                throw;
            } catch(const ReturnException& ret) {
                context.inCatchBlock = false;
                if(finally_clause && !finally_clause->children.empty()) {
                    context.inFinallyBlock = true;
                    context.hasPendingReturn = true;
                    context.pendingCompletionValue = ret.getValue();
                    evaluateBlock(finally_clause->children[0], env, engine, context);
                    context.inFinallyBlock = false;
                    context.hasPendingReturn = false;
                }
                throw;
            }
        } else {
            pending_exception_value = e.getValue();
        }
    } catch(const ReturnException& e) {
        if(finally_clause && !finally_clause->children.empty()) {
            context.inFinallyBlock = true;
            context.hasPendingReturn = true;
            context.pendingCompletionValue = e.getValue();
            evaluateBlock(finally_clause->children[0], env, engine, context);
            context.inFinallyBlock = false;
            context.hasPendingReturn = false;
        }
        throw;
    }

    // Run finally if present
    if(finally_clause && !finally_clause->children.empty()) {
        context.inFinallyBlock = true;
        if(!normal_completion && !pending_exception_value.isUndefined()) {
            context.hasPendingException = true;
            context.pendingCompletionValue = pending_exception_value;
        } else {
            context.pendingCompletionValue = result;
        }
        evaluateBlock(finally_clause->children[0], env, engine, context);
        context.inFinallyBlock = false;
        context.hasPendingException = false;
    }

    if(!normal_completion && !pending_exception_value.isUndefined()) {
        throw JavaScriptException(pending_exception_value);
    }

    return result;
}

}  // namespace rift::core
