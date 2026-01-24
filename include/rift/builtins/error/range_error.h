#pragma once

#include <vector>

#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"
#include "../builtin_base.h"

namespace rift::builtins {

using namespace rift::runtime;

/// The `RangeError` builtin object and constructor.
///
/// The RangeError object represents an error when a value is not in the set or range of allowed
/// values.
///
/// More information:
///  - [ECMAScript reference][spec]
///  - [MDN documentation][mdn]
///
/// [spec]: https://tc39.es/ecma262/#sec-native-error-types-used-in-this-standard-rangeerror
/// [mdn]:
/// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError
class RangeError : public BuiltinBase<RangeError> {
  public:
    /// Setup methods required by BuiltinBase template
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// RangeError constructor
    static Value constructor(const std::vector<Value>& args);

    /// RangeError prototype methods (inherited from Error)
    static Value toString(const std::vector<Value>& args);

  private:
    /// Helper methods
    static JSObject* getThisErrorObject(const std::vector<Value>& args);
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins
