#pragma once

#include <memory>
#include <vector>

#include "rift/execution/environment.h"
#include "rift/frontend/ast/ast_node.h"
#include "rift/types/value.h"

namespace rift::core {

using namespace rift::runtime;
using namespace rift::ast;

// Forward declarations
class Rift;

/**
 * Async generator execution context stored in the async generator object.
 * Combines yield (from GeneratorExecutionContext) and await (from AsyncExecutionContext)
 * state for suspend/resume across both yield and await points.
 */
struct AsyncGeneratorExecutionContext {
    // Suspension point tracking (shared ID space for yield and await)
    int currentSuspensionId = -1;  // Which suspension point we stopped at (-1 = not started)
    int resumeStatementIndex = 0;  // Which statement to resume from
    Value sentValue;               // Value passed to next() or resolved from await
    bool isResuming = false;       // True if we're resuming from a suspension point

    // Await-specific state
    bool throwOnResume = false;   // True if awaited promise was rejected
    bool returnOnResume = false;  // True if .return() was called (abrupt return completion)

    // Whether we suspended at a yield or an await
    bool suspendedAtYield = false;  // True if last suspension was yield
    bool suspendedAtAwait = false;  // True if last suspension was await

    // yield* delegation state
    bool inDelegation = false;   // True if we're delegating to an inner iterator
    Value delegatedIterator;     // The inner iterator object
    int delegationYieldId = -1;  // The yield* point we're delegating from

    // try/catch resumption state
    bool inCatchBlock = false;  // True if we yielded/awaited from inside a catch block
    Value caughtValue;          // The caught exception value (for recreating catch env)

    // finally block resumption state
    bool inFinallyBlock = false;       // True if we yielded/awaited from inside a finally block
    bool hasPendingReturn = false;     // Finally was triggered by a return statement
    bool hasPendingException = false;  // Finally was triggered by an uncaught exception
    Value pendingCompletionValue;      // The value to restore after finally completes
};

/**
 * AsyncGeneratorEvaluator
 *
 * A specialized evaluator for async generator function bodies. It handles:
 * - Yield expressions (throwing YieldException)
 * - Await expressions (throwing AwaitException)
 * - Resumption from both yield and await points
 * - Tracking execution state for suspend/resume
 *
 * Combines the approaches of GeneratorEvaluator (yield) and AsyncExecutor (await)
 * into a unified evaluator with a shared suspension point ID space.
 */
class AsyncGeneratorEvaluator {
  public:
    /**
     * Execute an async generator body with the given context.
     *
     * @param body The async generator function body (BlockStatement)
     * @param env The generator's environment (with parameters bound)
     * @param engine The Rift engine
     * @param context The execution context for tracking state
     * @return The final return value (or undefined if completed without return)
     * @throws YieldException when yield is encountered
     * @throws AwaitException when await is encountered
     */
    static Value execute(std::shared_ptr<ASTNode> body, std::shared_ptr<Environment> env,
                         Rift* engine, AsyncGeneratorExecutionContext& context);

  private:
    /**
     * Evaluate a block statement, handling yield/await resumption.
     */
    static Value evaluateBlock(std::shared_ptr<ASTNode> block, std::shared_ptr<Environment> env,
                               Rift* engine, AsyncGeneratorExecutionContext& context);

    /**
     * Evaluate a single statement within an async generator.
     */
    static Value evaluateStatement(std::shared_ptr<ASTNode> stmt, std::shared_ptr<Environment> env,
                                   Rift* engine, AsyncGeneratorExecutionContext& context,
                                   int statementIndex);

    /**
     * Evaluate a yield expression.
     */
    static Value evaluateYield(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                               Rift* engine, AsyncGeneratorExecutionContext& context,
                               int statementIndex);

    /**
     * Evaluate an await expression.
     */
    static Value evaluateAwait(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                               Rift* engine, AsyncGeneratorExecutionContext& context,
                               int statementIndex);

    /**
     * Check if a statement or its descendants contain a specific suspension point.
     * Checks for both yield and await nodes with the given ID.
     */
    static bool containsSuspensionPoint(std::shared_ptr<ASTNode> node, int targetId);

    /**
     * Assign unique IDs to all yield and await expressions in the body.
     * Yield and await share the same ID counter.
     * Returns the total number of suspension points found.
     */
    static int assignSuspensionPointIds(std::shared_ptr<ASTNode> node, int startId = 0);

    /**
     * Get the suspension point ID from a YieldExpression or AwaitExpression node.
     */
    static int getSuspensionPointId(std::shared_ptr<ASTNode> node);

    /**
     * Evaluate a while loop that may contain yields/awaits.
     */
    static Value evaluateWhile(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                               Rift* engine, AsyncGeneratorExecutionContext& context,
                               int statementIndex);

    /**
     * Evaluate a for loop that may contain yields/awaits.
     */
    static Value evaluateFor(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                             Rift* engine, AsyncGeneratorExecutionContext& context,
                             int statementIndex);

    /**
     * Evaluate a for-await-of loop.
     */
    static Value evaluateForAwaitOf(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                                    Rift* engine, AsyncGeneratorExecutionContext& context,
                                    int statementIndex);

    /**
     * Evaluate the body of a loop (block or single statement).
     */
    static Value evaluateLoopBody(std::shared_ptr<ASTNode> body, std::shared_ptr<Environment> env,
                                  Rift* engine, AsyncGeneratorExecutionContext& context,
                                  int statementIndex);

    /**
     * Evaluate a single statement inside a loop body.
     */
    static Value evaluateLoopBodyStatement(std::shared_ptr<ASTNode> stmt,
                                           std::shared_ptr<Environment> env, Rift* engine,
                                           AsyncGeneratorExecutionContext& context,
                                           int statementIndex);

    /**
     * Handle yield* delegation to an inner iterator.
     */
    static Value evaluateYieldStar(Value iterable, Rift* engine,
                                   AsyncGeneratorExecutionContext& context, int yieldId,
                                   int statementIndex);

    /**
     * Evaluate a try/catch/finally statement within an async generator.
     */
    static Value evaluateTryStatement(std::shared_ptr<ASTNode> node,
                                      std::shared_ptr<Environment> env, Rift* engine,
                                      AsyncGeneratorExecutionContext& context, int statementIndex);
};

}  // namespace rift::core
