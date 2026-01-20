/**
 * Statement Evaluator - Control Flow Methods
 *
 * This file contains control flow statement evaluation methods:
 * - if/else statements
 * - while, do-while, for loops
 * - switch statements
 * - break and return statements
 *
 * Split from statement_evaluator.cpp for better maintainability.
 */

#include "rift/core/engine/statement_evaluator.h"

#include "rift/core/engine/engine.h"
#include "rift/core/engine/javascript_exception.h"

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

}  // namespace rift::core
