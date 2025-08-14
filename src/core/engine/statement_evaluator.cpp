#include "rift/core/engine/statement_evaluator.h"

#include <iostream>

#include "rift/core/engine/engine.h"
#include "rift/core/engine/evaluation_utils.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/runtime/values/object.h"

namespace rift::core {

// ExceptionGuard implementation
ExceptionGuard::ExceptionGuard(Rift* engine) : engine_(engine) {
    if(engine_) {
        engine_->enterExceptionHandling();
    }
}

ExceptionGuard::~ExceptionGuard() {
    if(engine_) {
        engine_->exitExceptionHandling();
    }
}

Value StatementEvaluator::evaluate(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                                   Rift* engine) {
    if(!node) {
        return Value::undefined();
    }

    switch(node->type) {
        case ASTNodeType::Program:
            return evaluateBlockStatement(node, env, engine);
        case ASTNodeType::BlockStatement:
            return evaluateBlockStatement(node, env, engine);
        case ASTNodeType::ExpressionStatement:
            return evaluateExpressionStatement(node, env, engine);
        case ASTNodeType::VariableDeclaration:
            return evaluateVariableDeclaration(node, env, engine);
        case ASTNodeType::LetDeclaration:
            return evaluateLetDeclaration(node, env, engine);
        case ASTNodeType::ConstDeclaration:
            return evaluateConstDeclaration(node, env, engine);
        case ASTNodeType::IfStatement:
            return evaluateIfStatement(node, env, engine);
        case ASTNodeType::WhileStatement:
            return evaluateWhileStatement(node, env, engine);
        case ASTNodeType::ForStatement:
            return evaluateForStatement(node, env, engine);
        case ASTNodeType::SwitchStatement:
            return evaluateSwitchStatement(node, env, engine);
        case ASTNodeType::BreakStatement:
            return evaluateBreakStatement(node, env, engine);
        case ASTNodeType::ContinueStatement:
            // Signal a continue to loop evaluators
            throw ContinueException();
        case ASTNodeType::ReturnStatement:
            return evaluateReturnStatement(node, env, engine);
        case ASTNodeType::ThrowStatement:
            return evaluateThrowStatement(node, env, engine);
        case ASTNodeType::TryStatement:
            return evaluateTryStatement(node, env, engine);
        case ASTNodeType::CatchClause:
            // CatchClause is not evaluated directly, only through try-catch
            return Value::undefined();
        case ASTNodeType::FinallyClause:
            // FinallyClause is not evaluated directly, only through try-catch
            return Value::undefined();
        case ASTNodeType::FunctionDeclaration:
            return evaluateFunctionDeclaration(node, env, engine);
        default:
            return Value::undefined();
    }
}

Value StatementEvaluator::evaluateBlockStatement(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine) {
    // Check if we need to create a block scope
    bool needsBlockScope = false;
    for(auto& child : node->children) {
        if(child->type == ASTNodeType::LetDeclaration || 
           child->type == ASTNodeType::ConstDeclaration) {
            needsBlockScope = true;
            break;
        }
    }
    
    std::shared_ptr<Environment> blockEnv = env;
    if(needsBlockScope) {
        blockEnv = env->createChild(true);  // Create block scope
    }
    
    Value result = Value::undefined();
    for(auto& child : node->children) {
        result = engine->evaluate(child, blockEnv);
    }
    return result;
}

Value StatementEvaluator::evaluateExpressionStatement(std::shared_ptr<ASTNode> node,
                                                      std::shared_ptr<Environment> env,
                                                      Rift* engine) {
    if(!node->children.empty()) {
        return engine->evaluate(node->children[0], env);
    }
    return Value::undefined();
}

Value StatementEvaluator::evaluateVariableDeclaration(std::shared_ptr<ASTNode> node,
                                                      std::shared_ptr<Environment> env,
                                                      Rift* engine) {
    // Get the variable name
    std::string varName = node->value;

    // Get the initial value if provided
    Value value = Value::undefined();
    if(node->children.size() > 0) {
        value = engine->evaluate(node->children[0], env);
    }

    // Define the variable in the environment with var semantics
    env->define(varName, value, VariableType::Var);

    return value;
}

Value StatementEvaluator::evaluateLetDeclaration(std::shared_ptr<ASTNode> node,
                                                  std::shared_ptr<Environment> env,
                                                  Rift* engine) {
    // Get the variable name
    std::string varName = node->value;

    // Get the initial value if provided
    Value value = Value::undefined();
    if(node->children.size() > 0) {
        value = engine->evaluate(node->children[0], env);
    }

    // Define the variable in the environment with let semantics
    env->define(varName, value, VariableType::Let);

    return value;
}

Value StatementEvaluator::evaluateConstDeclaration(std::shared_ptr<ASTNode> node,
                                                    std::shared_ptr<Environment> env,
                                                    Rift* engine) {
    // Get the variable name
    std::string varName = node->value;

    // const must have an initializer (enforced by parser)
    if(node->children.size() == 0) {
        throw std::runtime_error("Missing initializer in const declaration");
    }

    // Evaluate the initial value
    Value value = engine->evaluate(node->children[0], env);

    // Define the variable in the environment with const semantics
    env->define(varName, value, VariableType::Const);

    return value;
}

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

    // Throw the JavaScript exception with the actual value
    throw JavaScriptException(thrownValue);
}

Value StatementEvaluator::evaluateFunctionDeclaration(std::shared_ptr<ASTNode> node,
                                                      std::shared_ptr<Environment> env,
                                                      Rift* engine) {
    if(node->children.size() < 2) {
        return Value::undefined();
    }

    // Get function name
    std::string functionName = node->value;

    // Get parameters (first child should be parameter list)
    auto paramList = node->children[0];
    std::vector<std::string> parameters;
    for(const auto& param : paramList->children) {
        parameters.push_back(param->value);
    }

    // Get function body (second child)
    auto body = node->children[1];

    // Create function object using GC-managed creation
    auto func = engine->getObjectFactory()->createJSFunction(
        [engine, parameters, body, env](const rift::core::CallContext& callContext, const std::vector<Value>& args) -> Value {
            // Create new environment for function execution
            auto funcEnv = std::make_shared<Environment>(env);

            // Bind 'this' to the function environment
            funcEnv->define("this", callContext.thisValue);

            // Bind parameters to real arguments
            for(size_t i = 0; i < parameters.size(); ++i) {
                Value argValue = (i < args.size()) ? args[i] : Value::undefined();
                funcEnv->define(parameters[i], argValue);
            }

            // Execute function body
            try {
                return engine->evaluate(body, funcEnv);
            } catch(const ReturnException& e) {
                // Handle return statements - extract the actual return value
                return e.getValue();
            } catch(const std::runtime_error& e) {
                // Handle other runtime errors
                throw;
            }
        });

    // Define function in current environment
    env->define(functionName, Value(func));

    return Value(func);
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

}  // namespace rift::core