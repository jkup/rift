#pragma once

#include <cmath>
#include <numbers>
#include <random>

#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"

namespace jsruntime::builtins {

using namespace jsruntime::runtime;

/// The `Math` builtin object.
///
/// The Math object is a built-in object that has properties and methods for mathematical constants
/// and functions. It's not a function object, so it's not constructible.
///
/// More information:
///  - [ECMAScript reference][spec]
///  - [MDN documentation][mdn]
///
/// [spec]: https://tc39.es/ecma262/#sec-math-object
/// [mdn]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math
class Math {
   public:
    /// Create the Math object with all properties and methods.
    static std::shared_ptr<JSObject> create();

   private:
    // Math constants

    /// The `Math.E` property represents Euler's number, approximately 2.718.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-math.e
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/E
    static const double E;

    /// The `Math.PI` property represents the ratio of a circle's circumference to its diameter,
    /// approximately 3.14159.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-math.pi
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/PI
    static const double PI;

    /// The `Math.SQRT2` property represents the square root of 2, approximately 1.414.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-math.sqrt2
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/SQRT2
    static const double SQRT2;

    // Basic math methods

    /// The `Math.abs()` function returns the absolute value of a number.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-math.abs
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/abs
    static Value abs(const std::vector<Value>& args);

    /// The `Math.ceil()` function returns the smallest integer greater than or equal to a number.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-math.ceil
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/ceil
    static Value ceil(const std::vector<Value>& args);

    /// The `Math.floor()` function returns the largest integer less than or equal to a number.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-math.floor
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/floor
    static Value floor(const std::vector<Value>& args);

    /// The `Math.round()` function returns the value of a number rounded to the nearest integer.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-math.round
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
    static Value round(const std::vector<Value>& args);

    /// The `Math.max()` function returns the largest of zero or more numbers.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-math.max
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/max
    static Value max(const std::vector<Value>& args);

    /// The `Math.min()` function returns the smallest of zero or more numbers.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-math.min
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/min
    static Value min(const std::vector<Value>& args);

    /// The `Math.pow()` function returns the base to the exponent power, that is, base^exponent.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-math.pow
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/pow
    static Value pow(const std::vector<Value>& args);

    /// The `Math.sqrt()` function returns the square root of a number.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-math.sqrt
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/sqrt
    static Value sqrt(const std::vector<Value>& args);

    /// The `Math.random()` function returns a floating-point, pseudo-random number between 0 and 1.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-math.random
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
    static Value random(const std::vector<Value>& args);

    // Helper methods
    /// Helper to validate arguments and extract a number, returning NaN for invalid cases
    static double validateAndGetNumber(const std::vector<Value>& args, size_t index = 0);

    // Random number generator
    static std::random_device rd;
    static std::mt19937 gen;
    static std::uniform_real_distribution<> dis;
};

}  // namespace jsruntime::builtins