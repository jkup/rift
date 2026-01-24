#pragma once

#include <vector>

#include "../../core/engine/call_context.h"
#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"
#include "../builtin_base.h"

namespace rift::builtins {

using namespace rift::runtime;
using rift::core::CallContext;

/// The `Number` builtin object and constructor.
///
/// The Number object is a wrapper around the number primitive. The Number constructor
/// can be used to explicitly convert values to number primitives.
///
/// More information:
///  - [ECMAScript reference][spec]
///  - [MDN documentation][mdn]
///
/// [spec]: https://tc39.es/ecma262/#sec-number-objects
/// [mdn]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number
class Number : public BuiltinBase<Number> {
  public:
    /// Number constructor with call context to distinguish function vs constructor calls
    static Value constructor(const CallContext& ctx, const std::vector<Value>& args);

    // ===== Static Methods (Number.isNaN, Number.isFinite, etc.) =====

    /// The `Number.isNaN()` method determines whether the passed value is NaN and its type is
    /// Number.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-number.isnan
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isNaN
    static Value isNaN(const CallContext& ctx, const std::vector<Value>& args);

    /// The `Number.isFinite()` method determines whether the passed value is a finite number.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-number.isfinite
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isFinite
    static Value isFinite(const CallContext& ctx, const std::vector<Value>& args);

    /// The `Number.isInteger()` method determines whether the passed value is an integer.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-number.isinteger
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isInteger
    static Value isInteger(const CallContext& ctx, const std::vector<Value>& args);

    /// The `Number.isSafeInteger()` method determines whether the passed value is a safe integer.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-number.issafeinteger
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/isSafeInteger
    static Value isSafeInteger(const CallContext& ctx, const std::vector<Value>& args);

    /// The `Number.parseFloat()` method parses an argument and returns a floating point number.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-number.parsefloat
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/parseFloat
    static Value parseFloat(const CallContext& ctx, const std::vector<Value>& args);

    /// The `Number.parseInt()` method parses a string argument and returns an integer of the
    /// specified radix.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-number.parseint
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/parseInt
    static Value parseInt(const CallContext& ctx, const std::vector<Value>& args);

    // ===== Prototype Methods (Number.prototype.toString, etc.) =====

    /// The `toString()` method returns a string representing the specified Number object.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-number.prototype.tostring
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toString
    static Value toString(const CallContext& ctx, const std::vector<Value>& args);

    /// The `valueOf()` method returns the wrapped primitive value of a Number object.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-number.prototype.valueof
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/valueOf
    static Value valueOf(const CallContext& ctx, const std::vector<Value>& args);

    /// The `toFixed()` method formats a number using fixed-point notation.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-number.prototype.tofixed
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toFixed
    static Value toFixed(const CallContext& ctx, const std::vector<Value>& args);

    /// The `toExponential()` method returns a string representing the Number object in exponential
    /// notation.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-number.prototype.toexponential
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toExponential
    static Value toExponential(const CallContext& ctx, const std::vector<Value>& args);

    /// The `toPrecision()` method returns a string representing the Number object to the specified
    /// precision.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-number.prototype.toprecision
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number/toPrecision
    static Value toPrecision(const CallContext& ctx, const std::vector<Value>& args);

    /// Setup methods required by BuiltinBase template
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

  private:
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
