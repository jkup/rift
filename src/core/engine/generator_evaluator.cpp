/**
 * Generator Evaluator Implementation
 *
 * This file implements the generator execution logic, handling:
 * - Yield expression evaluation and suspension
 * - Resumption from yield points
 * - Statement-by-statement execution with yield point tracking
 */

#include "rift/core/engine/generator_evaluator.h"

#include "rift/builtins/symbol/symbol.h"
#include "rift/core/engine/engine.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/frontend/ast/ast_node.h"
#include "rift/runtime/values/object.h"

namespace rift::core {

Value GeneratorEvaluator::execute(std::shared_ptr<ASTNode> body, std::shared_ptr<Environment> env,
                                  Rift* engine, GeneratorExecutionContext& context) {
    // First, assign yield IDs if not done already
    // We use a simple approach: walk the AST and assign sequential IDs
    // The ID is stored in the node's metadata field as "yieldId:N"
    static bool ids_assigned = false;
    if(!ids_assigned || context.currentYieldId == -1) {
        assignYieldIds(body);
    }

    // Evaluate the body block
    try {
        return evaluateBlock(body, env, engine, context);
    } catch(const ReturnException& e) {
        // Generator returned explicitly
        return e.getValue();
    }
    // YieldException propagates up to the caller (GeneratorIterator::next)
}

Value GeneratorEvaluator::evaluateBlock(std::shared_ptr<ASTNode> block,
                                        std::shared_ptr<Environment> env, Rift* engine,
                                        GeneratorExecutionContext& context) {
    if(!block || block->children.empty()) {
        return Value::undefined();
    }

    Value result = Value::undefined();

    // Determine starting index
    // When resuming, we always start from 0 and use containsYieldPoint to find
    // the right statement. This is necessary because resumeStatementIndex is relative
    // to the block where the yield occurred, which may be nested (e.g., inside a try block).
    int startIndex = 0;

    for(size_t i = static_cast<size_t>(startIndex); i < block->children.size(); ++i) {
        auto& stmt = block->children[i];
        result = evaluateStatement(stmt, env, engine, context, static_cast<int>(i));
    }

    return result;
}

Value GeneratorEvaluator::evaluateStatement(std::shared_ptr<ASTNode> stmt,
                                            std::shared_ptr<Environment> env, Rift* engine,
                                            GeneratorExecutionContext& context,
                                            int statementIndex) {
    if(!stmt) {
        return Value::undefined();
    }

    // Check if we're resuming and this statement contains our target yield
    if(context.isResuming) {
        int targetYieldId = context.currentYieldId;

        // Check if this statement contains the yield we're resuming from
        if(containsYieldPoint(stmt, targetYieldId)) {
            // This statement contains our yield point

            // If this is an ExpressionStatement containing just a yield (not yield*)
            if(stmt->type == ASTNodeType::ExpressionStatement && !stmt->children.empty()) {
                auto& expr = stmt->children[0];
                if(expr->type == ASTNodeType::YieldExpression) {
                    // Check if this is yield* - if so, let evaluateYield handle it
                    bool is_delegate = expr->metadata.find("delegate") != std::string::npos;
                    if(!is_delegate && !context.inDelegation) {
                        // Regular yield - return the sent value
                        context.isResuming = false;
                        context.currentYieldId = getYieldId(expr);
                        return context.sentValue;
                    }
                    // For yield* or delegation in progress, fall through to evaluateYield
                }
            }

            // For statements that have special yield handling, don't clear isResuming here -
            // let the specialized handlers deal with it
            // Also don't clear if we're in a yield* delegation
            if(context.inDelegation) {
                // In delegation - let evaluateYield handle it
            } else if(stmt->type != ASTNodeType::VariableDeclaration &&
                      stmt->type != ASTNodeType::LetDeclaration &&
                      stmt->type != ASTNodeType::ConstDeclaration &&
                      stmt->type != ASTNodeType::WhileStatement &&
                      stmt->type != ASTNodeType::ForStatement &&
                      stmt->type != ASTNodeType::TryStatement) {
                // For other complex cases, clear resuming flag
                context.isResuming = false;
            }
        } else {
            // This statement doesn't contain our yield point - skip it
            return Value::undefined();
        }
    }

    // Normal evaluation - delegate to the engine
    // But we need to handle yield expressions specially
    if(stmt->type == ASTNodeType::ExpressionStatement && !stmt->children.empty()) {
        auto& expr = stmt->children[0];
        if(expr->type == ASTNodeType::YieldExpression) {
            return evaluateYield(expr, env, engine, context, statementIndex);
        }
    }

    // For variable declarations that might contain yield
    if(stmt->type == ASTNodeType::VariableDeclaration ||
       stmt->type == ASTNodeType::LetDeclaration || stmt->type == ASTNodeType::ConstDeclaration) {
        // Check if the initializer is a yield
        if(!stmt->children.empty() && stmt->children[0]->type == ASTNodeType::YieldExpression) {
            // const x = yield value;
            Value yieldResult = evaluateYield(stmt->children[0], env, engine, context,
                                              statementIndex);

            // Define the variable with the yield result
            std::string var_name = stmt->value;
            if(stmt->type == ASTNodeType::ConstDeclaration) {
                env->define(var_name, yieldResult, VariableType::Const);
            } else if(stmt->type == ASTNodeType::LetDeclaration) {
                env->define(var_name, yieldResult, VariableType::Let);
            } else {
                env->define(var_name, yieldResult, VariableType::Var);
            }
            return yieldResult;
        }
    }

    // Handle while loops that might contain yield
    if(stmt->type == ASTNodeType::WhileStatement) {
        return evaluateWhile(stmt, env, engine, context, statementIndex);
    }

    // Handle for loops that might contain yield
    if(stmt->type == ASTNodeType::ForStatement) {
        return evaluateFor(stmt, env, engine, context, statementIndex);
    }

    // Handle try/catch/finally that might contain yield
    if(stmt->type == ASTNodeType::TryStatement) {
        return evaluateTryStatement(stmt, env, engine, context, statementIndex);
    }

    // Default: use the engine's normal evaluation
    return engine->evaluate(stmt, env);
}

Value GeneratorEvaluator::evaluateYield(std::shared_ptr<ASTNode> node,
                                        std::shared_ptr<Environment> env, Rift* engine,
                                        GeneratorExecutionContext& context, int statementIndex) {
    int yieldId = getYieldId(node);

    // Check for yield* (delegate) - handle resumption into delegation
    bool is_delegate = node->metadata.find("delegate") != std::string::npos;

    // Check if we're resuming from a delegation at this yield point
    if(context.isResuming && context.inDelegation && context.delegationYieldId == yieldId) {
        // We're resuming into a yield* delegation - continue with the inner iterator
        return evaluateYieldStar(context.delegatedIterator, engine, context, yieldId, statementIndex);
    }

    // Check if we're resuming at this exact yield point (non-delegation)
    if(context.isResuming && context.currentYieldId == yieldId && !context.inDelegation) {
        // We're resuming from this yield - return the sent value
        context.isResuming = false;
        return context.sentValue;
    }

    // We're yielding here - evaluate the argument
    Value yielded_value = Value::undefined();
    if(!node->children.empty()) {
        yielded_value = engine->evaluate(node->children[0], env);
    }

    // Check for yield* (delegate)
    if(is_delegate) {
        // Start delegation to the inner iterator
        return evaluateYieldStar(yielded_value, engine, context, yieldId, statementIndex);
    }

    // Update context for resumption
    context.resumeStatementIndex = statementIndex;

    // Throw to suspend the generator
    throw YieldException(yielded_value, yieldId, statementIndex);
}

Value GeneratorEvaluator::evaluateWhile(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                                        Rift* engine, GeneratorExecutionContext& context,
                                        int statementIndex) {
    // WhileStatement structure:
    // children[0] = condition
    // children[1] = body

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

        // Evaluate the body - may contain yields
        try {
            result = evaluateLoopBody(body, env, engine, context, statementIndex);
        } catch(const BreakException&) {
            break;
        } catch(const ContinueException&) {
            continue;
        }
        // YieldException propagates up
    }

    return result;
}

Value GeneratorEvaluator::evaluateFor(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                                      Rift* engine, GeneratorExecutionContext& context,
                                      int statementIndex) {
    // ForStatement structure:
    // children[0] = init (or nullptr)
    // children[1] = condition (or nullptr)
    // children[2] = update (or nullptr)
    // children[3] = body

    if(node->children.size() < 4) {
        return Value::undefined();
    }

    auto& init = node->children[0];
    auto& condition = node->children[1];
    auto& update = node->children[2];
    auto& body = node->children[3];

    Value result = Value::undefined();

    // For generators, use the parent environment directly to preserve loop variables across yields.
    // This is a simplification - in a full implementation, we'd store the loop environment.
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

        // Evaluate the body - may contain yields
        try {
            result = evaluateLoopBody(body, loop_env, engine, context, statementIndex);
        } catch(const BreakException&) {
            break;
        } catch(const ContinueException&) {
            // Fall through to update
        }
        // YieldException propagates up

        // Run update
        if(update) {
            engine->evaluate(update, loop_env);
        }
    }

    return result;
}

Value GeneratorEvaluator::evaluateLoopBody(std::shared_ptr<ASTNode> body,
                                           std::shared_ptr<Environment> env, Rift* engine,
                                           GeneratorExecutionContext& context, int statementIndex) {
    // Body can be a BlockStatement or a single statement
    if(!body) {
        return Value::undefined();
    }

    if(body->type == ASTNodeType::BlockStatement) {
        // Evaluate each statement in the block
        Value result = Value::undefined();
        for(size_t i = 0; i < body->children.size(); ++i) {
            auto& stmt = body->children[i];

            // Check if we need to skip to a specific statement when resuming
            if(context.isResuming) {
                if(!containsYieldPoint(stmt, context.currentYieldId)) {
                    continue;  // Skip statements before our yield point
                }
            }

            result = evaluateLoopBodyStatement(stmt, env, engine, context, statementIndex);
        }
        return result;
    }

    // Single statement body
    return evaluateLoopBodyStatement(body, env, engine, context, statementIndex);
}

Value GeneratorEvaluator::evaluateLoopBodyStatement(std::shared_ptr<ASTNode> stmt,
                                                    std::shared_ptr<Environment> env, Rift* engine,
                                                    GeneratorExecutionContext& context,
                                                    int statementIndex) {
    // Handle yield expressions directly
    if(stmt->type == ASTNodeType::ExpressionStatement && !stmt->children.empty()) {
        auto& expr = stmt->children[0];
        if(expr->type == ASTNodeType::YieldExpression) {
            return evaluateYield(expr, env, engine, context, statementIndex);
        }
    }

    // Handle variable declarations with yield
    if(stmt->type == ASTNodeType::VariableDeclaration || stmt->type == ASTNodeType::LetDeclaration ||
       stmt->type == ASTNodeType::ConstDeclaration) {
        if(!stmt->children.empty() && stmt->children[0]->type == ASTNodeType::YieldExpression) {
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

bool GeneratorEvaluator::containsYieldPoint(std::shared_ptr<ASTNode> node, int targetYieldId) {
    if(!node) {
        return false;
    }

    // Check if this is the target yield
    if(node->type == ASTNodeType::YieldExpression) {
        int id = getYieldId(node);
        if(id == targetYieldId) {
            return true;
        }
    }

    // Recursively check children
    for(const auto& child : node->children) {
        if(containsYieldPoint(child, targetYieldId)) {
            return true;
        }
    }

    return false;
}

int GeneratorEvaluator::assignYieldIds(std::shared_ptr<ASTNode> node, int startId) {
    if(!node) {
        return startId;
    }

    int nextId = startId;

    // If this is a yield expression, assign it an ID
    if(node->type == ASTNodeType::YieldExpression) {
        // Store the ID in metadata
        // Format: existing metadata + ",yieldId:N" or just "yieldId:N"
        std::string id_str = "yieldId:" + std::to_string(nextId);
        if(node->metadata.empty()) {
            node->metadata = id_str;
        } else if(node->metadata.find("yieldId:") == std::string::npos) {
            node->metadata += "," + id_str;
        }
        nextId++;
    }

    // Recursively process children
    for(auto& child : node->children) {
        nextId = assignYieldIds(child, nextId);
    }

    return nextId;
}

int GeneratorEvaluator::getYieldId(std::shared_ptr<ASTNode> node) {
    if(!node || node->type != ASTNodeType::YieldExpression) {
        return -1;
    }

    // Parse the yieldId from metadata
    size_t pos = node->metadata.find("yieldId:");
    if(pos == std::string::npos) {
        return -1;
    }

    // Extract the number after "yieldId:"
    size_t start = pos + 8;  // length of "yieldId:"
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

Value GeneratorEvaluator::evaluateYieldStar(Value iterable, Rift* engine,
                                            GeneratorExecutionContext& context, int yieldId,
                                            int statementIndex) {
    Value iterator;

    // If we're resuming a delegation, use the stored iterator
    if(context.inDelegation && context.delegationYieldId == yieldId) {
        iterator = context.delegatedIterator;
    } else {
        // Get an iterator from the iterable
        if(!iterable.isObject()) {
            throw JavaScriptException(Value("TypeError: yield* operand is not iterable"));
        }

        auto* obj = iterable.getObject();

        // Check if it's already an iterator (has next method)
        Value next_check = obj->getProperty("next");
        if(next_check.isFunction()) {
            // Already an iterator, use directly
            iterator = iterable;
        } else {
            // Try to get Symbol.iterator
            std::string iterator_key =
                EvaluationUtils::symbolToPropertyKey(builtins::Symbol::getIteratorId());
            Value iterator_method = obj->getProperty(iterator_key);

            if(iterator_method.isUndefined() || !iterator_method.isFunction()) {
                throw JavaScriptException(Value("TypeError: yield* operand is not iterable"));
            }

            // Call [Symbol.iterator]() to get iterator object
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

    // Get the next method
    Value next_method = iterator_obj->getProperty("next");
    if(!next_method.isFunction()) {
        throw JavaScriptException(Value("TypeError: iterator.next is not a function"));
    }

    auto* next_func = dynamic_cast<rift::runtime::JSFunction*>(next_method.getObject());
    if(!next_func) {
        throw JavaScriptException(Value("TypeError: iterator.next is not a function"));
    }

    // Call next() - pass sentValue if we're resuming
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
        // Inner iterator is exhausted - clear delegation state and return completion value
        context.inDelegation = false;
        context.delegatedIterator = Value::undefined();
        context.delegationYieldId = -1;
        context.isResuming = false;
        return value;  // This becomes the result of the yield* expression
    }

    // Inner iterator yielded a value - set up delegation state and yield to outer caller
    context.inDelegation = true;
    context.delegatedIterator = iterator;
    context.delegationYieldId = yieldId;
    context.resumeStatementIndex = statementIndex;
    context.isResuming = false;

    // Yield the value to the outer caller
    throw YieldException(value, yieldId, statementIndex);
}

Value GeneratorEvaluator::evaluateTryStatement(std::shared_ptr<ASTNode> node,
                                               std::shared_ptr<Environment> env, Rift* engine,
                                               GeneratorExecutionContext& context,
                                               int statementIndex) {
    if(node->children.size() < 1) {
        return Value::undefined();
    }

    // Get try block (first child)
    auto tryBlock = node->children[0];

    // Get catch clause (second child, if present)
    std::shared_ptr<ASTNode> catchClause = nullptr;
    std::shared_ptr<ASTNode> finallyClause = nullptr;
    if(node->children.size() > 1) {
        // children: [0]=tryBlock, [1]=catch? or finally?, [2]=finally?
        if(node->children[1] && node->children[1]->type == ASTNodeType::CatchClause) {
            catchClause = node->children[1];
            if(node->children.size() > 2 && node->children[2] &&
               node->children[2]->type == ASTNodeType::FinallyClause) {
                finallyClause = node->children[2];
            }
        } else if(node->children[1] && node->children[1]->type == ASTNodeType::FinallyClause) {
            finallyClause = node->children[1];
        }
    }

    Value result = Value::undefined();
    bool normalCompletion = false;
    Value pendingExceptionValue = Value::undefined();

    // Check if we're resuming from a yield that was inside the catch block
    if(context.isResuming && context.inCatchBlock && catchClause) {
        auto catchBody = catchClause->children[0];
        if(containsYieldPoint(catchBody, context.currentYieldId)) {
            // Resuming into the catch block - recreate the catch environment
            std::string parameterName = catchClause->value;
            auto catchEnv = env->createChild();
            catchEnv->define(parameterName, context.caughtValue);

            try {
                result = evaluateBlock(catchBody, catchEnv, engine, context);
                context.inCatchBlock = false;  // Leaving catch block normally
                normalCompletion = true;
            } catch(const YieldException&) {
                // Still in catch block, state already set
                if(finallyClause && !finallyClause->children.empty()) {
                    evaluateBlock(finallyClause->children[0], env, engine, context);
                }
                throw;
            }

            // Run finally if present
            if(finallyClause && !finallyClause->children.empty()) {
                evaluateBlock(finallyClause->children[0], env, engine, context);
            }

            return result;
        }
    }

    // Check if we're resuming from a yield in the finally block
    if(context.isResuming && finallyClause && !finallyClause->children.empty()) {
        if(containsYieldPoint(finallyClause->children[0], context.currentYieldId)) {
            // Resuming into finally block
            result = evaluateBlock(finallyClause->children[0], env, engine, context);
            return result;
        }
    }

    try {
        // Execute try block using generator-aware evaluation
        result = evaluateBlock(tryBlock, env, engine, context);
        normalCompletion = true;
    } catch(const YieldException&) {
        // YieldException should propagate - run finally if present, then rethrow
        if(finallyClause && !finallyClause->children.empty()) {
            evaluateBlock(finallyClause->children[0], env, engine, context);
        }
        throw;  // Rethrow YieldException
    } catch(const JavaScriptException& e) {
        // Handle JavaScript exceptions (thrown by 'throw' statements)
        if(catchClause) {
            // Get catch parameter name from node value
            std::string parameterName = catchClause->value;
            // Get catch body (first child)
            auto catchBody = catchClause->children[0];
            // Create new environment for catch block
            auto catchEnv = env->createChild();
            // Bind the caught value to the catch parameter
            catchEnv->define(parameterName, e.getValue());

            // Store state in case we yield from the catch block
            context.inCatchBlock = true;
            context.caughtValue = e.getValue();

            try {
                // Execute catch body using generator-aware evaluation
                result = evaluateBlock(catchBody, catchEnv, engine, context);
                context.inCatchBlock = false;  // Leaving catch block normally
                normalCompletion = true;  // caught
            } catch(const YieldException&) {
                // Yielding from catch block - state already set
                if(finallyClause && !finallyClause->children.empty()) {
                    evaluateBlock(finallyClause->children[0], env, engine, context);
                }
                throw;
            }
        } else {
            // Save exception to rethrow after finally
            pendingExceptionValue = e.getValue();
        }
    } catch(const ReturnException&) {
        // Return exceptions should not be caught; run finally then rethrow
        if(finallyClause && !finallyClause->children.empty()) {
            evaluateBlock(finallyClause->children[0], env, engine, context);
        }
        throw;  // Rethrow return
    }

    // Run finally if present
    if(finallyClause && !finallyClause->children.empty()) {
        evaluateBlock(finallyClause->children[0], env, engine, context);
    }

    // If an exception was pending and no catch handled it, rethrow now
    if(!normalCompletion && !pendingExceptionValue.isUndefined()) {
        throw JavaScriptException(pendingExceptionValue);
    }

    return result;
}

}  // namespace rift::core
