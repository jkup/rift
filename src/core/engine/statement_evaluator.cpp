/**
 * Statement Evaluator - Core Implementation
 *
 * This file contains the core statement evaluator functionality including:
 * - ExceptionGuard RAII class
 * - Main dispatcher (evaluate)
 * - Block and expression statements
 * - Variable declarations (var, let, const)
 * - Function declarations
 *
 * Control flow statements are in statement_evaluator_control_flow.cpp
 * Exception handling statements are in statement_evaluator_exceptions.cpp
 */

#include "rift/core/engine/statement_evaluator.h"

#include <iostream>

#include "rift/core/engine/engine.h"
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

// Main dispatcher
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
        case ASTNodeType::DoWhileStatement:
            return evaluateDoWhileStatement(node, env, engine);
        case ASTNodeType::ForStatement:
            return evaluateForStatement(node, env, engine);
        case ASTNodeType::ForInStatement:
            return evaluateForInStatement(node, env, engine);
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

// Block and expression statements
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

// Variable declarations
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
                                                 std::shared_ptr<Environment> env, Rift* engine) {
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
                                                   std::shared_ptr<Environment> env, Rift* engine) {
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

// Function declaration
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
        [engine, parameters, body,
         env](const rift::core::CallContext& callContext,
              const std::vector<Value>& args) -> Value {
            // Create new environment for function execution
            auto funcEnv = std::make_shared<Environment>(env);

            // Bind 'this' to the function environment
            funcEnv->define("this", callContext.thisValue);

            // Bind parameters to real arguments
            for(size_t i = 0; i < parameters.size(); ++i) {
                Value argValue = (i < args.size()) ? args[i] : Value::undefined();
                funcEnv->define(parameters[i], argValue);
            }

            // Create 'arguments' object (array-like object with all passed arguments)
            auto* argsFactory = engine->getObjectFactory();
            auto* argumentsObj = argsFactory->createJSObject();
            for(size_t i = 0; i < args.size(); ++i) {
                argumentsObj->setProperty(std::to_string(i), args[i]);
            }
            argumentsObj->setProperty("length", Value(static_cast<double>(args.size())));
            funcEnv->define("arguments", Value(argumentsObj));

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

}  // namespace rift::core
