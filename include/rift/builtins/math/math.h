#pragma once

#include <cmath>
#include <numbers>
#include <random>
#include <vector>

#include "../../core/engine/call_context.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// 21.3 The Math Object
/// @spec https://tc39.es/ecma262/#sec-math-object
class Math {
  public:
    /// Create the Math object with all properties and methods.
    static JSObject* create(rift::memory::ObjectFactory* factory);

    /// 21.3.1.1 Math.E
    /// @spec https://tc39.es/ecma262/#sec-math.e
    static Value getE(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.1.2 Math.PI
    /// @spec https://tc39.es/ecma262/#sec-math.pi
    static Value getPI(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.1 Value Properties of the Math Object
    /// @spec https://tc39.es/ecma262/#sec-value-properties-of-the-math-object
    static const double E;
    static const double PI;
    static const double SQRT2;

    /// 21.3.2.1 Math.abs ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.abs
    static Value abs(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.10 Math.ceil ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.ceil
    static Value ceil(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.16 Math.floor ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.floor
    static Value floor(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.29 Math.round ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.round
    static Value round(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.25 Math.max ( ...args )
    /// @spec https://tc39.es/ecma262/#sec-math.max
    static Value max(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.26 Math.min ( ...args )
    /// @spec https://tc39.es/ecma262/#sec-math.min
    static Value min(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.27 Math.pow ( base, exponent )
    /// @spec https://tc39.es/ecma262/#sec-math.pow
    static Value pow(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.33 Math.sqrt ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.sqrt
    static Value sqrt(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.28 Math.random ( )
    /// @spec https://tc39.es/ecma262/#sec-math.random
    static Value random(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.30 Math.sign ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.sign
    static Value sign(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.36 Math.trunc ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.trunc
    static Value trunc(const CallContext& ctx, const std::vector<Value>& args);

    // Trigonometric methods

    /// 21.3.2.31 Math.sin ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.sin
    static Value sin(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.12 Math.cos ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.cos
    static Value cos(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.34 Math.tan ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.tan
    static Value tan(const CallContext& ctx, const std::vector<Value>& args);

    // Inverse trigonometric methods

    /// 21.3.2.2 Math.acos ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.acos
    static Value acos(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.4 Math.asin ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.asin
    static Value asin(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.6 Math.atan ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.atan
    static Value atan(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.8 Math.atan2 ( y, x )
    /// @spec https://tc39.es/ecma262/#sec-math.atan2
    static Value atan2(const CallContext& ctx, const std::vector<Value>& args);

    // Hyperbolic methods

    /// 21.3.2.13 Math.cosh ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.cosh
    static Value cosh(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.32 Math.sinh ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.sinh
    static Value sinh(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.35 Math.tanh ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.tanh
    static Value tanh(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.3 Math.acosh ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.acosh
    static Value acosh(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.5 Math.asinh ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.asinh
    static Value asinh(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.7 Math.atanh ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.atanh
    static Value atanh(const CallContext& ctx, const std::vector<Value>& args);

    // Exponential and logarithmic methods

    /// 21.3.2.14 Math.exp ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.exp
    static Value exp(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.15 Math.expm1 ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.expm1
    static Value expm1(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.21 Math.log ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.log
    static Value log(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.22 Math.log1p ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.log1p
    static Value log1p(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.24 Math.log2 ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.log2
    static Value log2(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.23 Math.log10 ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.log10
    static Value log10(const CallContext& ctx, const std::vector<Value>& args);

    // Other methods

    /// 21.3.2.9 Math.cbrt ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.cbrt
    static Value cbrt(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.11 Math.clz32 ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.clz32
    static Value clz32(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.17 Math.fround ( x )
    /// @spec https://tc39.es/ecma262/#sec-math.fround
    static Value fround(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.19 Math.hypot ( ...args )
    /// @spec https://tc39.es/ecma262/#sec-math.hypot
    static Value hypot(const CallContext& ctx, const std::vector<Value>& args);

    /// 21.3.2.20 Math.imul ( x, y )
    /// @spec https://tc39.es/ecma262/#sec-math.imul
    static Value imul(const CallContext& ctx, const std::vector<Value>& args);

    // Helper methods

    /// NON-STANDARD: Helper to validate arguments and extract a number
    static double validateAndGetNumber(const std::vector<Value>& args, size_t index = 0);

    // Random number generator
    static std::random_device rd;
    static std::mt19937 gen;
    static std::uniform_real_distribution<> dis;
};

}  // namespace rift::builtins
