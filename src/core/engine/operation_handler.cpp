#include "rift/core/engine/operation_handler.h"
#include <cmath>

namespace rift::core {

Value OperationHandler::performBinaryOperation(const std::string& op, const Value& left,
                                               const Value& right) {
    if(op == "+") {
        if(left.isString() || right.isString()) {
            return Value(left.toString() + right.toString());
        }
        return Value(left.toNumber() + right.toNumber());
    }
    if(op == "-")
        return Value(left.toNumber() - right.toNumber());
    if(op == "*")
        return Value(left.toNumber() * right.toNumber());
    if(op == "/")
        return Value(left.toNumber() / right.toNumber());
    if(op == "%")
        return Value(std::fmod(left.toNumber(), right.toNumber()));
    if(op == "**")
        return Value(std::pow(left.toNumber(), right.toNumber()));
    if(op == "==") {
        // JavaScript loose equality with type coercion
        // If both are the same type, compare directly
        if(left.getType() == right.getType()) {
            if(left.isNumber())
                return Value(left.toNumber() == right.toNumber());
            if(left.isString())
                return Value(left.toString() == right.toString());
            if(left.isBoolean())
                return Value(left.toBool() == right.toBool());
            if(left.isNull() && right.isNull())
                return Value(true);
            if(left.isUndefined() && right.isUndefined())
                return Value(true);
            return Value(left.toString() == right.toString());
        }

        // Type coercion rules for loose equality
        // null == undefined
        if((left.isNull() && right.isUndefined()) || (left.isUndefined() && right.isNull())) {
            return Value(true);
        }

        // Number comparisons with type coercion
        if(left.isNumber() || right.isNumber()) {
            return Value(left.toNumber() == right.toNumber());
        }

        // String comparisons
        return Value(left.toString() == right.toString());
    }
    if(op == "!=") {
        // Negate the result of ==
        Value equalResult = performBinaryOperation("==", left, right);
        return Value(!equalResult.toBool());
    }
    if(op == "===") {
        // Strict equality - check both type and value
        if(left.getType() != right.getType()) {
            return Value(false);
        }
        // Same type, compare values
        if(left.isNumber()) {
            return Value(left.toNumber() == right.toNumber());
        } else if(left.isString()) {
            return Value(left.toString() == right.toString());
        } else if(left.isBoolean()) {
            return Value(left.toBool() == right.toBool());
        } else if(left.isNull() && right.isNull()) {
            return Value(true);
        } else if(left.isUndefined() && right.isUndefined()) {
            return Value(true);
        } else {
            // For objects, compare reference (simplified)
            return Value(left.toString() == right.toString());
        }
    }
    if(op == "!==") {
        // Strict inequality - opposite of strict equality
        if(left.getType() != right.getType()) {
            return Value(true);
        }
        // Same type, compare values and negate
        if(left.isNumber()) {
            return Value(left.toNumber() != right.toNumber());
        } else if(left.isString()) {
            return Value(left.toString() != right.toString());
        } else if(left.isBoolean()) {
            return Value(left.toBool() != right.toBool());
        } else if(left.isNull() && right.isNull()) {
            return Value(false);
        } else if(left.isUndefined() && right.isUndefined()) {
            return Value(false);
        } else {
            // For objects, compare reference (simplified)
            return Value(left.toString() != right.toString());
        }
    }
    if(op == "<")
        return Value(left.toNumber() < right.toNumber());
    if(op == ">")
        return Value(left.toNumber() > right.toNumber());
    if(op == "<=")
        return Value(left.toNumber() <= right.toNumber());
    if(op == ">=")
        return Value(left.toNumber() >= right.toNumber());

    // Bitwise operators - convert to 32-bit integers
    if(op == "&") {
        int32_t leftInt = static_cast<int32_t>(left.toNumber());
        int32_t rightInt = static_cast<int32_t>(right.toNumber());
        return Value(static_cast<double>(leftInt & rightInt));
    }
    if(op == "|") {
        int32_t leftInt = static_cast<int32_t>(left.toNumber());
        int32_t rightInt = static_cast<int32_t>(right.toNumber());
        return Value(static_cast<double>(leftInt | rightInt));
    }
    if(op == "^") {
        int32_t leftInt = static_cast<int32_t>(left.toNumber());
        int32_t rightInt = static_cast<int32_t>(right.toNumber());
        return Value(static_cast<double>(leftInt ^ rightInt));
    }
    if(op == "<<") {
        int32_t leftInt = static_cast<int32_t>(left.toNumber());
        // Shift amount is masked to 5 bits (0-31) per ECMAScript spec
        uint32_t shiftAmount = static_cast<uint32_t>(right.toNumber()) & 0x1F;
        return Value(static_cast<double>(leftInt << shiftAmount));
    }
    if(op == ">>") {
        int32_t leftInt = static_cast<int32_t>(left.toNumber());
        // Shift amount is masked to 5 bits (0-31) per ECMAScript spec
        uint32_t shiftAmount = static_cast<uint32_t>(right.toNumber()) & 0x1F;
        return Value(static_cast<double>(leftInt >> shiftAmount));
    }
    if(op == ">>>") {
        // Unsigned right shift - treat left operand as unsigned
        uint32_t leftUint = static_cast<uint32_t>(static_cast<int32_t>(left.toNumber()));
        // Shift amount is masked to 5 bits (0-31) per ECMAScript spec
        uint32_t shiftAmount = static_cast<uint32_t>(right.toNumber()) & 0x1F;
        return Value(static_cast<double>(leftUint >> shiftAmount));
    }

    return Value::undefined();
}

Value OperationHandler::performUnaryOperation(const std::string& op, const Value& operand) {
    if(op == "-") {
        return Value(-operand.toNumber());
    }
    if(op == "+") {
        return Value(operand.toNumber());
    }
    if(op == "!") {
        // Logical NOT operator - convert to boolean and negate
        return Value(!operand.toBool());
    }
    if(op == "typeof") {
        // Return the type of the operand as a string
        if(operand.isUndefined()) {
            return Value("undefined");
        } else if(operand.isNull()) {
            return Value("object");  // In JavaScript, typeof null === "object"
        } else if(operand.isBoolean()) {
            return Value("boolean");
        } else if(operand.isNumber()) {
            return Value("number");
        } else if(operand.isString()) {
            return Value("string");
        } else if(operand.isFunction()) {
            return Value("function");
        } else if(operand.isObject()) {
            return Value("object");
        } else {
            return Value("undefined");
        }
    }
    if(op == "~") {
        // Bitwise NOT operator - convert to 32-bit integer and invert
        int32_t intValue = static_cast<int32_t>(operand.toNumber());
        return Value(static_cast<double>(~intValue));
    }

    return Value::undefined();
}

}  // namespace rift::core