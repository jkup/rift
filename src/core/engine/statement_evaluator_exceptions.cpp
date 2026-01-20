/**
 * Statement Evaluator - Exception Handling Methods
 *
 * This file contains exception handling statement evaluation methods:
 * - throw statements
 * - try/catch/finally statements
 *
 * Split from statement_evaluator.cpp for better maintainability.
 */

#include "rift/core/engine/statement_evaluator.h"

#include "rift/core/engine/engine.h"
#include "rift/core/engine/javascript_exception.h"

namespace rift::core {

Value StatementEvaluator::evaluateThrowStatement(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() < 1) {
        return Value::undefined();
    }

    // Use RAII guard to properly manage exception handling state
    // This defers GC collection instead of permanently disabling it
    ExceptionGuard guard(engine);

    // Evaluate the expression to throw
    Value thrownValue = engine->evaluate(node->children[0], env);

    // Throw the JavaScript exception with the actual value and source location
    throw JavaScriptException(thrownValue, node->line, node->column);
}

Value StatementEvaluator::evaluateTryStatement(std::shared_ptr<ASTNode> node,
                                               std::shared_ptr<Environment> env, Rift* engine) {
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
        // Disambiguate by type
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

    try {
        // Execute try block
        result = engine->evaluate(tryBlock, env);
        normalCompletion = true;
    } catch(const JavaScriptException& e) {
        // Handle JavaScript exceptions (thrown by 'throw' statements)
        if(catchClause) {
            result = evaluateCatchClause(catchClause, env, engine, e.getValue());
            normalCompletion = true;  // caught
        } else {
            // Save exception to rethrow after finally
            pendingExceptionValue = e.getValue();
        }
    } catch(const ReturnException& e) {
        // Return exceptions should not be caught; run finally then rethrow
        if(finallyClause) {
            engine->evaluate(finallyClause->children[0], env);
        }
        throw;  // rethrow return
    }

    // Run finally if present
    if(finallyClause) {
        engine->evaluate(finallyClause->children[0], env);
    }

    // If an exception was pending and no catch handled it, rethrow now
    if(!normalCompletion && !pendingExceptionValue.isUndefined()) {
        throw JavaScriptException(pendingExceptionValue);
    }

    return result;
}

Value StatementEvaluator::evaluateCatchClause(std::shared_ptr<ASTNode> node,
                                              std::shared_ptr<Environment> env, Rift* engine,
                                              const Value& caughtValue) {
    if(node->children.size() < 1) {
        return Value::undefined();
    }

    // Get catch parameter name from node value
    std::string parameterName = node->value;

    // Get catch body (first child)
    auto catchBody = node->children[0];

    // Create new environment for catch block
    auto catchEnv = env->createChild();

    // Bind the caught value to the catch parameter
    catchEnv->define(parameterName, caughtValue);

    // Execute catch body in the new environment
    return engine->evaluate(catchBody, catchEnv);
}

}  // namespace rift::core
