// ============================================================================
// ECMA-262 -- Assignment and Update Expression Evaluation (13.4, 13.15)
// Implements Runtime Semantics: Evaluation for assignment and update expressions.
// @spec https://tc39.es/ecma262/#sec-assignment-operators
// @spec https://tc39.es/ecma262/#sec-update-expressions
//
// This file covers:
//   - 13.15 Assignment Operators (=, +=, -=, *=, /=, %=, **=,
//     <<=, >>=, >>>=, &=, |=, ^=, &&=, ||=, ??=)
//   - 13.4 Update Expressions (prefix and postfix ++/--)
//   - 13.15.4 ApplyStringOrNumericBinaryOperator (inlined for compound assignment)
//
// See also: expression_evaluator.cpp (main dispatcher, binary/unary/literals)
//           expression_evaluator_objects.cpp (call, member, new, class, etc.)
//           operation_handler.cpp (binary operator abstract operations)
// ============================================================================

#include <cmath>

#include "rift/builtins/builtin_manager.h"
#include "rift/interpreter/engine.h"
#include "rift/interpreter/evaluation_utils.h"
#include "rift/interpreter/expression_evaluator.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/memory/gc_protector.h"
#include "rift/types/object.h"

namespace rift::core {

// 13.15.4 ApplyStringOrNumericBinaryOperator ( lval, opText, rval )
// @spec https://tc39.es/ecma262/#sec-applystringornumericbinaryoperator
//
// This helper implements the compound assignment operation by extracting the
// base operator from the compound form (e.g., "+=" => "+") and applying it.
//
// Per spec, ApplyStringOrNumericBinaryOperator:
//   1. If opText is +, then
//      a. Let lprim be ? ToPrimitive(lval).
//      b. Let rprim be ? ToPrimitive(rval).
//      c. If lprim is a String or rprim is a String, then
//         i. Let lstr be ? ToString(lprim), rstr be ? ToString(rprim).
//         ii. Return the string-concatenation of lstr and rstr.
//   2. Let lnum be ? ToNumeric(lval).
//   3. Let rnum be ? ToNumeric(rval).
//   4. Let operation be the abstract operation based on opText (Table 32).
//   5. Return operation(lnum, rnum).
//
// SIMPLIFIED: Rift inlines this logic here and in OperationHandler rather than
// implementing it as a separate abstract operation. The ToNumeric/ToPrimitive
// conversions are handled by Value::toNumber() and Value::toString(). BigInt
// is not supported.
static Value applyCompoundOperation(const std::string& operator_, Value currentValue,
                                    Value rightValue) {
    // Simple assignment — no operation needed
    if(operator_ == "=") {
        return rightValue;
    }

    // For compound assignments, convert to numbers and apply operation
    double left = currentValue.toNumber();
    double right = rightValue.toNumber();

    // Additive: += with string concatenation special case
    // (Spec step 1c: if either operand is a String, concatenate)
    if(operator_ == "+=") {
        if(currentValue.isString() || rightValue.isString()) {
            return Value(currentValue.toString() + rightValue.toString());
        }
        return Value(left + right);
        // Multiplicative/Additive operators (steps 2-5, Table 32)
    } else if(operator_ == "-=") {
        return Value(left - right);
    } else if(operator_ == "*=") {
        return Value(left * right);
    } else if(operator_ == "/=") {
        return Value(left / right);
    } else if(operator_ == "%=") {
        // 6.1.6.1.6 Number::remainder ( n, d )
        return Value(std::fmod(left, right));
    } else if(operator_ == "**=") {
        // 6.1.6.1.5 Number::exponentiate ( base, exponent )
        return Value(std::pow(left, right));
    }

    // Bitwise compound assignments — 13.15.4 step 4, Table 32
    // Operands are converted to 32-bit integers via ToInt32 (7.1.6)
    // SIMPLIFIED: Rift uses static_cast<int32_t> instead of the full ToInt32
    // algorithm (which handles NaN, Infinity, and out-of-range values differently).
    int32_t leftInt = static_cast<int32_t>(left);
    int32_t rightInt = static_cast<int32_t>(right);

    // 13.12 Binary Bitwise Operators
    if(operator_ == "&=") {
        return Value(static_cast<double>(leftInt & rightInt));
    } else if(operator_ == "|=") {
        return Value(static_cast<double>(leftInt | rightInt));
    } else if(operator_ == "^=") {
        return Value(static_cast<double>(leftInt ^ rightInt));
        // 13.9 Bitwise Shift Operators
        // Shift amount masked to 5 bits (& 0x1F) per spec
    } else if(operator_ == "<<=") {
        uint32_t shiftAmount = static_cast<uint32_t>(rightInt) & 0x1F;
        return Value(static_cast<double>(leftInt << shiftAmount));
    } else if(operator_ == ">>=") {
        uint32_t shiftAmount = static_cast<uint32_t>(rightInt) & 0x1F;
        return Value(static_cast<double>(leftInt >> shiftAmount));
    } else if(operator_ == ">>>=") {
        // Unsigned right shift: ToUint32(lval) >>> (rval & 0x1F)
        uint32_t leftUint = static_cast<uint32_t>(leftInt);
        uint32_t shiftAmount = static_cast<uint32_t>(rightInt) & 0x1F;
        return Value(static_cast<double>(leftUint >> shiftAmount));
    }

    // 13.15.3 Logical assignment: ??= is short-circuit and handled differently
    // in spec (the RHS is only evaluated if LHS is nullish). However, because Rift
    // evaluates the RHS eagerly before calling this helper, the short-circuit
    // semantics are partially lost for ??= here.
    // DEVIATION: Spec says ??= should NOT evaluate the RHS if LHS is not nullish.
    // Rift evaluates RHS unconditionally and discards it here if not needed.
    if(operator_ == "??=") {
        return (currentValue.isNull() || currentValue.isUndefined()) ? rightValue : currentValue;
    }

    // Fallback for unknown operator
    return rightValue;
}

// 13.15.2 Runtime Semantics: Evaluation — AssignmentExpression
// @spec https://tc39.es/ecma262/#sec-assignment-operators-runtime-semantics-evaluation
//
// Handles both simple assignment (=) and compound assignment (+=, -=, etc.).
//
// Simple Assignment (AssignmentExpression : LeftHandSideExpression = AssignmentExpression):
//   1. If LeftHandSideExpression is not an ObjectLiteral or ArrayLiteral, then
//      a. Let lref be ? Evaluation of LeftHandSideExpression.
//      b. If IsAnonymousFunctionDefinition(AssignmentExpression) and
//         IsIdentifierRef(LeftHandSideExpression) are both true, then ...
//      c. Let rref be ? Evaluation of AssignmentExpression.
//      d. Let rval be ? GetValue(rref).
//      e. Perform ? PutValue(lref, rval).
//      f. Return rval.
//
// Compound Assignment (AssignmentExpression : LeftHandSideExpression op= AssignmentExpression):
//   1. Let lref be ? Evaluation of LeftHandSideExpression.
//   2. Let lval be ? GetValue(lref).
//   3. Let rref be ? Evaluation of AssignmentExpression.
//   4. Let rval be ? GetValue(rref).
//   5. Let r be ? ApplyStringOrNumericBinaryOperator(lval, opText, rval).
//   6. Perform ? PutValue(lref, r).
//   7. Return r.
//
// SIMPLIFIED: Rift does not use Reference Records. Instead of PutValue(lref, rval),
// it directly calls env->set() for identifiers or obj->setProperty() for members.
// The RHS is always evaluated before determining the assignment target, which matches
// spec evaluation order for simple assignment but diverges for logical assignment
// operators (&&=, ||=, ??=) where the spec short-circuits RHS evaluation.
// DEVIATION: For &&= and ||=, the spec evaluates the RHS conditionally based on the
// LHS value. Rift evaluates the RHS unconditionally (see applyCompoundOperation).
Value ExpressionEvaluator::evaluateAssignmentExpression(std::shared_ptr<ASTNode> node,
                                                        std::shared_ptr<Environment> env,
                                                        Rift* engine) {
    if(node->children.size() != 2) {
        return Value::undefined();
    }

    auto leftSide = node->children[0];
    // Step (simple) 1c-d / Step (compound) 3-4: Evaluate RHS and GetValue
    Value rightValue = engine->evaluate(node->children[1], env);
    std::string operator_ = node->value.empty() ? "=" : node->value;

    // -----------------------------------------------------------------------
    // Case 1: LeftHandSideExpression is a MemberExpression (property assignment)
    // This covers: obj.prop = val, obj[key] = val, obj.prop += val, etc.
    // -----------------------------------------------------------------------
    if(leftSide->type == ASTNodeType::MemberExpression) {
        if(leftSide->children.size() != 2) {
            return Value::undefined();
        }

        // Step (simple) 1a / Step (compound) 1: Evaluate the LHS reference
        // SIMPLIFIED: Rift evaluates the object and property key separately
        // rather than producing a single Reference Record.
        Value object = engine->evaluate(leftSide->children[0], env);

        // 13.15.2 step 1c: If baseValue is undefined or null, throw a TypeError.
        // @spec https://tc39.es/ecma262/#sec-assignment-operators-runtime-semantics-evaluation
        if(object.isNull() || object.isUndefined()) {
            std::string base_type = object.isNull() ? "null" : "undefined";
            std::string prop_name;
            if(leftSide->metadata == "computed") {
                Value prop_val = engine->evaluate(leftSide->children[1], env);
                prop_name = prop_val.toString();
            } else {
                prop_name = leftSide->children[1]->value;
            }
            auto* factory = engine->getObjectFactory();
            auto* error_obj = factory->createJSObject(BuiltinManager::getTypeErrorPrototype());
            memory::GCProtector protect(error_obj, factory->getObjectManager());
            error_obj->setProperty("name", Value("TypeError"));
            error_obj->setProperty("message", Value("Cannot set properties of " + base_type +
                                                    " (setting '" + prop_name + "')"));
            throw JavaScriptException(Value(error_obj), node->line, node->column);
        }

        // Resolve property key — handles both dot notation and bracket notation
        // Spec: Let propertyKey be ? ToPropertyKey(...)
        std::string property;
        if(leftSide->metadata == "computed") {
            Value propertyValue = engine->evaluate(leftSide->children[1], env);

            if(propertyValue.isSymbol()) {
                property = EvaluationUtils::symbolToPropertyKey(propertyValue.getSymbol().id);
            } else {
                property = EvaluationUtils::toPropertyKeyString(propertyValue);
            }
        } else {
            property = leftSide->children[1]->value;
        }

        // Perform the assignment on the object property
        if(object.isObject() || object.isFunction()) {
            auto* obj = object.getObject();
            if(obj) {
                Value newValue;
                if(operator_ == "=") {
                    // Simple assignment: PutValue(lref, rval)
                    newValue = rightValue;
                } else {
                    // Compound assignment:
                    // Step 2: Let lval be ? GetValue(lref).
                    // (getter-aware: if property is an accessor, call the getter)
                    auto [found, desc] = obj->findPropertyDescriptor(property);
                    Value currentValue;
                    if(found && desc.is_accessor && desc.getter.isFunction()) {
                        auto* getter_func = dynamic_cast<JSFunction*>(desc.getter.getObject());
                        if(getter_func) {
                            rift::core::CallContext getter_ctx(rift::core::CallType::Function,
                                                               object);
                            currentValue = getter_func->call(getter_ctx, {});
                        }
                    } else {
                        currentValue = obj->getProperty(property);
                    }
                    // Step 5: Let r be ? ApplyStringOrNumericBinaryOperator(lval, opText, rval).
                    newValue = applyCompoundOperation(operator_, currentValue, rightValue);
                }

                // Step 6 (compound) / Step 1e (simple): Perform ? PutValue(lref, r).
                // SIMPLIFIED: Rift checks for accessor properties (setters) and
                // calls them if present, otherwise uses setProperty directly.
                auto [found, desc] = obj->findPropertyDescriptor(property);
                if(found && desc.is_accessor) {
                    if(desc.setter.isFunction()) {
                        auto* setter_func = dynamic_cast<JSFunction*>(desc.setter.getObject());
                        if(setter_func) {
                            rift::core::CallContext setter_ctx(rift::core::CallType::Function,
                                                               object);
                            setter_func->call(setter_ctx, {newValue});
                        }
                    }
                    // Accessor without setter: silently fail (in strict mode, spec
                    // requires TypeError — INCOMPLETE)
                } else {
                    obj->setProperty(property, newValue);
                }

                // 10.4.2.1 [[DefineOwnProperty]] for Array Exotic Objects
                // @spec https://tc39.es/ecma262/#sec-array-exotic-objects-defineownproperty-p-desc
                // When setting a numeric index >= current length, update the length.
                // SIMPLIFIED: Rift handles this inline rather than via [[DefineOwnProperty]].
                if(property != "length") {
                    size_t index;
                    if(EvaluationUtils::isValidArrayIndex(property, index)) {
                        Value lengthVal = obj->getProperty("length");
                        if(lengthVal.isNumber()) {
                            size_t currentLength;
                            if(EvaluationUtils::toSafeArrayLength(lengthVal.toNumber(),
                                                                  currentLength)) {
                                if(index >= currentLength) {
                                    size_t newLength;
                                    if(EvaluationUtils::safeIncrementIndex(index, newLength)) {
                                        obj->setProperty("length",
                                                         Value(static_cast<double>(newLength)));
                                    }
                                }
                            }
                        }
                    }
                }

                // Step 7 (compound) / Step 1f (simple): Return the assigned value.
                return newValue;
            }
        }

        return rightValue;
    } else {
        // -------------------------------------------------------------------
        // Case 2: LeftHandSideExpression is an Identifier (simple variable assignment)
        // -------------------------------------------------------------------
        std::string varName = leftSide->value;

        // Strict mode early error: assignment to 'eval' or 'arguments' is forbidden.
        // @spec https://tc39.es/ecma262/#sec-assignment-operators-static-semantics-early-errors
        // SIMPLIFIED: The spec defines this as a Static Semantics: Early Error.
        // Rift enforces it at runtime.
        if(env->inheritsStrictMode() && (varName == "eval" || varName == "arguments")) {
            throw JavaScriptException(
                Value("SyntaxError: Cannot assign to '" + varName + "' in strict mode"));
        }

        Value newValue;
        if(operator_ == "=") {
            // Simple assignment: PutValue(lref, rval)
            newValue = rightValue;
        } else {
            // Compound assignment:
            // Step 2: Let lval be ? GetValue(lref).
            Value currentValue = env->get(varName);
            // Step 5: Let r be ? ApplyStringOrNumericBinaryOperator(lval, opText, rval).
            newValue = applyCompoundOperation(operator_, currentValue, rightValue);
        }

        // Step 6: Perform ? PutValue(lref, r).
        // SIMPLIFIED: env->set() walks the scope chain to find and update the binding,
        // equivalent to PutValue on an Environment Reference Record.
        env->set(varName, newValue);
        // Step 7: Return r.
        return newValue;
    }
}

// 13.4 Update Expressions — Runtime Semantics: Evaluation
// @spec https://tc39.es/ecma262/#sec-update-expressions
//
// Handles both prefix (++x, --x) and postfix (x++, x--) update expressions.
//
// 13.4.1 Postfix Increment Operator (UpdateExpression : LeftHandSideExpression ++):
//   1. Let lhs be ? Evaluation of LeftHandSideExpression.
//   2. Let oldValue be ? ToNumeric(? GetValue(lhs)).
//   3. If oldValue is a Number, let newValue be Number::add(oldValue, 1).
//   4. Perform ? PutValue(lhs, newValue).
//   5. Return oldValue.
//
// 13.4.2 Postfix Decrement Operator: (same pattern, subtract 1)
//
// 13.4.3 Prefix Increment Operator (UpdateExpression : ++ UnaryExpression):
//   1. Let expr be ? Evaluation of UnaryExpression.
//   2. Let oldValue be ? ToNumeric(? GetValue(expr)).
//   3. If oldValue is a Number, let newValue be Number::add(oldValue, 1).
//   4. Perform ? PutValue(expr, newValue).
//   5. Return newValue.
//
// 13.4.4 Prefix Decrement Operator: (same pattern, subtract 1)
//
// SIMPLIFIED: Rift does not use Reference Records or ToNumeric (which also handles
// BigInt). Instead, it uses toNumber() for conversion and directly manipulates
// environment bindings or object properties.
Value ExpressionEvaluator::evaluateUpdateExpression(std::shared_ptr<ASTNode> node,
                                                    std::shared_ptr<Environment> env,
                                                    Rift* engine) {
    if(node->children.size() != 1) {
        return Value::undefined();
    }

    auto operandNode = node->children[0];
    std::string operator_ = node->value;  // "++" or "--"
    bool isPrefix = (node->metadata == "prefix");

    // -----------------------------------------------------------------------
    // Case 1: UpdateExpression on an Identifier (e.g., x++, ++x)
    // -----------------------------------------------------------------------
    if(operandNode->type == ASTNodeType::Identifier) {
        std::string varName = operandNode->value;

        // Strict mode restriction: ++/-- on 'eval' or 'arguments' is forbidden
        // @spec https://tc39.es/ecma262/#sec-update-expressions-static-semantics-early-errors
        // SIMPLIFIED: This is defined as an early error in the spec; Rift enforces at runtime.
        if(env->inheritsStrictMode() && (varName == "eval" || varName == "arguments")) {
            throw JavaScriptException(
                Value("SyntaxError: Cannot modify '" + varName + "' in strict mode"));
        }

        // Step 1: Let lhs/expr be ? Evaluation of operand.
        // Step 2: Let oldValue be ? ToNumeric(? GetValue(lhs)).
        Value currentValue = env->get(varName);
        if(!currentValue.isNumber()) {
            currentValue = Value(currentValue.toNumber());
        }

        // Step 3: Let newValue be Number::add(oldValue, 1) or Number::subtract(oldValue, 1).
        Value newValue;
        if(operator_ == "++") {
            newValue = Value(currentValue.toNumber() + 1.0);
        } else if(operator_ == "--") {
            newValue = Value(currentValue.toNumber() - 1.0);
        } else {
            return Value::undefined();
        }

        // Step 4: Perform ? PutValue(lhs, newValue).
        env->set(varName, newValue);

        // Step 5: Return newValue (prefix) or oldValue (postfix).
        if(isPrefix) {
            return newValue;
        } else {
            return currentValue;
        }
    }

    // -----------------------------------------------------------------------
    // Case 2: UpdateExpression on a MemberExpression (e.g., obj.prop++, arr[i]--)
    // Same spec steps, but PutValue targets an object property instead of
    // an environment binding.
    // -----------------------------------------------------------------------
    else if(operandNode->type == ASTNodeType::MemberExpression) {
        if(operandNode->children.size() != 2) {
            return Value::undefined();
        }

        // Step 1: Evaluate the LHS reference (object + property key)
        Value object = engine->evaluate(operandNode->children[0], env);

        // Resolve property key
        std::string property;
        if(operandNode->metadata == "computed") {
            Value propertyValue = engine->evaluate(operandNode->children[1], env);

            if(propertyValue.isSymbol()) {
                property = EvaluationUtils::symbolToPropertyKey(propertyValue.getSymbol().id);
            } else {
                property = EvaluationUtils::toPropertyKeyString(propertyValue);
            }
        } else {
            property = operandNode->children[1]->value;
        }

        // Step 2: Let oldValue be ? ToNumeric(? GetValue(lhs)).
        // (getter-aware: if property is an accessor, call the getter)
        Value currentValue = Value::undefined();
        if(object.isObject() || object.isFunction()) {
            auto* obj = object.getObject();
            if(obj) {
                auto [found, desc] = obj->findPropertyDescriptor(property);
                if(found && desc.is_accessor && desc.getter.isFunction()) {
                    auto* getter_func = dynamic_cast<JSFunction*>(desc.getter.getObject());
                    if(getter_func) {
                        rift::core::CallContext getter_ctx(rift::core::CallType::Function, object);
                        currentValue = getter_func->call(getter_ctx, {});
                    }
                } else {
                    currentValue = obj->getProperty(property);
                }
            }
        }

        // ToNumeric conversion
        if(!currentValue.isNumber()) {
            currentValue = Value(currentValue.toNumber());
        }

        // Step 3: Let newValue be Number::add/subtract(oldValue, 1).
        Value newValue;
        if(operator_ == "++") {
            newValue = Value(currentValue.toNumber() + 1.0);
        } else if(operator_ == "--") {
            newValue = Value(currentValue.toNumber() - 1.0);
        } else {
            return Value::undefined();
        }

        // Step 4: Perform ? PutValue(lhs, newValue).
        // (setter-aware: if property is an accessor, call the setter)
        if(object.isObject() || object.isFunction()) {
            auto* obj = object.getObject();
            if(obj) {
                auto [found_w, desc_w] = obj->findPropertyDescriptor(property);
                if(found_w && desc_w.is_accessor) {
                    if(desc_w.setter.isFunction()) {
                        auto* setter_func = dynamic_cast<JSFunction*>(desc_w.setter.getObject());
                        if(setter_func) {
                            rift::core::CallContext setter_ctx(rift::core::CallType::Function,
                                                               object);
                            setter_func->call(setter_ctx, {newValue});
                        }
                    }
                } else {
                    obj->setProperty(property, newValue);

                    // Array exotic object: update length for numeric index assignments
                    // @spec
                    // https://tc39.es/ecma262/#sec-array-exotic-objects-defineownproperty-p-desc
                    if(property != "length") {
                        size_t index;
                        if(EvaluationUtils::isValidArrayIndex(property, index)) {
                            Value lengthVal = obj->getProperty("length");
                            if(lengthVal.isNumber()) {
                                size_t currentLength;
                                if(EvaluationUtils::toSafeArrayLength(lengthVal.toNumber(),
                                                                      currentLength)) {
                                    if(index >= currentLength) {
                                        size_t newLength;
                                        if(EvaluationUtils::safeIncrementIndex(index, newLength)) {
                                            obj->setProperty("length",
                                                             Value(static_cast<double>(newLength)));
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        // Step 5: Return newValue (prefix) or oldValue (postfix).
        if(isPrefix) {
            return newValue;
        } else {
            return currentValue;
        }
    }

    // Invalid operand for increment/decrement
    return Value::undefined();
}

}  // namespace rift::core
