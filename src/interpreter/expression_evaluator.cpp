// ============================================================================
// ECMA-262 -- Expression Evaluation (Chapter 13)
// Implements Runtime Semantics: Evaluation for expression AST nodes.
// @spec https://tc39.es/ecma262/#sec-ecmascript-language-expressions-and-operators
//
// This file covers:
//   - Main expression dispatcher (routes AST node types to evaluators)
//   - 12.1 IdentifierReference evaluation
//   - 13.2.3 Literals (NumericLiteral, StringLiteral, BooleanLiteral, NullLiteral)
//   - 13.7-13.12 Binary operators (+, -, *, /, %, **, comparisons) — dispatched
//     to operation_handler.cpp
//   - 13.13 Binary Logical Operators (&&, ||, ??)
//   - 13.5 Unary Operators (delete, void, typeof, +, -, ~, !)
//   - 13.2.8 Template Literals
//   - 13.14 Conditional Operator (?:)
//   - 13.10.1 The in Operator
//   - 13.10.2 The instanceof Operator
//   - 22.2.7.3 RegExp Literal evaluation
//
// See also: expression_evaluator_assignment.cpp (assignment/update expressions)
//           expression_evaluator_objects.cpp (call, member, new, class, etc.)
//           operation_handler.cpp (binary/unary operator abstract operations)
// ============================================================================

#include "rift/interpreter/expression_evaluator.h"

#include <cstdlib>
#include <iostream>
#include <limits>

#include "rift/builtins/regexp/regexp.h"
#include "rift/interpreter/call_context.h"
#include "rift/interpreter/engine.h"
#include "rift/interpreter/javascript_exception.h"
#include "rift/types/object.h"
#include "rift/types/operations.h"

namespace rift::core {

// 12.9.4 Runtime Semantics: Evaluation — NumericLiteral
// @spec https://tc39.es/ecma262/#sec-literals-numeric-literals
// Parses numeric literal strings including octal (0o) and binary (0b) prefixes.
// SIMPLIFIED: The spec defines MV (mathematical value) of NumericLiteral via
// grammar productions. Rift uses C++ std::stol/std::strtod for conversion.
static double parseNumericLiteral(const std::string& value) {
    if(value.size() > 2 && value[0] == '0') {
        char prefix = value[1];
        if(prefix == 'o' || prefix == 'O') {
            return static_cast<double>(std::stol(value.substr(2), nullptr, 8));
        }
        if(prefix == 'b' || prefix == 'B') {
            return static_cast<double>(std::stol(value.substr(2), nullptr, 2));
        }
    }
    // Use strtod instead of std::stod to correctly handle subnormal (denormalized)
    // numbers. std::stod throws out_of_range for subnormals like 5e-324, but
    // strtod correctly returns the denormalized value.
    char* end = nullptr;
    double result = std::strtod(value.c_str(), &end);
    if(end == value.c_str()) {
        throw std::invalid_argument("no conversion");
    }
    return result;
}

// Expression dispatcher — routes AST node types to specialized evaluation methods.
// SIMPLIFIED: The spec defines Runtime Semantics: Evaluation on each grammar production
// individually. Rift centralizes dispatch here based on the AST node type, then delegates
// to per-production evaluators in this file, expression_evaluator_assignment.cpp, and
// expression_evaluator_objects.cpp.
Value ExpressionEvaluator::evaluate(std::shared_ptr<ASTNode> node, std::shared_ptr<Environment> env,
                                    Rift* engine) {
    if(!node) {
        return Value::undefined();
    }

    switch(node->type) {
        // 12.1 IdentifierReference
        case ASTNodeType::Identifier:
            return evaluateIdentifier(node, env, engine);
        // 13.2.3 Literals (NumericLiteral, StringLiteral, BooleanLiteral, NullLiteral)
        case ASTNodeType::Literal:
            return evaluateLiteral(node, env, engine);
        // 13.6-13.12 Binary operators, 13.13 Logical, 13.10 Relational (in, instanceof)
        case ASTNodeType::BinaryExpression:
            return evaluateBinaryExpression(node, env, engine);
        // 13.5 Unary Operators (delete, void, typeof, +, -, ~, !)
        case ASTNodeType::UnaryExpression:
            return evaluateUnaryExpression(node, env, engine);
        // 13.4 Update Expressions (prefix/postfix ++/--)
        case ASTNodeType::UpdateExpression:
            return evaluateUpdateExpression(node, env, engine);
        // 13.15 Assignment Operators (=, +=, -=, etc.)
        case ASTNodeType::AssignmentExpression:
            return evaluateAssignmentExpression(node, env, engine);
        // 13.3.6 Function Calls
        case ASTNodeType::CallExpression:
            return evaluateCallExpression(node, env, engine);
        // 13.3.2 Property Accessors
        case ASTNodeType::MemberExpression:
            return evaluateMemberExpression(node, env, engine);
        // 13.2.4 Array Initializer
        case ASTNodeType::ArrayLiteral:
            return evaluateArrayLiteral(node, env, engine);
        // 13.2.5 Object Initializer
        case ASTNodeType::ObjectLiteral:
            return evaluateObjectLiteral(node, env, engine);
        // 15.2 Function Definitions
        case ASTNodeType::FunctionExpression:
            return evaluateFunctionExpression(node, env, engine);
        // 15.3 Arrow Function Definitions
        case ASTNodeType::ArrowFunctionExpression:
            return evaluateArrowFunctionExpression(node, env, engine);
        // 13.3.5 The new Operator
        case ASTNodeType::NewExpression:
            return evaluateNewExpression(node, env, engine);
        // 13.2.8 Template Literals
        case ASTNodeType::TemplateLiteral:
            return evaluateTemplateLiteral(node, env, engine);
        // 15.7 Class Definitions
        case ASTNodeType::ClassExpression:
            return evaluateClassExpression(node, env, engine);
        // 13.3.7 The super Keyword
        case ASTNodeType::SuperExpression:
            return evaluateSuperExpression(node, env, engine);
        // 15.5 Generator Function Definitions
        case ASTNodeType::GeneratorFunctionExpression:
            return evaluateGeneratorFunctionExpression(node, env, engine);
        // 15.5.3 YieldExpression
        case ASTNodeType::YieldExpression:
            return evaluateYieldExpression(node, env, engine);
        // 15.8 Async Function Definitions
        case ASTNodeType::AsyncFunctionExpression:
            return evaluateAsyncFunctionExpression(node, env, engine);
        // 15.8.3 AwaitExpression
        case ASTNodeType::AwaitExpression:
            return evaluateAwaitExpression(node, env, engine);
        // 22.2.7.3 RegularExpressionLiteral evaluation
        case ASTNodeType::RegExpLiteral:
            return evaluateRegExpLiteral(node, env, engine);
        // 13.14 Conditional Operator ( ? : )
        case ASTNodeType::ConditionalExpression:
            return evaluateConditionalExpression(node, env, engine);
        // 13.16 Comma Operator
        case ASTNodeType::SequenceExpression:
            return evaluateSequenceExpression(node, env, engine);
        default:
            return Value::undefined();
    }
}

// 12.1 Runtime Semantics: Evaluation — IdentifierReference
// @spec https://tc39.es/ecma262/#sec-identifiers-runtime-semantics-evaluation
// IdentifierReference : Identifier
//   1. Return ? ResolveBinding(StringValue of Identifier).
// SIMPLIFIED: The spec uses ResolveBinding which returns a Reference Record.
// Rift resolves identifiers directly via the Environment chain (no Reference type).
// The 'this' keyword is handled specially — in the spec, 'this' is resolved via
// ResolveThisBinding (9.4.4), not ResolveBinding.
Value ExpressionEvaluator::evaluateIdentifier(std::shared_ptr<ASTNode> node,
                                              std::shared_ptr<Environment> env, Rift* engine) {
    // Handle 'this' keyword — spec 12.2.2 The this Keyword
    // @spec https://tc39.es/ecma262/#sec-this-keyword-runtime-semantics-evaluation
    // 1. Return ? ResolveThisBinding().
    // SIMPLIFIED: Rift stores 'this' as a regular variable in the environment.
    if(node->value == "this") {
        try {
            return env->get("this");
        } catch(const JavaScriptException&) {
            return Value::undefined();
        }
    }

    // 1. Return ? ResolveBinding(StringValue of Identifier).
    // SIMPLIFIED: env->get() walks the scope chain, equivalent to
    // ResolveBinding + GetValue on the resulting Reference.
    return env->get(node->value);
}

// 13.2.3 Runtime Semantics: Evaluation — Literals
// @spec https://tc39.es/ecma262/#sec-literals-runtime-semantics-evaluation
// Handles: NumericLiteral, StringLiteral, BooleanLiteral, NullLiteral, UndefinedLiteral.
//
// Per spec:
//   NumericLiteral: 1. Return the NumericValue of NumericLiteral.
//   StringLiteral:  1. Return the SV (String Value) of StringLiteral.
//   BooleanLiteral: true => 1. Return true. / false => 1. Return false.
//   NullLiteral:    1. Return null.
//
// SIMPLIFIED: The spec derives the value from grammar productions at parse time.
// Rift carries the literal's raw string in the AST node and converts here at
// evaluation time. The metadata field ("string", "number", "boolean", "null")
// tells us the literal subtype so we can choose the right conversion.
Value ExpressionEvaluator::evaluateLiteral(std::shared_ptr<ASTNode> node,
                                           std::shared_ptr<Environment> env, Rift* engine) {
    // Use metadata to determine literal type if available
    if(!node->metadata.empty()) {
        // StringLiteral: Return the SV of StringLiteral.
        if(node->metadata == "string") {
            return Value(node->value);
            // NumericLiteral: Return the NumericValue of NumericLiteral.
        } else if(node->metadata == "number") {
            try {
                double num = parseNumericLiteral(node->value);
                return Value(num);
            } catch(const std::invalid_argument& e) {
                std::cerr << "Warning: Invalid number literal '" << node->value << "': " << e.what()
                          << std::endl;
                return Value(0.0);  // fallback
            } catch(const std::out_of_range& e) {
                std::cerr << "Warning: Number literal out of range '" << node->value
                          << "': " << e.what() << std::endl;
                return Value(std::numeric_limits<double>::infinity());  // fallback to infinity
            }
            // BooleanLiteral: true => Return true. false => Return false.
        } else if(node->metadata == "boolean") {
            return Value(node->value == "true");
            // NullLiteral: Return null.
        } else if(node->metadata == "null") {
            return Value::null();
            // UndefinedLiteral (not in spec grammar — undefined is an identifier, not a literal)
            // DEVIATION: Rift treats 'undefined' as a literal when the parser tags it as such.
        } else if(node->metadata == "undefined") {
            return Value::undefined();
        }
    }

    // Fallback to old behavior for backward compatibility
    // (handles AST nodes without metadata, e.g. from older parser paths)
    if(node->value == "true")
        return Value(true);
    if(node->value == "false")
        return Value(false);
    if(node->value == "null")
        return Value::null();
    if(node->value == "undefined")
        return Value::undefined();

    // Try to parse as number
    try {
        double num = parseNumericLiteral(node->value);
        return Value(num);
    } catch(const std::invalid_argument&) {
        // Not a number - must be a string - remove quotes if present
        std::string str = node->value;
        if(str.length() >= 2 && str[0] == '"' && str.back() == '"') {
            str = str.substr(1, str.length() - 2);
        }
        return Value(str);
    } catch(const std::out_of_range&) {
        // Number out of range - treat as infinity
        return Value(std::numeric_limits<double>::infinity());
    }
}

// Binary expression evaluation — dispatches to the appropriate spec section based
// on the operator. This single method handles multiple spec productions:
//
// 13.13 Binary Logical Operators (&&, ||)
// @spec https://tc39.es/ecma262/#sec-binary-logical-operators-runtime-semantics-evaluation
//
// 13.13 Nullish Coalescing Operator (??)
// @spec https://tc39.es/ecma262/#sec-binary-logical-operators-runtime-semantics-evaluation
//
// 13.10.1 Runtime Semantics: Evaluation — The in Operator
// @spec https://tc39.es/ecma262/#sec-relational-operators-runtime-semantics-evaluation
//
// 13.10.2 InstanceofOperator ( V, target )
// @spec https://tc39.es/ecma262/#sec-instanceofoperator
//
// 13.6-13.12 Arithmetic, bitwise, comparison, equality, shift operators
// (delegated to OperationHandler::performBinaryOperation)
//
// SIMPLIFIED: The spec defines separate Runtime Semantics: Evaluation for each
// grammar production (AdditiveExpression, MultiplicativeExpression, etc.). Rift
// unifies all binary expressions into a single BinaryExpression AST node and
// dispatches by the operator string here.
Value ExpressionEvaluator::evaluateBinaryExpression(std::shared_ptr<ASTNode> node,
                                                    std::shared_ptr<Environment> env,
                                                    Rift* engine) {
    if(node->children.size() != 2) {
        return Value::undefined();
    }

    // -----------------------------------------------------------------------
    // 13.13.2 Runtime Semantics: Evaluation
    // LogicalORExpression : LogicalORExpression || LogicalANDExpression
    // @spec https://tc39.es/ecma262/#sec-binary-logical-operators-runtime-semantics-evaluation
    // -----------------------------------------------------------------------
    if(node->value == "||") {
        // 1. Let lref be ? Evaluation of LogicalORExpression.
        // 2. Let lval be ? GetValue(lref).
        Value left = engine->evaluate(node->children[0], env);
        // 3. Let lbool be ToBoolean(lval).
        // 4. If lbool is true, return lval.
        if(left.toBool()) {
            return left;
        }
        // 5. Let rref be ? Evaluation of LogicalANDExpression.
        // 6. Return ? GetValue(rref).
        return engine->evaluate(node->children[1], env);
    }

    // -----------------------------------------------------------------------
    // 13.13.1 Runtime Semantics: Evaluation
    // LogicalANDExpression : LogicalANDExpression && BitwiseORExpression
    // @spec https://tc39.es/ecma262/#sec-binary-logical-operators-runtime-semantics-evaluation
    // -----------------------------------------------------------------------
    if(node->value == "&&") {
        // 1. Let lref be ? Evaluation of LogicalANDExpression.
        // 2. Let lval be ? GetValue(lref).
        Value left = engine->evaluate(node->children[0], env);
        // 3. Let lbool be ToBoolean(lval).
        // 4. If lbool is false, return lval.
        if(!left.toBool()) {
            return left;
        }
        // 5. Let rref be ? Evaluation of BitwiseORExpression.
        // 6. Return ? GetValue(rref).
        return engine->evaluate(node->children[1], env);
    }

    // -----------------------------------------------------------------------
    // 13.13.3 Runtime Semantics: Evaluation
    // CoalesceExpression : CoalesceExpressionHead ?? BitwiseORExpression
    // @spec https://tc39.es/ecma262/#sec-binary-logical-operators-runtime-semantics-evaluation
    // -----------------------------------------------------------------------
    if(node->value == "??") {
        // 1. Let lref be ? Evaluation of CoalesceExpressionHead.
        // 2. Let lval be ? GetValue(lref).
        Value left = engine->evaluate(node->children[0], env);
        // 3. If lval is undefined or lval is null, then
        if(!left.isNull() && !left.isUndefined()) {
            //    (else) return lval.
            return left;
        }
        //    a. Let rref be ? Evaluation of BitwiseORExpression.
        //    b. Return ? GetValue(rref).
        return engine->evaluate(node->children[1], env);
    }

    // -----------------------------------------------------------------------
    // 13.10.1 Runtime Semantics: Evaluation — RelationalExpression : ... in ...
    // @spec https://tc39.es/ecma262/#sec-relational-operators-runtime-semantics-evaluation
    // -----------------------------------------------------------------------
    if(node->value == "in") {
        // 1. Let lref be ? Evaluation of RelationalExpression.
        // 2. Let lval be ? GetValue(lref).
        Value left = engine->evaluate(node->children[0], env);
        // 3. Let rref be ? Evaluation of ShiftExpression.
        // 4. Let rval be ? GetValue(rref).
        Value right = engine->evaluate(node->children[1], env);

        // 5. If rval is not an Object, throw a TypeError exception.
        if(!right.isObject()) {
            throw JavaScriptException(Value("TypeError: Cannot use 'in' operator to search for '" +
                                            left.toString() + "' in " + right.toString()));
        }

        // 6. Return ? HasProperty(rval, ? ToPropertyKey(lval)).
        // SIMPLIFIED: Rift uses toString() instead of ToPropertyKey (which also
        // handles Symbols). Walks the prototype chain via hasOwnProperty loop
        // instead of calling the abstract HasProperty operation.
        std::string propertyKey = left.toString();
        JSObject* obj = right.getObject();

        while(obj != nullptr) {
            if(obj->hasOwnProperty(propertyKey)) {
                return Value(true);
            }
            obj = obj->getPrototype();
        }
        return Value(false);
    }

    // -----------------------------------------------------------------------
    // 13.10.2 InstanceofOperator ( V, target )
    // @spec https://tc39.es/ecma262/#sec-instanceofoperator
    // RelationalExpression : RelationalExpression instanceof ShiftExpression
    // -----------------------------------------------------------------------
    if(node->value == "instanceof") {
        // Evaluate both operands
        Value left = engine->evaluate(node->children[0], env);
        Value right = engine->evaluate(node->children[1], env);

        // 1. If target is not an Object, throw a TypeError exception.
        if(!right.isFunction() && !right.isObject()) {
            throw JavaScriptException(
                Value("TypeError: Right-hand side of instanceof is not callable"));
        }

        // INCOMPLETE: Step 2 — the spec checks for @@hasInstance method first:
        //   2. Let instOfHandler be ? GetMethod(target, @@hasInstance).
        //   3. If instOfHandler is not undefined, then
        //      a. Return ToBoolean(? Call(instOfHandler, target, << V >>)).
        // Rift skips @@hasInstance and goes directly to OrdinaryHasInstance.

        // 4. If IsCallable(target) is false, throw a TypeError exception.
        JSObject* right_obj = right.getObject();
        if(!right_obj) {
            throw JavaScriptException(
                Value("TypeError: Right-hand side of instanceof is not callable"));
        }

        // OrdinaryHasInstance ( C, O )
        // @spec https://tc39.es/ecma262/#sec-ordinaryhasinstance
        // 1. If IsCallable(C) is false, return false.  (already checked above)
        // 2. (BoundFunction handling — not implemented)
        // 3. If O is not an Object, return false.
        // 4. Let P be ? Get(C, "prototype").
        Value proto_val = right_obj->getProperty("prototype");
        // 5. If P is not an Object, throw a TypeError exception.
        if(!proto_val.isObject()) {
            throw JavaScriptException(
                Value("TypeError: Function has non-object prototype in instanceof check"));
        }
        JSObject* constructor_proto = proto_val.getObject();

        // 3. If O is not an Object, return false.
        if(!left.isObject() && !left.isFunction()) {
            return Value(false);
        }

        JSObject* obj = left.getObject();
        if(!obj) {
            return Value(false);
        }

        // 6. Repeat,
        //    a. Set O to ? O.[[GetPrototypeOf]]().
        //    b. If O is null, return false.
        //    c. If SameValue(P, O) is true, return true.
        JSObject* current = obj->getPrototype();
        while(current != nullptr) {
            if(current == constructor_proto) {
                return Value(true);
            }
            current = current->getPrototype();
        }
        return Value(false);
    }

    // -----------------------------------------------------------------------
    // 13.6-13.12 Arithmetic, bitwise, comparison, equality, and shift operators
    // (e.g., +, -, *, /, %, **, ==, ===, <, >, &, |, ^, <<, >>, >>>)
    // Delegates to OperationHandler::performBinaryOperation which implements:
    //   13.15.4 ApplyStringOrNumericBinaryOperator (for arithmetic)
    //   7.2.14 Abstract Equality Comparison
    //   7.2.15 Strict Equality Comparison
    //   7.2.13 Abstract Relational Comparison
    // @spec https://tc39.es/ecma262/#sec-applystringornumericbinaryoperator
    // -----------------------------------------------------------------------
    // 1. Let lref be ? Evaluation of left operand.
    // 2. Let lval be ? GetValue(lref).
    Value left = engine->evaluate(node->children[0], env);
    // 3. Let rref be ? Evaluation of right operand.
    // 4. Let rval be ? GetValue(rref).
    Value right = engine->evaluate(node->children[1], env);

    // 5. Return ? ApplyStringOrNumericBinaryOperator(lval, op, rval).
    // SIMPLIFIED: Rift delegates to OperationHandler which inlines the abstract
    // operations (type coercion, comparison algorithms) rather than implementing
    // them as separate spec abstract operations.
    return OperationHandler::performBinaryOperation(node->value, left, right);
}

// 13.5 Unary Operators — Runtime Semantics: Evaluation
// Handles: delete (13.5.1), void (13.5.2), typeof (13.5.3),
//          unary + (13.5.4), unary - (13.5.5), ~ (13.5.6), ! (13.5.7)
// @spec https://tc39.es/ecma262/#sec-unary-operators
//
// SIMPLIFIED: The spec defines separate Runtime Semantics: Evaluation for each
// unary operator production. Rift uses a single UnaryExpression AST node and
// dispatches by operator string. The actual unary operations (+, -, ~, !) are
// delegated to OperationHandler::performUnaryOperation.
Value ExpressionEvaluator::evaluateUnaryExpression(std::shared_ptr<ASTNode> node,
                                                   std::shared_ptr<Environment> env, Rift* engine) {
    if(node->children.size() != 1) {
        return Value::undefined();
    }

    // -----------------------------------------------------------------------
    // 13.5.2.1 Runtime Semantics: Evaluation — The void Operator
    // @spec https://tc39.es/ecma262/#sec-void-operator-runtime-semantics-evaluation
    // UnaryExpression : void UnaryExpression
    //   1. Let expr be ? Evaluation of UnaryExpression.
    //   2. Perform ? GetValue(expr).
    //   3. Return undefined.
    // -----------------------------------------------------------------------
    if(node->value == "void") {
        engine->evaluate(node->children[0], env);  // Steps 1-2: evaluate for side effects
        return Value::undefined();                 // Step 3: return undefined
    }

    // -----------------------------------------------------------------------
    // 13.5.1.2 Runtime Semantics: Evaluation — The delete Operator
    // @spec https://tc39.es/ecma262/#sec-delete-operator-runtime-semantics-evaluation
    // UnaryExpression : delete UnaryExpression
    // -----------------------------------------------------------------------
    if(node->value == "delete") {
        auto operand_node = node->children[0];

        // Case: delete on MemberExpression (delete obj.prop or delete obj[key])
        // Spec steps for MemberExpression:
        //   1. Let ref be ? Evaluation of UnaryExpression.
        //   2. Assert: ref is a Reference Record.
        //   3. If IsPropertyReference(ref) is true, then
        //      a. Let baseObj be ? ToObject(ref.[[Base]]).
        //      b. Let deleteStatus be ? baseObj.[[Delete]](ref.[[ReferencedName]]).
        //      c. If deleteStatus is false and ref.[[Strict]] is true, throw TypeError.
        //      d. Return deleteStatus.
        // SIMPLIFIED: Rift evaluates the object, resolves the property key, and calls
        // deleteProperty directly. No Reference Record or strict-mode TypeError.
        if(operand_node->type == ASTNodeType::MemberExpression &&
           operand_node->children.size() == 2) {
            Value object = engine->evaluate(operand_node->children[0], env);
            if(object.isObject() || object.isFunction()) {
                auto* obj = object.getObject();
                if(obj) {
                    std::string property;
                    if(operand_node->metadata == "computed") {
                        Value prop_val = engine->evaluate(operand_node->children[1], env);
                        property = prop_val.toString();
                    } else {
                        property = operand_node->children[1]->value;
                    }
                    bool deleted = obj->deleteProperty(property);
                    return Value(deleted);
                }
            }
            return Value(true);
        }

        // Case: delete on Identifier
        //   4. If ref is not a Reference Record, return true.
        //   (For identifiers in non-strict mode: can't delete variables, return false)
        // INCOMPLETE: In strict mode, `delete identifier` should be a SyntaxError
        // (early error), not just return false.
        if(operand_node->type == ASTNodeType::Identifier) {
            return Value(false);
        }

        // Case: delete on other expressions (non-reference)
        //   Spec: If ref is not a Reference Record, return true.
        engine->evaluate(operand_node, env);
        return Value(true);
    }

    // -----------------------------------------------------------------------
    // 13.5.3.1 Runtime Semantics: Evaluation — The typeof Operator
    // @spec https://tc39.es/ecma262/#sec-typeof-operator-runtime-semantics-evaluation
    // UnaryExpression : typeof UnaryExpression
    //   1. Let val be ? Evaluation of UnaryExpression.
    //   2. If val is a Reference Record, then
    //      a. If IsUnresolvableReference(val) is true, return "undefined".
    //   3. Set val to ? GetValue(val).
    //   4. If val is an Object AND has [[Call]], return "function".
    //      Otherwise return the type string per Table 41.
    // -----------------------------------------------------------------------
    if(node->value == "typeof") {
        auto operand_node = node->children[0];

        // Special case: unresolvable identifier reference => return "undefined"
        // (Spec step 2a: IsUnresolvableReference => return "undefined")
        // SIMPLIFIED: Rift catches the exception from env->get() for undefined
        // identifiers instead of checking IsUnresolvableReference on a Reference Record.
        if(operand_node->type == ASTNodeType::Identifier) {
            try {
                Value operand = engine->evaluate(operand_node, env);
                // Step 4: return type string via Table 41
                return OperationHandler::performUnaryOperation(node->value, operand);
            } catch(const JavaScriptException&) {
                // Step 2a: If reference is unresolvable, return "undefined"
                return Value("undefined");
            } catch(const std::exception& e) {
                std::cerr << "Warning: Unexpected exception in typeof evaluation: " << e.what()
                          << std::endl;
                return Value("undefined");
            }
        } else {
            // For non-identifier operands, evaluate normally
            // Steps 1, 3: Evaluate operand and GetValue
            Value operand = engine->evaluate(operand_node, env);
            // Step 4: return type string via Table 41
            return OperationHandler::performUnaryOperation(node->value, operand);
        }
    }

    // -----------------------------------------------------------------------
    // 13.5.4 Unary + Operator   — 1. Let expr be ? Eval(...). 2. Return ? ToNumber(GetValue(expr)).
    // 13.5.5 Unary - Operator   — 1. Let expr be ? Eval(...). 2. Return negation of ToNumber.
    // 13.5.6 Bitwise NOT (~)    — 1. Let expr be ? Eval(...). 2. Return ~ToInt32(GetValue(expr)).
    // 13.5.7 Logical NOT (!)    — 1. Let expr be ? Eval(...). 2. Return !ToBoolean(GetValue(expr)).
    // @spec https://tc39.es/ecma262/#sec-unary-plus-operator
    // @spec https://tc39.es/ecma262/#sec-unary-minus-operator
    // @spec https://tc39.es/ecma262/#sec-bitwise-not-operator
    // @spec https://tc39.es/ecma262/#sec-logical-not-operator
    //
    // SIMPLIFIED: All four operators follow the same pattern (evaluate operand,
    // apply type conversion, apply operation). Delegated to OperationHandler.
    // -----------------------------------------------------------------------
    Value operand = engine->evaluate(node->children[0], env);
    return OperationHandler::performUnaryOperation(node->value, operand);
}

// 13.2.8.6 Runtime Semantics: Evaluation — TemplateLiteral
// @spec https://tc39.es/ecma262/#sec-template-literals-runtime-semantics-evaluation
//
// TemplateLiteral : NoSubstitutionTemplate
//   1. Return the TV (Template Value) of NoSubstitutionTemplate as a String.
//
// SubstitutionTemplate : TemplateHead Expression TemplateSpans
//   1. Let head be the TV of TemplateHead.
//   2. Let subRef be ? Evaluation of Expression.
//   3. Let sub be ? GetValue(subRef).
//   4. Let middle be ? ToString(sub).
//   5. Let tail be ? Evaluation of TemplateSpans.
//   6. Return the string-concatenation of head, middle, and tail.
//
// SIMPLIFIED: The spec handles template literals recursively through TemplateSpans.
// Rift flattens this into a linear iteration over TemplateElement and
// TemplateExpression child nodes, concatenating as it goes.
// INCOMPLETE: Tagged template support (13.2.8.5) is not implemented here.
Value ExpressionEvaluator::evaluateTemplateLiteral(std::shared_ptr<ASTNode> node,
                                                   std::shared_ptr<Environment> env, Rift* engine) {
    std::string result;

    // Iterate through all child nodes (alternating template elements and expressions)
    for(const auto& child : node->children) {
        if(child->type == ASTNodeType::TemplateElement) {
            // Step 1 (of each span): append the TV of this template element
            result += child->value;
        } else if(child->type == ASTNodeType::TemplateExpression) {
            // Steps 2-4: Evaluate expression and convert to string via ToString
            if(!child->children.empty()) {
                Value expression_value = engine->evaluate(child->children[0], env);
                result += expression_value.toString();
            }
        }
    }

    // Step 6: Return the string-concatenation of all parts
    return Value(std::move(result));
}

// 22.2.7.3 Runtime Semantics: Evaluation — RegularExpressionLiteral
// @spec https://tc39.es/ecma262/#sec-regular-expression-literals-runtime-semantics-evaluation
// RegularExpressionLiteral : / RegularExpressionBody / RegularExpressionFlags
//   1. Let pattern be CodePointsToString(BodyText of RegularExpressionLiteral).
//   2. Let flags be CodePointsToString(FlagText of RegularExpressionLiteral).
//   3. Return RegExpCreate(pattern, flags).
// SIMPLIFIED: Rift parses the /<pattern>/<flags> format from the raw token string,
// then delegates to the RegExp constructor rather than calling RegExpCreate directly.
Value ExpressionEvaluator::evaluateRegExpLiteral(std::shared_ptr<ASTNode> node,
                                                 std::shared_ptr<Environment> env, Rift* engine) {
    const std::string& raw = node->value;

    // Steps 1-2: Extract pattern and flags from the raw "/<pattern>/<flags>" string
    size_t last_slash = raw.rfind('/');
    std::string pattern = raw.substr(1, last_slash - 1);
    std::string flags = raw.substr(last_slash + 1);

    // Step 3: Return RegExpCreate(pattern, flags).
    // SIMPLIFIED: Calls the RegExp constructor directly instead of RegExpCreate.
    CallContext ctx(CallType::Constructor);
    std::vector<Value> args = {Value(pattern), Value(flags)};
    return rift::builtins::RegExp::constructor(ctx, args);
}

// 13.14.1 Runtime Semantics: Evaluation — Conditional Operator ( ? : )
// @spec https://tc39.es/ecma262/#sec-conditional-operator-runtime-semantics-evaluation
// ConditionalExpression : ShortCircuitExpression ? AssignmentExpression : AssignmentExpression
//   1. Let lref be ? Evaluation of ShortCircuitExpression.
//   2. Let lval be ToBoolean(? GetValue(lref)).
//   3. If lval is true, then
//      a. Let trueRef be ? Evaluation of the first AssignmentExpression.
//      b. Return ? GetValue(trueRef).
//   4. Else,
//      a. Let falseRef be ? Evaluation of the second AssignmentExpression.
//      b. Return ? GetValue(falseRef).
Value ExpressionEvaluator::evaluateConditionalExpression(std::shared_ptr<ASTNode> node,
                                                         std::shared_ptr<Environment> env,
                                                         Rift* engine) {
    if(node->children.size() != 3) {
        return Value::undefined();
    }

    // Steps 1-2: Evaluate condition and convert to boolean
    Value condition = engine->evaluate(node->children[0], env);
    if(condition.toBool()) {
        // Step 3: lval is true — evaluate and return the consequent
        return engine->evaluate(node->children[1], env);
    }
    // Step 4: lval is false — evaluate and return the alternate
    return engine->evaluate(node->children[2], env);
}

// 13.16 Comma Operator (,)
// @spec https://tc39.es/ecma262/#sec-comma-operator
// Expression : Expression , AssignmentExpression
//   1. Let lref be ? Evaluation of Expression.
//   2. Perform ? GetValue(lref).
//   3. Let rref be ? Evaluation of AssignmentExpression.
//   4. Return ? GetValue(rref).
Value ExpressionEvaluator::evaluateSequenceExpression(std::shared_ptr<ASTNode> node,
                                                      std::shared_ptr<Environment> env,
                                                      Rift* engine) {
    Value result = Value::undefined();
    for(const auto& child : node->children) {
        result = engine->evaluate(child, env);
    }
    return result;
}

}  // namespace rift::core
