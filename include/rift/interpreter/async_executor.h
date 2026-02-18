#pragma once

#include <memory>
#include <vector>

#include "rift/execution/environment.h"
#include "rift/frontend/ast/ast_node.h"
#include "rift/types/value.h"

namespace rift::runtime {
class JSObject;
}

namespace rift::core {

using namespace rift::runtime;
using namespace rift::ast;

// Forward declarations
class Rift;

/**
 * Async execution context stored across resumption points.
 * Tracks the state needed to resume an async function after an await.
 * Mirrors GeneratorExecutionContext but adds throwOnResume for rejections.
 */
struct AsyncExecutionContext {
    int currentAwaitId = -1;       // Which await we stopped at (-1 = not started)
    int resumeStatementIndex = 0;  // Which statement to resume from
    Value sentValue;               // Value resolved from the awaited promise
    bool isResuming = false;       // True if we're resuming from an await
    bool throwOnResume = false;    // True if awaited promise was rejected

    // try/catch resumption state
    bool inCatchBlock = false;  // True if we awaited from inside a catch block
    Value caughtValue;          // The caught exception value (for recreating catch env)

    // finally block resumption state
    bool inFinallyBlock = false;       // True if we awaited from inside a finally block
    bool hasPendingReturn = false;     // Finally was triggered by a return statement
    bool hasPendingException = false;  // Finally was triggered by an uncaught exception
    Value pendingCompletionValue;      // The value to restore after finally completes
};

/**
 * AsyncExecutor
 *
 * A specialized evaluator for async function bodies. It handles:
 * - Await expressions (throwing AwaitException to suspend)
 * - Promise-based resumption via .then() handlers
 * - Statement-by-statement execution with await point tracking
 * - Try/catch/finally interop with await
 *
 * Uses the same two-phase approach as GeneratorEvaluator:
 * 1. First call: Execute from start, throwing AwaitException on await
 * 2. Resume calls: Skip statements until past the await point, then continue
 *
 * Instead of generator's manual next() calls, resumption is automatic
 * via Promise .then() handlers through the microtask queue.
 */
class AsyncExecutor {
  public:
    /**
     * Entry point: execute an async function body, managing the result promise.
     * Called from the async function's lambda when the function is invoked.
     *
     * @param body The async function body (BlockStatement)
     * @param env The function's environment (with parameters bound)
     * @param engine The Rift engine
     * @param resultPromise The promise to resolve/reject with the final result
     */
    static void executeAsync(std::shared_ptr<ASTNode> body, std::shared_ptr<Environment> env,
                             Rift* engine, JSObject* resultPromise);

    /**
     * Get the currently active async execution context.
     * Used by ExpressionEvaluator::evaluateAwaitExpression() as a fallback
     * when await appears in nested expressions that the executor delegates
     * to engine->evaluate().
     */
    static AsyncExecutionContext* getActiveContext();

  private:
    static AsyncExecutionContext* active_context_;
    /**
     * Run one segment of the body until completion or AwaitException.
     * On AwaitException, attaches .then() handlers to resume.
     * On completion, resolves/rejects the result promise.
     */
    static void step(std::shared_ptr<ASTNode> body, std::shared_ptr<Environment> env, Rift* engine,
                     JSObject* resultPromise, std::shared_ptr<AsyncExecutionContext> context);

    /**
     * Execute body statements with await-aware evaluation.
     */
    static Value execute(std::shared_ptr<ASTNode> body, std::shared_ptr<Environment> env,
                         Rift* engine, AsyncExecutionContext& context);

    /**
     * Evaluate a block statement, handling await resumption.
     */
    static Value evaluateBlock(std::shared_ptr<ASTNode> block, std::shared_ptr<Environment> env,
                               Rift* engine, AsyncExecutionContext& context);

    /**
     * Evaluate a single statement within an async function.
     */
    static Value evaluateStatement(std::shared_ptr<ASTNode> stmt, std::shared_ptr<Environment> env,
                                   Rift* engine, AsyncExecutionContext& context,
                                   int statementIndex);

    /**
     * Evaluate an await expression.
     * If resuming to this await point, returns the sent value (or throws if rejected).
     * Otherwise, evaluates the operand and throws AwaitException.
     */
    static Value evaluateAwait(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                               Rift* engine, AsyncExecutionContext& context, int statementIndex);

    /**
     * Check if a statement or its descendants contain a specific await point.
     */
    static bool containsAwaitPoint(std::shared_ptr<ASTNode> node, int targetAwaitId);

    /**
     * Assign unique IDs to all await expressions in the body.
     * Returns the total number of awaits found.
     */
    static int assignAwaitIds(std::shared_ptr<ASTNode> node, int startId = 0);

    /**
     * Get the await ID from an AwaitExpression node.
     */
    static int getAwaitId(std::shared_ptr<ASTNode> node);

    /**
     * Evaluate a while loop that may contain awaits.
     */
    static Value evaluateWhile(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                               Rift* engine, AsyncExecutionContext& context, int statementIndex);

    /**
     * Evaluate a for loop that may contain awaits.
     */
    static Value evaluateFor(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                             Rift* engine, AsyncExecutionContext& context, int statementIndex);

    /**
     * Evaluate a for-await-of loop that iterates over async iterables.
     */
    static Value evaluateForAwaitOf(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                                    Rift* engine, AsyncExecutionContext& context,
                                    int statementIndex);

    /**
     * Evaluate the body of a loop (block or single statement).
     */
    static Value evaluateLoopBody(std::shared_ptr<ASTNode> body, std::shared_ptr<Environment> env,
                                  Rift* engine, AsyncExecutionContext& context, int statementIndex);

    /**
     * Evaluate a single statement inside a loop body.
     */
    static Value evaluateLoopBodyStatement(std::shared_ptr<ASTNode> stmt,
                                           std::shared_ptr<Environment> env, Rift* engine,
                                           AsyncExecutionContext& context, int statementIndex);

    /**
     * Evaluate a try/catch/finally statement within an async function.
     * Properly handles AwaitException propagation while catching JavaScriptExceptions.
     */
    static Value evaluateTryStatement(std::shared_ptr<ASTNode> node,
                                      std::shared_ptr<Environment> env, Rift* engine,
                                      AsyncExecutionContext& context, int statementIndex);
};

}  // namespace rift::core
