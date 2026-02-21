/**
 * Async Executor Implementation
 *
 * This file implements the async function execution logic, handling:
 * - Await expression evaluation and suspension
 * - Promise-based resumption via .then() handlers
 * - Statement-by-statement execution with await point tracking
 * - Try/catch/finally interop with await
 */

#include "rift/interpreter/async_executor.h"

#include <stdexcept>
#include <string>

#include "rift/builtins/promise/promise.h"
#include "rift/builtins/symbol/symbol.h"
#include "rift/frontend/ast/ast_node.h"
#include "rift/interpreter/call_context.h"
#include "rift/interpreter/engine.h"
#include "rift/interpreter/evaluation_utils.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/memory/gc_protector.h"
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

AsyncExecutionContext* AsyncExecutor::active_context_ = nullptr;

AsyncExecutionContext* AsyncExecutor::getActiveContext() {
    return active_context_;
}

void AsyncExecutor::executeAsync(std::shared_ptr<ASTNode> body, std::shared_ptr<Environment> env,
                                 Rift* engine, JSObject* resultPromise) {
    auto context = std::make_shared<AsyncExecutionContext>();
    assignAwaitIds(body);
    step(body, env, engine, resultPromise, context);
}

void AsyncExecutor::step(std::shared_ptr<ASTNode> body, std::shared_ptr<Environment> env,
                         Rift* engine, JSObject* resultPromise,
                         std::shared_ptr<AsyncExecutionContext> context) {
    try {
        Value result = execute(body, env, engine, *context);
        builtins::Promise::resolvePromise(resultPromise, result);
    } catch(const ReturnException& e) {
        builtins::Promise::resolvePromise(resultPromise, e.getValue());
    } catch(const AwaitException& e) {
        // Save state for resumption
        context->currentAwaitId = e.getAwaitPointId();
        context->resumeStatementIndex = e.getStatementIndex();

        // Get the awaited value
        Value awaited = e.getValue();

        // Wrap non-Promise values in a resolved promise per spec
        auto* factory = engine->getObjectFactory();
        if(!builtins::Promise::isPromise(awaited)) {
            auto* wrapped = builtins::Promise::createPromiseObject(factory);
            builtins::Promise::resolvePromise(wrapped, awaited);
            awaited = Value(wrapped);
        }

        // Create onFulfilled handler: resumes with resolved value
        auto* on_fulfilled = factory->createJSFunction(
            [body, env, engine, resultPromise, context](const CallContext& /*ctx*/,
                                                        const std::vector<Value>& args) -> Value {
                context->sentValue = args.empty() ? Value::undefined() : args[0];
                context->isResuming = true;
                context->throwOnResume = false;
                step(body, env, engine, resultPromise, context);
                return Value::undefined();
            });

        // Create onRejected handler: resumes with rejection reason (will throw)
        auto* on_rejected = factory->createJSFunction(
            [body, env, engine, resultPromise, context](const CallContext& /*ctx*/,
                                                        const std::vector<Value>& args) -> Value {
                context->sentValue = args.empty() ? Value::undefined() : args[0];
                context->isResuming = true;
                context->throwOnResume = true;
                step(body, env, engine, resultPromise, context);
                return Value::undefined();
            });

        // Attach handlers via Promise.prototype.then
        CallContext then_ctx(CallType::Function, awaited);
        builtins::Promise::then(then_ctx, {Value(on_fulfilled), Value(on_rejected)});
    } catch(const JavaScriptException& e) {
        builtins::Promise::rejectPromise(resultPromise, e.getValue());
    } catch(const std::exception& e) {
        builtins::Promise::rejectPromise(resultPromise, Value(std::string(e.what())));
    }
}

Value AsyncExecutor::execute(std::shared_ptr<ASTNode> body, std::shared_ptr<Environment> env,
                             Rift* engine, AsyncExecutionContext& context) {
    // Set active context so ExpressionEvaluator::evaluateAwaitExpression()
    // can access it when await appears in nested expressions
    AsyncExecutionContext* prev_context = active_context_;
    active_context_ = &context;

    try {
        Value result = evaluateBlock(body, env, engine, context);
        active_context_ = prev_context;
        return result;
    } catch(const ReturnException& e) {
        active_context_ = prev_context;
        return e.getValue();
    } catch(const std::exception&) {
        active_context_ = prev_context;
        throw;
    }
}

Value AsyncExecutor::evaluateBlock(std::shared_ptr<ASTNode> block, std::shared_ptr<Environment> env,
                                   Rift* engine, AsyncExecutionContext& context) {
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

Value AsyncExecutor::evaluateStatement(std::shared_ptr<ASTNode> stmt,
                                       std::shared_ptr<Environment> env, Rift* engine,
                                       AsyncExecutionContext& context, int statementIndex) {
    if(!stmt) {
        return Value::undefined();
    }

    // Check if we're resuming and this statement contains our target await
    if(context.isResuming) {
        int target_await_id = context.currentAwaitId;

        if(containsAwaitPoint(stmt, target_await_id)) {
            // This statement contains our await point

            // If this is an ExpressionStatement containing just an await
            if(stmt->type == ASTNodeType::ExpressionStatement && !stmt->children.empty()) {
                auto& expr = stmt->children[0];
                if(expr->type == ASTNodeType::AwaitExpression) {
                    context.isResuming = false;
                    context.currentAwaitId = getAwaitId(expr);
                    if(context.throwOnResume) {
                        context.throwOnResume = false;
                        throw JavaScriptException(context.sentValue);
                    }
                    return context.sentValue;
                }
            }

            // Don't clear isResuming here - let the specific handlers
            // (evaluateAwait, evaluateLoopBody, evaluateTryStatement) or the
            // fallback in ExpressionEvaluator::evaluateAwaitExpression() clear
            // it when the actual await point is reached.
        } else {
            // This statement doesn't contain our await point - skip it
            return Value::undefined();
        }
    }

    // Normal evaluation - handle await expressions specially
    if(stmt->type == ASTNodeType::ExpressionStatement && !stmt->children.empty()) {
        auto& expr = stmt->children[0];
        if(expr->type == ASTNodeType::AwaitExpression) {
            return evaluateAwait(expr, env, engine, context, statementIndex);
        }
    }

    // Variable declarations with await initializer
    if(stmt->type == ASTNodeType::VariableDeclaration ||
       stmt->type == ASTNodeType::LetDeclaration || stmt->type == ASTNodeType::ConstDeclaration) {
        if(!stmt->children.empty() && stmt->children[0]->type == ASTNodeType::AwaitExpression) {
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

    // Return statements with await: return await expr
    if(stmt->type == ASTNodeType::ReturnStatement && !stmt->children.empty()) {
        auto& expr = stmt->children[0];
        if(expr->type == ASTNodeType::AwaitExpression) {
            Value await_result = evaluateAwait(expr, env, engine, context, statementIndex);
            throw ReturnException(await_result);
        }
    }

    // Loop statements with possible awaits
    if(stmt->type == ASTNodeType::WhileStatement) {
        return evaluateWhile(stmt, env, engine, context, statementIndex);
    }

    if(stmt->type == ASTNodeType::ForStatement) {
        return evaluateFor(stmt, env, engine, context, statementIndex);
    }

    // For-await-of loops
    if(stmt->type == ASTNodeType::ForAwaitOfStatement) {
        return evaluateForAwaitOf(stmt, env, engine, context, statementIndex);
    }

    // Try/catch/finally with possible awaits
    if(stmt->type == ASTNodeType::TryStatement) {
        return evaluateTryStatement(stmt, env, engine, context, statementIndex);
    }

    // Default: use the engine's normal evaluation
    return engine->evaluate(stmt, env);
}

Value AsyncExecutor::evaluateAwait(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                                   Rift* engine, AsyncExecutionContext& context,
                                   int statementIndex) {
    int await_id = getAwaitId(node);

    // Check if we're resuming at this exact await point
    if(context.isResuming && context.currentAwaitId == await_id) {
        context.isResuming = false;
        // If the awaited promise was rejected, throw the rejection reason
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

    // Throw to suspend the async function
    throw AwaitException(awaited_value, await_id, statementIndex);
}

Value AsyncExecutor::evaluateWhile(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                                   Rift* engine, AsyncExecutionContext& context,
                                   int statementIndex) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    auto& condition = node->children[0];
    auto& body = node->children[1];

    Value result = Value::undefined();

    // If resuming inside this while loop, skip first condition check
    bool first_iteration = true;
    bool skip_condition = context.isResuming;

    while(true) {
        // Check condition (skip on first iteration if resuming)
        if(!skip_condition || !first_iteration) {
            Value cond_val = engine->evaluate(condition, env);
            if(!cond_val.toBool()) {
                break;
            }
        }
        skip_condition = false;
        first_iteration = false;

        // Evaluate the body - may contain awaits
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
        // AwaitException propagates up
    }

    return result;
}

Value AsyncExecutor::evaluateFor(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                                 Rift* engine, AsyncExecutionContext& context, int statementIndex) {
    if(node->children.size() < 4) {
        return Value::undefined();
    }

    auto& init = node->children[0];
    auto& condition = node->children[1];
    auto& update = node->children[2];
    auto& body = node->children[3];

    Value result = Value::undefined();
    auto& loop_env = env;

    // If NOT resuming, run the init
    if(!context.isResuming && init) {
        engine->evaluate(init, loop_env);
    }

    // If resuming inside this for loop, skip first condition check
    bool first_iteration = true;
    bool skip_condition = context.isResuming;

    while(true) {
        // Check condition (skip on first iteration if resuming)
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

        // Evaluate the body - may contain awaits
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
        // AwaitException propagates up

        // Run update
        if(update) {
            engine->evaluate(update, loop_env);
        }
    }

    return result;
}

Value AsyncExecutor::evaluateLoopBody(std::shared_ptr<ASTNode> body,
                                      std::shared_ptr<Environment> env, Rift* engine,
                                      AsyncExecutionContext& context, int statementIndex) {
    if(!body) {
        return Value::undefined();
    }

    if(body->type == ASTNodeType::BlockStatement) {
        Value result = Value::undefined();
        for(size_t i = 0; i < body->children.size(); ++i) {
            auto& stmt = body->children[i];

            // Check if we need to skip to a specific statement when resuming
            if(context.isResuming) {
                if(!containsAwaitPoint(stmt, context.currentAwaitId)) {
                    continue;
                }
            }

            result = evaluateLoopBodyStatement(stmt, env, engine, context, statementIndex);
        }
        return result;
    }

    // Single statement body
    return evaluateLoopBodyStatement(body, env, engine, context, statementIndex);
}

Value AsyncExecutor::evaluateLoopBodyStatement(std::shared_ptr<ASTNode> stmt,
                                               std::shared_ptr<Environment> env, Rift* engine,
                                               AsyncExecutionContext& context, int statementIndex) {
    // Handle await expressions directly
    if(stmt->type == ASTNodeType::ExpressionStatement && !stmt->children.empty()) {
        auto& expr = stmt->children[0];
        if(expr->type == ASTNodeType::AwaitExpression) {
            return evaluateAwait(expr, env, engine, context, statementIndex);
        }
    }

    // Handle variable declarations with await
    if(stmt->type == ASTNodeType::VariableDeclaration ||
       stmt->type == ASTNodeType::LetDeclaration || stmt->type == ASTNodeType::ConstDeclaration) {
        if(!stmt->children.empty() && stmt->children[0]->type == ASTNodeType::AwaitExpression) {
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

    // Handle nested while loops
    if(stmt->type == ASTNodeType::WhileStatement) {
        return evaluateWhile(stmt, env, engine, context, statementIndex);
    }

    // Handle nested for loops
    if(stmt->type == ASTNodeType::ForStatement) {
        return evaluateFor(stmt, env, engine, context, statementIndex);
    }

    // Handle nested for-await-of loops
    if(stmt->type == ASTNodeType::ForAwaitOfStatement) {
        return evaluateForAwaitOf(stmt, env, engine, context, statementIndex);
    }

    // Default: use engine evaluation
    return engine->evaluate(stmt, env);
}

bool AsyncExecutor::containsAwaitPoint(std::shared_ptr<ASTNode> node, int targetAwaitId) {
    if(!node) {
        return false;
    }

    if(node->type == ASTNodeType::AwaitExpression ||
       node->type == ASTNodeType::ForAwaitOfStatement) {
        int id = getAwaitId(node);
        if(id == targetAwaitId) {
            return true;
        }
    }

    for(const auto& child : node->children) {
        if(containsAwaitPoint(child, targetAwaitId)) {
            return true;
        }
    }

    return false;
}

int AsyncExecutor::assignAwaitIds(std::shared_ptr<ASTNode> node, int startId) {
    if(!node) {
        return startId;
    }

    int next_id = startId;

    if(node->type == ASTNodeType::AwaitExpression) {
        std::string id_str = "awaitId:" + std::to_string(next_id);
        if(node->metadata.empty()) {
            node->metadata = id_str;
        } else if(node->metadata.find("awaitId:") == std::string::npos) {
            node->metadata += "," + id_str;
        }
        next_id++;
    }

    // ForAwaitOfStatement gets its own await ID for the implicit .next() await point
    if(node->type == ASTNodeType::ForAwaitOfStatement) {
        std::string id_str = "awaitId:" + std::to_string(next_id);
        if(node->metadata.empty()) {
            node->metadata = id_str;
        } else if(node->metadata.find("awaitId:") == std::string::npos) {
            node->metadata += "," + id_str;
        }
        next_id++;
    }

    for(auto& child : node->children) {
        next_id = assignAwaitIds(child, next_id);
    }

    return next_id;
}

int AsyncExecutor::getAwaitId(std::shared_ptr<ASTNode> node) {
    if(!node || (node->type != ASTNodeType::AwaitExpression &&
                 node->type != ASTNodeType::ForAwaitOfStatement)) {
        return -1;
    }

    size_t pos = node->metadata.find("awaitId:");
    if(pos == std::string::npos) {
        return -1;
    }

    size_t start = pos + 8;  // length of "awaitId:"
    size_t end = node->metadata.find(',', start);
    if(end == std::string::npos) {
        end = node->metadata.length();
    }

    std::string id_str = node->metadata.substr(start, end - start);
    try {
        return std::stoi(id_str);
    } catch(const std::invalid_argument&) {
        return -1;
    } catch(const std::out_of_range&) {
        return -1;
    }
}

Value AsyncExecutor::evaluateForAwaitOf(std::shared_ptr<ASTNode> node,
                                        std::shared_ptr<Environment> env, Rift* engine,
                                        AsyncExecutionContext& context, int statementIndex) {
    if(node->children.size() < 3) {
        return Value::undefined();
    }

    auto left_node = node->children[0];   // Variable declaration or identifier
    auto right_node = node->children[1];  // Iterable expression
    auto body_node = node->children[2];   // Loop body

    int for_await_id = getAwaitId(node);

    // Get the variable name and declaration type
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

    // Hidden variable names for storing state across resumptions
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

    // Case 1: Resuming at this node's own await ID (the awaited value resolved)
    if(context.isResuming && context.currentAwaitId == for_await_id) {
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

        // Assign resolved value to loop variable
        env->set(var_name, value);

        // Execute loop body
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
            // Fall through to next iteration
        }

        // Continue the loop: get the iterator and call .next() again
        Value iterator = env->get(iter_var);
        if(!iterator.isObject()) {
            return result;
        }

        callNextAndAwait(iterator, is_async_iter);

        return result;
    }

    // Case 2: Resuming with target await inside the loop body
    if(context.isResuming) {
        if(containsAwaitPoint(body_node, context.currentAwaitId)) {
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
                // Fall through to next iteration
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

    // Case 3: First entry - evaluate iterable, get iterator, start loop

    Value iterable = engine->evaluate(right_node, env);

    // Declare the loop variable (use let semantics for const to allow re-assignment per iteration)
    if(decl_type == ASTNodeType::LetDeclaration) {
        env->define(var_name, Value::undefined(), VariableType::Let);
    } else if(decl_type == ASTNodeType::ConstDeclaration) {
        env->define(var_name, Value::undefined(), VariableType::Let);
    } else if(decl_type == ASTNodeType::VariableDeclaration) {
        env->define(var_name, Value::undefined());
    }

    // Get the iterator object
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

Value AsyncExecutor::evaluateTryStatement(std::shared_ptr<ASTNode> node,
                                          std::shared_ptr<Environment> env, Rift* engine,
                                          AsyncExecutionContext& context, int /*statementIndex*/) {
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

    // --- Resumption: await was inside the finally block ---
    if(context.isResuming && context.inFinallyBlock && finally_clause &&
       !finally_clause->children.empty() &&
       containsAwaitPoint(finally_clause->children[0], context.currentAwaitId)) {
        evaluateBlock(finally_clause->children[0], env, engine, context);
        // Finally completed - replay the original completion
        Value completionValue = context.pendingCompletionValue;
        bool hadReturn = context.hasPendingReturn;
        bool hadException = context.hasPendingException;
        context.inFinallyBlock = false;
        context.hasPendingReturn = false;
        context.hasPendingException = false;
        if(hadReturn) {
            throw ReturnException(completionValue);
        }
        if(hadException) {
            throw JavaScriptException(completionValue);
        }
        return completionValue;
    }

    // --- Resumption: await was inside the catch block ---
    if(context.isResuming && context.inCatchBlock && catch_clause) {
        auto catch_body = catch_clause->children[0];
        if(containsAwaitPoint(catch_body, context.currentAwaitId)) {
            // Resuming into the catch block - recreate the catch environment
            std::string parameter_name = catch_clause->value;
            auto catch_env = env->createChild();
            catch_env->define(parameter_name, context.caughtValue);

            try {
                result = evaluateBlock(catch_body, catch_env, engine, context);
                context.inCatchBlock = false;
                normal_completion = true;
            } catch(const AwaitException&) {
                // Re-suspending from catch block - just propagate
                throw;
            } catch(const ReturnException& e) {
                // Return from catch body - run finally then re-throw
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

            // Catch completed normally - run finally if present
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
    } catch(const AwaitException&) {
        // Suspension from try block - just propagate, don't run finally.
        // AwaitException is a suspension mechanism, not a real exception.
        // Finally will run when the try block actually completes on resumption.
        throw;
    } catch(const JavaScriptException& e) {
        if(catch_clause) {
            std::string parameter_name = catch_clause->value;
            auto catch_body = catch_clause->children[0];
            auto catch_env = env->createChild();
            catch_env->define(parameter_name, e.getValue());

            // Store state in case we await from the catch block
            context.inCatchBlock = true;
            context.caughtValue = e.getValue();

            try {
                result = evaluateBlock(catch_body, catch_env, engine, context);
                context.inCatchBlock = false;
                normal_completion = true;
            } catch(const AwaitException&) {
                // Suspension from catch block - just propagate
                throw;
            } catch(const ReturnException& ret) {
                // Return from catch body - run finally then re-throw
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
        // Return from try/catch body - run finally then re-throw
        if(finally_clause && !finally_clause->children.empty()) {
            context.inFinallyBlock = true;
            context.hasPendingReturn = true;
            context.pendingCompletionValue = e.getValue();
            evaluateBlock(finally_clause->children[0], env, engine, context);
            // If we get here, finally completed without suspending
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
        // If we get here, finally completed without suspending
        context.inFinallyBlock = false;
        context.hasPendingException = false;
    }

    // If an exception was pending and no catch handled it, rethrow now
    if(!normal_completion && !pending_exception_value.isUndefined()) {
        throw JavaScriptException(pending_exception_value);
    }

    return result;
}

}  // namespace rift::core
