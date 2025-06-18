#include "rift/core/engine/statement_evaluator.h"
#include "rift/core/engine/engine.h"
#include "rift/core/engine/javascript_exception.h"
#include "rift/runtime/values/object.h"

namespace rift::core {

Value StatementEvaluator::evaluate(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    if (!node) {
        return Value::undefined();
    }

    switch (node->type) {
        case ASTNodeType::Program:
            return evaluateBlockStatement(node, env, engine);
        case ASTNodeType::BlockStatement:
            return evaluateBlockStatement(node, env, engine);
        case ASTNodeType::ExpressionStatement:
            return evaluateExpressionStatement(node, env, engine);
        case ASTNodeType::VariableDeclaration:
            return evaluateVariableDeclaration(node, env, engine);
        case ASTNodeType::IfStatement:
            return evaluateIfStatement(node, env, engine);
        case ASTNodeType::WhileStatement:
            return evaluateWhileStatement(node, env, engine);
        case ASTNodeType::ReturnStatement:
            return evaluateReturnStatement(node, env, engine);
        case ASTNodeType::ThrowStatement:
            return evaluateThrowStatement(node, env, engine);
        case ASTNodeType::TryStatement:
            return evaluateTryStatement(node, env, engine);
        case ASTNodeType::CatchClause:
            // CatchClause is not evaluated directly, only through try-catch
            return Value::undefined();
        case ASTNodeType::FunctionDeclaration:
            return evaluateFunctionDeclaration(node, env, engine);
        default:
            return Value::undefined();
    }
}

Value StatementEvaluator::evaluateBlockStatement(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    Value result = Value::undefined();
    for (auto& child : node->children) {
        result = engine->evaluate(child, env);
    }
    return result;
}

Value StatementEvaluator::evaluateExpressionStatement(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    if (!node->children.empty()) {
        return engine->evaluate(node->children[0], env);
    }
    return Value::undefined();
}

Value StatementEvaluator::evaluateVariableDeclaration(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    if (node->children.size() < 1) {
        return Value::undefined();
    }

    // Get the variable name
    std::string varName = node->value;

    // Get the initial value if provided
    Value value = Value::undefined();
    if (node->children.size() > 0) {
        value = engine->evaluate(node->children[0], env);
    }

    // Define the variable in the environment
    env->define(varName, value);

    return value;
}

Value StatementEvaluator::evaluateIfStatement(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    if (node->children.size() < 2) {
        return Value::undefined();
    }

    // Evaluate the condition
    Value condition = engine->evaluate(node->children[0], env);

    // If condition is truthy, evaluate the then branch
    if (condition.toBool()) {
        return engine->evaluate(node->children[1], env);
    }

    // If there's an else clause and condition is falsy, evaluate the else branch
    if (node->children.size() > 2) {
        return engine->evaluate(node->children[2], env);
    }

    return Value::undefined();
}

Value StatementEvaluator::evaluateWhileStatement(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    if (node->children.size() < 2) {
        return Value::undefined();
    }

    Value result = Value::undefined();
    
    // Keep looping while condition is truthy
    while (true) {
        Value condition = engine->evaluate(node->children[0], env);
        if (!condition.toBool()) {
            break;
        }
        result = engine->evaluate(node->children[1], env);
    }
    
    return result;
}

Value StatementEvaluator::evaluateReturnStatement(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    Value returnValue = Value::undefined();
    
    // If there's a return expression, evaluate it
    if (!node->children.empty()) {
        returnValue = engine->evaluate(node->children[0], env);
    }
    
    // Throw a special exception to unwind the call stack
    // This is a simple way to implement return without proper exception handling
    throw ReturnException(returnValue);
}

Value StatementEvaluator::evaluateThrowStatement(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    if (node->children.size() < 1) {
        return Value::undefined();
    }

    // Evaluate the expression to throw
    Value thrownValue = engine->evaluate(node->children[0], env);

    // Throw the JavaScript exception with the actual value
    throw JavaScriptException(thrownValue);
}

Value StatementEvaluator::evaluateFunctionDeclaration(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    if (node->children.size() < 2) {
        return Value::undefined();
    }

    // Get function name
    std::string functionName = node->value;
    
    // Get parameters (first child should be parameter list)
    auto paramList = node->children[0];
    std::vector<std::string> parameters;
    for (const auto& param : paramList->children) {
        parameters.push_back(param->value);
    }
    
    // Get function body (second child)
    auto body = node->children[1];
    
    // Create function object
    auto func = std::make_shared<JSFunction>([engine, parameters, body, env](const std::vector<Value>& args) -> Value {
        // Create new environment for function execution
        auto funcEnv = std::make_shared<Environment>(env);
        
        // Bind parameters to arguments
        for (size_t i = 0; i < parameters.size(); ++i) {
            Value argValue = (i < args.size()) ? args[i] : Value::undefined();
            funcEnv->define(parameters[i], argValue);
        }
        
        // Execute function body
        try {
            return engine->evaluate(body, funcEnv);
        } catch (const ReturnException& e) {
            // Handle return statements - extract the actual return value
            return e.getValue();
        } catch (const std::runtime_error& e) {
            // Handle other runtime errors
            throw;
        }
    });
    
    // Define function in current environment
    env->define(functionName, Value(func));
    
    return Value(func);
}

Value StatementEvaluator::evaluateTryStatement(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine) {
    if (node->children.size() < 1) {
        return Value::undefined();
    }

    // Get try block (first child)
    auto tryBlock = node->children[0];
    
    // Get catch clause (second child, if present)
    std::shared_ptr<ASTNode> catchClause = nullptr;
    if (node->children.size() > 1) {
        catchClause = node->children[1];
    }

    Value result = Value::undefined();

    try {
        // Execute try block
        result = engine->evaluate(tryBlock, env);
    } catch (const JavaScriptException& e) {
        // Handle JavaScript exceptions (thrown by 'throw' statements)
        if (catchClause) {
            result = evaluateCatchClause(catchClause, env, engine, e.getValue());
        } else {
            // Re-throw if no catch clause
            throw;
        }
    } catch (const ReturnException& e) {
        // Return exceptions should not be caught by try-catch
        throw;
    }

    return result;
}

Value StatementEvaluator::evaluateCatchClause(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env, Rift* engine, const Value& caughtValue) {
    if (node->children.size() < 1) {
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