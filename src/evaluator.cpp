#include "rift/evaluator.h"
#include "rift/runtime/values/object.h"  // Add this for JSFunction definition

#include <cctype>
#include <iostream>
#include <limits>
#include <stdexcept>

namespace rift {

using namespace ast;  // For ASTNodeType and ASTNode
using namespace runtime;  // For JSFunction and other runtime types

Evaluator::Evaluator(std::shared_ptr<Environment> env) : environment(env) {}

Value Evaluator::evaluate_literal(const std::shared_ptr<ASTNode>& node) {
    const std::string& value = node->value;

    // Try to determine the literal type based on the value
    if (value == "true") {
        return Value(true);
    } else if (value == "false") {
        return Value(false);
    } else if (value == "null") {
        return Value::null();
    } else if (value == "undefined") {
        return Value::undefined();
    } else if (!value.empty() && (std::isdigit(value[0]) || value[0] == '.')) {
        // Number literal
        try {
            double num = std::stod(value);
            return Value(num);
        } catch (...) {
            return Value::undefined();
        }
    } else {
        // String literal
        return Value(value);
    }
}

Value Evaluator::evaluate_identifier(const std::shared_ptr<ASTNode>& node) {
    try {
        return environment->get(node->value);
    } catch (...) {
        throw std::runtime_error("Undefined variable: " + node->value);
    }
}

Value Evaluator::evaluate_binary_expression(const std::shared_ptr<ASTNode>& node) {
    if (node->children.size() != 2) {
        throw std::runtime_error("Binary expression must have exactly 2 operands");
    }

    Value left = evaluate(node->children[0]);
    Value right = evaluate(node->children[1]);

    const std::string& op = node->value;

    if (op == "+") {
        // JavaScript addition is complex - can be numeric or string concatenation
        if (left.isString() || right.isString()) {
            return Value(left.toString() + right.toString());
        } else {
            return Value(left.toNumber() + right.toNumber());
        }
    } else if (op == "-") {
        return Value(left.toNumber() - right.toNumber());
    } else if (op == "*") {
        return Value(left.toNumber() * right.toNumber());
    } else if (op == "/") {
        double right_num = right.toNumber();
        if (right_num == 0.0) {
            return Value(std::numeric_limits<double>::infinity());
        }
        return Value(left.toNumber() / right_num);
    } else if (op == "==") {
        // If both are same type, compare directly
        if (left.getType() == right.getType()) {
            if (left.isNumber()) {
                return Value(left.toNumber() == right.toNumber());
            } else if (left.isString()) {
                return Value(left.toString() == right.toString());
            } else if (left.isBoolean()) {
                return Value(left.toBool() == right.toBool());
            }
        }
        // Otherwise, convert both to strings and compare
        return Value(left.toString() == right.toString());
    } else if (op == "===") {
        return Value(left.getType() == right.getType() && left.toString() == right.toString());
    } else if (op == "!=") {
        return Value(left.toString() != right.toString());
    } else if (op == "!==") {
        return Value(left.getType() != right.getType() || left.toString() != right.toString());
    } else if (op == "<") {
        return Value(left.toNumber() < right.toNumber());
    } else if (op == ">") {
        return Value(left.toNumber() > right.toNumber());
    } else {
        throw std::runtime_error("Unknown binary operator: " + op);
    }
}

Value Evaluator::evaluate_assignment_expression(const std::shared_ptr<ASTNode>& node) {
    if (node->children.size() != 2) {
        throw std::runtime_error("Assignment expression must have exactly 2 operands");
    }

    // Left side should be an identifier (variable name)
    auto left = node->children[0];
    if (left->type != ASTNodeType::Identifier) {
        throw std::runtime_error("Left-hand side of assignment must be an identifier");
    }

    // Evaluate the right-hand side expression
    Value right_value = evaluate(node->children[1]);

    // Set the variable in the environment
    environment->set(left->value, right_value);

    // Return the assigned value
    return right_value;
}

Value Evaluator::evaluate_variable_declaration(const std::shared_ptr<ASTNode>& node) {
    const std::string& name = node->value;
    Value value = Value::undefined();

    if (!node->children.empty()) {
        // Has initializer
        value = evaluate(node->children[0]);
    }

    environment->define(name, value);
    return value;
}

Value Evaluator::evaluate(const std::shared_ptr<ASTNode>& node) {
    if (!node) {
        return Value::undefined();
    }

    switch (node->type) {
        case ASTNodeType::Program: {
            Value result = Value::undefined();
            for (const auto& child : node->children) {
                result = evaluate(child);
            }
            return result;
        }

        case ASTNodeType::Literal:
            return evaluate_literal(node);

        case ASTNodeType::Identifier:
            return evaluate_identifier(node);

        case ASTNodeType::BinaryExpression:
            return evaluate_binary_expression(node);

        case ASTNodeType::AssignmentExpression:
            return evaluate_assignment_expression(node);

        case ASTNodeType::VariableDeclaration:
            return evaluate_variable_declaration(node);

        case ASTNodeType::ExpressionStatement:
            if (!node->children.empty()) {
                return evaluate(node->children[0]);
            }
            return Value::undefined();

        case ASTNodeType::BlockStatement: {
            Value result = Value::undefined();
            for (const auto& child : node->children) {
                result = evaluate(child);
            }
            return result;
        }

        case ASTNodeType::FunctionDeclaration:
            return evaluate_function_declaration(node);

        case ASTNodeType::FunctionExpression:
            return evaluate_function_expression(node);

        case ASTNodeType::ReturnStatement:
            return evaluate_return_statement(node);

        case ASTNodeType::CallExpression:
            return evaluate_call_expression(node);

        case ASTNodeType::MemberExpression: {
            if (node->children.size() != 2) {
                throw std::runtime_error("MemberExpression must have exactly 2 children");
            }

            Value object = evaluate(node->children[0]);       // e.g., evaluate "console"
            std::string property = node->children[1]->value;  // e.g., "log"

            // For now, just handle console.log specifically
            if (object.toString() == "[object Console]" && property == "log") {
                // Return a special value representing the console.log function
                // Note: Using string representation for now since we don't have proper function
                // objects in legacy evaluator
                return Value(std::string("console.log"));
            }

            return Value::undefined();
        }

        case ASTNodeType::IfStatement: {
            Value condition = evaluate(node->children[0]);
            if (condition.toBool()) {
                return evaluate(node->children[1]);
            } else if (node->children.size() > 2) {
                return evaluate(node->children[2]);
            }
            return Value::undefined();
        }

        default:
            throw std::runtime_error("Unknown AST node type");
    }
}

// Function evaluation implementations

Value Evaluator::evaluate_function_declaration(const std::shared_ptr<ASTNode>& node) {
    // Function declarations create a function object and bind it to the name
    // in the current scope
    if (node->children.size() < 2) {
        throw std::runtime_error("Function declaration must have parameters and body");
    }

    // Create a function object that captures the current environment
    auto func = std::make_shared<JSFunction>([this, node](const std::vector<Value>& args) {
        // Create a new environment for the function scope
        auto func_env = environment->createChild();

        // Bind parameters to arguments
        auto params = node->children[0];  // Parameter list
        for (size_t i = 0; i < params->children.size(); ++i) {
            const std::string& param_name = params->children[i]->value;
            Value arg_value = (i < args.size()) ? args[i] : Value::undefined();
            func_env->define(param_name, arg_value);
        }

        // Evaluate the function body in the new environment
        Evaluator func_eval(func_env);
        try {
            return func_eval.evaluate(node->children[1]);  // Function body
        } catch (const std::runtime_error& e) {
            // Check if this is a return value
            if (std::string(e.what()).find("Return value:") == 0) {
                // Extract the return value from the error message
                std::string return_str = e.what();
                return_str = return_str.substr(12);  // Skip "Return value:"
                // TODO: Parse the return value properly
                return Value::undefined();
            }
            throw;  // Re-throw if it's not a return
        }
    });

    // Bind the function to its name in the current scope
    environment->define(node->value, Value(func));
    return Value(func);
}

Value Evaluator::evaluate_function_expression(const std::shared_ptr<ASTNode>& node) {
    // Similar to function declaration but without binding to a name
    if (node->children.size() < 2) {
        throw std::runtime_error("Function expression must have parameters and body");
    }

    auto func = std::make_shared<JSFunction>([this, node](const std::vector<Value>& args) {
        auto func_env = environment->createChild();

        // Bind parameters to arguments
        auto params = node->children[0];  // Parameter list
        for (size_t i = 0; i < params->children.size(); ++i) {
            const std::string& param_name = params->children[i]->value;
            Value arg_value = (i < args.size()) ? args[i] : Value::undefined();
            func_env->define(param_name, arg_value);
        }

        // Evaluate the function body
        Evaluator func_eval(func_env);
        try {
            return func_eval.evaluate(node->children[1]);  // Function body
        } catch (const std::runtime_error& e) {
            if (std::string(e.what()).find("Return value:") == 0) {
                std::string return_str = e.what();
                return_str = return_str.substr(12);
                // TODO: Parse the return value properly
                return Value::undefined();
            }
            throw;
        }
    });

    return Value(func);
}

Value Evaluator::evaluate_return_statement(const std::shared_ptr<ASTNode>& node) {
    // Evaluate the return value if present
    Value return_value = node->children.empty() ? Value::undefined() : evaluate(node->children[0]);
    
    // Throw a special error to unwind the call stack
    // This is a simple way to implement return without proper exception handling
    throw std::runtime_error("Return value:" + return_value.toString());
}

Value Evaluator::evaluate_call_expression(const std::shared_ptr<ASTNode>& node) {
    if (node->children.size() < 1) {
        throw std::runtime_error("Call expression must have a callee");
    }

    // Evaluate the function to call
    Value callee = evaluate(node->children[0]);
    if (!callee.isFunction()) {
        throw std::runtime_error("Cannot call non-function value");
    }

    // Evaluate all arguments
    std::vector<Value> args;
    for (size_t i = 1; i < node->children.size(); ++i) {
        args.push_back(evaluate(node->children[i]));
    }

    // Call the function
    auto func = callee.getObject();
    if (auto js_func = std::dynamic_pointer_cast<JSFunction>(func)) {
        return js_func->call(args);
    }

    throw std::runtime_error("Invalid function object");
}

}  // namespace rift