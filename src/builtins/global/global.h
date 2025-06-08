#pragma once

#include <string>

#include "../../runtime/environment/environment.h"
#include "../../runtime/values/value.h"

namespace jsruntime::builtins {

using namespace jsruntime::runtime;

/// Global builtin functions and utilities.
///
/// These are functions that exist in the global scope and don't belong to any particular object.
///
/// More information:
///  - [ECMAScript reference][spec]
///  - [MDN documentation][mdn]
///
/// [spec]: https://tc39.es/ecma262/#sec-global-object
/// [mdn]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects
class Global {
   public:
    /// Setup global builtin functions in the provided environment.
    static void setupGlobalFunctions(std::shared_ptr<Environment> global_env);

   private:
    /// The `parseInt()` function parses a string argument and returns an integer.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-parseint-string-radix
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseInt
    static Value parseInt(const std::vector<Value>& args);

    /// The `parseFloat()` function parses an argument and returns a floating point number.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-parsefloat-string
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/parseFloat
    static Value parseFloat(const std::vector<Value>& args);

    /// The `isNaN()` function determines whether a value is NaN or not.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-isnan-number
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isNaN
    static Value isNaN(const std::vector<Value>& args);

    /// The `isFinite()` function determines whether the passed value is a finite number.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-isfinite-number
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/isFinite
    static Value isFinite(const std::vector<Value>& args);

    // Helper functions
    static bool isValidDigit(char c, int radix);
    static int getDigitValue(char c);
};

}  // namespace jsruntime::builtins