#pragma once

#include <vector>

#include "../../memory/object_factory.h"
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
    /// Static factory method
    static void setObjectFactory(rift::memory::ObjectFactory* factory);

    /// Create Boolean constructor function - now returns raw pointer
    static JSObject* create(rift::memory::ObjectFactory* factory);

    /// Create Boolean.prototype - now returns raw pointer
    static JSObject* createPrototype(rift::memory::ObjectFactory* factory);

    /// Boolean constructor
    static Value constructor(const std::vector<Value>& args);

    /// Boolean prototype methods
    static Value toString(const std::vector<Value>& args);
    static Value valueOf(const std::vector<Value>& args);

  private:
    /// Static factory storage
    static rift::memory::ObjectFactory* object_factory_;

    /// Helper methods - now work with raw pointers
    static JSObject* getGlobalPrototype();
    static bool getBooleanValue(const std::vector<Value>& args);
};

}  // namespace rift::builtins