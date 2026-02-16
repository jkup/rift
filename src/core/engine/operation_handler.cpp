#include "rift/core/engine/operation_handler.h"

#include <cmath>

// ============================================================================
// ECMA-262 — Binary and Unary Operation Handlers
// Implements abstract operations for operator evaluation:
//   - ApplyStringOrNumericBinaryOperator (13.15.3)
//   - IsLooselyEqual (7.2.14) — == operator
//   - IsStrictlyEqual (7.2.15) — === operator
//   - Abstract Relational Comparison / IsLessThan (7.2.13) — <, >, <=, >=
//   - Number::bitwiseAND/OR/XOR (6.1.6.1.17-19) — &, |, ^
//   - Number::leftShift/signedRightShift/unsignedRightShift (6.1.6.1.9-11)
//   - Number::unaryMinus (6.1.6.1.1) — unary -
//   - ToNumber (7.1.4) — unary +
//   - ToBoolean + logical NOT (7.1.2, 13.5.7)
//   - typeof operator (13.5.3)
//   - Number::bitwiseNOT (6.1.6.1.20) — ~
// @spec https://tc39.es/ecma262/#sec-applystringornumericbinaryoperator
// @spec https://tc39.es/ecma262/#sec-islooselyequal
// @spec https://tc39.es/ecma262/#sec-isstrictlyequal
// @spec https://tc39.es/ecma262/#sec-islessthan
// Cross-references:
//   - Expression evaluation dispatches here from expression_evaluator.cpp
//   - Statement evaluators may also invoke these for computed assignments
// ============================================================================

namespace rift::core {

// 13.15.3 ApplyStringOrNumericBinaryOperator ( lval, opText, rval )
// @spec https://tc39.es/ecma262/#sec-applystringornumericbinaryoperator
//
// This function combines the evaluation of multiple binary operator categories:
//   - 13.8 Additive Operators (+, -)
//   - 13.7 Multiplicative Operators (*, /, %)
//   - 13.6 Exponentiation Operator (**)
//   - 13.11 Equality Operators (==, !=, ===, !==)
//   - 13.10 Relational Operators (<, >, <=, >=)
//   - 13.12 Binary Bitwise Operators (&, |, ^)
//   - 13.9 Bitwise Shift Operators (<<, >>, >>>)
//
// SIMPLIFIED: The spec's ApplyStringOrNumericBinaryOperator first converts
// operands via ToPrimitive, then branches on string vs numeric. Rift receives
// already-evaluated Value objects and dispatches by operator string. The
// ToPrimitive conversion happens implicitly through Value::toNumber() and
// Value::toString() calls within each branch. Equality and relational operators
// are handled by separate spec abstract operations (IsLooselyEqual, etc.) but
// are consolidated here in Rift for simplicity.
Value OperationHandler::performBinaryOperation(const std::string& op, const Value& left,
                                               const Value& right) {
    // --- 13.8.1 The Addition Operator ( + ) ---
    // @spec https://tc39.es/ecma262/#sec-addition-operator-plus
    // Spec: 13.15.3 ApplyStringOrNumericBinaryOperator, steps 1-3 for opText "+":
    //   1. If opText is +, then
    //     a. Let lprim be ? ToPrimitive(lval).
    //     b. Let rprim be ? ToPrimitive(rval).
    //     c. If lprim is a String or rprim is a String, then
    //       i. Let lstr be ? ToString(lprim).
    //       ii. Let rstr be ? ToString(rprim).
    //       iii. Return the string-concatenation of lstr and rstr.
    //     d. Set lval to lprim.
    //     e. Set rval to rprim.
    //   2. NOTE: At this point, ... lval and rval are still ToPrimitive results.
    //   3. Let lnum be ? ToNumeric(lval).
    //   4. Let rnum be ? ToNumeric(rval).
    //   ... (then apply the numeric operation)
    if(op == "+") {
        // SIMPLIFIED: Rift checks isString() directly instead of calling ToPrimitive
        // first. This skips Symbol.toPrimitive / valueOf / toString coercion on objects.
        // Step 1c: If lprim is a String or rprim is a String, concatenate.
        if(left.isString() || right.isString()) {
            return Value(left.toString() + right.toString());
        }
        // Steps 3-4: ToNumeric(lval) + ToNumeric(rval).
        // SIMPLIFIED: Rift uses toNumber() which is equivalent to ToNumeric for
        // non-BigInt values. BigInt is not yet implemented.
        return Value(left.toNumber() + right.toNumber());
    }

    // --- 13.8.2 The Subtraction Operator ( - ) ---
    // @spec https://tc39.es/ecma262/#sec-subtraction-operator-minus
    // Spec steps 3-5: Let lnum be ? ToNumeric(lval). Let rnum be ? ToNumeric(rval).
    // Return Number::subtract(lnum, rnum).
    if(op == "-")
        return Value(left.toNumber() - right.toNumber());

    // --- 13.7.1 Multiplicative Operators ---
    // @spec https://tc39.es/ecma262/#sec-multiplicative-operators
    // MultiplicativeExpression : MultiplicativeExpression MultiplicativeOperator UnaryExpression
    // Spec steps: ToNumeric both operands, then apply the operation.

    // 6.1.6.1.4 Number::multiply ( x, y )
    // @spec https://tc39.es/ecma262/#sec-numeric-types-number-multiply
    if(op == "*")
        return Value(left.toNumber() * right.toNumber());

    // 6.1.6.1.5 Number::divide ( x, y )
    // @spec https://tc39.es/ecma262/#sec-numeric-types-number-divide
    if(op == "/")
        return Value(left.toNumber() / right.toNumber());

    // 6.1.6.1.6 Number::remainder ( x, y )
    // @spec https://tc39.es/ecma262/#sec-numeric-types-number-remainder
    if(op == "%")
        return Value(std::fmod(left.toNumber(), right.toNumber()));

    // --- 13.6 Exponentiation Operator ---
    // @spec https://tc39.es/ecma262/#sec-exp-operator
    // 6.1.6.1.3 Number::exponentiate ( base, exponent )
    // @spec https://tc39.es/ecma262/#sec-numeric-types-number-exponentiate
    if(op == "**")
        return Value(std::pow(left.toNumber(), right.toNumber()));

    // --- 13.11.1 The Abstract Equality Comparison (==) ---
    // 7.2.14 IsLooselyEqual ( x, y )
    // @spec https://tc39.es/ecma262/#sec-islooselyequal
    //
    // The abstract operation IsLooselyEqual takes arguments x (an ECMAScript
    // language value) and y (an ECMAScript language value) and returns either a
    // normal completion containing a Boolean or a throw completion.
    if(op == "==") {
        // Step 1. If Type(x) is Type(y), then
        //   a. Return IsStrictlyEqual(x, y).
        // (Rift handles symbols first as a special case, then same-type)

        // SIMPLIFIED: Spec step 1 delegates to IsStrictlyEqual for same-type
        // comparisons. Rift inlines those checks here instead of calling through.

        // Handle symbols early — symbols are only equal to themselves (no coercion).
        // This covers spec step 1a for same-type symbols and implicitly handles
        // the fact that no coercion path converts to/from Symbol.
        if(left.isSymbol() || right.isSymbol()) {
            if(left.getType() != right.getType()) {
                return Value(false);
            }
            return Value(left.getSymbol() == right.getSymbol());
        }

        // Step 1. If Type(x) is Type(y), return IsStrictlyEqual(x, y).
        if(left.getType() == right.getType()) {
            // SIMPLIFIED: Inlined IsStrictlyEqual (7.2.15) for same-type values.
            // Step 1 of IsStrictlyEqual: Type(x) is Type(y) — already checked.
            // Step 2: If x is a Number, return Number::equal(x, y).
            if(left.isNumber())
                return Value(left.toNumber() == right.toNumber());
            // Step 4: Return SameValueNonNumeric(x, y).
            // 7.2.12 SameValueNonNumeric checks string/boolean/null/undefined/object.
            if(left.isString())
                return Value(left.toString() == right.toString());
            if(left.isBoolean())
                return Value(left.toBool() == right.toBool());
            if(left.isNull() && right.isNull())
                return Value(true);
            if(left.isUndefined() && right.isUndefined())
                return Value(true);
            // DEVIATION: For objects, spec compares by reference identity.
            // Rift compares by toString() which is incorrect for object identity.
            return Value(left.toString() == right.toString());
        }

        // Step 2. If x is null and y is undefined, return true.
        // Step 3. If x is undefined and y is null, return true.
        if((left.isNull() && right.isUndefined()) || (left.isUndefined() && right.isNull())) {
            return Value(true);
        }

        // Steps 4-10 handle cross-type coercion:
        // Step 4. If x is a Number and y is a String, return IsLooselyEqual(x, ToNumber(y)).
        // Step 5. If x is a String and y is a Number, return IsLooselyEqual(ToNumber(x), y).
        // Step 6. If x is a BigInt and y is a String, ... (INCOMPLETE: BigInt not implemented)
        // Step 7. If x is a String and y is a BigInt, ... (INCOMPLETE: BigInt not implemented)
        // Step 8. If x is a Boolean, return IsLooselyEqual(ToNumber(x), y).
        // Step 9. If y is a Boolean, return IsLooselyEqual(x, ToNumber(y)).
        // Step 10. If x is String/Number/BigInt/Symbol and y is Object, ...
        // Step 11. If x is Object and y is String/Number/BigInt/Symbol, ...
        // Step 12. If x is a BigInt and y is a Number (or vice versa), ...
        // Step 13. Return false.
        //
        // SIMPLIFIED: Rift collapses steps 4-12 into a simpler two-branch check.
        // If either side is a number, both are coerced to numbers via toNumber().
        // Otherwise, both are coerced to strings. This covers the common cases but
        // may differ from spec for Object/Boolean cross-type comparisons where the
        // spec prescribes a specific coercion order (e.g., Boolean -> Number first,
        // then re-compare, rather than direct toNumber on both).
        if(left.isNumber() || right.isNumber()) {
            return Value(left.toNumber() == right.toNumber());
        }

        return Value(left.toString() == right.toString());
    }

    // 13.11.2 The Does-Not-Equal Operator (!=)
    // @spec https://tc39.es/ecma262/#sec-equality-operators-runtime-semantics-evaluation
    // Spec: 1. Let r be IsLooselyEqual(lval, rval).
    //        2. If r is true, return false. Otherwise return true.
    if(op == "!=") {
        Value equalResult = performBinaryOperation("==", left, right);
        return Value(!equalResult.toBool());
    }

    // --- 13.11.1 The Strict Equality Comparison (===) ---
    // 7.2.15 IsStrictlyEqual ( x, y )
    // @spec https://tc39.es/ecma262/#sec-isstrictlyequal
    //
    // The abstract operation IsStrictlyEqual takes arguments x (an ECMAScript
    // language value) and y (an ECMAScript language value) and returns a Boolean.
    if(op == "===") {
        // 1. If Type(x) is not Type(y), return false.
        if(left.getType() != right.getType()) {
            return Value(false);
        }
        // 2. If x is a Number, then
        //   a. Return Number::equal(x, y).
        if(left.isNumber()) {
            return Value(left.toNumber() == right.toNumber());
        // 3. Return SameValueNonNumeric(x, y).
        // 7.2.12 SameValueNonNumeric ( x, y )
        // @spec https://tc39.es/ecma262/#sec-samevaluenonnumeric
        // Requires Type(x) is Type(y) and x is not a Number or BigInt.
        //   1. If x is either null or undefined, return true.
        //   2. If x is a String, return true if x and y are the same sequence of code units.
        //   3. If x is a Boolean, return true if x and y are both true or both false.
        //   4. If x is a Symbol, return true if x and y are the same Symbol value.
        //   5. If x is an Object, return true if x and y are the same Object value.
        } else if(left.isString()) {
            return Value(left.toString() == right.toString());
        } else if(left.isBoolean()) {
            return Value(left.toBool() == right.toBool());
        } else if(left.isSymbol()) {
            return Value(left.getSymbol() == right.getSymbol());
        } else if(left.isNull() && right.isNull()) {
            return Value(true);
        } else if(left.isUndefined() && right.isUndefined()) {
            return Value(true);
        } else {
            // DEVIATION: For objects, spec compares by reference identity
            // (SameValueNonNumeric step 5: "x and y are the same Object value").
            // Rift compares by toString() which is incorrect — two different objects
            // with the same toString() output would incorrectly compare as equal.
            return Value(left.toString() == right.toString());
        }
    }

    // 13.11.2 The Strict Does-Not-Equal Operator (!==)
    // @spec https://tc39.es/ecma262/#sec-equality-operators-runtime-semantics-evaluation
    // Spec: 1. Let r be IsStrictlyEqual(lval, rval).
    //        2. If r is true, return false. Otherwise return true.
    //
    // SIMPLIFIED: Rather than delegating to the === handler and negating,
    // Rift duplicates the IsStrictlyEqual logic inline with inverted results.
    if(op == "!==") {
        // 1. If Type(x) is not Type(y), return true. (inverse of === step 1)
        if(left.getType() != right.getType()) {
            return Value(true);
        }
        // Same type — compare values and negate (inverse of IsStrictlyEqual)
        if(left.isNumber()) {
            return Value(left.toNumber() != right.toNumber());
        } else if(left.isString()) {
            return Value(left.toString() != right.toString());
        } else if(left.isBoolean()) {
            return Value(left.toBool() != right.toBool());
        } else if(left.isSymbol()) {
            return Value(left.getSymbol() != right.getSymbol());
        } else if(left.isNull() && right.isNull()) {
            return Value(false);
        } else if(left.isUndefined() && right.isUndefined()) {
            return Value(false);
        } else {
            // DEVIATION: Same toString()-based comparison issue as === above.
            return Value(left.toString() != right.toString());
        }
    }

    // --- 13.10 Relational Operators (<, >, <=, >=) ---
    // @spec https://tc39.es/ecma262/#sec-relational-operators
    // These all ultimately call:
    // 7.2.13 IsLessThan ( x, y, LeftFirst )
    // @spec https://tc39.es/ecma262/#sec-islessthan
    //
    // IsLessThan algorithm:
    //   1. If LeftFirst is true, let px be ? ToPrimitive(x, number). Let py be ? ToPrimitive(y, number).
    //      Otherwise let py first, then px.
    //   2. If px is a String and py is a String, then
    //     a. Compare code unit sequences (lexicographic string comparison).
    //   3. Else,
    //     a. Let nx be ? ToNumeric(px). Let ny be ? ToNumeric(py).
    //     b. If Type(nx) is Type(ny), return Type(nx)::lessThan(nx, ny).
    //     c. (BigInt/Number cross-type comparison — not implemented)
    //
    // SIMPLIFIED: Rift always converts both operands to numbers via toNumber(),
    // skipping ToPrimitive and the string-vs-string lexicographic comparison path.
    // This means string comparisons like "b" < "a" are compared numerically (NaN)
    // instead of lexicographically. This is a known limitation.
    //
    // INCOMPLETE: String-to-string lexicographic comparison is not handled here.
    // The spec says if both ToPrimitive results are strings, compare by code units.

    // < operator: return IsLessThan(lval, rval, true).
    //   If result is undefined (NaN), return false.
    if(op == "<")
        return Value(left.toNumber() < right.toNumber());

    // > operator: return IsLessThan(rval, lval, false).
    //   Note: arguments are swapped, and LeftFirst is false.
    //   If result is undefined (NaN), return false.
    if(op == ">")
        return Value(left.toNumber() > right.toNumber());

    // <= operator: Let r be IsLessThan(rval, lval, false).
    //   If r is true or undefined, return false. Otherwise return true.
    if(op == "<=")
        return Value(left.toNumber() <= right.toNumber());

    // >= operator: Let r be IsLessThan(lval, rval, true).
    //   If r is true or undefined, return false. Otherwise return true.
    if(op == ">=")
        return Value(left.toNumber() >= right.toNumber());

    // --- 13.12 Binary Bitwise Operators (&, |, ^) ---
    // @spec https://tc39.es/ecma262/#sec-binary-bitwise-operators
    // Evaluation:
    //   1. Let lnum be ? ToNumeric(lval).
    //   2. Let rnum be ? ToNumeric(rval).
    //   3. ... Return Type(lnum)::bitwiseAND/OR/XOR(lnum, rnum).
    //
    // 6.1.6.1.17 Number::bitwiseAND ( x, y )
    // @spec https://tc39.es/ecma262/#sec-numeric-types-number-bitwiseAND
    // Calls NumberBitwiseOp(&, x, y):
    //   1. Let lnum be ToInt32(x).
    //   2. Let rnum be ToInt32(y).
    //   3. Return ... the result of applying the bitwise operator to lnum and rnum.
    //   4. Result is a mathematical value, returned as Number.
    if(op == "&") {
        // ToInt32(x) & ToInt32(y)
        int32_t leftInt = static_cast<int32_t>(left.toNumber());
        int32_t rightInt = static_cast<int32_t>(right.toNumber());
        return Value(static_cast<double>(leftInt & rightInt));
    }

    // 6.1.6.1.18 Number::bitwiseOR ( x, y )
    // @spec https://tc39.es/ecma262/#sec-numeric-types-number-bitwiseOR
    if(op == "|") {
        // ToInt32(x) | ToInt32(y)
        int32_t leftInt = static_cast<int32_t>(left.toNumber());
        int32_t rightInt = static_cast<int32_t>(right.toNumber());
        return Value(static_cast<double>(leftInt | rightInt));
    }

    // 6.1.6.1.19 Number::bitwiseXOR ( x, y )
    // @spec https://tc39.es/ecma262/#sec-numeric-types-number-bitwiseXOR
    if(op == "^") {
        // ToInt32(x) ^ ToInt32(y)
        int32_t leftInt = static_cast<int32_t>(left.toNumber());
        int32_t rightInt = static_cast<int32_t>(right.toNumber());
        return Value(static_cast<double>(leftInt ^ rightInt));
    }

    // --- 13.9 Bitwise Shift Operators (<<, >>, >>>) ---
    // @spec https://tc39.es/ecma262/#sec-bitwise-shift-operators

    // 13.9.1 The Left Shift Operator ( << )
    // @spec https://tc39.es/ecma262/#sec-left-shift-operator
    // 6.1.6.1.9 Number::leftShift ( x, y )
    // @spec https://tc39.es/ecma262/#sec-numeric-types-number-leftShift
    //   1. Let lnum be ToInt32(x).
    //   2. Let rnum be ToUint32(y).
    //   3. Let shiftCount be rnum modulo 32 (i.e., rnum & 0x1F).
    //   4. Return the result of left shifting lnum by shiftCount bits.
    if(op == "<<") {
        // Step 1: ToInt32(x)
        int32_t leftInt = static_cast<int32_t>(left.toNumber());
        // Steps 2-3: ToUint32(y) modulo 32
        uint32_t shiftAmount = static_cast<uint32_t>(right.toNumber()) & 0x1F;
        // Step 4: left shift
        return Value(static_cast<double>(leftInt << shiftAmount));
    }

    // 13.9.2 The Signed Right Shift Operator ( >> )
    // @spec https://tc39.es/ecma262/#sec-signed-right-shift-operator
    // 6.1.6.1.10 Number::signedRightShift ( x, y )
    // @spec https://tc39.es/ecma262/#sec-numeric-types-number-signedRightShift
    //   1. Let lnum be ToInt32(x).
    //   2. Let rnum be ToUint32(y).
    //   3. Let shiftCount be rnum modulo 32.
    //   4. Return the result of sign-extending right shift of lnum by shiftCount bits.
    if(op == ">>") {
        // Step 1: ToInt32(x)
        int32_t leftInt = static_cast<int32_t>(left.toNumber());
        // Steps 2-3: ToUint32(y) modulo 32
        uint32_t shiftAmount = static_cast<uint32_t>(right.toNumber()) & 0x1F;
        // Step 4: sign-extending right shift
        return Value(static_cast<double>(leftInt >> shiftAmount));
    }

    // 13.9.3 The Unsigned Right Shift Operator ( >>> )
    // @spec https://tc39.es/ecma262/#sec-unsigned-right-shift-operator
    // 6.1.6.1.11 Number::unsignedRightShift ( x, y )
    // @spec https://tc39.es/ecma262/#sec-numeric-types-number-unsignedRightShift
    //   1. Let lnum be ToUint32(x).
    //   2. Let rnum be ToUint32(y).
    //   3. Let shiftCount be rnum modulo 32.
    //   4. Return the result of zero-filling right shift of lnum by shiftCount bits.
    if(op == ">>>") {
        // Step 1: ToUint32(x) — go through int32 first, then reinterpret as uint32
        uint32_t leftUint = static_cast<uint32_t>(static_cast<int32_t>(left.toNumber()));
        // Steps 2-3: ToUint32(y) modulo 32
        uint32_t shiftAmount = static_cast<uint32_t>(right.toNumber()) & 0x1F;
        // Step 4: zero-filling right shift
        return Value(static_cast<double>(leftUint >> shiftAmount));
    }

    return Value::undefined();
}

// 13.5 Unary Operators
// @spec https://tc39.es/ecma262/#sec-unary-operators
//
// Handles: unary minus (-), unary plus (+), logical NOT (!), typeof, bitwise NOT (~).
// SIMPLIFIED: The spec evaluates each unary operator via its own runtime semantics
// section. Rift consolidates them into a single dispatch function that receives
// the operator string and an already-evaluated operand Value.
//
// INCOMPLETE: The void operator and delete operator are not handled here
// (void is handled in the expression evaluator; delete has its own path).
Value OperationHandler::performUnaryOperation(const std::string& op, const Value& operand) {
    // 13.5.5 Unary - Operator
    // @spec https://tc39.es/ecma262/#sec-unary-minus-operator
    // Runtime Semantics: Evaluation
    //   1. Let expr be ? Evaluation of UnaryExpression.
    //   2. Let oldValue be ? ToNumeric(? GetValue(expr)).
    //   3. If oldValue is a Number, return Number::unaryMinus(oldValue).
    //   4. Else (BigInt), return BigInt::unaryMinus(oldValue).
    // 6.1.6.1.1 Number::unaryMinus ( x )
    // @spec https://tc39.es/ecma262/#sec-numeric-types-number-unaryMinus
    //   1. If x is NaN, return NaN.
    //   2. Return the result of negating x.
    if(op == "-") {
        return Value(-operand.toNumber());
    }

    // 13.5.4 Unary + Operator
    // @spec https://tc39.es/ecma262/#sec-unary-plus-operator
    // Runtime Semantics: Evaluation
    //   1. Let expr be ? Evaluation of UnaryExpression.
    //   2. Return ? ToNumber(? GetValue(expr)).
    // Note: Unary + is essentially a ToNumber conversion.
    if(op == "+") {
        return Value(operand.toNumber());
    }

    // 13.5.7 Logical NOT Operator ( ! )
    // @spec https://tc39.es/ecma262/#sec-logical-not-operator
    // Runtime Semantics: Evaluation
    //   1. Let expr be ? Evaluation of UnaryExpression.
    //   2. Let oldValue be ToBoolean(? GetValue(expr)).
    //   3. If oldValue is true, return false.
    //   4. Return true.
    if(op == "!") {
        // Steps 2-4: ToBoolean then negate.
        return Value(!operand.toBool());
    }

    // 13.5.3 The typeof Operator
    // @spec https://tc39.es/ecma262/#sec-typeof-operator
    // Runtime Semantics: Evaluation
    //   1. Let val be ? Evaluation of UnaryExpression.
    //   2. If val is a Reference Record whose [[Base]] is unresolvable, return "undefined".
    //   3. Set val to ? GetValue(val).
    //   4. If val is an Object and val has a [[Call]] internal method, return "function".
    //   5. Return a String according to Table 41.
    //
    // Table 41 — typeof Operator Results:
    //   Undefined   -> "undefined"
    //   Null        -> "object"
    //   Boolean     -> "boolean"
    //   Number      -> "number"
    //   String      -> "string"
    //   Symbol      -> "symbol"
    //   BigInt      -> "bigint"      (INCOMPLETE: BigInt not implemented)
    //   Object (no [[Call]]) -> "object"
    //   Object (has [[Call]]) -> "function"
    //
    // SIMPLIFIED: Step 2 (unresolvable reference returning "undefined") is handled
    // in the expression evaluator before this function is called, not here.
    if(op == "typeof") {
        if(operand.isUndefined()) {
            return Value("undefined");
        } else if(operand.isNull()) {
            // Spec Table 41: Null -> "object" (this is the famous typeof null bug)
            return Value("object");
        } else if(operand.isBoolean()) {
            return Value("boolean");
        } else if(operand.isNumber()) {
            return Value("number");
        } else if(operand.isString()) {
            return Value("string");
        } else if(operand.isSymbol()) {
            return Value("symbol");
        } else if(operand.isFunction()) {
            // Step 4: Object with [[Call]] -> "function"
            return Value("function");
        } else if(operand.isObject()) {
            // Step 5 / Table 41: Object without [[Call]] -> "object"
            return Value("object");
        } else {
            return Value("undefined");
        }
    }

    // 13.5.6 Bitwise NOT Operator ( ~ )
    // @spec https://tc39.es/ecma262/#sec-bitwise-not-operator
    // Runtime Semantics: Evaluation
    //   1. Let expr be ? Evaluation of UnaryExpression.
    //   2. Let oldValue be ? ToNumeric(? GetValue(expr)).
    //   3. If oldValue is a Number, return Number::bitwiseNOT(oldValue).
    //   4. Else (BigInt), return BigInt::bitwiseNOT(oldValue).
    // 6.1.6.1.20 Number::bitwiseNOT ( x )
    // @spec https://tc39.es/ecma262/#sec-numeric-types-number-bitwiseNOT
    //   1. Let oldValue be ToInt32(x).
    //   2. Return the result of applying bitwise complement to oldValue.
    if(op == "~") {
        // Step 1: ToInt32(x)
        int32_t intValue = static_cast<int32_t>(operand.toNumber());
        // Step 2: bitwise complement
        return Value(static_cast<double>(~intValue));
    }

    return Value::undefined();
}

}  // namespace rift::core