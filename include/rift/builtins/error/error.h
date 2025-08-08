#pragma once

#include <vector>

#include "../../memory/object_factory.h"
#include "../../runtime/values/object.h"
#include "../../runtime/values/value.h"
#include "../builtin_base.h"

namespace rift::builtins {

using namespace rift::runtime;

/// The `Error` builtin object and constructor.
///
/// The Error object represents an error when trying to execute a statement or accessing a property.
/// User-defined exceptions can also use the Error constructor.
///
/// More information:
///  - [ECMAScript reference][spec]
///  - [MDN documentation][mdn]
///
/// [spec]: https://tc39.es/ecma262/#sec-error-objects
/// [mdn]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error
class Error : public BuiltinBase<Error> {
  public:
    /// Setup methods required by BuiltinBase template
    static void setupStaticMethods(JSObject* constructor, rift::memory::ObjectFactory* factory);
    static void setupPrototypeMethods(JSObject* prototype, rift::memory::ObjectFactory* factory);

    /// Error constructor
    static Value constructor(const std::vector<Value>& args);

    /// Error prototype methods
    static Value toString(const std::vector<Value>& args);

  private:
    /// Helper methods - now work with raw pointers
    static JSObject* getThisErrorObject(const std::vector<Value>& args);
    static JSObject* getGlobalPrototype();
};

}  // namespace rift::builtins