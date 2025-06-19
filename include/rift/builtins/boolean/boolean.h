#pragma once

#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"

namespace rift::builtins {

using namespace rift::runtime;

/// The `Boolean` builtin object and constructor.
///
/// The Boolean object is a wrapper around the boolean primitive. The Boolean constructor
/// can be used to explicitly convert values to boolean primitives.
///
/// More information:
///  - [ECMAScript reference][spec]
///  - [MDN documentation][mdn]
///
/// [spec]: https://tc39.es/ecma262/#sec-boolean-objects
/// [mdn]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean
class Boolean {
   public:
    /// Create the Boolean constructor object with all properties and methods.
    static std::shared_ptr<JSObject> create();

    /// Create the Boolean.prototype object with all instance methods.
    static std::shared_ptr<JSObject> createPrototype();

   private:
    // Boolean constructor function
    /// The `Boolean()` constructor creates Boolean objects or primitive booleans.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-boolean-constructor
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean/Boolean
    static Value constructor(const std::vector<Value>& args);

    // Boolean prototype methods

    /// The `toString()` method returns a string representing the specified Boolean object.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-boolean.prototype.tostring
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean/toString
    static Value toString(const std::vector<Value>& args);

    /// The `valueOf()` method returns the primitive value of a Boolean object.
    ///
    /// More information:
    ///  - [ECMAScript reference][spec]
    ///  - [MDN documentation][mdn]
    ///
    /// [spec]: https://tc39.es/ecma262/#sec-boolean.prototype.valueof
    /// [mdn]:
    /// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Boolean/valueOf
    static Value valueOf(const std::vector<Value>& args);

    // Helper methods
    /// Helper to get the boolean value from the 'this' binding in prototype methods
    static bool getThisBooleanValue(const std::vector<Value>& args);
};

}  // namespace rift::builtins 