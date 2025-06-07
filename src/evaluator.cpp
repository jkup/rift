#include "evaluator.h"

#include <cctype>
#include <iostream>
#include <limits>
#include <stdexcept>

namespace jsruntime {

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
        if (left.type == ValueType::String || right.type == ValueType::String) {
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
        if (left.type == right.type) {
            if (left.type == ValueType::Number) {
                return Value(left.toNumber() == right.toNumber());
            } else if (left.type == ValueType::String) {
                return Value(left.toString() == right.toString());
            } else if (left.type == ValueType::Boolean) {
                return Value(left.toBool() == right.toBool());
            }
        }
        // Otherwise, convert both to strings and compare
        return Value(left.toString() == right.toString());
    } else if (op == "!=") {
        return Value(left.toString() != right.toString());
    } else if (op == "<") {
        return Value(left.toNumber() < right.toNumber());
    } else if (op == ">") {
        return Value(left.toNumber() > right.toNumber());
    } else {
        throw std::runtime_error("Unknown binary operator: " + op);
    }
}

Value Evaluator::evaluate_assignment_expression(const std::shared_ptr<ASTNode>& node) {
    // This would be implemented for assignment expressions
    // For now, just return undefined
    return Value::undefined();
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

        case ASTNodeType::MemberExpression: {
            if (node->children.size() != 2) {
                throw std::runtime_error("MemberExpression must have exactly 2 children");
            }

            Value object = evaluate(node->children[0]);       // e.g., evaluate "console"
            std::string property = node->children[1]->value;  // e.g., "log"

            // For now, just handle console.log specifically
            if (object.toString() == "[object Console]" && property == "log") {
                // Return a special value representing the console.log function
                Value logFunction;
                logFunction.type = ValueType::Function;
                logFunction.string_value = "console.log";
                return logFunction;
            }

            return Value::undefined();
        }

        case ASTNodeType::CallExpression: {
            if (node->children.empty()) {
                throw std::runtime_error(
                    "CallExpression must have at least one child (the function)");
            }

            Value function = evaluate(node->children[0]);  // Get the function to call

            if (function.type == ValueType::Function && function.string_value == "console.log") {
                // Evaluate all arguments and print them
                for (size_t i = 1; i < node->children.size(); i++) {
                    Value arg = evaluate(node->children[i]);
                    std::cout << arg.toString();
                    if (i < node->children.size() - 1) {
                        std::cout << " ";  // Space between arguments
                    }
                }
                std::cout << std::endl;
                return Value::undefined();
            }

            throw std::runtime_error("Cannot call non-function value");
        }

        default:
            throw std::runtime_error("Unknown AST node type");
    }
}

}  // namespace jsruntime