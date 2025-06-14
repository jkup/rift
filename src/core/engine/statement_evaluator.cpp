#include "rift/core/engine/statement_evaluator.h"
#include "rift/core/engine/engine.h"
#include "rift/runtime/values/object.h"

namespace rift::core {

// Custom exception for handling return statements
class ReturnException : public std::exception {
private:
    Value returnValue_;
public:
    ReturnException(const Value& value) : returnValue_(value) {}
    const Value& getValue() const { return returnValue_; }
    const char* what() const noexcept override { return "Return statement"; }
};

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
    // Not implemented yet
    return Value::undefined();
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

}  // namespace rift::core 