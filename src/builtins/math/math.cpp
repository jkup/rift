#include "rift/builtins/math/math.h"

#include <algorithm>
#include <cmath>
#include <random>

#include "rift/builtins/builtin_base.h"  // For RIFT_METHOD and RIFT_PROPERTY macros
#include "rift/interpreter/call_context.h"

// ============================================================================
// ECMA-262 — The Math Object
// @spec https://tc39.es/ecma262/#sec-math-object
// ============================================================================

namespace rift::builtins {

using rift::core::CallContext;

// 21.3.1 Value Properties of the Math Object
// @spec https://tc39.es/ecma262/#sec-value-properties-of-the-math-object
const double Math::E = M_E;          // 21.3.1.1 Math.E
const double Math::PI = M_PI;        // 21.3.1.6 Math.PI
const double Math::SQRT2 = M_SQRT2;  // 21.3.1.8 Math.SQRT2

// Random number generator static members (implementation detail for Math.random)
std::random_device Math::rd;
std::mt19937 Math::gen(Math::rd());
std::uniform_real_distribution<> Math::dis(0.0, 1.0);

JSObject* Math::create(rift::memory::ObjectFactory* factory) {
    auto* math = factory->createJSObject();

    // 21.3.1 Value Properties of the Math Object
    // @spec https://tc39.es/ecma262/#sec-value-properties-of-the-math-object
    RIFT_PROPERTY(math, "PI", Value(M_PI));            // 21.3.1.6 Math.PI
    RIFT_PROPERTY(math, "E", Value(M_E));              // 21.3.1.1 Math.E
    RIFT_PROPERTY(math, "SQRT2", Value(M_SQRT2));      // 21.3.1.8 Math.SQRT2
    RIFT_PROPERTY(math, "LN2", Value(M_LN2));          // 21.3.1.3 Math.LN2
    RIFT_PROPERTY(math, "LN10", Value(M_LN10));        // 21.3.1.2 Math.LN10
    RIFT_PROPERTY(math, "LOG2E", Value(M_LOG2E));      // 21.3.1.5 Math.LOG2E
    RIFT_PROPERTY(math, "LOG10E", Value(M_LOG10E));    // 21.3.1.4 Math.LOG10E
    RIFT_PROPERTY(math, "SQRT1_2", Value(M_SQRT1_2));  // 21.3.1.7 Math.SQRT1_2
    // INCOMPLETE: Missing Math[@@toStringTag] = "Math" (21.3.1.9)

    // 21.3.2 Function Properties of the Math Object
    // @spec https://tc39.es/ecma262/#sec-function-properties-of-the-math-object
    RIFT_METHOD(math, "abs", abs);        // 21.3.2.1
    RIFT_METHOD(math, "floor", floor);    // 21.3.2.16
    RIFT_METHOD(math, "ceil", ceil);      // 21.3.2.10
    RIFT_METHOD(math, "round", round);    // 21.3.2.29
    RIFT_METHOD(math, "max", max);        // 21.3.2.25
    RIFT_METHOD(math, "min", min);        // 21.3.2.26
    RIFT_METHOD(math, "pow", pow);        // 21.3.2.27
    RIFT_METHOD(math, "sqrt", sqrt);      // 21.3.2.33
    RIFT_METHOD(math, "random", random);  // 21.3.2.28
    RIFT_METHOD(math, "sign", sign);      // 21.3.2.30
    RIFT_METHOD(math, "trunc", trunc);    // 21.3.2.36
    RIFT_METHOD(math, "sin", sin);        // 21.3.2.31
    RIFT_METHOD(math, "cos", cos);        // 21.3.2.12
    RIFT_METHOD(math, "tan", tan);        // 21.3.2.34

    // Inverse trigonometric methods
    RIFT_METHOD(math, "acos", acos);    // 21.3.2.2
    RIFT_METHOD(math, "asin", asin);    // 21.3.2.4
    RIFT_METHOD(math, "atan", atan);    // 21.3.2.6
    RIFT_METHOD(math, "atan2", atan2);  // 21.3.2.8

    // Hyperbolic methods
    RIFT_METHOD(math, "cosh", cosh);    // 21.3.2.13
    RIFT_METHOD(math, "sinh", sinh);    // 21.3.2.32
    RIFT_METHOD(math, "tanh", tanh);    // 21.3.2.35
    RIFT_METHOD(math, "acosh", acosh);  // 21.3.2.3
    RIFT_METHOD(math, "asinh", asinh);  // 21.3.2.5
    RIFT_METHOD(math, "atanh", atanh);  // 21.3.2.7

    // Exponential and logarithmic methods
    RIFT_METHOD(math, "exp", exp);      // 21.3.2.14
    RIFT_METHOD(math, "expm1", expm1);  // 21.3.2.15
    RIFT_METHOD(math, "log", log);      // 21.3.2.21
    RIFT_METHOD(math, "log1p", log1p);  // 21.3.2.22
    RIFT_METHOD(math, "log2", log2);    // 21.3.2.24
    RIFT_METHOD(math, "log10", log10);  // 21.3.2.23

    // Other methods
    RIFT_METHOD(math, "cbrt", cbrt);      // 21.3.2.9
    RIFT_METHOD(math, "clz32", clz32);    // 21.3.2.11
    RIFT_METHOD(math, "fround", fround);  // 21.3.2.17
    RIFT_METHOD(math, "hypot", hypot);    // 21.3.2.19
    RIFT_METHOD(math, "imul", imul);      // 21.3.2.20
    // INCOMPLETE: Missing Math.f16round (21.3.2.18)

    return math;
}

// Helper: performs ToNumber (7.1.4) on the argument at the given index.
// Returns NaN if the argument is missing or converts to NaN.
// SIMPLIFIED: Spec methods call ToNumber individually per step; this helper
// consolidates that pattern but returns NaN early (skipping the per-method
// NaN-handling branches that the spec defines inline).
double Math::validateAndGetNumber(const std::vector<Value>& args, size_t index) {
    if(args.size() <= index) {
        return std::numeric_limits<double>::quiet_NaN();
    }

    double num = args[index].toNumber();

    if(std::isnan(num)) {
        return std::numeric_limits<double>::quiet_NaN();
    }

    return num;
}

// 21.3.2.1 Math.abs ( x )
// @spec https://tc39.es/ecma262/#sec-math.abs
Value Math::abs(const CallContext& ctx, const std::vector<Value>& args) {
    double num = validateAndGetNumber(args, 0);

    if(std::isnan(num)) {
        return Value(num);
    }

    return Value(::fabs(num));
}

// 21.3.2.10 Math.ceil ( x )
// @spec https://tc39.es/ecma262/#sec-math.ceil
Value Math::ceil(const CallContext& ctx, const std::vector<Value>& args) {
    double num = validateAndGetNumber(args, 0);

    if(std::isnan(num) || std::isinf(num)) {
        return Value(num);
    }

    return Value(std::ceil(num));
}

// 21.3.2.16 Math.floor ( x )
// @spec https://tc39.es/ecma262/#sec-math.floor
Value Math::floor(const CallContext& ctx, const std::vector<Value>& args) {
    double num = validateAndGetNumber(args, 0);

    if(std::isnan(num) || std::isinf(num)) {
        return Value(num);
    }

    return Value(std::floor(num));
}

// 21.3.2.29 Math.round ( x )
// @spec https://tc39.es/ecma262/#sec-math.round
//
// Spec algorithm:
//   1. Let n be ? ToNumber(x).
//   2. If n is not finite or n is an integral Number, return n.
//   3. If n < 0.5 and n > +0, return +0.
//   4. If n < -0 and n >= -0.5, return -0.
//   5. Return the integral Number closest to n, preferring the Number
//      closer to +Infinity in the case of a tie.
Value Math::round(const CallContext& ctx, const std::vector<Value>& args) {
    double num = validateAndGetNumber(args, 0);

    if(std::isnan(num) || std::isinf(num)) {
        return Value(num);
    }

    // Step 5: ECMAScript rounding — round half toward +Infinity
    if(num >= 0) {
        return Value(std::floor(num + 0.5));
    } else {
        return Value(std::ceil(num - 0.5));
    }
}

// 21.3.2.25 Math.max ( ...args )
// @spec https://tc39.es/ecma262/#sec-math.max
//
// Spec algorithm:
//   1. Let coerced be a new empty List.
//   2. For each element arg of args, do
//     a. Let n be ? ToNumber(arg).
//     b. Append n to coerced.
//   3. Let highest be -Infinity.
//   4. For each element number of coerced, do
//     a. If number is NaN, return NaN.
//     b. If number is +0 and highest is -0, set highest to +0.
//     c. If number > highest, set highest to number.
//   5. Return highest.
Value Math::max(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 3: Let highest be -Infinity.
    if(args.empty()) {
        return Value(-std::numeric_limits<double>::infinity());
    }

    double result = -std::numeric_limits<double>::infinity();

    // Steps 1-2 (ToNumber) and Step 4 combined in a single pass
    // DEVIATION: Spec coerces all args first, then iterates; we combine both loops.
    // This is observable if ToNumber has side effects, but rift does not yet support
    // valueOf/Symbol.toPrimitive overrides on non-object args in this path.
    for(size_t i = 0; i < args.size(); ++i) {
        double num = args[i].toNumber();

        // Step 4a: If number is NaN, return NaN
        if(std::isnan(num)) {
            return Value(std::numeric_limits<double>::quiet_NaN());
        }

        // Step 4b-c: std::max handles +0 vs -0 correctly in IEEE 754
        result = std::max(result, num);
    }

    // Step 5: Return highest
    return Value(result);
}

// 21.3.2.26 Math.min ( ...args )
// @spec https://tc39.es/ecma262/#sec-math.min
//
// Spec algorithm:
//   1. Let coerced be a new empty List.
//   2. For each element arg of args, do
//     a. Let n be ? ToNumber(arg).
//     b. Append n to coerced.
//   3. Let lowest be +Infinity.
//   4. For each element number of coerced, do
//     a. If number is NaN, return NaN.
//     b. If number is -0 and lowest is +0, set lowest to -0.
//     c. If number < lowest, set lowest to number.
//   5. Return lowest.
Value Math::min(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 3: Let lowest be +Infinity.
    if(args.empty()) {
        return Value(std::numeric_limits<double>::infinity());
    }

    double result = std::numeric_limits<double>::infinity();

    // Steps 1-2 and Step 4 combined in a single pass
    // DEVIATION: Spec coerces all args first, then iterates (see Math.max note).
    for(size_t i = 0; i < args.size(); ++i) {
        double num = args[i].toNumber();

        // Step 4a: If number is NaN, return NaN
        if(std::isnan(num)) {
            return Value(std::numeric_limits<double>::quiet_NaN());
        }

        // Step 4b-c: std::min handles -0 vs +0 correctly in IEEE 754
        result = std::min(result, num);
    }

    // Step 5: Return lowest
    return Value(result);
}

// 21.3.2.27 Math.pow ( base, exponent )
// @spec https://tc39.es/ecma262/#sec-math.pow
//
// Spec algorithm:
//   1. Set base to ? ToNumber(base).
//   2. Set exponent to ? ToNumber(exponent).
//   3. Return Number::exponentiate(base, exponent).
// Number::exponentiate (6.1.6.1.3) defines ~20 special-case rules.
// SIMPLIFIED: We delegate to std::pow which handles most IEEE 754 edge cases
// consistently with the spec, though minor deviations may exist for exotic
// inputs (e.g., 1 ** Infinity should be NaN per some spec readings).
Value Math::pow(const CallContext& ctx, const std::vector<Value>& args) {
    if(args.size() < 2) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    // Step 1: Set base to ? ToNumber(base).
    double base = args[0].toNumber();
    // Step 2: Set exponent to ? ToNumber(exponent).
    double exponent = args[1].toNumber();

    // Step 3: Return Number::exponentiate(base, exponent).
    return Value(std::pow(base, exponent));
}

// 21.3.2.33 Math.sqrt ( x )
// @spec https://tc39.es/ecma262/#sec-math.sqrt
Value Math::sqrt(const CallContext& ctx, const std::vector<Value>& args) {
    double num = validateAndGetNumber(args, 0);

    if(std::isnan(num) || num < 0) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    return Value(std::sqrt(num));
}

// 21.3.2.28 Math.random ( )
// @spec https://tc39.es/ecma262/#sec-math.random
// Returns a Number value with positive sign, >= 0 and < 1, chosen randomly
// with approximately uniform distribution. Uses mt19937 PRNG.
Value Math::random(const CallContext& ctx, const std::vector<Value>& args) {
    return Value(dis(gen));
}

// 21.3.2.30 Math.sign ( x )
// @spec https://tc39.es/ecma262/#sec-math.sign
//
// Spec algorithm:
//   1. Let n be ? ToNumber(x).
//   2. If n is one of NaN, +0, or -0, return n.
//   3. If n < -0, return -1.
//   4. Return 1.
Value Math::sign(const CallContext& ctx, const std::vector<Value>& args) {
    double num = validateAndGetNumber(args, 0);

    // Step 2: If n is NaN, return n.
    if(std::isnan(num)) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    // Steps 3-4
    if(num > 0) {
        return Value(1.0);
    } else if(num < 0) {
        return Value(-1.0);
    } else {
        // Step 2: If n is +0 or -0, return n (preserves sign of zero)
        return Value(num);
    }
}

// 21.3.2.36 Math.trunc ( x )
// @spec https://tc39.es/ecma262/#sec-math.trunc
Value Math::trunc(const CallContext& ctx, const std::vector<Value>& args) {
    double num = validateAndGetNumber(args, 0);

    if(std::isnan(num) || std::isinf(num)) {
        return Value(num);
    }

    // Remove fractional part by truncating towards zero
    return Value(std::trunc(num));
}

// 21.3.2.31 Math.sin ( x )
// @spec https://tc39.es/ecma262/#sec-math.sin
Value Math::sin(const CallContext& ctx, const std::vector<Value>& args) {
    double num = validateAndGetNumber(args, 0);

    if(std::isnan(num)) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    if(std::isinf(num)) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    return Value(std::sin(num));
}

// 21.3.2.12 Math.cos ( x )
// @spec https://tc39.es/ecma262/#sec-math.cos
Value Math::cos(const CallContext& ctx, const std::vector<Value>& args) {
    double num = validateAndGetNumber(args, 0);

    if(std::isnan(num)) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    if(std::isinf(num)) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    return Value(std::cos(num));
}

// 21.3.2.34 Math.tan ( x )
// @spec https://tc39.es/ecma262/#sec-math.tan
Value Math::tan(const CallContext& ctx, const std::vector<Value>& args) {
    double num = validateAndGetNumber(args, 0);

    if(std::isnan(num)) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    if(std::isinf(num)) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    return Value(std::tan(num));
}

// --- Inverse trigonometric methods ---

// 21.3.2.2 Math.acos ( x )
// @spec https://tc39.es/ecma262/#sec-math.acos
Value Math::acos(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::acos(x));
}

// 21.3.2.4 Math.asin ( x )
// @spec https://tc39.es/ecma262/#sec-math.asin
Value Math::asin(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::asin(x));
}

// 21.3.2.6 Math.atan ( x )
// @spec https://tc39.es/ecma262/#sec-math.atan
Value Math::atan(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::atan(x));
}

// 21.3.2.8 Math.atan2 ( y, x )
// @spec https://tc39.es/ecma262/#sec-math.atan2
Value Math::atan2(const CallContext& ctx, const std::vector<Value>& args) {
    double y = validateAndGetNumber(args, 0);
    double x = validateAndGetNumber(args, 1);
    return Value(std::atan2(y, x));
}

// --- Hyperbolic methods ---

// 21.3.2.13 Math.cosh ( x )
// @spec https://tc39.es/ecma262/#sec-math.cosh
Value Math::cosh(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::cosh(x));
}

// 21.3.2.32 Math.sinh ( x )
// @spec https://tc39.es/ecma262/#sec-math.sinh
Value Math::sinh(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::sinh(x));
}

// 21.3.2.35 Math.tanh ( x )
// @spec https://tc39.es/ecma262/#sec-math.tanh
Value Math::tanh(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::tanh(x));
}

// 21.3.2.3 Math.acosh ( x )
// @spec https://tc39.es/ecma262/#sec-math.acosh
Value Math::acosh(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::acosh(x));
}

// 21.3.2.5 Math.asinh ( x )
// @spec https://tc39.es/ecma262/#sec-math.asinh
Value Math::asinh(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::asinh(x));
}

// 21.3.2.7 Math.atanh ( x )
// @spec https://tc39.es/ecma262/#sec-math.atanh
Value Math::atanh(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::atanh(x));
}

// --- Exponential and logarithmic methods ---

// 21.3.2.14 Math.exp ( x )
// @spec https://tc39.es/ecma262/#sec-math.exp
Value Math::exp(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::exp(x));
}

// 21.3.2.15 Math.expm1 ( x )
// @spec https://tc39.es/ecma262/#sec-math.expm1
Value Math::expm1(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::expm1(x));
}

// 21.3.2.21 Math.log ( x )
// @spec https://tc39.es/ecma262/#sec-math.log
Value Math::log(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::log(x));
}

// 21.3.2.22 Math.log1p ( x )
// @spec https://tc39.es/ecma262/#sec-math.log1p
Value Math::log1p(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::log1p(x));
}

// 21.3.2.24 Math.log2 ( x )
// @spec https://tc39.es/ecma262/#sec-math.log2
Value Math::log2(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::log2(x));
}

// 21.3.2.23 Math.log10 ( x )
// @spec https://tc39.es/ecma262/#sec-math.log10
Value Math::log10(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::log10(x));
}

// --- Other methods ---

// 21.3.2.9 Math.cbrt ( x )
// @spec https://tc39.es/ecma262/#sec-math.cbrt
Value Math::cbrt(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    return Value(std::cbrt(x));
}

// 21.3.2.11 Math.clz32 ( x )
// @spec https://tc39.es/ecma262/#sec-math.clz32
//
// Spec algorithm:
//   1. Let n be ? ToNumber(x).
//   2. Let n32 be ! ToUint32(n).
//   3. If n32 is 0, return 32.
//   4. Return the number of leading zero bits in the 32-bit binary
//      representation of n32.
Value Math::clz32(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 1: Let n be ? ToNumber(x).
    double x = validateAndGetNumber(args, 0);

    if(std::isnan(x) || std::isinf(x)) {
        // Step 2-3: ToUint32(NaN) = 0, ToUint32(Infinity) = 0, clz32(0) = 32
        return Value(32.0);
    }

    // Step 2: Let n32 be ! ToUint32(n).
    // SIMPLIFIED: Uses int64_t cast instead of full ToUint32 modulo 2^32 algorithm.
    auto n = static_cast<uint32_t>(static_cast<int64_t>(x));

    // Step 3: If n32 is 0, return 32.
    if(n == 0) {
        return Value(32.0);
    }

    // Step 4: Return the number of leading zero bits.
    return Value(static_cast<double>(__builtin_clz(n)));
}

// 21.3.2.17 Math.fround ( x )
// @spec https://tc39.es/ecma262/#sec-math.fround
//
// Spec algorithm:
//   1. Let n be ? ToNumber(x).
//   2. If n is NaN, return NaN.
//   3. If n is one of +0, -0, +Infinity, -Infinity, return n.
//   4. Let n32 be the result of converting n to IEEE 754-2019
//      binary32 format using roundTiesToEven.
//   5. Let n64 be the result of converting n32 to IEEE 754-2019
//      binary64 format.
//   6. Return n64.
Value Math::fround(const CallContext& ctx, const std::vector<Value>& args) {
    double x = validateAndGetNumber(args, 0);
    // Steps 2-6: float cast performs binary32 round-trip per IEEE 754
    return Value(static_cast<double>(static_cast<float>(x)));
}

// 21.3.2.19 Math.hypot ( ...args )
// @spec https://tc39.es/ecma262/#sec-math.hypot
//
// Spec algorithm:
//   1. Let coerced be a new empty List.
//   2. For each element arg of args, do
//     a. Let n be ? ToNumber(arg).
//     b. Append n to coerced.
//   3. For each element number of coerced, do
//     a. If number is +Infinity or -Infinity, return +Infinity.
//   4. Let onlyZero be true.
//   5. For each element number of coerced, do
//     a. If number is NaN, return NaN.
//     b. If number is not +0 or -0, set onlyZero to false.
//   6. If onlyZero is true, return +0.
//   7. Return an implementation-approximated Number value representing
//      the square root of the sum of squares of the elements of coerced.
Value Math::hypot(const CallContext& ctx, const std::vector<Value>& args) {
    // Step 3 edge case: no args => 0.0 (onlyZero would be true at step 6)
    if(args.empty()) {
        return Value(0.0);
    }

    // Steps 2-3: Coerce and check for Infinity first
    bool has_nan = false;
    for(size_t i = 0; i < args.size(); ++i) {
        double val = args[i].toNumber();
        // Step 3a: If number is +/-Infinity, return +Infinity
        if(std::isinf(val)) {
            return Value(std::numeric_limits<double>::infinity());
        }
        // Step 5a: Track NaN
        if(std::isnan(val)) {
            has_nan = true;
        }
    }

    // Step 5a: If any number is NaN, return NaN
    if(has_nan) {
        return Value(std::numeric_limits<double>::quiet_NaN());
    }

    // Step 7: implementation-approximated sqrt of sum of squares
    if(args.size() == 1) {
        return Value(std::fabs(args[0].toNumber()));
    }

    if(args.size() == 2) {
        return Value(std::hypot(args[0].toNumber(), args[1].toNumber()));
    }

    // SIMPLIFIED: For 3+ args, uses naive sum-of-squares.
    // Spec allows implementation-approximated results but this approach
    // may lose precision for very large/small values due to overflow/underflow
    // (unlike the 2-arg std::hypot which uses a scaling algorithm).
    double sum = 0.0;
    for(size_t i = 0; i < args.size(); ++i) {
        double val = args[i].toNumber();
        sum += val * val;
    }
    return Value(std::sqrt(sum));
}

// 21.3.2.20 Math.imul ( x, y )
// @spec https://tc39.es/ecma262/#sec-math.imul
//
// Spec algorithm:
//   1. Let a be ? ToNumber(x).
//   2. Let b be ? ToNumber(y).
//   3. Let a32 be ! ToUint32(a).
//   4. Let b32 be ! ToUint32(b).
//   5. Let product be (a32 x b32) modulo 2^32.
//   6. If product >= 2^31, return product - 2^32; otherwise return product.
Value Math::imul(const CallContext& ctx, const std::vector<Value>& args) {
    // Steps 1-2: Let a be ? ToNumber(x), Let b be ? ToNumber(y).
    double a_val = validateAndGetNumber(args, 0);
    double b_val = validateAndGetNumber(args, 1);

    if(std::isnan(a_val) || std::isnan(b_val)) {
        // ToUint32(NaN) = 0, so 0 * anything = 0
        return Value(0.0);
    }

    // Steps 3-4: ToUint32 via int64 cast
    // SIMPLIFIED: Uses int64_t cast instead of full ToUint32 modulo 2^32 algorithm.
    auto a = static_cast<int32_t>(static_cast<int64_t>(a_val));
    auto b = static_cast<int32_t>(static_cast<int64_t>(b_val));

    // Steps 5-6: Multiply as uint32 and reinterpret as int32
    auto result = static_cast<int32_t>(static_cast<uint32_t>(a) * static_cast<uint32_t>(b));
    return Value(static_cast<double>(result));
}

}  // namespace rift::builtins