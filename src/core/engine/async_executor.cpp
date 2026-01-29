/**
 * Async Executor Implementation
 *
 * This file implements the async function execution logic, handling:
 * - Await expression evaluation and suspension
 * - Promise-based resumption via .then() handlers
 * - Statement-by-statement execution with await point tracking
 * - Try/catch/finally interop with await
 */

#include "rift/core/engine/async_executor.h"

#include <stdexcept>
#include <string>

#include "rift/builtins/promise/promise.h"
#include "rift/core/engine/call_context.h"
#include "rift/core/engine/engine.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/frontend/ast/ast_node.h"
#include "rift/memory/gc_protector.h"
#include "rift/runtime/values/object.h"

namespace rift::core {

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
    } catch(...) {
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
        } catch(const BreakException&) {
            break;
        } catch(const ContinueException&) {
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
        } catch(const BreakException&) {
            break;
        } catch(const ContinueException&) {
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

    // Default: use engine evaluation
    return engine->evaluate(stmt, env);
}

bool AsyncExecutor::containsAwaitPoint(std::shared_ptr<ASTNode> node, int targetAwaitId) {
    if(!node) {
        return false;
    }

    if(node->type == ASTNodeType::AwaitExpression) {
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

    for(auto& child : node->children) {
        next_id = assignAwaitIds(child, next_id);
    }

    return next_id;
}

int AsyncExecutor::getAwaitId(std::shared_ptr<ASTNode> node) {
    if(!node || node->type != ASTNodeType::AwaitExpression) {
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

    // Check if we're resuming from an await that was inside the catch block
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
                // Still in catch block, state already set
                if(finally_clause && !finally_clause->children.empty()) {
                    evaluateBlock(finally_clause->children[0], env, engine, context);
                }
                throw;
            }

            // Run finally if present
            if(finally_clause && !finally_clause->children.empty()) {
                evaluateBlock(finally_clause->children[0], env, engine, context);
            }

            return result;
        }
    }

    // Check if we're resuming from an await in the finally block
    if(context.isResuming && finally_clause && !finally_clause->children.empty()) {
        if(containsAwaitPoint(finally_clause->children[0], context.currentAwaitId)) {
            result = evaluateBlock(finally_clause->children[0], env, engine, context);
            return result;
        }
    }

    try {
        // Execute try block using async-aware evaluation
        result = evaluateBlock(try_block, env, engine, context);
        normal_completion = true;
    } catch(const AwaitException&) {
        // AwaitException should propagate - run finally if present, then rethrow
        if(finally_clause && !finally_clause->children.empty()) {
            evaluateBlock(finally_clause->children[0], env, engine, context);
        }
        throw;
    } catch(const JavaScriptException& e) {
        // Handle JavaScript exceptions
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
                // Awaiting from catch block - state already set
                if(finally_clause && !finally_clause->children.empty()) {
                    evaluateBlock(finally_clause->children[0], env, engine, context);
                }
                throw;
            }
        } else {
            pending_exception_value = e.getValue();
        }
    } catch(const ReturnException&) {
        // Return exceptions should not be caught; run finally then rethrow
        if(finally_clause && !finally_clause->children.empty()) {
            evaluateBlock(finally_clause->children[0], env, engine, context);
        }
        throw;
    }

    // Run finally if present
    if(finally_clause && !finally_clause->children.empty()) {
        evaluateBlock(finally_clause->children[0], env, engine, context);
    }

    // If an exception was pending and no catch handled it, rethrow now
    if(!normal_completion && !pending_exception_value.isUndefined()) {
        throw JavaScriptException(pending_exception_value);
    }

    return result;
}

}  // namespace rift::core
