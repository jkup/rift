#pragma once

#include <memory>
#include <vector>

#include "../../frontend/ast/ast_node.h"
#include "../../runtime/environment/environment.h"
#include "../../runtime/values/value.h"

namespace rift::core {

using namespace rift::runtime;
using namespace rift::ast;

// Forward declarations
class Rift;

/**
 * Generator execution context stored in the generator object.
 * This tracks the state needed to resume a generator.
 */
struct GeneratorExecutionContext {
    int currentYieldId = -1;        // Which yield we stopped at (-1 = not started)
    int resumeStatementIndex = 0;   // Which statement to resume from
    Value sentValue;                // Value passed to next()
    bool isResuming = false;        // True if we're resuming from a yield

    // yield* delegation state
    bool inDelegation = false;      // True if we're delegating to an inner iterator
    Value delegatedIterator;        // The inner iterator object
    int delegationYieldId = -1;     // The yield* point we're delegating from
};

/**
 * GeneratorEvaluator
 *
 * A specialized evaluator for generator function bodies. It handles:
 * - Yield expressions (throwing YieldException)
 * - Resumption from yield points (skipping to the right statement)
 * - Tracking execution state for suspend/resume
 *
 * The key insight is that we use a two-phase approach:
 * 1. First call: Execute from start, throwing YieldException on yield
 * 2. Resume calls: Skip statements until we're past the yield point, then continue
 */
class GeneratorEvaluator {
  public:
    /**
     * Execute a generator body with the given context.
     *
     * @param body The generator function body (BlockStatement)
     * @param env The generator's environment (with parameters bound)
     * @param engine The Rift engine
     * @param context The execution context for tracking state
     * @return The final return value (or undefined if completed without return)
     * @throws YieldException when yield is encountered
     */
    static Value execute(std::shared_ptr<ASTNode> body, std::shared_ptr<Environment> env,
                         Rift* engine, GeneratorExecutionContext& context);

  private:
    /**
     * Evaluate a block statement, handling yield resumption.
     */
    static Value evaluateBlock(std::shared_ptr<ASTNode> block, std::shared_ptr<Environment> env,
                               Rift* engine, GeneratorExecutionContext& context);

    /**
     * Evaluate a single statement within a generator.
     */
    static Value evaluateStatement(std::shared_ptr<ASTNode> stmt, std::shared_ptr<Environment> env,
                                   Rift* engine, GeneratorExecutionContext& context,
                                   int statementIndex);

    /**
     * Evaluate a yield expression.
     * If resuming to this yield point, returns the sent value.
     * Otherwise, throws YieldException.
     */
    static Value evaluateYield(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                               Rift* engine, GeneratorExecutionContext& context,
                               int statementIndex);

    /**
     * Check if a statement or its descendants contain a specific yield point.
     */
    static bool containsYieldPoint(std::shared_ptr<ASTNode> node, int targetYieldId);

    /**
     * Assign unique IDs to all yield expressions in the body.
     * Returns the total number of yields found.
     */
    static int assignYieldIds(std::shared_ptr<ASTNode> node, int startId = 0);

    /**
     * Get the yield ID from a YieldExpression node.
     */
    static int getYieldId(std::shared_ptr<ASTNode> node);

    /**
     * Evaluate a while loop that may contain yields.
     */
    static Value evaluateWhile(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                               Rift* engine, GeneratorExecutionContext& context, int statementIndex);

    /**
     * Evaluate a for loop that may contain yields.
     */
    static Value evaluateFor(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                             Rift* engine, GeneratorExecutionContext& context, int statementIndex);

    /**
     * Evaluate the body of a loop (block or single statement).
     */
    static Value evaluateLoopBody(std::shared_ptr<ASTNode> body, std::shared_ptr<Environment> env,
                                  Rift* engine, GeneratorExecutionContext& context,
                                  int statementIndex);

    /**
     * Evaluate a single statement inside a loop body.
     */
    static Value evaluateLoopBodyStatement(std::shared_ptr<ASTNode> stmt,
                                           std::shared_ptr<Environment> env, Rift* engine,
                                           GeneratorExecutionContext& context, int statementIndex);

    /**
     * Handle yield* delegation to an inner iterator.
     * Returns the completion value when the inner iterator is exhausted.
     * Throws YieldException for each value from the inner iterator.
     */
    static Value evaluateYieldStar(Value iterable, Rift* engine, GeneratorExecutionContext& context,
                                   int yieldId, int statementIndex);
};

}  // namespace rift::core
