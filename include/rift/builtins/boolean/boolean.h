#pragma once

#include <vector>

#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"
#include "../builtin_base.h"

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
class Boolean : public BuiltinBase<Boolean> {
  public:
    /// Boolean constructor (required by BuiltinBase)
    static Value constructor(const std::vector<Value>& args);

    /// Boolean prototype methods
    static Value toString(const std::vector<Value>& args);
    static Value valueOf(const std::vector<Value>& args);

    /// Setup methods required by BuiltinBase template
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

  private:
    /// Helper methods - now work with raw pointers
    static JSObject* getGlobalPrototype();
    static bool getBooleanValue(const std::vector<Value>& args);
};

}  // namespace rift::builtins